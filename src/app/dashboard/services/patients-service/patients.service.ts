import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'
import { computed, inject, Injectable, signal } from '@angular/core'
import { environment } from '../../../../environments/environment'
import { catchError, map, Observable, of, throwError } from 'rxjs'
import { AddedUser, Data, FormPatient, Patient, PatientsResponse } from '../../interface/patients-response.interface'
import { AuthService } from '../../../auth/services/auth.service'

interface Pagination {
  limit: number,
  offset: number
}
@Injectable({
  providedIn: 'root'
})
export class PatientsService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject( HttpClient )
  private authStatus = inject( AuthService )
  private _listOfPatients = signal<Data | null>( null )
  private _selectedPatient = signal<Patient | null>( null )
  public selectedPatient = computed(() => this._selectedPatient() )
  public listOfPatients = computed(() => this._listOfPatients())

  public getPatients( pagination: Pagination):Observable<Data | null> {
    const url: string = `${this.baseUrl}/dashboard/patients`
    const token = localStorage.getItem('token')
    if ( !token ) this.authStatus.logout()
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

    const params = new HttpParams()
      .set('limit', pagination.limit)
      .set('offset', pagination.offset)

    return this.http.get<PatientsResponse>( url, { headers, params } )
      .pipe(
        map(({ data }) => {
          this._listOfPatients.set(data)
          return data
        }),
        catchError(( err ) => {
          throwError(() => err.error.message)
          return of( null )
        })
      )
  }

  public getPatient( patientId:number ): Observable<Patient | null> {
      const url: string = `${this.baseUrl}/dashboard/patients/${patientId}`
      const token = localStorage.getItem('token')
      if( !token ) {
        this.authStatus.logout()
        return of( null )
      }
      const headers = new HttpHeaders()
        .set('Authorization', `Bearer ${token}`)

      return this.http.get<AddedUser>( url, { headers } )
        .pipe(
          map(({ data }) => {
            this._selectedPatient.set(data.patient)
            return data.patient
          }),
          catchError(( err ) => {
            throwError(() => err.message )
            return of( null )
          })
        )
  }

  public savePatient(patient: FormPatient): Observable<AddedUser | null > {
    const url: string = `${this.baseUrl}/dashboard/patients/new-patient`
    const body = {...patient}
    const token = localStorage.getItem('token')
    if( !token ) {
      this.authStatus.logout()
      return of( null )
    }
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
    return this.http.post<AddedUser>( url, body, { headers } )
      .pipe(
        catchError(( err ) => {
          throwError(() => err.message )
          return of( null )
        })
      )
  }

  public editPatient(patient: FormPatient, patientId: number): Observable<AddedUser | null> {
    const url: string = `${this.baseUrl}/dashboard/patients/${patientId}`
    const body = {...patient}
    const token = localStorage.getItem('token')
    if( !token ) {
      this.authStatus.logout()
      return of( null )
    }
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

    return this.http.patch<AddedUser>(url, body, {headers})
      .pipe(
        catchError(( err ) => {
          throwError(() => err.message )
          return of( null )
        })
      )
  }
} 
