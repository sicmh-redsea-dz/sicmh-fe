import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { formatApiError } from '../../../shared/utils/api-error'

import { environment } from '../../../../environments/environment';
import { AuthHeadersService } from '../../../core/http/auth-headers.service';
import { OrRoomRecord, OrRoomStatus } from '../../interface/or-rooms.interface';

interface RoomPayload {
  code: string
  specialty?: string
  status?: OrRoomStatus
}

interface AssignPayload {
  assignmentId?: string
  patientId: number
  patientName: string
  doctorId?: number
  doctorName?: string
  procedure?: string
  anesthesiaType?: string
  scheduledStart?: string
  scheduledEnd?: string
  notes?: string
}

@Injectable({
  providedIn: 'root'
})
export class OrRoomsService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject(HttpClient)
  private authHeaders = inject(AuthHeadersService)

  public getRooms(): Observable<OrRoomRecord[]> {
    const url = `${this.baseUrl}/app/or-rooms`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.get<any>(url, { headers })
      .pipe(
        map(({ data }) => data.rooms as OrRoomRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public createRoom(payload: RoomPayload): Observable<OrRoomRecord[]> {
    const url = `${this.baseUrl}/app/or-rooms`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.post<any>(url, payload, { headers })
      .pipe(
        map(({ data }) => data.rooms as OrRoomRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateRoom(roomId: number, payload: RoomPayload): Observable<OrRoomRecord[]> {
    const url = `${this.baseUrl}/app/or-rooms/${roomId}`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.patch<any>(url, payload, { headers })
      .pipe(
        map(({ data }) => data.rooms as OrRoomRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public assignRoom(roomId: number, payload: AssignPayload): Observable<OrRoomRecord[]> {
    const url = `${this.baseUrl}/app/or-rooms/${roomId}/assign`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.post<any>(url, payload, { headers })
      .pipe(
        map(({ data }) => data.rooms as OrRoomRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public releaseRoom(roomId: number, payload?: { reason?: string; status?: OrRoomStatus }): Observable<OrRoomRecord[]> {
    const url = `${this.baseUrl}/app/or-rooms/${roomId}/release`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.post<any>(url, payload ?? {}, { headers })
      .pipe(
        map(({ data }) => data.rooms as OrRoomRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }
}
