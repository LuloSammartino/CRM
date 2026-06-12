import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type Customer, type Product } from "../lib/api";
import { notifySaleCreated } from "../lib/events";
import ModalPortal from "./ModalPortal";
import { profitPercent } from "./productFormUtils";

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

type PriceMode = "precio1" | "precio2" | "precio3" | "manual";

type SaleItemForm = {
  id: number;
  product: Product | null;
  productId: string;
  productSearch: string;
  selectedProductName: string;
  qty: string;
  unitPrice: number;
  priceMode: PriceMode;
};

const priceLabels: Record<Exclude<PriceMode, "manual">, string> = {
  precio1: "Precio 1",
  precio2: "Precio 2",
  precio3: "Precio 3"
};

let nextSaleItemId = 1;

function createSaleItem(): SaleItemForm {
  return {
    id: nextSaleItemId++,
    product: null,
    productId: "",
    productSearch: "",
    selectedProductName: "",
    qty: "1",
    unitPrice: 0,
    priceMode: "precio1"
  };
}

function parsePrice(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pricePercent(product: Product | null | undefined, price: unknown) {
  if (!product) return "";
  return profitPercent(product.costo, price);
}

function pricePercentLabel(product: Product | null | undefined, price: unknown) {
  const percent = pricePercent(product, price);
  return percent ? `${percent}%` : "sin %";
}

function parseQty(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

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
  const [detalle, setDetalle] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItemForm[]>(() => [createSaleItem()]);
  const [activeProductItemId, setActiveProductItemId] = useState<number | null>(null);
  const [productLookupQuery, setProductLookupQuery] = useState("");
  const isCuentaCorriente = metodoPago === "Cuenta Corriente";

  const saleTotal = useMemo(
    () =>
      saleItems.reduce(
        (total, item) => total + Math.max(0, parseQty(item.qty)) * Math.max(0, item.unitPrice),
        0
      ),
    [saleItems]
  );

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
        .listProductsPage({ nombre: productLookupQuery, limit: 10, offset: 0 })
        .then((result) => setProducts(result.rows))
        .catch((e) => setError(String((e as Error)?.message ?? e)))
        .finally(() => setLoadingProducts(false));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [productLookupQuery]);

  const showCustomerResults = customerSearch.trim() !== selectedCustomerName.trim();

  function updateSaleItem(itemId: number, changes: Partial<SaleItemForm>) {
    setSaleItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...changes } : item))
    );
  }

  function selectProduct(itemId: number, product: Product) {
    const price = parsePrice(product.precio1) ?? 0;
    updateSaleItem(itemId, {
      product,
      productId: String(product.id),
      productSearch: product.nombre,
      selectedProductName: product.nombre,
      unitPrice: price,
      priceMode: "precio1"
    });
    setActiveProductItemId(null);
  }

  function updatePriceMode(itemId: number, mode: PriceMode) {
    const item = saleItems.find((currentItem) => currentItem.id === itemId);
    if (!item) return;

    if (mode === "manual" || !item.product) {
      updateSaleItem(itemId, { priceMode: mode });
      return;
    }

    const price = parsePrice(item.product[mode]);
    updateSaleItem(itemId, {
      priceMode: mode,
      ...(price != null ? { unitPrice: price } : {})
    });
  }

  function updateQty(itemId: number, nextQty: number) {
    updateSaleItem(itemId, { qty: String(Math.max(1, Math.trunc(nextQty || 1))) });
  }

  function addSaleItem() {
    setSaleItems((current) => [...current, createSaleItem()]);
  }

  function removeSaleItem(itemId: number) {
    setSaleItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== itemId)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const invalidProductIndex = saleItems.findIndex((item) => !item.productId);
    if (invalidProductIndex >= 0) {
      setError(`Selecciona un producto en la linea ${invalidProductIndex + 1}.`);
      return;
    }

    const invalidQtyIndex = saleItems.findIndex((item) => {
      const qty = parseQty(item.qty);
      return !Number.isFinite(qty) || qty < 1;
    });
    if (invalidQtyIndex >= 0) {
      setError(`La cantidad debe ser al menos 1 en la linea ${invalidQtyIndex + 1}.`);
      return;
    }

    const invalidPriceIndex = saleItems.findIndex((item) => !Number.isFinite(item.unitPrice) || item.unitPrice < 0);
    if (invalidPriceIndex >= 0) {
      setError(`El precio no es valido en la linea ${invalidPriceIndex + 1}.`);
      return;
    }

    if (isCuentaCorriente && !customerId) {
      setError("Selecciona un cliente para ventas en cuenta corriente.");
      return;
    }

    setSaving(true);
    try {
      await api.createSale({
        soldAt,
        customerId: customerId || null,
        metodoPago,
        detalle: isCuentaCorriente ? detalle.trim() || null : null,
        items: saleItems.map((item) => ({
          productId: item.productId,
          qty: parseQty(item.qty),
          unitPrice: item.unitPrice
        }))
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
    <ModalPortal>
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] dark:bg-slate-950/70"
        aria-label="Cerrar"
        onClick={onClose}
        disabled={saving}
      />
      <div className="relative z-[110] max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-slate-200/90 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900 sm:rounded-lg">
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
                onChange={(e) => {
                  setMetodoPago(e.target.value);
                  if (e.target.value !== "Cuenta Corriente") setDetalle("");
                }}
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
                placeholder="Buscar cliente por nombre"
              />
              
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

            {isCuentaCorriente ? (
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">Detalle</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  placeholder="Detalle para cuenta corriente"
                />
              </label>
            ) : null}
          </div>

          <div className="space-y-3">
            {saleItems.map((item, index) => {
              const parsedItemQty = parseQty(item.qty);
              const itemTotal = Math.max(0, parsedItemQty) * Math.max(0, item.unitPrice);
              const showProductResults =
                activeProductItemId === item.id && item.productSearch.trim() !== item.selectedProductName.trim();
              const selectedPricePercent = pricePercent(item.product, item.unitPrice);

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40 sm:grid-cols-2"
                >
                  <div className="flex items-center justify-between sm:col-span-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Producto {index + 1}</span>
                    {saleItems.length > 1 ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600 transition hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
                        onClick={() => removeSaleItem(item.id)}
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>

                  <label className="relative block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Nombre</span>
                    <input
                      type="search"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                      value={item.productSearch}
                      onFocus={() => {
                        setActiveProductItemId(item.id);
                        setProductLookupQuery(item.productSearch);
                      }}
                      onChange={(e) => {
                        const value = e.target.value;
                        setActiveProductItemId(item.id);
                        setProductLookupQuery(value);
                        updateSaleItem(item.id, {
                          product: null,
                          productId: "",
                          productSearch: value,
                          selectedProductName: "",
                          unitPrice: 0,
                          priceMode: "precio1"
                        });
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
                              onClick={() => selectProduct(item.id, product)}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{product.nombre}</span>
                                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                  {product.rubro ?? "Sin rubro"}
                                </span>
                              </span>
                              <span className="shrink-0 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                                ${Number(product.precio1).toFixed(2)}
                                <span className="block text-[11px] font-medium text-emerald-800/75 dark:text-emerald-200/80">
                                  {pricePercentLabel(product, product.precio1)}
                                </span>
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
                    <div className="mt-1 flex h-10 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:border-violet-400 dark:focus-within:ring-violet-900/50">
                      <button
                        type="button"
                        aria-label="Disminuir cantidad"
                        className="w-10 border-r border-slate-300 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                        onClick={() => updateQty(item.id, parsedItemQty - 1)}
                        disabled={parsedItemQty <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="min-w-0 flex-1 border-0 bg-transparent px-3 text-center text-sm text-slate-900 outline-none dark:text-slate-100"
                        value={item.qty}
                        onChange={(e) => updateSaleItem(item.id, { qty: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        aria-label="Aumentar cantidad"
                        className="w-10 border-l border-slate-300 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                        onClick={() => updateQty(item.id, parsedItemQty + 1)}
                      >
                        +
                      </button>
                    </div>
                  </label>

                  <label className="block text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Lista de precio</span>
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                      value={item.priceMode}
                      onChange={(e) => updatePriceMode(item.id, e.target.value as PriceMode)}
                      disabled={!item.product}
                    >
                      {(["precio1", "precio2", "precio3"] as const).map((mode) => {
                        const price = item.product ? parsePrice(item.product[mode]) : null;
                        return (
                          <option key={mode} value={mode} disabled={price == null}>
                            {priceLabels[mode]}
                            {price != null ? ` - $${price.toFixed(2)} (${pricePercentLabel(item.product, price)})` : " - sin precio"}
                          </option>
                        );
                      })}
                      <option value="manual">Precio manual</option>
                    </select>
                  </label>

                  <label className="block text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Precio unitario {selectedPricePercent ? `(${selectedPricePercent}%)` : ""}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateSaleItem(item.id, {
                          unitPrice: Number(e.target.value),
                          priceMode: "manual"
                        })
                      }
                      required
                    />
                  </label>

                  <div className="flex items-end justify-between rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-slate-900/50">
                    <span className="font-medium text-slate-600 dark:text-slate-300">Subtotal</span>
                    <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">${itemTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="w-full rounded-md border border-dashed border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:bg-violet-950/50"
            onClick={addSaleItem}
          >
            + Agregar otro producto
          </button>

          <div className="flex items-center justify-between rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
            <span className="font-medium text-emerald-800 dark:text-emerald-200">Total</span>
            <span className="text-lg font-bold tabular-nums text-emerald-900 dark:text-emerald-100">${saleTotal.toFixed(2)}</span>
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
    </ModalPortal>
  );
}
