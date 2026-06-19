import { useCallback, useEffect, useMemo, useState } from "react";
import AddCashMovementButton from "../components/AddCashMovementButton";
import AddSaleButton from "../components/AddSaleButton";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import { api, type CashMovement, type SaleRow } from "../lib/api";
import { CRM_CASH_MOVEMENT_CREATED_EVENT, CRM_SALE_CREATED_EVENT } from "../lib/events";

const DATE_FORMAT = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
const PAGE_SIZE = 1000;

type CashRow = {
  id: string;
  fecha: string;
  concepto: string;
  tipo: "venta" | "deuda" | "gasto";
  monto: number;
};

type ViewMode = "todo" | "ingreso" | "egreso";

function todayISODateLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(value: string) {
  return DATE_FORMAT.format(new Date(`${value}T12:00:00`));
}

function fmtMoney(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function saleConcept(sale: SaleRow) {
  return sale.customerName ? `Venta - ${sale.customerName}` : "Venta";
}

export default function CashMovementsPage() {
  const [date, setDate] = useState(todayISODateLocal);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [expenses, setExpenses] = useState<CashMovement[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("todo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.listSalesPage({ dateFrom: date, dateTo: date, limit: PAGE_SIZE, offset: 0 }),
      api.listCashMovementsPage({ date, limit: PAGE_SIZE, offset: 0 })
    ])
      .then(([salesPage, movementsPage]) => {
        setSales(salesPage.rows);
        setExpenses(movementsPage.rows);
      })
      .catch((e) => setError(String((e as Error)?.message ?? e)))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    window.addEventListener(CRM_CASH_MOVEMENT_CREATED_EVENT, load);
    window.addEventListener(CRM_SALE_CREATED_EVENT, load);
    return () => {
      window.removeEventListener(CRM_CASH_MOVEMENT_CREATED_EVENT, load);
      window.removeEventListener(CRM_SALE_CREATED_EVENT, load);
    };
  }, [load]);

  const rows = useMemo<CashRow[]>(
    () => [
      ...sales
        .filter((sale) => sale.metodoPago !== "Cuenta Corriente")
        .map((sale) => ({
          id: `sale-${sale.id}`,
          fecha: sale.fecha ?? sale.createdAt.slice(0, 10),
          concepto: saleConcept(sale),
          tipo: "venta" as const,
          monto: Number(sale.total)
        })),
      ...expenses.map((expense) => ({
        id: `expense-${expense.id}`,
        fecha: expense.fecha,
        concepto: expense.concepto,
        tipo: expense.tipo === "entrada" ? "deuda" as const : "gasto" as const,
        monto: expense.monto
      }))
    ],
    [expenses, sales]
  );
  const visibleRows = useMemo(
    () => rows.filter((row) => viewMode === "todo" || (viewMode === "ingreso" ? row.tipo !== "gasto" : row.tipo === "gasto")),
    [rows, viewMode]
  );

  const totalIncome = rows.filter((row) => row.tipo !== "gasto").reduce((sum, row) => sum + row.monto, 0);
  const totalExpenses = rows.filter((row) => row.tipo === "gasto").reduce((sum, row) => sum + row.monto, 0);
  const balance = totalIncome - totalExpenses;
  const dateLabel = date === todayISODateLocal() ? "Hoy" : fmtDate(date);

  const columns: Column<CashRow>[] = useMemo(
    () => [
      { key: "concepto", header: "Concepto", render: (row) => <span className="font-medium">{row.concepto}</span> },
      { key: "tipo", header: "Tipo", className: "whitespace-nowrap", render: (row) => row.tipo === "venta" ? "Venta" : row.tipo === "deuda" ? "Deuda" : "Gasto" },
      {
        key: "monto",
        header: "Monto",
        className: "whitespace-nowrap text-right",
        render: (row) => (
          <span className={row.tipo !== "gasto" ? "font-bold text-emerald-700 dark:text-emerald-300" : "font-bold text-red-700 dark:text-red-300"}>
            {row.tipo !== "gasto" ? "+" : "-"}{fmtMoney(row.monto)}
          </span>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title={`Caja diaria - ${dateLabel}`} tone="sky" />
        <div className="flex flex-wrap gap-2">
          <label className="text-sm">
            <span className="sr-only">Fecha de caja</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayISODateLocal())}
              className="h-[38px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <AddSaleButton onCreated={load} />
          <AddCashMovementButton />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className="mb-1 px-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Ventas</div>
          <div className="rounded-xl border-2 border-emerald-400 bg-white px-4 py-3 text-2xl font-bold tabular-nums text-emerald-600 shadow-sm dark:border-emerald-500/70 dark:bg-slate-900 dark:text-emerald-300">
            {fmtMoney(totalIncome)}
          </div>
        </div>
        <div>
          <div className="mb-1 px-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Gastos</div>
          <div className="rounded-xl border-2 border-red-400 bg-white px-4 py-3 text-2xl font-bold tabular-nums text-red-500 shadow-sm dark:border-red-500/70 dark:bg-slate-900 dark:text-red-300">
            {fmtMoney(totalExpenses)}
          </div>
        </div>
        <div>
          <div className="mb-1 px-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Balance total</div>
          <div className={[
            "rounded-xl border-2 px-4 py-3 text-2xl font-bold tabular-nums shadow-sm",
            balance < 0
              ? "border-red-950 bg-red-100 text-red-700 dark:border-red-200 dark:bg-red-950/50 dark:text-red-200"
              : "border-slate-950 bg-emerald-200 text-emerald-700 dark:border-slate-100 dark:bg-emerald-950/60 dark:text-emerald-200"
          ].join(" ")}>
            {fmtMoney(balance)}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="inline-grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1 dark:bg-slate-800">
        {([
          ["todo", "Todo"],
          ["ingreso", "Ingreso"],
          ["egreso", "Egreso"]
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={[
              "rounded px-3 py-2 text-xs font-bold transition",
              viewMode === mode
                ? "bg-white text-sky-800 shadow-sm dark:bg-slate-950 dark:text-sky-200"
                : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-900/60"
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <DataTable
        accent="sky"
        columns={columns}
        rows={visibleRows}
        loading={loading}
        loadingMessage="Cargando caja diaria..."
        emptyMessage="No hay ventas ni gastos para esta fecha."
      />
    </div>
  );
}
