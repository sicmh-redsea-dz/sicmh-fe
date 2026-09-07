import { Component, inject } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import Swal from 'sweetalert2'
import { AuthService } from '../../services/auth.service'
import { firstValueFrom } from 'rxjs'

@Component({
  selector: 'app-force-password-page',
  templateUrl: './force-password-page.component.html',
  styleUrl: './force-password-page.component.css'
})
export class ForcePasswordPageComponent {
  private fb = inject(FormBuilder)
  private router = inject(Router)
  private authService = inject(AuthService)

  public saving = false
  public passwordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
  })

  public async onSubmit() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched()
      return
    }

    const password = this.passwordForm.get('password')?.value || ''
    const confirm = this.passwordForm.get('confirmPassword')?.value || ''
    if (password !== confirm) {
      Swal.fire('Error', 'Las contraseñas no coinciden.', 'error')
      return
    }

    const currentUser = this.authService.currentUser()
    if (!currentUser) {
      Swal.fire('Error', 'Sesión inválida. Vuelve a iniciar sesión.', 'error')
      this.router.navigateByUrl('/auth/login')
      return
    }

    this.saving = true
    try {
      const updated = await firstValueFrom(this.authService.completePasswordChange(password))
      if (!updated) throw new Error('No se pudo actualizar la contraseña.')
      Swal.fire('Listo', 'Contraseña actualizada con éxito.', 'success')
      this.router.navigateByUrl('/dashboard')
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo actualizar la contraseña.', 'error')
    } finally {
      this.saving = false
    }
  }
}
