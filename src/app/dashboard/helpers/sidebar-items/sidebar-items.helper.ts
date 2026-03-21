import { Permission } from '../../../auth/permissions/permissions'

export interface SidebarSubItem {
  label: string
  routerLink: string
  requiredPermissions?: Permission[]
}

export interface SidebarItem {
  label: string
  icon: string
  hasSubmenu: boolean
  routerLink?: string
  subItems?: SidebarSubItem[]
  arrowIcon?: string
  requiredPermissions?: Permission[]
}

export const sidebarItems: SidebarItem[] = [
  {
    label: 'Panel',
    icon: 'ph-bold ph-house-simple',
    hasSubmenu: false,
    routerLink: 'main',
    requiredPermissions: ['dashboard.view']
  },
  {
    label: 'Pacientes',
    icon: 'ph-bold ph-user-plus',
    hasSubmenu: false,
    routerLink: 'patients',
    requiredPermissions: ['patients.read']
  },
  {
    label: 'Atención Medica',
    icon: 'ph-bold ph-stethoscope',
    hasSubmenu: true,
    subItems: [
      {
        label: 'Consulta Externa',
        routerLink:'visits',
        requiredPermissions: ['visits.read']
      },
      {
        label:'Emergencias',
        routerLink:'emergency',
        requiredPermissions: ['visits.read']
      },
      {
        label: 'Quirofano',
        routerLink: 'o-room',
        requiredPermissions: ['visits.read']
      },
      {
        label: 'Hospitalización',
        routerLink: 'hospitalization',
        requiredPermissions: ['visits.read']
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
        routerLink: 'income/billings',
        requiredPermissions: ['invoice.read']
      },
    ],
    arrowIcon: 'ph-bold ph-caret-down'
  },
  {
    label: 'Inventario',
    icon: 'ph-bold ph-warehouse',
    hasSubmenu: false,
    routerLink: 'inventory/products',
    requiredPermissions: ['inventory.read']
  }
]
