import { useCallback, useEffect, useMemo, useState } from "react";
import AddProviderDialog from "../components/AddProviderDialog";
import DataTable, { type Column } from "../components/DataTable";
import EditProviderDialog from "../components/EditProviderDialog";
import ModalPortal from "../components/ModalPortal";
import PageHeader from "../components/PageHeader";
import PaginationControls from "../components/PaginationControls";
import SuccessToast from "../components/SuccessToast";
import { api, type Provider } from "../lib/api";

const PAGE_SIZE = 100;

export default function ProvidersPage() {
  const [rows, setRows] = useState<Provider[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<Provider | null>(null);

  const load = useCallback(
    (query = debouncedSearch, pageIndex = page) => {
      setLoading(true);
      setError(null);
      api
        .listProvidersPage({ nombre: query, limit: PAGE_SIZE, offset: pageIndex * PAGE_SIZE })
        .then((result) => {
          setRows(result.rows);
          setTotalRows(result.total);
        })
        .catch((e) => setError(String((e as Error)?.message ?? e)))
        .finally(() => setLoading(false));
    },
    [debouncedSearch, page]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(0);
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    load(debouncedSearch, page);
  }, [debouncedSearch, load, page]);

  const refreshProviders = useCallback(() => {
    load(debouncedSearch, page);
  }, [debouncedSearch, load, page]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const closeDeleteDialog = () => {
    setDeletingProvider(null);
    setDeleting(false);
  };

  const deleteSelectedProvider = useCallback(async () => {
    if (!deletingProvider) return;

    setDeleting(true);
    setError(null);

    try {
      await api.deleteProvider(deletingProvider.id);
      closeDeleteDialog();
      refreshProviders();
      setSuccessMessage("Proveedor eliminado con exito.");
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setDeleting(false);
    }
  }, [deletingProvider, refreshProviders]);

  const columns: Column<Provider>[] = useMemo(
    () => [
      {
        key: "nombre",
        header: "Nombre",
        className: "w-[22%] px-3",
        render: (provider) => (
          <span className="block truncate font-bold" title={provider.nombre}>
            {provider.nombre}
          </span>
        )
      },
      {
        key: "direccion",
        header: "Direccion",
        className: "w-[24%] px-3",
        render: (provider) => (
          <span className="block truncate font-bold" title={provider.direccion ?? ""}>
            {provider.direccion ?? "-"}
          </span>
        )
      },
      {
        key: "telefono",
        header: "Telefono",
        className: "w-[16%] px-3",
        render: (provider) => (
          <span className="block truncate font-bold" title={provider.telefono ?? ""}>
            {provider.telefono ?? "-"}
          </span>
        )
      },
      
      {
        key: "cuit",
        header: "CUIT",
        className: "w-[10%] px-3",
        render: (provider) => (
          <span className="block truncate font-bold" title={provider.cuit ?? ""}>
            {provider.cuit ?? "-"}
          </span>
        )
      },
      {
        key: "actions",
        header: "",
        className: "w-[10%] px-1 text-right",
        render: (provider) => (
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              aria-label="Editar proveedor"
              title="Editar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => setEditing(provider)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.86 4.49 2.65 2.65M6 18l3.1-.34 9.72-9.72a1.87 1.87 0 0 0-2.65-2.65L6.45 15.01 6 18Z" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Eliminar proveedor"
              title="Eliminar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/60"
              onClick={() => setDeletingProvider(provider)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
            </button>
          </div>
        )
      }
    ],
    []
  );

  const resultLabel = loading
    ? "Cargando proveedores..."
    : `${totalRows} proveedor${totalRows === 1 ? "" : "es"}${debouncedSearch ? " encontrados" : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Proveedores" tone="violet" />
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-800"
        >
          + Agregar proveedor
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto]">
        <label className="text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Buscar proveedor</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre del proveedor..."
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setSearch("")}
            disabled={!search.trim()}
            className="h-[38px] rounded-md border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-800 shadow-sm hover:bg-violet-50 disabled:opacity-50 dark:border-violet-900/60 dark:bg-slate-950/40 dark:text-violet-200 dark:hover:bg-violet-950/40"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-100">
        {resultLabel}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <DataTable
        accent="violet"
        columns={columns}
        rows={rows}
        loading={loading}
        loadingMessage="Buscando proveedores..."
        emptyMessage={debouncedSearch ? "No hay proveedores que coincidan con la busqueda." : "No hay proveedores registrados."}
        fixedLayout
      />

      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        total={totalRows}
        loading={loading}
        itemLabel="proveedores"
        onPageChange={setPage}
      />

      {deletingProvider ? (
        <ModalPortal>
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-slate-900">
            <div className="flex gap-4 px-5 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Eliminar proveedor</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Desea eliminar el proveedor <span className="font-semibold text-slate-900 dark:text-white">{deletingProvider.nombre}</span>?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                onClick={closeDeleteDialog}
                disabled={deleting}
              >
                No
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                onClick={deleteSelectedProvider}
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Si, eliminar"}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      ) : null}

      {showCreate ? (
        <AddProviderDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            refreshProviders();
            setSuccessMessage("Proveedor agregado con exito.");
          }}
        />
      ) : null}

      {editing ? (
        <EditProviderDialog
          provider={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refreshProviders();
            setSuccessMessage("Proveedor modificado con exito.");
          }}
        />
      ) : null}

      {successMessage ? <SuccessToast message={successMessage} onClose={() => setSuccessMessage(null)} /> : null}
    </div>
  );
}
