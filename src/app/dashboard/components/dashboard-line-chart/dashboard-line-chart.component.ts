import { CommonModule } from '@angular/common'
import { Component, Input, OnChanges } from '@angular/core'
import { DailyValue, lineChart } from './line-chart'

@Component({
  selector: 'app-dashboard-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="line-chart" [class.blue]="color === 'blue'">
      <h3>{{ title }}</h3>
      <p class="caption">Por d&#237;a &#183; mes en curso</p>
      <svg viewBox="0 0 640 222" role="img" [attr.aria-label]="title + ': ' + total + ' en el periodo. Eje vertical desde cero.'">
        <g *ngFor="let tick of chart.ticks">
          <line x1="44" x2="596" [attr.y1]="tick.y" [attr.y2]="tick.y" class="grid-line" />
          <text x="32" [attr.y]="tick.y + 4" text-anchor="end">{{ tick.value }}</text>
        </g>
        <polyline [attr.points]="chart.line" class="data-line" />
        <circle *ngFor="let point of chart.points" [attr.cx]="point.x" [attr.cy]="point.y" r="3.5" class="data-point">
          <title>{{ point.date }}: {{ point.value }}</title>
        </circle>
        <text *ngFor="let point of chart.labels" [attr.x]="point.x" y="208" text-anchor="middle">{{ point.date.slice(8) }}</text>
      </svg>
      <p *ngIf="total === 0" class="caption">Sin registros en el periodo. La l&#237;nea comienza en 0.</p>
      <details *ngIf="points.length"><summary>Ver datos diarios</summary><div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Cantidad</th></tr></thead><tbody><tr *ngFor="let point of points"><td>{{ point.date }}</td><td>{{ point.value }}</td></tr></tbody></table></div></details>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .line-chart { --line-color: var(--secondary-color, #14b8a6); } .blue { --line-color: #5378c2; }
    h3 { font-size: .9rem; margin: 0 0 .35rem; } .caption { font-size: .75rem; color: var(--text-muted); margin: .35rem 0; line-height: 1.6; }
    svg { display: block; width: 100%; height: auto; overflow: visible; margin: .75rem 0; }
    text { fill: var(--text-muted); font-size: 12px; font-family: inherit; }
    .grid-line { stroke: var(--border-color); stroke-dasharray: 4 5; }
    .data-line { fill: none; stroke: var(--line-color); stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
    .data-point { fill: var(--surface); stroke: var(--line-color); stroke-width: 2; }
    summary { cursor: pointer; font-size: .75rem; color: var(--text-muted); padding: .4rem 0; }
    .table-scroll { max-height: 160px; overflow: auto; } table { width: 100%; border-collapse: collapse; font-size: .75rem; } th, td { padding: .4rem; text-align: left; border-bottom: 1px solid var(--border-color); }
  `]
})
export class DashboardLineChartComponent implements OnChanges {
  @Input() points: DailyValue[] = []
  @Input() title = ''
  @Input() color: 'teal' | 'blue' = 'teal'
  chart = lineChart([])
  total = 0
  ngOnChanges() {
    this.chart = lineChart(this.points)
    this.total = this.chart.points.reduce((sum, point) => sum + point.value, 0)
  }
}
