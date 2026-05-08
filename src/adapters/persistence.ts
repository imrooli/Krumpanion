import Ajv2020 from "ajv/dist/2020";
import Dexie, { type Table } from "dexie";
import goalsSchema from "../../schemas/goals.schema.json";
import saveSchema from "../../schemas/save.schema.json";
import { migrateLegacySnapshot, migrateSaveFile } from "../domain/save/migrations";
import type { KrumpanionSaveFile } from "../domain/save/types";
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
}

class KrumpanionDatabase extends Dexie {
  documents!: Table<PersistedRecord<unknown>, string>;

  constructor() {
    super("KrumpanionDatabase");
    this.version(1).stores({
      documents: "&key",
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
}

export const persistenceAdapter = new IndexedDbPersistenceAdapter();
