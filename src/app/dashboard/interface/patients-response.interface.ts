export interface PatientsResponse {
  data: Data;
}

export interface Data {
  totalCount: number;
  totalRegistries: number;
  patients:   Patient[];
}

export interface Patient {
  id        : number;
  phone     : string;
  name      : string;
  email     : string;
  gender    : 'male' | 'female' | 'other';
  address   : string;
  idNumber  : string;
  lastName  : string;
  birthDate : string;
  emergencyContact: EmergencyContact | null;
}

export interface EmergencyContact {
  id: number;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
}

export interface ShortPatient {
  id        : number;
  name      : string;
}

export interface AddedUser {
  data: {
    patient: Patient
  }
}

export interface FormPatient {
  id        : string
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
