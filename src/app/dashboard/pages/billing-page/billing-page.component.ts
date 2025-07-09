import { Component, effect, inject } from '@angular/core';
import Swal from 'sweetalert2';
import { DrawerService } from '../../services/drawer-service/drawer.service';
import { DrawerContents } from '../../interface/drawer-content.enum';
import { InvoicesService } from '../../services/invoices-services/invoices.service';

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

  public drawerParams = inject( DrawerService )
  private invoiceService = inject( InvoicesService )
  public bodyContent: any[] = []

  constructor() {
    this.getInvoices()
    
    effect(() => {
      if (this.drawerParams.shouldRefreshInvoices()) {
        this.bodyContent = []
        this.getInvoices()
      }
    })
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

  public getInvoices() {
    this.invoiceService.getInvoices()
      .subscribe({
        next: (response) => {
          response?.map( item => {
            this.bodyContent.push({
              'InvoiceNumber': item.InvoiceNumber,
              'Doctor': item.Doctor,
              'Paciente': item.Paciente,
              'FechaFactura': item.FechaFactura.split('T')[0],
              'Estado': item.Estado,
              'Monto': item.Monto,
            })
          })
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
}
