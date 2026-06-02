import type { CreateSalePayload, Customer, DashboardMetrics, Product, ProductFilters, SaleRow } from "./apiTypes";

const MOCK_STORAGE_KEY = "crm-mock-v2";

type Persisted = {
  customers: Customer[];
  products: Product[];
  sales: SaleRow[];
};

function nowIso() {
  return new Date().toISOString();
}

function customerId() {
  return `c_${crypto.randomUUID?.() ?? Date.now()}`;
}

function seedData(): Persisted {
  const now = nowIso();
  return {
    customers: [
      {
        id: customerId(),
        name: "Maria Lopez",
        email: "maria@ejemplo.com",
        phone: "+54 11 6000-1111",
        direccion: "Av. Corrientes 1234",
        createdAt: now
      }
    ],
    products: [
      {
        id: 1,
        nombre: "Notebook 15",
        rubro: "Electronica",
        costo: "600.00",
        precio1: "899.99",
        precio2: "849.00",
        precio3: "799.00",
        creado: now,
        modificado: now,
        proveedorId: null
      },
      {
        id: 2,
        nombre: "Mouse inalambrico",
        rubro: "Perifericos",
        costo: "10.00",
        precio1: "24.50",
        precio2: "22.00",
        precio3: "20.00",
        creado: now,
        modificado: now,
        proveedorId: null
      }
    ],
    sales: []
  };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      const initial = seedData();
      save(initial);
      return initial;
    }
    return JSON.parse(raw) as Persisted;
  } catch {
    const initial = seedData();
    save(initial);
    return initial;
  }
}

function save(data: Persisted) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApi = {
  async dashboard(): Promise<DashboardMetrics> {
    await delay(60);
    const { customers, sales } = load();
    return {
      totalCustomers: customers.length,
      lowStockProducts: 0,
      todaySalesCount: sales.length,
      todaySalesTotal: sales.reduce((sum, sale) => sum + sale.total, 0)
    };
  },

  async listCustomers(): Promise<Customer[]> {
    await delay(60);
    return [...load().customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createCustomer(data: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
    await delay(80);
    const state = load();
    const customer: Customer = {
      id: customerId(),
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      direccion: data.direccion ?? null,
      direccion1: data.direccion1 ?? null,
      direccion2: data.direccion2 ?? null,
      cuit: data.cuit ?? null,
      iva: data.iva ?? null,
      tipo: data.tipo ?? null,
      razonSocial: data.razonSocial ?? null,
      createdAt: nowIso()
    };
    state.customers.push(customer);
    save(state);
    return customer;
  },

  async updateCustomer(id: string, data: Partial<Omit<Customer, "id" | "createdAt">>): Promise<Customer> {
    await delay(80);
    const state = load();
    const customer = state.customers.find((item) => item.id === id);
    if (!customer) throw new Error("Cliente no encontrado (modo demo).");
    Object.assign(customer, data);
    save(state);
    return customer;
  },

  async deleteCustomer(id: string): Promise<{ ok: true }> {
    await delay(80);
    const state = load();
    state.customers = state.customers.filter((customer) => customer.id !== id);
    state.sales = state.sales.filter((sale) => sale.customerId !== id);
    save(state);
    return { ok: true };
  },

  async listProducts(filters?: ProductFilters): Promise<Product[]> {
    await delay(60);
    const nombre = filters?.nombre?.trim().toLowerCase();
    const rubro = filters?.rubro?.trim().toLowerCase();
    return [...load().products]
      .filter((product) => (nombre ? product.nombre.toLowerCase().includes(nombre) : true))
      .filter((product) => (rubro ? (product.rubro ?? "").toLowerCase().includes(rubro) : true))
      .sort((a, b) => {
        if (filters?.ordenPrecio === "precio1_asc") return Number(a.precio1) - Number(b.precio1);
        if (filters?.ordenPrecio === "precio1_desc") return Number(b.precio1) - Number(a.precio1);
        return (b.creado ?? "").localeCompare(a.creado ?? "");
      });
  },

  async listProductRubros(): Promise<string[]> {
    await delay(60);
    return [...new Set(load().products.map((product) => product.rubro).filter(Boolean) as string[])].sort();
  },

  async listProductProveedores(): Promise<number[]> {
    await delay(60);
    return [
      ...new Set(
        load()
          .products.map((product) => Number(product.proveedorId))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    ].sort((a, b) => a - b);
  },

  async getProduct(id: number | string): Promise<Product> {
    await delay(60);
    const product = load().products.find((item) => String(item.id) === String(id));
    if (!product) throw new Error("Producto no encontrado (modo demo).");
    return product;
  },

  async createProduct(data: {
    nombre: string;
    rubro?: string | null;
    costo?: number | string | null;
    precio1: number | string;
    precio2?: number | string | null;
    precio3?: number | string | null;
    proveedorId?: number | string | null;
  }): Promise<Product> {
    await delay(80);
    const state = load();
    const product: Product = {
      id: Math.max(0, ...state.products.map((item) => Number(item.id))) + 1,
      nombre: data.nombre,
      rubro: data.rubro ?? null,
      costo: data.costo == null ? null : String(data.costo),
      precio1: String(data.precio1),
      precio2: data.precio2 == null ? null : String(data.precio2),
      precio3: data.precio3 == null ? null : String(data.precio3),
      creado: nowIso(),
      modificado: nowIso(),
      proveedorId: data.proveedorId ?? null
    };
    state.products.push(product);
    save(state);
    return product;
  },

  async updateProduct(id: number | string, data: Partial<Product>): Promise<Product> {
    await delay(80);
    const state = load();
    const product = state.products.find((item) => String(item.id) === String(id));
    if (!product) throw new Error("Producto no encontrado (modo demo).");
    Object.assign(product, data, { modificado: nowIso() });
    save(state);
    return product;
  },

  async deleteProduct(id: number | string): Promise<void> {
    await delay(80);
    const state = load();
    const nextProducts = state.products.filter((item) => String(item.id) !== String(id));
    if (nextProducts.length === state.products.length) throw new Error("Producto no encontrado (modo demo).");
    state.products = nextProducts;
    save(state);
  },

  async createSale(payload: CreateSalePayload): Promise<unknown> {
    await delay(100);
    const state = load();
    const customerId =
      "newCustomer" in payload
        ? (await this.createCustomer(payload.newCustomer)).id
        : payload.customerId;
    const total = payload.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    const sale: SaleRow = {
      id: `s_${crypto.randomUUID?.() ?? Date.now()}`,
      createdAt: `${payload.soldAt}T12:00:00.000Z`,
      customerId,
      customerName: state.customers.find((customer) => customer.id === customerId)?.name ?? "Cliente",
      total,
      lines: payload.items.map((item) => {
        const product = state.products.find((p) => String(p.id) === String(item.productId));
        return {
          productName: product?.nombre ?? "Producto",
          sku: String(product?.id ?? item.productId),
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.qty * item.unitPrice
        };
      })
    };
    state.sales.push(sale);
    save(state);
    return sale;
  },

  async listSales(): Promise<SaleRow[]> {
    await delay(60);
    return [...load().sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
};
