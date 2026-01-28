import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { Component, DestroyRef, inject } from '@angular/core';
import { PatientsService } from '../../services/patients-service/patients.service';
import { Patient } from '../../interface/patients-response.interface';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-patients',
  templateUrl: './patients-page.component.html',
  styleUrl: './patients-page.component.css'
})
export class PatientsPageComponent {
  public searchTerm: string = ''
  public currentPage: number = 1
  public totalPages: number = 1
  public limit: number = 25
  public offset: number = 0
  public totalRegistries: number = 0
  public patients: Patient[] = []
  
  private router = inject(Router)
  private patientService: PatientsService = inject( PatientsService )
  private searchTermSubject = new Subject<string>()
  private destroyRef = inject(DestroyRef)
  
  constructor() {
    this.searchTermSubject
      .pipe(
        debounceTime( 700 ),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(( term: string ) => {
        this.getPatients( term )
      })
  }

  public onSearchTermChange( term: string ) {
    this.searchTerm = term
    this.currentPage = 1
    this.offset = 0
    this.searchTermSubject.next( term )
  }

  public getPatients( searchTerm?: string ) {
    const search = (searchTerm ?? this.searchTerm).trim()

    if ( !search ) {
      this.patients = []
      this.totalRegistries = 0
      return
    }
    
    this.patientService.getPatients({ 
      limit: this.limit, 
      offset: this.offset,
      term: search
    })
      .subscribe({
        next: ( response ) => {
          this.patients = response?.patients || []
          this.totalPages = Math.ceil((response?.totalRegistries!) / this.limit )
          this.totalRegistries = response?.totalRegistries!
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      }) 
  }

  public onPageChange(page: number) {
    this.currentPage = page
    this.offset = (this.currentPage - 1) * this.limit
    this.getPatients()
  }

  public handleSelectedPatient( patientId: number) {
    this.patientService.getPatient(patientId)
      .subscribe({
        next: (patient) => {
          const {id} = patient!
          return this.router.navigateByUrl(`dashboard/patients/${id.toString()}`)
        }, 
        error: (err) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }

  public deleteSelectedPatient(id: number) {
    Swal.fire({
      title: 'Estas seguro?',
      text: 'Esta acción no se puede revertir.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, aceptar',
      cancelButtonText: 'Cancelar'
    }).then(( result ) => {
      if( result.isConfirmed ) {
        this.deletePatient( id )
        Swal.fire('Acción confirmada', 'Has aceptado la acción', 'success')
      }
      else if( result.dismiss === Swal.DismissReason.cancel) 
        Swal.fire('Acción cancelada', 'No se realizo ningun cambio', 'info')
    })
  }

  public dataToRender() {
    return this.patients.filter((patient) => {
      return patient.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        patient.idNumber.includes(this.searchTerm) 
    })
  }

  private deletePatient(id: number) {
    this.patientService.deletePatient(id)
      .subscribe({
        next: ( result ) => {
          if( result ) this.getPatients()
        },
        error:( err ) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }
}
