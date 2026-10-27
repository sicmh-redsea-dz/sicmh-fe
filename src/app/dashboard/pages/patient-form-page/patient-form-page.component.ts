import { formatApiError } from '../../../shared/utils/api-error';
import { FormDraftService } from '../../../shared/services/form-draft.service';
import { FormDraft } from '../../../shared/services/form-draft';
import { ageInYears } from '../../../shared/utils/age-in-years';
import { AbstractControl, FormBuilder, ValidatorFn, Validators } from '@angular/forms';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { filter, map, switchMap, tap } from 'rxjs';
import { PatientsService } from '../../services/patients-service/patients.service';
import { FormPatient, IdentificationType, Patient } from '../../interface/patients-response.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const optionalEmail: ValidatorFn = control => Validators.email({ value: typeof control.value === 'string' ? control.value.trim() : control.value } as AbstractControl)

@Component({
  selector: 'app-patient-form-page',
  templateUrl: './patient-form-page.component.html',
  styleUrl: './patient-form-page.component.css'
})
export class PatientFormPageComponent implements OnInit {
  public isSaving = false
  public draft?: FormDraft
  private draftService = inject(FormDraftService)
  private saveCheckpoint?: string
  private startDraft() {
    this.draft?.dispose()
    this.draft = this.draftService.open({ scope: `patient:${this.patientId ?? 'new'}`,
      changes: this.patientForm.valueChanges, snapshot: () => this.patientForm.getRawValue(),
      restore: data => { this.patientForm.patchValue(data); this.updateIdentificationValidators() }, destroyRef: this.destroyRef })
  }

  public title = 'Registro de Pacientes'
  public actionButtonText = 'Guardar'
  public isEditMode = false
  private patientId: string | null = null
  private fb = inject( FormBuilder ).nonNullable
  private router = inject( Router )
  private activeRoute = inject( ActivatedRoute )
  private patientService = inject( PatientsService )
  private destroyRef = inject( DestroyRef )

