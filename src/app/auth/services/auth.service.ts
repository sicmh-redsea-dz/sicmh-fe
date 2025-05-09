import { computed, inject, Injectable, signal } from '@angular/core'
import { environment } from '../../../environments/environment'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { catchError, from, map, Observable, of, switchMap, tap, throwError } from 'rxjs'
import { User, AuthStatus, LoginResponse, CheckTokenResponse } from '../interfaces'
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
    this._authStatus.set( AuthStatus.authentitcated )
    localStorage.setItem('token', token)
    return true
  }

  login( email: string, password: string, idToken: string ): Observable<boolean> {
    const url = `${this.baseUrl}/auth/login`
    const body = { email, password }

    return this.http.post<LoginResponse>(url, body)
      .pipe(
        map(({user}) => this.setAuthentication(user, idToken)),
        catchError( err => throwError(() => err.error.message))
      )
  }

  register(name: string, email: string, password: string, uid:string, idToken: string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/register`
    const body = { name, email, password, uid }

    return this.http.post<RegisterResponse>(url, body)
      .pipe(
        map(({user}) => this.setAuthentication(user, idToken)),
        catchError( err => throwError(() => err.error.message))
      )
  }

  signInWithG(): Observable<any> {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    
    return from(signInWithPopup(this._auth, provider)).pipe(
      switchMap((authenticatedUser) => {
        const user = authenticatedUser.user;
        const { displayName, email, uid } = user;
  
        return from(user.getIdToken()).pipe(
          switchMap((idToken) => {
            const accessToken = GoogleAuthProvider.credentialFromResult(authenticatedUser)?.accessToken;
            
            return this.http.post<any>(`${this.baseUrl}/auth/check-user`, { uid }).pipe(
              tap(({ existingUser, exists }) => console.log(existingUser, exists)),
              switchMap(({ existingUser, exists }) => {
                if (exists) {
                  return of(this.setAuthentication(existingUser!, idToken))
                } else {
                  return this.registerWithGoogle(displayName!, email!, uid, idToken, accessToken!);
                }
              })
            );
          })
        );
      })
    );
  }

  private registerWithGoogle(name:string, email:string, uid:string, idToken:string, accessToken:string): Observable<boolean> {
    console.log('register with google')
    console.log(name, email, uid, idToken, accessToken)
    const url = `${this.baseUrl}/auth/gregister`
    const body = { name, email, uid, idToken, accessToken }
    return this.http.post<RegisterResponse>(url, body)
      .pipe(
        map(({user}) => this.setAuthentication(user, idToken)),
        catchError( err => throwError(() => err.error.message))
      )
  }

  checkAuthStatus(): Observable<boolean> {
    const url = `${this.baseUrl}/auth/check-token`
    const token = localStorage.getItem('token')
    
    if( !token ){
      this.logout()
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
          this._authStatus.set(AuthStatus.notAuthenticated)
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

  logout() {
    this._auth.signOut()
      .then(() => {
        localStorage.removeItem('token')
        this._currentUser.set(null)
        this._authStatus.set(AuthStatus.notAuthenticated)
      })
      .catch( error => {
        console.error('Error al cerrar sesión: ', error)
      })
  }
}