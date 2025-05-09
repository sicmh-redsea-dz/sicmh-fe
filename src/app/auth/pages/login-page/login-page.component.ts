import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent {
  private fb = inject( FormBuilder );
  private authService = inject(AuthService)
  private router = inject( Router )

  public loginForm: FormGroup = this.fb.group({
    email   : ['hamato.raph@gmail.com', [Validators.required, Validators.email]],
    password: ['k@w@bung@', [ Validators.required, Validators.minLength(6)]]
  })

  private login(idToken:string) {
    const { email, password } = this.loginForm.value;
    this.authService.login( email, password, idToken )
      .subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: ( message ) => {
          Swal.fire( 'Error', message, 'error')
        }
      })
  }

  async submit() {
    const { email, password } = this.loginForm.value
    
    try {
      const authenticatedUser = await this.authService.signIn(email, password)
      const idToken = await authenticatedUser.user.getIdToken()
      console.log('usuario ingreso correctamente con G')
      this.login(idToken)
    } catch ( err ) {
      console.log('error al ingresar el usuario con G: ', err)
    }
  }

}
