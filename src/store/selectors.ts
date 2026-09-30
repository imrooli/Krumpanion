import type { KrumpanionAccount, MultiAccountUserState } from "../domain/account/types";
import { buildAccountLookups, buildImportedAccountState } from "../domain/account/types";
import { buildChecklistAccountSummary, buildChecklistModel } from "../domain/checklist/model";
import { createDefaultChecklistState } from "../domain/checklist/types";
import type { KrumpanionGoals } from "../domain/goals/types";
import { DEFAULT_GOAL_STATE, DEFAULT_PLANNER_SETTINGS } from "../domain/goals/types";
import { buildInventoryWarnings, buildUnknownDataWarnings } from "../domain/staticData/loadStaticData";
import { buildPlannerOutput } from "../domain/planner/buildPlannerRows";
import { memoizeLast } from "../utils/memoizeLast";
import type { AppState } from "./useAppStore";

const memoizedPlannerOutput = memoizeLast(
  (
    _activeAccountId: string,
    account: ReturnType<typeof getActiveAccount>,
    goals: KrumpanionGoals,
    staticData: AppState["staticData"],
    today: AppState["today"],
    resinSettings: KrumpanionGoals["plannerSettings"],
  ) =>
    buildPlannerOutput({
      inventory: account?.inventory ?? {},
      ownership: {
        characters: account?.characters ?? [],
        weapons: account?.weapons ?? [],
        artifacts: account?.artifacts ?? [],
      },
      goals,
      staticData,
      today,
      resinSettings,
      enablePost90Planning: false,
    }),
);
const memoizedInventoryWarnings = memoizeLast(buildInventoryWarnings);
const memoizedOverrideWarnings = memoizeLast(buildUnknownDataWarnings);
const memoizedAccountLookups = memoizeLast(buildAccountLookups);

export function getActiveAccountId(state: Pick<AppState, "user">): string {
  return state.user.activeAccountId;
}

export function getAccountById(state: Pick<AppState, "user">, accountId: string): KrumpanionAccount | undefined {
  return state.user.accountsById[accountId];
}

export function getActiveAccount(state: Pick<AppState, "user">): KrumpanionAccount | null {
  return state.user.accountsById[state.user.activeAccountId] ?? null;
}

export function selectActiveAccount(state: AppState) {
  return getActiveAccount(state);
}

export function selectActiveInventory(state: AppState) {
  return getActiveAccount(state)?.inventory ?? {};
}

export function selectActiveImportedInventory(state: AppState) {
  return getActiveAccount(state)?.importedInventory ?? {};
}

export function selectActiveGoals(state: AppState): KrumpanionGoals {
  const account = getActiveAccount(state);
  if (!account) {
    return {
      ...DEFAULT_GOAL_STATE,
      plannerSettings: clonePlannerSettings(),
    };
  }

  return {
    ...account.goals,
    plannerSettings: account.plannerSettings,
  };
}

export function selectActiveOwnership(state: AppState) {
  const account = getActiveAccount(state);
  return {
    characters: account?.characters ?? [],
    weapons: account?.weapons ?? [],
    artifacts: account?.artifacts ?? [],
  };
}

export function selectActiveWorldState(state: AppState) {
  return getActiveAccount(state)?.worldState ?? {};
}

export function selectActivePlannerStatus(state: AppState) {
  return getActiveAccount(state)?.plannerStatus ?? null;
}

export function selectActiveRecentChanges(state: AppState) {
  return getActiveAccount(state)?.recentChanges ?? [];
}

export function selectActiveRecentImports(state: AppState) {
  return getActiveAccount(state)?.recentImports ?? [];
}

export function selectActivePlannerSettings(state: AppState) {
  return getActiveAccount(state)?.plannerSettings ?? clonePlannerSettings();
}

export function selectActiveChecklistModel(state: AppState) {
  const account = getActiveAccount(state);
  const now = new Date(state.timeSensitiveAt ?? new Date().toISOString());
  return buildChecklistModel(account?.checklist ?? createDefaultChecklistState(), now);
}

export function selectActiveChecklistAttentionCount(state: AppState) {
  return selectActiveChecklistModel(state).summary.needsAttentionCount;
}

