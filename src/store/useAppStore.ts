import { create } from "zustand";
import { importGoodAccountFromText } from "../adapters/goodImport";
import { persistenceAdapter } from "../adapters/persistence";
import type {
  AccountId,
  AccountImportState,
  GoalMilestoneLogEntry,
  GoalProgressTrackingRecord,
  MaterialEditSource,
  AccountMetadata,
  PlannerRecalculationStatus,
  RecentImportEntry,
  RecentPlannerChange,
  RecentPlannerChangeTrigger,
  AccountWorldState,
  ExportedKrumpanionAccount,
  ImportedAccountState,
  KrumpanionAccount,
  MultiAccountUserState,
} from "../domain/account/types";
import {
  createBlankAccount,
  createDefaultMultiAccountUserState,
  createDefaultWorldState,
  createImportedAccountSummary,
} from "../domain/account/types";
import {
  normalizeChecklistState,
  type CooldownChecklistKey,
  type ResetWindowChecklistKey,
} from "../domain/checklist/types";
import { getEffectiveWeeklyBossClaimsUsed } from "../domain/checklist/model";
import {
  DEFAULT_GOAL_STATE,
  DEFAULT_PLANNER_SETTINGS,
  type AppSettings,
  type ArtifactGoal,
  type CharacterGoal,
  type GoalPlanningMode,
  type PlannerSettings,
  type PlannerView,
  type WeaponGoal,
} from "../domain/goals/types";
import {
  defaultPlanningMode,
  getLinkedWeaponInstanceId,
  normalizeArtifactGoalRecord,
  getWeaponGoalId,
  normalizeCharacterGoalRecord,
  normalizeWeaponGoalRecord,
} from "../domain/goals/goalState";
import { createStaticData } from "../domain/staticData/staticDataFactory";
import { parseOverrideDataPack } from "../domain/staticData/overrideSchema";
import type { OverrideDataPack, StaticGameData } from "../domain/staticData/types";
import type { DayOfWeek } from "../domain/planner/types";
import {
  createDefaultAccountExport,
  type BackupReason,
  type GoalBackupPayload,
  type GoalBackupRecord,
  type PersistenceStatus,
  type SaveRecoveryPointRecord,
} from "../domain/save/types";
import { buildSaveFromState, defaultSave, persistCurrentSnapshot, toSaveInfo, type SaveInfo } from "./persistenceHelpers";
import { getGenshinResetDay } from "../utils/days";
import { createStableEntityId } from "../utils/stableIds";
import {
  MAX_IMPORT_MATERIAL_CHANGES,
  appendRecentChanges,
  appendRecentImports,
  buildGoalBucketSnapshot,
  buildGoalProgressChanges,
  buildInventoryChangeEntries,
  buildTrackedGoalProgressMap,
  buildPlannerFailureStatus,
  buildPlannerOutputForAccount,
  buildPlannerStatusFromOutput,
  buildRecentImportEntry,
  createRecalculationChange,
} from "./plannerTracking";

const GOAL_BACKUP_DEBOUNCE_MS = 5000;
const goalBackupTimers = new Map<AccountId, ReturnType<typeof globalThis.setTimeout>>();

function getToday(): DayOfWeek {
  return getGenshinResetDay(new Date());
}

function toIsoTimestamp(at?: string | Date): string {
  if (typeof at === "string") {
    return new Date(at).toISOString();
  }
  return (at ?? new Date()).toISOString();
}

function clampWeeklyBossClaimsUsed(value: number): number {
  return Math.max(0, Math.min(3, Math.floor(value)));
}

function clampRealmLevel(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 10;
  }
  return Math.max(1, Math.min(10, Math.floor(value as number)));
}

function clampTrustRank(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 10;
  }
  return Math.max(1, Math.min(10, Math.floor(value as number)));
}

function createBlankArtifactGoal(initial: Partial<ArtifactGoal> = {}): ArtifactGoal {
  return normalizeArtifactGoalRecord({
    id: `artifact-goal-${crypto.randomUUID()}`,
    targetSetKeys: [],
    priority: 3,
    mainStatTargets: {
      sands: [],
      goblet: [],
      circlet: [],
    },
    desiredSubstats: [],
    progress: {
      sandsObtained: false,
      gobletObtained: false,
      circletObtained: false,
    },
    enabled: true,
    notes: "",
    ...initial,
  });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createDefaultPersistenceStatus(saveInfo: SaveInfo): PersistenceStatus {
  return {
    status: "idle",
    lastSavedAt: saveInfo.updatedAt,
    lastGoalBackupAtByAccount: {},
  };
}

function normalizeGoalPlanningMode(mode: GoalPlanningMode | undefined, isOwned: boolean): GoalPlanningMode {
  return mode ?? (isOwned ? "owned" : "prefarm");
}

function synchronizeChecklistPlannerState(account: KrumpanionAccount, now = new Date()): KrumpanionAccount {
  const effectiveWeeklyBossClaimsUsed = getEffectiveWeeklyBossClaimsUsed(account.checklist, now);
  const plannerSettingsChanged =
    account.plannerSettings.weeklyBossDiscountClaimsUsed !== effectiveWeeklyBossClaimsUsed;
  const worldStateChanged = account.worldState.weeklyBossDiscountsUsed !== effectiveWeeklyBossClaimsUsed;

  if (!plannerSettingsChanged && !worldStateChanged) {
    return account;
  }

  return {
    ...account,
    plannerSettings: plannerSettingsChanged
      ? {
          ...account.plannerSettings,
          weeklyBossDiscountClaimsUsed: effectiveWeeklyBossClaimsUsed,
        }
      : account.plannerSettings,
    worldState: worldStateChanged
      ? {
          ...account.worldState,
          weeklyBossDiscountsUsed: effectiveWeeklyBossClaimsUsed,
        }
      : account.worldState,
  };
}

function getActiveAccount(user: MultiAccountUserState): KrumpanionAccount {
  const active = user.accountsById[user.activeAccountId];
  if (active) {
    return active;
  }

  const fallbackId = user.accountOrder[0];
  if (fallbackId && user.accountsById[fallbackId]) {
    return user.accountsById[fallbackId];
  }

  const nextUser = createDefaultMultiAccountUserState();
  return nextUser.accountsById[nextUser.activeAccountId];
}

function synchronizeWorldState(
  plannerSettings: PlannerSettings,
  worldState: AccountWorldState,
  patch: Partial<AccountWorldState> = {},
): AccountWorldState {
  const defaults = createDefaultWorldState();
  return {
    ...defaults,
    ...worldState,
    worldLevel: plannerSettings.worldLevel ?? worldState.worldLevel ?? defaults.worldLevel,
    selectedWorldLevel: plannerSettings.worldLevel ?? worldState.selectedWorldLevel ?? defaults.selectedWorldLevel,
    currentResin: plannerSettings.currentResin ?? worldState.currentResin ?? defaults.currentResin,
    weeklyBossDiscountsUsed:
      plannerSettings.weeklyBossDiscountClaimsUsed ?? worldState.weeklyBossDiscountsUsed ?? defaults.weeklyBossDiscountsUsed,
    condensedResin: plannerSettings.condensedResinOwned ?? worldState.condensedResin ?? defaults.condensedResin,
    fragileResin: plannerSettings.fragileResinOwned ?? worldState.fragileResin ?? defaults.fragileResin,
    transientResin: plannerSettings.transientResinOwned ?? worldState.transientResin ?? defaults.transientResin,
    ...patch,
  };
}

function synchronizePlannerSettings(
  plannerSettings: PlannerSettings,
  worldState: AccountWorldState,
  patch: Partial<PlannerSettings> = {},
): PlannerSettings {
  const next = {
    ...DEFAULT_PLANNER_SETTINGS,
    ...plannerSettings,
    ...patch,
  };

  if (patch.worldLevel === undefined && worldState.worldLevel !== undefined) {
    next.worldLevel = worldState.worldLevel;
  }
  if (patch.currentResin === undefined && worldState.currentResin !== undefined) {
    next.currentResin = worldState.currentResin;
  }
  if (patch.weeklyBossDiscountClaimsUsed === undefined && worldState.weeklyBossDiscountsUsed !== undefined) {
    next.weeklyBossDiscountClaimsUsed = worldState.weeklyBossDiscountsUsed;
  }
  if (patch.condensedResinOwned === undefined && worldState.condensedResin !== undefined) {
    next.condensedResinOwned = worldState.condensedResin;
  }
  if (patch.fragileResinOwned === undefined && worldState.fragileResin !== undefined) {
    next.fragileResinOwned = worldState.fragileResin;
  }
  if (patch.transientResinOwned === undefined && worldState.transientResin !== undefined) {
    next.transientResinOwned = worldState.transientResin;
  }

  return next;
}

function resolveUniqueAccountName(user: MultiAccountUserState, desiredName: string, excludeId?: string): string {
  const trimmed = desiredName.trim() || "Account";
  const existingNames = new Set(
    user.accountOrder
      .filter((accountId) => accountId !== excludeId)
      .map((accountId) => user.accountsById[accountId]?.name.toLowerCase())
      .filter(Boolean),
  );

  if (!existingNames.has(trimmed.toLowerCase())) {
    return trimmed;
  }

  let copyIndex = 1;
  let candidate = `${trimmed} copy`;
  while (existingNames.has(candidate.toLowerCase())) {
    copyIndex += 1;
    candidate = `${trimmed} copy ${copyIndex}`;
  }
  return candidate;
}

function deriveAccountNameFromFileName(fileName?: string, fallback = "New Account"): string {
  if (!fileName) {
    return fallback;
  }

  const cleaned = fileName.replace(/\.[^.]+$/, "").trim();
  return cleaned || fallback;
}

function touchAccount(account: KrumpanionAccount, now = new Date()): KrumpanionAccount {
  const timestamp = now.toISOString();
  return {
    ...account,
    updatedAt: timestamp,
    metadata: {
      ...account.metadata,
      lastOpenedAt: timestamp,
    },
  };
}

function createWeaponGoalId(): string {
  return `weapon-goal-${crypto.randomUUID()}`;
}

function stampImportedWeaponState(imported: ImportedAccountState, accountId: AccountId): ImportedAccountState {
  const importedAt = imported.importMeta.importedAt;
  const weapons = imported.weapons.map((weapon) => ({
    ...weapon,
    accountId,
    importedName: weapon.importedName ?? weapon.importName ?? weapon.weaponKey,
    importSourceId: weapon.importSourceId ?? weapon.weaponInstanceId,
    weaponInstanceId: createStableEntityId(
      "weapon",
      weapon.weaponKey,
      [accountId, weapon.importSourceId ?? weapon.weaponInstanceId],
      1,
    ),
    equippedBy: weapon.equippedBy ?? weapon.equippedByCharacterId ?? null,
    locked: weapon.locked ?? weapon.lock ?? false,
    lastImportedAt: importedAt,
  }));
  const unmatchedWeapons = (imported.unmatchedWeapons ?? []).map((weapon) => ({
    ...weapon,
    accountId,
    importedName: weapon.importedName ?? weapon.importName,
    importSourceId: weapon.importSourceId ?? weapon.weaponInstanceId,
    weaponInstanceId: createStableEntityId(
      "weapon",
      weapon.importName,
      [accountId, weapon.importSourceId ?? weapon.weaponInstanceId],
      1,
    ),
    equippedBy: weapon.equippedBy ?? weapon.equippedByCharacterId ?? null,
    locked: weapon.locked ?? weapon.lock ?? false,
    lastImportedAt: importedAt,
  }));

  return {
    ...imported,
    weapons,
    unmatchedWeapons,
  };
}

function createWeaponGoalRecord(
  account: KrumpanionAccount,
  goalId: string,
  weaponKey: string,
  updates: Partial<WeaponGoal>,
  currentGoal?: WeaponGoal,
): WeaponGoal {
  const normalizedCurrentGoal = currentGoal ? normalizeWeaponGoalRecord(getWeaponGoalId(currentGoal, goalId), currentGoal, account.id) : undefined;
  const requestedLinkId =
    updates.linkedInventoryInstanceId ??
    updates.ownedWeaponInstanceId ??
    normalizedCurrentGoal?.linkedInventoryInstanceId;
  const linkedWeapon = requestedLinkId
    ? account.weapons.find((weapon) => weapon.weaponInstanceId === requestedLinkId)
    : undefined;
  const planningMode =
    updates.planningMode ??
    normalizedCurrentGoal?.planningMode ??
    defaultPlanningMode(Boolean(linkedWeapon));
  const useOwnedInstance =
    updates.useOwnedInstance ??
    (planningMode === "prefarm"
      ? false
      : normalizedCurrentGoal?.useOwnedInstance ?? Boolean(requestedLinkId));
  const linkedInventoryInstanceId = useOwnedInstance ? requestedLinkId : undefined;
  const linkedCharacterKey =
    updates.linkedCharacterKey ??
    linkedWeapon?.equippedByCharacterId ??
    normalizedCurrentGoal?.linkedCharacterKey;
  const linkStatus = !useOwnedInstance
    ? "unlinked_prefarm"
    : linkedInventoryInstanceId
      ? "linked"
      : "stale";

  return normalizeWeaponGoalRecord(
    goalId,
    {
      ...normalizedCurrentGoal,
      ...updates,
      goalId,
      weaponKey,
      accountId: account.id,
      linkedCharacterKey,
      linkedInventoryInstanceId,
      ownedWeaponInstanceId: linkedInventoryInstanceId,
      useOwnedInstance,
      linkStatus,
      planningMode,
      priority: updates.priority ?? normalizedCurrentGoal?.priority ?? 3,
      enabled: updates.enabled ?? normalizedCurrentGoal?.enabled ?? true,
      paused: updates.paused ?? normalizedCurrentGoal?.paused ?? false,
      targetAscensionPhase:
        updates.targetAscensionPhase ??
        updates.targetAscension ??
        normalizedCurrentGoal?.targetAscensionPhase,
      currentOverride: updates.currentOverride
        ? {
            ...normalizedCurrentGoal?.currentOverride,
            ...updates.currentOverride,
          }
        : normalizedCurrentGoal?.currentOverride,
    },
    account.id,
  );
}

function normalizeAccountGoalTargets(account: KrumpanionAccount, staticData: StaticGameData): KrumpanionAccount {
  return {
    ...account,
    goals: {
      ...account.goals,
      characterGoals: Object.fromEntries(
        Object.entries(account.goals.characterGoals).map(([characterKey, goal]) => {
          const isOwned = account.characters.some((character) => character.characterId === characterKey);
          return [characterKey, normalizeCharacterGoalRecord(characterKey, goal, isOwned, staticData)];
        }),
      ),
      weaponGoals: Object.fromEntries(
        Object.entries(account.goals.weaponGoals).map(([goalId, goal]) => {
          const normalizedGoal = normalizeWeaponGoalRecord(goalId, goal, account.id);
          return [normalizedGoal.goalId ?? goalId, normalizedGoal];
        }),
      ),
      artifactGoals: account.goals.artifactGoals.map((goal) => normalizeArtifactGoalRecord(goal)),
    },
  };
}

function scoreWeaponRelinkCandidate(
  previousWeapon: KrumpanionAccount["weapons"][number] | undefined,
  candidate: ImportedAccountState["weapons"][number],
  previousLinkedInstanceId: string | undefined,
): {
  regressionCount: number;
  exactStateMatch: number;
  exactLocationAndLock: number;
  exactEquippedCharacter: number;
  exactInstanceId: number;
  absoluteDistance: number;
  progressDistance: number;
} {
  if (!previousWeapon) {
    return {
      regressionCount: 0,
      exactStateMatch: 0,
      exactLocationAndLock: 0,
      exactEquippedCharacter: 0,
      exactInstanceId: previousLinkedInstanceId && candidate.weaponInstanceId === previousLinkedInstanceId ? 1 : 0,
      absoluteDistance: 0,
      progressDistance: 0,
    };
  }

  const previousRefinement = previousWeapon.refinement ?? 1;
  const candidateRefinement = candidate.refinement ?? 1;
  const levelDelta = candidate.currentLevel - previousWeapon.currentLevel;
  const ascensionDelta = candidate.currentAscension - previousWeapon.currentAscension;
  const refinementDelta = candidateRefinement - previousRefinement;

  return {
    regressionCount:
      (levelDelta < 0 ? 1 : 0) + (ascensionDelta < 0 ? 1 : 0) + (refinementDelta < 0 ? 1 : 0),
    exactStateMatch:
      candidate.currentLevel === previousWeapon.currentLevel &&
      candidate.currentAscension === previousWeapon.currentAscension &&
      candidateRefinement === previousRefinement
        ? 1
        : 0,
    exactLocationAndLock:
      (candidate.location ?? "") === (previousWeapon.location ?? "") &&
      Boolean(candidate.lock) === Boolean(previousWeapon.lock)
        ? 1
        : 0,
    exactEquippedCharacter:
      (candidate.equippedByCharacterId ?? "") === (previousWeapon.equippedByCharacterId ?? "")
        ? 1
        : 0,
    exactInstanceId: previousLinkedInstanceId && candidate.weaponInstanceId === previousLinkedInstanceId ? 1 : 0,
    absoluteDistance: Math.abs(levelDelta) + Math.abs(ascensionDelta) + Math.abs(refinementDelta),
    progressDistance:
      Math.max(0, levelDelta) + Math.max(0, ascensionDelta) + Math.max(0, refinementDelta),
  };
}

function chooseRelinkedWeapon(
  previousWeapon: KrumpanionAccount["weapons"][number] | undefined,
  previousLinkedInstanceId: string | undefined,
  candidates: ImportedAccountState["weapons"],
): ImportedAccountState["weapons"][number] | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  if (!previousWeapon && candidates.length === 1) {
    return candidates[0];
  }

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: scoreWeaponRelinkCandidate(previousWeapon, candidate, previousLinkedInstanceId),
    }))
    .sort((left, right) => {
      return (
        left.score.regressionCount - right.score.regressionCount ||
        right.score.exactStateMatch - left.score.exactStateMatch ||
        right.score.exactLocationAndLock - left.score.exactLocationAndLock ||
        right.score.exactEquippedCharacter - left.score.exactEquippedCharacter ||
        right.score.exactInstanceId - left.score.exactInstanceId ||
        left.score.absoluteDistance - right.score.absoluteDistance ||
        left.score.progressDistance - right.score.progressDistance ||
        right.candidate.currentLevel - left.candidate.currentLevel ||
        right.candidate.currentAscension - left.candidate.currentAscension ||
        (right.candidate.refinement ?? 1) - (left.candidate.refinement ?? 1)
      );
    });

  if (ranked.length === 1) {
    return ranked[0].candidate;
  }

  const [best, second] = ranked;
  const isTie =
    best.score.regressionCount === second.score.regressionCount &&
    best.score.exactStateMatch === second.score.exactStateMatch &&
    best.score.exactLocationAndLock === second.score.exactLocationAndLock &&
    best.score.exactEquippedCharacter === second.score.exactEquippedCharacter &&
    best.score.exactInstanceId === second.score.exactInstanceId &&
    best.score.absoluteDistance === second.score.absoluteDistance &&
    best.score.progressDistance === second.score.progressDistance &&
    best.candidate.currentLevel === second.candidate.currentLevel &&
    best.candidate.currentAscension === second.candidate.currentAscension &&
    (best.candidate.refinement ?? 1) === (second.candidate.refinement ?? 1);

  return isTie ? undefined : best.candidate;
}

