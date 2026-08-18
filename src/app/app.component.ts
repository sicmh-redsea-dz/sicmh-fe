import { Component, computed, effect, inject } from '@angular/core';
import { AuthService } from './auth/services/auth.service';
import { Router } from '@angular/router';
import { AuthStatus } from './auth/interfaces';
import { ThemeService } from './shared/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  private authService = inject( AuthService );
  private router = inject( Router );
  private themeService = inject( ThemeService );

  public finishedAuthCheck = computed<boolean>(() => {
    if( this.authService.authStatus() === AuthStatus.checking ) return false
    return true;
  })

  public authStatusChangedEffect = effect(() => {
    const currentUrl = this.router.url;
    const mustChangePassword = this.authService.mustChangePassword();
    const currentUser = this.authService.currentUser();

    if (currentUser?.profile?.theme) {
      this.themeService.syncWithPreference(currentUser.profile.theme);
    }

    switch(this.authService.authStatus()){
      case AuthStatus.checking:
        return;
      case AuthStatus.authenticated:
        if (mustChangePassword && !currentUrl.startsWith('/auth/force-password')) {
          this.router.navigateByUrl('/auth/force-password');
          break;
        }
        if (currentUrl.startsWith('/auth') && !currentUrl.startsWith('/auth/reset-password')) {
          this.router.navigateByUrl('/dashboard');
        }
        break;
      case AuthStatus.notAuthenticated:
        // Route guards own unauthenticated redirects. Redirecting here races
        // the router during direct/deep-link startup, when router.url may
        // still be '/', and can incorrectly replace /auth/reset-password.
        break;
    }
    
  }, { allowSignalWrites: true });
}
