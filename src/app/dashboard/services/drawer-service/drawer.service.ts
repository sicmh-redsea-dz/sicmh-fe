import { Injectable, signal } from '@angular/core';
import { DrawerContents } from '../../interface/drawer-content.enum';

@Injectable({
  providedIn: 'root'
})
export class DrawerService {
  public isDrawerOpen = signal<boolean>( false )
  public contentToDisplay = signal<string>( DrawerContents.NONE )
  public setToUpdate = signal<boolean>( false )
  public setInvoiceId = signal<string>('')
  public setPatientId = signal<string>('')

  
  public drawerTexts = signal<{header: string, btnText: string}>({
    header: '',
    btnText: ''
  })

  public shouldRefreshInvoices = signal<boolean>(false)

  // método opcional para resetear
  public triggerInvoiceRefresh() {
    this.shouldRefreshInvoices.set(true)
    setTimeout(() => this.shouldRefreshInvoices.set(false), 0)
  }

}
