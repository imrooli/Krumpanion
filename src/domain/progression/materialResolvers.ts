import type { MaterialTotals } from "../../utils/collections";

const CHARACTER_BOOK_VALUES = [
  { key: "HerosWit", value: 20000 },
  { key: "AdventurersExperience", value: 5000 },
  { key: "WanderersAdvice", value: 1000 },
] as const;

const WEAPON_ORE_VALUES = [
  { key: "MysticEnhancementOre", value: 10000 },
  { key: "FineEnhancementOre", value: 2000 },
  { key: "EnhancementOre", value: 400 },
] as const;

function resolveGreedyMaterials(expValue: number, families: readonly { key: string; value: number }[]): MaterialTotals {
  if (expValue <= 0) {
    return {};
  }

  let remaining = expValue;
  const totals: MaterialTotals = {};

  for (const family of families) {
    const quantity =
      family === families[families.length - 1] ? Math.ceil(remaining / family.value) : Math.floor(remaining / family.value);

    if (quantity > 0) {
      totals[family.key] = quantity;
      remaining -= quantity * family.value;
    }
  }

  return totals;
}

export function resolveCharacterExpMaterials(expValue: number): MaterialTotals {
  return resolveGreedyMaterials(expValue, CHARACTER_BOOK_VALUES);
}

export function resolveWeaponExpMaterials(expValue: number): MaterialTotals {
  return resolveGreedyMaterials(expValue, WEAPON_ORE_VALUES);
}
