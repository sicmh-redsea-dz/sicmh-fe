import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { VisitsService } from '../../services/visits-service/visits.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SimpleVisit } from '../../interface/visits-service.interface';

@Component({
  selector: 'app-visits-page',
  templateUrl: './visits-page.component.html',
  styleUrl: './visits-page.component.css'
})
export class VisitsPageComponent implements OnInit {
  public searchTerm: string = ''
  public currentPage: number = 1
  public totalPages: number = 1
  public limit: number = 25
  public offset: number = 0
  public totalRegistries: number = 0
  public visits: SimpleVisit[] = []
  public header: string = 'Consulta Externa'

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
  }

  public getVisits(searchTerm?: string) {
    const search = (searchTerm ?? this.searchTerm).trim()

    if ( !search ) {
      this.visits = []
      this.totalRegistries = 0
      return
    }
    
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

  public handleSelectedVisit(id: number) {
    let urlFragment = this.urlSegment
    return this.router.navigateByUrl(`dashboard/${urlFragment}/edit-visit/${id?.toString()}`)
  }

  public deleteSelectedVisit(id: number) {
    Swal.fire({
      title: 'Estas seguro?',
      text: 'Esta acción no se puede revertir.',
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

  private deleteVisit(id: number) {
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
    let urlFragment = this.urlSegment
    this.router.navigateByUrl(`/dashboard/${urlFragment}/new-visit`)

  }

  public dataToRender() {
    return this.visits
  }

}
