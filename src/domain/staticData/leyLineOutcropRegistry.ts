import type {
  EliteEnemyDropFamily,
  GeneralEnemyDropFamily,
  LeyLineDerivedDropFamilyCoverage,
  LeyLineOutcropLocation,
  StaticGameData,
} from "./types";

type RawLeyLineOutcropLocations = Record<string, LeyLineOutcropLocation>;

function getFamilyRecord(
  familyKey: string,
  generalEnemyDropFamilies: Record<string, GeneralEnemyDropFamily>,
  eliteEnemyDropFamilies: Record<string, EliteEnemyDropFamily>,
): GeneralEnemyDropFamily | EliteEnemyDropFamily | null {
  return generalEnemyDropFamilies[familyKey] ?? eliteEnemyDropFamilies[familyKey] ?? null;
}

export function buildLeyLineOutcropRegistry(
  rawLocations: RawLeyLineOutcropLocations,
  generalEnemyDropFamilies: StaticGameData["generalEnemyDropFamilies"],
  eliteEnemyDropFamilies: StaticGameData["eliteEnemyDropFamilies"],
): {
  leyLineOutcropLocations: StaticGameData["leyLineOutcropLocations"];
  leyLineOutcropLocationList: StaticGameData["leyLineOutcropLocationList"];
} {
  const locations = Object.fromEntries(
    Object.entries(rawLocations).map(([locationKey, location]) => {
      const coverageByFamily = new Map<string, LeyLineDerivedDropFamilyCoverage>();
      const unresolvedSpawnWarnings: string[] = [];

      for (const spawn of location.spawns) {
        if (!spawn.dropFamilyKey) {
          unresolvedSpawnWarnings.push(
            `Unresolved drop family mapping for ${spawn.enemyName}${spawn.notes?.length ? ` (${spawn.notes.join("; ")})` : ""}.`,
          );
          continue;
        }

        const family = getFamilyRecord(spawn.dropFamilyKey, generalEnemyDropFamilies, eliteEnemyDropFamilies);
        if (!family) {
          unresolvedSpawnWarnings.push(`Unknown drop family ${spawn.dropFamilyKey} on ${spawn.enemyName}.`);
          continue;
        }

        const existing = coverageByFamily.get(spawn.dropFamilyKey) ?? {
          familyKey: spawn.dropFamilyKey,
          familyDisplayName: family.displayName,
          materialKeys: [...family.materialKeys],
          materialNames: [...family.materialNames],
          guaranteedEnemySpawns: [],
          optionalNearbyEnemySpawns: [],
          totalGuaranteedEnemyCount: 0,
          notes: [],
        };

        if (spawn.isOptionalNearby) {
          existing.optionalNearbyEnemySpawns.push({
            enemyName: spawn.enemyName,
            count: spawn.count,
          });
        } else {
          existing.guaranteedEnemySpawns.push({
            enemyName: spawn.enemyName,
            count: spawn.count,
          });
          existing.totalGuaranteedEnemyCount += spawn.count;
        }

        if (spawn.notes?.length) {
          existing.notes = [...new Set([...(existing.notes ?? []), ...spawn.notes])];
        }

        coverageByFamily.set(spawn.dropFamilyKey, existing);
      }

      const nextLocation: LeyLineOutcropLocation = {
        ...location,
        derivedDropFamilies: [...coverageByFamily.values()].sort(
          (left, right) =>
            right.totalGuaranteedEnemyCount - left.totalGuaranteedEnemyCount ||
            left.familyDisplayName.localeCompare(right.familyDisplayName),
        ),
        unresolvedSpawnWarnings: unresolvedSpawnWarnings.length > 0 ? unresolvedSpawnWarnings : undefined,
      };

      return [locationKey, nextLocation];
    }),
  );

  return {
    leyLineOutcropLocations: locations,
    leyLineOutcropLocationList: Object.values(locations).sort(
      (left, right) =>
        left.region.localeCompare(right.region) ||
        left.areaName.localeCompare(right.areaName) ||
        left.locationNumber - right.locationNumber,
    ),
  };
}

