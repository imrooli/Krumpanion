import type { OwnedWeapon, UnmatchedOwnedWeapon } from "../account/types";
import type { StaticGameData, WeaponCatalogEntry, WeaponRefinementPolicy, WeaponRarity } from "../staticData/types";

export type WeaponRefinementStatus =
  | "already_r5"
  | "can_refine_now"
  | "needs_more_copies"
  | "manual_review"
  | "unsafe_to_refine"
  | "not_owned"
  | "not_tracked"
  | "unknown_or_untracked";

export type RefinementOpportunityRecommendationType =
  | "can_refine_now"
  | "already_r5"
  | "needs_more_copies"
  | "unsafe_to_refine"
  | "manual_review"
  | "not_refinement_trackable";

export interface RefinementOpportunity {
  weaponKey: string;
  baseInstanceId: string;
  consumableInstanceIds: string[];
  currentRefinement: number;
  possibleRefinement: number;
  copiesNeededForR5: number;
  copiesAvailableToConsume: number;
  isSafe: boolean;
  safetyWarnings: string[];
  recommendationType: RefinementOpportunityRecommendationType;
}

export interface WeaponCopyEvaluation {
  instance: OwnedWeapon;
  refinement: number;
  isBaseCandidate: boolean;
  canConsume: boolean;
  goalLinked: boolean;
  safetyWarnings: string[];
}

export interface WeaponInventorySummary {
  weaponKey: string;
  displayName: string;
  name: string;
  weaponType?: WeaponCatalogEntry["weaponType"];
  rarity?: WeaponRarity;
  totalCopies: number;
  highestRefinement: number;
  hasR5: boolean;
  highestLevel: number;
  highestAscension: number;
  lockedCount: number;
  equippedCount: number;
  goalLinkedCount: number;
  copies: OwnedWeapon[];
  copyEvaluations: WeaponCopyEvaluation[];
  refinementOpportunities: RefinementOpportunity[];
  status: WeaponRefinementStatus;
  recommendationType: RefinementOpportunityRecommendationType;
  recommendation: string;
  copiesNeededForUniqueR5: number;
  bestOwnedRefinement: number | null;
  duplicateCopiesAvailable: number;
  possibleNewRefinement: number | null;
  missingCopiesToR5: number;
  possibleRefinement: number | null;
  safeConsumableCount: number;
  safetyWarnings: string[];
  warnings: string[];
  acquisitionType?: WeaponCatalogEntry["acquisitionType"];
  refinementPolicy: WeaponRefinementPolicy;
}

export interface UnmatchedWeaponInventoryEntry {
  weaponInstanceId: string;
  importName: string;
  refinement: number;
  currentLevel: number;
  currentAscension: number;
  location?: string;
  lock?: boolean;
  locked?: boolean;
  equippedByCharacterId?: string;
  equippedBy?: string | null;
  status: "unknown_or_untracked";
  recommendation: string;
  warnings: string[];
}

export interface WeaponRefinementAnalysis {
  entries: WeaponInventorySummary[];
  unmatchedEntries: UnmatchedWeaponInventoryEntry[];
}

function getWeaponRefinement(weapon: Pick<OwnedWeapon, "refinement">): number {
  return Math.max(1, Math.min(5, weapon.refinement ?? 1));
}

function isWeaponLocked(weapon: Pick<OwnedWeapon, "locked" | "lock">): boolean {
  return Boolean(weapon.locked ?? weapon.lock);
}

function getEquippedBy(weapon: Pick<OwnedWeapon, "equippedBy" | "equippedByCharacterId">): string | null {
  return weapon.equippedBy ?? weapon.equippedByCharacterId ?? null;
}

function getEffectiveRefinementPolicy(weapon: WeaponCatalogEntry | undefined): WeaponRefinementPolicy {
  if (!weapon) {
    return "not_trackable";
  }
  if (weapon.refinementPolicy) {
    return weapon.refinementPolicy;
  }
  if (weapon.refinementTrackable === false) {
    return "not_trackable";
  }
  if (weapon.rarity === 1 || weapon.rarity === 2) {
    return "not_trackable";
  }
  if (weapon.limited || weapon.eventExclusive) {
    return "manual_review";
  }
  switch (weapon.acquisitionType) {
    case "quest":
    case "chest":
      return "preserve_all";
    case "event":
    case "battle_pass":
    case "limited_wish":
      return "manual_review";
    case "unknown":
      return weapon.rarity === 5 ? "manual_review" : "normal";
    default:
      return weapon.rarity === 5 ? "manual_review" : "normal";
  }
}

