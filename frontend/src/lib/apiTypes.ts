export type DashboardMetrics = {
  totalCustomers: number;
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

export type ProductFilters = {
  nombre?: string;
  rubro?: string;
  ordenPrecio?: "precio1_asc" | "precio1_desc" | "";
};

export type SaleLineInput = {
  productId: string;
  qty: number;
  unitPrice: number;
};

export type CreateSalePayload =
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
  customerId: string;
  customerName: string;
  total: number;
  lines: SaleLineDisplay[];
};
