export const sidebarItmes = [
  {
    label: 'Dashboard',
    icon: 'ph-bold ph-house-simple',
    hasSubmenu: false,
    routerLink: 'main'
  },
  {
    label: 'Audience',
    icon: 'ph-bold ph-user',
    hasSubmenu: true,
    subItems: [{label: 'Patients', routerLink: 'patients'}, {label:'Visits', routerLink:'visits'}],
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
    subItems: [{label: 'Billings', routerLink: 'income/billings'}, {label:'Funds', routerLink:''}],
    arrowIcon: 'ph-bold ph-caret-down'
  }
]