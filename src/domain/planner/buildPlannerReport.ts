import type { AccountOwnershipState } from "../account/types";
import type { ArtifactGoal, CharacterGoal, KrumpanionGoals, WeaponGoal } from "../goals/types";
import {
  getLinkedWeaponInstanceId,
  getGoalCurrentStateLabel,
  getWeaponGoalId,
  getWeaponGoalTargetAscension,
  isCharacterGoalPlannerActive,
  isWeaponGoalPlannerActive,
  resolveCharacterGoalCurrentState,
  resolveWeaponGoalCurrentState,
} from "../goals/goalState";
import {
  getArtifactGoalDisplayName,
  getArtifactGoalSubtitle,
  getCharacterGoalDisplayName,
  getGoalDisplayName as getReadableGoalDisplayName,
  getGoalTypeLabel as getReadableGoalTypeLabel,
  getWeaponGoalDisplayName,
} from "../goals/goalDisplay";
import type { StaticGameData } from "../staticData/types";
import { availabilityMatchesDay } from "../../utils/days";
import type {
  ArtifactFarmPlan,
  CharacterPlan,
  GoalResolutionItem,
  MaterialNeedRow,
  PlannerGoal,
  PlannerGoalGroup,
  PlannerInput,
  PlannerOutput,
  PlannerRecommendation,
  PlannerRecommendationSection,
  PlannerWarning,
  RecommendationGroup,
  WeaponPlan,
  WeaponExpPlannerSummary,
} from "./types";
import type { FarmingEstimateDetail } from "./buildFarmingEstimates";

const ACTION_GROUP_ORDER: PlannerRecommendation["actionGroup"][] = [
  "resin_gated",
  "time_gated_non_resin",
  "crafting",
  "open_world",
  "passive_incidental",
];

const ACTION_SUBGROUP_ORDER: Array<PlannerRecommendation["actionSubgroup"]> = [
  "weekly_resin",
  "domains",
  "bosses",
  "ley_lines",
  "ley_line_enemy_drops",
  "forging",
  "local_specialty",
  "unknown_estimates",
  undefined,
];

function actionGroupRank(group: PlannerRecommendation["actionGroup"]): number {
  const index = ACTION_GROUP_ORDER.indexOf(group);
  return index === -1 ? ACTION_GROUP_ORDER.length : index;
}

export function getGoalDisplayName(goalKey: string, input: PlannerInput): string {
  return getReadableGoalDisplayName(goalKey, input.goals, input.staticData);
}

export function getGoalTypeLabel(goalKey: string, input: PlannerInput): string {
  return getReadableGoalTypeLabel(goalKey, input.goals);
}

export function getPlannerPriorityLabel(
  priority: number,
  blockedBy: string[] | undefined,
): PlannerRecommendation["priorityLabel"] {
  if (blockedBy?.length) {
    return "Blocked";
  }
  if (priority >= 700) {
    return "High";
  }
  if (priority >= 250) {
    return "Medium";
  }
  if (priority >= 100) {
    return "Low";
  }
  return "Optional";
}

export function sortRecommendations(rows: PlannerRecommendation[]): PlannerRecommendation[] {
  return [...rows].sort((left, right) => {
    const groupDelta = actionGroupRank(left.actionGroup) - actionGroupRank(right.actionGroup);
    if (groupDelta !== 0) {
      return groupDelta;
    }

    const subgroupDelta =
      ACTION_SUBGROUP_ORDER.indexOf(left.actionSubgroup) - ACTION_SUBGROUP_ORDER.indexOf(right.actionSubgroup);
    if (subgroupDelta !== 0) {
      return subgroupDelta;
    }

    if (left.actionGroup === "resin_gated") {
      return (
        (right.totalEstimatedResin ?? 0) - (left.totalEstimatedResin ?? 0) ||
        (right.actionableRuns ?? 0) - (left.actionableRuns ?? 0) ||
        (right.estimatedRuns ?? 0) - (left.estimatedRuns ?? 0) ||
        left.title.localeCompare(right.title)
      );
    }

    if (left.actionGroup === "crafting") {
      return (
        (right.expectedRewards?.[0]?.quantity ?? 0) - (left.expectedRewards?.[0]?.quantity ?? 0) ||
        left.title.localeCompare(right.title)
      );
    }

    if (left.actionGroup === "open_world") {
      return (
        (right.requiredMaterials.reduce((sum, material) => sum + material.quantity, 0)) -
          (left.requiredMaterials.reduce((sum, material) => sum + material.quantity, 0)) ||
        left.title.localeCompare(right.title)
      );
    }

    return right.priority - left.priority || left.title.localeCompare(right.title);
  });
}

