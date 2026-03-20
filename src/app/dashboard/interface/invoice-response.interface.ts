export interface InvoiceResponse {
  data: Data;
}

export interface Data {
  invoices: Invoice[];
}

export interface Invoice {
  FacturaID:    number;
  Paciente:     string;
  Doctor:       string;
  FechaFactura: string;
  Estado:       string;
  Monto:        string;
  InvoiceNumber: string;
}

export interface InvoiceForm {
  date:    Date;
  doctor:  string;
  pMethod: string;
  patient: string;
  amount: string;
  service: number[];
  elderlyDiscount?: number;
  promCode?: string;
  discount?: number;
}
