export interface ConsentTemplate {
  id: number
  name: string
  current_version: number
  content: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface ConsentInstance {
  id: number
  template_id: number
  template_name: string
  template_version: number
  status: 'printed' | 'accepted'
  acceptance_method: 'checkbox' | 'drawn_signature' | 'physical' | null
  signer_name: string | null
  attachment_id: number | null
  accepted_at: string | null
  created_at: string
}

export interface ConsentDocumentContext {
  visitId: number | null
  patientId: number
  patientName: string
  patientAge: number | null
  patientPhone: string | null
  patientIdentification: string | null
  doctorName: string
  clinicName: string
  logoUrl: string
  signatureUrl: string | null
  stampUrl: string | null
  hasDoctorSignature: boolean
  hasDoctorStamp: boolean
  template: ConsentTemplate
}
