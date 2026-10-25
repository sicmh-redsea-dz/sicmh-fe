import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import { Subject } from 'rxjs'
const load = async path => {
  let compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  compiled = compiled.replace(/from 'rxjs'/g, `from '${import.meta.resolve('rxjs')}'`)
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}
const { FormDraft } = await load('../src/app/shared/services/form-draft.ts')
const setup = (overrides = {}) => {
  const values = new Map(), changes = new Subject()
  let value = { notes: '', nested: { treatment: '' }, stockItems: [] }, writes = 0
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => { writes++; values.set(k, v) }, removeItem: k => values.delete(k) }
  const options = { key: 'tenant:user:visit:1', storage, changes, snapshot: () => value,
    restore: data => { value = data }, confirmRestore: async () => true, now: () => 1_000_000, ...overrides }
  const draft = new FormDraft(options)
  return { draft, options, values, changes, get writes() { return writes }, get value() { return value },
    edit: notes => { value = { ...value, notes }; changes.next(value) } }
}

test('idle forms make no writes; edits debounce for 30 seconds and navigation flushes pending changes', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const s = setup(); await s.draft.start()
  t.mock.timers.tick(120_000); assert.equal(s.writes, 0)
  s.edit('first'); t.mock.timers.tick(20_000); s.edit('second')
  t.mock.timers.tick(29_999); assert.equal(s.writes, 0)
  t.mock.timers.tick(1); assert.equal(s.writes, 1)
  assert.equal(JSON.parse(s.values.get(s.options.key)).data.notes, 'second')
  s.edit('latest'); s.draft.dispose()
  assert.equal(JSON.parse(s.values.get(s.options.key)).data.notes, 'latest')
  t.mock.timers.tick(120_000); assert.equal(s.writes, 2)
})

test('continuous typing saves within two minutes and unchanged snapshots are not written again', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const s = setup(); await s.draft.start(); s.edit('start')
  for (let i = 0; i < 5; i++) { t.mock.timers.tick(20_000); s.edit(`text-${i}`) }
  assert.equal(s.writes, 0)
  t.mock.timers.tick(20_000); assert.equal(s.writes, 1)
  s.draft.flush(); assert.equal(s.writes, 1); s.draft.dispose()
})

test('recovery is scoped by user, tenant, module and record; it never submits final records', async () => {
  const s = setup(); await s.draft.start(); s.edit('unfinished'); s.draft.dispose()
  const restored = setup({ storage: s.options.storage }); await restored.draft.start()
  assert.equal(restored.value.notes, 'unfinished')
  for (const key of ['otherTenant:user:visit:1', 'tenant:otherUser:visit:1', 'tenant:user:visit:2', 'tenant:user:patient:1']) {
    const other = setup({ storage: s.options.storage, key }); await other.draft.start()
    assert.equal(other.value.notes, ''); other.draft.dispose()
  }
  restored.draft.committed(); restored.draft.dispose()
  assert.equal(s.values.size, 0)
})

test('failed saves retain the draft; successful saves preserve edits made during the request', async () => {
  const s = setup(); await s.draft.start(); s.edit('sent')
  const checkpoint = s.draft.checkpoint(); s.draft.flush()
  assert.ok(s.values.has(s.options.key)) // No commit on server failure.
  s.edit('typed while saving'); s.draft.committed(checkpoint); s.draft.flush()
  assert.equal(JSON.parse(s.values.get(s.options.key)).data.notes, 'typed while saving')
  s.draft.committed(); s.draft.dispose(); assert.equal(s.values.size, 0)
})

test('declined, expired and corrupt drafts are discarded, and storage failures are visible', async () => {
  for (const raw of ['{invalid', JSON.stringify({ version: 1, savedAt: 1, data: { notes: 'expired' } })]) {
    const s = setup({ now: () => 100_000_000 }); s.values.set(s.options.key, raw)
    await s.draft.start(); assert.equal(s.value.notes, ''); assert.equal(s.values.size, 0); s.draft.dispose()
  }
  const denied = setup({ confirmRestore: async () => false })
  denied.values.set(denied.options.key, JSON.stringify({ version: 1, savedAt: 999_999, data: { notes: 'declined' } }))
  await denied.draft.start(); assert.equal(denied.values.size, 0); denied.draft.dispose()
  const broken = setup({ storage: { getItem: () => null, setItem() { throw new Error('quota') }, removeItem() {} } })
  await broken.draft.start(); broken.edit('important'); broken.draft.flush()
  assert.match(broken.draft.status, /No se pudo proteger/); broken.draft.dispose()
})

const { sessionDecision, readSession } = await load('../src/app/auth/services/session-policy.ts')
test('renewal requires recent real activity and respects idle, token expiry and the original day limit', () => {
  const claims = { uid: 'u', codigoEmpresa: 'T', sv: 1, iat: 0, exp: 1800, sessionStartedAt: 0 }
  assert.equal(sessionDecision(claims, 0, 20 * 60_000).renew, false)
  assert.equal(sessionDecision(claims, 19 * 60_000, 20 * 60_000).renew, true)
  assert.equal(sessionDecision(claims, 0, 30 * 60_000).expired, true)
  assert.equal(sessionDecision(claims, 29 * 60_000, 30 * 60_000).expired, true)
  const renewed = { ...claims, iat: 7 * 3600, exp: 9 * 3600 }
  assert.equal(sessionDecision(renewed, 8 * 3600_000, 8 * 3600_000).expired, true)
  assert.equal(readSession('broken'), null)
})
