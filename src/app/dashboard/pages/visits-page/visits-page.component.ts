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
export class VisitsPageComponent {
  public searchTerm: string = ''

  private router = inject( Router )
  private visitsService: VisitsService = inject(VisitsService)

  constructor() {
    this.getVisits()
  }

  public getVisits() {
    this.visitsService.getAllVisits()
      .subscribe({
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public onSearchTermChange( term: string ) {
    this.searchTerm = term
  }

  public handleSelectedVisit(id: number) {
    this.visitsService.getVisit(id)
      .subscribe({
        next: ( visit ) => {
          const { id } = visit?.data.visit!
          return this.router.navigateByUrl(`dashboard/visits/edit-visit/${id?.toString()}`)
        },
        error: ( err ) => {
          console.error('Error al obtener los datos de la visita:', err);
        }
      })
  }

  public dataToRender() {
    return this.visitsService.listOfVisits()?.filter((visit) => {
      return visit.patientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        visit.doctorName.toLocaleLowerCase().includes(this.searchTerm.toLocaleLowerCase())
    })
  }
}
