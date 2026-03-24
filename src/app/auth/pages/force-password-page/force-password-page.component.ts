import { Component, inject } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import { Auth, updatePassword } from '@angular/fire/auth'
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
  private auth = inject(Auth)
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

    const user = this.auth.currentUser
    if (!user) {
      Swal.fire('Error', 'Sesión inválida. Vuelve a iniciar sesión.', 'error')
      this.router.navigateByUrl('/auth/login')
      return
    }

    this.saving = true
    try {
      await updatePassword(user, password)
      await firstValueFrom(this.authService.completePasswordChange())
      await user.getIdToken(true)
      Swal.fire('Listo', 'Contraseña actualizada con éxito.', 'success')
      this.router.navigateByUrl('/dashboard')
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo actualizar la contraseña.', 'error')
    } finally {
      this.saving = false
    }
  }
}
