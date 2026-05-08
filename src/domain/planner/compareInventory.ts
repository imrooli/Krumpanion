import type { StaticGameData } from "../staticData/types";
import type {
  GoalResolutionItem,
  GoalUsage,
  MaterialNeedRow,
  PlannerInput,
  PlannerWarning,
} from "./types";

function buildGoalUsage(label: string, goalType: GoalUsage["goalType"], amount: number): GoalUsage {
  return { goalType, key: label, amount };
}

function inferMaterialCategory(materialKey: string, staticData: StaticGameData): MaterialNeedRow["category"] {
  return staticData.materials[materialKey]?.category ?? "other";
}

export function buildMaterialRows(
  input: PlannerInput,
  goalResolutions: GoalResolutionItem[],
  options?: {
    craftingPlan?: PlannerInput["goals"]["plannerSettings"] extends never ? never : import("../crafting/types").CraftingPlan | null;
    extraNeededByMaterial?: Record<string, number>;
  },
): { rows: MaterialNeedRow[]; warnings: PlannerWarning[] } {
  const warnings: PlannerWarning[] = [];
  const usageByMaterial = new Map<string, GoalUsage[]>();
  const neededByMaterial = new Map<string, number>();
  const baseNeededByMaterial = new Map<string, number>();

  const registerUsage = (materialKey: string, usage: GoalUsage) => {
    usageByMaterial.set(materialKey, [...(usageByMaterial.get(materialKey) ?? []), usage]);
  };

  for (const plan of goalResolutions) {
    const usageType = plan.goalType === "character" ? "character" : "weapon";
    for (const [materialKey, amount] of Object.entries(plan.missingByMaterial)) {
      neededByMaterial.set(materialKey, (neededByMaterial.get(materialKey) ?? 0) + amount);
      baseNeededByMaterial.set(materialKey, (baseNeededByMaterial.get(materialKey) ?? 0) + amount);
      registerUsage(materialKey, buildGoalUsage(plan.goalKey, usageType, amount));
    }
  }

  for (const [materialKey, amount] of Object.entries(options?.extraNeededByMaterial ?? {})) {
    neededByMaterial.set(materialKey, (neededByMaterial.get(materialKey) ?? 0) + amount);
  }

  const rows: MaterialNeedRow[] = [];

  for (const [materialKey, needed] of neededByMaterial.entries()) {
    const owned = input.inventory[materialKey] ?? 0;
    const rawMissing = Math.max(needed - owned, 0);
    const craftableQuantity = options?.craftingPlan?.guaranteedCoverageByMaterial[materialKey] ?? 0;
    const effectiveOwned = owned + craftableQuantity;
    const effectiveDeficit = options?.craftingPlan
      ? options.craftingPlan.guaranteedRemainingByMaterial[materialKey] ?? rawMissing
      : rawMissing;
    const sources = input.staticData.materialSources[materialKey] ?? [];
    const familyReference = input.staticData.materialFamilyByKey[materialKey];
    const localSpecialty = input.staticData.localSpecialties[materialKey];
    const progressionNeeded = baseNeededByMaterial.get(materialKey) ?? 0;
    const extraNeeded = Math.max(0, needed - progressionNeeded);

    if (sources.length === 0) {
      warnings.push({
        type: "missing_source_metadata",
        key: materialKey,
        message: `No source metadata is available for ${materialKey}.`,
      });
    }

    if (!input.staticData.materials[materialKey]) {
      warnings.push({
        type: "unknown_material",
        key: materialKey,
        message: `The material ${materialKey} is needed for a goal but missing from the local catalog.`,
      });
    }

    rows.push({
      materialKey,
      displayName: input.staticData.materials[materialKey]?.displayName ?? materialKey,
      progressionNeeded,
      extraNeeded,
      needed,
      owned,
      missing: effectiveDeficit,
      rawMissing,
      craftableQuantity,
      effectiveOwned,
      effectiveDeficit,
      category: inferMaterialCategory(materialKey, input.staticData),
      familyId: familyReference?.familyId,
      familyDisplayName: familyReference?.displayName,
      sourceEnemyFamily: familyReference?.sourceEnemyFamily,
      region: localSpecialty?.region,
      isPurchasable: localSpecialty?.isPurchasable,
      purchaseVendors: localSpecialty?.purchaseVendors,
      searchHint: localSpecialty?.searchHint,
      usedBy: usageByMaterial.get(materialKey) ?? [],
      sources,
      craftingReport: options?.craftingPlan?.reports.find((report) => report.targetMaterialKey === materialKey),
    });
  }

  return {
    rows: rows.sort(
      (left, right) =>
        right.effectiveDeficit - left.effectiveDeficit ||
        right.rawMissing - left.rawMissing ||
        left.displayName.localeCompare(right.displayName),
    ),
    warnings,
  };
}
