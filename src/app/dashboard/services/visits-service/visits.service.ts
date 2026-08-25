import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { formatApiError } from '../../../shared/utils/api-error'
import { environment } from '../../../../environments/environment';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { Doctor, FormVisit } from '../../interface/visits-response.interface';
import { ShortPatient } from '../../interface/patients-response.interface';
import { Histories, SimpleVisit, Visit, Stock, PrescriptionContext } from '../../interface/visits-service.interface'

interface Delimiters {
  limit: number,
  offset: number,
  term: string,
  ext: string
}
@Injectable({
  providedIn: 'root'
})
export class VisitsService {
  private static readonly PATIENT_CACHE_TTL_MS = 5 * 60 * 1000
  private readonly baseUrl: string = environment.baseUrl
  private http = inject( HttpClient )
  private doctorsCatalog$?: Observable<Doctor[]>
  private patientSearchCache = new Map<string, { expiresAt: number; results: ShortPatient[] }>()
  private patientSearchInFlight = new Map<string, Observable<ShortPatient[]>>()
  private _selectedVisit = signal<Visit | null>(null)
  readonly selectedVisit = this._selectedVisit.asReadonly()

  private _listOfVisits = signal<SimpleVisit[]>([])
  readonly listOfVisits = this._listOfVisits.asReadonly()

  private _listOfStockItems = signal<Stock[] | null>(null)
  readonly listOfStockItems = this._listOfStockItems.asReadonly()

  constructor() {
    // Warm the small doctors catalog as soon as the dashboard starts using
    // this service, so autocomplete filtering is local and immediate.
    this.getDoctorsCatalog().subscribe({ error: () => undefined })
  }

  public searchStockItems( term: number ): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits/search/stock-items`
    const params = new HttpParams()
      .set('term', term)

    return this.http.get<any>(url, { params })
      .pipe(
        map(({ data }) => {
          this._listOfStockItems.set( data.stock )
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public searchDoctors(term: string): Observable<Doctor[]> {
    const normalizedTerm = this.normalizeSearchTerm(term)

    return this.getDoctorsCatalog().pipe(
      map((doctors) => doctors
        .filter((doctor) => {
          if (!normalizedTerm) return true
          return this.normalizeSearchTerm(doctor.name).includes(normalizedTerm)
        })
        .slice(0, 20)
      )
    )
  }

  private getDoctorsCatalog(): Observable<Doctor[]> {
    if (this.doctorsCatalog$) return this.doctorsCatalog$

    const url: string = `${this.baseUrl}/app/visits/search/doctors`
    const params = new HttpParams()
      .set('term', '')

    this.doctorsCatalog$ = this.http.get<any>(url, { params })
      .pipe(
        map(({ data })=> {
          const { doctors } = data
          return doctors as Doctor[]
        }),
        catchError(( err ) => {
          this.doctorsCatalog$ = undefined
          return throwError(() => formatApiError(err))
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      )

    return this.doctorsCatalog$
  }

  public searchPatients(term: string): Observable<ShortPatient[]> {
    const cleanTerm = term.trim()
    if (cleanTerm.length < 2) return of([])

    const cacheKey = this.normalizeSearchTerm(cleanTerm)
    const cached = this.patientSearchCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return of(cached.results)
    if (cached) this.patientSearchCache.delete(cacheKey)

    const inFlight = this.patientSearchInFlight.get(cacheKey)
    if (inFlight) return inFlight

    const url: string = `${this.baseUrl}/app/visits/search/patients`
    const params = new HttpParams()
      .set('term', cleanTerm)

    const request$ = this.http.get<any>(url, { params })
      .pipe(
        map(({ data })=> {
          const { patients } = data
          return patients as ShortPatient[]
        }),
        tap((results) => this.patientSearchCache.set(cacheKey, {
          expiresAt: Date.now() + VisitsService.PATIENT_CACHE_TTL_MS,
          results
        })),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        }),
        finalize(() => this.patientSearchInFlight.delete(cacheKey)),
        shareReplay({ bufferSize: 1, refCount: false })
      )

    this.patientSearchInFlight.set(cacheKey, request$)
    return request$
  }

  private normalizeSearchTerm(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  public getAllVisits(args: Delimiters): Observable<any> {
    const url: string = `${this.baseUrl}/app/visits`
    const params = new HttpParams()
      .set('offset', args.offset)
      .set('limit', args.limit)
      .set('term', args.term)
      .set('ext', args.ext)

    return this.http.get<Histories>(url, { params })
      .pipe(
        map(({data}) => {
          this._listOfVisits.set(data.visits)
          return data
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public getVisit(id: number): Observable<Visit> {
    const url: string = `${this.baseUrl}/app/visits/${id}`
    return this.http.get<any>(url, {})
      .pipe(
        map(({ data }) => {
          const { visit } = data
          this._selectedVisit.set( visit )
          return visit
        }),
        catchError((err) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public getPrescription(id: number): Observable<PrescriptionContext> {
    const url = `${this.baseUrl}/app/visits/${id}/prescription`
    return this.http.get<{ data: PrescriptionContext }>(url, {})
      .pipe(
        map(({ data }) => data),
        catchError((err) => throwError(() => formatApiError(err)))
      )
  }

  public editVisit(id: number, visit: FormVisit): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/visits/edit/${id}`
    const body = {...visit}
    return this.http.patch(url, body, {})
      .pipe(
        map((something) => {
          return true
        }),
        catchError((err) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public createVisit(visit: FormVisit, origin: string): Observable<number | null> {
    const url: string = `${this.baseUrl}/app/visits/create`
    const body = {...visit, origin}
    return this.http.post<{ data?: { visit?: number } }>(url, body, {})
      .pipe(
        map(( resp ) => resp?.data?.visit ?? null),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }

  public deleteVisit(id: number): Observable<boolean> {
    const url: string = `${this.baseUrl}/app/visits/${id}`
    return this.http.delete(url, {})
      .pipe(
        map((data) => {
          return true
        }),
        catchError(( err ) => {
          return throwError(() => formatApiError(err))
        })
      )
  }
}
