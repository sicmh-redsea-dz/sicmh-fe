import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { computed, ErrorHandler, inject, Injectable, signal } from '@angular/core';

import { AuthService } from '../../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { FormVisit } from '../../interface/visits-response.interface';
import { Histories, SimpleVisit, Visit, Stock } from '../../interface/visits-service.interface'

interface Delimiters {
  limit: number,
  offset: number,
  term: string,
  default: boolean
}
@Injectable({
  providedIn: 'root'
})
export class VisitsService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject( HttpClient )
  private authStatus = inject( AuthService )

  private _selectedVisit = signal<Visit | null>(null)
  readonly selectedVisit = this._selectedVisit.asReadonly()

  private _listOfVisits = signal<SimpleVisit[]>([])
  readonly listOfVisits = this._listOfVisits.asReadonly()

  private _listOfStockItems = signal<Stock[] | null>(null)
  readonly listOfStockItems = this._listOfStockItems.asReadonly()

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()
    return new HttpHeaders().set('Authorization', `Bearer ${token}`)
  }

  public searchDoctors(term: string): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits/search/doctors`

    const headers = this.authHeaders()

    const params = new HttpParams()
      .set('term', term)

    return this.http.get<any>(url, { headers, params })
      .pipe(
        map(({ data })=> {
          const { doctors } = data
          return doctors
        }),
        catchError(( err ) => {
          throwError(() => err.error.message)
          return of( null )
        })
      )
  }

  public searchPatients(term: string): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits/search/patients`

    const headers = this.authHeaders()

    const params = new HttpParams()
      .set('term', term)

    return this.http.get<any>(url, { headers, params })
      .pipe(
        map(({ data })=> {
          const { patients } = data
          return patients
        }),
        catchError(( err ) => {
          throwError(() => err.error.message)
          return of( null )
        })
      )
  }

  public getAllVisits(args: Delimiters): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits`

    const headers = this.authHeaders()

    const params = new HttpParams()
      .set('offset', args.offset)
      .set('limit', args.limit)
      .set('term', args.term)
      .set('default', args.default)

    return this.http.get<Histories>(url, { headers, params })
      .pipe(
        map(({data}) => {
          this._listOfVisits.set(data.visits)
          return data
        }),
        catchError(( err ) => {
          throwError(() => err.error.message)
          return of( null )
        })
      )
  }

  public getVisit(id: number): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits/${id}`

    const headers = this.authHeaders()   
      
    return this.http.get<any>(url, { headers })
      .pipe(
        map(({ data }) => {
          console.log('data', data)
          const { visit, stock } = data
          this._selectedVisit.set( visit )
          this._listOfStockItems.set( stock )
        }),
        catchError((err) => {
          throwError (() => err.message)
          return of( null )
        })
      )
  }

  public editVisit(id: number, visit: FormVisit): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/visits/edit/${id}`
    const body = {...visit}

    const headers = this.authHeaders()

    return this.http.patch(url, body, { headers })
      .pipe(
        map((something) => {
          console.log('something: ', something)
          return true
        }),
        catchError((err) => {
          throwError(() => err.message )
          return of(false)
        })
      )
  }

  public createVisit(visit: FormVisit): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/visits/create`
    const body = {...visit}

    const headers = this.authHeaders()

    return this.http.post(url, body, { headers })
      .pipe(
        map(() => {
          return true
        }),
        catchError(( err ) => {
          throwError(() => err.message)
          return of( false )
        })
      )
  }

  public deleteVisit(id: number): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/visits/${id}`

    const headers = this.authHeaders()

    return this.http.delete(url, { headers })
      .pipe(
        map((data) => {
          console.log( data )
          return true
        }),
        catchError(( err ) => {
          throwError(() => err.message )
          return of( false )
        })
      )
  }
}
