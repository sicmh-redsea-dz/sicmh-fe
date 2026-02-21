import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Swal from 'sweetalert2';

import { BedsService } from '../../services/beds-service/beds.service';
import { VisitsService } from '../../services/visits-service/visits.service';
import { BedModule, BedRecord, BedStatus } from '../../interface/bed-management.interface';
import { Doctor } from '../../interface/visits-response.interface';
import { ShortPatient } from '../../interface/patients-response.interface';

@Component({
  selector: 'app-beds-management-page',
  templateUrl: './beds-management-page.component.html',
  styleUrl: './beds-management-page.component.css'
})
export class BedsManagementPageComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private destroyRef = inject(DestroyRef)
  private bedsService = inject(BedsService)
  private visitsService = inject(VisitsService)
  private fb = inject(FormBuilder)

  public module: BedModule = 'hospitalization'
  public title = 'Camas'
  public subtitle = ''
  public beds: BedRecord[] = []
  public selectedBed: BedRecord | null = null
  public backRoute = 'hospitalization'

  public bedForm: FormGroup = this.fb.group({
    code: ['', [Validators.required]],
    area: [''],
    status: ['available', [Validators.required]]
  })

  public assignmentForm: FormGroup = this.fb.group({
    patient: ['', [Validators.required]],
    doctor: [''],
    reason: [''],
    notes: [''],
    expectedDischarge: [''],
    assignmentId: ['']
  })

  public doctorSearchControl = new FormControl('')
  public patientSearchControl = new FormControl('')

  public selectedDoctor: Doctor | null = null
  public selectedPatient: ShortPatient | null = null

  public searchDocResults: Doctor[] = []
  public searchPatResults: ShortPatient[] = []

  public isDocLoading = false
  public isPatLoading = false

  public showDocDropdown = false
  public showPatDropdown = false

  public statuses: { value: BedStatus; label: string }[] = [
    { value: 'available', label: 'Disponible' },
    { value: 'occupied', label: 'Ocupada' },
    { value: 'maintenance', label: 'Mantenimiento' },
    { value: 'blocked', label: 'Bloqueada' }
  ]

  ngOnInit(): void {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.module = data['module'] ?? 'hospitalization'
        this.title = data['title'] ?? 'Camas'
        this.subtitle = data['subtitle'] ?? ''
        this.backRoute = this.module
        this.loadBeds()
      })

    this.doctorSearchControl.valueChanges.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      filter((term): term is string => term !== null),
      tap((term) => {
        const cleanTerm = term.trim() || ''
        if (cleanTerm.length === 0) {
          this.assignmentForm.get('doctor')?.setValue('')
          this.searchDocResults = []
          this.showDocDropdown = false
          return
        }
        this.isDocLoading = true
        this.searchDocResults = []
      }),
      switchMap((term: string) => this.visitsService.searchDoctors(term.trim())),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (results) => {
        this.searchDocResults = results
        this.isDocLoading = false
      },
      error: () => {
        this.isDocLoading = false
      }
    })

    this.patientSearchControl.valueChanges.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      filter((term): term is string => term !== null),
      tap((term) => {
        const cleanTerm = term.trim() || ''
        if (cleanTerm.length === 0) {
          this.assignmentForm.get('patient')?.setValue('')
          this.searchPatResults = []
          this.showPatDropdown = false
          return
        }
        this.isPatLoading = true
        this.searchPatResults = []
      }),
      switchMap((term: string) => this.visitsService.searchPatients(term.trim())),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (results) => {
        this.searchPatResults = results
        this.isPatLoading = false
      },
      error: () => {
        this.isPatLoading = false
      }
    })
  }

  public loadBeds() {
    this.bedsService.getBeds(this.module)
      .subscribe({
        next: (beds) => {
          this.beds = beds
        },
        error: (err) => Swal.fire('Error', err, 'error')
      })
  }

  public selectBed(bed: BedRecord) {
    this.selectedPatient = null
    this.selectedDoctor = null
    this.selectedBed = bed
    this.bedForm.patchValue({
      code: bed.code,
      area: bed.area ?? '',
      status: bed.status
    })

    if (bed.currentAssignment) {
      this.assignmentForm.patchValue({
        patient: bed.currentAssignment.patientId,
        doctor: bed.currentAssignment.doctorId ?? '',
        reason: bed.currentAssignment.reason ?? '',
        notes: bed.currentAssignment.notes ?? '',
        expectedDischarge: bed.currentAssignment.expectedDischarge ?? '',
        assignmentId: bed.currentAssignment.assignmentId
      })
      this.patientSearchControl.setValue(bed.currentAssignment.patientName ?? '', { emitEvent: false })
      this.doctorSearchControl.setValue(bed.currentAssignment.doctorName ?? '', { emitEvent: false })
    } else {
      this.assignmentForm.reset({
        patient: '',
        doctor: '',
        reason: '',
        notes: '',
        expectedDischarge: '',
        assignmentId: ''
      })
      this.patientSearchControl.reset('', { emitEvent: false })
      this.doctorSearchControl.reset('', { emitEvent: false })
    }
  }

  public clearSelection() {
    this.selectedBed = null
    this.selectedPatient = null
    this.selectedDoctor = null
    this.bedForm.reset({
      code: '',
      area: '',
      status: 'available'
    })
    this.assignmentForm.reset({
      patient: '',
      doctor: '',
      reason: '',
      notes: '',
      expectedDischarge: '',
      assignmentId: ''
    })
    this.patientSearchControl.reset('', { emitEvent: false })
    this.doctorSearchControl.reset('', { emitEvent: false })
    this.searchDocResults = []
    this.searchPatResults = []
  }

  public saveBed() {
    if (this.bedForm.invalid) {
      this.bedForm.markAllAsTouched()
      Swal.fire('Error', 'Completa los datos de la cama.', 'error')
      return
    }

    const payload = this.bedForm.value
    if (this.selectedBed) {
      this.bedsService.updateBed(this.module, this.selectedBed.id, payload)
        .subscribe({
          next: (beds) => {
            this.beds = beds
            const updated = beds.find((b) => b.id === this.selectedBed?.id)
            if (updated) this.selectedBed = updated
            Swal.fire('Listo', 'Cama actualizada.', 'success')
          },
          error: (err) => Swal.fire('Error', err, 'error')
        })
    } else {
      this.bedsService.createBed(this.module, payload)
        .subscribe({
          next: (beds) => {
            this.beds = beds
            Swal.fire('Listo', 'Cama creada.', 'success')
            this.clearSelection()
          },
          error: (err) => Swal.fire('Error', err, 'error')
        })
    }
  }

  public assignBed() {
    if (!this.selectedBed) {
      Swal.fire('Error', 'Selecciona una cama.', 'error')
      return
    }

    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched()
      Swal.fire('Error', 'Selecciona un paciente.', 'error')
      return
    }

    const patientName = this.selectedPatient?.name || this.patientSearchControl.value || ''
    if (!patientName.trim()) {
      Swal.fire('Error', 'El nombre del paciente es requerido.', 'error')
      return
    }

    const doctorName = this.selectedDoctor?.name || this.doctorSearchControl.value || ''
    const payload = {
      assignmentId: this.assignmentForm.value.assignmentId || undefined,
      patientId: Number(this.assignmentForm.value.patient),
      patientName: patientName.trim(),
      doctorId: this.assignmentForm.value.doctor ? Number(this.assignmentForm.value.doctor) : undefined,
      doctorName: doctorName.trim() || undefined,
      reason: this.assignmentForm.value.reason?.trim() || undefined,
      notes: this.assignmentForm.value.notes?.trim() || undefined,
      expectedDischarge: this.assignmentForm.value.expectedDischarge || undefined
    }

    this.bedsService.assignBed(this.module, this.selectedBed.id, payload)
      .subscribe({
        next: (beds) => {
          this.beds = beds
          const updated = beds.find((b) => b.id === this.selectedBed?.id)
          if (updated) this.selectBed(updated)
          Swal.fire('Listo', 'Asignación actualizada.', 'success')
        },
        error: (err) => Swal.fire('Error', err, 'error')
      })
  }

  public releaseBed() {
    if (!this.selectedBed) return

    Swal.fire({
      title: 'Liberar cama',
      text: '¿Deseas liberar esta cama?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, liberar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) return

      this.bedsService.releaseBed(this.module, this.selectedBed!.id)
        .subscribe({
          next: (beds) => {
            this.beds = beds
            const updated = beds.find((b) => b.id === this.selectedBed?.id)
            if (updated) this.selectBed(updated)
            Swal.fire('Listo', 'Cama liberada.', 'success')
          },
          error: (err) => Swal.fire('Error', err, 'error')
        })
    })
  }

  public selectDoctor(doctor: Doctor) {
    this.selectedDoctor = doctor
    this.doctorSearchControl.setValue(doctor.name, { emitEvent: false })
    this.assignmentForm.get('doctor')?.setValue(doctor.id)
    this.showDocDropdown = false
  }

  public selectPatient(patient: ShortPatient) {
    this.selectedPatient = patient
    this.patientSearchControl.setValue(patient.name, { emitEvent: false })
    this.assignmentForm.get('patient')?.setValue(patient.id)
    this.showPatDropdown = false
  }

  public handleDocBlur() {
    setTimeout(() => this.showDocDropdown = false, 200)
  }

  public handlePatBlur() {
    setTimeout(() => this.showPatDropdown = false, 200)
  }

  public goBack() {
    this.router.navigateByUrl(`/dashboard/${this.backRoute}`)
  }

  public getStatusLabel(status: BedStatus) {
    return this.statuses.find((item) => item.value === status)?.label ?? status
  }
}
