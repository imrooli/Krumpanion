import { create } from "zustand";
import { importGoodAccountFromText } from "../adapters/goodImport";
import { persistenceAdapter } from "../adapters/persistence";
import type {
  AccountId,
  AccountImportState,
  MaterialEditSource,
  AccountMetadata,
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
import { defaultPlanningMode, getLinkedWeaponInstanceId, getWeaponGoalId, normalizeWeaponGoalRecord } from "../domain/goals/goalState";
import { createStaticData } from "../domain/staticData/staticDataFactory";
import { parseOverrideDataPack } from "../domain/staticData/overrideSchema";
import type { OverrideDataPack, StaticGameData } from "../domain/staticData/types";
import type { DayOfWeek } from "../domain/planner/types";
import { createDefaultAccountExport } from "../domain/save/types";
import { defaultSave, persistCurrentSnapshot, toSaveInfo, type SaveInfo } from "./persistenceHelpers";
import { getGenshinResetDay } from "../utils/days";

function getToday(): DayOfWeek {
  return getGenshinResetDay(new Date());
}

function createBlankArtifactGoal(): ArtifactGoal {
  return {
    id: `artifact-goal-${crypto.randomUUID()}`,
    domainKey: "",
    targetSetKeys: [],
    priority: 3,
    weeklyResinBudget: 200,
    enabled: true,
    notes: "",
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeGoalPlanningMode(mode: GoalPlanningMode | undefined, isOwned: boolean): GoalPlanningMode {
  return mode ?? (isOwned ? "owned" : "prefarm");
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

  return {
    ...blank,
    ...imported,
    id: input.id,
    name: input.name,
    importMeta: {
      ...imported.importMeta,
      source: input.source ?? imported.importMeta.source,
    },
    importState: {
      lastGoodImportAt: imported.importMeta.importedAt,
      lastGoodFileName: input.fileName,
      lastGoodSource: input.source ?? "unknown",
      lastGoodFormatVersion: String(imported.importMeta.version),
      importWarnings: imported.warnings.map((warning) => warning.message),
      importSummary: createImportedAccountSummary(imported),
    },
    warnings: imported.warnings,
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

  return {
    ...account,
    ...imported,
    importMeta: {
      ...imported.importMeta,
      source: input.source ?? imported.importMeta.source,
    },
    updatedAt: timestamp,
    importState: {
      ...account.importState,
      lastGoodImportAt: imported.importMeta.importedAt,
      lastGoodFileName: input.fileName,
      lastGoodSource: input.source ?? "unknown",
      lastGoodFormatVersion: String(imported.importMeta.version),
      importWarnings: imported.warnings.map((warning) => warning.message),
      importSummary: createImportedAccountSummary(imported),
    },
    warnings: imported.warnings,
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
  importErrors: string[];
  importWarnings: string[];
  overrideText: string;
  saveInfo: SaveInfo;
  isHydrated: boolean;
  refreshToday: () => void;
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
  clearActiveMaterialQuantity: (materialKey: string) => Promise<void>;
  clearActiveAccountInventory: () => Promise<void>;
  resetActiveAccountGoals: () => Promise<void>;
  updateCharacterGoal: (characterKey: string, updates: Partial<CharacterGoal>) => Promise<void>;
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
    notes?: string;
    currentOverride?: WeaponGoal["currentOverride"];
  }) => Promise<string>;
  updateWeaponGoal: (weaponId: string, weaponKey: string, updates: Partial<WeaponGoal>) => Promise<void>;
  resetWeaponGoal: (weaponId: string) => Promise<void>;
  bulkUpdateWeaponGoals: (weaponIds: string[], updates: Partial<WeaponGoal>) => Promise<void>;
  addArtifactGoal: () => Promise<void>;
  updateArtifactGoal: (id: string, updates: Partial<ArtifactGoal>) => Promise<void>;
  removeArtifactGoal: (id: string) => Promise<void>;
  updatePlannerSettings: (updates: Partial<PlannerSettings>) => Promise<void>;
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
  importErrors: [],
  importWarnings: [],
  overrideText: "",
  saveInfo: {
    schemaVersion: defaultSave.schemaVersion,
    appVersion: defaultSave.appVersion,
    createdAt: defaultSave.createdAt,
    updatedAt: defaultSave.updatedAt,
  },
  isHydrated: false,
  refreshToday: () => {
    set((state) => {
      const nextToday = getToday();
      return state.today === nextToday ? state : { today: nextToday };
    });
  },
  hydrate: async () => {
    const saveFile = await persistenceAdapter.loadSaveFile();
    const user = ensureUserState(saveFile.user);
    const activeAccount = getActiveAccount(user);
    set({
      user,
      settings: saveFile.settings,
      overridePack: saveFile.overridePack,
      staticData: createStaticData(saveFile.overridePack),
      overrideText: saveFile.overridePack ? JSON.stringify(saveFile.overridePack, null, 2) : "",
      saveInfo: toSaveInfo(saveFile),
      importErrors: [],
      importWarnings: activeAccount.importState.importWarnings ?? [],
      today: getToday(),
      isHydrated: true,
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

      const saveFile = await persistCurrentSnapshot({
        ...buildPersistedSlice(activeState),
        user,
      });

      set({
        user,
        importWarnings: importedAccount.importState.importWarnings ?? [],
        saveInfo: toSaveInfo(saveFile),
      });
      return;
    }

    await get().replaceActiveAccountFromGoodImport(result.account, {
      fileName: options?.fileName,
      source: options?.source ?? "file",
    });
  },
  importOverrideText: async (text) => {
    const overridePack = parseOverrideDataPack(text);
    const nextState = {
      ...buildPersistedSlice(get()),
      overridePack,
    };
    const saveFile = await persistCurrentSnapshot(nextState);
    set({
      overridePack,
      overrideText: text,
      staticData: createStaticData(overridePack),
      saveInfo: toSaveInfo(saveFile),
    });
  },
  clearOverridePack: async () => {
    const nextState = {
      ...buildPersistedSlice(get()),
      overridePack: null,
    };
    const saveFile = await persistCurrentSnapshot(nextState);
    set({
      overridePack: null,
      overrideText: "",
      staticData: createStaticData(),
      saveInfo: toSaveInfo(saveFile),
    });
  },
  setActiveTab: async (activeTab) => {
    const settings = { ...get().settings, activeTab };
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(get()),
      settings,
    });
    set({
      settings,
      saveInfo: toSaveInfo(saveFile),
    });
  },
  setPlannerView: async (plannerView) => {
    const settings = { ...get().settings, plannerView };
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(get()),
      settings,
    });
    set({
      settings,
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      importWarnings: account.importState.importWarnings ?? [],
      importErrors: [],
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      importWarnings: duplicate.importState.importWarnings ?? [],
      importErrors: [],
      saveInfo: toSaveInfo(saveFile),
    });
    return duplicateId;
  },
  deleteAccount: async (accountId) => {
    const state = get();
    const exists = state.user.accountsById[accountId];
    if (!exists) {
      return;
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

    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
      importErrors: [],
      saveInfo: toSaveInfo(saveFile),
    });
  },
  switchAccount: async (accountId) => {
    const state = get();
    if (!state.user.accountsById[accountId]) {
      return;
    }

    const user = ensureUserState(
      updateAccountInUser(
        {
          ...state.user,
          activeAccountId: accountId,
        },
        accountId,
        (account) => touchAccount(account),
      ),
    );
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
      importErrors: [],
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
    });
  },
  updateActiveAccountWorldState: async (patch) => {
    const state = get();
    const activeAccountId = state.user.activeAccountId;
    const user = updateAccountInUser(state.user, activeAccountId, (account) => {
      const worldState = synchronizeWorldState(account.plannerSettings, account.worldState, patch);
      const plannerSettings = synchronizePlannerSettings(account.plannerSettings, worldState);
      return touchAccount({
        ...account,
        worldState,
        plannerSettings,
      });
    });
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
    });
  },
  replaceActiveAccountFromGoodImport: async (imported, importMetadata) => {
    const state = get();
    const activeAccountId = state.user.activeAccountId;
    const user = updateAccountInUser(state.user, activeAccountId, (account) => {
      const nextAccount = replaceAccountSnapshot(account, imported, {
        fileName: importMetadata?.fileName,
        source: importMetadata?.source ?? "unknown",
      });

      return {
        ...nextAccount,
        goals: {
          ...nextAccount.goals,
          weaponGoals: relinkWeaponGoalsAfterImport(account.goals.weaponGoals, account.weapons, imported.weapons, account.id),
        },
      };
    });
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
    });
  },
  clearActiveMaterialQuantity: async (materialKey) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      applyMaterialQuantityUpdates(account, { [materialKey]: 0 }, "manual"),
    );
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
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
      }),
    );
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      importWarnings: [],
      importErrors: [],
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
    });
  },
  updateCharacterGoal: async (characterKey, updates) => {
    const state = get();
    const activeAccountId = state.user.activeAccountId;
    const user = updateAccountInUser(state.user, activeAccountId, (account) => {
      const currentGoal = account.goals.characterGoals[characterKey];
      const isOwned = account.characters.some((character) => character.characterId === characterKey);
      const nextGoal: CharacterGoal = {
        ...(currentGoal ?? {}),
        ...updates,
        characterKey,
        enabled: updates.enabled ?? currentGoal?.enabled ?? true,
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
      };
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
    });
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
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
        nextCharacterGoals[characterKey] = {
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
        };
      }

      return touchAccount({
        ...account,
        goals: {
          ...account.goals,
          characterGoals: nextCharacterGoals,
        },
      });
    });
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
    });
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
    });
  },
  addArtifactGoal: async () => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      touchAccount({
        ...account,
        goals: {
          ...account.goals,
          artifactGoals: [...account.goals.artifactGoals, createBlankArtifactGoal()],
        },
      }),
    );
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
    });
  },
  updateArtifactGoal: async (id, updates) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) =>
      touchAccount({
        ...account,
        goals: {
          ...account.goals,
          artifactGoals: account.goals.artifactGoals.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)),
        },
      }),
    );
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
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
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
    });
  },
  updatePlannerSettings: async (updates) => {
    const state = get();
    const user = updateAccountInUser(state.user, state.user.activeAccountId, (account) => {
      const plannerSettings = synchronizePlannerSettings(account.plannerSettings, account.worldState, {
        ...updates,
      });
      const worldState = synchronizeWorldState(plannerSettings, account.worldState, {
        currentResinUpdatedAt:
          updates.currentResin !== undefined ? new Date().toISOString() : account.worldState.currentResinUpdatedAt,
      });
      return touchAccount({
        ...account,
        plannerSettings,
        worldState,
      });
    });
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      saveInfo: toSaveInfo(saveFile),
    });
  },
  exportSaveFile: async () => persistenceAdapter.exportSaveFile(),
  importSaveFile: async (text) => {
    const saveFile = await persistenceAdapter.importSaveFile(text);
    const user = ensureUserState(saveFile.user);
    set({
      user,
      settings: saveFile.settings,
      overridePack: saveFile.overridePack,
      staticData: createStaticData(saveFile.overridePack),
      overrideText: saveFile.overridePack ? JSON.stringify(saveFile.overridePack, null, 2) : "",
      saveInfo: toSaveInfo(saveFile),
      importErrors: [],
      importWarnings: getActiveAccount(user).importState.importWarnings ?? [],
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
    };
    const user = ensureUserState({
      ...state.user,
      activeAccountId: accountId,
      accountsById: {
        ...state.user.accountsById,
        [accountId]: importedAccount,
      },
      accountOrder: [...state.user.accountOrder, accountId],
    });
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(state),
      user,
    });
    set({
      user,
      importErrors: [],
      importWarnings: importedAccount.importState.importWarnings ?? [],
      saveInfo: toSaveInfo(saveFile),
    });
    return accountId;
  },
  updateSettings: async (updates) => {
    const settings = { ...get().settings, ...updates };
    const saveFile = await persistCurrentSnapshot({
      ...buildPersistedSlice(get()),
      settings,
    });
    set({
      settings,
      saveInfo: toSaveInfo(saveFile),
    });
  },
}));
