import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css'
})
export class SettingsPageComponent {
  private authService = inject(AuthService)
  public canManagePermissions = computed(() =>
    this.authService.hasPermission('settings.permissions.manage')
  )

}
