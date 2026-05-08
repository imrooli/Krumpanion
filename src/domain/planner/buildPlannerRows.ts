import type { PlannerInput } from "./types";
import type { CraftingPlan } from "../crafting/types";
import { resolveCraftingPlan } from "../crafting/resolveCraftingPlan";
import { validateGoalStateAgainstStaticData } from "../goals/goalState";
import { getWeaponGoalId, resolveWeaponGoalCurrentState } from "../goals/goalState";
import { buildFarmingEstimates, normalizePlannerEstimationSettings } from "./buildFarmingEstimates";
import { buildMaterialRows } from "./compareInventory";
import { expandGoals } from "./expandGoals";
import { buildSourceAssignments } from "./classifySources";
import {
  buildArtifactPlans,
  buildArtifactRecommendations,
  buildCraftingPlannerRecommendations,
  buildMaterialRecommendations,
  buildPlannerGoals,
  buildPlannerWarnings,
  buildReportSections,
  buildResinSummary,
  buildWeaponExpRecommendation,
  enrichGoalResolutions,
  sortRecommendations,
} from "./buildPlannerReport";
import { resolveGoalTrackableWeaponRarityLabel, WEAPON_EXP_ITEM_VALUES, WEAPON_LEVEL_BOUNDARIES } from "../staticData/weaponProgressionRegistry";

function buildCraftingPlan(input: PlannerInput, exactMaterialRows: ReturnType<typeof buildMaterialRows>["rows"]): CraftingPlan {
  const inventory = input.inventory ?? {};
  const ownedCharacterKeys = (input.ownership.characters ?? []).map((character) => character.characterId);
  const progressionMora = exactMaterialRows.find((row) => row.materialKey === "Mora")?.progressionNeeded ?? 0;
  return resolveCraftingPlan(inventory, exactMaterialRows, input.staticData, {
    mode: "conservative",
    ownedCharacterKeys,
    plannerSettings: input.resinSettings,
    progressionMora,
  });
}

function sumResinByMaterial(
  estimates: Array<{ materialKey: string; relatedMaterialKeys?: string[]; estimatedResin: number | null }>,
): Map<string, number | null> {
  const totals = new Map<string, number | null>();
  for (const estimate of estimates) {
    const keys = estimate.relatedMaterialKeys?.length ? estimate.relatedMaterialKeys : [estimate.materialKey];
    for (const key of keys) {
      const current = totals.get(key);
      if (estimate.estimatedResin === null) {
        totals.set(key, current ?? null);
        continue;
      }
      totals.set(key, (current ?? 0) + estimate.estimatedResin);
    }
  }
  return totals;
}

function withCraftingResinImpact(
  craftingPlan: CraftingPlan,
  baselineEstimates: Array<{ materialKey: string; estimatedResin: number | null }>,
  guaranteedEstimates: Array<{ materialKey: string; estimatedResin: number | null }>,
  finalEstimates: Array<{ materialKey: string; estimatedResin: number | null }>,
): CraftingPlan {
  const baselineByMaterial = sumResinByMaterial(baselineEstimates);
  const guaranteedByMaterial = sumResinByMaterial(guaranteedEstimates);
  const finalByMaterial = sumResinByMaterial(finalEstimates);

  return {
    ...craftingPlan,
    reports: craftingPlan.reports.map((report) => {
      const resinBeforeCrafting = baselineByMaterial.get(report.targetMaterialKey) ?? null;
      const resinAfterGuaranteedCrafting = guaranteedByMaterial.get(report.targetMaterialKey) ?? null;
      const resinAfterExpectedPassive = finalByMaterial.get(report.targetMaterialKey) ?? resinAfterGuaranteedCrafting;
      return {
        ...report,
        resinImpact: {
          resinBeforeCrafting,
          resinAfterGuaranteedCrafting,
          resinAfterExpectedPassive,
          resinSavedGuaranteed:
            resinBeforeCrafting !== null && resinAfterGuaranteedCrafting !== null
              ? Math.max(resinBeforeCrafting - resinAfterGuaranteedCrafting, 0)
              : null,
          resinSavedExpected:
            resinBeforeCrafting !== null && resinAfterExpectedPassive !== null
              ? Math.max(resinBeforeCrafting - resinAfterExpectedPassive, 0)
              : null,
        },
      };
    }),
  };
}

