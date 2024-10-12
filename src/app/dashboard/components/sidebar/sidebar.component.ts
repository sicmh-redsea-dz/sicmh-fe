import { Component, computed, inject, Input } from '@angular/core';
import { sidebarItmes } from '../../helpers/sidebar-items.helper';
import { User } from '../../../auth/interfaces';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
 public items = sidebarItmes
 public toggledStates:boolean[] = []
 public toggledSidebar:boolean = false
 private authService = inject( AuthService )
 private userSignal = computed(() => this.authService.currentUser())

  constructor(){
    this.toggledStates = this.items.map(() => false);
  }

  public get user() {
    return {
      name: this.userSignal()?.name,
      role: this.userSignal()?.roles[0]
    }
  }

  
  public toggleSidebar() {
    this.toggledSidebar = !this.toggledSidebar
  }

  public toggleItem( idx:number ) {
    this.toggledStates = this.toggledStates.map((state, i) => i === idx ? !state : false);
  }

  public handleMouseLeaveSubmenuOnCollapse() {
    if( !this.toggledSidebar ) return
    this.toggledStates = this.toggledStates.map((item) => {
      item = item ? false : false
      return item
    })
  }

  public handleSubmenuOnCollapse(idx: number){
    if( !this.toggledSidebar ) return
    this.toggledStates[idx] = false
  }

  public onLogout() {
    this.authService.logout()
  }
}
