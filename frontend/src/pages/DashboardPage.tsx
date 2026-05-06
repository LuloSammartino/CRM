import { useCallback, useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import SummaryCard from "../components/SummaryCard";
import { api, type DashboardMetrics } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .dashboard()
      .then(setMetrics)
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    load();
    const onSale = () => load();
    window.addEventListener(CRM_SALE_CREATED_EVENT, onSale);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, onSale);
  }, [load]);

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
    </div>
  );
}

