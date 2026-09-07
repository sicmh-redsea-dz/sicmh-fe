import { Component, OnInit, inject } from '@angular/core'
import Swal from 'sweetalert2'
import { SettingsService } from '../../../services/settings-service/settings.service'
import { RoleOption, RolePermissionsMap, SettingsUser, UserPermissionsMap, PermissionOverride } from '../../../interface/settings.interface'
import { trackById, trackByKey } from '../../../../shared/utils/track-by'
import { AuthService } from '../../../../auth/services/auth.service'

type PermissionState = 'inherit' | 'grant' | 'revoke'

type PermissionGroup = {
  label: string
  items: Array<{ key: string; label: string; description: string }>
}

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.css'
})
export class PermissionsComponent implements OnInit {
  public trackById = trackById
  public trackByKey = trackByKey
  public trackByLabel = (_: number, group: PermissionGroup) => group.label
  private settingsService = inject(SettingsService)
  private authService = inject(AuthService)
  public canUpdatePermissions = this.authService.hasPermission('settings.permissions.update')

  public activeTab: 'roles' | 'users' = 'roles'
  public roleSearch = ''
  public userSearch = ''

  public roles: RoleOption[] = []
  public users: SettingsUser[] = []
  public roleOverrides: RolePermissionsMap = {}
  public userOverrides: UserPermissionsMap = {}
  public permissions: string[] = []

  public selectedRoleKey = ''
  public selectedUserId: string | null = null
  public saving = false

  public permissionGroups: PermissionGroup[] = [
    {
      label: 'Panel',
      items: [
        { key: 'dashboard.view', label: 'Ver panel', description: 'Acceso al dashboard principal.' }
      ]
    },
    {
      label: 'Pacientes',
      items: [
        { key: 'patients.read', label: 'Ver pacientes', description: 'Acceso al listado de pacientes.' },
        { key: 'patients.create', label: 'Crear pacientes', description: 'Permite crear pacientes.' },
        { key: 'patients.update', label: 'Editar pacientes', description: 'Modificar datos clínicos.' },
        { key: 'patients.delete', label: 'Eliminar pacientes', description: 'Desactivar o eliminar registros.' }
      ]
    },
    {
      label: 'Consulta externa',
      items: [
        { key: 'visits.outpatient.read', label: 'Ver consulta externa', description: 'Consultar atenciones y reportes de consulta externa.' },
        { key: 'visits.outpatient.update', label: 'Editar consulta externa', description: 'Registrar y actualizar consultas externas.' },
        { key: 'visits.inventory.manage', label: 'Insumos en consulta externa', description: 'Agregar inventario y facturarlo desde la consulta externa.' }
      ]
    },
    {
      label: 'Emergencia',
      items: [
        { key: 'visits.emergency.read', label: 'Ver emergencias', description: 'Consultar atenciones y reportes de emergencia.' },
        { key: 'visits.emergency.update', label: 'Editar emergencias', description: 'Registrar, actualizar y gestionar camas de emergencia.' }
      ]
    },
    {
      label: 'Quirófano',
      items: [
        { key: 'visits.operating_room.read', label: 'Ver quirófano', description: 'Consultar atenciones y reportes de quirófano.' },
        { key: 'visits.operating_room.update', label: 'Editar quirófano', description: 'Registrar, actualizar y gestionar quirófanos.' }
      ]
    },
    {
      label: 'Hospitalización',
      items: [
        { key: 'visits.hospitalization.read', label: 'Ver hospitalización', description: 'Consultar atenciones y reportes de hospitalización.' },
        { key: 'visits.hospitalization.update', label: 'Editar hospitalización', description: 'Registrar, actualizar y gestionar camas de hospitalización.' }
      ]
    },
    {
      label: 'Atención médica general',
      items: [
        { key: 'visits.delete', label: 'Eliminar atenciones', description: 'Anular atenciones de cualquier plantilla cuando también se tiene permiso para editarla.' }
      ]
    },
    {
      label: 'Inventario',
      items: [
        { key: 'inventory.read', label: 'Ver inventario', description: 'Consultar insumos.' },
        { key: 'inventory.create', label: 'Agregar inventario', description: 'Crear nuevos productos.' },
        { key: 'inventory.update', label: 'Editar inventario', description: 'Actualizar existencias.' },
        { key: 'inventory.transfer', label: 'Traspasos', description: 'Mover stock entre subinventarios.' }
      ]
    },
    {
      label: 'Facturación',
      items: [
        { key: 'invoice.read', label: 'Ver facturas', description: 'Acceso a facturación.' },
        { key: 'invoice.create', label: 'Crear facturas', description: 'Generar facturas nuevas.' },
        { key: 'invoice.update', label: 'Editar facturas', description: 'Modificar facturas pendientes.' },
        { key: 'invoice.delete', label: 'Anular facturas', description: 'Anular facturas emitidas.' }
      ]
    },
    {
      label: 'Agenda',
      items: [
        { key: 'schedule.create', label: 'Crear eventos', description: 'Registrar eventos en calendario.' }
      ]
    },
    {
      label: 'Archivos adjuntos',
      items: [
        { key: 'attachments.read', label: 'Ver adjuntos', description: 'Ver y descargar archivos del expediente.' },
        { key: 'attachments.create', label: 'Adjuntar archivos', description: 'Subir archivos al expediente del paciente.' },
        { key: 'attachments.delete', label: 'Eliminar adjuntos', description: 'Eliminar archivos del expediente.' }
      ]
    },
    {
      label: 'Configuraciones',
      items: [
        { key: 'settings.profile.read', label: 'Ver mi perfil', description: 'Acceder a la configuración del perfil propio.' },
        { key: 'settings.profile.update', label: 'Editar mi perfil', description: 'Actualizar datos, preferencias, firma y sello propios.' },
        { key: 'settings.staff.read', label: 'Ver personal', description: 'Consultar el personal registrado.' },
        { key: 'settings.staff.update', label: 'Editar personal', description: 'Registrar, modificar credenciales y eliminar usuarios.' },
        { key: 'settings.permissions.read', label: 'Ver permisos', description: 'Consultar permisos de roles y usuarios.' },
        { key: 'settings.permissions.update', label: 'Editar permisos', description: 'Modificar overrides de roles y usuarios.' },
        { key: 'settings.company.read', label: 'Ver empresa', description: 'Consultar la configuración de la empresa.' },
        { key: 'settings.company.update', label: 'Editar empresa', description: 'Actualizar el nombre y logo de la empresa.' }
      ]
    }
  ]

