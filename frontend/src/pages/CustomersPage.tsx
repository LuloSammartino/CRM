import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import { api, type Customer } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

function asSearchText(v: unknown) {
  return String(v ?? "").toLowerCase();
}

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    id: "",
    createdAt: ""
  });

  const load = useCallback(() => {
    api
      .listCustomers()
      .then(setRows)
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    load();
    const onSale = () => load();
    window.addEventListener(CRM_SALE_CREATED_EVENT, onSale);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, onSale);
  }, [load]);

  const onCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setError(null);
      const name = form.name.trim();
      const email = form.email.trim();
      const phone = form.phone.trim();
      const address = form.address.trim();

      if (!name || !email || !phone || !address) {
        setFormError("Completá todos los campos para agregar el cliente.");
        return;
      }

      setSaving(true);
      try {
        const created = await api.createCustomer({ name, email, phone, address });
        setRows((prev) => [created, ...prev]);
        setForm({ name: "", email: "", phone: "", address: "" });
        setShowCreate(false);
      } catch (e) {
        setFormError(String((e as any)?.message ?? e));
      } finally {
        setSaving(false);
      }
    },
    [form]
  );

  const onDelete = useCallback(async (c: Customer) => {
    setError(null);
    setFormError(null);
    const ok = window.confirm(`¿Eliminar a "${c.name}"? Esta acción es solo demo (frontend).`);
    if (!ok) return;
    try {
      await api.deleteCustomer(c.id);
    } catch (e) {
      setError(String((e as any)?.message ?? e));
      return;
    } finally {
      setRows((prev) => prev.filter((r) => r.id !== c.id));
    }
  }, []);

  const filteredRows = useMemo(() => {
    const f = {
      name: filters.name.trim().toLowerCase(),
      email: filters.email.trim().toLowerCase(),
      phone: filters.phone.trim().toLowerCase(),
      address: filters.address.trim().toLowerCase(),
      id: filters.id.trim().toLowerCase(),
      createdAt: filters.createdAt.trim().toLowerCase()
    };

    const anyActive = Object.values(f).some(Boolean);
    if (!anyActive) return rows;

    return rows.filter((c) => {
      if (f.name && !asSearchText(c.name).includes(f.name)) return false;
      if (f.email && !asSearchText(c.email).includes(f.email)) return false;
      if (f.phone && !asSearchText(c.phone).includes(f.phone)) return false;
      if (f.address && !asSearchText(c.address).includes(f.address)) return false;
      if (f.id && !asSearchText(c.id).includes(f.id)) return false;
      if (f.createdAt && !asSearchText(c.createdAt).includes(f.createdAt)) return false;
      return true;
    });
  }, [rows, filters]);

  const columns: Column<Customer>[] = useMemo(
    () => [
      { key: "name", header: "Nombre", render: (c) => c.name },
      { key: "email", header: "Email", render: (c) => c.email ?? "—" },
      { key: "phone", header: "Teléfono", render: (c) => c.phone ?? "—" },
      { key: "address", header: "Dirección", render: (c) => c.address ?? "—" },
      {
        key: "actions",
        header: "Acciones",
        className: "w-[1%] whitespace-nowrap",
        render: (c) => (
          <button
            type="button"
            onClick={() => onDelete(c)}
            className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-950/40 dark:text-red-200 dark:hover:bg-red-950/50"
          >
            Eliminar
          </button>
        )
      }
    ],
    [onDelete]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Clientes" subtitle="Base de contactos y compradores." tone="sky" />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
          >
            {showFilters ? "Ocultar filtros" : "Filtros"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/20 hover:from-sky-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-800"
          >
            {showCreate ? "Cerrar" : "Agregar cliente"}
          </button>
        </div>
      </div>

      {showFilters ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-md shadow-slate-200/30 ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none dark:ring-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">Filtros (demo)</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">Un input por campo.</div>
            </div>
            <button
              type="button"
              onClick={() =>
                setFilters({
                  name: "",
                  email: "",
                  phone: "",
                  address: "",
                  id: "",
                  createdAt: ""
                })
              }
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
            >
              Limpiar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Nombre</span>
              <input
                value={filters.name}
                onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                placeholder="Ej: María"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email</span>
              <input
                value={filters.email}
                onChange={(e) => setFilters((p) => ({ ...p, email: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                placeholder="Ej: ejemplo.com"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Teléfono</span>
              <input
                value={filters.phone}
                onChange={(e) => setFilters((p) => ({ ...p, phone: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                placeholder="Ej: 6000"
              />
            </label>

            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Dirección</span>
              <input
                value={filters.address}
                onChange={(e) => setFilters((p) => ({ ...p, address: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                placeholder="Ej: Av."
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">ID</span>
              <input
                value={filters.id}
                onChange={(e) => setFilters((p) => ({ ...p, id: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                placeholder="Ej: c_"
              />
            </label>

            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Creado (fecha/ISO)</span>
              <input
                value={filters.createdAt}
                onChange={(e) => setFilters((p) => ({ ...p, createdAt: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                placeholder="Ej: 2026-05"
              />
            </label>
          </div>

          <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            Mostrando <span className="font-semibold text-slate-900 dark:text-white">{filteredRows.length}</span> de{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{rows.length}</span> clientes.
          </div>
        </section>
      ) : (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          Mostrando <span className="font-semibold text-slate-900 dark:text-white">{filteredRows.length}</span> de{" "}
          <span className="font-semibold text-slate-900 dark:text-white">{rows.length}</span> clientes.
        </div>
      )}

      {showCreate ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-md shadow-slate-200/30 ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none dark:ring-white/10">
          <h2 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">Nuevo cliente (demo)</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Esto solo afecta el frontend (modo demo). Luego se conecta a backend y BDD.
          </p>
          
          {formError ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              {formError}
            </div>
          ) : null}

          <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Nombre</span>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                placeholder="Ej: Ana García"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email</span>
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                placeholder="ana@ejemplo.com"
                type="email"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Teléfono</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                placeholder="+54 11 6000-0000"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Dirección</span>
              <input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                placeholder="Calle 123, Ciudad"
                required
              />
            </label>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setShowCreate(false);
                }}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/20 hover:from-sky-500 hover:to-cyan-500 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cliente"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <DataTable title="Listado" accent="sky" columns={columns} rows={filteredRows} />
    </div>
  );
}

