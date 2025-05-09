import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthService } from '../../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { FormVisit } from '../../interface/visits-response.interface';
import { Histories, SimpleVisit, Staff, Patients, History, Visit, Stock } from '../../interface/visits-service.interface'

interface Pagination {
  limit: number,
  offset: number
}
@Injectable({
  providedIn: 'root'
})
export class VisitsService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject( HttpClient )
  private authStatus = inject( AuthService )

  // usando computed() sin derivar ningun valor nuevo
  // private _listOfVisits = signal<SimpleVisit[]>([])
  // public listOfVisits = computed(() => this._listOfVisits())

  private _selectedVisit = signal<Visit | null>(null)
  readonly selectedVisit = this._selectedVisit.asReadonly()

  private _listOfVisits = signal<SimpleVisit[]>([])
  readonly listOfVisits = this._listOfVisits.asReadonly()

  private _listOfDoctors = signal<Staff[] | null>( null )
  readonly listOfDoctors = this._listOfDoctors.asReadonly()

  private _listOfPatients = signal<Patients[] | null>(null)
  readonly listOfPatients = this._listOfPatients.asReadonly()

  private _listOfStockItems = signal<Stock[] | null>(null)
  readonly listOfStockItems = this._listOfStockItems.asReadonly()

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()
    return new HttpHeaders().set('Authorization', `Bearer ${token}`)
  }

  public getAllVisits(pagination: Pagination): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits`

    const headers = this.authHeaders()

    const params = new HttpParams()
      .set('limit', pagination.limit)
      .set('offset', pagination.offset)

    return this.http.get<Histories>(url, { headers, params })
      .pipe(
        map(({data}) => {
          this._listOfVisits.set(data.visits)
          this._listOfDoctors.set(data.staff)
          this._listOfPatients.set(data.patients)
          this._listOfStockItems.set(data.stock)
          return data
        }),
        catchError(( err ) => {
          throwError(() => err.error.message)
          return of( null )
        })
      )
  }

  public getVisit(id: number): Observable<Visit | null> {
    const url: string = `${this.baseUrl}/app/visits/${id}`

    const headers = this.authHeaders()   
      
    return this.http.get<History>(url, { headers })
      .pipe(
        map(( data ) => {
          console.log('data', data)
          this._selectedVisit.set( data.data )
          return data.data
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

  public createVisit(visit: FormVisit, origin='er'): Observable<boolean> {
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
