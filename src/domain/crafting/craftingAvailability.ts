import type { InventoryState } from "../account/types";
import type { StaticGameData } from "../staticData/types";

function buildAvailableCounter(
  inventory: InventoryState,
  staticData: StaticGameData,
  materialKey: string,
  cache: Map<string, number>,
  visiting: Set<string>,
): number {
  if (cache.has(materialKey)) {
    return cache.get(materialKey) ?? 0;
  }

  if (visiting.has(materialKey)) {
    return inventory[materialKey] ?? 0;
  }

  visiting.add(materialKey);
  const owned = inventory[materialKey] ?? 0;
  const recipe = staticData.recipes[materialKey];

  if (!recipe) {
    cache.set(materialKey, owned);
    visiting.delete(materialKey);
    return owned;
  }

  const craftRuns = Math.min(
    ...Object.entries(recipe.ingredients).map(([ingredientKey, ingredientQuantity]) =>
      Math.floor(buildAvailableCounter(inventory, staticData, ingredientKey, cache, visiting) / ingredientQuantity),
    ),
  );

  const totalAvailable = owned + (Number.isFinite(craftRuns) ? craftRuns * recipe.outputQuantity : 0);
  cache.set(materialKey, totalAvailable);
  visiting.delete(materialKey);
  return totalAvailable;
}

export function calculateTotalAvailableWithCrafting(
  materialKey: string,
  inventory: InventoryState,
  staticData: StaticGameData,
): number {
  return buildAvailableCounter(inventory, staticData, materialKey, new Map<string, number>(), new Set<string>());
}

export function calculateCraftableQuantity(
  materialKey: string,
  inventory: InventoryState,
  staticData: StaticGameData,
): number {
  return Math.max(calculateTotalAvailableWithCrafting(materialKey, inventory, staticData) - (inventory[materialKey] ?? 0), 0);
}
