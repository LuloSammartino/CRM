import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import { api, type BusinessMetrics } from "../lib/api";
import { formatArgentineDate } from "../lib/date";

const MONEY = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
type ViewMode = "sales" | "expenses";
type Period = "thisMonth" | "lastMonth" | "thisWeek" | "today" | "custom";
type DateRange = { from: string; to: string };
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "thisMonth", label: "Este mes" },
  { value: "lastMonth", label: "Mes pasado" },
  { value: "thisWeek", label: "Esta semana" },
  { value: "today", label: "Hoy" },
  { value: "custom", label: "Personalizado" }
];
type MetricItem = {
  label: string;
  total: number;
  count: number;
  movements: { fecha: string; monto: number }[];
};

function fmtMoney(value: number) {
  return MONEY.format(value);
}

function fmtDate(value: string) {
  return formatArgentineDate(value);
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function rangeFor(period: Exclude<Period, "custom">): DateRange {
  const today = new Date();
  const from = new Date(today);
  const to = new Date(today);
  if (period === "thisMonth") from.setDate(1);
  if (period === "lastMonth") {
    from.setMonth(from.getMonth() - 1, 1);
    to.setDate(0);
  }
  if (period === "thisWeek") from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  return { from: isoDate(from), to: isoDate(to) };
}

function formatRange({ from, to }: DateRange) {
  if (!from || !to || from > to) return "Resumen: selecciona un rango valido";
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const part = (date: Date, year: boolean) => {
    const rawMonth = new Intl.DateTimeFormat("es-AR", { month: "short" }).format(date);
    const month = `${rawMonth.charAt(0).toUpperCase()}${rawMonth.slice(1).replace(/\.$/, "")}.`;
    return `${date.getDate()} de ${month}${year ? ` ${date.getFullYear()}` : ""}`;
  };
  return `Resumen: ${part(start, start.getFullYear() !== end.getFullYear())} - ${part(end, true)}`;
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

function ArgentineDateField({ label, value, min, max, onChange }: { label: string; value: string; min?: string; max?: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    inputRef.current?.showPicker?.();
    inputRef.current?.click();
  };

  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
      <span className="relative">
        <button
          type="button"
          onClick={openPicker}
          className="flex h-10 w-40 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-emerald-900"
        >
          {formatArgentineDate(value)}
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600 dark:text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" /></svg>
        </button>
        <input
          ref={inputRef}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      </span>
    </label>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function StackedBar({
  items,
  smallItems,
  total,
  title,
  otherLabel,
  expanded,
  onToggle
}: {
  items: MetricItem[];
  smallItems: MetricItem[];
  total: number;
  title: string;
  otherLabel: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  if (!total) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</div>
      <div className="flex h-8 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
        {items.map((item, index) => {
          const pct = (item.total / total) * 100;
          const color = conceptColor(index);
          return (
            <div
              key={item.label}
              title={`${item.label}: ${fmtPercent(pct)} - ${fmtMoney(item.total)}`}
              className="h-full transition-[filter,opacity] duration-150"
              style={{
                width: `${pct}%`,
                backgroundColor: color,
                filter: hoveredLabel === item.label ? "brightness(1.25)" : undefined,
                opacity: hoveredLabel && hoveredLabel !== item.label ? 0.55 : 1
              }}
              onMouseEnter={() => setHoveredLabel(item.label)}
              onMouseLeave={() => setHoveredLabel(null)}
            />
          );
        })}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const pct = (item.total / total) * 100;
          const isOther = item.label === otherLabel && smallItems.length > 0;
          const color = conceptColor(index);
          return (
            <div
              key={item.label}
              className={`min-w-0 rounded-md px-2 py-1 text-xs transition ${hoveredLabel === item.label ? "bg-amber-100 ring-2 ring-amber-400 dark:bg-amber-950/50 dark:ring-amber-500" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                  {isOther ? (
                    <button type="button" onClick={onToggle} className="inline-flex min-w-0 items-center gap-1 font-semibold text-slate-700 hover:text-red-700 dark:text-slate-200 dark:hover:text-red-300">
                    <span className={`truncate ${hoveredLabel === item.label ? "text-amber-900 dark:text-amber-100" : ""}`}>{item.label}</span>
                      <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`} fill="currentColor">
                        <path d="M5.2 7.2a1 1 0 0 1 1.4 0L10 10.6l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.6a1 1 0 0 1 0-1.4Z" />
                      </svg>
                    </button>
                  ) : (
                    <span className={`truncate font-semibold ${hoveredLabel === item.label ? "text-amber-900 dark:text-amber-100" : "text-slate-700 dark:text-slate-200"}`}>{item.label}</span>
                  )}
                </div>
                <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-white">{fmtPercent(pct)}</span>
              </div>
              {isOther && expanded ? (
                <div className="mt-2 space-y-1 rounded-md bg-slate-50 p-2 dark:bg-slate-800/70">
                  {smallItems.map((smallItem) => (
                    <div key={smallItem.label} className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                      <span className="min-w-0 truncate">{smallItem.label}</span>
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
  const [period, setPeriod] = useState<Period>("thisMonth");
  const [range, setRange] = useState<DateRange>(() => rangeFor("thisMonth"));
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("sales");
  const [showSmallItems, setShowSmallItems] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const periodMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenu = (event: PointerEvent | KeyboardEvent) => {
      if (event.type === "keydown" ? (event as KeyboardEvent).key === "Escape" : !periodMenuRef.current?.contains(event.target as Node)) setPeriodMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenu);
    };
  }, []);

  useEffect(() => {
    if (!range.from || !range.to || range.from > range.to) return;
    setLoading(true);
    setError(null);
    api
      .getBusinessMetrics(range)
      .then(setMetrics)
      .catch((e) => setError(String((e as Error)?.message ?? e)))
      .finally(() => setLoading(false));
  }, [range]);

  function changePeriod(value: Period) {
    setPeriod(value);
    if (value !== "custom") setRange(rangeFor(value));
  }

  const salesItems = useMemo<MetricItem[]>(() => (metrics?.sales.byCustomer ?? []).map((item) => ({ ...item, label: item.cliente })), [metrics]);
  const expenseItems = useMemo<MetricItem[]>(() => (metrics?.expenses.byConcept ?? []).map((item) => ({ ...item, label: item.concepto })), [metrics]);
  const items = viewMode === "sales" ? salesItems : expenseItems;
  const total = viewMode === "sales" ? metrics?.sales.total ?? 0 : metrics?.expenses.total ?? 0;
  const otherLabel = viewMode === "sales" ? "Otros clientes" : "Otros gastos";
  const { barItems, smallItems } = useMemo(() => {
    if (!total) return { barItems: items, smallItems: [] };
    const visible = items.filter((item) => item.total / total >= 0.01);
    const small = items.filter((item) => item.total / total < 0.01);
    return {
      barItems: small.length
        ? [...visible, {
            label: otherLabel,
            total: small.reduce((sum, item) => sum + item.total, 0),
            count: small.reduce((sum, item) => sum + item.count, 0),
            movements: small.flatMap((item) => item.movements)
          }]
        : visible,
      smallItems: small
    };
  }, [items, otherLabel, total]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Metricas" subtitle={formatRange(range)} tone="emerald" />
        <div className="flex flex-col gap-2 sm:items-end">
          <div ref={periodMenuRef} className="relative w-full sm:w-52">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={periodMenuOpen}
              onClick={() => setPeriodMenuOpen((open) => !open)}
              className="flex h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700 dark:focus:ring-emerald-900"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" /></svg>
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{PERIOD_OPTIONS.find((option) => option.value === period)?.label}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-slate-400 transition ${periodMenuOpen ? "rotate-180" : ""}`} fill="currentColor"><path d="M5.2 7.2a1 1 0 0 1 1.4 0l3.4 3.4 3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.6a1 1 0 0 1 0-1.4Z" /></svg>
            </button>
            {periodMenuOpen ? (
              <div role="listbox" aria-label="Periodo de tiempo" className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={period === option.value}
                    onClick={() => { changePeriod(option.value); setPeriodMenuOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${period === option.value ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                  >
                    {option.label}
                    {period === option.value ? <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" /></svg> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {period === "custom" ? (
            <div className="flex flex-col gap-2 sm:flex-row" aria-label="Rango de fechas personalizado">
              <ArgentineDateField label="Desde" value={range.from} max={range.to} onChange={(from) => setRange((current) => ({ ...current, from }))} />
              <ArgentineDateField label="Hasta" value={range.to} min={range.from} onChange={(to) => setRange((current) => ({ ...current, to }))} />
            </div>
          ) : null}
        </div>
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
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Ventas" value={fmtMoney(metrics.sales.total)} tone="text-emerald-700 dark:text-emerald-300" />
            <Stat label="Gastos" value={fmtMoney(metrics.expenses.total)} tone="text-red-700 dark:text-red-300" />
            <Stat label="Balance" value={fmtMoney(metrics.balance)} tone={metrics.balance < 0 ? "text-red-700 dark:text-red-300" : "text-sky-700 dark:text-sky-300"} />
          </div>
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Tipo de metricas">
              {(["sales", "expenses"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setViewMode(mode); setShowSmallItems(false); setOpenItem(null); }}
                  className={`rounded-md px-5 py-2 text-sm font-semibold transition ${viewMode === mode ? "bg-white shadow-sm dark:bg-slate-900" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"} ${viewMode === mode && mode === "sales" ? "text-emerald-700 dark:text-emerald-300" : ""} ${viewMode === mode && mode === "expenses" ? "text-red-700 dark:text-red-300" : ""}`}
                >
                  {mode === "sales" ? "Ventas" : "Gastos"}
                </button>
              ))}
            </div>
          </div>
          <StackedBar
            items={barItems}
            smallItems={smallItems}
            total={total}
            title={viewMode === "sales" ? "Distribucion de ventas" : "Distribucion de gastos"}
            otherLabel={otherLabel}
            expanded={showSmallItems}
            onToggle={() => setShowSmallItems((value) => !value)}
          />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{viewMode === "sales" ? "Ventas por cliente" : "Gastos por concepto"}</h2>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <span>{viewMode === "sales" ? "Cliente" : "Concepto"}</span>
              <span className="text-right">%</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            {items.length ? items.map((item) => {
              const pct = total ? (item.total / total) * 100 : 0;
              const isOpen = openItem === item.label;
              return (
              <div key={item.label} className="border-b border-slate-100 px-4 py-3 text-sm last:border-0 dark:border-slate-800">
                <div  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 ">
                  <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">{item.label}</span>
                  <span className="text-right font-bold tabular-nums text-slate-700 dark:text-slate-200">{fmtPercent(pct)}</span>
                  <span className={`text-right font-bold tabular-nums ${viewMode === "sales" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{fmtMoney(item.total)}</span>
                  <button
                    type="button"
                    aria-label={`Ver ${viewMode === "sales" ? "ventas" : "gastos"} de ${item.label}`}
                    title={viewMode === "sales" ? "Ver ventas" : "Ver gastos"}
                    onClick={() => setOpenItem(isOpen ? null : item.label)}
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
                        <span className={`text-right font-semibold tabular-nums ${viewMode === "sales" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{fmtMoney(movement.monto)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              );
            }) : (
              <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">{viewMode === "sales" ? "No hay ventas cargadas para este periodo." : "No hay gastos cargados para este periodo."}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