function relinkWeaponGoalsAfterImport(
  goals: KrumpanionAccount["goals"]["weaponGoals"],
  previousWeapons: KrumpanionAccount["weapons"],
  nextWeapons: ImportedAccountState["weapons"],
  accountId: AccountId,
): KrumpanionAccount["goals"]["weaponGoals"] {
  const previousWeaponsById = new Map(previousWeapons.map((weapon) => [weapon.weaponInstanceId, weapon]));
  const relinkedGoals: KrumpanionAccount["goals"]["weaponGoals"] = {};

  for (const [storedGoalId, rawGoal] of Object.entries(goals)) {
    const normalizedGoal = normalizeWeaponGoalRecord(storedGoalId, rawGoal, accountId);
    const normalizedGoalId = normalizedGoal.goalId ?? storedGoalId;
    if (!normalizedGoal.useOwnedInstance) {
      relinkedGoals[normalizedGoalId] = {
        ...normalizedGoal,
        linkStatus: "unlinked_prefarm",
        linkedInventoryInstanceId: undefined,
        ownedWeaponInstanceId: undefined,
      };
      continue;
    }

    const previousLinkedInstanceId = getLinkedWeaponInstanceId(normalizedGoal);
    const previousLinkedWeapon = previousLinkedInstanceId ? previousWeaponsById.get(previousLinkedInstanceId) : undefined;
    const sameWeaponCandidates = nextWeapons.filter((weapon) => weapon.weaponKey === normalizedGoal.weaponKey);
    const exactLocationAndLockCandidates = previousLinkedWeapon
      ? sameWeaponCandidates.filter(
          (weapon) =>
            (weapon.location ?? "") === (previousLinkedWeapon.location ?? "") &&
            Boolean(weapon.lock) === Boolean(previousLinkedWeapon.lock),
        )
      : [];
    const matchedWeapon =
      chooseRelinkedWeapon(previousLinkedWeapon, previousLinkedInstanceId, exactLocationAndLockCandidates) ??
      chooseRelinkedWeapon(previousLinkedWeapon, previousLinkedInstanceId, sameWeaponCandidates);

    relinkedGoals[normalizedGoalId] = {
      ...normalizedGoal,
      linkedCharacterKey: matchedWeapon?.equippedByCharacterId ?? normalizedGoal.linkedCharacterKey,
      linkedInventoryInstanceId: matchedWeapon?.weaponInstanceId ?? normalizedGoal.linkedInventoryInstanceId,
      ownedWeaponInstanceId: matchedWeapon?.weaponInstanceId ?? normalizedGoal.ownedWeaponInstanceId,
      linkStatus: matchedWeapon ? "linked" : "stale",
    };
  }

  return relinkedGoals;
}

function reconcileCharacterGoalsAfterImport(
  goals: KrumpanionAccount["goals"]["characterGoals"],
  importedCharacters: ImportedAccountState["characters"],
): KrumpanionAccount["goals"]["characterGoals"] {
  const ownedCharacterKeys = new Set(importedCharacters.map((character) => character.characterId));
  const nextGoals: KrumpanionAccount["goals"]["characterGoals"] = {};

  for (const [characterKey, goal] of Object.entries(goals)) {
    nextGoals[characterKey] =
      goal.planningMode === "prefarm" && ownedCharacterKeys.has(characterKey)
        ? {
            ...goal,
            planningMode: "owned",
          }
        : goal;
  }

  return nextGoals;
}

function isValidMaterialQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 0;
}

function applyMaterialQuantityUpdates(
  account: KrumpanionAccount,
  updates: Record<string, number>,
  source: MaterialEditSource,
  now = new Date(),
): KrumpanionAccount {
  const nextInventory = { ...account.inventory };
  const nextMaterialEditState = { ...account.materialEditState };
  const editedAt = now.toISOString();

  for (const [materialKey, quantity] of Object.entries(updates)) {
    if (!isValidMaterialQuantity(quantity)) {
      continue;
    }

    if (quantity <= 0) {
      delete nextInventory[materialKey];
      delete nextMaterialEditState[materialKey];
      continue;
    }

    nextInventory[materialKey] = quantity;
    nextMaterialEditState[materialKey] = {
      editedAt,
      source,
    };
  }

  return touchAccount(
    {
      ...account,
      inventory: nextInventory,
      materialEditState: nextMaterialEditState,
    },
    now,
  );
}

