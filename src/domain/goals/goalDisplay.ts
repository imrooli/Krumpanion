import type { ArtifactGoal, CharacterGoal, KrumpanionGoals, WeaponGoal } from "./types";
import { getWeaponGoalId, getWeaponGoalTargetAscension } from "./goalState";
import type { StaticGameData } from "../staticData/types";
import { getTravelerGoalLabel } from "../staticData/travelerRegistry";

function formatTargetLevel(level: number | undefined): string | null {
  return typeof level === "number" ? `Lv. ${level}` : null;
}

function formatTargetAscension(ascension: number | undefined): string | null {
  return typeof ascension === "number" ? `Ascension ${ascension}` : null;
}

function joinNonEmpty(parts: Array<string | null | undefined>, separator = " | "): string {
  return parts.filter((part): part is string => Boolean(part)).join(separator);
}

function prettifyKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function normalizeDisplayName(value: string | undefined, fallbackKey: string): string | null {
  if (!value) {
    return null;
  }

  if (value === fallbackKey || !/\s/.test(value)) {
    return prettifyKey(value);
  }

  return value;
}

export function getCharacterGoalDisplayName(characterKey: string, staticData: StaticGameData): string {
  return (
    getTravelerGoalLabel(characterKey) ??
    normalizeDisplayName(staticData.characters[characterKey]?.displayName, characterKey) ??
    normalizeDisplayName(staticData.characterMaterialProfiles[characterKey]?.displayName, characterKey) ??
    prettifyKey(characterKey)
  );
}

export function getCharacterGoalSubtitle(goal: CharacterGoal): string {
  return joinNonEmpty([
    goal.targetLevel ? formatTargetLevel(goal.targetLevel) : null,
    typeof goal.targetAscension === "number" ? formatTargetAscension(goal.targetAscension) : null,
    goal.talents
      ? `Talents ${goal.talents.auto ?? "-"}/${goal.talents.skill ?? "-"}/${goal.talents.burst ?? "-"}`
      : null,
  ]);
}

export function getWeaponGoalDisplayName(weaponKey: string, staticData: StaticGameData): string {
  return normalizeDisplayName(staticData.weapons[weaponKey]?.displayName, weaponKey) ?? prettifyKey(weaponKey);
}

export function getWeaponGoalLabel(goal: WeaponGoal, staticData: StaticGameData): string {
  return `${getWeaponGoalDisplayName(goal.weaponKey, staticData)} weapon goal`;
}

export function getWeaponGoalSubtitle(goal: WeaponGoal): string {
  return joinNonEmpty([
    formatTargetLevel(goal.targetLevel),
    formatTargetAscension(getWeaponGoalTargetAscension(goal)),
    goal.planningMode === "prefarm" ? "Prefarm goal" : null,
    goal.linkStatus === "stale" ? "Owned link missing" : null,
  ]);
}

export function getArtifactGoalDisplayName(goal: ArtifactGoal, staticData: StaticGameData): string {
  const characterName = goal.characterKey ? getCharacterGoalDisplayName(goal.characterKey, staticData) : null;
  const setLabel = goal.targetSetKeys.join(", ");

  if (characterName) {
    return `${characterName} artifact goal`;
  }

  return setLabel || "Artifact goal";
}

export function getArtifactGoalSubtitle(goal: ArtifactGoal, staticData: StaticGameData): string {
  const domainName = staticData.artifactDomains[goal.targetSetKeys[0]]?.domainName ?? goal.domainKey;
  return joinNonEmpty([domainName, goal.targetSetKeys.join(", ")]);
}

export function getGoalDisplayName(goalKey: string, goals: KrumpanionGoals, staticData: StaticGameData): string {
  const characterGoal = goals.characterGoals[goalKey];
  if (characterGoal) {
    return getCharacterGoalDisplayName(characterGoal.characterKey, staticData);
  }

  const weaponGoal = Object.values(goals.weaponGoals).find((goal) => getWeaponGoalId(goal, goal.weaponKey) === goalKey);
  if (weaponGoal) {
    return getWeaponGoalLabel(weaponGoal, staticData);
  }

  const artifactGoal = goals.artifactGoals.find((goal) => goal.id === goalKey);
  if (artifactGoal) {
    return getArtifactGoalDisplayName(artifactGoal, staticData);
  }

  return goalKey;
}

export function getGoalTypeLabel(goalKey: string, goals: KrumpanionGoals): string {
  if (goals.characterGoals[goalKey]) {
    return "Character goal";
  }
  if (Object.values(goals.weaponGoals).some((goal) => getWeaponGoalId(goal, goal.weaponKey) === goalKey)) {
    return "Weapon goal";
  }
  if (goals.artifactGoals.some((goal) => goal.id === goalKey)) {
    return "Artifact goal";
  }
  return "Goal";
}
