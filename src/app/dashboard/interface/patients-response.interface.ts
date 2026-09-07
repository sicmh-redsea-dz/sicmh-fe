export interface PatientsResponse {
  data: Data;
}

export interface Data {
  totalCount: number;
  totalRegistries: number;
  patients:   Patient[];
}

export interface Patient {
  id        : string;
  phone     : string;
  name      : string;
  email     : string | null;
  gender    : 'male' | 'female' | 'other';
  address   : string;
  idNumber  : string;
  identificationType: IdentificationType;
  lastName  : string;
  birthDate : string;
  emergencyContact: EmergencyContact | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
}

export interface ShortPatient {
  id        : string;
  name      : string;
}

export interface AddedUser {
  data: {
    patient: Patient
  }
}

export interface FormPatient {
  id        : string
  identificationType: IdentificationType
  birthdate : string
  firstName : string
  lastName  : string
  address   : string
  gender    : string
  phone     : string
  email     : string
  notes     : string
  emergencyContact: {
    name: string
    relationship: string
    phone: string
    email: string
    address: string
  }
}

export type IdentificationType = 'identidad' | 'pasaporte' | 'carne_residencia'