  public get selectedRole(): RoleOption | null {
    if (!this.selectedRoleKey) return null
    return this.roles.find((role) => (role.key || role.name.toLowerCase()) === this.selectedRoleKey) ?? null
  }

  public get selectedUser(): SettingsUser | null {
    if (this.selectedUserId === null) return null
    return this.users.find((user) => user.id === this.selectedUserId) ?? null
  }

  public get selectedRoleKeyLabel(): string {
    const role = this.selectedRole
    if (!role) return '-'
    return role.key || role.name.toLowerCase()
  }

  ngOnInit(): void {
    this.loadRolesData()
    this.loadUsersData()
  }

  public get filteredRoles(): RoleOption[] {
    const term = this.roleSearch.trim().toLowerCase()
    if (!term) return this.roles
    return this.roles.filter((role) => {
      const key = (role.key || role.name.toLowerCase()).toLowerCase()
      return role.name.toLowerCase().includes(term) || key.includes(term)
    })
  }

  public get filteredUsers(): SettingsUser[] {
    const term = this.userSearch.trim().toLowerCase()
    if (!term) return this.users
    return this.users.filter((user) => {
      return (
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.roleName || '').toLowerCase().includes(term)
      )
    })
  }

  public selectRole(role: RoleOption) {
    this.selectedRoleKey = role.key || role.name.toLowerCase()
  }

  public selectUser(user: SettingsUser) {
    this.selectedUserId = user.id
  }

  public getPermissionState(context: 'role' | 'user', perm: string): PermissionState {
    const override = this.resolveOverride(context)
    if (override?.grants?.includes(perm)) return 'grant'
    if (override?.revokes?.includes(perm)) return 'revoke'
    return 'inherit'
  }

  public setPermissionState(context: 'role' | 'user', perm: string, state: PermissionState) {
    if (!this.canUpdatePermissions) return
    const override = this.ensureOverride(context)
    override.grants = override.grants ?? []
    override.revokes = override.revokes ?? []
    const grants = new Set(override.grants)
    const revokes = new Set(override.revokes)

    if (state === 'inherit') {
      grants.delete(perm)
      revokes.delete(perm)
    }

    if (state === 'grant') {
      grants.add(perm)
      revokes.delete(perm)
    }

    if (state === 'revoke') {
      revokes.add(perm)
      grants.delete(perm)
    }

    override.grants = Array.from(grants)
    override.revokes = Array.from(revokes)
  }

  public saveOverrides() {
    if (!this.canUpdatePermissions) return
    if (this.activeTab === 'roles') {
      if (!this.selectedRoleKey) return
      const override = this.roleOverrides[this.selectedRoleKey] || { grants: [], revokes: [] }
      this.persistRoleOverride(this.selectedRoleKey, override)
      return
    }

    if (this.selectedUserId === null) return
    const override = this.userOverrides[this.selectedUserId] || { grants: [], revokes: [] }
    this.persistUserOverride(this.selectedUserId, override)
  }

  public getOverrideSummary(context: 'role' | 'user') {
    const override = this.resolveOverride(context) || { grants: [], revokes: [] }
    return {
      grants: override.grants?.length || 0,
      revokes: override.revokes?.length || 0
    }
  }

  private resolveOverride(context: 'role' | 'user'): PermissionOverride | null {
    if (context === 'role') {
      if (!this.selectedRoleKey) return null
      return this.roleOverrides[this.selectedRoleKey] || { grants: [], revokes: [] }
    }
    if (this.selectedUserId === null) return null
    return this.userOverrides[this.selectedUserId] || { grants: [], revokes: [] }
  }

  private ensureOverride(context: 'role' | 'user'): PermissionOverride {
    if (context === 'role') {
      const key = this.selectedRoleKey
      if (!this.roleOverrides[key]) {
        this.roleOverrides[key] = { grants: [], revokes: [] }
      }
      return this.roleOverrides[key]
    }

    const id = this.selectedUserId || ''
    if (!this.userOverrides[id]) {
      this.userOverrides[id] = { grants: [], revokes: [] }
    }
    return this.userOverrides[id]
  }

  private persistRoleOverride(roleKey: string, override: PermissionOverride) {
    this.saving = true
    this.settingsService.updateRolePermissions(roleKey, override.grants ?? [], override.revokes ?? [])
      .subscribe({
        next: () => {
          Swal.fire('Listo', 'Permisos de rol actualizados.', 'success')
        },
        error: (err) => Swal.fire('Error', err, 'error'),
        complete: () => {
          this.saving = false
        }
      })
  }

  private persistUserOverride(userId: string, override: PermissionOverride) {
    this.saving = true
    this.settingsService.updateUserPermissions(userId, override.grants ?? [], override.revokes ?? [])
      .subscribe({
        next: () => {
          Swal.fire('Listo', 'Permisos del usuario actualizados.', 'success')
        },
        error: (err) => Swal.fire('Error', err, 'error'),
        complete: () => {
          this.saving = false
        }
      })
  }

  private loadRolesData() {
    this.settingsService.getRolePermissions()
      .subscribe({
        next: (data) => {
          this.roles = data.roles
          this.permissions = data.permissions
          this.roleOverrides = data.overrides || {}
          if (!this.selectedRoleKey && this.roles.length) {
            this.selectedRoleKey = this.roles[0].key || this.roles[0].name.toLowerCase()
          }
        },
        error: (err) => Swal.fire('Error', err, 'error')
      })
  }

  private loadUsersData() {
    this.settingsService.getUserPermissions()
      .subscribe({
        next: (data) => {
          this.users = data.users
          this.permissions = data.permissions
          this.userOverrides = data.overrides || {}
          if (this.selectedUserId === null && this.users.length) {
            this.selectedUserId = this.users[0].id
          }
        },
        error: (err) => Swal.fire('Error', err, 'error')
      })
  }
}
