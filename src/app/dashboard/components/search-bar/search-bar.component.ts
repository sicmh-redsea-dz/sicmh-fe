import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent {
  @Output() searchTermChange = new EventEmitter<string>()

  public onSearch(event: Event): void {
    const input = event.target as HTMLInputElement
    this.searchTermChange.emit( input.value )
  }
}
