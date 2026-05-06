import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "../components/DataTable";
import PageHeader from "../components/PageHeader";
import { api, type Customer } from "../lib/api";
import { CRM_SALE_CREATED_EVENT } from "../lib/events";

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const columns: Column<Customer>[] = useMemo(
    () => [
      { key: "name", header: "Nombre", render: (c) => c.name },
      { key: "email", header: "Email", render: (c) => c.email ?? "—" },
      { key: "phone", header: "Teléfono", render: (c) => c.phone ?? "—" },
      { key: "address", header: "Dirección", render: (c) => c.address ?? "—" }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Clientes" subtitle="Base de contactos y compradores." tone="sky" />
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-gradient-to-r from-sky-100 to-cyan-100 px-4 py-2 text-sm font-semibold text-sky-900 shadow-sm dark:border-sky-800 dark:from-sky-950/50 dark:to-cyan-950/50 dark:text-sky-100">
          <span className="text-lg" aria-hidden>
            👥
          </span>
          {rows.length} registrados
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <DataTable title="Listado" accent="sky" columns={columns} rows={rows} />
    </div>
  );
}

