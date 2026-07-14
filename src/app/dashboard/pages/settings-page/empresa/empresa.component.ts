import { Component, inject, OnDestroy } from '@angular/core'
import Swal from 'sweetalert2'
import { AttachmentsService } from '../../../services/attachments-service/attachments.service'

const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_LOGO_BYTES = 5 * 1024 * 1024

@Component({
  selector: 'app-empresa',
  templateUrl: './empresa.component.html',
  styleUrl: './empresa.component.css'
})
export class EmpresaComponent implements OnDestroy {
  private attachmentsService = inject(AttachmentsService)

  public tenantCode = localStorage.getItem('codigoEmpresa') ?? ''
  public currentLogoUrl: string | null = null
  public currentLogoFailed = false
  public pendingPreviewUrl: string | null = null
  public selectedFile: File | null = null
  public saving = false

  constructor() {
    if (this.tenantCode) {
      // Cache-buster: the bucket serves the logo with max-age=300.
      this.currentLogoUrl = `${this.attachmentsService.logoUrl(this.tenantCode)}?t=${Date.now()}`
    }
  }

  ngOnDestroy(): void {
    this.revokePendingPreview()
  }

  onLogoError(): void {
    this.currentLogoFailed = true
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      Swal.fire('Error', 'El logo debe ser una imagen JPEG, PNG o WebP.', 'error')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      Swal.fire('Error', 'El logo excede el tamaño máximo permitido (5MB).', 'error')
      return
    }

    this.revokePendingPreview()
    this.selectedFile = file
    this.pendingPreviewUrl = URL.createObjectURL(file)
  }

  cancelSelection(): void {
    this.revokePendingPreview()
    this.selectedFile = null
  }

  save(): void {
    if (!this.selectedFile || this.saving) return

    this.saving = true
    this.attachmentsService.uploadLogo(this.selectedFile).subscribe({
      next: (url) => {
        this.saving = false
        this.currentLogoUrl = `${url}?t=${Date.now()}`
        this.currentLogoFailed = false
        this.cancelSelection()
        Swal.fire('Éxito', 'El logo se actualizó correctamente. Puede tardar unos minutos en reflejarse en toda la aplicación.', 'success')
      },
      error: (message: string) => {
        this.saving = false
        Swal.fire('Error', message, 'error')
      }
    })
  }

  private revokePendingPreview(): void {
    if (this.pendingPreviewUrl) {
      URL.revokeObjectURL(this.pendingPreviewUrl)
      this.pendingPreviewUrl = null
    }
  }
}
