import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-custom-table',
  templateUrl: './custom-table.component.html',
  styleUrl: './custom-table.component.css'
})
export class CustomTableComponent {
  @Input() headers: string[] = []
  @Input() bodyContent: any[] = []
  @Input() canView: boolean = false
  @Input() canEdit: boolean = true
  @Input() canDelete: boolean = true
  @Input() deleteLabel: string = 'Eliminar'
  @Output() deleteSelectedItem = new EventEmitter()
  @Output() finishUpdatingItem = new EventEmitter()
  @Output() insertItem = new EventEmitter()
  @Output() viewSelectedItem = new EventEmitter()



  public execItemInsertion() {
    this.insertItem.emit()
  }

  public execItemUpdate(id: string) {
    this.finishUpdatingItem.emit(id)
  }

  public execItemView(id: string) {
    this.viewSelectedItem.emit(id)
  }
  
  public execItemDeletion(invoiceId: string) {
    this.deleteSelectedItem.emit(invoiceId)
  }

  public handleRowClick(item: any) {
    const status = (item?.Estado ?? '').toString().toLowerCase()
    if (this.canEdit && status === 'pendiente') {
      this.execItemUpdate(item.InvoiceNumber)
      return
    }
    if (this.canView) {
      this.execItemView(item.InvoiceNumber)
    }
  }

  public getStatusClass(status: string) {
    const normalized = (status || '').toString().toLowerCase()
    if (normalized.includes('pag')) return 'active'
    if (normalized.includes('anul')) return 'canceled'
    return 'warning'
  }
}
