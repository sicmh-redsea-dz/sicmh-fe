import { Component } from '@angular/core';

@Component({
  selector: 'app-visits-form-page',
  templateUrl: './visits-form-page.component.html',
  styleUrl: './visits-form-page.component.css'
})
export class VisitsFormPageComponent {
  public myFunc(event: Event) {
    event.preventDefault()
  }

}
