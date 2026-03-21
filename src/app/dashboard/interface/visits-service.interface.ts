import { ExpedientePayload } from './expediente.interface'

export interface Histories {
    success: boolean
    message: string
    data:    Data
}

export interface Data {
    visits:       SimpleVisit[]
    staff:        Staff[]
    patients:     Patients[]
    stock:        Stock[]
    totalRecords: number
}

export interface SimpleVisit {
    id:            number
    doctorName:    string
    patientName:   string
    patientId:     string
    lastVisitDate: Date
    diagnosis:     null | string
    state?:        string
    invoiceNumber?: string
    originStation?: string
    currentStation?: string
    movedTo?: string
    movementFrom?: string
    movementTo?: string
    movementAt?: string
    movementTrail?: string[]
    visitType?: string
}

export interface Staff {
    id:         number
    name:       string
    specialty:  string
}

export interface Stock {
    id:                 number
    productName:        string
    productDescription: string
    productQuantity:    number
    productUnitPrice:   number
    currentQuantity:    number
}

export interface Patients {
    id:       number
    name:     string
    lastName: string
    birthDate:Date
    phone:    string
    email:    string
    address:  string
    idNumber: string
    gender:   string
}


export interface History {
    success: boolean
    message: string
    data:    Visit
}

export interface Visit {
    ageBasedOnWeight:   string | null
    bloodPressure:      string
    BMI:                string | null
    bodyFatPercentage:  string | null
    diagnosis:          string | null
    glucoseLevel:       string
    height:             string
    id:                 number
    invoiceId:          number
    lastVisitDate:      Date
    notes:              string
    oxygenSaturation:   number
    patientId:          number
    staffId:            number
    temperature:        string
    treatment:          string | null
    visceralFat:        string | null
    visitDate:          Date
    visitType:          string
    weight:             string


    pathologicalHst: string | null
    familyHst: string | null
    surgicalHst: string | null
    backgroundHst: string | null

    docName: string
    patientName: string

    usedInventory : { stockId: number, stockQty: number}[]
    expediente?: ExpedientePayload | null
}
