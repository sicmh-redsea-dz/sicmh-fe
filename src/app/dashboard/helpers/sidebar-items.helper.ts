import { RouterLink } from "@angular/router";

export const sidebarItmes = [
  {
    label: 'Dashboard',
    icon: 'ph-bold ph-house-simple',
    hasSubmenu: false,
    routerLink: 'dashboard'
  },
  {
    label: 'Audience',
    icon: 'ph-bold ph-user',
    hasSubmenu: true,
    subItems: [{label: 'Users', routerLink: 'patients'}, {label:'Subscribers', routerLink:''}],
    arrowIcon: 'ph-bold ph-caret-down'
  },
  {
    label: 'Posts',
    icon: 'ph-bold ph-file-text',
    hasSubmenu: false,
    routerLink: ''
  },
  {
    label: 'Schedules',
    icon: 'ph-bold ph-calendar-blank',
    hasSubmenu: false,
    routerLink: ''
  },
  {
    label: 'Income',
    icon: 'ph-bold ph-chart-bar',
    hasSubmenu: true,
    subItems: [{label: 'Earnings', routerLink: ''}, {label:'Funds', routerLink:''}],
    arrowIcon: 'ph-bold ph-caret-down'
  }
]