export function selectAllAccountChecklistSummaries(state: AppState) {
  const now = new Date(state.timeSensitiveAt ?? new Date().toISOString());
  return getAccountOrder(state.user)
    .map((account) => buildChecklistAccountSummary(account, now))
    .sort(
      (left, right) =>
        right.urgentCount - left.urgentCount ||
        right.needsAttentionCount - left.needsAttentionCount ||
        left.accountName.localeCompare(right.accountName),
    );
}

export function selectPlannerOutput(state: AppState) {
  const account = getActiveAccount(state);
  const goals = selectActiveGoals(state);
  return memoizedPlannerOutput(
    state.user.activeAccountId,
    account,
    goals,
    state.staticData,
    state.today,
    goals.plannerSettings,
  );
}

export function selectInventoryWarnings(state: AppState) {
  const account = getActiveAccount(state);
  return memoizedInventoryWarnings(account ? buildImportedAccountState(account) : null, state.staticData);
}

export function selectOverrideWarnings(state: AppState) {
  return memoizedOverrideWarnings(state.staticData);
}

export function selectAccountLookups(state: AppState) {
  return memoizedAccountLookups(getActiveAccount(state));
}

export function selectInventoryRows(state: AppState) {
  const inventory = selectActiveInventory(state);
  const importedInventory = selectActiveImportedInventory(state);
  const materialEditState = getActiveAccount(state)?.materialEditState ?? {};
  const knownRows = Object.values(state.staticData.materials).map((material) => {
    const record = state.staticData.materialRecords[material.key];
    const importedQuantity = importedInventory[material.key];
    const sourceState = materialEditState[material.key]
      ? "manual"
      : importedQuantity != null
        ? "imported"
        : "missing_from_import";
    return {
      materialKey: material.key,
      displayName: material.displayName,
      category: material.category ?? "other",
      quantity: inventory[material.key] ?? 0,
      importedQuantity,
      sourceState,
      familyKey: record?.familyKey,
      sources: state.staticData.materialSources[material.key] ?? [],
      manualEdit: materialEditState[material.key],
    };
  });

  const extraRows = Object.entries(inventory)
    .filter(([materialKey]) => !state.staticData.materials[materialKey])
    .map(([materialKey, quantity]) => ({
      materialKey,
      displayName: materialKey,
      category: "other",
      quantity,
      importedQuantity: importedInventory[materialKey],
      sourceState: materialEditState[materialKey]
        ? "manual"
        : materialKey in importedInventory
          ? "imported"
          : "missing_from_import",
      familyKey: undefined,
      sources: state.staticData.materialSources[materialKey] ?? [],
      manualEdit: materialEditState[materialKey],
    }));

  return [...knownRows, ...extraRows]
    .sort((left, right) => left.category.localeCompare(right.category) || right.quantity - left.quantity);
}

export function selectSaveSummary(state: AppState) {
  const activeAccount = getActiveAccount(state);
  const activeAccountId = activeAccount?.id ?? state.user.activeAccountId;
  return {
    schemaVersion: state.saveInfo.schemaVersion,
    appVersion: state.saveInfo.appVersion,
    createdAt: state.saveInfo.createdAt,
    updatedAt: state.saveInfo.updatedAt,
    hasAccount: Boolean(activeAccount),
    activeAccountName: activeAccount?.name ?? "No account",
    accountCount: state.user.accountOrder.length,
    persistenceStatus: state.persistenceStatus.status,
    lastSavedAt: state.persistenceStatus.lastSavedAt ?? state.saveInfo.updatedAt,
    lastGoalBackupAt: activeAccountId ? state.persistenceStatus.lastGoalBackupAtByAccount[activeAccountId] : undefined,
    goalBackupCount: state.goalBackups.length,
    saveRecoveryPointCount: state.saveRecoveryPoints.length,
    lastBackupError: state.persistenceStatus.lastBackupError,
  };
}

export function selectPersistenceStatus(state: AppState) {
  return state.persistenceStatus;
}

export function selectActiveGoalBackups(state: AppState) {
  return state.goalBackups;
}

export function selectSaveRecoveryPoints(state: AppState) {
  return state.saveRecoveryPoints;
}

export function getAccountOrder(user: MultiAccountUserState) {
  return user.accountOrder.map((accountId) => user.accountsById[accountId]).filter(Boolean);
}

function clonePlannerSettings() {
  return structuredClone(DEFAULT_PLANNER_SETTINGS);
}