function buildBaseComparator(goalLinkedInstanceIds: Set<string>) {
  return (left: OwnedWeapon, right: OwnedWeapon): number => {
    const leftGoalLinked = goalLinkedInstanceIds.has(left.weaponInstanceId) ? 1 : 0;
    const rightGoalLinked = goalLinkedInstanceIds.has(right.weaponInstanceId) ? 1 : 0;
    return (
      getWeaponRefinement(right) - getWeaponRefinement(left) ||
      right.currentLevel - left.currentLevel ||
      right.currentAscension - left.currentAscension ||
      rightGoalLinked - leftGoalLinked ||
      Number(Boolean(getEquippedBy(right))) - Number(Boolean(getEquippedBy(left))) ||
      Number(isWeaponLocked(right)) - Number(isWeaponLocked(left)) ||
      left.weaponInstanceId.localeCompare(right.weaponInstanceId)
    );
  };
}

function duplicateHasHigherInvestmentThanBase(candidate: OwnedWeapon, base: OwnedWeapon): boolean {
  return (
    candidate.currentAscension > base.currentAscension ||
    (candidate.currentAscension === base.currentAscension && candidate.currentLevel > base.currentLevel)
  );
}

function summarizeLockedWarning(count: number): string {
  return `${count} duplicate cop${count === 1 ? "y is" : "ies are"} locked and excluded from safe refinement recommendations.`;
}

function summarizeEquippedWarning(count: number): string {
  return `${count} duplicate cop${count === 1 ? "y is" : "ies are"} equipped and excluded from safe refinement recommendations.`;
}

function summarizeGoalLinkedWarning(count: number): string {
  return `${count} duplicate cop${count === 1 ? "y is" : "ies are"} linked to an active weapon goal.`;
}

function buildConsumableWarnings(
  candidate: OwnedWeapon,
  base: OwnedWeapon,
  policy: WeaponRefinementPolicy,
  goalLinkedInstanceIds: Set<string>,
): string[] {
  const warnings: string[] = [];
  if (candidate.weaponInstanceId === base.weaponInstanceId) {
    warnings.push("This is the recommended base copy and should be preserved.");
  }
  if (isWeaponLocked(candidate)) {
    warnings.push("Locked copy cannot be safely consumed.");
  }
  if (getEquippedBy(candidate)) {
    warnings.push("Equipped copy cannot be safely consumed.");
  }
  if (goalLinkedInstanceIds.has(candidate.weaponInstanceId)) {
    warnings.push("Active weapon goal is linked to this copy.");
  }
  if (duplicateHasHigherInvestmentThanBase(candidate, base)) {
    warnings.push("This duplicate has higher level or ascension investment than the proposed base copy.");
  }
  if (policy === "manual_review") {
    warnings.push("Automatic duplicate-consume recommendation is disabled for this weapon.");
  }
  if (policy === "preserve_all") {
    warnings.push("This weapon is marked preserve-all and should not be consumed automatically.");
  }
  return warnings;
}

function isSafeConsumable(warnings: string[]): boolean {
  return warnings.length === 0;
}

function buildRecommendation(summary: {
  displayName: string;
  status: WeaponRefinementStatus;
  baseRefinement: number | null;
  possibleRefinement: number | null;
  safeConsumableCount: number;
  copiesNeededForUniqueR5: number;
}): string {
  switch (summary.status) {
    case "already_r5":
      return `${summary.displayName} already has an R5 copy.`;
    case "can_refine_now":
      return `${summary.displayName} can refine now from R${summary.baseRefinement ?? 1} to R${summary.possibleRefinement ?? summary.baseRefinement ?? 1}.`;
    case "manual_review":
      return `${summary.displayName} has duplicate copies, but automatic consume recommendations are disabled. Manual review recommended.`;
    case "unsafe_to_refine":
      return `${summary.displayName} has duplicate copies, but none are safe to consume right now.`;
    case "needs_more_copies":
      return summary.baseRefinement
        ? `${summary.displayName} is at R${summary.baseRefinement} and still needs ${summary.copiesNeededForUniqueR5} more cop${summary.copiesNeededForUniqueR5 === 1 ? "y" : "ies"} for a unique R5 copy.`
        : `${summary.displayName} is not owned yet. A unique R5 copy needs 5 total copies.`;
    case "not_owned":
      return `${summary.displayName} is not owned yet.`;
    case "not_tracked":
      return `${summary.displayName} is not tracked for refinement collection goals.`;
    case "unknown_or_untracked":
      return `${summary.displayName} could not be matched to the canonical weapon database.`;
  }
}

