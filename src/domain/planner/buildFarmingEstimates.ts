import type { PlannerSettings } from "../goals/types";
import type {
  AvailabilityGroupKey,
  DayOfWeek,
  FarmingEstimate,
  PlannerEstimationSettings,
  PlannerWarning,
  SourceAssignment,
} from "./types";
import type { StaticGameData } from "../staticData/types";
import { availabilityMatchesDay } from "../../utils/days";

export interface FarmingEstimateDetail extends FarmingEstimate {
  estimateKey: string;
  sourceKey: string;
  availability: AvailabilityGroupKey;
  relatedGoalKeys: string[];
  relatedMaterialKeys: string[];
  deterministicRequirementsByMaterial: Record<string, number>;
  remainingDeficitsByMaterial: Record<string, number>;
  isAvailableToday: boolean;
}

interface SourceEstimateGroup {
  estimateKey: string;
  sourceKey: string;
  sourceType: FarmingEstimateDetail["sourceType"];
  sourceName: string | null;
  availability: AvailabilityGroupKey;
  materialKey: string;
  materialName: string;
  assignments: SourceAssignment[];
  relatedGoalKeys: string[];
  relatedMaterialKeys: string[];
  relatedMaterialDisplayNames: Record<string, string>;
  deterministicRequirementsByMaterial: Record<string, number>;
  remainingDeficitsByMaterial: Record<string, number>;
  assumptions: string[];
  warnings: string[];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function clampFloatNoise(value: number): number {
  return Math.abs(value) < 1e-9 ? 0 : value;
}

function toActionableQuantity(value: number): number {
  const normalized = clampFloatNoise(value);
  if (normalized <= 0) {
    return 0;
  }
  return Math.ceil(normalized);
}

function sumValues(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function getWorldLevelRecord<T>(records: Record<string, T>, worldLevel: number): { value: T | null; resolvedWorldLevel: number | null } {
  const exact = records[String(worldLevel)];
  if (exact) {
    return { value: exact, resolvedWorldLevel: worldLevel };
  }

  const fallbackWorldLevel = Object.keys(records)
    .map((key) => Number(key))
    .filter((key) => Number.isFinite(key) && key <= worldLevel)
    .sort((left, right) => right - left)[0];

  if (typeof fallbackWorldLevel !== "number") {
    return { value: null, resolvedWorldLevel: null };
  }

  return {
    value: records[String(fallbackWorldLevel)] ?? null,
    resolvedWorldLevel: fallbackWorldLevel,
  };
}

export function normalizePlannerEstimationSettings(
  settings: PlannerSettings | undefined,
  staticData: StaticGameData,
): PlannerEstimationSettings {
  return {
    ...staticData.plannerDefaults,
    ...staticData.craftingPlannerDefaults,
    ...staticData.gemConversionDefaults,
    craftingPassiveOverrides: {},
    currentResin: 0,
    condensedResinOwned: 0,
    fragileResinOwned: 0,
    transientResinOwned: 0,
    includePrimogemRefillPlanning: false,
    weeklyBossDiscountClaimsUsed: 0,
    dailyResinBudget: staticData.plannerDefaults.naturalResinPerDay,
    includeArtifactGoals: true,
    ...(settings ?? {}),
  };
}

function buildDaysWeeks(
  estimatedResin: number | null,
  settings: PlannerEstimationSettings,
): Pick<FarmingEstimate, "estimatedDaysNaturalResin" | "estimatedWeeksNaturalResin"> {
  if (estimatedResin === null) {
    return {
      estimatedDaysNaturalResin: null,
      estimatedWeeksNaturalResin: null,
    };
  }

  return {
    estimatedDaysNaturalResin: estimatedResin / settings.dailyResinBudget,
    estimatedWeeksNaturalResin: estimatedResin / settings.naturalResinPerWeek,
  };
}

const CHARACTER_EXP_VALUE_FALLBACKS: Record<string, number> = {
  WanderersAdvice: 1000,
  AdventurersExperience: 5000,
  HerosWit: 20000,
};

function resolveCharacterExpValue(staticData: StaticGameData, materialKey: string): number {
  const material = staticData.materials[materialKey] as
    | (typeof staticData.materials[string] & {
        expValue?: number;
      })
    | undefined;

  return material?.characterExpValue ?? material?.expValue ?? CHARACTER_EXP_VALUE_FALLBACKS[materialKey] ?? 0;
}

function buildEstimateBase(group: SourceEstimateGroup, today: DayOfWeek): FarmingEstimateDetail {
  const remainingDeficitsByMaterial = Object.fromEntries(
    Object.entries(group.remainingDeficitsByMaterial).map(([materialKey, value]) => [materialKey, toActionableQuantity(value)]),
  );
  return {
    estimateKey: group.estimateKey,
    sourceKey: group.sourceKey,
    materialKey: group.materialKey,
    materialName: group.materialName,
    missingAmount: sumValues(remainingDeficitsByMaterial),
    sourceType: group.sourceType,
    sourceName: group.sourceName,
    deterministicRequirement: sumValues(group.deterministicRequirementsByMaterial),
    relatedGoalKeys: unique(group.relatedGoalKeys),
    relatedMaterialKeys: unique(group.relatedMaterialKeys),
    relatedMaterialDisplayNames: { ...group.relatedMaterialDisplayNames },
    deterministicRequirementsByMaterial: { ...group.deterministicRequirementsByMaterial },
    remainingDeficitsByMaterial,
    estimatedRuns: null,
    estimatedResin: null,
    estimatedDaysNaturalResin: null,
    estimatedWeeksNaturalResin: null,
    assumptions: unique(group.assumptions),
    warnings: unique(group.warnings),
    availability: group.availability,
    isAvailableToday:
      availabilityMatchesDay(group.availability, today) || group.availability === "ALWAYS" || group.availability === "WEEKLY",
  };
}

function getGroupingIdentity(assignment: SourceAssignment): {
  estimateKey: string;
  sourceKey: string;
  materialKey: string;
  materialName: string;
} {
  switch (assignment.sourceType) {
    case "ley_line_wealth":
      return {
        estimateKey: "ley_line_wealth|BlossomOfWealth",
        sourceKey: "BlossomOfWealth",
        materialKey: "Mora",
        materialName: "Mora",
      };
    case "ley_line_revelation":
      return {
        estimateKey: "ley_line_revelation|BlossomOfRevelation",
        sourceKey: "BlossomOfRevelation",
        materialKey: "HerosWit",
        materialName: "Character EXP",
      };
    case "domain_of_mastery": {
      const sourceKey = assignment.talentBookFamilyKey ?? assignment.sourceName ?? assignment.materialKey;
      return {
        estimateKey: `domain_of_mastery|${sourceKey}`,
        sourceKey,
        materialKey: assignment.materialKey,
        materialName: assignment.materialName,
      };
    }
    case "domain_of_forgery": {
      const sourceKey = assignment.weaponAscensionFamilyKey ?? assignment.sourceName ?? assignment.materialKey;
      return {
        estimateKey: `domain_of_forgery|${sourceKey}`,
        sourceKey,
        materialKey: assignment.materialKey,
        materialName: assignment.materialName,
      };
    }
    case "normal_boss": {
      const sourceKey = assignment.sourceName ?? assignment.normalBossMaterialKey ?? assignment.materialKey;
      const materialKey = assignment.kind === "normal_boss_material" ? assignment.materialKey : assignment.normalBossMaterialKey ?? assignment.materialKey;
      return {
        estimateKey: `normal_boss|${sourceKey}`,
        sourceKey,
        materialKey,
        materialName: materialKey === assignment.materialKey ? assignment.materialName : assignment.sourceName ?? assignment.materialName,
      };
    }
    case "weekly_boss": {
      const sourceKey = assignment.sourceName ?? assignment.weeklyBossMaterialKey ?? assignment.materialKey;
      return {
        estimateKey: `weekly_boss|${sourceKey}`,
        sourceKey,
        materialKey: assignment.materialKey,
        materialName: assignment.materialName,
      };
    }
    case "open_world_enemy":
      return {
        estimateKey: `open_world_enemy|${assignment.sourceName ?? assignment.materialKey}`,
        sourceKey: assignment.sourceName ?? assignment.materialKey,
        materialKey: assignment.materialKey,
        materialName: assignment.materialName,
      };
    case "local_specialty":
    case "unknown":
    default:
      return {
        estimateKey: `${assignment.sourceType}|${assignment.materialKey}|${assignment.sourceName ?? "unknown"}`,
        sourceKey: assignment.materialKey,
        materialKey: assignment.materialKey,
        materialName: assignment.materialName,
      };
  }
}

function groupAssignments(assignments: SourceAssignment[]): SourceEstimateGroup[] {
  const grouped = new Map<string, SourceEstimateGroup>();

  for (const assignment of assignments) {
    const identity = getGroupingIdentity(assignment);
    const existing = grouped.get(identity.estimateKey);
    if (!existing) {
      grouped.set(identity.estimateKey, {
        estimateKey: identity.estimateKey,
        sourceKey: identity.sourceKey,
        sourceType: assignment.sourceType,
        sourceName: assignment.sourceName,
        availability: assignment.availability,
        materialKey: identity.materialKey,
        materialName: identity.materialName,
        assignments: [assignment],
        relatedGoalKeys: [assignment.goalKey],
        relatedMaterialKeys: [assignment.materialKey],
        relatedMaterialDisplayNames: { [assignment.materialKey]: assignment.materialName },
        deterministicRequirementsByMaterial: { [assignment.materialKey]: assignment.requiredAmount },
        remainingDeficitsByMaterial: { [assignment.materialKey]: assignment.missingAmount },
        assumptions: [...assignment.assumptions],
        warnings: [...assignment.warnings],
      });
      continue;
    }

    existing.assignments.push(assignment);
    existing.relatedGoalKeys.push(assignment.goalKey);
    existing.relatedMaterialKeys.push(assignment.materialKey);
    existing.relatedMaterialDisplayNames[assignment.materialKey] = assignment.materialName;
    existing.deterministicRequirementsByMaterial[assignment.materialKey] =
      (existing.deterministicRequirementsByMaterial[assignment.materialKey] ?? 0) + assignment.requiredAmount;
    existing.remainingDeficitsByMaterial[assignment.materialKey] =
      (existing.remainingDeficitsByMaterial[assignment.materialKey] ?? 0) + assignment.missingAmount;
    existing.assumptions.push(...assignment.assumptions);
    existing.warnings.push(...assignment.warnings);
  }

  return [...grouped.values()].map((group) => ({
    ...group,
    relatedGoalKeys: unique(group.relatedGoalKeys),
    relatedMaterialKeys: unique(group.relatedMaterialKeys),
    assumptions: unique(group.assumptions),
    warnings: unique(group.warnings),
  }));
}

function buildNonResinEstimate(
  group: SourceEstimateGroup,
  today: DayOfWeek,
  assumptions: string[],
): FarmingEstimateDetail {
  const base = buildEstimateBase(group, today);
  return {
    ...base,
    assumptions: unique([...base.assumptions, ...assumptions]),
  };
}

function estimateMora(
  group: SourceEstimateGroup,
  settings: PlannerEstimationSettings,
  staticData: StaticGameData,
  today: DayOfWeek,
): FarmingEstimateDetail {
  const { value: rewardRecord, resolvedWorldLevel } = getWorldLevelRecord(
    staticData.leyLineRewardsByWorldLevel,
    settings.worldLevel,
  );
  const reward = rewardRecord?.wealth.mora ?? 0;
  const missingMora = sumValues(group.remainingDeficitsByMaterial);
  const estimatedRuns = reward > 0 ? Math.ceil(missingMora / reward) : null;
  const estimatedResin = estimatedRuns === null ? null : estimatedRuns * staticData.resinActivityCosts.leyLineOutcrop.resin;
  const base = buildEstimateBase(group, today);
  return {
    ...base,
    estimatedRuns,
    estimatedResin,
    ...buildDaysWeeks(estimatedResin, settings),
    assumptions: unique([
      ...base.assumptions,
      `World Level ${settings.worldLevel} Blossom of Wealth rewards ${reward} Mora per claim.`,
      resolvedWorldLevel !== null && resolvedWorldLevel !== settings.worldLevel
        ? `World Level ${settings.worldLevel} is using World Level ${resolvedWorldLevel} Ley Line reward data because no exact record is defined.`
        : "",
      "All missing progression Mora and crafting Mora are grouped into one Blossom of Wealth estimate.",
    ]),
    warnings: reward > 0 ? base.warnings : [...base.warnings, "Missing Ley Line reward data for the selected World Level."],
  };
}

function estimateCharacterExp(
  group: SourceEstimateGroup,
  settings: PlannerEstimationSettings,
  staticData: StaticGameData,
  today: DayOfWeek,
): FarmingEstimateDetail {
  const { value: rewardRecord, resolvedWorldLevel } = getWorldLevelRecord(
    staticData.leyLineRewardsByWorldLevel,
    settings.worldLevel,
  );
  const averageCharacterExp = rewardRecord?.revelation.averageCharacterExp ?? 0;
  const missingExp = Object.entries(group.remainingDeficitsByMaterial).reduce(
    (sum, [materialKey, quantity]) => sum + quantity * resolveCharacterExpValue(staticData, materialKey),
    0,
  );
  const estimatedRuns = averageCharacterExp > 0 ? Math.ceil(missingExp / averageCharacterExp) : null;
  const estimatedResin = estimatedRuns === null ? null : estimatedRuns * staticData.resinActivityCosts.leyLineOutcrop.resin;
  const base = buildEstimateBase(group, today);
  return {
    ...base,
    estimatedRuns,
    estimatedResin,
    ...buildDaysWeeks(estimatedResin, settings),
    assumptions: unique([
      ...base.assumptions,
      `World Level ${settings.worldLevel} Blossom of Revelation averages ${averageCharacterExp} character EXP per claim.`,
      resolvedWorldLevel !== null && resolvedWorldLevel !== settings.worldLevel
        ? `World Level ${settings.worldLevel} is using World Level ${resolvedWorldLevel} Ley Line reward data because no exact record is defined.`
        : "",
      "Character EXP book deficits are converted into total EXP value before estimating Ley Line runs.",
    ]),
    warnings:
      averageCharacterExp > 0 && missingExp > 0
        ? base.warnings
        : [...base.warnings, "Missing character EXP conversion data for this estimate."],
  };
}

function estimateDomainMaterial(
  group: SourceEstimateGroup,
  settings: PlannerEstimationSettings,
  staticData: StaticGameData,
  today: DayOfWeek,
): FarmingEstimateDetail {
  const base = buildEstimateBase(group, today);
  const isWeapon = group.sourceType === "domain_of_forgery";
  const averages = isWeapon
    ? [
        staticData.weaponAscensionDomainDropModel[settings.domainLevel].overall.twoStar?.average ?? 0,
        staticData.weaponAscensionDomainDropModel[settings.domainLevel].overall.threeStar?.average ?? 0,
        staticData.weaponAscensionDomainDropModel[settings.domainLevel].overall.fourStar?.average ?? 0,
        staticData.weaponAscensionDomainDropModel[settings.domainLevel].overall.fiveStar?.average ?? 0,
      ]
    : [
        staticData.talentBookDomainDropModel[settings.domainLevel].overall.twoStar?.average ?? 0,
        staticData.talentBookDomainDropModel[settings.domainLevel].overall.threeStar?.average ?? 0,
        staticData.talentBookDomainDropModel[settings.domainLevel].overall.fourStar?.average ?? 0,
      ];
  const weights = isWeapon ? [1, 3, 9, 27] : [1, 3, 9];
  const warnings = [...base.warnings];
  let estimatedRuns: number | null = 0;

  if (settings.craftAwareEstimates) {
    const deficitEquivalent = group.assignments.reduce(
      (sum, assignment) => sum + assignment.missingAmount * (weights[assignment.targetTierIndex] ?? 0),
      0,
    );
    const expectedEquivalentPerRun = averages.reduce(
      (sum, average, index) => sum + average * (weights[index] ?? 0),
      0,
    );
    estimatedRuns = expectedEquivalentPerRun > 0 ? Math.ceil(deficitEquivalent / expectedEquivalentPerRun) : null;
  } else {
    for (const assignment of group.assignments) {
      if (assignment.missingAmount <= 0) {
        continue;
      }
      const average = averages[assignment.targetTierIndex] ?? 0;
      if (average <= 0) {
        warnings.push(`Missing domain drop data for ${assignment.materialName} at domain level ${settings.domainLevel}.`);
        estimatedRuns = null;
        continue;
      }
      const runsForTier = Math.ceil(assignment.missingAmount / average);
      estimatedRuns = estimatedRuns === null ? null : Math.max(estimatedRuns, runsForTier);
    }
  }

  const estimatedResin = estimatedRuns === null ? null : estimatedRuns * staticData.resinActivityCosts.domain.resin;
  return {
    ...base,
    estimatedRuns,
    estimatedResin,
    ...buildDaysWeeks(estimatedResin, settings),
    assumptions: unique([
      ...base.assumptions,
      settings.craftAwareEstimates
        ? `Domain level ${settings.domainLevel} estimates use ${isWeapon ? "2-Star" : "Teachings"}-equivalent family math after guaranteed crafting coverage.`
        : `Domain level ${settings.domainLevel} estimates use the slowest missing tier for this family instead of summing each tier separately.`,
      settings.assumeCondensedResinEquivalentForDomains
        ? "Condensed Resin is treated as two 20-resin claims for planning convenience."
        : "Domain estimates assume normal 20-resin claims only.",
    ]),
    warnings,
  };
}

function estimateNormalBoss(
  group: SourceEstimateGroup,
  settings: PlannerEstimationSettings,
  staticData: StaticGameData,
  today: DayOfWeek,
): {
  estimate: FarmingEstimateDetail | null;
  warnings: PlannerWarning[];
} {
  const uniqueAssignments = group.assignments.filter((assignment) => assignment.kind === "normal_boss_material");
  const gemAssignments = group.assignments.filter((assignment) => assignment.kind === "ascension_gem");
  const uniqueBossMaterialDeficit = uniqueAssignments.reduce((sum, assignment) => sum + assignment.missingAmount, 0);

  if (uniqueBossMaterialDeficit <= 0) {
    const gemNames = unique(gemAssignments.map((assignment) => assignment.materialName));
    const sourceLabel = group.sourceName ?? "Normal Boss";
    return {
      estimate: null,
      warnings:
        gemNames.length > 0
          ? [
              {
                type: "planner_advisory",
                key: group.sourceKey,
                message: `Ascension Gems remain missing for ${gemNames.join(", ")}, but ${sourceLabel} is not recommended as a direct resin target when unique boss materials are already complete.`,
              },
            ]
          : [],
    };
  }

  const { value: dropRecord, resolvedWorldLevel } = getWorldLevelRecord(
    staticData.normalBossUniqueMaterialDropMeanByWorldLevel,
    settings.worldLevel,
  );
  const perRun = dropRecord?.dropMean ?? 0;
  const estimatedRuns = perRun > 0 ? Math.ceil(uniqueBossMaterialDeficit / perRun) : null;
  const estimatedResin = estimatedRuns === null ? null : estimatedRuns * staticData.resinActivityCosts.normalBoss.resin;
  const primaryAssignment = uniqueAssignments[0] ?? group.assignments[0];
  const base = buildEstimateBase(
    {
      ...group,
      materialKey: primaryAssignment.materialKey,
      materialName: primaryAssignment.materialName,
    },
    today,
  );

  return {
    estimate: {
      ...base,
      estimatedRuns,
      estimatedResin,
      ...buildDaysWeeks(estimatedResin, settings),
      assumptions: unique([
        ...base.assumptions,
        `World Level ${settings.worldLevel} normal boss unique materials average ${perRun} per claim.`,
        resolvedWorldLevel !== null && resolvedWorldLevel !== settings.worldLevel
          ? `World Level ${settings.worldLevel} is using World Level ${resolvedWorldLevel} normal boss drop data because no exact record is defined.`
          : "",
        gemAssignments.length > 0
          ? "Ascension Gem deficits from this boss are treated as incidental while farming the unique boss material and do not increase boss runs."
          : "Normal boss runs are driven only by the unique boss material deficit.",
      ]),
      warnings: perRun > 0 ? base.warnings : [...base.warnings, "Missing normal boss drop-rate data for this estimate."],
    },
    warnings: [],
  };
}

function estimateWeeklyBoss(
  group: SourceEstimateGroup,
  settings: PlannerEstimationSettings,
  staticData: StaticGameData,
  today: DayOfWeek,
): FarmingEstimateDetail {
  const { value: dropRecord, resolvedWorldLevel } = getWorldLevelRecord(
    staticData.weeklyTalentMaterialDropMeanByWorldLevel,
    settings.worldLevel,
  );
  const totalMean = dropRecord?.dropMean ?? 0;
  const targetSpecificMean = totalMean > 0 ? totalMean / 3 : 0;
  const estimatedRuns =
    targetSpecificMean > 0
      ? group.assignments.reduce((maxRuns, assignment) => Math.max(maxRuns, Math.ceil(assignment.missingAmount / targetSpecificMean)), 0)
      : null;
  const base = buildEstimateBase(group, today);
  return {
    ...base,
    estimatedRuns,
    estimatedResin: null,
    estimatedDaysNaturalResin: null,
    estimatedWeeksNaturalResin: null,
    weeklyGate: {
      isWeeklyGated: true,
      estimatedWeeks: estimatedRuns,
      rewardLimit: "once_per_boss_per_week",
      discountedClaims: 0,
      fullCostClaims: 0,
    },
    assumptions: unique([
      ...base.assumptions,
      `World Level ${settings.worldLevel} weekly talent materials average ${totalMean} total drops per claim, modeled as ${targetSpecificMean.toFixed(3)} target-specific drops for each material.`,
      resolvedWorldLevel !== null && resolvedWorldLevel !== settings.worldLevel
        ? `World Level ${settings.worldLevel} is using World Level ${resolvedWorldLevel} weekly boss drop data because no exact record is defined.`
        : "",
      "The same weekly boss can only be claimed once per week.",
    ]),
    warnings: targetSpecificMean > 0 ? base.warnings : [...base.warnings, "Missing weekly boss drop-rate data for the selected World Level."],
  };
}

function estimateGroup(
  group: SourceEstimateGroup,
  settings: PlannerEstimationSettings,
  staticData: StaticGameData,
  today: DayOfWeek,
): {
  estimate: FarmingEstimateDetail | null;
  warnings: PlannerWarning[];
} {
  switch (group.sourceType) {
    case "ley_line_wealth":
      return { estimate: estimateMora(group, settings, staticData, today), warnings: [] };
    case "ley_line_revelation":
      return { estimate: estimateCharacterExp(group, settings, staticData, today), warnings: [] };
    case "domain_of_mastery":
    case "domain_of_forgery":
      return { estimate: estimateDomainMaterial(group, settings, staticData, today), warnings: [] };
    case "normal_boss":
      return estimateNormalBoss(group, settings, staticData, today);
    case "weekly_boss":
      return { estimate: estimateWeeklyBoss(group, settings, staticData, today), warnings: [] };
    case "open_world_enemy":
      return {
        estimate: buildNonResinEstimate(group, today, ["Enemy drop estimates are not resin-modeled by default."]),
        warnings: [],
      };
    case "local_specialty":
      return {
        estimate: buildNonResinEstimate(group, today, ["Local Specialties are open-world collection targets and are not resin-gated."]),
        warnings: [],
      };
    case "unknown":
    default:
      return {
        estimate: buildNonResinEstimate(group, today, [
          group.assignments.some((assignment) => assignment.kind === "weapon_exp")
            ? "Weapon EXP materials are tracked deterministically, but no resin-source estimator is enabled for them."
            : "No farming estimator is available for this material category yet.",
        ]),
        warnings: [],
      };
  }
}

function applyWeeklyBossDiscountSchedule(
  estimates: FarmingEstimateDetail[],
  settings: PlannerEstimationSettings,
  staticData: StaticGameData,
): FarmingEstimateDetail[] {
  const weeklyEstimates = estimates
    .filter((estimate) => estimate.sourceType === "weekly_boss" && estimate.estimatedRuns !== null)
    .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey));
  if (weeklyEstimates.length === 0) {
    return estimates;
  }

