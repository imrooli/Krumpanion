import type { StaticGameData } from "../staticData/types";
import type {
  DeterministicRequirement,
  GoalResolutionItem,
  GoalUsage,
  InventoryCoverage,
  MaterialDeficit,
  MaterialNeedRow,
  PlannerInput,
  PlannerWarning,
} from "./types";

function buildGoalUsage(params: {
  goalKey: string;
  goalType: GoalUsage["goalType"];
  amount: number;
  requirementLabel?: string;
  displayName?: string;
}): GoalUsage {
  return {
    goalType: params.goalType,
    key: params.goalKey,
    amount: params.amount,
    requirementLabel: params.requirementLabel,
    displayName: params.displayName,
  };
}

function inferMaterialCategory(materialKey: string, staticData: StaticGameData): MaterialNeedRow["category"] {
  return staticData.materials[materialKey]?.category ?? "other";
}

function inferRequirementType(goalType: GoalResolutionItem["goalType"], label: string): DeterministicRequirement["requirementType"] {
  if (goalType === "weapon") {
    return label.startsWith("Leveling") ? "weapon_level" : label.startsWith("Ascension") ? "weapon_ascension" : "other";
  }

  if (label === "Leveling") {
    return "character_level";
  }
  if (label === "Ascension" || label === "Level Cap Extension") {
    return "character_ascension";
  }
  if (label.startsWith("Talent:")) {
    return "talent_level";
  }
  return "other";
}

export function buildDeterministicRequirements(
  goalResolutions: GoalResolutionItem[],
  staticData: StaticGameData,
): {
  requirements: DeterministicRequirement[];
  usageByMaterial: Map<string, GoalUsage[]>;
} {
  const requirementsByMaterial = new Map<string, DeterministicRequirement>();
  const usageByMaterial = new Map<string, GoalUsage[]>();

  const registerUsage = (materialKey: string, usage: GoalUsage) => {
    usageByMaterial.set(materialKey, [...(usageByMaterial.get(materialKey) ?? []), usage]);
  };

  for (const plan of goalResolutions) {
    const usageType = plan.goalType === "character" ? "character" : "weapon";

    for (const entry of plan.breakdown) {
      const requirementType = inferRequirementType(plan.goalType, entry.label);
      for (const [materialKey, amount] of Object.entries(entry.materialTotals)) {
        if (amount <= 0) {
          continue;
        }

        const existing = requirementsByMaterial.get(materialKey);
        const requiredByGoals = [...new Set([...(existing?.requiredByGoals ?? []), plan.goalKey])];
        requirementsByMaterial.set(materialKey, {
          materialKey,
          displayName: staticData.materials[materialKey]?.displayName ?? materialKey,
          quantityRequired: (existing?.quantityRequired ?? 0) + amount,
          category: inferMaterialCategory(materialKey, staticData),
          requiredByGoals,
          requirementType:
            existing && existing.requirementType !== requirementType ? "other" : requirementType,
        });
        registerUsage(
          materialKey,
          buildGoalUsage({
            goalKey: plan.goalKey,
            goalType: usageType,
            amount,
            requirementLabel: entry.label,
            displayName: plan.displayName,
          }),
        );
      }
    }
  }

  return {
    requirements: [...requirementsByMaterial.values()].sort(
      (left, right) => right.quantityRequired - left.quantityRequired || left.displayName.localeCompare(right.displayName),
    ),
    usageByMaterial,
  };
}

export function buildInventoryCoverage(
  input: PlannerInput,
  requirements: DeterministicRequirement[],
  extraNeededByMaterial: Record<string, number> = {},
): InventoryCoverage[] {
  const requiredByMaterial = new Map<string, number>();
  for (const requirement of requirements) {
    requiredByMaterial.set(
      requirement.materialKey,
      (requiredByMaterial.get(requirement.materialKey) ?? 0) + requirement.quantityRequired,
    );
  }

  for (const [materialKey, amount] of Object.entries(extraNeededByMaterial)) {
    if (amount <= 0) {
      continue;
    }
    requiredByMaterial.set(materialKey, (requiredByMaterial.get(materialKey) ?? 0) + amount);
  }

  return [...requiredByMaterial.entries()]
    .map(([materialKey, quantityRequired]) => {
      const quantityOwned = input.inventory[materialKey] ?? 0;
      const quantityReserved = 0;
      const quantityUsable = Math.max(quantityOwned - quantityReserved, 0);
      const quantityConsumed = Math.min(quantityRequired, quantityUsable);
      const remainingAfterInventory = Math.max(quantityRequired - quantityUsable, 0);
      const surplusAfterInventory = Math.max(quantityUsable - quantityRequired, 0);

      return {
        materialKey,
        quantityRequired,
        quantityOwned,
        quantityReserved,
        quantityUsable,
        quantityConsumed,
        remainingAfterInventory,
        surplusAfterInventory,
      } satisfies InventoryCoverage;
    })
    .sort(
      (left, right) =>
        right.remainingAfterInventory - left.remainingAfterInventory || right.quantityRequired - left.quantityRequired,
    );
}

