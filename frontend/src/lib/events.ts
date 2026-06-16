/** Disparar tras crear una venta (mock o API) para refrescar listados. */
export const CRM_SALE_CREATED_EVENT = "crm:sale-created";
export const CRM_CASH_MOVEMENT_CREATED_EVENT = "crm:cash-movement-created";

export function notifySaleCreated() {
  window.dispatchEvent(new CustomEvent(CRM_SALE_CREATED_EVENT));
}

export function notifyCashMovementCreated() {
  window.dispatchEvent(new CustomEvent(CRM_CASH_MOVEMENT_CREATED_EVENT));
}
