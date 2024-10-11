import { Component, computed, inject, OnInit } from '@angular/core'
import { cva } from '../../../../../styled-system/css'
import { AuthService } from '../../../auth/services/auth.service'

@Component({
  selector: 'app-dashboard-layout',
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css'
})
export class DashboardLayoutComponent {
  constructor(){
    this.toggledStates = this.items.map(() => false);
  }

  public toggledStates:boolean[] = []
  public items = [
    {
      label: 'Dashboard',
      icon: 'ph-house-simple',
      hasSubmenu: false,
    },
    {
      label: 'Audience',
      icon: 'ph-bold ph-user',
      hasSubmenu: true,
      subItems: ['Users', 'Subscribers'],
      arrowIcon: 'ph-bold ph-caret-down'
    },
    {
      label: 'Posts',
      icon: 'ph-bold ph-file-text',
      hasSubmenu: false,
    },
    {
      label: 'Schedules',
      icon: 'ph-bold ph-calendar-blank',
      hasSubmenu: false,
    },
    {
      label: 'Income',
      icon: 'ph-bold ph-chart-bar',
      hasSubmenu: true,
      subItems: ['Earnings', 'Funds', 'Declines', 'Payouts'],
      arrowIcon: 'ph-bold ph-caret-down'
    }
  ]
  private authService = inject( AuthService )
  public user = computed(() => this.authService.currentUser())

  toggleItem( idx:number ) {
    this.toggledStates = this.toggledStates.map((state, i) => i === idx ? !state : false);
  }

  onLogout() {
    this.authService.logout()
  }
}
