import type { AccountOwnershipState, OwnedCharacter, OwnedWeapon } from "../account/types";
import { buildAccountLookups } from "../account/types";
import type { CharacterGoal, GoalPlanningMode, KrumpanionGoalState, WeaponGoal } from "./types";
import type { PlannerWarning } from "../planner/types";
import type { StaticGameData } from "../staticData/types";
import { isGoalTrackableWeaponRecord, isIgnoredCharacterKey, isPlayableGoalCharacter } from "../staticData/targetability";
import { isTravelerElementKey, isTravelerSharedKey, TRAVELER_SHARED_KEY } from "../staticData/travelerRegistry";

export type GoalCurrentStateSource =
  | "manual_override"
  | "owned_import"
  | "prefarm_baseline"
  | "traveler_shared_import"
  | "traveler_element_import";

export interface ResolvedCharacterCurrentState {
  source: GoalCurrentStateSource;
  state: OwnedCharacter;
}

export interface ResolvedWeaponCurrentState {
  source: GoalCurrentStateSource;
  state: Pick<OwnedWeapon, "weaponInstanceId" | "weaponKey" | "currentLevel" | "currentAscension">;
}

export interface GoalValidationResult {
  goals: KrumpanionGoalState;
  warnings: PlannerWarning[];
}

function cloneGoalState(goals: KrumpanionGoalState): KrumpanionGoalState {
  return structuredClone(goals);
}

export function defaultPlanningMode(isOwned: boolean): GoalPlanningMode {
  return isOwned ? "owned" : "prefarm";
}

export function createCharacterPrefarmBaseline(characterKey: string): OwnedCharacter {
  return {
    characterId: characterKey,
    currentLevel: 1,
    currentAscension: 0,
    currentTalents: {
      normal: 1,
      skill: 1,
      burst: 1,
    },
  };
}

export function createWeaponPrefarmBaseline(weaponKey: string): Pick<OwnedWeapon, "weaponInstanceId" | "weaponKey" | "currentLevel" | "currentAscension"> {
  return {
    weaponInstanceId: `prefarm:${weaponKey}`,
    weaponKey,
    currentLevel: 1,
    currentAscension: 0,
  };
}

function clampWeaponGoalLevel(level: number | undefined): number | undefined {
  if (level === undefined) {
    return undefined;
  }
  return Math.max(1, Math.min(level, 90));
}

function clampWeaponGoalAscension(ascension: number | undefined): number | undefined {
  if (ascension === undefined) {
    return undefined;
  }
  return Math.max(0, Math.min(ascension, 6));
}

function parseLegacyWeaponGoalId(goalId: string): Partial<WeaponGoal> {
  if (!goalId.startsWith("weapon-")) {
    return {};
  }

  const parts = goalId.split("-");
  if (parts.length < 3) {
    return {};
  }

  const [, weaponKey, maybeLinkedCharacter, ...rest] = parts;
  const numericTokens = rest.filter((part) => /^\d+$/.test(part)).map((part) => Number(part));
  const booleanToken = rest.find((part) => part === "true" || part === "false");

  const targetLevel = numericTokens.find((value) => value >= 1 && value <= 90);
  const targetAscensionPhase = numericTokens.find((value) => value >= 0 && value <= 6 && value !== targetLevel);
  const priority = [...numericTokens].reverse().find((value) => value >= 0 && value <= 9);
  const linkedCharacterKey =
    maybeLinkedCharacter && !/^\d+$/.test(maybeLinkedCharacter) && maybeLinkedCharacter !== weaponKey
      ? maybeLinkedCharacter
      : undefined;

  return {
    weaponKey,
    linkedCharacterKey,
    targetLevel,
    targetAscensionPhase,
    enabled: booleanToken ? booleanToken === "true" : undefined,
    priority,
  };
}

export function getWeaponGoalId(goal: WeaponGoal, fallbackGoalId: string): string {
  return goal.goalId ?? goal.id ?? fallbackGoalId;
}

