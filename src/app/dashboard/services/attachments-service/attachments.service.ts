import { HttpClient, HttpParams } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { catchError, map, Observable, throwError } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { AuthHeadersService } from '../../../core/http/auth-headers.service'
import { formatApiError } from '../../../shared/utils/api-error'
import {
  AttachmentListResponse,
  AttachmentSource,
  AttachmentUploadResponse,
  ClinicalAttachment,
  LogoUploadResponse,
} from '../../interface/clinical-attachments.interface'

interface UploadParams {
  file: File
  label: string
  source: AttachmentSource
  recordId?: number | null
}

@Injectable({
  providedIn: 'root'
})
export class AttachmentsService {
  private readonly baseUrl: string = environment.baseUrl
  private http = inject( HttpClient )
  private authHeaders = inject( AuthHeadersService )

  public getAttachments( patientId: number, recordId?: number | null ): Observable<ClinicalAttachment[]> {
    const url = `${this.baseUrl}/app/patients/${patientId}/attachments`
    const headers = this.authHeaders.buildAuthHeaders()
    let params = new HttpParams()
    if (recordId) params = params.set('recordId', recordId)

    return this.http.get<AttachmentListResponse>( url, { headers, params } )
      .pipe(
        map(({ data }) => data),
        catchError(( err ) => throwError(() => formatApiError(err)))
      )
  }

  public uploadAttachment( patientId: number, params: UploadParams ): Observable<ClinicalAttachment> {
    const url = `${this.baseUrl}/app/patients/${patientId}/attachments`
    const headers = this.authHeaders.buildAuthHeaders()

    const body = new FormData()
    body.append('file', params.file, params.file.name)
    body.append('label', params.label)
    body.append('source', params.source)
    if (params.recordId) body.append('recordId', String(params.recordId))

    return this.http.post<AttachmentUploadResponse>( url, body, { headers } )
      .pipe(
        map(({ data }) => data),
        catchError(( err ) => throwError(() => formatApiError(err)))
      )
  }

  // Inline rendering (img/embed) cannot send the Authorization header on its
  // own, so the file is fetched as a Blob and rendered through an object URL.
  public getViewBlob( attachmentId: number ): Observable<Blob> {
    const url = `${this.baseUrl}/app/attachments/${attachmentId}/view`
    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.get( url, { headers, responseType: 'blob' } )
      .pipe(
        catchError(( err ) => throwError(() => formatApiError(err)))
      )
  }

  public downloadAttachment( attachment: ClinicalAttachment ): Observable<boolean> {
    const url = `${this.baseUrl}/app/attachments/${attachment.id}/download`
    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.get( url, { headers, responseType: 'blob' } )
      .pipe(
        map(( blob ) => {
          const objectUrl = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = objectUrl
          anchor.download = attachment.label
          anchor.click()
          URL.revokeObjectURL(objectUrl)
          return true
        }),
        catchError(( err ) => throwError(() => formatApiError(err)))
      )
  }

  public deleteAttachment( attachmentId: number ): Observable<boolean> {
    const url = `${this.baseUrl}/app/attachments/${attachmentId}`
    const headers = this.authHeaders.buildAuthHeaders()

    return this.http.delete( url, { headers } )
      .pipe(
        map(() => true),
        catchError(( err ) => throwError(() => formatApiError(err)))
      )
  }

  public uploadLogo( file: File ): Observable<string> {
    const url = `${this.baseUrl}/app/settings/logo`
    const headers = this.authHeaders.buildAuthHeaders()

    const body = new FormData()
    body.append('file', file, file.name)

    return this.http.post<LogoUploadResponse>( url, body, { headers } )
      .pipe(
        map(({ data }) => data.url),
        catchError(( err ) => throwError(() => formatApiError(err)))
      )
  }

  // The logo bucket is public-read: the URL is built directly, no endpoint needed.
  public logoUrl( tenantCode: string ): string {
    return `${environment.publicAssetsBaseUrl}/${tenantCode}/logo.png`
  }
}
