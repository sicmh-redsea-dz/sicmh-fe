import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DrawerService {

  public isDrawerOpen = signal<boolean>( false )

}