export function getWeaponGoalTargetAscension(goal: WeaponGoal): number | undefined {
  return goal.targetAscensionPhase ?? goal.targetAscension;
}

export function getLinkedWeaponInstanceId(goal: WeaponGoal, fallbackGoalId?: string): string | undefined {
  return goal.linkedInventoryInstanceId ?? goal.ownedWeaponInstanceId ?? (goal.useOwnedInstance !== false ? fallbackGoalId : undefined);
}

export function normalizeWeaponGoalRecord(goalId: string, goal: WeaponGoal, accountId?: string): WeaponGoal {
  const legacy = parseLegacyWeaponGoalId(goalId);
  const normalizedGoalId = getWeaponGoalId(goal, goalId);
  const targetLevel = clampWeaponGoalLevel(goal.targetLevel ?? legacy.targetLevel);
  const targetAscensionPhase = clampWeaponGoalAscension(getWeaponGoalTargetAscension(goal) ?? legacy.targetAscensionPhase);
  const fallbackLinkedInventoryInstanceId = goal.planningMode === "prefarm" ? undefined : goalId;
  const useOwnedInstance =
    goal.useOwnedInstance ??
    (goal.planningMode === "prefarm"
      ? false
      : Boolean(goal.linkedInventoryInstanceId ?? goal.ownedWeaponInstanceId ?? fallbackLinkedInventoryInstanceId));
  const linkedInventoryInstanceId = useOwnedInstance ? getLinkedWeaponInstanceId(goal, fallbackLinkedInventoryInstanceId) : undefined;
  const planningMode = goal.planningMode ?? (useOwnedInstance ? "owned" : "prefarm");
  const linkStatus = goal.linkStatus ?? (useOwnedInstance ? "linked" : "unlinked_prefarm");

  return {
    ...legacy,
    ...goal,
    goalId: normalizedGoalId,
    id: normalizedGoalId,
    accountId: goal.accountId ?? accountId,
    weaponKey: goal.weaponKey ?? legacy.weaponKey ?? goalId,
    linkedCharacterKey: goal.linkedCharacterKey ?? legacy.linkedCharacterKey,
    linkedInventoryInstanceId,
    ownedWeaponInstanceId: linkedInventoryInstanceId,
    useOwnedInstance,
    linkStatus,
    planningMode,
    priority: goal.priority ?? legacy.priority ?? 3,
    targetLevel,
    targetAscensionPhase,
    targetAscension: targetAscensionPhase,
    enabled: goal.enabled ?? legacy.enabled ?? true,
    currentOverride: goal.currentOverride
      ? {
          ...goal.currentOverride,
          level: clampWeaponGoalLevel(goal.currentOverride.level),
          ascension: clampWeaponGoalAscension(goal.currentOverride.ascension),
        }
      : undefined,
  };
}

function mergeTravelerElementState(
  characterKey: string,
  sharedOwned: OwnedCharacter | undefined,
  elementOwned: OwnedCharacter | undefined,
  talentsOverride:
    | {
        auto?: number;
        skill?: number;
        burst?: number;
      }
    | undefined,
): OwnedCharacter {
  const sharedBase = sharedOwned ?? createCharacterPrefarmBaseline(TRAVELER_SHARED_KEY);
  const elementBase = elementOwned ?? createCharacterPrefarmBaseline(characterKey);
  return {
    characterId: characterKey,
    currentLevel: sharedBase.currentLevel,
    currentAscension: sharedBase.currentAscension,
    constellation: sharedBase.constellation ?? elementBase.constellation,
    enabled: sharedBase.enabled ?? elementBase.enabled,
    currentTalents: {
      normal: talentsOverride?.auto ?? elementOwned?.currentTalents.normal ?? 1,
      skill: talentsOverride?.skill ?? elementOwned?.currentTalents.skill ?? 1,
      burst: talentsOverride?.burst ?? elementOwned?.currentTalents.burst ?? 1,
    },
  };
}

