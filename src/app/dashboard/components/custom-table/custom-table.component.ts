import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-custom-table',
  templateUrl: './custom-table.component.html',
  styleUrl: './custom-table.component.css'
})
export class CustomTableComponent {
  @Input() headers: string[] = []
  @Input() bodyContent: string[][] = []
  @Output() deleteSelectedItem = new EventEmitter()
  @Output() insertItem = new EventEmitter()



  public execItemInsertion() {
    this.insertItem.emit()
  }
  
  public execItemDeletion() {
    this.deleteSelectedItem.emit()
  }
}