function groupByAvailability(recommendations: PlannerRecommendation[]) {
  const grouped = new Map<string, PlannerRecommendation[]>();
  for (const recommendation of recommendations) {
    const key = recommendation.availability;
    grouped.set(key, [...(grouped.get(key) ?? []), recommendation]);
  }

  return [...grouped.entries()].map(([key, rows]) => ({
    key: key as PlannerOutput["byAvailability"][number]["key"],
    label: key,
    rows: sortRecommendations(rows),
  }));
}

export function buildArtifactPlans(goals: ArtifactGoal[], staticData: StaticGameData): ArtifactFarmPlan[] {
  return goals
    .filter((goal) => goal.enabled)
    .map((goal) => {
      const setKey = goal.targetSetKeys[0];
      const domain = setKey ? staticData.artifactDomains[setKey] : undefined;
      return {
        id: goal.id,
        label: getArtifactGoalDisplayName(goal, staticData),
        domainKey: goal.domainKey,
        domainName: domain?.domainName ?? goal.domainKey,
        targetSetKeys: goal.targetSetKeys,
        availability: domain?.availability ?? "ALWAYS",
        weeklyResinBudget: goal.weeklyResinBudget ?? null,
        priority: goal.priority,
        notes: goal.notes,
      };
    });
}

function inferRecommendationCategoryFromEstimate(estimate: FarmingEstimateDetail): PlannerRecommendation["category"] {
  switch (estimate.sourceType) {
    case "domain_of_mastery":
      return "talent_domain";
    case "domain_of_forgery":
      return "weapon_domain";
    case "normal_boss":
      return "boss";
    case "weekly_boss":
      return "weekly_boss";
    case "ley_line_wealth":
    case "ley_line_revelation":
      return "leyline";
    default:
      return "custom";
  }
}

function inferActionGroupFromEstimate(estimate: FarmingEstimateDetail): PlannerRecommendation["actionGroup"] {
  switch (estimate.sourceType) {
    case "ley_line_wealth":
    case "ley_line_revelation":
    case "domain_of_mastery":
    case "domain_of_forgery":
    case "normal_boss":
    case "weekly_boss":
      return "resin_gated";
    case "open_world_enemy":
    case "local_specialty":
      return "open_world";
    case "unknown":
    default:
      return "passive_incidental";
  }
}

function inferActionSubgroupFromEstimate(estimate: FarmingEstimateDetail): PlannerRecommendation["actionSubgroup"] {
  switch (estimate.sourceType) {
    case "weekly_boss":
      return "weekly_resin";
    case "domain_of_mastery":
    case "domain_of_forgery":
      return "domains";
    case "normal_boss":
      return "bosses";
    case "ley_line_wealth":
    case "ley_line_revelation":
      return "ley_lines";
    case "local_specialty":
      return "local_specialty";
    case "unknown":
      return "unknown_estimates";
    default:
      return undefined;
  }
}

function resolveResinPerRun(input: PlannerInput, estimate: FarmingEstimateDetail): number | null {
  switch (estimate.sourceType) {
    case "ley_line_wealth":
    case "ley_line_revelation":
      return input.staticData.resinActivityCosts.leyLineOutcrop.resin;
    case "domain_of_mastery":
    case "domain_of_forgery":
      return input.staticData.resinActivityCosts.domain.resin;
    case "normal_boss":
      return input.staticData.resinActivityCosts.normalBoss.resin;
    case "weekly_boss":
      return estimate.weeklyGate?.fullCostClaims ? null : input.staticData.resinActivityCosts.weeklyBoss.firstThreePerWeekResin;
    default:
      return null;
  }
}

function formatResinLabel(totalEstimatedResin: number | null): string {
  if (totalEstimatedResin === null) {
    return "No resin";
  }
  return String(totalEstimatedResin);
}

function formatMaterialDetailList(estimate: FarmingEstimateDetail): string {
  return Object.entries(estimate.remainingDeficitsByMaterial ?? {})
    .map(([materialKey, quantity]) => `${quantity} ${estimate.relatedMaterialDisplayNames?.[materialKey] ?? materialKey}`)
    .join(", ");
}

function buildMaterialRequirementList(estimate: FarmingEstimateDetail) {
  return Object.entries(estimate.remainingDeficitsByMaterial ?? { [estimate.materialKey]: estimate.missingAmount }).map(
    ([materialId, quantity]) => ({
      materialId,
      quantity,
    }),
  );
}