  const remainingClaims = new Map(weeklyEstimates.map((estimate) => [estimate.sourceKey, estimate.estimatedRuns ?? 0]));
  const resinSpent = new Map<string, number>(weeklyEstimates.map((estimate) => [estimate.sourceKey, 0]));
  const weeksUsed = new Map<string, number>(weeklyEstimates.map((estimate) => [estimate.sourceKey, 0]));
  const discountedClaimsUsed = new Map<string, number>(weeklyEstimates.map((estimate) => [estimate.sourceKey, 0]));
  const fullCostClaimsUsed = new Map<string, number>(weeklyEstimates.map((estimate) => [estimate.sourceKey, 0]));
  const firstWeekDiscountSlots = Math.max(
    0,
    staticData.plannerDefaults.weeklyBossDiscountedClaimsAvailable - settings.weeklyBossDiscountClaimsUsed,
  );
  const laterWeekDiscountSlots = staticData.plannerDefaults.weeklyBossDiscountedClaimsAvailable;
  let activeWeek = 0;

  while ([...remainingClaims.values()].some((value) => value > 0)) {
    activeWeek += 1;
    let discountsRemaining = activeWeek === 1 ? firstWeekDiscountSlots : laterWeekDiscountSlots;

    for (const estimate of weeklyEstimates) {
      const claimsLeft = remainingClaims.get(estimate.sourceKey) ?? 0;
      if (claimsLeft <= 0) {
        continue;
      }

      const resinForClaim =
        discountsRemaining > 0
          ? staticData.resinActivityCosts.weeklyBoss.firstThreePerWeekResin
          : staticData.resinActivityCosts.weeklyBoss.afterFirstThreePerWeekResin;
      const usesDiscount = discountsRemaining > 0;
      discountsRemaining = Math.max(0, discountsRemaining - 1);
      remainingClaims.set(estimate.sourceKey, claimsLeft - 1);
      resinSpent.set(estimate.sourceKey, (resinSpent.get(estimate.sourceKey) ?? 0) + resinForClaim);
      weeksUsed.set(estimate.sourceKey, activeWeek);
      if (usesDiscount) {
        discountedClaimsUsed.set(estimate.sourceKey, (discountedClaimsUsed.get(estimate.sourceKey) ?? 0) + 1);
      } else {
        fullCostClaimsUsed.set(estimate.sourceKey, (fullCostClaimsUsed.get(estimate.sourceKey) ?? 0) + 1);
      }
    }
  }

