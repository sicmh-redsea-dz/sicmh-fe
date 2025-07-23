import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, computed, inject, OnInit, } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { map } from 'rxjs';
import { PatientsService } from '../../services/patients-service/patients.service';
import { FormPatient } from '../../interface/patients-response.interface';
import { createSingleton } from 'tippy.js';

@Component({
  selector: 'app-patient-form-page',
  templateUrl: './patient-form-page.component.html',
  styleUrl: './patient-form-page.component.css'
})
export class PatientFormPageComponent implements OnInit {
  public title = ''
  public caller = ''
  public actionButtonText = ''
  private fb = inject( FormBuilder )
  private router = inject( Router )
  private activeRoute = inject( ActivatedRoute )
  private patientService = inject( PatientsService )
  public selectedUser = computed(() => this.patientService.selectedPatient() )
  
  public patientForm: FormGroup = this.fb.group({
    id        : [this.caller !== 'np' ?this.selectedUser()?.id : '', [Validators.required, Validators.maxLength(20)]],
    firstName : [this.caller !== 'np' ? this.selectedUser()?.name : '', [Validators.required, Validators.minLength(2)]],
    lastName  : [this.caller !== 'np' ? this.selectedUser()?.lastName : '', [Validators.required, Validators.minLength(2)]],
    birthdate : [this.caller !== 'np' ? this.formatDate(this.selectedUser()?.birthDate) : '', [Validators.required]],
    gender    : [this.caller !== 'np' ? this.selectedUser()?.gender || '' : '', [Validators.required]],
    phone     : [this.caller !== 'np' ?this.selectedUser()?.phone : '', [Validators.required, Validators.maxLength(8)]],
    email     : [this.caller !== 'np' ?this.selectedUser()?.email : '', [Validators.required, Validators.email]],
    address   : [this.caller !== 'np' ?this.selectedUser()?.address : '', [Validators.required]],
    image     : [''],
    notes     : ['']
  })

  public set frameTitle(v: string) {
    this.title = v;
  }
  
  ngOnInit(): void {
    this.activeRoute.url
      .pipe(
        map((urlSegment) => urlSegment),
      ).subscribe(segments => {
        let urlSegment = segments[0].path === 'new-patient' ? true : false
        if(urlSegment) {
          this.caller = 'np'
          this.frameTitle = 'Registro de Paciente'
          this.actionButtonText = 'Guardar'
          this.patientForm.reset();
        }
        else {
          this.frameTitle = 'Editar Paciente'
          this.actionButtonText = 'Editar'
        }
      })
  }

  public onHandleSubmit() {
    const patient = this.patientForm.value
    this.caller === 'np'
    ? this.handleCreatePatient( patient )
    : this.handleEditPatient( patient )
  }

  private formatDate( dateString: string | undefined ): string {
    if( !dateString ) return ''
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]
  }

  private handleEditPatient( patient: FormPatient ) {
    this.patientService.editPatient(patient, this.selectedUser()!.id)
      .subscribe({
        next: (editedUser) => {
          if( editedUser ) {
            const { patient } = editedUser.data
            Swal.fire('Success', `${patient.name} ${patient.lastName} has been edited!`, 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/patients')
              })
          }
        },
        error: ( error ) => {
          Swal.fire('Error', error.message, 'error')
        },
      })
  }

  private handleCreatePatient( patient: FormPatient ) {
    this.patientService.savePatient(patient)
      .subscribe({
        next: (addedUser) => {
          if( addedUser ) {
            const { patient } = addedUser?.data
            Swal.fire('Success', `${patient.name} ${patient.lastName} has been added!`, 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/patients')
              })
          }
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        },
      })
  }
}
