import { computed, inject, Injectable, signal } from '@angular/core'
import { environment } from '../../../environments/environment'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { catchError, from, map, Observable, of, switchMap, throwError } from 'rxjs'
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

  public currentUser = computed(() => this._currentUser())
  public authStatus = computed(() => this._authStatus())
  public permissions = computed(() => getPermissionsForRoles(this._currentUser()?.roles))

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
        map(({user}) => this.setAuthentication(user, idToken))
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
        map(({user}) => this.setAuthentication(user, idToken))
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
              return this.setAuthentication(user, finalToken)
            })
          )
        }),
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
}
