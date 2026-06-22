import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { LoaderComponent } from './loader/loader.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { PaginationComponent } from './components/pagination/pagination.component';
import { CustomHeaderComponent } from './components/custom-header/custom-header.component';
import { CustomTableComponent } from './components/custom-table/custom-table.component';
import { NoDataComponent } from './components/no-data/no-data.component';
import { ToggleOptsComponent } from './components/toggle-opts/toggle-opts.component';
import { FormatDatePipe } from './pipes/format-date.pipe';
import { FormatFullnamePipe } from './pipes/format-fullname.pipe';
import { HasPermissionDirective } from './directives/has-permission.directive';
import { HasAnyPermissionDirective } from './directives/has-any-permission.directive';

@NgModule({
  declarations: [
    LoaderComponent,
    SearchBarComponent,
    PaginationComponent,
    CustomHeaderComponent,
    CustomTableComponent,
    NoDataComponent,
    ToggleOptsComponent,
    FormatDatePipe,
    FormatFullnamePipe,
    HasPermissionDirective,
    HasAnyPermissionDirective,
  ],
  imports: [
    CommonModule,
    RouterModule,
  ],
  exports: [
    LoaderComponent,
    SearchBarComponent,
    PaginationComponent,
    CustomHeaderComponent,
    CustomTableComponent,
    NoDataComponent,
    ToggleOptsComponent,
    FormatDatePipe,
    FormatFullnamePipe,
    HasPermissionDirective,
    HasAnyPermissionDirective,
  ]
})
export class SharedModule {}
