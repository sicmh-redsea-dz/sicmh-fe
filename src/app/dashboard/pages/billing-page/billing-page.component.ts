import { Component, effect, inject } from '@angular/core';
import Swal from 'sweetalert2';
import { DrawerService } from '../../services/drawer-service/drawer.service';
import { DrawerContents } from '../../interface/drawer-content.enum';
import { InvoicesService } from '../../services/invoices-services/invoices.service';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';

@Component({
  selector: 'app-billing-page',
  templateUrl: './billing-page.component.html',
  styleUrl: './billing-page.component.css'
})
export class BillingPageComponent {
  public headers: string[] = [
    'Invoice number',
    'Doctor',
    'Pacient',
    'Date',
    'State',
    'Amount'
  ]
  public searchTerm: string = ''
  public currentPage: number = 1
  public totalPages: number = 1
  public limit: number = 25
  public offset: number = 0
  public totalRegistries: number = 0
  public downloadingPdfReport: boolean = false

  public drawerParams = inject( DrawerService )
  private invoiceService = inject( InvoicesService )
  public bodyContent: any[] = []
  private searchTermSubject = new Subject<string>()

  constructor() {
    this.getInvoices()

    this.searchTermSubject.pipe(
      debounceTime( 700 ),
      distinctUntilChanged()
    ).subscribe(( term: string) => {
      this.getInvoices( term )
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
    this.searchTermSubject.next( term )
  }

  public onPageChange( page: number ) {
    this.currentPage = page
    this.offset = ( this.currentPage - 1 ) * this.limit
    this.getInvoices()
  }


  public bootstrapInvoiceDrawerToUpd(invoiceId: string) {
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
    this.drawerParams.isDrawerOpen.set( true )
    this.drawerParams.contentToDisplay.set( DrawerContents.INVOICE )
    this.drawerParams.drawerTexts.update( state => ({
        ...state,
        header: 'generar factura',
        btnText: 'Generar'
    }))
  }

  public getInvoices( term?: string ) {
    this.invoiceService.getInvoices({
      limit: this.limit, 
      offset: this.offset, 
      term: term ? term.trim() : ''
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
          console.log('res: ', result)
          if( result ) this.drawerParams.triggerInvoiceRefresh()
        },
        error: ( err ) => {
          console.error('Error al eliminar la factura seleccionado:', err);
        }
      })
  }

  public getPdfReport(filter: string) {
    this.downloadingPdfReport = true
    this.invoiceService.downloadPDFReport( filter )
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
          link.download = 'reporte-facturas-medit.pdf'
          link.click()

          window.URL.revokeObjectURL(blobUrl);
        },
        error: ( err ) => {
          Swal.fire('Error', 'No se pudo generar el PDF', 'error')
        }
      })
  }
}
