import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .listSales()
      .then(setRows)
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener(CRM_SALE_CREATED_EVENT, handler);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, handler);
  }, [load]);

  const todayCount = useMemo(() => {
    const t = new Date();
    return rows.filter((r) => {
      const d = new Date(r.createdAt);
      return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    }).length;
  }, [rows]);

  const columns: Column<SaleRow>[] = useMemo(
    () => [
      {
        key: "createdAt",
        header: "Fecha",
        className: "whitespace-nowrap",
        render: (s) => formatSaleDate(s.createdAt)
      },
      {
        key: "customer",
        header: "Cliente",
        render: (s) => <span className="font-medium text-amber-900 dark:text-amber-100">{s.customerName}</span>
      },
      {
        key: "lines",
        header: "Productos",
        render: (s) => (
          <ul className="max-w-md list-none space-y-0.5 p-0 text-xs">
            {s.lines.map((l, i) => (
              <li key={i} className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-violet-700 dark:text-violet-300">{l.qty}×</span> {l.productName}{" "}
                <span className="text-slate-500 dark:text-slate-500">({l.sku})</span>
              </li>
            ))}
          </ul>
        )
      },
      {
        key: "total",
        header: "Total",
        className: "whitespace-nowrap text-right",
        render: (s) => (
          <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            ${Number(s.total).toFixed(2)}
          </span>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Ventas"
          subtitle="Historial de operaciones. Usá el botón + para registrar una nueva venta."
          tone="amber"
        />
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 text-sm font-semibold text-amber-950 dark:border-amber-700 dark:from-amber-950/50 dark:to-orange-950/40 dark:text-amber-100">
            📋 {rows.length} en historial
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
            Hoy: {todayCount}
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-orange-50/80 to-rose-50/60 p-4 text-sm text-amber-950 dark:border-amber-800/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-rose-950/20 dark:text-amber-100">
        <p className="font-medium text-amber-900 dark:text-amber-200">
          Las filas de demostración se generan al iniciar el almacén local. Las ventas nuevas aparecen arriba del listado al
          guardarlas.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <DataTable title="Historial de ventas" accent="amber" columns={columns} rows={rows} emptyMessage="No hay ventas registradas." />
    </div>
  );
}
