import { Component, computed, inject, OnInit } from '@angular/core';
import { VisitsService } from '../../services/visits-service/visits.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';

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
  public visits: any[] = []
  public isDefaultER: boolean = false
  public header: string = 'visitas'

  private router = inject( Router )
  public urlSegment: string = ''
  private visitsService: VisitsService = inject(VisitsService)
  private searchTermSubject = new Subject<string>()

  constructor() {
    this.searchTermSubject.pipe(
      debounceTime( 700 ),
      distinctUntilChanged()
    ).subscribe(( term: string) => {
      this.getVisits( term )
    })
  }

  ngOnInit(): void {

    this.urlSegment = (this.router.url).split('/')[2]
    
    if ( this.urlSegment === 'emergency' )
      this.header = 'emergencias'
      this.isDefaultER = true
      this.getVisits()
  }

  public getVisits(searchTerm?: string) {

    if ( 
      !searchTerm && 
      this.urlSegment === 'visits'
    ) {
      this.visits = []
      this.totalRegistries = 0
      return
    }

    if (
      !searchTerm && 
      this.urlSegment === 'emergency' &&
      !this.isDefaultER
    ) {
      this.isDefaultER = true
    }
    
    this.visitsService.getAllVisits({
      limit: this.limit, 
      offset: this.offset, 
      term: searchTerm ? searchTerm.trim() : '',
      default: this.isDefaultER  
    })
      .pipe(
        finalize(() => {
          this.isDefaultER = false
        })
      )
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
    this.searchTermSubject.next( term )
  }

  public onPageChange(page: number) {
    this.currentPage = page
    this.offset = (this.currentPage - 1) * this.limit
    this.getVisits()
  }

  public handleSelectedVisit(id: number) {
    let urlFragment = this.urlSegment === 'emergency' ? 'emergency' : 'visits'
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
          console.error('Error al eliminar el paciente seleccionado:', err);
        }
      })
  }

  public handleNewRegister() {
    let urlFragment = this.urlSegment === 'emergency' ? 'emergency' : 'visits'
    console.log('url: ', urlFragment)
    this.router.navigateByUrl(`/dashboard/${urlFragment}/new-visit`)

  }

  public dataToRender() {
    return this.visits
    // return this.visits.filter((visit) => {
    //   return visit.patientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
    //     visit.doctorName.toLocaleLowerCase().includes(this.searchTerm.toLocaleLowerCase()) ||
    //     visit.patientId.includes(this.searchTerm)
    // })
  }

}
