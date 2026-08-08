import { Component, inject, ViewChild, AfterViewInit } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { CalendarOptions } from '@fullcalendar/core'
import { FullCalendarComponent } from '@fullcalendar/angular'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import Swal from 'sweetalert2'

import { DashboardService } from '../../services/dashboard-service/dashboard.service'
import { SchedulingService } from '../../services/scheduling-service/scheduling.service'
import { Cita, CitaTipo, CitaEstado, Doctor, TIPO_COLORS, TIPO_LABELS, ESTADO_LABELS, SOURCE_LABELS } from '../../interface/cita.interface'
import { AuthService } from '../../../auth/services/auth.service'
import { formatApiError } from '../../../shared/utils/api-error'
import { trackById, trackBySelf } from '../../../shared/utils/track-by'

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent implements AfterViewInit {
  public trackById = trackById
  public trackBySelf = trackBySelf
  public trackByCitaId = (_: number, c: Cita) => c.CitaID
  @ViewChild('calendarRef') calendarRef!: FullCalendarComponent

  private fb                = inject(FormBuilder)
  private dashboardService  = inject(DashboardService)
  private schedulingService = inject(SchedulingService)
  private authService       = inject(AuthService)

  // ── Dashboard cards ──────────────────────────────────────────────────
  patientsCurrent = 0;  patientsPct: number | null = null
  invoicesCurrent = 0;  invoicesPct: number | null = null
  visitsCurrent   = 0;  visitsPct:   number | null = null

  // ── Selected-day appointments ────────────────────────────────────────
  selectedDate: string | null = null
  selectedCitas: Cita[] = []

  // ── Scheduling modal ─────────────────────────────────────────────────
  showModal    = false
  isSaving     = false
  editingCita: Cita | null = null
  doctors:     Doctor[] = []

  readonly TIPO_LABELS   = TIPO_LABELS
  readonly ESTADO_LABELS = ESTADO_LABELS
  readonly SOURCE_LABELS = SOURCE_LABELS
  readonly tipoOptions   = Object.keys(TIPO_LABELS)   as CitaTipo[]
  readonly estadoOptions = Object.keys(ESTADO_LABELS) as CitaEstado[]
  sources: string[] = []

  citaForm: FormGroup = this.fb.group({
    titulo:                   ['', Validators.required],
    tipo:                     ['consulta', Validators.required],
    estado:                   ['pendiente', Validators.required],
    source:                   ['en_persona', Validators.required],
    personalId:               [null],
    pacienteIdentificacion:   [null],
    nombrePaciente:           [null],
    inicio:                   ['', Validators.required],
    fin:                      ['', Validators.required],
    recursoTipo:              [null],
    recursoId:                [null],
    descripcion:              [''],
    notas:                    [''],
  })

  // ── Calendar ─────────────────────────────────────────────────────────
  canEdit = this.authService.hasAnyPermission(['schedule.create', 'schedule.update', 'schedule.delete'])

  calendarOptions: CalendarOptions = {
    plugins:        [dayGridPlugin, interactionPlugin],
    initialView:    'dayGridMonth',
    locale:         'es',
    contentHeight:  'auto',
    fixedWeekCount: false,
    headerToolbar:  { left: 'prev', center: 'title', right: 'next' },
    events: (info, successCallback, failureCallback) => {
      this.schedulingService.getEvents(info.startStr, info.endStr).subscribe({
        next:  events => successCallback(events.map(e => ({ ...e, display: 'none' }))),
        error: ()     => failureCallback(new Error('Error al cargar citas')),
      })
    },
    eventsSet: (events) => {
      const counts: { [date: string]: { [tipo: string]: number } } = {}
      events.forEach(e => {
        const d    = e.startStr.slice(0, 10)
        const tipo = (e.extendedProps['cita'] as Cita)?.Tipo ?? 'otro'
        if (!counts[d]) counts[d] = {}
        counts[d][tipo] = (counts[d][tipo] || 0) + 1
      })

      document.querySelectorAll('.cita-badge-row').forEach(b => b.remove())
      document.querySelectorAll<HTMLElement>('.fc-daygrid-day[data-date]').forEach(cell => {
        const date = cell.dataset['date'] ?? ''
        const dayTipos = counts[date]
        if (!dayTipos) return
        const top = cell.querySelector('.fc-daygrid-day-top')
        if (!top) return
        const row = document.createElement('div')
        row.className = 'cita-badge-row'
        Object.entries(dayTipos).forEach(([tipo, count]) => {
          const badge = document.createElement('span')
          badge.className = 'cita-day-badge'
          badge.style.background = TIPO_COLORS[tipo as CitaTipo] ?? '#6B7280'
          badge.textContent = String(count)
          row.appendChild(badge)
        })
        top.after(row)
      })
    },
    dateClick: (info) => {
      this.selectedDate = info.dateStr
      this.loadCitasForDate(info.dateStr)
    },
  }

  constructor() { this.getData() }

  ngAfterViewInit() {
    this.schedulingService.getDoctors().subscribe({ next: docs => this.doctors = docs })
    this.schedulingService.getSources().subscribe({ next: srcs => this.sources = srcs })
  }

  // ── Dashboard data ────────────────────────────────────────────────────
  getData() {
    this.dashboardService.getDataForDashb().subscribe({
      next: ({ cardData }) => {
        if (cardData == null) return

        this.patientsCurrent = cardData.pacientes_actuales
        this.patientsPct     = cardData.pacientes_variacion
        this.invoicesCurrent = cardData.facturas_actuales
        this.invoicesPct     = cardData.facturas_variacion
        this.visitsCurrent   = cardData.visitas_actuales
        this.visitsPct       = cardData.visitas_variacion
      },
      error: msg => Swal.fire('Error', msg, 'error'),
    })
  }

  loadCitasForDate(date: string) {
    this.schedulingService.getCitasForDate(date).subscribe({
      next:  (citas: Cita[]) => this.selectedCitas = citas,
      error: (err: any)      => Swal.fire('Error', formatApiError(err), 'error'),
    })
  }

  // ── Modal: open / close ───────────────────────────────────────────────
  openCreateModal() {
    this.editingCita = null
    this.citaForm.reset({ tipo: 'consulta', estado: 'pendiente', source: 'en_persona' })
    this.showModal = true
  }

  onCitaRowClick(cita: Cita) {
    this.editingCita = cita
    this.citaForm.patchValue({
      titulo:                 cita.Titulo,
      tipo:                   cita.Tipo,
      estado:                 cita.Estado,
      source:                 cita.Source ?? 'en_persona',
      personalId:             cita.PersonalID              ?? null,
      pacienteIdentificacion: cita.PacienteIdentificacion  ?? null,
      nombrePaciente:         cita.NombrePaciente          ?? null,
      inicio:                 this.toLocal(cita.Inicio),
      fin:                    this.toLocal(cita.Fin),
      recursoTipo:            cita.RecursoTipo ?? null,
      recursoId:              cita.RecursoID   ?? null,
      descripcion:            cita.Descripcion ?? '',
      notas:                  cita.Notas       ?? '',
    })
    this.showModal = true
  }

  closeModal() { this.showModal = false; this.editingCita = null }

  // ── CRUD ──────────────────────────────────────────────────────────────
  saveCita() {
    if (this.citaForm.invalid) { this.citaForm.markAllAsTouched(); return }
    this.isSaving = true
    const raw = this.citaForm.value
    const payload = { ...raw, inicio: this.fromLocal(raw.inicio), fin: this.fromLocal(raw.fin) }

    const op$ = this.editingCita
      ? this.schedulingService.update(this.editingCita.CitaID, payload)
      : this.schedulingService.create(payload)

    op$.subscribe({
      next: () => {
        this.isSaving = false
        this.closeModal()
        this.refetch()
      },
      error: err => {
        this.isSaving = false
        Swal.fire('Error', formatApiError(err), 'error')
      },
    })
  }

  deleteCita() {
    if (!this.editingCita) return
    Swal.fire({
      title: '¿Eliminar cita?', text: 'Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
    }).then(result => {
      if (!result.isConfirmed || !this.editingCita) return
      this.schedulingService.delete(this.editingCita.CitaID).subscribe({
        next: () => { this.closeModal(); this.refetch() },
        error: () => Swal.fire('Error', 'No se pudo eliminar la cita', 'error'),
      })
    })
  }

  private refetch() {
    if (this.calendarRef) this.calendarRef.getApi().refetchEvents()
    if (this.selectedDate) this.loadCitasForDate(this.selectedDate)
  }

  // ── Datetime helpers ─────────────────────────────────────────────────
  fmtDt(dt: string): string {
    if (!dt) return ''
    const d   = new Date(dt.replace(' ', 'T'))
    const dd  = String(d.getDate()).padStart(2, '0')
    const mm  = String(d.getMonth() + 1).padStart(2, '0')
    const hh  = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm} ${hh}:${min}`
  }

  private toLocal(dt: string): string {
    return dt ? dt.replace(' ', 'T').slice(0, 16) : ''
  }

  private fromLocal(dt: string): string {
    return dt ? dt.replace('T', ' ') + ':00' : ''
  }
}
