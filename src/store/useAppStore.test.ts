import "fake-indexeddb/auto";
import exampleGood from "../../examples/good.minimal.example.json";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistenceAdapter } from "../adapters/persistence";
import { createBlankAccount, createDefaultMultiAccountUserState } from "../domain/account/types";
import { createDefaultSaveFile } from "../domain/save/types";
import { createStaticData } from "../domain/staticData/staticDataFactory";
import { selectActiveGoals, selectPlannerOutput } from "./selectors";
import { toSaveInfo } from "./persistenceHelpers";
import { useAppStore } from "./useAppStore";

const FIXED_DATE = new Date("2026-05-07T12:00:00.000Z");

function resetStore() {
  const saveFile = createDefaultSaveFile(FIXED_DATE);
  useAppStore.setState({
    staticData: createStaticData(),
    overridePack: null,
    user: structuredClone(saveFile.user),
    settings: structuredClone(saveFile.settings),
    today: "Monday",
    timeSensitiveAt: FIXED_DATE.toISOString(),
    importErrors: [],
    importWarnings: [],
    overrideText: "",
    saveInfo: toSaveInfo(saveFile),
    persistenceStatus: {
      status: "idle",
      lastSavedAt: saveFile.updatedAt,
      lastGoalBackupAtByAccount: {},
    },
    goalBackups: [],
    saveRecoveryPoints: [],
    isHydrated: true,
  });
}

function buildGoodWithMora(mora: number) {
  return JSON.stringify({
    ...exampleGood,
    materials: {
      ...exampleGood.materials,
      Mora: mora,
    },
  });
}

function buildGoodWithWeapons(weapons: Array<{
  key: string;
  level: number;
  ascension: number;
  refinement: number;
  location: string;
  lock: boolean;
}>) {
  return JSON.stringify({
    ...exampleGood,
    characters: [],
    weapons,
    materials: {
      Mora: 0,
    },
  });
}

