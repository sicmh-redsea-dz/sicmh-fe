import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/services/auth.service';
import { catchError, map, Observable, of, throwError } from 'rxjs';

interface Delimiters {
  limit: number,
  offset: number,
  term: string,
}

@Injectable({
  providedIn: 'root'
})
export class InvServiceService {
  private readonly baseUrl: string = environment.baseUrl
  private readonly http = inject( HttpClient )
  private readonly authStatus = inject( AuthService )

  private _listOfInvItems = signal( null )
  public listOfInvItems = computed(() => this._listOfInvItems())

  public getInventoryItems( args: Delimiters ): Observable< any > {
    const url: string = `${ this.baseUrl }/app/inventory`

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`)

    const params = new HttpParams()
      .set('limit', args.limit)
      .set('offset', args.offset)
      .set('term', args.term)
    console.log('query params', params.toString() )
    return this.http.get( url, { headers, params } )
      .pipe(
        map(( resp: any ) => {
          this._listOfInvItems.set( resp.data )
          return resp
        }),
        catchError(( err ) => {
          throwError(() => err.message )
          return of( null )
        })
      )
  }

  private validateToken(): string | null {
    const token = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()
    return token
  }
}
