import type { PlannerInput, PlannerRecommendation } from "./types";
import type { CraftingPlan } from "../crafting/types";
import { resolveCraftingPlan } from "../crafting/resolveCraftingPlan";
import {
  getWeaponGoalId,
  isWeaponGoalPlannerActive,
  normalizeCharacterGoalRecord,
  normalizeWeaponGoalRecord,
  resolveWeaponGoalCurrentState,
  validateGoalStateAgainstStaticData,
} from "../goals/goalState";
import { buildFarmingEstimates, normalizePlannerEstimationSettings } from "./buildFarmingEstimates";
import {
  buildDeterministicRequirements,
  buildInventoryCoverage,
  buildMaterialDeficits,
  buildMaterialRows,
} from "./compareInventory";
import { expandGoals } from "./expandGoals";
import { buildSourceAssignments } from "./classifySources";
import { buildLeyLineEnemyDropRecommendations } from "./buildLeyLineEnemyDropRecommendations";
import {
  buildArtifactPlans,
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

function mergeExpectedEstimateLayers(
  guaranteedEstimates: ReturnType<typeof buildFarmingEstimates>["farmingEstimates"],
  expectedEstimates: ReturnType<typeof buildFarmingEstimates>["farmingEstimates"],
) {
  const expectedByKey = new Map(expectedEstimates.map((estimate) => [estimate.estimateKey, estimate.expectedEstimate]));
  return guaranteedEstimates.map((estimate) => ({
    ...estimate,
    expectedEstimate: expectedByKey.get(estimate.estimateKey) ?? estimate.expectedEstimate,
  }));
}

function buildPlannerTrace(
  farmingEstimates: ReturnType<typeof buildFarmingEstimates>["farmingEstimates"],
  inventory: PlannerInput["inventory"],
  craftingPlan: CraftingPlan,
) {
  const reportsByMaterial = new Map(craftingPlan.reports.map((report) => [report.targetMaterialKey, report]));
  const rows = farmingEstimates.map((estimate) => {
    const report = reportsByMaterial.get(estimate.materialKey);
    const dustCoverage = report?.dustOfAzothOption
      ? Math.max(
          0,
          report.guaranteedCrafting.remainingMissing - report.dustOfAzothOption.remainingMissing,
        )
      : 0;
    return {
      estimateKey: estimate.estimateKey,
      sourceGoalKeys: estimate.relatedGoalKeys,
      materialKey: estimate.materialKey,
      materialName: estimate.materialName,
      deterministicRequiredAmount: estimate.deterministicRequirement,
      ownedAmount: inventory[estimate.materialKey] ?? 0,
      guaranteedCraftingCoverage: craftingPlan.guaranteedCoverageByMaterial[estimate.materialKey] ?? 0,
      deterministicConversionCoverage: dustCoverage + estimate.deterministicConversionCoverage,
      remainingDeficit: estimate.missingAmount,
      sourceType: estimate.sourceType,
      sourceName: estimate.sourceName,
      guaranteedEstimate: estimate.guaranteedEstimate,
      expectedEstimate: estimate.expectedEstimate,
      contributesToGuaranteedTotal: estimate.contributesToGuaranteedTotal,
      warnings: estimate.warnings,
    };
  });
  return {
    rows,
    guaranteedContributionKeys: rows
      .filter((row) => row.contributesToGuaranteedTotal)
      .map((row) => row.estimateKey),
    guaranteedTotalResin: rows.reduce(
      (sum, row) => sum + (row.contributesToGuaranteedTotal ? row.guaranteedEstimate.resin ?? 0 : 0),
      0,
    ),
  };
}

function buildWeaponExpSummary(input: PlannerInput) {
  let totalWeaponExpNeeded = 0;
  let totalWeaponLevelingMoraNeeded = 0;
  const exactBoundaries = new Set<number>(WEAPON_LEVEL_BOUNDARIES);

  for (const goal of Object.values(input.goals.weaponGoals).filter((entry) => isWeaponGoalPlannerActive(entry))) {
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

function isNoResinRecommendation(recommendation: PlannerRecommendation): boolean {
  return (
    recommendation.actionGroup === "crafting" ||
    recommendation.actionGroup === "open_world" ||
    recommendation.actionGroup === "time_gated_non_resin" ||
    recommendation.actionSubgroup === "ley_line_enemy_drops" ||
    recommendation.actionSubgroup === "local_specialty" ||
    recommendation.actionSubgroup === "forging"
  );
}

function buildPausedOnlyPlannerInput(input: PlannerInput): PlannerInput | null {
  const pausedCharacterGoals = Object.fromEntries(
    Object.values(input.goals.characterGoals)
      .filter((goal) => Boolean(goal.enabled) && Boolean(goal.paused))
      .map((goal) => [
        goal.characterKey,
        normalizeCharacterGoalRecord(
          goal.characterKey,
          {
            ...goal,
            paused: false,
          },
          goal.planningMode !== "prefarm",
          input.staticData,
        ),
      ]),
  );

  const pausedWeaponGoals = Object.fromEntries(
    Object.entries(input.goals.weaponGoals)
      .filter(([, goal]) => Boolean(goal.enabled) && Boolean(goal.paused))
      .map(([goalId, goal]) => [
        goalId,
        normalizeWeaponGoalRecord(goalId, {
          ...goal,
          paused: false,
        }),
      ]),
  );

  if (Object.keys(pausedCharacterGoals).length === 0 && Object.keys(pausedWeaponGoals).length === 0) {
    return null;
  }

  return {
    ...input,
    goals: {
      ...input.goals,
      characterGoals: pausedCharacterGoals,
      weaponGoals: pausedWeaponGoals,
      artifactGoals: [],
    },
  };
}

function buildPausedNoResinRecommendations(input: PlannerInput): PlannerRecommendation[] {
  const pausedInput = buildPausedOnlyPlannerInput(input);
  if (!pausedInput) {
    return [];
  }

  const goalExpansion = expandGoals(pausedInput);
  const exactInventoryComparison = buildMaterialRows(pausedInput, goalExpansion.goalResolutions);
  const baseCraftingPlan = buildCraftingPlan(pausedInput, exactInventoryComparison.rows);
  const finalAssignments = buildSourceAssignments({
    today: pausedInput.today,
    goalResolutions: goalExpansion.goalResolutions,
    exactMaterialRows: exactInventoryComparison.rows,
    craftingPlan: baseCraftingPlan,
    inventory: pausedInput.inventory,
    staticData: pausedInput.staticData,
    resinSettings: pausedInput.resinSettings,
    coverageMode: "guaranteed",
  });
  const { farmingEstimates } = buildFarmingEstimates({
    sourceAssignments: finalAssignments.sourceAssignments,
    staticData: pausedInput.staticData,
    resinSettings: pausedInput.resinSettings,
    today: pausedInput.today,
  });
  const craftingPlan = withCraftingResinImpact(baseCraftingPlan, [], [], farmingEstimates);
  const calculatorInventoryComparison = buildMaterialRows(pausedInput, goalExpansion.goalResolutions, {
    craftingPlan,
    extraNeededByMaterial: craftingPlan.totalCraftingMora > 0 ? { Mora: craftingPlan.totalCraftingMora } : undefined,
  });
  const materialRecommendations = buildMaterialRecommendations(pausedInput, farmingEstimates);
  const leyLineEnemyDropRecommendations = buildLeyLineEnemyDropRecommendations({
    materialRows: calculatorInventoryComparison.rows,
    staticData: pausedInput.staticData,
    goals: pausedInput.goals,
    inventory: pausedInput.inventory,
    allowStockpileMode: false,
  });
  const weaponExpSummary = buildWeaponExpSummary(pausedInput);
  const weaponExpRecommendations = buildWeaponExpRecommendation(
    weaponExpSummary,
    Object.values(pausedInput.goals.weaponGoals)
      .filter((goal) => isWeaponGoalPlannerActive(goal))
      .map((goal) => ({
        key: getWeaponGoalId(goal, goal.weaponKey),
        label: pausedInput.staticData.weapons[goal.weaponKey]?.displayName
          ? `${pausedInput.staticData.weapons[goal.weaponKey]?.displayName} weapon goal`
          : goal.weaponKey,
      })),
  );

  return sortRecommendations(
    [...materialRecommendations, ...leyLineEnemyDropRecommendations, ...weaponExpRecommendations]
      .filter((recommendation) => isNoResinRecommendation(recommendation))
      // Paused plans are independent previews and cannot reserve the active pool.
      .map((recommendation) => ({
        ...recommendation,
        id: `paused-${recommendation.id}`,
        relatedGoalLabels: recommendation.relatedGoalLabels?.map((label) => `${label} (paused)`),
        reason: `${recommendation.reason} Independent preview for a paused goal; inventory is shared with active goals. Resume the goal to include it in account resource allocation.`,
      })),
  );
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
  const deterministicRequirementsStage = buildDeterministicRequirements(
    goalExpansion.goalResolutions,
    normalizedInput.staticData,
  );
  const exactInventoryCoverage = buildInventoryCoverage(normalizedInput, deterministicRequirementsStage.requirements);
  const exactInventoryComparison = buildMaterialRows(normalizedInput, goalExpansion.goalResolutions);
  const artifactFarmGoals = buildArtifactPlans(normalizedInput.goals.artifactGoals, normalizedInput.staticData);

  const baseCraftingPlan = buildCraftingPlan(normalizedInput, exactInventoryComparison.rows);
  const normalizedSettings = normalizePlannerEstimationSettings(normalizedInput.resinSettings, normalizedInput.staticData);
  const baselineAssignments = buildSourceAssignments({
    today: normalizedInput.today,
    goalResolutions: goalExpansion.goalResolutions,
    exactMaterialRows: exactInventoryComparison.rows,
    inventory: normalizedInput.inventory,
    staticData: normalizedInput.staticData,
    resinSettings: normalizedInput.resinSettings,
    coverageMode: "none",
  });
  const guaranteedAssignments = buildSourceAssignments({
    today: normalizedInput.today,
    goalResolutions: goalExpansion.goalResolutions,
    exactMaterialRows: exactInventoryComparison.rows,
    craftingPlan: baseCraftingPlan,
    inventory: normalizedInput.inventory,
    staticData: normalizedInput.staticData,
    resinSettings: normalizedInput.resinSettings,
    coverageMode: "guaranteed",
  });
  const expectedAssignments = buildSourceAssignments({
    today: normalizedInput.today,
    goalResolutions: goalExpansion.goalResolutions,
    exactMaterialRows: exactInventoryComparison.rows,
    craftingPlan: baseCraftingPlan,
    inventory: normalizedInput.inventory,
    staticData: normalizedInput.staticData,
    resinSettings: normalizedInput.resinSettings,
    coverageMode: "expected",
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
  const { farmingEstimates: expectedFarmingEstimates } = buildFarmingEstimates({
    sourceAssignments: expectedAssignments.sourceAssignments,
    staticData: normalizedInput.staticData,
    resinSettings: normalizedInput.resinSettings,
    today: normalizedInput.today,
  });
  const farmingEstimates = mergeExpectedEstimateLayers(guaranteedFarmingEstimates, expectedFarmingEstimates);
  const estimateWarnings = [
    ...guaranteedFarmingEstimates.flatMap((estimate) =>
      estimate.sourceType === "unknown"
        ? [{ type: "estimate_source_unresolved" as const, key: estimate.materialKey, message: `No resin estimator is configured for ${estimate.materialName}.` }]
        : [],
    ),
  ];

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
  const effectiveInventoryCoverage = buildInventoryCoverage(
    normalizedInput,
    deterministicRequirementsStage.requirements,
    craftingPlan.totalCraftingMora > 0 ? { Mora: craftingPlan.totalCraftingMora } : undefined,
  );
  const materialDeficitStage = buildMaterialDeficits({
    input: normalizedInput,
    requirements: deterministicRequirementsStage.requirements,
    inventoryCoverage: effectiveInventoryCoverage,
    craftingPlan,
  });

  const weaponExpSummary = buildWeaponExpSummary(normalizedInput);
  const materialRecommendations = buildMaterialRecommendations(normalizedInput, farmingEstimates);
  const leyLineEnemyDropRecommendations = buildLeyLineEnemyDropRecommendations({
    materialRows: calculatorInventoryComparison.rows,
    staticData: normalizedInput.staticData,
    goals: normalizedInput.goals,
    inventory: normalizedInput.inventory,
  });
  const craftingRecommendations = buildCraftingPlannerRecommendations(craftingPlan);
  const weaponExpRecommendations = buildWeaponExpRecommendation(
    weaponExpSummary,
    Object.values(normalizedInput.goals.weaponGoals)
      .filter((goal) => isWeaponGoalPlannerActive(goal))
      .map((goal) => ({
        key: getWeaponGoalId(goal, goal.weaponKey),
        label: normalizedInput.staticData.weapons[goal.weaponKey]?.displayName
          ? `${normalizedInput.staticData.weapons[goal.weaponKey]?.displayName} weapon goal`
          : goal.weaponKey,
      })),
  );
  const pausedNoResinRecommendations = buildPausedNoResinRecommendations(normalizedInput);
  const recommendations = sortRecommendations([
    ...materialRecommendations,
    ...leyLineEnemyDropRecommendations,
    ...weaponExpRecommendations,
    ...craftingRecommendations,
    ...pausedNoResinRecommendations,
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
  });
  const resinSummary = buildResinSummary({
    farmingEstimates,
    dailyResinBudget: normalizedSettings.dailyResinBudget,
    naturalResinPerWeek: normalizedSettings.naturalResinPerWeek,
    weeklyResinBudget: normalizedInput.staticData.resinRules.naturalResinPerWeek,
    artifactBudget: 0,
    progressionMora: baseCraftingPlan.progressionMora,
    craftingMora: baseCraftingPlan.totalCraftingMora,
  });

  const warnings = buildPlannerWarnings(
    [...goalValidation.warnings, ...goalExpansion.warnings],
    [...exactInventoryComparison.warnings, ...calculatorInventoryComparison.warnings, ...materialDeficitStage.warnings],
    estimateWarnings,
    craftingPlan.warnings,
  );
  const plannerTrace = buildPlannerTrace(farmingEstimates, normalizedInput.inventory, craftingPlan);
  return {
    plannerGoals: goalCatalog.plannerGoals,
    plannerGoalGroups: goalCatalog.plannerGoalGroups,
    goalResolutions: [...enrichedGoals.byCharacter, ...enrichedGoals.byWeapon],
    deterministicRequirements: deterministicRequirementsStage.requirements,
    inventoryCoverage: exactInventoryCoverage,
    materialDeficits: materialDeficitStage.deficits,
    exactRequirementsByMaterial: exactInventoryComparison.rows,
    totalMissingByMaterial: calculatorInventoryComparison.rows,
    farmingEstimates,
    plannerReport: {
      summary: resinSummary,
      sections: reportSections.recommendationSections,
      warnings,
    },
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
    plannerTrace,
    warnings,
  };
}
