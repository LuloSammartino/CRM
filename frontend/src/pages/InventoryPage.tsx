import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import { api, type Product, type ProductFilters } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

type ProductCacheEntry = {
  rows: Product[];
  timestamp: number;
};

const PRODUCT_CACHE_TTL_MS = 2 * 60 * 1000;
const productListCache = new Map<string, ProductCacheEntry>();
const pendingProductRequests = new Map<string, Promise<Product[]>>();
const pricePairs = [
  { price: "precio1", pct: "precio1Pct", label: "precio 1" },
  { price: "precio2", pct: "precio2Pct", label: "precio 2" },
  { price: "precio3", pct: "precio3Pct", label: "precio 3" }
] as const;

type PriceField = (typeof pricePairs)[number]["price"];
type PercentField = (typeof pricePairs)[number]["pct"];
type ProductEditorForm = Partial<Omit<Product, PercentField>> & Partial<Record<PercentField, string>>;
type ProductFormSetter = Dispatch<SetStateAction<ProductEditorForm>>;

function productCacheKey(filters: ProductFilters = {}) {
  return JSON.stringify({
    nombre: filters.nombre?.trim() ?? "",
    rubro: filters.rubro?.trim() ?? "",
    ordenPrecio: filters.ordenPrecio ?? ""
  });
}

function clearProductListCache() {
  productListCache.clear();
  pendingProductRequests.clear();
}

