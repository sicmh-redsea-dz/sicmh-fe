import { Component, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DrawerService } from '../../../services/drawer-service/drawer.service';
import { DrawerContents } from '../../../interface/drawer-content.enum';
import { InvServiceService } from '../../../services/inventory-service/inv-service.service';

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.component.html',
  styleUrl: './transfer.component.css'
})
export class TransferComponent implements OnInit {
  private readonly fb = inject( FormBuilder )
  private readonly drawerParams = inject(DrawerService)
  private readonly invService = inject( InvServiceService )
  
  public invoiceForm: FormGroup = this.fb.group({})

  public drawerTexts = computed(() => this.drawerParams.drawerTexts())
  public selectedItemId = computed(() => this.drawerParams.setInvoiceId())

  public itemQuantity: number[] = []

  ngOnInit(): void {
    this.invoiceForm = this.fb.group({
      subinv: ['', Validators.required],
      qty: ['', Validators.required],
    })

    const id = this.selectedItemId()
    console.log('Selected Item ID:', id)

    if (id) {
      this.invService.getInventoryItemById(id).subscribe({
        next: (resp) => {
          const { data } = resp
          console.log('Detalle del producto', data)

          this.itemQuantity = Array.from(
            { length: data.prodQuantity },
            (_, i) => i + 1
          )
        },
        error: (err) => {
          console.error(err)
        }
      })
    }
  }

  constructor() {
    this.invoiceForm = this.fb.group({
      subinv: [''],
      qty: [''],
    })
    const id = this.selectedItemId()

    if ( id ) {
      this.invService.getInventoryItemById(id).subscribe({
        next: (resp) => {
          const { data } = resp
          this.itemQuantity = Array.from(
            { length: data.prodQuantity }, 
            (_, i) => i + 1
          )
        },
        error: (err) => {
          console.error(err)
        }
      })
    }
  }

  onHandleSubmit() {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched()
      return
    }
    
    const itemId = this.selectedItemId()
    const { subinv, qty } = this.invoiceForm.value
    const origin = 1

    this.invService.transferItemById({ itemId, subinv, qty, origin }).subscribe({
      next: ( resp ) => {
        console.log( 'Transferencia exitosa', resp )
        this.onHandleCancel()
      },
      error: ( err ) => {
        console.error( err )
      }
    })
  }
  
  onHandleCancel() {
    this.invoiceForm.reset()
    this.drawerParams.isDrawerOpen.set( false )
    this.drawerParams.contentToDisplay.set( DrawerContents.NONE )
    this.drawerParams.setToUpdate.set( false )
    this.drawerParams.setInvoiceId.set( '' )
    this.drawerParams.setInvoiceId.set( '' )
  }
}
