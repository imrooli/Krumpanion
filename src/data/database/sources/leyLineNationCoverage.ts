import { leyLineOutcropLocations } from "./leyLineOutcropLocations";
import type { CanonicalDatabase } from "../schema";

type CanonicalLeyLineNationCoverage = CanonicalDatabase["sources"]["leyLineNationCoverage"][string];

const NATION_METADATA: Record<
  string,
  {
    displayName: string;
    releaseState: "live" | "unreleased";
    enabledForRecommendations: boolean;
    extraFamilyKeys?: string[];
  }
> = {
  mondstadt: {
    displayName: "Mondstadt",
    releaseState: "live",
    enabledForRecommendations: true,
  },
  liyue: {
    displayName: "Liyue",
    releaseState: "live",
    enabledForRecommendations: true,
  },
  inazuma: {
    displayName: "Inazuma",
    releaseState: "live",
    enabledForRecommendations: true,
  },
  sumeru: {
    displayName: "Sumeru",
    releaseState: "live",
    enabledForRecommendations: true,
    extraFamilyKeys: ["fungus_materials", "state_shifted_fungus_materials"],
  },
  fontaine: {
    displayName: "Fontaine",
    releaseState: "live",
    enabledForRecommendations: true,
  },
  natlan: {
    displayName: "Natlan",
    releaseState: "live",
    enabledForRecommendations: true,
  },
  nod_krai: {
    displayName: "Nod-Krai",
    releaseState: "live",
    enabledForRecommendations: true,
  },
  snezhnaya: {
    displayName: "Snezhnaya",
    releaseState: "unreleased",
    enabledForRecommendations: false,
  },
};

function buildRegionFamilyMap(): Map<string, Set<string>> {
  const regionFamilyMap = new Map<string, Set<string>>();

  for (const location of Object.values(leyLineOutcropLocations)) {
    const regionFamilies = regionFamilyMap.get(location.region) ?? new Set<string>();
    for (const spawn of location.spawns) {
      if (spawn.dropFamilyKey) {
        regionFamilies.add(spawn.dropFamilyKey);
      }
    }
    regionFamilyMap.set(location.region, regionFamilies);
  }

  return regionFamilyMap;
}

const regionFamilyMap = buildRegionFamilyMap();

export const leyLineNationCoverage: CanonicalDatabase["sources"]["leyLineNationCoverage"] = Object.fromEntries(
  Object.entries(NATION_METADATA).map(([nationKey, metadata]) => {
    const familyKeys = uniqueSorted([
      ...(regionFamilyMap.get(metadata.displayName) ?? new Set<string>()),
      ...(metadata.extraFamilyKeys ?? []),
    ]);
    const coverage: CanonicalLeyLineNationCoverage = {
      nationKey,
      displayName: metadata.displayName,
      releaseState: metadata.releaseState,
      enabledForRecommendations: metadata.enabledForRecommendations,
      familyKeys,
    };

    return [nationKey, coverage];
  }),
);

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}
