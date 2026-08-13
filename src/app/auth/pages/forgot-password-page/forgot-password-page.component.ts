import { Component, inject } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { AuthService } from '../../services/auth.service'
import { formatApiError } from '../../../shared/utils/api-error'

@Component({
  selector: 'app-forgot-password-page',
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.css'
})
export class ForgotPasswordPageComponent {
  private fb = inject(FormBuilder)
  private authService = inject(AuthService)
  loading = false
  message = ''
  error = ''
  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    codigoEmpresa: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(10), Validators.pattern(/^[a-zA-Z0-9]+$/)]]
  })

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched()
      return
    }
    this.loading = true
    this.error = ''
    const { email, codigoEmpresa } = this.form.value
    this.authService.requestPasswordReset(email, codigoEmpresa).subscribe({
      next: (message) => { this.message = message; this.loading = false },
      error: (err) => { this.error = formatApiError(err); this.loading = false }
    })
  }
}
