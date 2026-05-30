import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import SummaryCard from "../components/SummaryCard";
import { api, type DashboardMetrics, type SaleRow } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

function formatSaleDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [m, s] = await Promise.all([api.dashboard(), api.listSales()]);
      setMetrics(m);
      setSales(s);
    } catch (e) {
      setError(String((e as any)?.message ?? e));
    }
  }, []);

  useEffect(() => {
    load();
    const onSale = () => load();
    window.addEventListener(CRM_SALE_CREATED_EVENT, onSale);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, onSale);
  }, [load]);

  const recentSales = useMemo(() => sales.slice(0, 8), [sales]);

  const saleColumns: Column<SaleRow>[] = useMemo(
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
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Métricas rápidas del negocio." tone="violet" />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard accent="sky" label="Total clientes" value={metrics?.totalCustomers ?? "—"} />
        <SummaryCard
          accent="amber"
          label="Productos bajo stock"
          value={metrics?.lowStockProducts ?? "—"}
          hint="Umbral: 5 unidades"
        />
        <SummaryCard accent="violet" label="Ventas hoy" value={metrics?.todaySalesCount ?? "—"} />
        <SummaryCard
          accent="emerald"
          label="Total vendido hoy"
          value={metrics ? `$${Number(metrics.todaySalesTotal).toFixed(2)}` : "—"}
        />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10 p-5 dark:border-violet-800/50 dark:from-violet-600/20 dark:via-fuchsia-600/15 dark:to-cyan-600/15">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-fuchsia-400/20 blur-2xl dark:bg-fuchsia-500/10" />
        <h2 className="text-sm font-bold text-violet-900 dark:text-violet-200">Siguiente paso</h2>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
          Registrá ventas con el botón <span className="font-semibold text-violet-700 dark:text-violet-300">+</span> para
          ver cómo se actualizan el stock y las métricas del día.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">Ventas recientes</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Últimas {Math.min(8, sales.length)} de {sales.length} en historial.
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 text-xs font-semibold text-amber-950 dark:border-amber-700 dark:from-amber-950/50 dark:to-orange-950/40 dark:text-amber-100">
            📋 {sales.length} totales
          </span>
        </div>
        <DataTable
          title="Últimas ventas"
          accent="amber"
          columns={saleColumns}
          rows={recentSales}
          emptyMessage="Todavía no hay ventas registradas."
        />
      </div>
    </div>
  );
}

