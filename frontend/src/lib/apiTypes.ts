export type DashboardMetrics = {
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  todaySalesCount: number;
  todaySalesTotal: number;
};

export type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  direccion?: string | null;
  direccion1?: string | null;
  direccion2?: string | null;
  cuit?: string | null;
  iva?: string | null;
  tipo?: string | null;
  razonSocial?: string | null;
  createdAt: string;
};

export type CurrentAccountDebtor = {
  id: string;
  name: string;
  phone?: string | null;
  cuit?: string | null;
  saldo: number;
};

export type CustomerMovement = {
  id: number;
  cliente_id: number;
  venta_id: number | null;
  tipo: "DEUDA" | "PAGO";
  monto: number;
  detalle: string | null;
  fecha: string;
};

export type CreateCustomerPaymentPayload = {
  monto: number;
  detalle: string;
};

export type CreateCustomerPaymentResponse = {
  ok: boolean;
  message: string;
};

export type Product = {
  id: number;
  nombre: string;
  rubro?: string | null;
  costo?: string | null;
  precio1: string;
  precio2?: string | null;
  precio3?: string | null;
  creado?: string;
  modificado?: string | null;
  proveedorId?: number | string | null;
  precio1Pct?: number | null;
  precio2Pct?: number | null;
  precio3Pct?: number | null;
};

export type Provider = {
  id: string;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  cuit?: string | null;
  aclaracion?: string | null;
};

export type ProductFilters = {
  nombre?: string;
  rubro?: string;
  proveedorId?: number | string;
  ordenPrecio?: "precio1_asc" | "precio1_desc" | "";
};

export type PaginationParams = {
  limit?: number;
  offset?: number;
};

export type SaleFilters = {
  product?: string;
  customer?: string;
};

export type PaginatedResult<T> = {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
};

export type CustomerFilters = {
  q?: string;
  phone?: string;
  iva?: string;
};

export type ProviderFilters = {
  q?: string;
  nombre?: string;
};

export type SaleLineInput = {
  productId: string;
  qty: number;
  unitPrice: number;
};

export type CreateSalePayload =
  | {
      soldAt: string;
      customerId?: string | null;
      metodoPago?: string;
      detalle?: string | null;
      items: SaleLineInput[];
    }
  | {
      soldAt: string;
      customerId: string;
      items: SaleLineInput[];
    }
  | {
      soldAt: string;
      newCustomer: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
      };
      items: SaleLineInput[];
    };

export type SaleLineDisplay = {
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type SaleRow = {
  id: string;
  createdAt: string;
  fecha?: string | null;
  hora?: string | null;
  customerId: string | null;
  customerName: string;
  metodoPago?: string;
  total: number;
  lines: SaleLineDisplay[];
};
