export type ThemePreference = 'light' | 'dark'

export interface UserProfile {
  phone?: string
  address?: string
  identification?: string
  department?: string
  position?: string
  theme?: ThemePreference
  avatarDataUrl?: string
}

export interface SettingsUser {
  id: string
  name: string
  email: string
  roleId?: string
  roleName?: string
  isActive?: boolean
  profile?: UserProfile
}

export interface RoleOption {
  id: string
  name: string
  key?: string
}

export interface InviteResult {
  userId: string
  emailSent: boolean
  tempPassword?: string
}

export interface PermissionOverride {
  grants: string[]
  revokes: string[]
}

export type RolePermissionsMap = Record<string, PermissionOverride>

export interface UserPermissionsMap {
  [userId: string]: PermissionOverride
}
