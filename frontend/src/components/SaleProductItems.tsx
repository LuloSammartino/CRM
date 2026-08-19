import type { Product } from "../lib/api";
import { profitPercent } from "./productFormUtils";

export type PriceMode = "precio1" | "precio2" | "precio3" | "manual";

export type SaleItemForm = {
  id: number;
  product: Product | null;
  productId: string;
  productSearch: string;
  selectedProductName: string;
  saleProductName: string;
  qty: string;
  unitPrice: number;
  priceMode: PriceMode;
};

type SaleProductItemsProps = {
  saleItems: SaleItemForm[];
  products: Product[];
  loadingProducts: boolean;
  activeProductItemId: number | null;
  editingSaleItemId: number | null;
  setActiveProductItemId: (itemId: number | null) => void;
  setEditingSaleItemId: (itemId: number | null) => void;
  setProductLookupQuery: (query: string) => void;
  updateSaleItem: (itemId: number, changes: Partial<SaleItemForm>) => void;
  selectProduct: (itemId: number, product: Product) => void;
  loadMoreProducts: () => void;
  updatePriceMode: (itemId: number, mode: PriceMode) => void;
  updateQty: (itemId: number, nextQty: number) => void;
  removeSaleItem: (itemId: number) => void;
};

const priceLabels: Record<Exclude<PriceMode, "manual">, string> = {
  precio1: "Precio 1",
  precio2: "Precio 2",
  precio3: "Precio 3"
};

