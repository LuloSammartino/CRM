import type { Customer } from "../lib/api";

export type CustomerForm = Omit<Customer, "id" | "createdAt">;

export const emptyCustomerForm: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  direccion: "",
  telefono2: "",
  direccion2: "",
  cuit: "",
  iva: "",
  tipo: "",
  razonSocial: ""
};

export type CustomerField = {
  key: keyof CustomerForm;
  label: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  help?: string;
};

export const customerFields: CustomerField[] = [
  { key: "name", label: "Nombre", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Telefono" },
  { key: "direccion", label: "Direccion" },
  { key: "telefono2", label: "Telefono 2" },
  { key: "direccion2", label: "Direccion 2" },
  { key: "cuit", label: "CUIT", maxLength: 11, help: "sin guiones" },
  { key: "iva", label: "IVA" },
  { key: "tipo", label: "Tipo" },
  { key: "razonSocial", label: "Razon social" }
] as const;

export const ivaOptions = ["RESP. INSCRIPTO", "CONSUMIDOR FINAL", "EXENTO"] as const;

export function customerToForm(customer: Customer): CustomerForm {
  return {
    name: customer.name ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    direccion: customer.direccion ?? "",
    telefono2: customer.telefono2 ?? "",
    direccion2: customer.direccion2 ?? "",
    cuit: customer.cuit ?? "",
    iva: customer.iva ?? "",
    tipo: customer.tipo ?? "",
    razonSocial: customer.razonSocial ?? ""
  };
}

export function cleanCustomerForm(form: CustomerForm): CustomerForm {
  return {
    name: form.name.trim(),
    email: form.email?.trim() || null,
    phone: form.phone?.trim() || null,
    direccion: form.direccion?.trim() || null,
    telefono2: form.telefono2?.trim() || null,
    direccion2: form.direccion2?.trim() || null,
    cuit: form.cuit?.trim() || null,
    iva: form.iva?.trim() || null,
    tipo: form.tipo?.trim() || null,
    razonSocial: form.razonSocial?.trim() || null
  };
}
