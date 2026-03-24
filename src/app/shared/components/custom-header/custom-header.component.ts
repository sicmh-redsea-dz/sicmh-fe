import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'custom-header',
  templateUrl: './custom-header.component.html',
  styleUrl: './custom-header.component.css'
})
export class CustomHeaderComponent {
  @Input() headerText: string = ''
  @Input() subHeaderText: string = ''
  @Input() itemCounter: number = 0
  @Input() inputPlaceholder: string = ''
  @Input() btnRouterLink: string = ''
  @Input() showCreateButton: boolean = true
  @Input() disableCreateButton: boolean = false
  @Input() isDwnldRerportLoading: boolean = false
  @Input() showDownloadBtnOverride: boolean | null = null

  @Output() searchTerm = new EventEmitter()
  @Output() btnDrawerTrigger = new EventEmitter()
  @Output() btnDownloadReport = new EventEmitter()

  public urlSegment: string = ''
  public showDonwloadBtn: boolean = false

  private readonly router = inject( Router )

  constructor() {
    this.urlSegment = (this.router.url).split('/')[2]
    if ( this.urlSegment === 'income' )
      this.showDonwloadBtn = true
    else
      this.showDonwloadBtn = false
  }

  get displayDownloadBtn(): boolean {
    return this.showDownloadBtnOverride === null
      ? this.showDonwloadBtn
      : this.showDownloadBtnOverride
  }

  public execSearchTerm(term: string) {
    this.searchTerm.emit( term )
  }

  public execDrawerTrigger() {
    this.btnDrawerTrigger.emit()
  }

  public execDonwloadReport(term: string) {
    this.btnDownloadReport.emit(term)
  }
}
