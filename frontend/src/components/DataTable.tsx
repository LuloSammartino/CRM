import React from "react";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: T) => React.ReactNode;
};

export type TableAccent = "indigo" | "sky" | "emerald" | "violet" | "amber";

const headTone: Record<TableAccent, string> = {
  indigo:
    "bg-gradient-to-r from-indigo-500 to-violet-500 text-white dark:from-indigo-600 dark:to-violet-600",
  sky: "bg-gradient-to-r from-sky-500 to-cyan-500 text-white dark:from-sky-600 dark:to-cyan-600",
  emerald:
    "bg-gradient-to-r from-emerald-500 to-teal-500 text-white dark:from-emerald-600 dark:to-teal-600",
  violet:
    "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white dark:from-violet-600 dark:to-fuchsia-600",
  amber:
    "bg-gradient-to-r from-amber-500 to-orange-500 text-white dark:from-amber-600 dark:to-orange-600"
};

type Props<T> = {
  title?: string;
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  accent?: TableAccent;
  loading?: boolean;
  loadingMessage?: string;
  fixedLayout?: boolean;
};

export default function DataTable<T>({
  title,
  columns,
  rows,
  emptyMessage = "Sin datos.",
  accent = "indigo",
  loading = false,
  loadingMessage = "Cargando...",
  fixedLayout = false
}: Props<T>) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-md shadow-slate-200/30 ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none dark:ring-white/10">
      {title ? (
        <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
          <h2 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
      ) : null}

      <div className={fixedLayout ? "overflow-hidden" : "overflow-auto"}>
        <table className={fixedLayout ? "w-full table-fixed text-sm" : "min-w-full text-sm"}>
          <thead className={headTone[accent]}>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={["bg-transparent px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", c.className, c.headerClassName]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-500 dark:text-slate-400" colSpan={columns.length}>
                  <div className="flex min-h-28 flex-col items-center justify-center gap-3">
                    <span
                      className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-400"
                      aria-hidden="true"
                    />
                    <span role="status" aria-live="polite" className="text-sm font-medium">
                      {loadingMessage}
                    </span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="transition hover:bg-violet-50/50 dark:hover:bg-slate-800/60"
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={["px-4 py-3 align-top text-slate-800 dark:text-slate-200", c.className, c.cellClassName]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

