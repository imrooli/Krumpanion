import { migrateSaveFile } from "../domain/save/migrations";
import "fake-indexeddb/auto";
import exampleGoals from "../../examples/goals.example.json";
import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultSaveFile, type KrumpanionSaveFile } from "../domain/save/types";
import { IndexedDbPersistenceAdapter } from "./persistence";
import { reconcileGameData } from "../domain/staticData/reconcileGameData";
import { loadStaticData } from "../domain/staticData/loadStaticData";
import { newLivePatch } from "../test/fixtures/newLivePatch";

describe("IndexedDbPersistenceAdapter", () => {
  let adapter: IndexedDbPersistenceAdapter;

  beforeEach(() => {
    adapter = new IndexedDbPersistenceAdapter();
  });

  it("migrates schema 14 and preserves schema 15 metadata through backup and hydration", async () => {
    const original = createDefaultSaveFile();
    original.user.accountsById[original.user.activeAccountId].inventory.Mora = 456;
    const migrated = migrateSaveFile({ ...original, schemaVersion: 14 })!;
    expect(migrated.schemaVersion).toBe(15);
    migrated.gameDataUpdates.appliedExtractorVersion = 2;
    migrated.gameDataUpdates.lastAttempt = { trigger: "good", startedAt: new Date().toISOString(), result: "running", stage: "download" };
    migrated.gameDataUpdates.status = "downloading";
    migrated.overridePack = { version: 1, farmingOrigins: { "family:test": { availability: { source: "manual" } } } };
    await adapter.saveSaveFile(migrated);
    const recovered = await adapter.loadSaveFile();
    expect(recovered.gameDataUpdates.lastAttempt?.result).toBe("interrupted");
    expect(recovered.gameDataUpdates.status).toBe("failed");
    expect(recovered.gameDataUpdates.appliedExtractorVersion).toBe(2);
    expect(recovered.overridePack?.farmingOrigins?.["family:test"].availability?.source).toBe("manual");
    expect(recovered.user.accountsById[recovered.user.activeAccountId].inventory.Mora).toBe(456);
    const restored = await adapter.importSaveFile(await adapter.exportSaveFile());
    expect(restored.overridePack?.farmingOrigins).toEqual(recovered.overridePack?.farmingOrigins);
  });
  it("round-trips exact updates and account-associated discoveries through full backups and recovery", async () => {
    const save = createDefaultSaveFile();
    const result = reconcileGameData(loadStaticData(), null, newLivePatch(), {});
    save.overridePack = result.overridePack;
    save.gameDataUpdates = { ...save.gameDataUpdates, appliedRevision: newLivePatch().revision, effectiveVersion: 1, status: "updated", discoveries: { unknown: { id: "unknown", entityType: "material", rawKey: "Unknown", accountIds: [save.user.activeAccountId], firstSeen: save.createdAt, lastSeen: save.createdAt, source: "GOOD", status: "ignored" } } };
    save.user.accountsById[save.user.activeAccountId].inventory.Unknown = 12;
    await adapter.saveSaveFile(save);
    const imported = await adapter.importSaveFile(await adapter.exportSaveFile());
    expect(imported.gameDataUpdates).toEqual(save.gameDataUpdates);
    expect(loadStaticData(imported.overridePack).exactCharacterRequirements?.NewCharacter).toEqual(result.staticData.exactCharacterRequirements?.NewCharacter);
    const backup = await adapter.createSaveRecoveryPoint(save, "pre_restore");
    const restored = await adapter.restoreSaveRecoveryPoint(backup.id);
    expect(restored.gameDataUpdates.discoveries.unknown.status).toBe("ignored");
    expect(restored.user.accountsById[save.user.activeAccountId].inventory.Unknown).toBe(12);
  });

  it("validates and round-trips full save files", async () => {
    const saveFile: KrumpanionSaveFile = createDefaultSaveFile(new Date("2026-05-02T00:00:00.000Z"));
    const activeAccountId = saveFile.user.activeAccountId;
    saveFile.user.accountsById[activeAccountId] = {
      ...saveFile.user.accountsById[activeAccountId],
      goals: {
        version: 7,
        profileName: (exampleGoals as { profileName?: string }).profileName,
        characterGoals: {
          ...((exampleGoals as { characterGoals: Record<string, unknown> }).characterGoals as typeof saveFile.user.accountsById[typeof activeAccountId]["goals"]["characterGoals"]),
          Furina: {
            ...((exampleGoals as { characterGoals: Record<string, unknown> }).characterGoals as typeof saveFile.user.accountsById[typeof activeAccountId]["goals"]["characterGoals"]).Furina,
            paused: true,
          },
        },
        weaponGoals: (exampleGoals as { weaponGoals: Record<string, unknown> }).weaponGoals as typeof saveFile.user.accountsById[typeof activeAccountId]["goals"]["weaponGoals"],
        artifactGoals: (exampleGoals as { artifactGoals: Array<unknown> }).artifactGoals as typeof saveFile.user.accountsById[typeof activeAccountId]["goals"]["artifactGoals"],
      },
      plannerSettings: (exampleGoals as { plannerSettings: typeof saveFile.user.accountsById[typeof activeAccountId]["plannerSettings"] }).plannerSettings,
      importMeta: {
        format: "GOOD",
        version: 3,
        source: "Test",
        importedAt: "2026-05-02T00:00:00.000Z",
      },
      inventory: {
        Mora: 1000,
      },
      importedInventory: {
        Mora: 800,
      },
      materialEditState: {
        Mora: {
          editedAt: "2026-05-02T00:00:00.000Z",
          source: "manual",
        },
      },
    };

    await adapter.saveSaveFile(saveFile);
    const exported = await adapter.exportSaveFile();
    const imported = await adapter.importSaveFile(exported);
    const importedAccount = imported.user.accountsById[imported.user.activeAccountId];

    expect(importedAccount.goals.characterGoals.Furina.targetLevel).toBe(90);
    expect(importedAccount.goals.characterGoals.Furina.paused).toBe(true);
    expect(importedAccount.inventory.Mora).toBe(1000);
    expect(importedAccount.importedInventory.Mora).toBe(800);
    expect(importedAccount.materialEditState.Mora?.source).toBe("manual");
  });

  it("rejects malformed save files", async () => {
    await expect(adapter.importSaveFile(JSON.stringify({ schemaVersion: 999 }))).rejects.toThrow();
  });

  it("migrates legacy save files and legacy exact override progressions into the current schema", async () => {
    const defaults = createDefaultSaveFile();
    const defaultAccount = defaults.user.accountsById[defaults.user.activeAccountId];

    const migrated = await adapter.importSaveFile(
      JSON.stringify({
        schemaVersion: 1,
        appVersion: "0.1.0",
        createdAt: "2026-05-02T00:00:00.000Z",
        updatedAt: "2026-05-02T00:00:00.000Z",
        account: null,
        goals: {
          version: 2,
          characterGoals: {},
          weaponGoals: {},
          artifactGoals: [],
          plannerSettings: defaultAccount.plannerSettings,
        },
        settings: {
          activeTab: "dashboard",
          plannerView: "today",
        },
        overridePack: {
          version: 1,
          characterProgressions: {
            LegacyCharacter: {
              key: "LegacyCharacter",
              levelTotals: { "1": {}, "20": { Mora: 1 } },
              ascensionTotals: { "0": {}, "1": { Mora: 2 } },
              talentTotals: { "1": {}, "2": { Mora: 3 } },
            },
          },
        },
      }),
    );

    const migratedAccount = migrated.user.accountsById[migrated.user.activeAccountId];
    expect(migrated.schemaVersion).toBe(15);
    expect(migrated.settings.activeTab).toBe("dashboard");
    expect(migratedAccount.plannerSettings.weeklyBossDiscountClaimsUsed).toBe(0);
    expect(migratedAccount.importedInventory).toEqual(migratedAccount.inventory);
    expect(migratedAccount.checklist.weeklyBossClaims.usedCount).toBe(0);
    expect(migratedAccount.checklist.realmCurrency.realmLevel).toBe(10);
    expect(migratedAccount.checklist.realmCurrency.trustRank).toBe(10);
    expect(migratedAccount.goals.version).toBe(7);
    expect(migratedAccount.goalProgressTracking).toEqual({});
    expect(migratedAccount.goalMilestones).toEqual([]);
    expect(migrated.overridePack?.legacyExactCharacterProgressions?.LegacyCharacter.levelTotals?.["20"]?.Mora).toBe(1);
  });

  it("keeps crafting as a valid persisted active tab during import", async () => {
    const defaults = createDefaultSaveFile();
    const imported = await adapter.importSaveFile(
      JSON.stringify({
        ...defaults,
        settings: {
          ...defaults.settings,
          activeTab: "crafting",
        },
      }),
    );

    expect(imported.settings.activeTab).toBe("crafting");
  });

  it("keeps checklist as a valid persisted active tab during import", async () => {
    const defaults = createDefaultSaveFile();
    const imported = await adapter.importSaveFile(
      JSON.stringify({
        ...defaults,
        settings: {
          ...defaults.settings,
          activeTab: "checklist",
        },
      }),
    );

    expect(imported.settings.activeTab).toBe("checklist");
  });

  it("repairs an invalid active account id during import", async () => {
    const saveFile = createDefaultSaveFile(new Date("2026-05-02T00:00:00.000Z"));
    const validAccountId = saveFile.user.accountOrder[0];

    const imported = await adapter.importSaveFile(
      JSON.stringify({
        ...saveFile,
        user: {
          ...saveFile.user,
          activeAccountId: "missing-account",
        },
      }),
    );

    expect(imported.user.activeAccountId).toBe(validAccountId);
    expect(imported.user.accountsById[validAccountId]).toBeDefined();
  });

  it("creates and prunes goal backups per account", async () => {
    const backupSeed = createDefaultSaveFile();
    const backupAccount = backupSeed.user.accountsById[backupSeed.user.activeAccountId];

    for (let index = 0; index < 22; index += 1) {
      await adapter.createGoalBackup(
        "account-a",
        {
          accountId: "account-a",
          accountName: "Account A",
          goals: backupAccount.goals,
          plannerSettings: backupAccount.plannerSettings,
        },
        "goal_edit",
      );
    }

    await adapter.createGoalBackup(
      "account-b",
      {
        accountId: "account-b",
        accountName: "Account B",
        goals: backupAccount.goals,
        plannerSettings: backupAccount.plannerSettings,
      },
      "planner_settings_edit",
    );

    const accountABackups = await adapter.listGoalBackups("account-a");
    const accountBBackups = await adapter.listGoalBackups("account-b");

    expect(accountABackups).toHaveLength(20);
    expect(accountBBackups).toHaveLength(1);
    expect(accountABackups[0].createdAt >= accountABackups[19].createdAt).toBe(true);

    const restored = await adapter.restoreGoalBackup(accountABackups[0].id);
    expect(restored.accountId).toBe("account-a");
    expect(restored.accountName).toBe("Account A");
  });

  it("creates and prunes full save recovery points", async () => {
    const createdAtValues: string[] = [];

    for (let index = 0; index < 7; index += 1) {
      const saveFile = createDefaultSaveFile(new Date(`2026-05-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`));
      saveFile.updatedAt = `2026-05-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`;
      const record = await adapter.createSaveRecoveryPoint(saveFile, "save_import_preflight");
      createdAtValues.push(record.createdAt);
    }

    const recoveryPoints = await adapter.listSaveRecoveryPoints();
    expect(recoveryPoints).toHaveLength(5);

    const restored = await adapter.restoreSaveRecoveryPoint(recoveryPoints[0].id);
    expect(restored.updatedAt).toBeDefined();
    expect(recoveryPoints[0].createdAt >= recoveryPoints[4].createdAt).toBe(true);
    expect(createdAtValues).toHaveLength(7);
  });
});
