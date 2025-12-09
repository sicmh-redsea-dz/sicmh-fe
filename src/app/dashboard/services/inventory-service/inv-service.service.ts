import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/services/auth.service';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { Article } from '../../interface/article.interface';

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

  private _selectedItem = signal<Article | null >( null )
  public selectedItem = computed(() => this._selectedItem() )

  private readonly _listOfInvItems = signal<string | null >( null )
  public listOfInvItems = computed(() => this._listOfInvItems())

  public getInventoryItems( args: Delimiters, subinvId: string ): Observable< any > {
    const url: string = `${ this.baseUrl }/app/inventory`

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`)

    const params = new HttpParams()
      .set('limit', args.limit)
      .set('offset', args.offset)
      .set('term', args.term)
      .set('subinvId', subinvId)
    
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

  public getInventoryItemById(id: string): Observable<any> {
    const url = `${this.baseUrl}/app/inventory/${id}`
    
    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`)

    return this.http.get(url, { headers }).pipe(
      map((resp: any) => {
        this._selectedItem.set( resp.data )
        return resp.data
      }),
      catchError((err) => {
        return throwError(() => err.message)
      })
    )
  }

  public transferItemById( params: Record<string, any> ): Observable<any> {
    
    const url = `${this.baseUrl}/app/inventory/transfer`

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`)

    const body = params

    return this.http.post(url, body, { headers }).pipe(
      map((resp: any) => resp),
      catchError((err) => {
        return throwError(() => err.message)
      })
    )
  }

  public saveArticle( params: Record< string, any>): Observable<any> {
    const url = `${this.baseUrl}/app/inventory/new-item`

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`)

    return this.http.post(url, params, { headers })
      .pipe(
        map( resp => resp),
        catchError( err => {
          return throwError(() => err.message )
        })

      )
  }

  public updArticle( params: Record< string, any>, articId: number): Observable<any> {
    const url = `${this.baseUrl}/app/inventory/edit-item/${articId}`
    
    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`)

    return this.http.patch(url, params, { headers })
      .pipe(
        map( resp => resp),
        catchError( err => {
          return throwError(() => err.message )
        })

      )
  }

  private validateToken(): string | null {
    const token = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()
    return token
  }
}
