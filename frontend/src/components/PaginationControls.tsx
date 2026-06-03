type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  itemLabel: string;
  onPageChange: (page: number) => void;
};

function pageItems(currentPage: number, totalPages: number) {
  const pages = new Set<number>([0, totalPages - 1, currentPage - 1, currentPage, currentPage + 1]);
  return [...pages].filter((page) => page >= 0 && page < totalPages).sort((a, b) => a - b);
}

export default function PaginationControls({
  page,
  pageSize,
  total,
  loading = false,
  itemLabel,
  onPageChange
}: PaginationControlsProps) {
  if (total <= pageSize) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize + 1;
  const end = Math.min(total, (safePage + 1) * pageSize);
  const pages = pageItems(safePage, totalPages);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-medium text-slate-700 dark:text-slate-200">
        Mostrando {start}-{end} de {total} {itemLabel}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={() => onPageChange(Math.max(0, safePage - 1))}
          disabled={loading || safePage === 0}
          aria-label="Pagina anterior"
          title="Anterior"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
          </svg>
        </button>

        {pages.map((pageNumber, index) => (
          <span key={pageNumber} className="inline-flex items-center gap-2">
            {index > 0 && pageNumber - pages[index - 1] > 1 ? (
              <span className="px-1 text-slate-400" aria-hidden="true">
                ...
              </span>
            ) : null}
            <button
              type="button"
              className={[
                "h-9 min-w-9 rounded-md px-3 text-sm font-semibold transition disabled:opacity-60",
                pageNumber === safePage
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onPageChange(pageNumber)}
              disabled={loading || pageNumber === safePage}
              aria-current={pageNumber === safePage ? "page" : undefined}
            >
              {pageNumber + 1}
            </button>
          </span>
        ))}

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={() => onPageChange(Math.min(totalPages - 1, safePage + 1))}
          disabled={loading || safePage >= totalPages - 1}
          aria-label="Pagina siguiente"
          title="Siguiente"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
