import { FormBuilder, Validators } from '@angular/forms';
import { Component, DestroyRef, inject, OnInit, } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { filter, map, switchMap, tap } from 'rxjs';
import { PatientsService } from '../../services/patients-service/patients.service';
import { FormPatient, Patient } from '../../interface/patients-response.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { compressImage } from '../../../shared/utils/image-compressor';

type PatientFormValue = {
  id: string
  firstName: string
  lastName: string
  birthdate: string
  gender: string
  phone: string
  email: string
  address: string
  image: string
  notes: string
}

@Component({
  selector: 'app-patient-form-page',
  templateUrl: './patient-form-page.component.html',
  styleUrl: './patient-form-page.component.css'
})
export class PatientFormPageComponent implements OnInit {
  public title = 'Registro de Pacientes'
  public actionButtonText = 'Guardar'
  public isEditMode = false
  public imagePreviewUrl: string | null = null
  public isImageProcessing = false
  public hasStoredImage = false
  private patientId: number | null = null
  private pendingImageDataUrl: string | null = null
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
    image     : [''],
    notes     : ['']
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
        this.loadPatientImage(patient.id)
      })
  }

  public onHandleSubmit() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched()
      return
    }
    const patient: PatientFormValue = this.patientForm.getRawValue()
    this.isEditMode
      ? this.handleEditPatient(patient, this.patientId)
      : this.handleCreatePatient(patient)
  }

  public async handleImageChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      Swal.fire('Error', 'Selecciona un archivo de imagen válido.', 'error')
      input.value = ''
      return
    }

    this.isImageProcessing = true
    try {
      const { dataUrl } = await compressImage(file, {
        maxDimension: 1024,
        quality: 0.8,
        mimeType: 'image/jpeg'
      })
      this.pendingImageDataUrl = dataUrl
      this.imagePreviewUrl = dataUrl
      this.hasStoredImage = true
    } catch (err) {
      Swal.fire('Error', 'No se pudo procesar la imagen.', 'error')
    } finally {
      this.isImageProcessing = false
    }
  }

  public openImagePreview() {
    if (!this.imagePreviewUrl) return
    Swal.fire({
      title: 'Imagen del paciente',
      imageUrl: this.imagePreviewUrl,
      imageAlt: 'Foto del paciente',
      showConfirmButton: false,
      showCloseButton: true
    })
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
    this.pendingImageDataUrl = null
    this.imagePreviewUrl = null
    this.hasStoredImage = false
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
      address: patient.address
    })
  }

  private loadPatientImage(patientId: number) {
    this.patientService.getPatientImage(patientId)
      .subscribe({
        next: (dataUrl) => {
          if (!dataUrl) {
            this.hasStoredImage = false
            return
          }
          this.imagePreviewUrl = dataUrl
          this.hasStoredImage = true
        },
        error: () => {
          this.hasStoredImage = false
        }
      })
  }

  private uploadPatientImage(patientId: number, onSuccess: () => void) {
    if (!this.pendingImageDataUrl) {
      onSuccess()
      return
    }

    this.patientService.uploadPatientImage(patientId, this.pendingImageDataUrl)
      .subscribe({
        next: () => {
          this.pendingImageDataUrl = null
          onSuccess()
        },
        error: (error) => {
          Swal.fire('Error', error, 'error')
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
            this.uploadPatientImage(patient.id, () => {
              Swal.fire('Success', `${patient.name} ${patient.lastName} has been edited!`, 'success')
                .then(() => {
                  this.router.navigateByUrl('/dashboard/patients')
                })
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
            this.uploadPatientImage(patient.id, () => {
              Swal.fire('Success', `${patient.name} ${patient.lastName} has been added!`, 'success')
                .then(() => {
                  this.router.navigateByUrl('/dashboard/patients')
                })
            })
          }
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        },
      })
  }
}
