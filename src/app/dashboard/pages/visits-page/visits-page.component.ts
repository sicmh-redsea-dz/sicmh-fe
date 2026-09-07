import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { VisitsService } from '../../services/visits-service/visits.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SimpleVisit } from '../../interface/visits-service.interface';
import { AuthService } from '../../../auth/services/auth.service';
import { Permission } from '../../../auth/permissions/permissions';
import { trackById } from '../../../shared/utils/track-by';

@Component({
  selector: 'app-visits-page',
  templateUrl: './visits-page.component.html',
  styleUrl: './visits-page.component.css'
})
export class VisitsPageComponent implements OnInit {
  public trackById = trackById
  public searchTerm: string = ''
  public currentPage: number = 1
  public totalPages: number = 1
  public limit: number = 25
  public offset: number = 0
  public totalRegistries: number = 0
  public visits: SimpleVisit[] = []
  public header: string = 'Consulta Externa'
  public managementLink: string | null = null
  public managementLabel: string | null = null
  private authService = inject(AuthService)
  public canCreateVisit(): boolean {
    return this.authService.hasPermission(this.modulePermission('update'))
  }

  public canEditVisit(): boolean {
    return this.authService.hasPermission(this.modulePermission('update'))
  }

  public canDeleteVisit(): boolean {
    return this.canEditVisit() && this.authService.hasPermission('visits.delete')
  }

  private router = inject( Router )
  public urlSegment: string = ''
  private visitsService: VisitsService = inject(VisitsService)
  private searchTermSubject = new Subject<string>()
  private destroyRef = inject(DestroyRef)

