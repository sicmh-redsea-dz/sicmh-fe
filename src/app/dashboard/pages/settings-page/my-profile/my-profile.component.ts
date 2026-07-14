import { Component, OnInit, inject } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import Swal from 'sweetalert2'
import { AuthService } from '../../../../auth/services/auth.service'
import { ThemeService } from '../../../../shared/services/theme.service'
import { SettingsService } from '../../../services/settings-service/settings.service'
import { SettingsUser, UserProfile } from '../../../interface/settings.interface'

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

  public profileForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    identification: [''],
    department: [''],
    position: [''],
    theme: ['light']
  })

  public saving = false
  public rolesLabel = ''

  ngOnInit(): void {
    const current = this.authService.currentUser()
    if (current) {
      this.rolesLabel = current.roles?.[0] ?? ''
    }
    this.loadProfile()
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched()
      return
    }

    const payload = {
      name: this.profileForm.get('name')?.value || '',
      email: this.profileForm.get('email')?.value || '',
      profile: {
        phone: this.profileForm.get('phone')?.value || '',
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