describe("useAppStore multi-account support", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.spyOn(persistenceAdapter, "saveSaveFile").mockResolvedValue();
    resetStore();
  });

  it("creates one default account on a fresh install state", () => {
    const state = useAppStore.getState();

    expect(state.user.accountOrder).toHaveLength(1);
    expect(state.user.activeAccountId).toBe(state.user.accountOrder[0]);
    expect(state.user.accountsById[state.user.activeAccountId]?.name).toBe("Main Account");
    expect(state.user.accountsById[state.user.activeAccountId]?.checklist.weeklyBossClaims.usedCount).toBe(0);
  });

  it("creates, renames, duplicates, switches, and safely deletes accounts", async () => {
    const initialId = useAppStore.getState().user.activeAccountId;

    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });
    expect(useAppStore.getState().user.activeAccountId).toBe(altId);
    expect(useAppStore.getState().user.accountOrder).toHaveLength(2);

    await useAppStore.getState().renameAccount(altId, "Asia Account");
    expect(useAppStore.getState().user.accountsById[altId]?.name).toBe("Asia Account");

    await useAppStore.getState().switchAccount(initialId);
    expect(useAppStore.getState().user.activeAccountId).toBe(initialId);

    const duplicateId = await useAppStore.getState().duplicateAccount(initialId, "Main Copy");
    expect(duplicateId).not.toBe(initialId);
    expect(useAppStore.getState().user.accountsById[duplicateId]?.name).toBe("Main Copy");
    expect(useAppStore.getState().user.accountOrder).toHaveLength(3);

    await useAppStore.getState().deleteAccount(duplicateId);
    expect(useAppStore.getState().user.accountsById[duplicateId]).toBeUndefined();
    expect(useAppStore.getState().user.accountOrder).toHaveLength(2);

    await useAppStore.getState().deleteAccount(altId);
    await useAppStore.getState().deleteAccount(initialId);

    const finalState = useAppStore.getState();
    expect(finalState.user.accountOrder).toHaveLength(1);
    expect(finalState.user.accountsById[finalState.user.activeAccountId]).toBeDefined();
  });

  it("keeps GOOD imports scoped to the active account and can import as a new account", async () => {
    await useAppStore.getState().importGoodText(JSON.stringify(exampleGood), {
      fileName: "main-account.json",
      source: "file",
    });

    const mainAccountId = useAppStore.getState().user.activeAccountId;
    const mainAccount = useAppStore.getState().user.accountsById[mainAccountId];
    expect(mainAccount.characters.length).toBeGreaterThan(0);
    expect(mainAccount.importState.lastGoodFileName).toBe("main-account.json");

    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });
    expect(useAppStore.getState().user.accountsById[altId]?.characters).toHaveLength(0);

    await useAppStore.getState().importGoodText(buildGoodWithMora(777777), {
      fileName: "alt-account.json",
      source: "file",
    });

    const altAccount = useAppStore.getState().user.accountsById[altId];
    expect(altAccount.inventory.Mora).toBe(777777);
    expect(altAccount.importState.lastGoodFileName).toBe("alt-account.json");
    expect(useAppStore.getState().user.accountsById[mainAccountId]?.importState.lastGoodFileName).toBe("main-account.json");

    await useAppStore.getState().importGoodText(JSON.stringify(exampleGood), {
      asNewAccount: true,
      fileName: "Challenge Account.json",
      source: "file",
    });

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    expect(activeAccount.name).toBe("Challenge Account");
    expect(useAppStore.getState().user.accountOrder).toHaveLength(3);
  });

  it("preserves existing goals when re-importing GOOD into the active account", async () => {
    await useAppStore.getState().updateCharacterGoal("Furina", {
      characterKey: "Furina",
      targetLevel: 90,
      enabled: true,
    });

    await useAppStore.getState().importGoodText(JSON.stringify(exampleGood), {
      fileName: "main-account.json",
      source: "file",
    });

    const goals = selectActiveGoals(useAppStore.getState());
    expect(goals.characterGoals.Furina?.targetLevel).toBe(90);
  });

  it("promotes prefarm character goals to owned when the character appears in the latest GOOD import", async () => {
    await useAppStore.getState().updateCharacterGoal("Furina", {
      characterKey: "Furina",
      planningMode: "prefarm",
      targetLevel: 90,
      enabled: true,
      notes: "keep this goal",
    });

    expect(selectActiveGoals(useAppStore.getState()).characterGoals.Furina?.planningMode).toBe("prefarm");

    await useAppStore.getState().importGoodText(JSON.stringify(exampleGood), {
      fileName: "main-account.json",
      source: "file",
    });

    const goals = selectActiveGoals(useAppStore.getState());
    expect(goals.characterGoals.Furina?.planningMode).toBe("owned");
    expect(goals.characterGoals.Furina?.targetLevel).toBe(90);
    expect(goals.characterGoals.Furina?.notes).toBe("keep this goal");
  });

  it("auto-raises goal ascension to satisfy level and talent targets for characters and weapons", async () => {
    await useAppStore.getState().updateCharacterGoal("Furina", {
      characterKey: "Furina",
      targetLevel: 90,
      enabled: true,
    });

    let goals = selectActiveGoals(useAppStore.getState());
    expect(goals.characterGoals.Furina?.targetAscension).toBe(6);

    await useAppStore.getState().updateCharacterGoal("Bennett", {
      characterKey: "Bennett",
      talents: {
        burst: 9,
      },
      enabled: true,
    });

    goals = selectActiveGoals(useAppStore.getState());
    expect(goals.characterGoals.Bennett?.targetAscension).toBe(6);

    const weaponGoalId = await useAppStore.getState().createWeaponGoal({
      weaponKey: "CoolSteel",
      targetLevel: 80,
      enabled: true,
    });

    goals = selectActiveGoals(useAppStore.getState());
    expect(goals.weaponGoals[weaponGoalId]?.targetAscensionPhase).toBe(5);
  });

  it("pauses character and weapon goals without losing their saved progress tracking", async () => {
    await useAppStore.getState().updateCharacterGoal("Furina", {
      characterKey: "Furina",
      targetLevel: 90,
      enabled: true,
    });

    const weaponGoalId = await useAppStore.getState().createWeaponGoal({
      weaponKey: "CoolSteel",
      targetLevel: 40,
      targetAscensionPhase: 1,
      enabled: true,
      useOwnedInstance: false,
    });

    const activeAccountId = useAppStore.getState().user.activeAccountId;
    const beforePauseAccount = useAppStore.getState().user.accountsById[activeAccountId];
    const characterStartedAt = beforePauseAccount.goalProgressTracking["character:Furina"]?.startedAt;
    const weaponStartedAt = beforePauseAccount.goalProgressTracking[`weapon:${weaponGoalId}`]?.startedAt;

    expect(characterStartedAt).toBeDefined();
    expect(weaponStartedAt).toBeDefined();

    await useAppStore.getState().pauseCharacterGoal("Furina");
    await useAppStore.getState().pauseWeaponGoal(weaponGoalId, "CoolSteel");

    let goals = selectActiveGoals(useAppStore.getState());
    let planner = selectPlannerOutput(useAppStore.getState());
    let pausedAccount = useAppStore.getState().user.accountsById[activeAccountId];

    expect(goals.characterGoals.Furina?.paused).toBe(true);
    expect(goals.weaponGoals[weaponGoalId]?.paused).toBe(true);
    expect(planner.byCharacter.some((plan) => plan.characterKey === "Furina")).toBe(false);
    expect(planner.byWeapon.some((plan) => plan.goalKey === weaponGoalId)).toBe(false);
    expect(pausedAccount.goalProgressTracking["character:Furina"]?.startedAt).toBe(characterStartedAt);
    expect(pausedAccount.goalProgressTracking[`weapon:${weaponGoalId}`]?.startedAt).toBe(weaponStartedAt);

    await useAppStore.getState().resumeCharacterGoal("Furina");
    await useAppStore.getState().resumeWeaponGoal(weaponGoalId, "CoolSteel");

    goals = selectActiveGoals(useAppStore.getState());
    planner = selectPlannerOutput(useAppStore.getState());
    pausedAccount = useAppStore.getState().user.accountsById[activeAccountId];

    expect(goals.characterGoals.Furina?.paused).toBe(false);
    expect(goals.weaponGoals[weaponGoalId]?.paused).toBe(false);
    expect(planner.byCharacter.some((plan) => plan.characterKey === "Furina")).toBe(true);
    expect(planner.byWeapon.some((plan) => plan.goalKey === weaponGoalId)).toBe(true);
    expect(pausedAccount.goalProgressTracking["character:Furina"]?.startedAt).toBe(characterStartedAt);
    expect(pausedAccount.goalProgressTracking[`weapon:${weaponGoalId}`]?.startedAt).toBe(weaponStartedAt);
  });

  it("creates debounced goal backups for goal edits but not inventory-only edits", async () => {
    vi.useFakeTimers();
    const goalBackupSpy = vi.spyOn(persistenceAdapter, "createGoalBackup").mockResolvedValue({
      id: "goal-backup-1",
      kind: "goal_backup",
      accountId: useAppStore.getState().user.activeAccountId,
      createdAt: "2026-05-07T12:00:05.000Z",
      reason: "goal_edit",
      payload: {
        accountId: useAppStore.getState().user.activeAccountId,
        accountName: "Main Account",
        goals: useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId].goals,
        plannerSettings: useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId].plannerSettings,
      },
    });
    vi.spyOn(persistenceAdapter, "listGoalBackups").mockResolvedValue([]);
    vi.spyOn(persistenceAdapter, "listSaveRecoveryPoints").mockResolvedValue([]);

    await useAppStore.getState().updateCharacterGoal("Furina", {
      characterKey: "Furina",
      targetLevel: 90,
      enabled: true,
    });

    expect(goalBackupSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(goalBackupSpy).toHaveBeenCalledTimes(1);

    goalBackupSpy.mockClear();

    await useAppStore.getState().setActiveMaterialQuantity("Mora", 1234);
    await vi.advanceTimersByTimeAsync(5000);
    expect(goalBackupSpy).not.toHaveBeenCalled();
  });

  it("keeps checklist actions account-scoped and syncs weekly boss claims into planner state", async () => {
    const mainId = useAppStore.getState().user.activeAccountId;

    await useAppStore.getState().setChecklistResetTaskCompleted("dailyCommissions", true, "2026-06-02T12:00:00.000Z");
    await useAppStore.getState().setWeeklyBossClaimsUsed(2, "2026-06-02T12:00:00.000Z");

    let mainAccount = useAppStore.getState().user.accountsById[mainId];
    expect(mainAccount.checklist.dailyCommissions.completedAt).toBe("2026-06-02T12:00:00.000Z");
    expect(mainAccount.checklist.weeklyBossClaims.usedCount).toBe(2);
    expect(mainAccount.plannerSettings.weeklyBossDiscountClaimsUsed).toBe(2);
    expect(mainAccount.worldState.weeklyBossDiscountsUsed).toBe(2);

    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });
    let altAccount = useAppStore.getState().user.accountsById[altId];
    expect(altAccount.checklist.dailyCommissions.completedAt).toBeUndefined();
    expect(altAccount.checklist.weeklyBossClaims.usedCount).toBe(0);

    await useAppStore.getState().startChecklistCooldown("expeditions", "2026-06-02T12:30:00.000Z");
    altAccount = useAppStore.getState().user.accountsById[altId];
    expect(altAccount.checklist.expeditions.lastClaimedAt).toBe("2026-06-02T12:30:00.000Z");

    await useAppStore.getState().switchAccount(mainId);
    mainAccount = useAppStore.getState().user.accountsById[mainId];
    expect(mainAccount.checklist.dailyCommissions.completedAt).toBe("2026-06-02T12:00:00.000Z");
    expect(mainAccount.checklist.expeditions.lastClaimedAt).toBeUndefined();
  });

  it("reconciles stale weekly checklist boss claims during time-sensitive refresh", async () => {
    await useAppStore.getState().setWeeklyBossClaimsUsed(3, "2026-06-02T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));

    await useAppStore.getState().refreshTimeSensitiveState();

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    expect(activeAccount.checklist.weeklyBossClaims.usedCount).toBe(3);
    expect(activeAccount.plannerSettings.weeklyBossDiscountClaimsUsed).toBe(0);
    expect(activeAccount.worldState.weeklyBossDiscountsUsed).toBe(0);
  });

  it("keeps realm depot and realm currency state isolated per account", async () => {
    const mainId = useAppStore.getState().user.activeAccountId;
    await useAppStore.getState().setChecklistResetTaskCompleted("realmDepot", true, "2026-06-02T12:00:00.000Z");
    await useAppStore.getState().updateRealmCurrencySettings({ realmLevel: 8, trustRank: 9 });
    await useAppStore.getState().setRealmCurrencyClaimedNow("2026-06-02T12:00:00.000Z");

    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });
    let altAccount = useAppStore.getState().user.accountsById[altId];
    expect(altAccount.checklist.realmDepot.completedAt).toBeUndefined();
    expect(altAccount.checklist.realmCurrency.realmLevel).toBe(10);
    expect(altAccount.checklist.realmCurrency.trustRank).toBe(10);
    expect(altAccount.checklist.realmCurrency.lastClaimedAt).toBeUndefined();

    await useAppStore.getState().updateRealmCurrencySettings({ realmLevel: 6, trustRank: 7 });
    altAccount = useAppStore.getState().user.accountsById[altId];
    expect(altAccount.checklist.realmCurrency.realmLevel).toBe(6);
    expect(altAccount.checklist.realmCurrency.trustRank).toBe(7);

    await useAppStore.getState().switchAccount(mainId);
    const mainAccount = useAppStore.getState().user.accountsById[mainId];
    expect(mainAccount.checklist.realmDepot.completedAt).toBe("2026-06-02T12:00:00.000Z");
    expect(mainAccount.checklist.realmCurrency.realmLevel).toBe(8);
    expect(mainAccount.checklist.realmCurrency.trustRank).toBe(9);
    expect(mainAccount.checklist.realmCurrency.lastClaimedAt).toBe("2026-06-02T12:00:00.000Z");
  });

  it("creates a full recovery point before replacing the active account with a GOOD import", async () => {
    const recoverySpy = vi.spyOn(persistenceAdapter, "createSaveRecoveryPoint").mockResolvedValue({
      id: "recovery-1",
      kind: "save_recovery_point",
      accountId: useAppStore.getState().user.activeAccountId,
      createdAt: "2026-05-07T12:00:01.000Z",
      reason: "good_import_preflight",
      payload: {
        saveFile: createDefaultSaveFile(FIXED_DATE),
      },
    });
    vi.spyOn(persistenceAdapter, "listGoalBackups").mockResolvedValue([]);
    vi.spyOn(persistenceAdapter, "listSaveRecoveryPoints").mockResolvedValue([]);

    await useAppStore.getState().importGoodText(JSON.stringify(exampleGood), {
      fileName: "active.json",
      source: "file",
    });

    expect(recoverySpy).toHaveBeenCalledWith(expect.any(Object), "good_import_preflight", expect.any(String));
  });

  it("restores a goal backup without touching inventory", async () => {
    const activeAccountId = useAppStore.getState().user.activeAccountId;
    await useAppStore.getState().setActiveMaterialQuantity("Mora", 3210);

    vi.spyOn(persistenceAdapter, "restoreGoalBackup").mockResolvedValue({
      accountId: activeAccountId,
      accountName: "Main Account",
      goals: {
        ...useAppStore.getState().user.accountsById[activeAccountId].goals,
        characterGoals: {
          Furina: {
            characterKey: "Furina",
            enabled: true,
            priority: 3,
            planningMode: "owned",
            targetLevel: 90,
            targetAscension: 6,
            talents: {},
          },
        },
      },
      plannerSettings: useAppStore.getState().user.accountsById[activeAccountId].plannerSettings,
    });
    vi.spyOn(persistenceAdapter, "createSaveRecoveryPoint").mockResolvedValue({
      id: "recovery-restore",
      kind: "save_recovery_point",
      accountId: activeAccountId,
      createdAt: "2026-05-07T12:00:01.000Z",
      reason: "pre_restore",
      payload: {
        saveFile: createDefaultSaveFile(FIXED_DATE),
      },
    });
    vi.spyOn(persistenceAdapter, "listGoalBackups").mockResolvedValue([]);
    vi.spyOn(persistenceAdapter, "listSaveRecoveryPoints").mockResolvedValue([]);

    await useAppStore.getState().restoreGoalBackup("backup-1");

    const activeAccount = useAppStore.getState().user.accountsById[activeAccountId];
    expect(activeAccount.inventory.Mora).toBe(3210);
    expect(activeAccount.goals.characterGoals.Furina?.targetLevel).toBe(90);
  });

  it("restores a full save recovery point", async () => {
    const restoredSave = createDefaultSaveFile(new Date("2026-05-09T00:00:00.000Z"));
    const altId = crypto.randomUUID();
    const altAccount = createBlankAccount({ id: altId, name: "Restored Alt", now: new Date("2026-05-09T00:00:00.000Z") });
    restoredSave.user.accountsById[altId] = altAccount;
    restoredSave.user.accountOrder = [restoredSave.user.activeAccountId, altId];
    restoredSave.user.activeAccountId = altId;

    vi.spyOn(persistenceAdapter, "restoreSaveRecoveryPoint").mockResolvedValue(restoredSave);
    vi.spyOn(persistenceAdapter, "createSaveRecoveryPoint").mockResolvedValue({
      id: "recovery-pre-restore",
      kind: "save_recovery_point",
      accountId: useAppStore.getState().user.activeAccountId,
      createdAt: "2026-05-07T12:00:01.000Z",
      reason: "pre_restore",
      payload: {
        saveFile: createDefaultSaveFile(FIXED_DATE),
      },
    });
    vi.spyOn(persistenceAdapter, "listGoalBackups").mockResolvedValue([]);
    vi.spyOn(persistenceAdapter, "listSaveRecoveryPoints").mockResolvedValue([]);

    await useAppStore.getState().restoreSaveRecoveryPoint("recovery-1");

    expect(useAppStore.getState().user.activeAccountId).toBe(altId);
    expect(useAppStore.getState().user.accountsById[altId]?.name).toBe("Restored Alt");
  });

  it("supports direct and bulk material quantity edits without leaking across accounts", async () => {
    await useAppStore.getState().updateCharacterGoal("Mavuika", {
      characterKey: "Mavuika",
      planningMode: "prefarm",
      targetLevel: 90,
      enabled: true,
    });

    const plannerBefore = selectPlannerOutput(useAppStore.getState());
    const moraBefore = plannerBefore.totalMissingByMaterial.find((row) => row.materialKey === "Mora")?.effectiveDeficit ?? 0;

    await useAppStore.getState().setActiveMaterialQuantity("Mora", 5000000);

    const plannerAfterDirectEdit = selectPlannerOutput(useAppStore.getState());
    const moraAfterDirectEdit =
      plannerAfterDirectEdit.totalMissingByMaterial.find((row) => row.materialKey === "Mora")?.effectiveDeficit ?? 0;

    expect(moraAfterDirectEdit).toBeLessThan(moraBefore);
    expect(useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId]?.materialEditState.Mora?.source).toBe(
      "manual",
    );

    await useAppStore.getState().incrementActiveMaterialQuantity("Mora", 250000);
    expect(useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId]?.inventory.Mora).toBe(5250000);

    const mainId = useAppStore.getState().user.activeAccountId;
    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });
    await useAppStore.getState().bulkSetActiveMaterialQuantities(
      {
        Mora: 42,
        HerosWit: 8,
      },
      { source: "bulk" },
    );

    expect(useAppStore.getState().user.accountsById[altId]?.inventory.Mora).toBe(42);
    expect(useAppStore.getState().user.accountsById[altId]?.materialEditState.Mora?.source).toBe("bulk");
    expect(useAppStore.getState().user.accountsById[mainId]?.inventory.Mora).toBe(5250000);

    await useAppStore.getState().switchAccount(mainId);
    const plannerAfterSwitch = selectPlannerOutput(useAppStore.getState());
    const mainMoraAfterSwitch =
      plannerAfterSwitch.totalMissingByMaterial.find((row) => row.materialKey === "Mora")?.effectiveDeficit ?? 0;
    expect(useAppStore.getState().user.accountsById[mainId]?.inventory.Mora).toBe(5250000);
    expect(mainMoraAfterSwitch).toBeLessThanOrEqual(moraAfterDirectEdit);
  });

  it("rejects invalid material quantity edits and accepts large integers", async () => {
    await useAppStore.getState().setActiveMaterialQuantity("Mora", 10);
    await useAppStore.getState().setActiveMaterialQuantity("Mora", -1);
    await useAppStore.getState().setActiveMaterialQuantity("Mora", 12.5);

    expect(useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId]?.inventory.Mora).toBe(10);

    await useAppStore.getState().setActiveMaterialQuantity("Mora", 999999999);
    expect(useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId]?.inventory.Mora).toBe(
      999999999,
    );

    await useAppStore.getState().clearActiveMaterialQuantity("Mora");
    expect(useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId]?.inventory.Mora).toBeUndefined();
  });

  it("resets a manual material override back to the imported baseline", async () => {
    await useAppStore.getState().importGoodText(buildGoodWithMora(2500), {
      fileName: "baseline.json",
      source: "file",
    });

    await useAppStore.getState().setActiveMaterialQuantity("Mora", 4000);
    expect(useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId]?.inventory.Mora).toBe(4000);

    await useAppStore.getState().resetActiveMaterialToImported("Mora");

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    expect(activeAccount?.inventory.Mora).toBe(2500);
    expect(activeAccount?.importedInventory.Mora).toBe(2500);
    expect(activeAccount?.materialEditState.Mora).toBeUndefined();
  });

  it("replaces conflicting manual quantities on GOOD import and records recent import history", async () => {
    await useAppStore.getState().importGoodText(buildGoodWithMora(1000), {
      fileName: "first.json",
      source: "file",
    });
    await useAppStore.getState().setActiveMaterialQuantity("Mora", 5000);

    await useAppStore.getState().importGoodText(buildGoodWithMora(1800), {
      fileName: "second.json",
      source: "file",
    });

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    expect(activeAccount?.inventory.Mora).toBe(1800);
    expect(activeAccount?.importedInventory.Mora).toBe(1800);
    expect(activeAccount?.materialEditState.Mora).toBeUndefined();
    expect(activeAccount?.recentImports[0]?.fileName).toBe("second.json");
    expect(activeAccount?.recentImports[0]?.changedMaterialCount).toBeGreaterThan(0);
    expect(activeAccount?.recentChanges.some((entry) => entry.kind === "inventory" && entry.materialKey === "Mora")).toBe(true);
  });

  it("keeps goals account-scoped and planner output tied to the active account inventory and world state", async () => {
    await useAppStore.getState().importGoodText(buildGoodWithMora(0), {
      fileName: "main-account.json",
      source: "file",
    });
    await useAppStore.getState().updateCharacterGoal("Furina", {
      characterKey: "Furina",
      targetLevel: 90,
      enabled: true,
    });
    await useAppStore.getState().updatePlannerSettings({ worldLevel: 0 });

    const mainId = useAppStore.getState().user.activeAccountId;

    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });
    await useAppStore.getState().importGoodText(buildGoodWithMora(99999999), {
      fileName: "alt-account.json",
      source: "file",
    });
    await useAppStore.getState().updatePlannerSettings({ worldLevel: 8 });

    const altGoals = selectActiveGoals(useAppStore.getState());
    expect(Object.keys(altGoals.characterGoals)).toHaveLength(0);

    await useAppStore.getState().updateCharacterGoal("Furina", {
      characterKey: "Furina",
      targetLevel: 90,
      enabled: true,
    });

    const plannerAlt = selectPlannerOutput(useAppStore.getState());
    const altMora = plannerAlt.farmingEstimates.find((estimate) => estimate.materialKey === "Mora");

    await useAppStore.getState().switchAccount(mainId);

    const plannerMain = selectPlannerOutput(useAppStore.getState());
    const mainGoals = selectActiveGoals(useAppStore.getState());
    const mainMora = plannerMain.farmingEstimates.find((estimate) => estimate.materialKey === "Mora");

    expect(mainGoals.characterGoals.Furina?.targetLevel).toBe(90);
    expect(mainMora?.missingAmount).not.toBe(altMora?.missingAmount);
    expect(mainMora?.estimatedRuns).not.toBe(altMora?.estimatedRuns);
    expect(useAppStore.getState().user.accountsById[altId]?.worldState.worldLevel).toBe(8);
    expect(useAppStore.getState().user.accountsById[mainId]?.worldState.worldLevel).toBe(0);
  });

  it("exports and imports a single account with a regenerated id and collision-safe name", async () => {
    await useAppStore.getState().renameAccount(useAppStore.getState().user.activeAccountId, "Main Account");
    await useAppStore.getState().importGoodText(JSON.stringify(exampleGood), {
      fileName: "main-account.json",
      source: "file",
    });

    const originalId = useAppStore.getState().user.activeAccountId;
    const exported = await useAppStore.getState().exportAccount(originalId);
    const importedId = await useAppStore.getState().importAccount(exported);

    const importedAccount = useAppStore.getState().user.accountsById[importedId];
    expect(importedId).not.toBe(originalId);
    expect(importedAccount.name).toBe("Main Account copy");
    expect(importedAccount.characters.length).toBeGreaterThan(0);
  });

  it("keeps prefarm goals scoped to their own account", async () => {
    await useAppStore.getState().updateCharacterGoal("Mavuika", {
      characterKey: "Mavuika",
      planningMode: "prefarm",
      targetLevel: 90,
      enabled: true,
    });

    const mainId = useAppStore.getState().user.activeAccountId;
    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });

    expect(selectActiveGoals(useAppStore.getState()).characterGoals.Mavuika).toBeUndefined();

    await useAppStore.getState().switchAccount(mainId);
    expect(useAppStore.getState().user.accountsById[mainId]?.goals.characterGoals.Mavuika?.planningMode).toBe("prefarm");
    expect(useAppStore.getState().user.accountsById[altId]?.goals.characterGoals.Mavuika).toBeUndefined();
  });

  it("applies bulk goal presets without changing notes or ownership", async () => {
    await useAppStore.getState().updateCharacterGoal("Furina", {
      characterKey: "Furina",
      enabled: true,
      notes: "keep me",
      priority: 5,
      targetLevel: 80,
    });
    await useAppStore.getState().updateCharacterGoal("Bennett", {
      characterKey: "Bennett",
      enabled: true,
      notes: "keep me too",
      priority: 4,
      talents: { auto: 1, skill: 6, burst: 6 },
    });
    await useAppStore.getState().bulkUpdateCharacterGoals(["Furina", "Bennett"], {
      talents: { auto: 9, skill: 9, burst: 9 },
    });

    const activeGoals = selectActiveGoals(useAppStore.getState());
    expect(activeGoals.characterGoals.Furina.notes).toBe("keep me");
    expect(activeGoals.characterGoals.Bennett.priority).toBe(4);
    expect(activeGoals.characterGoals.Furina.talents).toEqual({ auto: 9, skill: 9, burst: 9 });

    await useAppStore.getState().importGoodText(JSON.stringify(exampleGood), {
      fileName: "main-account.json",
      source: "file",
    });
    const ownedWeapon = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId]?.weapons[0];
    expect(ownedWeapon).toBeDefined();

    if (!ownedWeapon) {
      return;
    }

    await useAppStore.getState().updateWeaponGoal(ownedWeapon.weaponInstanceId, ownedWeapon.weaponKey, {
      linkedInventoryInstanceId: ownedWeapon.weaponInstanceId,
      useOwnedInstance: true,
      enabled: true,
      notes: "weapon note",
      priority: 2,
      targetLevel: 80,
    });
    await useAppStore.getState().bulkUpdateWeaponGoals([ownedWeapon.weaponInstanceId], {
      targetLevel: 90,
      targetAscension: 6,
    });

    const weaponGoal = selectActiveGoals(useAppStore.getState()).weaponGoals[ownedWeapon.weaponInstanceId];
    expect(weaponGoal.notes).toBe("weapon note");
    expect(weaponGoal.priority).toBe(2);
    expect(weaponGoal.targetLevel).toBe(90);
    expect(weaponGoal.linkedInventoryInstanceId).toBe(ownedWeapon.weaponInstanceId);
  });

  it("updates planner weapon costs when a linked owned weapon is upgraded to its target", async () => {
    await useAppStore.getState().importGoodText(
      buildGoodWithWeapons([
        {
          key: "FavoniusSword",
          level: 80,
          ascension: 5,
          refinement: 5,
          location: "Furina",
          lock: true,
        },
      ]),
      {
        fileName: "weapons.json",
        source: "file",
      },
    );

    const ownedWeapon = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId]?.weapons[0];
    expect(ownedWeapon).toBeDefined();
    if (!ownedWeapon) {
      return;
    }

    const goalId = await useAppStore.getState().createWeaponGoal({
      weaponKey: ownedWeapon.weaponKey,
      linkedInventoryInstanceId: ownedWeapon.weaponInstanceId,
      useOwnedInstance: true,
      targetLevel: 90,
      targetAscensionPhase: 6,
    });

    const plannerBeforeUpgrade = selectPlannerOutput(useAppStore.getState());
    const planBeforeUpgrade = plannerBeforeUpgrade.byWeapon.find((plan) => plan.goalKey === goalId);
    expect(planBeforeUpgrade?.missingByMaterial.Mora).toBeGreaterThan(0);

    await useAppStore.getState().importGoodText(
      buildGoodWithWeapons([
        {
          key: "FavoniusSword",
          level: 90,
          ascension: 6,
          refinement: 5,
          location: "Furina",
          lock: true,
        },
      ]),
      {
        fileName: "weapons-upgraded.json",
        source: "file",
      },
    );

    const plannerAfterUpgrade = selectPlannerOutput(useAppStore.getState());
    const planAfterUpgrade = plannerAfterUpgrade.byWeapon.find((plan) => plan.goalKey === goalId);
    expect(planAfterUpgrade).toBeDefined();
    expect(planAfterUpgrade?.breakdown).toHaveLength(0);
    expect(planAfterUpgrade?.missingSummary).toHaveLength(0);
    expect(planAfterUpgrade?.estimatedResin).toBe(0);
  });

  it("relinks duplicate owned weapon goals to the upgraded copy when GOOD instance ids reshuffle", async () => {
    await useAppStore.getState().importGoodText(
      buildGoodWithWeapons([
        {
          key: "FavoniusSword",
          level: 1,
          ascension: 0,
          refinement: 1,
          location: "",
          lock: false,
        },
        {
          key: "FavoniusSword",
          level: 80,
          ascension: 5,
          refinement: 5,
          location: "",
          lock: false,
        },
      ]),
      {
        fileName: "duplicate-weapons.json",
        source: "file",
      },
    );

    const initialWeapons = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId]?.weapons ?? [];
    const trackedWeapon = initialWeapons.find((weapon) => weapon.currentLevel === 80);
    expect(trackedWeapon).toBeDefined();
    if (!trackedWeapon) {
      return;
    }

    const goalId = await useAppStore.getState().createWeaponGoal({
      weaponKey: trackedWeapon.weaponKey,
      linkedInventoryInstanceId: trackedWeapon.weaponInstanceId,
      useOwnedInstance: true,
      targetLevel: 90,
      targetAscensionPhase: 6,
    });

    const plannerBeforeUpgrade = selectPlannerOutput(useAppStore.getState());
    expect(plannerBeforeUpgrade.byWeapon.find((plan) => plan.goalKey === goalId)?.missingByMaterial.Mora).toBeGreaterThan(0);

    await useAppStore.getState().importGoodText(
      buildGoodWithWeapons([
        {
          key: "FavoniusSword",
          level: 90,
          ascension: 6,
          refinement: 5,
          location: "",
          lock: false,
        },
        {
          key: "FavoniusSword",
          level: 1,
          ascension: 0,
          refinement: 1,
          location: "",
          lock: false,
        },
      ]),
      {
        fileName: "duplicate-weapons-upgraded.json",
        source: "file",
      },
    );

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    const upgradedWeapon = activeAccount?.weapons.find((weapon) => weapon.currentLevel === 90 && weapon.currentAscension === 6);
    const migratedGoal = selectActiveGoals(useAppStore.getState()).weaponGoals[goalId];
    expect(upgradedWeapon).toBeDefined();
    expect(migratedGoal?.linkStatus).toBe("linked");
    expect(migratedGoal?.linkedInventoryInstanceId).toBe(upgradedWeapon?.weaponInstanceId);

    const plannerAfterUpgrade = selectPlannerOutput(useAppStore.getState());
    const planAfterUpgrade = plannerAfterUpgrade.byWeapon.find((plan) => plan.goalKey === goalId);
    expect(planAfterUpgrade?.breakdown).toHaveLength(0);
    expect(planAfterUpgrade?.estimatedResin).toBe(0);
  });

  it("recovers safely if a malformed user state is loaded into the store", () => {
    const fallbackUser = createDefaultMultiAccountUserState(FIXED_DATE, "Recovered Account");
    const orphanAccount = createBlankAccount({
      id: fallbackUser.accountOrder[0],
      name: "Recovered Account",
      now: FIXED_DATE,
    });

    useAppStore.setState({
      user: {
        schemaVersion: 1,
        activeAccountId: "missing-account",
        accountOrder: [orphanAccount.id],
        accountsById: {
          [orphanAccount.id]: orphanAccount,
        },
      },
    });

    expect(useAppStore.getState().user.activeAccountId).toBe("missing-account");
    expect(selectActiveGoals(useAppStore.getState()).artifactGoals).toEqual([]);
    expect(selectPlannerOutput(useAppStore.getState()).plannerGoals).toBeDefined();
  });

  it("refreshes the planner day using the 2:00 AM Pacific reset instead of midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T08:30:00.000Z"));
    useAppStore.getState().refreshToday();
    expect(useAppStore.getState().today).toBe("Friday");

    vi.setSystemTime(new Date("2026-05-09T09:30:00.000Z"));
    useAppStore.getState().refreshToday();
    expect(useAppStore.getState().today).toBe("Saturday");
  });
});
