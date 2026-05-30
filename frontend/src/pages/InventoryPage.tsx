import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import { api, type Product, type ProductFilters } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

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
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>({});

  const load = useCallback((filters: ProductFilters = {}) => {
    setLoading(true);
    setError(null);
    api
      .listProducts(filters)
      .then(setRows)
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    load({ nombre: debouncedSearch, rubro, ordenPrecio });
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
    const onSale = () => load({ nombre: debouncedSearch, rubro, ordenPrecio });
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
      rubro: product.rubro ?? "",
      proveedorId: product.proveedorId ?? ""
    });
  };

  const closeEditor = () => {
    setEditing(null);
    setForm({});
    setSaving(false);
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
      await Promise.all([
        load({ nombre: debouncedSearch, rubro, ordenPrecio }),
        api.listProductRubros().then(setRubros),
        api.listProductProveedores().then(setProveedores)
      ]);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
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
          <button
            type="button"
            className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-700"
            onClick={() => openEditor(p)}
          >
            Editar
          </button>
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
        <PageHeader title="Productos" subtitle="Consulta de productos desde Supabase." tone="emerald" />

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
            <span className="font-medium text-slate-700 dark:text-slate-300">Ordenar por precio</span>
            <select
              value={ordenPrecio}
              onChange={(e) => setOrdenPrecio(e.target.value as ProductFilters["ordenPrecio"])}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/50"
            >
              <option value="">Nombre A-Z</option>
              <option value="precio1_asc">Precio 1 menor a mayor</option>
              <option value="precio1_desc">Precio 1 mayor a menor</option>
            </select>
          </label>
         
        </div>
      </div>

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
        title="Listado"
        accent="emerald"
        columns={columns}
        rows={rows}
        emptyMessage={hasActiveFilters ? "No hay productos que coincidan con esos filtros." : "No hay productos registrados."}
      />

      {editing ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Editar producto</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Los cambios se guardan en Supabase.</p>
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

              <label className="block text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Costo</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costo ?? ""}
                  onChange={(e) => setForm((current) => ({ ...current, costo: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="block text-sm">
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

              {(["precio1", "precio2", "precio3"] as const).map((field, index) => (
                <label key={field} className="block text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Precio {index + 1}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form[field] ?? ""}
                    onChange={(e) => setForm((current) => ({ ...current, [field]: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
              ))}

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