function createAccountFromImport(
  imported: ImportedAccountState,
  input: {
    id: AccountId;
    name: string;
    now?: Date;
    fileName?: string;
    source?: AccountImportState["lastGoodSource"];
    metadata?: Partial<AccountMetadata>;
  },
): KrumpanionAccount {
  const now = input.now ?? new Date();
  const blank = createBlankAccount({
    id: input.id,
    name: input.name,
    now,
    metadata: input.metadata,
  });
  const stampedImport = stampImportedWeaponState(imported, input.id);

  return {
    ...blank,
    ...stampedImport,
    id: input.id,
    name: input.name,
    importedInventory: { ...stampedImport.inventory },
    importMeta: {
      ...stampedImport.importMeta,
      source: input.source ?? stampedImport.importMeta.source,
    },
    importState: {
      lastGoodImportAt: stampedImport.importMeta.importedAt,
      lastGoodFileName: input.fileName,
      lastGoodSource: input.source ?? "unknown",
      lastGoodFormatVersion: String(stampedImport.importMeta.version),
      importWarnings: stampedImport.warnings.map((warning) => warning.message),
      importSummary: createImportedAccountSummary(stampedImport),
    },
    warnings: stampedImport.warnings,
    materialEditState: {},
  };
}

function replaceAccountSnapshot(
  account: KrumpanionAccount,
  imported: ImportedAccountState,
  input: {
    now?: Date;
    fileName?: string;
    source?: AccountImportState["lastGoodSource"];
  },
): KrumpanionAccount {
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const stampedImport = stampImportedWeaponState(imported, account.id);

  return {
    ...account,
    ...stampedImport,
    importedInventory: { ...stampedImport.inventory },
    importMeta: {
      ...stampedImport.importMeta,
      source: input.source ?? stampedImport.importMeta.source,
    },
    updatedAt: timestamp,
    importState: {
      ...account.importState,
      lastGoodImportAt: stampedImport.importMeta.importedAt,
      lastGoodFileName: input.fileName,
      lastGoodSource: input.source ?? "unknown",
      lastGoodFormatVersion: String(stampedImport.importMeta.version),
      importWarnings: stampedImport.warnings.map((warning) => warning.message),
      importSummary: createImportedAccountSummary(stampedImport),
    },
    warnings: stampedImport.warnings,
    materialEditState: {},
  };
}

function updateAccountInUser(
  user: MultiAccountUserState,
  accountId: AccountId,
  updater: (account: KrumpanionAccount) => KrumpanionAccount,
): MultiAccountUserState {
  const current = user.accountsById[accountId];
  if (!current) {
    return user;
  }

  return {
    ...user,
    accountsById: {
      ...user.accountsById,
      [accountId]: updater(current),
    },
  };
}

function setAccountPlannerStatus(
  user: MultiAccountUserState,
  accountId: AccountId,
  plannerStatus: PlannerRecalculationStatus,
  extra?: {
    recentChanges?: RecentPlannerChange[];
    recentImports?: RecentImportEntry[];
    goalProgressTracking?: Record<string, GoalProgressTrackingRecord>;
    goalMilestones?: GoalMilestoneLogEntry[];
  },
): MultiAccountUserState {
  return updateAccountInUser(user, accountId, (account) => ({
    ...account,
    plannerStatus,
    recentChanges: extra?.recentChanges ? appendRecentChanges(account.recentChanges, extra.recentChanges) : account.recentChanges,
    recentImports: extra?.recentImports ? appendRecentImports(account.recentImports, extra.recentImports) : account.recentImports,
    goalProgressTracking: extra?.goalProgressTracking ?? account.goalProgressTracking,
    goalMilestones: extra?.goalMilestones ?? account.goalMilestones,
  }));
}

const MAX_GOAL_MILESTONES = 100;

function appendGoalMilestones(existing: GoalMilestoneLogEntry[], additions: GoalMilestoneLogEntry[]): GoalMilestoneLogEntry[] {
  return [...additions, ...existing].slice(0, MAX_GOAL_MILESTONES);
}

function buildGoalTrackingKey(goalType: "character" | "weapon", goalId: string): string {
  return `${goalType}:${goalId}`;
}

function buildCharacterGoalTrackingSignature(goal: CharacterGoal): string {
  return JSON.stringify({
    characterKey: goal.characterKey,
    planningMode: goal.planningMode,
    targetLevel: goal.targetLevel ?? null,
    targetAscension: goal.targetAscension ?? null,
    talents: goal.talents ?? null,
    currentOverride: goal.currentOverride ?? null,
  });
}

function buildWeaponGoalTrackingSignature(goal: WeaponGoal): string {
  return JSON.stringify({
    goalId: goal.goalId,
    weaponKey: goal.weaponKey,
    planningMode: goal.planningMode,
    targetLevel: goal.targetLevel ?? null,
    targetAscensionPhase: goal.targetAscensionPhase ?? null,
    linkedInventoryInstanceId: goal.linkedInventoryInstanceId ?? null,
    linkedCharacterKey: goal.linkedCharacterKey ?? null,
    useOwnedInstance: goal.useOwnedInstance ?? null,
    currentOverride: goal.currentOverride ?? null,
  });
}

function syncGoalProgressState(params: {
  beforeAccount?: KrumpanionAccount;
  afterAccount: KrumpanionAccount;
  beforeOutput: ReturnType<typeof buildPlannerOutputForAccount> | null;
  afterOutput: ReturnType<typeof buildPlannerOutputForAccount>;
  changedAt: string;
}): {
  tracking: Record<string, GoalProgressTrackingRecord>;
  milestones: GoalMilestoneLogEntry[];
} {
  const tracking: Record<string, GoalProgressTrackingRecord> = {};
  const previousTracking = params.beforeAccount?.goalProgressTracking ?? params.afterAccount.goalProgressTracking ?? {};
  const previousMilestones = params.beforeAccount?.goalMilestones ?? params.afterAccount.goalMilestones ?? [];
  const beforeProgress = params.beforeOutput ? buildTrackedGoalProgressMap(params.beforeOutput) : new Map();
  const afterProgress = buildTrackedGoalProgressMap(params.afterOutput);
  const newMilestones: GoalMilestoneLogEntry[] = [];

  for (const goal of Object.values(params.afterAccount.goals.characterGoals)) {
    const trackingKey = buildGoalTrackingKey("character", goal.characterKey);
    const currentProgress = afterProgress.get(trackingKey);
    if (!currentProgress) {
      const existing = previousTracking[trackingKey];
      if (goal.paused && existing) {
        tracking[trackingKey] = existing;
      }
      continue;
    }

    const signature = buildCharacterGoalTrackingSignature(goal);
    const existing = previousTracking[trackingKey];
    const carriesForward = existing && existing.targetSignature === signature;
    const nextTracking: GoalProgressTrackingRecord = carriesForward
      ? {
          ...existing,
          goalLabel: currentProgress.goalLabel,
        }
      : {
          goalId: goal.characterKey,
          goalType: "character",
          goalLabel: currentProgress.goalLabel,
          targetSignature: signature,
          startedAt: params.changedAt,
          baseline: buildGoalBucketSnapshot("character", currentProgress.status === "completed" ? undefined : params.afterOutput.goalResolutions.find((resolution) => resolution.goalType === "character" && resolution.goalKey === goal.characterKey)),
        };

    if (carriesForward && !existing.completedAt) {
      const previousProgress = beforeProgress.get(trackingKey);
      if (previousProgress?.status !== "completed" && currentProgress.status === "completed") {
        nextTracking.completedAt = params.changedAt;
        newMilestones.push({
          id: crypto.randomUUID(),
          goalId: goal.characterKey,
          goalType: "character",
          goalLabel: currentProgress.goalLabel,
          milestoneType: "character_built",
          occurredAt: params.changedAt,
          startedAt: existing.startedAt,
          targetSummary: currentProgress.targetSummary,
        });
      }
    }

    tracking[trackingKey] = nextTracking;
  }

  for (const [goalId, goal] of Object.entries(params.afterAccount.goals.weaponGoals)) {
    const trackingKey = buildGoalTrackingKey("weapon", goalId);
    const currentProgress = afterProgress.get(trackingKey);
    if (!currentProgress) {
      const existing = previousTracking[trackingKey];
      if (goal.paused && existing) {
        tracking[trackingKey] = existing;
      }
      continue;
    }

    const signature = buildWeaponGoalTrackingSignature(goal);
    const existing = previousTracking[trackingKey];
    const carriesForward = existing && existing.targetSignature === signature;
    const nextTracking: GoalProgressTrackingRecord = carriesForward
      ? {
          ...existing,
          goalLabel: currentProgress.goalLabel,
        }
      : {
          goalId,
          goalType: "weapon",
          goalLabel: currentProgress.goalLabel,
          targetSignature: signature,
          startedAt: params.changedAt,
          baseline: buildGoalBucketSnapshot("weapon", currentProgress.status === "completed" ? undefined : params.afterOutput.goalResolutions.find((resolution) => resolution.goalType === "weapon" && resolution.goalKey === goalId)),
        };

    if (carriesForward && !existing.completedAt) {
      const previousProgress = beforeProgress.get(trackingKey);
      if (previousProgress?.status !== "completed" && currentProgress.status === "completed") {
        nextTracking.completedAt = params.changedAt;
        newMilestones.push({
          id: crypto.randomUUID(),
          goalId,
          goalType: "weapon",
          goalLabel: currentProgress.goalLabel,
          milestoneType: "weapon_goal_met",
          occurredAt: params.changedAt,
          startedAt: existing.startedAt,
          targetSummary: currentProgress.targetSummary,
        });
      }
    }

    tracking[trackingKey] = nextTracking;
  }

  return {
    tracking,
    milestones: newMilestones.length > 0 ? appendGoalMilestones(previousMilestones, newMilestones) : previousMilestones,
  };
}

function buildGoalBackupPayload(account: KrumpanionAccount): GoalBackupPayload {
  return {
    accountId: account.id,
    accountName: account.name,
    goals: clone(account.goals),
    plannerSettings: clone(account.plannerSettings),
  };
}

function buildGoalBackupTimestampMap(accountId: AccountId, goalBackups: GoalBackupRecord[]): Record<AccountId, string> {
  const latest = goalBackups[0]?.createdAt;
  return latest ? { [accountId]: latest } : {};
}

function updatePersistenceStatus(
  current: PersistenceStatus,
  patch: Partial<PersistenceStatus>,
): PersistenceStatus {
  return {
    ...current,
    ...patch,
    lastGoalBackupAtByAccount: {
      ...current.lastGoalBackupAtByAccount,
      ...(patch.lastGoalBackupAtByAccount ?? {}),
    },
  };
}

function syncBackupCollections(
  currentState: AppState,
  patch: Partial<AppState>,
  accountId: AccountId,
  goalBackups: GoalBackupRecord[],
  saveRecoveryPoints: SaveRecoveryPointRecord[],
): Partial<AppState> {
  return {
    ...patch,
    goalBackups: currentState.user.activeAccountId === accountId ? goalBackups : currentState.goalBackups,
    saveRecoveryPoints,
  };
}

async function loadBackupCollections(accountId: AccountId) {
  const [goalBackups, saveRecoveryPoints] = await Promise.all([
    persistenceAdapter.listGoalBackups(accountId),
    persistenceAdapter.listSaveRecoveryPoints(),
  ]);

  return { goalBackups, saveRecoveryPoints };
}