function createSummaryForWeapon(
  weapon: WeaponCatalogEntry,
  ownedInstances: OwnedWeapon[],
  goalLinkedInstanceIds: Set<string>,
): WeaponInventorySummary {
  const refinementPolicy = getEffectiveRefinementPolicy(weapon);
  const sortedInstances = [...ownedInstances].sort(buildBaseComparator(goalLinkedInstanceIds));
  const totalCopies = sortedInstances.length;
  const highestRefinement = sortedInstances.reduce((best, item) => Math.max(best, getWeaponRefinement(item)), 0);
  const highestLevel = sortedInstances.reduce((best, item) => Math.max(best, item.currentLevel), 0);
  const highestAscension = sortedInstances.reduce((best, item) => Math.max(best, item.currentAscension), 0);
  const lockedCount = sortedInstances.filter((item) => isWeaponLocked(item)).length;
  const equippedCount = sortedInstances.filter((item) => Boolean(getEquippedBy(item))).length;
  const goalLinkedCount = sortedInstances.filter((item) => goalLinkedInstanceIds.has(item.weaponInstanceId)).length;
  const hasR5 = sortedInstances.some((item) => getWeaponRefinement(item) >= 5);

  if (refinementPolicy === "not_trackable") {
    return {
      weaponKey: weapon.key,
      displayName: weapon.displayName,
      name: weapon.displayName,
      weaponType: weapon.weaponType,
      rarity: weapon.rarity,
      totalCopies,
      highestRefinement,
      hasR5,
      highestLevel,
      highestAscension,
      lockedCount,
      equippedCount,
      goalLinkedCount,
      copies: sortedInstances,
      copyEvaluations: sortedInstances.map((instance) => ({
        instance,
        refinement: getWeaponRefinement(instance),
        isBaseCandidate: false,
        canConsume: false,
        goalLinked: goalLinkedInstanceIds.has(instance.weaponInstanceId),
        safetyWarnings: ["This weapon is not tracked for refinement collection goals."],
      })),
      refinementOpportunities: [],
      status: totalCopies > 0 ? "not_tracked" : "not_owned",
      recommendationType: "not_refinement_trackable",
      recommendation: buildRecommendation({
        displayName: weapon.displayName,
        status: totalCopies > 0 ? "not_tracked" : "not_owned",
        baseRefinement: totalCopies > 0 ? highestRefinement : null,
        possibleRefinement: null,
        safeConsumableCount: 0,
        copiesNeededForUniqueR5: totalCopies > 0 ? Math.max(0, 5 - highestRefinement) : 5,
      }),
      copiesNeededForUniqueR5: totalCopies > 0 ? Math.max(0, 5 - highestRefinement) : 5,
      bestOwnedRefinement: totalCopies > 0 ? highestRefinement : null,
      duplicateCopiesAvailable: Math.max(0, totalCopies - 1),
      possibleNewRefinement: null,
      missingCopiesToR5: totalCopies > 0 ? Math.max(0, 5 - highestRefinement) : 5,
      possibleRefinement: null,
      safeConsumableCount: 0,
      safetyWarnings: [],
      warnings: [],
      acquisitionType: weapon.acquisitionType,
      refinementPolicy,
    };
  }

  if (totalCopies === 0) {
    return {
      weaponKey: weapon.key,
      displayName: weapon.displayName,
      name: weapon.displayName,
      weaponType: weapon.weaponType,
      rarity: weapon.rarity,
      totalCopies: 0,
      highestRefinement: 0,
      hasR5: false,
      highestLevel: 0,
      highestAscension: 0,
      lockedCount: 0,
      equippedCount: 0,
      goalLinkedCount: 0,
      copies: [],
      copyEvaluations: [],
      refinementOpportunities: [],
      status: "not_owned",
      recommendationType: "needs_more_copies",
      recommendation: buildRecommendation({
        displayName: weapon.displayName,
        status: "not_owned",
        baseRefinement: null,
        possibleRefinement: null,
        safeConsumableCount: 0,
        copiesNeededForUniqueR5: 5,
      }),
      copiesNeededForUniqueR5: 5,
      bestOwnedRefinement: null,
      duplicateCopiesAvailable: 0,
      possibleNewRefinement: null,
      missingCopiesToR5: 5,
      possibleRefinement: null,
      safeConsumableCount: 0,
      safetyWarnings: [],
      warnings: [],
      acquisitionType: weapon.acquisitionType,
      refinementPolicy,
    };
  }

  const base = sortedInstances[0];
  const baseRefinement = getWeaponRefinement(base);

  if (hasR5) {
    return {
      weaponKey: weapon.key,
      displayName: weapon.displayName,
      name: weapon.displayName,
      weaponType: weapon.weaponType,
      rarity: weapon.rarity,
      totalCopies,
      highestRefinement,
      hasR5: true,
      highestLevel,
      highestAscension,
      lockedCount,
      equippedCount,
      goalLinkedCount,
      copies: sortedInstances,
      copyEvaluations: sortedInstances.map((instance) => ({
        instance,
        refinement: getWeaponRefinement(instance),
        isBaseCandidate: instance.weaponInstanceId === base.weaponInstanceId,
        canConsume: false,
        goalLinked: goalLinkedInstanceIds.has(instance.weaponInstanceId),
        safetyWarnings:
          instance.weaponInstanceId === base.weaponInstanceId
            ? ["This copy already satisfies the unique R5 goal."]
            : ["A unique R5 copy already exists, so extra copies are not recommended for automatic consumption."],
      })),
      refinementOpportunities: [],
      status: "already_r5",
      recommendationType: "already_r5",
      recommendation: buildRecommendation({
        displayName: weapon.displayName,
        status: "already_r5",
        baseRefinement,
        possibleRefinement: 5,
        safeConsumableCount: 0,
        copiesNeededForUniqueR5: 0,
      }),
      copiesNeededForUniqueR5: 0,
      bestOwnedRefinement: baseRefinement,
      duplicateCopiesAvailable: Math.max(0, totalCopies - 1),
      possibleNewRefinement: 5,
      missingCopiesToR5: 0,
      possibleRefinement: 5,
      safeConsumableCount: 0,
      safetyWarnings: [],
      warnings: [],
      acquisitionType: weapon.acquisitionType,
      refinementPolicy,
    };
  }

  const duplicateCandidates = sortedInstances.slice(1);
  const copyEvaluations = sortedInstances.map((instance) => {
    const isBaseCandidate = instance.weaponInstanceId === base.weaponInstanceId;
    const safetyWarnings = isBaseCandidate
      ? ["This is the recommended base copy to preserve and refine."]
      : buildConsumableWarnings(instance, base, refinementPolicy, goalLinkedInstanceIds);
    return {
      instance,
      refinement: getWeaponRefinement(instance),
      isBaseCandidate,
      canConsume: !isBaseCandidate && isSafeConsumable(safetyWarnings),
      goalLinked: goalLinkedInstanceIds.has(instance.weaponInstanceId),
      safetyWarnings,
    };
  });

  const safeConsumables = copyEvaluations.filter((entry) => entry.canConsume);
  const safeConsumableCount = safeConsumables.length;
  const possibleRefinement = Math.min(5, baseRefinement + safeConsumableCount);
  const copiesNeededForUniqueR5 = Math.max(0, 5 - possibleRefinement);
  const opportunityRecommendationType: RefinementOpportunityRecommendationType =
    safeConsumableCount > 0
      ? "can_refine_now"
      : refinementPolicy === "manual_review" || refinementPolicy === "preserve_all"
        ? "manual_review"
        : "needs_more_copies";
  const opportunity: RefinementOpportunity = {
    weaponKey: weapon.key,
    baseInstanceId: base.weaponInstanceId,
    consumableInstanceIds: safeConsumables.map((entry) => entry.instance.weaponInstanceId),
    currentRefinement: baseRefinement,
    possibleRefinement,
    copiesNeededForR5: copiesNeededForUniqueR5,
    copiesAvailableToConsume: safeConsumableCount,
    isSafe: safeConsumableCount > 0,
    safetyWarnings: copyEvaluations
      .filter((entry) => !entry.isBaseCandidate && !entry.canConsume)
      .flatMap((entry) => entry.safetyWarnings),
    recommendationType: opportunityRecommendationType,
  };

  const lockedDuplicateCount = duplicateCandidates.filter((item) => isWeaponLocked(item)).length;
  const equippedDuplicateCount = duplicateCandidates.filter((item) => Boolean(getEquippedBy(item))).length;
  const goalLinkedDuplicateCount = duplicateCandidates.filter((item) => goalLinkedInstanceIds.has(item.weaponInstanceId)).length;
  const safetyWarnings: string[] = [];

  if (lockedDuplicateCount > 0) {
    safetyWarnings.push(summarizeLockedWarning(lockedDuplicateCount));
  }
  if (equippedDuplicateCount > 0) {
    safetyWarnings.push(summarizeEquippedWarning(equippedDuplicateCount));
  }
  if (goalLinkedDuplicateCount > 0) {
    safetyWarnings.push(summarizeGoalLinkedWarning(goalLinkedDuplicateCount));
  }
  if (refinementPolicy === "manual_review") {
    safetyWarnings.push(
      weapon.rarity === 5
        ? "5-star duplicate refinement is manual review only by default."
        : "This weapon uses a manual-review refinement policy by default.",
    );
  }
  if (refinementPolicy === "preserve_all") {
    safetyWarnings.push("This weapon is marked preserve-all and is not recommended for duplicate consumption.");
  }

  let status: WeaponRefinementStatus = "needs_more_copies";
  let recommendationType: RefinementOpportunityRecommendationType = "needs_more_copies";

  if (safeConsumableCount > 0) {
    status = "can_refine_now";
    recommendationType = "can_refine_now";
  } else if (duplicateCandidates.length > 0 && (refinementPolicy === "manual_review" || refinementPolicy === "preserve_all")) {
    status = "manual_review";
    recommendationType = "manual_review";
  } else if (duplicateCandidates.length > 0) {
    status = "unsafe_to_refine";
    recommendationType = "unsafe_to_refine";
  } else {
    status = "needs_more_copies";
    recommendationType = "needs_more_copies";
  }

  return {
    weaponKey: weapon.key,
    displayName: weapon.displayName,
    name: weapon.displayName,
    weaponType: weapon.weaponType,
    rarity: weapon.rarity,
    totalCopies,
    highestRefinement,
    hasR5: false,
    highestLevel,
    highestAscension,
    lockedCount,
    equippedCount,
    goalLinkedCount,
    copies: sortedInstances,
    copyEvaluations,
    refinementOpportunities: [opportunity],
    status,
    recommendationType,
    recommendation: buildRecommendation({
      displayName: weapon.displayName,
      status,
      baseRefinement,
      possibleRefinement,
      safeConsumableCount,
      copiesNeededForUniqueR5,
    }),
    copiesNeededForUniqueR5,
    bestOwnedRefinement: baseRefinement,
    duplicateCopiesAvailable: duplicateCandidates.length,
    possibleNewRefinement: possibleRefinement,
    missingCopiesToR5: copiesNeededForUniqueR5,
    possibleRefinement,
    safeConsumableCount,
    safetyWarnings,
    warnings: safetyWarnings,
    acquisitionType: weapon.acquisitionType,
    refinementPolicy,
  };
}

