export type AttachmentSource = 'in_app_camera' | 'file_upload'

export interface ClinicalAttachment {
  id: number
  patient_id: number
  record_id: number | null
  label: string
  source: AttachmentSource
  mime_type: string
  size_bytes: number
  uploaded_by: number
  created_at: string
}

export interface AttachmentListResponse {
  data: ClinicalAttachment[]
}

export interface AttachmentUploadResponse {
  data: ClinicalAttachment
}

export interface LogoUploadResponse {
  data: { url: string }
}
