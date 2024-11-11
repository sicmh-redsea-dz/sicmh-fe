import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { Component, computed, inject, Signal, signal } from '@angular/core';
import { PatientsService } from '../../services/patients-service/patients.service';

@Component({
  selector: 'app-patients',
  templateUrl: './patients-page.component.html',
  styleUrl: './patients-page.component.css'
})
export class PatientsPageComponent {
  public searchTerm: string = ''
  public limit: number = 25
  public offset: number = 0
  public totalPages: number = 1
  public currentPage: number = 1
  public totalCount: number = 1
  public totalRegistries: number = 1
  
  private router = inject(Router)
  private patientService: PatientsService = inject( PatientsService )
  
  constructor() {
    this.getPatients()
  }

  public onSearchTermChange( term: string ) {
    this.searchTerm = term
  }

  public getPatients() {
    this.patientService.getPatients({ limit: this.limit, offset: this.offset })
      .subscribe({
        next: ( response ) => {
          this.totalPages = Math.ceil((response?.totalRegistries!) / this.limit )
          this.totalRegistries = response?.totalRegistries!
          this.totalCount = response?.totalCount!
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      }) 
  }

  public onPageChange(page: number) {
    this.currentPage = page
    this.offset = (this.currentPage - 1) * this.limit;
    this.getPatients();
  }

  public handleSelectedPatient( patientId: number) {
    this.patientService.getPatient(patientId)
      .subscribe({
        next: (patient) => {
          const {id} = patient!
          return this.router.navigateByUrl(`dashboard/patients/${id.toString()}`)
        }, 
        error: (err) => {
          console.error('Error al obtener los datos del paciente:', err);
        }
      })
  }

  public dataToRender() {
    return this.patientService.listOfPatients()?.patients.filter((patient) => {
      return patient.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(this.searchTerm.toLowerCase())
    })
  }
}
