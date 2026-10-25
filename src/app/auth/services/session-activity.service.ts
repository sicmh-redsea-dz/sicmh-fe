import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core'
import { AuthService } from './auth.service'
import { readSession, sessionDecision } from './session-policy'

@Injectable({ providedIn: 'root' })
export class SessionActivityService implements OnDestroy {
  private auth = inject(AuthService)
  private zone = inject(NgZone)
  public warning = signal('')
  public canContinue = signal(false)
  private pending = false
  private lastAttempt = 0
  private lastWrite = 0
  private lastEvent = 0
  private interval: ReturnType<typeof setInterval>
  private activityKey = ''
  private activityAt = 0
  private events = ['pointerdown', 'keydown', 'input', 'scroll']
  private onActivity = (event: Event) => { if (event.isTrusted) this.recordActivity() }
  constructor() {
    this.interval = this.zone.runOutsideAngular(() => {
      this.events.forEach(name => window.addEventListener(name, this.onActivity, { passive: true }))
      return setInterval(() => this.tick(), 15_000)
    })
  }
  private loadActivity() {
    const claims = readSession(localStorage.getItem('token'))
    if (!claims || !this.auth.currentUser()) return null
    const key = `sessionActivity:${claims.codigoEmpresa}:${claims.uid}:${claims.sv}:${claims.sessionStartedAt ?? claims.iat}`
    if (this.activityKey !== key) { this.activityKey = key; this.activityAt = claims.iat * 1000; this.lastWrite = 0 }
    const stored = Number(localStorage.getItem(key))
    if (Number.isFinite(stored) && stored <= Date.now()) this.activityAt = Math.max(this.activityAt, stored)
    return claims
  }
  private recordActivity() {
    const now = Date.now()
    if (now - this.lastEvent < 1_000) return
    this.lastEvent = now
    const claims = this.loadActivity()
    if (!claims) return
    // Check the previous activity before accepting a click after a long idle period.
    if (sessionDecision(claims, this.activityAt, now).expired) { this.end(); return }
    this.activityAt = now
    if (now - this.lastWrite >= 5_000) { localStorage.setItem(this.activityKey, String(now)); this.lastWrite = now }
  }
  private end() {
    this.zone.run(() => { this.warning.set(''); this.auth.expireSession() })
  }
  private tick() {
    const claims = this.loadActivity()
    if (!claims) { this.zone.run(() => this.warning.set('')); return }
    const decision = sessionDecision(claims, this.activityAt, Date.now())
    if (decision.expired) { this.end(); return }
    this.zone.run(() => {
      this.canContinue.set(!decision.maximumReachedSoon)
      this.warning.set(decision.remaining <= 5 * 60_000
        ? decision.maximumReachedSoon ? 'Tu jornada de 8 horas está por terminar. Guarda tu trabajo y vuelve a iniciar sesión.'
          : 'La sesión está por vencer. Puedes continuar trabajando o renovar la sesión.' : '')
    })
    if (decision.renew && !document.hidden) this.renew()
  }
  private renew() {
    if (this.pending || Date.now() - this.lastAttempt < 30_000) return
    this.pending = true; this.lastAttempt = Date.now()
    this.zone.run(() => this.auth.renewSession().subscribe({ complete: () => { this.pending = false } }))
  }
  public continueSession() { this.recordActivity(); this.tick(); this.renew() }
  ngOnDestroy() {
    clearInterval(this.interval)
    this.events.forEach(name => window.removeEventListener(name, this.onActivity))
  }
}
