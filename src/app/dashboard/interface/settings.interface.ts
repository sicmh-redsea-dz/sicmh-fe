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
  id: number
  name: string
  email: string
  roleId?: number
  roleName?: string
  isActive?: boolean
  profile?: UserProfile
}

export interface RoleOption {
  id: number
  name: string
  key?: string
}

export interface InviteResult {
  userId: number
  emailSent: boolean
  tempPassword?: string
}

export interface PermissionOverride {
  grants: string[]
  revokes: string[]
}

export type RolePermissionsMap = Record<string, PermissionOverride>

export interface UserPermissionsMap {
  [userId: number]: PermissionOverride
}
