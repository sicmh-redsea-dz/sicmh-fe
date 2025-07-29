import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'custom-header',
  templateUrl: './custom-header.component.html',
  styleUrl: './custom-header.component.css'
})
export class CustomHeaderComponent {
  @Input() headerText: string = ''
  @Input() itemCounter: number = 0
  @Input() btnRouterLink: string = ''
  @Input() isDwnldRerportLoading: boolean = false

  @Output() searchTerm = new EventEmitter()
  @Output() btnDrawerTrigger = new EventEmitter()
  @Output() btnDownloadReport = new EventEmitter()

  private router = inject( Router )
  public urlSegment: string = ''
  public showDonwloadBtn: boolean = false

  constructor() {
    this.urlSegment = (this.router.url).split('/')[2]
    if ( this.urlSegment === 'income' )
      this.showDonwloadBtn = true
    else
      this.showDonwloadBtn = false
  }

  public execSearchTerm(term: string) {
    this.searchTerm.emit( term )
  }

  public execDrawerTrigger() {
    this.btnDrawerTrigger.emit()
  }

  public execDonwloadReport() {
    this.btnDownloadReport.emit()
  }
}
