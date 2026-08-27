import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type CashMovement } from "../lib/api";
import { notifyCashMovementCreated } from "../lib/events";
import ModalPortal from "./ModalPortal";

type Props = {
  onCreated?: () => void;
  defaultDate?: string;
};

type DialogProps = {
  initialMovement?: CashMovement;
  defaultDate?: string;
  onClose: () => void;
  onSaved?: () => void;
};

function todayISODateLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatAmountInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function DeleteConceptDialog({ concept, onCancel, onConfirm }: { concept: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-t-lg bg-slate-900/50 p-4 sm:rounded-lg">
      <div className="w-full max-w-sm rounded-lg bg-white shadow-xl dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Eliminar concepto</h3>
        </div>
        <div className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
          Desea eliminar el concepto {concept} para futuros gastos ?
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export function CashMovementDialog({ initialMovement, defaultDate, onClose, onSaved }: DialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [concepto, setConcepto] = useState(initialMovement?.concepto ?? "");
  const [fecha, setFecha] = useState(initialMovement?.fecha ?? defaultDate ?? todayISODateLocal());
  const [conceptos, setConceptos] = useState<string[]>([]);
  const [showConceptOptions, setShowConceptOptions] = useState(false);
  const [saveNewConcept, setSaveNewConcept] = useState(false);
  const [conceptToDelete, setConceptToDelete] = useState<string | null>(null);
  const [monto, setMonto] = useState(initialMovement ? formatAmountInput(String(initialMovement.monto)) : "");

  const isNewConcept = useMemo(() => {
    const value = concepto.trim().toLocaleLowerCase("es");
    return Boolean(value) && !conceptos.some((item) => item.trim().toLocaleLowerCase("es") === value);
  }, [concepto, conceptos]);
  const filteredConcepts = useMemo(() => {
    const value = concepto.trim().toLocaleLowerCase("es");
    return value ? conceptos.filter((item) => item.toLocaleLowerCase("es").includes(value)) : conceptos;
  }, [concepto, conceptos]);

  useEffect(() => {
    api.listExpenseConcepts().then(setConceptos).catch(() => setConceptos([]));
  }, []);

  const close = () => {
    if (saving) return;
    onClose();
    setShowConceptOptions(false);
    setError(null);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const conceptoFinal = concepto.trim();

    if (!conceptoFinal) {
      setError("Ingresa un concepto.");
      return;
    }
    if (!fecha) {
      setError("Ingresa una fecha.");
      return;
    }
    const amount = Number(monto.replace(/\D/g, ""));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999) {
      setError("Ingresa un monto valido.");
      return;
    }

    setSaving(true);
    try {
      if (isNewConcept && saveNewConcept) {
        await api.createExpenseConcept(conceptoFinal);
      }
      const payload = { concepto: conceptoFinal, monto: amount, tipo: initialMovement?.tipo ?? "salida", fecha };
      if (initialMovement) {
        await api.updateCashMovement(initialMovement.id, payload);
      } else {
        await api.createCashMovement(payload);
      }
      notifyCashMovementCreated();
      onSaved?.();
      setConcepto("");
      setSaveNewConcept(false);
      setMonto("");
      setFecha(defaultDate ?? todayISODateLocal());
      onClose();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteConcept() {
    if (!conceptToDelete) return;
    try {
      await api.deleteExpenseConcept(conceptToDelete);
      setConceptos((current) => current.filter((concept) => concept !== conceptToDelete));
      setConceptToDelete(null);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    }
  }

  return (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              aria-label="Cerrar"
              onClick={close}
              disabled={saving}
            />
            <div className="relative z-[110] w-full max-w-lg rounded-t-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-lg">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{initialMovement ? "Editar gasto" : "Agregar gasto"}</h2>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={close}
                  disabled={saving}
                  className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={submit} className="grid gap-4 px-5 py-4">
                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Concepto</span>
                  <div className="relative">
                    <input
                      value={concepto}
                      onBlur={() => setTimeout(() => setShowConceptOptions(false), 100)}
                      onChange={(e) => {
                        setConcepto(e.target.value);
                        setShowConceptOptions(true);
                      }}
                      onFocus={() => setShowConceptOptions(true)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                      placeholder="Buscar o crear concepto"
                      required
                    />
                    {showConceptOptions && filteredConcepts.length > 0 ? (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        {filteredConcepts.map((item) => (
                          <div key={item} className="flex items-center hover:bg-violet-50 dark:hover:bg-violet-950/40">
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setConcepto(item);
                                setShowConceptOptions(false);
                              }}
                              className="min-w-0 flex-1 px-3 py-2 text-left text-sm text-slate-800 dark:text-slate-100"
                            >
                              {item}
                            </button>
                            <button
                              type="button"
                              aria-label={`Eliminar concepto ${item}`}
                              title="Eliminar concepto"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => setConceptToDelete(item)}
                              className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-red-600 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {!initialMovement && isNewConcept ? (
                    <label className="mt-1 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100">
                      <input
                        type="checkbox"
                        checked={saveNewConcept}
                        onChange={(e) => setSaveNewConcept(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-200 dark:border-slate-600"
                      />
                      Guardar este concepto para futuros gastos
                    </label>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Fecha</span>
                    <input
                      type="date"
                      lang="es-AR"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      required
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Monto</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={monto}
                      onChange={(e) => setMonto(formatAmountInput(e.target.value))}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      required
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={close}
                    disabled={saving}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
              {conceptToDelete ? <DeleteConceptDialog concept={conceptToDelete} onCancel={() => setConceptToDelete(null)} onConfirm={deleteConcept} /> : null}
            </div>
          </div>
        </ModalPortal>
  );
}

export default function AddCashMovementButton({ onCreated, defaultDate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-800 shadow-sm hover:bg-violet-50 dark:border-violet-900/60 dark:bg-slate-950/40 dark:text-violet-200 dark:hover:bg-violet-950/40"
      >
        + Agregar gasto
      </button>

      {open ? <CashMovementDialog defaultDate={defaultDate} onClose={() => setOpen(false)} onSaved={onCreated} /> : null}
    </>
  );
}
