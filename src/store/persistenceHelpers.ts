import { persistenceAdapter } from "../adapters/persistence";
import type { MultiAccountUserState } from "../domain/account/types";
import type { OverrideDataPack } from "../domain/staticData/types";
import { APP_VERSION, createDefaultSaveFile, SAVE_SCHEMA_VERSION, type KrumpanionSaveFile } from "../domain/save/types";
import type { AppSettings } from "../domain/goals/types";

export interface SaveInfo {
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedAppSlice {
  user: MultiAccountUserState;
  settings: AppSettings;
  overridePack: OverrideDataPack | null;
  saveInfo: SaveInfo;
}

export const defaultSave = createDefaultSaveFile();

export function buildSaveFromState(state: PersistedAppSlice): KrumpanionSaveFile {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    createdAt: state.saveInfo.createdAt,
    updatedAt: new Date().toISOString(),
    user: state.user,
    settings: state.settings,
    overridePack: state.overridePack,
  };
}

export async function persistCurrentSnapshot(state: PersistedAppSlice) {
  const saveFile = buildSaveFromState(state);
  await persistenceAdapter.saveSaveFile(saveFile);
  return saveFile;
}

export function toSaveInfo(saveFile: KrumpanionSaveFile): SaveInfo {
  return {
    schemaVersion: saveFile.schemaVersion,
    appVersion: saveFile.appVersion,
    createdAt: saveFile.createdAt,
    updatedAt: saveFile.updatedAt,
  };
}
