import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddSaleButton from "../components/AddSaleButton";
import AddSaleDialog from "../components/AddSaleDialog";
import DataTable, { type Column } from "../components/DataTable";
import ModalPortal from "../components/ModalPortal";
import PageHeader from "../components/PageHeader";
import SaleDetailDialog from "../components/SaleDetailDialog";
import { api, type SaleRow } from "../lib/api";
import { formatArgentineDateTime } from "../lib/date";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

const SALES_PAGE_SIZE = 100;
const DATE_FORMAT = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
const MONTH_FORMAT = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
const MONTH_OPTIONS = [
  ["01", "Enero"],
  ["02", "Febrero"],
  ["03", "Marzo"],
  ["04", "Abril"],
  ["05", "Mayo"],
  ["06", "Junio"],
  ["07", "Julio"],
  ["08", "Agosto"],
  ["09", "Septiembre"],
  ["10", "Octubre"],
  ["11", "Noviembre"],
  ["12", "Diciembre"]
] as const;
type DateFilterMode = "day" | "month" | "range";
type SaleDateFilter = { from: string; to: string; label: string } | null;

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
    return formatArgentineDateTime(inputDate);

  } catch {
    return iso;
  }
}

function formatFilterDate(value: string) {
  try {
    return DATE_FORMAT.format(new Date(`${value}T12:00:00`));
  } catch {
    return value;
  }
}

function formatFilterMonth(value: string) {
  try {
    return MONTH_FORMAT.format(new Date(`${value}-01T12:00:00`));
  } catch {
    return value;
  }
}

function parseDisplayDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${yearText}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateToDisplay(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

function maskDisplayDate(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function monthRange(value: string) {
  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;

  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${value}-01`,
    to: `${value}-${String(lastDay).padStart(2, "0")}`
  };
}

export default function DashboardPage() {
  const dayPickerRef = useRef<HTMLInputElement>(null);
  const rangeFromPickerRef = useRef<HTMLInputElement>(null);
  const rangeToPickerRef = useRef<HTMLInputElement>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null);
  const [editingSale, setEditingSale] = useState<SaleRow | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<SaleRow | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("day");
  const [dayInput, setDayInput] = useState("");
  const [monthInput, setMonthInput] = useState("");
  const [rangeFromInput, setRangeFromInput] = useState("");
  const [rangeToInput, setRangeToInput] = useState("");
  const [activeDateFilter, setActiveDateFilter] = useState<SaleDateFilter>(null);
  const [dateFilterError, setDateFilterError] = useState<string | null>(null);
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");
  const [loadingSales, setLoadingSales] = useState(false);
  const [deletingSale, setDeletingSale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (product = debouncedProductSearch, customer = debouncedCustomerSearch, dateFilter = activeDateFilter) => {
    setError(null);
    setLoadingSales(true);

    try {
      const salesPage = await api.listSalesPage({
        product,
        customer,
        dateFrom: dateFilter?.from,
        dateTo: dateFilter?.to,
        limit: SALES_PAGE_SIZE,
        offset: 0
      });
      setSales(salesPage.rows);
      
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoadingSales(false);
    }
  }, [activeDateFilter, debouncedCustomerSearch, debouncedProductSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim());
      setDebouncedCustomerSearch(customerSearch.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [customerSearch, productSearch]);

  useEffect(() => {
    load(debouncedProductSearch, debouncedCustomerSearch, activeDateFilter);
    const onSale = () => load(debouncedProductSearch, debouncedCustomerSearch, activeDateFilter);
    window.addEventListener(CRM_SALE_CREATED_EVENT, onSale);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, onSale);
  }, [activeDateFilter, debouncedCustomerSearch, debouncedProductSearch, load]);

  function applyDateFilter() {
    setDateFilterError(null);

    if (dateFilterMode === "day") {
      const day = parseDisplayDate(dayInput);
      if (!day) {
        setDateFilterError("Ingresa una fecha valida con formato dd/mm/aaaa.");
        return;
      }
      setActiveDateFilter({ from: day, to: day, label: `Ventas del ${formatFilterDate(day)}` });
      setDateFilterOpen(false);
      return;
    }

    if (dateFilterMode === "month") {
      if (!monthInput) {
        setDateFilterError("Selecciona un mes.");
        return;
      }
      const range = monthRange(monthInput);
      if (!range) {
        setDateFilterError("Selecciona un mes valido.");
        return;
      }
      setActiveDateFilter({
        ...range,
        label: `Ventas de ${formatFilterMonth(monthInput)}`
      });
      setDateFilterOpen(false);
      return;
    }

    const rangeFrom = parseDisplayDate(rangeFromInput);
    const rangeTo = parseDisplayDate(rangeToInput);
    if (!rangeFrom || !rangeTo) {
      setDateFilterError("Ingresa desde y hasta con formato dd/mm/aaaa.");
      return;
    }

    if (rangeFrom > rangeTo) {
      setDateFilterError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }

    setActiveDateFilter({
      from: rangeFrom,
      to: rangeTo,
      label: `Ventas del ${formatFilterDate(rangeFrom)} al ${formatFilterDate(rangeTo)}`
    });
    setDateFilterOpen(false);
  }

  function clearSaleFilters() {
    setProductSearch("");
    setCustomerSearch("");
    setDayInput("");
    setMonthInput("");
    setRangeFromInput("");
    setRangeToInput("");
    setActiveDateFilter(null);
    setDateFilterError(null);
  }

  async function deleteSelectedSale() {
    if (!saleToDelete) return;

    setDeletingSale(true);
    setError(null);
    try {
      await api.deleteSale(saleToDelete.id);
      setSaleToDelete(null);
      setSelectedSale(null);
      await load();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setDeletingSale(false);
    }
  }

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
          <ul className="h-12 max-w-md list-none space-y-0.5 overflow-hidden p-0 text-xs">
            {sale.lines.slice(0, 3).map((line, index) => (
              <li key={index} className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-violet-700 dark:text-violet-300">{line.qty}x</span>{" "}
                {line.productName}
                {index === 2 && sale.lines.length > 3 ? (
                  <span className="font-semibold text-slate-500 dark:text-slate-400"> Más...</span>
                ) : null}
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

  const hasActiveSaleFilters = Boolean(debouncedProductSearch || debouncedCustomerSearch || activeDateFilter);
  const salesTitle = activeDateFilter?.label ?? "Ventas recientes";
  const selectedMonth = monthInput.slice(5);
  const selectedMonthYear = monthInput.slice(0, 4) || String(new Date().getFullYear());
  const openDatePicker = (input: HTMLInputElement | null) => {
    input?.showPicker?.();
    input?.click();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Ventas" tone="violet" />
        <div className="flex flex-wrap gap-2">
          <AddSaleButton onCreated={load} />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">{salesTitle}</h2>
          
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(170px,1fr)_minmax(170px,1fr)_auto_auto]">
          <label className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Buscar por producto</span>
            <input
              type="search"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Nombre o codigo..."
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-900/50"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Buscar por cliente</span>
            <input
              type="search"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Nombre"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-900/50"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setDateFilterError(null);
                setDateFilterOpen(true);
              }}
              className="h-[38px] rounded-md bg-amber-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
            >
              Filtrar
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearSaleFilters}
              disabled={!productSearch.trim() && !customerSearch.trim() && !activeDateFilter}
              className="h-[38px] rounded-md border border-amber-200 bg-white px-3 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900/60 dark:bg-slate-950/40 dark:text-amber-200 dark:hover:bg-amber-950/40"
            >
              Limpiar
            </button>
          </div>
        </div>

        <DataTable
          accent="amber"
          columns={saleColumns}
          rows={sales}
          loading={loadingSales}
          loadingMessage={hasActiveSaleFilters ? "Buscando ventas..." : "Cargando ventas recientes..."}
          emptyMessage={hasActiveSaleFilters ? "No hay ventas que coincidan con la busqueda." : "Todavia no hay ventas registradas."}
        />
      </div>

      {dateFilterOpen ? (
        <ModalPortal>
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4">
            <button
              type="button"
              className="absolute inset-0"
              aria-label="Cerrar filtro de ventas"
              onClick={() => setDateFilterOpen(false)}
            />
            <div className="relative z-[120] w-full max-w-lg rounded-t-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-lg">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Filtrar ventas</h3>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => setDateFilterOpen(false)}
                  className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 px-5 py-4">
                <div className="grid grid-cols-3 gap-2 rounded-md bg-slate-100 p-1 dark:bg-slate-800">
                  {([
                    ["day", "Dia"],
                    ["month", "Mes"],
                    ["range", "Rango"]
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setDateFilterMode(mode);
                        setDateFilterError(null);
                      }}
                      className={[
                        "rounded px-3 py-2 text-xs font-bold transition",
                        dateFilterMode === mode
                          ? "bg-white text-amber-800 shadow-sm dark:bg-slate-950 dark:text-amber-200"
                          : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-900/60"
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {dateFilterMode === "day" ? (
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Seleccionar fecha</span>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/mm/aaaa"
                        value={dayInput}
                        onChange={(e) => setDayInput(maskDisplayDate(e.target.value))}
                        className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-900/50"
                      />
                      <button
                        type="button"
                        aria-label="Elegir fecha"
                        title="Elegir fecha"
                        onClick={() => openDatePicker(dayPickerRef.current)}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-800 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-slate-950/40 dark:text-amber-200 dark:hover:bg-amber-950/40"
                      >
                        <CalendarIcon />
                      </button>
                      <input
                        ref={dayPickerRef}
                        type="date"
                        lang="es-AR"
                        value={parseDisplayDate(dayInput) ?? ""}
                        onChange={(e) => setDayInput(dateToDisplay(e.target.value))}
                        className="sr-only"
                        tabIndex={-1}
                      />
                    </div>
                  </label>
                ) : null}

                {dateFilterMode === "month" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Mes</span>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setMonthInput(e.target.value ? `${selectedMonthYear}-${e.target.value}` : "")}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-900/50"
                      >
                        <option value="">Seleccionar mes</option>
                        {MONTH_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Año</span>
                      <input
                        type="number"
                        min={2000}
                        max={2100}
                        value={selectedMonthYear}
                        onChange={(e) => setMonthInput(selectedMonth ? `${e.target.value}-${selectedMonth}` : "")}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-900/50"
                      />
                    </label>
                  </div>
                ) : null}

                {dateFilterMode === "range" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Desde</span>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="dd/mm/aaaa"
                          value={rangeFromInput}
                          onChange={(e) => setRangeFromInput(maskDisplayDate(e.target.value))}
                          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-900/50"
                        />
                        <button
                          type="button"
                          aria-label="Elegir fecha desde"
                          title="Elegir fecha"
                          onClick={() => openDatePicker(rangeFromPickerRef.current)}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-800 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-slate-950/40 dark:text-amber-200 dark:hover:bg-amber-950/40"
                        >
                          <CalendarIcon />
                        </button>
                        <input
                          ref={rangeFromPickerRef}
                          type="date"
                          lang="es-AR"
                          value={parseDisplayDate(rangeFromInput) ?? ""}
                          onChange={(e) => setRangeFromInput(dateToDisplay(e.target.value))}
                          className="sr-only"
                          tabIndex={-1}
                        />
                      </div>
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Hasta</span>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="dd/mm/aaaa"
                          value={rangeToInput}
                          onChange={(e) => setRangeToInput(maskDisplayDate(e.target.value))}
                          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-900/50"
                        />
                        <button
                          type="button"
                          aria-label="Elegir fecha hasta"
                          title="Elegir fecha"
                          onClick={() => openDatePicker(rangeToPickerRef.current)}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-800 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-slate-950/40 dark:text-amber-200 dark:hover:bg-amber-950/40"
                        >
                          <CalendarIcon />
                        </button>
                        <input
                          ref={rangeToPickerRef}
                          type="date"
                          lang="es-AR"
                          value={parseDisplayDate(rangeToInput) ?? ""}
                          onChange={(e) => setRangeToInput(dateToDisplay(e.target.value))}
                          className="sr-only"
                          tabIndex={-1}
                        />
                      </div>
                    </label>
                  </div>
                ) : null}

                {dateFilterError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                    {dateFilterError}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDateFilterOpen(false)}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={applyDateFilter}
                  className="rounded-md bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {selectedSale ? (
        <SaleDetailDialog
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onEditSale={() => {
            setEditingSale(selectedSale);
            setSelectedSale(null);
          }}
          onDeleteSale={() => setSaleToDelete(selectedSale)}
          deleting={deletingSale}
        />
      ) : null}

      {editingSale ? (
        <AddSaleDialog
          initialSale={editingSale}
          onClose={() => setEditingSale(null)}
          onCreated={() => {
            setEditingSale(null);
            load();
          }}
        />
      ) : null}

      {saleToDelete ? (
        <ModalPortal>
          <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4">
            <button
              type="button"
              className="absolute inset-0"
              aria-label="Cancelar eliminacion"
              onClick={() => setSaleToDelete(null)}
              disabled={deletingSale}
            />
            <div className="relative z-[140] w-full max-w-md rounded-t-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-lg">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Eliminar venta</h3>
              </div>
              <div className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                Desea eliminar la venta de {saleToDelete.customerName} por ${Number(saleToDelete.total).toFixed(2)}?
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSaleToDelete(null)}
                  disabled={deletingSale}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedSale}
                  disabled={deletingSale}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deletingSale ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
