import type {
  CashMovement,
  CreateCashMovementPayload,
  CreateCustomerPaymentPayload,
  CreateCustomerPaymentResponse,
  CreateSalePayload,
  CurrentAccountDebtor,
  Customer,
  CustomerFilters,
  CustomerMovement,
  PaginatedResult,
  PaginationParams,
  Product,
  ProductFilters,
  Provider,
  ProviderFilters,
  SaleFilters,
  SaleRow
} from "./apiTypes";

export type {
  CashMovement,
  CreateCashMovementPayload,
  CreateCustomerPaymentPayload,
  CreateCustomerPaymentResponse,
  CreateSalePayload,
  CurrentAccountDebtor,
  Customer,
  CustomerFilters,
  CustomerMovement,
  PaginatedResult,
  PaginationParams,
  Product,
  ProductFilters,
  Provider,
  ProviderFilters,
  SaleFilters,
  SaleLineDisplay,
  SaleLineInput,
  SaleRow
} from "./apiTypes";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";
const AUTH_SESSION_KEY = "crm_auth_session";
const GENERIC_ERROR_MESSAGE = "Ocurrio un problema, intentalo nuevamente.";
export const AUTH_LOGOUT_EVENT = "crm:auth-logout";

export function getAuthToken() {
  return window.sessionStorage.getItem(AUTH_SESSION_KEY);
}

export function setAuthToken(token: string) {
  window.sessionStorage.setItem(AUTH_SESSION_KEY, token);
}

export function clearAuthToken() {
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
}

function notifyAuthLogout() {
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
}

