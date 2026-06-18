import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type CurrentAccountDebtor, type CustomerMovement } from "../lib/api";
import { notifyCashMovementCreated } from "../lib/events";
import ModalPortal from "./ModalPortal";

type CurrentAccountDebtorsDialogProps = {
  onClose: () => void;
  initialRows?: CurrentAccountDebtor[];
  onRowsChange?: (rows: CurrentAccountDebtor[]) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return value;
  }
}

function formatAmountInput(value: string) {
  const [integer = "", decimal] = value.replace(/,/g, "").replace(/[^\d.]/g, "").split(".");
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal === undefined ? formattedInteger : `${formattedInteger}.${decimal.slice(0, 2)}`;
}

export default function CurrentAccountDebtorsDialog({ onClose, initialRows, onRowsChange }: CurrentAccountDebtorsDialogProps) {
  const [rows, setRows] = useState<CurrentAccountDebtor[]>(() => initialRows ?? []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState<CurrentAccountDebtor | null>(null);
  const [viewing, setViewing] = useState<CurrentAccountDebtor | null>(null);
  const [movementRows, setMovementRows] = useState<CustomerMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [amount, setAmount] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [movementError, setMovementError] = useState<string | null>(null);

  const loadRows = useCallback(() => {
    setLoading(true);
    setError(null);

    return api
      .listCurrentAccountDebtors()
      .then((nextRows) => {
        setRows(nextRows);
        onRowsChange?.(nextRows);
      })
      .catch((e) => setError(String((e as Error)?.message ?? e)))
      .finally(() => setLoading(false));
  }, [onRowsChange]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (!initialRows) return;
    setRows(initialRows);
  }, [initialRows]);

  const totalDebt = useMemo(() => rows.reduce((sum, row) => sum + row.saldo, 0), [rows]);
  const hasDebtors = rows.length > 0;
  const parsedAmount = Number(amount.replace(/,/g, ""));
  const movementsWithBalance = useMemo(() => {
    let balance = 0;

    return [...movementRows]
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .map((movement) => {
        balance += movement.tipo === "DEUDA" ? movement.monto : -movement.monto;
        return { ...movement, saldo: balance };
      })
      .reverse();
  }, [movementRows]);

  function startPayment(row: CurrentAccountDebtor) {
    setPaying(row);
    setViewing(null);
    setMovementRows([]);
    setMovementError(null);
    setAmount(formatAmountInput(String(row.saldo)));
    
    setPaymentError(null);
  }

  async function toggleMovements(row: CurrentAccountDebtor) {
    if (viewing?.id === row.id && viewing.ventaId === row.ventaId) {
      setViewing(null);
      setMovementRows([]);
      setMovementError(null);
      return;
    }

    setViewing(row);
    setPaying(null);
    setPaymentError(null);
    setMovementRows([]);
    setMovementError(null);
    setLoadingMovements(true);

    try {
      const movements = await api.listCustomerMovements(row.id, row.ventaId);
      setMovementRows(movements);
    } catch (e) {
      setMovementError(String((e as Error)?.message ?? e));
    } finally {
      setLoadingMovements(false);
    }
  }

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    if (!paying) return;

    setPaymentError(null);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPaymentError("Ingresa un monto valido.");
      return;
    }

    if (parsedAmount > paying.saldo) {
      setPaymentError("El pago no puede superar la deuda.");
      return;
    }

    const cleanDetail = detail.trim() || `Pago deuda ${paying.name}`;

    setSaving(true);

    try {
      await api.createCustomerPayment(paying.id, {
        monto: parsedAmount,
        detalle: cleanDetail,
        ventaId: paying.ventaId
      });
      notifyCashMovementCreated();
      if (viewing?.id === paying.id && viewing.ventaId === paying.ventaId) {
        const movements = await api.listCustomerMovements(paying.id, paying.ventaId);
        setMovementRows(movements);
      }
      setPaying(null);
      setAmount("");
      setDetail("");
      await loadRows();
    } catch (e) {
      setPaymentError(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4">
        <button type="button" className="absolute inset-0" aria-label="Cerrar cuenta corriente" onClick={onClose} />

        <div className="relative z-[120] flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-lg">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Cuenta corriente</h2>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="self-start rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div className="grid gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Deudas pendientes</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">{rows.length}</div>
            </div>
            <div className={[
              "rounded-lg border px-4 py-3",
              hasDebtors
                ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30"
            ].join(" ")}>
              <div className={[
                "text-xs font-semibold uppercase",
                hasDebtors ? "text-red-700 dark:text-red-200" : "text-emerald-700 dark:text-emerald-200"
              ].join(" ")}>Total pendiente</div>
              <div className={[
                "mt-1 text-xl font-bold tabular-nums",
                hasDebtors ? "text-red-900 dark:text-red-100" : "text-emerald-900 dark:text-emerald-100"
              ].join(" ")}>{formatMoney(totalDebt)}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Cargando cuenta corriente...
              </div>
            ) : error ? (
              <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : rows.length ? (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-5 py-3 text-left">Cliente</th>
                    <th className="px-5 py-3 text-left">Telefono</th>
                    <th className="px-5 py-3 text-left">CUIT</th>
                    <th className="px-5 py-3 text-right">Debe</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((row) => (
                    <Fragment key={`${row.id}-${row.ventaId ?? "global"}`}>
                      <tr className="hover:bg-emerald-50/50 dark:hover:bg-slate-800/60">
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          <span className="block">{row.name}</span>
                          {row.ventaId ? (
                            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                              Venta #{row.ventaId}{row.fecha ? ` - ${formatDate(row.fecha)}` : ""}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{row.phone ?? "-"}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{row.cuit ?? "-"}</td>
                        <td className="px-5 py-3 text-right font-bold tabular-nums text-red-700 dark:text-red-300">{formatMoney(row.saldo)}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => toggleMovements(row)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              disabled={loadingMovements || saving}
                              aria-label={`Ver movimientos de ${row.name}`}
                              title="Ver movimientos"
                            >
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => startPayment(row)}
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                              disabled={saving}
                            >
                              Pagar
                            </button>
                          </div>
                        </td>
                      </tr>
                      {viewing?.id === row.id && viewing.ventaId === row.ventaId ? (
                        <tr key={`${row.id}-movements`} className="bg-slate-50/80 dark:bg-slate-950/40">
                          <td colSpan={5} className="px-5 py-4">
                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                              <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="text-sm font-bold text-slate-900 dark:text-white">Movimientos de deuda</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{row.name}{row.ventaId ? ` - Venta #${row.ventaId}` : ""}</div>
                                </div>
                                <div className="text-sm font-bold tabular-nums text-red-700 dark:text-red-300">
                                  Deuda actual: {formatMoney(row.saldo)}
                                </div>
                              </div>

                              {loadingMovements ? (
                                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                  Cargando movimientos...
                                </div>
                              ) : movementError ? (
                                <div className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                                  {movementError}
                                </div>
                              ) : movementsWithBalance.length ? (
                                <div className="overflow-auto">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      <tr>
                                        <th className="px-4 py-2 text-left">Fecha</th>
                                        <th className="px-4 py-2 text-left">Detalle</th>
                                        <th className="px-4 py-2 text-left">Tipo</th>
                                        <th className="px-4 py-2 text-right">Monto</th>
                                        <th className="px-4 py-2 text-right">Estado deuda</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {movementsWithBalance.map((movement) => {
                                        const isDebt = movement.tipo === "DEUDA";

                                        return (
                                          <tr key={movement.id}>
                                            <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-300">{formatDate(movement.fecha)}</td>
                                            <td className="px-4 py-2 text-slate-800 dark:text-slate-100">{movement.detalle || "Sin detalle"}</td>
                                            <td className="px-4 py-2">
                                              <span className={["rounded-full px-2 py-0.5 font-bold", isDebt ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"].join(" ")}>
                                                {isDebt ? "Se endeudo" : "Pago"}
                                              </span>
                                            </td>
                                            <td className={["px-4 py-2 text-right font-bold tabular-nums", isDebt ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"].join(" ")}>
                                              {isDebt ? "+" : "-"}{formatMoney(movement.monto)}
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold tabular-nums text-slate-900 dark:text-white">{formatMoney(movement.saldo)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                  Este cliente no tiene movimientos registrados.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      {paying?.id === row.id && paying.ventaId === row.ventaId ? (
                        <tr key={`${row.id}-payment`} className="bg-emerald-50/70 dark:bg-emerald-950/20">
                          <td colSpan={5} className="px-5 py-4">
                            <form onSubmit={submitPayment} className="grid gap-3 md:grid-cols-[minmax(180px,240px)_minmax(220px,1fr)_auto_auto] md:items-end">
                              <label className="text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Monto</span>
                                <div className="mt-1 flex overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                                    disabled={saving}
                                    className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-60 dark:text-slate-100"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setAmount(formatAmountInput(String(row.saldo)))}
                                    disabled={saving}
                                    className="border-l border-slate-300 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 dark:border-slate-600 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                                  >
                                    Max
                                  </button>
                                </div>
                              </label>
                              <label className="text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Detalle</span>
                                <input
                                  type="text"
                                  value={detail}
                                  onChange={(e) => setDetail(e.target.value)}
                                  disabled={saving}
                                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                />
                              </label>
                              <button
                                type="submit"
                                disabled={saving}
                                className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {saving ? "Guardando..." : "Confirmar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaying(null)}
                                disabled={saving}
                                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                              >
                                Cancelar
                              </button>
                              {paymentError ? (
                                <div className="text-sm text-red-700 dark:text-red-300 md:col-span-4">{paymentError}</div>
                              ) : null}
                            </form>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex min-h-64 items-center justify-center px-5 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay clientes con deuda pendiente.
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
