import type { ExportedKrumpanionAccount, MultiAccountUserState } from "../account/types";
import { createDefaultMultiAccountUserState } from "../account/types";
import type { AppSettings, KrumpanionGoalState, PlannerSettings } from "../goals/types";
import { DEFAULT_SETTINGS } from "../goals/types";
import type { OverrideDataPack } from "../staticData/types";
import type { AccountId } from "../account/types";

export const APP_VERSION = "0.4.0";
export const SAVE_SCHEMA_VERSION = 10;
export const ACCOUNT_EXPORT_SCHEMA_VERSION = 1;

export type BackupReason =
  | "goal_edit"
  | "planner_settings_edit"
  | "good_import_preflight"
  | "account_import_preflight"
  | "save_import_preflight"
  | "account_delete_preflight"
  | "pre_restore";

export interface GoalBackupPayload {
  accountId: AccountId;
  accountName: string;
  goals: KrumpanionGoalState;
  plannerSettings: PlannerSettings;
}

export interface SaveRecoveryPayload {
  saveFile: KrumpanionSaveFile;
}

interface BackupRecordBase {
  id: string;
  kind: "goal_backup" | "save_recovery_point";
  createdAt: string;
  reason: BackupReason;
}

export interface GoalBackupRecord extends BackupRecordBase {
  kind: "goal_backup";
  accountId: AccountId;
  payload: GoalBackupPayload;
}

export interface SaveRecoveryPointRecord extends BackupRecordBase {
  kind: "save_recovery_point";
  accountId?: AccountId;
  payload: SaveRecoveryPayload;
}

export type RecoveryBackupRecord = GoalBackupRecord | SaveRecoveryPointRecord;

export type PersistenceStatusKind = "idle" | "saving" | "saved" | "backupSaving" | "backupSaved" | "failed";

export interface PersistenceStatus {
  status: PersistenceStatusKind;
  lastSavedAt?: string;
  lastGoalBackupAtByAccount: Record<AccountId, string | undefined>;
  lastBackupError?: string;
}

export interface KrumpanionFullBackup {
  schemaVersion: 10;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
  user: MultiAccountUserState;
  settings: AppSettings;
  overridePack: OverrideDataPack | null;
}

export type KrumpanionSaveFile = KrumpanionFullBackup;

export function createDefaultSaveFile(now = new Date()): KrumpanionSaveFile {
  const timestamp = now.toISOString();

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    user: createDefaultMultiAccountUserState(now),
    settings: structuredClone(DEFAULT_SETTINGS),
    overridePack: null,
  };
}

export function createDefaultAccountExport(
  account: ExportedKrumpanionAccount["account"],
  now = new Date(),
): ExportedKrumpanionAccount {
  return {
    schemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    account,
  };
}
