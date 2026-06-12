import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddProductDialog from "../components/AddProductDialog";
import BulkUpdateProductsDialog from "../components/BulkUpdateProductsDialog";
import DataTable, { type Column } from "../components/DataTable";
import EditProductDialog from "../components/EditProductDialog";
import ExportProductsDialog from "../components/ExportProductsDialog";
import ModalPortal from "../components/ModalPortal";
import PageHeader from "../components/PageHeader";
import PaginationControls from "../components/PaginationControls";
import SuccessToast from "../components/SuccessToast";
import { api, type PaginatedResult, type Product, type ProductFilters, type Provider } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";
import { buildRubroOptions } from "../lib/rubros";

type ProductCacheEntry = {
  result: PaginatedResult<Product>;
  timestamp: number;
};

const PAGE_SIZE = 100;
const PRODUCT_CACHE_TTL_MS = 2 * 60 * 1000;
const productListCache = new Map<string, ProductCacheEntry>();
const pendingProductRequests = new Map<string, Promise<PaginatedResult<Product>>>();

function productCacheKey(filters: ProductFilters = {}, page = 0) {
  return JSON.stringify({
    nombre: filters.nombre?.trim() ?? "",
    rubro: filters.rubro?.trim() ?? "",
    proveedorId: filters.proveedorId == null ? "" : String(filters.proveedorId),
    ordenPrecio: filters.ordenPrecio ?? "",
    page
  });
}

function clearProductListCache() {
  productListCache.clear();
  pendingProductRequests.clear();
}

function fmtMoney(value?: string | null) {
  if (!value) return "-";
  const amount = Number(value);
  return Number.isNaN(amount) ? value : `$${amount.toFixed(2)}`;
}

