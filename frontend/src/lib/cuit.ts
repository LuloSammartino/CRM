export function formatCuit(value?: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 11 ? `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}` : value || "-";
}
