import { Component, computed, inject } from '@angular/core';
import { DrawerService } from '../../services/drawer-service/drawer.service';
import { DrawerContents } from '../../interface/drawer-content.enum';

@Component({
  selector: 'app-drawer',
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.css'
})
export class DrawerComponent {
  private drawerParams = inject( DrawerService )

  public dcInvoice = DrawerContents.INVOICE;
  public dcTransfer = DrawerContents.TRANSFER;
  public dcPatientView = DrawerContents.PATIENT_VIEW;
  public isDrawerVisible = computed(() => this.drawerParams.isDrawerOpen())
  public bodyToDisplay = computed(() => {
    const value = this.drawerParams.contentToDisplay()
    return value
  })
  public isDrawerSetToUpd = computed(() => this.drawerParams.setToUpdate())
  public drawerHeader = computed(() => this.drawerParams.drawerTexts())

  public setDrawerVisibility() {
    if( this.isDrawerVisible() ) {
      this.drawerParams.isDrawerOpen.set( false )
      this.drawerParams.contentToDisplay.set( DrawerContents.NONE )
      this.drawerParams.setToUpdate.set( false )
      this.drawerParams.setInvoiceId.set( '' )
      this.drawerParams.setPatientId.set( '' )
    }
  }
  
}
