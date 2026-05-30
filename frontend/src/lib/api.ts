/**
 * API del frontend.
 *
 * Modo demo (sin HTTP): por defecto está activo. Los datos viven en memoria + localStorage
 * (`mockStore.ts`). No se hace ninguna petición al backend.
 *
 * Para volver a usar Express cuando lo retomes:
 *   Crea `frontend/.env` con:  VITE_USE_REAL_API=true
 *   (y opcionalmente VITE_API_BASE=http://localhost:4000)
 */
import type { CreateSalePayload, Customer, DashboardMetrics, Product, ProductFilters, SaleRow } from "./apiTypes";
import { mockApi } from "./mockStore";

export type {
  CreateSalePayload,
  Customer,
  DashboardMetrics,
  Product,
  ProductFilters,
  SaleLineDisplay,
  SaleLineInput,
  SaleRow
} from "./apiTypes";

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === "true";
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }
  return (await res.json()) as T;
}

const realApi = {
  dashboard: () => request<DashboardMetrics>("/api/dashboard"),
  listCustomers: () => request<Customer[]>("/api/customers"),
  createCustomer: (data: Pick<Customer, "name" | "email" | "phone" | "address">) =>
    request<Customer>("/api/customers", { method: "POST", body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => request<unknown>(`/api/customers/${id}`, { method: "DELETE" }),
  listProducts: (filters?: ProductFilters) => {
    const params = new URLSearchParams();
    if (filters?.nombre?.trim()) params.set("nombre", filters.nombre.trim());
    if (filters?.rubro?.trim()) params.set("rubro", filters.rubro.trim());
    if (filters?.ordenPrecio) params.set("ordenPrecio", filters.ordenPrecio);
    const query = params.toString();
    return request<Product[]>(`/api/products${query ? `?${query}` : ""}`);
  },
  listProductRubros: () => request<string[]>("/api/products/rubros"),
  listProductProveedores: () => request<number[]>("/api/products/proveedores"),
  getProduct: (id: number | string) => request<Product>(`/api/products/${id}`),
  createProduct: (data: {
    nombre: string;
    rubro?: string | null;
    costo?: number | string | null;
    precio1: number | string;
    precio2?: number | string | null;
    precio3?: number | string | null;
    proveedorId?: number | null;
  }) =>
    request<Product>("/api/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: number | string, data: Partial<Product>) =>
    request<Product>(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  createSale: (data: CreateSalePayload) => request<unknown>("/api/sales", { method: "POST", body: JSON.stringify(data) }),
  listSales: () => request<SaleRow[]>("/api/sales")
};

export const api = USE_REAL_API ? realApi : mockApi;