function responseMessage(text: string) {
  try {
    return JSON.parse(text)?.message ?? GENERIC_ERROR_MESSAGE;
  } catch {
    return GENERIC_ERROR_MESSAGE;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  const token = getAuthToken();

  try {
    res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {})
      },
      ...options
    });
  } catch {
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearAuthToken();
      notifyAuthLogout();
    }
    const text = await res.text().catch(() => "");
    const message = text ? responseMessage(text) : GENERIC_ERROR_MESSAGE;
    throw new Error(res.status >= 500 ? GENERIC_ERROR_MESSAGE : message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  login: (password: string) =>
    request<{ token: string; user: { id: string; username: string } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password })
    }),
  me: () => request<{ user: { id: string; username: string } }>("/api/auth/me"),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data)
    }),
  listCashMovementsPage: (params?: PaginationParams & { date?: string }) => {
    const query = new URLSearchParams();
    if (params?.date?.trim()) query.set("date", params.date.trim());
    query.set("limit", String(params?.limit ?? 100));
    query.set("offset", String(params?.offset ?? 0));
    return request<PaginatedResult<CashMovement>>(`/api/movimientos-caja?${query.toString()}`);
  },
  createCashMovement: (data: CreateCashMovementPayload) =>
    request<CashMovement>("/api/movimientos-caja", { method: "POST", body: JSON.stringify(data) }),
  listExpenseConcepts: () => request<string[]>("/api/movimientos-caja/conceptos"),
  createExpenseConcept: (nombre: string) =>
    request<string>("/api/movimientos-caja/conceptos", { method: "POST", body: JSON.stringify({ nombre }) }),
  listCustomers: () => request<Customer[]>("/api/customers"),
  listCustomersPage: (filters?: CustomerFilters & PaginationParams) => {
    const params = new URLSearchParams();
    if (filters?.q?.trim()) params.set("q", filters.q.trim());
    if (filters?.phone?.trim()) params.set("phone", filters.phone.trim());
    if (filters?.cuit?.trim()) params.set("cuit", filters.cuit.trim());
    if (filters?.iva?.trim()) params.set("iva", filters.iva.trim());
    params.set("limit", String(filters?.limit ?? 100));
    params.set("offset", String(filters?.offset ?? 0));
    return request<PaginatedResult<Customer>>(`/api/customers?${params.toString()}`);
  },
  createCustomer: (data: Omit<Customer, "id" | "createdAt">) =>
    request<Customer>("/api/customers", { method: "POST", body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: Partial<Omit<Customer, "id" | "createdAt">>) =>
    request<Customer>(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => request<unknown>(`/api/customers/${id}`, { method: "DELETE" }),
  listCurrentAccountDebtors: () => request<CurrentAccountDebtor[]>("/api/clientes/cuenta-corriente/deudores"),
  listCustomerMovements: (id: string, ventaId?: string | null) =>
    request<CustomerMovement[]>(`/api/clientes/${id}/movimientos${ventaId ? `?ventaId=${encodeURIComponent(ventaId)}` : ""}`),
  createCustomerPayment: (id: string, data: CreateCustomerPaymentPayload) =>
    request<CreateCustomerPaymentResponse>(`/api/clientes/${id}/pagos`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
  listProviders: (filters?: ProviderFilters) => {
    const params = new URLSearchParams();
    const query = filters?.nombre?.trim() || filters?.q?.trim() || "";
    if (query) params.set("nombre", query);
    const text = params.toString();
    return request<Provider[]>(`/api/proveedores${text ? `?${text}` : ""}`);
  },
  listProvidersPage: (filters?: ProviderFilters & PaginationParams) => {
    const params = new URLSearchParams();
    const query = filters?.nombre?.trim() || filters?.q?.trim() || "";
    if (query) params.set("nombre", query);
    params.set("limit", String(filters?.limit ?? 100));
    params.set("offset", String(filters?.offset ?? 0));
    return request<PaginatedResult<Provider>>(`/api/proveedores?${params.toString()}`);
  },
  createProvider: (data: Omit<Provider, "id">) =>
    request<Provider>("/api/proveedores", { method: "POST", body: JSON.stringify(data) }),
  updateProvider: (id: string, data: Partial<Omit<Provider, "id">>) =>
    request<Provider>(`/api/proveedores/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProvider: (id: string) => request<unknown>(`/api/proveedores/${id}`, { method: "DELETE" }),
  listProducts: (filters?: ProductFilters) => {
    const params = new URLSearchParams();
    if (filters?.nombre?.trim()) params.set("nombre", filters.nombre.trim());
    if (filters?.rubro?.trim()) params.set("rubro", filters.rubro.trim());
    if (filters?.proveedorId) params.set("proveedorId", String(filters.proveedorId));
    if (filters?.ordenPrecio) params.set("ordenPrecio", filters.ordenPrecio);
    const query = params.toString();
    return request<Product[]>(`/api/products${query ? `?${query}` : ""}`);
  },
  listProductsPage: (filters?: ProductFilters & PaginationParams) => {
    const params = new URLSearchParams();
    if (filters?.nombre?.trim()) params.set("nombre", filters.nombre.trim());
    if (filters?.rubro?.trim()) params.set("rubro", filters.rubro.trim());
    if (filters?.proveedorId) params.set("proveedorId", String(filters.proveedorId));
    if (filters?.ordenPrecio) params.set("ordenPrecio", filters.ordenPrecio);
    params.set("limit", String(filters?.limit ?? 100));
    params.set("offset", String(filters?.offset ?? 0));
    return request<PaginatedResult<Product>>(`/api/products?${params.toString()}`);
  },
  listProductRubros: () => request<string[]>("/api/products/rubros"),
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
  bulkUpdateProducts: (data:
    | { mode: "rubro"; rubro: string; percentage: number | string }
    | { mode: "proveedor"; proveedorId: number | string; percentage: number | string }) =>
    request<{ updated: number }>("/api/products/actualizacion-masiva", { method: "POST", body: JSON.stringify(data) }),
  deleteProduct: (id: number | string) => request<void>(`/api/products/${id}`, { method: "DELETE" }),
  createSale: (data: CreateSalePayload) => request<unknown>("/api/sales", { method: "POST", body: JSON.stringify(data) }),
  updateSale: (id: string, data: CreateSalePayload) =>
    request<unknown>(`/api/sales/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSale: (id: string) => request<void>(`/api/sales/${id}`, { method: "DELETE" }),
  listSalesPage: (params?: PaginationParams & SaleFilters) => {
    const query = new URLSearchParams();
    if (params?.product?.trim()) query.set("product", params.product.trim());
    if (params?.customer?.trim()) query.set("customer", params.customer.trim());
    if (params?.date?.trim()) query.set("date", params.date.trim());
    if (params?.dateFrom?.trim()) query.set("dateFrom", params.dateFrom.trim());
    if (params?.dateTo?.trim()) query.set("dateTo", params.dateTo.trim());
    query.set("limit", String(params?.limit ?? 50));
    query.set("offset", String(params?.offset ?? 0));
    return request<PaginatedResult<SaleRow>>(`/api/sales?${query.toString()}`);
  },
  listSales: async (filters?: SaleFilters) => {
    const result = await api.listSalesPage({ ...filters, limit: 100, offset: 0 });
    return result.rows;
  }
};
