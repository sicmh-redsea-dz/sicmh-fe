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
  id:   number;
  name: string;
}

export interface Patient {
  id:   number;
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
  id:            number;
  doctorName:    string;
  patientName:   string;
  lastVisitDate: string;
  diagnosis:     string;
}

export interface FormVisit{
  id?                 : number,
  BMI                 : number,
  date                : string,
  notes               : string,
  height              : number,
  weight              : number,
  doctor              : number,
  patient             : number,
  pressure            : string,
  diagnosis           : string,
  treatment           : string,
  glucometry          : number,
  temperature         : number,
  oxygenation         : number,
  visceralFat         : number,
  fatPercentage       : number,
  ageAccordingToWeight: number,
}

export interface SelectedVisitResponse {
  data: SelectedVisit;
}

export interface SelectedVisit {
  visit: Visit;
}

export interface Visit {
  id:                   number;
  BMI:                  string;
  date:                 Date;
  notes:                string;
  height:               string;
  weight:               string;
  doctor:               number;
  patient:              number;
  pressure:             string;
  diagnosis:            string;
  treatment:            string;
  glucometry:           string;
  temperature:          string;
  oxygenation:          number;
  visceralFat:          number;
  fatPercentage:        string;
  ageAccordingToWeight: number;
}
