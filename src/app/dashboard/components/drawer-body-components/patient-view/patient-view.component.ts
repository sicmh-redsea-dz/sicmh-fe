import { Component, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';

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
  public isLoading = false

  public patientId = computed(() => this.drawerService.setPatientId())

  constructor() {
    effect(() => {
      const id = this.patientId()
      if (!id) return
      this.loadPatient(id)
    })
  }

  private loadPatient(patientId: string) {
    this.isLoading = true
    this.patientsService.getPatient(patientId).subscribe({
      next: (patient) => {
        this.patient = patient
        this.isLoading = false
      },
      error: () => {
        this.patient = null
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
