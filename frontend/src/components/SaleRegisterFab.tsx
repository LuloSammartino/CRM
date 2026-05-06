import { useEffect, useMemo, useState } from "react";
import { api, type Customer, type Product } from "../lib/api";
import { notifySaleCreated } from "../lib/events";

function todayISODateLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const NEW_CUSTOMER_VALUE = "__new__";

export default function SaleRegisterFab() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [soldAt, setSoldAt] = useState(todayISODateLocal);
  const [customerChoice, setCustomerChoice] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  const lineTotal = useMemo(() => Math.max(0, qty) * Math.max(0, unitPrice), [qty, unitPrice]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    Promise.all([api.listCustomers(), api.listProducts()])
      .then(([c, p]) => {
        setCustomers(c);
        setProducts(p);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!productId) {
      setUnitPrice(0);
      return;
    }
    const p = products.find((x) => x.id === productId);
    if (p) setUnitPrice(Number(p.unitPrice));
  }, [productId, products]);

  function resetForm() {
    setSoldAt(todayISODateLocal());
    setCustomerChoice("");
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewAddress("");
    setProductId("");
    setQty(1);
    setUnitPrice(0);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      setError("El precio no es válido.");
      return;
    }

    if (!customerChoice) {
      setError("Selecciona un cliente o crea uno nuevo.");
      return;
    }

    if (customerChoice === NEW_CUSTOMER_VALUE) {
      if (!newName.trim()) {
        setError("Indica el nombre del nuevo cliente.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload =
        customerChoice === NEW_CUSTOMER_VALUE
          ? {
              soldAt,
              newCustomer: {
                name: newName.trim(),
                email: newEmail.trim() || undefined,
                phone: newPhone.trim() || undefined,
                address: newAddress.trim() || undefined
              },
              items: [{ productId, qty, unitPrice }]
            }
          : {
              soldAt,
              customerId: customerChoice,
              items: [{ productId, qty, unitPrice }]
            };

      await api.createSale(payload);
      notifySaleCreated();
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Registrar venta"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-2xl font-light text-white shadow-lg shadow-violet-500/40 transition hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-xl hover:shadow-violet-500/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        +
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sale-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] dark:bg-slate-950/70"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-[110] w-full max-w-lg rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900 sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 dark:from-violet-700 dark:to-fuchsia-700">
              <h2 id="sale-modal-title" className="text-base font-bold text-white">
                Nueva venta
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm font-medium text-white/90 hover:bg-white/15"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
              {loading ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">Cargando datos…</p>
              ) : null}
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
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    value={soldAt}
                    onChange={(e) => setSoldAt(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Cliente</span>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    value={customerChoice}
                    onChange={(e) => setCustomerChoice(e.target.value)}
                    required
                  >
                    <option value="">— Seleccionar —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.email ? ` (${c.email})` : ""}
                      </option>
                    ))}
                    <option value={NEW_CUSTOMER_VALUE}>+ Cliente nuevo…</option>
                  </select>
                </label>
              </div>

              {customerChoice === NEW_CUSTOMER_VALUE ? (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-cyan-200/80 bg-gradient-to-br from-cyan-50/80 to-violet-50/50 p-3 dark:border-cyan-900/50 dark:from-cyan-950/30 dark:to-violet-950/20 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Nombre *</span>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Email</span>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Teléfono</span>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Dirección</span>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Producto</span>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    required
                  >
                    <option value="">— Seleccionar —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.sku} (stock {p.stockQty})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Cantidad</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    required
                  />
                </label>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2 text-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-teal-950/40">
                <span className="font-medium text-emerald-800 dark:text-emerald-200">Total línea</span>
                <span className="text-lg font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
                  ${lineTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/25 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Registrar venta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
