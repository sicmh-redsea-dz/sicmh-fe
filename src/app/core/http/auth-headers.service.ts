import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthHeadersService {
  private authService = inject(AuthService);

  public buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      this.authService.logout();
      return new HttpHeaders();
    }

    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}
