import type { InventoryState } from "../account/types";
import type { PlannerSettings } from "../goals/types";
import type { MaterialNeedRow } from "../planner/types";
import type { StaticGameData } from "../staticData/types";
import type {
  CraftingPlan,
  CraftingPlanReport,
  CraftingRecipe,
  CraftingSuggestion,
  CraftingUtilityPassive,
  CraftingStep,
  RecommendedCraftingPassive,
} from "./types";

export type CraftingMode = "conservative" | "aggressive";

interface ResolveCraftingPlanOptions {
  mode?: CraftingMode;
  ownedCharacterKeys?: string[];
  plannerSettings?: PlannerSettings;
  progressionMora?: number;
}

interface TargetCraftPlan {
  outputAmount: number;
  steps: CraftingStep[];
  moraCost: number;
  leftovers: Record<string, number>;
  remainingMissing: number;
  canSatisfy: boolean;
  lowerTierAvailable: Record<string, number>;
}

interface PassiveSelectionInput {
  staticData: StaticGameData;
  plannerSettings?: PlannerSettings;
  ownedCharacterKeys: string[];
  recipe: CraftingRecipe | null;
  requiredAmount: number;
  ownedAmount: number;
}

function normalizeOptions(modeOrOptions: CraftingMode | ResolveCraftingPlanOptions | undefined): ResolveCraftingPlanOptions {
  if (!modeOrOptions) {
    return {};
  }
  if (typeof modeOrOptions === "string") {
    return { mode: modeOrOptions };
  }
  return modeOrOptions;
}

function toSortedRows(rows: MaterialNeedRow[], staticData: StaticGameData): MaterialNeedRow[] {
  return [...rows].sort((left, right) => {
    const leftTier = staticData.tieredMaterialIndex[left.materialKey]?.tierIndex ?? Number.POSITIVE_INFINITY;
    const rightTier = staticData.tieredMaterialIndex[right.materialKey]?.tierIndex ?? Number.POSITIVE_INFINITY;
    return (
      leftTier - rightTier ||
      right.rawMissing - left.rawMissing ||
      left.displayName.localeCompare(right.displayName)
    );
  });
}