async function createSaveRecoveryPointForState(
  state: Pick<AppState, "user" | "settings" | "overridePack" | "saveInfo">,
  reason: BackupReason,
  accountId?: AccountId,
): Promise<SaveRecoveryPointRecord> {
  const saveFile = buildSaveFromState({
    user: state.user,
    settings: state.settings,
    overridePack: state.overridePack,
    saveInfo: state.saveInfo,
  });

  return persistenceAdapter.createSaveRecoveryPoint(saveFile, reason, accountId);
}

function scheduleGoalBackup(params: {
  accountId: AccountId;
  reason: BackupReason;
  getState: () => AppState;
  setState: (patch: Partial<AppState>) => void;
}): void {
  const existingTimer = goalBackupTimers.get(params.accountId);
  if (existingTimer) {
    globalThis.clearTimeout(existingTimer);
  }

  const timer = globalThis.setTimeout(() => {
    void (async () => {
      const currentState = params.getState();
      const account = currentState.user.accountsById[params.accountId];
      if (!account) {
        goalBackupTimers.delete(params.accountId);
        return;
      }

      params.setState({
        persistenceStatus: updatePersistenceStatus(currentState.persistenceStatus, {
          status: "backupSaving",
          lastBackupError: undefined,
        }),
      });

      try {
        const record = await persistenceAdapter.createGoalBackup(
          params.accountId,
          buildGoalBackupPayload(account),
          params.reason,
        );
        const [goalBackups, saveRecoveryPoints] = await Promise.all([
          persistenceAdapter.listGoalBackups(params.accountId),
          persistenceAdapter.listSaveRecoveryPoints(),
        ]);
        const latestState = params.getState();
        params.setState(
          syncBackupCollections(
            latestState,
            {
              persistenceStatus: updatePersistenceStatus(latestState.persistenceStatus, {
                status: "backupSaved",
                lastGoalBackupAtByAccount: {
                  [params.accountId]: record.createdAt,
                },
                lastBackupError: undefined,
              }),
            },
            params.accountId,
            goalBackups,
            saveRecoveryPoints,
          ),
        );
      } catch (error) {
        const latestState = params.getState();
        params.setState({
          persistenceStatus: updatePersistenceStatus(latestState.persistenceStatus, {
            status: "failed",
            lastBackupError: `Goal backup failed: ${toErrorMessage(error)}`,
          }),
        });
      } finally {
        goalBackupTimers.delete(params.accountId);
      }
    })();
  }, GOAL_BACKUP_DEBOUNCE_MS);

  goalBackupTimers.set(params.accountId, timer);
}

async function persistLiveSnapshot(params: {
  state: AppState;
  setState: (patch: Partial<AppState>) => void;
  user?: MultiAccountUserState;
  settings?: AppSettings;
  overridePack?: OverrideDataPack | null;
  patch?: Partial<AppState>;
  importErrors?: string[];
  importWarnings?: string[];
}): Promise<SaveInfo | null> {
  const nextUser = params.user ?? params.state.user;
  const nextSettings = params.settings ?? params.state.settings;
  const nextOverridePack = params.overridePack ?? params.state.overridePack;
  const savingStatus = updatePersistenceStatus(params.state.persistenceStatus, {
    status: "saving",
    lastBackupError: undefined,
  });

  params.setState({
    persistenceStatus: savingStatus,
  });

  try {
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(params.state),
      user: nextUser,
      settings: nextSettings,
      overridePack: nextOverridePack,
    });

    const latestState = params.state;
    params.setState({
      user: nextUser,
      settings: nextSettings,
      overridePack: nextOverridePack,
      saveInfo: toSaveInfo(saveFile),
      importErrors: params.importErrors ?? [],
      importWarnings: params.importWarnings ?? getActiveAccount(nextUser).importState.importWarnings ?? [],
      persistenceStatus: updatePersistenceStatus(latestState.persistenceStatus, {
        status: "saved",
        lastSavedAt: saveFile.updatedAt,
        lastBackupError: undefined,
      }),
      ...(params.patch ?? {}),
    });
    return toSaveInfo(saveFile);
  } catch (error) {
    const latestState = params.state;
    params.setState({
      user: nextUser,
      settings: nextSettings,
      overridePack: nextOverridePack,
      importErrors: params.importErrors ?? latestState.importErrors,
      importWarnings: params.importWarnings ?? getActiveAccount(nextUser).importState.importWarnings ?? [],
      persistenceStatus: updatePersistenceStatus(latestState.persistenceStatus, {
        status: "failed",
        lastBackupError: `Save failed: ${toErrorMessage(error)}`,
      }),
      ...(params.patch ?? {}),
    });
    return null;
  }
}

async function finalizePlannerAwareUserUpdate(params: {
  state: AppState;
  setState: (patch: Partial<AppState>) => void;
  getState: () => AppState;
  nextUser: MultiAccountUserState;
  targetAccountId: AccountId;
  trigger: RecentPlannerChangeTrigger;
  inventoryTrigger?: Parameters<typeof buildInventoryChangeEntries>[0]["trigger"];
  changedMaterialKeys?: string[];
  importMetadata?: { fileName?: string; source?: AccountImportState["lastGoodSource"] };
  recordGoalChanges?: boolean;
  staticData?: StaticGameData;
  goalBackupReason?: BackupReason;
  createRecoveryPointReason?: BackupReason;
}): Promise<void> {
  const timestamp = new Date().toISOString();
  const beforeAccount = params.state.user.accountsById[params.targetAccountId];
  const candidateAccount = params.nextUser.accountsById[params.targetAccountId];
  const staticData = params.staticData ?? params.state.staticData;
  let recoveryPointError: string | undefined;

  if (!candidateAccount) {
    return;
  }

  if (params.createRecoveryPointReason) {
    params.setState({
      persistenceStatus: updatePersistenceStatus(params.state.persistenceStatus, {
        status: "backupSaving",
        lastBackupError: undefined,
      }),
    });
    try {
      await createSaveRecoveryPointForState(params.state, params.createRecoveryPointReason, params.targetAccountId);
    } catch (error) {
      recoveryPointError = `Recovery point failed: ${toErrorMessage(error)}`;
    }
  }

  try {
    const baselineAccount =
      beforeAccount ??
      createBlankAccount({
        id: params.targetAccountId,
        name: candidateAccount.name,
        now: new Date(candidateAccount.createdAt),
        metadata: candidateAccount.metadata,
      });
    const beforeOutput = beforeAccount
      ? buildPlannerOutputForAccount({
          account: beforeAccount,
          staticData,
          today: params.state.today,
        })
      : null;
    const afterOutput = buildPlannerOutputForAccount({
      account: candidateAccount,
      staticData,
      today: params.state.today,
    });
    const plannerStatus = buildPlannerStatusFromOutput(afterOutput, timestamp);
    const progressState = syncGoalProgressState({
      beforeAccount,
      afterAccount: candidateAccount,
      beforeOutput,
      afterOutput,
      changedAt: timestamp,
    });

    const nextAccount = {
      ...candidateAccount,
      plannerStatus,
      goalProgressTracking: progressState.tracking,
      goalMilestones: progressState.milestones,
    };

    const inventoryChanges =
      params.inventoryTrigger
        ? buildInventoryChangeEntries({
            beforeAccount: baselineAccount,
            afterAccount: nextAccount,
            staticData,
            changedAt: timestamp,
            trigger: params.inventoryTrigger,
            changedKeys: params.changedMaterialKeys,
            limit: params.inventoryTrigger === "good_import" ? MAX_IMPORT_MATERIAL_CHANGES : undefined,
          })
        : [];
    const goalChanges =
      beforeOutput && params.recordGoalChanges !== false
        ? buildGoalProgressChanges({
            beforeOutput,
            afterOutput,
            changedAt: timestamp,
            trigger:
              params.trigger === "manual_edit" ||
              params.trigger === "bulk_edit" ||
              params.trigger === "reset_to_imported" ||
              params.trigger === "good_import" ||
              params.trigger === "goal_edit" ||
              params.trigger === "goal_reset" ||
              params.trigger === "world_state_change" ||
              params.trigger === "planner_settings"
                ? params.trigger
                : "planner_settings",
          })
        : [];
    const recalculationChange = createRecalculationChange({
      trigger: params.trigger,
      status: plannerStatus,
      changedAt: timestamp,
      beforeOutput,
      afterOutput,
    });
    const extraRecentImports =
      params.trigger === "good_import"
        ? [
            buildRecentImportEntry({
              account: nextAccount,
              changedAt: timestamp,
              fileName: params.importMetadata?.fileName,
              source: params.importMetadata?.source,
              changedMaterialCount: inventoryChanges.length,
              overwrittenManualCount:
                params.changedMaterialKeys?.filter((materialKey) => Boolean(beforeAccount?.materialEditState[materialKey])).length ?? 0,
            }),
          ]
        : [];

    const userWithTelemetry = setAccountPlannerStatus(
      {
        ...params.nextUser,
        accountsById: {
          ...params.nextUser.accountsById,
          [params.targetAccountId]: nextAccount,
        },
      },
      params.targetAccountId,
      plannerStatus,
      {
        recentChanges: [recalculationChange, ...inventoryChanges, ...goalChanges],
        recentImports: extraRecentImports,
        goalProgressTracking: progressState.tracking,
        goalMilestones: progressState.milestones,
      },
    );

    const { goalBackups, saveRecoveryPoints } = await loadBackupCollections(params.targetAccountId);
    const persisted = await persistLiveSnapshot({
      state: params.state,
      setState: params.setState,
      user: userWithTelemetry,
      importErrors: [],
      importWarnings: getActiveAccount(userWithTelemetry).importState.importWarnings ?? [],
      patch: syncBackupCollections(
        params.state,
        {
          persistenceStatus: updatePersistenceStatus(params.state.persistenceStatus, {
            ...(params.createRecoveryPointReason ? { status: "backupSaved" as const } : {}),
            ...(recoveryPointError
              ? { lastBackupError: recoveryPointError }
              : params.createRecoveryPointReason
                ? { lastBackupError: undefined }
                : {}),
            lastGoalBackupAtByAccount: buildGoalBackupTimestampMap(params.targetAccountId, goalBackups),
          }),
        },
        params.targetAccountId,
        goalBackups,
        saveRecoveryPoints,
      ),
    });

    if (params.goalBackupReason && persisted) {
      scheduleGoalBackup({
        accountId: params.targetAccountId,
        reason: params.goalBackupReason,
        getState: params.getState,
        setState: params.setState,
      });
    }
  } catch (error) {
    const failureStatus = buildPlannerFailureStatus(beforeAccount ?? candidateAccount, error, timestamp);
    const failedUser = setAccountPlannerStatus(params.state.user, params.targetAccountId, failureStatus, {
      recentChanges: [
        createRecalculationChange({
          trigger: params.trigger,
          status: failureStatus,
          changedAt: timestamp,
        }),
      ],
    });
    const { goalBackups, saveRecoveryPoints } = await loadBackupCollections(params.targetAccountId);
    await persistLiveSnapshot({
      state: params.state,
      setState: params.setState,
      user: failedUser,
      importErrors: failureStatus.lastError ? [failureStatus.lastError] : params.state.importErrors,
      importWarnings: getActiveAccount(failedUser).importState.importWarnings ?? [],
      patch: syncBackupCollections(
        params.state,
        {
          persistenceStatus: updatePersistenceStatus(params.state.persistenceStatus, {
            status: "failed",
            lastBackupError: recoveryPointError ?? failureStatus.lastError,
            lastGoalBackupAtByAccount: buildGoalBackupTimestampMap(params.targetAccountId, goalBackups),
          }),
        },
        params.targetAccountId,
        goalBackups,
        saveRecoveryPoints,
      ),
    });
  }
}

