import { Component, DestroyRef, inject, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import Swal from 'sweetalert2'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { BillingService } from '../../services/billing-service/billing.service'
import { PatientsService } from '../../services/patients-service/patients.service'
import { BillingMovement } from '../../interface/billing.interface'
import { formatNewDate } from '../../../shared/utils/date-formatters'

@Component({
  selector: 'app-patient-movements-page',
  templateUrl: './patient-movements-page.component.html',
  styleUrl: './patient-movements-page.component.css'
})
export class PatientMovementsPageComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private billingService = inject(BillingService)
  private patientsService = inject(PatientsService)
  private destroyRef = inject(DestroyRef)

  public patientId = 0
  public patientName = ''
  public patientIdNumber = ''
  public currentStation = 'consulta'
  public loading = false

  public stationOptions = [
    { key: 'consulta', label: 'Consulta' },
    { key: 'emergencia', label: 'Emergencia' },
    { key: 'hospitalizacion', label: 'Hospitalización' },
    { key: 'quirofano', label: 'Quirófano' }
  ]

  public movementForm = {
    fromStation: '',
    toStation: '',
    occurredAt: '',
    reason: '',
    notes: '',
    chargeAmount: 0,
    chargeCategory: 'otros',
    chargeDescription: ''
  }

  public manualChargeForm = {
    station: '',
    category: 'otros',
    description: '',
    quantity: 1,
    unitPrice: 0,
    occurredAt: formatNewDate(new Date())
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = Number(params.get('id'))
        if (!id) return
        this.patientId = id
        this.loadPatient()
        this.loadCurrentStation()
      })
  }

  private loadPatient() {
    this.patientsService.getPatient(this.patientId)
      .subscribe({
        next: (patient) => {
          if (!patient) return
          this.patientName = `${patient.name} ${patient.lastName}`.trim()
          this.patientIdNumber = patient.idNumber ?? ''
        },
        error: (err) => Swal.fire('Error', err, 'error')
      })
  }

  private loadCurrentStation() {
    this.loading = true
    const from = '2000-01-01'
    const to = formatNewDate(new Date())
    this.billingService.getReport({
      from,
      to,
      patientIds: [this.patientId],
      station: 'all',
      status: 'all'
    })
      .subscribe({
        next: (report) => {
          const movements = (report?.movements ?? []).filter((mv) => mv.patientId === this.patientId)
          const latest = this.getLatestMovement(movements)
          this.currentStation = latest?.toStation || latest?.fromStation || 'consulta'
          this.resetForms()
          this.loading = false
        },
        error: (err) => {
          this.loading = false
          Swal.fire('Error', err, 'error')
        }
      })
  }

  private getLatestMovement(movements: BillingMovement[]) {
    return movements
      .filter((mv) => mv.occurredAt)
      .sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''))[0]
  }

  private resetForms() {
    this.movementForm = {
      fromStation: this.currentStation,
      toStation: '',
      occurredAt: '',
      reason: '',
      notes: '',
      chargeAmount: 0,
      chargeCategory: 'otros',
      chargeDescription: ''
    }
    this.manualChargeForm = {
      station: this.currentStation,
      category: 'otros',
      description: '',
      quantity: 1,
      unitPrice: 0,
      occurredAt: formatNewDate(new Date())
    }
  }

  public submitMovement() {
    if (!this.patientId) return
    if (!this.movementForm.toStation) {
      Swal.fire('Error', 'Selecciona estación destino.', 'error')
      return
    }
    if (this.movementForm.toStation === this.movementForm.fromStation) {
      Swal.fire('Error', 'La estación destino debe ser distinta a la estación actual.', 'error')
      return
    }

    const chargeAmount = Number(this.movementForm.chargeAmount) || 0
    const chargeDescription =
      this.movementForm.chargeDescription?.trim() ||
      `Movimiento a ${this.getStationLabel(this.movementForm.toStation)}`

    this.billingService.createMovement({
      patientId: this.patientId,
      patientName: this.patientName,
      fromStation: this.movementForm.fromStation,
      toStation: this.movementForm.toStation,
      occurredAt: this.movementForm.occurredAt || undefined,
      reason: this.movementForm.reason || undefined,
      notes: this.movementForm.notes || undefined,
      charge: chargeAmount > 0 ? {
        station: this.movementForm.toStation,
        category: this.movementForm.chargeCategory || 'otros',
        description: chargeDescription,
        quantity: 1,
        unitPrice: chargeAmount
      } : undefined
    })
      .subscribe({
        next: () => {
          Swal.fire('Listo', 'Movimiento registrado.', 'success')
          this.loadCurrentStation()
        },
        error: (err) => Swal.fire('Error', err, 'error')
      })
  }

  public submitManualCharge() {
    if (!this.patientId) return
    if (!this.manualChargeForm.description.trim()) {
      Swal.fire('Error', 'Agrega una descripción.', 'error')
      return
    }

    this.billingService.createManualCharge({
      patientId: this.patientId,
      patientName: this.patientName,
      station: this.manualChargeForm.station,
      category: this.manualChargeForm.category,
      description: this.manualChargeForm.description.trim(),
      quantity: Number(this.manualChargeForm.quantity) || 1,
      unitPrice: Number(this.manualChargeForm.unitPrice) || 0,
      occurredAt: this.manualChargeForm.occurredAt || undefined,
      status: 'Pendiente'
    })
      .subscribe({
        next: () => {
          Swal.fire('Listo', 'Cargo registrado.', 'success')
          this.manualChargeForm.description = ''
          this.manualChargeForm.quantity = 1
          this.manualChargeForm.unitPrice = 0
          this.manualChargeForm.occurredAt = formatNewDate(new Date())
        },
        error: (err) => Swal.fire('Error', err, 'error')
      })
  }

  public getStationLabel(key: string) {
    return this.stationOptions.find((item) => item.key === key)?.label ?? key
  }

  public goBack() {
    this.router.navigateByUrl('/dashboard/patients')
  }
}