function buildWeaponExpSummary(input: PlannerInput) {
  let totalWeaponExpNeeded = 0;
  let totalWeaponLevelingMoraNeeded = 0;
  const exactBoundaries = new Set<number>(WEAPON_LEVEL_BOUNDARIES);

  for (const goal of Object.values(input.goals.weaponGoals).filter((entry) => entry.enabled)) {
    const current = resolveWeaponGoalCurrentState(goal, input.ownership).state;
    const rarity = input.staticData.weaponMaterialProfiles[goal.weaponKey]?.rarity ?? input.staticData.weapons[goal.weaponKey]?.rarity;
    const rarityLabel = resolveGoalTrackableWeaponRarityLabel(rarity);
    if (!rarityLabel) {
      continue;
    }

    const currentLevel = Math.max(1, Math.min(current.currentLevel, 90));
    const targetLevel = Math.max(1, Math.min(goal.targetLevel ?? current.currentLevel, 90));
    if (targetLevel <= currentLevel || !exactBoundaries.has(currentLevel) || !exactBoundaries.has(targetLevel)) {
      continue;
    }

    for (const row of input.staticData.weaponExpRequirements[rarityLabel]) {
      if (row.startLevel < currentLevel || row.endLevel > targetLevel) {
        continue;
      }
      totalWeaponExpNeeded += row.expNeeded;
      totalWeaponLevelingMoraNeeded += row.mora;
    }
  }

  const enhancementOreOwned = input.inventory.EnhancementOre ?? 0;
  const fineEnhancementOreOwned = input.inventory.FineEnhancementOre ?? 0;
  const mysticEnhancementOreOwned = input.inventory.MysticEnhancementOre ?? 0;
  const crystalChunkOwned = input.inventory.CrystalChunk ?? 0;
  const rainbowdropCrystalOwned = input.inventory.RainbowdropCrystal ?? 0;
  const condessenceCrystalOwned = input.inventory.CondessenceCrystal ?? 0;
  const ownedWeaponExpValue =
    enhancementOreOwned * WEAPON_EXP_ITEM_VALUES.EnhancementOre +
    fineEnhancementOreOwned * WEAPON_EXP_ITEM_VALUES.FineEnhancementOre +
    mysticEnhancementOreOwned * WEAPON_EXP_ITEM_VALUES.MysticEnhancementOre;
  const remainingWeaponExpAfterOwnedOre = Math.max(totalWeaponExpNeeded - ownedWeaponExpValue, 0);
  const mysticEquivalentNeeded = Math.ceil(remainingWeaponExpAfterOwnedOre / WEAPON_EXP_ITEM_VALUES.MysticEnhancementOre);
  const mysticForgeableFromCrystals =
    Math.floor(crystalChunkOwned / 40) * 10 +
    Math.floor(rainbowdropCrystalOwned / 40) * 10 +
    Math.floor(condessenceCrystalOwned / 40) * 10;
  const dailyMysticForgeCap = 40;
  const remainingMysticEquivalentUnforgeable = Math.max(mysticEquivalentNeeded - mysticForgeableFromCrystals, 0);
  const minimumDailyResetsRequired =
    mysticEquivalentNeeded > 0
      ? Math.ceil(Math.min(mysticEquivalentNeeded, mysticForgeableFromCrystals) / dailyMysticForgeCap)
      : 0;

  return {
    totalWeaponExpNeeded,
    totalWeaponLevelingMoraNeeded,
    enhancementOreOwned,
    fineEnhancementOreOwned,
    mysticEnhancementOreOwned,
    crystalChunkOwned,
    rainbowdropCrystalOwned,
    condessenceCrystalOwned,
    ownedWeaponExpValue,
    remainingWeaponExpAfterOwnedOre,
    mysticEquivalentNeeded,
    mysticForgeableFromCrystals,
    remainingMysticEquivalentUnforgeable,
    dailyMysticForgeCap,
    minimumDailyResetsRequired,
    oreRespawnDays: 3,
    notes: [
      "Forge supported crystals into Mystic Enhancement Ore with a 40 Mystic daily cap.",
      "Low-rarity weapon fodder is not included in the default Weapon EXP farming plan.",
    ],
  };
}