  return estimates.map((estimate) => {
    if (estimate.sourceType !== "weekly_boss" || estimate.estimatedRuns === null) {
      return estimate;
    }

    const estimatedResin = resinSpent.get(estimate.sourceKey) ?? null;
    const estimatedWeeks = weeksUsed.get(estimate.sourceKey) ?? null;
    const discountedClaims = discountedClaimsUsed.get(estimate.sourceKey) ?? 0;
    const fullCostClaims = fullCostClaimsUsed.get(estimate.sourceKey) ?? 0;
    return {
      ...estimate,
      estimatedResin,
      ...buildDaysWeeks(estimatedResin, settings),
      weeklyGate: {
        isWeeklyGated: true,
        estimatedWeeks,
        rewardLimit: "once_per_boss_per_week",
        discountedClaims,
        fullCostClaims,
      },
      assumptions: unique([
        ...estimate.assumptions,
        `Weekly boss discount scheduling assumes ${firstWeekDiscountSlots} discounted claim(s) remain this week, then ${laterWeekDiscountSlots} discounted claim(s) reset each following week.`,
        "Weekly boss rewards reset on Mondays at 02:00 AM PST.",
      ]),
    };
  });
}

export function buildFarmingEstimates(params: {
  sourceAssignments: SourceAssignment[];
  staticData: StaticGameData;
  resinSettings: PlannerSettings;
  today: DayOfWeek;
}): { farmingEstimates: FarmingEstimateDetail[]; warnings: PlannerWarning[] } {
  const settings = normalizePlannerEstimationSettings(params.resinSettings, params.staticData);
  const groups = groupAssignments(params.sourceAssignments);
  const warnings: PlannerWarning[] = [];
  const estimates = groups
    .map((group) => {
      const result = estimateGroup(group, settings, params.staticData, params.today);
      warnings.push(...result.warnings);
      return result.estimate;
    })
    .filter((estimate): estimate is FarmingEstimateDetail => estimate !== null && estimate.missingAmount > 0);

  const scheduledWeekly = applyWeeklyBossDiscountSchedule(estimates, settings, params.staticData);
  const aggregated = scheduledWeekly
    .sort(
      (left, right) =>
        (right.estimatedResin ?? 0) - (left.estimatedResin ?? 0) ||
        right.missingAmount - left.missingAmount ||
        (left.sourceName ?? "").localeCompare(right.sourceName ?? "") ||
        left.materialName.localeCompare(right.materialName),
    );

  warnings.push(
    ...aggregated
      .filter((estimate) => estimate.sourceType === "unknown" && estimate.missingAmount > 0)
      .map((estimate) => ({
        type: "estimate_source_unresolved" as const,
        key: estimate.materialKey,
        message: `No resin estimator is configured for ${estimate.materialName}.`,
      })),
  );

  return {
    farmingEstimates: aggregated,
    warnings,
  };
}
