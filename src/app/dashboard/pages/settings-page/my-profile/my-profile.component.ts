import { Component, OnInit, inject } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import Swal from 'sweetalert2'
import { AuthService } from '../../../../auth/services/auth.service'
import { ThemeService } from '../../../../shared/services/theme.service'
import { SettingsService } from '../../../services/settings-service/settings.service'
import { SettingsUser, UserProfile } from '../../../interface/settings.interface'
import { AttachmentsService } from '../../../services/attachments-service/attachments.service'

const ALLOWED_PRESCRIPTION_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PRESCRIPTION_IMAGE_BYTES = 5 * 1024 * 1024

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.css'
})
export class MyProfileComponent implements OnInit {
  
  private fb = inject(FormBuilder)
  private authService = inject(AuthService)
  private settingsService = inject(SettingsService)
  private themeService = inject(ThemeService)
  private attachmentsService = inject(AttachmentsService)
  public canUpdateProfile = this.authService.hasPermission('settings.profile.update')

  public profileForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address: [''],
    identification: [''],
    department: [''],
    position: [''],
    theme: ['light']
  })

  public saving = false
  public rolesLabel = ''
  public tenantCode = localStorage.getItem('codigoEmpresa') ?? ''
  public userId = ''
  public signatureUrl: string | null = null
  public stampUrl: string | null = null
  public signatureFailed = false
  public stampFailed = false
  public uploadingAsset: 'signature' | 'stamp' | null = null

  ngOnInit(): void {
    if (!this.canUpdateProfile) this.profileForm.disable()
    const current = this.authService.currentUser()
    if (current) {
      this.rolesLabel = current.roles?.[0] ?? ''
      this.userId = current._id
      this.refreshAssetUrls()
    }
    this.loadProfile()
  }

  saveProfile(): void {
    if (!this.canUpdateProfile) return
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched()
      return
    }

    const payload = {
      name: this.profileForm.get('name')?.value || '',
      email: this.profileForm.get('email')?.value || '',
      profile: {
        phone: this.profileForm.get('phone')?.value || '',
        address: this.profileForm.get('address')?.value || '',
        identification: this.profileForm.get('identification')?.value || '',
        department: this.profileForm.get('department')?.value || '',
        position: this.profileForm.get('position')?.value || '',
        theme: this.profileForm.get('theme')?.value || 'light'
      } as UserProfile
    }

    this.saving = true
    this.settingsService.updateProfile(payload)
      .subscribe({
        next: (user) => {
          this.authService.updateCurrentUser({
            name: user.name,
            email: user.email,
            profile: user.profile
          })
          if (user.profile?.theme) {
            this.themeService.syncWithPreference(user.profile.theme)
          }
          Swal.fire('Éxito', 'Cambios guardados con éxito', 'success')
        },
        error: (err) => Swal.fire('Error', err, 'error'),
        complete: () => {
          this.saving = false
        }
      })
  }

  toggleTheme(): void {
    if (!this.canUpdateProfile) return
    const next = this.themeService.toggleTheme()
    this.profileForm.patchValue({ theme: next })
    this.settingsService.updateProfile({ profile: { theme: next } })
      .subscribe({
        next: (user) => {
          this.authService.updateCurrentUser({ profile: user.profile })
        },
        error: (err) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }

  async onPrescriptionAssetSelected(event: Event, type: 'signature' | 'stamp'): Promise<void> {
    if (!this.canUpdateProfile) return
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!ALLOWED_PRESCRIPTION_IMAGE_TYPES.includes(file.type)) {
      Swal.fire('Error', 'La imagen debe ser JPEG, PNG o WebP.', 'error')
      return
    }
    if (file.size > MAX_PRESCRIPTION_IMAGE_BYTES) {
      Swal.fire('Error', 'La imagen excede el tamaño máximo permitido (5MB).', 'error')
      return
    }

    const hasCurrentAsset = type === 'signature'
      ? !!this.signatureUrl && !this.signatureFailed
      : !!this.stampUrl && !this.stampFailed
    if (hasCurrentAsset) {
      const label = type === 'signature' ? 'firma digital' : 'sello profesional'
      const confirmation = await Swal.fire({
        title: `¿Reemplazar ${label}?`,
        text: 'La imagen guardada actualmente será sustituida por la nueva.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, reemplazar',
        cancelButtonText: 'Cancelar'
      })
      if (!confirmation.isConfirmed) return
    }

    this.uploadingAsset = type
    this.attachmentsService.uploadPrescriptionAsset(type, file).subscribe({
      next: (url) => {
        if (type === 'signature') {
          this.signatureUrl = `${url}?t=${Date.now()}`
          this.signatureFailed = false
        } else {
          this.stampUrl = `${url}?t=${Date.now()}`
          this.stampFailed = false
        }
        Swal.fire(
          'Éxito',
          `${type === 'signature' ? 'Firma' : 'Sello'} ${hasCurrentAsset ? 'reemplazado' : 'guardado'} correctamente.`,
          'success'
        )
      },
      error: (message: string) => Swal.fire('Error', message, 'error'),
      complete: () => this.uploadingAsset = null
    })
  }

  private refreshAssetUrls(): void {
    if (!this.tenantCode || !this.userId) return
    const suffix = `?t=${Date.now()}`
    this.signatureUrl = `${this.attachmentsService.prescriptionAssetUrl(this.tenantCode, this.userId, 'signature')}${suffix}`
    this.stampUrl = `${this.attachmentsService.prescriptionAssetUrl(this.tenantCode, this.userId, 'stamp')}${suffix}`
  }
  
  private loadProfile() {
    this.settingsService.getProfile()
      .subscribe({
        next: (resp) => {
          const user = resp.user as SettingsUser
          this.rolesLabel = user.roleName || this.rolesLabel
          this.profileForm.patchValue({
            name: user.name,
            email: user.email,
            phone: user.profile?.phone || '',
            address: user.profile?.address || '',
            identification: user.profile?.identification || '',
            department: user.profile?.department || '',
            position: user.profile?.position || '',
            theme: user.profile?.theme || 'light'
          })
          if (user.profile?.theme) {
            this.themeService.syncWithPreference(user.profile.theme)
          }
        }
      })
  }
}
