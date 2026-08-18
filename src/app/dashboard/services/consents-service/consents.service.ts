import { HttpClient, HttpResponse } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, shareReplay, tap, throwError } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { formatApiError } from '../../../shared/utils/api-error'
import { ConsentDocumentContext, ConsentInstance, ConsentTemplate } from '../../interface/consent.interface'

interface ApiResponse<T> { data: T }

@Injectable({ providedIn: 'root' })
export class ConsentsService {
  private http = inject(HttpClient)
  private baseUrl = environment.baseUrl
  private availableTemplates$?: Observable<ConsentTemplate[]>

  listTemplates(includeInactive = false): Observable<ConsentTemplate[]> {
    return this.http.get<ApiResponse<ConsentTemplate[]>>(`${this.baseUrl}/app/settings/consents`, { params: { includeInactive } })
      .pipe(map((response) => response.data), catchError((error) => throwError(() => formatApiError(error))))
  }

  createTemplate(name: string, content: string): Observable<ConsentTemplate> {
    return this.http.post<ApiResponse<ConsentTemplate>>(`${this.baseUrl}/app/settings/consents`, { name, content })
      .pipe(map((response) => response.data), tap(() => this.availableTemplates$ = undefined), catchError((error) => throwError(() => formatApiError(error))))
  }

  updateTemplate(id: number, name: string, content: string): Observable<ConsentTemplate> {
    return this.http.put<ApiResponse<ConsentTemplate>>(`${this.baseUrl}/app/settings/consents/${id}`, { name, content })
      .pipe(map((response) => response.data), tap(() => this.availableTemplates$ = undefined), catchError((error) => throwError(() => formatApiError(error))))
  }

  setTemplateActive(id: number, active: boolean): Observable<boolean> {
    return this.http.patch<ApiResponse<{ updated: boolean }>>(`${this.baseUrl}/app/settings/consents/${id}/status`, { active })
      .pipe(map((response) => response.data.updated), tap(() => this.availableTemplates$ = undefined), catchError((error) => throwError(() => formatApiError(error))))
  }

  listVisitConsents(visitId: number): Observable<ConsentInstance[]> {
    return this.http.get<ApiResponse<ConsentInstance[]>>(`${this.baseUrl}/app/visits/${visitId}/consents`)
      .pipe(map((response) => response.data), catchError((error) => throwError(() => formatApiError(error))))
  }

  listAvailableTemplates(): Observable<ConsentTemplate[]> {
    if (!this.availableTemplates$) {
      this.availableTemplates$ = this.http.get<ApiResponse<ConsentTemplate[]>>(`${this.baseUrl}/app/visits/consent-templates`)
        .pipe(
          map((response) => response.data),
          catchError((error) => { this.availableTemplates$ = undefined; return throwError(() => formatApiError(error)) }),
          shareReplay(1)
        )
    }
    return this.availableTemplates$
  }

  getContext(visitId: number, templateId: number): Observable<ConsentDocumentContext> {
    return this.http.get<ApiResponse<ConsentDocumentContext>>(`${this.baseUrl}/app/visits/${visitId}/consents/${templateId}/context`)
      .pipe(map((response) => response.data), catchError((error) => throwError(() => formatApiError(error))))
  }

  getDraftContext(patientId: number, doctorId: number, date: string | null, templateId: number): Observable<ConsentDocumentContext> {
    return this.http.get<ApiResponse<ConsentDocumentContext>>(`${this.baseUrl}/app/visits/consent-templates/${templateId}/context`, {
      params: { patientId, doctorId, date: date || '' }
    }).pipe(map((response) => response.data), catchError((error) => throwError(() => formatApiError(error))))
  }

  printDraft(patientId: number, doctorId: number, date: string | null, templateId: number): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.baseUrl}/app/visits/consent-templates/${templateId}/print`, { patientId, doctorId, date }, { observe: 'response', responseType: 'blob' })
      .pipe(catchError((error) => throwError(() => formatApiError(error))))
  }

  accept(visitId: number, templateId: number, payload: Record<string, unknown>): Observable<{ id: number; attachmentId: number }> {
    return this.http.post<ApiResponse<{ id: number; attachmentId: number }>>(`${this.baseUrl}/app/visits/${visitId}/consents/${templateId}/accept`, payload)
      .pipe(map((response) => response.data), catchError((error) => throwError(() => formatApiError(error))))
  }

  print(visitId: number, templateId: number, expectedTemplateVersion?: number): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.baseUrl}/app/visits/${visitId}/consents/${templateId}/print`, { expectedTemplateVersion }, { observe: 'response', responseType: 'blob' })
      .pipe(catchError((error) => throwError(() => formatApiError(error))))
  }

  uploadPhysical(visitId: number, instanceId: number, file: File): Observable<{ id: number; attachmentId: number }> {
    const body = new FormData()
    body.append('file', file)
    return this.http.post<ApiResponse<{ id: number; attachmentId: number }>>(`${this.baseUrl}/app/visits/${visitId}/consents/instances/${instanceId}/physical`, body)
      .pipe(map((response) => response.data), catchError((error) => throwError(() => formatApiError(error))))
  }
}
