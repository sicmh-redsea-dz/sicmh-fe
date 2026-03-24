import { Component, OnInit, inject } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import Swal from 'sweetalert2'
import { SettingsService } from '../../../services/settings-service/settings.service'
import { RoleOption, SettingsUser } from '../../../interface/settings.interface'

@Component({
  selector: 'app-staff-management',
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css'
})
export class StaffManagementComponent implements OnInit {
  private fb = inject(FormBuilder)
  private settingsService = inject(SettingsService)

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

  private loadUsers() {
    this.settingsService.getUsers()
      .subscribe({
        next: (users) => {
          this.users = users
        }
      })
  }
}
