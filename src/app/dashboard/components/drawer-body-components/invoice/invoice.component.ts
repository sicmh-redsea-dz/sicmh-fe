import { Component, computed, DestroyRef, inject, OnInit } from '@angular/core'
import Swal from 'sweetalert2'
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms'
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { InvoicesService } from '../../../services/invoices-services/invoices.service'
import { BillingService } from '../../../services/billing-service/billing.service'
import { DrawerService } from '../../../services/drawer-service/drawer.service'
import { DrawerContents } from '../../../interface/drawer-content.enum'
import { formatIncomingData, formatNewDate } from '../../../../shared/utils/date-formatters'
import { VisitsService } from '../../../services/visits-service/visits.service'
import { PatientsService } from '../../../services/patients-service/patients.service'
import { BillingLedgerItem, BillingInvoiceSnapshot } from '../../../interface/billing.interface'

interface Options {
  doctors: any[]
  services: any[]
  pMethods: any[]
}

type PatientOption = {
  id: number
  name: string
  idNumber?: string
  birthDate?: string
}

type DoctorOption = {
  id: number
  name: string
  specialty?: string
}

type ServiceOption = {
  id: number
  serviceName?: string
  serviceDescription?: string
  servicePrice?: number
}

@Component({
  selector: 'app-drawer-invoice',
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.css'
})
export class InvoiceComponent implements OnInit {
  private fb = inject(FormBuilder)
  private drawerParams = inject(DrawerService)
  private invoiceService = inject(InvoicesService)
  private billingService = inject(BillingService)
  private visitsService = inject(VisitsService)
  private patientsService = inject(PatientsService)
  private destroyRef = inject(DestroyRef)

  public invoiceIdToUpd = computed(() => this.drawerParams.setInvoiceId())
  public isDrawerSetToUpd = computed(() => this.drawerParams.setToUpdate())
  public isViewOnly = computed(() => this.drawerParams.viewOnly())
  public drawerTexts = computed(() => this.drawerParams.drawerTexts())

  public invoiceStatus: string = 'Pendiente'
  public isReadOnly = false

  public selectedServices: any[] = []
  public options: Options = { doctors: [], services: [], pMethods: [] }
  public chargeItems: BillingLedgerItem[] = []
  public chargeSnapshot: BillingInvoiceSnapshot | null = null
  public selectedServiceId = ''
  public serviceSaving = false
  public serviceRemoving: Set<string> = new Set()

  public patientQuery = ''
  public doctorQuery = ''
  public patientResults: PatientOption[] = []
  public doctorResults: DoctorOption[] = []
  public patientLoading = false
  public doctorLoading = false
  public patientOpen = false
  public doctorOpen = false
  private patientSearchSubject = new Subject<string>()
  private doctorSearchSubject = new Subject<string>()

  public subtotalAmount = 0
  public discountAmount = 0
  public totalAmount = 0

  public invoiceForm: FormGroup = this.fb.group({
    patient: ['', [Validators.required]],
    doctor: ['', [Validators.required]],
    service: this.fb.array([], []),
    date: ['', [Validators.required]],
    pMethod: ['', [Validators.required]],
    amount: [{ value: '', disabled: true }],
    description: [{ value: '', disabled: true }],
    elderlyDiscount: [false],
    elderlyDiscountPercent: [0],
    promCode: [''],
    discount: [0]
  })

  ngOnInit(): void {
    this.setupSearchStreams()
    this.setupDiscountWatchers()

    this.getInvoiceData()
      .then(() => {
        if (!this.isDrawerSetToUpd()) {
          this.setReadOnly(false)
          this.invoiceStatus = 'Pendiente'
          this.updateDrawerBadge(this.invoiceStatus)
          this.invoiceForm.get('date')!.setValue(formatNewDate(new Date()))
        } else {
          this.getPendingInvoice(this.invoiceIdToUpd())
        }
      })
  }

  get serviceArray(): FormArray {
    return this.invoiceForm.get('service') as FormArray
  }

  private setupSearchStreams() {
    this.patientSearchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((term) => this.searchPatients(term))

    this.doctorSearchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((term) => this.searchDoctors(term))
  }

