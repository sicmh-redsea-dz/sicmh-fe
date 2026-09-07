import { Component, OnInit, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import Swal from 'sweetalert2'
import { PrescriptionContext } from '../../interface/visits-service.interface'
import { VisitsService } from '../../services/visits-service/visits.service'

@Component({
  selector: 'app-prescription-page',
  templateUrl: './prescription-page.component.html',
  styleUrl: './prescription-page.component.css'
})
export class PrescriptionPageComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private visitsService = inject(VisitsService)

  prescription: PrescriptionContext | null = null
  backRoute = 'visits'
  logoFailed = false
  signatureFailed = false
  stampFailed = false

  ngOnInit(): void {
    this.backRoute = this.route.snapshot.queryParamMap.get('back') || 'visits'
    const id = this.route.snapshot.paramMap.get('id')
    if (!id) return
    this.visitsService.getPrescription(id).subscribe({
      next: (data) => this.prescription = data,
      error: (message) => Swal.fire('Error', message, 'error')
    })
  }

  get patientAge(): string {
    const birthDate = this.prescription?.patientBirthDate
    if (!birthDate) return '—'
    const birth = new Date(`${birthDate.substring(0, 10)}T00:00:00`)
    const at = new Date(this.prescription?.visitDate || Date.now())
    let years = at.getFullYear() - birth.getFullYear()
    const monthDelta = at.getMonth() - birth.getMonth()
    if (monthDelta < 0 || (monthDelta === 0 && at.getDate() < birth.getDate())) years--
    return `${Math.max(0, years)} años`
  }

  get formattedDate(): string {
    const value = this.prescription?.visitDate
    if (!value) return ''
    return new Intl.DateTimeFormat('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
  }

  print(): void { window.print() }
}
