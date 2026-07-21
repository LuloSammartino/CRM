import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { api, type BusinessMetrics } from "../lib/api";

const MONEY = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const MONTH = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
type ExpenseConcept = BusinessMetrics["expenses"]["byConcept"][number];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMoney(value: number) {
  return MONEY.format(value);
}

function fmtMonth(value: string) {
  return MONTH.format(new Date(`${value}-01T12:00:00`));
}

function fmtDate(value: string) {
  return DATE.format(new Date(`${value}T12:00:00`));
}

function fmtPercent(value: number) {
  return `${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;
}

function conceptColor(index: number) {
  const hue = (index * 137.508) % 360;
  const saturation = 68 + (index % 3) * 8;
  const lightness = 42 + (index % 4) * 5;
  return `hsl(${hue.toFixed(3)} ${saturation}% ${lightness}%)`;
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function ExpenseStackedBar({
  items,
  smallItems,
  total,
  expanded,
  onToggle
}: {
  items: ExpenseConcept[];
  smallItems: ExpenseConcept[];
  total: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!total) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Distribucion de gastos</div>
      <div className="flex h-8 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
        {items.map((item, index) => {
          const pct = (item.total / total) * 100;
          const color = conceptColor(index);
          return (
            <div
              key={item.concepto}
              title={`${item.concepto}: ${fmtPercent(pct)} - ${fmtMoney(item.total)}`}
              className="h-full"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          );
        })}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const pct = (item.total / total) * 100;
          const isOther = item.concepto === "Otros gastos" && smallItems.length > 0;
          const color = conceptColor(index);
          return (
            <div key={item.concepto} className="min-w-0 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                  {isOther ? (
                    <button type="button" onClick={onToggle} className="inline-flex min-w-0 items-center gap-1 font-semibold text-slate-700 hover:text-red-700 dark:text-slate-200 dark:hover:text-red-300">
                      <span className="truncate">{item.concepto}</span>
                      <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`} fill="currentColor">
                        <path d="M5.2 7.2a1 1 0 0 1 1.4 0L10 10.6l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.6a1 1 0 0 1 0-1.4Z" />
                      </svg>
                    </button>
                  ) : (
                    <span className="truncate font-semibold text-slate-700 dark:text-slate-200">{item.concepto}</span>
                  )}
                </div>
                <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-white">{fmtPercent(pct)}</span>
              </div>
              {isOther && expanded ? (
                <div className="mt-2 space-y-1 rounded-md bg-slate-50 p-2 dark:bg-slate-800/70">
                  {smallItems.map((smallItem) => (
                    <div key={smallItem.concepto} className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                      <span className="min-w-0 truncate">{smallItem.concepto}</span>
                      <span className="shrink-0 font-semibold">{fmtMoney(smallItem.total)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSmallExpenses, setShowSmallExpenses] = useState(false);
  const [openConcept, setOpenConcept] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getBusinessMetrics(month)
      .then(setMetrics)
      .catch((e) => setError(String((e as Error)?.message ?? e)))
      .finally(() => setLoading(false));
  }, [month]);

  const topExpense = useMemo(() => metrics?.expenses.byConcept[0], [metrics]);
  const { barItems, smallItems } = useMemo(() => {
    const items = metrics?.expenses.byConcept ?? [];
    const total = metrics?.expenses.total ?? 0;
    if (!total) return { barItems: items, smallItems: [] };

    const visible = items.filter((item) => item.total / total >= 0.01);
    const small = items.filter((item) => item.total / total < 0.01);
    return {
      barItems: small.length
        ? [
            ...visible,
            {
              concepto: "Otros gastos",
              total: small.reduce((sum, item) => sum + item.total, 0),
              count: small.reduce((sum, item) => sum + item.count, 0),
              movements: small.flatMap((item) => item.movements)
            }
          ]
        : visible,
      smallItems: small
    };
  }, [metrics]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Metricas" subtitle={`Resumen de ${fmtMonth(month)}`} tone="emerald" />
        <label className="text-sm">
          <span className="sr-only">Mes</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="h-[38px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Cargando metricas...
        </div>
      ) : metrics ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="Ventas" value={fmtMoney(metrics.sales.total)} tone="text-emerald-700 dark:text-emerald-300" />
            <Stat label="Gastos" value={fmtMoney(metrics.expenses.total)} tone="text-red-700 dark:text-red-300" />
            <Stat label="Balance" value={fmtMoney(metrics.balance)} tone={metrics.balance < 0 ? "text-red-700 dark:text-red-300" : "text-sky-700 dark:text-sky-300"} />
            <Stat label="Mayor gasto" value={topExpense ? topExpense.concepto : "-"} tone="text-slate-900 dark:text-white" />
          </div>
          <ExpenseStackedBar
            items={barItems}
            smallItems={smallItems}
            total={metrics.expenses.total}
            expanded={showSmallExpenses}
            onToggle={() => setShowSmallExpenses((value) => !value)}
          />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Gastos por concepto</h2>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <span>Concepto</span>
              <span className="text-right">%</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            {metrics.expenses.byConcept.length ? metrics.expenses.byConcept.map((item) => {
              const pct = metrics.expenses.total ? (item.total / metrics.expenses.total) * 100 : 0;
              const isOpen = openConcept === item.concepto;
              return (
              <div key={item.concepto} className="border-b border-slate-100 px-4 py-3 text-sm last:border-0 dark:border-slate-800">
                <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                  <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">{item.concepto}</span>
                  <span className="text-right font-bold tabular-nums text-slate-700 dark:text-slate-200">{fmtPercent(pct)}</span>
                  <span className="text-right font-bold tabular-nums text-red-700 dark:text-red-300">{fmtMoney(item.total)}</span>
                  <button
                    type="button"
                    aria-label={`Ver gastos de ${item.concepto}`}
                    title="Ver gastos"
                    onClick={() => setOpenConcept(isOpen ? null : item.concepto)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} fill="currentColor">
                      <path d="M5.2 7.2a1 1 0 0 1 1.4 0L10 10.6l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.6a1 1 0 0 1 0-1.4Z" />
                    </svg>
                  </button>
                </div>
                {isOpen ? (
                  <div className="mt-3 rounded-md bg-slate-50 p-3 dark:bg-slate-800/70">
                    <div className="grid grid-cols-[1fr_auto] gap-3 pb-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                      <span>Fecha</span>
                      <span className="text-right">Importe</span>
                    </div>
                    {item.movements.map((movement, index) => (
                      <div key={`${movement.fecha}-${movement.monto}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 border-t border-slate-200 py-2 text-sm dark:border-slate-700">
                        <span className="text-slate-700 dark:text-slate-200">{fmtDate(movement.fecha)}</span>
                        <span className="text-right font-semibold tabular-nums text-red-700 dark:text-red-300">{fmtMoney(movement.monto)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              );
            }) : (
              <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">No hay gastos cargados para este mes.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
