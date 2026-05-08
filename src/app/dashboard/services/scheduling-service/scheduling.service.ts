import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, map } from 'rxjs'
import { EventInput } from '@fullcalendar/core'
import { environment } from '../../../../environments/environment'
import { AuthHeadersService } from '../../../core/http/auth-headers.service'
import { Cita, Doctor, TIPO_COLORS } from '../../interface/cita.interface'

@Injectable({ providedIn: 'root' })
export class SchedulingService {
  private readonly base = `${environment.baseUrl}/app/scheduling`
  private http         = inject(HttpClient)
  private authHeaders  = inject(AuthHeadersService)

  getEvents(start: string, end: string): Observable<EventInput[]> {
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http
      .get<{ data: Cita[] }>(`${this.base}/events`, { headers, params: { start, end } })
      .pipe(map(({ data }) => data.map(this.toEventInput)))
  }

  getCita(id: number): Observable<Cita> {
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http
      .get<{ data: Cita }>(`${this.base}/events/${id}`, { headers })
      .pipe(map(({ data }) => data))
  }

  create(body: Partial<Cita>): Observable<Cita> {
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http
      .post<{ data: Cita }>(`${this.base}/events`, body, { headers })
      .pipe(map(({ data }) => data))
  }

  update(id: number, body: Partial<Cita>): Observable<Cita> {
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http
      .patch<{ data: Cita }>(`${this.base}/events/${id}`, body, { headers })
      .pipe(map(({ data }) => data))
  }

  delete(id: number): Observable<void> {
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http
      .delete<void>(`${this.base}/events/${id}`, { headers })
  }

  getCitasForDate(date: string): Observable<Cita[]> {
    const headers = this.authHeaders.buildAuthHeaders()
    const next = new Date(date + 'T00:00:00')
    next.setDate(next.getDate() + 1)
    const end = next.toISOString().slice(0, 10)
    return this.http
      .get<{ data: Cita[] }>(`${this.base}/events`, { headers, params: { start: date, end } })
      .pipe(map(({ data }) => data))
  }

  getDoctors(): Observable<Doctor[]> {
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http
      .get<{ data: Doctor[] }>(`${this.base}/doctors`, { headers })
      .pipe(map(({ data }) => data))
  }

  getSources(): Observable<string[]> {
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http
      .get<{ data: string[] }>(`${this.base}/sources`, { headers })
      .pipe(map(({ data }) => data))
  }

  private toEventInput(c: Cita): EventInput {
    return {
      id:    String(c.CitaID),
      title: c.Titulo,
      start: c.Inicio,
      end:   c.Fin,
      backgroundColor: TIPO_COLORS[c.Tipo] ?? '#6B7280',
      borderColor:     TIPO_COLORS[c.Tipo] ?? '#6B7280',
      textColor: '#ffffff',
      extendedProps: { cita: c },
    }
  }
}
