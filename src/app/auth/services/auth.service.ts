import { computed, inject, Injectable, signal } from '@angular/core'
import { environment } from '../../../environments/environment'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { catchError, map, Observable, of } from 'rxjs'
import { Router } from '@angular/router'
import { User, AuthStatus } from '../interfaces'
import { Permission, getPermissionsForRoles } from '../permissions/permissions'

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly baseUrl: string = environment.baseUrl
  private http = inject(HttpClient)
  private router = inject(Router)

  private _currentUser = signal<User | null>(null)
  private _authStatus = signal<AuthStatus>(AuthStatus.checking)
  private _mustChangePassword = signal(false)

  public currentUser = computed(() => this._currentUser())
  public authStatus = computed(() => this._authStatus())
  public permissions = computed(() => {
    const user = this._currentUser()
    if (Array.isArray(user?.permissions)) {
      return new Set<Permission>(user!.permissions!)
    }
    return getPermissionsForRoles(user?.roles)
  })
  public mustChangePassword = computed(() => this._mustChangePassword())

  private setAuthentication(user: User, token: string, codigoEmpresa: string): boolean {
    this._currentUser.set(user)
    this._authStatus.set(AuthStatus.authenticated)
    localStorage.setItem('token', token)
    localStorage.setItem('codigoEmpresa', codigoEmpresa.toUpperCase())
    return true
  }

  private clearAuthState(): void {
    window.dispatchEvent(new Event('session-ending'))
    localStorage.removeItem('token')
    localStorage.removeItem('codigoEmpresa')
    this._currentUser.set(null)
    this._authStatus.set(AuthStatus.notAuthenticated)
    this._mustChangePassword.set(false)
  }

  login(email: string, password: string, codigoEmpresa: string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/login`
    return this.http.post<{ user: User; token: string }>(url, { email, password, codigoEmpresa })
      .pipe(
        map(({ user, token }) => {
          this.setAuthentication(user, token, codigoEmpresa)
          this._mustChangePassword.set(false)
          return true
        })
      )
  }

  register(name: string, email: string, password: string, codigoEmpresa: string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/register`
    return this.http.post<{ user: User; token: string }>(url, { name, email, password, codigoEmpresa })
      .pipe(
        map(({ user, token }) => {
          this.setAuthentication(user, token, codigoEmpresa)
          this._mustChangePassword.set(false)
          return true
        })
      )
  }

  requestPasswordReset(email: string, codigoEmpresa: string): Observable<string> {
    const url = `${this.baseUrl}/auth/forgot-password`
    return this.http.post<{ message: string }>(url, { email, codigoEmpresa })
      .pipe(map((response) => response.message))
  }

  resetPassword(token: string, newPassword: string, codigoEmpresa: string): Observable<string> {
    const url = `${this.baseUrl}/auth/reset-password`
    return this.http.post<{ message: string }>(url, { token, newPassword, codigoEmpresa })
      .pipe(map((response) => response.message))
  }

  checkAuthStatus(): Observable<boolean> {
    const url = `${this.baseUrl}/auth/check-token`
    const token = localStorage.getItem('token')
    const codigoEmpresa = localStorage.getItem('codigoEmpresa') ?? ''

    if (!token) {
      this.clearAuthState()
      return of(false)
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)

    return this.http.get<{ user: User }>(url, { headers })
      .pipe(
        map(({ user }) => {
          if (localStorage.getItem('token') !== token) return this.authStatus() === AuthStatus.authenticated
          this.setAuthentication(user, token, codigoEmpresa)
          return true
        }),
        catchError(() => {
          if (localStorage.getItem('token') !== token) return of(this.authStatus() === AuthStatus.authenticated)
          this.clearAuthState()
          return of(false)
        })
      )
  }

  logout() {
    sessionStorage.removeItem('sessionReturn')
    this.clearAuthState()
  }

  expireSession(): void {
    const user = this.currentUser()
    if (user && this.router.url.startsWith('/dashboard/')) {
      sessionStorage.setItem('sessionReturn', JSON.stringify({ url: this.router.url,
        userId: user._id, tenant: localStorage.getItem('codigoEmpresa') }))
    }
    this.clearAuthState()
    void this.router.navigateByUrl('/auth/login', { replaceUrl: true })
  }

  resumeUrl(): string {
    try {
      const saved = JSON.parse(sessionStorage.getItem('sessionReturn') || 'null')
      if (saved?.userId === this.currentUser()?._id && saved?.tenant === localStorage.getItem('codigoEmpresa')
        && typeof saved.url === 'string' && saved.url.startsWith('/dashboard/')) return saved.url
    } catch { /* An invalid recovery link must never prevent login. */ }
    return '/dashboard'
  }

  renewSession(): Observable<boolean> {
    const token = localStorage.getItem('token')
    if (!token) return of(false)
    return this.http.post<{ user: User; token: string }>(`${this.baseUrl}/auth/renew-session`, {}).pipe(
      map(response => {
        // Ignore late responses from a session that has since logged out or changed.
        if (localStorage.getItem('token') !== token) return false
        return this.setAuthentication(response.user, response.token, localStorage.getItem('codigoEmpresa') || '')
      }),
      catchError(error => {
        if (error.status === 401 && localStorage.getItem('token') === token) this.expireSession()
        return of(false)
      }),
    )
  }

  public hasPermission(required: Permission | Permission[]): boolean {
    const permissions = this.permissions()
    const requiredList = Array.isArray(required) ? required : [required]
    return requiredList.every((permission) => permissions.has(permission))
  }

  public hasAnyPermission(required: Permission[]): boolean {
    if (required.length === 0) return true
    const permissions = this.permissions()
    return required.some((permission) => permissions.has(permission))
  }

  public updateCurrentUser(patch: Partial<User>) {
    this._currentUser.update((current) => current ? { ...current, ...patch } : current)
  }

  public completePasswordChange(newPassword: string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/complete-password-change`
    const token = localStorage.getItem('token')
    if (!token) return of(false)
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)
    return this.http.post<{ updated: boolean; user: User; token: string }>(url, { newPassword }, { headers })
      .pipe(
        map(({ user, token: nextToken }) => {
          const codigoEmpresa = localStorage.getItem('codigoEmpresa') ?? ''
          this.setAuthentication(user, nextToken, codigoEmpresa)
          this._mustChangePassword.set(false)
          return true
        }),
        catchError(() => of(false))
      )
  }
}
