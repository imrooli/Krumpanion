import { getGoalDisplayName } from "../goals/goalDisplay";
import type { KrumpanionGoals } from "../goals/types";
import type { StaticGameData } from "../staticData/types";
import type {
  LeyLineEnemyDropLocationRecommendation,
  LeyLineEnemyDropRegionRecommendation,
  MaterialNeedRow,
  PlannerRecommendation,
} from "./types";

interface FamilyDeficitGroup {
  familyKey: string;
  familyDisplayName: string;
  rows: MaterialNeedRow[];
}

interface ScoredLocationRecommendation extends LeyLineEnemyDropLocationRecommendation {
  _score: [number, number, number, number, number, number];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isEnemyDropRow(row: MaterialNeedRow): boolean {
  return (row.category === "general_enemy_drop" || row.category === "elite_enemy_drop") && row.missing > 0 && !!row.familyId;
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

function buildRegionRecommendations(params: {
  group: FamilyDeficitGroup;
  locations: LeyLineEnemyDropLocationRecommendation[];
  allMissingFamilyKeys: Set<string>;
  goals: KrumpanionGoals;
  staticData: StaticGameData;
}): LeyLineEnemyDropRegionRecommendation[] {
  const rowsByMaterial = new Map(params.group.rows.map((row) => [row.materialKey, row]));
  const regionMap = new Map<
    string,
    {
      region: string;
      totalGuaranteedEnemyCount: number;
      locationCount: number;
      optionalOnlyLocationCount: number;
      coveredFamilyKeys: Set<string>;
      coveredMaterialKeys: Set<string>;
      affectedGoalKeys: Set<string>;
      locations: Array<{
        locationKey: string;
        areaName: string;
        locationNumber: number;
      }>;
    }
  >();

  for (const location of params.locations) {
    const entry = regionMap.get(location.region) ?? {
      region: location.region,
      totalGuaranteedEnemyCount: 0,
      locationCount: 0,
      optionalOnlyLocationCount: 0,
      coveredFamilyKeys: new Set<string>(),
      coveredMaterialKeys: new Set<string>(),
      affectedGoalKeys: new Set<string>(),
      locations: [],
    };

    entry.totalGuaranteedEnemyCount += location.totalGuaranteedEnemyCount;
    entry.locationCount += 1;
    if (location.isOptionalOnly) {
      entry.optionalOnlyLocationCount += 1;
    }
    for (const familyKey of location.coveredFamilyKeys) {
      if (params.allMissingFamilyKeys.has(familyKey)) {
        entry.coveredFamilyKeys.add(familyKey);
      }
    }
    for (const row of params.group.rows) {
      if (location.coveredFamilyKeys.includes(params.group.familyKey)) {
        entry.coveredMaterialKeys.add(row.materialKey);
        for (const usage of row.usedBy) {
          entry.affectedGoalKeys.add(usage.key);
        }
      }
    }
    entry.locations.push({
      locationKey: location.locationKey,
      areaName: location.areaName,
      locationNumber: location.locationNumber,
    });
    regionMap.set(location.region, entry);
  }

  return [...regionMap.values()]
    .sort((left, right) => {
      const leftDeficitCovered = [...left.coveredMaterialKeys].reduce(
        (sum, materialKey) => sum + (rowsByMaterial.get(materialKey)?.missing ?? 0),
        0,
      );
      const rightDeficitCovered = [...right.coveredMaterialKeys].reduce(
        (sum, materialKey) => sum + (rowsByMaterial.get(materialKey)?.missing ?? 0),
        0,
      );

      return (
        rightDeficitCovered - leftDeficitCovered ||
        right.coveredMaterialKeys.size - left.coveredMaterialKeys.size ||
        right.affectedGoalKeys.size - left.affectedGoalKeys.size ||
        right.totalGuaranteedEnemyCount - left.totalGuaranteedEnemyCount ||
        right.coveredFamilyKeys.size - left.coveredFamilyKeys.size ||
        (left.optionalOnlyLocationCount - right.optionalOnlyLocationCount) ||
        right.locationCount - left.locationCount ||
        left.region.localeCompare(right.region)
      );
    })
    .map((entry) => ({
      region: entry.region,
      totalGuaranteedEnemyCount: entry.totalGuaranteedEnemyCount,
      locationCount: entry.locationCount,
      optionalOnlyLocationCount: entry.optionalOnlyLocationCount,
      coveredFamilyKeys: [...entry.coveredFamilyKeys].sort(),
      coveredMaterialKeys: [...entry.coveredMaterialKeys].sort(),
      affectedGoalLabels: [...entry.affectedGoalKeys]
        .map((goalKey) => getGoalDisplayName(goalKey, params.goals, params.staticData))
        .sort((left, right) => left.localeCompare(right)),
      locations: entry.locations.sort(
        (left, right) => left.areaName.localeCompare(right.areaName) || left.locationNumber - right.locationNumber,
      ),
    }));
}

function buildOverallLocationRecommendations(params: {
  groups: FamilyDeficitGroup[];
  allMissingFamilyKeys: Set<string>;
  staticData: StaticGameData;
}): LeyLineEnemyDropLocationRecommendation[] {
  const rowsByMaterial = new Map(params.groups.flatMap((group) => group.rows).map((row) => [row.materialKey, row]));

  const recommendations: ScoredLocationRecommendation[] = params.staticData.leyLineOutcropLocationList.flatMap((location) => {
    const relevantCoverages = location.derivedDropFamilies.filter((coverage) => params.allMissingFamilyKeys.has(coverage.familyKey));
    if (relevantCoverages.length === 0) {
      return [];
    }

    const coveredMaterialKeys = unique(
      relevantCoverages.flatMap((coverage) => coverage.materialKeys).filter((materialKey) => rowsByMaterial.has(materialKey)),
    );
    const goalsCovered = unique(
      coveredMaterialKeys.flatMap((materialKey) => (rowsByMaterial.get(materialKey)?.usedBy ?? []).map((usage) => usage.key)),
    ).length;
    const totalGuaranteedEnemyCount = relevantCoverages.reduce((sum, coverage) => sum + coverage.totalGuaranteedEnemyCount, 0);
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
      coveredFamilyKeys: unique(relevantCoverages.map((coverage) => coverage.familyKey)).sort(),
      notes: unique(relevantCoverages.flatMap((coverage) => coverage.notes ?? [])),
      isOptionalOnly,
      _score: [
        coveredMaterialKeys.reduce((sum, materialKey) => sum + (rowsByMaterial.get(materialKey)?.missing ?? 0), 0),
        coveredMaterialKeys.length,
        goalsCovered,
        totalGuaranteedEnemyCount,
        unique(relevantCoverages.map((coverage) => coverage.familyKey)).length,
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

function buildOverallRegionRecommendations(params: {
  groups: FamilyDeficitGroup[];
  locations: LeyLineEnemyDropLocationRecommendation[];
  goals: KrumpanionGoals;
  staticData: StaticGameData;
}): LeyLineEnemyDropRegionRecommendation[] {
  const rowsByMaterial = new Map(params.groups.flatMap((group) => group.rows).map((row) => [row.materialKey, row]));
  const regionMap = new Map<
    string,
    {
      region: string;
      totalGuaranteedEnemyCount: number;
      locationCount: number;
      optionalOnlyLocationCount: number;
      coveredFamilyKeys: Set<string>;
      coveredMaterialKeys: Set<string>;
      affectedGoalKeys: Set<string>;
      locations: Array<{
        locationKey: string;
        areaName: string;
        locationNumber: number;
      }>;
    }
  >();

  for (const location of params.locations) {
    const entry = regionMap.get(location.region) ?? {
      region: location.region,
      totalGuaranteedEnemyCount: 0,
      locationCount: 0,
      optionalOnlyLocationCount: 0,
      coveredFamilyKeys: new Set<string>(),
      coveredMaterialKeys: new Set<string>(),
      affectedGoalKeys: new Set<string>(),
      locations: [],
    };

    entry.totalGuaranteedEnemyCount += location.totalGuaranteedEnemyCount;
    entry.locationCount += 1;
    if (location.isOptionalOnly) {
      entry.optionalOnlyLocationCount += 1;
    }
    for (const familyKey of location.coveredFamilyKeys) {
      entry.coveredFamilyKeys.add(familyKey);
    }
    for (const materialKey of unique(location.coveredFamilyKeys.flatMap((familyKey) => {
      const group = params.groups.find((candidate) => candidate.familyKey === familyKey);
      return group ? group.rows.map((row) => row.materialKey) : [];
    }))) {
      const row = rowsByMaterial.get(materialKey);
      if (!row) {
        continue;
      }
      entry.coveredMaterialKeys.add(materialKey);
      for (const usage of row.usedBy) {
        entry.affectedGoalKeys.add(usage.key);
      }
    }
    entry.locations.push({
      locationKey: location.locationKey,
      areaName: location.areaName,
      locationNumber: location.locationNumber,
    });
    regionMap.set(location.region, entry);
  }

  return [...regionMap.values()]
    .sort((left, right) => {
      const leftDeficitCovered = [...left.coveredMaterialKeys].reduce(
        (sum, materialKey) => sum + (rowsByMaterial.get(materialKey)?.missing ?? 0),
        0,
      );
      const rightDeficitCovered = [...right.coveredMaterialKeys].reduce(
        (sum, materialKey) => sum + (rowsByMaterial.get(materialKey)?.missing ?? 0),
        0,
      );

      return (
        rightDeficitCovered - leftDeficitCovered ||
        right.coveredMaterialKeys.size - left.coveredMaterialKeys.size ||
        right.affectedGoalKeys.size - left.affectedGoalKeys.size ||
        right.totalGuaranteedEnemyCount - left.totalGuaranteedEnemyCount ||
        right.coveredFamilyKeys.size - left.coveredFamilyKeys.size ||
        (left.optionalOnlyLocationCount - right.optionalOnlyLocationCount) ||
        right.locationCount - left.locationCount ||
        left.region.localeCompare(right.region)
      );
    })
    .map((entry) => ({
      region: entry.region,
      totalGuaranteedEnemyCount: entry.totalGuaranteedEnemyCount,
      locationCount: entry.locationCount,
      optionalOnlyLocationCount: entry.optionalOnlyLocationCount,
      coveredFamilyKeys: [...entry.coveredFamilyKeys].sort(),
      coveredMaterialKeys: [...entry.coveredMaterialKeys].sort(),
      affectedGoalLabels: [...entry.affectedGoalKeys]
        .map((goalKey) => getGoalDisplayName(goalKey, params.goals, params.staticData))
        .sort((left, right) => left.localeCompare(right)),
      locations: entry.locations.sort(
        (left, right) => left.areaName.localeCompare(right.areaName) || left.locationNumber - right.locationNumber,
      ),
    }));
}

export function buildLeyLineEnemyDropRecommendations(params: {
  materialRows: MaterialNeedRow[];
  staticData: StaticGameData;
  goals: KrumpanionGoals;
}): PlannerRecommendation[] {
  const groups = buildFamilyDeficitGroups(params.materialRows);
  if (groups.length === 0) {
    return [];
  }

  const allMissingFamilyKeys = new Set(groups.map((group) => group.familyKey));

  const familyRecommendations = groups.map((group) => {
    const family =
      params.staticData.generalEnemyDropFamilies[group.familyKey] ?? params.staticData.eliteEnemyDropFamilies[group.familyKey];
    const materialChain = family ? [...family.materialKeys] : group.rows.map((row) => row.materialKey);
    const locations = buildLocationRecommendations(group.familyKey, allMissingFamilyKeys, group, params.staticData);
    const regionRecommendations = buildRegionRecommendations({
      group,
      locations,
      allMissingFamilyKeys,
      goals: params.goals,
      staticData: params.staticData,
    });
    const relatedGoalKeys = unique(group.rows.flatMap((row) => row.usedBy.map((usage) => usage.key)));
    const relatedGoalLabels = relatedGoalKeys.map((goalKey) => getGoalDisplayName(goalKey, params.goals, params.staticData));
    const totalMissing = group.rows.reduce((sum, row) => sum + row.missing, 0);
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
          ? `If you are missing ${group.familyDisplayName}, ${regionRecommendations[0]?.region ?? "these"} Ley Line areas are the best current nation to farm because they cover the most useful enemy-drop spawns for this deficit. Enemy drops are incidental combat drops, not blossom rewards.`
          : "No Ley Line enemy-spawn recommendation is currently available for this material family.",
      blockedBy: warnings.length > 0 && locations.length === 0 ? warnings : [],
      isAvailableToday: true,
      warnings,
      estimateBasis: "Curated Ley Line enemy-spawn family coverage; incidental enemy drops only",
      dataQuality: "exact",
      leyLineEnemyDropDetails: {
        familyKey: group.familyKey,
        familyDisplayName: group.familyDisplayName,
        materialChain,
        bestRegion: regionRecommendations[0]?.region ?? null,
        regionRecommendations,
        locationRecommendations: locations,
        incidentalDropNote:
          "Enemy drops are incidental combat drops from Ley Line enemies. Resin rewards from Ley Lines are Mora or Character EXP books.",
      },
    } satisfies PlannerRecommendation;
  });

  if (groups.length <= 1) {
    return familyRecommendations;
  }

  const overallLocations = buildOverallLocationRecommendations({
    groups,
    allMissingFamilyKeys,
    staticData: params.staticData,
  });
  const overallRegions = buildOverallRegionRecommendations({
    groups,
    locations: overallLocations,
    goals: params.goals,
    staticData: params.staticData,
  });
  const allRows = groups.flatMap((group) => group.rows);
  const overallRelatedGoalKeys = unique(allRows.flatMap((row) => row.usedBy.map((usage) => usage.key)));
  const overallRelatedGoalLabels = overallRelatedGoalKeys.map((goalKey) => getGoalDisplayName(goalKey, params.goals, params.staticData));
  const overallWarnings = overallLocations.length === 0
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
      (overallRegions[0]?.totalGuaranteedEnemyCount ?? 0) +
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
        ? `${overallRegions[0]?.region ?? "These"} Ley Line areas are the best overall nation to farm right now because they cover the highest-value mix of enemy-drop deficits across your current goals. Enemy drops are incidental combat drops, not blossom rewards.`
        : "No Ley Line enemy-spawn recommendation is currently available for the current enemy-drop deficit mix.",
    blockedBy: overallWarnings,
    isAvailableToday: true,
    warnings: overallWarnings,
    estimateBasis: "Curated Ley Line enemy-spawn family coverage aggregated across all current enemy-drop deficits",
    dataQuality: "exact",
    leyLineEnemyDropDetails: {
      familyKey: "__overall__",
      familyDisplayName: "Overall enemy-drop priorities",
      materialChain: unique(allRows.map((row) => row.materialKey)),
      bestRegion: overallRegions[0]?.region ?? null,
      regionRecommendations: overallRegions,
      locationRecommendations: overallLocations,
      incidentalDropNote:
        "Enemy drops are incidental combat drops from Ley Line enemies. Resin rewards from Ley Lines are Mora or Character EXP books.",
    },
  };

  return [overallRecommendation, ...familyRecommendations];
}
