import { Component, inject, Input, OnDestroy } from '@angular/core'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import { concatMap, from, interval, map, Observable, of, Subscription, switchMap, toArray } from 'rxjs'
import Swal from 'sweetalert2'
import { AttachmentsService } from '../../../services/attachments-service/attachments.service'
import { AttachmentSource, ClinicalAttachment } from '../../../interface/clinical-attachments.interface'
import { trackById, trackByIndex } from '../../../../shared/utils/track-by'

interface AttachmentPreview {
  objectUrl: string
  safeUrl: SafeResourceUrl
}

interface QueuedFile {
  file: File
  label: string
  source: AttachmentSource
}

@Component({
  selector: 'app-attachment-list',
  templateUrl: './attachment-list.component.html',
  styleUrl: './attachment-list.component.css'
})
export class AttachmentListComponent implements OnDestroy {
  public trackById = trackById
  public trackByIndex = trackByIndex
  private attachmentsService = inject(AttachmentsService)
  private sanitizer = inject(DomSanitizer)

  /** Hides upload and delete controls — view/download only. */
  @Input() readOnly = false
  /** Attachments are tied to this historia médica when uploading/listing. */
  @Input() recordId: string | number | null = null
  /**
   * Deferred mode: selected files are held locally instead of uploaded.
   * The parent calls uploadQueued() once the visit exists.
   */
  @Input() deferred = false

  public attachments: ClinicalAttachment[] = []
  public queuedFiles: QueuedFile[] = []
  public isLoading = false
  public isUploading = false
  public errorMessage: string | null = null
  public uploadLabel = ''
  public previews = new Map<string, AttachmentPreview>()
  public loadingPreviewId: string | null = null
  public isQrLoading = false

  private _patientId: string | null = null
  private capturePolling: Subscription | null = null

  @Input() set patientId(value: number | string | null | undefined) {
    const normalized = this.normalizeId(value)
    if (normalized === this._patientId) return
    this._patientId = normalized
    if (normalized && !this.deferred) this.reload()
  }

  ngOnDestroy(): void {
    this.stopCapturePolling()
    this.clearPreviews()
  }

  public get hasQueuedFiles(): boolean {
    return this.queuedFiles.length > 0
  }

  public reload(): void {
    if (!this._patientId) return
    this.isLoading = true
    this.errorMessage = null
    this.clearPreviews()
    this.attachmentsService.getAttachments(this._patientId, this.recordId).subscribe({
      next: (attachments) => {
        this.attachments = attachments
        this.isLoading = false
      },
      error: (err: string) => {
        this.errorMessage = err
        this.isLoading = false
      }
    })
  }

