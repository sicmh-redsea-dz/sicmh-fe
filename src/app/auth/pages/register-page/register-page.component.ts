import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { GoogleAuthProvider } from '@angular/fire/auth';

@Component({
  selector: 'app-register-page',
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.css'
})
export class RegisterPageComponent {
  private fb = inject( FormBuilder );
  private router = inject( Router )
  private authService = inject( AuthService );

  public myForm: FormGroup = this.fb.group({
    name    : ['' ,[Validators.required, Validators.minLength(2)]],
    email   : ['' ,[Validators.required, Validators.email]],
    password: ['' ,[Validators.required, Validators.minLength(6)]],
  })

  private register( uid: string, idToken: string ) {
    const { name, email, password } = this.myForm.value;
    this.authService.register(name, email, password, uid, idToken)
      .subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  private registerWithGoogle(displayName:string, email:string, uid:string, idToken:string, accessToken:string) {
    this.authService.registerWithGoogle(displayName, email, uid, idToken, accessToken)
      .subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  async submit() {
    const { email, password } = this.myForm.value
    try {
      const authenticatedUser = await this.authService.signUp(email, password)
      const idToken = await authenticatedUser.user.getIdToken()
      console.log('usuario creado correctamente con G')
      this.register( authenticatedUser.user.uid, idToken )
    } catch ( err ) {
      console.log('error al crear el usuario con G: ', err)
    }
  }

  async submitWithGoogle(e: Event) {
    e.preventDefault()
    try {
      const authenticatedUser = await this.authService.signInWithGoogle()
      const { displayName, uid, email } = authenticatedUser.user
      const idToken = await authenticatedUser.user.getIdToken()
      const accessToken = GoogleAuthProvider.credentialFromResult(authenticatedUser)?.accessToken
      console.log('usuario creado correctamente con G pop-up: ', accessToken)
      this.registerWithGoogle( displayName!, email!, uid, idToken, accessToken! )
    } catch ( err ) {
      console.log('error al crear el usuario con G pop-up: ', err)
    }
  }
}
