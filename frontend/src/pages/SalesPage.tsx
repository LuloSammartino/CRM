import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import SaleDetailDialog from "../components/SaleDetailDialog";
import { api, type SaleRow } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

function formatSaleDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function SalesPage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .listSales()
      .then(setRows)
      .catch((e) => setError(String((e as Error)?.message ?? e)));
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener(CRM_SALE_CREATED_EVENT, handler);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, handler);
  }, [load]);

  const todayCount = useMemo(() => {
    const today = new Date();
    return rows.filter((row) => {
      const date = new Date(row.createdAt);
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }).length;
  }, [rows]);

  const columns: Column<SaleRow>[] = useMemo(
    () => [
      {
        key: "createdAt",
        header: "Fecha",
        className: "whitespace-nowrap",
        render: (sale) => formatSaleDate(sale.createdAt)
      },
      {
        key: "customer",
        header: "Cliente",
        render: (sale) => <span className="font-medium text-amber-900 dark:text-amber-100">{sale.customerName}</span>
      },
      {
        key: "lines",
        header: "Productos",
        render: (sale) => (
          <ul className="max-w-md list-none space-y-0.5 p-0 text-xs">
            {sale.lines.map((line, index) => (
              <li key={index} className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-violet-700 dark:text-violet-300">{line.qty}x</span>{" "}
                {line.productName}
              </li>
            ))}
          </ul>
        )
      },
      {
        key: "total",
        header: "Total",
        className: "whitespace-nowrap text-right",
        render: (sale) => (
          <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            ${Number(sale.total).toFixed(2)}
          </span>
        )
      },
      {
        key: "actions",
        header: "Acciones",
        className: "whitespace-nowrap text-right",
        render: (sale) => (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
            onClick={() => setSelectedSale(sale)}
          >
            Ver detalle
          </button>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Ventas" subtitle="Historial de operaciones." tone="amber" />
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 text-sm font-semibold text-amber-950 dark:border-amber-700 dark:from-amber-950/50 dark:to-orange-950/40 dark:text-amber-100">
            {rows.length} en historial
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
            Hoy: {todayCount}
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <DataTable title="Historial de ventas" accent="amber" columns={columns} rows={rows} emptyMessage="No hay ventas registradas." />

      {selectedSale ? <SaleDetailDialog sale={selectedSale} onClose={() => setSelectedSale(null)} /> : null}
    </div>
  );
}