export default function InventoryPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [rubros, setRubros] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<Provider[]>([]);
  const [rubro, setRubro] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [ordenPrecio, setOrdenPrecio] = useState<ProductFilters["ordenPrecio"]>("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async (filters: ProductFilters = {}, pageIndex = page, options: { force?: boolean } = {}) => {
    const key = productCacheKey(filters, pageIndex);
    const cached = productListCache.get(key);

    if (!options.force && cached && Date.now() - cached.timestamp < PRODUCT_CACHE_TTL_MS) {
      setRows(cached.result.rows);
      setTotalRows(cached.result.total);
      setLoading(false);
      setError(null);
      return cached.result;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    try {
      let request = pendingProductRequests.get(key);

      if (!request || options.force) {
        request = api.listProductsPage({ ...filters, limit: PAGE_SIZE, offset: pageIndex * PAGE_SIZE });
        pendingProductRequests.set(key, request);
      }

      const result = await request;
      productListCache.set(key, { result, timestamp: Date.now() });

      if (requestIdRef.current === requestId) {
        setRows(result.rows);
        setTotalRows(result.total);
      }

      return result;
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
  }, [page]);

  const refreshProductMetadata = useCallback(async () => {
    const [rubrosList, proveedoresList] = await Promise.all([api.listProductRubros(), api.listProviders()]);
    setRubros(rubrosList);
    setProveedores(proveedoresList);
  }, []);

  const refreshProducts = useCallback(async () => {
    clearProductListCache();
    await Promise.all([load({ nombre: debouncedSearch, rubro, proveedorId, ordenPrecio }, page, { force: true }), refreshProductMetadata()]);
  }, [debouncedSearch, load, ordenPrecio, page, proveedorId, refreshProductMetadata, rubro]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(0);
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    void load({ nombre: debouncedSearch, rubro, proveedorId, ordenPrecio }, page).catch(() => undefined);
  }, [debouncedSearch, load, ordenPrecio, page, proveedorId, rubro]);

  useEffect(() => {
    refreshProductMetadata().catch((e) => setError(String((e as Error)?.message ?? e)));
  }, [refreshProductMetadata]);

  useEffect(() => {
    const onSale = () => {
      void refreshProducts().catch(() => undefined);
    };
    window.addEventListener(CRM_SALE_CREATED_EVENT, onSale);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, onSale);
  }, [refreshProducts]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const closeDeleteDialog = () => {
    setDeletingProduct(null);
    setDeleting(false);
  };

  const deleteSelectedProduct = async () => {
    if (!deletingProduct) return;

    setDeleting(true);
    setError(null);

    try {
      await api.deleteProduct(deletingProduct.id);
      closeDeleteDialog();
      await refreshProducts();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Product>[] = useMemo(
    () => [
      { key: "nombre", header: "Nombre", render: (p) => <span className="font-medium">{p.nombre}</span> },
      { key: "precio1", header: "Precio 1", className: "whitespace-nowrap text-right", render: (p) => fmtMoney(p.precio1) },
      { key: "precio2", header: "Precio 2", className: "whitespace-nowrap text-right", render: (p) => fmtMoney(p.precio2 ?? null) },
      { key: "precio3", header: "Precio 3", className: "whitespace-nowrap text-right", render: (p) => fmtMoney(p.precio3 ?? null) },
      { key: "costo", header: "Costo", className: "whitespace-nowrap text-right", render: (p) => fmtMoney(p.costo ?? null) },
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
              onClick={() => setEditing(p)}
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
    []
  );

  const resultLabel = loading
    ? "Cargando productos..."
    : `${totalRows} producto${totalRows === 1 ? "" : "s"}${debouncedSearch || rubro || proveedorId ? " encontrados" : ""}`;

  const hasActiveFilters = Boolean(debouncedSearch || rubro || proveedorId || ordenPrecio);
  const rubroOptions = buildRubroOptions(rubros, rubro);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader title="Productos" tone="emerald" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowBulkUpdate(true)}
              className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-amber-900/60 dark:bg-slate-950/40 dark:text-amber-200 dark:hover:bg-amber-950/40 dark:focus:ring-amber-800"
            >
              Actualizacion masiva
            </button>
            <button
              type="button"
              onClick={() => setShowExport(true)}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:border-emerald-900/60 dark:bg-slate-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/40 dark:focus:ring-emerald-800"
            >
              Exportar Excel
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-800"
            >
              + Agregar producto
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)_minmax(180px,240px)_minmax(180px,220px)]">
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
              onChange={(e) => {
                setPage(0);
                setRubro(e.target.value);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/50"
            >
              <option value="">Todos</option>
              {rubroOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Proveedor</span>
            <select
              value={proveedorId}
              onChange={(e) => {
                setPage(0);
                setProveedorId(e.target.value);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/50"
            >
              <option value="">Todos</option>
              {proveedores.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Ordenar</span>
            <select
              value={ordenPrecio}
              onChange={(e) => {
                setPage(0);
                setOrdenPrecio(e.target.value as ProductFilters["ordenPrecio"]);
              }}
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
        <AddProductDialog
          proveedores={proveedores}
          rubros={rubros}
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            await refreshProducts();
            setSuccessMessage("Producto agregado con exito.");
          }}
        />
      ) : null}

      {showExport ? <ExportProductsDialog rubros={rubros} onClose={() => setShowExport(false)} /> : null}

      {showBulkUpdate ? (
        <BulkUpdateProductsDialog
          rubros={rubros}
          onClose={() => setShowBulkUpdate(false)}
          onUpdated={async (updated) => {
            await refreshProducts();
            setSuccessMessage(`${updated} producto${updated === 1 ? "" : "s"} actualizado${updated === 1 ? "" : "s"} con exito.`);
          }}
        />
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
              setProveedorId("");
              setOrdenPrecio("");
              setPage(0);
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

      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        total={totalRows}
        loading={loading}
        itemLabel="productos"
        onPageChange={setPage}
      />

      {deletingProduct ? (
        <ModalPortal>
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
        </ModalPortal>
      ) : null}

      {editing ? (
        <EditProductDialog
          product={editing}
          proveedores={proveedores}
          rubros={rubros}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await refreshProducts();
            setSuccessMessage("Producto modificado con exito.");
          }}
        />
      ) : null}

      {successMessage ? <SuccessToast message={successMessage} onClose={() => setSuccessMessage(null)} /> : null}
    </div>
  );
}