function parseDecimal(value: unknown) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatDecimal(value: number) {
  return value.toFixed(2);
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function profitPercent(costValue: unknown, priceValue: unknown) {
  if (String(priceValue ?? "").trim() === "") return "";
  const cost = parseDecimal(costValue);
  const price = parseDecimal(priceValue);
  if (cost == null || cost === 0 || price == null) return "";
  return formatPercent(((price - cost) / cost) * 100);
}

function priceFromPercent(costValue: unknown, percentValue: unknown) {
  const cost = parseDecimal(costValue);
  const percent = parseDecimal(percentValue);
  if (cost == null || percent == null) return "";
  return formatDecimal(cost * (1 + percent / 100));
}

function emptyProductForm(): ProductEditorForm {
  return {
    nombre: "",
    costo: "",
    precio1: "",
    precio2: "",
    precio3: "",
    precio1Pct: "",
    precio2Pct: "",
    precio3Pct: "",
    rubro: "",
    proveedorId: ""
  };
}

export default function InventoryPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rubros, setRubros] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<number[]>([]);
  const [rubro, setRubro] = useState("");
  const [ordenPrecio, setOrdenPrecio] = useState<ProductFilters["ordenPrecio"]>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductEditorForm>({});
  const [createForm, setCreateForm] = useState<ProductEditorForm>(() => emptyProductForm());
  const requestIdRef = useRef(0);

  const load = useCallback(async (filters: ProductFilters = {}, options: { force?: boolean } = {}) => {
    const key = productCacheKey(filters);
    const cached = productListCache.get(key);

    if (!options.force && cached && Date.now() - cached.timestamp < PRODUCT_CACHE_TTL_MS) {
      setRows(cached.rows);
      setLoading(false);
      setError(null);
      return cached.rows;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    try {
      let request = pendingProductRequests.get(key);

      if (!request || options.force) {
        request = api.listProducts(filters);
        pendingProductRequests.set(key, request);
      }

      const products = await request;
      productListCache.set(key, { rows: products, timestamp: Date.now() });

      if (requestIdRef.current === requestId) {
        setRows(products);
      }

      return products;
    } catch (e) {
      if (requestIdRef.current === requestId) {
        setError(String((e as Error)?.message ?? e));
      }
      throw e;
    } finally {
      pendingProductRequests.delete(key);

      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    void load({ nombre: debouncedSearch, rubro, ordenPrecio }).catch(() => undefined);
  }, [debouncedSearch, load, ordenPrecio, rubro]);

  useEffect(() => {
    Promise.all([api.listProductRubros(), api.listProductProveedores()])
      .then(([rubrosList, proveedoresList]) => {
        setRubros(rubrosList);
        setProveedores(proveedoresList);
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    const onSale = () => {
      clearProductListCache();
      void load({ nombre: debouncedSearch, rubro, ordenPrecio }, { force: true }).catch(() => undefined);
    };
    window.addEventListener(CRM_SALE_CREATED_EVENT, onSale);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, onSale);
  }, [debouncedSearch, load, ordenPrecio, rubro]);

  const fmtMoney = (value?: string | null) => {
    if (!value) return "-";
    const amount = Number(value);
    return Number.isNaN(amount) ? value : `$${amount.toFixed(2)}`;
  };

  const openEditor = (product: Product) => {
    setEditing(product);
    setForm({
      nombre: product.nombre,
      costo: product.costo ?? "",
      precio1: product.precio1,
      precio2: product.precio2 ?? "",
      precio3: product.precio3 ?? "",
      precio1Pct: profitPercent(product.costo, product.precio1),
      precio2Pct: profitPercent(product.costo, product.precio2),
      precio3Pct: profitPercent(product.costo, product.precio3),
      rubro: product.rubro ?? "",
      proveedorId: product.proveedorId ?? ""
    });
  };

  const closeEditor = () => {
    setEditing(null);
    setForm({});
    setSaving(false);
  };

  const closeDeleteDialog = () => {
    setDeletingProduct(null);
    setDeleting(false);
  };

  const updateCostInForm = (setter: ProductFormSetter, value: string) => {
    setter((current) => {
      const next: ProductEditorForm = { ...current, costo: value };

      pricePairs.forEach(({ price, pct }) => {
        const nextPrice = priceFromPercent(value, current[pct]);
        if (nextPrice) next[price] = nextPrice;
      });

      return next;
    });
  };

  const updatePriceInForm = (setter: ProductFormSetter, field: PriceField, pctField: PercentField, value: string) => {
    setter((current) => ({
      ...current,
      [field]: value,
      [pctField]: profitPercent(current.costo, value)
    }));
  };

  const updatePercentInForm = (setter: ProductFormSetter, field: PriceField, pctField: PercentField, value: string) => {
    setter((current) => ({
      ...current,
      [pctField]: value,
      [field]: priceFromPercent(current.costo, value)
    }));
  };

  const saveProduct = async () => {
    if (!editing) return;

    const nombre = String(form.nombre ?? "").trim();
    if (!nombre) {
      setError("El nombre del producto no puede quedar vacio.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.updateProduct(editing.id, {
        nombre,
        costo: form.costo === "" ? null : form.costo,
        precio1: String(form.precio1 ?? "0"),
        precio2: form.precio2 === "" ? null : form.precio2,
        precio3: form.precio3 === "" ? null : form.precio3,
        rubro: form.rubro ? String(form.rubro) : null,
        proveedorId: form.proveedorId === "" ? null : form.proveedorId ?? null
      });
      closeEditor();
      clearProductListCache();
      await Promise.all([
        load({ nombre: debouncedSearch, rubro, ordenPrecio }, { force: true }),
        api.listProductRubros().then(setRubros),
        api.listProductProveedores().then(setProveedores)
      ]);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setError(null);

    const nombre = String(createForm.nombre ?? "").trim();
    if (!nombre || String(createForm.precio1 ?? "").trim() === "") {
      setCreateError("Completá nombre y precio 1 para agregar el producto.");
      return;
    }

    setCreating(true);

    try {
      await api.createProduct({
        nombre,
        costo: createForm.costo === "" ? null : createForm.costo,
        precio1: String(createForm.precio1),
        precio2: createForm.precio2 === "" ? null : createForm.precio2,
        precio3: createForm.precio3 === "" ? null : createForm.precio3,
        rubro: createForm.rubro ? String(createForm.rubro) : null,
        proveedorId: createForm.proveedorId === "" ? null : createForm.proveedorId == null ? null : Number(createForm.proveedorId)
      });

      setCreateForm(emptyProductForm());
      setShowCreate(false);
      clearProductListCache();
      await Promise.all([
        load({ nombre: debouncedSearch, rubro, ordenPrecio }, { force: true }),
        api.listProductRubros().then(setRubros),
        api.listProductProveedores().then(setProveedores)
      ]);
    } catch (e) {
      setCreateError(String((e as Error)?.message ?? e));
    } finally {
      setCreating(false);
    }
  };

  const deleteSelectedProduct = async () => {
    if (!deletingProduct) return;

    setDeleting(true);
    setError(null);

    try {
      await api.deleteProduct(deletingProduct.id);
      closeDeleteDialog();
      clearProductListCache();
      await Promise.all([
        load({ nombre: debouncedSearch, rubro, ordenPrecio }, { force: true }),
        api.listProductRubros().then(setRubros),
        api.listProductProveedores().then(setProveedores)
      ]);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Product>[] = useMemo(
    () => [
      { key: "nombre", header: "Nombre", render: (p) => <span className="font-medium">{p.nombre}</span> },
      { key: "costo", header: "Costo", className: "whitespace-nowrap text-right", render: (p) => fmtMoney(p.costo ?? null) },
      { key: "precio1", header: "Precio 1", className: "whitespace-nowrap text-right", render: (p) => fmtMoney(p.precio1) },
      { key: "precio2", header: "Precio 2", className: "whitespace-nowrap text-right", render: (p) => fmtMoney(p.precio2 ?? null) },
      { key: "precio3", header: "Precio 3", className: "whitespace-nowrap text-right", render: (p) => fmtMoney(p.precio3 ?? null) },
      { key: "rubro", header: "Rubro", render: (p) => p.rubro ?? "-" },
      {
        key: "actions",
        header: "",
        className: "whitespace-nowrap text-right",
        render: (p) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              aria-label="Editar producto"
              title="Editar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => openEditor(p)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.86 4.49 2.65 2.65M6 18l3.1-.34 9.72-9.72a1.87 1.87 0 0 0-2.65-2.65L6.45 15.01 6 18Z" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Eliminar producto"
              title="Eliminar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/60"
              onClick={() => setDeletingProduct(p)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
            </button>
          </div>
        )
      }
    ],
    [rubros, proveedores]
  );

  const resultLabel = loading
    ? "Cargando productos..."
    : `${rows.length} producto${rows.length === 1 ? "" : "s"}${debouncedSearch || rubro ? " encontrados" : ""}`;

  const hasActiveFilters = Boolean(debouncedSearch || rubro || ordenPrecio);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader title="Productos" tone="emerald" />
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreate((value) => !value);
            }}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-800"
          >
            +Agregar producto
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(180px,260px)_minmax(180px,220px)]">
          <label className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Buscar por nombre</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej: limpiahornos"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/50"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Rubro</span>
            <select
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/50"
            >
              <option value="">Todos</option>
              {rubros.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Ordenar</span>
            <select
              value={ordenPrecio}
              onChange={(e) => setOrdenPrecio(e.target.value as ProductFilters["ordenPrecio"])}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/50"
            >
              <option value="">Nombre A-Z</option>
              <option value="precio1_asc">Precio de menor a mayor</option>
              <option value="precio1_desc">Precio de mayor a menor</option>
            </select>
          </label>
         
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Nuevo producto</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => {
                  setCreateError(null);
                  setCreateForm(emptyProductForm());
                  setShowCreate(false);
                }}
                disabled={creating}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {createError ? (
              <div className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                {createError}
              </div>
            ) : null}

            <form onSubmit={createProduct} className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Nombre</span>
              <input
                value={createForm.nombre ?? ""}
                onChange={(e) => setCreateForm((current) => ({ ...current, nombre: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-emerald-800 dark:focus:ring-emerald-900/50"
                placeholder="Ej: Limpiahornos"
                required
              />
            </label>

            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Rubro</span>
              <select
                value={createForm.rubro ?? ""}
                onChange={(e) => setCreateForm((current) => ({ ...current, rubro: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-emerald-800 dark:focus:ring-emerald-900/50"
              >
                <option value="">Sin rubro</option>
                {rubros.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/30">
              <div className="grid gap-3 sm:grid-cols-[minmax(130px,1fr)_90px_minmax(130px,1fr)] sm:items-start">
                <label className="block text-sm sm:pt-4">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Costo</span>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={createForm.costo ?? ""}
                      onChange={(e) => updateCostInForm(setCreateForm, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm shadow-sm outline-none ring-0 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-emerald-800 dark:focus:ring-emerald-900/50"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">$</span>
                  </div>
                </label>

                <div className="grid gap-3 sm:pt-9">
                  {pricePairs.map(({ pct }, index) => (
                    <label key={pct} className="block">
                      <span className="sr-only">Porcentaje precio {index + 1}</span>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={createForm[pct] ?? ""}
                          onChange={(e) => updatePercentInForm(setCreateForm, pricePairs[index].price, pct, e.target.value)}
                          className="w-full rounded-xl border border-emerald-700/20 bg-emerald-300 px-3 py-2 pr-7 text-center text-sm font-bold text-emerald-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-500/50 dark:bg-emerald-500 dark:text-emerald-950"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-950">%</span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="grid gap-3">
                  {pricePairs.map(({ price, pct, label }, index) => (
                    <label key={price} className="block text-sm">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={createForm[price] ?? ""}
                          onChange={(e) => updatePriceInForm(setCreateForm, price, pct, e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm shadow-sm outline-none ring-0 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-emerald-800 dark:focus:ring-emerald-900/50"
                          required={index === 0}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">$</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Proveedor</span>
              <select
                value={createForm.proveedorId == null ? "" : String(createForm.proveedorId)}
                onChange={(e) => setCreateForm((current) => ({ ...current, proveedorId: e.target.value ? Number(e.target.value) : null }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-emerald-800 dark:focus:ring-emerald-900/50"
              >
                <option value="">Sin proveedor</option>
                {proveedores.map((item) => (
                  <option key={item} value={item}>
                    Proveedor {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setCreateForm(emptyProductForm());
                  setShowCreate(false);
                }}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60"
              >
                {creating ? "Guardando..." : "Guardar producto"}
              </button>
            </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
        <span>{resultLabel}</span>
        {hasActiveFilters ? (
          <button
            type="button"
            className="rounded-md border border-emerald-300 bg-white px-3 py-1 font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-emerald-950"
            onClick={() => {
              setSearch("");
              setRubro("");
              setOrdenPrecio("");
            }}
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <DataTable
        
        accent="emerald"
        columns={columns}
        rows={rows}
        loading={loading}
        loadingMessage="Buscando productos..."
        emptyMessage={hasActiveFilters ? "No hay productos que coincidan con esos filtros." : "No hay productos registrados."}
      />

      {deletingProduct ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-slate-900">
            <div className="flex gap-4 px-5 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Eliminar articulo</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Desea eliminar el articulo <span className="font-semibold text-slate-900 dark:text-white">{deletingProduct.nombre}</span>?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                onClick={closeDeleteDialog}
                disabled={deleting}
              >
                No
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                onClick={deleteSelectedProduct}
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Si, eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Editar producto</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={closeEditor}
                disabled={saving}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">Nombre</span>
                <input
                  value={form.nombre ?? ""}
                  onChange={(e) => setForm((current) => ({ ...current, nombre: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">Rubro</span>
                <select
                  value={form.rubro ?? ""}
                  onChange={(e) => setForm((current) => ({ ...current, rubro: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Sin rubro</option>
                  {rubros.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/30">
                <div className="grid gap-3 sm:grid-cols-[minmax(130px,1fr)_90px_minmax(130px,1fr)] sm:items-start">
                  <label className="block text-sm sm:pt-4">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Costo</span>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.costo ?? ""}
                        onChange={(e) => updateCostInForm(setForm, e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">$</span>
                    </div>
                  </label>

                  <div className="grid gap-3 sm:pt-10">
                    {pricePairs.map(({ pct }, index) => (
                      <label key={pct} className="block">
                        <span className="sr-only">Porcentaje precio {index + 1}</span>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={form[pct] ?? ""}
                            onChange={(e) => updatePercentInForm(setForm, pricePairs[index].price, pct, e.target.value)}
                            className="w-full rounded-md border border-emerald-700/20 bg-emerald-300 px-3 py-2 pr-7 text-center text-sm font-bold text-emerald-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-500/50 dark:bg-emerald-500 dark:text-emerald-950"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-950">%</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-3">
                    {pricePairs.map(({ price, pct, label }) => (
                      <label key={price} className="block text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                        <div className="relative mt-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form[price] ?? ""}
                            onChange={(e) => updatePriceInForm(setForm, price, pct, e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">$</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <label className="block text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Proveedor</span>
                <select
                  value={form.proveedorId == null ? "" : String(form.proveedorId)}
                  onChange={(e) => setForm((current) => ({ ...current, proveedorId: e.target.value ? Number(e.target.value) : null }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Sin proveedor</option>
                  {proveedores.map((item) => (
                    <option key={item} value={item}>
                      Proveedor {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                onClick={closeEditor}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                onClick={saveProduct}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
