import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { cleanProviderForm, emptyProviderForm, providerFields, type ProviderForm } from "./providerFormUtils";
import ModalPortal from "./ModalPortal";

type AddProviderDialogProps = {
  onClose: () => void;
  onCreated: () => void;
};

export default function AddProviderDialog({ onClose, onCreated }: AddProviderDialogProps) {
  const [form, setForm] = useState<ProviderForm>(emptyProviderForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    if (saving) return;
    setError(null);
    setForm(emptyProviderForm);
    onClose();
  };

  const saveProvider = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = cleanProviderForm(form);
    if (!payload.nombre) {
      setError("El nombre del proveedor no puede quedar vacio.");
      return;
    }

    setSaving(true);

    try {
      await api.createProvider(payload);
      onCreated();
      onClose();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Nuevo proveedor</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            disabled={saving}
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

        <form onSubmit={saveProvider} className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          {providerFields.map(({ key, label, required, type, maxLength }) => (
            <label key={key} className={key === "nombre" ? "grid gap-1 sm:col-span-2" : "grid gap-1"}>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
              <input
                value={form[key] ?? ""}
                onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-violet-300 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-violet-800 dark:focus:ring-violet-900/50"
                type={type ?? "text"}
                maxLength={maxLength}
                required={required}
              />
            </label>
          ))}

          <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
