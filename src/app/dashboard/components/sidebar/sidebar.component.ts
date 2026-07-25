import { Component, computed, effect, inject } from '@angular/core';
import { SidebarItem, sidebarItems } from '../../helpers/sidebar-items/sidebar-items.helper';
import { AuthService } from '../../../auth/services/auth.service';
import { Permission } from '../../../auth/permissions/permissions';
import { AttachmentsService } from '../../services/attachments-service/attachments.service';
import { trackByIndex } from '../../../shared/utils/track-by';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
 public trackByIndex = trackByIndex
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
 private attachmentsService = inject( AttachmentsService )
 public toggledStates:boolean[] = []
 public toggledSidebar:boolean = false
 public settingsOpen:boolean = false
 public logoFailed = false
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

  public get logoUrl(): string | null {
    const tenantCode = localStorage.getItem('codigoEmpresa')
    if (!tenantCode || this.logoFailed) return null
    return this.attachmentsService.logoUrl(tenantCode)
  }

  public onLogoError() {
    this.logoFailed = true
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

  public toggleSettings() {
    this.settingsOpen = !this.settingsOpen
  }

  public handleSettingsSubmenuOnCollapse() {
    if (!this.toggledSidebar) return
    this.settingsOpen = false
  }

  public canManageSettings(): boolean {
    return this.isAllowed(['settings.permissions.manage'])
  }

  public onLogout() {
    this.authService.logout()
  }
}
