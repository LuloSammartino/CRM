/**
 * Datos locales para demo sin backend.
 * Persiste en localStorage (clave MOCK_STORAGE_KEY).
 */
import type {
  CreateSalePayload,
  Customer,
  DashboardMetrics,
  Product,
  SaleRow
} from "./apiTypes";

const MOCK_STORAGE_KEY = "crm-mock-v1";

type SaleRecord = {
  id: string;
  createdAt: string;
  customerId: string;
  total: number;
  items: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

type Persisted = {
  customers: Customer[];
  products: Product[];
  sales: SaleRecord[];
};

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Ventas de demostración respetando stock disponible (no deja negativos). */
function buildDemoSalesSafe(customers: Customer[], products: Product[], targetCount: number): SaleRecord[] {
  if (customers.length === 0 || products.length === 0) return [];
  const stocks = new Map(products.map((p) => [p.id, p.stockQty]));
  const sales: SaleRecord[] = [];
  const now = new Date();
  let attempts = 0;
  while (sales.length < targetCount && attempts < 400) {
    attempts++;
    const daysAgo = randomInt(0, 40);
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 12, 0, 0);
    const cust = customers[randomInt(0, customers.length - 1)]!;
    const prod = products[randomInt(0, products.length - 1)]!;
    const cur = stocks.get(prod.id) ?? 0;
    if (cur < 1) continue;
    const qty = randomInt(1, Math.min(3, cur));
    const unitPrice = Number(prod.unitPrice);
    const lineTotal = Math.round(qty * unitPrice * 100) / 100;
    sales.push({
      id: id("s"),
      createdAt: d.toISOString(),
      customerId: cust.id,
      total: lineTotal,
      items: [{ productId: prod.id, qty, unitPrice, lineTotal }]
    });
    stocks.set(prod.id, cur - qty);
  }
  for (const p of products) {
    p.stockQty = stocks.get(p.id) ?? p.stockQty;
  }
  return sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function seedData(): Persisted {
  const t = nowIso();
  const data: Persisted = {
    customers: [
      {
        id: id("c"),
        name: "María López",
        email: "maria@ejemplo.com",
        phone: "+54 11 6000-1111",
        address: "Av. Corrientes 1234",
        createdAt: t
      },
      {
        id: id("c"),
        name: "Juan Pérez",
        email: "juan@ejemplo.com",
        phone: "+54 11 6000-2222",
        address: null,
        createdAt: t
      }
    ],
    products: [
      {
        id: id("p"),
        name: "Notebook 15\"",
        sku: "NB-15-001",
        category: "Electrónica",
        unitPrice: "899.99",
        stockQty: 14,
        createdAt: t
      },
      {
        id: id("p"),
        name: "Mouse inalámbrico",
        sku: "MS-WL-02",
        category: "Periféricos",
        unitPrice: "24.5",
        stockQty: 22,
        createdAt: t
      },
      {
        id: id("p"),
        name: "Teclado mecánico",
        sku: "KB-MX-88",
        category: "Periféricos",
        unitPrice: "129",
        stockQty: 16,
        createdAt: t
      },
      {
        id: id("p"),
        name: "Hub USB-C",
        sku: "HB-USBC-01",
        category: "Accesorios",
        unitPrice: "45",
        stockQty: 28,
        createdAt: t
      }
    ],
    sales: []
  };
  data.sales = buildDemoSalesSafe(data.customers, data.products, randomInt(8, 12));
  return data;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      const initial = seedData();
      save(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed.customers || !parsed.products || !parsed.sales) throw new Error("bad shape");
    if (
      parsed.sales.length === 0 &&
      parsed.customers.length > 0 &&
      parsed.products.length > 0
    ) {
      parsed.sales = buildDemoSalesSafe(parsed.customers, parsed.products, randomInt(7, 10));
      save(parsed);
    }
    return parsed;
  } catch {
    const initial = seedData();
    save(initial);
    return initial;
  }
}

function save(data: Persisted) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
}