export function buildPlannerOutput(input: PlannerInput) {
  const goalValidation = validateGoalStateAgainstStaticData(input.goals, input.staticData);
  const normalizedInput: PlannerInput = {
    ...input,
    goals: {
      ...goalValidation.goals,
      plannerSettings: input.goals.plannerSettings,
    },
  };

  const goalExpansion = expandGoals(normalizedInput);
  const exactInventoryComparison = buildMaterialRows(normalizedInput, goalExpansion.goalResolutions);
  const artifactFarmGoals = normalizedInput.goals.plannerSettings.includeArtifactGoals
    ? buildArtifactPlans(normalizedInput.goals.artifactGoals, normalizedInput.staticData)
    : [];

  const baseCraftingPlan = buildCraftingPlan(normalizedInput, exactInventoryComparison.rows);
  const normalizedSettings = normalizePlannerEstimationSettings(normalizedInput.resinSettings, normalizedInput.staticData);
  const baselineAssignments = buildSourceAssignments({
    goalResolutions: goalExpansion.goalResolutions,
    exactMaterialRows: exactInventoryComparison.rows,
    staticData: normalizedInput.staticData,
    resinSettings: normalizedInput.resinSettings,
    coverageMode: "none",
  });
  const guaranteedAssignments = buildSourceAssignments({
    goalResolutions: goalExpansion.goalResolutions,
    exactMaterialRows: exactInventoryComparison.rows,
    craftingPlan: baseCraftingPlan,
    staticData: normalizedInput.staticData,
    resinSettings: normalizedInput.resinSettings,
    coverageMode: "guaranteed",
  });
  const finalCoverageMode = normalizedSettings.craftingModeForResinEstimate === "expected_value" ? "expected" : "guaranteed";
  const finalAssignments = buildSourceAssignments({
    goalResolutions: goalExpansion.goalResolutions,
    exactMaterialRows: exactInventoryComparison.rows,
    craftingPlan: baseCraftingPlan,
    staticData: normalizedInput.staticData,
    resinSettings: normalizedInput.resinSettings,
    coverageMode: finalCoverageMode,
  });

  const { farmingEstimates: baselineFarmingEstimates } = buildFarmingEstimates({
    sourceAssignments: baselineAssignments.sourceAssignments,
    staticData: normalizedInput.staticData,
    resinSettings: normalizedInput.resinSettings,
    today: normalizedInput.today,
  });
  const { farmingEstimates: guaranteedFarmingEstimates } = buildFarmingEstimates({
    sourceAssignments: guaranteedAssignments.sourceAssignments,
    staticData: normalizedInput.staticData,
    resinSettings: normalizedInput.resinSettings,
    today: normalizedInput.today,
  });
  const { farmingEstimates, warnings: estimateWarnings } = buildFarmingEstimates({
    sourceAssignments: finalAssignments.sourceAssignments,
    staticData: normalizedInput.staticData,
    resinSettings: normalizedInput.resinSettings,
    today: normalizedInput.today,
  });

  const craftingPlan = withCraftingResinImpact(
    baseCraftingPlan,
    baselineFarmingEstimates,
    guaranteedFarmingEstimates,
    farmingEstimates,
  );

  const calculatorInventoryComparison = buildMaterialRows(normalizedInput, goalExpansion.goalResolutions, {
    craftingPlan,
    extraNeededByMaterial: craftingPlan.totalCraftingMora > 0 ? { Mora: craftingPlan.totalCraftingMora } : undefined,
  });

  const weaponExpSummary = buildWeaponExpSummary(normalizedInput);
  const materialRecommendations = buildMaterialRecommendations(normalizedInput, farmingEstimates);
  const artifactRecommendations = buildArtifactRecommendations(normalizedInput, artifactFarmGoals);
  const craftingRecommendations = buildCraftingPlannerRecommendations(craftingPlan);
  const weaponExpRecommendations = buildWeaponExpRecommendation(
    weaponExpSummary,
    Object.values(normalizedInput.goals.weaponGoals)
      .filter((goal) => goal.enabled)
      .map((goal) => getWeaponGoalId(goal, goal.weaponKey)),
  );
  const recommendations = sortRecommendations([
    ...materialRecommendations,
    ...weaponExpRecommendations,
    ...craftingRecommendations,
    ...artifactRecommendations,
  ]);
  const reportSections = buildReportSections(recommendations);
  const enrichedGoals = enrichGoalResolutions({
    goalResolutions: goalExpansion.goalResolutions,
    materialRows: calculatorInventoryComparison.rows,
    farmingEstimates,
  });
  const goalCatalog = buildPlannerGoals({
    ownership: normalizedInput.ownership,
    goals: normalizedInput.goals,
    staticData: normalizedInput.staticData,
    byCharacter: enrichedGoals.byCharacter,
    byWeapon: enrichedGoals.byWeapon,
    artifactFarmGoals,
  });
  const resinSummary = buildResinSummary({
    farmingEstimates,
    dailyResinBudget: normalizedSettings.dailyResinBudget,
    naturalResinPerWeek: normalizedSettings.naturalResinPerWeek,
    weeklyResinBudget: normalizedInput.staticData.resinRules.naturalResinPerWeek,
    artifactBudget: artifactFarmGoals.reduce((sum, goal) => sum + (goal.weeklyResinBudget ?? 0), 0),
    progressionMora: baseCraftingPlan.progressionMora,
    craftingMora: baseCraftingPlan.totalCraftingMora,
  });

  const warnings = buildPlannerWarnings(
    [...goalValidation.warnings, ...goalExpansion.warnings],
    [...exactInventoryComparison.warnings, ...calculatorInventoryComparison.warnings],
    estimateWarnings,
    craftingPlan.warnings,
  );
  return {
    plannerGoals: goalCatalog.plannerGoals,
    plannerGoalGroups: goalCatalog.plannerGoalGroups,
    goalResolutions: [...enrichedGoals.byCharacter, ...enrichedGoals.byWeapon],
    exactRequirementsByMaterial: exactInventoryComparison.rows,
    totalMissingByMaterial: calculatorInventoryComparison.rows,
    farmingEstimates,
    byCharacter: enrichedGoals.byCharacter,
    byWeapon: enrichedGoals.byWeapon,
    artifactFarmGoals,
    craftingPlan,
    recommendations,
    recommendationSections: reportSections.recommendationSections,
    byAvailability: reportSections.byAvailability,
    today: reportSections.today,
    bySource: reportSections.bySource,
    resinSummary,
    summary: resinSummary,
    weaponExpSummary,
    warnings,
  };
}
