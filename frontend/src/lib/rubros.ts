function normalizeRubroKey(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

export function buildRubroOptions(rubros: string[], currentRubro?: string | null) {
  const rubroByKey = new Map<string, string>();

  [...rubros, currentRubro ?? ""].forEach((value) => {
    const rubro = value.trim();
    if (!rubro) return;

    const key = normalizeRubroKey(rubro);
    if (!rubroByKey.has(key)) {
      rubroByKey.set(key, rubro);
    }
  });

  return [...rubroByKey.values()].sort((a, b) => a.localeCompare(b, "es"));
}
