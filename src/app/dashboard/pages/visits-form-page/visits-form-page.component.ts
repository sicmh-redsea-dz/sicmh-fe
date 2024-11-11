import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { map } from 'rxjs';
import { FormVisit } from '../../interface/visits-response.interface';
import { VisitsService } from '../../services/visits-service/visits.service';
import { pressureValidator } from '../../helpers/visits-form/visits-form-page.helper';

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
    patient       : [this.caller !== 'nv' ? this.selectedVisit()?.patient: '', [Validators.required]],
    doctor        : [this.caller !== 'nv' ? this.selectedVisit()?.doctor: '', [Validators.required]],
    date          : [this.caller !== 'nv' ? this.selectedVisit()?.date: '', [Validators.required]],
    diagnosis     : [this.caller !== 'nv' ? this.selectedVisit()?.diagnosis: '', [Validators.required]],
    treatment     : [this.caller !== 'nv' ? this.selectedVisit()?.treatment: '', [Validators.required]],
    notes         : [this.caller !== 'nv' ? this.selectedVisit()?.notes: '', [Validators.required]],
    pressure      : [this.caller !== 'nv' ? this.selectedVisit()?.pressure: '', [Validators.required]],
    oxygenation   : [this.caller !== 'nv' ? this.selectedVisit()?.oxygenation: '', [Validators.required]],
    temperature   : [this.caller !== 'nv' ? this.selectedVisit()?.temperature: '', [Validators.required]],
    glucometry    : [this.caller !== 'nv' ? this.selectedVisit()?.glucometry: '', [Validators.required]],
    weight        : [this.caller !== 'nv' ? this.selectedVisit()?.weight: '', [Validators.required]],
    height        : [this.caller !== 'nv' ? this.selectedVisit()?.height: '', [Validators.required]],
    BMI           : [this.caller !== 'nv' ? this.selectedVisit()?.BMI: '', [Validators.required]],
    fatPercentage : [this.caller !== 'nv' ? this.selectedVisit()?.fatPercentage: '', [Validators.required]],
    visceralFat   : [this.caller !== 'nv' ? this.selectedVisit()?.visceralFat: '', [Validators.required]],
    ageAccordingToWeight: [this.caller !== 'nv' ? this.selectedVisit()?.ageAccordingToWeight: '', [Validators.required]],
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
        } else {
          this.title = 'Editar visita'
          this.actionButtonText = 'Editar'
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
    this.visitsService.createVisit( visit )
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
