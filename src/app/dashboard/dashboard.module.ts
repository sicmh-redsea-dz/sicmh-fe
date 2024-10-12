import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { PatientsPageComponent } from './pages/patients-page/patients-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';


@NgModule({
  declarations: [
    DashboardLayoutComponent,
    SidebarComponent,
    PatientsPageComponent,
    DashboardPageComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule
  ]
})
export class DashboardModule { }
