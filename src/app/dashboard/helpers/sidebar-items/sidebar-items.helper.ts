export const sidebarItems = [
  {
    label: 'Panel',
    icon: 'ph-bold ph-house-simple',
    hasSubmenu: false,
    routerLink: 'main'
  },
  {
    label: 'Atención Medica',
    icon: 'ph-bold ph-user',
    hasSubmenu: true,
    subItems: [
      {
        label: 'Pacientes', 
        routerLink: 'patients'
      }, 
      {
        label:'Consulta Externa', 
        routerLink:'visits'
      },
      {
        label:'Emergencias', 
        routerLink:'emergency'
      },
      {
        label: 'Quirofano',
        routerLink: 'o-room'
      },
      {
        label: 'Hospitalización',
        routerLink: 'hospitalization'
      }
    ],
    arrowIcon: 'ph-bold ph-caret-down'
  },
  {
    label: 'Ingreso',
    icon: 'ph-bold ph-chart-bar',
    hasSubmenu: true,
    subItems: [
      {
        label: 'Facturación', 
        routerLink: 'income/billings'
      }, 
    ],
    arrowIcon: 'ph-bold ph-caret-down'
  },
  {
    label: 'Inventario',
    icon: 'ph-bold ph-warehouse',
    hasSubmenu: true,
    subItems: [
      {
        label: 'Inventario General',
        routerLink: 'inventory/products'
      },
      {
        label: 'Subinv - Emergencia',
        routerLink: 'inventory/products-sub1'
      },
      {
        label: 'Subinv - Quirofano',
        routerLink: 'inventory/products-sub2'
      },
      {
        label: 'Subinv - Hospitalización',
        routerLink: 'inventory/products-sub3'
      },
    ],
    arrowIcon: 'ph-bold ph-caret-down'
  }
]
