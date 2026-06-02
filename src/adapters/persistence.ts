import Ajv2020 from "ajv/dist/2020";
import Dexie, { type Table } from "dexie";
import goalsSchema from "../../schemas/goals.schema.json";
import saveSchema from "../../schemas/save.schema.json";
import { migrateLegacySnapshot, migrateSaveFile } from "../domain/save/migrations";
import type {
  BackupReason,
  GoalBackupPayload,
  GoalBackupRecord,
  KrumpanionSaveFile,
  RecoveryBackupRecord,
  SaveRecoveryPointRecord,
} from "../domain/save/types";
import { createDefaultSaveFile } from "../domain/save/types";

interface PersistedRecord<T> {
  key: string;
  value: T;
}

export interface PersistenceAdapter {
  loadSaveFile(): Promise<KrumpanionSaveFile>;
  saveSaveFile(saveFile: KrumpanionSaveFile): Promise<void>;
  exportSaveFile(): Promise<string>;
  importSaveFile(text: string): Promise<KrumpanionSaveFile>;
  listGoalBackups(accountId?: string): Promise<GoalBackupRecord[]>;
  createGoalBackup(accountId: string, payload: GoalBackupPayload, reason: BackupReason): Promise<GoalBackupRecord>;
  restoreGoalBackup(backupId: string): Promise<GoalBackupPayload>;
  listSaveRecoveryPoints(): Promise<SaveRecoveryPointRecord[]>;
  createSaveRecoveryPoint(saveFile: KrumpanionSaveFile, reason: BackupReason, accountId?: string): Promise<SaveRecoveryPointRecord>;
  restoreSaveRecoveryPoint(backupId: string): Promise<KrumpanionSaveFile>;
}

class KrumpanionDatabase extends Dexie {
  documents!: Table<PersistedRecord<unknown>, string>;
  backups!: Table<RecoveryBackupRecord, string>;

  constructor() {
    super("KrumpanionDatabase");
    this.version(1).stores({
      documents: "&key",
    });
    this.version(2).stores({
      documents: "&key",
      backups: "&id, kind, accountId, createdAt, [kind+accountId+createdAt], [kind+createdAt]",
    });
  }
}

const database = new KrumpanionDatabase();
const ajv = new Ajv2020({ allErrors: true });
ajv.addSchema(goalsSchema, "https://krumpanion.local/schemas/goals.schema.json");
const validateSaveFile = ajv.compile<KrumpanionSaveFile>(saveSchema);

async function readDocument<T>(key: string): Promise<T | undefined> {
  const record = await database.documents.get(key);
  return record?.value as T | undefined;
}

async function writeDocument<T>(key: string, value: T): Promise<void> {
  await database.documents.put({ key, value });
}

async function listBackupsByKind<TRecord extends RecoveryBackupRecord["kind"]>(
  kind: TRecord,
  accountId?: string,
): Promise<Array<Extract<RecoveryBackupRecord, { kind: TRecord }>>> {
  const rows = await database.backups
    .filter((record) => record.kind === kind && (accountId === undefined || record.accountId === accountId))
    .sortBy("createdAt");

  return rows.reverse() as Array<Extract<RecoveryBackupRecord, { kind: TRecord }>>;
}

async function pruneBackups(kind: RecoveryBackupRecord["kind"], limit: number, accountId?: string): Promise<void> {
  const rows = await listBackupsByKind(kind, accountId);
  const staleRows = rows.slice(limit);
  if (!staleRows.length) {
    return;
  }

  await database.backups.bulkDelete(staleRows.map((row) => row.id));
}

async function loadLegacySnapshot(): Promise<{
  goals?: unknown;
  settings?: unknown;
  overridePack?: unknown;
  account?: unknown;
}> {
  const [goals, settings, overridePack, account] = await Promise.all([
    readDocument("goals"),
    readDocument("settings"),
    readDocument("overridePack"),
    readDocument("account"),
  ]);

  return { goals, settings, overridePack, account };
}

function normalizeSaveFile(saveFile: KrumpanionSaveFile, now = new Date()): KrumpanionSaveFile {
  return {
    ...saveFile,
    updatedAt: now.toISOString(),
  };
}

export class IndexedDbPersistenceAdapter implements PersistenceAdapter {
  async loadSaveFile(): Promise<KrumpanionSaveFile> {
    const document = await readDocument<unknown>("saveFile");
    const migrated = migrateSaveFile(document);
    if (migrated) {
      return migrated;
    }

    const legacySnapshot = await loadLegacySnapshot();
    return migrateLegacySnapshot(legacySnapshot);
  }

  async saveSaveFile(saveFile: KrumpanionSaveFile): Promise<void> {
    await writeDocument("saveFile", normalizeSaveFile(saveFile));
  }

  async exportSaveFile(): Promise<string> {
    const saveFile = await this.loadSaveFile();
    return JSON.stringify(saveFile, null, 2);
  }

  async importSaveFile(text: string): Promise<KrumpanionSaveFile> {
    const parsed = JSON.parse(text) as unknown;
    const migrated = migrateSaveFile(parsed) ?? migrateSaveFile({ ...createDefaultSaveFile(), ...(parsed as object) });

    if (!migrated || !validateSaveFile(migrated)) {
      const errorMessage =
        validateSaveFile.errors?.map((error) => `${error.instancePath || "/"} ${error.message}`).join(", ") ??
        "Save file validation failed.";
      throw new Error(errorMessage);
    }

    await this.saveSaveFile(migrated);
    return migrated;
  }

  async listGoalBackups(accountId?: string): Promise<GoalBackupRecord[]> {
    return listBackupsByKind("goal_backup", accountId);
  }

  async createGoalBackup(accountId: string, payload: GoalBackupPayload, reason: BackupReason): Promise<GoalBackupRecord> {
    const record: GoalBackupRecord = {
      id: crypto.randomUUID(),
      kind: "goal_backup",
      accountId,
      createdAt: new Date().toISOString(),
      reason,
      payload,
    };
    await database.backups.put(record);
    await pruneBackups("goal_backup", 20, accountId);
    return record;
  }

  async restoreGoalBackup(backupId: string): Promise<GoalBackupPayload> {
    const record = await database.backups.get(backupId);
    if (!record || record.kind !== "goal_backup") {
      throw new Error("Goal backup was not found.");
    }

    return structuredClone(record.payload);
  }

  async listSaveRecoveryPoints(): Promise<SaveRecoveryPointRecord[]> {
    return listBackupsByKind("save_recovery_point");
  }

  async createSaveRecoveryPoint(saveFile: KrumpanionSaveFile, reason: BackupReason, accountId?: string): Promise<SaveRecoveryPointRecord> {
    const record: SaveRecoveryPointRecord = {
      id: crypto.randomUUID(),
      kind: "save_recovery_point",
      accountId,
      createdAt: new Date().toISOString(),
      reason,
      payload: {
        saveFile: structuredClone(saveFile),
      },
    };
    await database.backups.put(record);
    await pruneBackups("save_recovery_point", 5);
    return record;
  }

  async restoreSaveRecoveryPoint(backupId: string): Promise<KrumpanionSaveFile> {
    const record = await database.backups.get(backupId);
    if (!record || record.kind !== "save_recovery_point") {
      throw new Error("Save recovery point was not found.");
    }

    return structuredClone(record.payload.saveFile);
  }
}

export const persistenceAdapter = new IndexedDbPersistenceAdapter();
