import { useCallback, useEffect, useMemo, useState } from "react";
import AddSaleButton from "../components/AddSaleButton";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import SaleDetailDialog from "../components/SaleDetailDialog";
import SummaryCard from "../components/SummaryCard";
import { api, type DashboardMetrics, type SaleRow } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

function formatSaleDate(iso: string) {
  try {
    const inputDate = new Date(iso);
    const today = new Date();
    
    // Crear una fecha para "ayer" restándole un día a "hoy"
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Comprobar que el string ISO sea una fecha válida
    if (isNaN(inputDate.getTime())) return iso;

    // Obtener strings con formato "dd/mm/aaaa" para comparar
    const inputDateString = inputDate.toLocaleDateString("es-AR");
    const todayString = today.toLocaleDateString("es-AR");
    const yesterdayString = yesterday.toLocaleDateString("es-AR");

    // Extraemos la hora corta ya que la usaremos en ambos casos
    const time = inputDate.toLocaleTimeString("es-AR", { timeStyle: "short" });

    if (inputDateString === todayString) {
      return `Hoy, ${time}`;
    } else if (inputDateString === yesterdayString) {
      return `Ayer, ${time}`;
    }

    // Si no es hoy ni ayer, devolvemos tu formato original
    return inputDate.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

  } catch {
    return iso;
  }
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null);
  const [totalSales, setTotalSales] = useState(0);
  const [loadingSales, setLoadingSales] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoadingSales(true);

    try {
      const [dashboardMetrics, salesPage] = await Promise.all([
        api.dashboard(),
        api.listSalesPage({ limit: 8, offset: 0 })
      ]);
      setMetrics(dashboardMetrics);
      setSales(salesPage.rows);
      setTotalSales(salesPage.total);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoadingSales(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onSale = () => load();
    window.addEventListener(CRM_SALE_CREATED_EVENT, onSale);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, onSale);
  }, [load]);

  const saleColumns: Column<SaleRow>[] = useMemo(
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
                {line.productName} <span className="text-slate-500 dark:text-slate-500">({line.sku})</span>
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Dashboard" tone="violet" />
        <AddSaleButton onCreated={load} />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard accent="sky" label="Total clientes" value={metrics?.totalCustomers ?? "-"} />
        <SummaryCard
          accent="amber"
          label="Total Productos "
          value={metrics?.totalProducts ?? "-"}
        />
        <SummaryCard 
        accent="violet" 
        label="Ventas hoy" 
        value={metrics?.todaySalesCount ?? "-"}
        hint= "5 Cuenta corriente"
        />
        <SummaryCard
          accent="emerald"
          label="Total vendido hoy"
          value={metrics ? `$${Number(metrics.todaySalesTotal).toFixed(2)}` : "-"}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">Ventas recientes</div>
            
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 text-xs font-semibold text-amber-950 dark:border-amber-700 dark:from-amber-950/50 dark:to-orange-950/40 dark:text-amber-100">
            {totalSales} totales
          </span>
        </div>

        <DataTable
          accent="amber"
          columns={saleColumns}
          rows={sales}
          loading={loadingSales}
          loadingMessage="Cargando ventas recientes..."
          emptyMessage="Todavia no hay ventas registradas."
        />
      </div>

      {selectedSale ? <SaleDetailDialog sale={selectedSale} onClose={() => setSelectedSale(null)} /> : null}
    </div>
  );
}
