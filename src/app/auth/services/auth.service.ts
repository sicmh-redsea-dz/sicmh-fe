import { computed, inject, Injectable, signal } from '@angular/core'
import { environment } from '../../../environments/environment'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { catchError, map, Observable, of } from 'rxjs'
import { User, AuthStatus } from '../interfaces'
import { Permission, getPermissionsForRoles } from '../permissions/permissions'

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly baseUrl: string = environment.baseUrl
  private http = inject(HttpClient)

  private _currentUser = signal<User | null>(null)
  private _authStatus = signal<AuthStatus>(AuthStatus.checking)
  private _mustChangePassword = signal(false)

  public currentUser = computed(() => this._currentUser())
  public authStatus = computed(() => this._authStatus())
  public permissions = computed(() => {
    const user = this._currentUser()
    if (user?.permissions && user.permissions.length > 0) {
      return new Set<Permission>(user.permissions)
    }
    return getPermissionsForRoles(user?.roles)
  })
  public mustChangePassword = computed(() => this._mustChangePassword())

  constructor() {
    this.checkAuthStatus().subscribe()
  }

  private setAuthentication(user: User, token: string): boolean {
    this._currentUser.set(user)
    this._authStatus.set(AuthStatus.authenticated)
    localStorage.setItem('token', token)
    return true
  }

  private clearAuthState(): void {
    localStorage.removeItem('token')
    this._currentUser.set(null)
    this._authStatus.set(AuthStatus.notAuthenticated)
    this._mustChangePassword.set(false)
  }

  login(email: string, password: string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/login`
    return this.http.post<{ user: User; token: string }>(url, { email, password })
      .pipe(
        map(({ user, token }) => {
          this.setAuthentication(user, token)
          this._mustChangePassword.set(false)
          return true
        })
      )
  }

  register(name: string, email: string, password: string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/register`
    return this.http.post<{ user: User; token: string }>(url, { name, email, password })
      .pipe(
        map(({ user, token }) => {
          this.setAuthentication(user, token)
          this._mustChangePassword.set(false)
          return true
        })
      )
  }

  checkAuthStatus(): Observable<boolean> {
    const url = `${this.baseUrl}/auth/check-token`
    const token = localStorage.getItem('token')

    if (!token) {
      this.clearAuthState()
      return of(false)
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)

    return this.http.get<{ user: User }>(url, { headers })
      .pipe(
        map(({ user }) => {
          this.setAuthentication(user, token)
          return true
        }),
        catchError(() => {
          this.clearAuthState()
          return of(false)
        })
      )
  }

  logout() {
    this.clearAuthState()
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

  public completePasswordChange(): Observable<boolean> {
    const url = `${this.baseUrl}/auth/complete-password-change`
    const token = localStorage.getItem('token')
    if (!token) return of(false)
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)
    return this.http.post(url, {}, { headers })
      .pipe(
        map(() => {
          this._mustChangePassword.set(false)
          return true
        }),
        catchError(() => of(false))
      )
  }
}
