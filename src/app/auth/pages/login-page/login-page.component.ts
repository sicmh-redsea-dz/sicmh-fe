import Swal from 'sweetalert2'
import { Router } from '@angular/router'
import { Component, inject } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { AuthService } from '../../services/auth.service'
import { formatApiError } from '../../../shared/utils/api-error'

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent {
  private fb = inject(FormBuilder)
  private authService = inject(AuthService)
  private router = inject(Router)

  public loginForm: FormGroup = this.fb.group({
    email   : ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  })

  submit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched()
      return
    }
    const { email, password } = this.loginForm.value

    this.authService.login(email, password)
      .subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: (err) => Swal.fire('Error', this.getErrorMessage(err), 'error')
      })
  }

  private getErrorMessage(err: any): string {
    const message = formatApiError(err)
    if (Array.isArray(message)) {
      return message.map((item) => item.msg).join(', ')
    }
    return message || 'No se pudo iniciar sesión'
  }
}
