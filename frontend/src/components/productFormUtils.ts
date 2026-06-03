import type { Dispatch, SetStateAction } from "react";
import type { Product } from "../lib/api";

export const pricePairs = [
  { price: "precio1", pct: "precio1Pct", label: "precio 1" },
  { price: "precio2", pct: "precio2Pct", label: "precio 2" },
  { price: "precio3", pct: "precio3Pct", label: "precio 3" }
] as const;

export type PriceField = (typeof pricePairs)[number]["price"];
export type PercentField = (typeof pricePairs)[number]["pct"];
export type ProductEditorForm = Partial<Omit<Product, PercentField>> & Partial<Record<PercentField, string>>;
export type ProductFormSetter = Dispatch<SetStateAction<ProductEditorForm>>;

function parseDecimal(value: unknown) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatDecimal(value: number) {
  return value.toFixed(2);
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function profitPercent(costValue: unknown, priceValue: unknown) {
  if (String(priceValue ?? "").trim() === "") return "";
  const cost = parseDecimal(costValue);
  const price = parseDecimal(priceValue);
  if (cost == null || cost === 0 || price == null) return "";
  return formatPercent(((price - cost) / cost) * 100);
}

export function priceFromPercent(costValue: unknown, percentValue: unknown) {
  const cost = parseDecimal(costValue);
  const percent = parseDecimal(percentValue);
  if (cost == null || percent == null) return "";
  return formatDecimal(cost * (1 + percent / 100));
}

export function emptyProductForm(): ProductEditorForm {
  return {
    nombre: "",
    costo: "",
    precio1: "",
    precio2: "",
    precio3: "",
    precio1Pct: "",
    precio2Pct: "",
    precio3Pct: "",
    rubro: "",
    proveedorId: ""
  };
}

export function productToForm(product: Product): ProductEditorForm {
  return {
    nombre: product.nombre,
    costo: product.costo ?? "",
    precio1: product.precio1,
    precio2: product.precio2 ?? "",
    precio3: product.precio3 ?? "",
    precio1Pct: profitPercent(product.costo, product.precio1),
    precio2Pct: profitPercent(product.costo, product.precio2),
    precio3Pct: profitPercent(product.costo, product.precio3),
    rubro: product.rubro ?? "",
    proveedorId: product.proveedorId ?? ""
  };
}

export function updateCostInForm(setter: ProductFormSetter, value: string) {
  setter((current) => {
    const next: ProductEditorForm = { ...current, costo: value };

    pricePairs.forEach(({ price, pct }) => {
      const nextPrice = priceFromPercent(value, current[pct]);
      if (nextPrice) next[price] = nextPrice;
    });

    return next;
  });
}

export function updatePriceInForm(setter: ProductFormSetter, field: PriceField, pctField: PercentField, value: string) {
  setter((current) => ({
    ...current,
    [field]: value,
    [pctField]: profitPercent(current.costo, value)
  }));
}

export function updatePercentInForm(setter: ProductFormSetter, field: PriceField, pctField: PercentField, value: string) {
  setter((current) => ({
    ...current,
    [pctField]: value,
    [field]: priceFromPercent(current.costo, value)
  }));
}