  private setupDiscountWatchers() {
    this.invoiceForm.get('elderlyDiscount')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled: boolean) => {
        if (enabled) {
          const current = Number(this.invoiceForm.get('elderlyDiscountPercent')?.value || 0)
          if (!current) {
            this.invoiceForm.get('elderlyDiscountPercent')?.setValue(25, { emitEvent: false })
          }
        }
        this.loadMutableData()
      })

    const otherFields = ['elderlyDiscountPercent', 'promCode', 'discount']
    otherFields.forEach((field) => {
      this.invoiceForm.get(field)?.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.loadMutableData())
    })
  }

  public getInvoiceData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.invoiceService.getDataForInvoice().subscribe({
        next: (resp) => {
          this.options.doctors = resp.data.doctors ?? []
          this.options.services = resp.data.services ?? []
          this.options.pMethods = resp.data.paymentMethods ?? []
          resolve()
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
          reject(message)
        }
      })
    })
  }

  public getPendingInvoice(invoiceId: string) {
    this.invoiceService.getOneInvoice(invoiceId)
      .subscribe({
        next: ({ data }) => {
          this.setDataInForm(data)
          this.loadInvoiceSnapshot(invoiceId)
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  private loadInvoiceSnapshot(invoiceNumber: string) {
    if (!invoiceNumber) return
    this.billingService.getInvoiceSnapshot(invoiceNumber)
      .subscribe({
        next: (snapshot) => {
          this.chargeSnapshot = snapshot
          this.chargeItems = snapshot?.charges ?? []
          this.selectedServices = this.chargeItems.map((item) => ({
            id: item.id,
            description: item.description,
            desc: this.buildChargeMeta(item),
            price: item.total
          }))
          this.loadMutableData()
        },
        error: () => {
          this.chargeSnapshot = null
          this.chargeItems = []
          this.selectedServices = []
          this.loadMutableData()
        }
      })
  }

  private buildChargeMeta(item: BillingLedgerItem) {
    const parts: string[] = []
    if (item.category) parts.push(item.category)
    if (item.station) parts.push(this.formatStation(item.station))
    if (item.quantity) parts.push(`x${item.quantity}`)
    if (item.unitPrice) parts.push(`L. ${Number(item.unitPrice || 0).toFixed(2)}`)
    return parts.filter(Boolean).join(' · ')
  }

  private formatStation(key?: string) {
    if (!key) return ''
    const normalized = key.toLowerCase()
    if (normalized.includes('emer')) return 'Emergencia'
    if (normalized.includes('hosp')) return 'Hospitalización'
    if (normalized.includes('quiro')) return 'Quirófano'
    if (normalized.includes('consult')) return 'Consulta'
    return key
  }

  public onAddService() {
    if (this.isReadOnly || !this.isDrawerSetToUpd() || this.serviceSaving) return

    const service = this.options.services.find((item) => Number(item.id) === Number(this.selectedServiceId)) as ServiceOption | undefined
    const patientId = Number(this.invoiceForm.get('patient')?.value || 0)
    if (!service || !patientId) return

    const description = this.getServiceName(service)
    const unitPrice = this.getServicePrice(service)
    if (!description) return

    this.serviceSaving = true
    this.billingService.createManualCharge({
      patientId,
      invoiceNumber: this.invoiceIdToUpd(),
      station: this.getChargeStation(),
      category: 'servicio',
      description,
      quantity: 1,
      unitPrice,
      occurredAt: this.invoiceForm.get('date')?.value || new Date().toISOString(),
      status: 'Pendiente'
    })
      .pipe(finalize(() => {
        this.serviceSaving = false
      }))
      .subscribe({
        next: (charge) => {
          this.selectedServiceId = ''
          if (charge) {
            this.chargeItems = [charge, ...this.chargeItems]
            this.selectedServices = this.chargeItems.map((item) => ({
              id: item.id,
              description: item.description,
              desc: this.buildChargeMeta(item),
              price: item.total
            }))
            this.loadMutableData()
            this.drawerParams.updateInvoiceMonto(this.invoiceIdToUpd(), this.totalAmount)
          } else {
            this.loadInvoiceSnapshot(this.invoiceIdToUpd())
          }
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public onRemoveService(chargeId: string) {
    if (this.isReadOnly || this.serviceRemoving.has(chargeId)) return
    this.serviceRemoving.add(chargeId)
    this.billingService.deleteManualCharge(chargeId)
      .pipe(finalize(() => this.serviceRemoving.delete(chargeId)))
      .subscribe({
        next: () => {
          this.chargeItems = this.chargeItems.filter((item) => item.id !== chargeId)
          this.selectedServices = this.chargeItems.map((item) => ({
            id: item.id,
            description: item.description,
            desc: this.buildChargeMeta(item),
            price: item.total
          }))
          this.loadMutableData()
          this.drawerParams.updateInvoiceMonto(this.invoiceIdToUpd(), this.totalAmount)
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public getServiceName(service: ServiceOption) {
    return service.serviceName ?? (service as any).name ?? ''
  }

  public getServiceDescription(service: ServiceOption) {
    return service.serviceDescription ?? (service as any).description ?? ''
  }

  public getServicePrice(service: ServiceOption) {
    const raw = service.servicePrice ?? (service as any).price ?? 0
    const price = Number(raw)
    return isNaN(price) ? 0 : price
  }

  private getChargeStation() {
    const visitType = this.chargeSnapshot?.invoice?.visitType
    if (!visitType) return 'otros'
    const normalized = visitType.toLowerCase()
    if (normalized.includes('emer')) return 'emergencia'
    if (normalized.includes('hosp')) return 'hospitalizacion'
    if (normalized.includes('quiro')) return 'quirofano'
    if (normalized.includes('consult')) return 'consulta'
    return 'otros'
  }

  private setDataInForm(data: Record<string, any>) {
    const {
      patientId,
      doctorId,
      date,
      status,
      elderlyDiscount,
      promoCode,
      promoDiscount
    } = data

    this.invoiceStatus = status ?? 'Pendiente'
    const normalizedStatus = (this.invoiceStatus || '').toString().toLowerCase()
    this.setReadOnly(this.isViewOnly() || normalizedStatus !== 'pendiente')
    this.updateDrawerBadge(this.invoiceStatus)
    if (this.isReadOnly) {
      this.drawerParams.drawerTexts.update(state => ({
        ...state,
        header: 'ver factura',
        btnText: 'Cerrar'
      }))
    }

    this.invoiceForm.get('patient')!.setValue(patientId)
    this.invoiceForm.get('doctor')!.setValue(doctorId)
    this.invoiceForm.get('date')!.setValue(formatIncomingData(date))
    this.invoiceForm.get('elderlyDiscount')!.setValue(!!elderlyDiscount, { emitEvent: false })
    this.invoiceForm.get('elderlyDiscountPercent')!.setValue(Number(elderlyDiscount ?? 0), { emitEvent: false })
    this.invoiceForm.get('promCode')!.setValue(promoCode ?? '', { emitEvent: false })
    this.invoiceForm.get('discount')!.setValue(Number(promoDiscount ?? 0), { emitEvent: false })

    this.resolvePatientLabel(patientId)
    this.resolveDoctorLabel(doctorId)

    this.selectedServices = []
    this.chargeItems = []
    this.loadMutableData()
  }

  private setReadOnly(value: boolean) {
    this.isReadOnly = value
    if (value) {
      this.invoiceForm.disable({ emitEvent: false })
    } else {
      this.invoiceForm.enable({ emitEvent: false })
    }
    this.invoiceForm.get('amount')?.disable({ emitEvent: false })
    this.invoiceForm.get('description')?.disable({ emitEvent: false })
  }

  private resolvePatientLabel(patientId: number) {
    if (!patientId) return
    this.patientsService.getPatient(patientId)
      .subscribe({
        next: (patient) => {
          if (!patient) return
          const idSuffix = patient.idNumber ? ` · ${patient.idNumber}` : ''
          this.patientQuery = `${patient.name} ${patient.lastName}`.trim() + idSuffix
          if (!this.isReadOnly) {
            this.applyElderlyDiscount(patient.birthDate)
          }
        },
        error: () => {
          this.patientQuery = `Paciente ${patientId}`
        }
      })
  }

  private resolveDoctorLabel(doctorId: number) {
    if (!doctorId) return
    const found = this.options.doctors.find((doc) => doc.id === doctorId)
    if (found) {
      this.doctorQuery = found.name
      return
    }
    this.doctorQuery = `Doctor ${doctorId}`
  }

  public onPatientInput(term: string) {
    if (this.isReadOnly) return
    this.patientQuery = term
    this.invoiceForm.get('patient')?.setValue('')
    this.patientOpen = true
    this.patientSearchSubject.next(term)
  }

  public onDoctorInput(term: string) {
    if (this.isReadOnly) return
    this.doctorQuery = term
    this.invoiceForm.get('doctor')?.setValue('')
    this.doctorOpen = true
    this.doctorSearchSubject.next(term)
  }

  public onPatientFocus() {
    if (this.isReadOnly) return
    this.patientOpen = true
  }

  public onDoctorFocus() {
    if (this.isReadOnly) return
    this.doctorOpen = true
  }

  public onPatientBlur() {
    window.setTimeout(() => {
      this.patientOpen = false
      this.invoiceForm.get('patient')?.markAsTouched()
    }, 150)
  }

  public onDoctorBlur() {
    window.setTimeout(() => {
      this.doctorOpen = false
      this.invoiceForm.get('doctor')?.markAsTouched()
    }, 150)
  }

  public selectPatient(patient: PatientOption) {
    this.invoiceForm.get('patient')?.setValue(patient.id)
    const idSuffix = patient.idNumber ? ` · ${patient.idNumber}` : ''
    this.patientQuery = `${patient.name}`.trim() + idSuffix
    this.applyElderlyDiscountForPatient(patient.id, patient.birthDate)
    this.patientResults = []
    this.patientOpen = false
  }

  public selectDoctor(doctor: DoctorOption) {
    this.invoiceForm.get('doctor')?.setValue(doctor.id)
    this.doctorQuery = doctor.name
    this.doctorResults = []
    this.doctorOpen = false
  }

  public clearPatient() {
    if (this.isReadOnly) return
    this.invoiceForm.get('patient')?.setValue('')
    this.patientQuery = ''
    this.applyElderlyDiscount()
    this.patientResults = []
    this.patientLoading = false
    this.patientOpen = false
  }

  public clearDoctor() {
    if (this.isReadOnly) return
    this.invoiceForm.get('doctor')?.setValue('')
    this.doctorQuery = ''
    this.doctorResults = []
    this.doctorLoading = false
    this.doctorOpen = false
  }

  private searchPatients(term: string) {
    const cleanTerm = term.trim()
    if (!cleanTerm || cleanTerm.length < 2) {
      this.patientResults = []
      this.patientLoading = false
      return
    }

    this.patientLoading = true
    this.patientsService.getPatients({ limit: 12, offset: 0, term: cleanTerm })
      .pipe(finalize(() => {
        this.patientLoading = false
      }))
      .subscribe({
        next: (data) => {
          this.patientResults = data?.patients?.map((p) => ({
            id: p.id,
            name: `${p.name} ${p.lastName}`.trim(),
            idNumber: p.idNumber,
            birthDate: p.birthDate
          })) ?? []
        },
        error: () => {
          this.patientResults = []
        }
      })
  }

  private searchDoctors(term: string) {
    const cleanTerm = term.trim()
    if (!cleanTerm || cleanTerm.length < 2) {
      this.doctorResults = []
      this.doctorLoading = false
      return
    }

    this.doctorLoading = true
    this.visitsService.searchDoctors(cleanTerm)
      .pipe(finalize(() => {
        this.doctorLoading = false
      }))
      .subscribe({
        next: (doctors) => {
          this.doctorResults = doctors?.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            specialty: doc.specialty
          })) ?? []
        },
        error: () => {
          this.doctorResults = []
        }
      })
  }

  public onHandleCancel() {
    this.invoiceForm.reset()
    this.patientQuery = ''
    this.doctorQuery = ''
    this.patientResults = []
    this.doctorResults = []
    this.selectedServices = []
    this.chargeItems = []
    this.chargeSnapshot = null
    this.invoiceStatus = 'Pendiente'
    this.setReadOnly(false)
    this.drawerParams.isDrawerOpen.set(false)
    this.drawerParams.contentToDisplay.set(DrawerContents.NONE)
    this.drawerParams.setToUpdate.set(false)
    this.drawerParams.setInvoiceId.set('')
    this.drawerParams.viewOnly.set(false)
  }

  private updateDrawerBadge(status: string) {
    const label = status || 'Pendiente'
    const normalized = label.toLowerCase()
    const tone = normalized.includes('pag') ? 'paid' : normalized.includes('anul') ? 'canceled' : 'pending'
    this.drawerParams.drawerTexts.update(state => ({
      ...state,
      badge: label,
      badgeTone: tone
    }))
  }

  public onHandleSubmit() {
    if (this.isReadOnly) return
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched()
      return
    }
    if (this.isDrawerSetToUpd())
      this.completeExistingInvoice()
    else
      this.saveNewInvoice()
  }

  private saveNewInvoice() {
    const raw = this.invoiceForm.getRawValue()
    const elderlyPercent = raw.elderlyDiscount ? Number(raw.elderlyDiscountPercent || 0) : 0
    const payload = {
      ...raw,
      elderlyDiscount: elderlyPercent,
      amount: this.invoiceForm.get('amount')?.value
    }
    delete (payload as any).elderlyDiscountPercent

    this.invoiceService.createInvoice(payload)
      .subscribe({
        next: (invoice) => {
          if (invoice) {
            Swal.fire('Success', 'New invoice added!', 'success')
              .then(() => {
                this.drawerParams.triggerInvoiceRefresh()
                this.onHandleCancel()
              })
          }
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  private completeExistingInvoice() {
    const raw = this.invoiceForm.getRawValue()
    const elderlyPercent = raw.elderlyDiscount ? Number(raw.elderlyDiscountPercent || 0) : 0
    const payload = {
      ...raw,
      elderlyDiscount: elderlyPercent,
      amount: this.invoiceForm.get('amount')?.value
    }
    delete (payload as any).elderlyDiscountPercent

    this.invoiceService.updateInvoice(this.invoiceIdToUpd(), payload)
      .subscribe({
        next: (resp) => {
          Swal.fire('Success', 'Invoice updated!', 'success')
            .then(() => {
              this.drawerParams.triggerInvoiceRefresh()
              this.onHandleCancel()
            })
          return resp
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  private loadMutableData() {
    let subtotal = 0
    let concatDescriptions = ''
    this.serviceArray.clear()

    this.chargeItems.forEach((item, idx) => {
      subtotal += Number(item.total) || 0
      concatDescriptions += `${idx + 1}. ${item.description}.\n`
    })

    const elderlyEnabled = !!this.invoiceForm.get('elderlyDiscount')?.value
    const elderlyPercent = elderlyEnabled
      ? Number(this.invoiceForm.get('elderlyDiscountPercent')?.value || 0)
      : 0
    const promoPercent = Number(this.invoiceForm.get('discount')?.value || 0)
    const promoCode = (this.invoiceForm.get('promCode')?.value || '').trim()

    const totalPercent = Math.min(100, Math.max(0, elderlyPercent + promoPercent))
    const discountAmount = subtotal * (totalPercent / 100)
    const totalAmount = Math.max(0, subtotal - discountAmount)

    if (elderlyEnabled && elderlyPercent > 0) {
      concatDescriptions += `Descuento tercera edad (${elderlyPercent}%).\n`
    }
    if (promoPercent > 0) {
      const label = promoCode ? `Descuento corporativo (${promoCode})` : 'Descuento corporativo'
      concatDescriptions += `${label} (${promoPercent}%).\n`
    }

    this.subtotalAmount = subtotal
    this.discountAmount = discountAmount
    this.totalAmount = totalAmount

    this.invoiceForm.get('amount')?.setValue(totalAmount.toFixed(2), { emitEvent: false })
    this.invoiceForm.get('description')?.setValue(concatDescriptions.trim(), { emitEvent: false })
  }

  private applyElderlyDiscount(birthDate?: string) {
    const age = this.calculateAge(birthDate)
    let elderlyPercent = 0

    if (age !== null && age >= 80) {
      elderlyPercent = 35
    } else if (age !== null && age >= 60) {
      elderlyPercent = 25
    }

    this.invoiceForm.get('elderlyDiscount')?.setValue(elderlyPercent > 0)
    this.invoiceForm.get('elderlyDiscountPercent')?.setValue(elderlyPercent)
  }

  private applyElderlyDiscountForPatient(patientId: number, birthDate?: string) {
    if (birthDate) {
      this.applyElderlyDiscount(birthDate)
      return
    }

    this.patientsService.getPatient(patientId)
      .subscribe({
        next: (patient) => {
          if (Number(this.invoiceForm.get('patient')?.value) !== Number(patientId)) return
          this.applyElderlyDiscount(patient?.birthDate)
        },
        error: () => {
          if (Number(this.invoiceForm.get('patient')?.value) !== Number(patientId)) return
          this.applyElderlyDiscount()
        }
      })
  }

  private calculateAge(birthDate?: string): number | null {
    if (!birthDate) return null
    const dateOnly = birthDate.toString().split('T')[0]
    const [year, month, day] = dateOnly.split('-').map((part) => Number(part))
    const parsedBirthDate = year && month && day
      ? new Date(year, month - 1, day)
      : new Date(birthDate)
    if (Number.isNaN(parsedBirthDate.getTime())) return null

    const today = new Date()
    let age = today.getFullYear() - parsedBirthDate.getFullYear()
    const birthdayPassed =
      today.getMonth() > parsedBirthDate.getMonth()
      || (today.getMonth() === parsedBirthDate.getMonth() && today.getDate() >= parsedBirthDate.getDate())

    if (!birthdayPassed) age -= 1
    return age
  }
}
