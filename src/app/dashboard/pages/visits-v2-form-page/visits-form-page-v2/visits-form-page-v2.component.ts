import { clinicalDateTimeInput, clinicalDatesForApi } from '../../../helpers/visits-form/clinical-dates';
import { FormDraftService } from '../../../../shared/services/form-draft.service';
import { FormDraft } from '../../../../shared/services/form-draft';
import { ageInYears } from '../../../../shared/utils/age-in-years';
import { doctorSuggestions } from '../../../helpers/visits-form/doctor-autocomplete'
import { Component, computed, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, filter, map, merge, of, Subject, Subscription, switchMap, tap } from 'rxjs';
import { VisitsService } from '../../../services/visits-service/visits.service';
import { BedsService } from '../../../services/beds-service/beds.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Doctor, FormVisit } from '../../../interface/visits-response.interface';
import { Stock } from '../../../interface/visits-service.interface'
import Swal from 'sweetalert2';

import { formatNewDate, formatIncomingData } from '../../../../shared/utils/date-formatters';
import { ShortPatient } from '../../../interface/patients-response.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { pressureValidator } from '../../../helpers/visits-form/visits-form-page.helper';
import { BedRecord, BedModule } from '../../../interface/bed-management.interface';
import { AttachmentListComponent } from '../../../components/attachments/attachment-list/attachment-list.component';
import { trackById } from '../../../../shared/utils/track-by';
import { ConsentManagerComponent } from '../../../components/consents/consent-manager/consent-manager.component';