function buildMaterialSummary(estimate: FarmingEstimateDetail): string {
  const deficits = Object.entries(estimate.remainingDeficitsByMaterial ?? { [estimate.materialName]: estimate.missingAmount });
  if (deficits.length <= 1) {
    return `${estimate.missingAmount} ${estimate.materialName}`;
  }

  return deficits
    .slice(0, 3)
    .map(([materialKey, quantity]) => `${quantity} ${estimate.relatedMaterialDisplayNames?.[materialKey] ?? materialKey}`)
    .join(", ");
}

function buildEstimateReason(estimate: FarmingEstimateDetail): string {
  const sourceName = estimate.sourceName ?? "unknown source";
  const materialSummary = buildMaterialSummary(estimate);
  const actionableRuns = estimate.actionableRuns ?? (estimate.estimatedRuns !== null ? Math.ceil(estimate.estimatedRuns) : null);
  const basisSuffix = estimate.estimateBasis ? ` Basis: ${estimate.estimateBasis}.` : "";
  const warningSuffix = estimate.warnings.length > 0 ? ` Warning: ${estimate.warnings[0]}.` : "";
  if (estimate.sourceType === "ley_line_wealth") {
    return `Need ${estimate.missingAmount.toLocaleString()} Mora. Estimated ${estimate.estimatedRuns?.toFixed(2) ?? "0"} claim(s), actionable ${actionableRuns ?? 0}, about ${estimate.estimatedResin ?? 0} resin.${basisSuffix}${warningSuffix}`;
  }

  if (estimate.sourceType === "ley_line_revelation") {
    return `Need approximately ${estimate.deterministicRequirement.toLocaleString()} Character EXP value across ${formatMaterialDetailList(estimate)}. Estimated ${estimate.estimatedRuns?.toFixed(2) ?? "0"} claim(s), actionable ${actionableRuns ?? 0}, about ${estimate.estimatedResin ?? 0} resin.${basisSuffix}${warningSuffix}`;
  }

  if (estimate.sourceType === "domain_of_mastery" || estimate.sourceType === "domain_of_forgery") {
    return `Need ${materialSummary}. Estimated ${estimate.estimatedRuns?.toFixed(2) ?? "0"} domain claim(s), actionable ${actionableRuns ?? 0}, about ${estimate.estimatedResin ?? 0} resin.${basisSuffix}${warningSuffix}`;
  }

  if (estimate.sourceType === "normal_boss") {
    return `Need ${materialSummary}. Estimated ${estimate.estimatedRuns?.toFixed(2) ?? "0"} ${sourceName} claim(s), actionable ${actionableRuns ?? 0}, about ${estimate.estimatedResin ?? 0} resin. Gem drops are incidental.${basisSuffix}${warningSuffix}`;
  }

  if (estimate.sourceType === "weekly_boss") {
    const discountedClaims = estimate.weeklyGate?.discountedClaims ?? 0;
    const fullCostClaims = estimate.weeklyGate?.fullCostClaims ?? 0;
    const pricingDetail =
      fullCostClaims > 0
        ? `${discountedClaims} discounted claim(s) and ${fullCostClaims} full-cost claim(s)`
        : `${discountedClaims} discounted claim(s)`;
    return `Need ${materialSummary}. Estimated ${estimate.estimatedRuns?.toFixed(2) ?? "0"} weekly claim(s), actionable ${actionableRuns ?? 0}, about ${estimate.estimatedResin ?? 0} resin (${pricingDetail}), with once-per-boss-per-week scheduling and a Monday 2:00 AM PST reset.${basisSuffix}${warningSuffix}`;
  }

  if (estimate.sourceType === "open_world_enemy") {
    return `Need ${materialSummary}. Farm ${sourceName} routes. No resin.${basisSuffix}${warningSuffix}`;
  }

  if (estimate.sourceType === "local_specialty") {
    return `Need ${materialSummary}. Collect local specialties from ${sourceName}. No resin.${basisSuffix}${warningSuffix}`;
  }

  if (estimate.sourceType === "unknown") {
    return `Need ${materialSummary}. Missing estimate data for this source, so it is excluded from total resin.${basisSuffix}${warningSuffix}`;
  }

  const estimateSummary =
    estimate.estimatedRuns !== null && estimate.estimatedResin !== null
      ? `Estimated ${estimate.estimatedRuns} run(s), about ${estimate.estimatedResin} resin.`
      : "This source is tracked without a resin estimate.";
  return `Farm ${sourceName} because ${materialSummary} are still missing. ${estimateSummary}`;
}