export function analyzeWeaponRefinementCollection(input: {
  staticData: StaticGameData;
  ownedWeapons: OwnedWeapon[];
  unmatchedWeapons?: UnmatchedOwnedWeapon[];
  linkedWeaponInstanceIds?: Iterable<string>;
}): WeaponRefinementAnalysis {
  const goalLinkedInstanceIds = new Set(input.linkedWeaponInstanceIds ?? []);
  const ownedByWeaponKey = new Map<string, OwnedWeapon[]>();
  for (const weapon of input.ownedWeapons) {
    ownedByWeaponKey.set(weapon.weaponKey, [...(ownedByWeaponKey.get(weapon.weaponKey) ?? []), weapon]);
  }

  const entries = Object.values(input.staticData.weapons)
    .map((weapon) => createSummaryForWeapon(weapon, ownedByWeaponKey.get(weapon.key) ?? [], goalLinkedInstanceIds));

  const unmatchedEntries = (input.unmatchedWeapons ?? []).map((weapon) => ({
    weaponInstanceId: weapon.weaponInstanceId,
    importName: weapon.importedName ?? weapon.importName,
    refinement: Math.max(1, Math.min(5, weapon.refinement ?? 1)),
    currentLevel: weapon.currentLevel,
    currentAscension: weapon.currentAscension,
    location: weapon.location,
    lock: weapon.lock,
    locked: weapon.locked,
    equippedByCharacterId: weapon.equippedByCharacterId,
    equippedBy: weapon.equippedBy,
    status: "unknown_or_untracked" as const,
    recommendation: `${weapon.importedName ?? weapon.importName} could not be matched to the canonical weapon database.`,
    warnings: ["This imported weapon is excluded from refinement analysis until the canonical weapon profile exists."],
  }));

  return {
    entries,
    unmatchedEntries,
  };
}
