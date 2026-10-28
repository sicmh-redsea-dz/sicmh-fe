import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import '@angular/compiler'
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { of, Subject } from 'rxjs'
let source = ts.transpileModule(readFileSync(new URL('../src/app/auth/services/auth.service.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
}).outputText
source = source.replace(/import \{ environment \} from '[^']+';/, "const environment = { baseUrl: '/api' };")
source = source.replace(/import \{ AuthStatus \} from '[^']+';/, "const AuthStatus = { checking: 'checking', authenticated: 'authenticated', notAuthenticated: 'notAuthenticated' };")
source = source.replace(/import \{ getPermissionsForRoles \} from '[^']+';/, 'const getPermissionsForRoles = () => new Set();')
source = source.replace(/from '(@angular\/[^']+|rxjs)'/g, (_, name) => `from '${import.meta.resolve(name)}'`)
const { AuthService } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const storage = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) } }
const setup = () => {
  const original = { window: globalThis.window, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage }
  Object.assign(globalThis, { window: new EventTarget(), localStorage: storage(), sessionStorage: storage() })
  const http = { get: () => of({ user: { _id: 'u' } }), post: () => of({ user: { _id: 'u' }, token: 'new' }) }
  const router = { url: '/dashboard/visits/edit-visit/record-1', navigateByUrl: () => Promise.resolve(true) }
  const injector = createEnvironmentInjector([{ provide: HttpClient, useValue: http }, { provide: Router, useValue: router }])
  const auth = runInInjectionContext(injector, () => new AuthService())
  auth.setAuthentication({ _id: 'u', roles: [] }, 'original', 'TEST')
  return { auth, http, router, dispose() { injector.destroy(); Object.assign(globalThis, original) } }
}

test('expiration flushes recovery listeners before credentials are cleared and login always lands on the main dashboard', () => {
  const s = setup()
  try {
    let atFlush
    window.addEventListener('session-ending', () => { atFlush = localStorage.getItem('token') })
    s.auth.expireSession()
    assert.equal(atFlush, 'original')
    assert.equal(localStorage.getItem('token'), null)
    s.auth.setAuthentication({ _id: 'other', roles: [] }, 'other-token', 'TEST')
    assert.equal(s.auth.resumeUrl(), '/dashboard/main')
    s.auth.setAuthentication({ _id: 'u', roles: [] }, 'new-token', 'OTHER')
    assert.equal(s.auth.resumeUrl(), '/dashboard/main')
    s.auth.setAuthentication({ _id: 'u', roles: [] }, 'new-token', 'TEST')
    sessionStorage.setItem('sessionReturn', JSON.stringify({ url: s.router.url, userId: 'u', tenant: 'TEST' }))
    assert.equal(s.auth.resumeUrl(), '/dashboard/main')
    assert.equal(sessionStorage.getItem('sessionReturn'), null)
  } finally { s.dispose() }
})

test('late authentication and renewal responses cannot resurrect a logged-out or replaced session', () => {
  const s = setup()
  try {
    const check = new Subject(), renewal = new Subject()
    s.http.get = () => check; s.http.post = () => renewal
    s.auth.checkAuthStatus().subscribe()
    s.auth.renewSession().subscribe()
    s.auth.logout()
    check.next({ user: { _id: 'u', roles: [] } })
    renewal.next({ user: { _id: 'u', roles: [] }, token: 'resurrected' })
    assert.equal(localStorage.getItem('token'), null)
    assert.equal(s.auth.currentUser(), null)
    check.complete(); renewal.complete()
  } finally { s.dispose() }
})
