import { AfterViewChecked, Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, ViewChild } from '@angular/core'
import Swal from 'sweetalert2'
import { ConsentDocumentContext, ConsentInstance, ConsentTemplate } from '../../../interface/consent.interface'
import { ConsentsService } from '../../../services/consents-service/consents.service'
import { Observable, concatMap, from, map, of, throwError, toArray } from 'rxjs'

interface QueuedConsent {
  templateId: number
  templateName: string
  kind: 'electronic' | 'printed'
  payload?: Record<string, unknown>
  patientId: number
  doctorId: number
  templateVersion: number
}

@Component({
  selector: 'app-consent-manager',
  templateUrl: './consent-manager.component.html',
  styleUrl: './consent-manager.component.css'
})
export class ConsentManagerComponent implements OnInit, AfterViewChecked {
  @Input() visitId: number | null = null
  @Input() patientId: number | null = null
  @Input() doctorId: number | null = null
  @Input() visitDate: string | null = null
  @Output() changed = new EventEmitter<void>()
  @ViewChild('signatureCanvas') signatureCanvas?: ElementRef<HTMLCanvasElement>

  private service = inject(ConsentsService)
  templates: ConsentTemplate[] = []
  templatesAvailable = false
  instances: ConsentInstance[] = []
  queuedConsents: QueuedConsent[] = []
  context: ConsentDocumentContext | null = null
  panelOpen = false
  loading = false
  saving = false
  readonly today = new Date()
  acceptanceMode: 'checkbox' | 'drawn_signature' = 'checkbox'
  acceptedChecked = false
  guardian = { name: '', identification: '', relationship: '', phone: '' }
  private canvasReady = false
  private drawing = false
  private hasInk = false

  ngOnInit(): void {
    this.service.listAvailableTemplates().subscribe({
      next: (templates) => { this.templates = templates; this.templatesAvailable = templates.length > 0 },
      error: () => { this.templates = []; this.templatesAvailable = false }
    })
  }

  ngAfterViewChecked(): void {
    if (this.acceptanceMode === 'drawn_signature' && this.signatureCanvas && !this.canvasReady) this.setupCanvas()
  }

  open(): void {
    if (!this.visitId && (!this.patientId || !this.doctorId)) {
      Swal.fire('Datos requeridos', 'Selecciona primero el paciente y el médico.', 'info')
      return
    }
    this.panelOpen = true
    this.load()
  }

  close(): void {
    this.panelOpen = false
    this.context = null
    this.resetAcceptance()
  }

  select(template: ConsentTemplate): void {
    if (!this.visitId && (!this.patientId || !this.doctorId)) return
    this.loading = true
    const request = this.visitId
      ? this.service.getContext(this.visitId, template.id)
      : this.service.getDraftContext(this.patientId!, this.doctorId!, this.visitDate, template.id)
    request.subscribe({
      next: (context) => { this.context = context; this.loading = false; this.resetAcceptance() },
      error: (message: string) => { this.loading = false; Swal.fire('Error', message, 'error') }
    })
  }

  back(): void { this.context = null; this.resetAcceptance() }

  accept(): void {
    if (!this.context || this.saving) return
    if (this.acceptanceMode === 'checkbox' && !this.acceptedChecked) {
      Swal.fire('Falta confirmación', 'Marca la casilla de aceptación.', 'warning'); return
    }
    if (this.acceptanceMode === 'drawn_signature' && !this.hasInk) {
      Swal.fire('Falta la firma', 'Dibuja la firma del aceptante.', 'warning'); return
    }
    const minor = this.isMinor
    if (minor && Object.values(this.guardian).some((value) => !value.trim())) {
      Swal.fire('Datos incompletos', 'Completa todos los datos del encargado.', 'warning'); return
    }
    this.saving = true
    const payload = {
      mode: this.acceptanceMode,
      signatureDataUrl: this.acceptanceMode === 'drawn_signature' ? this.signatureCanvas?.nativeElement.toDataURL('image/png') : null,
      signerType: minor ? 'guardian' : 'patient',
      signerName: minor ? this.guardian.name : this.context.patientName,
      signerIdentification: minor ? this.guardian.identification : this.context.patientIdentification,
      signerRelationship: minor ? this.guardian.relationship : null,
      signerPhone: minor ? this.guardian.phone : null,
      expectedTemplateVersion: this.context.template.current_version,
    }
    if (!this.visitId) {
      this.queue({ templateId: this.context.template.id, templateName: this.context.template.name, templateVersion: this.context.template.current_version, kind: 'electronic', payload, patientId: this.patientId!, doctorId: this.doctorId! })
      this.context = null
      Swal.fire('Consentimiento preparado', 'Se generará y adjuntará automáticamente cuando guardes la visita.', 'success')
      return
    }
    this.service.accept(this.visitId, this.context.template.id, payload).subscribe({
      next: () => {
        this.saving = false; this.context = null; this.load(); this.changed.emit()
        Swal.fire('Consentimiento aceptado', 'El PDF fue guardado en los adjuntos de la visita.', 'success')
      },
      error: (message: string) => { this.saving = false; Swal.fire('Error', message, 'error') }
    })
  }

