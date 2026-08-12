import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DrawerService } from '../../../services/drawer-service/drawer.service';
import { DrawerContents } from '../../../interface/drawer-content.enum';
import { InventoryService } from '../../../services/inventory-service/inventory.service';
import Swal from 'sweetalert2';
import { AuthService } from '../../../../auth/services/auth.service';
import { Permission } from '../../../../auth/permissions/permissions';

type SubinventoryOption = {
  id: number
  label: string
  permission: Permission
}

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.component.html',
  styleUrl: './transfer.component.css'
})
export class TransferComponent implements OnInit {
  private readonly fb = inject( FormBuilder )
  private readonly drawerParams = inject(DrawerService)
  private readonly invService = inject( InventoryService )
  private readonly authService = inject(AuthService)
  
  public invoiceForm: FormGroup = this.fb.group({})

  public drawerTexts = computed(() => this.drawerParams.drawerTexts())
  public selectedItemId = computed(() => this.drawerParams.setInvoiceId())

  public itemQuantity: number[] = []
  private readonly allSubinventories: SubinventoryOption[] = [
    { id: 2, label: 'Emergencia', permission: 'visits.emergency.read' },
    { id: 3, label: 'Quirofano', permission: 'visits.operating_room.read' },
    { id: 4, label: 'Hospitalización', permission: 'visits.hospitalization.read' }
  ]
  public availableSubinventories = computed(() => this.allSubinventories.filter(
    (subinventory) => this.authService.hasPermission(subinventory.permission)
  ))

  ngOnInit(): void {
    this.invoiceForm = this.fb.group({
      subinv: ['', Validators.required],
      qty: ['', Validators.required],
    })
  }

  private loadItemQuantity(id: string) {
    this.invService.getInventoryItemById(id).subscribe({
      next: (resp) => {
        this.itemQuantity = Array.from(
          { length: resp.prodQuantity },
          (_, i) => i + 1
        )
      },
      error: (err) => {
        Swal.fire('Error', err, 'error')
      }
    })
  }

  constructor() {
    effect(() => {
      const id = this.selectedItemId()
      if (!id) {
        this.itemQuantity = []
        return
      }
      this.loadItemQuantity(id)
    })
  }

  onHandleSubmit() {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched()
      return
    }
    
    const itemId = this.selectedItemId()
    const { subinv, qty } = this.invoiceForm.value
    const origin = 1
    const destination = Number(subinv)

    if (!this.availableSubinventories().some((option) => option.id === destination)) {
      Swal.fire('Error', 'No tiene permiso para transferir inventario a esta bodega.', 'error')
      return
    }

    this.invService.transferItemById({ itemId, subinv: destination, qty, origin }).subscribe({
      next: () => {
        this.onHandleCancel()
      },
      error: ( err ) => {
        Swal.fire('Error', err, 'error')
      }
    })
  }
  
  onHandleCancel() {
    this.invoiceForm.reset()
    this.drawerParams.isDrawerOpen.set( false )
    this.drawerParams.contentToDisplay.set( DrawerContents.NONE )
    this.drawerParams.setToUpdate.set( false )
    this.drawerParams.setInvoiceId.set( '' )
  }
}
