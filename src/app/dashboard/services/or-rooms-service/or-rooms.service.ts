import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { formatApiError } from '../../../shared/utils/api-error'

import { environment } from '../../../../environments/environment';
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
  public getRooms(): Observable<OrRoomRecord[]> {
    const url = `${this.baseUrl}/app/or-rooms`
    return this.http.get<any>(url, {})
      .pipe(
        map(({ data }) => data.rooms as OrRoomRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public createRoom(payload: RoomPayload): Observable<OrRoomRecord[]> {
    const url = `${this.baseUrl}/app/or-rooms`
    return this.http.post<any>(url, payload, {})
      .pipe(
        map(({ data }) => data.rooms as OrRoomRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateRoom(roomId: number, payload: RoomPayload): Observable<OrRoomRecord[]> {
    const url = `${this.baseUrl}/app/or-rooms/${roomId}`
    return this.http.patch<any>(url, payload, {})
      .pipe(
        map(({ data }) => data.rooms as OrRoomRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public assignRoom(roomId: number, payload: AssignPayload): Observable<OrRoomRecord[]> {
    const url = `${this.baseUrl}/app/or-rooms/${roomId}/assign`
    return this.http.post<any>(url, payload, {})
      .pipe(
        map(({ data }) => data.rooms as OrRoomRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public releaseRoom(roomId: number, payload?: { reason?: string; status?: OrRoomStatus }): Observable<OrRoomRecord[]> {
    const url = `${this.baseUrl}/app/or-rooms/${roomId}/release`
    return this.http.post<any>(url, payload ?? {}, {})
      .pipe(
        map(({ data }) => data.rooms as OrRoomRecord[]),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }
}
