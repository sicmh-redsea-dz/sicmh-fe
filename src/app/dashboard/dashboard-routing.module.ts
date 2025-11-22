import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
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

const routes: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: 'main', component: DashboardPageComponent },
      { path: 'patients', component: PatientsPageComponent },
      {
        path: 'patients',
        children: [
          { path: ':id', component: PatientFormPageComponent },
          { path: 'new-patient', component: PatientFormPageComponent },

        ]
      },
      { path: 'emergency', component: VisitsPageComponent },
      {
        path: 'emergency',
        children: [
          { path: 'edit-visit/:id', component: VisitsFormPageV2Component },
          { path: 'new-visit', component: VisitsFormPageV2Component },
        ]
      },
      { path: 'visits', component: VisitsPageComponent },
      {
        path: 'visits',
        children: [
          { path: 'edit-visit/:id', component: VisitsFormPageComponent },
          { path: 'new-visit', component: VisitsFormPageComponent },
        ]
      },
      { path: 'income/billings', component: BillingPageComponent },
      { path: 'inventory/products', component: InventoryPageComponent },
      { 
        path: 'settings', 
        component: SettingsPageComponent,
        children: [
          { path: '', redirectTo: 'my-profile', pathMatch: 'full' },
          { path: 'my-profile', component: MyProfileComponent },
          { path: 'permissions', component: PermissionsComponent },
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
