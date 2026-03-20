export interface BillingReport {
  summary: BillingSummary
  ledger: BillingLedgerItem[]
  movements: BillingMovement[]
}

export interface BillingSummary {
  range: { from: string; to: string }
  totals: {
    invoiceTotal: number
    invoicePaid: number
    invoicePending: number
    inventoryTotal: number
    manualTotal: number
  }
  counts: {
    patients: number
    invoices: number
    movements: number
    ledgerItems: number
  }
  byPatient: BillingPatientSummary[]
  byDay: BillingDaySummary[]
  byCategory: BillingGroupSummary[]
  byStation: BillingGroupSummary[]
}

export interface BillingLedgerItem {
  id: string
  patientId: number
  patientName: string
  station?: string
  category: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  occurredAt: string
  status: string
  source: string
  reference?: {
    invoiceNumber?: string
    visitId?: number
    movementId?: string
    productId?: number
  }
}

export interface BillingMovement {
  id: string
  patientId: number
  patientName: string
  fromStation?: string
  toStation: string
  occurredAt: string
  reason?: string
  notes?: string
  source: string
}

export interface BillingPatientSummary {
  patientId: number
  patientName: string
  invoiceTotal: number
  inventoryTotal: number
  manualTotal: number
  total: number
}

export interface BillingDaySummary {
  date: string
  invoiceTotal: number
  inventoryTotal: number
  manualTotal: number
  total: number
}

export interface BillingGroupSummary {
  category?: string
  station?: string
  total: number
  count: number
}
