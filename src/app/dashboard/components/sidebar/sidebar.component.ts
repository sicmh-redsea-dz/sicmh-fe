import { Component, computed, effect, inject } from '@angular/core';
import { SidebarItem, sidebarItems } from '../../helpers/sidebar-items/sidebar-items.helper';
import { AuthService } from '../../../auth/services/auth.service';
import { Permission } from '../../../auth/permissions/permissions';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
 private authService = inject( AuthService )
 public items = computed<SidebarItem[]>(() => {
  return sidebarItems
    .map((item) => {
      const isItemAllowed = this.isAllowed(item.requiredPermissions)

      if (item.hasSubmenu && item.subItems) {
        const subItems = item.subItems.filter((subItem) =>
          this.isAllowed(subItem.requiredPermissions)
        )

        if (subItems.length === 0) return null

        return {
          ...item,
          subItems,
          hasSubmenu: true
        }
      }

      if (!isItemAllowed) return null
      return item
    })
    .filter((item): item is SidebarItem => item !== null)
 })
 public toggledStates:boolean[] = []
 public toggledSidebar:boolean = false
 private userSignal = computed(() => this.authService.currentUser())

  constructor(){
    effect(() => {
      const currentItems = this.items()
      this.toggledStates = currentItems.map(() => false)
    })
  }

  public get user() {
    return {
      name: this.userSignal()?.name,
      role: this.userSignal()?.roles?.[0] ?? ''
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

  private isAllowed(required?: Permission[]): boolean {
    if (!required || required.length === 0) return true
    return this.authService.hasAnyPermission(required)
  }

  public onLogout() {
    this.authService.logout()
  }
}
