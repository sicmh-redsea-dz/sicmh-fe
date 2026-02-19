import { CanActivateFn, Router } from '@angular/router'
import { inject } from '@angular/core'
import { AuthService } from '../services/auth.service'
import { AuthStatus } from '../interfaces'
import { catchError, map, of } from 'rxjs'
import { Permission } from '../permissions/permissions'

export const permissionsGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  const required = route.data?.['permissions'] as Permission[] | Permission | undefined
  if (!required || (Array.isArray(required) && required.length === 0)) return true

  const evaluatePermissions = () => {
    return authService.hasPermission(required)
      ? true
      : router.parseUrl('/dashboard/main')
  }

  const status = authService.authStatus()

  if (status === AuthStatus.checking) {
    return authService.checkAuthStatus().pipe(
      map((isAuthenticated) => {
        if (!isAuthenticated) return router.parseUrl('/auth/login')
        return evaluatePermissions()
      }),
      catchError(() => of(router.parseUrl('/auth/login')))
    )
  }

  if (status !== AuthStatus.authenticated) return router.parseUrl('/auth/login')

  return evaluatePermissions()
}
