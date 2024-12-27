import { Injectable, signal } from '@angular/core';
import { DrawerContents } from '../../interface/drawer-content.enum';

@Injectable({
  providedIn: 'root'
})
export class DrawerService {

  public isDrawerOpen = signal<boolean>( true )
  public contentToDisplay = signal<string>(DrawerContents.INVOICE)

}