function sumTotals(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function getTierKeys(materialKey: string, staticData: StaticGameData): string[] {
  return staticData.tieredMaterialIndex[materialKey]?.tierKeys ?? [];
}

function getStepInput(recipe: CraftingRecipe): { materialKey: string; materialName: string; quantity: number } | null {
  const firstInput = recipe.inputMaterials?.[0];
  if (firstInput) {
    return firstInput;
  }
  const [materialKey, quantity] = Object.entries(recipe.ingredients)[0] ?? [];
  if (!materialKey || typeof quantity !== "number") {
    return null;
  }
  return {
    materialKey,
    materialName: materialKey,
    quantity,
  };
}

function recordStep(steps: CraftingStep[], recipe: CraftingRecipe, crafts: number, passiveUsed?: string | null): void {
  if (crafts <= 0) {
    return;
  }
  const input = getStepInput(recipe);
  if (!input) {
    return;
  }

  steps.push({
    outputKey: recipe.outputKey ?? recipe.outputMaterialKey,
    outputMaterialKey: recipe.outputMaterialKey,
    outputName: recipe.outputName ?? recipe.outputMaterialKey,
    outputQuantity: recipe.outputQuantity,
    inputKey: input.materialKey,
    inputName: input.materialName,
    inputQuantity: input.quantity,
    crafts,
    moraCostPerCraft: recipe.moraCost ?? 0,
    totalMoraCost: (recipe.moraCost ?? 0) * crafts,
    passiveUsed,
    isElementConversion: recipe.isElementConversion,
  });
}

function ensureQuantity(
  materialKey: string,
  amountNeeded: number,
  usageInventory: InventoryState,
  reservedByMaterial: Record<string, number>,
  staticData: StaticGameData,
  steps: CraftingStep[],
): number {
  const current = usageInventory[materialKey] ?? 0;
  if (current >= amountNeeded) {
    return current;
  }

  const recipe = staticData.craftingRecipes[materialKey] ?? staticData.recipes[materialKey];
  const familyEntry = staticData.tieredMaterialIndex[materialKey];
  if (!recipe || recipe.isElementConversion || !familyEntry || familyEntry.tierIndex === 0) {
    return current;
  }

  const input = getStepInput(recipe);
  if (!input) {
    return current;
  }

  const missing = amountNeeded - current;
  const craftsNeeded = Math.ceil(missing / recipe.outputQuantity);
  const lowerNeeded = craftsNeeded * input.quantity;
  const reservedInput = reservedByMaterial[input.materialKey] ?? 0;
  ensureQuantity(input.materialKey, reservedInput + lowerNeeded, usageInventory, reservedByMaterial, staticData, steps);

  const availableLower = usageInventory[input.materialKey] ?? 0;
  const spendableLower = Math.max(availableLower - reservedInput, 0);
  const actualCrafts = Math.min(craftsNeeded, Math.floor(spendableLower / input.quantity));
  if (actualCrafts <= 0) {
    return usageInventory[materialKey] ?? 0;
  }

  usageInventory[input.materialKey] = availableLower - actualCrafts * input.quantity;
  usageInventory[materialKey] = (usageInventory[materialKey] ?? 0) + actualCrafts * recipe.outputQuantity;
  recordStep(steps, recipe, actualCrafts);
  return usageInventory[materialKey] ?? 0;
}

function buildTargetCraftPlan(
  targetMaterialKey: string,
  missingAmount: number,
  usageInventory: InventoryState,
  reservedByMaterial: Record<string, number>,
  staticData: StaticGameData,
): TargetCraftPlan {
  const tierKeys = getTierKeys(targetMaterialKey, staticData);
  const lowerTierAvailable = Object.fromEntries(
    tierKeys
      .filter((key) => key !== targetMaterialKey)
      .map((key) => [key, usageInventory[key] ?? 0]),
  );

  if (!tierKeys.length || missingAmount <= 0) {
    return {
      outputAmount: 0,
      steps: [],
      moraCost: 0,
      leftovers: Object.fromEntries(tierKeys.map((key) => [key, usageInventory[key] ?? 0])),
      remainingMissing: Math.max(missingAmount, 0),
      canSatisfy: missingAmount <= 0,
      lowerTierAvailable,
    };
  }

  const targetOwnedBefore = usageInventory[targetMaterialKey] ?? 0;
  const targetGoal = targetOwnedBefore + missingAmount;
  const steps: CraftingStep[] = [];
  ensureQuantity(targetMaterialKey, targetGoal, usageInventory, reservedByMaterial, staticData, steps);

  const targetOwnedAfter = usageInventory[targetMaterialKey] ?? 0;
  const outputAmount = Math.max(Math.min(targetOwnedAfter, targetGoal) - targetOwnedBefore, 0);
  const remainingMissing = Math.max(missingAmount - outputAmount, 0);
  const leftovers = Object.fromEntries(tierKeys.map((key) => [key, usageInventory[key] ?? 0]));

  return {
    outputAmount,
    steps,
    moraCost: steps.reduce((sum, step) => sum + step.totalMoraCost, 0),
    leftovers,
    remainingMissing,
    canSatisfy: remainingMissing === 0,
    lowerTierAvailable,
  };
}

function applicableOverrideKey(recipe: CraftingRecipe | null): keyof NonNullable<PlannerSettings["craftingPassiveOverrides"]> | null {
  switch (recipe?.category) {
    case "talent_level_up_material":
      return "talentMaterials";
    case "weapon_ascension_material":
      return "weaponAscensionMaterials";
    case "character_weapon_enhancement_material":
      return "characterWeaponEnhancementMaterials";
    case "potion":
      return "potions";
    default:
      return null;
  }
}

function appliesToRecipe(passive: CraftingUtilityPassive, recipe: CraftingRecipe | null): boolean {
  if (!recipe) {
    return false;
  }
  switch (recipe.category) {
    case "talent_level_up_material":
      return passive.appliesTo.includes("character_talent_material");
    case "weapon_ascension_material":
      return passive.appliesTo.includes("weapon_ascension_material");
    case "character_weapon_enhancement_material":
      return passive.appliesTo.includes("character_weapon_enhancement_material");
    case "potion":
      return passive.appliesTo.includes("potion");
    default:
      return false;
  }
}

function buildPassiveRecommendation(
  passive: CraftingUtilityPassive,
  recipe: CraftingRecipe,
  extraOutputUseful: boolean,
): RecommendedCraftingPassive {
  if (passive.effectType === "double_product") {
    const expectedInputPerOutput = 3 / (1 + passive.chance);
    return {
      passiveKey: passive.key,
      characterName: passive.characterName,
      talentName: passive.talentName,
      effectType: passive.effectType,
      expectedInputPerOutput,
      expectedSavingsPercent: 1 - expectedInputPerOutput / 3,
      expectedMoraPerOutput: (recipe.moraCost ?? 0) / (1 + passive.chance),
      warning: extraOutputUseful
        ? "Expected-value gains assume extra output remains useful."
        : "Extra output may overshoot a small exact target, so actual value can be lower.",
      rationale: extraOutputUseful
        ? "This passive has the strongest expected material efficiency when every extra output is still useful."
        : "This passive is efficient on average, but some value can be lost if an extra output is not needed.",
    };
  }

  if (passive.effectType === "refund_one_input") {
    const expectedInputPerOutput = 3 - passive.chance;
    return {
      passiveKey: passive.key,
      characterName: passive.characterName,
      talentName: passive.talentName,
      effectType: passive.effectType,
      expectedInputPerOutput,
      expectedSavingsPercent: 1 - expectedInputPerOutput / 3,
      warning: "Refund effects are probabilistic and preserve inputs on average, not guaranteed per craft.",
      rationale: "This passive is slightly safer for small exact targets because it never depends on extra output being useful.",
    };
  }

  return {
    passiveKey: passive.key,
    characterName: passive.characterName,
    talentName: passive.talentName,
    effectType: passive.effectType,
    expectedInputPerOutput: 3,
    expectedSavingsPercent: 0,
    warning: "This passive grants incidental regional value, not guaranteed same-family output.",
    rationale: "Regional extra books are useful only when you value broader same-rarity regional output.",
  };
}

function chooseRecommendedPassive(input: PassiveSelectionInput): RecommendedCraftingPassive | undefined {
  const { staticData, plannerSettings, ownedCharacterKeys, recipe, requiredAmount, ownedAmount } = input;
  if (!recipe || !plannerSettings?.allowCraftingTalentExpectedValue) {
    return undefined;
  }

  const overrideKey = applicableOverrideKey(recipe);
  const overridePassiveKey = overrideKey ? plannerSettings.craftingPassiveOverrides?.[overrideKey] : null;
  const extraOutputUseful = requiredAmount - ownedAmount > 1;

  if (overridePassiveKey) {
    const passive = staticData.craftingUtilityPassives[overridePassiveKey];
    if (passive && ownedCharacterKeys.includes(overridePassiveKey) && appliesToRecipe(passive, recipe)) {
      return buildPassiveRecommendation(passive, recipe, extraOutputUseful);
    }
  }

  const candidates = Object.values(staticData.craftingUtilityPassives)
    .filter((passive) => ownedCharacterKeys.includes(passive.key))
    .filter((passive) => appliesToRecipe(passive, recipe))
    .filter((passive) => passive.effectType !== "regional_extra_same_rarity_talent_material");

  if (!candidates.length) {
    return undefined;
  }

  const preferred = [...candidates]
    .map((passive) => buildPassiveRecommendation(passive, recipe, extraOutputUseful))
    .sort((left, right) => {
      const leftScore = extraOutputUseful
        ? left.expectedInputPerOutput
        : left.effectType === "refund_one_input"
          ? left.expectedInputPerOutput - 0.01
          : left.expectedInputPerOutput;
      const rightScore = extraOutputUseful
        ? right.expectedInputPerOutput
        : right.effectType === "refund_one_input"
          ? right.expectedInputPerOutput - 0.01
          : right.expectedInputPerOutput;
      return leftScore - rightScore || right.expectedSavingsPercent - left.expectedSavingsPercent;
    })[0];

  return preferred;
}

function calculateExpectedCoverage(
  targetMaterialKey: string,
  missingAmount: number,
  usageInventorySnapshot: InventoryState,
  staticData: StaticGameData,
  passive: RecommendedCraftingPassive | undefined,
): number {
  const familyEntry = staticData.tieredMaterialIndex[targetMaterialKey];
  if (!familyEntry || missingAmount <= 0) {
    return 0;
  }

  if (!passive || passive.effectType === "regional_extra_same_rarity_talent_material") {
    return 0;
  }

  const rate = passive.expectedInputPerOutput;
  let equivalent = usageInventorySnapshot[targetMaterialKey] ?? 0;
  for (let index = 0; index < familyEntry.tierIndex; index += 1) {
    const lowerKey = familyEntry.tierKeys[index];
    const distance = familyEntry.tierIndex - index;
    equivalent += (usageInventorySnapshot[lowerKey] ?? 0) / rate ** distance;
  }

  const directOwned = usageInventorySnapshot[targetMaterialKey] ?? 0;
  return Math.max(0, Math.min(missingAmount, equivalent - directOwned));
}

function buildDustOfAzothOption(
  targetMaterialKey: string,
  targetMaterialName: string,
  remainingMissing: number,
  inventory: InventoryState,
  staticData: StaticGameData,
  plannerSettings: PlannerSettings | undefined,
): CraftingPlanReport["dustOfAzothOption"] | undefined {
  if (!plannerSettings?.showDustOfAzothOption || remainingMissing <= 0) {
    return undefined;
  }

  const familyEntry = staticData.tieredMaterialIndex[targetMaterialKey];
  if (!familyEntry || familyEntry.familyType !== "element_gem_family" || familyEntry.tierIndex === 0) {
    return undefined;
  }

  const dustCostByTier = familyEntry.tierIndex === 1 ? 3 : familyEntry.tierIndex === 2 ? 9 : familyEntry.tierIndex === 3 ? 27 : null;
  if (!dustCostByTier) {
    return undefined;
  }

  const dustOwned = inventory.DustOfAzoth ?? 0;
  if (dustOwned < dustCostByTier) {
    return undefined;
  }

  const conversions: CraftingStep[] = [];
  let dustRemaining = dustOwned;
  let conversionsMade = 0;
  const sameTierOffElementKeys = Object.values(staticData.tieredMaterialIndex)
    .filter((entry) => entry.familyType === "element_gem_family")
    .filter((entry) => entry.tierIndex === familyEntry.tierIndex)
    .filter((entry) => entry.materialKey !== targetMaterialKey)
    .map((entry) => entry.materialKey);

  for (const sourceKey of sameTierOffElementKeys) {
    const owned = inventory[sourceKey] ?? 0;
    if (owned <= 0) {
      continue;
    }
    const allowedByDust = Math.floor(dustRemaining / dustCostByTier);
    const toConvert = Math.min(remainingMissing - conversionsMade, owned, allowedByDust);
    if (toConvert <= 0) {
      continue;
    }
    dustRemaining -= toConvert * dustCostByTier;
    conversionsMade += toConvert;
    conversions.push({
      outputKey: targetMaterialKey,
      outputMaterialKey: targetMaterialKey,
      outputName: targetMaterialName,
      outputQuantity: 1,
      inputKey: sourceKey,
      inputName: staticData.materials[sourceKey]?.displayName ?? sourceKey,
      inputQuantity: 1,
      crafts: toConvert,
      moraCostPerCraft: 0,
      totalMoraCost: 0,
      passiveUsed: null,
      isElementConversion: true,
    });
    if (conversionsMade >= remainingMissing) {
      break;
    }
  }

  if (conversionsMade <= 0) {
    return undefined;
  }

  return {
    outputAmount: conversionsMade,
    dustRequired: conversionsMade * dustCostByTier,
    conversions,
    remainingMissing: Math.max(remainingMissing - conversionsMade, 0),
  };
}

function buildSuggestionReason(report: CraftingPlanReport): string {
  const crafted = Math.max(Math.min(report.guaranteedCrafting.outputAmount, Math.max(report.requiredAmount - report.ownedAmount, 0)), 0);
  const mora = report.guaranteedCrafting.moraCost;
  if (crafted <= 0) {
    return `No guaranteed crafting path currently reduces ${report.targetMaterialName} shortages.`;
  }

  return `Craft ${crafted} ${report.targetMaterialName} to cover ${crafted} missing units${mora > 0 ? `, costing ${mora} Mora` : ""}.`;
}

export function resolveCraftingPlan(
  inventory: InventoryState,
  materialRows: MaterialNeedRow[],
  staticData: StaticGameData,
  modeOrOptions: CraftingMode | ResolveCraftingPlanOptions = "conservative",
): CraftingPlan {
  const options = normalizeOptions(modeOrOptions);
  const usageInventory: InventoryState = { ...inventory };
  const ownedCharacterKeys = options.ownedCharacterKeys ?? [];
  const reports: CraftingPlanReport[] = [];
  const guaranteedCoverageByMaterial: Record<string, number> = {};
  const guaranteedRemainingByMaterial: Record<string, number> = {};
  const expectedCoverageByMaterial: Record<string, number> = {};
  const craftingMoraByMaterial: Record<string, number> = {};
  const warnings: string[] = [];
  const reservedByMaterial = materialRows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.materialKey] = Math.max(accumulator[row.materialKey] ?? 0, row.needed);
    return accumulator;
  }, {});

  for (const row of toSortedRows(materialRows, staticData)) {
    const directMissing = Math.max(row.rawMissing, 0);
    const directOwned = usageInventory[row.materialKey] ?? 0;
    const usageInventorySnapshot = { ...usageInventory };
    const recipe = staticData.craftingRecipes[row.materialKey] ?? staticData.recipes[row.materialKey] ?? null;
    const guaranteedPlan = buildTargetCraftPlan(row.materialKey, directMissing, usageInventory, reservedByMaterial, staticData);
    const recommendedPassive = chooseRecommendedPassive({
      staticData,
      plannerSettings: options.plannerSettings,
      ownedCharacterKeys,
      recipe,
      requiredAmount: row.needed,
      ownedAmount: row.owned,
    });
    const expectedCoverage = guaranteedPlan.outputAmount + calculateExpectedCoverage(
      row.materialKey,
      guaranteedPlan.remainingMissing,
      usageInventorySnapshot,
      staticData,
      recommendedPassive,
    );
    const dustOfAzothOption = buildDustOfAzothOption(
      row.materialKey,
      row.displayName,
      guaranteedPlan.remainingMissing,
      usageInventorySnapshot,
      staticData,
      options.plannerSettings,
    );

    guaranteedCoverageByMaterial[row.materialKey] = guaranteedPlan.outputAmount;
    guaranteedRemainingByMaterial[row.materialKey] = guaranteedPlan.remainingMissing;
    expectedCoverageByMaterial[row.materialKey] = Math.min(directMissing, expectedCoverage);
    if (guaranteedPlan.moraCost > 0) {
      craftingMoraByMaterial[row.materialKey] = guaranteedPlan.moraCost;
    }

    const reportWarnings: string[] = [];
    if (options.plannerSettings?.showCraftingVarianceWarning && recommendedPassive) {
      reportWarnings.push("Crafting talent bonuses are probabilistic and not guaranteed.");
      if (recommendedPassive.effectType === "double_product") {
        reportWarnings.push("Double-product bonuses are only fully valuable if the extra output is useful.");
      }
      if (recommendedPassive.effectType === "regional_extra_same_rarity_talent_material") {
        reportWarnings.push("Yae Miko's bonus is regional and same-rarity, but not guaranteed to be the exact target family.");
      }
    }

    reports.push({
      targetMaterialKey: row.materialKey,
      targetMaterialName: row.displayName,
      requiredAmount: row.needed,
      ownedAmount: directOwned,
      lowerTierAvailable: guaranteedPlan.lowerTierAvailable,
      guaranteedCrafting: {
        canSatisfy: guaranteedPlan.canSatisfy,
        outputAmount: guaranteedPlan.outputAmount,
        steps: guaranteedPlan.steps,
        moraCost: guaranteedPlan.moraCost,
        leftovers: guaranteedPlan.leftovers,
        remainingMissing: guaranteedPlan.remainingMissing,
      },
      recommendedPassive,
      expectedValue: recommendedPassive
        ? {
            passiveKey: recommendedPassive.passiveKey,
            outputEquivalent: Math.min(directMissing, expectedCoverage),
            expectedInputPerOutput: recommendedPassive.expectedInputPerOutput,
            expectedSavingsPercent: recommendedPassive.expectedSavingsPercent,
            expectedAdditionalCoverage: Math.max(0, Math.min(directMissing, expectedCoverage) - guaranteedPlan.outputAmount),
          }
        : undefined,
      dustOfAzothOption,
      resinImpact: {
        resinBeforeCrafting: null,
        resinAfterGuaranteedCrafting: null,
        resinAfterExpectedPassive: null,
        resinSavedGuaranteed: null,
        resinSavedExpected: null,
      },
      warnings: reportWarnings,
    });
  }

  const suggestions: CraftingSuggestion[] = reports
    .map((report) => {
      const usefulCraftQuantity = Math.max(
        Math.min(report.guaranteedCrafting.outputAmount, Math.max(report.requiredAmount - report.ownedAmount, 0)),
        0,
      );
      return {
        report,
        usefulCraftQuantity,
      };
    })
    .filter(({ usefulCraftQuantity }) => usefulCraftQuantity > 0)
    .map(({ report, usefulCraftQuantity }) => ({
      outputMaterialKey: report.targetMaterialKey,
      outputDisplayName: report.targetMaterialName,
      craftableQuantity: usefulCraftQuantity,
      missingQuantityCovered: usefulCraftQuantity,
      ingredientsConsumed: report.guaranteedCrafting.steps.reduce<Record<string, number>>((accumulator, step) => {
        accumulator[step.inputKey] = (accumulator[step.inputKey] ?? 0) + step.inputQuantity * step.crafts;
        return accumulator;
      }, {}),
      reason: buildSuggestionReason(report),
      moraCost: report.guaranteedCrafting.moraCost,
      steps: report.guaranteedCrafting.steps,
      recommendedPassive: report.recommendedPassive,
    }));

  const totalCraftingMora = sumTotals(craftingMoraByMaterial);

  if (options.plannerSettings?.craftingModeForResinEstimate === "expected_value" && ownedCharacterKeys.length > 0) {
    warnings.push("Expected-value crafting estimates may reduce estimated Resin, but actual results may vary.");
  }

  return {
    reports,
    suggestions,
    warnings,
    guaranteedCoverageByMaterial,
    guaranteedRemainingByMaterial,
    expectedCoverageByMaterial,
    craftingMoraByMaterial,
    totalCraftingMora,
    progressionMora: options.progressionMora ?? 0,
    totalMora: (options.progressionMora ?? 0) + totalCraftingMora,
  };
}
