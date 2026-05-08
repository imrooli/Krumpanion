import type { OwnedWeapon, UnmatchedOwnedWeapon } from "../account/types";
import type { StaticGameData, WeaponCatalogEntry, WeaponRarity } from "../staticData/types";

export type WeaponRefinementStatus =
  | "complete_r5"
  | "ready_to_r5"
  | "upgrade_available"
  | "missing_duplicates"
  | "single_copy_only"
  | "not_owned"
  | "unknown_or_untracked";

export interface WeaponRefinementEntry {
  weaponKey: string;
  name: string;
  weaponType?: WeaponCatalogEntry["weaponType"];
  rarity?: WeaponRarity;
  status: WeaponRefinementStatus;
  bestOwnedRefinement: number | null;
  bestCandidateCopy: OwnedWeapon | null;
  duplicateCopiesAvailable: number;
  possibleNewRefinement: number | null;
  missingCopiesToR5: number;
  recommendation: string;
  warnings: string[];
  ownedInstances: OwnedWeapon[];
  duplicateCandidates: OwnedWeapon[];
}

export interface UnmatchedWeaponRefinementEntry {
  weaponInstanceId: string;
  importName: string;
  refinement: number;
  currentLevel: number;
  currentAscension: number;
  location?: string;
  lock?: boolean;
  equippedByCharacterId?: string;
  status: "unknown_or_untracked";
  recommendation: string;
  warnings: string[];
}

export interface WeaponRefinementAnalysis {
  entries: WeaponRefinementEntry[];
  unmatchedEntries: UnmatchedWeaponRefinementEntry[];
}

function isTrackableCollectionWeapon(entry: WeaponCatalogEntry): boolean {
  return entry.rarity === 3 || entry.rarity === 4 || entry.rarity === 5;
}

function weaponCandidateComparator(left: OwnedWeapon, right: OwnedWeapon): number {
  return (
    (right.refinement ?? 1) - (left.refinement ?? 1) ||
    right.currentLevel - left.currentLevel ||
    right.currentAscension - left.currentAscension ||
    Number(Boolean(right.lock || right.equippedByCharacterId)) - Number(Boolean(left.lock || left.equippedByCharacterId))
  );
}

function buildDuplicateWarnings(duplicates: OwnedWeapon[]): string[] {
  const lockedCount = duplicates.filter((weapon) => weapon.lock).length;
  const equippedCount = duplicates.filter((weapon) => Boolean(weapon.equippedByCharacterId)).length;
  const highLevelCount = duplicates.filter((weapon) => weapon.currentLevel > 20).length;
  const highAscensionCount = duplicates.filter((weapon) => weapon.currentAscension > 0).length;
  const warnings: string[] = [];

  if (lockedCount > 0) {
    warnings.push(`${lockedCount} duplicate ${lockedCount === 1 ? "is" : "are"} locked and should not be used without manual confirmation.`);
  }
  if (equippedCount > 0) {
    warnings.push(`${equippedCount} duplicate ${equippedCount === 1 ? "is" : "are"} equipped and should not be used without manual confirmation.`);
  }
  if (highLevelCount > 0) {
    warnings.push(`${highLevelCount} duplicate ${highLevelCount === 1 ? "has" : "have"} weapon levels invested.`);
  }
  if (highAscensionCount > 0) {
    warnings.push(`${highAscensionCount} duplicate ${highAscensionCount === 1 ? "has" : "have"} ascension investment.`);
  }

  return warnings;
}

function buildRecommendation(
  weaponName: string,
  status: WeaponRefinementStatus,
  bestRefinement: number | null,
  duplicateCopiesAvailable: number,
  possibleNewRefinement: number | null,
  missingCopiesToR5: number,
): string {
  switch (status) {
    case "complete_r5":
      return `${weaponName}: R5 owned. No refinement needed.`;
    case "ready_to_r5":
      return `${weaponName}: Best copy is R${bestRefinement ?? 1} and ${duplicateCopiesAvailable} duplicate copies are available. Can refine to R5.`;
    case "upgrade_available":
      return `${weaponName}: Best copy is R${bestRefinement ?? 1} and ${duplicateCopiesAvailable} duplicate copy${duplicateCopiesAvailable === 1 ? "" : "ies"} ${duplicateCopiesAvailable === 1 ? "is" : "are"} available. Can refine to R${possibleNewRefinement ?? bestRefinement ?? 1}; needs ${missingCopiesToR5} more duplicate cop${missingCopiesToR5 === 1 ? "y" : "ies"} for R5.`;
    case "missing_duplicates":
      return `${weaponName}: One partially refined copy is owned at R${bestRefinement ?? 1}. Needs ${missingCopiesToR5} more duplicate cop${missingCopiesToR5 === 1 ? "y" : "ies"} for R5.`;
    case "single_copy_only":
      return `${weaponName}: One R${bestRefinement ?? 1} copy owned. Needs ${missingCopiesToR5} duplicate cop${missingCopiesToR5 === 1 ? "y" : "ies"} for R5.`;
    case "not_owned":
      return `${weaponName}: Not owned. Needs 1 copy to begin, 5 total copies for an R5 collection copy.`;
    case "unknown_or_untracked":
      return `${weaponName}: Could not be matched to the canonical weapon database. Review this import entry manually.`;
  }
}

