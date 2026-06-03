import type { AccountInventoryState } from "../account/types";
import { getGoalDisplayName } from "../goals/goalDisplay";
import type { KrumpanionGoals } from "../goals/types";
import type {
  EliteEnemyDropFamily,
  GeneralEnemyDropFamily,
  StaticGameData,
} from "../staticData/types";
import type {
  LeyLineEnemyDropLocationRecommendation,
  LeyLineEnemyDropMatchedFamilySummary,
  LeyLineEnemyDropNationMatchSummary,
  LeyLineEnemyDropRegionRecommendation,
  MaterialNeedRow,
  PlannerRecommendation,
} from "./types";

interface FamilyDeficitGroup {
  familyKey: string;
  familyDisplayName: string;
  rows: MaterialNeedRow[];
}

interface FamilyQuantitySummary extends LeyLineEnemyDropMatchedFamilySummary {
  materialKeys: string[];
}

interface ScoredLocationRecommendation extends LeyLineEnemyDropLocationRecommendation {
  _score: [number, number, number, number, number, number];
}

interface NationMatchSummaryWithRegion extends LeyLineEnemyDropNationMatchSummary {
  coveredMaterialKeys: string[];
  affectedGoalLabels: string[];
  locations: Array<{
    locationKey: string;
    areaName: string;
    locationNumber: number;
  }>;
}

