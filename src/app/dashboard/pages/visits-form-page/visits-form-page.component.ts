import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, computed, inject, OnInit, } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { map } from 'rxjs';
import { FormVisit } from '../../interface/visits-response.interface';
import { VisitsService } from '../../services/visits-service/visits.service';
import { formatIncomingData, formatNewDate } from '../../helpers/dateFormatters';
import { Staff } from '../../interface/visits-service.interface';

@Component({
  selector: 'app-visits-form-page',
  templateUrl: './visits-form-page.component.html',
  styleUrl: './visits-form-page.component.css'
})
export class VisitsFormPageComponent implements OnInit {
  public title = ''
  public caller = ''
  public actionButtonText = ''
  private router = inject( Router )
  private fb = inject( FormBuilder )
  public visitsService = inject( VisitsService )
  private activateRoute = inject( ActivatedRoute )

  public bmiDisabled = true;
  public selectedVisit = computed(() => this.visitsService.selectedVisit())
  public listOfDoctors = computed(() => this.visitsService.listOfDoctors())
  public listOfPatients = computed(() => this.visitsService.listOfPatients())

  public visitForm: FormGroup = this.fb.group({
    ageAccordingToWeight: [this.caller !== 'nv' ? this.selectedVisit()?.ageBasedOnWeight: '', [Validators.required]],
    BMI           : [this.caller !== 'nv' ? this.selectedVisit()?.BMI: '', [Validators.required]],
    date          : [this.caller !== 'nv' ? '': '', [Validators.required]],
    diagnosis     : [this.caller !== 'nv' ? this.selectedVisit()?.diagnosis: '', [Validators.required]],
    doctor        : [this.caller !== 'nv' ? this.selectedVisit()?.staffId : '', [Validators.required]],
    fatPercentage : [this.caller !== 'nv' ? this.selectedVisit()?.bodyFatPercentage: '', [Validators.required]],
    glucometry    : [this.caller !== 'nv' ? this.selectedVisit()?.glucoseLevel: '', [Validators.required]],
    height        : [this.caller !== 'nv' ? this.selectedVisit()?.height: '', [Validators.required]],
    notes         : [this.caller !== 'nv' ? this.selectedVisit()?.notes: ''],
    oxygenation   : [this.caller !== 'nv' ? this.selectedVisit()?.oxygenSaturation: '', [Validators.required]],
    patient       : [this.caller !== 'nv' ? this.selectedVisit()?.patientId: '', [Validators.required]],
    pressure      : [this.caller !== 'nv' ? this.selectedVisit()?.bloodPressure: '', [Validators.required]],
    temperature   : [this.caller !== 'nv' ? this.selectedVisit()?.temperature: '', [Validators.required]],
    treatment     : [this.caller !== 'nv' ? this.selectedVisit()?.treatment: '', [Validators.required]],
    pathologicalHst: [this.caller !== 'nv' ? this.selectedVisit()?.pathologicalHst: ''],
    familyHst     : [this.caller !== 'nv' ? this.selectedVisit()?.familyHst: ''],
    surgicalHst   : [this.caller !== 'nv' ? this.selectedVisit()?.surgicalHst: ''],
    backgroundHst : [this.caller !== 'nv' ? this.selectedVisit()?.backgroundHst: ''],
    visceralFat   : [this.caller !== 'nv' ? this.selectedVisit()?.visceralFat: '', [Validators.required]],
    weight        : [this.caller !== 'nv' ? this.selectedVisit()?.weight: '', [Validators.required]],
  })

  ngOnInit(): void {
    // this.visitForm.get('weight')?.valueChanges.subscribe(() => this.calculateBMI())
    this.activateRoute.url
      .pipe(
        map((urlSegment) => urlSegment),
      ).subscribe( segments => {
        let urlSegment = segments[0].path === 'new-visit' ? true : false
        if( urlSegment ) {
          this.caller = 'nv'
          this.title = 'Registro de visitas'
          this.actionButtonText = 'Guardar'
          this.visitForm.reset();
          this.visitForm.get('date')?.setValue(formatNewDate(new Date()))
        } else {
          this.title = 'Editar visita'
          this.actionButtonText = 'Editar'
          this.visitForm.get('date')?.setValue(formatIncomingData(this.selectedVisit()?.lastVisitDate!))
        }
      })
  }

  public get idTag() : string {
    return `# ${this.selectedVisit()?.id}`
  }

  public onHandleSubmit() {
    const visit = this.visitForm.value
    this.caller === 'nv'
    ? this.handleCreateVisit( visit )
    : this.handleEditVisit( visit )
  }

  public handleCreateVisit(visit: FormVisit) {
    this.visitsService.createVisit( visit, 'sp' )
      .subscribe({
        next: ( visit ) => {
          if( visit ) {
            Swal.fire('Success', 'New visit added!', 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/visits')
              })
          }
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public handleEditVisit( visit: FormVisit ) {
    visit.date =  visit.date.split('T')[0]
    this.visitsService.editVisit(this.selectedVisit()?.id!, visit )
      .subscribe({
        next: ( visit ) => {
          if( visit ) {
            Swal.fire('Success', 'New visit edited!', 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/visits')
              })
          }
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public updateValue(event: Event, change: number) {
    event.preventDefault()
    const caller = (event.target as HTMLButtonElement).getAttribute('data-caller')

    if( caller && this.visitForm.contains( caller ) ) {
      const currentVal = parseInt(this.visitForm.get(caller)?.value || '0')
      const valueToSet = currentVal + change
      if(valueToSet > 0 && valueToSet < 100) this.visitForm.get(caller)?.setValue(valueToSet.toString())
    }
  }

  compareDoctors = (a: Staff, b: Staff): boolean => {
    return a && b ? a.id === b.id : a === b;
  };

  private calculateBMI(): void {
    const weight = this.visitForm.get('weight')?.value
    const height = this.visitForm.get('height')?.value
    if (weight && height) {
      const heightInMeters = height / 100
      const bmi = weight / (heightInMeters * heightInMeters)
      this.visitForm.get('BMI')?.setValue(bmi.toFixed(2).toString())
      this.bmiDisabled = false
    } else {
      this.visitForm.get('BMI')?.setValue('')
      this.bmiDisabled = true
    }
  }

}
