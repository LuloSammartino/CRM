import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import { api, type Customer } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

type CustomerForm = Omit<Customer, "id" | "createdAt">;

const emptyCustomerForm: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  direccion: "",
  direccion1: "",
  direccion2: "",
  cuit: "",
  iva: "",
  tipo: "",
  razonSocial: ""
};

type CustomerField = {
  key: keyof CustomerForm;
  label: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
};

const customerFields: CustomerField[] = [
  { key: "name", label: "Nombre", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Telefono" },
  { key: "direccion", label: "Direccion" },
  { key: "direccion1", label: "Direccion 1" },
  { key: "direccion2", label: "Direccion 2" },
  { key: "cuit", label: "CUIT", maxLength: 11 },
  { key: "iva", label: "IVA" },
  { key: "tipo", label: "Tipo" },
  { key: "razonSocial", label: "Razon social" }
] as const;

function asSearchText(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function customerToForm(customer: Customer): CustomerForm {
  return {
    name: customer.name ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    direccion: customer.direccion ?? "",
    direccion1: customer.direccion1 ?? "",
    direccion2: customer.direccion2 ?? "",
    cuit: customer.cuit ?? "",
    iva: customer.iva ?? "",
    tipo: customer.tipo ?? "",
    razonSocial: customer.razonSocial ?? ""
  };
}

function cleanForm(form: CustomerForm): CustomerForm {
  return {
    name: form.name.trim(),
    email: form.email?.trim() || null,
    phone: form.phone?.trim() || null,
    direccion: form.direccion?.trim() || null,
    direccion1: form.direccion1?.trim() || null,
    direccion2: form.direccion2?.trim() || null,
    cuit: form.cuit?.trim() || null,
    iva: form.iva?.trim() || null,
    tipo: form.tipo?.trim() || null,
    razonSocial: form.razonSocial?.trim() || null
  };
}

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyCustomerForm);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .listCustomers()
      .then(setRows)
      .catch((e) => setError(String((e as Error)?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const onSale = () => load();
    window.addEventListener(CRM_SALE_CREATED_EVENT, onSale);
    return () => window.removeEventListener(CRM_SALE_CREATED_EVENT, onSale);
  }, [load]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((customer) =>
      [
        customer.id,
        customer.name,
        customer.email,
        customer.phone,
        customer.direccion,
        customer.direccion1,
        customer.direccion2,
        customer.cuit,
        customer.iva,
        customer.tipo,
        customer.razonSocial
      ].some((value) => asSearchText(value).includes(query))
    );
  }, [rows, search]);

  const openCreate = () => {
    setForm(emptyCustomerForm);
    setFormError(null);
    setShowCreate(true);
  };

  const openEditor = (customer: Customer) => {
    setEditing(customer);
    setForm(customerToForm(customer));
    setFormError(null);
  };

  const closeForm = () => {
    setShowCreate(false);
    setEditing(null);
    setSaving(false);
    setFormError(null);
    setForm(emptyCustomerForm);
  };

  const saveCustomer = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setError(null);

    const payload = cleanForm(form);
    if (!payload.name) {
      setFormError("El nombre del cliente no puede quedar vacio.");
      return;
    }

    setSaving(true);

    try {
      const saved = editing
        ? await api.updateCustomer(editing.id, payload)
        : await api.createCustomer(payload);

      setRows((current) =>
        editing
          ? current.map((customer) => (customer.id === editing.id ? saved : customer))
          : [saved, ...current]
      );
      closeForm();
      load();
    } catch (e) {
      setFormError(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = useCallback(async (customer: Customer) => {
    const ok = window.confirm(`Eliminar a "${customer.name}"?`);
    if (!ok) return;

    setError(null);
    try {
      await api.deleteCustomer(customer.id);
      setRows((current) => current.filter((item) => item.id !== customer.id));
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    }
  }, []);

  const columns: Column<Customer>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Nombre",
        className: "w-[27%] px-3",
        render: (c) => <span className="block truncate font-medium" title={c.name}>{c.name}</span>
      },
      {
        key: "direccion",
        header: "Direccion",
        className: "w-[27%] px-3",
        render: (c) => <span className="block truncate" title={c.direccion ?? ""}>{c.direccion ?? "-"}</span>
      },
      {
        key: "phone",
        header: "Telefono",
        className: "w-[15%] px-3",
        render: (c) => <span className="block truncate" title={c.phone ?? ""}>{c.phone ?? "-"}</span>
      },
      {
        key: "email",
        header: "Email",
        className: "w-[23%] px-3",
        render: (c) => <span className="block truncate" title={c.email ?? ""}>{c.email ?? "-"}</span>
      },
      {
        key: "actions",
        header: "",
        className: "w-[8%] px-1 text-right",
        render: (c) => (
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              aria-label="Editar cliente"
              title="Editar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sky-600 text-white hover:bg-sky-700"
              onClick={() => openEditor(c)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.86 4.49 2.65 2.65M6 18l3.1-.34 9.72-9.72a1.87 1.87 0 0 0-2.65-2.65L6.45 15.01 6 18Z" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Eliminar cliente"
              title="Eliminar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/60"
              onClick={() => deleteCustomer(c)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
            </button>
          </div>
        )
      }
    ],
    [deleteCustomer]
  );

  const showingForm = showCreate || editing;
  const resultLabel = loading
    ? "Cargando clientes..."
    : `${filteredRows.length} cliente${filteredRows.length === 1 ? "" : "s"}${search.trim() ? " encontrados" : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Clientes" subtitle="Base de contactos y compradores." tone="sky" />
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/20 hover:from-sky-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-800"
        >
          Agregar cliente
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto]">
        <label className="text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Buscar cliente</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, email, telefono, CUIT..."
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/50"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setSearch("")}
            disabled={!search.trim()}
            className="h-[38px] rounded-md border border-sky-200 bg-white px-3 text-sm font-semibold text-sky-800 shadow-sm hover:bg-sky-50 disabled:opacity-50 dark:border-sky-900/60 dark:bg-slate-950/40 dark:text-sky-200 dark:hover:bg-sky-950/40"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
        {resultLabel}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <DataTable
        title="Listado"
        accent="sky"
        columns={columns}
        rows={filteredRows}
        loading={loading}
        loadingMessage="Buscando clientes..."
        emptyMessage={search.trim() ? "No hay clientes que coincidan con la busqueda." : "No hay clientes registrados."}
        fixedLayout
      />

      {showingForm ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editing ? "Editar cliente" : "Nuevo cliente"}
              </h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={closeForm}
                disabled={saving}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {formError ? (
              <div className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                {formError}
              </div>
            ) : null}

            <form onSubmit={saveCustomer} className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
              {editing ? (
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">ID</span>
                  <input
                    value={editing.id}
                    disabled
                    className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  />
                </label>
              ) : null}

              {customerFields.map(({ key, label, required, type, maxLength }) => (
                <label key={key} className={key === "name" && !editing ? "grid gap-1 sm:col-span-2" : "grid gap-1"}>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                  <input
                    value={form[key] ?? ""}
                    onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-sky-800 dark:focus:ring-sky-900/50"
                    type={type ?? "text"}
                    maxLength={maxLength}
                    required={required}
                  />
                </label>
              ))}

              <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/20 hover:from-sky-500 hover:to-cyan-500 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Guardar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