  public patientForm = this.fb.group({
    identificationType: this.fb.control<IdentificationType>('identidad'),
    id        : ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]+$/)]],
    firstName : ['', [Validators.required, Validators.minLength(2)]],
    lastName  : ['', [Validators.required, Validators.minLength(2)]],
    birthdate : ['', [Validators.required]],
    gender    : ['', [Validators.required]],
    phone     : [''],
    email     : ['', [optionalEmail]],
    address   : [''],
    notes     : [''],
    emergencyContact: this.fb.group({
      name: [''],
      relationship: [''],
      phone: [''],
      email: ['', [optionalEmail]],
      address: ['']
    })
  })

  public get patientAge(): number | null { return ageInYears(this.patientForm.controls.birthdate.value) }
  public get identificationMaxLength(): number {
    return this.patientForm.controls.identificationType.value === 'identidad' ? 13
      : this.patientForm.controls.identificationType.value === 'carne_residencia' ? 19 : 50
  }
  public get identificationHint(): string {
    const type = this.patientForm.controls.identificationType.value
    return type === 'identidad' ? 'Exactamente 13 d\u00edgitos num\u00e9ricos.'
      : type === 'carne_residencia' ? 'Solo n\u00fameros, hasta 19 d\u00edgitos.' : 'Letras y n\u00fameros, hasta 50 caracteres.'
  }
  private updateIdentificationValidators() {
    const type = this.patientForm.controls.identificationType.value
    const pattern = type === 'identidad' ? /^\d{13}$/ : type === 'carne_residencia' ? /^\d{1,19}$/ : /^[A-Za-z0-9]{1,50}$/
    this.patientForm.controls.id.setValidators([Validators.required, Validators.pattern(pattern)])
    this.patientForm.controls.id.updateValueAndValidity({ emitEvent: false })
  }

  ngOnInit(): void {
    this.updateIdentificationValidators()
    this.patientForm.controls.identificationType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateIdentificationValidators())
    this.activeRoute.paramMap
      .pipe(
        map((params) => params.get('id')),
        tap((id) => {
          if (id)
            this.setEditMode(id)
          else
            this.setCreateMode()
        }),
        filter((id): id is string => id !== null),
        switchMap((id) => this.patientService.getPatient(id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((patient) => {
        if (!patient) return
        this.patchForm(patient)
        this.startDraft()
      })
  }

  public onHandleSubmit() {
    if (this.isSaving) return
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched()
      return
    }
    this.isSaving = true
    this.saveCheckpoint = this.draft?.checkpoint()
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

  private setEditMode(id: string) {
    this.draft?.dispose()
    this.isEditMode = true
    this.patientId = id.trim() ? id : null
    this.title = 'Editar Paciente'
    this.actionButtonText = 'Actualizar'
  }

  private setCreateMode() {
    this.isEditMode = false
    this.patientId = null
    this.title = 'Registro de Pacientes'
    this.actionButtonText = 'Guardar'
    this.draft?.dispose()
    this.patientForm.reset()
    this.startDraft()
  }

  private patchForm(patient: Patient) {
    this.patientForm.patchValue({
      id: patient.idNumber,
      identificationType: patient.identificationType ?? 'identidad',
      firstName: patient.name,
      lastName: patient.lastName,
      birthdate: this.formatDate(patient.birthDate),
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email ?? '',
      address: patient.address,
      notes: patient.notes ?? '',
      emergencyContact: {
        name: patient.emergencyContact?.name ?? '',
        relationship: patient.emergencyContact?.relationship ?? '',
        phone: patient.emergencyContact?.phone ?? '',
        email: patient.emergencyContact?.email ?? '',
        address: patient.emergencyContact?.address ?? ''
      }
    })
  }

  private showSaveError(error: any) {
    const duplicate = error?.error?.code === 'PATIENT_IDENTIFICATION_EXISTS'
    if (duplicate) {
      this.patientForm.controls.id.setErrors({ ...this.patientForm.controls.id.errors, duplicate: true })
      this.patientForm.controls.id.markAsTouched()
    }
    const validation = error?.status === 400 || error?.status === 422
    const message = duplicate || validation ? formatApiError(error)
      : error?.status === 0 ? 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.'
      : 'No se pudo guardar el paciente. Tus datos permanecen en el formulario. Intenta nuevamente en unos momentos.'
    void Swal.fire({
      icon: duplicate || validation ? 'warning' : 'error',
      title: duplicate ? 'Identificación ya registrada' : validation ? 'Revisa los datos del paciente' : 'No se pudo guardar el paciente',
      text: message,
      confirmButtonText: 'Revisar formulario',
    }).then(() => {
      if (duplicate) document.querySelector<HTMLInputElement>('[formControlName="id"]')?.focus()
    })
  }

  private handleEditPatient( patient: FormPatient, patientId: string | null ) {
    const submittedDraft = this.draft
    const checkpoint = this.saveCheckpoint
    if (patientId === null) return
    this.patientService.editPatient(patient, patientId)
      .subscribe({
        next: (editedUser) => {
          this.isSaving = false
          if( editedUser ) {
            submittedDraft?.committed(checkpoint)
            const { patient } = editedUser.data
            Swal.fire('Success', `${patient.name} ${patient.lastName} has been edited!`, 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/patients')
              })
          }
        },
        error: ( error ) => {
          this.isSaving = false
          this.showSaveError(error)
        },
      })
  }

  private handleCreatePatient( patient: FormPatient ) {
    const submittedDraft = this.draft
    this.patientService.savePatient(patient)
      .subscribe({
        next: (addedUser) => {
          this.isSaving = false
          if( addedUser ) {
            submittedDraft?.committed()
            submittedDraft?.dispose()
            const { patient } = addedUser?.data
            Swal.fire('Success', `${patient.name} ${patient.lastName} has been added!`, 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/patients')
              })
          }
        },
        error: (message) => {
          this.isSaving = false
          this.showSaveError(message)
        },
      })
  }

}
