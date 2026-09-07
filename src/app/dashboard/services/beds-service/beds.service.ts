import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { formatApiError } from '../../../shared/utils/api-error'

import { environment } from '../../../../environments/environment';
import { BedModule, BedRecord, BedStatus } from '../../interface/bed-management.interface';

interface BedPayload {
  code: string
  area?: string
  status?: BedStatus
}

interface AssignPayload {
  assignmentId?: string
  patientId: string
  patientName: string
  doctorId?: string
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
  public getBeds(module: BedModule): Observable<BedRecord[]> {
    const url = `${this.baseUrl}/app/beds/${module}`
    return this.http.get<any>(url, {})
      .pipe(
        map(({ data }) => data.beds as BedRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public createBed(module: BedModule, payload: BedPayload): Observable<BedRecord[]> {
    const url = `${this.baseUrl}/app/beds/${module}`
    return this.http.post<any>(url, payload, {})
      .pipe(
        map(({ data }) => data.beds as BedRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateBed(module: BedModule, bedId: string | number, payload: BedPayload): Observable<BedRecord[]> {
    const url = `${this.baseUrl}/app/beds/${module}/${bedId}`
    return this.http.patch<any>(url, payload, {})
      .pipe(
        map(({ data }) => data.beds as BedRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public assignBed(module: BedModule, bedId: string | number, payload: AssignPayload): Observable<BedRecord[]> {
    const url = `${this.baseUrl}/app/beds/${module}/${bedId}/assign`
    return this.http.post<any>(url, payload, {})
      .pipe(
        map(({ data }) => data.beds as BedRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public releaseBed(module: BedModule, bedId: string | number, payload?: { reason?: string; status?: BedStatus }): Observable<BedRecord[]> {
    const url = `${this.baseUrl}/app/beds/${module}/${bedId}/release`
    return this.http.post<any>(url, payload ?? {}, {})
      .pipe(
        map(({ data }) => data.beds as BedRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }
}