interface ScoredNationMatchSummary extends NationMatchSummaryWithRegion {
  _score: [number, number, number, number];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isEnemyDropRow(row: MaterialNeedRow): boolean {
  return (row.category === "general_enemy_drop" || row.category === "elite_enemy_drop") && row.missing > 0 && !!row.familyId;
}

function getFamilyRecord(
  staticData: StaticGameData,
  familyKey: string,
): GeneralEnemyDropFamily | EliteEnemyDropFamily | null {
  return staticData.generalEnemyDropFamilies[familyKey] ?? staticData.eliteEnemyDropFamilies[familyKey] ?? null;
}

function getFamilyMaterialKeys(staticData: StaticGameData, familyKey: string): string[] {
  return getFamilyRecord(staticData, familyKey)?.materialKeys ?? [];
}

function getFamilyDisplayName(staticData: StaticGameData, familyKey: string): string {
  return getFamilyRecord(staticData, familyKey)?.displayName ?? familyKey;
}

function buildFamilyDeficitGroups(materialRows: MaterialNeedRow[]): FamilyDeficitGroup[] {
  const groups = new Map<string, FamilyDeficitGroup>();
  for (const row of materialRows.filter(isEnemyDropRow)) {
    const familyKey = row.familyId as string;
    const existing = groups.get(familyKey) ?? {
      familyKey,
      familyDisplayName: row.familyDisplayName ?? row.sourceEnemyFamily ?? familyKey,
      rows: [],
    };
    existing.rows.push(row);
    groups.set(familyKey, existing);
  }

  return [...groups.values()].sort(
    (left, right) =>
      right.rows.reduce((sum, row) => sum + row.missing, 0) - left.rows.reduce((sum, row) => sum + row.missing, 0) ||
      left.familyDisplayName.localeCompare(right.familyDisplayName),
  );
}

function buildLocationRecommendations(
  familyKey: string,
  allMissingFamilyKeys: Set<string>,
  group: FamilyDeficitGroup,
  staticData: StaticGameData,
): LeyLineEnemyDropLocationRecommendation[] {
  const rowsByMaterial = new Map(group.rows.map((row) => [row.materialKey, row]));

  const recommendations: ScoredLocationRecommendation[] = staticData.leyLineOutcropLocationList.flatMap((location) => {
    const targetCoverage = location.derivedDropFamilies.find((coverage) => coverage.familyKey === familyKey);
    if (!targetCoverage) {
      return [];
    }

    const uniqueMissingFamiliesCovered = unique(
      location.derivedDropFamilies.map((coverage) => coverage.familyKey).filter((key) => allMissingFamilyKeys.has(key)),
    ).length;
    const deficitCovered = targetCoverage.materialKeys.reduce(
      (sum, materialKey) => sum + (rowsByMaterial.get(materialKey)?.missing ?? 0),
      0,
    );
    const missingMaterialsCovered = targetCoverage.materialKeys.filter((materialKey) => rowsByMaterial.has(materialKey)).length;
    const goalsCovered = unique(
      targetCoverage.materialKeys.flatMap((materialKey) => (rowsByMaterial.get(materialKey)?.usedBy ?? []).map((usage) => usage.key)),
    ).length;
    const isOptionalOnly = targetCoverage.totalGuaranteedEnemyCount <= 0 && targetCoverage.optionalNearbyEnemySpawns.length > 0;

    return [{
      locationKey: location.locationKey,
      region: location.region,
      areaName: location.areaName,
      locationNumber: location.locationNumber,
      totalGuaranteedEnemyCount: targetCoverage.totalGuaranteedEnemyCount,
      guaranteedEnemySpawns: targetCoverage.guaranteedEnemySpawns,
      optionalNearbyEnemySpawns: targetCoverage.optionalNearbyEnemySpawns,
      coveredFamilyKeys: location.derivedDropFamilies.map((coverage) => coverage.familyKey),
      notes: targetCoverage.notes,
      isOptionalOnly,
      _score: [
        deficitCovered,
        missingMaterialsCovered,
        goalsCovered,
        targetCoverage.totalGuaranteedEnemyCount,
        uniqueMissingFamiliesCovered,
        isOptionalOnly ? 0 : 1,
      ],
    }];
  });

  const sortedRecommendations = recommendations
    .sort((left, right) => {
      for (let index = 0; index < left._score.length; index += 1) {
        const delta = right._score[index] - left._score[index];
        if (delta !== 0) {
          return delta;
        }
      }

      return (
        left.region.localeCompare(right.region) ||
        left.areaName.localeCompare(right.areaName) ||
        left.locationNumber - right.locationNumber
      );
    })
    .map((recommendation) => {
      const { _score, ...locationRecommendation } = recommendation;
      void _score;
      return locationRecommendation;
    });

  const hasGuaranteed = sortedRecommendations.some((recommendation) => !recommendation.isOptionalOnly);
  return hasGuaranteed ? sortedRecommendations : sortedRecommendations.filter((recommendation) => recommendation.isOptionalOnly);
}

function buildFamilyWarnings(familyKey: string, locations: LeyLineEnemyDropLocationRecommendation[]): string[] {
  const warnings: string[] = [];
  if (familyKey === "fungus_materials") {
    warnings.push(
      "Fungi drops depend on whether enemies are activated or scorched. Use Electro/Pyro carefully if farming standard fungal spores.",
    );
  }
  if (familyKey === "state_shifted_fungus_materials") {
    warnings.push(
      "Fungal nucleus drops depend on activated or scorched combat states. Treat these recommendations as combat-state dependent.",
    );
  }
  if (locations.length === 0) {
    warnings.push("No Ley Line enemy-spawn recommendation is currently available for this material family.");
  }
  return warnings;
}

function buildMatchedFamilySummary(
  staticData: StaticGameData,
  familyKey: string,
  quantity: number,
): FamilyQuantitySummary {
  return {
    familyKey,
    familyDisplayName: getFamilyDisplayName(staticData, familyKey),
    quantity,
    materialKeys: getFamilyMaterialKeys(staticData, familyKey),
  };
}

function buildRegionAggregateFromMatchedFamilies(params: {
  staticData: StaticGameData;
  region: string;
  matchedFamilies: FamilyQuantitySummary[];
  affectedGoalLabels: string[];
  averageOwnedQuantity: number | null;
}): NationMatchSummaryWithRegion {
  const matchedFamilyKeys = new Set(params.matchedFamilies.map((family) => family.familyKey));
  const relevantLocations = params.staticData.leyLineOutcropLocationList
    .filter((location) => location.region === params.region)
    .map((location) => {
      const relevantCoverages = location.derivedDropFamilies.filter((coverage) => matchedFamilyKeys.has(coverage.familyKey));
      if (relevantCoverages.length === 0) {
        return null;
      }

      const totalGuaranteedEnemyCount = relevantCoverages.reduce((sum, coverage) => sum + coverage.totalGuaranteedEnemyCount, 0);
      return {
        locationKey: location.locationKey,
        areaName: location.areaName,
        locationNumber: location.locationNumber,
        totalGuaranteedEnemyCount,
        isOptionalOnly:
          totalGuaranteedEnemyCount <= 0 && relevantCoverages.some((coverage) => coverage.optionalNearbyEnemySpawns.length > 0),
        coveredFamilies: relevantCoverages,
      };
    })
    .filter((location): location is NonNullable<typeof location> => location !== null);

  const coveredMaterialKeys = unique(
    relevantLocations.flatMap((location) => location.coveredFamilies.flatMap((coverage) => coverage.materialKeys)),
  ).sort();

  return {
    region: params.region,
    matchedFamilies: params.matchedFamilies.map((family) => ({
      familyKey: family.familyKey,
      familyDisplayName: family.familyDisplayName,
      quantity: family.quantity,
    })),
    totalMatchedQuantity: params.matchedFamilies.reduce((sum, family) => sum + family.quantity, 0),
    totalRelevantFamilyCoverage: matchedFamilyKeys.size,
    averageOwnedQuantity: params.averageOwnedQuantity,
    locationCount: relevantLocations.length,
    optionalOnlyLocationCount: relevantLocations.filter((location) => location.isOptionalOnly).length,
    totalGuaranteedEnemyCount: relevantLocations.reduce((sum, location) => sum + location.totalGuaranteedEnemyCount, 0),
    coveredMaterialKeys,
    affectedGoalLabels: params.affectedGoalLabels,
    locations: relevantLocations
      .map((location) => ({
        locationKey: location.locationKey,
        areaName: location.areaName,
        locationNumber: location.locationNumber,
      }))
      .sort((left, right) => left.areaName.localeCompare(right.areaName) || left.locationNumber - right.locationNumber),
  };
}

function buildRegionRecommendations(
  summaries: NationMatchSummaryWithRegion[],
): LeyLineEnemyDropRegionRecommendation[] {
  return summaries.map((summary) => ({
    region: summary.region,
    totalGuaranteedEnemyCount: summary.totalGuaranteedEnemyCount,
    locationCount: summary.locationCount,
    optionalOnlyLocationCount: summary.optionalOnlyLocationCount,
    coveredFamilyKeys: summary.matchedFamilies.map((family) => family.familyKey).sort(),
    coveredMaterialKeys: summary.coveredMaterialKeys,
    affectedGoalLabels: summary.affectedGoalLabels,
    locations: summary.locations,
  }));
}

function buildDeficitNationSummaries(params: {
  staticData: StaticGameData;
  familyQuantities: FamilyQuantitySummary[];
  affectedGoalLabels: string[];
}): NationMatchSummaryWithRegion[] {
  const familyQuantityByKey = new Map(params.familyQuantities.map((family) => [family.familyKey, family]));
  const summaries: ScoredNationMatchSummary[] = params.staticData.leyLineNationCoverageList
    .filter((nation) => nation.enabledForRecommendations)
    .flatMap((nation) => {
      const matchedFamilies = nation.familyKeys
        .map((familyKey) => familyQuantityByKey.get(familyKey))
        .filter((family): family is FamilyQuantitySummary => family != null);

      if (matchedFamilies.length === 0) {
        return [];
      }

      const aggregate = buildRegionAggregateFromMatchedFamilies({
        staticData: params.staticData,
        region: nation.displayName,
        matchedFamilies,
        affectedGoalLabels: params.affectedGoalLabels,
        averageOwnedQuantity: null,
      });

      return [{
        ...aggregate,
        _score: [
          aggregate.totalMatchedQuantity,
          aggregate.matchedFamilies.length,
          aggregate.totalGuaranteedEnemyCount,
          aggregate.locationCount,
        ],
      }];
    });

  return summaries
    .sort((left, right) => {
      for (let index = 0; index < left._score.length; index += 1) {
        const delta = right._score[index] - left._score[index];
        if (delta !== 0) {
          return delta;
        }
      }

      return left.region.localeCompare(right.region);
    })
    .map((summary) => {
      const { _score, ...regionSummary } = summary;
      void _score;
      return regionSummary;
    });
}

function buildOverallLocationRecommendations(params: {
  familyQuantities: FamilyQuantitySummary[];
  staticData: StaticGameData;
}): LeyLineEnemyDropLocationRecommendation[] {
  const quantityByFamilyKey = new Map(params.familyQuantities.map((family) => [family.familyKey, family.quantity]));
  const recommendations: ScoredLocationRecommendation[] = params.staticData.leyLineOutcropLocationList.flatMap((location) => {
    const relevantCoverages = location.derivedDropFamilies.filter((coverage) => quantityByFamilyKey.has(coverage.familyKey));
    if (relevantCoverages.length === 0) {
      return [];
    }

    const totalGuaranteedEnemyCount = relevantCoverages.reduce((sum, coverage) => sum + coverage.totalGuaranteedEnemyCount, 0);
    const coveredFamilyKeys = unique(relevantCoverages.map((coverage) => coverage.familyKey)).sort();
    const weightedQuantity = coveredFamilyKeys.reduce((sum, familyKey) => sum + (quantityByFamilyKey.get(familyKey) ?? 0), 0);
    const coveredMaterialCount = unique(relevantCoverages.flatMap((coverage) => coverage.materialKeys)).length;
    const isOptionalOnly =
      totalGuaranteedEnemyCount <= 0 && relevantCoverages.some((coverage) => coverage.optionalNearbyEnemySpawns.length > 0);

    return [{
      locationKey: location.locationKey,
      region: location.region,
      areaName: location.areaName,
      locationNumber: location.locationNumber,
      totalGuaranteedEnemyCount,
      guaranteedEnemySpawns: relevantCoverages.flatMap((coverage) => coverage.guaranteedEnemySpawns),
      optionalNearbyEnemySpawns: relevantCoverages.flatMap((coverage) => coverage.optionalNearbyEnemySpawns),
      coveredFamilyKeys,
      notes: unique(relevantCoverages.flatMap((coverage) => coverage.notes ?? [])),
      isOptionalOnly,
      _score: [
        weightedQuantity,
        coveredMaterialCount,
        coveredFamilyKeys.length,
        totalGuaranteedEnemyCount,
        relevantCoverages.length,
        isOptionalOnly ? 0 : 1,
      ],
    }];
  });

  const sortedRecommendations = recommendations
    .sort((left, right) => {
      for (let index = 0; index < left._score.length; index += 1) {
        const delta = right._score[index] - left._score[index];
        if (delta !== 0) {
          return delta;
        }
      }

      return (
        left.region.localeCompare(right.region) ||
        left.areaName.localeCompare(right.areaName) ||
        left.locationNumber - right.locationNumber
      );
    })
    .map((recommendation) => {
      const { _score, ...locationRecommendation } = recommendation;
      void _score;
      return locationRecommendation;
    });

  const hasGuaranteed = sortedRecommendations.some((recommendation) => !recommendation.isOptionalOnly);
  return hasGuaranteed ? sortedRecommendations : sortedRecommendations.filter((recommendation) => recommendation.isOptionalOnly);
}

function buildOwnedEnemyFamilyTotals(
  inventory: AccountInventoryState,
  staticData: StaticGameData,
): FamilyQuantitySummary[] {
  const liveFamilyKeys = new Set(
    staticData.leyLineNationCoverageList
      .filter((nation) => nation.enabledForRecommendations)
      .flatMap((nation) => nation.familyKeys),
  );

  const familyEntries = [
    ...Object.values(staticData.generalEnemyDropFamilies),
    ...Object.values(staticData.eliteEnemyDropFamilies),
  ]
    .filter((family) => liveFamilyKeys.has(family.familyId))
    .map((family) => {
      const quantity = family.materialKeys.reduce((sum, materialKey) => sum + Math.max(0, inventory[materialKey] ?? 0), 0);
      return {
        familyKey: family.familyId,
        familyDisplayName: family.displayName,
        quantity,
        materialKeys: [...family.materialKeys],
      } satisfies FamilyQuantitySummary;
    })
    .sort((left, right) => left.quantity - right.quantity || left.familyDisplayName.localeCompare(right.familyDisplayName));

  return familyEntries;
}

function buildStockpileNationSummaries(params: {
  staticData: StaticGameData;
  lowStockFamilies: FamilyQuantitySummary[];
}): NationMatchSummaryWithRegion[] {
  const familyByKey = new Map(params.lowStockFamilies.map((family) => [family.familyKey, family]));
  const weightByFamilyKey = new Map(params.lowStockFamilies.map((family, index) => [family.familyKey, params.lowStockFamilies.length - index]));
  const summaries: ScoredNationMatchSummary[] = params.staticData.leyLineNationCoverageList
    .filter((nation) => nation.enabledForRecommendations)
    .flatMap((nation) => {
      const matchedFamilies = nation.familyKeys
        .map((familyKey) => familyByKey.get(familyKey))
        .filter((family): family is FamilyQuantitySummary => family != null);

      if (matchedFamilies.length === 0) {
        return [];
      }

      const aggregate = buildRegionAggregateFromMatchedFamilies({
        staticData: params.staticData,
        region: nation.displayName,
        matchedFamilies,
        affectedGoalLabels: [],
        averageOwnedQuantity:
          matchedFamilies.length > 0
            ? matchedFamilies.reduce((sum, family) => sum + family.quantity, 0) / matchedFamilies.length
            : null,
      });

      const weightedCoverage = matchedFamilies.reduce((sum, family) => sum + (weightByFamilyKey.get(family.familyKey) ?? 0), 0);

      return [{
        ...aggregate,
        _score: [
          weightedCoverage,
          aggregate.averageOwnedQuantity == null ? 0 : -aggregate.averageOwnedQuantity,
          aggregate.totalRelevantFamilyCoverage,
          aggregate.totalGuaranteedEnemyCount,
        ],
      }];
    });

  return summaries
    .sort((left, right) => {
      for (let index = 0; index < left._score.length; index += 1) {
        const delta = right._score[index] - left._score[index];
        if (delta !== 0) {
          return delta;
        }
      }

      return left.region.localeCompare(right.region);
    })
    .map((summary) => {
      const { _score, ...regionSummary } = summary;
      void _score;
      return regionSummary;
    });
}

function buildStockpileLocationRecommendations(params: {
  staticData: StaticGameData;
  lowStockFamilies: FamilyQuantitySummary[];
}): LeyLineEnemyDropLocationRecommendation[] {
  const familyByKey = new Map(params.lowStockFamilies.map((family) => [family.familyKey, family]));
  const weightByFamilyKey = new Map(params.lowStockFamilies.map((family, index) => [family.familyKey, params.lowStockFamilies.length - index]));
  const recommendations: ScoredLocationRecommendation[] = params.staticData.leyLineOutcropLocationList.flatMap((location) => {
    const relevantCoverages = location.derivedDropFamilies.filter((coverage) => familyByKey.has(coverage.familyKey));
    if (relevantCoverages.length === 0) {
      return [];
    }

    const coveredFamilyKeys = unique(relevantCoverages.map((coverage) => coverage.familyKey)).sort();
    const totalGuaranteedEnemyCount = relevantCoverages.reduce((sum, coverage) => sum + coverage.totalGuaranteedEnemyCount, 0);
    const weightedCoverage = coveredFamilyKeys.reduce((sum, familyKey) => sum + (weightByFamilyKey.get(familyKey) ?? 0), 0);
    const averageOwnedQuantity =
      coveredFamilyKeys.reduce((sum, familyKey) => sum + (familyByKey.get(familyKey)?.quantity ?? 0), 0) / coveredFamilyKeys.length;
    const isOptionalOnly =
      totalGuaranteedEnemyCount <= 0 && relevantCoverages.some((coverage) => coverage.optionalNearbyEnemySpawns.length > 0);

    return [{
      locationKey: location.locationKey,
      region: location.region,
      areaName: location.areaName,
      locationNumber: location.locationNumber,
      totalGuaranteedEnemyCount,
      guaranteedEnemySpawns: relevantCoverages.flatMap((coverage) => coverage.guaranteedEnemySpawns),
      optionalNearbyEnemySpawns: relevantCoverages.flatMap((coverage) => coverage.optionalNearbyEnemySpawns),
      coveredFamilyKeys,
      notes: unique(relevantCoverages.flatMap((coverage) => coverage.notes ?? [])),
      isOptionalOnly,
      _score: [
        weightedCoverage,
        -averageOwnedQuantity,
        coveredFamilyKeys.length,
        totalGuaranteedEnemyCount,
        relevantCoverages.length,
        isOptionalOnly ? 0 : 1,
      ],
    }];
  });

  const sortedRecommendations = recommendations
    .sort((left, right) => {
      for (let index = 0; index < left._score.length; index += 1) {
        const delta = right._score[index] - left._score[index];
        if (delta !== 0) {
          return delta;
        }
      }

      return (
        left.region.localeCompare(right.region) ||
        left.areaName.localeCompare(right.areaName) ||
        left.locationNumber - right.locationNumber
      );
    })
    .map((recommendation) => {
      const { _score, ...locationRecommendation } = recommendation;
      void _score;
      return locationRecommendation;
    });

  const hasGuaranteed = sortedRecommendations.some((recommendation) => !recommendation.isOptionalOnly);
  return hasGuaranteed ? sortedRecommendations : sortedRecommendations.filter((recommendation) => recommendation.isOptionalOnly);
}

function buildNoInventoryStockpileRecommendation(): PlannerRecommendation {
  const message = "Stockpile recommendations need active account inventory data before Krumpanion can rank Ley Line nations.";

  return {
    id: "recommendation-ley-line-enemy-stockpile-no-data",
    title: "Stockpile guidance unavailable",
    category: "custom",
    actionGroup: "open_world",
    actionSubgroup: "ley_line_enemy_drops",
    priority: 0,
    availability: "ALWAYS",
    sourceName: "Stockpile guidance unavailable",
    resinCost: 0,
    resinPerRun: null,
    totalEstimatedResin: null,
    resinLabel: "No resin",
    relatedGoalKeys: [],
    relatedGoalLabels: [],
    priorityLabel: "Blocked",
    requiredMaterials: [],
    reason: message,
    blockedBy: [message],
    isAvailableToday: true,
    warnings: [message],
    estimateBasis: "Inventory maintenance mode requires imported or manually tracked enemy-drop inventory totals",
    dataQuality: "exact",
    leyLineEnemyDropDetails: {
      mode: "stockpile",
      modeLabel: "Stockpile recommendation based on lowest inventory",
      quantityContext: "owned",
      familyKey: "__stockpile__",
      familyDisplayName: "Stockpile priorities",
      materialChain: [],
      bestRegion: null,
      matchedFamilies: [],
      nationMatchSummaries: [],
      regionRecommendations: [],
      locationRecommendations: [],
      emptyStateMessage: message,
      incidentalDropNote:
        "Enemy drops are incidental combat drops from Ley Line enemies. Resin rewards from Ley Lines are Mora or Character EXP books.",
    },
  };
}

export function buildLeyLineEnemyDropRecommendations(params: {
  materialRows: MaterialNeedRow[];
  staticData: StaticGameData;
  goals: KrumpanionGoals;
  inventory?: AccountInventoryState;
  allowStockpileMode?: boolean;
}): PlannerRecommendation[] {
  const groups = buildFamilyDeficitGroups(params.materialRows);
  const allowStockpileMode = params.allowStockpileMode ?? true;

  if (groups.length === 0) {
    if (!allowStockpileMode) {
      return [];
    }

    const inventory = params.inventory ?? {};
    const hasInventoryData = Object.values(inventory).some((quantity) => Number.isFinite(quantity) && quantity > 0);
    if (!hasInventoryData) {
      return [buildNoInventoryStockpileRecommendation()];
    }

    const lowStockFamilies = buildOwnedEnemyFamilyTotals(inventory, params.staticData).slice(0, 10);
    if (lowStockFamilies.length === 0) {
      return [];
    }

    const regionSummaries = buildStockpileNationSummaries({
      staticData: params.staticData,
      lowStockFamilies,
    });
    const locationRecommendations = buildStockpileLocationRecommendations({
      staticData: params.staticData,
      lowStockFamilies,
    });
    const coveredFamilyKeys = new Set(regionSummaries.flatMap((summary) => summary.matchedFamilies.map((family) => family.familyKey)));
    const uncoveredFamilies = lowStockFamilies
      .filter((family) => !coveredFamilyKeys.has(family.familyKey))
      .map((family) => ({
        familyKey: family.familyKey,
        familyDisplayName: family.familyDisplayName,
        quantity: family.quantity,
      }));

    const topNation = regionSummaries[0]?.region ?? null;
    const topNationList = regionSummaries.slice(0, 3).map((summary) => summary.region).join(", ");

    return [{
      id: "recommendation-ley-line-enemy-stockpile",
      title: "Best nations to stockpile enemy drops",
      category: "custom",
      actionGroup: "open_world",
      actionSubgroup: "ley_line_enemy_drops",
      priority: 250,
      availability: "ALWAYS",
      sourceName: "Best nations to stockpile enemy drops",
      resinCost: 0,
      resinPerRun: null,
      totalEstimatedResin: null,
      resinLabel: "No resin",
      relatedGoalKeys: [],
      relatedGoalLabels: [],
      priorityLabel: "Optional",
      requiredMaterials: [],
      reason:
        topNation != null
          ? `No active enemy-drop deficits. ${topNation} is the best current nation to stockpile because it covers the lowest-owned enemy-drop families in your active account inventory. Top nations: ${topNationList}. Enemy drops are incidental combat drops, not blossom rewards.`
          : "No active enemy-drop deficits. Stockpile recommendations could not find a released Ley Line nation match for your lowest-owned enemy-drop families.",
      blockedBy: [],
      isAvailableToday: true,
      warnings: [],
      estimateBasis: "Inventory maintenance mode using lowest-owned enemy-drop family totals across the active account",
      dataQuality: "exact",
      leyLineEnemyDropDetails: {
        mode: "stockpile",
        modeLabel: "Stockpile recommendation based on lowest inventory",
        quantityContext: "owned",
        familyKey: "__stockpile__",
        familyDisplayName: "Stockpile priorities",
        materialChain: [],
        bestRegion: topNation,
        matchedFamilies: lowStockFamilies.map((family) => ({
          familyKey: family.familyKey,
          familyDisplayName: family.familyDisplayName,
          quantity: family.quantity,
        })),
        nationMatchSummaries: regionSummaries.map((summary) => ({
          region: summary.region,
          matchedFamilies: summary.matchedFamilies,
          totalMatchedQuantity: summary.totalMatchedQuantity,
          totalRelevantFamilyCoverage: summary.totalRelevantFamilyCoverage,
          averageOwnedQuantity: summary.averageOwnedQuantity,
          locationCount: summary.locationCount,
          optionalOnlyLocationCount: summary.optionalOnlyLocationCount,
          totalGuaranteedEnemyCount: summary.totalGuaranteedEnemyCount,
        })),
        regionRecommendations: buildRegionRecommendations(regionSummaries),
        locationRecommendations,
        uncoveredFamilies,
        incidentalDropNote:
          "Enemy drops are incidental combat drops from Ley Line enemies. Resin rewards from Ley Lines are Mora or Character EXP books.",
      },
    }];
  }

  const familyRecommendations = groups.map((group) => {
    const family = getFamilyRecord(params.staticData, group.familyKey);
    const materialChain = family ? [...family.materialKeys] : group.rows.map((row) => row.materialKey);
    const locations = buildLocationRecommendations(group.familyKey, new Set(groups.map((item) => item.familyKey)), group, params.staticData);
    const familyQuantitySummary = buildMatchedFamilySummary(
      params.staticData,
      group.familyKey,
      group.rows.reduce((sum, row) => sum + row.missing, 0),
    );
    const relatedGoalKeys = unique(group.rows.flatMap((row) => row.usedBy.map((usage) => usage.key)));
    const relatedGoalLabels = relatedGoalKeys.map((goalKey) => getGoalDisplayName(goalKey, params.goals, params.staticData));
    const regionSummaries = buildDeficitNationSummaries({
      staticData: params.staticData,
      familyQuantities: [familyQuantitySummary],
      affectedGoalLabels: relatedGoalLabels,
    });
    const totalMissing = familyQuantitySummary.quantity;
    const warnings = buildFamilyWarnings(group.familyKey, locations);

    return {
      id: `recommendation-ley-line-enemy-${group.familyKey}`,
      title: group.familyDisplayName,
      category: "custom",
      actionGroup: "open_world",
      actionSubgroup: "ley_line_enemy_drops",
      priority: totalMissing + relatedGoalKeys.length * 10 + (locations[0]?.totalGuaranteedEnemyCount ?? 0),
      availability: "ALWAYS",
      sourceName: group.familyDisplayName,
      resinCost: 0,
      resinPerRun: null,
      totalEstimatedResin: null,
      resinLabel: "No resin",
      relatedGoalKeys,
      relatedGoalLabels,
      priorityLabel: warnings.length > 0 && locations.length === 0 ? "Blocked" : "Optional",
      requiredMaterials: group.rows.map((row) => ({
        materialId: row.materialKey,
        quantity: row.missing,
      })),
      reason:
        locations.length > 0
          ? `Based on active goal deficits, ${regionSummaries[0]?.region ?? "these"} Ley Line areas are the best current nation to farm because they cover the most useful enemy-drop spawns for this deficit. Enemy drops are incidental combat drops, not blossom rewards.`
          : "No Ley Line enemy-spawn recommendation is currently available for this material family.",
      blockedBy: warnings.length > 0 && locations.length === 0 ? warnings : [],
      isAvailableToday: true,
      warnings,
      estimateBasis: "Curated Ley Line enemy-spawn family coverage; incidental enemy drops only",
      dataQuality: "exact",
      leyLineEnemyDropDetails: {
        mode: "goal_deficit",
        modeLabel: "Based on active goal deficits",
        quantityContext: "missing",
        familyKey: group.familyKey,
        familyDisplayName: group.familyDisplayName,
        materialChain,
        bestRegion: regionSummaries[0]?.region ?? null,
        matchedFamilies: [{
          familyKey: familyQuantitySummary.familyKey,
          familyDisplayName: familyQuantitySummary.familyDisplayName,
          quantity: familyQuantitySummary.quantity,
        }],
        nationMatchSummaries: regionSummaries.map((summary) => ({
          region: summary.region,
          matchedFamilies: summary.matchedFamilies,
          totalMatchedQuantity: summary.totalMatchedQuantity,
          totalRelevantFamilyCoverage: summary.totalRelevantFamilyCoverage,
          averageOwnedQuantity: summary.averageOwnedQuantity,
          locationCount: summary.locationCount,
          optionalOnlyLocationCount: summary.optionalOnlyLocationCount,
          totalGuaranteedEnemyCount: summary.totalGuaranteedEnemyCount,
        })),
        regionRecommendations: buildRegionRecommendations(regionSummaries),
        locationRecommendations: locations,
        incidentalDropNote:
          "Enemy drops are incidental combat drops from Ley Line enemies. Resin rewards from Ley Lines are Mora or Character EXP books.",
      },
    } satisfies PlannerRecommendation;
  });

  if (groups.length <= 1) {
    return familyRecommendations;
  }

  const allRows = groups.flatMap((group) => group.rows);
  const overallRelatedGoalKeys = unique(allRows.flatMap((row) => row.usedBy.map((usage) => usage.key)));
  const overallRelatedGoalLabels = overallRelatedGoalKeys.map((goalKey) => getGoalDisplayName(goalKey, params.goals, params.staticData));
  const overallFamilyQuantities = groups.map((group) =>
    buildMatchedFamilySummary(
      params.staticData,
      group.familyKey,
      group.rows.reduce((sum, row) => sum + row.missing, 0),
    ),
  );
  const overallLocations = buildOverallLocationRecommendations({
    familyQuantities: overallFamilyQuantities,
    staticData: params.staticData,
  });
  const overallRegionSummaries = buildDeficitNationSummaries({
    staticData: params.staticData,
    familyQuantities: overallFamilyQuantities,
    affectedGoalLabels: overallRelatedGoalLabels,
  });
  const overallWarnings =
    overallLocations.length === 0
      ? ["No Ley Line enemy-spawn recommendation is currently available for the current enemy-drop deficit mix."]
      : [];

  const overallRecommendation: PlannerRecommendation = {
    id: "recommendation-ley-line-enemy-overall",
    title: "Best nations overall",
    category: "custom",
    actionGroup: "open_world",
    actionSubgroup: "ley_line_enemy_drops",
    priority:
      allRows.reduce((sum, row) => sum + row.missing, 0) +
      overallRelatedGoalKeys.length * 10 +
      (overallRegionSummaries[0]?.totalGuaranteedEnemyCount ?? 0) +
      1000,
    availability: "ALWAYS",
    sourceName: "Best nations overall",
    resinCost: 0,
    resinPerRun: null,
    totalEstimatedResin: null,
    resinLabel: "No resin",
    relatedGoalKeys: overallRelatedGoalKeys,
    relatedGoalLabels: overallRelatedGoalLabels,
    priorityLabel: overallWarnings.length > 0 ? "Blocked" : "Optional",
    requiredMaterials: allRows.map((row) => ({
      materialId: row.materialKey,
      quantity: row.missing,
    })),
    reason:
      overallLocations.length > 0
        ? `Based on active goal deficits, ${overallRegionSummaries[0]?.region ?? "these"} Ley Line areas are the best overall nation to farm right now because they cover the highest-value mix of enemy-drop deficits across your current goals. Enemy drops are incidental combat drops, not blossom rewards.`
        : "No Ley Line enemy-spawn recommendation is currently available for the current enemy-drop deficit mix.",
    blockedBy: overallWarnings,
    isAvailableToday: true,
    warnings: overallWarnings,
    estimateBasis: "Curated Ley Line enemy-spawn family coverage aggregated across all current enemy-drop deficits",
    dataQuality: "exact",
    leyLineEnemyDropDetails: {
      mode: "goal_deficit",
      modeLabel: "Based on active goal deficits",
      quantityContext: "missing",
      familyKey: "__overall__",
      familyDisplayName: "Overall enemy-drop priorities",
      materialChain: unique(allRows.map((row) => row.materialKey)),
      bestRegion: overallRegionSummaries[0]?.region ?? null,
      matchedFamilies: overallFamilyQuantities.map((family) => ({
        familyKey: family.familyKey,
        familyDisplayName: family.familyDisplayName,
        quantity: family.quantity,
      })),
      nationMatchSummaries: overallRegionSummaries.map((summary) => ({
        region: summary.region,
        matchedFamilies: summary.matchedFamilies,
        totalMatchedQuantity: summary.totalMatchedQuantity,
        totalRelevantFamilyCoverage: summary.totalRelevantFamilyCoverage,
        averageOwnedQuantity: summary.averageOwnedQuantity,
        locationCount: summary.locationCount,
        optionalOnlyLocationCount: summary.optionalOnlyLocationCount,
        totalGuaranteedEnemyCount: summary.totalGuaranteedEnemyCount,
      })),
      regionRecommendations: buildRegionRecommendations(overallRegionSummaries),
      locationRecommendations: overallLocations,
      incidentalDropNote:
        "Enemy drops are incidental combat drops from Ley Line enemies. Resin rewards from Ley Lines are Mora or Character EXP books.",
    },
  };

  return [overallRecommendation, ...familyRecommendations];
}
