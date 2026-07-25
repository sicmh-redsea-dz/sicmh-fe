import { Component, OnInit, inject } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import Swal from 'sweetalert2'
import { BillingService } from '../../services/billing-service/billing.service'
import { BillingInvoiceSnapshot } from '../../interface/billing.interface'
import { formatIncomingData } from '../../../shared/utils/date-formatters'
import { trackById } from '../../../shared/utils/track-by'

@Component({
  selector: 'app-invoice-preview-page',
  templateUrl: './invoice-preview-page.component.html',
  styleUrl: './invoice-preview-page.component.css'
})
export class InvoicePreviewPageComponent implements OnInit {
  public trackById = trackById
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private billingService = inject(BillingService)

  public snapshot: BillingInvoiceSnapshot | null = null
  public invoiceNumber = ''
  public loading = false

  ngOnInit(): void {
    this.invoiceNumber = this.route.snapshot.paramMap.get('invoiceNumber') ?? ''
    if (!this.invoiceNumber) return
    this.loadSnapshot()
  }

  public loadSnapshot() {
    this.loading = true
    this.billingService.getInvoiceSnapshot(this.invoiceNumber)
      .subscribe({
        next: (snapshot) => {
          this.snapshot = snapshot
          this.loading = false
        },
        error: (err) => {
          this.loading = false
          Swal.fire('Error', err, 'error')
        }
      })
  }

  public goBack() {
    this.router.navigateByUrl('/dashboard/income/billings')
  }

  public printInvoice() {
    window.print()
  }

  public get formattedDate(): string {
    if (!this.snapshot?.invoice?.date) return ''
    return formatIncomingData(this.snapshot.invoice.date)
  }

  public getStatusClass(status?: string) {
    const normalized = (status || '').toLowerCase()
    if (normalized.includes('pag')) return 'paid'
    if (normalized.includes('anul')) return 'canceled'
    return 'pending'
  }

  public getStationLabel(station?: string) {
    if (!station) return '-'
    const key = station.toLowerCase()
    if (key.includes('emer')) return 'Emergencia'
    if (key.includes('hosp')) return 'Hospitalización'
    if (key.includes('quiro')) return 'Quirófano'
    if (key.includes('consult')) return 'Consulta'
    return station
  }
}
