import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-custom-table',
  templateUrl: './custom-table.component.html',
  styleUrl: './custom-table.component.css'
})
export class CustomTableComponent {
  @Input() headers: string[] = []
  @Input() bodyContent: any[] = []
  @Input() canEdit: boolean = true
  @Input() canDelete: boolean = true
  @Output() deleteSelectedItem = new EventEmitter()
  @Output() finishUpdatingItem = new EventEmitter()
  @Output() insertItem = new EventEmitter()



  public execItemInsertion() {
    this.insertItem.emit()
  }

  public execItemUpdate(id: string) {
    this.finishUpdatingItem.emit(id)
  }
  
  public execItemDeletion(invoiceId: string) {
    this.deleteSelectedItem.emit(invoiceId)
  }
}
