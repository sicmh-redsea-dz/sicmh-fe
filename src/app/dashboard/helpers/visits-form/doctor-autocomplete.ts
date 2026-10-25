import { catchError, map, Observable, of, startWith, switchMap, timer } from 'rxjs'
import type { Doctor } from '../../interface/visits-response.interface'

export interface DoctorSuggestions {
  results: Doctor[]
  loading: boolean
  error: string
}

/** Focus and every search term, including empty text, can request the catalog. */
export const doctorSuggestions = (
  terms: Observable<string | null>,
  search: (term: string) => Observable<Doctor[]>,
): Observable<DoctorSuggestions> => terms.pipe(
  switchMap((term) => timer(250).pipe(
    switchMap(() => search((term ?? '').trim())),
    map((results): DoctorSuggestions => ({ results, loading: false, error: '' })),
    // Keep the outer stream alive so typing/refocusing can retry a failed request.
    catchError((error) => of<DoctorSuggestions>({ results: [], loading: false, error: String(error) })),
    startWith<DoctorSuggestions>({ results: [], loading: true, error: '' }),
  )),
)
