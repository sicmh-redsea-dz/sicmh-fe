import { HttpClient, HttpParams } from '@angular/common/http'
import { computed, inject, Injectable, signal } from '@angular/core'
import { environment } from '../../../../environments/environment'
import { catchError, map, Observable, throwError } from 'rxjs'
import { AddedUser, Data, FormPatient, Patient, PatientsResponse } from '../../interface/patients-response.interface'
import { AuthHeadersService } from '../../../core/http/auth-headers.service'
import { formatApiError } from '../../../shared/utils/api-error'

interface Delimiters {
  limit: number,
  offset: number,
  term: string
}

@Injectable({
  providedIn: 'root'
})
export class PatientsService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject( HttpClient )
  private authHeaders = inject( AuthHeadersService )
  private _listOfPatients = signal<Data | null>( null )
  private _selectedPatient = signal<Patient | null>( null )
  public selectedPatient = computed(() => this._selectedPatient() )
  public listOfPatients = computed(() => this._listOfPatients())

  public getPatients( pagination: Delimiters):Observable<Data | null> {
    const url: string = `${this.baseUrl}/app/patients`
    const headers = this.authHeaders.buildAuthHeaders()

    const params = new HttpParams()
      .set('limit', pagination.limit)
      .set('offset', pagination.offset)
      .set('term', pagination.term)

    return this.http.get<PatientsResponse>( url, { headers, params } )
      .pipe(
        map(({ data }) => {
          this._listOfPatients.set(data)
          return data
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public getPatient( patientId:number ): Observable<Patient | null> {
      const url: string = `${this.baseUrl}/app/patients/${patientId}`
      const headers = this.authHeaders.buildAuthHeaders()

      return this.http.get<AddedUser>( url, { headers } )
        .pipe(
          map(({ data }) => {
            this._selectedPatient.set(data.patient)
            return data.patient
          }),
          catchError(( err ) => {
            return throwError(() => formatApiError(err))
          })
        )
  }

  public savePatient(patient: FormPatient): Observable<AddedUser | null> {
    const url: string = `${this.baseUrl}/app/patients/new-patient`
    const body = {...patient}
    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.post<AddedUser>( url, body, { headers } )
      .pipe(
        catchError(( err ) => throwError(() => formatApiError(err)))
      )
  }

  public editPatient(patient: FormPatient, patientId: number): Observable<AddedUser | null> {
    const url: string = `${this.baseUrl}/app/patients/${patientId}`
    const body = {...patient}
    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.patch<AddedUser>(url, body, {headers})
      .pipe(
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public deletePatient(id: number): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/patients/${id}`
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
