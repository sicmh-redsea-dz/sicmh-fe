export type BedModule = 'hospitalization' | 'emergency'

export type BedStatus = 'available' | 'occupied' | 'maintenance' | 'blocked'

export interface AuditActor {
  id: number
  name: string
  role?: string
}

export interface BedAssignment {
  assignmentId: string
  patientId: number
  patientName: string
  doctorId?: number
  doctorName?: string
  reason?: string
  notes?: string
  expectedDischarge?: string
  assignedAt: string
  updatedAt?: string
  releasedAt?: string
}

export interface BedHistoryEntry {
  eventId: string
  type: string
  timestamp: string
  actor?: AuditActor
  details?: Record<string, any>
}

export interface BedRecord {
  id: number
  code: string
  area?: string
  status: BedStatus
  currentAssignment?: BedAssignment | null
  history: BedHistoryEntry[]
}
