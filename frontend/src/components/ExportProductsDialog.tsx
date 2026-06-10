import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type Product, type Provider } from "../lib/api";
import { buildRubroOptions } from "../lib/rubros";
import ModalPortal from "./ModalPortal";

type PriceListKey = "precio1" | "precio2" | "precio3";
type ExportMode = "rubro" | "proveedor";

type ExportProductsDialogProps = {
  rubros: string[];
  onClose: () => void;
};

const priceListOptions: Array<{ key: PriceListKey; label: string }> = [
  { key: "precio1", label: "Precio 1" },
  { key: "precio2", label: "Precio 2" },
  { key: "precio3", label: "Precio 3" }
];

function toNumber(value?: string | null) {
  if (value == null || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : value;
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function buildRows(products: Product[], priceKey: PriceListKey) {
  return products.map((product) => ({
    Nombre: product.nombre,
    Precio: toNumber(product[priceKey])
  }));
}

export default function ExportProductsDialog({ rubros, onClose }: ExportProductsDialogProps) {
  const [mode, setMode] = useState<ExportMode>("rubro");
  const [rubro, setRubro] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [priceKey, setPriceKey] = useState<PriceListKey>("precio1");
  const [error, setError] = useState<string | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [exporting, setExporting] = useState(false);
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
    if (exporting || loadingProviders) return;
    setError(null);
    onClose();
  };

  const changeMode = (nextMode: ExportMode) => {
    setMode(nextMode);
    setError(null);
    setRubro("");
    setProveedorId("");
  };

  const exportProducts = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === "rubro" && !rubro) {
      setError("Selecciona un rubro para exportar.");
      return;
    }

    if (mode === "proveedor" && !selectedProvider) {
      setError("Selecciona un proveedor para exportar.");
      return;
    }

    setExporting(true);

    try {
      const products =
        mode === "rubro"
          ? await api.listProducts({ rubro })
          : await api.listProducts({ proveedorId: selectedProvider?.id });

      if (products.length === 0) {
        setError(mode === "rubro" ? "No hay productos para el rubro seleccionado." : "No hay productos para el proveedor seleccionado.");
        return;
      }

      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(buildRows(products, priceKey));
      worksheet["!cols"] = [{ wch: 42 }, { wch: 14 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
      XLSX.writeFile(workbook, `${sanitizeFileName(mode === "rubro" ? rubro : selectedProvider?.nombre ?? "proveedor")}.xlsx`);
      onClose();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Exportar Excel</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            disabled={exporting}
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

        <form onSubmit={exportProducts} className="grid gap-4 px-5 py-4">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Exportar por</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                <input
                  type="radio"
                  name="exportMode"
                  checked={mode === "rubro"}
                  onChange={() => changeMode("rubro")}
                  className="h-4 w-4 accent-emerald-600"
                />
                Rubro
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                <input
                  type="radio"
                  name="exportMode"
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
                    {provider.nombre}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Lista de precios</span>
            <select
              value={priceKey}
              onChange={(e) => setPriceKey(e.target.value as PriceListKey)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/50"
            >
              {priceListOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={close}
              disabled={exporting || loadingProviders}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={exporting || loadingProviders}
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60"
            >
              {exporting ? "Exportando..." : "Descargar Excel"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
