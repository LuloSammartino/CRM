import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type Customer, type Product, type SaleRow } from "../lib/api";
import { notifySaleCreated } from "../lib/events";
import AddCustomerDialog from "./AddCustomerDialog";
import ModalPortal from "./ModalPortal";
import SaleDetailDialog from "./SaleDetailDialog";
import SaleProductItems, { type PriceMode, type SaleItemForm } from "./SaleProductItems";

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
  initialSale?: SaleRow;
};

const COUNTER_CUSTOMER_NAME = "CLIENTE DE MOSTRADOR";
const CUSTOMER_LOOKUP_LIMIT = 50;
const PRODUCT_LOOKUP_LIMIT = 50;

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

function createSaleItemFromLine(line: SaleRow["lines"][number]): SaleItemForm {
  const unitPrice = Number(line.unitPrice);
  const productId = line.productId ?? line.sku;
  return {
    id: nextSaleItemId++,
    product: productId
      ? {
          id: Number(productId),
          nombre: line.productName,
          precio1: String(unitPrice)
        }
      : null,
    productId: productId ?? "",
    productSearch: line.productName,
    selectedProductName: line.productName,
    qty: String(line.qty),
    unitPrice,
    priceMode: "manual"
  };
}

function createInitialSaleItems(initialSale?: SaleRow) {
  if (initialSale?.lines.length) {
    const items = initialSale.lines.map(createSaleItemFromLine);
    return { items, editingItemId: items[0]?.id ?? null };
  }

  const item = createSaleItem();
  return { items: [item], editingItemId: item.id };
}

