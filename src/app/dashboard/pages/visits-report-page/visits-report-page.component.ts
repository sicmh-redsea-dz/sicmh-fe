import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

import { VisitsService } from '../../services/visits-service/visits.service';
import { Visit } from '../../interface/visits-service.interface';
import { formatIncomingData } from '../../../shared/utils/date-formatters';

@Component({
  selector: 'app-visits-report-page',
  templateUrl: './visits-report-page.component.html',
  styleUrl: './visits-report-page.component.css'
})
export class VisitsReportPageComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private visitsService = inject(VisitsService)

  public visit: Visit | null = null
  public backRoute = 'visits'

  ngOnInit(): void {
    const origin = this.route.snapshot.data?.['origin'] ?? 'visits'
    this.backRoute = origin === 'oroom' ? 'o-room' : origin

    const id = this.route.snapshot.paramMap.get('id')
    if (!id) return

    this.visitsService.getVisit(id)
      .subscribe({
        next: (visit) => {
          this.visit = visit
        },
        error: (err) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }

  public get formattedDate(): string {
    if (!this.visit?.lastVisitDate) return ''
    return formatIncomingData(this.visit.lastVisitDate)
  }

  public printReport(): void {
    window.print()
  }
}
