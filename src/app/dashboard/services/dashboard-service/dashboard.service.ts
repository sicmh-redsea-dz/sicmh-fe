import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment'
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { AuthHeadersService } from '../../../core/http/auth-headers.service';
import { formatApiError } from '../../../shared/utils/api-error'

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly baseUrl: string = environment.baseUrl

  private http = inject( HttpClient )
  private authHeaders = inject( AuthHeadersService )

  public getDataForDashb(): Observable<any> {
    const url: string = `${this.baseUrl}/app`
    const headers = this.authHeaders.buildAuthHeaders()

      return this.http.get<any>( url, { headers })
        .pipe(
          map(({ data }) => {
            let cardData = data.cardData
            let visitData = data.visitData
            return { cardData, visitData }
          }),
          catchError(( err ) => {
            return throwError(() => formatApiError(err))
          })
        )

  }
}
