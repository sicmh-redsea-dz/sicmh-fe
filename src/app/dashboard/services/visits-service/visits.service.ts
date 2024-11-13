import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthService } from '../../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { VisitsResponse, Doctor, Visits, Patient, FormVisit, SelectedVisitResponse, Visit, Data } from '../../interface/visits-response.interface';

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

  private _selectedVisit = signal<Visit | null>(null)
  public selectedVisit = computed(() => this._selectedVisit())

  private _listOfVisits = signal<Visits[] | null>( null )
  public listOfVisits = computed(() => this._listOfVisits())

  private _listOfDoctors = signal<Doctor[] | null>( null )
  public listOfDoctors = computed(() => this._listOfDoctors())

  private _listOfPatients = signal<Patient[] | null>(null)
  public listOfPatients = computed(() => this._listOfPatients() )

  public getAllVisits(pagination: Pagination): Observable<Data | null> {
    const url: string = `${this.baseUrl}/dashboard/visits`
    const token = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

    const params = new HttpParams()
      .set('limit', pagination.limit)
      .set('offset', pagination.offset)

    return this.http.get<VisitsResponse>(url, { headers, params })
      .pipe(
        map(({data}) => {
          this._listOfVisits.set(data.visits)
          this._listOfDoctors.set(data.doctors)
          this._listOfPatients.set(data.patients)
          return data
        }),
        catchError(( err ) => {
          throwError(() => err.error.message)
          return of( null )
        })
      )
  }

  public getVisit(id: number): Observable<SelectedVisitResponse | null> {
    const url: string = `${this.baseUrl}/dashboard/visits/${id}`
    const token = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)   
      
    return this.http.get<SelectedVisitResponse>(url, { headers })
      .pipe(
        map((data) => {
          this._selectedVisit.set( data.data.visit )
          return data
        }),
        catchError((err) => {
          throwError (() => err.message)
          return of( null )
        })
      )
  }

  public editVisit(id: number, visit: FormVisit): Observable<boolean> {
    const url: string = `${this.baseUrl}/dashboard/visits/edit-visit/${id}`
    const body = {...visit}
    const token = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

    return this.http.patch(url, body, { headers })
      .pipe(
        map(() => {
          return true
        }),
        catchError((err) => {
          throwError(() => err.message )
          return of(false)
        })
      )

  }

  public createVisit(visit: FormVisit): Observable<boolean> {
    const url: string = `${this.baseUrl}/dashboard/visits/create`
    const body = {...visit}
    const token = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

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
    const url: string = `${this.baseUrl}/dashboard/visits/${id}`
    const token: string | null = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

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
