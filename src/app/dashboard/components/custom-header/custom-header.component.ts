import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'custom-header',
  templateUrl: './custom-header.component.html',
  styleUrl: './custom-header.component.css'
})
export class CustomHeaderComponent {
  @Input() headerText: string = ''
  @Input() itemCounter: number = 0
  @Input() btnRouterLink: string = ''

  @Output() searchTerm = new EventEmitter()
  @Output() btnDrawerTrigger = new EventEmitter()

  public execSearchTerm(term: string) {
    this.searchTerm.emit( term )
  }

  public execDrawerTrigger() {
    this.btnDrawerTrigger.emit()
  }
}
