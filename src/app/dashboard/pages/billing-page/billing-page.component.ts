import { Component, DestroyRef, computed, effect, inject } from '@angular/core'
import Swal from 'sweetalert2'
import { DrawerService } from '../../services/drawer-service/drawer.service'
import { DrawerContents } from '../../interface/drawer-content.enum'
import { InvoicesService } from '../../services/invoices-services/invoices.service'
import { BillingService } from '../../services/billing-service/billing.service'
import { PatientsService } from '../../services/patients-service/patients.service'
import { VisitsService } from '../../services/visits-service/visits.service'
import { BillingLedgerItem, BillingMovement, BillingReport, BillingSummary } from '../../interface/billing.interface'
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Invoice } from '../../interface/invoice-response.interface'
import { AuthService } from '../../../auth/services/auth.service'
import { formatNewDate } from '../../../shared/utils/date-formatters'

type PatientOption = {
  id: number
  name: string
  idNumber?: string
}

@Component({
  selector: 'app-billing-page',
  templateUrl: './billing-page.component.html',
  styleUrl: './billing-page.component.css'
})
export class BillingPageComponent {
  public headers: string[] = [
    'Factura',
    'Doctor',
    'Paciente',
    'Fecha',
    'Estado',
    'Monto'
  ]
  public searchTerm: string = ''
  public currentPage: number = 1
  public totalPages: number = 1
  public limit: number = 25
  public offset: number = 0
  public totalRegistries: number = 0
  public downloadingPdfReport: boolean = false
  public reportLoading: boolean = false
  private authService = inject( AuthService )
  public canCreateInvoice = computed(() =>
    this.authService.hasPermission('invoice.create')
  )
  public canEditInvoice = computed(() =>
    this.authService.hasPermission('invoice.update')
  )
  public canDeleteInvoice = computed(() =>
    this.authService.hasPermission('invoice.delete')
  )
  public canManageBilling = computed(() =>
    this.authService.hasPermission('invoice.update') || this.authService.hasPermission('invoice.create')
  )

  public drawerParams = inject( DrawerService )
  private invoiceService = inject( InvoicesService )
  private billingService = inject( BillingService )
  private patientsService = inject( PatientsService )
  private visitsService = inject( VisitsService )
  public bodyContent: Invoice[] = []
  public reportSummary: BillingSummary | null = null
  public reportLedger: BillingLedgerItem[] = []
  public reportMovements: BillingMovement[] = []
  public filteredMovements: BillingMovement[] = []
  public movementSearch = ''
  public reportFilters = {
    from: '',
    to: '',
    patientIds: [] as number[],
    station: 'all',
    status: 'all'
  }
  public patientsOptions: PatientOption[] = []
  public stationOptions = [
    { key: 'consulta', label: 'Consulta' },
    { key: 'emergencia', label: 'Emergencia' },
    { key: 'hospitalizacion', label: 'Hospitalización' },
    { key: 'quirofano', label: 'Quirófano' }
  ]
  public statusOptions = [
    { key: 'pagado', label: 'Pagado' },
    { key: 'pendiente', label: 'Pendiente' }
  ]
  public movementForm = {
    patientId: '',
    fromStation: '',
    toStation: 'consulta',
    occurredAt: '',
    reason: '',
    notes: '',
    chargeAmount: 0,
    chargeCategory: 'otros',
    chargeDescription: ''
  }
  public manualChargeForm = {
    patientId: '',
    station: 'consulta',
    category: 'otros',
    description: '',
    quantity: 1,
    unitPrice: 0,
    occurredAt: ''
  }
  private searchTermSubject = new Subject<string>()
  private movementPatientSearchSubject = new Subject<string>()
  private manualPatientSearchSubject = new Subject<string>()
  private movementSearchSubject = new Subject<string>()
  private destroyRef = inject(DestroyRef)
  private patientLookup = new Map<number, PatientOption>()
  private patientStationMap = new Map<number, { station: string; ts: number }>()
  private pendingPatientIdFetch = new Set<number>()
  public movementPatientQuery = ''
  public manualPatientQuery = ''
  public movementPatientResults: PatientOption[] = []
  public manualPatientResults: PatientOption[] = []
  public movementPatientLoading = false
  public manualPatientLoading = false
  public movementPatientOpen = false
  public manualPatientOpen = false
  public billingView: 'facturas' | 'reportes' = 'facturas'

