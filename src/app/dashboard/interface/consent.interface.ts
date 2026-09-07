export interface ConsentTemplate {
  id: string
  name: string
  current_version: number
  content: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface ConsentInstance {
  id: string
  template_id: string
  template_name: string
  template_version: number
  status: 'printed' | 'accepted'
  acceptance_method: 'checkbox' | 'drawn_signature' | 'physical' | null
  signer_name: string | null
  attachment_id: string | null
  accepted_at: string | null
  created_at: string
}

export interface ConsentDocumentContext {
  visitId: string | null
  patientId: string
  patientName: string
  patientAge: number | null
  patientPhone: string | null
  patientIdentification: string | null
  doctorId: string
  doctorName: string
  clinicName: string
  logoUrl: string
  signatureUrl: string | null
  stampUrl: string | null
  hasDoctorSignature: boolean
  hasDoctorStamp: boolean
  template: ConsentTemplate
}
