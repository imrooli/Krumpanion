import type { ImportedAccountState, KrumpanionAccount, MultiAccountUserState } from "../account/types";
import {
  buildImportedAccountState,
  createBlankAccount,
  createDefaultMultiAccountUserState,
  createDefaultWorldState,
  createImportedAccountSummary,
} from "../account/types";
import type { AppSettings, CharacterGoal, KrumpanionGoalState, KrumpanionGoals, PlannerSettings, WeaponGoal } from "../goals/types";
import { DEFAULT_GOAL_STATE, DEFAULT_PLANNER_SETTINGS, DEFAULT_SETTINGS } from "../goals/types";
import { normalizeWeaponGoalRecord } from "../goals/goalState";
import { isIgnoredCharacterKey } from "../staticData/targetability";
import type { OverrideDataPack } from "../staticData/types";
import { APP_VERSION, createDefaultSaveFile, type KrumpanionSaveFile } from "./types";
import { normalizeChecklistState } from "../checklist/types";

interface LegacySettingsDocument {
  version: 1;
  settings: AppSettings & {
    enablePost90Planning?: boolean;
  };
}

interface LegacyOverrideDocument {
  version: 1;
  overridePack: OverrideDataPack | null;
}

function normalizeActiveTab(activeTab: unknown): AppSettings["activeTab"] {
  switch (activeTab) {
    case "dashboard":
    case "planner":
    case "crafting":
    case "goals":
    case "inventory":
    case "database":
    case "checklist":
    case "settings":
      return activeTab;
    case "home":
      return "dashboard";
    case "planning":
      return "goals";
    case "characters":
    case "weapons":
    case "artifactGoals":
      return "goals";
    case "import":
      return "inventory";
    case "export":
    case "warnings":
    case "importExport":
      return "settings";
    default:
      return "dashboard";
  }
}

function normalizePlannerView(plannerView: unknown): AppSettings["plannerView"] {
  switch (plannerView) {
    case "today":
      return "today";
    case "week":
      return "week";
    case "no_resin":
      return "no_resin";
    case "recent_changes":
      return "recent_changes";
    case "materials":
      return "no_resin";
    case "character":
      return "today";
    case "source":
      return "week";
    default:
      return "today";
  }
}

export interface LegacyPersistenceSnapshot {
  goals?: unknown;
  settings?: unknown;
  overridePack?: unknown;
  account?: unknown;
}

function maybeGoals(value: unknown): KrumpanionGoals | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    version?: number;
    characterGoals?: unknown;
    weaponGoals?: unknown;
    artifactGoals?: unknown;
  };
  if ((candidate.version === 1 || candidate.version === 2 || candidate.version === 3 || candidate.version === 4) && candidate.characterGoals && candidate.weaponGoals && candidate.artifactGoals) {
    return candidate as KrumpanionGoals;
  }

  return null;
}

function normalizePlannerSettings(input: PlannerSettings | null | undefined): PlannerSettings {
  const legacyRemainingClaims = (input as { weeklyBossDiscountClaims?: number } | undefined)?.weeklyBossDiscountClaims;
  const usedFromLegacy =
    typeof legacyRemainingClaims === "number" ? Math.min(3, Math.max(0, 3 - legacyRemainingClaims)) : undefined;

  return {
    ...DEFAULT_PLANNER_SETTINGS,
    ...(input ?? {}),
    craftingPassiveOverrides: {
      ...(DEFAULT_PLANNER_SETTINGS.craftingPassiveOverrides ?? {}),
      ...((input as { craftingPassiveOverrides?: Record<string, string | null | undefined> } | undefined)
        ?.craftingPassiveOverrides ?? {}),
    },
    weeklyBossDiscountClaimsUsed: input?.weeklyBossDiscountClaimsUsed ?? usedFromLegacy ?? DEFAULT_PLANNER_SETTINGS.weeklyBossDiscountClaimsUsed,
  };
}

