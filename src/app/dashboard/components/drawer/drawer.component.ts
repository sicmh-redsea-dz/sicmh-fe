import { Component, computed, inject, signal } from '@angular/core';
import { DrawerService } from '../../services/drawer-service/drawer.service';

@Component({
  selector: 'app-drawer',
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.css'
})
export class DrawerComponent {
  private isDrawerOpen = inject( DrawerService )
  public isDrawerVisible = computed(() => this.isDrawerOpen.isDrawerOpen())

  public setDrawerVisibility() {
    if( this.isDrawerVisible() ) this.isDrawerOpen.isDrawerOpen.set( false )
  }
  
}
