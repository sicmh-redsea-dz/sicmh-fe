import { Component, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PatientsService } from '../../../services/patients-service/patients.service';
import { DrawerService } from '../../../services/drawer-service/drawer.service';
import { Patient } from '../../../interface/patients-response.interface';
import { DrawerContents } from '../../../interface/drawer-content.enum';

@Component({
  selector: 'app-patient-view',
  templateUrl: './patient-view.component.html',
  styleUrl: './patient-view.component.css'
})
export class PatientViewComponent {
  private patientsService = inject(PatientsService)
  private drawerService = inject(DrawerService)
  private router = inject(Router)

  public patient: Patient | null = null
  public imageUrl: string | null = null
  public isLoading = false

  public patientId = computed(() => this.drawerService.setPatientId())

  constructor() {
    effect(() => {
      const id = this.patientId()
      if (!id) return
      this.loadPatient(Number(id))
    })
  }

  private loadPatient(patientId: number) {
    this.isLoading = true
    forkJoin({
      patient: this.patientsService.getPatient(patientId),
      image: this.patientsService.getPatientImage(patientId).pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: ({ patient, image }) => {
        this.patient = patient
        this.imageUrl = image
        this.isLoading = false
      },
      error: () => {
        this.patient = null
        this.imageUrl = null
        this.isLoading = false
      }
    })
  }

  public goToEdit() {
    if (!this.patient) return
    this.drawerService.isDrawerOpen.set(false)
    this.drawerService.contentToDisplay.set(DrawerContents.NONE)
    this.drawerService.setPatientId.set('')
    this.router.navigateByUrl(`/dashboard/patients/${this.patient.id}`)
  }
}