function normalizeGoalState(goals: KrumpanionGoals | null, accountId?: string): KrumpanionGoalState {
  const normalizedCharacterGoals = Object.fromEntries(
    Object.entries(goals?.characterGoals ?? {}).map(([characterKey, goal]) => {
      const currentGoal = goal as CharacterGoal;
      return [
        characterKey,
        {
          ...currentGoal,
          characterKey,
          enabled: isIgnoredCharacterKey(characterKey) ? false : currentGoal.enabled ?? true,
          paused: currentGoal.paused ?? false,
          priority: currentGoal.priority ?? 3,
          planningMode: currentGoal.planningMode ?? "owned",
          currentOverride: currentGoal.currentOverride
            ? {
                ...currentGoal.currentOverride,
                talents: {
                  ...(currentGoal.currentOverride.talents ?? {}),
                },
              }
            : undefined,
        } satisfies CharacterGoal,
      ];
    }),
  );

  const normalizedWeaponGoals = Object.fromEntries(
    Object.entries(goals?.weaponGoals ?? {}).map(([goalId, goal]) => {
      const currentGoal = goal as WeaponGoal;
      return [
        normalizeWeaponGoalRecord(goalId, currentGoal, accountId).goalId,
        normalizeWeaponGoalRecord(goalId, currentGoal, accountId),
      ];
    }),
  );

  return {
    ...structuredClone(DEFAULT_GOAL_STATE),
    version: 4,
    ...(goals
      ? {
          profileName: goals.profileName,
          characterGoals: normalizedCharacterGoals,
          weaponGoals: normalizedWeaponGoals,
          artifactGoals: goals.artifactGoals,
        }
      : {}),
  };
}

function maybeSettings(value: unknown): AppSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const document = value as LegacySettingsDocument;
  if (document.version === 1 && document.settings) {
    return {
      ...DEFAULT_SETTINGS,
      ...document.settings,
      activeTab: normalizeActiveTab(document.settings.activeTab),
      plannerView: normalizePlannerView(document.settings.plannerView),
    };
  }

  const direct = value as Partial<AppSettings> & { enablePost90Planning?: boolean };
  if (typeof direct.activeTab === "string" && typeof direct.plannerView === "string") {
    return {
      ...DEFAULT_SETTINGS,
      ...(direct as AppSettings),
      activeTab: normalizeActiveTab(direct.activeTab),
      plannerView: normalizePlannerView(direct.plannerView),
    };
  }

  return null;
}

function maybeOverridePack(value: unknown): OverrideDataPack | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const document = value as LegacyOverrideDocument;
  if (document.version === 1 && "overridePack" in document) {
    return document.overridePack ?? null;
  }

  return value as OverrideDataPack;
}

function normalizeOverridePack(overridePack: OverrideDataPack | null): OverrideDataPack | null {
  if (!overridePack) {
    return null;
  }

  return {
    ...overridePack,
    legacyExactCharacterProgressions: overridePack.legacyExactCharacterProgressions ?? overridePack.characterProgressions,
    legacyExactWeaponProgressions: overridePack.legacyExactWeaponProgressions ?? overridePack.weaponProgressions,
  };
}

function maybeImportedAccount(value: unknown): ImportedAccountState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ImportedAccountState>;
  if (candidate.importMeta && Array.isArray(candidate.characters) && Array.isArray(candidate.weapons) && candidate.inventory) {
    return candidate as ImportedAccountState;
  }

  return null;
}

function buildWorldStateFromPlannerSettings(plannerSettings: PlannerSettings) {
  const defaults = createDefaultWorldState();
  return {
    ...defaults,
    worldLevel: plannerSettings.worldLevel ?? defaults.worldLevel,
    selectedWorldLevel: plannerSettings.worldLevel ?? defaults.selectedWorldLevel,
    currentResin: plannerSettings.currentResin ?? defaults.currentResin,
    weeklyBossDiscountsUsed: plannerSettings.weeklyBossDiscountClaimsUsed ?? defaults.weeklyBossDiscountsUsed,
    condensedResin: plannerSettings.condensedResinOwned ?? defaults.condensedResin,
    fragileResin: plannerSettings.fragileResinOwned ?? defaults.fragileResin,
    transientResin: plannerSettings.transientResinOwned ?? defaults.transientResin,
  };
}