export function buildMaterialRecommendations(input: PlannerInput, farmingEstimates: FarmingEstimateDetail[]): PlannerRecommendation[] {
  const priorityConfig = input.priorityConfig ?? {
    goalPriorityWeight: 100,
    farmableTodayBonus: 25,
    sharedMaterialWeight: 10,
    sourceKnownBonus: 5,
    weeklyPenalty: 20,
  };

  return farmingEstimates
    .filter((estimate) => estimate.missingAmount > 0)
    .filter((estimate) => {
      const relatedCategories = (estimate.relatedMaterialKeys ?? [estimate.materialKey]).map(
        (key) => input.staticData.materials[key]?.category,
      );
      return !relatedCategories.every((category) => category === "weapon_exp_material");
    })
    .map((estimate) => {
      const resinPerRun = resolveResinPerRun(input, estimate);
      const totalEstimatedResin = estimate.estimatedResin;
      const actionGroup = inferActionGroupFromEstimate(estimate);
      const actionSubgroup = inferActionSubgroupFromEstimate(estimate);
      const relatedGoalLabels = (estimate.relatedGoalKeys ?? []).map((goalKey) => getGoalDisplayName(goalKey, input));
      const priority =
        estimate.relatedGoalKeys.length * priorityConfig.sharedMaterialWeight +
        (estimate.isAvailableToday ? priorityConfig.farmableTodayBonus : 0) +
        (estimate.sourceName ? priorityConfig.sourceKnownBonus : 0) -
        (estimate.weeklyGate?.isWeeklyGated ? priorityConfig.weeklyPenalty : 0) +
        Math.max(1, totalEstimatedResin ?? estimate.missingAmount);

      return {
        id: `recommendation-material-${estimate.estimateKey ?? `${estimate.materialKey}-${estimate.sourceType}`}`,
        title:
          estimate.sourceType === "local_specialty"
            ? `Collect ${estimate.materialName}`
            : estimate.sourceName
              ? `Farm ${estimate.sourceName}`
              : `Resolve ${estimate.materialName}`,
        category: inferRecommendationCategoryFromEstimate(estimate),
        actionGroup,
        actionSubgroup,
        priority,
        availability: estimate.availability,
        sourceName: estimate.sourceName ?? undefined,
        resinCost: totalEstimatedResin ?? undefined,
        resinPerRun,
        totalEstimatedResin,
        resinLabel: formatResinLabel(totalEstimatedResin),
        estimatedRuns: estimate.estimatedRuns,
        actionableRuns: estimate.actionableRuns,
        estimatedDaysNaturalResin: estimate.estimatedDaysNaturalResin,
        estimatedWeeksNaturalResin: estimate.estimatedWeeksNaturalResin,
        weeklyGate: estimate.weeklyGate,
        relatedGoalKeys: estimate.relatedGoalKeys,
        relatedGoalLabels,
        priorityLabel: getPlannerPriorityLabel(priority, estimate.warnings),
        requiredMaterials: buildMaterialRequirementList(estimate),
        reason: buildEstimateReason(estimate),
        blockedBy: estimate.warnings.length > 0 ? estimate.warnings : [],
        isAvailableToday: estimate.isAvailableToday,
        warnings: estimate.warnings,
        estimateBasis: estimate.estimateBasis,
        dataQuality: estimate.dataQuality,
      } satisfies PlannerRecommendation;
    });
}

export function buildArtifactRecommendations(input: PlannerInput, artifactPlans: ArtifactFarmPlan[]): PlannerRecommendation[] {
  return artifactPlans.map((artifactPlan) => ({
    id: `recommendation-artifact-${artifactPlan.id}`,
    title: `Farm ${artifactPlan.domainName}`,
    category: "artifact_domain",
    actionGroup: "resin_gated",
    priority: artifactPlan.priority * 100 + (availabilityMatchesDay(artifactPlan.availability, input.today) ? 25 : 0),
    availability: artifactPlan.availability,
    sourceName: artifactPlan.domainName,
    resinCost: input.staticData.artifactDomains[artifactPlan.targetSetKeys[0]]?.resinCost ?? 20,
    resinPerRun: input.staticData.artifactDomains[artifactPlan.targetSetKeys[0]]?.resinCost ?? 20,
    totalEstimatedResin: artifactPlan.weeklyResinBudget ?? null,
    resinLabel:
      artifactPlan.weeklyResinBudget != null
        ? String(artifactPlan.weeklyResinBudget)
        : String(input.staticData.artifactDomains[artifactPlan.targetSetKeys[0]]?.resinCost ?? 20),
    estimatedRuns: artifactPlan.weeklyResinBudget
      ? Math.ceil(artifactPlan.weeklyResinBudget / (input.staticData.artifactDomains[artifactPlan.targetSetKeys[0]]?.resinCost ?? 20))
      : null,
    relatedGoalKeys: [artifactPlan.id],
    relatedGoalLabels: [artifactPlan.label],
    priorityLabel: getPlannerPriorityLabel(artifactPlan.priority * 100, []),
    requiredMaterials: [],
    reason: `Farm ${artifactPlan.domainName} because ${artifactPlan.label} is an active artifact goal.`,
    blockedBy: [],
    isAvailableToday: availabilityMatchesDay(artifactPlan.availability, input.today),
  }));
}

