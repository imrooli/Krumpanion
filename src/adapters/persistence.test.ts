import "fake-indexeddb/auto";
import exampleGoals from "../../examples/goals.example.json";
import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultSaveFile, type KrumpanionSaveFile } from "../domain/save/types";
import { IndexedDbPersistenceAdapter } from "./persistence";

describe("IndexedDbPersistenceAdapter", () => {
  let adapter: IndexedDbPersistenceAdapter;

  beforeEach(() => {
    adapter = new IndexedDbPersistenceAdapter();
  });

  it("validates and round-trips full save files", async () => {
    const saveFile: KrumpanionSaveFile = createDefaultSaveFile(new Date("2026-05-02T00:00:00.000Z"));
    const activeAccountId = saveFile.user.activeAccountId;
    saveFile.user.accountsById[activeAccountId] = {
      ...saveFile.user.accountsById[activeAccountId],
      goals: {
        version: 3,
        profileName: (exampleGoals as { profileName?: string }).profileName,
        characterGoals: (exampleGoals as { characterGoals: Record<string, unknown> }).characterGoals as typeof saveFile.user.accountsById[typeof activeAccountId]["goals"]["characterGoals"],
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
    expect(importedAccount.inventory.Mora).toBe(1000);
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
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.settings.activeTab).toBe("dashboard");
    expect(migratedAccount.plannerSettings.weeklyBossDiscountClaimsUsed).toBe(0);
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
});
