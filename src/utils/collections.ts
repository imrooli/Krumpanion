export type MaterialTotals = Record<string, number>;

export function addMaterialAmounts(base: MaterialTotals, incoming: MaterialTotals): MaterialTotals {
  const next: MaterialTotals = { ...base };

  for (const [key, amount] of Object.entries(incoming)) {
    next[key] = (next[key] ?? 0) + amount;
  }

  return next;
}

export function subtractMaterialAmounts(target: MaterialTotals, baseline: MaterialTotals): MaterialTotals {
  const next: MaterialTotals = {};
  const keys = new Set([...Object.keys(target), ...Object.keys(baseline)]);

  for (const key of keys) {
    const delta = (target[key] ?? 0) - (baseline[key] ?? 0);
    if (delta > 0) {
      next[key] = delta;
    }
  }

  return next;
}

export function clampMaterialAmounts(amounts: MaterialTotals): MaterialTotals {
  const next: MaterialTotals = {};

  for (const [key, amount] of Object.entries(amounts)) {
    if (amount > 0) {
      next[key] = amount;
    }
  }

  return next;
}

export function sumMaterialAmounts(amounts: MaterialTotals): number {
  return Object.values(amounts).reduce((sum, amount) => sum + amount, 0);
}

export function recordEntries<T>(value: Record<string, T>): Array<[string, T]> {
  return Object.entries(value);
}