function parsePrice(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseQty(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function AddSaleDialog({ onClose, onCreated, initialSale }: AddSaleDialogProps) {
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLookupTotal, setCustomerLookupTotal] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [soldAt, setSoldAt] = useState(() => initialSale?.fecha ?? initialSale?.createdAt?.slice(0, 10) ?? todayISODateLocal());
  const [customerId, setCustomerId] = useState(() => initialSale?.customerId ?? "");
  const [customerSearch, setCustomerSearch] = useState(() => initialSale?.customerName ?? "");
  const [selectedCustomerName, setSelectedCustomerName] = useState(() => initialSale?.customerName ?? "");
  const [metodoPago, setMetodoPago] = useState(() => initialSale?.metodoPago ?? "Efectivo");
  const [detalle, setDetalle] = useState("");
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [confirmingSale, setConfirmingSale] = useState(false);
  const [initialSaleItems] = useState(() => createInitialSaleItems(initialSale));
  const [saleItems, setSaleItems] = useState<SaleItemForm[]>(initialSaleItems.items);
  const [editingSaleItemId, setEditingSaleItemId] = useState<number | null>(initialSaleItems.editingItemId);
  const [activeProductItemId, setActiveProductItemId] = useState<number | null>(null);
  const [productLookupQuery, setProductLookupQuery] = useState("");
  const [productLookupTotal, setProductLookupTotal] = useState(0);
  const isCuentaCorriente = metodoPago === "Cuenta Corriente";

  const saleTotal = useMemo(
    () =>
      saleItems.reduce(
        (total, item) => total + Math.max(0, parseQty(item.qty)) * Math.max(0, item.unitPrice),
        0
      ),
    [saleItems]
  );
  const salePreview = useMemo<SaleRow>(
    () => ({
      id: initialSale?.id ?? "preview",
      createdAt: soldAt,
      fecha: soldAt,
      customerId: customerId || null,
      customerName: selectedCustomerName || customerSearch || "Cliente de mostrador",
      metodoPago,
      total: saleTotal,
      lines: saleItems.map((item) => {
        const qty = parseQty(item.qty);
        const unitPrice = item.unitPrice;
        return {
          productName: item.selectedProductName || item.productSearch,
          sku: "",
          qty,
          unitPrice,
          lineTotal: qty * unitPrice
        };
      })
    }),
    [customerId, customerSearch, initialSale?.id, metodoPago, saleItems, saleTotal, selectedCustomerName, soldAt]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLoadingCustomers(true);
      api
        .listCustomersPage({ q: customerSearch, limit: CUSTOMER_LOOKUP_LIMIT, offset: 0 })
        .then((result) => {
          setCustomers(result.rows);
          setCustomerLookupTotal(result.total);
        })
        .catch((e) => setError(String((e as Error)?.message ?? e)))
        .finally(() => setLoadingCustomers(false));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [customerSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLoadingProducts(true);
      api
        .listProductsPage({ nombre: productLookupQuery, limit: PRODUCT_LOOKUP_LIMIT, offset: 0 })
        .then((result) => {
          setProducts(result.rows);
          setProductLookupTotal(result.total);
        })
        .catch((e) => setError(String((e as Error)?.message ?? e)))
        .finally(() => setLoadingProducts(false));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [productLookupQuery]);

  const showCustomerResults = customerSearch.trim() !== selectedCustomerName.trim();

  async function selectCounterCustomer() {
    setError(null);
    setLoadingCustomers(true);

    try {
      const result = await api.listCustomersPage({ q: COUNTER_CUSTOMER_NAME, limit: 10, offset: 0 });
      const customer = result.rows.find((item) => item.name.trim().toUpperCase() === COUNTER_CUSTOMER_NAME);

      if (!customer) {
        setError('No existe el cliente "CLIENTE DE MOSTRADOR".');
        return;
      }

      setCustomers([customer]);
      setCustomerLookupTotal(1);
      setCustomerId(customer.id);
      setCustomerSearch(customer.name);
      setSelectedCustomerName(customer.name);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoadingCustomers(false);
    }
  }

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

  function loadMoreProducts() {
    if (loadingProducts || products.length >= productLookupTotal) return;

    setLoadingProducts(true);
    api
      .listProductsPage({ nombre: productLookupQuery, limit: PRODUCT_LOOKUP_LIMIT, offset: products.length })
      .then((result) => {
        setProducts((current) => [...current, ...result.rows]);
        setProductLookupTotal(result.total);
      })
      .catch((e) => setError(String((e as Error)?.message ?? e)))
      .finally(() => setLoadingProducts(false));
  }

  function loadMoreCustomers() {
    if (loadingCustomers || customers.length >= customerLookupTotal) return;

    setLoadingCustomers(true);
    api
      .listCustomersPage({ q: customerSearch, limit: CUSTOMER_LOOKUP_LIMIT, offset: customers.length })
      .then((result) => {
        setCustomers((current) => [...current, ...result.rows]);
        setCustomerLookupTotal(result.total);
      })
      .catch((e) => setError(String((e as Error)?.message ?? e)))
      .finally(() => setLoadingCustomers(false));
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
    const item = createSaleItem();
    setSaleItems((current) => [...current, item]);
    setEditingSaleItemId(item.id);
  }

  function selectCustomer(customer: Customer) {
    setCustomers([customer]);
    setCustomerLookupTotal(1);
    setCustomerId(customer.id);
    setCustomerSearch(customer.name);
    setSelectedCustomerName(customer.name);
  }

  function removeSaleItem(itemId: number) {
    setSaleItems((current) => {
      if (current.length === 1) return current;
      const next = current.filter((item) => item.id !== itemId);
      setEditingSaleItemId((currentEditingId) =>
        currentEditingId === itemId ? next[0]?.id ?? null : currentEditingId
      );
      return next;
    });
  }

  function validateSale() {
    setError(null);

    const invalidProductIndex = saleItems.findIndex((item) => !item.productId);
    if (invalidProductIndex >= 0) {
      setError(`Selecciona un producto en la linea ${invalidProductIndex + 1}.`);
      return false;
    }

    const invalidQtyIndex = saleItems.findIndex((item) => {
      const qty = parseQty(item.qty);
      return !Number.isFinite(qty) || qty < 1;
    });
    if (invalidQtyIndex >= 0) {
      setError(`La cantidad debe ser al menos 1 en la linea ${invalidQtyIndex + 1}.`);
      return false;
    }

    const invalidPriceIndex = saleItems.findIndex((item) => !Number.isFinite(item.unitPrice) || item.unitPrice < 0);
    if (invalidPriceIndex >= 0) {
      setError(`El precio no es valido en la linea ${invalidPriceIndex + 1}.`);
      return false;
    }

    if (isCuentaCorriente && !customerId) {
      setError("Selecciona un cliente para ventas en cuenta corriente.");
      return false;
    }

    return true;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (validateSale()) setConfirmingSale(true);
  }

  async function confirmSale() {
    if (!validateSale()) {
      setConfirmingSale(false);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        soldAt,
        customerId: customerId || null,
        metodoPago,
        detalle: isCuentaCorriente ? detalle.trim() || null : null,
        items: saleItems.map((item) => ({
          productId: item.productId,
          qty: parseQty(item.qty),
          unitPrice: item.unitPrice
        }))
      };
      if (initialSale) {
        await api.updateSale(initialSale.id, payload);
      } else {
        await api.createSale(payload);
      }
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
        <div className="relative z-[110] flex max-h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-lg border border-slate-200/90 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900 sm:rounded-lg">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-700">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {initialSale ? "Editar venta" : "Nueva venta"}
            </h2>
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

          <form onSubmit={submit} className="grid min-h-0 gap-4 overflow-y-auto px-5 py-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(520px,1.2fr)]">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200 lg:col-span-2">
                {error}
              </div>
            ) : null}

            <div className="grid content-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40 sm:grid-cols-2">
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
                <span className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Cliente</span>
                  <button
                    type="button"
                    className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
                    onClick={selectCounterCustomer}
                  >
                    Cliente de mostrador
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                    onClick={() => setShowCreateCustomer(true)}
                  >
                    Agregar cliente
                  </button>
                </span>
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
                  <div
                    className="absolute left-0 right-0 top-full z-[120] mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) loadMoreCustomers();
                    }}
                  >
                    {loadingCustomers && !customers.length ? (
                      <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Buscando clientes...</div>
                    ) : customers.length ? (
                      <>
                        {customers.map((customer) => (
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
                        ))}
                        {loadingCustomers ? (
                          <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Cargando mas clientes...</div>
                        ) : null}
                      </>
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

            <div className="grid min-h-0 content-start gap-3">
              <SaleProductItems
                saleItems={saleItems}
                products={products}
                loadingProducts={loadingProducts}
                activeProductItemId={activeProductItemId}
                editingSaleItemId={editingSaleItemId}
                setActiveProductItemId={setActiveProductItemId}
                setEditingSaleItemId={setEditingSaleItemId}
                setProductLookupQuery={setProductLookupQuery}
                updateSaleItem={updateSaleItem}
                selectProduct={selectProduct}
                loadMoreProducts={loadMoreProducts}
                updatePriceMode={updatePriceMode}
                updateQty={updateQty}
                removeSaleItem={removeSaleItem}
              />

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
            </div>
          </form>
        </div>
      </div>
      {showCreateCustomer ? (
        <AddCustomerDialog
          onClose={() => setShowCreateCustomer(false)}
          onCreated={(customer) => {
            selectCustomer(customer);
            setShowCreateCustomer(false);
          }}
        />
      ) : null}
      {confirmingSale ? (
        <SaleDetailDialog
          sale={salePreview}
          onClose={() => setConfirmingSale(false)}
          onEdit={() => setConfirmingSale(false)}
          onConfirm={confirmSale}
          confirming={saving}
        />
      ) : null}
    </ModalPortal>
  );
}