  get isFacturasView(): boolean {
    return this.billingView === 'facturas'
  }

  get isReportesView(): boolean {
    return this.billingView === 'reportes'
  }

  constructor() {
    this.getInvoices()
    this.initReportFilters()
    this.loadPatients()
    this.loadReport()

    this.searchTermSubject.pipe(
      debounceTime( 700 ),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(( term: string) => {
      this.getInvoices( term )
    })

    this.movementSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.applyMovementFilter()
    })

    this.movementPatientSearchSubject.pipe(
      debounceTime(450),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((term: string) => {
      this.searchPatients(term, 'movement')
    })

    this.manualPatientSearchSubject.pipe(
      debounceTime(450),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((term: string) => {
      this.searchPatients(term, 'manual')
    })
    
    effect(() => {
      if (this.drawerParams.shouldRefreshInvoices()) {
        this.bodyContent = []
        this.getInvoices()
      }
    })
  }

  public onSearchTermChange( term: string ) {
    this.searchTerm = term
    this.currentPage = 1
    this.offset = 0
    this.searchTermSubject.next( term )
  }

  public setBillingView(view: 'facturas' | 'reportes') {
    this.billingView = view
  }

  public onMovementSearchChange(term: string) {
    this.movementSearch = term
    this.movementSearchSubject.next(term)
  }

  public onMovementPatientInput(term: string) {
    this.movementPatientQuery = term
    this.movementForm.patientId = ''
    this.movementPatientOpen = true
    this.movementPatientSearchSubject.next(term)
  }

  public onManualPatientInput(term: string) {
    this.manualPatientQuery = term
    this.manualChargeForm.patientId = ''
    this.manualPatientOpen = true
    this.manualPatientSearchSubject.next(term)
  }

  public onMovementPatientFocus() {
    this.movementPatientOpen = true
  }

  public onManualPatientFocus() {
    this.manualPatientOpen = true
  }

  public onMovementPatientBlur() {
    window.setTimeout(() => {
      this.movementPatientOpen = false
    }, 150)
  }

  public onManualPatientBlur() {
    window.setTimeout(() => {
      this.manualPatientOpen = false
    }, 150)
  }

  public selectMovementPatient(patient: PatientOption) {
    this.movementForm.patientId = String(patient.id)
    this.movementPatientQuery = this.formatPatientLabel(patient)
    this.movementPatientResults = []
    this.movementPatientOpen = false
    const station = this.getPatientCurrentStation(patient.id)
    this.movementForm.fromStation = station
    this.movementForm.toStation = ''
    this.cachePatients([patient])
  }

  public selectManualPatient(patient: PatientOption) {
    this.manualChargeForm.patientId = String(patient.id)
    this.manualPatientQuery = this.formatPatientLabel(patient)
    this.manualPatientResults = []
    this.manualPatientOpen = false
    const station = this.getPatientCurrentStation(patient.id)
    this.manualChargeForm.station = station
    this.cachePatients([patient])
  }

  public clearMovementPatient() {
    this.movementForm.patientId = ''
    this.movementPatientQuery = ''
    this.movementPatientResults = []
    this.movementPatientLoading = false
    this.movementPatientOpen = false
    this.movementForm.fromStation = ''
    this.movementForm.toStation = ''
  }

  public clearManualPatient() {
    this.manualChargeForm.patientId = ''
    this.manualPatientQuery = ''
    this.manualPatientResults = []
    this.manualPatientLoading = false
    this.manualPatientOpen = false
    this.manualChargeForm.station = 'consulta'
  }

  public onPageChange( page: number ) {
    this.currentPage = page
    this.offset = ( this.currentPage - 1 ) * this.limit
    this.getInvoices()
  }


  public bootstrapInvoiceDrawerToUpd(invoiceId: string) {
    if (!this.canEditInvoice()) return
    const targetInvoice = this.bodyContent.find((item) => item.InvoiceNumber === invoiceId)
    if (targetInvoice?.Estado === 'Pagado') {
      Swal.fire('Aviso', 'La factura ya está pagada y no se puede editar.', 'info')
      return
    }
    this.drawerParams.isDrawerOpen.set( true )
    this.drawerParams.contentToDisplay.set( DrawerContents.INVOICE )
    this.drawerParams.setToUpdate.set( true )
    this.drawerParams.setInvoiceId.set( invoiceId )
    this.drawerParams.drawerTexts.update( state => ({
      ...state,
      header: 'completar factura',
      btnText: 'Actualizar'
    }))
  }

  public bootstrapInvoiceDrawer() {
    if (!this.canCreateInvoice()) return
    this.drawerParams.isDrawerOpen.set( true )
    this.drawerParams.contentToDisplay.set( DrawerContents.INVOICE )
    this.drawerParams.drawerTexts.update( state => ({
        ...state,
        header: 'generar factura',
        btnText: 'Generar'
    }))
  }

  public getInvoices( term?: string ) {
    const search = (term ?? this.searchTerm).trim()

    this.invoiceService.getInvoices({
      limit: this.limit, 
      offset: this.offset, 
      term: search
    })
      .subscribe({
        next: (response) => {
          const { data } = response!
          const {invoiceResp, totalRegistries} = data
          this.bodyContent = invoiceResp
          this.totalPages = Math.ceil((totalRegistries) / this.limit )
          this.totalRegistries = totalRegistries
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public deleteSelectedInvoice(invoiceId: string) {
    if (!this.canDeleteInvoice()) return
    Swal.fire({
      title: `Are you sure you want to delete this element [${invoiceId}]?`,
      text: 'This action is irreversible. Proceed with caution.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel'
    }).then(( result ) => {
      if ( result.isConfirmed ) {
        this.deleteInvoice( invoiceId )
        Swal.fire({
          title: 'Action Confirmed',
          text: 'You have successfully accepted the action.',
          icon: 'success'
        })
      }
      else if ( result.dismiss === Swal.DismissReason.cancel ) Swal.fire({
        title: 'Action Canceled',
        text: 'No changes were made.',
        icon: 'info'
      })
    })
  }

  private deleteInvoice(id: string) {
    this.invoiceService.deleteInvoice(id)
      .subscribe({
        next: ( result ) => {
          if( result ) this.drawerParams.triggerInvoiceRefresh()
        },
        error: ( err ) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }

  public downloadQuickReport(filter: string) {
    if (!this.authService.hasPermission('invoice.read')) return
    const { from, to } = this.resolveQuickRange(filter)
    this.downloadingPdfReport = true
    this.billingService.downloadReportPdf({
      from,
      to,
      patientIds: this.reportFilters.patientIds,
      station: this.reportFilters.station,
      status: this.reportFilters.status
    })
      .pipe(
        finalize(() => {
          this.downloadingPdfReport = false
        })
      )
      .subscribe({
        next: ( res: Blob ) => {
          const blob = new Blob([res], { type: 'application/pdf' })

          const blobUrl = window.URL.createObjectURL( blob )

          const link = document.createElement('a')
          link.href = blobUrl
          link.download = `reporte-facturacion-${from}-${to}.pdf`
          link.click()

          window.URL.revokeObjectURL(blobUrl);
        },
        error: ( err ) => {
          Swal.fire('Error', 'No se pudo generar el PDF', 'error')
        }
      })
  }

  public loadReport() {
    this.reportLoading = true
    this.billingService.getReport({
      from: this.reportFilters.from,
      to: this.reportFilters.to,
      patientIds: this.reportFilters.patientIds,
      station: this.reportFilters.station,
      status: this.reportFilters.status
    })
      .pipe(
        finalize(() => {
          this.reportLoading = false
        })
      )
      .subscribe({
        next: (report: BillingReport) => {
          this.reportSummary = report.summary
          this.reportLedger = report.ledger
          this.reportMovements = report.movements
          this.refreshPatientStations(report.movements)
          this.applyMovementFilter()
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public resetReportFilters() {
    this.initReportFilters()
    this.loadReport()
  }

  public downloadReportPdf() {
    if (!this.authService.hasPermission('invoice.read')) return
    this.downloadingPdfReport = true
    this.billingService.downloadReportPdf({
      from: this.reportFilters.from,
      to: this.reportFilters.to,
      patientIds: this.reportFilters.patientIds,
      station: this.reportFilters.station,
      status: this.reportFilters.status
    })
      .pipe(
        finalize(() => {
          this.downloadingPdfReport = false
        })
      )
      .subscribe({
        next: (res: Blob) => {
          const blob = new Blob([res], { type: 'application/pdf' })
          const blobUrl = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = blobUrl
          link.download = `reporte-facturacion-${this.reportFilters.from}-${this.reportFilters.to}.pdf`
          link.click()
          window.URL.revokeObjectURL(blobUrl)
        },
        error: () => {
          Swal.fire('Error', 'No se pudo generar el PDF', 'error')
        }
      })
  }

  public exportLedgerCsv() {
    if (!this.reportLedger.length) return
    const headers = [
      'Fecha',
      'Paciente',
      'Estacion',
      'Categoria',
      'Descripcion',
      'Cantidad',
      'Precio',
      'Total',
      'Estado',
      'Origen'
    ]
    const rows = this.reportLedger.map((item) => [
      item.occurredAt,
      item.patientName,
      item.station ?? '',
      item.category,
      item.description.replace(/\n/g, ' '),
      item.quantity,
      item.unitPrice,
      item.total,
      item.status,
      item.source
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = `reporte-facturacion-${this.reportFilters.from}-${this.reportFilters.to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  public submitMovement() {
    if (!this.canEditInvoice()) {
      Swal.fire('Acceso denegado', 'No tienes permisos para registrar movimientos.', 'error')
      return
    }
    const patientId = Number(this.movementForm.patientId)
    if (!patientId || !this.movementForm.toStation) {
      Swal.fire('Error', 'Selecciona paciente y estación destino.', 'error')
      return
    }
    if (this.movementForm.fromStation && this.movementForm.toStation === this.movementForm.fromStation) {
      Swal.fire('Error', 'La estación destino debe ser distinta a la estación actual.', 'error')
      return
    }
    const patientName = this.getPatientName(patientId)
    const chargeAmount = Number(this.movementForm.chargeAmount) || 0
    const chargeDescription =
      this.movementForm.chargeDescription?.trim() ||
      `Movimiento a ${this.getMovementStationLabel(this.movementForm.toStation)}`
    this.billingService.createMovement({
      patientId,
      patientName,
      fromStation: this.movementForm.fromStation || undefined,
      toStation: this.movementForm.toStation,
      occurredAt: this.movementForm.occurredAt || undefined,
      reason: this.movementForm.reason || undefined,
      notes: this.movementForm.notes || undefined,
      charge: chargeAmount > 0 ? {
        station: this.movementForm.toStation,
        category: this.movementForm.chargeCategory || 'otros',
        description: chargeDescription,
        quantity: 1,
        unitPrice: chargeAmount
      } : undefined
    })
      .subscribe({
        next: () => {
          Swal.fire('Listo', 'Movimiento registrado.', 'success')
          this.movementForm = {
            patientId: '',
            fromStation: '',
            toStation: 'consulta',
            occurredAt: '',
            reason: '',
            notes: '',
            chargeAmount: 0,
            chargeCategory: 'otros',
            chargeDescription: ''
          }
          this.clearMovementPatient()
          this.loadReport()
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public submitManualCharge() {
    if (!this.canCreateInvoice()) {
      Swal.fire('Acceso denegado', 'No tienes permisos para registrar cargos manuales.', 'error')
      return
    }
    const patientId = Number(this.manualChargeForm.patientId)
    if (!patientId || !this.manualChargeForm.description.trim()) {
      Swal.fire('Error', 'Selecciona paciente y agrega una descripción.', 'error')
      return
    }
    const patientName = this.getPatientName(patientId)
    this.billingService.createManualCharge({
      patientId,
      patientName,
      station: this.manualChargeForm.station,
      category: this.manualChargeForm.category,
      description: this.manualChargeForm.description.trim(),
      quantity: Number(this.manualChargeForm.quantity) || 1,
      unitPrice: Number(this.manualChargeForm.unitPrice) || 0,
      occurredAt: this.manualChargeForm.occurredAt || undefined,
      status: 'Pendiente'
    })
      .subscribe({
        next: () => {
          Swal.fire('Listo', 'Cargo registrado.', 'success')
          this.manualChargeForm = {
            patientId: '',
            station: 'consulta',
            category: 'otros',
            description: '',
            quantity: 1,
            unitPrice: 0,
            occurredAt: formatNewDate(new Date())
          }
          this.clearManualPatient()
          this.loadReport()
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public getSummaryTotal(value: number | undefined) {
    return Number(value ?? 0).toFixed(2)
  }

  public getMovementStationLabel(key: string | undefined) {
    if (!key) return '—'
    const found = this.stationOptions.find((item) => item.key === key)
    return found?.label ?? key
  }

  private loadPatients() {
    this.patientsService.getPatients({ limit: 200, offset: 0, term: '' })
      .subscribe({
        next: (data) => {
          this.patientsOptions = data?.patients?.map((p) => ({
            id: p.id,
            name: `${p.name} ${p.lastName}`.trim(),
            idNumber: p.idNumber
          })) ?? []
          this.cachePatients(this.patientsOptions)
        },
        error: (message) => {
          console.warn('patients load error', message)
        }
      })
  }

  private initReportFilters() {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    this.reportFilters.from = formatNewDate(firstDay)
    this.reportFilters.to = formatNewDate(today)
    this.reportFilters.patientIds = []
    this.reportFilters.station = 'all'
    this.reportFilters.status = 'all'
    this.manualChargeForm.occurredAt = this.reportFilters.to
  }

  private resolveQuickRange(term: string) {
    const today = new Date()
    if (term === 'td') {
      const date = formatNewDate(today)
      return { from: date, to: date }
    }
    if (term === 'wk') {
      const start = new Date(today)
      start.setDate(today.getDate() - 6)
      return { from: formatNewDate(start), to: formatNewDate(today) }
    }
    return { from: this.reportFilters.from, to: this.reportFilters.to }
  }

  private getPatientName(id: number) {
    return this.patientLookup.get(id)?.name ?? `Paciente ${id}`
  }

  private refreshPatientStations(movements: BillingMovement[]) {
    this.patientStationMap.clear()
    movements.forEach((mv) => {
      const station = mv.toStation || mv.fromStation
      if (!station) return
      const ts = new Date(mv.occurredAt).getTime() || 0
      const current = this.patientStationMap.get(mv.patientId)
      if (!current || ts >= current.ts) {
        this.patientStationMap.set(mv.patientId, { station, ts })
      }
    })
  }

  private getPatientCurrentStation(patientId: number) {
    return this.patientStationMap.get(patientId)?.station ?? 'consulta'
  }

  private applyMovementFilter() {
    const term = this.movementSearch.trim().toLowerCase()
    if (!term) {
      this.filteredMovements = [...this.reportMovements]
      return
    }
    this.filteredMovements = this.reportMovements.filter((mv) => {
      const haystack = [
        mv.patientName,
        this.getMovementStationLabel(mv.fromStation),
        this.getMovementStationLabel(mv.toStation),
        mv.reason,
        mv.notes,
        mv.source
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }

  public formatPatientLabel(patient: PatientOption) {
    const idSuffix = patient.idNumber ? ` · ${patient.idNumber}` : ''
    return `${patient.name}${idSuffix}`
  }

  private resolveIdNumber(patient: any) {
    const idNumber =
      patient?.idNumber ??
      patient?.identificacion ??
      patient?.Identificacion ??
      patient?.identidad ??
      patient?.identityNumber ??
      patient?.identificationNumber ??
      patient?.identification ??
      patient?.cedula
    return idNumber ? String(idNumber) : undefined
  }

  private hydratePatientIdentifiers(target: 'movement' | 'manual') {
    const current = target === 'movement'
      ? this.movementPatientResults
      : this.manualPatientResults
    current.forEach((item) => {
      if (!item?.id || item.idNumber || this.pendingPatientIdFetch.has(item.id)) return
      this.pendingPatientIdFetch.add(item.id)
      this.patientsService.getPatient(item.id).subscribe({
        next: (patient) => {
          const idNumber = this.resolveIdNumber(patient)
          if (!idNumber) return
          const list = target === 'movement'
            ? this.movementPatientResults
            : this.manualPatientResults
          const exists = list.some((p) => p.id === item.id)
          if (!exists) return
          const updated = list.map((p) =>
            p.id === item.id ? { ...p, idNumber } : p
          )
          if (target === 'movement') {
            this.movementPatientResults = updated
          } else {
            this.manualPatientResults = updated
          }
          this.cachePatients(updated)
        },
        error: () => {
          this.pendingPatientIdFetch.delete(item.id)
        },
        complete: () => {
          this.pendingPatientIdFetch.delete(item.id)
        }
      })
    })
  }

  public getMovementSourceLabel(source?: string) {
    const key = (source || '').toLowerCase().trim()
    const labels: Record<string, string> = {
      movement: 'Movimiento',
      manual: 'Manual',
      inventory: 'Inventario',
      invoice: 'Factura',
      visit: 'Visita',
      system: 'Sistema',
      auto: 'Sistema'
    }
    if (labels[key]) return labels[key]
    if (!source) return 'Sistema'
    return source.charAt(0).toUpperCase() + source.slice(1)
  }

  public getMovementSourceClass(source?: string) {
    const key = (source || '').toLowerCase()
    if (key.includes('mov')) return 'movement'
    if (key.includes('manual')) return 'manual'
    if (key.includes('invent')) return 'inventory'
    if (key.includes('fact')) return 'invoice'
    return 'system'
  }

  private searchPatients(term: string, target: 'movement' | 'manual') {
    const cleanTerm = term.trim()
    if (!cleanTerm || cleanTerm.length < 2) {
      if (target === 'movement') {
        this.movementPatientResults = []
        this.movementPatientLoading = false
      } else {
        this.manualPatientResults = []
        this.manualPatientLoading = false
      }
      return
    }

    if (target === 'movement') {
      this.movementPatientLoading = true
      this.visitsService.searchPatients(cleanTerm)
        .pipe(
          finalize(() => {
            this.movementPatientLoading = false
          })
        )
        .subscribe({
          next: (patients) => {
            const results = (patients ?? []).map((p: any) => ({
              id: p.id,
              name: p.name ?? `${p.name || ''} ${p.lastName || ''}`.trim(),
              idNumber: this.resolveIdNumber(p)
            }))
            this.movementPatientResults = results
            this.cachePatients(results)
            this.hydratePatientIdentifiers('movement')
          },
          error: () => {
            this.movementPatientResults = []
          }
        })
      return
    }

    this.manualPatientLoading = true
    this.patientsService.getPatients({ limit: 12, offset: 0, term: cleanTerm })
      .pipe(
        finalize(() => {
          this.manualPatientLoading = false
        })
      )
      .subscribe({
        next: (data) => {
          const results = data?.patients?.map((p) => ({
            id: p.id,
            name: `${p.name} ${p.lastName}`.trim(),
            idNumber: this.resolveIdNumber(p)
          })) ?? []
          this.manualPatientResults = results
          this.cachePatients(results)
          this.hydratePatientIdentifiers('manual')
        },
        error: () => {
          this.manualPatientResults = []
        }
      })
  }

  private cachePatients(list: PatientOption[]) {
    list.forEach((patient) => {
      this.patientLookup.set(patient.id, patient)
    })
  }
}
