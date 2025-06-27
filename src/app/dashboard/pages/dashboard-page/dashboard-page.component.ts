import { Component, inject } from '@angular/core';
import { CalendarOptions, EventMountArg } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import tippy from 'tippy.js'
import { DashboardService } from '../../services/dashboard-service/dashboard.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  private dashboardService: DashboardService = inject( DashboardService )
  
  // ───── Data for cards ─────
  patientsCurrent = 0
  patientsPct: number | null = null
  
  invoicesCurrent = 0
  invoicesPct: number | null = null
  
  visitsCurrent = 0
  visitsPct: number | null = null

  // ───── Data for visits ─────
  visits: any = []
  
  sortAsc = true

  constructor() {
    this.getData()
  }

  public getData() {
    this.dashboardService.getDataForDashb()
      .subscribe({
        next: ( resp ) => {
          const { cardData, visitData } = resp
          
          this.patientsCurrent = cardData.pacientes_actuales
          this.patientsPct     = cardData.pacientes_variacion

          this.invoicesCurrent = cardData.facturas_actuales
          this.invoicesPct     = cardData.facturas_variacion

          this.visitsCurrent   = cardData.visitas_actuales
          this.visitsPct       = cardData.visitas_variacion

          this.visits = visitData
          this.sortVisits()
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  calendarOptions: CalendarOptions = {
    plugins: [ dayGridPlugin ],
    initialView: 'dayGridMonth',
    locale: 'es',
    headerToolbar: {
      left: 'prev',
      center: 'title',
      right: 'next'
    },
    eventDidMount: this.onEventMount.bind( this ),
    events: [
      { 
        title: 'Surgery', 
        date: '2025-06-08',
        color: '#8383de',
        textColor: '#fff',
        extendedProps: {
          description: 'Cirugia programada'
        }
      },
      { 
        title: 'Polyclinic', 
        date: '2025-06-14',
        backgroundColor: '#8383de',
        textColor: '#fff',
        extendedProps: {
          description: 'Cita de policlinica'
        }
      },
    ]
  }

  onEventMount(info: EventMountArg) {
    const tip = info.event.extendedProps['description'] || info.event.title
    tippy( info.el, {
      content: tip,
      placement: 'top',
      theme: 'light-border',
      animation: 'shift-away',
      arrow: true,
    })
  }

  private sortVisits() {
    this.visits.sort((a:any, b:any) => {
      const nameA = a.NombreDoctor || ''
      const nameB = b.NombreDoctor || ''
      return this.sortAsc
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA)
    })
  }

  toggleSort() {
    this.sortAsc = !this.sortAsc
    this.sortVisits()
  }
}