  constructor() {
    this.searchTermSubject.pipe(
      debounceTime( 700 ),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(( term: string) => {
      this.getVisits( term )
    })
  }

  ngOnInit(): void {

    this.urlSegment = (this.router.url).split('/')[2]
    
    if ( this.urlSegment === 'emergency' )
      this.header = 'emergencias'

    if ( this.urlSegment === 'hospitalization' )
      this.header = 'hospitalización'

    if ( this.urlSegment === 'o-room' )
      this.header = 'quirofano'

    if ( this.urlSegment === 'emergency' ) {
      this.managementLink = '/dashboard/emergency/beds'
      this.managementLabel = 'Gestionar camas'
    }

    if ( this.urlSegment === 'hospitalization' ) {
      this.managementLink = '/dashboard/hospitalization/beds'
      this.managementLabel = 'Gestionar camas'
    }

    if ( this.urlSegment === 'o-room' ) {
      this.managementLink = '/dashboard/o-room/rooms'
      this.managementLabel = 'Gestionar quirófanos'
    }

    this.getVisits()
  }

  private modulePermission(action: 'read' | 'update'): Permission {
    const prefixByRoute: Record<string, string> = {
      visits: 'outpatient',
      emergency: 'emergency',
      'o-room': 'operating_room',
      hospitalization: 'hospitalization'
    }
    const prefix = prefixByRoute[this.urlSegment] ?? 'outpatient'
    return `visits.${prefix}.${action}` as Permission
  }

  public getVisits(searchTerm?: string) {
    const search = (searchTerm ?? this.searchTerm).trim()

    this.visitsService.getAllVisits({
      limit: this.limit, 
      offset: this.offset, 
      term: search,
      ext: this.urlSegment
    })
      .subscribe({
        next: ( response ) => { 
          this.visits = response.visits || []
          this.totalPages = Math.ceil((response?.totalRecords!) / this.limit )
          this.totalRegistries = response?.totalRecords!
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public onSearchTermChange( term: string ) {
    this.searchTerm = term
    this.currentPage = 1
    this.offset = 0
    this.searchTermSubject.next( term )
  }

  public onPageChange(page: number) {
    this.currentPage = page
    this.offset = (this.currentPage - 1) * this.limit
    this.getVisits()
  }

  public handleSelectedVisit(id: string) {
    if (!this.canEditVisit()) return
    let urlFragment = this.urlSegment
    return this.router.navigateByUrl(`dashboard/${urlFragment}/edit-visit/${id?.toString()}`)
  }

  public getStationLabel(key?: string) {
    if (!key) return '—'
    const normalized = this.normalizeStationKey(key)
    if (normalized === 'emergencia') return 'Emergencia'
    if (normalized === 'hospitalizacion') return 'Hospitalización'
    if (normalized === 'quirofano') return 'Quirófano'
    if (normalized === 'consulta') return 'Consulta'
    return key.toString()
  }

  private normalizeStationKey(value?: string) {
    const normalized = value ? value.toString().trim().toLowerCase() : ''
    if (!normalized) return ''
    if (normalized.includes('emer')) return 'emergencia'
    if (normalized.includes('hosp')) return 'hospitalizacion'
    if (normalized.includes('quiro')) return 'quirofano'
    if (normalized.includes('consult')) return 'consulta'
    return normalized
  }

  private getReportStationKey() {
    if (this.urlSegment === 'emergency') return 'emergencia'
    if (this.urlSegment === 'hospitalization') return 'hospitalizacion'
    if (this.urlSegment === 'o-room') return 'quirofano'
    return 'consulta'
  }

  private getMovementPathKeys(visit: SimpleVisit): string[] {
    const rawTrail = (visit as any).movementTrail || (visit as any).movementPath || (visit as any).movementHistory
    if (Array.isArray(rawTrail)) {
      return rawTrail
        .map((value) => this.normalizeStationKey(value))
        .filter(Boolean)
    }
    if (typeof rawTrail === 'string') {
      return rawTrail
        .split(/->|→|,/)
        .map((value) => this.normalizeStationKey(value))
        .filter(Boolean)
    }

    const path: string[] = []
    const pushUnique = (value?: string) => {
      const key = this.normalizeStationKey(value)
      if (!key) return
      if (!path.length || path[path.length - 1] !== key) {
        path.push(key)
      }
    }

    pushUnique(visit.originStation || visit.visitType)
    pushUnique(visit.movementFrom)
    pushUnique(visit.movementTo)
    pushUnique(visit.currentStation || visit.movedTo)
    return path
  }

  private getMovementAfterReportKeys(visit: SimpleVisit): string[] {
    const path = this.getMovementPathKeys(visit)
    if (!path.length) return []
    const reportKey = this.getReportStationKey()
    const reportIndex = path.lastIndexOf(reportKey)
    if (reportIndex === -1) return []
    return path.slice(reportIndex + 1)
  }

  public getMovementShortLabel(visit: SimpleVisit) {
    const after = this.getMovementAfterReportKeys(visit)
    if (!after.length) return '-'
    const labels = after.slice(0, 2).map((value) => this.getStationLabel(value))
    return labels.join(' → ')
  }

  public getMovementFullLabel(visit: SimpleVisit) {
    const path = this.getMovementPathKeys(visit)
    if (!path.length) return '-'
    return path.map((value) => this.getStationLabel(value)).join(' → ')
  }

  public showMovementTooltip(visit: SimpleVisit) {
    const path = this.getMovementPathKeys(visit)
    if (path.length <= 2) return false
    return this.getMovementShortLabel(visit) !== '-'
  }

  private getCurrentStationKey(visit: SimpleVisit) {
    return this.normalizeStationKey(
      visit.currentStation || visit.movementTo || visit.movedTo || visit.originStation || visit.visitType
    )
  }

  public getRowClass(visit: SimpleVisit) {
    const reportKey = this.getReportStationKey()
    const currentKey = this.getCurrentStationKey(visit)
    if (reportKey && currentKey && reportKey !== currentKey) return 'moved'
    if (visit.state === 'Pendiente') return 'pending'
    if (visit.state === 'Pagado') return 'payed'
    return ''
  }

  public deleteSelectedVisit(id: string) {
    if (!this.canDeleteVisit()) return
    Swal.fire({
      title: 'Estas seguro?',
      text: 'Esta acción no se puede revertir. La factura pendiente asociada será anulada automáticamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, aceptar',
      cancelButtonText: 'Cancelar'
    }).then(( result ) => {
      if( result.isConfirmed ) {
        this.deleteVisit(id)
        Swal.fire('Acción confirmada', 'Has aceptado la acción', 'success')
      }
      else if( result.dismiss === Swal.DismissReason.cancel) 
        Swal.fire('Acción cancelada', 'No se realizo ningun cambio', 'info')
    })
  }

  private deleteVisit(id: string) {
    this.visitsService.deleteVisit( id )
      .subscribe({
        next: ( result ) => {
          if( result ) 
            this.getVisits()
        },
        error:( err ) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }

  public handleNewRegister() {
    if (!this.canCreateVisit()) return
    let urlFragment = this.urlSegment
    this.router.navigateByUrl(`/dashboard/${urlFragment}/new-visit`)

  }

}