export function resolveCharacterGoalCurrentState(
  goal: CharacterGoal,
  ownership: AccountOwnershipState,
): ResolvedCharacterCurrentState {
  const { charactersById } = buildAccountLookups(ownership);
  const sharedTravelerOwned = charactersById[TRAVELER_SHARED_KEY];
  const travelerElementOwned = isTravelerElementKey(goal.characterKey) ? charactersById[goal.characterKey] : undefined;
  const owned = charactersById[goal.characterKey];

  if (isTravelerElementKey(goal.characterKey)) {
    if (goal.currentOverride && (goal.currentOverride.level != null || goal.currentOverride.ascension != null || goal.currentOverride.talents)) {
      const base = mergeTravelerElementState(goal.characterKey, sharedTravelerOwned, travelerElementOwned, goal.currentOverride.talents);
      return {
        source: "manual_override",
        state: {
          ...base,
          currentLevel: goal.currentOverride.level ?? base.currentLevel,
          currentAscension: goal.currentOverride.ascension ?? base.currentAscension,
        },
      };
    }

    if (goal.planningMode !== "prefarm" && travelerElementOwned) {
      return {
        source: "traveler_element_import",
        state: mergeTravelerElementState(goal.characterKey, sharedTravelerOwned, travelerElementOwned, undefined),
      };
    }

    if (goal.planningMode !== "prefarm" && sharedTravelerOwned) {
      return {
        source: "traveler_shared_import",
        state: mergeTravelerElementState(goal.characterKey, sharedTravelerOwned, travelerElementOwned, undefined),
      };
    }

    return {
      source: "prefarm_baseline",
      state: createCharacterPrefarmBaseline(goal.characterKey),
    };
  }

  if (goal.currentOverride && (goal.currentOverride.level != null || goal.currentOverride.ascension != null || goal.currentOverride.talents)) {
    const base = owned ?? createCharacterPrefarmBaseline(goal.characterKey);
    return {
      source: "manual_override",
      state: {
        ...base,
        currentLevel: goal.currentOverride.level ?? base.currentLevel,
        currentAscension: goal.currentOverride.ascension ?? base.currentAscension,
        currentTalents: {
          normal: goal.currentOverride.talents?.auto ?? base.currentTalents.normal,
          skill: goal.currentOverride.talents?.skill ?? base.currentTalents.skill,
          burst: goal.currentOverride.talents?.burst ?? base.currentTalents.burst,
        },
      },
    };
  }

  if (goal.planningMode !== "prefarm" && owned) {
    return {
      source: "owned_import",
      state: owned,
    };
  }

  return {
    source: "prefarm_baseline",
    state: createCharacterPrefarmBaseline(goal.characterKey),
  };
}

export function resolveWeaponGoalCurrentState(
  goal: WeaponGoal,
  ownership: AccountOwnershipState,
): ResolvedWeaponCurrentState {
  const { weaponsById } = buildAccountLookups(ownership);
  const linkedInventoryInstanceId = getLinkedWeaponInstanceId(goal);
  const owned = linkedInventoryInstanceId ? weaponsById[linkedInventoryInstanceId] : undefined;
  const useOwnedInstance = goal.useOwnedInstance ?? goal.planningMode !== "prefarm";

  if (goal.currentOverride && (goal.currentOverride.level != null || goal.currentOverride.ascension != null)) {
    const base = useOwnedInstance && owned ? owned : createWeaponPrefarmBaseline(goal.weaponKey);
    return {
      source: "manual_override",
      state: {
        ...base,
        currentLevel: goal.currentOverride.level ?? base.currentLevel,
        currentAscension: goal.currentOverride.ascension ?? base.currentAscension,
      },
    };
  }

  if (useOwnedInstance && owned) {
    return {
      source: "owned_import",
      state: owned,
    };
  }

  return {
    source: "prefarm_baseline",
    state: createWeaponPrefarmBaseline(goal.weaponKey),
  };
}

