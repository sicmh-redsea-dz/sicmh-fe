import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, catchError, map, throwError } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { AuthHeadersService } from '../../../core/http/auth-headers.service'
import { formatApiError } from '../../../shared/utils/api-error'
import { InviteResult, RoleOption, SettingsUser, UserProfile, RolePermissionsMap, UserPermissionsMap } from '../../interface/settings.interface'

interface ApiResponse<T> {
  data: T
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly baseUrl = environment.baseUrl
  private http = inject(HttpClient)
  private authHeaders = inject(AuthHeadersService)

  public getProfile(): Observable<{ user: SettingsUser }> {
    const url = `${this.baseUrl}/app/settings/profile`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.get<ApiResponse<{ user: SettingsUser }>>(url, { headers })
      .pipe(
        map((resp) => resp.data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateProfile(payload: Partial<SettingsUser> & { profile?: UserProfile }): Observable<SettingsUser> {
    const url = `${this.baseUrl}/app/settings/profile`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.patch<ApiResponse<{ user: SettingsUser }>>(url, payload, { headers })
      .pipe(
        map((resp) => resp.data.user),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public getRoles(): Observable<RoleOption[]> {
    const url = `${this.baseUrl}/app/settings/roles`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.get<ApiResponse<{ roles: RoleOption[] }>>(url, { headers })
      .pipe(
        map((resp) => resp.data.roles),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public getUsers(): Observable<SettingsUser[]> {
    const url = `${this.baseUrl}/app/settings/users`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.get<ApiResponse<{ users: SettingsUser[] }>>(url, { headers })
      .pipe(
        map((resp) => resp.data.users),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateUserRole(userId: number, roleId: number): Observable<boolean> {
    const url = `${this.baseUrl}/app/settings/users/${userId}/role`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.patch<ApiResponse<{ updated: boolean }>>(url, { roleId }, { headers })
      .pipe(
        map((resp) => resp.data.updated),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public createUser(payload: {
    name: string
    email: string
    roleId: number
    profile?: UserProfile
  }): Observable<InviteResult> {
    const url = `${this.baseUrl}/app/settings/users`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.post<ApiResponse<InviteResult>>(url, payload, { headers })
      .pipe(
        map((resp) => resp.data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public getRolePermissions(): Observable<{ roles: RoleOption[]; permissions: string[]; overrides: RolePermissionsMap }> {
    const url = `${this.baseUrl}/app/settings/permissions/roles`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.get<ApiResponse<{ roles: RoleOption[]; permissions: string[]; overrides: RolePermissionsMap }>>(url, { headers })
      .pipe(
        map((resp) => resp.data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateRolePermissions(roleKey: string, grants: string[], revokes: string[]): Observable<boolean> {
    const url = `${this.baseUrl}/app/settings/permissions/roles/${roleKey}`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.patch<ApiResponse<{ roleKey: string }>>(url, { grants, revokes }, { headers })
      .pipe(
        map(() => true),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public getUserPermissions(): Observable<{ users: SettingsUser[]; permissions: string[]; overrides: UserPermissionsMap }> {
    const url = `${this.baseUrl}/app/settings/permissions/users`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.get<ApiResponse<{ users: SettingsUser[]; permissions: string[]; overrides: UserPermissionsMap }>>(url, { headers })
      .pipe(
        map((resp) => resp.data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateUserPermissions(userId: number, grants: string[], revokes: string[]): Observable<boolean> {
    const url = `${this.baseUrl}/app/settings/permissions/users/${userId}`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.patch<ApiResponse<{ userId: number }>>(url, { grants, revokes }, { headers })
      .pipe(
        map(() => true),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public deleteUser(userId: number): Observable<boolean> {
    const url = `${this.baseUrl}/app/settings/users/${userId}`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.delete<ApiResponse<{ deleted: boolean }>>(url, { headers })
      .pipe(
        map((resp) => resp.data.deleted),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public changeUserPassword(userId: number, newPassword: string): Observable<boolean> {
    const url = `${this.baseUrl}/app/settings/users/${userId}/password`
    const headers = this.authHeaders.buildAuthHeaders()
    return this.http.patch<ApiResponse<{ updated: boolean }>>(url, { newPassword }, { headers })
      .pipe(
        map((resp) => resp.data.updated),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }
}