function ensureUserState(user: MultiAccountUserState): MultiAccountUserState {
  const active = user.accountsById[user.activeAccountId];
  if (active && user.accountOrder.length > 0) {
    return user;
  }

  const fallbackId = user.accountOrder.find((accountId) => user.accountsById[accountId]);
  if (fallbackId) {
    return {
      ...user,
      activeAccountId: fallbackId,
    };
  }

  return createDefaultMultiAccountUserState();
}

function synchronizeChecklistPlannerStateInUser(
  user: MultiAccountUserState,
  accountId = user.activeAccountId,
  now = new Date(),
): MultiAccountUserState {
  return updateAccountInUser(user, accountId, (account) => synchronizeChecklistPlannerState(account, now));
}

function buildPersistedSlice(state: Pick<AppState, "user" | "settings" | "overridePack" | "saveInfo">) {
  return {
    user: state.user,
    settings: state.settings,
    overridePack: state.overridePack,
    saveInfo: state.saveInfo,
  };
}

function exportAccountPayload(account: KrumpanionAccount): ExportedKrumpanionAccount {
  const { id, ...rest } = account;
  return createDefaultAccountExport({
    ...clone(rest),
    originalAccountId: id,
  });
}

function normalizeImportedAccountPayload(value: unknown): ExportedKrumpanionAccount | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ExportedKrumpanionAccount>;
  if (candidate.schemaVersion !== 1 || !candidate.account || typeof candidate.account !== "object") {
    return null;
  }

  const account = candidate.account as Partial<KrumpanionAccount>;
  if (
    typeof account.name !== "string" ||
    !account.importMeta ||
    !Array.isArray(account.characters) ||
    !Array.isArray(account.weapons) ||
    !Array.isArray(account.artifacts) ||
    !account.inventory ||
    !account.goals ||
    !account.plannerSettings
  ) {
    return null;
  }

  return candidate as ExportedKrumpanionAccount;
}

export interface ImportGoodTextOptions {
  asNewAccount?: boolean;
  fileName?: string;
  source?: AccountImportState["lastGoodSource"];
}

