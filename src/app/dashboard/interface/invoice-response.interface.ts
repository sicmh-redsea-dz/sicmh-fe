export interface InvoiceResponse {
  data: Data;
}

export interface Data {
  invoices: Invoice[];
}

export interface Invoice {
  FacturaID:    string;
  Paciente:     string;
  Doctor:       string;
  FechaFactura: string;
  Estado:       string;
  Monto:        string;
  TipoVisita?:  string | null;
  InvoiceNumber: string;
}

export interface InvoiceForm {
  date:    Date;
  doctor:  string;
  pMethod: string;
  patient: string;
  amount: string;
  service: string[];
  elderlyDiscount?: number;
  promCode?: string;
  discount?: number;
}
