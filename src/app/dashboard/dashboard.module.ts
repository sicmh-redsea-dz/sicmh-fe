import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule }  from '@fullcalendar/angular';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { PatientsPageComponent } from './pages/patients-page/patients-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { PatientFormPageComponent } from './pages/patient-form-page/patient-form-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VisitsPageComponent } from './pages/visits-page/visits-page.component';
import { VisitsFormPageComponent } from './pages/visits-form-page/visits-form-page.component';
import { BillingPageComponent } from './pages/billing-page/billing-page.component';
import { DrawerComponent } from './components/drawer/drawer.component';
import { InvoiceComponent } from './components/drawer-body-components/invoice/invoice.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { VisitsFormPageV2Component } from './pages/visits-v2-form-page/visits-form-page-v2/visits-form-page-v2.component';
import { VisitsReportPageComponent } from './pages/visits-report-page/visits-report-page.component';
import { MyProfileComponent } from './pages/settings-page/my-profile/my-profile.component';
import { PermissionsComponent } from './pages/settings-page/permissions/permissions.component';
import { InventoryPageComponent } from './pages/inventory-page/inventory-page.component';
import { TransferComponent } from './components/drawer-body-components/transfers/transfer.component';
import { InventoryFormPageComponent } from './pages/inventory-form-page/inventory-form-page.component';
import { SharedModule } from '../shared/shared.module';
import { BedsManagementPageComponent } from './pages/beds-management-page/beds-management-page.component';
import { OrRoomsManagementPageComponent } from './pages/or-rooms-management-page/or-rooms-management-page.component';
import { PatientViewComponent } from './components/drawer-body-components/patient-view/patient-view.component';


@NgModule({
  declarations: [
    DashboardLayoutComponent,
    SidebarComponent,
    PatientsPageComponent,
    DashboardPageComponent,
    PatientFormPageComponent,
    VisitsPageComponent,
    VisitsFormPageComponent,
    BillingPageComponent,
    DrawerComponent,
    InvoiceComponent,
    SettingsPageComponent,
    VisitsFormPageV2Component,
    VisitsReportPageComponent,
    MyProfileComponent,
    PermissionsComponent,
    InventoryPageComponent,
    TransferComponent,
    InventoryFormPageComponent,
    BedsManagementPageComponent,
    OrRoomsManagementPageComponent,
    PatientViewComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    ReactiveFormsModule,
    FullCalendarModule,
    FormsModule,
    SharedModule
  ]
})
export class DashboardModule { }
