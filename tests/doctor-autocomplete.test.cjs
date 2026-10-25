const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const Module = require('node:module')
const { dirname, resolve } = require('node:path')
const { test } = require('node:test')
const { of, throwError } = require('rxjs')
const { TestScheduler } = require('rxjs/testing')
const ts = require('typescript')

// Load the pure RxJS helper without needing a browser or Angular test runtime.
const filename = resolve(__dirname, '../src/app/dashboard/helpers/visits-form/doctor-autocomplete.ts')
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const loaded = new Module(filename, module)
loaded.filename = filename
loaded.paths = Module._nodeModulePaths(dirname(filename))
loaded._compile(compiled, filename)
const { doctorSuggestions } = loaded.exports
const doctors = [{ id: 'staff-uuid', name: 'Ana Doctor', specialty: '' }]
const scheduler = () => new TestScheduler((actual, expected) => assert.deepEqual(actual, expected))

test('opening an empty doctor field loads suggestions without typing', () => {
  scheduler().run(({ hot, flush }) => {
    const calls = [], states = []
    doctorSuggestions(hot('a', { a: '' }), (term) => {
      calls.push(term)
      return of(doctors)
    }).subscribe((state) => states.push(state))
    flush()
    assert.deepEqual(calls, [''])
    assert.equal(states[0].loading, true)
    assert.deepEqual(states.at(-1), { results: doctors, loading: false, error: '' })
  })
})

test('one-character searches and clearing the field both request suggestions', () => {
  scheduler().run(({ hot, flush }) => {
    const calls = []
    doctorSuggestions(hot('a 299ms b 299ms c', { a: '', b: ' A ', c: null }), (term) => {
      calls.push(term)
      return of(doctors)
    }).subscribe()
    flush()
    assert.deepEqual(calls, ['', 'A', ''])
  })
})

test('slow typing continues to produce results after the first character', () => {
  scheduler().run(({ hot, flush }) => {
    const completed = []
    doctorSuggestions(hot('a 299ms b', { a: 'A', b: 'An' }), () => of(doctors))
      .subscribe((state) => { if (!state.loading) completed.push(state.results) })
    flush()
    assert.deepEqual(completed, [doctors, doctors])
  })
})

test('refocusing after a failed request retries even with the same search text', () => {
  scheduler().run(({ hot, flush }) => {
    let attempts = 0
    const states = []
    doctorSuggestions(hot('a 299ms b', { a: '', b: '' }), () => ++attempts === 1
      ? throwError(() => new Error('temporary failure')) : of(doctors))
      .subscribe((state) => states.push(state))
    flush()
    assert.equal(attempts, 2)
    assert.ok(states.some((state) => state.error.includes('temporary failure')))
    assert.deepEqual(states.at(-1), { results: doctors, loading: false, error: '' })
  })
})

test('new input cancels stale in-flight results immediately', () => {
  scheduler().run(({ hot, cold, flush }) => {
    const completed = []
    doctorSuggestions(hot('a 299ms b', { a: 'old', b: 'new' }), (term) =>
      cold('300ms r|', { r: [{ ...doctors[0], name: term }] }))
      .subscribe((state) => { if (!state.loading) completed.push(state.results[0].name) })
    flush()
    assert.deepEqual(completed, ['new'])
  })
})
