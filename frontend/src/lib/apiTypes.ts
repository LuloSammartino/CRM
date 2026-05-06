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
  address?: string | null;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  unitPrice: string;
  stockQty: number;
  createdAt: string;
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

/** Fila para listado / pantalla Ventas */
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
