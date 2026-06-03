import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import {
  emptyProductForm,
  pricePairs,
  updateCostInForm,
  updatePercentInForm,
  updatePriceInForm,
  type ProductEditorForm
} from "./productFormUtils";

type AddProductDialogProps = {
  rubros: string[];
  proveedores: number[];
  onClose: () => void;
  onCreated: () => Promise<void>;
};

export default function AddProductDialog({ rubros, proveedores, onClose, onCreated }: AddProductDialogProps) {
  const [form, setForm] = useState<ProductEditorForm>(() => emptyProductForm());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const close = () => {
    if (creating) return;
    setError(null);
    setForm(emptyProductForm());
    onClose();
  };

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const nombre = String(form.nombre ?? "").trim();
    if (!nombre || String(form.precio1 ?? "").trim() === "") {
      setError("Completa nombre y precio 1 para agregar el producto.");
      return;
    }

    setCreating(true);

    try {
      await api.createProduct({
        nombre,
        costo: form.costo === "" ? null : form.costo,
        precio1: String(form.precio1),
        precio2: form.precio2 === "" ? null : form.precio2,
        precio3: form.precio3 === "" ? null : form.precio3,
        rubro: form.rubro ? String(form.rubro) : null,
        proveedorId: form.proveedorId === "" ? null : form.proveedorId == null ? null : Number(form.proveedorId)
      });

      await onCreated();
      onClose();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Nuevo producto</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            disabled={creating}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {error ? (
          <div className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            {error}
          </div>
        ) : null}

        <form onSubmit={createProduct} className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Nombre</span>
            <input
              value={form.nombre ?? ""}
              onChange={(e) => setForm((current) => ({ ...current, nombre: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-emerald-800 dark:focus:ring-emerald-900/50"
              placeholder="Ej: Limpiahornos"
              required
            />
          </label>

          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Rubro</span>
            <select
              value={form.rubro ?? ""}
              onChange={(e) => setForm((current) => ({ ...current, rubro: e.target.value }))}
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
                    value={form.costo ?? ""}
                    onChange={(e) => updateCostInForm(setForm, e.target.value)}
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
                        value={form[pct] ?? ""}
                        onChange={(e) => updatePercentInForm(setForm, pricePairs[index].price, pct, e.target.value)}
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
                        value={form[price] ?? ""}
                        onChange={(e) => updatePriceInForm(setForm, price, pct, e.target.value)}
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
              value={form.proveedorId == null ? "" : String(form.proveedorId)}
              onChange={(e) => setForm((current) => ({ ...current, proveedorId: e.target.value ? Number(e.target.value) : null }))}
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
              onClick={close}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
              disabled={creating}
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
  );
}
