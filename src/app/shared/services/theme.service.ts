import { Injectable, signal, computed } from '@angular/core'

export type ThemeMode = 'light' | 'dark'

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'sicmh.theme'
  private readonly _theme = signal<ThemeMode>(this.resolveInitialTheme())

  public theme = computed(() => this._theme())

  constructor() {
    this.applyTheme(this._theme())
  }

  public setTheme(theme: ThemeMode, persist = true) {
    this._theme.set(theme)
    this.applyTheme(theme)
    if (persist) {
      localStorage.setItem(this.storageKey, theme)
    }
  }

  public toggleTheme(): ThemeMode {
    const next: ThemeMode = this._theme() === 'dark' ? 'light' : 'dark'
    this.setTheme(next)
    return next
  }

  public syncWithPreference(theme?: string | null) {
    if (!theme) return
    const normalized = theme === 'dark' ? 'dark' : 'light'
    this.setTheme(normalized, true)
  }

  private resolveInitialTheme(): ThemeMode {
    const stored = localStorage.getItem(this.storageKey)
    if (stored === 'dark' || stored === 'light') return stored
    return 'light'
  }

  private applyTheme(theme: ThemeMode) {
    document.documentElement.setAttribute('data-theme', theme)
  }
}
