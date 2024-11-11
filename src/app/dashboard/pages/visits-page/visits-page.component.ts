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
  private visitsService: VisitsService = inject(VisitsService)

  ngOnInit(): void {
    this.getVisits()
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
