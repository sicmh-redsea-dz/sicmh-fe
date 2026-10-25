import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { Stock } from '../../interface/visits-service.interface'
import { indexInventory, searchInventory } from '../../helpers/visits-form/inventory-search'

let nextPickerId = 0

@Component({
  selector: 'app-inventory-picker',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-picker.component.html',
  styleUrl: './inventory-picker.component.css',
})
export class InventoryPickerComponent {
  readonly items = input<readonly Stock[] | null>(null)
  readonly selectedItems = input<readonly Stock[]>([])
  readonly itemAdded = output<Stock>()
  readonly query = signal('')
  readonly open = signal(false)
  readonly activeIndex = signal(0)
  readonly inputId = `inventory-search-${++nextPickerId}`
  readonly listId = `${this.inputId}-options`
  private readonly list = viewChild<ElementRef<HTMLUListElement>>('list')
  private readonly index = computed(() => indexInventory(this.items() ?? []))
  private readonly selectedIds = computed(() => new Set(this.selectedItems().map((item) => item.id)))
  readonly results = computed(() => searchInventory(this.index(), this.query(), this.selectedIds()))
  readonly activeOptionId = computed(() => this.open() && this.results().items[this.activeIndex()]
    ? `${this.listId}-${this.activeIndex()}` : null)

  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value)
    this.activeIndex.set(0)
    this.open.set(true)
  }

  choose(item: Stock): void {
    if (this.selectedIds().has(item.id)) return
    this.itemAdded.emit(item)
    this.query.set('')
    this.activeIndex.set(0)
    // Keep focus and suggestions available for adding several supplies quickly.
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.key === 'Tab') {
      this.open.set(false)
      if (event.key === 'Escape') event.preventDefault()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault() // Searching/adding inventory must never submit the visit form.
      const item = this.results().items[this.activeIndex()]
      if (this.open() && item) this.choose(item)
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const count = this.results().items.length
    if (!count) { this.open.set(true); return }
    const index = this.open()
      ? (this.activeIndex() + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
      : event.key === 'ArrowDown' ? 0 : count - 1
    this.open.set(true)
    this.activeIndex.set(index)
    requestAnimationFrame(() => this.list()?.nativeElement.children.item(index)?.scrollIntoView({ block: 'nearest' }))
  }
}
