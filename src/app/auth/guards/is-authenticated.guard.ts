import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { AuthStatus } from '../interfaces';
import { catchError, map, of } from 'rxjs';

export const isAuthenticatedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject( Router );
  const status = authService.authStatus();

  if (status === AuthStatus.authenticated) return true;
  if (status === AuthStatus.checking) {
    return authService.checkAuthStatus().pipe(
      map((isAuthenticated) =>
        isAuthenticated ? true : router.parseUrl('/auth/login')
      ),
      catchError(() => of(router.parseUrl('/auth/login')))
    );
  }

  return router.parseUrl('/auth/login');
};
