import { Component, inject } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { AuthService } from '../../services/auth.service'
import { Router } from '@angular/router'
import Swal from 'sweetalert2'
import { formatApiError } from '../../../shared/utils/api-error'

@Component({
  selector: 'app-register-page',
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.css'
})
export class RegisterPageComponent {
  private fb = inject(FormBuilder)
  private router = inject(Router)
  private authService = inject(AuthService)

  public myForm: FormGroup = this.fb.group({
    codigoEmpresa: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(10), Validators.pattern(/^[a-zA-Z0-9]+$/)]],
    name         : ['', [Validators.required, Validators.minLength(2)]],
    email        : ['', [Validators.required, Validators.email]],
    password     : ['', [Validators.required, Validators.minLength(6)]],
  })

  submit() {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched()
      return
    }
    const { name, email, password, codigoEmpresa } = this.myForm.value

    this.authService.register(name, email, password, codigoEmpresa)
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
    return message || 'No se pudo crear el usuario'
  }
}
