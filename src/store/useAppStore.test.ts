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
    importErrors: [],
    importWarnings: [],
    overrideText: "",
    saveInfo: toSaveInfo(saveFile),
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
