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
    VisitsFormPageComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    ReactiveFormsModule
  ]
})
export class DashboardModule { }
