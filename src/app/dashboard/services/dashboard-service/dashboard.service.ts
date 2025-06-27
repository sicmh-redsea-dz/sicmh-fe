import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment'
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly baseUrl: string = environment.baseUrl

  private http = inject( HttpClient )
  private authStatus = inject( AuthService )

  public getDataForDashb(): Observable<any> {
    const url: string = `${this.baseUrl}/app`
    const token = localStorage.getItem('token')

      if ( !token ) this.authStatus.logout()

      const headers = new HttpHeaders()
        .set('Authorization', `Bearer ${token}`)

      return this.http.get<any>( url, { headers })
        .pipe(
          map(({ data }) => {
            let cardData = data.cardData
            let visitData = data.visitData
            return { cardData, visitData }
          }),
          catchError(( err ) => {
            throwError(() => err.error.message)
            return of( null )
          })
        )

  }
}