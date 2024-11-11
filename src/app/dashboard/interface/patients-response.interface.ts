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
  lastName  : string;
  birthDate : string;
}

export interface AddedUser {
  data: {
    patient: Patient
  }
}

export interface FormPatient {
  birthdate : string
  firstName : string
  lastName  : string
  address   : string
  gender    : string
  phone     : string
  email     : string
  image     : string
  notes     : string
}