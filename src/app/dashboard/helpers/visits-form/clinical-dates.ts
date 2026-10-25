import type { ExpedienteModule } from '../../interface/expediente.interface'

/** Keep the full local calendar date in the editor and an explicit instant in the API. */
export function clinicalDateTimeInput(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function clinicalDatesForApi(module: ExpedienteModule): ExpedienteModule {
  const result = { ...module }
  for (const key of ['surgeryStart', 'surgeryEnd'] as const) {
    const value = result[key]
    if (value && Number.isFinite(new Date(value).getTime())) result[key] = new Date(value).toISOString()
  }
  return result
}