  public onFileSelected(event: Event, source: AttachmentSource): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    this.addFile(file, source)
  }

  public openQrCapture(): void {
    if (this.isQrLoading || this.isUploading) return
    this.isQrLoading = true
    this.errorMessage = null
    this.attachmentsService.createCaptureSession().subscribe({
      next: (session) => {
        this.isQrLoading = false
        Swal.fire({
          title: 'Agregar foto desde el celular',
          html: '<p>Escanea el código, toma la foto y presiona <b>Enviar foto</b> en tu teléfono.</p>',
          imageUrl: session.qrDataUrl,
          imageAlt: 'Código QR para tomar una foto',
          confirmButtonText: 'Cancelar',
          footer: `<small>El código vence a las ${new Date(session.expiresAt).toLocaleTimeString()}</small>`,
          didOpen: () => this.startCapturePolling(session.token),
          willClose: () => {
            this.stopCapturePolling()
            this.clearCaptureSession(session.token)
          },
        })
      },
      error: (err: string) => {
        this.isQrLoading = false
        this.errorMessage = err
      },
    })
  }

  public removeQueued(index: number): void {
    this.queuedFiles = this.queuedFiles.filter((_, i) => i !== index)
  }

  /**
   * Uploads every queued file against the given patient + historia médica.
   * Called by the parent form right after the visit is created.
   */
  public uploadQueued(patientId: string | number, recordId: string | number | null): Observable<number> {
    if (this.queuedFiles.length === 0) return of(0)
    const queue = [...this.queuedFiles]

    return from(queue).pipe(
      concatMap((item) => this.attachmentsService.uploadAttachment(patientId, {
        file: item.file, label: item.label, source: item.source, recordId
      })),
      toArray(),
      map((uploaded) => {
        this.queuedFiles = []
        return uploaded.length
      })
    )
  }

  public togglePreview(attachment: ClinicalAttachment): void {
    const existing = this.previews.get(attachment.id)
    if (existing) {
      URL.revokeObjectURL(existing.objectUrl)
      this.previews.delete(attachment.id)
      return
    }

    this.loadingPreviewId = attachment.id
    this.attachmentsService.getViewBlob(attachment.id).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob)
        this.previews.set(attachment.id, {
          objectUrl,
          safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl)
        })
        this.loadingPreviewId = null
      },
      error: (err: string) => {
        this.errorMessage = err
        this.loadingPreviewId = null
      }
    })
  }

  public download(attachment: ClinicalAttachment): void {
    this.attachmentsService.downloadAttachment(attachment).subscribe({
      error: (err: string) => this.errorMessage = err
    })
  }

  public remove(attachment: ClinicalAttachment): void {
    const confirmed = window.confirm(`¿Eliminar "${attachment.label}" del expediente?`)
    if (!confirmed) return

    this.attachmentsService.deleteAttachment(attachment.id).subscribe({
      next: () => {
        this.attachments = this.attachments.filter((a) => a.id !== attachment.id)
        const preview = this.previews.get(attachment.id)
        if (preview) {
          URL.revokeObjectURL(preview.objectUrl)
          this.previews.delete(attachment.id)
        }
      },
      error: (err: string) => this.errorMessage = err
    })
  }

  public isImage(attachment: ClinicalAttachment): boolean {
    return ['image/jpeg', 'image/png', 'image/webp'].includes(attachment.mime_type)
  }

  public isPdf(attachment: ClinicalAttachment): boolean {
    return attachment.mime_type === 'application/pdf'
  }

  public canPreview(attachment: ClinicalAttachment): boolean {
    return this.isImage(attachment) || this.isPdf(attachment)
  }

  public formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${bytes} B`
  }

  public iconFor(attachment: ClinicalAttachment): string {
    if (this.isImage(attachment)) return 'ph ph-image'
    if (this.isPdf(attachment)) return 'ph ph-file-pdf'
    return 'ph ph-file-doc'
  }

  private clearPreviews(): void {
    this.previews.forEach((preview) => URL.revokeObjectURL(preview.objectUrl))
    this.previews.clear()
  }

  private addFile(file: File, source: AttachmentSource): void {
    const label = this.uploadLabel.trim() || file.name
    this.uploadLabel = ''
    if (this.deferred) {
      this.queuedFiles = [...this.queuedFiles, { file, label, source }]
      return
    }
    if (!this._patientId) return
    this.isUploading = true
    this.errorMessage = null
    this.attachmentsService.uploadAttachment(this._patientId, { file, label, source, recordId: this.recordId }).subscribe({
      next: (created) => {
        this.attachments = [created, ...this.attachments]
        this.isUploading = false
      },
      error: (err: string) => {
        this.errorMessage = err
        this.isUploading = false
      },
    })
  }

  private normalizeId(value: number | string | null | undefined): string | null {
    if (value === null || value === undefined) return null
    const normalized = String(value).trim()
    if (!normalized || normalized === '0' || normalized === 'NaN') return null
    return normalized
  }

  private startCapturePolling(token: string): void {
    this.stopCapturePolling()
    this.capturePolling = interval(1500).pipe(
      switchMap(() => this.attachmentsService.getCaptureStatus(token))
    ).subscribe({
      next: (status) => {
        if (status.status === 'expired') {
          this.stopCapturePolling()
          Swal.fire('QR expirado', 'Genera un código nuevo para continuar.', 'info')
          return
        }
        if (status.status !== 'uploaded' || !status.image) return
        try {
          const file = this.dataUrlToFile(status.image.dataUrl, status.image.fileName || 'foto-desde-celular.jpg')
          this.addFile(file, 'in_app_camera')
          Swal.close()
        } catch {
          this.errorMessage = 'No se pudo procesar la foto recibida desde el celular.'
          Swal.close()
        }
      },
      error: (err: string) => {
        this.stopCapturePolling()
        this.errorMessage = err
        Swal.close()
      },
    })
  }

  private stopCapturePolling(): void {
    this.capturePolling?.unsubscribe()
    this.capturePolling = null
  }

  private clearCaptureSession(token: string): void {
    this.attachmentsService.deleteCaptureSession(token).subscribe({ error: () => undefined })
  }

  private dataUrlToFile(dataUrl: string, fileName: string): File {
    const [header, encoded] = dataUrl.split(',')
    const mime = header.match(/^data:([^;]+);base64$/)?.[1]
    if (!mime || !encoded) throw new Error('Invalid data URL')
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return new File([bytes], fileName, { type: mime })
  }
}