function parsePrice(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pricePercent(product: Product | null | undefined, price: unknown) {
  if (!product) return "";
  return profitPercent(product.costo, price);
}

function pricePercentLabel(product: Product | null | undefined, price: unknown) {
  const percent = pricePercent(product, price);
  return percent ? `${percent}%` : "sin %";
}

function parseQty(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function SaleProductItems({
  saleItems,
  products,
  loadingProducts,
  activeProductItemId,
  editingSaleItemId,
  setActiveProductItemId,
  setEditingSaleItemId,
  setProductLookupQuery,
  updateSaleItem,
  selectProduct,
  loadMoreProducts,
  updatePriceMode,
  updateQty,
  removeSaleItem
}: SaleProductItemsProps) {
  return (
    <div className="space-y-3">
      {saleItems.map((item, index) => {
        const parsedItemQty = parseQty(item.qty);
        const itemTotal = Math.max(0, parsedItemQty) * Math.max(0, item.unitPrice);
        const showProductResults = activeProductItemId === item.id && !item.productId;
        const selectedPricePercent = pricePercent(item.product, item.unitPrice);
        const isEditing = editingSaleItemId === item.id;

        return (
          <div
            key={item.id}
            className={`${isEditing ? "overflow-visible" : "overflow-hidden"} rounded-lg border bg-slate-50/70 transition-[box-shadow,border-color,background-color] duration-200 dark:bg-slate-800/40 ${
              isEditing
                ? "border-violet-200 bg-white shadow-md shadow-violet-900/10 ring-1 ring-violet-100 dark:border-violet-700 dark:bg-slate-900/70 dark:shadow-black/30 dark:ring-violet-900/40"
                : "border-slate-200 shadow-sm dark:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 dark:bg-slate-900/50">
              <button
                type="button"
                className="min-w-0 flex flex-1 items-center gap-2 text-left"
                onClick={() => setEditingSaleItemId(item.id)}
              >
                <span className="shrink-0 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                  #{index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {item.saleProductName || item.selectedProductName || item.productSearch || `Producto ${index + 1}`}
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300 sm:inline">
                  ${itemTotal.toFixed(2)}
                </span>
                <button
                  type="button"
                  aria-label={isEditing ? "Minimizar producto" : "Editar producto"}
                  className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  onClick={() => setEditingSaleItemId(isEditing ? null : item.id)}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className={`h-5 w-5 transition-transform ${isEditing ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {saleItems.length > 1 ? (
                  <button
                    type="button"
                    aria-label="Quitar producto"
                    className="rounded-md p-1 text-red-600 transition hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
                    onClick={() => removeSaleItem(item.id)}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                isEditing ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className={isEditing ? "overflow-visible" : "overflow-hidden"}>
                <div
                  className={`grid grid-cols-1 gap-3 p-3 transition-transform duration-300 ease-in-out sm:grid-cols-2 xl:grid-cols-4 ${
                    isEditing ? "translate-y-0" : "-translate-y-2"
                  }`}
                >
                  <label className="relative block text-sm sm:col-span-2 xl:col-span-4">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Nombre</span>
                      {item.productId ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
                          onClick={() => {
                            setActiveProductItemId(item.id);
                            setProductLookupQuery("");
                            updateSaleItem(item.id, {
                              product: null,
                              productId: "",
                              productSearch: "",
                              selectedProductName: "",
                              saleProductName: "",
                              unitPrice: 0,
                              priceMode: "precio1"
                            });
                          }}
                        >
                          Cambiar producto
                        </button>
                      ) : null}
                    </span>
                    <input
                      type="search"
                      autoFocus={index === 0}
                      maxLength={100}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                      value={item.productId ? item.saleProductName : item.productSearch}
                      onFocus={() => {
                        setActiveProductItemId(item.id);
                        if (!item.productId) setProductLookupQuery(item.productSearch);
                      }}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (item.productId) {
                          updateSaleItem(item.id, { saleProductName: value });
                          return;
                        }
                        setActiveProductItemId(item.id);
                        setProductLookupQuery(value);
                        updateSaleItem(item.id, {
                          product: null,
                          productId: "",
                          productSearch: value,
                          selectedProductName: "",
                          saleProductName: "",
                          unitPrice: 0,
                          priceMode: "precio1"
                        });
                      }}
                      placeholder="Buscar producto"
                      required={isEditing}
                    />
                    {showProductResults ? (
                      <div
                        className="absolute left-0 right-0 top-full z-[120] mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                        onScroll={(e) => {
                          const el = e.currentTarget;
                          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) loadMoreProducts();
                        }}
                      >
                        {loadingProducts && !products.length ? (
                          <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Buscando productos...</div>
                        ) : products.length ? (
                          <>
                            {products.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-800 hover:bg-violet-50 dark:text-slate-100 dark:hover:bg-slate-800"
                                onClick={() => selectProduct(item.id, product)}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">{product.nombre}</span>
                                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                    {product.rubro ?? "Sin rubro"}
                                  </span>
                                </span>
                                <span className="shrink-0 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                                  ${Number(product.precio1).toFixed(2)}
                                  <span className="block text-[11px] font-medium text-emerald-800/75 dark:text-emerald-200/80">
                                    {pricePercentLabel(product, product.precio1)}
                                  </span>
                                </span>
                              </button>
                            ))}
                            {loadingProducts ? (
                              <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Cargando mas productos...</div>
                            ) : null}
                          </>
                        ) : (
                          <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Sin coincidencias.</div>
                        )}
                      </div>
                    ) : null}
                  </label>

                  <label className="block text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Cantidad</span>
                    <div className="mt-1 flex h-10 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:border-violet-400 dark:focus-within:ring-violet-900/50">
                      <button
                        type="button"
                        aria-label="Disminuir cantidad"
                        className="w-10 border-r border-slate-300 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                        onClick={() => updateQty(item.id, parsedItemQty - 1)}
                        disabled={parsedItemQty <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="min-w-0 flex-1 border-0 bg-transparent px-3 text-center text-sm text-slate-900 outline-none dark:text-slate-100"
                        value={item.qty}
                        onChange={(e) => updateSaleItem(item.id, { qty: e.target.value })}
                        required={isEditing}
                      />
                      <button
                        type="button"
                        aria-label="Aumentar cantidad"
                        className="w-10 border-l border-slate-300 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                        onClick={() => updateQty(item.id, parsedItemQty + 1)}
                      >
                        +
                      </button>
                    </div>
                  </label>

                  <label className="block text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Lista de precio</span>
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                      value={item.priceMode}
                      onChange={(e) => updatePriceMode(item.id, e.target.value as PriceMode)}
                      disabled={!item.product}
                    >
                      {(["precio1", "precio2", "precio3"] as const).map((mode) => {
                        const price = item.product ? parsePrice(item.product[mode]) : null;
                        return (
                          <option key={mode} value={mode} disabled={price == null}>
                            {priceLabels[mode]}
                            {price != null ? ` - $${price.toFixed(2)} (${pricePercentLabel(item.product, price)})` : " - sin precio"}
                          </option>
                        );
                      })}
                      <option value="manual">Precio manual</option>
                    </select>
                  </label>

                  <label className="block text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Precio unitario {selectedPricePercent ? `(${selectedPricePercent}%)` : ""}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/50"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateSaleItem(item.id, {
                          unitPrice: Number(e.target.value),
                          priceMode: "manual"
                        })
                      }
                      required={isEditing}
                    />
                  </label>

                  <div className="flex items-end justify-between rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-slate-900/50">
                    <span className="font-medium text-slate-600 dark:text-slate-300">Subtotal</span>
                    <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">${itemTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
