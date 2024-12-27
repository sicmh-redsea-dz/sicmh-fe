import { Component, inject } from '@angular/core';
import Swal from 'sweetalert2';
import { DrawerService } from '../../services/drawer-service/drawer.service';
import { DrawerContents } from '../../interface/drawer-content.enum';

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

  public bodyContent: string[][] = [
    [
      '01924',
      'Hugo Strange',
      'Nolan Grayson',
      '2024-11-10',
      'Pending',
      'L 850.00'
    ],
    [
      '90123',
      'Tommy Elliot',
      'Hela Odinsdottir',
      '2024-11-10',
      'Pending',
      'L 850.00'
    ],
  ]

  public drawerParams = inject( DrawerService )

  public bootstrapInvoiceDrawer() {
    this.drawerParams.isDrawerOpen.set( true )
    this.drawerParams.contentToDisplay.set( DrawerContents.INVOICE )
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