export function buildMaterialDeficits(params: {
  input: PlannerInput;
  requirements: DeterministicRequirement[];
  inventoryCoverage: InventoryCoverage[];
  usageByMaterial?: Map<string, GoalUsage[]>;
  craftingPlan?: import("../crafting/types").CraftingPlan | null;
}): { deficits: MaterialDeficit[]; warnings: PlannerWarning[] } {
  const warnings: PlannerWarning[] = [];
  const requirementsByMaterial = new Map(params.requirements.map((requirement) => [requirement.materialKey, requirement]));

  const deficits = params.inventoryCoverage
    .map((coverage) => {
      const requirement = requirementsByMaterial.get(coverage.materialKey);
      const sources = params.input.staticData.materialSources[coverage.materialKey] ?? [];
      const familyReference = params.input.staticData.materialFamilyByKey[coverage.materialKey];
      const guaranteedCraftCoverage = params.craftingPlan?.guaranteedCoverageByMaterial[coverage.materialKey] ?? 0;
      const missingQuantity = params.craftingPlan && coverage.materialKey !== "Mora"
        ? Math.max(params.craftingPlan.guaranteedRemainingByMaterial[coverage.materialKey] ?? coverage.remainingAfterInventory, 0)
        : coverage.remainingAfterInventory;
      const noResin = sources.length > 0 && sources.every((source) => source.resinCost == null || source.resinCost <= 0);
      const resinGated = sources.some((source) => (source.resinCost ?? 0) > 0);
      const rowWarnings: string[] = [];

      if (sources.length === 0) {
        warnings.push({
          type: "missing_source_metadata",
          key: coverage.materialKey,
          message: `No source metadata is available for ${coverage.materialKey}.`,
        });
        rowWarnings.push("Missing source metadata.");
      }

      if (!params.input.staticData.materials[coverage.materialKey]) {
        warnings.push({
          type: "unknown_material",
          key: coverage.materialKey,
          message: `The material ${coverage.materialKey} is needed for a goal but missing from the local catalog.`,
        });
        rowWarnings.push("Material is missing from the local catalog.");
      }

      return {
        materialKey: coverage.materialKey,
        displayName: requirement?.displayName ?? params.input.staticData.materials[coverage.materialKey]?.displayName ?? coverage.materialKey,
        category: requirement?.category ?? inferMaterialCategory(coverage.materialKey, params.input.staticData),
        missingQuantity,
        sourceKeys: sources.map((source) => source.sourceKey),
        familyKey: familyReference?.familyId,
        requiredByGoals: requirement?.requiredByGoals ?? [],
        canCraftFromLowerTiers: guaranteedCraftCoverage > 0 || Boolean(params.input.staticData.tieredMaterialIndex[coverage.materialKey]),
        noResin,
        resinGated,
        warnings: rowWarnings,
      } satisfies MaterialDeficit;
    })
    .filter((deficit) => deficit.missingQuantity > 0)
    .sort(
      (left, right) =>
        right.missingQuantity - left.missingQuantity || left.displayName.localeCompare(right.displayName),
    );

  return { deficits, warnings };
}

export function buildMaterialRows(
  input: PlannerInput,
  goalResolutions: GoalResolutionItem[],
  options?: {
    craftingPlan?: PlannerInput["goals"]["plannerSettings"] extends never ? never : import("../crafting/types").CraftingPlan | null;
    extraNeededByMaterial?: Record<string, number>;
  },
): { rows: MaterialNeedRow[]; warnings: PlannerWarning[] } {
  const { requirements, usageByMaterial } = buildDeterministicRequirements(goalResolutions, input.staticData);
  const baseCoverage = buildInventoryCoverage(input, requirements);
  const requirementsByMaterial = new Map(requirements.map((requirement) => [requirement.materialKey, requirement]));
  const extraNeededByMaterial = options?.extraNeededByMaterial ?? {};
  const effectiveCoverage = buildInventoryCoverage(input, requirements, extraNeededByMaterial);
  const { warnings } = buildMaterialDeficits({
    input,
    requirements,
    inventoryCoverage: effectiveCoverage,
    usageByMaterial,
    craftingPlan: options?.craftingPlan ?? null,
  });

  const rows: MaterialNeedRow[] = effectiveCoverage.map((coverage) => {
    const materialKey = coverage.materialKey;
    const requirement = requirementsByMaterial.get(materialKey);
    const rawCoverage = baseCoverage.find((entry) => entry.materialKey === materialKey);
    const craftableQuantity = options?.craftingPlan?.guaranteedCoverageByMaterial[materialKey] ?? 0;
    const rawMissing = rawCoverage?.remainingAfterInventory ?? coverage.remainingAfterInventory;
    const effectiveDeficit = options?.craftingPlan && materialKey !== "Mora"
      ? Math.max(options.craftingPlan.guaranteedRemainingByMaterial[materialKey] ?? coverage.remainingAfterInventory, 0)
      : coverage.remainingAfterInventory;
    const needed = coverage.quantityRequired;
    const progressionNeeded = requirement?.quantityRequired ?? 0;
    const extraNeeded = Math.max(0, needed - progressionNeeded);
    const sources = input.staticData.materialSources[materialKey] ?? [];
    const familyReference = input.staticData.materialFamilyByKey[materialKey];
    const localSpecialty = input.staticData.localSpecialties[materialKey];

    return {
      materialKey,
      displayName: input.staticData.materials[materialKey]?.displayName ?? requirement?.displayName ?? materialKey,
      progressionNeeded,
      extraNeeded,
      needed,
      owned: coverage.quantityOwned,
      missing: effectiveDeficit,
      rawMissing,
      craftableQuantity,
      effectiveOwned: coverage.quantityOwned + craftableQuantity,
      effectiveDeficit,
      category: requirement?.category ?? inferMaterialCategory(materialKey, input.staticData),
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
    };
  });

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