export function buildCraftingPlannerRecommendations(craftingPlan: PlannerOutput["craftingPlan"]): PlannerRecommendation[] {
  return craftingPlan.suggestions.map((suggestion) => ({
    id: `recommendation-crafting-${suggestion.outputMaterialKey}`,
    title: `Craft ${suggestion.outputDisplayName}`,
    category: "crafting",
    actionGroup: "crafting",
    priority: 40 + suggestion.missingQuantityCovered,
    availability: "ALWAYS",
    resinCost: 0,
    resinPerRun: null,
    totalEstimatedResin: null,
    resinLabel: "No resin",
    relatedGoalKeys: [suggestion.outputMaterialKey],
    relatedGoalLabels: [suggestion.outputDisplayName],
    priorityLabel: "Optional",
    requiredMaterials: Object.entries(suggestion.ingredientsConsumed).map(([materialId, quantity]) => ({
      materialId,
      quantity,
    })),
    expectedRewards: [
      {
        materialId: suggestion.outputMaterialKey,
        quantity: suggestion.craftableQuantity,
      },
    ],
    reason: suggestion.reason,
    blockedBy: [],
    isAvailableToday: true,
  }));
}

export function buildWeaponExpRecommendation(
  summary: WeaponExpPlannerSummary,
  relatedGoals: Array<{ key: string; label: string }>,
): PlannerRecommendation[] {
  if (summary.totalWeaponExpNeeded <= 0 || summary.remainingWeaponExpAfterOwnedOre <= 0) {
    return [];
  }

  const relatedGoalKeys = relatedGoals.map((goal) => goal.key);
  const relatedGoalLabels = relatedGoals.map((goal) => goal.label);

  return [
    {
      id: "recommendation-weapon-exp-forging",
      title: "Forge Mystic Enhancement Ore",
      category: "forging",
      actionGroup: "time_gated_non_resin",
      actionSubgroup: "forging",
      priority: 50 + summary.mysticEquivalentNeeded,
      availability: "ALWAYS",
      sourceName: "Mystic Enhancement Ore forging",
      resinCost: 0,
      resinPerRun: null,
      totalEstimatedResin: null,
    resinLabel: "No resin",
    estimatedRuns: summary.minimumDailyResetsRequired,
    actionableRuns: summary.minimumDailyResetsRequired,
    estimatedDaysNaturalResin: null,
    estimatedWeeksNaturalResin: null,
    relatedGoalKeys,
    relatedGoalLabels,
      priorityLabel: getPlannerPriorityLabel(50 + summary.mysticEquivalentNeeded, []),
      requiredMaterials: [
        { materialId: "MysticEnhancementOre", quantity: summary.mysticEquivalentNeeded },
      ],
      expectedRewards: [{ materialId: "MysticEnhancementOre", quantity: Math.min(summary.mysticEquivalentNeeded, summary.mysticForgeableFromCrystals) }],
      reason: `Need ${summary.remainingWeaponExpAfterOwnedOre.toLocaleString()} Weapon EXP after owned ore, or about ${summary.mysticEquivalentNeeded.toLocaleString()} Mystic Enhancement Ore. Forge up to ${summary.dailyMysticForgeCap} Mystic per daily reset from supported crystals. ${summary.remainingMysticEquivalentUnforgeable > 0 ? `${summary.remainingMysticEquivalentUnforgeable.toLocaleString()} Mystic-equivalent still remains after current crystals.` : "Current crystals can cover the full remaining equivalent."}`,
      blockedBy: [],
      isAvailableToday: true,
      warnings: [],
      estimateBasis: "Daily forging cap and owned crystal conversion",
      dataQuality: "exact",
    },
  ];
}

function estimateResinFromFarming(farmingEstimates: FarmingEstimateDetail[]): number {
  return farmingEstimates.reduce((sum, estimate) => sum + (estimate.estimatedResin ?? 0), 0);
}

