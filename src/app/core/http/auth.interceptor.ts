import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { EMPTY, catchError, switchMap, throwError } from 'rxjs'
import { AuthService } from '../../auth/services/auth.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router      = inject(Router)
  const authService = inject(AuthService)

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint = req.url.includes('/auth/')

      if (error.status === 401 && !isAuthEndpoint) {
        authService.logout()
        router.navigate(['/auth/login'])
        return EMPTY
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
