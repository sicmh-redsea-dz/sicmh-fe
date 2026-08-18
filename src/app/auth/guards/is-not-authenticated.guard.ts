import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { AuthStatus } from '../interfaces';
import { catchError, map, of } from 'rxjs';

export const isNotAuthenticatedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router      = inject(Router);
  const status      = authService.authStatus();

  // A password-reset link must remain reachable even when another tab or
  // device left a valid session in localStorage.
  if (state.url.startsWith('/auth/reset-password')) return true;

  if (status === AuthStatus.authenticated) return router.parseUrl('/dashboard');

  if (status === AuthStatus.checking) {
    return authService.checkAuthStatus().pipe(
      map((isAuthenticated) =>
        isAuthenticated ? router.parseUrl('/dashboard') : true
      ),
      catchError(() => of(true))
    );
  }

  return true;
};
