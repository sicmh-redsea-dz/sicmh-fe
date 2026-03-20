import { HttpClient, HttpParams } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { catchError, map, Observable, throwError } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { AuthHeadersService } from '../../../core/http/auth-headers.service'
import { formatApiError } from '../../../shared/utils/api-error'
import { BillingReport } from '../../interface/billing.interface'

export interface BillingReportFilters {
  from?: string
  to?: string
  patientIds?: number[]
  station?: string
  status?: string
}

export interface ManualChargePayload {
  patientId: number
  patientName?: string
  station?: string
  category?: string
  description: string
  quantity?: number
  unitPrice?: number
  occurredAt?: string
  status?: string
}

export interface MovementPayload {
  patientId: number
  patientName?: string
  fromStation?: string
  toStation: string
  occurredAt?: string
  reason?: string
  notes?: string
  charge?: {
    station?: string
    category?: string
    description?: string
    quantity?: number
    unitPrice?: number
    occurredAt?: string
    status?: string
  }
}

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject(HttpClient)
  private authHeaders = inject(AuthHeadersService)

  public getReport(filters: BillingReportFilters): Observable<BillingReport> {
    const url = `${this.baseUrl}/app/billing/report`
    const headers = this.authHeaders.buildAuthHeaders()
    let params = new HttpParams()

    if (filters.from) params = params.set('from', filters.from)
    if (filters.to) params = params.set('to', filters.to)
    if (filters.station) params = params.set('station', filters.station)
    if (filters.status) params = params.set('status', filters.status)
    if (filters.patientIds && filters.patientIds.length > 0) {
      params = params.set('patients', filters.patientIds.join(','))
    }

    return this.http.get<any>(url, { headers, params })
      .pipe(
        map(({ data }) => data as BillingReport),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public downloadReportPdf(filters: BillingReportFilters): Observable<Blob> {
    const url = `${this.baseUrl}/app/billing/report/pdf`
    const headers = this.authHeaders.buildAuthHeaders()
    let params = new HttpParams()
    if (filters.from) params = params.set('from', filters.from)
    if (filters.to) params = params.set('to', filters.to)
    if (filters.station) params = params.set('station', filters.station)
    if (filters.status) params = params.set('status', filters.status)
    if (filters.patientIds && filters.patientIds.length > 0) {
      params = params.set('patients', filters.patientIds.join(','))
    }
    return this.http.get(url, { headers, params, responseType: 'blob' })
      .pipe(
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public createManualCharge(payload: ManualChargePayload): Observable<any> {
    const url = `${this.baseUrl}/app/billing/ledger`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.post<any>(url, payload, { headers })
      .pipe(
        map((resp) => resp.data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public createMovement(payload: MovementPayload): Observable<any> {
    const url = `${this.baseUrl}/app/billing/movements`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.post<any>(url, payload, { headers })
      .pipe(
        map((resp) => resp.data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }
}