function createAccountFromLegacyState(
  account: ImportedAccountState | null,
  goals: KrumpanionGoals | null,
  createdAt: string,
  name = "Main Account",
): KrumpanionAccount {
  const now = new Date(createdAt);
  const id = crypto.randomUUID();
  const blank = createBlankAccount({ id, name, now });
  const normalizedPlannerSettings = normalizePlannerSettings(goals?.plannerSettings);

  if (!account) {
    return {
      ...blank,
      goals: normalizeGoalState(goals, id),
      plannerSettings: normalizedPlannerSettings,
      checklist: normalizeChecklistState(undefined, normalizedPlannerSettings.weeklyBossDiscountClaimsUsed, createdAt),
      worldState: buildWorldStateFromPlannerSettings(normalizedPlannerSettings),
    };
  }

  return {
    ...blank,
    ...buildImportedAccountState({
      ...blank,
      ...account,
      goals: blank.goals,
      plannerSettings: blank.plannerSettings,
      worldState: blank.worldState,
      importState: blank.importState,
    }),
    id,
    name,
    createdAt,
    updatedAt: account.importMeta.importedAt || createdAt,
    metadata: {
      ...blank.metadata,
      lastOpenedAt: createdAt,
    },
    goals: normalizeGoalState(goals, id),
    plannerSettings: normalizedPlannerSettings,
    checklist: normalizeChecklistState(undefined, normalizedPlannerSettings.weeklyBossDiscountClaimsUsed, account.importMeta.importedAt || createdAt),
    worldState: buildWorldStateFromPlannerSettings(normalizedPlannerSettings),
    importState: {
      lastGoodImportAt: account.importMeta.importedAt,
      lastGoodSource:
        account.importMeta.source === "file" || account.importMeta.source === "paste" || account.importMeta.source === "manual"
          ? account.importMeta.source
          : "unknown",
      lastGoodFormatVersion: String(account.importMeta.version),
      importWarnings: account.warnings.map((warning) => warning.message),
      importSummary: createImportedAccountSummary(account),
    },
    warnings: account.warnings,
    importMeta: account.importMeta,
    characters: account.characters,
    weapons: account.weapons,
    artifacts: account.artifacts,
    inventory: account.inventory,
  };
}

function normalizeUserState(user: unknown, createdAt: string): MultiAccountUserState {
  if (!user || typeof user !== "object") {
    return createDefaultMultiAccountUserState(new Date(createdAt));
  }

  const candidate = user as Partial<MultiAccountUserState>;
  const accountsById = candidate.accountsById ?? {};
  const accountOrder = Array.isArray(candidate.accountOrder) ? candidate.accountOrder.filter((id): id is string => typeof id === "string") : [];
  const normalizedAccounts: Record<string, KrumpanionAccount> = {};

  for (const accountId of accountOrder) {
    const current = accountsById[accountId];
    if (!current) {
      continue;
    }

    const plannerSettings = normalizePlannerSettings(current.plannerSettings);
    normalizedAccounts[accountId] = {
      ...createBlankAccount({
        id: accountId,
        name: current.name,
        now: new Date(current.createdAt || createdAt),
        metadata: current.metadata,
      }),
      ...current,
      id: accountId,
      name: current.name?.trim() || "Main Account",
      goals: normalizeGoalState({
        ...current.goals,
        plannerSettings,
      } as KrumpanionGoals, accountId),
      plannerSettings,
      checklist: normalizeChecklistState(
        current.checklist,
        plannerSettings.weeklyBossDiscountClaimsUsed,
        current.updatedAt || createdAt,
      ),
      worldState: {
        ...buildWorldStateFromPlannerSettings(plannerSettings),
        ...(current.worldState ?? {}),
      },
      importState: {
        importWarnings: current.importState?.importWarnings ?? current.warnings?.map((warning) => warning.message) ?? [],
        importSummary:
          current.importState?.importSummary ??
          createImportedAccountSummary(buildImportedAccountState(current)),
        ...current.importState,
      },
      importedInventory: {
        ...(current.importedInventory ?? current.inventory ?? {}),
      },
      plannerStatus: {
        status: current.plannerStatus?.status ?? "idle",
        lastRecalculatedAt: current.plannerStatus?.lastRecalculatedAt,
        activeGoalCount: current.plannerStatus?.activeGoalCount ?? 0,
        materialDeficitCount: current.plannerStatus?.materialDeficitCount ?? 0,
        totalEstimatedResin: current.plannerStatus?.totalEstimatedResin ?? 0,
        warningCount: current.plannerStatus?.warningCount ?? 0,
        lastError: current.plannerStatus?.lastError,
      },
      goalProgressTracking: {
        ...(current.goalProgressTracking ?? {}),
      },
      goalMilestones: [...(current.goalMilestones ?? [])],
      recentChanges: [...(current.recentChanges ?? [])],
      recentImports: [...(current.recentImports ?? [])],
      metadata: {
        ...current.metadata,
      },
      materialEditState: {
        ...(current.materialEditState ?? {}),
      },
    };
  }

  const resolvedOrder = accountOrder.filter((accountId) => normalizedAccounts[accountId]);
  if (resolvedOrder.length === 0) {
    return createDefaultMultiAccountUserState(new Date(createdAt));
  }

  const activeAccountId =
    typeof candidate.activeAccountId === "string" && normalizedAccounts[candidate.activeAccountId]
      ? candidate.activeAccountId
      : resolvedOrder[0];

  normalizedAccounts[activeAccountId] = {
    ...normalizedAccounts[activeAccountId],
    metadata: {
      ...normalizedAccounts[activeAccountId].metadata,
      lastOpenedAt: new Date().toISOString(),
    },
  };

  return {
    schemaVersion: 1,
    activeAccountId,
    accountsById: normalizedAccounts,
    accountOrder: resolvedOrder,
  };
}

