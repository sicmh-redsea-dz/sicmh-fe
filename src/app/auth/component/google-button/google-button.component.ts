import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-google-button',
  templateUrl: './google-button.component.html',
  styleUrl: './google-button.component.css'
})
export class GoogleButtonComponent {
  @Output() onClick = new EventEmitter<Event>()

  public execGoogleButton(e: Event) {
    this.onClick.emit(e)
  }
}
