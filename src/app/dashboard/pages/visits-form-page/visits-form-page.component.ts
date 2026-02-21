import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, computed, DestroyRef, inject, OnInit, } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';
import { Doctor, FormVisit } from '../../interface/visits-response.interface';
import { VisitsService } from '../../services/visits-service/visits.service';
import { formatIncomingData, formatNewDate } from '../../../shared/utils/date-formatters';
import { Staff } from '../../interface/visits-service.interface';
import { ShortPatient } from '../../interface/patients-response.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { pressureValidator } from '../../helpers/visits-form/visits-form-page.helper';

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
  private route = inject( ActivatedRoute )
  private destroyRef = inject( DestroyRef )

  public selectedVisit = computed(() => this.visitsService.selectedVisit())

  public visitForm: FormGroup = this.fb.group({
    ageAccordingToWeight: ['', [Validators.required]],
    BMI           : ['', [Validators.required]],
    date          : ['', [Validators.required]],
    diagnosis     : ['', [Validators.required]],
    doctor        : ['', [Validators.required]],
    fatPercentage : ['', [Validators.required]],
    glucometry    : ['', [Validators.required]],
    height        : ['', [Validators.required]],
    notes         : [''],
    oxygenation   : ['', [Validators.required]],
    patient       : ['', [Validators.required]],
    pressure      : ['', [Validators.required, pressureValidator()]],
    temperature   : ['', [Validators.required]],
    treatment     : ['', [Validators.required]],
    pathologicalHst: [''],
    familyHst     : [''],
    surgicalHst   : [''],
    backgroundHst : [''],
    visceralFat   : ['', [Validators.required]],
    weight        : ['', [Validators.required]],
    expediente    : this.fb.group({
      standard: this.fb.group({
        chiefComplaint: ['', [Validators.required]],
        currentIllness: ['', [Validators.required]],
        physicalExam: ['', [Validators.required]],
        allergies: [''],
        currentMeds: [''],
      }),
      module: this.fb.group({
        followUpPlan: [''],
        referrals: [''],
      })
    })
  })

  public doctorSearchControl = new FormControl(this.caller !== 'nv' ? String(this.selectedVisit()?.docName) : '')
  public patientSearchControl = new FormControl(this.caller !== 'nv' ? String(this.selectedVisit()?.patientName) : '')

  public selectedDoctor: Doctor | null = null
  public selectedPatient: ShortPatient | null = null

  public searchDocResults: Doctor[] = []
  public searchPatResults: ShortPatient[] = []

  public isDocLoading: boolean = false
  public isPatLoading: boolean = false

  public showDocDropdown: boolean = false
  public showPatDropdown: boolean = false

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
      switchMap(( term: string ) => this.visitsService.searchDoctors( term.trim() )),
      takeUntilDestroyed(this.destroyRef)
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
      switchMap(( term: string ) => this.visitsService.searchPatients( term.trim() )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ( results ) => {
        this.searchPatResults = results
        this.isPatLoading = false
      },
      error: () => {
        this.isPatLoading = false
      }
    })

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe( params => {
        const id = params.get('id')
        if ( !id ) return
        this.handleSelectedVisit( +id )
      })
    
    this.route.url
      .pipe(
        map((urlSegment) => urlSegment),
        takeUntilDestroyed(this.destroyRef),
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
          this.caller = 'ev'
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
    if (this.visitForm.invalid) {
      this.visitForm.markAllAsTouched()
      return
    }
    const visit = this.visitForm.value
    this.caller === 'nv'
    ? this.handleCreateVisit( visit )
    : this.handleEditVisit( visit )
  }

  public handleCreateVisit(visit: FormVisit) {
    this.visitsService.createVisit( visit, 'visits' )
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

          if (visit.expediente) {
            this.visitForm.get('expediente')?.patchValue(visit.expediente)
          }

          this.initializeAutocompleteValues()
        },
        error: ( err ) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }

  public handleEditVisit( visit: FormVisit ) {
    visit.date =  visit.date.split('T')[0]
    const payload = { ...visit, origin: 'visits' }
    this.visitsService.editVisit(this.selectedVisit()?.id!, payload )
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

}
