import { FormBuilder, Validators } from '@angular/forms';
import { Component, DestroyRef, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { Subscription, filter, interval, map, switchMap, tap } from 'rxjs';
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
  @ViewChild('imageInput') private imageInputRef?: ElementRef<HTMLInputElement>

  public title = 'Registro de Pacientes'
  public actionButtonText = 'Guardar'
  public isEditMode = false
  public imagePreviewUrl: string | null = null
  public isImageProcessing = false
  public isQrProcessing = false
  public hasStoredImage = false
  public selectedImageName: string | null = null
  private patientId: number | null = null
  private storedImageUrl: string | null = null
  private pendingImageDataUrl: string | null = null
  private qrPollingSub: Subscription | null = null
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
      this.resetImageInput()
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
      this.selectedImageName = file.name
      this.hasStoredImage = true
    } catch (err) {
      Swal.fire('Error', 'No se pudo procesar la imagen.', 'error')
    } finally {
      this.isImageProcessing = false
    }
  }

  public triggerImageSelect() {
    this.imageInputRef?.nativeElement.click()
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

  public removeImage() {
    if (this.pendingImageDataUrl) {
      this.pendingImageDataUrl = null
      this.resetImageInput()
      if (this.storedImageUrl) {
        this.imagePreviewUrl = this.storedImageUrl
        this.selectedImageName = 'Imagen guardada'
        this.hasStoredImage = true
        return
      }
      this.imagePreviewUrl = null
      this.selectedImageName = null
      this.hasStoredImage = false
      return
    }

    if (this.isEditMode && this.patientId && this.storedImageUrl) {
      this.patientService.deletePatientImage(this.patientId)
        .subscribe({
          next: () => {
            this.storedImageUrl = null
            this.imagePreviewUrl = null
            this.selectedImageName = null
            this.hasStoredImage = false
            this.resetImageInput()
          },
          error: (error) => {
            Swal.fire('Error', error, 'error')
          }
        })
      return
    }

    this.imagePreviewUrl = null
    this.selectedImageName = null
    this.hasStoredImage = false
    this.resetImageInput()
  }

  public openQrCapture() {
    if (this.isQrProcessing) return
    this.isQrProcessing = true

    this.patientService.createImageCaptureSession()
      .subscribe({
        next: (session) => {
          this.isQrProcessing = false
          Swal.fire({
            title: 'Escanea el QR',
            text: 'Usa tu teléfono para tomar la foto.',
            imageUrl: session.qrDataUrl,
            imageAlt: 'Código QR',
            footer: session.captureUrl,
            showConfirmButton: false,
            showCloseButton: true,
            didOpen: () => {
              this.startQrPolling(session.token)
            },
            willClose: () => {
              this.stopQrPolling()
              this.clearQrSession(session.token)
            }
          })
        },
        error: (error) => {
          this.isQrProcessing = false
          Swal.fire('Error', error, 'error')
        }
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
    this.pendingImageDataUrl = null
    this.storedImageUrl = null
    this.imagePreviewUrl = null
    this.selectedImageName = null
    this.hasStoredImage = false
    this.resetImageInput()
  }

  private setCreateMode() {
    this.isEditMode = false
    this.patientId = null
    this.title = 'Registro de Pacientes'
    this.actionButtonText = 'Guardar'
    this.patientForm.reset()
    this.pendingImageDataUrl = null
    this.storedImageUrl = null
    this.imagePreviewUrl = null
    this.selectedImageName = null
    this.hasStoredImage = false
    this.resetImageInput()
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
            this.storedImageUrl = null
            if (!this.pendingImageDataUrl) {
              this.imagePreviewUrl = null
              this.selectedImageName = null
              this.hasStoredImage = false
            }
            return
          }
          this.storedImageUrl = dataUrl
          this.imagePreviewUrl = this.pendingImageDataUrl ?? dataUrl
          if (!this.pendingImageDataUrl) {
            this.selectedImageName = 'Imagen guardada'
          }
          this.hasStoredImage = true
        },
        error: () => {
          this.storedImageUrl = null
          if (!this.pendingImageDataUrl) {
            this.imagePreviewUrl = null
            this.selectedImageName = null
            this.hasStoredImage = false
          }
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

  private startQrPolling(token: string) {
    this.stopQrPolling()
    this.qrPollingSub = interval(2000)
      .pipe(
        switchMap(() => this.patientService.getImageCaptureSession(token)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (session) => {
          if (session.status !== 'uploaded' || !session.image?.dataUrl) return
          this.applyCapturedImage(session.image.dataUrl, session.image.fileName)
          Swal.close()
        },
        error: () => {
          this.stopQrPolling()
        }
      })
  }

  private stopQrPolling() {
    this.qrPollingSub?.unsubscribe()
    this.qrPollingSub = null
  }

  private applyCapturedImage(dataUrl: string, fileName?: string) {
    this.pendingImageDataUrl = dataUrl
    this.imagePreviewUrl = dataUrl
    this.selectedImageName = fileName || 'Foto desde QR'
    this.hasStoredImage = true
    this.resetImageInput()
  }

  private clearQrSession(token: string) {
    this.patientService.deleteImageCaptureSession(token)
      .subscribe({
        next: () => undefined,
        error: () => undefined
      })
  }

  private resetImageInput() {
    this.patientForm.get('image')?.reset()
    if (this.imageInputRef) {
      this.imageInputRef.nativeElement.value = ''
    }
  }
}
