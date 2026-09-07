import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, computed, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';
import { Doctor, FormVisit } from '../../interface/visits-response.interface';
import { VisitsService } from '../../services/visits-service/visits.service';
import { formatIncomingData, formatNewDate } from '../../../shared/utils/date-formatters';
import { Staff, Stock } from '../../interface/visits-service.interface';
import { ShortPatient } from '../../interface/patients-response.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { pressureValidator } from '../../helpers/visits-form/visits-form-page.helper';
import { AttachmentListComponent } from '../../components/attachments/attachment-list/attachment-list.component';
import { trackById } from '../../../shared/utils/track-by';
import { AuthService } from '../../../auth/services/auth.service';
import { ConsentManagerComponent } from '../../components/consents/consent-manager/consent-manager.component';

type FormVisitWithStock = FormVisit & {
  stockItems?: { id: string; qty: number }[]
}

const CONSULTA_SUBINVENTORY_ID = '1'

@Component({
  selector: 'app-visits-form-page',
  templateUrl: './visits-form-page.component.html',
  styleUrl: './visits-form-page.component.css'
})
export class VisitsFormPageComponent implements OnInit {
  public trackById = trackById
  @ViewChild('attachmentList') attachmentList?: AttachmentListComponent
  @ViewChild('consentManager') consentManager?: ConsentManagerComponent

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
    date          : [''],
    diagnosis     : [''],
    doctor        : ['', [Validators.required]],
    fatPercentage : [''],
    glucometry    : [''],
    height        : [''],
    notes         : [''],
    oxygenation   : [''],
    patient       : ['', [Validators.required]],
    pressure      : ['', [pressureValidator()]],
    temperature   : [''],
    treatment     : [''],
    pathologicalHst: [''],
    familyHst     : [''],
    surgicalHst   : [''],
    backgroundHst : [''],
    visceralFat   : [''],
    weight        : [''],
    expediente    : this.fb.group({
      standard: this.fb.group({
        chiefComplaint: [''],
        currentIllness: [''],
        physicalExam: [''],
        allergies: [''],
        currentMeds: [''],
      }),
      module: this.fb.group({
        followUpPlan: [''],
        referrals: [''],
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
  public patientSearchError = ''

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
      debounceTime( 250 ),
      distinctUntilChanged(),
      filter((term): term is string => term !== null),
      tap(( term ) => {
        const cleanTerm = term.trim() || ''
        this.visitForm.get('doctor')?.setValue('')
        if ( cleanTerm.length < 2 ) {
          this.searchDocResults = []
          this.showDocDropdown = false
          this.isDocLoading = false
          return
        }
        this.isDocLoading = true
      }),
      switchMap(( term: string ) => term.trim().length < 2
        ? of([])
        : this.visitsService.searchDoctors( term.trim() )),
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
      debounceTime( 250 ),
      distinctUntilChanged(),
      filter((term): term is string => term !== null),
      tap(( term ) => {
        const cleanTerm = term.trim() || ''
        this.patientSearchError = ''
        this.visitForm.get('patient')?.setValue('')
        if ( cleanTerm.length < 2 ) {
          this.searchPatResults = []
          this.showPatDropdown = false
          this.isPatLoading = false
          return
        }
        this.isPatLoading = true
      }),
      switchMap(( term: string ) => {
        if (term.trim().length < 2) return of({ results: [] as ShortPatient[], error: '' })
        return this.visitsService.searchPatients(term.trim()).pipe(
          map((results) => ({ results, error: '' })),
          catchError((error) => of({ results: [] as ShortPatient[], error: String(error) }))
        )
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ results, error }) => {
        this.searchPatResults = results
        this.patientSearchError = error
        this.isPatLoading = false
      }
    })

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe( params => {
        const id = params.get('id')
        if ( !id ) return
        this.handleSelectedVisit( id )
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
          this.doctorSearchControl.setValue(String(this.selectedVisit()?.docName), { emitEvent: false })
        
        if (this.selectedVisit()?.patientName)
          this.patientSearchControl.setValue(String(this.selectedVisit()?.patientName), { emitEvent: false })
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
    const maxQuantity = item.productQuantity + (item.reservedQuantity ?? 0)
    if (item.currentQuantity < maxQuantity) {
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
      const existingItem = stockItems.find((item: any) => item.id === value);
      if( existingItem ) this.selectedStockItems.push({...existingItem, currentQuantity: 1});
    }
    else {
      const existingItem = this.selectedStockItems.find((item: any) => item.id === value);
      if (!existingItem) {
        const matched = stockItems.find((item: any) => item.id === value)
        if ( matched ) this.selectedStockItems.push({...matched, currentQuantity: 1})
      }
    }
    this.loadDataOfStockArray()
  }

  public removeListItem(id: string, idx: number) {
    this.selectedStockItems = this.selectedStockItems.filter((item) => item.id !== id)
    this.stockItemsArray.removeAt(idx)
    this.stockItemsArray.markAsTouched()
    this.loadDataOfStockArray()
  }

  private loadDataOfStockArray() {
    this.stockItemsArray.clear()
    this.selectedStockItems.forEach((item) => {
      this.stockItemsArray.push(
        this.fb.control(
          {id: item.id, qty: item.currentQuantity}
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
          if (!visitId) {
            this.isSaving = false
            Swal.fire('Error', 'La visita se guardó sin devolver un identificador válido.', 'error')
            return
          }
          this.uploadPendingAttachments(visit.patient, visitId, () => {
            this.finalizePendingConsents(visitId, () => {
              Swal.fire('Success', 'New visit added!', 'success')
                .then(() => this.router.navigateByUrl(`/dashboard/visits/edit-visit/${visitId}`))
            })
          })
        },
        error: ( message ) => {
          this.isSaving = false
          Swal.fire('Error', message, 'error')
        }
      })
  }

  private finalizePendingConsents(visitId: string, done: () => void) {
    const manager = this.consentManager
    if (!manager?.hasQueuedConsents) { done(); return }
    manager.finalizeQueued(visitId).subscribe({
      next: () => done(),
      error: (message: string) => Swal.fire('Advertencia', `La visita se guardó, pero no se pudo adjuntar el consentimiento: ${message}`, 'warning').then(() => done())
    })
  }

  private uploadPendingAttachments(patientId: string, recordId: string | null, done: () => void) {
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

  public handleSelectedVisit( id: string ) {
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
                    currentQuantity: uv.stockQty,
                    reservedQuantity: uv.stockQty
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
    visit.date = (visit.date || formatNewDate(new Date())).split('T')[0]
    const payload = { ...visit, origin: 'visits' }
    this.isSaving = true
    this.visitsService.editVisit(this.selectedVisit()?.id!, payload )
      .subscribe({
        next: ( visit ) => {
          if( visit ) {
            this.isSaving = false
            Swal.fire('Success', 'New visit edited!', 'success')
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