export interface AppState {
  staticData: StaticGameData;
  overridePack: OverrideDataPack | null;
  user: MultiAccountUserState;
  settings: AppSettings;
  today: DayOfWeek;
  timeSensitiveAt: string;
  importErrors: string[];
  importWarnings: string[];
  overrideText: string;
  saveInfo: SaveInfo;
  persistenceStatus: PersistenceStatus;
  goalBackups: GoalBackupRecord[];
  saveRecoveryPoints: SaveRecoveryPointRecord[];
  isHydrated: boolean;
  refreshToday: () => void;
  refreshTimeSensitiveState: () => Promise<void>;
  refreshBackupState: () => Promise<void>;
  restoreGoalBackup: (backupId: string) => Promise<void>;
  restoreSaveRecoveryPoint: (backupId: string) => Promise<void>;
  hydrate: () => Promise<void>;
  importGoodText: (text: string, options?: ImportGoodTextOptions) => Promise<void>;
  importOverrideText: (text: string) => Promise<void>;
  clearOverridePack: () => Promise<void>;
  setActiveTab: (activeTab: AppSettings["activeTab"]) => Promise<void>;
  setPlannerView: (plannerView: PlannerView) => Promise<void>;
  createAccount: (input?: Partial<AccountMetadata> & { name?: string }) => Promise<AccountId>;
  renameAccount: (accountId: AccountId, name: string) => Promise<void>;
  duplicateAccount: (accountId: AccountId, newName?: string) => Promise<AccountId>;
  deleteAccount: (accountId: AccountId) => Promise<void>;
  switchAccount: (accountId: AccountId) => Promise<void>;
  updateAccountMetadata: (accountId: AccountId, patch: Partial<AccountMetadata>) => Promise<void>;
  updateActiveAccountWorldState: (patch: Partial<AccountWorldState>) => Promise<void>;
  replaceActiveAccountFromGoodImport: (
    imported: ImportedAccountState,
    importMetadata?: { fileName?: string; source?: AccountImportState["lastGoodSource"] },
  ) => Promise<void>;
  setActiveMaterialQuantity: (materialKey: string, quantity: number) => Promise<void>;
  incrementActiveMaterialQuantity: (materialKey: string, delta: number) => Promise<void>;
  bulkSetActiveMaterialQuantities: (
    updates: Record<string, number>,
    meta?: { source?: MaterialEditSource },
  ) => Promise<void>;
  resetActiveMaterialToImported: (materialKey: string) => Promise<void>;
  clearActiveMaterialQuantity: (materialKey: string) => Promise<void>;
  clearActiveAccountInventory: () => Promise<void>;
  resetActiveAccountGoals: () => Promise<void>;
  updateCharacterGoal: (characterKey: string, updates: Partial<CharacterGoal>) => Promise<void>;
  pauseCharacterGoal: (characterKey: string) => Promise<void>;
  resumeCharacterGoal: (characterKey: string) => Promise<void>;
  resetCharacterGoal: (characterKey: string) => Promise<void>;
  bulkUpdateCharacterGoals: (characterKeys: string[], updates: Partial<CharacterGoal>) => Promise<void>;
  createWeaponGoal: (input: {
    weaponKey: string;
    linkedInventoryInstanceId?: string;
    linkedCharacterKey?: string;
    useOwnedInstance?: boolean;
    priority?: number;
    targetLevel?: number;
    targetAscensionPhase?: number;
    enabled?: boolean;
    paused?: boolean;
    notes?: string;
    currentOverride?: WeaponGoal["currentOverride"];
  }) => Promise<string>;
  updateWeaponGoal: (weaponId: string, weaponKey: string, updates: Partial<WeaponGoal>) => Promise<void>;
  pauseWeaponGoal: (weaponId: string, weaponKey: string) => Promise<void>;
  resumeWeaponGoal: (weaponId: string, weaponKey: string) => Promise<void>;
  resetWeaponGoal: (weaponId: string) => Promise<void>;
  bulkUpdateWeaponGoals: (weaponIds: string[], updates: Partial<WeaponGoal>) => Promise<void>;
  addArtifactGoal: (initial?: Partial<ArtifactGoal>) => Promise<string>;
  updateArtifactGoal: (id: string, updates: Partial<ArtifactGoal>) => Promise<void>;
  removeArtifactGoal: (id: string) => Promise<void>;
  updatePlannerSettings: (updates: Partial<PlannerSettings>) => Promise<void>;
  setChecklistResetTaskCompleted: (taskKey: ResetWindowChecklistKey, completed: boolean, at?: string | Date) => Promise<void>;
  setWeeklyBossClaimsUsed: (count: number, at?: string | Date) => Promise<void>;
  adjustWeeklyBossClaims: (delta: number, at?: string | Date) => Promise<void>;
  startChecklistCooldown: (taskKey: CooldownChecklistKey, at?: string | Date) => Promise<void>;
  clearChecklistCooldown: (taskKey: CooldownChecklistKey) => Promise<void>;
  setRealmCurrencyClaimedNow: (at?: string | Date) => Promise<void>;
  updateRealmCurrencySettings: (updates: { realmLevel?: number; trustRank?: number }) => Promise<void>;
  exportSaveFile: () => Promise<string>;
  importSaveFile: (text: string) => Promise<void>;
  exportAccount: (accountId: AccountId) => Promise<ExportedKrumpanionAccount>;
  importAccount: (value: unknown) => Promise<AccountId>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  staticData: createStaticData(),
  overridePack: null,
  user: clone(defaultSave.user),
  settings: clone(defaultSave.settings),
  today: getToday(),
  timeSensitiveAt: new Date().toISOString(),
  importErrors: [],
  importWarnings: [],
  overrideText: "",
  saveInfo: {
    schemaVersion: defaultSave.schemaVersion,
    appVersion: defaultSave.appVersion,
    createdAt: defaultSave.createdAt,
    updatedAt: defaultSave.updatedAt,
  },
  persistenceStatus: createDefaultPersistenceStatus(toSaveInfo(defaultSave)),
  goalBackups: [],
  saveRecoveryPoints: [],
  isHydrated: false,
  refreshToday: () => {
    set((state) => {
      const nextToday = getToday();
      return state.today === nextToday ? state : { today: nextToday };
    });
  },
  refreshTimeSensitiveState: async () => {
    const state = get();
    const now = new Date();
    const timeSensitiveAt = now.toISOString();
    const nextToday = getGenshinResetDay(now);
    const activeAccountId = state.user.activeAccountId;
    const activeAccount = state.user.accountsById[activeAccountId];

    if (!activeAccount) {
      set({
        today: nextToday,
        timeSensitiveAt,
      });
      return;
    }

    const synchronizedAccount = synchronizeChecklistPlannerState(activeAccount, now);
    if (synchronizedAccount === activeAccount) {
      set({
        today: nextToday,
        timeSensitiveAt,
      });
      return;
    }

    const user = updateAccountInUser(state.user, activeAccountId, () => touchAccount(synchronizedAccount, now));
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
      importErrors: state.importErrors,
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
      patch: {
        today: nextToday,
        timeSensitiveAt,
      },
    });
  },
  refreshBackupState: async () => {
    const state = get();
    const activeAccountId = state.user.activeAccountId;
    const { goalBackups, saveRecoveryPoints } = await loadBackupCollections(activeAccountId);
    set(
      syncBackupCollections(
        state,
        {
          persistenceStatus: updatePersistenceStatus(state.persistenceStatus, {
            lastGoalBackupAtByAccount: buildGoalBackupTimestampMap(activeAccountId, goalBackups),
          }),
        },
        activeAccountId,
        goalBackups,
        saveRecoveryPoints,
      ),
    );
  },
  hydrate: async () => {
    const saveFile = await persistenceAdapter.loadSaveFile();
    const staticData = createStaticData(saveFile.overridePack);
    const now = new Date();
    const ensuredUser = ensureUserState({
      ...saveFile.user,
      accountsById: Object.fromEntries(
        Object.entries(saveFile.user.accountsById).map(([accountId, account]) => [accountId, normalizeAccountGoalTargets(account, staticData)]),
      ),
    });
    const user = synchronizeChecklistPlannerStateInUser(ensuredUser, ensuredUser.activeAccountId, now);
    const activeAccount = getActiveAccount(user);
    const { goalBackups, saveRecoveryPoints } = await loadBackupCollections(activeAccount.id);
    set({
      user,
      settings: saveFile.settings,
      overridePack: saveFile.overridePack,
      staticData,
      overrideText: saveFile.overridePack ? JSON.stringify(saveFile.overridePack, null, 2) : "",
      saveInfo: toSaveInfo(saveFile),
      persistenceStatus: updatePersistenceStatus(createDefaultPersistenceStatus(toSaveInfo(saveFile)), {
        lastGoalBackupAtByAccount: buildGoalBackupTimestampMap(activeAccount.id, goalBackups),
      }),
      goalBackups,
      saveRecoveryPoints,
      importErrors: [],
      importWarnings: activeAccount.importState.importWarnings ?? [],
      today: getGenshinResetDay(now),
      timeSensitiveAt: now.toISOString(),
      isHydrated: true,
    });
  },
  restoreGoalBackup: async (backupId) => {
    const state = get();
    const payload = await persistenceAdapter.restoreGoalBackup(backupId);
    const existingAccount = state.user.accountsById[payload.accountId];
    if (!existingAccount) {
      throw new Error("The backup account no longer exists in this save.");
    }

    const plannerSettings = synchronizePlannerSettings(
      clone(payload.plannerSettings),
      existingAccount.worldState,
    );
    const worldState = synchronizeWorldState(plannerSettings, existingAccount.worldState);
    const user = updateAccountInUser(state.user, payload.accountId, (account) =>
      touchAccount({
        ...account,
        goals: clone(payload.goals),
        plannerSettings,
        worldState,
      }),
    );

    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: payload.accountId,
      trigger: "goal_restore",
      createRecoveryPointReason: "pre_restore",
    });
  },
  restoreSaveRecoveryPoint: async (backupId) => {
    const state = get();
    let recoveryPointError: string | undefined;

    set({
      persistenceStatus: updatePersistenceStatus(state.persistenceStatus, {
        status: "backupSaving",
        lastBackupError: undefined,
      }),
    });

    try {
      await createSaveRecoveryPointForState(state, "pre_restore", state.user.activeAccountId);
    } catch (error) {
      recoveryPointError = `Recovery point failed: ${toErrorMessage(error)}`;
    }

    const restoredSave = await persistenceAdapter.restoreSaveRecoveryPoint(backupId);
    const staticData = createStaticData(restoredSave.overridePack);
    const timestamp = new Date().toISOString();
    const restoredEnsuredUser = ensureUserState({
      ...restoredSave.user,
      accountsById: Object.fromEntries(
        Object.entries(restoredSave.user.accountsById).map(([accountId, account]) => [
          accountId,
          normalizeAccountGoalTargets(account, staticData),
        ]),
      ),
    });
    const user = synchronizeChecklistPlannerStateInUser(
      restoredEnsuredUser,
      restoredEnsuredUser.activeAccountId,
      new Date(timestamp),
    );
    const activeAccount = getActiveAccount(user);
    const restoredOutput = buildPlannerOutputForAccount({
      account: activeAccount,
      staticData,
      today: state.today,
    });
    const plannerStatus = buildPlannerStatusFromOutput(restoredOutput, timestamp);
    const userWithStatus = setAccountPlannerStatus(user, activeAccount.id, plannerStatus, {
      recentChanges: [
        createRecalculationChange({
          trigger: "save_restore",
          status: plannerStatus,
          changedAt: timestamp,
          afterOutput: restoredOutput,
        }),
      ],
    });
    const { goalBackups, saveRecoveryPoints } = await loadBackupCollections(activeAccount.id);

    await persistLiveSnapshot({
      state,
      setState: set,
      user: userWithStatus,
      settings: restoredSave.settings,
      overridePack: restoredSave.overridePack,
      importErrors: [],
      importWarnings: getActiveAccount(userWithStatus).importState.importWarnings ?? [],
      patch: syncBackupCollections(
        state,
        {
          staticData,
          overrideText: restoredSave.overridePack ? JSON.stringify(restoredSave.overridePack, null, 2) : "",
          today: getGenshinResetDay(new Date(timestamp)),
          timeSensitiveAt: timestamp,
          persistenceStatus: updatePersistenceStatus(state.persistenceStatus, {
            status: recoveryPointError ? "saved" : "backupSaved",
            lastBackupError: recoveryPointError,
            lastGoalBackupAtByAccount: buildGoalBackupTimestampMap(activeAccount.id, goalBackups),
          }),
        },
        activeAccount.id,
        goalBackups,
        saveRecoveryPoints,
      ),
    });
  },
  importGoodText: async (text, options) => {
    const result = importGoodAccountFromText(text, get().staticData);
    set({
      importErrors: result.errors,
      importWarnings: result.warnings.map((warning) => warning.message),
    });

    if (!result.account) {
      return;
    }

    if (options?.asNewAccount) {
      const desiredName = deriveAccountNameFromFileName(options.fileName);
      const activeState = get();
      const accountId = crypto.randomUUID();
      const name = resolveUniqueAccountName(activeState.user, desiredName);
      const importedAccount = createAccountFromImport(result.account, {
        id: accountId,
        name,
        fileName: options.fileName,
        source: options.source ?? "file",
      });

      const user = ensureUserState({
        ...activeState.user,
        activeAccountId: accountId,
        accountsById: {
          ...activeState.user.accountsById,
          [accountId]: importedAccount,
        },
        accountOrder: [...activeState.user.accountOrder, accountId],
      });
      await finalizePlannerAwareUserUpdate({
        state: activeState,
        setState: set,
        getState: get,
        nextUser: user,
        targetAccountId: accountId,
        trigger: "good_import",
        inventoryTrigger: "good_import",
        changedMaterialKeys: Object.keys(importedAccount.inventory),
        importMetadata: {
          fileName: options.fileName,
          source: options.source ?? "file",
        },
      });
      return;
    }

    await get().replaceActiveAccountFromGoodImport(result.account, {
      fileName: options?.fileName,
      source: options?.source ?? "file",
    });
  },
  importOverrideText: async (text) => {
    const state = get();
    const overridePack = parseOverrideDataPack(text);
    const staticData = createStaticData(overridePack);
    const nextState = {
      ...buildPersistedSlice(state),
      overridePack,
    };
    const saveFile = await persistCurrentSnapshot(nextState);
    set({
      overridePack,
      overrideText: text,
      staticData,
      saveInfo: toSaveInfo(saveFile),
    });
    await finalizePlannerAwareUserUpdate({
      state: { ...state, overridePack, staticData },
      setState: set,
      getState: get,
      nextUser: state.user,
      targetAccountId: state.user.activeAccountId,
      trigger: "database_update",
      recordGoalChanges: false,
      staticData,
    });
  },
  clearOverridePack: async () => {
    const state = get();
    const staticData = createStaticData();
    const nextState = {
      ...buildPersistedSlice(state),
      overridePack: null,
    };
    const saveFile = await persistCurrentSnapshot(nextState);
    set({
      overridePack: null,
      overrideText: "",
      staticData,
      saveInfo: toSaveInfo(saveFile),
    });
    await finalizePlannerAwareUserUpdate({
      state: { ...state, overridePack: null, staticData },
      setState: set,
      getState: get,
      nextUser: state.user,
      targetAccountId: state.user.activeAccountId,
      trigger: "database_update",
      recordGoalChanges: false,
      staticData,
    });
  },
  setActiveTab: async (activeTab) => {
    const state = get();
    const settings = { ...state.settings, activeTab };
    await persistLiveSnapshot({
      state,
      setState: set,
      settings,
    });
  },
  setPlannerView: async (plannerView) => {
    const state = get();
    const settings = { ...state.settings, plannerView };
    await persistLiveSnapshot({
      state,
      setState: set,
      settings,
    });
  },
  createAccount: async (input) => {
    const state = get();
    const id = crypto.randomUUID();
    const name = resolveUniqueAccountName(state.user, input?.name ?? `Account ${state.user.accountOrder.length + 1}`);
    const account = createBlankAccount({
      id,
      name,
      metadata: input,
    });
    const user = ensureUserState({
      ...state.user,
      activeAccountId: id,
      accountsById: {
        ...state.user.accountsById,
        [id]: account,
      },
      accountOrder: [...state.user.accountOrder, id],
    });
    const { goalBackups, saveRecoveryPoints } = await loadBackupCollections(id);
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
      importWarnings: account.importState.importWarnings ?? [],
      importErrors: [],
      patch: syncBackupCollections(
        state,
        {
          persistenceStatus: updatePersistenceStatus(state.persistenceStatus, {
            lastGoalBackupAtByAccount: buildGoalBackupTimestampMap(id, goalBackups),
          }),
        },
        id,
        goalBackups,
        saveRecoveryPoints,
      ),
    });
    return id;
  },
  renameAccount: async (accountId, name) => {
    const state = get();
    const user = updateAccountInUser(state.user, accountId, (account) =>
      touchAccount({
        ...account,
        name: resolveUniqueAccountName(state.user, name, accountId),
      }),
    );
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
    });
  },
  duplicateAccount: async (accountId, newName) => {
    const state = get();
    const source = state.user.accountsById[accountId];
    if (!source) {
      return state.user.activeAccountId;
    }

    const duplicateId = crypto.randomUUID();
    const now = new Date();
    const timestamp = now.toISOString();
    const duplicateName = resolveUniqueAccountName(state.user, newName ?? `${source.name} copy`);
    const duplicate: KrumpanionAccount = {
      ...clone(source),
      id: duplicateId,
      name: duplicateName,
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: {
        ...clone(source.metadata),
        lastOpenedAt: timestamp,
      },
    };
    const user = ensureUserState({
      ...state.user,
      activeAccountId: duplicateId,
      accountsById: {
        ...state.user.accountsById,
        [duplicateId]: duplicate,
      },
      accountOrder: [...state.user.accountOrder, duplicateId],
    });
    const { goalBackups, saveRecoveryPoints } = await loadBackupCollections(duplicateId);
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
      importWarnings: duplicate.importState.importWarnings ?? [],
      importErrors: [],
      patch: syncBackupCollections(
        state,
        {
          persistenceStatus: updatePersistenceStatus(state.persistenceStatus, {
            lastGoalBackupAtByAccount: buildGoalBackupTimestampMap(duplicateId, goalBackups),
          }),
        },
        duplicateId,
        goalBackups,
        saveRecoveryPoints,
      ),
    });
    return duplicateId;
  },
  deleteAccount: async (accountId) => {
    const state = get();
    const exists = state.user.accountsById[accountId];
    if (!exists) {
      return;
    }

    let recoveryPointError: string | undefined;
    try {
      await createSaveRecoveryPointForState(state, "account_delete_preflight", accountId);
    } catch (error) {
      recoveryPointError = `Recovery point failed: ${toErrorMessage(error)}`;
    }

    let user: MultiAccountUserState;
    if (state.user.accountOrder.length <= 1) {
      user = createDefaultMultiAccountUserState();
    } else {
      const accountsById = { ...state.user.accountsById };
      delete accountsById[accountId];
      const accountOrder = state.user.accountOrder.filter((id) => id !== accountId);
      const activeAccountId =
        state.user.activeAccountId === accountId
          ? accountOrder[0]
          : state.user.activeAccountId;
      user = ensureUserState({
        ...state.user,
        activeAccountId,
        accountsById,
        accountOrder,
      });
    }

    const nextActiveAccountId = user.activeAccountId;
    const { goalBackups, saveRecoveryPoints } = await loadBackupCollections(nextActiveAccountId);
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
      importErrors: [],
      patch: syncBackupCollections(
        state,
        {
          persistenceStatus: updatePersistenceStatus(state.persistenceStatus, {
            status: recoveryPointError ? "saved" : "backupSaved",
            lastBackupError: recoveryPointError,
            lastGoalBackupAtByAccount: buildGoalBackupTimestampMap(nextActiveAccountId, goalBackups),
          }),
        },
        nextActiveAccountId,
        goalBackups,
        saveRecoveryPoints,
      ),
    });
  },
  switchAccount: async (accountId) => {
    const state = get();
    if (!state.user.accountsById[accountId]) {
      return;
    }

    const now = new Date();
    const user = synchronizeChecklistPlannerStateInUser(
      ensureUserState(
        updateAccountInUser(
          {
            ...state.user,
            activeAccountId: accountId,
          },
          accountId,
          (account) => touchAccount(account, now),
        ),
      ),
      accountId,
      now,
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: accountId,
      trigger: "account_switch",
      recordGoalChanges: false,
    });
  },
  updateAccountMetadata: async (accountId, patch) => {
    const state = get();
    const user = updateAccountInUser(state.user, accountId, (account) =>
      touchAccount({
        ...account,
        metadata: {
          ...account.metadata,
          ...patch,
        },
      }),
    );
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
    });
  },
  updateActiveAccountWorldState: async (patch) => {
    const state = get();
    const activeAccountId = state.user.activeAccountId;
    const now = new Date();
    const user = updateAccountInUser(state.user, activeAccountId, (account) => {
      const checklist =
        patch.weeklyBossDiscountsUsed !== undefined
          ? {
              ...account.checklist,
              weeklyBossClaims: {
                usedCount: clampWeeklyBossClaimsUsed(patch.weeklyBossDiscountsUsed),
                updatedAt: now.toISOString(),
              },
            }
          : account.checklist;
      const worldState = synchronizeWorldState(account.plannerSettings, account.worldState, patch);
      const plannerSettings = synchronizePlannerSettings(account.plannerSettings, worldState);
      return synchronizeChecklistPlannerState(touchAccount({
        ...account,
        checklist,
        worldState,
        plannerSettings,
      }, now), now);
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: activeAccountId,
      trigger: "world_state_change",
    });
  },
  replaceActiveAccountFromGoodImport: async (imported, importMetadata) => {
    const state = get();
    const activeAccountId = state.user.activeAccountId;
    const beforeAccount = state.user.accountsById[activeAccountId];
    const user = updateAccountInUser(state.user, activeAccountId, (account) => {
      const stampedImport = stampImportedWeaponState(imported, account.id);
      const nextAccount = replaceAccountSnapshot(account, imported, {
        fileName: importMetadata?.fileName,
        source: importMetadata?.source ?? "unknown",
      });

      return normalizeAccountGoalTargets({
        ...nextAccount,
        goals: {
          ...nextAccount.goals,
          characterGoals: reconcileCharacterGoalsAfterImport(account.goals.characterGoals, stampedImport.characters),
          weaponGoals: relinkWeaponGoalsAfterImport(account.goals.weaponGoals, account.weapons, stampedImport.weapons, account.id),
        },
      }, state.staticData);
    });
    const changedMaterialKeys = [
      ...new Set([
        ...Object.keys(beforeAccount?.inventory ?? {}),
        ...Object.keys(imported.inventory),
      ]),
    ];
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: activeAccountId,
      trigger: "good_import",
      inventoryTrigger: "good_import",
      changedMaterialKeys,
      importMetadata,
      createRecoveryPointReason: "good_import_preflight",
    });
  },
  setActiveMaterialQuantity: async (materialKey, quantity) => {
    if (!isValidMaterialQuantity(quantity)) {
      return;
    }

    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      applyMaterialQuantityUpdates(account, { [materialKey]: quantity }, "manual"),
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "manual_edit",
      inventoryTrigger: "manual_edit",
      changedMaterialKeys: [materialKey],
    });
  },
  incrementActiveMaterialQuantity: async (materialKey, delta) => {
    if (!Number.isInteger(delta)) {
      return;
    }

    const state = get();
    const currentQuantity = state.user.accountsById[state.user.activeAccountId]?.inventory[materialKey] ?? 0;
    const nextQuantity = currentQuantity + delta;
    if (!isValidMaterialQuantity(nextQuantity)) {
      return;
    }

    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      applyMaterialQuantityUpdates(account, { [materialKey]: nextQuantity }, "manual"),
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "manual_edit",
      inventoryTrigger: "manual_edit",
      changedMaterialKeys: [materialKey],
    });
  },
  bulkSetActiveMaterialQuantities: async (updates, meta) => {
    const state = get();
    const validUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, quantity]) => isValidMaterialQuantity(quantity)),
    );

    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      applyMaterialQuantityUpdates(account, validUpdates, meta?.source ?? "bulk"),
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "bulk_edit",
      inventoryTrigger: "bulk_edit",
      changedMaterialKeys: Object.keys(validUpdates),
    });
  },
  resetActiveMaterialToImported: async (materialKey) => {
    const state = get();
    const activeAccount = state.user.accountsById[state.user.activeAccountId];
    if (!activeAccount) {
      return;
    }

    const importedQuantity = activeAccount.importedInventory[materialKey] ?? 0;
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      applyMaterialQuantityUpdates(account, { [materialKey]: importedQuantity }, "manual"),
    );
    const userWithResetState = updateAccountInUser(user, state.user.activeAccountId, (account) => {
      const nextEditState = { ...account.materialEditState };
      delete nextEditState[materialKey];
      return touchAccount({
        ...account,
        materialEditState: nextEditState,
      });
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: userWithResetState,
      targetAccountId: state.user.activeAccountId,
      trigger: "reset_to_imported",
      inventoryTrigger: "reset_to_imported",
      changedMaterialKeys: [materialKey],
    });
  },
  clearActiveMaterialQuantity: async (materialKey) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      applyMaterialQuantityUpdates(account, { [materialKey]: 0 }, "manual"),
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "manual_edit",
      inventoryTrigger: "manual_edit",
      changedMaterialKeys: [materialKey],
    });
  },
  clearActiveAccountInventory: async () => {
    const state = get();
    const activeAccountId = state.user.activeAccountId;
    const user = updateAccountInUser(state.user, activeAccountId, (account) =>
      touchAccount({
        ...account,
        ...createBlankAccount({
          id: account.id,
          name: account.name,
          now: new Date(account.createdAt),
          metadata: account.metadata,
        }),
        id: account.id,
        name: account.name,
        createdAt: account.createdAt,
        metadata: {
          ...account.metadata,
        },
        goals: account.goals,
        plannerSettings: account.plannerSettings,
        worldState: account.worldState,
        importedInventory: {},
      }),
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: activeAccountId,
      trigger: "inventory_clear",
      inventoryTrigger: "inventory_clear",
      changedMaterialKeys: Object.keys(state.user.accountsById[activeAccountId]?.inventory ?? {}),
    });
  },
  resetActiveAccountGoals: async () => {
    const state = get();
    const activeAccountId = state.user.activeAccountId;
    const user = updateAccountInUser(state.user, activeAccountId, (account) =>
      touchAccount({
        ...account,
        goals: clone(DEFAULT_GOAL_STATE),
      }),
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: activeAccountId,
      trigger: "goal_reset",
      goalBackupReason: "goal_edit",
    });
  },
  updateCharacterGoal: async (characterKey, updates) => {
    const state = get();
    const activeAccountId = state.user.activeAccountId;
    const user = updateAccountInUser(state.user, activeAccountId, (account) => {
      const currentGoal = account.goals.characterGoals[characterKey];
      const isOwned = account.characters.some((character) => character.characterId === characterKey);
      const nextGoal = normalizeCharacterGoalRecord(characterKey, {
        ...(currentGoal ?? {}),
        ...updates,
        characterKey,
        enabled: updates.enabled ?? currentGoal?.enabled ?? true,
        paused: updates.paused ?? currentGoal?.paused ?? false,
        priority: updates.priority ?? currentGoal?.priority ?? 3,
        planningMode: normalizeGoalPlanningMode(updates.planningMode ?? currentGoal?.planningMode, isOwned),
        talents: {
          ...currentGoal?.talents,
          ...updates.talents,
        },
        currentOverride: updates.currentOverride
          ? {
              ...currentGoal?.currentOverride,
              ...updates.currentOverride,
              talents: {
                ...currentGoal?.currentOverride?.talents,
                ...updates.currentOverride.talents,
              },
            }
          : currentGoal?.currentOverride,
      }, isOwned, state.staticData);
      return touchAccount({
        ...account,
        goals: {
          ...account.goals,
          characterGoals: {
            ...account.goals.characterGoals,
            [characterKey]: nextGoal,
          },
        },
      });
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: activeAccountId,
      trigger: "goal_edit",
      goalBackupReason: "goal_edit",
    });
  },
  pauseCharacterGoal: async (characterKey) => {
    await get().updateCharacterGoal(characterKey, { paused: true });
  },
  resumeCharacterGoal: async (characterKey) => {
    await get().updateCharacterGoal(characterKey, { paused: false });
  },
  resetCharacterGoal: async (characterKey) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) => {
      const nextGoals = { ...account.goals.characterGoals };
      delete nextGoals[characterKey];
      return touchAccount({
        ...account,
        goals: { ...account.goals, characterGoals: nextGoals },
      });
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "goal_reset",
      goalBackupReason: "goal_edit",
    });
  },
  bulkUpdateCharacterGoals: async (characterKeys, updates) => {
    const state = get();
    const uniqueKeys = [...new Set(characterKeys)];
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) => {
      const nextCharacterGoals = { ...account.goals.characterGoals };

      for (const characterKey of uniqueKeys) {
        const currentGoal = nextCharacterGoals[characterKey];
        if (!currentGoal) {
          continue;
        }

        const isOwned = account.characters.some((character) => character.characterId === characterKey);
        nextCharacterGoals[characterKey] = normalizeCharacterGoalRecord(characterKey, {
          ...currentGoal,
          ...updates,
          characterKey,
          planningMode: normalizeGoalPlanningMode(updates.planningMode ?? currentGoal.planningMode, isOwned),
          talents: updates.talents
            ? {
                ...currentGoal.talents,
                ...updates.talents,
              }
            : currentGoal.talents,
          currentOverride: updates.currentOverride
            ? {
                ...currentGoal.currentOverride,
                ...updates.currentOverride,
                talents: updates.currentOverride.talents
                  ? {
                      ...currentGoal.currentOverride?.talents,
                      ...updates.currentOverride.talents,
                    }
                  : currentGoal.currentOverride?.talents,
              }
            : currentGoal.currentOverride,
        }, isOwned, state.staticData);
      }

      return touchAccount({
        ...account,
        goals: {
          ...account.goals,
          characterGoals: nextCharacterGoals,
        },
      });
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "goal_edit",
      goalBackupReason: "goal_edit",
    });
  },
  createWeaponGoal: async (input) => {
    const state = get();
    const goalId = createWeaponGoalId();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) => {
      const nextGoal = createWeaponGoalRecord(account, goalId, input.weaponKey, {
        goalId,
        weaponKey: input.weaponKey,
        linkedInventoryInstanceId: input.linkedInventoryInstanceId,
        linkedCharacterKey: input.linkedCharacterKey,
        useOwnedInstance: input.useOwnedInstance ?? Boolean(input.linkedInventoryInstanceId),
        priority: input.priority ?? 3,
        targetLevel: input.targetLevel,
        targetAscensionPhase: input.targetAscensionPhase,
        enabled: input.enabled ?? true,
        paused: input.paused ?? false,
        notes: input.notes,
        currentOverride: input.currentOverride,
      });

      return touchAccount({
        ...account,
        goals: {
          ...account.goals,
          weaponGoals: {
            ...account.goals.weaponGoals,
            [goalId]: nextGoal,
          },
        },
      });
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "goal_edit",
      goalBackupReason: "goal_edit",
    });
    return goalId;
  },
  updateWeaponGoal: async (weaponId, weaponKey, updates) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) => {
      const currentGoal = account.goals.weaponGoals[weaponId];
      const nextGoal = createWeaponGoalRecord(account, weaponId, weaponKey, updates, currentGoal);
      const nextGoalId = nextGoal.goalId ?? weaponId;
      return touchAccount({
        ...account,
        goals: {
          ...account.goals,
          weaponGoals:
            nextGoalId === weaponId
              ? {
                  ...account.goals.weaponGoals,
                  [nextGoalId]: nextGoal,
                }
              : {
                  ...Object.fromEntries(
                    Object.entries(account.goals.weaponGoals).filter(([existingGoalId]) => existingGoalId !== weaponId),
                  ),
                  [nextGoalId]: nextGoal,
                },
        },
      });
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "goal_edit",
      goalBackupReason: "goal_edit",
    });
  },
  pauseWeaponGoal: async (weaponId, weaponKey) => {
    await get().updateWeaponGoal(weaponId, weaponKey, { paused: true });
  },
  resumeWeaponGoal: async (weaponId, weaponKey) => {
    await get().updateWeaponGoal(weaponId, weaponKey, { paused: false });
  },
  resetWeaponGoal: async (weaponId) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) => {
      const nextGoals = { ...account.goals.weaponGoals };
      delete nextGoals[weaponId];
      return touchAccount({
        ...account,
        goals: { ...account.goals, weaponGoals: nextGoals },
      });
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "goal_reset",
      goalBackupReason: "goal_edit",
    });
  },
  bulkUpdateWeaponGoals: async (weaponIds, updates) => {
    const state = get();
    const uniqueIds = [...new Set(weaponIds)];
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) => {
      const nextWeaponGoals = { ...account.goals.weaponGoals };

      for (const weaponId of uniqueIds) {
        const currentGoal = nextWeaponGoals[weaponId];
        if (!currentGoal) {
          continue;
        }
        const nextGoal = createWeaponGoalRecord(account, weaponId, currentGoal.weaponKey, updates, currentGoal);
        const nextGoalId = nextGoal.goalId ?? weaponId;
        if (nextGoalId !== weaponId) {
          delete nextWeaponGoals[weaponId];
        }
        nextWeaponGoals[nextGoalId] = nextGoal;
      }

      return touchAccount({
        ...account,
        goals: {
          ...account.goals,
          weaponGoals: nextWeaponGoals,
        },
      });
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "goal_edit",
      goalBackupReason: "goal_edit",
    });
  },
  addArtifactGoal: async (initial) => {
    const state = get();
    const nextGoal = createBlankArtifactGoal(initial);
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      touchAccount({
        ...account,
        goals: {
          ...account.goals,
          artifactGoals: [...account.goals.artifactGoals, nextGoal],
        },
      }),
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "goal_edit",
      goalBackupReason: "goal_edit",
    });
    return nextGoal.id;
  },
  updateArtifactGoal: async (id, updates) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      touchAccount({
        ...account,
        goals: {
          ...account.goals,
          artifactGoals: account.goals.artifactGoals.map((goal) => {
            if (goal.id !== id) {
              return goal;
            }

            const normalized = normalizeArtifactGoalRecord({
              ...goal,
              ...updates,
            });
            return normalized;
          }),
        },
      }),
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "goal_edit",
      goalBackupReason: "goal_edit",
    });
  },
  removeArtifactGoal: async (id) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      touchAccount({
        ...account,
        goals: {
          ...account.goals,
          artifactGoals: account.goals.artifactGoals.filter((goal) => goal.id !== id),
        },
      }),
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "goal_reset",
      goalBackupReason: "goal_edit",
    });
  },
  updatePlannerSettings: async (updates) => {
    const state = get();
    const now = new Date();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) => {
      const checklist =
        updates.weeklyBossDiscountClaimsUsed !== undefined
          ? {
              ...account.checklist,
              weeklyBossClaims: {
                usedCount: clampWeeklyBossClaimsUsed(updates.weeklyBossDiscountClaimsUsed),
                updatedAt: now.toISOString(),
              },
            }
          : account.checklist;
      const plannerSettings = synchronizePlannerSettings(account.plannerSettings, account.worldState, {
        ...updates,
      });
      const worldState = synchronizeWorldState(plannerSettings, account.worldState, {
        currentResinUpdatedAt:
          updates.currentResin !== undefined ? now.toISOString() : account.worldState.currentResinUpdatedAt,
      });
      return synchronizeChecklistPlannerState(touchAccount({
        ...account,
        checklist,
        plannerSettings,
        worldState,
      }, now), now);
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "planner_settings",
      goalBackupReason: "planner_settings_edit",
    });
  },
  setChecklistResetTaskCompleted: async (taskKey, completed, at) => {
    const state = get();
    const timestamp = completed ? toIsoTimestamp(at) : undefined;
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      touchAccount({
        ...account,
        checklist: {
          ...account.checklist,
          [taskKey]: timestamp ? { completedAt: timestamp } : {},
        },
      }, timestamp ? new Date(timestamp) : new Date()),
    );
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
    });
  },
  setWeeklyBossClaimsUsed: async (count, at) => {
    const state = get();
    const timestamp = toIsoTimestamp(at);
    const now = new Date(timestamp);
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      synchronizeChecklistPlannerState(
        touchAccount(
          {
            ...account,
            checklist: {
              ...account.checklist,
              weeklyBossClaims: {
                usedCount: clampWeeklyBossClaimsUsed(count),
                updatedAt: timestamp,
              },
            },
          },
          now,
        ),
        now,
      ),
    );
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: state.user.activeAccountId,
      trigger: "planner_settings",
      recordGoalChanges: false,
    });
  },
  adjustWeeklyBossClaims: async (delta, at) => {
    const state = get();
    const activeAccount = state.user.accountsById[state.user.activeAccountId];
    if (!activeAccount) {
      return;
    }
    const baseCount = getEffectiveWeeklyBossClaimsUsed(activeAccount.checklist, at ? new Date(toIsoTimestamp(at)) : new Date());
    await get().setWeeklyBossClaimsUsed(baseCount + delta, at);
  },
  startChecklistCooldown: async (taskKey, at) => {
    const state = get();
    const timestamp = toIsoTimestamp(at);
    const now = new Date(timestamp);
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      touchAccount(
        {
          ...account,
          checklist: {
            ...account.checklist,
            ...(taskKey === "expeditions"
              ? {
                  expeditions: {
                    lastClaimedAt: timestamp,
                  },
                }
              : {
                  [taskKey]: {
                    lastUsedAt: timestamp,
                  },
                }),
          },
        },
        now,
      ),
    );
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
    });
  },
  clearChecklistCooldown: async (taskKey) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      touchAccount({
        ...account,
        checklist: {
          ...account.checklist,
          ...(taskKey === "expeditions"
            ? {
                expeditions: {},
              }
            : {
                [taskKey]: {},
              }),
        },
      }),
    );
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
    });
  },
  setRealmCurrencyClaimedNow: async (at) => {
    const state = get();
    const timestamp = toIsoTimestamp(at);
    const now = new Date(timestamp);
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      touchAccount(
        {
          ...account,
          checklist: {
            ...account.checklist,
            realmCurrency: {
              ...account.checklist.realmCurrency,
              lastClaimedAt: timestamp,
            },
          },
        },
        now,
      ),
    );
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
    });
  },
  updateRealmCurrencySettings: async (updates) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      touchAccount({
        ...account,
        checklist: {
          ...account.checklist,
          realmCurrency: {
            ...account.checklist.realmCurrency,
            realmLevel: clampRealmLevel(updates.realmLevel ?? account.checklist.realmCurrency.realmLevel),
            trustRank: clampTrustRank(updates.trustRank ?? account.checklist.realmCurrency.trustRank),
          },
        },
      }),
    );
    await persistLiveSnapshot({
      state,
      setState: set,
      user,
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
    });
  },
  exportSaveFile: async () => persistenceAdapter.exportSaveFile(),
  importSaveFile: async (text) => {
    const state = get();
    let recoveryPointError: string | undefined;
    try {
      await createSaveRecoveryPointForState(state, "save_import_preflight", state.user.activeAccountId);
    } catch (error) {
      recoveryPointError = `Recovery point failed: ${toErrorMessage(error)}`;
    }

    const saveFile = await persistenceAdapter.importSaveFile(text);
    const staticData = createStaticData(saveFile.overridePack);
    const now = new Date();
    const ensuredUser = ensureUserState({
      ...saveFile.user,
      accountsById: Object.fromEntries(
        Object.entries(saveFile.user.accountsById).map(([accountId, account]) => [accountId, normalizeAccountGoalTargets(account, staticData)]),
      ),
    });
    const user = synchronizeChecklistPlannerStateInUser(ensuredUser, ensuredUser.activeAccountId, now);
    const activeAccount = getActiveAccount(user);
    const { goalBackups, saveRecoveryPoints } = await loadBackupCollections(activeAccount.id);
    set({
      user,
      settings: saveFile.settings,
      overridePack: saveFile.overridePack,
      staticData,
      overrideText: saveFile.overridePack ? JSON.stringify(saveFile.overridePack, null, 2) : "",
      saveInfo: toSaveInfo(saveFile),
      persistenceStatus: updatePersistenceStatus(createDefaultPersistenceStatus(toSaveInfo(saveFile)), {
        status: recoveryPointError ? "saved" : "backupSaved",
        lastBackupError: recoveryPointError,
        lastGoalBackupAtByAccount: buildGoalBackupTimestampMap(activeAccount.id, goalBackups),
      }),
      goalBackups,
      saveRecoveryPoints,
      importErrors: [],
      importWarnings: activeAccount.importState.importWarnings ?? [],
      today: getGenshinResetDay(now),
      timeSensitiveAt: now.toISOString(),
    });
  },
  exportAccount: async (accountId) => {
    const account = get().user.accountsById[accountId];
    if (!account) {
      throw new Error(`Account ${accountId} does not exist.`);
    }
    return exportAccountPayload(account);
  },
  importAccount: async (value) => {
    const exported = normalizeImportedAccountPayload(value);
    if (!exported) {
      throw new Error("The account export is invalid.");
    }

    const state = get();
    const accountId = crypto.randomUUID();
    const name = resolveUniqueAccountName(state.user, exported.account.name);
    const importedAccount: KrumpanionAccount = {
      ...createBlankAccount({
        id: accountId,
        name,
        now: new Date(exported.exportedAt),
        metadata: exported.account.metadata,
      }),
      ...clone(exported.account),
      id: accountId,
      name,
      updatedAt: new Date().toISOString(),
      metadata: {
        ...clone(exported.account.metadata ?? {}),
        lastOpenedAt: new Date().toISOString(),
      },
      goals: {
        ...clone(exported.account.goals ?? DEFAULT_GOAL_STATE),
        weaponGoals: Object.fromEntries(
          Object.entries(clone(exported.account.goals?.weaponGoals ?? {})).map(([goalId, goal]) => {
            const normalizedGoal = normalizeWeaponGoalRecord(goalId, goal, accountId);
            return [normalizedGoal.goalId ?? goalId, normalizedGoal];
          }),
        ),
      },
      plannerSettings: synchronizePlannerSettings(
        clone(exported.account.plannerSettings ?? DEFAULT_PLANNER_SETTINGS),
        clone(exported.account.worldState ?? createDefaultWorldState()),
      ),
      checklist: normalizeChecklistState(
        clone(exported.account.checklist),
        clone(exported.account.plannerSettings ?? DEFAULT_PLANNER_SETTINGS).weeklyBossDiscountClaimsUsed ?? 0,
        exported.account.updatedAt,
      ),
      worldState: synchronizeWorldState(
        clone(exported.account.plannerSettings ?? DEFAULT_PLANNER_SETTINGS),
        clone(exported.account.worldState ?? createDefaultWorldState()),
      ),
      importState: {
        importWarnings: exported.account.importState?.importWarnings ?? [],
        importSummary:
          exported.account.importState?.importSummary ??
          createImportedAccountSummary({
            importMeta: exported.account.importMeta,
            characters: exported.account.characters,
            weapons: exported.account.weapons,
            artifacts: exported.account.artifacts,
            inventory: exported.account.inventory,
            warnings: exported.account.warnings,
          }),
        ...clone(exported.account.importState ?? {}),
      },
      importedInventory: clone(exported.account.importedInventory ?? exported.account.inventory ?? {}),
      plannerStatus: clone(exported.account.plannerStatus ?? createBlankAccount({ id: accountId, name }).plannerStatus),
      recentChanges: clone(exported.account.recentChanges ?? []),
      recentImports: clone(exported.account.recentImports ?? []),
    };
    const normalizedImportedAccount = synchronizeChecklistPlannerState(
      normalizeAccountGoalTargets(importedAccount, state.staticData),
      new Date(),
    );
    const user = ensureUserState({
      ...state.user,
      activeAccountId: accountId,
      accountsById: {
        ...state.user.accountsById,
        [accountId]: normalizedImportedAccount,
      },
      accountOrder: [...state.user.accountOrder, accountId],
    });
    await finalizePlannerAwareUserUpdate({
      state,
      setState: set,
      getState: get,
      nextUser: user,
      targetAccountId: accountId,
      trigger: "account_switch",
      recordGoalChanges: false,
      createRecoveryPointReason: "account_import_preflight",
    });
    return accountId;
  },
  updateSettings: async (updates) => {
    const settings = { ...get().settings, ...updates };
    const state = get();
    await persistLiveSnapshot({
      state,
      setState: set,
      settings,
    });
  },
}));
