import type { ExportedKrumpanionAccount, MultiAccountUserState } from "../account/types";
import { createDefaultMultiAccountUserState } from "../account/types";
import type { AppSettings } from "../goals/types";
import { DEFAULT_SETTINGS } from "../goals/types";
import type { OverrideDataPack } from "../staticData/types";

export const APP_VERSION = "0.4.0";
export const SAVE_SCHEMA_VERSION = 4;
export const ACCOUNT_EXPORT_SCHEMA_VERSION = 1;

export interface KrumpanionFullBackup {
  schemaVersion: 4;
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
