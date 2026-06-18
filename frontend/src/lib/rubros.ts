export const DEFAULT_RUBRO = "RUBRO UNICO";
export const ADD_RUBRO_VALUE = "__add_rubro__";

export function normalizeRubro(value: string | null | undefined) {
  return (value?.trim() || DEFAULT_RUBRO).toLocaleUpperCase("es");
}

function normalizeRubroKey(value: string) {
  return normalizeRubro(value);
}

export function buildRubroOptions(rubros: string[], currentRubro?: string | null) {
  const rubroByKey = new Map<string, string>();

  [...rubros, currentRubro ?? DEFAULT_RUBRO].forEach((value) => {
    if (value === ADD_RUBRO_VALUE) return;
    const rubro = normalizeRubro(value);

    const key = normalizeRubroKey(rubro);
    if (!rubroByKey.has(key)) {
      rubroByKey.set(key, rubro);
    }
  });

  return [...rubroByKey.values()].sort((a, b) => a.localeCompare(b, "es"));
}