  print(): void {
    if (!this.context || this.saving) return
    const printWindow = window.open('', '_blank')
    this.saving = true
    const request = this.visitId
      ? this.service.print(this.visitId, this.context.template.id, this.context.template.current_version)
      : this.service.printDraft(this.patientId!, this.doctorId!, this.visitDate, this.context.template.id)
    const queuedTemplate = this.context.template
    request.subscribe({
      next: (response) => {
        this.saving = false
        const url = URL.createObjectURL(response.body!)
        if (printWindow) printWindow.location.href = url
        else {
          const link = document.createElement('a')
          link.href = url
          link.download = 'consentimiento-para-firma.pdf'
          link.click()
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000)
        if (!this.visitId) this.queue({ templateId: queuedTemplate.id, templateName: queuedTemplate.name, templateVersion: queuedTemplate.current_version, kind: 'printed', patientId: this.patientId!, doctorId: this.doctorId! })
        this.context = null
        this.load()
      },
      error: (message: string) => { printWindow?.close(); this.saving = false; Swal.fire('Error', message, 'error') }
    })
  }

  uploadSigned(event: Event, instance: ConsentInstance): void {
    if (!this.visitId) return
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    this.saving = true
    this.service.uploadPhysical(this.visitId, instance.id, file).subscribe({
      next: () => { this.saving = false; this.load(); this.changed.emit(); Swal.fire('Documento guardado', 'El consentimiento firmado quedó adjunto a la visita.', 'success') },
      error: (message: string) => { this.saving = false; Swal.fire('Error', message, 'error') }
    })
  }

  setMode(mode: 'checkbox' | 'drawn_signature'): void {
    this.acceptanceMode = mode
    this.canvasReady = false
  }

  clearSignature(): void {
    const canvas = this.signatureCanvas?.nativeElement
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    this.hasInk = false
  }

  statusFor(templateId: number): string {
    const queued = this.queuedConsents.find((item) => item.templateId === templateId)
    if (queued) return queued.kind === 'electronic' ? 'Listo para guardar' : 'Impresión lista'
    const instance = this.instances.find((item) => item.template_id === templateId)
    return instance?.status === 'accepted' ? 'Aceptado' : instance?.status === 'printed' ? 'Impreso' : 'Disponible'
  }

  get isMinor(): boolean { return this.context?.patientAge !== null && (this.context?.patientAge ?? 18) < 18 }
  get canAcceptElectronic(): boolean { return !!this.context?.hasDoctorSignature && !!this.context?.hasDoctorStamp }
  get canOpen(): boolean { return !!this.visitId || (!!this.patientId && !!this.doctorId) }
  get hasQueuedConsents(): boolean { return this.queuedConsents.length > 0 }

  finalizeQueued(visitId: number): Observable<number> {
    if (!this.queuedConsents.length) return of(0)
    const queue = [...this.queuedConsents]
    if (queue.some((item) => item.patientId !== Number(this.patientId) || item.doctorId !== Number(this.doctorId))) {
      return throwError(() => 'El paciente o médico cambió después de preparar el consentimiento. Debe prepararse nuevamente.')
    }
    return from(queue).pipe(
      concatMap((item) => item.kind === 'electronic'
        ? this.service.accept(visitId, item.templateId, item.payload ?? {})
        : this.service.print(visitId, item.templateId, item.templateVersion)),
      toArray(),
      map((created) => { this.queuedConsents = []; return created.length })
    )
  }

  private load(): void {
    this.loading = true
    this.service.listAvailableTemplates().subscribe({
      next: (templates) => {
        this.templates = templates
        if (!this.visitId) { this.instances = []; this.loading = false; return }
        this.service.listVisitConsents(this.visitId!).subscribe({
          next: (instances) => { this.instances = instances; this.loading = false },
          error: (message: string) => { this.loading = false; Swal.fire('Error', message, 'error') }
        })
      },
      error: (message: string) => { this.loading = false; Swal.fire('Error', message, 'error') }
    })
  }

  private queue(item: QueuedConsent): void {
    this.queuedConsents = [...this.queuedConsents.filter((queued) => queued.templateId !== item.templateId), item]
  }

  private resetAcceptance(): void {
    this.acceptanceMode = 'checkbox'; this.acceptedChecked = false
    this.guardian = { name: '', identification: '', relationship: '', phone: '' }
    this.canvasReady = false; this.hasInk = false
  }

  private setupCanvas(): void {
    const canvas = this.signatureCanvas?.nativeElement
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(280, Math.floor(rect.width * window.devicePixelRatio))
    canvas.height = Math.floor(150 * window.devicePixelRatio)
    const ctx = canvas.getContext('2d')!
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#101828'
    const point = (event: PointerEvent) => ({ x: event.clientX - canvas.getBoundingClientRect().left, y: event.clientY - canvas.getBoundingClientRect().top })
    canvas.onpointerdown = (event) => { this.drawing = true; const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); canvas.setPointerCapture(event.pointerId) }
    canvas.onpointermove = (event) => { if (!this.drawing) return; const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke(); this.hasInk = true }
    canvas.onpointerup = () => { this.drawing = false }
    canvas.onpointercancel = () => { this.drawing = false }
    this.canvasReady = true
  }
}