export function migrateSaveFile(value: unknown): KrumpanionSaveFile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    schemaVersion?: number;
    appVersion?: string;
    createdAt?: string;
    updatedAt?: string;
    user?: unknown;
    account?: unknown;
    goals?: unknown;
    settings?: unknown;
    overridePack?: unknown;
  };

  if (
    (candidate.schemaVersion === 9 || candidate.schemaVersion === 8 || candidate.schemaVersion === 7 || candidate.schemaVersion === 6 || candidate.schemaVersion === 5) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  ) {
    return {
      ...createDefaultSaveFile(new Date(candidate.createdAt)),
      ...candidate,
      schemaVersion: 9,
      appVersion: candidate.appVersion ?? APP_VERSION,
      user: normalizeUserState(candidate.user, candidate.createdAt),
      settings: {
        ...DEFAULT_SETTINGS,
        ...(maybeSettings(candidate.settings) ?? {}),
      },
      overridePack: normalizeOverridePack(maybeOverridePack(candidate.overridePack) ?? null),
    } as KrumpanionSaveFile;
  }

  if (
    (candidate.schemaVersion === 4 || candidate.schemaVersion === 3 || candidate.schemaVersion === 2 || candidate.schemaVersion === 1) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  ) {
    const goals = normalizeGoalState(maybeGoals(candidate.goals));
    const plannerSettings = normalizePlannerSettings(maybeGoals(candidate.goals)?.plannerSettings);
    const account = createAccountFromLegacyState(maybeImportedAccount(candidate.account), maybeGoals(candidate.goals), candidate.createdAt);
    account.goals = goals;
    account.plannerSettings = plannerSettings;
    account.worldState = buildWorldStateFromPlannerSettings(plannerSettings);

    return {
      ...createDefaultSaveFile(new Date(candidate.createdAt)),
      schemaVersion: 9,
      appVersion: candidate.appVersion ?? APP_VERSION,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      user: {
        schemaVersion: 1,
        activeAccountId: account.id,
        accountsById: {
          [account.id]: account,
        },
        accountOrder: [account.id],
      },
      settings: {
        ...DEFAULT_SETTINGS,
        ...(maybeSettings(candidate.settings) ?? {}),
      },
      overridePack: normalizeOverridePack(maybeOverridePack(candidate.overridePack) ?? null),
    };
  }

  return null;
}

export function migrateLegacySnapshot(snapshot: LegacyPersistenceSnapshot, now = new Date()): KrumpanionSaveFile {
  const save = createDefaultSaveFile(now);
  const goals = maybeGoals(snapshot.goals);
  const account = createAccountFromLegacyState(maybeImportedAccount(snapshot.account), goals, save.createdAt);

  return {
    ...save,
    user: {
      schemaVersion: 1,
      activeAccountId: account.id,
      accountsById: {
        [account.id]: account,
      },
      accountOrder: [account.id],
    },
    settings: {
      ...DEFAULT_SETTINGS,
      ...(maybeSettings(snapshot.settings) ?? {}),
    },
    overridePack: normalizeOverridePack(maybeOverridePack(snapshot.overridePack)) ?? save.overridePack,
  };
}
