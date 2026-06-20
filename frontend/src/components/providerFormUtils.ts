import type { Provider } from "../lib/api";

export type ProviderForm = Omit<Provider, "id">;

export const emptyProviderForm: ProviderForm = {
  nombre: "",
  direccion: "",
  telefono: "",
  email: "",
  cuit: "",
  aclaracion: ""
};

export type ProviderField = {
  key: keyof ProviderForm;
  label: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  help?: string;
};

export const providerFields: ProviderField[] = [
  { key: "nombre", label: "Nombre", required: true, maxLength: 100 },
  { key: "direccion", label: "Direccion", maxLength: 150 },
  { key: "telefono", label: "Telefono", maxLength: 30 },
  { key: "email", label: "Email", type: "email", maxLength: 50 },
  { key: "cuit", label: "CUIT", maxLength: 11, help: "sin guiones" },
  { key: "aclaracion", label: "Aclaracion", maxLength: 50 }
] as const;

export function providerToForm(provider: Provider): ProviderForm {
  return {
    nombre: provider.nombre ?? "",
    direccion: provider.direccion ?? "",
    telefono: provider.telefono ?? "",
    email: provider.email ?? "",
    cuit: provider.cuit ?? "",
    aclaracion: provider.aclaracion ?? ""
  };
}

export function cleanProviderForm(form: ProviderForm): ProviderForm {
  return {
    nombre: form.nombre.trim(),
    direccion: form.direccion?.trim() || null,
    telefono: form.telefono?.trim() || null,
    email: form.email?.trim() || null,
    cuit: form.cuit?.trim() || null,
    aclaracion: form.aclaracion?.trim() || null
  };
}
