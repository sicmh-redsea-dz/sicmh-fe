import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';
import { VisitsService } from '../../../services/visits-service/visits.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Doctor, FormVisit } from '../../../interface/visits-response.interface';
import { Stock } from '../../../interface/visits-service.interface'
import Swal from 'sweetalert2';

import { formatNewDate, formatIncomingData } from '../../../helpers/dateFormatters';
import { ShortPatient } from '../../../interface/patients-response.interface';

@Component({
  selector: 'app-visits-form-page-v2',
  templateUrl: './visits-form-page-v2.component.html',
  styleUrl: './visits-form-page-v2.component.css'
})
export class VisitsFormPageV2Component implements OnInit {
  public title = ''
  public subtitle = ''
  public caller = ''
  public actionButtonText = ''
  private router = inject( Router )
  private fb = inject( FormBuilder )
  public visitsService = inject( VisitsService )
  private activateRoute = inject( ActivatedRoute )

  public bmiDisabled = true;
  public selectedStockItems: Stock[] = []
  public selectedVisit = computed(() => this.visitsService.selectedVisit())
  public listOfStockItems = computed(() => this.visitsService.listOfStockItems())

  public visitForm: FormGroup = this.fb.group({
    patient     : [this.caller !== 'nv' ? this.selectedVisit()?.patientId : '', [Validators.required]],
    doctor      : [this.caller !== 'nv' ? this.selectedVisit()?.staffId : '', [Validators.required]],
    date        : [this.caller !== 'nv' ? '' : '', [Validators.required]],
    notes       : [this.caller !== 'nv' ? this.selectedVisit()?.notes : '', []],
    pressure    : [this.caller !== 'nv' ? this.selectedVisit()?.bloodPressure : '', [Validators.required]],
    oxygenation : [this.caller !== 'nv' ? this.selectedVisit()?.oxygenSaturation : '', [Validators.required]],
    temperature : [this.caller !== 'nv' ? this.selectedVisit()?.temperature : '', [Validators.required]],
    glucometry  : [this.caller !== 'nv' ? this.selectedVisit()?.glucoseLevel : '', [Validators.required]],
    weight      : [this.caller !== 'nv' ? this.selectedVisit()?.weight : '', [Validators.required]],
    height      : [this.caller !== 'nv' ? this.selectedVisit()?.height : '', [Validators.required]],
    stockItems  : this.fb.array([])
  })

  public doctorSearchControl = new FormControl()
  public patientSearchControl = new FormControl()

  public selectedDoctor: Doctor | null = null
  public selectedPatient: ShortPatient | null = null

  public searchDocResults: Doctor[] = []
  public searchPatResults: Doctor[] = []

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
        console.log('clean term :::: ', cleanTerm)
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


    this.activateRoute.url
      .pipe(
        map((urlSegment) => urlSegment),
      ).subscribe( segments => {
        let urlSegment = segments[0].path === 'new-visit' ? true : false
        if( urlSegment ) {
          this.caller = 'nv'
          this.title = 'Registro de emergencia'
          this.subtitle = 'Agrega los detalles de emergencia médica.'
          this.actionButtonText = 'Guardar'
          this.visitForm.reset();
          this.doctorSearchControl.reset();
          this.patientSearchControl.reset();
          this.visitForm.get('date')?.setValue(formatNewDate(new Date()))
        } else {
          this.title = 'Editar emergencia'
          this.subtitle = 'Actualiza los detalles de emergencia médica.'
          this.actionButtonText = 'Actualizar'
          this.visitForm.get('date')!.setValue(formatIncomingData(this.selectedVisit()?.lastVisitDate!))
          this.initializeAutocompleteValues();

        }
      })
  }

  private initializeAutocompleteValues(): void {
    // Verificar si hay una visita seleccionada y si estamos en modo edición
    if (this.caller !== 'nv' && this.selectedVisit()) {
      // Establecer valor para doctor
      if (this.selectedVisit()?.docName) {
        this.doctorSearchControl.setValue(String(this.selectedVisit()?.docName));
      }
      
      // Establecer valor para paciente
      if (this.selectedVisit()?.patientName) {
        this.patientSearchControl.setValue(String(this.selectedVisit()?.patientName));
      }
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

  get stockItemsArray(): FormArray {
    return this.visitForm.get('stockItems') as FormArray
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
        error: ( hasError ) => {
          if ( !hasError ) {

            Swal.fire('Error', 'Error al generar visita nueva', 'error')
          }
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

  public incrementQuantity(index: number) {
    const item = this.selectedStockItems[index];
    if (item.currentQuantity < item.productQuantity) {
      item.currentQuantity += 1
      this.loadDataOfStockArray()
    }
  }

  public decrementQuantity(index: number) {
    const item = this.selectedStockItems[index];
    if (item.currentQuantity > 1) {
      item.currentQuantity -= 1
      this.loadDataOfStockArray()
    } 
  }

  public handleChange(event: any) {
    const { target } = event
    const value = target.value
    if (this.selectedStockItems.length === 0){
      const existingItem = this.listOfStockItems()!.find((item: any) => item.id === parseInt(value));
      if( existingItem ) this.selectedStockItems.push({...existingItem, currentQuantity: 1});
    } 
    else {
      const existingItem = this.selectedStockItems.find((item: any) => item.id === parseInt(value));
      if (!existingItem) this.selectedStockItems.push({...this.listOfStockItems()!.find((item: any) => item.id === parseInt(value))!, currentQuantity: 1})
    }
    this.loadDataOfStockArray()
  }

  public removeListItem(id: number, idx: number) {
    this.selectedStockItems = this.selectedStockItems.filter((item) => item.id !== +id)
    this.stockItemsArray.removeAt(idx)
    this.loadDataOfStockArray()
  }

  private loadDataOfStockArray() {
    this.stockItemsArray.clear()
    this.selectedStockItems.forEach((item) => {
      this.stockItemsArray.push(
        this.fb.control(
          {id: item.id, qty: item.currentQuantity}, 
          [Validators.required]
        )
      )
    })
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
