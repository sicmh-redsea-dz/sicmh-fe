import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs'
import { environment } from '../../../../environments/environment'
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
  public getProfile(): Observable<{ user: SettingsUser }> {
    const url = `${this.baseUrl}/app/settings/profile`
    return this.http.get<ApiResponse<{ user: SettingsUser }>>(url, {})
      .pipe(
        map((resp) => resp.data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateProfile(payload: Partial<SettingsUser> & { profile?: UserProfile }): Observable<SettingsUser> {
    const url = `${this.baseUrl}/app/settings/profile`
    return this.http.patch<ApiResponse<{ user: SettingsUser }>>(url, payload, {})
      .pipe(
        map((resp) => resp.data.user),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public getCompany(): Observable<{ name: string }> {
    return this.http.get<ApiResponse<{ name: string }>>(`${this.baseUrl}/app/settings/company`, {})
      .pipe(map(({ data }) => data), catchError((err) => throwError(() => formatApiError(err))))
  }

  public updateCompany(name: string): Observable<{ name: string }> {
    return this.http.patch<ApiResponse<{ name: string }>>(`${this.baseUrl}/app/settings/company`, { name }, {})
      .pipe(map(({ data }) => data), catchError((err) => throwError(() => formatApiError(err))))
  }

  // Roles are a static catalog (no create/edit-role UI exists), so this is
  // cached for the app session instead of refetched on every navigation.
  private rolesCache$?: Observable<RoleOption[]>

  public getRoles(): Observable<RoleOption[]> {
    if (!this.rolesCache$) {
      const url = `${this.baseUrl}/app/settings/roles`
      this.rolesCache$ = this.http.get<ApiResponse<{ roles: RoleOption[] }>>(url, {})
        .pipe(
          map((resp) => resp.data.roles),
          catchError((err) => {
            this.rolesCache$ = undefined
            return throwError(() => formatApiError(err))
          }),
          shareReplay(1)
        )
    }
    return this.rolesCache$
  }

  public getUsers(): Observable<SettingsUser[]> {
    const url = `${this.baseUrl}/app/settings/users`
    return this.http.get<ApiResponse<{ users: SettingsUser[] }>>(url, {})
      .pipe(
        map((resp) => resp.data.users),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateUserRole(userId: string, roleId: string): Observable<boolean> {
    const url = `${this.baseUrl}/app/settings/users/${userId}/role`
    return this.http.patch<ApiResponse<{ updated: boolean }>>(url, { roleId }, {})
      .pipe(
        map((resp) => resp.data.updated),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public createUser(payload: {
    name: string
    email: string
    roleId: string
    profile?: UserProfile
  }): Observable<InviteResult> {
    const url = `${this.baseUrl}/app/settings/users`
    return this.http.post<ApiResponse<InviteResult>>(url, payload, {})
      .pipe(
        map((resp) => resp.data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public getRolePermissions(): Observable<{ roles: RoleOption[]; permissions: string[]; overrides: RolePermissionsMap }> {
    const url = `${this.baseUrl}/app/settings/permissions/roles`
    return this.http.get<ApiResponse<{ roles: RoleOption[]; permissions: string[]; overrides: RolePermissionsMap }>>(url, {})
      .pipe(
        map((resp) => resp.data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateRolePermissions(roleKey: string, grants: string[], revokes: string[]): Observable<boolean> {
    const url = `${this.baseUrl}/app/settings/permissions/roles/${roleKey}`
    return this.http.patch<ApiResponse<{ roleKey: string }>>(url, { grants, revokes }, {})
      .pipe(
        map(() => true),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public getUserPermissions(): Observable<{ users: SettingsUser[]; permissions: string[]; overrides: UserPermissionsMap }> {
    const url = `${this.baseUrl}/app/settings/permissions/users`
    return this.http.get<ApiResponse<{ users: SettingsUser[]; permissions: string[]; overrides: UserPermissionsMap }>>(url, {})
      .pipe(
        map((resp) => resp.data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public updateUserPermissions(userId: string, grants: string[], revokes: string[]): Observable<boolean> {
    const url = `${this.baseUrl}/app/settings/permissions/users/${userId}`
    return this.http.patch<ApiResponse<{ userId: string }>>(url, { grants, revokes }, {})
      .pipe(
        map(() => true),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public deleteUser(userId: string): Observable<boolean> {
    const url = `${this.baseUrl}/app/settings/users/${userId}`
    return this.http.delete<ApiResponse<{ deleted: boolean }>>(url, {})
      .pipe(
        map((resp) => resp.data.deleted),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public changeUserPassword(userId: string, newPassword: string): Observable<boolean> {
    const url = `${this.baseUrl}/app/settings/users/${userId}/password`
    return this.http.patch<ApiResponse<{ updated: boolean }>>(url, { newPassword }, {})
      .pipe(
        map((resp) => resp.data.updated),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }
}
