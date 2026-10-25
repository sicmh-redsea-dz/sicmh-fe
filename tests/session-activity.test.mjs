import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import '@angular/compiler'
import { createEnvironmentInjector, runInInjectionContext, NgZone } from '@angular/core'
import { of, Subject } from 'rxjs'
const authToken = Symbol('AuthService')
globalThis.sessionTestAuthToken = authToken
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
}).outputText
const policy = `data:text/javascript;base64,${Buffer.from(compile('../src/app/auth/services/session-policy.ts')).toString('base64')}`
let source = compile('../src/app/auth/services/session-activity.service.ts')
source = source.replace(/import \{ AuthService \} from '[^']+';/, 'const AuthService = globalThis.sessionTestAuthToken;')
source = source.replace("'./session-policy'", `'${policy}'`)
source = source.replace(/from '(@angular\/[^']+)'/g, (_, name) => `from '${import.meta.resolve(name)}'`)
const { SessionActivityService } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
delete globalThis.sessionTestAuthToken
const tokenFor = claims => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`

const setup = t => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: 1_000_000 })
  const original = { window: globalThis.window, document: globalThis.document, localStorage: globalThis.localStorage }
  globalThis.window = new EventTarget()
  globalThis.document = { hidden: false }
  const values = new Map()
  globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }
  const initial = { uid: 'u', codigoEmpresa: 'T', sv: 1, iat: 1000, exp: 2800, sessionStartedAt: 1000 }
  values.set('token', tokenFor(initial))
  let renewals = 0, expirations = 0
  const auth = { currentUser: () => ({}), expireSession: () => { expirations++; values.delete('token') },
    renewSession: () => { renewals++; return of(true) } }
  const injector = createEnvironmentInjector([{ provide: authToken, useValue: auth }, { provide: NgZone, useValue: { run: f => f(), runOutsideAngular: f => f() } }])
  const service = runInInjectionContext(injector, () => new SessionActivityService())
  return { service, values, auth, initial, get renewals() { return renewals }, get expirations() { return expirations },
    dispose() { service.ngOnDestroy(); injector.destroy(); Object.assign(globalThis, original) } }
}

test('idle/background work never renews; warning appears before expiry and logout follows', t => {
  const s = setup(t)
  try {
    t.mock.timers.tick(25 * 60_000)
    assert.equal(s.renewals, 0); assert.match(s.service.warning(), /vencer/)
    t.mock.timers.tick(5 * 60_000)
    assert.equal(s.expirations, 1)
  } finally { s.dispose() }
})

test('real user activity enables renewal, synthetic events do not, and concurrent renewals are suppressed', t => {
  const s = setup(t)
  try {
    t.mock.timers.tick(19 * 60_000)
    window.dispatchEvent(new Event('input')) // Programmatic work is not human activity.
    t.mock.timers.tick(60_000); assert.equal(s.renewals, 0)
    s.service.recordActivity()
    const pending = new Subject()
    s.auth.renewSession = () => { s.auth.calls = (s.auth.calls || 0) + 1; return pending }
    s.service.tick(); s.service.tick()
    assert.equal(s.auth.calls, 1)
    t.mock.timers.tick(60_000); assert.equal(s.auth.calls, 1)
    pending.complete()
    t.mock.timers.tick(30_000); assert.equal(s.auth.calls, 2)
  } finally { s.dispose() }
})

test('activity in another tab prevents idle logout, but cannot exceed the original eight-hour maximum', t => {
  const s = setup(t)
  try {
    s.service.tick()
    const key = [...s.values.keys()].find(k => k.startsWith('sessionActivity:'))
      || 'sessionActivity:T:u:1:1000'
    t.mock.timers.tick(19 * 60_000)
    s.values.set(key, String(Date.now()))
    t.mock.timers.tick(60_000)
    assert.equal(s.renewals, 1)
    s.values.set('token', tokenFor({ ...s.initial, iat: 1000 + 7 * 3600, exp: 1000 + 9 * 3600 }))
    t.mock.timers.setTime(1_000_000 + 8 * 3600_000)
    s.values.set(key, String(Date.now()))
    s.service.tick(); assert.equal(s.expirations, 1)
  } finally { s.dispose() }
})
