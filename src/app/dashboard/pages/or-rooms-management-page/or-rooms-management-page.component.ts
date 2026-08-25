import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Swal from 'sweetalert2';

import { OrRoomsService } from '../../services/or-rooms-service/or-rooms.service';
import { VisitsService } from '../../services/visits-service/visits.service';
import { OrRoomRecord, OrRoomStatus } from '../../interface/or-rooms.interface';
import { Doctor } from '../../interface/visits-response.interface';
import { ShortPatient } from '../../interface/patients-response.interface';
import { trackById, trackByValue } from '../../../shared/utils/track-by';

@Component({
  selector: 'app-or-rooms-management-page',
  templateUrl: './or-rooms-management-page.component.html',
  styleUrl: './or-rooms-management-page.component.css'
})
export class OrRoomsManagementPageComponent implements OnInit {
  public trackById = trackById
  public trackByValue = trackByValue
  public trackByEventId = (_: number, entry: { eventId: string }) => entry.eventId
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private destroyRef = inject(DestroyRef)
  private roomsService = inject(OrRoomsService)
  private visitsService = inject(VisitsService)
  private fb = inject(FormBuilder)

  public title = 'Quirófanos'
  public subtitle = ''
  public rooms: OrRoomRecord[] = []
  public selectedRoom: OrRoomRecord | null = null
  public backRoute = 'o-room'

  public roomForm: FormGroup = this.fb.group({
    code: ['', [Validators.required]],
    specialty: [''],
    status: ['available', [Validators.required]]
  })

