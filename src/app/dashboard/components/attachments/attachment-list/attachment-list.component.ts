import { Component, inject, Input, OnDestroy } from '@angular/core'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import { concatMap, from, map, Observable, of, toArray } from 'rxjs'
import { AttachmentsService } from '../../../services/attachments-service/attachments.service'
import { AttachmentSource, ClinicalAttachment } from '../../../interface/clinical-attachments.interface'

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
  private attachmentsService = inject(AttachmentsService)
  private sanitizer = inject(DomSanitizer)

  /** Hides upload and delete controls — view/download only. */
  @Input() readOnly = false
  /** Attachments are tied to this historia médica when uploading/listing. */
  @Input() recordId: number | null = null
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
  public previews = new Map<number, AttachmentPreview>()
  public loadingPreviewId: number | null = null

  private _patientId: number | null = null

  @Input() set patientId(value: number | string | null | undefined) {
    const id = Number(value)
    const normalized = id > 0 ? id : null
    if (normalized === this._patientId) return
    this._patientId = normalized
    if (normalized && !this.deferred) this.reload()
  }

  ngOnDestroy(): void {
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

    const label = this.uploadLabel.trim() || file.name
    this.uploadLabel = ''

    if (this.deferred) {
      this.queuedFiles = [...this.queuedFiles, { file, label, source }]
      return
    }

    if (!this._patientId) return
    this.isUploading = true
    this.errorMessage = null

    this.attachmentsService.uploadAttachment(this._patientId, {
      file, label, source, recordId: this.recordId
    }).subscribe({
      next: (created) => {
        this.attachments = [created, ...this.attachments]
        this.isUploading = false
      },
      error: (err: string) => {
        this.errorMessage = err
        this.isUploading = false
      }
    })
  }

  public removeQueued(index: number): void {
    this.queuedFiles = this.queuedFiles.filter((_, i) => i !== index)
  }

  /**
   * Uploads every queued file against the given patient + historia médica.
   * Called by the parent form right after the visit is created.
   */
  public uploadQueued(patientId: number, recordId: number | null): Observable<number> {
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
}
