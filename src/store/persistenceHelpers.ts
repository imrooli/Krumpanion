import type { GameDataUpdateState } from "../domain/staticData/upstreamTypes";
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
  gameDataUpdates: GameDataUpdateState;
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
    gameDataUpdates: state.gameDataUpdates,
  };
}

export async function persistCurrentSnapshot(state: PersistedAppSlice) {
  const saveFile = buildSaveFromState(state);
  await persistenceAdapter.saveSaveFile(saveFile);
  return saveFile;
}

// Serialize read -> validate -> persist -> publish, including publication. A queued
// writer must read the current store inside its callback, never a stale snapshot.
let persistenceTail: Promise<unknown> = Promise.resolve();
export function withPersistenceTransaction<T>(work: () => Promise<T>): Promise<T> {
  const result = persistenceTail.then(work);
  persistenceTail = result.catch(() => undefined);
  return result;
}

/** Apply only the fields an edit changed to a newer snapshot. Arrays are values. */
export function rebaseStateChanges<T>(base: T, edited: T, current: T): T {
  if (Object.is(base, edited)) return current;
  if (Object.is(base, current)) return edited;
  if (base && edited && current && typeof base === "object" && typeof edited === "object" && typeof current === "object" && !Array.isArray(base) && !Array.isArray(edited) && !Array.isArray(current)) {
    const before = base as Record<string, unknown>;
    const after = edited as Record<string, unknown>;
    const result = { ...current } as Record<string, unknown>;
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (!(key in after)) delete result[key];
      else result[key] = rebaseStateChanges(before[key], after[key], result[key]);
    }
    return result as T;
  }
  return edited;
}

export function toSaveInfo(saveFile: KrumpanionSaveFile): SaveInfo {
  return {
    schemaVersion: saveFile.schemaVersion,
    appVersion: saveFile.appVersion,
    createdAt: saveFile.createdAt,
    updatedAt: saveFile.updatedAt,
  };
}