function groupRecommendationsBySource(recommendations: PlannerRecommendation[]): RecommendationGroup[] {
  const grouped = new Map<string, PlannerRecommendation[]>();

  for (const recommendation of recommendations) {
    const key = recommendation.sourceName ?? recommendation.category;
    grouped.set(key, [...(grouped.get(key) ?? []), recommendation]);
  }

  return [...grouped.entries()]
    .map(([key, rows]) => ({
      key,
      label: key,
      rows: sortRecommendations(rows),
    }))
    .sort((left, right) => actionGroupRank(left.rows[0]?.actionGroup ?? "passive_incidental") - actionGroupRank(right.rows[0]?.actionGroup ?? "passive_incidental") || right.rows.length - left.rows.length || left.label.localeCompare(right.label));
}

function buildRecommendationSections(recommendations: PlannerRecommendation[]): PlannerRecommendationSection[] {
  const groups: PlannerRecommendationSection[] = [
    {
      key: "resin_gated",
      label: "Resin Activities",
      rows: recommendations.filter((row) => row.actionGroup === "resin_gated"),
    },
    {
      key: "weekly_resin",
      label: "Weekly Resin Activities",
      rows: recommendations.filter((row) => row.actionSubgroup === "weekly_resin"),
    },
    {
      key: "domains",
      label: "Domains",
      rows: recommendations.filter((row) => row.actionSubgroup === "domains"),
    },
    {
      key: "bosses",
      label: "Bosses",
      rows: recommendations.filter((row) => row.actionSubgroup === "bosses"),
    },
    {
      key: "ley_lines",
      label: "Ley Lines",
      rows: recommendations.filter((row) => row.actionSubgroup === "ley_lines"),
    },
    {
      key: "crafting",
      label: "Crafting / Conversion",
      rows: recommendations.filter((row) => row.actionGroup === "crafting"),
    },
    {
      key: "ley_line_enemy_drops",
      label: "Ley Line Enemy Drop Recommendations",
      rows: recommendations.filter((row) => row.actionSubgroup === "ley_line_enemy_drops"),
    },
    {
      key: "open_world",
      label: "Open-World Enemy Farming",
      rows: recommendations.filter(
        (row) => row.actionGroup === "open_world" && row.actionSubgroup !== "local_specialty" && row.actionSubgroup !== "ley_line_enemy_drops",
      ),
    },
    {
      key: "local_specialty",
      label: "Local Specialties",
      rows: recommendations.filter((row) => row.actionSubgroup === "local_specialty"),
    },
    {
      key: "passive_incidental",
      label: "Passive / Incidental Sources",
      rows: recommendations.filter((row) => row.actionGroup === "passive_incidental" && row.actionSubgroup !== "unknown_estimates"),
    },
    {
      key: "unknown_estimates",
      label: "Unknown / Missing Estimate Data",
      rows: recommendations.filter((row) => row.actionSubgroup === "unknown_estimates"),
    },
    {
      key: "forging",
      label: "Forging",
      rows: recommendations.filter(
        (row) => row.actionSubgroup === "forging" || row.actionGroup === "time_gated_non_resin",
      ),
    },
  ];

  return groups
    .map((group) => ({
      ...group,
      rows: sortRecommendations(group.rows),
    }))
    .filter((group) => group.rows.length > 0);
}

function buildPlannerGoalFromCharacter(
  characterGoal: CharacterGoal,
  plan: CharacterPlan | undefined,
  ownership: AccountOwnershipState,
  staticData: StaticGameData,
): PlannerGoal {
  const resolvedCurrent = resolveCharacterGoalCurrentState(characterGoal, ownership);
  const current = resolvedCurrent.state;
  const currentSummary = `Lv ${current.currentLevel} / A${current.currentAscension} / ${current.currentTalents.normal}-${current.currentTalents.skill}-${current.currentTalents.burst}`;
  const targetSummary = [
    characterGoal.targetLevel ? `Lv ${characterGoal.targetLevel}` : null,
    typeof characterGoal.targetAscension === "number" ? `A${characterGoal.targetAscension}` : null,
    characterGoal.talents
      ? `Talents ${characterGoal.talents.auto ?? "•"}/${characterGoal.talents.skill ?? "•"}/${characterGoal.talents.burst ?? "•"}`
      : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    id: characterGoal.characterKey,
    goalType: "character",
    entityKey: characterGoal.characterKey,
    label:
      getCharacterGoalDisplayName(characterGoal.characterKey, staticData),
    planningMode: characterGoal.planningMode,
    currentSummary,
    currentSource: getGoalCurrentStateLabel(resolvedCurrent.source),
    targetSummary: targetSummary || "Current",
    enabled: isCharacterGoalPlannerActive(characterGoal),
    priority: characterGoal.priority,
    shortageCount: plan?.missingSummary.length ?? 0,
    estimatedResin: plan?.estimatedResin ?? 0,
    warningCount: plan?.warnings.length ?? 0,
    notes: characterGoal.notes,
  };
}