type StockItemPayload = {
  id: string
  qty: number
  subinventoryId?: string
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
  public trackById = trackById
  @ViewChild('attachmentList') attachmentList?: AttachmentListComponent
  @ViewChild('consentManager') consentManager?: ConsentManagerComponent

  public draft?: FormDraft
  private draftService = inject(FormDraftService)
  private saveCheckpoint?: string
  private visitRequest?: Subscription
  private startDraft(id: string | null = null) {
    this.draft?.dispose()
    this.draft = this.draftService.open({
      scope: `visit:${this.origin}:${id ?? 'new'}`,
      changes: this.visitForm.valueChanges,
      snapshot: () => ({ form: this.visitForm.getRawValue(), selectedPatient: this.selectedPatient,
        selectedDoctor: this.selectedDoctor, doctorSearch: this.doctorSearchControl.value,
        patientSearch: this.patientSearchControl.value, selectedStockItems: this.selectedStockItems, bedSearch: this.bedSearchControl.value }),
      restore: data => {
        if (!data?.form) return
        this.visitForm.patchValue(data.form, { emitEvent: false })
        this.selectedPatient = data.selectedPatient ?? null; this.selectedDoctor = data.selectedDoctor ?? null
        this.doctorSearchControl.setValue(data.doctorSearch || '', { emitEvent: false })
        this.patientSearchControl.setValue(data.patientSearch || '', { emitEvent: false })
        this.selectedStockItems = data.selectedStockItems ?? []
        this.loadDataOfStockArray()
        this.bedSearchControl.setValue(data.bedSearch || '', { emitEvent: false }); this.syncBedFromForm()
      }, destroyRef: this.destroyRef,
    })
  }

  public title = ''
  public subtitle = ''
  public caller = ''
  public actionButtonText = ''
  public origin = 'emergency'
  public stockSearchId: string = 'emergency'
  public includeSubinventoryInPayload = true
  public payloadSubinventoryId = 'emergency'
  public backRoute = 'emergency'
  public titleNew = 'Registro de emergencia'
  public subtitleNew = 'Agrega los detalles de emergencia médica.'
  public titleEdit = 'Editar emergencia'
  public subtitleEdit = 'Actualiza los detalles de emergencia médica.'
  private router = inject( Router )
  private fb = inject( FormBuilder )
  public visitsService = inject( VisitsService )
  private bedsService = inject( BedsService )
  private route = inject( ActivatedRoute )
  private destroyRef = inject( DestroyRef )

  public selectedStockItems: Stock[] = []
  public selectedVisit = computed(() => this.visitsService.selectedVisit())
  public listOfStockItems = computed(() => this.visitsService.listOfStockItems())

  public visitForm: FormGroup = this.fb.group({
    patient     : ['', [Validators.required]],
    doctor      : ['', [Validators.required]],
    date        : [''],
    notes       : [''],
    pressure    : ['', [pressureValidator()]],
    oxygenation : [''],
    temperature : [''],
    glucometry  : [''],
    weight      : [''],
    height      : [''],
    BMI         : [''],
    fatPercentage: [''],
    visceralFat : [''],
    ageAccordingToWeight: [''],
    diagnosis   : [''],
    treatment   : [''],
    pathologicalHst: [''],
    familyHst   : [''],
    surgicalHst : [''],
    backgroundHst: [''],
    expediente  : this.fb.group({
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
        triageLevel: [''],
        arrivalMode: [''],
        painScale: [''],
        glasgow: [''],
        disposition: [''],
        injuryMechanism: [''],
        preOpDiagnosis: [''],
        postOpDiagnosis: [''],
        procedure: [''],
        anesthesiaType: [''],
        surgeryStart: [''],
        surgeryEnd: [''],
        findings: [''],
        complications: [''],
        admissionDiagnosis: [''],
        admissionReason: [''],
        service: [''],
        bed: [''],
        evolutionSummary: [''],
        dischargePlan: [''],
        dischargeDate: [''],
      })
    }),
    stockItems  : this.fb.array([])
  })

  public doctorSearchControl = new FormControl()
  public patientSearchControl = new FormControl()
  public bedSearchControl = new FormControl('')

  public selectedDoctor: Doctor | null = null
  public selectedPatient: ShortPatient | null = null
  public get patientAge(): number | null {
    return ageInYears(this.selectedPatient?.birthDate)
  }
  public selectedBed: BedRecord | null = null

  public searchDocResults: Doctor[] = []
  public searchPatResults: ShortPatient[] = []
  public bedResults: BedRecord[] = []
  public availableBeds: BedRecord[] = []
  public allBeds: BedRecord[] = []

  public isDocLoading: boolean = false
  public isPatLoading: boolean = false
  public patientSearchError = ''
  public isBedLoading: boolean = false
  public isSaving: boolean = false

  private readonly doctorFocus = new Subject<string>()
  private doctorFocused = false
  public doctorSearchError = ''
  public showDocDropdown: boolean = false
  public showPatDropdown: boolean = false
  public showBedDropdown: boolean = false

  private bedModule: BedModule | null = null

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
      if (stockSearchId) this.stockSearchId = String(stockSearchId);
      if (includeSubinventoryInPayload !== undefined) this.includeSubinventoryInPayload = includeSubinventoryInPayload;
      if (payloadSubinventoryId) this.payloadSubinventoryId = String(payloadSubinventoryId);
      if (titleNew) this.titleNew = titleNew;
      if (subtitleNew) this.subtitleNew = subtitleNew;
      if (titleEdit) this.titleEdit = titleEdit;
      if (subtitleEdit) this.subtitleEdit = subtitleEdit;

      this.backRoute = this.resolveBackRoute(this.origin)
      this.applyModuleValidators()
      this.bedModule = this.origin === 'hospitalization' ? 'hospitalization' : null
      if (this.bedModule) {
        this.loadBeds()
      }

      if ( this.stockSearchId ) {
        this.visitsService.searchStockItems( this.stockSearchId )
          .subscribe({
            error: ( err ) => {
              console.error('Error calling stock items', err)
            }
          })
      }
    })

    doctorSuggestions(merge(
      this.doctorSearchControl.valueChanges.pipe(tap(() => {
        this.selectedDoctor = null
        this.visitForm.get('doctor')?.setValue('')
      })),
      this.doctorFocus,
    ), (term) => this.visitsService.searchDoctors(term))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ results, loading, error }) => {
        this.searchDocResults = results
        this.isDocLoading = loading
        this.doctorSearchError = error
        this.showDocDropdown = this.doctorFocused
      })

    this.patientSearchControl.valueChanges.pipe(
      tap(() => {
        this.selectedPatient = null
        this.visitForm.get('patient')?.setValue('')
      }),
      debounceTime( 250 ),
      distinctUntilChanged(),
      filter((term): term is string => term !== null),
      tap(( term ) => {
        const cleanTerm = term.trim() || ''
        this.patientSearchError = ''
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

    this.bedSearchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((term) => {
      this.handleBedSearch(String(term ?? ''))
    })

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe( params => {
        this.visitRequest?.unsubscribe()
        this.draft?.dispose(); this.draft = undefined
        const id = params.get('id')
        if ( !id ) return
        this.handleSelectedVisit( id )
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
          this.bedSearchControl.reset()
          this.selectedBed = null
          this.selectedStockItems = []
          this.stockItemsArray.clear()
          this.visitForm.get('date')?.setValue(formatNewDate(new Date()))
          this.startDraft()
        } else if (firstSegment) {
          this.caller = 'ev'
          this.title = this.titleEdit
          this.subtitle = this.subtitleEdit
          this.actionButtonText = 'Actualizar'
        }
      })
  }

  private resolveBackRoute(origin: string): string {
    return origin === 'oroom' ? 'o-room' : origin
  }

  private applyModuleValidators() {
    const moduleGroup = this.visitForm.get('expediente.module') as FormGroup
    if (!moduleGroup) return

    const moduleFields = [
      'followUpPlan',
      'referrals',
      'triageLevel',
      'arrivalMode',
      'painScale',
      'glasgow',
      'disposition',
      'injuryMechanism',
      'preOpDiagnosis',
      'postOpDiagnosis',
      'procedure',
      'anesthesiaType',
      'surgeryStart',
      'surgeryEnd',
      'findings',
      'complications',
      'admissionDiagnosis',
      'admissionReason',
      'service',
      'bed',
      'evolutionSummary',
      'dischargePlan',
      'dischargeDate',
    ]

    moduleFields.forEach((field) => {
      const control = moduleGroup.get(field)
      if (control) {
        control.clearValidators()
        control.updateValueAndValidity({ emitEvent: false })
      }
    })

    if (this.origin === 'hospitalization') {
      const bedControl = moduleGroup.get('bed')
      bedControl?.setValidators([this.bedSelectionValidator()])
      bedControl?.updateValueAndValidity({ emitEvent: false })
    }
  }

  private bedSelectionValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) return null
      if (!this.selectedBed) return { invalidBed: true }
      if (this.selectedBed.code !== control.value) return { invalidBed: true }
      return null
    }
  }

  private loadBeds() {
    if (!this.bedModule) return
    this.isBedLoading = true
    this.bedsService.getBeds(this.bedModule)
      .subscribe({
        next: (beds) => {
          this.allBeds = beds
          this.availableBeds = beds.filter((bed) => bed.status === 'available')
          this.isBedLoading = false
          this.syncBedFromForm()
        },
        error: (err) => {
          this.isBedLoading = false
          console.error('beds load error', err)
        }
      })
  }

  private syncBedFromForm() {
    const bedValue = this.visitForm.get('expediente.module.bed')?.value
    if (!bedValue) return
    const match = this.allBeds.find((bed) => bed.code === bedValue)
    if (match) {
      this.selectedBed = match
      this.bedSearchControl.setValue(match.code, { emitEvent: false })
    }
  }

  private handleBedSearch(term: string) {
    const cleanTerm = term.trim().toLowerCase()
    if (!cleanTerm) {
      this.bedResults = []
      this.showBedDropdown = false
      if (this.selectedBed) {
        this.selectedBed = null
        this.visitForm.get('expediente.module.bed')?.setValue('', { emitEvent: false })
        this.visitForm.get('expediente.module.bed')?.updateValueAndValidity({ emitEvent: false })
      }
      return
    }
    if (this.selectedBed && this.selectedBed.code !== term) {
      this.selectedBed = null
      this.visitForm.get('expediente.module.bed')?.setValue('', { emitEvent: false })
    }
    this.bedResults = this.availableBeds.filter((bed) => {
      const haystack = `${bed.code} ${bed.area ?? ''}`.toLowerCase()
      return haystack.includes(cleanTerm)
    })
    this.showBedDropdown = true
  }

  public selectBed(bed: BedRecord) {
    this.selectedBed = bed
    this.visitForm.get('expediente.module.bed')?.setValue(bed.code)
    this.visitForm.get('expediente.module.bed')?.updateValueAndValidity({ emitEvent: false })
    this.visitForm.get('expediente.module.bed')?.markAsTouched()
    this.bedSearchControl.setValue(bed.code, { emitEvent: false })
    this.bedResults = []
    this.showBedDropdown = false
  }

  public handleBedBlur() {
    setTimeout(() => {
      this.showBedDropdown = false
      this.visitForm.get('expediente.module.bed')?.markAsTouched()
    }, 200)
  }

  public get showCreateBed(): boolean {
    const term = (this.bedSearchControl.value ?? '').toString().trim()
    return !!this.bedModule && term.length > 1 && this.bedResults.length === 0
  }

  public goToBedsManagement() {
    if (!this.bedModule) return
    this.saveDraft()
    const returnUrl = this.router.url.includes('?')
      ? `${this.router.url}&draft=1`
      : `${this.router.url}?draft=1`
    this.router.navigate(['/dashboard', this.bedModule, 'beds'], {
      queryParams: { returnUrl }
    })
  }

  private initializeAutocompleteValues(): void {
    if (this.caller !== 'nv' && this.selectedVisit()) {
      if (this.selectedVisit()?.docName) {
        this.doctorSearchControl.setValue(String(this.selectedVisit()?.docName), { emitEvent: false });
      }
      
      if (this.selectedVisit()?.patientName) {
        this.patientSearchControl.setValue(String(this.selectedVisit()?.patientName), { emitEvent: false });
      }
    }
  }

  public selectDoctor( doctor: Doctor ) {
    this.doctorFocused = false
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

  public handleDocFocus() {
    this.doctorFocused = true
    this.showDocDropdown = true
    this.doctorFocus.next(this.doctorSearchControl.value ?? '')
  }

  public handleDocBlur() {
    this.doctorFocused = false
    setTimeout(() => {
      if (!this.doctorFocused) this.showDocDropdown = false
    }, 200)
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
    if (this.isSaving) return
    if (this.visitForm.invalid) {
      this.visitForm.markAllAsTouched()
      return
    }
    this.saveCheckpoint = this.draft?.checkpoint()
    const visit = this.visitForm.value as FormVisitWithStock
    if (visit.expediente) visit.expediente = {
      ...visit.expediente, module: clinicalDatesForApi(visit.expediente.module),
    }

    this.caller === 'nv'
    ? this.handleCreateVisit( visit )
    : this.handleEditVisit( visit )
  }

  public handleCreateVisit(visit: FormVisitWithStock) {
    const submittedDraft = this.draft
    const payload: FormVisitWithStock = this.includeSubinventoryInPayload
      ? {
        ...visit,
        stockItems: visit.stockItems?.map(item => ({
          ...item,
          subinventoryId: this.payloadSubinventoryId
        })) ?? []
      }
      : visit

    this.isSaving = true
    this.visitsService.createVisit( payload, this.origin )
      .subscribe({
        next: ( visitId ) => {
          if (!visitId) {
            this.isSaving = false
            Swal.fire('Error', 'La visita se guardó sin devolver un identificador válido.', 'error')
            return
          }
          submittedDraft?.committed()
          submittedDraft?.dispose()
          this.uploadPendingAttachments(payload.patient, visitId, () => {
            this.finalizePendingConsents(visitId, () => {
              Swal.fire('Success', 'New visit added!', 'success')
                .then(() => {
                  this.router.navigateByUrl(`/dashboard/${this.backRoute}/edit-visit/${visitId}`)
                })
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
    this.visitRequest?.unsubscribe()
    this.visitRequest = this.visitsService.getVisit(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const visit = this.selectedVisit()
          if ( !visit || this.route.snapshot.paramMap.get('id') !== id ) return
          this.selectedPatient = { id: visit.patientId, name: visit.patientName, birthDate: visit.patientBirthDate }

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
            height: visit.height,
            BMI: visit.BMI,
            fatPercentage: visit.bodyFatPercentage,
            visceralFat: visit.visceralFat,
            ageAccordingToWeight: visit.ageBasedOnWeight,
            diagnosis: visit.diagnosis,
            treatment: visit.treatment,
            pathologicalHst: visit.pathologicalHst,
            familyHst: visit.familyHst,
            surgicalHst: visit.surgicalHst,
            backgroundHst: visit.backgroundHst
          })

          if (visit.expediente) {
            this.visitForm.get('expediente')?.patchValue({
              ...visit.expediente,
              module: { ...visit.expediente.module,
                surgeryStart: clinicalDateTimeInput(visit.expediente.module.surgeryStart),
                surgeryEnd: clinicalDateTimeInput(visit.expediente.module.surgeryEnd),
                dischargeDate: visit.expediente.module.dischargeDate?.slice(0, 10) ?? '',
              },
            })
          }
          this.syncBedFromForm()

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
                  currentQuantity: uv.stockQty,
                  reservedQuantity: uv.stockQty
                })
              }
            })
            this.loadDataOfStockArray()
          }
          this.startDraft(id)

        },
        error: ( err ) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }

  public handleEditVisit( visit: FormVisitWithStock ) {
    const submittedDraft = this.draft
    const checkpoint = this.saveCheckpoint
    visit.date = (visit.date || formatNewDate(new Date())).split('T')[0]
    const payload: FormVisitWithStock = this.includeSubinventoryInPayload
      ? {
        ...visit,
        stockItems: visit.stockItems?.map(item => ({
          ...item,
          subinventoryId: this.payloadSubinventoryId
        })) ?? []
      }
      : visit
    const payloadWithOrigin = { ...payload, origin: this.origin }
    this.isSaving = true
    this.visitsService.editVisit(this.selectedVisit()?.id!, payloadWithOrigin )
      .subscribe({
        next: ( visit ) => {
          if( visit ) {
            this.isSaving = false
            submittedDraft?.committed(checkpoint)
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

  public addInventoryItem(item: Stock) {
    if (this.selectedStockItems.some((selected) => selected.id === item.id)) return
    this.selectedStockItems = [...this.selectedStockItems, { ...item, currentQuantity: 1 }]
    this.stockItemsArray.markAsTouched()
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

  private saveDraft() { this.draft?.flush() }


}
