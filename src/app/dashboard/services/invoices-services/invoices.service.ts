import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { InvoiceResponse, Invoice, InvoiceForm } from '../../interface/invoice-response.interface';

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject( HttpClient )
  private authStatus = inject( AuthService )

  private _listOfInvoices = signal<Invoice[] | null>( null )
  public listOfInvoices = computed(() => this._listOfInvoices())
  
  public getInvoices(): Observable<Invoice[] | null> {
    const url: string = `${this.baseUrl}/dashboard/invoices`

    const token = this.validateToken()

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)

    return this.http.get<InvoiceResponse>(url, { headers })
      .pipe(
        map((resp) => {
          this._listOfInvoices.set(resp.data.invoices)
          return resp.data.invoices
        }),
        catchError(( err ) => {
          throwError(() => err.message)
          return of( null )
        })
      )
  }

  public getOneInvoice(invoiceId: string): Observable<any | null> {
    const url: string = `${this.baseUrl}/dashboard/invoices/invoice/${invoiceId}`

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
    const url: string = `${this.baseUrl}/dashboard/invoices/new-invoice`

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
    const url: string = `${this.baseUrl}/dashboard/invoices/new-invoice`
    const body = {...invoiceForm}

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

  public deleteInvoice(id: string): Observable<boolean> {
    const url: string = `${this.baseUrl}/dashboard/invoices/${id}`

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

  private validateToken(): string | null {
    const token = localStorage.getItem('token')
    if( !token ) this.authStatus.logout()
    return token
  }
}
