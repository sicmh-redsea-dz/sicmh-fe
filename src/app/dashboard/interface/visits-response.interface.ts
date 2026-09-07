import { ExpedientePayload } from './expediente.interface'

export interface VisitsN {
  data: DataN;
}

export interface DataN {
  visits:       VisitN[];
  totalCount:   number;
  totalRecords: number;
}

export interface VisitN {
  id:            string;
  doctorName:    string;
  patientName:    string;
  lastVisitDate: string;
  diagnosis:     Date;
}





export interface VisitsResponse {
  data: Data;
}

export interface Data {
  visits: Visits[];
  patients: Patient[];
  doctors:  Doctor[];
  stock:  Stock[];
  totalVisitsCount: number;
  totalPatientsCount: number;
  totalDoctorsCount:  number;
  totalRegistries:  number;
}

export interface Doctor {
  id:   string;
  name: string;
}

export interface Patient {
  id:   string;
  name: string;
}

export interface Stock {
  id: string,
  productName: string,
  productDescription: string,
  quantity: number,
  currentQuantity: number
}

export interface Visits {
  id:            string;
  doctorName:    string;
  patientName:   string;
  lastVisitDate: string;
  diagnosis:     string;
}

export interface FormVisit{
  id?                 : string,
  BMI                 : number,
  date                : string,
  notes               : string,
  height              : number,
  weight              : number,
  doctor              : string,
  patient             : string,
  pressure            : string,
  diagnosis           : string,
  treatment           : string,
  glucometry          : number,
  temperature         : number,
  oxygenation         : number,
  visceralFat         : number,
  fatPercentage       : number,
  ageAccordingToWeight: number,
  pathologicalHst?    : string,
  familyHst?          : string,
  surgicalHst?        : string,
  backgroundHst?      : string,
  expediente?: ExpedientePayload,
  origin?: string,
}

export interface SelectedVisitResponse {
  data: SelectedVisit;
}

export interface SelectedVisit {
  visit: Visit;
}

export interface Visit {
  id:                   string;
  BMI:                  string;
  date:                 Date;
  notes:                string;
  height:               string;
  weight:               string;
  doctor:               string;
  patient:              string;
  pressure:             string;
  diagnosis:            string;
  treatment:            string;
  glucometry:           string;
  temperature:          string;
  oxygenation:          number;
  visceralFat:          number;
  fatPercentage:        string;
  ageAccordingToWeight: number;
  expediente?: ExpedientePayload;
}
