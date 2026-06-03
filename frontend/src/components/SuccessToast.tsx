type SuccessToastProps = {
  message: string;
  onClose: () => void;
};

export default function SuccessToast({ message, onClose }: SuccessToastProps) {
  return (
    <div className="fixed bottom-5 right-5 z-[140] max-w-sm rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 shadow-xl shadow-slate-900/15 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-100">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">{message}</span>
        <button
          type="button"
          aria-label="Cerrar notificacion"
          onClick={onClose}
          className="-mr-1 rounded-md p-1 text-emerald-800 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-slate-800"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