function buildEntry(weapon: WeaponCatalogEntry, ownedInstances: OwnedWeapon[]): WeaponRefinementEntry {
  const sortedInstances = [...ownedInstances].sort(weaponCandidateComparator);
  const existingR5 = sortedInstances.find((instance) => (instance.refinement ?? 1) >= 5);

  if (existingR5) {
    return {
      weaponKey: weapon.key,
      name: weapon.displayName,
      weaponType: weapon.weaponType,
      rarity: weapon.rarity,
      status: "complete_r5",
      bestOwnedRefinement: existingR5.refinement ?? 5,
      bestCandidateCopy: existingR5,
      duplicateCopiesAvailable: 0,
      possibleNewRefinement: 5,
      missingCopiesToR5: 0,
      recommendation: buildRecommendation(weapon.displayName, "complete_r5", existingR5.refinement ?? 5, 0, 5, 0),
      warnings: [],
      ownedInstances: sortedInstances,
      duplicateCandidates: [],
    };
  }

  if (sortedInstances.length === 0) {
    return {
      weaponKey: weapon.key,
      name: weapon.displayName,
      weaponType: weapon.weaponType,
      rarity: weapon.rarity,
      status: "not_owned",
      bestOwnedRefinement: null,
      bestCandidateCopy: null,
      duplicateCopiesAvailable: 0,
      possibleNewRefinement: null,
      missingCopiesToR5: 5,
      recommendation: buildRecommendation(weapon.displayName, "not_owned", null, 0, null, 5),
      warnings: [],
      ownedInstances: [],
      duplicateCandidates: [],
    };
  }

  const bestCandidateCopy = sortedInstances[0];
  const duplicateCandidates = sortedInstances.slice(1).filter((instance) => (instance.refinement ?? 1) < 5);
  const duplicateCopiesAvailable = duplicateCandidates.length;
  const bestOwnedRefinement = bestCandidateCopy.refinement ?? 1;
  const possibleNewRefinement = Math.min(5, bestOwnedRefinement + duplicateCopiesAvailable);
  const missingCopiesToR5 = Math.max(0, 5 - possibleNewRefinement);
  const status: WeaponRefinementStatus =
    possibleNewRefinement >= 5
      ? "ready_to_r5"
      : duplicateCopiesAvailable > 0
        ? "upgrade_available"
        : bestOwnedRefinement > 1
          ? "missing_duplicates"
          : "single_copy_only";

  return {
    weaponKey: weapon.key,
    name: weapon.displayName,
    weaponType: weapon.weaponType,
    rarity: weapon.rarity,
    status,
    bestOwnedRefinement,
    bestCandidateCopy,
    duplicateCopiesAvailable,
    possibleNewRefinement,
    missingCopiesToR5,
    recommendation: buildRecommendation(
      weapon.displayName,
      status,
      bestOwnedRefinement,
      duplicateCopiesAvailable,
      possibleNewRefinement,
      missingCopiesToR5,
    ),
    warnings: buildDuplicateWarnings(duplicateCandidates),
    ownedInstances: sortedInstances,
    duplicateCandidates,
  };
}

export function analyzeWeaponRefinementCollection(input: {
  staticData: StaticGameData;
  ownedWeapons: OwnedWeapon[];
  unmatchedWeapons?: UnmatchedOwnedWeapon[];
}): WeaponRefinementAnalysis {
  const ownedByWeaponKey = new Map<string, OwnedWeapon[]>();
  for (const weapon of input.ownedWeapons) {
    ownedByWeaponKey.set(weapon.weaponKey, [...(ownedByWeaponKey.get(weapon.weaponKey) ?? []), weapon]);
  }

  const entries = Object.values(input.staticData.weapons)
    .filter(isTrackableCollectionWeapon)
    .map((weapon) => buildEntry(weapon, ownedByWeaponKey.get(weapon.key) ?? []));

  const unmatchedEntries = (input.unmatchedWeapons ?? []).map((weapon) => ({
    weaponInstanceId: weapon.weaponInstanceId,
    importName: weapon.importName,
    refinement: weapon.refinement ?? 1,
    currentLevel: weapon.currentLevel,
    currentAscension: weapon.currentAscension,
    location: weapon.location,
    lock: weapon.lock,
    equippedByCharacterId: weapon.equippedByCharacterId,
    status: "unknown_or_untracked" as const,
    recommendation: buildRecommendation(weapon.importName, "unknown_or_untracked", null, 0, null, 0),
    warnings: [
      "This imported weapon could not be matched to a canonical database entry.",
    ],
  }));

  return {
    entries,
    unmatchedEntries,
  };
}
