import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, map } from 'rxjs'
import { EventInput } from '@fullcalendar/core'
import { environment } from '../../../../environments/environment'
import { Cita, Doctor, TIPO_COLORS } from '../../interface/cita.interface'

@Injectable({ providedIn: 'root' })
export class SchedulingService {
  private readonly base = `${environment.baseUrl}/app/scheduling`
  private http         = inject(HttpClient)
  getEvents(start: string, end: string): Observable<EventInput[]> {
    return this.http
      .get<{ data: Cita[] }>(`${this.base}/events`, { params: { start, end } })
      .pipe(map(({ data }) => data.map(this.toEventInput)))
  }

  getCita(id: string): Observable<Cita> {
    return this.http
      .get<{ data: Cita }>(`${this.base}/events/${id}`, {})
      .pipe(map(({ data }) => data))
  }

  create(body: Partial<Cita>): Observable<Cita> {
    return this.http
      .post<{ data: Cita }>(`${this.base}/events`, body, {})
      .pipe(map(({ data }) => data))
  }

  update(id: string, body: Partial<Cita>): Observable<Cita> {
    return this.http
      .patch<{ data: Cita }>(`${this.base}/events/${id}`, body, {})
      .pipe(map(({ data }) => data))
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/events/${id}`, {})
  }

  getCitasForDate(date: string): Observable<Cita[]> {
    const next = new Date(date + 'T00:00:00')
    next.setDate(next.getDate() + 1)
    const end = next.toISOString().slice(0, 10)
    return this.http
      .get<{ data: Cita[] }>(`${this.base}/events`, { params: { start: date, end } })
      .pipe(map(({ data }) => data))
  }

  getDoctors(): Observable<Doctor[]> {
    return this.http
      .get<{ data: Doctor[] }>(`${this.base}/doctors`, {})
      .pipe(map(({ data }) => data))
  }

  getSources(): Observable<string[]> {
    return this.http
      .get<{ data: string[] }>(`${this.base}/sources`, {})
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
