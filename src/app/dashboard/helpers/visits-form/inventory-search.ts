import type { Stock } from '../../interface/visits-service.interface'

export interface InventorySearchEntry {
  item: Stock
  text: string
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** Build once per catalog update, rather than normalizing every item on each keypress. */
export const indexInventory = (items: readonly Stock[]): InventorySearchEntry[] => items.map((item) => ({
  item, text: normalize(`${item.productName} ${item.productDescription ?? ''}`),
}))

export const searchInventory = (
  index: readonly InventorySearchEntry[],
  query: string,
  selectedIds: ReadonlySet<string>,
  limit = 30,
): { items: Stock[]; hasMore: boolean } => {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  const items: Stock[] = []
  for (const entry of index) {
    if (entry.item.productQuantity <= 0 || selectedIds.has(entry.item.id) || !terms.every((term) => entry.text.includes(term))) continue
    if (items.length === limit) return { items, hasMore: true }
    items.push(entry.item)
  }
  return { items, hasMore: false }
}
