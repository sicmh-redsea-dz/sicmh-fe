import { Component, DestroyRef, computed, effect, inject } from '@angular/core'
import { Router } from '@angular/router'
import Swal from 'sweetalert2'
import { DrawerService } from '../../services/drawer-service/drawer.service'
import { DrawerContents } from '../../interface/drawer-content.enum'
import { InvoicesService } from '../../services/invoices-services/invoices.service'
import { BillingService } from '../../services/billing-service/billing.service'
import { BillingLedgerItem, BillingPatientSummary, BillingReport, BillingSummary } from '../../interface/billing.interface'
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Invoice } from '../../interface/invoice-response.interface'
import { AuthService } from '../../../auth/services/auth.service'
import { formatNewDate } from '../../../shared/utils/date-formatters'

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
  public canViewInvoice = computed(() =>
    this.authService.hasPermission('invoice.read')
  )

  public drawerParams = inject( DrawerService )
  private router = inject( Router )
  private invoiceService = inject( InvoicesService )
  private billingService = inject( BillingService )
  public bodyContent: Invoice[] = []
  public reportSummary: BillingSummary | null = null
  public reportLedger: BillingLedgerItem[] = []
  public selectedPatientId: number | null = null
  public patientSearch = ''
  public reportFilters = {
    from: '',
    to: '',
    station: 'all',
    status: 'all'
  }
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
  private searchTermSubject = new Subject<string>()
  private destroyRef = inject(DestroyRef)
  public billingView: 'facturas' | 'reportes' = 'facturas'

  get isFacturasView(): boolean {
    return this.billingView === 'facturas'
  }

  get isReportesView(): boolean {
    return this.billingView === 'reportes'
  }

  get displayedLedger(): BillingLedgerItem[] {
    if (!this.selectedPatientId) return this.reportLedger
    return this.reportLedger.filter((item) => item.patientId === this.selectedPatientId)
  }

  get selectedPatientName(): string | null {
    if (!this.selectedPatientId) return null
    const patient = this.reportSummary?.byPatient.find((item) => item.patientId === this.selectedPatientId)
    return patient?.patientName ?? null
  }

  get filteredPatientSummary(): BillingPatientSummary[] {
    const list = this.reportSummary?.byPatient ?? []
    const term = this.patientSearch.trim().toLowerCase()
    if (!term) return list
    return list.filter((item) => item.patientName.toLowerCase().includes(term))
  }

  constructor() {
    this.getInvoices()
    this.initReportFilters()
    this.loadReport()

    this.searchTermSubject.pipe(
      debounceTime( 700 ),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(( term: string) => {
      this.getInvoices( term )
    })

    effect(() => {
      if (this.drawerParams.shouldRefreshInvoices()) {
        this.bodyContent = []
        this.getInvoices()
      }
    })

    effect(() => {
      const update = this.drawerParams.softUpdateInvoiceMonto()
      if (update) {
        const invoice = this.bodyContent.find((item) => item.InvoiceNumber === update.invoiceNumber)
        if (invoice) {
          invoice.Monto = update.newMonto.toFixed(2)
        }
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

  public selectPatientFilter(patientId: number) {
    this.selectedPatientId = this.selectedPatientId === patientId ? null : patientId
  }

  public clearPatientFilter() {
    this.selectedPatientId = null
  }

  public clearPatientSearch() {
    this.patientSearch = ''
  }

  public onPageChange( page: number ) {
    this.currentPage = page
    this.offset = ( this.currentPage - 1 ) * this.limit
    this.getInvoices()
  }


  public bootstrapInvoiceDrawerToUpd(invoiceId: string) {
    if (!this.canEditInvoice()) return
    const targetInvoice = this.bodyContent.find((item) => item.InvoiceNumber === invoiceId)
    const status = (targetInvoice?.Estado ?? '').toString().toLowerCase()
    if (status !== 'pendiente') {
      Swal.fire('Aviso', 'Solo se pueden editar facturas pendientes.', 'info')
      return
    }
    this.drawerParams.isDrawerOpen.set( true )
    this.drawerParams.contentToDisplay.set( DrawerContents.INVOICE )
    this.drawerParams.setToUpdate.set( true )
    this.drawerParams.setInvoiceId.set( invoiceId )
    this.drawerParams.viewOnly.set(false)
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
    this.drawerParams.viewOnly.set(false)
    this.drawerParams.drawerTexts.update( state => ({
        ...state,
        header: 'generar factura',
        btnText: 'Generar'
    }))
  }

  public viewInvoice(invoiceId: string) {
    if (!this.canViewInvoice()) return
    this.router.navigateByUrl(`/dashboard/income/billings/view/${invoiceId}`)
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
      title: `¿Anular factura ${invoiceId}?`,
      text: 'La factura quedará anulada y se generará una nueva para continuidad.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, anular',
      cancelButtonText: 'Cancelar'
    }).then(( result ) => {
      if ( result.isConfirmed ) {
        this.annulInvoice( invoiceId )
      }
    })
  }

  private annulInvoice(id: string) {
    this.invoiceService.annulInvoice(id)
      .subscribe({
        next: ( result ) => {
          if( result ) {
            Swal.fire('Listo', 'Factura anulada.', 'success')
            this.drawerParams.triggerInvoiceRefresh()
          }
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
    this.fetchReport()
  }

  private fetchReport() {
    this.billingService.getReport({
      from: this.reportFilters.from,
      to: this.reportFilters.to,
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
          this.selectedPatientId = null
          this.patientSearch = ''
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

  public getSummaryTotal(value: number | undefined) {
    return Number(value ?? 0).toFixed(2)
  }

  public getMovementStationLabel(key: string | undefined) {
    if (!key) return '—'
    const found = this.stationOptions.find((item) => item.key === key)
    return found?.label ?? key
  }

  private initReportFilters() {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    this.reportFilters.from = formatNewDate(firstDay)
    this.reportFilters.to = formatNewDate(today)
    this.reportFilters.station = 'all'
    this.reportFilters.status = 'all'
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

}
