import type { SaleRow } from "../lib/api";

type Props = {
  sale: SaleRow;
  onClose: () => void;
};

function formatMoney(value: number) {
  return `$${Number(value).toFixed(2)}`;
}

function formatSaleDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export default function SaleDetailDialog({ sale, onClose }: Props) {
  function printSale() {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title></title>
          <style>
            @page { margin: 0; }
            body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
            h1 { font-size: 20px; margin: 0 0 8px; }
            p { margin: 4px 0; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th, td.num { text-align: right; }
            .total { margin-top: 20px; text-align: right; font-size: 18px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Detalle de venta</h1>
          <p><strong>Fecha:</strong> ${escapeHtml(formatSaleDate(sale.createdAt))}</p>
          <p><strong>Cliente:</strong> ${escapeHtml(sale.customerName)}</p>
          <p><strong>Pago:</strong> ${escapeHtml(sale.metodoPago || "Sin especificar")}</p>
          <table>
            <thead>
              <tr><th>Producto</th><th class="num">Cantidad</th><th class="num">Precio cobrado</th><th class="num">Subtotal</th></tr>
            </thead>
            <tbody>
              ${sale.lines.map((line) => `
                <tr>
                  <td>${escapeHtml(line.productName)}</td>
                  <td class="num">${line.qty}</td>
                  <td class="num">${formatMoney(line.unitPrice)}</td>
                  <td class="num">${formatMoney(line.lineTotal)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="total">Total: ${formatMoney(sale.total)}</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-detail-title"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-slate-700 dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/70">
          <div>
            <h2 id="sale-detail-title" className="text-base font-bold text-slate-950 dark:text-white">
              Detalle de venta
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {formatSaleDate(sale.createdAt)} - {sale.customerName}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
              onClick={printSale}
            >
              Imprimir
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold leading-none text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={onClose}
              aria-label="Cerrar detalle de venta"
            >
              x
            </button>
          </div>
        </div>

        <div className="overflow-auto p-5">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cliente</div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-white">{sale.customerName}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pago</div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-white">{sale.metodoPago || "Sin especificar"}</div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/35">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Total</div>
              <div className="mt-1 text-lg font-bold tabular-nums text-emerald-800 dark:text-emerald-100">
                {formatMoney(sale.total)}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-amber-500 text-white dark:bg-amber-600">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Producto</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Cantidad</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Precio unitario</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sale.lines.map((line, index) => (
                  <tr key={`${line.productName}-${index}`} className="bg-white dark:bg-slate-900">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                      <div className="font-semibold">{line.productName}</div>
                      
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{line.qty}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatMoney(line.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-300">
                      {formatMoney(line.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
