import { computed, inject, Injectable, signal } from '@angular/core'
import { environment } from '../../../environments/environment'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { catchError, map, Observable, of, tap, throwError } from 'rxjs'
import { User, AuthStatus, LoginResponse, CheckTokenResponse } from '../interfaces'
import { RegisterResponse } from '../interfaces/register-response.interface'
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth'


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
  }

  signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(this._auth, email, password)
  }

  signIn(email: string, password: string) {
    return signInWithEmailAndPassword(this._auth, email, password)
  }

  signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    provider.addScope('https://www.googleapis.com/auth/calendar.events')
    return signInWithPopup(this._auth, provider)
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

  registerWithGoogle(name:string, email:string, uid:string, idToken:string, accessToken:string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/google-login`
    const body = { name, email, uid, accessToken }

    return this.http.post<any>( url, body )
      .pipe(
        map(({ user }) => this.setAuthentication( user, idToken )),
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

    return this.http.get(url, { headers })
      .pipe(
        map(() => true ),
        catchError(() => {
          this._authStatus.set(AuthStatus.notAuthenticated)
          return of(false)
        })
      )
  }

  logout() {
    localStorage.removeItem('token')
    this._currentUser.set(null)
    this._authStatus.set(AuthStatus.notAuthenticated)
  }
}
