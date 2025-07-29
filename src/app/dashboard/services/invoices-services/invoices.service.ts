import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { InvoiceResponse, Invoice, InvoiceForm } from '../../interface/invoice-response.interface';

interface Delimiters {
  limit: number,
  offset: number,
  term: string,
}

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject( HttpClient )
  private authStatus = inject( AuthService )

  private _listOfInvoices = signal<Invoice[] | null>( null )
  public listOfInvoices = computed(() => this._listOfInvoices())
  
  public getInvoices(args: Delimiters): Observable<any> {
    const url: string = `${this.baseUrl}/app/invoice`

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
    
    const params = new HttpParams()
      .set('limit', args.limit)
      .set('offset', args.offset)
      .set('term', args.term)

    return this.http.get<any>(url, { headers, params })
      .pipe(
        map((resp) => {
          this._listOfInvoices.set(resp.data)
          return resp
        }),
        catchError(( err ) => {
          throwError(() => err.message)
          return of( null )
        })
      )
  }

  public getOneInvoice(invoiceId: string): Observable<any | null> {
    const url: string = `${this.baseUrl}/app/invoice/${invoiceId}`

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

    return this.http.get(url, { headers })
      .pipe(
        map(( resp ) => {
          return resp
        }),
        catchError(( err ) => {
          throwError(() => err.message )
          return of( null )
        })
      )
  }

  public getDataForInvoice(): Observable<any | null> {
    const url: string = `${this.baseUrl}/app/invoice/raw`

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
    
    return this.http.get( url, { headers })
      .pipe(
        map(( resp ) => {
          return resp
        }),
        catchError(( err ) => {
          throwError(() => err.message)
          return of( null )
        })
      )
  }

  public createInvoice(invoiceForm: InvoiceForm): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/invoice/create`
    const body = {...invoiceForm, origin: true}

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

    return this.http.post(url, body, { headers })
      .pipe(
        map((resp) => {
          return true
        }),
        catchError(( err ) => {
          throwError(() => err.message)
          return of( false )
        })
      )
  }

  public updateInvoice(id: string, invoiceForm: InvoiceForm): Observable<boolean> {
    const url = `${this.baseUrl}/app/invoice/${id}`
    const body = {...invoiceForm}

    const token = this.validateToken()
    
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      
    return this.http.patch(url, body, { headers })
      .pipe(
        map((item) => {
          console.log('updated item: ', item)
          return true
        }),
        catchError(( err ) => {
          throwError(() => err.message)
          return of( false )
        })
      )
  }

  public deleteInvoice(id: string): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/invoice/${id}`

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

    return this.http.delete(url, { headers })
      .pipe(
        map(() => true),
        catchError((err) => {
          throwError(() => err.message)
          return of( false )
        })
      )
  }

  public downloadPDFReport(): Observable<any> {
    const url: string = `${this.baseUrl}/app/invoice/generate-pdf`

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

    return this.http.get(url, { headers, responseType: 'blob'});
  }

  private validateToken(): string | null {
    const token = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()
    return token
  }
}
