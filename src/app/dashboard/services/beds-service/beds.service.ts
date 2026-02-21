import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { formatApiError } from '../../../shared/utils/api-error'

import { environment } from '../../../../environments/environment';
import { AuthHeadersService } from '../../../core/http/auth-headers.service';
import { BedModule, BedRecord, BedStatus } from '../../interface/bed-management.interface';

interface BedPayload {
  code: string
  area?: string
  status?: BedStatus
}

interface AssignPayload {
  assignmentId?: string
  patientId: number
  patientName: string
  doctorId?: number
  doctorName?: string
  reason?: string
  notes?: string
  expectedDischarge?: string
}

@Injectable({
  providedIn: 'root'
})
export class BedsService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject(HttpClient)
  private authHeaders = inject(AuthHeadersService)

  public getBeds(module: BedModule): Observable<BedRecord[]> {
    const url = `${this.baseUrl}/app/beds/${module}`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.get<any>(url, { headers })
      .pipe(
        map(({ data }) => data.beds as BedRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public createBed(module: BedModule, payload: BedPayload): Observable<BedRecord[]> {
    const url = `${this.baseUrl}/app/beds/${module}`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.post<any>(url, payload, { headers })
      .pipe(
        map(({ data }) => data.beds as BedRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateBed(module: BedModule, bedId: number, payload: BedPayload): Observable<BedRecord[]> {
    const url = `${this.baseUrl}/app/beds/${module}/${bedId}`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.patch<any>(url, payload, { headers })
      .pipe(
        map(({ data }) => data.beds as BedRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public assignBed(module: BedModule, bedId: number, payload: AssignPayload): Observable<BedRecord[]> {
    const url = `${this.baseUrl}/app/beds/${module}/${bedId}/assign`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.post<any>(url, payload, { headers })
      .pipe(
        map(({ data }) => data.beds as BedRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public releaseBed(module: BedModule, bedId: number, payload?: { reason?: string; status?: BedStatus }): Observable<BedRecord[]> {
    const url = `${this.baseUrl}/app/beds/${module}/${bedId}/release`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.post<any>(url, payload ?? {}, { headers })
      .pipe(
        map(({ data }) => data.beds as BedRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }
}
