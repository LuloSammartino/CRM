import type {
  CreateSalePayload,
  Customer,
  CustomerFilters,
  DashboardMetrics,
  PaginatedResult,
  PaginationParams,
  Product,
  ProductFilters,
  SaleRow
} from "./apiTypes";

export type {
  CreateSalePayload,
  Customer,
  CustomerFilters,
  DashboardMetrics,
  PaginatedResult,
  PaginationParams,
  Product,
  ProductFilters,
  SaleLineDisplay,
  SaleLineInput,
  SaleRow
} from "./apiTypes";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  dashboard: () => request<DashboardMetrics>("/api/dashboard"),
  listCustomers: () => request<Customer[]>("/api/customers"),
  listCustomersPage: (filters?: CustomerFilters & PaginationParams) => {
    const params = new URLSearchParams();
    if (filters?.q?.trim()) params.set("q", filters.q.trim());
    params.set("limit", String(filters?.limit ?? 100));
    params.set("offset", String(filters?.offset ?? 0));
    return request<PaginatedResult<Customer>>(`/api/customers?${params.toString()}`);
  },
  createCustomer: (data: Omit<Customer, "id" | "createdAt">) =>
    request<Customer>("/api/customers", { method: "POST", body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: Partial<Omit<Customer, "id" | "createdAt">>) =>
    request<Customer>(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => request<unknown>(`/api/customers/${id}`, { method: "DELETE" }),
  listProducts: (filters?: ProductFilters) => {
    const params = new URLSearchParams();
    if (filters?.nombre?.trim()) params.set("nombre", filters.nombre.trim());
    if (filters?.rubro?.trim()) params.set("rubro", filters.rubro.trim());
    if (filters?.ordenPrecio) params.set("ordenPrecio", filters.ordenPrecio);
    const query = params.toString();
    return request<Product[]>(`/api/products${query ? `?${query}` : ""}`);
  },
  listProductsPage: (filters?: ProductFilters & PaginationParams) => {
    const params = new URLSearchParams();
    if (filters?.nombre?.trim()) params.set("nombre", filters.nombre.trim());
    if (filters?.rubro?.trim()) params.set("rubro", filters.rubro.trim());
    if (filters?.ordenPrecio) params.set("ordenPrecio", filters.ordenPrecio);
    params.set("limit", String(filters?.limit ?? 100));
    params.set("offset", String(filters?.offset ?? 0));
    return request<PaginatedResult<Product>>(`/api/products?${params.toString()}`);
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
  }) => request<Product>("/api/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: number | string, data: Partial<Product>) =>
    request<Product>(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id: number | string) => request<void>(`/api/products/${id}`, { method: "DELETE" }),
  createSale: (data: CreateSalePayload) => request<unknown>("/api/sales", { method: "POST", body: JSON.stringify(data) }),
  listSalesPage: (params?: PaginationParams) => {
    const query = new URLSearchParams();
    query.set("limit", String(params?.limit ?? 50));
    query.set("offset", String(params?.offset ?? 0));
    return request<PaginatedResult<SaleRow>>(`/api/sales?${query.toString()}`);
  },
  listSales: async () => {
    const result = await api.listSalesPage({ limit: 100, offset: 0 });
    return result.rows;
  }
};
