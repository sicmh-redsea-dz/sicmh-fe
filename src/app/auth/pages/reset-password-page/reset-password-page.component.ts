import { Component, inject } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthService } from '../../services/auth.service'
import { formatApiError } from '../../../shared/utils/api-error'

@Component({
  selector: 'app-reset-password-page',
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.css'
})
export class ResetPasswordPageComponent {
  private fb = inject(FormBuilder)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private authService = inject(AuthService)
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? ''
  readonly codigoEmpresa = this.route.snapshot.queryParamMap.get('codigoEmpresa') ?? ''

  loading = false
  completed = false
  error = this.token && this.codigoEmpresa ? '' : 'El enlace de restablecimiento está incompleto.'
  form: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmPassword: ['', [Validators.required]]
  })

  submit(): void {
    if (this.form.invalid || this.loading || !this.token || !this.codigoEmpresa) {
      this.form.markAllAsTouched()
      return
    }
    const { password, confirmPassword } = this.form.value
    if (password !== confirmPassword) {
      this.error = 'Las contraseñas no coinciden.'
      return
    }
    this.loading = true
    this.error = ''
    this.authService.resetPassword(this.token, password, this.codigoEmpresa).subscribe({
      next: () => { this.completed = true; this.loading = false },
      error: (err) => { this.error = formatApiError(err); this.loading = false }
    })
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login'])
  }
}
