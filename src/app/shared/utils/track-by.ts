export function trackById<T extends { id: any }>(_index: number, item: T): any {
  return item.id
}

export function trackByValue<T extends { value: any }>(_index: number, item: T): any {
  return item.value
}

export function trackByKey<T extends { key: any }>(_index: number, item: T): any {
  return item.key
}

export function trackByIndex(index: number): number {
  return index
}

export function trackBySelf<T>(_index: number, item: T): T {
  return item
}
