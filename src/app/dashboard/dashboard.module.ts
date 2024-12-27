import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { PatientsPageComponent } from './pages/patients-page/patients-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { FormatFullnamePipe } from './pipes/format-fullname.pipe';
import { FormatDatePipe } from './pipes/format-date.pipe';
import { PatientFormPageComponent } from './pages/patient-form-page/patient-form-page.component';
import { ReactiveFormsModule } from '@angular/forms';
import { VisitsPageComponent } from './pages/visits-page/visits-page.component';
import { VisitsFormPageComponent } from './pages/visits-form-page/visits-form-page.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { PaginationComponent } from './components/pagination/pagination.component';
import { BillingPageComponent } from './pages/billing-page/billing-page.component';
import { CustomTableComponent } from './components/custom-table/custom-table.component';
import { DrawerComponent } from './components/drawer/drawer.component';
import { InvoiceComponent } from './components/drawer-body-components/invoice/invoice.component';


@NgModule({
  declarations: [
    DashboardLayoutComponent,
    SidebarComponent,
    PatientsPageComponent,
    DashboardPageComponent,
    FormatFullnamePipe,
    FormatDatePipe,
    PatientFormPageComponent,
    VisitsPageComponent,
    VisitsFormPageComponent,
    SearchBarComponent,
    PaginationComponent,
    BillingPageComponent,
    CustomTableComponent,
    DrawerComponent,
    InvoiceComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    ReactiveFormsModule
  ]
})
export class DashboardModule { }
