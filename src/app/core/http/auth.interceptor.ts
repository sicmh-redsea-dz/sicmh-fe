import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, switchMap, throwError } from 'rxjs'
import { AuthService } from '../../auth/services/auth.service'
import { environment } from '../../../environments/environment'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router      = inject(Router)
  const authService = inject(AuthService)

  const token = localStorage.getItem('token')
  if (token && req.url.startsWith(environment.baseUrl)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint = req.url.includes('/auth/')

      if (error.status === 401 && !isAuthEndpoint) {
        authService.logout()
        void router.navigateByUrl('/auth/login', { replaceUrl: true })
        return throwError(() => error)
      }

      if (error.status === 403 && !isAuthEndpoint) {
        return authService.checkAuthStatus().pipe(
          switchMap(() => throwError(() => error))
        )
      }

      return throwError(() => error)
    })
  )
}
