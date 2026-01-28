import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { AuthHeadersService } from '../../../core/http/auth-headers.service';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Article } from '../../interface/article.interface';

interface Delimiters {
  limit: number,
  offset: number,
  term: string,
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly baseUrl: string = environment.baseUrl
  private readonly http = inject( HttpClient )
  private readonly authHeaders = inject( AuthHeadersService )

  private _selectedItem = signal<Article | null >( null )
  public selectedItem = computed(() => this._selectedItem() )

  private readonly _listOfInvItems = signal<Article[] | null >( null )
  public listOfInvItems = computed(() => this._listOfInvItems())

  public getInventoryItems( args: Delimiters, subinvId: string ): Observable< any > {
    const url: string = `${ this.baseUrl }/app/inventory`

    const headers = this.authHeaders.buildAuthHeaders()

    const params = new HttpParams()
      .set('limit', args.limit)
      .set('offset', args.offset)
      .set('term', args.term)
      .set('subinvId', subinvId)
    
    return this.http.get( url, { headers, params } )
      .pipe(
        map(( resp: any ) => {
          const items = resp?.data?.resp ?? []
          this._listOfInvItems.set( items as Article[] )
          return resp
        }),
        catchError(( err ) => {
          return throwError(() => err?.error?.message ?? err?.message)
        })
      )
  }

  public getInventoryItemById(id: string | number): Observable<Article> {
    const url = `${this.baseUrl}/app/inventory/${id}`
    
    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.get<{ data: Article }>(url, { headers }).pipe(
      map((resp: { data: Article }) => {
        this._selectedItem.set( resp.data )
        return resp.data
      }),
      catchError((err) => {
        return throwError(() => err?.error?.message ?? err?.message)
      })
    )
  }

  public transferItemById( params: Record<string, any> ): Observable<any> {
    
    const url = `${this.baseUrl}/app/inventory/transfer`

    const headers = this.authHeaders.buildAuthHeaders()

    const body = params

    return this.http.post(url, body, { headers }).pipe(
      map((resp: any) => resp),
      catchError((err) => {
        return throwError(() => err?.error?.message ?? err?.message)
      })
    )
  }

  public saveArticle( params: Record< string, any>): Observable<any> {
    const url = `${this.baseUrl}/app/inventory/new-item`

    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.post(url, params, { headers })
      .pipe(
        map( resp => resp),
        catchError( err => {
          return throwError(() => err?.error?.message ?? err?.message)
        })

      )
  }

  public updArticle( params: Record< string, any>, articId: number): Observable<any> {
    const url = `${this.baseUrl}/app/inventory/edit-item/${articId}`
    
    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.patch(url, params, { headers })
      .pipe(
        map( resp => resp),
        catchError( err => {
          return throwError(() => err?.error?.message ?? err?.message)
        })

      )
  }

}
