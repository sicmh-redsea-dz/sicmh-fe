import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, computed, inject, OnDestroy, OnInit, } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';
import { Doctor, FormVisit } from '../../interface/visits-response.interface';
import { VisitsService } from '../../services/visits-service/visits.service';
import { formatIncomingData, formatNewDate } from '../../helpers/dateFormatters';
import { Staff } from '../../interface/visits-service.interface';
import { ShortPatient } from '../../interface/patients-response.interface';

@Component({
  selector: 'app-visits-form-page',
  templateUrl: './visits-form-page.component.html',
  styleUrl: './visits-form-page.component.css'
})
export class VisitsFormPageComponent implements OnInit {
  
  public title = ''
  public subtitle = ''
  public caller = ''
  public actionButtonText = ''
  private router = inject( Router )
  private fb = inject( FormBuilder )
  public visitsService = inject( VisitsService )
  private activateRoute = inject( ActivatedRoute )

  public bmiDisabled = true;
  public selectedVisit = computed(() => this.visitsService.selectedVisit())

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

  public doctorSearchControl = new FormControl(this.caller !== 'nv' ? String(this.selectedVisit()?.docName) : '')
  public patientSearchControl = new FormControl(this.caller !== 'nv' ? String(this.selectedVisit()?.patientName) : '')

  public selectedDoctor: Doctor | null = null
  public selectedPatient: ShortPatient | null = null

  public searchDocResults: Doctor[] = []
  public searchPatResults: Doctor[] = []

  public isDocLoading: boolean = false
  public isPatLoading: boolean = false

  public showDocDropdown: boolean = false
  public showPatDropdown: boolean = false

  constructor( private route: ActivatedRoute ) {}

  ngOnInit(): void {
    this.doctorSearchControl.valueChanges.pipe(
      debounceTime( 600 ),
      distinctUntilChanged(),
      filter((term): term is string => term !== null),
      tap(( term ) => {
        const cleanTerm = term.trim() || ''
        if ( cleanTerm.length === 0 ) {
          this.visitForm.get('doctor')?.setValue(0)
          this.searchDocResults = []
          this.showDocDropdown = false
          return
        }
        this.isDocLoading = true
        this.searchDocResults = []
        
      }),
      switchMap(( term: string ) => this.visitsService.searchDoctors( term.trim() ))
    ).subscribe({
      next: ( results ) => {
        this.searchDocResults = results
        this.isDocLoading = false
      },
      error: () => {
        this.isDocLoading = false
      }
    })

    this.patientSearchControl.valueChanges.pipe(
      debounceTime( 600 ),
      distinctUntilChanged(),
      filter((term): term is string => term !== null),
      tap(( term ) => {
        const cleanTerm = term.trim() || ''
        if ( cleanTerm.length === 0 ) {
          this.visitForm.get('patient')?.setValue(0)
          this.searchPatResults = []
          this.showPatDropdown = false
          return
        }
        this.isPatLoading = true
        this.searchPatResults = []
        
      }),
      switchMap(( term: string ) => this.visitsService.searchPatients( term.trim() ))
    ).subscribe({
      next: ( results ) => {
        this.searchPatResults = results
        this.isPatLoading = false
      },
      error: () => {
        this.isPatLoading = false
      }
    })

    this.route.paramMap.subscribe( params => {
      const id = params.get('id')
      if ( !id ) return
      this.handleSelectedVisit( +id )
    })
    
    this.activateRoute.url
      .pipe(
        map((urlSegment) => urlSegment),
      ).subscribe( segments => {
        let urlSegment = segments[0].path === 'new-visit'
        if( urlSegment ) {
          this.caller = 'nv'
          this.title = 'Registro de consulta externa'
          this.subtitle = 'Agrega los detalles de la consulta externa.'
          this.actionButtonText = 'Guardar'
          this.visitForm.reset();
          this.doctorSearchControl.reset();
          this.patientSearchControl.reset();
          this.visitForm.get('date')?.setValue(formatNewDate(new Date()))
        } else {
          this.title = 'Editar consulta externa'
          this.subtitle = 'Actualiza los detalles de la consulta externa.'
          this.actionButtonText = 'Actualizar'
          this.visitForm.get('date')?.setValue(formatIncomingData(this.selectedVisit()?.lastVisitDate!))

          this.initializeAutocompleteValues();
        }
      })
  }

   private initializeAutocompleteValues(): void {
      if (this.caller !== 'nv' && this.selectedVisit()) {
        if (this.selectedVisit()?.docName)
          this.doctorSearchControl.setValue(String(this.selectedVisit()?.docName))
        
        if (this.selectedVisit()?.patientName)
          this.patientSearchControl.setValue(String(this.selectedVisit()?.patientName))
      }
    }

  public selectDoctor( doctor: Doctor ) {
    this.selectedDoctor = doctor
    this.doctorSearchControl.setValue( doctor.name, { emitEvent: false })
    this.visitForm.get('doctor')?.setValue( doctor.id )
    this.showDocDropdown = false
  }

  public selectPatient( patient: ShortPatient ) {
    this.selectedPatient = patient
    this.patientSearchControl.setValue( patient.name, { emitEvent: false })
    this.visitForm.get('patient')?.setValue( patient.id )
    this.showPatDropdown = false
  }

  public handleDocBlur() {
    setTimeout(() => this.showDocDropdown = false, 200)
  }

  public handlePatBlur() {
    setTimeout(() => this.showPatDropdown = false, 200)
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

  public handleSelectedVisit( id: number ) {
    this.visitsService.getVisit( id )
      .subscribe({
        next: () => {
          const visit = this.selectedVisit()
          if ( !visit ) return

          this.visitForm.patchValue({
            ageAccordingToWeight: visit.ageBasedOnWeight,
            BMI: visit.BMI,
            date: formatIncomingData(visit.lastVisitDate),
            diagnosis: visit.diagnosis,
            doctor: visit.staffId,
            fatPercentage: visit.bodyFatPercentage,
            glucometry: visit.glucoseLevel,
            height: visit.height,
            notes: visit.notes,
            oxygenation: visit.oxygenSaturation,
            patient: visit.patientId,
            pressure: visit.bloodPressure,
            temperature: visit.temperature,
            treatment: visit.treatment,
            pathologicalHst: visit.pathologicalHst,
            familyHst: visit.familyHst,
            surgicalHst: visit.surgicalHst,
            backgroundHst: visit.backgroundHst,
            visceralFat: visit.visceralFat,
            weight: visit.weight,
          })

          this.initializeAutocompleteValues()
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
