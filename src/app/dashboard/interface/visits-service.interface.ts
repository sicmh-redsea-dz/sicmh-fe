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
    id:            string
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
    id:         string
    name:       string
    specialty:  string
}

export interface Stock {
    id:                 string
    productName:        string
    productDescription: string
    productQuantity:    number
    productUnitPrice:   number
    currentQuantity:    number
    // Quantity this same visit already had reserved before editing began (only
    // set when populating from an existing visit's usedInventory). productQuantity
    // reflects stock available AFTER that reservation, so the real ceiling for
    // currentQuantity is productQuantity + reservedQuantity, not productQuantity alone.
    reservedQuantity?:  number
}

export interface Patients {
    id:       string
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
    id:                 string
    invoiceId:          string
    lastVisitDate:      Date
    notes:              string
    oxygenSaturation:   number
    patientId:          string
    staffId:            string
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

    usedInventory : { stockId: string, stockQty: number}[]
    expediente?: ExpedientePayload | null
}

export interface PrescriptionContext {
    visitId: string
    visitDate: string
    treatment: string | null
    diagnosis: string | null
    patientId: string
    patientName: string
    patientBirthDate: string | null
    patientIdentification: string | null
    doctorId: string
    doctorUserId: string | null
    doctorName: string
    doctorSpecialty: string | null
    doctorPosition: string | null
    doctorPhone: string | null
    doctorEmail: string | null
    doctorAddress: string | null
    clinicName: string
    logoUrl: string
    signatureUrl: string | null
    stampUrl: string | null
}
