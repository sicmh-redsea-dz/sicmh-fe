import { Component, computed, DestroyRef, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import { VisitsService } from '../../../services/visits-service/visits.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Doctor, FormVisit } from '../../../interface/visits-response.interface';
import { Stock } from '../../../interface/visits-service.interface'
import Swal from 'sweetalert2';

import { formatNewDate, formatIncomingData } from '../../../../shared/utils/date-formatters';
import { ShortPatient } from '../../../interface/patients-response.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { pressureValidator } from '../../../helpers/visits-form/visits-form-page.helper';

type StockItemPayload = {
  id: number
  qty: number
  subinventoryId?: number
}

type FormVisitWithStock = FormVisit & {
  stockItems?: StockItemPayload[]
}


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
  public origin = 'emergency'
  public stockSearchId = 2
  public includeSubinventoryInPayload = true
  public payloadSubinventoryId = 2
  public titleNew = 'Registro de emergencia'
  public subtitleNew = 'Agrega los detalles de emergencia médica.'
  public titleEdit = 'Editar emergencia'
  public subtitleEdit = 'Actualiza los detalles de emergencia médica.'
  private router = inject( Router )
  private fb = inject( FormBuilder )
  public visitsService = inject( VisitsService )
  private route = inject( ActivatedRoute )
  private destroyRef = inject( DestroyRef )

  public selectedStockItems: Stock[] = []
  public selectedVisit = computed(() => this.visitsService.selectedVisit())
  public listOfStockItems = computed(() => this.visitsService.listOfStockItems())

  public visitForm: FormGroup = this.fb.group({
    patient     : ['', [Validators.required]],
    doctor      : ['', [Validators.required]],
    date        : ['', [Validators.required]],
    notes       : ['', []],
    pressure    : ['', [Validators.required, pressureValidator()]],
    oxygenation : ['', [Validators.required]],
    temperature : ['', [Validators.required]],
    glucometry  : ['', [Validators.required]],
    weight      : ['', [Validators.required]],
    height      : ['', [Validators.required]],
    stockItems  : this.fb.array([])
  })

  public doctorSearchControl = new FormControl()
  public patientSearchControl = new FormControl()

  public selectedDoctor: Doctor | null = null
  public selectedPatient: ShortPatient | null = null

  public searchDocResults: Doctor[] = []
  public searchPatResults: ShortPatient[] = []

  public isDocLoading: boolean = false
  public isPatLoading: boolean = false

  public showDocDropdown: boolean = false
  public showPatDropdown: boolean = false

  ngOnInit(): void {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
      const {
        origin,
        stockSearchId,
        includeSubinventoryInPayload,
        payloadSubinventoryId,
        titleNew,
        subtitleNew,
        titleEdit,
        subtitleEdit,
      } = data;

      if (origin) this.origin = origin;
      if (stockSearchId) this.stockSearchId = stockSearchId;
      if (includeSubinventoryInPayload !== undefined) this.includeSubinventoryInPayload = includeSubinventoryInPayload;
      if (payloadSubinventoryId) this.payloadSubinventoryId = payloadSubinventoryId;
      if (titleNew) this.titleNew = titleNew;
      if (subtitleNew) this.subtitleNew = subtitleNew;
      if (titleEdit) this.titleEdit = titleEdit;
      if (subtitleEdit) this.subtitleEdit = subtitleEdit;

      if ( this.stockSearchId ) {
        this.visitsService.searchStockItems( this.stockSearchId )
          .subscribe({
            error: ( err ) => {
              console.error('Error calling stock items', err)
            }
          })
      }
    })

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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((segments) => {
        const firstSegment = segments[0]?.path;

        if (firstSegment === 'new-visit') {
          this.caller = 'nv'
          this.title = this.titleNew
          this.subtitle = this.subtitleNew
          this.actionButtonText = 'Guardar'
          this.visitForm.reset()
          this.doctorSearchControl.reset()
          this.patientSearchControl.reset()
          this.selectedStockItems = []
          this.stockItemsArray.clear()
          this.visitForm.get('date')?.setValue(formatNewDate(new Date()))
        } else if (firstSegment) {
          this.caller = 'ev'
          this.title = this.titleEdit
          this.subtitle = this.subtitleEdit
          this.actionButtonText = 'Actualizar'
        }
      })
  }

  private initializeAutocompleteValues(): void {
    if (this.caller !== 'nv' && this.selectedVisit()) {
      if (this.selectedVisit()?.docName) {
        this.doctorSearchControl.setValue(String(this.selectedVisit()?.docName));
      }
      
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
    const visit = this.visitForm.value as FormVisitWithStock

    this.caller === 'nv'
    ? this.handleCreateVisit( visit )
    : this.handleEditVisit( visit )
  }

  public handleCreateVisit(visit: FormVisitWithStock) {
    const payload: FormVisitWithStock = this.includeSubinventoryInPayload
      ? {
        ...visit,
        stockItems: visit.stockItems?.map(item => ({
          ...item,
          subinventoryId: this.payloadSubinventoryId
        })) ?? []
      }
      : visit
    
    this.visitsService.createVisit( payload, this.origin )
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

  public handleSelectedVisit( id: number ) {
    this.visitsService.getVisit(id)
      .subscribe({
        next: () => {
          const visit = this.selectedVisit()
          if ( !visit ) return

          this.visitForm.patchValue({
            patient: visit.patientId,
            doctor: visit.staffId,
            date: formatIncomingData(visit.lastVisitDate),
            notes: visit.notes,
            pressure: visit.bloodPressure,
            oxygenation: visit.oxygenSaturation,
            temperature: visit.temperature,
            glucometry: visit.glucoseLevel,
            weight: visit.weight,
            height: visit.height
          })

          this.initializeAutocompleteValues()

          this.selectedStockItems = []
          this.stockItemsArray.clear()

          if( visit.usedInventory.length > 0 ) {
            const stockItems = this.listOfStockItems() ?? []
            visit.usedInventory.forEach(( uv ) => {
              const matched = stockItems.find( i => i.id === uv.stockId )
              if ( matched ) {
                this.selectedStockItems.push({
                  ...matched,
                  currentQuantity: uv.stockQty
                })
              }
            })
          }
          
        },
        error: ( err ) => {
          Swal.fire('Error', err, 'error')
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
    const stockItems = this.listOfStockItems() ?? []
    if (this.selectedStockItems.length === 0){
      const existingItem = stockItems.find((item: any) => item.id === parseInt(value));
      if( existingItem ) this.selectedStockItems.push({...existingItem, currentQuantity: 1});
    } 
    else {
      const existingItem = this.selectedStockItems.find((item: any) => item.id === parseInt(value));
      if (!existingItem) {
        const matched = stockItems.find((item: any) => item.id === parseInt(value))
        if ( matched ) this.selectedStockItems.push({...matched, currentQuantity: 1})
      }
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

}