  public assignmentForm: FormGroup = this.fb.group({
    patient: ['', [Validators.required]],
    doctor: [''],
    procedure: [''],
    anesthesiaType: [''],
    scheduledStart: [''],
    scheduledEnd: [''],
    notes: [''],
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

  public statuses: { value: OrRoomStatus; label: string }[] = [
    { value: 'available', label: 'Disponible' },
    { value: 'occupied', label: 'Ocupado' },
    { value: 'maintenance', label: 'Mantenimiento' },
    { value: 'blocked', label: 'Bloqueado' }
  ]

  ngOnInit(): void {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.title = data['title'] ?? 'Quirófanos'
        this.subtitle = data['subtitle'] ?? ''
        this.loadRooms()
      })

    this.doctorSearchControl.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      filter((term): term is string => term !== null),
      tap((term) => {
        const cleanTerm = term.trim() || ''
        this.assignmentForm.get('doctor')?.setValue('')
        if (cleanTerm.length < 2) {
          this.searchDocResults = []
          this.showDocDropdown = false
          this.isDocLoading = false
          return
        }
        this.isDocLoading = true
      }),
      switchMap((term: string) => term.trim().length < 2
        ? of([])
        : this.visitsService.searchDoctors(term.trim())),
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
      debounceTime(250),
      distinctUntilChanged(),
      filter((term): term is string => term !== null),
      tap((term) => {
        const cleanTerm = term.trim() || ''
        this.assignmentForm.get('patient')?.setValue('')
        if (cleanTerm.length < 2) {
          this.searchPatResults = []
          this.showPatDropdown = false
          this.isPatLoading = false
          return
        }
        this.isPatLoading = true
      }),
      switchMap((term: string) => term.trim().length < 2
        ? of([])
        : this.visitsService.searchPatients(term.trim())),
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

  public loadRooms() {
    this.roomsService.getRooms()
      .subscribe({
        next: (rooms) => {
          this.rooms = rooms
        },
        error: (err) => Swal.fire('Error', err, 'error')
      })
  }

  public selectRoom(room: OrRoomRecord) {
    this.selectedPatient = null
    this.selectedDoctor = null
    this.selectedRoom = room
    this.roomForm.patchValue({
      code: room.code,
      specialty: room.specialty ?? '',
      status: room.status
    })

    if (room.currentAssignment) {
      this.assignmentForm.patchValue({
        patient: room.currentAssignment.patientId,
        doctor: room.currentAssignment.doctorId ?? '',
        procedure: room.currentAssignment.procedure ?? '',
        anesthesiaType: room.currentAssignment.anesthesiaType ?? '',
        scheduledStart: room.currentAssignment.scheduledStart ?? '',
        scheduledEnd: room.currentAssignment.scheduledEnd ?? '',
        notes: room.currentAssignment.notes ?? '',
        assignmentId: room.currentAssignment.assignmentId
      })
      this.patientSearchControl.setValue(room.currentAssignment.patientName ?? '', { emitEvent: false })
      this.doctorSearchControl.setValue(room.currentAssignment.doctorName ?? '', { emitEvent: false })
    } else {
      this.assignmentForm.reset({
        patient: '',
        doctor: '',
        procedure: '',
        anesthesiaType: '',
        scheduledStart: '',
        scheduledEnd: '',
        notes: '',
        assignmentId: ''
      })
      this.patientSearchControl.reset('', { emitEvent: false })
      this.doctorSearchControl.reset('', { emitEvent: false })
    }
  }

  public clearSelection() {
    this.selectedRoom = null
    this.selectedPatient = null
    this.selectedDoctor = null
    this.roomForm.reset({
      code: '',
      specialty: '',
      status: 'available'
    })
    this.assignmentForm.reset({
      patient: '',
      doctor: '',
      procedure: '',
      anesthesiaType: '',
      scheduledStart: '',
      scheduledEnd: '',
      notes: '',
      assignmentId: ''
    })
    this.patientSearchControl.reset('', { emitEvent: false })
    this.doctorSearchControl.reset('', { emitEvent: false })
    this.searchDocResults = []
    this.searchPatResults = []
  }

  public saveRoom() {
    if (this.roomForm.invalid) {
      this.roomForm.markAllAsTouched()
      Swal.fire('Error', 'Completa los datos del quirófano.', 'error')
      return
    }

    const payload = this.roomForm.value
    if (this.selectedRoom) {
      this.roomsService.updateRoom(this.selectedRoom.id, payload)
        .subscribe({
          next: (rooms) => {
            this.rooms = rooms
            const updated = rooms.find((r) => r.id === this.selectedRoom?.id)
            if (updated) this.selectedRoom = updated
            Swal.fire('Listo', 'Quirófano actualizado.', 'success')
          },
          error: (err) => Swal.fire('Error', err, 'error')
        })
    } else {
      this.roomsService.createRoom(payload)
        .subscribe({
          next: (rooms) => {
            this.rooms = rooms
            Swal.fire('Listo', 'Quirófano creado.', 'success')
            this.clearSelection()
          },
          error: (err) => Swal.fire('Error', err, 'error')
        })
    }
  }

  public assignRoom() {
    if (!this.selectedRoom) {
      Swal.fire('Error', 'Selecciona un quirófano.', 'error')
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
      procedure: this.assignmentForm.value.procedure?.trim() || undefined,
      anesthesiaType: this.assignmentForm.value.anesthesiaType?.trim() || undefined,
      scheduledStart: this.assignmentForm.value.scheduledStart || undefined,
      scheduledEnd: this.assignmentForm.value.scheduledEnd || undefined,
      notes: this.assignmentForm.value.notes?.trim() || undefined
    }

    this.roomsService.assignRoom(this.selectedRoom.id, payload)
      .subscribe({
        next: (rooms) => {
          this.rooms = rooms
          const updated = rooms.find((r) => r.id === this.selectedRoom?.id)
          if (updated) this.selectRoom(updated)
          Swal.fire('Listo', 'Asignación actualizada.', 'success')
        },
        error: (err) => Swal.fire('Error', err, 'error')
      })
  }

  public releaseRoom() {
    if (!this.selectedRoom) return

    Swal.fire({
      title: 'Liberar quirófano',
      text: '¿Deseas liberar este quirófano?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, liberar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) return

      this.roomsService.releaseRoom(this.selectedRoom!.id)
        .subscribe({
          next: (rooms) => {
            this.rooms = rooms
            const updated = rooms.find((r) => r.id === this.selectedRoom?.id)
            if (updated) this.selectRoom(updated)
            Swal.fire('Listo', 'Quirófano liberado.', 'success')
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

  public getStatusLabel(status: OrRoomStatus) {
    return this.statuses.find((item) => item.value === status)?.label ?? status
  }
}
