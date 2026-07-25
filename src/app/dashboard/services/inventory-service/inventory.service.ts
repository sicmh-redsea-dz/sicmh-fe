import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Article } from '../../interface/article.interface';
import { formatApiError } from '../../../shared/utils/api-error'

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
  private _selectedItem = signal<Article | null >( null )
  public selectedItem = computed(() => this._selectedItem() )

  private readonly _listOfInvItems = signal<Article[] | null >( null )
  public listOfInvItems = computed(() => this._listOfInvItems())

  public getInventoryItems( args: Delimiters, subinvId: string ): Observable< any > {
    const url: string = `${ this.baseUrl }/app/inventory`
    const params = new HttpParams()
      .set('limit', args.limit)
      .set('offset', args.offset)
      .set('term', args.term)
      .set('subinvId', subinvId)
    
    return this.http.get( url, { params } )
      .pipe(
        map(( resp: any ) => {
          const items = resp?.data?.resp ?? []
          this._listOfInvItems.set( items as Article[] )
          return resp
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public getInventoryItemById(id: string | number): Observable<Article> {
    const url = `${this.baseUrl}/app/inventory/${id}`
    return this.http.get<{ data: Article }>(url, {}).pipe(
      map((resp: { data: Article }) => {
        this._selectedItem.set( resp.data )
        return resp.data
      }),
      catchError((err) => {
        return throwError(() => formatApiError(err))
      })
    )
  }

  public transferItemById( params: Record<string, any> ): Observable<any> {
    
    const url = `${this.baseUrl}/app/inventory/transfer`
    const body = params

    return this.http.post(url, body, {}).pipe(
      map((resp: any) => resp),
      catchError((err) => {
        return throwError(() => formatApiError(err))
      })
    )
  }

  public saveArticle( params: Record< string, any>): Observable<any> {
    const url = `${this.baseUrl}/app/inventory/new-item`
    return this.http.post(url, params, {})
      .pipe(
        map( resp => resp),
        catchError( err => {
          return throwError(() => formatApiError(err))
        })

      )
  }

  public updArticle( params: Record< string, any>, articId: number): Observable<any> {
    const url = `${this.baseUrl}/app/inventory/edit-item/${articId}`
    return this.http.patch(url, params, {})
      .pipe(
        map( resp => resp),
        catchError( err => {
          return throwError(() => formatApiError(err))
        })

      )
  }

}
