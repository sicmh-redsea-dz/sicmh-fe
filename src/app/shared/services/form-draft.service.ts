import { DestroyRef, Injectable, inject } from '@angular/core'
import { AuthService } from '../../auth/services/auth.service'
import { Observable } from 'rxjs'
import Swal from 'sweetalert2'
import { FormDraft } from './form-draft'

@Injectable({ providedIn: 'root' })
export class FormDraftService {
  private auth = inject(AuthService)
  open(options: { scope: string; changes: Observable<unknown>; snapshot: () => unknown;
    restore: (data: any) => void; destroyRef: DestroyRef }): FormDraft | undefined {
    const user = this.auth.currentUser()
    const tenant = localStorage.getItem('codigoEmpresa')
    if (!user || !tenant) return undefined
    const draft = new FormDraft({ ...options, storage: sessionStorage,
      key: `formDraft:v1:${encodeURIComponent(tenant)}:${encodeURIComponent(user._id)}:${options.scope}`,
      confirmRestore: async savedAt => (await Swal.fire({
        title: '¿Recuperar el borrador?',
        text: `Hay cambios sin confirmar del ${new Date(savedAt).toLocaleString('es-HN')}.`,
        icon: 'question', showCancelButton: true, confirmButtonText: 'Recuperar',
        cancelButtonText: 'Descartar borrador', allowOutsideClick: false, allowEscapeKey: false,
      })).isConfirmed,
    })
    const flush = () => draft.flush()
    const hidden = () => { if (document.hidden) flush() }
    window.addEventListener('pagehide', flush)
    window.addEventListener('session-ending', flush)
    document.addEventListener('visibilitychange', hidden)
    options.destroyRef.onDestroy(() => {
      draft.dispose()
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('session-ending', flush)
      document.removeEventListener('visibilitychange', hidden)
    })
    void draft.start()
    return draft
  }
}
