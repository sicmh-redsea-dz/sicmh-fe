import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Invoice, InvoiceForm } from '../../interface/invoice-response.interface';
import { formatApiError } from '../../../shared/utils/api-error'

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
  private _listOfInvoices = signal<Invoice[] | null>( null )
  public listOfInvoices = computed(() => this._listOfInvoices())
  
  public getInvoices(args: Delimiters): Observable<any> {
    const url: string = `${this.baseUrl}/app/invoice`
    const params = new HttpParams()
      .set('limit', args.limit)
      .set('offset', args.offset)
      .set('term', args.term)

    return this.http.get<any>(url, { params })
      .pipe(
        map((resp) => {
          this._listOfInvoices.set(resp.data)
          return resp
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public getOneInvoice(invoiceId: string): Observable<any | null> {
    const url: string = `${this.baseUrl}/app/invoice/${invoiceId}`
    return this.http.get(url, {})
      .pipe(
        map(( resp ) => {
          return resp
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public getDataForInvoice(): Observable<any | null> {
    const url: string = `${this.baseUrl}/app/invoice/raw`
    return this.http.get( url, {})
      .pipe(
        map(( resp ) => {
          return resp
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public createInvoice(invoiceForm: InvoiceForm): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/invoice/create`
    const body = {...invoiceForm, origin: true}
    return this.http.post(url, body, {})
      .pipe(
        map((resp) => {
          return true
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public updateInvoice(id: string, invoiceForm: InvoiceForm): Observable<boolean> {
    const url = `${this.baseUrl}/app/invoice/${id}`
    const body = {...invoiceForm}
    return this.http.patch(url, body, {})
      .pipe(
        map((item) => {
          return true
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public deleteInvoice(id: string): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/invoice/${id}`
    return this.http.delete(url, {})
      .pipe(
        map(() => true),
        catchError((err) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public annulInvoice(id: string): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/invoice/${id}/annul`
    return this.http.patch(url, {}, {})
      .pipe(
        map(() => true),
        catchError((err) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public downloadPDFReport( term: string ): Observable<any> {
    const url: string = `${this.baseUrl}/app/invoice/generate-pdf/${term}`
    return this.http.get(url, { responseType: 'blob' });
  }

}
