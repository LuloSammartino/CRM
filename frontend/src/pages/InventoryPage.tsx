import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import { api, type Product } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

export default function InventoryPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .listProducts()
      .then(setRows)
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    load();
    const onSale = () => load();
    window.addEventListener(CRM_SALE_CREATED_EVENT, onSale);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, onSale);
  }, [load]);

  const lowStock = useMemo(() => rows.filter((p) => p.stockQty <= 5).length, [rows]);

  const columns: Column<Product>[] = useMemo(
    () => [
      { key: "name", header: "Producto", render: (p) => p.name },
      { key: "sku", header: "SKU", render: (p) => p.sku },
      { key: "category", header: "Categoría", render: (p) => p.category ?? "—" },
      {
        key: "unitPrice",
        header: "Precio",
        className: "whitespace-nowrap",
        render: (p) => `$${Number(p.unitPrice).toFixed(2)}`
      },
      {
        key: "stockQty",
        header: "Stock",
        render: (p) => (
          <span
            className={
              p.stockQty <= 5
                ? "inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                : "font-medium text-emerald-700 dark:text-emerald-300"
            }
          >
            {p.stockQty}
          </span>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Inventario" subtitle="Productos, precios y niveles de stock." tone="emerald" />
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:from-emerald-950/50 dark:to-teal-950/50 dark:text-emerald-100">
            📦 {rows.length} SKU
          </span>
          {lowStock > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              ⚠️ {lowStock} bajo mínimo
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <DataTable title="Listado" accent="emerald" columns={columns} rows={rows} />
    </div>
  );
}

