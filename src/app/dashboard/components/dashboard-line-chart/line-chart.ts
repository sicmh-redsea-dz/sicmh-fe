export interface DailyValue { date: string; value: number }

export function lineChart(points: DailyValue[]) {
  const values = points.map(point => ({ ...point, value: Number.isFinite(point.value) ? Math.max(0, point.value) : 0 }))
  const max = Math.max(4, Math.ceil(Math.max(0, ...values.map(point => point.value)) / 4) * 4)
  const plotted = values.map((point, index) => ({ ...point,
    x: 44 + index * 552 / Math.max(1, values.length - 1),
    y: 184 - point.value * 160 / max,
  }))
  const coordinates = plotted.map(point => `${point.x},${point.y}`).join(' ')
  return {
    points: plotted,
    line: plotted.length === 1 ? `${coordinates} 596,${plotted[0].y}` : coordinates || '44,184 596,184',
    ticks: Array.from({ length: 5 }, (_, index) => ({ value: max * index / 4, y: 184 - index * 40 })),
    labels: plotted.filter((_, index) => index === 0 || index === plotted.length - 1 || (plotted.length > 6 && index % Math.ceil(plotted.length / 5) === 0)),
  }
}
