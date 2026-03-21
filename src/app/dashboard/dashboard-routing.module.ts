import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
import { permissionsGuard } from '../auth/guards';
import { PatientsPageComponent } from './pages/patients-page/patients-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { PatientFormPageComponent } from './pages/patient-form-page/patient-form-page.component';
import { VisitsPageComponent } from './pages/visits-page/visits-page.component';
import { VisitsFormPageComponent } from './pages/visits-form-page/visits-form-page.component';
import { BillingPageComponent } from './pages/billing-page/billing-page.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { VisitsFormPageV2Component } from './pages/visits-v2-form-page/visits-form-page-v2/visits-form-page-v2.component';
import { MyProfileComponent } from './pages/settings-page/my-profile/my-profile.component';
import { PermissionsComponent } from './pages/settings-page/permissions/permissions.component';
import { InventoryPageComponent } from './pages/inventory-page/inventory-page.component';
import { InventoryFormPageComponent } from './pages/inventory-form-page/inventory-form-page.component';
import { VisitsReportPageComponent } from './pages/visits-report-page/visits-report-page.component';
import { BedsManagementPageComponent } from './pages/beds-management-page/beds-management-page.component';
import { OrRoomsManagementPageComponent } from './pages/or-rooms-management-page/or-rooms-management-page.component';
import { InvoicePreviewPageComponent } from './pages/invoice-preview-page/invoice-preview-page.component';
import { PatientMovementsPageComponent } from './pages/patient-movements-page/patient-movements-page.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { 
        path: 'main', 
        component: DashboardPageComponent,
        canActivate: [permissionsGuard],
        data: { permissions: ['dashboard.view'] }
      },
      {
        path: 'patients',
        children: [
          { 
            path: '', 
            component: PatientsPageComponent, 
            pathMatch: 'full',
            canActivate: [permissionsGuard],
            data: { permissions: ['patients.read'] }
          },
          { 
            path: 'new-patient', 
            component: PatientFormPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['patients.create'] }
          },
          { 
            path: ':id/movements',
            component: PatientMovementsPageComponent,
            canActivate: [permissionsGuard],
            data: { anyPermissions: ['invoice.update', 'invoice.create'] }
          },
          { 
            path: ':id', 
            component: PatientFormPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['patients.update'] }
          },
        ]
      },

      {
        path: 'o-room',
        children: [
          { 
            path: '', 
            component: VisitsPageComponent, 
            pathMatch: 'full',
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.read'] }
          },
          { 
            path: 'new-visit', 
            component: VisitsFormPageV2Component,
            canActivate: [permissionsGuard],
            data: {
              permissions: ['visits.create'],
              origin: 'oroom',
              stockSearchId: 3,
              includeSubinventoryInPayload: false,
              payloadSubinventoryId: 3,
              titleNew: 'Registro de quirofano',
              subtitleNew: 'Agrega los detalles de quirofano.',
              titleEdit: 'Editar quirofano',
              subtitleEdit: 'Actualiza los detalles de quirofano.'
            }
          },
          { 
            path: 'edit-visit/:id', 
            component: VisitsFormPageV2Component,
            canActivate: [permissionsGuard],
            data: {
              permissions: ['visits.update'],
              origin: 'oroom',
              stockSearchId: 3,
              includeSubinventoryInPayload: false,
              payloadSubinventoryId: 3,
              titleNew: 'Registro de quirofano',
              subtitleNew: 'Agrega los detalles de quirofano.',
              titleEdit: 'Editar quirofano',
              subtitleEdit: 'Actualiza los detalles de quirofano.'
            }
          },
          { 
            path: 'report/:id', 
            component: VisitsReportPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.read'], origin: 'oroom' }
          },
          { 
            path: 'rooms', 
            component: OrRoomsManagementPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.update'], title: 'Quirófanos' }
          }
        ]
      },

      {
        path: 'hospitalization',
        children: [
          { 
            path: '', 
            component: VisitsPageComponent, 
            pathMatch: 'full',
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.read'] }
          },
          { 
            path: 'new-visit', 
            component: VisitsFormPageV2Component,
            canActivate: [permissionsGuard],
            data: {
              permissions: ['visits.create'],
              origin: 'hospitalization',
              stockSearchId: 4,
              includeSubinventoryInPayload: false,
              payloadSubinventoryId: 4,
              titleNew: 'Registro de hospitalización',
              subtitleNew: 'Agrega los detalles de hospitalización.',
              titleEdit: 'Editar hospitalización',
              subtitleEdit: 'Actualiza los detalles de hospitalización.'
            }
          },
          { 
            path: 'edit-visit/:id', 
            component: VisitsFormPageV2Component,
            canActivate: [permissionsGuard],
            data: {
              permissions: ['visits.update'],
              origin: 'hospitalization',
              stockSearchId: 4,
              includeSubinventoryInPayload: false,
              payloadSubinventoryId: 4,
              titleNew: 'Registro de hospitalización',
              subtitleNew: 'Agrega los detalles de hospitalización.',
              titleEdit: 'Editar hospitalización',
              subtitleEdit: 'Actualiza los detalles de hospitalización.'
            }
          },
          { 
            path: 'report/:id', 
            component: VisitsReportPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.read'], origin: 'hospitalization' }
          },
          { 
            path: 'beds', 
            component: BedsManagementPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.update'], module: 'hospitalization', title: 'Camas de hospitalización' }
          }
        ]
      },

      {
        path: 'emergency',
        children: [
          { 
            path: '', 
            component: VisitsPageComponent, 
            pathMatch: 'full',
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.read'] }
          },
          { 
            path: 'edit-visit/:id', 
            component: VisitsFormPageV2Component,
            canActivate: [permissionsGuard],
            data: {
              permissions: ['visits.update'],
              origin: 'emergency',
              stockSearchId: 2,
              includeSubinventoryInPayload: true,
              payloadSubinventoryId: 2,
              titleNew: 'Registro de emergencia',
              subtitleNew: 'Agrega los detalles de emergencia médica.',
              titleEdit: 'Editar emergencia',
              subtitleEdit: 'Actualiza los detalles de emergencia médica.'
            }
          },
          { 
            path: 'new-visit', 
            component: VisitsFormPageV2Component,
            canActivate: [permissionsGuard],
            data: {
              permissions: ['visits.create'],
              origin: 'emergency',
              stockSearchId: 2,
              includeSubinventoryInPayload: true,
              payloadSubinventoryId: 2,
              titleNew: 'Registro de emergencia',
              subtitleNew: 'Agrega los detalles de emergencia médica.',
              titleEdit: 'Editar emergencia',
              subtitleEdit: 'Actualiza los detalles de emergencia médica.'
            }
          },
          { 
            path: 'report/:id', 
            component: VisitsReportPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.read'], origin: 'emergency' }
          },
          { 
            path: 'beds', 
            component: BedsManagementPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.update'], module: 'emergency', title: 'Camas de emergencia' }
          },
        ]
      },

      {
        path: 'visits',
        children: [
          { 
            path: '', 
            component: VisitsPageComponent, 
            pathMatch: 'full',
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.read'] }
          },
          { 
            path: 'new-visit', 
            component: VisitsFormPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.create'] }
          },
          { 
            path: 'edit-visit/:id', 
            component: VisitsFormPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.update'] }
          },
          { 
            path: 'report/:id', 
            component: VisitsReportPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['visits.read'], origin: 'visits' }
          },
        ]
      },

      { 
        path: 'income/billings', 
        component: BillingPageComponent,
        canActivate: [permissionsGuard],
        data: { permissions: ['invoice.read'] }
      },
      { 
        path: 'income/billings/view/:invoiceNumber',
        component: InvoicePreviewPageComponent,
        canActivate: [permissionsGuard],
        data: { permissions: ['invoice.read'] }
      },

      { 
        path: 'inventory',
        children: [
          { 
            path: 'products', 
            component: InventoryPageComponent,
            canActivate: [permissionsGuard],
            data: {
              permissions: ['inventory.read'],
              headerText: 'Inventario General'
            }
          },
          { 
            path: 'products/new-item', 
            component: InventoryFormPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['inventory.create'] }
          },
          { 
            path: 'products/edit-item/:id', 
            component: InventoryFormPageComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['inventory.update'] }
          },
          { path: 'products-sub1', redirectTo: 'products', pathMatch: 'full' },
          { path: 'products-sub2', redirectTo: 'products', pathMatch: 'full' },
          { path: 'products-sub3', redirectTo: 'products', pathMatch: 'full' }
        ]
      },

      { 
        path: 'settings', 
        component: SettingsPageComponent,
        children: [
          { path: '', redirectTo: 'my-profile', pathMatch: 'full' },
          { path: 'my-profile', component: MyProfileComponent },
          { 
            path: 'permissions', 
            component: PermissionsComponent,
            canActivate: [permissionsGuard],
            data: { permissions: ['settings.permissions.manage'] }
          },
        ]
      },
      { path: '**', redirectTo: 'main'}
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
