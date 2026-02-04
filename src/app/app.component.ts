import { Component, computed, effect, inject } from '@angular/core';
import { AuthService } from './auth/services/auth.service';
import { Router } from '@angular/router';
import { AuthStatus } from './auth/interfaces';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  private authService = inject( AuthService );
  private router = inject( Router );

  public finishedAuthCheck = computed<boolean>(() => {
    if( this.authService.authStatus() === AuthStatus.checking ) return false
    return true;
  })

  public authStatusChangedEffect = effect(() => {
    const currentUrl = this.router.url;
    switch(this.authService.authStatus()){
      case AuthStatus.checking:
        return;
      case AuthStatus.authenticated:
          if (currentUrl.startsWith('/auth')) {
            this.router.navigateByUrl('/dashboard');
          }
          break;
      case AuthStatus.notAuthenticated:
        if (!currentUrl.startsWith('/auth')) {
          this.router.navigateByUrl('/auth/login');
        }
        break;
    }
    
  });
}
