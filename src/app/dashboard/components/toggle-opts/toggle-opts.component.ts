import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'toggle-opts',
  templateUrl: './toggle-opts.component.html',
  styleUrl: './toggle-opts.component.css'
})
export class ToggleOptsComponent {
  @Input() isEditBlocked: boolean = false
  @Output() editEvent = new EventEmitter() 
  @Output() deleteEvent = new EventEmitter() 

  public execEditEvent() {
    if ( this.isEditBlocked ) return
    this.editEvent.emit()
  }
  public execDeleteEvent() {
    this.deleteEvent.emit()
  }
}
