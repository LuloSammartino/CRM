/** Disparar tras crear una venta (mock o API) para refrescar listados. */
export const CRM_SALE_CREATED_EVENT = "crm:sale-created";

export function notifySaleCreated() {
  window.dispatchEvent(new CustomEvent(CRM_SALE_CREATED_EVENT));
}