export function getGoalCurrentStateLabel(source: GoalCurrentStateSource): string {
  switch (source) {
    case "manual_override":
      return "Manual override";
    case "owned_import":
      return "GOOD import";
    case "traveler_shared_import":
      return "GOOD import (shared level only)";
    case "traveler_element_import":
      return "Element-specific import";
    case "prefarm_baseline":
      return "Prefarm baseline";
  }
}

export function validateGoalStateAgainstStaticData(
  goals: KrumpanionGoalState,
  staticData: StaticGameData,
): GoalValidationResult {
  const nextGoals = cloneGoalState(goals);
  const warnings: PlannerWarning[] = [];

  for (const [characterKey, goal] of Object.entries(nextGoals.characterGoals)) {
    const normalizedGoal = {
      ...goal,
      planningMode: goal.planningMode ?? "owned",
    };
    nextGoals.characterGoals[characterKey] = {
      ...normalizedGoal,
    };

    if (isIgnoredCharacterKey(characterKey)) {
      nextGoals.characterGoals[characterKey] = {
        ...nextGoals.characterGoals[characterKey],
        enabled: false,
      };
      warnings.push({
        type: "invalid_override_record",
        key: characterKey,
        message: `Character goal ${characterKey} was disabled because this target is ignored for progression planning.`,
      });
      continue;
    }

    if (isTravelerSharedKey(characterKey) && goal.talents && Object.values(goal.talents).some((value) => value != null)) {
      nextGoals.characterGoals[characterKey] = {
        ...nextGoals.characterGoals[characterKey],
        notes: [goal.notes, "Traveler shared goals no longer store talent targets. Review Traveler elemental talent goals separately."]
          .filter(Boolean)
          .join(" | "),
        talents: undefined,
      };
      warnings.push({
        type: "migration_notice",
        key: characterKey,
        message: "Traveler shared goals now track only level and ascension. Review Traveler elemental talent goals separately.",
      });
    }

    if (staticData.characters[characterKey] && !isPlayableGoalCharacter(staticData, characterKey)) {
      nextGoals.characterGoals[characterKey] = {
        ...goal,
        enabled: false,
      };
      warnings.push({
        type: "unknown_character",
        key: characterKey,
        message: `Character goal ${characterKey} was disabled because the target is not a playable planning character.`,
      });
      continue;
    }
  }

  for (const [goalId, goal] of Object.entries(nextGoals.weaponGoals)) {
    nextGoals.weaponGoals[goalId] = normalizeWeaponGoalRecord(goalId, goal);
    const normalizedGoal = nextGoals.weaponGoals[goalId];
    const hasStaticWeaponRecord = Boolean(
      staticData.weapons[normalizedGoal.weaponKey] ||
        staticData.weaponMaterialProfiles[normalizedGoal.weaponKey] ||
        staticData.legacyWeaponProgressions[normalizedGoal.weaponKey],
    );
    if (!hasStaticWeaponRecord) {
      nextGoals.weaponGoals[goalId] = {
        ...normalizedGoal,
        enabled: false,
      };
      warnings.push({
        type: "invalid_weapon_goal",
        key: normalizedGoal.weaponKey,
        message: `Weapon goal ${normalizedGoal.weaponKey} was disabled because this weapon does not exist in the static planning database.`,
      });
      continue;
    }

    if (
      staticData.weapons[normalizedGoal.weaponKey] &&
      !staticData.legacyWeaponProgressions[normalizedGoal.weaponKey] &&
      !isGoalTrackableWeaponRecord(staticData, normalizedGoal.weaponKey)
    ) {
      nextGoals.weaponGoals[goalId] = {
        ...normalizedGoal,
        enabled: false,
      };
      warnings.push({
        type: "invalid_weapon_goal",
        key: normalizedGoal.weaponKey,
        message: `Weapon goal ${normalizedGoal.weaponKey} was disabled because this weapon is not goal-trackable.`,
      });
      continue;
    }
  }

  return {
    goals: nextGoals,
    warnings,
  };
}
