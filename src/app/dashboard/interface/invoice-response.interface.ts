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