function parseSoldAtToIso(soldAtYmd: string): string {
  const [y, m, d] = soldAtYmd.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

function isSameLocalCalendarDay(iso: string, ref: Date): boolean {
  const a = new Date(iso);
  return (
    a.getFullYear() === ref.getFullYear() &&
    a.getMonth() === ref.getMonth() &&
    a.getDate() === ref.getDate()
  );
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockApi = {
  async dashboard(): Promise<DashboardMetrics> {
    await delay(80);
    const { customers, products, sales } = load();
    const today = new Date();
    const lowStockThreshold = 5;
    const todaySales = sales.filter((s) => isSameLocalCalendarDay(s.createdAt, today));
    const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total, 0);
    return {
      totalCustomers: customers.length,
      lowStockProducts: products.filter((p) => p.stockQty <= lowStockThreshold).length,
      todaySalesCount: todaySales.length,
      todaySalesTotal
    };
  },

  async listCustomers(): Promise<Customer[]> {
    await delay(60);
    return [...load().customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createCustomer(data: Pick<Customer, "name" | "email" | "phone" | "address">): Promise<Customer> {
    await delay(80);
    const state = load();
    if (data.email && state.customers.some((c) => c.email === data.email)) {
      throw new Error("Email de cliente duplicado (modo demo).");
    }
    const customer: Customer = {
      id: id("c"),
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      createdAt: nowIso()
    };
    state.customers.push(customer);
    save(state);
    return customer;
  },

  async listProducts(): Promise<Product[]> {
    await delay(60);
    return [...load().products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createProduct(data: {
    name: string;
    sku: string;
    category?: string;
    unitPrice: number;
    stockQty?: number;
  }): Promise<Product> {
    await delay(80);
    const state = load();
    if (state.products.some((p) => p.sku === data.sku)) {
      throw new Error("SKU duplicado (modo demo).");
    }
    const product: Product = {
      id: id("p"),
      name: data.name,
      sku: data.sku,
      category: data.category ?? null,
      unitPrice: String(data.unitPrice),
      stockQty: data.stockQty ?? 0,
      createdAt: nowIso()
    };
    state.products.push(product);
    save(state);
    return product;
  },

  async createSale(payload: CreateSalePayload): Promise<unknown> {
    await delay(120);
    const state = load();

    let customerId: string;
    if ("newCustomer" in payload) {
      const nc = payload.newCustomer;
      if (state.customers.some((c) => c.email && nc.email && c.email === nc.email)) {
        throw new Error("Email de cliente duplicado (modo demo).");
      }
      const customer: Customer = {
        id: id("c"),
        name: nc.name,
        email: nc.email ?? null,
        phone: nc.phone ?? null,
        address: nc.address ?? null,
        createdAt: nowIso()
      };
      state.customers.push(customer);
      customerId = customer.id;
    } else {
      customerId = payload.customerId;
      if (!state.customers.some((c) => c.id === customerId)) {
        throw new Error("Cliente no encontrado (modo demo).");
      }
    }

    const byId = new Map(state.products.map((p) => [p.id, p]));
    for (const line of payload.items) {
      const p = byId.get(line.productId);
      if (!p) throw new Error("Producto no encontrado (modo demo).");
      if (p.stockQty < line.qty) throw new Error(`Stock insuficiente: ${p.name}`);
    }

    let total = 0;
    const items = payload.items.map((line) => {
      const lineTotal = line.qty * line.unitPrice;
      total += lineTotal;
      return {
        productId: line.productId,
        qty: line.qty,
        unitPrice: line.unitPrice,
        lineTotal
      };
    });

    const sale: SaleRecord = {
      id: id("s"),
      createdAt: parseSoldAtToIso(payload.soldAt),
      customerId,
      total,
      items
    };
    state.sales.push(sale);

    for (const line of payload.items) {
      const p = byId.get(line.productId)!;
      p.stockQty -= line.qty;
    }

    save(state);
    return sale;
  },

  async listSales(): Promise<SaleRow[]> {
    await delay(60);
    const state = load();
    const cust = new Map(state.customers.map((c) => [c.id, c]));
    const prod = new Map(state.products.map((p) => [p.id, p]));
    return [...state.sales]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        customerId: s.customerId,
        customerName: cust.get(s.customerId)?.name ?? "—",
        total: s.total,
        lines: s.items.map((it) => {
          const p = prod.get(it.productId);
          return {
            productName: p?.name ?? "—",
            sku: p?.sku ?? "—",
            qty: it.qty,
            unitPrice: it.unitPrice,
            lineTotal: it.lineTotal
          };
        })
      }));
  }
};
