import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
const source = readFileSync(new URL('../src/app/dashboard/components/dashboard-line-chart/line-chart.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
const { lineChart } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('empty and zero histories draw a visible baseline with a nonzero scale', () => {
  const empty = lineChart([])
  assert.equal(empty.line, '44,184 596,184')
  assert.equal(empty.ticks[0].value, 0)
  assert.ok(empty.ticks.at(-1).value > 0)
  const zero = lineChart([{ date: '2026-10-01', value: 0 }])
  assert.equal(zero.line, '44,184 596,184')
  assert.equal(zero.points[0].y, 184)
})

test('daily values use independent scales starting from zero and preserve missing-day zeros', () => {
  const points = [{ date: '2026-10-01', value: 2 }, { date: '2026-10-02', value: 0 }, { date: '2026-10-03', value: 40 }]
  const chart = lineChart(points)
  assert.equal(chart.ticks.at(-1).value, 40)
  assert.equal(chart.points[1].y, 184)
  assert.equal(chart.points[2].y, 24)
  assert.equal(chart.points[2].x, 596)
  assert.equal(lineChart([{ date: '2026-10-01', value: 1 }]).ticks.at(-1).value, 4)
  assert.deepEqual(chart.points.map(p => p.value), [2, 0, 40])
})

test('invalid numeric values never produce broken SVG coordinates', () => {
  const chart = lineChart([{ date: '2026-10-01', value: NaN }, { date: '2026-10-02', value: -1 }])
  assert.ok(chart.points.every(p => p.value === 0))
  assert.doesNotMatch(chart.line, /NaN|Infinity/)
})
