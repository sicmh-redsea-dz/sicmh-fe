import { Observable, Subscription } from 'rxjs'

export interface DraftOptions {
  key: string
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  changes: Observable<unknown>
  snapshot: () => unknown
  restore: (data: any) => void
  confirmRestore: (savedAt: number) => Promise<boolean>
  now?: () => number
  idleMs?: number
  maxWaitMs?: number
}

/** Recovery only: never submits a patient, encounter, inventory movement or consent. */
export class FormDraft {
  public status = 'Sin cambios pendientes.'
  private baseline = ''
  private lastStored = ''
  private idle?: ReturnType<typeof setTimeout>
  private maximum?: ReturnType<typeof setTimeout>
  private subscription?: Subscription
  private disposed = false
  private ready = false
  private now: () => number
  constructor(private options: DraftOptions) { this.now = options.now ?? Date.now }
  async start() {
    this.baseline = JSON.stringify(this.options.snapshot())
    try {
      const raw = this.options.storage.getItem(this.options.key)
      const saved = raw ? JSON.parse(raw) : null
      if (saved && saved.version === 1 && Number.isFinite(saved.savedAt)
        && this.now() - saved.savedAt < 24 * 60 * 60_000 && saved.savedAt <= this.now()) {
        const accepted = await this.options.confirmRestore(saved.savedAt)
        if (this.disposed) return
        if (accepted) {
          this.options.restore(saved.data)
          this.lastStored = JSON.stringify(this.options.snapshot())
          this.status = 'Borrador recuperado. Guarda el formulario para confirmar los datos.'
        } else this.options.storage.removeItem(this.options.key)
      } else if (raw) this.options.storage.removeItem(this.options.key)
    } catch {
      try { this.options.storage.removeItem(this.options.key) } catch { /* Storage may be unavailable. */ }
      this.status = 'No se pudo recuperar el borrador de esta pestaña.'
    }
    if (this.disposed) return
    this.ready = true
    this.subscription = this.options.changes.subscribe(() => this.changed())
  }
  private cancelTimers() {
    clearTimeout(this.idle); clearTimeout(this.maximum)
    this.idle = undefined; this.maximum = undefined
  }
  changed() {
    if (!this.ready || this.disposed) return
    const value = JSON.stringify(this.options.snapshot())
    if (value === this.baseline) {
      this.cancelTimers()
      try { this.options.storage.removeItem(this.options.key) } catch { /* Status stays accurate below. */ }
      this.lastStored = ''; this.status = 'Sin cambios pendientes.'; return
    }
    if (value === this.lastStored) { this.cancelTimers(); this.status = 'Borrador protegido en esta pestaña.'; return }
    this.status = 'Cambios pendientes de proteger…'
    clearTimeout(this.idle)
    this.idle = setTimeout(() => this.flush(), this.options.idleMs ?? 30_000)
    if (!this.maximum) {
      this.maximum = setTimeout(() => this.flush(), this.options.maxWaitMs ?? 120_000)
    }
  }
  flush() {
    if (!this.ready || this.disposed) return
    this.cancelTimers()
    try {
      const data = this.options.snapshot()
      const value = JSON.stringify(data)
      if (value === this.baseline || value === this.lastStored) return
      if (value.length > 500_000) throw new Error('Draft too large')
      const savedAt = this.now()
      this.options.storage.setItem(this.options.key, JSON.stringify({ version: 1, savedAt, data }))
      this.lastStored = value
      this.status = `Borrador protegido en esta pestaña (${new Date(savedAt).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}).`
    } catch { this.status = 'No se pudo proteger el borrador. Guarda el formulario antes de salir.' }
  }
  checkpoint() { return JSON.stringify(this.options.snapshot()) }
  committed(checkpoint = this.checkpoint()) {
    this.baseline = checkpoint; this.lastStored = ''; this.cancelTimers()
    try { this.options.storage.removeItem(this.options.key) } catch { /* A later recovery still asks the user. */ }
    this.status = 'Datos guardados.'
    if (this.checkpoint() !== checkpoint) this.changed()
  }
  dispose() {
    this.flush(); this.disposed = true; this.cancelTimers(); this.subscription?.unsubscribe()
  }
}
