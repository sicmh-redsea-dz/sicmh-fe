import '@angular/compiler'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createEnvironmentInjector, runInInjectionContext, signal } from '@angular/core'
import ts from 'typescript'

const compile = (relativePath) => ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, experimentalDecorators: true },
}).outputText
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const helperUrl = moduleUrl(compile('../src/app/dashboard/helpers/visits-form/inventory-search.ts'))
const { indexInventory, searchInventory } = await import(helperUrl)
const componentSource = compile('../src/app/dashboard/components/inventory-picker/inventory-picker.component.ts')
  .replace(/from ['"]@angular\/core['"]/g, `from '${import.meta.resolve('@angular/core')}'`)
  .replace(/from ['"]@angular\/common['"]/g, `from '${import.meta.resolve('@angular/common')}'`)
  .replace(/from ['"]\.\.\/\.\.\/helpers\/visits-form\/inventory-search['"]/g, `from '${helperUrl}'`)
const { InventoryPickerComponent } = await import(moduleUrl(componentSource))

const stock = (id, name, description = '') => ({ id, productName: name, productDescription: description,
  productQuantity: 25, productUnitPrice: 10, currentQuantity: 0 })
const catalog = [stock('uuid-a', 'Ácido acetilsalicílico', 'Tabletas de 100 mg'),
  stock('uuid-b', 'Gasa', 'Estéril para curación'), stock('uuid-c', 'Guantes', 'Talla grande')]

test('matches names/descriptions with case, accents and multiple search terms', () => {
  const index = indexInventory(catalog)
  assert.equal(searchInventory(index, 'ACIDO 100', new Set()).items[0].id, 'uuid-a')
  assert.equal(searchInventory(index, 'esteril CURACION', new Set()).items[0].id, 'uuid-b')
  assert.equal(searchInventory(index, 'producto inexistente', new Set()).items.length, 0)
})

test('caps empty/broad results and excludes selected UUIDs without mutating the catalog', () => {
  const items = Array.from({ length: 100 }, (_, i) => stock(`uuid-${i}`, `Producto ${i}`))
  const result = searchInventory(indexInventory(items), '', new Set(['uuid-0']))
  assert.equal(result.items.length, 30)
  assert.equal(result.items[0].id, 'uuid-1')
  assert.equal(result.hasMore, true)
  assert.equal(items.length, 100)
})

const pickerFixture = (items = catalog) => {
  const injector = createEnvironmentInjector([])
  const picker = runInInjectionContext(injector, () => new InventoryPickerComponent())
  const catalogSignal = signal(items)
  const selected = signal([])
  Object.defineProperty(picker, 'items', { value: catalogSignal })
  Object.defineProperty(picker, 'selectedItems', { value: selected })
  return { picker, selected, catalogSignal, destroy: () => injector.destroy() }
}
const keyboard = (key) => ({ key, prevented: false, preventDefault() { this.prevented = true } })

test('typing and catalog updates invalidate results but keystrokes reuse the indexed catalog', () => {
  const fixture = pickerFixture()
  try {
    const index = fixture.picker.index()
    fixture.picker.search({ target: { value: 'gasa' } })
    assert.equal(fixture.picker.results().items[0].id, 'uuid-b')
    assert.equal(fixture.picker.open(), true)
    assert.equal(fixture.picker.index(), index)
    fixture.catalogSignal.set([stock('new-uuid', 'Gasa nueva')])
    assert.equal(fixture.picker.results().items[0].id, 'new-uuid')
    assert.notEqual(fixture.picker.index(), index)
  } finally { fixture.destroy() }
})

test('selection preserves UUIDs, clears search and prevents re-adding selected products', () => {
  const fixture = pickerFixture()
  const added = []
  try {
    fixture.picker.itemAdded.subscribe((item) => {
      added.push(item)
      fixture.selected.set([...fixture.selected(), item])
    })
    fixture.picker.query.set('gasa')
    fixture.picker.choose(catalog[1])
    assert.equal(added[0].id, 'uuid-b')
    assert.equal(fixture.picker.query(), '')
    assert.ok(fixture.picker.results().items.every((item) => item.id !== 'uuid-b'))
    fixture.picker.choose(catalog[1])
    assert.equal(added.length, 1)
    fixture.selected.set([])
    assert.ok(fixture.picker.results().items.some((item) => item.id === 'uuid-b'))
  } finally { fixture.destroy() }
})

test('Enter adds the active result and never submits the surrounding form', () => {
  const fixture = pickerFixture()
  const added = []
  try {
    fixture.picker.itemAdded.subscribe((item) => added.push(item))
    fixture.picker.search({ target: { value: 'gasa' } })
    const event = keyboard('Enter')
    fixture.picker.onKeydown(event)
    assert.equal(event.prevented, true)
    assert.equal(added[0].id, 'uuid-b')
    fixture.picker.search({ target: { value: 'free text without a match' } })
    fixture.picker.onKeydown(keyboard('Enter'))
    assert.equal(added.length, 1)
  } finally { fixture.destroy() }
})

test('keyboard navigation wraps, Escape closes and Tab preserves normal focus navigation', () => {
  const fixture = pickerFixture()
  const previous = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = () => 0
  try {
    fixture.picker.onKeydown(keyboard('ArrowDown'))
    assert.equal(fixture.picker.activeIndex(), 0)
    fixture.picker.onKeydown(keyboard('ArrowUp'))
    assert.equal(fixture.picker.activeIndex(), 2)
    const escape = keyboard('Escape')
    fixture.picker.onKeydown(escape)
    assert.equal(fixture.picker.open(), false)
    assert.equal(escape.prevented, true)
    fixture.picker.open.set(true)
    const tab = keyboard('Tab')
    fixture.picker.onKeydown(tab)
    assert.equal(fixture.picker.open(), false)
    assert.equal(tab.prevented, false)
  } finally {
    globalThis.requestAnimationFrame = previous
    fixture.destroy()
  }
})

test('finds late matches in a 50,000-product catalog while returning bounded results', () => {
  const items = Array.from({ length: 50_000 }, (_, i) => stock(`id-${i}`, `Producto ${i}`))
  const index = indexInventory(items)
  assert.equal(searchInventory(index, 'producto 49999', new Set()).items[0].id, 'id-49999')
  assert.equal(searchInventory(index, 'producto', new Set()).items.length, 30)
})


test('unavailable stock cannot be suggested while the catalog retains it for reopening reserved items', () => {
  const unavailable = { ...stock('empty', 'Empty'), productQuantity: 0 }
  const items = [unavailable, stock('available', 'Available')]
  assert.deepEqual(searchInventory(indexInventory(items), '', new Set()).items.map(item => item.id), ['available'])
  assert.equal(items.length, 2)
})
