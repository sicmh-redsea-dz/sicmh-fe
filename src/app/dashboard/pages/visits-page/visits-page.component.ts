import { Component, computed, inject, OnInit } from '@angular/core';
import { VisitsService } from '../../services/visits-service/visits.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { FormVisit } from '../../interface/visits-response.interface';

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
  public totalRegistries: number = 1

  private router = inject( Router )
  public urlSegment: string = ''
  private visitsService: VisitsService = inject(VisitsService)

  ngOnInit(): void {
    this.getVisits()
    this.urlSegment = (this.router.url).split('/')[2]
  }

  public getVisits() {
    this.visitsService.getAllVisits({limit: this.limit, offset: this.offset})
      .subscribe({
        next: ( response ) => {
          this.totalPages = Math.ceil((response?.totalRegistries!) / this.limit )
          this.totalRegistries = response?.totalRegistries!
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public onSearchTermChange( term: string ) {
    this.searchTerm = term
    this.currentPage = 1
    this.getVisits()
  }

  public onPageChange(page: number) {
    this.currentPage = page
    this.offset = (this.currentPage - 1) * this.limit;
    this.getVisits();
  }

  public handleSelectedVisit(id: number) {
    this.visitsService.getVisit(id)
      .subscribe({
        next: ( visit ) => {
          const { id } = visit!
          let urlFragment = this.urlSegment === 'emergency' ? 'emergency' : 'visits'
          return this.router.navigateByUrl(`dashboard/${urlFragment}/edit-visit/${id?.toString()}`)
        },
        error: ( err ) => {
          console.error('Error al obtener los datos de la visita:', err);
        }
      })
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
    return this.visitsService.listOfVisits()?.filter((visit) => {
      return visit.patientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        visit.doctorName.toLocaleLowerCase().includes(this.searchTerm.toLocaleLowerCase())
    })
  }

}
