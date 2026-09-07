export type AttachmentSource = 'in_app_camera' | 'file_upload'

export interface ClinicalAttachment {
  id: string
  patient_id: string
  record_id: string | null
  label: string
  source: AttachmentSource
  mime_type: string
  size_bytes: number
  uploaded_by: string
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
