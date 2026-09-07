import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { Component, DestroyRef, computed, inject } from '@angular/core';
import { PatientsService } from '../../services/patients-service/patients.service';
import { Patient } from '../../interface/patients-response.interface';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../auth/services/auth.service';
import { DrawerService } from '../../services/drawer-service/drawer.service';
import { DrawerContents } from '../../interface/drawer-content.enum';
import { trackById } from '../../../shared/utils/track-by';

@Component({
  selector: 'app-patients',
  templateUrl: './patients-page.component.html',
  styleUrl: './patients-page.component.css'
})
export class PatientsPageComponent {
  public trackById = trackById
  public searchTerm: string = ''
  public currentPage: number = 1
  public totalPages: number = 1
  public limit: number = 25
  public offset: number = 0
  public totalRegistries: number = 0
  public patients: Patient[] = []
  private authService = inject( AuthService )
  public canCreatePatient = computed(() =>
    this.authService.hasPermission('patients.create')
  )
  public canEditPatient = computed(() =>
    this.authService.hasPermission('patients.update')
  )
  public canDeletePatient = computed(() =>
    this.authService.hasPermission('patients.delete')
  )
  public canViewPatient = computed(() =>
    this.authService.hasPermission('patients.read')
  )
  public canManageBilling = computed(() =>
    this.authService.hasAnyPermission(['invoice.update', 'invoice.create'])
  )
  
  private router = inject(Router)
  private patientService: PatientsService = inject( PatientsService )
  private drawerService = inject( DrawerService )
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

  public handleSelectedPatient( patientId: string) {
    if (!this.canEditPatient()) return
    this.patientService.getPatient(patientId)
      .subscribe({
        next: (patient) => {
          const {id} = patient!
          return this.router.navigateByUrl(`dashboard/patients/${id}`)
        }, 
        error: (err) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }

  public handleViewPatient(patient: Patient) {
    this.drawerService.isDrawerOpen.set(true)
    this.drawerService.contentToDisplay.set(DrawerContents.PATIENT_VIEW)
    this.drawerService.setToUpdate.set(false)
    this.drawerService.setPatientId.set(patient.id)
    this.drawerService.drawerTexts.set({
      header: `${patient.name} ${patient.lastName}`,
      btnText: ''
    })
  }

  public handlePatientMovements(patient: Patient) {
    this.router.navigateByUrl(`dashboard/patients/${patient.id}/movements`)
  }

  public deleteSelectedPatient(id: string) {
    if (!this.canDeletePatient()) return
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
      }
      else if( result.dismiss === Swal.DismissReason.cancel) 
        Swal.fire('Acción cancelada', 'No se realizo ningun cambio', 'info')
    })
  }

  private deletePatient(id: string) {
    this.patientService.deletePatient(id)
      .subscribe({
        next: ( result ) => {
          if( result ) {
            this.getPatients()
            Swal.fire('Acción confirmada', 'Has aceptado la acción', 'success')
          }
        },
        error:( err ) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }
}
