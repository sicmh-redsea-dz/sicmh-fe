import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { formatApiError } from '../../../shared/utils/api-error'

import { AuthHeadersService } from '../../../core/http/auth-headers.service';
import { environment } from '../../../../environments/environment';
import { catchError, map, Observable, throwError } from 'rxjs';
import { FormVisit } from '../../interface/visits-response.interface';
import { Histories, SimpleVisit, Visit, Stock } from '../../interface/visits-service.interface'

interface Delimiters {
  limit: number,
  offset: number,
  term: string,
  ext: string
}
@Injectable({
  providedIn: 'root'
})
export class VisitsService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject( HttpClient )
  private authHeaders = inject( AuthHeadersService )

  private _selectedVisit = signal<Visit | null>(null)
  readonly selectedVisit = this._selectedVisit.asReadonly()

  private _listOfVisits = signal<SimpleVisit[]>([])
  readonly listOfVisits = this._listOfVisits.asReadonly()

  private _listOfStockItems = signal<Stock[] | null>(null)
  readonly listOfStockItems = this._listOfStockItems.asReadonly()

  public searchStockItems( term: number ): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits/search/stock-items`

    const headers = this.authHeaders.buildAuthHeaders()

    const params = new HttpParams()
      .set('term', term)

    return this.http.get<any>(url, { headers, params })
      .pipe(
        map(({ data }) => {
          this._listOfStockItems.set( data.stock )
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public searchDoctors(term: string): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits/search/doctors`

    const headers = this.authHeaders.buildAuthHeaders()

    const params = new HttpParams()
      .set('term', term)

    return this.http.get<any>(url, { headers, params })
      .pipe(
        map(({ data })=> {
          const { doctors } = data
          return doctors
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public searchPatients(term: string): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits/search/patients`

    const headers = this.authHeaders.buildAuthHeaders()

    const params = new HttpParams()
      .set('term', term)

    return this.http.get<any>(url, { headers, params })
      .pipe(
        map(({ data })=> {
          const { patients } = data
          return patients
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public getAllVisits(args: Delimiters): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits`

    const headers = this.authHeaders.buildAuthHeaders()

    const params = new HttpParams()
      .set('offset', args.offset)
      .set('limit', args.limit)
      .set('term', args.term)
      .set('ext', args.ext)

    return this.http.get<Histories>(url, { headers, params })
      .pipe(
        map(({data}) => {
          this._listOfVisits.set(data.visits)
          return data
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public getVisit(id: number): Observable<Visit> {
    const url: string = `${this.baseUrl}/app/visits/${id}`

    const headers = this.authHeaders.buildAuthHeaders()   
      
    return this.http.get<any>(url, { headers })
      .pipe(
        map(({ data }) => {
          const { visit } = data
          this._selectedVisit.set( visit )
          return visit
        }),
        catchError((err) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public editVisit(id: number, visit: FormVisit): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/visits/edit/${id}`
    const body = {...visit}

    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.patch(url, body, { headers })
      .pipe(
        map((something) => {
          return true
        }),
        catchError((err) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public createVisit(visit: FormVisit, origin: string): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/visits/create`
    const body = {...visit, origin}

    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.post(url, body, { headers })
      .pipe(
        map(() => {
          return true
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public deleteVisit(id: number): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/visits/${id}`

    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.delete(url, { headers })
      .pipe(
        map((data) => {
          return true
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }
}
