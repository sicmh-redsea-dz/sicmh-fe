export type CitaTipo   = 'consulta' | 'cirugia' | 'hospitalizacion' | 'seguimiento' | 'otro'
export type CitaEstado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
export type RecursoTipo = 'quirofano' | 'cama'
export type CitaSource = 'manual' | 'chatbot' | 'google_calendar' | 'en_persona' | 'llamada'

export interface Cita {
  CitaID:          string
  Titulo:          string
  Descripcion?:    string | null
  Inicio:          string
  Fin:             string
  Tipo:            CitaTipo
  Estado:          CitaEstado
  RecursoTipo?:    RecursoTipo | null
  RecursoID?:      string | null
  Source:             string
  ExternalId?:        string | null
  ChatbotSesionID?:   string | null
  Notas?:             string | null
  PersonalID?:              string | null
  NombreDoctor?:            string | null
  PacienteID?:              string | null
  PacienteIdentificacion?:  string | null
  NombrePaciente?:          string | null
  CreadoPor?:      string | null
  CreadoEn?:       string
  ActualizadoEn?:  string
}

export interface Doctor {
  id:          string
  nombre:      string
  especialidad: string
}

export const TIPO_COLORS: Record<CitaTipo, string> = {
  consulta:        '#3B82F6',
  cirugia:         '#8B5CF6',
  hospitalizacion: '#10B981',
  seguimiento:     '#F59E0B',
  otro:            '#6B7280',
}

export const TIPO_LABELS: Record<CitaTipo, string> = {
  consulta:        'Consulta',
  cirugia:         'Cirugía',
  hospitalizacion: 'Hospitalización',
  seguimiento:     'Seguimiento',
  otro:            'Otro',
}

export const ESTADO_LABELS: Record<CitaEstado, string> = {
  pendiente:   'Pendiente',
  confirmada:  'Confirmada',
  cancelada:   'Cancelada',
  completada:  'Completada',
}

export const SOURCE_LABELS: Record<CitaSource, string> = {
  manual: 'Manual',
  chatbot: 'Chatbot',
  google_calendar: 'Google Calendar',
  en_persona: 'En persona',
  llamada:    'Llamada',
}