function buildPlannerGoalFromWeapon(
  weaponGoal: WeaponGoal,
  plan: WeaponPlan | undefined,
  ownership: AccountOwnershipState,
  staticData: StaticGameData,
): PlannerGoal {
  const resolvedCurrent = resolveWeaponGoalCurrentState(weaponGoal, ownership);
  const current = resolvedCurrent.state;
  const linkedInventoryInstanceId = getLinkedWeaponInstanceId(weaponGoal);
  const targetAscensionPhase = getWeaponGoalTargetAscension(weaponGoal);
  const currentSummary = `Lv ${current.currentLevel} / A${current.currentAscension}`;
  const targetSummary = [
    weaponGoal.targetLevel ? `Lv ${weaponGoal.targetLevel}` : null,
    typeof targetAscensionPhase === "number" ? `A${targetAscensionPhase}` : null,
    linkedInventoryInstanceId ? `Linked ${linkedInventoryInstanceId}` : null,
    weaponGoal.linkStatus === "stale" ? "Link missing" : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    id: getWeaponGoalId(weaponGoal, weaponGoal.weaponKey),
    goalType: "weapon",
    entityKey: weaponGoal.weaponKey,
    label: getWeaponGoalDisplayName(weaponGoal.weaponKey, staticData),
    planningMode: weaponGoal.planningMode,
    currentSummary,
    currentSource: getGoalCurrentStateLabel(resolvedCurrent.source),
    targetSummary: targetSummary || "Current",
    enabled: isWeaponGoalPlannerActive(weaponGoal),
    priority: weaponGoal.priority,
    shortageCount: plan?.missingSummary.length ?? 0,
    estimatedResin: plan?.estimatedResin ?? 0,
    warningCount: plan?.warnings.length ?? 0,
    notes: weaponGoal.notes,
  };
}

function buildPlannerGoalFromArtifact(
  goal: ArtifactGoal,
  plan: ArtifactFarmPlan | undefined,
  staticData: StaticGameData,
): PlannerGoal {
  return {
    id: goal.id,
    goalType: "artifact",
    entityKey: goal.domainKey,
    label: getArtifactGoalDisplayName(goal, staticData),
    currentSummary: plan?.domainName ?? (goal.domainKey || "No domain"),
    targetSummary: getArtifactGoalSubtitle(goal, staticData) || "No sets",
    enabled: goal.enabled,
    priority: goal.priority,
    shortageCount: 0,
    estimatedResin: goal.weeklyResinBudget ?? 0,
    warningCount: 0,
    notes: goal.notes,
  };
}

export function buildPlannerGoals(params: {
  ownership: AccountOwnershipState;
  goals: KrumpanionGoals;
  staticData: StaticGameData;
  byCharacter: CharacterPlan[];
  byWeapon: WeaponPlan[];
  artifactFarmGoals: ArtifactFarmPlan[];
}): { plannerGoals: PlannerGoal[]; plannerGoalGroups: PlannerGoalGroup[] } {
  const characterPlansByKey = new Map(params.byCharacter.map((plan) => [plan.characterKey, plan]));
  const weaponPlansById = new Map(params.byWeapon.map((plan) => [plan.weaponId, plan]));
  const artifactPlansById = new Map(params.artifactFarmGoals.map((plan) => [plan.id, plan]));

  const plannerGoals = [
    ...Object.values(params.goals.characterGoals)
      .filter((goal) => isCharacterGoalPlannerActive(goal))
      .map((goal) => buildPlannerGoalFromCharacter(goal, characterPlansByKey.get(goal.characterKey), params.ownership, params.staticData)),
    ...Object.values(params.goals.weaponGoals)
      .filter((goal) => isWeaponGoalPlannerActive(goal))
      .map((goal) =>
        buildPlannerGoalFromWeapon(
          goal,
          weaponPlansById.get(getWeaponGoalId(goal, goal.weaponKey)),
          params.ownership,
          params.staticData,
        ),
      ),
    ...params.goals.artifactGoals
      .filter((goal) => goal.enabled)
      .map((goal) => buildPlannerGoalFromArtifact(goal, artifactPlansById.get(goal.id), params.staticData)),
  ].sort((left, right) => right.priority - left.priority || left.label.localeCompare(right.label));

  const plannerGoalGroups: PlannerGoalGroup[] = [
    { key: "all", label: "All Goals", goals: plannerGoals },
    { key: "character", label: "Characters", goals: plannerGoals.filter((goal) => goal.goalType === "character") },
    { key: "weapon", label: "Weapons", goals: plannerGoals.filter((goal) => goal.goalType === "weapon") },
    { key: "artifact", label: "Artifacts", goals: plannerGoals.filter((goal) => goal.goalType === "artifact") },
  ];

  return { plannerGoals, plannerGoalGroups };
}

