import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, computed, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';
import { Doctor, FormVisit } from '../../interface/visits-response.interface';
import { VisitsService } from '../../services/visits-service/visits.service';
import { formatIncomingData, formatNewDate } from '../../../shared/utils/date-formatters';
import { Staff, Stock } from '../../interface/visits-service.interface';
import { ShortPatient } from '../../interface/patients-response.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { pressureValidator } from '../../helpers/visits-form/visits-form-page.helper';
import { AttachmentListComponent } from '../../components/attachments/attachment-list/attachment-list.component';
import { AuthService } from '../../../auth/services/auth.service';

type FormVisitWithStock = FormVisit & {
  stockItems?: { id: number; qty: number }[]
}

const CONSULTA_SUBINVENTORY_ID = 1

@Component({
  selector: 'app-visits-form-page',
  templateUrl: './visits-form-page.component.html',
  styleUrl: './visits-form-page.component.css'
})
export class VisitsFormPageComponent implements OnInit {
  @ViewChild('attachmentList') attachmentList?: AttachmentListComponent

  public title = ''
  public subtitle = ''
  public caller = ''
  public actionButtonText = ''
  private router = inject( Router )
  private fb = inject( FormBuilder )
  public visitsService = inject( VisitsService )
  private route = inject( ActivatedRoute )
  private destroyRef = inject( DestroyRef )
  private authService = inject( AuthService )

  public selectedVisit = computed(() => this.visitsService.selectedVisit())
  public listOfStockItems = computed(() => this.visitsService.listOfStockItems())
  public canManageInventory = computed(() =>
    this.authService.hasPermission('visits.inventory.manage')
  )
  public selectedStockItems: Stock[] = []
  public isSaving: boolean = false

  public visitForm: FormGroup = this.fb.group({
    ageAccordingToWeight: [''],
    BMI           : [''],
    date          : ['', [Validators.required]],
    diagnosis     : ['', [Validators.required]],
    doctor        : ['', [Validators.required]],
    fatPercentage : [''],
    glucometry    : ['', [Validators.required]],
    height        : [''],
    notes         : [''],
    oxygenation   : ['', [Validators.required]],
    patient       : ['', [Validators.required]],
    pressure      : ['', [Validators.required, pressureValidator()]],
    temperature   : ['', [Validators.required]],
    treatment     : ['', [Validators.required]],
    pathologicalHst: ['', [Validators.required]],
    familyHst     : ['', [Validators.required]],
    surgicalHst   : ['', [Validators.required]],
    backgroundHst : ['', [Validators.required]],
    visceralFat   : [''],
    weight        : [''],
    expediente    : this.fb.group({
      standard: this.fb.group({
        chiefComplaint: ['', [Validators.required]],
        currentIllness: ['', [Validators.required]],
        physicalExam: ['', [Validators.required]],
        allergies: ['', [Validators.required]],
        currentMeds: ['', [Validators.required]],
      }),
      module: this.fb.group({
        followUpPlan: ['', [Validators.required]],
        referrals: ['', [Validators.required]],
      })
    }),
    stockItems    : this.fb.array([])
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
    if ( this.canManageInventory() ) {
      this.visitsService.searchStockItems( CONSULTA_SUBINVENTORY_ID )
        .subscribe({
          error: ( err ) => {
            console.error('Error calling stock items', err)
          }
        })
    }

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
          this.selectedStockItems = []
          this.stockItemsArray.clear()
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

  get stockItemsArray(): FormArray {
    return this.visitForm.get('stockItems') as FormArray
  }

  public get idTag() : string {
    return `# ${this.selectedVisit()?.id}`
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
    this.stockItemsArray.markAsTouched()
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
    this.stockItemsArray.markAsTouched()
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

  public onHandleSubmit() {
    if (this.isSaving) return
    if (this.visitForm.invalid) {
      this.visitForm.markAllAsTouched()
      return
    }
    const visit = this.visitForm.value as FormVisitWithStock
    this.caller === 'nv'
    ? this.handleCreateVisit( visit )
    : this.handleEditVisit( visit )
  }

  public handleCreateVisit(visit: FormVisitWithStock) {
    this.isSaving = true
    this.visitsService.createVisit( visit, 'visits' )
      .subscribe({
        next: ( visitId ) => {
          this.uploadPendingAttachments(Number(visit.patient), visitId, () => {
            Swal.fire('Success', 'New visit added!', 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/visits')
              })
          })
        },
        error: ( message ) => {
          this.isSaving = false
          Swal.fire('Error', message, 'error')
        }
      })
  }

  private uploadPendingAttachments(patientId: number, recordId: number | null, done: () => void) {
    const list = this.attachmentList
    if (!list || !list.hasQueuedFiles || !patientId) {
      done()
      return
    }
    list.uploadQueued(patientId, recordId).subscribe({
      next: () => done(),
      error: (message: string) => {
        Swal.fire('Advertencia', `La visita se guardó, pero algunos archivos no se pudieron adjuntar: ${message}`, 'warning')
          .then(() => done())
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

          if ( this.canManageInventory() ) {
            this.selectedStockItems = []
            this.stockItemsArray.clear()

            if ( visit.usedInventory?.length > 0 ) {
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
              this.loadDataOfStockArray()
            }
          }
        },
        error: ( err ) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }

  public handleEditVisit( visit: FormVisitWithStock ) {
    visit.date =  visit.date.split('T')[0]
    const payload = { ...visit, origin: 'visits' }
    this.isSaving = true
    this.visitsService.editVisit(this.selectedVisit()?.id!, payload )
      .subscribe({
        next: ( visit ) => {
          if( visit ) {
            Swal.fire('Success', 'New visit edited!', 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/visits')
              })
          } else {
            this.isSaving = false
          }
        },
        error: ( message ) => {
          this.isSaving = false
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

  public onArrowKey(event: KeyboardEvent, fieldName: string) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const change = event.key === 'ArrowUp' ? 1 : -1
      const currentVal = parseInt(this.visitForm.get(fieldName)?.value || '0')
      const valueToSet = currentVal + change
      if(valueToSet > 0 && valueToSet < 100) this.visitForm.get(fieldName)?.setValue(valueToSet.toString())
    }
  }

  compareDoctors = (a: Staff, b: Staff): boolean => {
    return a && b ? a.id === b.id : a === b;
  };

}
