import { DailyValue } from '../../components/dashboard-line-chart/line-chart'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { timer } from 'rxjs'
import { Component, computed, inject, signal } from '@angular/core'
import { AuthService } from '../../../auth/services/auth.service'
import { DashboardService } from '../../services/dashboard-service/dashboard.service'

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  private authService = inject(AuthService)
  readonly userName = computed(() => this.authService.currentUser()?.name?.trim() || '')

  readonly currentDate = signal(new Date())
  readonly formattedDate = computed(() => new Intl.DateTimeFormat('es-HN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(this.currentDate()))
  readonly dateValue = computed(() => {
    const date = this.currentDate()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })

  readonly timeOfDay = signal<'morning' | 'afternoon' | 'night'>('morning')
  readonly greeting = computed(() => ({ morning: 'Buenos d\u00edas', afternoon: 'Buenas tardes', night: 'Buenas noches' })[this.timeOfDay()])

  loading = true
  error = ''
  patients = 0
  visits = 0
  variation: number | null = null
  private service = inject(DashboardService)

  visitSeries: DailyValue[] = []
  patientSeries: DailyValue[] = []
  historyAvailable = false

  constructor() {
    const updateTime = () => {
      const now = new Date()
      this.currentDate.set(now)
      const hour = now.getHours()
      this.timeOfDay.set(hour >= 6 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'night')
    }
    updateTime()
    timer(60_000, 60_000).pipe(takeUntilDestroyed()).subscribe(updateTime)
    this.load()
  }

  load() {
    this.loading = true
    this.error = ''
    this.service.getDataForDashb().subscribe({
      next: ({ cardData, dailyActivity }) => {
        this.patients = cardData?.pacientes_actuales ?? 0
        this.visits = cardData?.visitas_actuales ?? 0
        this.variation = cardData?.visitas_variacion ?? null
        this.historyAvailable = Array.isArray(dailyActivity) && dailyActivity.length > 0
        const today = new Date()
        const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
        const days: { date: string; visits: number; newPatients: number }[] = this.historyAvailable ? dailyActivity : Array.from({ length: today.getDate() }, (_, index) => ({
          date: `${month}-${String(index + 1).padStart(2, '0')}`, visits: 0, newPatients: 0,
        }))
        this.visitSeries = days.map(day => ({ date: day.date, value: day.visits }))
        this.patientSeries = days.map(day => ({ date: day.date, value: day.newPatients }))
        this.loading = false
      },
      error: () => { this.loading = false; this.error = 'No se pudo cargar el resumen.' }
    })
  }
}
