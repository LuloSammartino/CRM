import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type Provider } from "../lib/api";
import { buildRubroOptions } from "../lib/rubros";
import ModalPortal from "./ModalPortal";

type UpdateMode = "rubro" | "proveedor";

type BulkUpdateProductsDialogProps = {
  rubros: string[];
  onClose: () => void;
  onUpdated: (updated: number) => void | Promise<void>;
};

export default function BulkUpdateProductsDialog({ rubros, onClose, onUpdated }: BulkUpdateProductsDialogProps) {
  const [mode, setMode] = useState<UpdateMode>("rubro");
  const [rubro, setRubro] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [percentage, setPercentage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [saving, setSaving] = useState(false);
  const rubroOptions = buildRubroOptions(rubros, rubro);

  useEffect(() => {
    setLoadingProviders(true);
    api
      .listProviders()
      .then(setProviders)
      .catch((e) => setError(String((e as Error)?.message ?? e)))
      .finally(() => setLoadingProviders(false));
  }, []);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === proveedorId) ?? null,
    [proveedorId, providers]
  );

  const close = () => {
    if (saving || loadingProviders) return;
    setError(null);
    onClose();
  };

  const changeMode = (nextMode: UpdateMode) => {
    setMode(nextMode);
    setError(null);
    setRubro("");
    setProveedorId("");
  };

  const updateProducts = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const amount = Number(percentage);
    if (!Number.isFinite(amount)) {
      setError("Ingresa un porcentaje valido.");
      return;
    }

    if (amount < -100 || amount > 1000) {
      setError("El porcentaje debe estar entre -100 y 1000.");
      return;
    }

    if (mode === "rubro" && !rubro) {
      setError("Selecciona un rubro para actualizar.");
      return;
    }

    if (mode === "proveedor" && !selectedProvider) {
      setError("Selecciona un proveedor para actualizar.");
      return;
    }

    const provider = selectedProvider;
    setSaving(true);

    try {
      const result =
        mode === "rubro"
          ? await api.bulkUpdateProducts({ mode, rubro, percentage: amount })
          : await api.bulkUpdateProducts({ mode, proveedorId: provider?.id ?? "", percentage: amount });

      await onUpdated(result.updated);
      onClose();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const targetLabel = mode === "rubro" ? rubro || "el rubro seleccionado" : selectedProvider?.nombre ?? "el proveedor seleccionado";

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Actualizacion masiva</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            disabled={saving || loadingProviders}
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

        <form onSubmit={updateProducts} className="grid gap-4 px-5 py-4">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Actualizar por</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                <input
                  type="radio"
                  name="bulkUpdateMode"
                  checked={mode === "rubro"}
                  onChange={() => changeMode("rubro")}
                  className="h-4 w-4 accent-emerald-600"
                />
                Rubro
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                <input
                  type="radio"
                  name="bulkUpdateMode"
                  checked={mode === "proveedor"}
                  onChange={() => changeMode("proveedor")}
                  className="h-4 w-4 accent-emerald-600"
                />
                Proveedor
              </label>
            </div>
          </fieldset>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">{mode === "rubro" ? "Rubro" : "Proveedor"}</span>
            {mode === "rubro" ? (
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/50"
                required
              >
                <option value="">Seleccionar rubro</option>
                {rubroOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/50"
                disabled={loadingProviders}
                required
              >
                <option value="">{loadingProviders ? "Cargando proveedores..." : "Seleccionar proveedor"}</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    Proveedor {provider.id}: {provider.nombre}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Porcentaje</span>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="-100"
                max="1000"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/50"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">%</span>
            </div>
          </label>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            Se actualizaran costo, precio 1, precio 2 y precio 3 para {targetLabel}.
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={close}
              disabled={saving || loadingProviders}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || loadingProviders}
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-amber-500/20 hover:from-amber-500 hover:to-orange-500 disabled:opacity-60"
            >
              {saving ? "Actualizando..." : "Actualizar productos"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
