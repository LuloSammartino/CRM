import { useState } from "react";
import { api, type Product } from "../lib/api";
import {
  pricePairs,
  productToForm,
  updateCostInForm,
  updatePercentInForm,
  updatePriceInForm,
  type ProductEditorForm
} from "./productFormUtils";

type EditProductDialogProps = {
  product: Product;
  rubros: string[];
  proveedores: number[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function EditProductDialog({ product, rubros, proveedores, onClose, onSaved }: EditProductDialogProps) {
  const [form, setForm] = useState<ProductEditorForm>(() => productToForm(product));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saveProduct = async () => {
    const nombre = String(form.nombre ?? "").trim();
    if (!nombre) {
      setError("El nombre del producto no puede quedar vacio.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.updateProduct(product.id, {
        nombre,
        costo: form.costo === "" ? null : form.costo,
        precio1: String(form.precio1 ?? "0"),
        precio2: form.precio2 === "" ? null : form.precio2,
        precio3: form.precio3 === "" ? null : form.precio3,
        rubro: form.rubro ? String(form.rubro) : null,
        proveedorId: form.proveedorId === "" ? null : form.proveedorId ?? null
      });

      await onSaved();
      onClose();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Editar producto</h2>
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

        {error ? (
          <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

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
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            onClick={onClose}
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
  );
}
