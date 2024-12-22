import { Component, EventEmitter, Output, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-custom-table',
  templateUrl: './custom-table.component.html',
  styleUrl: './custom-table.component.css'
})
export class CustomTableComponent {
  @Input() headers: string[] = []
  @Input() bodyContent: string[][] = []
  @Output() deleteSelectedItem = new EventEmitter()

 public execItemDeletion() {
  this.deleteSelectedItem.emit()
 }
}
