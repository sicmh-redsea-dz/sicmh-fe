import { HttpClient, HttpParams } from '@angular/common/http'
import { computed, inject, Injectable, signal } from '@angular/core'
import { environment } from '../../../../environments/environment'
import { catchError, map, Observable, throwError } from 'rxjs'
import { AddedUser, Data, FormPatient, Patient, PatientsResponse } from '../../interface/patients-response.interface'
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
  private _listOfPatients = signal<Data | null>( null )
  private _selectedPatient = signal<Patient | null>( null )
  public selectedPatient = computed(() => this._selectedPatient() )
  public listOfPatients = computed(() => this._listOfPatients())

  public getPatients( pagination: Delimiters):Observable<Data | null> {
    const url: string = `${this.baseUrl}/app/patients`
    const params = new HttpParams()
      .set('limit', pagination.limit)
      .set('offset', pagination.offset)
      .set('term', pagination.term)

    return this.http.get<PatientsResponse>( url, { params } )
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

  public getPatient( patientId:string | number ): Observable<Patient | null> {
      const url: string = `${this.baseUrl}/app/patients/${patientId}`
      return this.http.get<AddedUser>( url, {} )
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
    return this.http.post<AddedUser>( url, body, {} )
      .pipe(
        catchError(( err ) => throwError(() => formatApiError(err)))
      )
  }

  public editPatient(patient: FormPatient, patientId: string | number): Observable<AddedUser | null> {
    const url: string = `${this.baseUrl}/app/patients/${patientId}`
    const body = {...patient}
    return this.http.patch<AddedUser>(url, body, {})
      .pipe(
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public deletePatient(id: string | number): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/patients/${id}`
    return this.http.delete(url, {})
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
