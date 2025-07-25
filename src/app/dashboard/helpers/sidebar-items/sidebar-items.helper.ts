export const sidebarItmes = [
  {
    label: 'Panel',
    icon: 'ph-bold ph-house-simple',
    hasSubmenu: false,
    routerLink: 'main'
  },
  {
    label: 'Audiencia',
    icon: 'ph-bold ph-user',
    hasSubmenu: true,
    subItems: [
      {
        label: 'Pacientes', 
        routerLink: 'patients'
      }, 
      {
        label:'Visitas', 
        routerLink:'visits'
      },
      {
        label:'Emergencias', 
        routerLink:'emergency'
      }
    ],
    arrowIcon: 'ph-bold ph-caret-down'
  },
  // {
  //   label: 'Publicaciones',
  //   icon: 'ph-bold ph-file-text',
  //   hasSubmenu: false,
  //   routerLink: ''
  // },
  // {
  //   label: 'Horarios',
  //   icon: 'ph-bold ph-calendar-blank',
  //   hasSubmenu: false,
  //   routerLink: ''
  // },
  {
    label: 'Ingreso',
    icon: 'ph-bold ph-chart-bar',
    hasSubmenu: true,
    subItems: [
      {
        label: 'Facturación', 
        routerLink: 'income/billings'
      }, 
      // {
      //   label:'Fondos', 
      //   routerLink:''
      // }
    ],
    arrowIcon: 'ph-bold ph-caret-down'
  }
]