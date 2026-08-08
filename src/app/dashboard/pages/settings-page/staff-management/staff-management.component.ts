import { Component, OnInit, inject } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import Swal from 'sweetalert2'
import { SettingsService } from '../../../services/settings-service/settings.service'
import { RoleOption, SettingsUser } from '../../../interface/settings.interface'
import { trackById } from '../../../../shared/utils/track-by'
import { AuthService } from '../../../../auth/services/auth.service'

@Component({
  selector: 'app-staff-management',
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css'
})
export class StaffManagementComponent implements OnInit {
  public trackById = trackById
  private fb = inject(FormBuilder)
  private settingsService = inject(SettingsService)
  private authService = inject(AuthService)
  public canUpdateStaff = this.authService.hasPermission('settings.staff.update')

  public roles: RoleOption[] = []
  public users: SettingsUser[] = []
  public submitting = false

  public staffForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    roleId: ['', [Validators.required]],
    phone: [''],
    identification: [''],
    department: [''],
    position: ['']
  })

  ngOnInit(): void {
    this.loadRoles()
    this.loadUsers()
  }

  public submit() {
    if (!this.canUpdateStaff) return
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched()
      return
    }

    const payload = {
      name: this.staffForm.get('name')?.value || '',
      email: this.staffForm.get('email')?.value || '',
      roleId: Number(this.staffForm.get('roleId')?.value),
      profile: {
        phone: this.staffForm.get('phone')?.value || '',
        identification: this.staffForm.get('identification')?.value || '',
        department: this.staffForm.get('department')?.value || '',
        position: this.staffForm.get('position')?.value || ''
      }
    }

    this.submitting = true
    this.settingsService.createUser(payload)
      .subscribe({
        next: (result) => {
          const extra = result.tempPassword
            ? `Contraseña temporal: ${result.tempPassword}`
            : 'Correo enviado con contraseña temporal.'
          Swal.fire('Usuario creado', extra, 'success')
          this.staffForm.reset()
          this.loadUsers()
        },
        error: (err) => Swal.fire('Error', err, 'error'),
        complete: () => {
          this.submitting = false
        }
      })
  }

  private loadRoles() {
    this.settingsService.getRoles()
      .subscribe({
        next: (roles) => {
          this.roles = roles
        }
      })
  }

  public deleteUser(user: SettingsUser) {
    if (!this.canUpdateStaff) return
    Swal.fire({
      title: '¿Eliminar usuario?',
      html: `Se eliminará <strong>${user.name}</strong> del sistema. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    }).then((result) => {
      if (!result.isConfirmed) return
      this.settingsService.deleteUser(user.id)
        .subscribe({
          next: () => {
            Swal.fire('Eliminado', `${user.name} fue eliminado.`, 'success')
            this.loadUsers()
          },
          error: (err) => Swal.fire('Error', err, 'error')
        })
    })
  }

  public changePassword(user: SettingsUser) {
    if (!this.canUpdateStaff) return
    Swal.fire({
      title: 'Cambiar contraseña',
      html: `
        <p>Nueva contraseña para <strong>${user.name}</strong></p>
        <input id="swal-new-password" type="password" class="swal2-input"
          placeholder="Nueva contraseña (mín. 6 caracteres)" autocomplete="new-password">
        <input id="swal-confirm-password" type="password" class="swal2-input"
          placeholder="Confirmar contraseña" autocomplete="new-password">
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const popup = Swal.getPopup()!
        const password = (popup.querySelector('#swal-new-password') as HTMLInputElement).value
        const confirmation = (popup.querySelector('#swal-confirm-password') as HTMLInputElement).value
        if (!password || password.length < 6) {
          Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres.')
          return
        }
        if (password !== confirmation) {
          Swal.showValidationMessage('Las contraseñas no coinciden.')
          return
        }
        return password
      }
    }).then((result) => {
      if (!result.isConfirmed || !result.value) return
      this.settingsService.changeUserPassword(user.id, result.value)
        .subscribe({
          next: () => Swal.fire('Actualizada', 'La contraseña fue cambiada exitosamente.', 'success'),
          error: (err) => Swal.fire('Error', err, 'error')
        })
    })
  }

  private loadUsers() {
    this.settingsService.getUsers()
      .subscribe({
        next: (users) => {
          this.users = users
        }
      })
  }
}
