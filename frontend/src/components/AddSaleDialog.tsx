import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type Customer, type Product } from "../lib/api";
import { notifySaleCreated } from "../lib/events";

function todayISODateLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type AddSaleDialogProps = {
  onClose: () => void;
  onCreated?: () => void;
};

export default function AddSaleDialog({ onClose, onCreated }: AddSaleDialogProps) {
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [soldAt, setSoldAt] = useState(todayISODateLocal);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [productId, setProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const lineTotal = useMemo(() => Math.max(0, qty) * Math.max(0, unitPrice), [qty, unitPrice]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLoadingCustomers(true);
      api
        .listCustomersPage({ q: customerSearch, limit: 10, offset: 0 })
        .then((result) => setCustomers(result.rows))
        .catch((e) => setError(String((e as Error)?.message ?? e)))
        .finally(() => setLoadingCustomers(false));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [customerSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLoadingProducts(true);
      api
        .listProductsPage({ nombre: productSearch, limit: 10, offset: 0 })
        .then((result) => setProducts(result.rows))
        .catch((e) => setError(String((e as Error)?.message ?? e)))
        .finally(() => setLoadingProducts(false));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [productSearch]);

  const showCustomerResults = customerSearch.trim() !== selectedCustomerName.trim();
  const showProductResults = productSearch.trim() !== selectedProductName.trim();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!productId) {
      setError("Selecciona un producto.");
      return;
    }
    if (!Number.isFinite(qty) || qty < 1) {
      setError("La cantidad debe ser al menos 1.");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("El precio no es valido.");
      return;
    }

    setSaving(true);
    try {
      await api.createSale({
        soldAt,
        customerId: customerId || null,
        metodoPago,
        items: [{ productId, qty, unitPrice }]
      });
      notifySaleCreated();
      onCreated?.();
      onClose();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] dark:bg-slate-950/70"
        aria-label="Cerrar"
        onClick={onClose}
        disabled={saving}
      />
      <div className="relative z-[110] w-full max-w-lg rounded-t-lg border border-slate-200/90 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900 sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Nueva venta</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Fecha de venta</span>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
                required
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Metodo de pago</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Mercado Pago">Mercado Pago</option>
                <option value="Cuenta Corriente">Cuenta Corriente</option>
              </select>
            </label>

            <label className="relative block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">Cliente</span>
              <input
                type="search"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerId("");
                  setSelectedCustomerName("");
                }}
                placeholder="Buscar cliente por nombre o dejar vacio para Consumidor Final"
              />
              {customerId ? (
                <button
                  type="button"
                  className="mt-1 text-xs font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
                  onClick={() => {
                    setCustomerId("");
                    setCustomerSearch("");
                    setSelectedCustomerName("");
                  }}
                >
                  Usar Consumidor Final
                </button>
              ) : null}
              {showCustomerResults ? (
                <div className="absolute left-0 right-0 top-full z-[120] mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {loadingCustomers ? (
                    <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Buscando clientes...</div>
                  ) : customers.length ? (
                    customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-violet-50 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={() => {
                          setCustomerId(customer.id);
                          setCustomerSearch(customer.name);
                          setSelectedCustomerName(customer.name);
                        }}
                      >
                        <span className="block font-medium">{customer.name}</span>
                        {customer.phone || customer.cuit ? (
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {[customer.phone, customer.cuit].filter(Boolean).join(" - ")}
                          </span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Sin coincidencias.</div>
                  )}
                </div>
              ) : null}
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="relative block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">Producto</span>
              <input
                type="search"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductId("");
                  setSelectedProductName("");
                  setUnitPrice(0);
                }}
                placeholder="Buscar producto"
                required
              />
              {showProductResults ? (
                <div className="absolute left-0 right-0 top-full z-[120] mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {loadingProducts ? (
                    <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Buscando productos...</div>
                  ) : products.length ? (
                    products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-800 hover:bg-violet-50 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={() => {
                          setProductId(String(product.id));
                          setProductSearch(product.nombre);
                          setSelectedProductName(product.nombre);
                          setUnitPrice(Number(product.precio1));
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{product.nombre}</span>
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{product.rubro ?? "Sin rubro"}</span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                          ${Number(product.precio1).toFixed(2)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Sin coincidencias.</div>
                  )}
                </div>
              ) : null}
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Cantidad</span>
              <input
                type="number"
                min={1}
                step={1}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                required
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Precio unitario</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
            <span className="font-medium text-emerald-800 dark:text-emerald-200">Total</span>
            <span className="text-lg font-bold tabular-nums text-emerald-900 dark:text-emerald-100">${lineTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || loadingCustomers || loadingProducts}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
