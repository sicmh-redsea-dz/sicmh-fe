import { computed, inject, Injectable, signal } from '@angular/core'
import { environment } from '../../../environments/environment'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { catchError, from, map, Observable, of, switchMap, throwError, tap } from 'rxjs'
import { User, AuthStatus, LoginResponse, CheckTokenResponse } from '../interfaces'
import { Permission, getPermissionsForRoles } from '../permissions/permissions'
import { RegisterResponse } from '../interfaces/register-response.interface'
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onIdTokenChanged } from '@angular/fire/auth'


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly baseUrl: string = environment.baseUrl
  private http = inject( HttpClient )

  private _currentUser = signal<User|null>(null)
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

  private _auth = inject( Auth )

  constructor() { 
    this.checkAuthStatus().subscribe()
    onIdTokenChanged(this._auth, async ( user ) => {
      try {
        if ( user ) {
          const newToken = await user.getIdToken()
          localStorage.setItem('token', newToken)
        }
      } catch ( err ) {
        this.logout()
      }
    })
  }

  signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(this._auth, email, password)
  }

  signIn(email: string, password: string) {
    return signInWithEmailAndPassword(this._auth, email, password)
  }

  private setAuthentication(user: User, token: string): boolean {
    this._currentUser.set( user )
    this._authStatus.set( AuthStatus.authenticated )
    localStorage.setItem('token', token)
    return true
  }

  private buildIdTokenHeaders(idToken: string): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${ idToken }`)
  }

  login( idToken: string ): Observable<boolean> {
    const url = `${this.baseUrl}/auth/login`
    const headers = this.buildIdTokenHeaders( idToken )

    return this.http.post<LoginResponse>(url, {}, { headers })
      .pipe(
        switchMap(({user}) => {
          this.setAuthentication(user, idToken)
          return from(this.syncPasswordChangeFlag()).pipe(map(() => true))
        })
      )
  }

  register(name: string | null, idToken: string, accessToken?: string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/register`
    const headers = this.buildIdTokenHeaders( idToken )
    const body: { name?: string; accessToken?: string } = {}

    if (name) {
      body.name = name
    }

    if (accessToken) {
      body.accessToken = accessToken
    }

    return this.http.post<RegisterResponse>(url, body, { headers })
      .pipe(
        switchMap(({user}) => {
          this.setAuthentication(user, idToken)
          return from(this.syncPasswordChangeFlag()).pipe(map(() => true))
        })
      )
  }

  signInWithG(): Observable<boolean> {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    
    return from(signInWithPopup(this._auth, provider)).pipe(
      switchMap((authenticatedUser) => {
        const user = authenticatedUser.user;
        const { displayName, email } = user;
  
        return from(user.getIdToken()).pipe(
          switchMap((idToken) => {
            const accessToken = GoogleAuthProvider.credentialFromResult(authenticatedUser)?.accessToken;
            
            return this.login(idToken).pipe(
              catchError((err) => {
                if (err?.status === 404) {
                  const fallbackName = displayName || email || ''
                  return this.register(fallbackName, idToken, accessToken ?? undefined)
                }
                return throwError(() => err)
              })
            )
          })
        );
      })
    );
  }

  checkAuthStatus(): Observable<boolean> {
    const url = `${this.baseUrl}/auth/check-token`
    const token = localStorage.getItem('token')
    
    if( !token ){
      this.clearAuthState()
      return of(false)
    } 

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`)

    return this.http.get<CheckTokenResponse>(url, { headers })
      .pipe(
        switchMap(({ user }) => {
          return this.refreshFirebaseToken().pipe(
            map(( newToken ) => {
              const finalToken = newToken || token
              localStorage.setItem('token', finalToken)
              this.setAuthentication(user, finalToken)
              return true
            })
          )
        }),
        switchMap((result) => from(this.syncPasswordChangeFlag()).pipe(map(() => result))),
        catchError(() => {
          this.clearAuthState()
          return of(false)
        })
      )
  }

  private refreshFirebaseToken(): Observable<string | null> {
    const user = this._auth.currentUser;
    if (!user) return of(null);

    return from(user.getIdToken(true)).pipe(
        catchError(() => of(null))
    );
  }

  private clearAuthState(): void {
    localStorage.removeItem('token')
    this._currentUser.set(null)
    this._authStatus.set(AuthStatus.notAuthenticated)
    this._mustChangePassword.set(false)
  }

  logout() {
    this.clearAuthState()
    this._auth.signOut()
      .catch( error => {
        console.error('Error al cerrar sesión: ', error)
      })
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

  public async syncPasswordChangeFlag(): Promise<void> {
    const user = this._auth.currentUser
    if (!user) {
      this._mustChangePassword.set(false)
      return
    }
    try {
      const tokenResult = await user.getIdTokenResult(true)
      const mustChange = !!tokenResult?.claims?.['mustChangePassword']
      this._mustChangePassword.set(mustChange)
    } catch (err) {
      this._mustChangePassword.set(false)
    }
  }

  public completePasswordChange(): Observable<boolean> {
    const url = `${this.baseUrl}/auth/complete-password-change`
    const token = localStorage.getItem('token')
    if (!token) return of(false)
    const headers = this.buildIdTokenHeaders(token)
    return this.http.post(url, {}, { headers })
      .pipe(
        tap(() => {
          this._mustChangePassword.set(false)
        }),
        map(() => true),
        catchError(() => of(false))
      )
  }
}