export function enrichGoalResolutions(params: {
  goalResolutions: GoalResolutionItem[];
  materialRows: MaterialNeedRow[];
  farmingEstimates: FarmingEstimateDetail[];
}): { byCharacter: CharacterPlan[]; byWeapon: WeaponPlan[] } {
  const rowsByMaterialKey = new Map(params.materialRows.map((row) => [row.materialKey, row]));
  const withSummaries = <T extends GoalResolutionItem>(plans: T[]): T[] =>
    plans.map((plan) => {
      const summary = Object.keys(plan.missingByMaterial)
        .map((key) => rowsByMaterialKey.get(key))
        .filter((row): row is MaterialNeedRow => Boolean(row));
      const estimatedResin = estimateResinFromFarming(
        params.farmingEstimates.filter((estimate) => estimate.relatedGoalKeys.includes(plan.goalKey)),
      );

      return {
        ...plan,
        missingSummary: summary,
        estimatedResin,
      };
    });

  const byCharacter = withSummaries(
    params.goalResolutions.filter((plan): plan is CharacterPlan => plan.goalType === "character"),
  );
  const byWeapon = withSummaries(
    params.goalResolutions.filter((plan): plan is WeaponPlan => plan.goalType === "weapon"),
  );

  return { byCharacter, byWeapon };
}

export function buildPlannerWarnings(
  baseWarnings: PlannerWarning[],
  materialWarnings: PlannerWarning[],
  estimateWarnings: PlannerWarning[],
  craftingWarnings: string[],
): PlannerWarning[] {
  return [
    ...baseWarnings,
    ...materialWarnings,
    ...estimateWarnings,
    ...craftingWarnings.map((warning) => ({
      type: "migration_notice" as const,
      message: warning,
    })),
  ];
}

export function buildReportSections(recommendations: PlannerRecommendation[]) {
  return {
    byAvailability: groupByAvailability(recommendations),
    bySource: groupRecommendationsBySource(recommendations),
    today: recommendations.filter(
      (row) => row.isAvailableToday || row.availability === "ALWAYS" || row.availability === "WEEKLY",
    ),
    recommendationSections: buildRecommendationSections(recommendations),
  };
}

export function buildResinSummary(params: {
  farmingEstimates: FarmingEstimateDetail[];
  dailyResinBudget: number;
  naturalResinPerWeek: number;
  weeklyResinBudget: number;
  artifactBudget: number;
  progressionMora: number;
  craftingMora: number;
}): PlannerOutput["resinSummary"] {
  const totalEstimatedResin = estimateResinFromFarming(params.farmingEstimates);
  return {
    progressionMora: params.progressionMora,
    craftingMora: params.craftingMora,
    totalMora: params.progressionMora + params.craftingMora,
    totalEstimatedResin,
    totalEstimatedNaturalResinDays: totalEstimatedResin / params.dailyResinBudget,
    totalEstimatedNaturalResinWeeks: totalEstimatedResin / params.naturalResinPerWeek,
    weeklyGatedEstimateCount: params.farmingEstimates.filter((estimate) => estimate.weeklyGate?.isWeeklyGated).length,
    resinGatedEstimateCount: params.farmingEstimates.filter((estimate) => estimate.estimatedResin !== null).length,
    openWorldEstimateCount: params.farmingEstimates.filter((estimate) => estimate.sourceType === "open_world_enemy").length,
    noResinTaskCount: params.farmingEstimates.filter((estimate) => estimate.estimatedResin === null && estimate.sourceType !== "unknown").length,
    unknownEstimateCount: params.farmingEstimates.filter((estimate) => estimate.sourceType === "unknown").length,
    dailyResinBudget: params.dailyResinBudget,
    weeklyResinBudget: params.weeklyResinBudget,
    artifactBudget: params.artifactBudget,
  };
}
