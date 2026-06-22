import { Directive, effect, inject, Input, signal, TemplateRef, ViewContainerRef } from '@angular/core'
import { AuthService } from '../../auth/services/auth.service'
import { Permission } from '../../auth/permissions/permissions'

@Directive({ selector: '[appHasAnyPermission]' })
export class HasAnyPermissionDirective {
  private authService = inject(AuthService)
  private vcr = inject(ViewContainerRef)
  private tpl = inject<TemplateRef<unknown>>(TemplateRef)
  private required = signal<Permission[] | null>(null)
  private hasView = false

  @Input() set appHasAnyPermission(value: Permission[]) {
    this.required.set(value)
  }

  constructor() {
    effect(() => {
      const req = this.required()
      if (req === null) return

      const allowed = this.authService.hasAnyPermission(req)
      if (allowed && !this.hasView) {
        this.vcr.createEmbeddedView(this.tpl)
        this.hasView = true
      } else if (!allowed && this.hasView) {
        this.vcr.clear()
        this.hasView = false
      }
    })
  }
}
