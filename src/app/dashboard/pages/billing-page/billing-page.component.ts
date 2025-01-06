import { Component, computed, inject } from '@angular/core';
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
  public bodyContent: string[][] = []

  constructor() {
    this.getInvoices()
  }

  public bootstrapInvoiceDrawer() {
    this.drawerParams.isDrawerOpen.set( true )
    this.drawerParams.contentToDisplay.set( DrawerContents.INVOICE )
  }

  public getInvoices() {
    this.invoiceService.getInvoices()
      .subscribe({
        next: (response) => {
          response?.map( item => {
            let arr = [
              item.InvoiceNumber,
              item.Doctor,
              item.Paciente,
              item.FechaFactura.split('T')[0],
              item.Estado,
              item.Monto,
            ]
            this.bodyContent.push( arr )
          })
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public deleteSelectedInvoice() {
    Swal.fire({
      title: 'Are you sure you want to delete this element?',
      text: 'This action is irreversible. Proceed with caution.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel'
    }).then(( result ) => {
      if ( result.isConfirmed ) Swal.fire({
        title: 'Action Confirmed',
        text: 'You have successfully accepted the action.',
        icon: 'success'
      })
      else if ( result.dismiss === Swal.DismissReason.cancel ) Swal.fire({
        title: 'Action Canceled',
        text: 'No changes were made.',
        icon: 'info'
      })
    })
  }
}
