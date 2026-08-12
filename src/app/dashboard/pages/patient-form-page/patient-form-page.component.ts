import { FormBuilder, Validators } from '@angular/forms';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { filter, map, switchMap, tap } from 'rxjs';
import { PatientsService } from '../../services/patients-service/patients.service';
import { FormPatient, Patient } from '../../interface/patients-response.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-patient-form-page',
  templateUrl: './patient-form-page.component.html',
  styleUrl: './patient-form-page.component.css'
})
export class PatientFormPageComponent implements OnInit {
  public title = 'Registro de Pacientes'
  public actionButtonText = 'Guardar'
  public isEditMode = false
  private patientId: number | null = null
  private fb = inject( FormBuilder ).nonNullable
  private router = inject( Router )
  private activeRoute = inject( ActivatedRoute )
  private patientService = inject( PatientsService )
  private destroyRef = inject( DestroyRef )

  public patientForm = this.fb.group({
    id        : ['', [Validators.required, Validators.minLength(13), Validators.maxLength(13)]],
    firstName : ['', [Validators.required, Validators.minLength(2)]],
    lastName  : ['', [Validators.required, Validators.minLength(2)]],
    birthdate : ['', [Validators.required]],
    gender    : ['', [Validators.required]],
    phone     : ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
    email     : ['', [Validators.required, Validators.email]],
    address   : ['', [Validators.required, Validators.minLength(5)]],
    notes     : [''],
    emergencyContact: this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      relationship: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
      email: ['', [Validators.email]],
      address: ['']
    })
  })

  ngOnInit(): void {
    this.activeRoute.paramMap
      .pipe(
        map((params) => params.get('id')),
        tap((id) => {
          if (id)
            this.setEditMode(Number(id))
          else
            this.setCreateMode()
        }),
        filter((id): id is string => id !== null),
        switchMap((id) => this.patientService.getPatient(Number(id))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((patient) => {
        if (!patient) return
        this.patchForm(patient)
      })
  }

  public onHandleSubmit() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched()
      return
    }
    const patient: FormPatient = this.patientForm.getRawValue()
    this.isEditMode
      ? this.handleEditPatient(patient, this.patientId)
      : this.handleCreatePatient(patient)
  }

  private formatDate( dateString: string | undefined ): string {
    if( !dateString ) return ''
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]
  }

  private setEditMode(id: number) {
    this.isEditMode = true
    this.patientId = Number.isNaN(id) ? null : id
    this.title = 'Editar Paciente'
    this.actionButtonText = 'Actualizar'
  }

  private setCreateMode() {
    this.isEditMode = false
    this.patientId = null
    this.title = 'Registro de Pacientes'
    this.actionButtonText = 'Guardar'
    this.patientForm.reset()
  }

  private patchForm(patient: Patient) {
    this.patientForm.patchValue({
      id: patient.idNumber,
      firstName: patient.name,
      lastName: patient.lastName,
      birthdate: this.formatDate(patient.birthDate),
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      emergencyContact: {
        name: patient.emergencyContact?.name ?? '',
        relationship: patient.emergencyContact?.relationship ?? '',
        phone: patient.emergencyContact?.phone ?? '',
        email: patient.emergencyContact?.email ?? '',
        address: patient.emergencyContact?.address ?? ''
      }
    })
  }

  private handleEditPatient( patient: FormPatient, patientId: number | null ) {
    if (patientId === null) return
    this.patientService.editPatient(patient, patientId)
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
          Swal.fire('Error', error, 'error')
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
