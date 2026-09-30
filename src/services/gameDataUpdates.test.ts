import { hypotheticalPatchDataset } from "../test/fixtures/farmingDataset";
import { parseAnimeGameData2 } from "../adapters/animeGameData2";
import { buildFarmingOverride, farmingConfigurationFor } from "../domain/staticData/farmingConfiguration";
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGameDataUpdateActions } from "./gameDataUpdates";
import { persistenceAdapter } from "../adapters/persistence";
import { newLivePatch } from "../test/fixtures/newLivePatch";
import { createDefaultSaveFile } from "../domain/save/types";
import { loadStaticData } from "../domain/staticData/loadStaticData";
import { useAppStore, type AppState } from "../store/useAppStore";
import type { GameDataProvider } from "../domain/staticData/upstreamTypes";
import { GameDataProviderError } from "../domain/staticData/upstreamTypes";
import { importGoodAccountFromText } from "../adapters/goodImport";
import { mergeGoodDiscoveries, resolvePreservedAccounts } from "../domain/staticData/goodDiscoveries";
import { reconcileGameData } from "../domain/staticData/reconcileGameData";

const now = new Date("2026-09-28T12:00:00Z");
const good = JSON.stringify({ format: "GOOD", version: 1, characters: [{ key: "NewCharacter", level: 1, ascension: 0, constellation: 0, talent: { auto: 1, skill: 1, burst: 1 } }], weapons: [{ id: 1234, key: "NewSword", level: 1, ascension: 0, refinement: 1, lock: true }], materials: { NewFlower: 7 } });
function harness(clock = () => now) {
  const save = createDefaultSaveFile(now);
  let state: AppState = { ...useAppStore.getState(), ...save, staticData: loadStaticData(), gameDataUpdates: structuredClone(save.gameDataUpdates) };
  const provider: GameDataProvider = { id: "fixture", checkForUpdate: vi.fn().mockResolvedValue({ revision: newLivePatch().revision }), fetchLiveData: vi.fn().mockResolvedValue(newLivePatch()) };
  const set = (patch: Partial<AppState>) => { state = { ...state, ...patch }; };
  const actions = createGameDataUpdateActions(() => state, set, provider, clock);
  return { get: () => state, set, provider, actions };
}
beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(persistenceAdapter, "saveSaveFile").mockResolvedValue(); });
describe("game data orchestration and GOOD recovery", () => {
  it("reprocesses an unchanged upstream revision when extractor capability advances", async () => {
    const h = harness();
    await h.actions.checkGameDataUpdates();
    Object.assign(h.provider, { extractorVersion: 2 });
    vi.mocked(h.provider.fetchLiveData).mockResolvedValue({ ...newLivePatch(), extractorVersion: 2 });
    await h.actions.checkGameDataUpdates();
    expect(h.provider.fetchLiveData).toHaveBeenCalledTimes(2);
    expect(h.get().gameDataUpdates.appliedExtractorVersion).toBe(2);
    await h.actions.checkGameDataUpdates();
    expect(h.provider.fetchLiveData).toHaveBeenCalledTimes(2);
    Object.assign(h.provider, { extractorVersion: 3 });
    vi.mocked(h.provider.fetchLiveData).mockResolvedValue({ ...newLivePatch(), extractorVersion: 3 });
    await h.actions.checkGameDataUpdates();
    expect(h.get().gameDataUpdates.appliedExtractorVersion).toBe(3);
    await h.actions.checkGameDataUpdates();
    expect(h.provider.fetchLiveData).toHaveBeenCalledTimes(3);
  });
  it("retains successful update statistics through unchanged and failed checks", async () => {
    const h = harness();
    await h.actions.checkGameDataUpdates();
    const successful = structuredClone(h.get().gameDataUpdates.lastSuccessfulAttempt);
    expect(successful?.result).toBe("updated");
    expect(successful?.persistenceMs).toBeGreaterThanOrEqual(0);
    await h.actions.checkGameDataUpdates();
    expect(h.get().gameDataUpdates.lastAttempt?.result).toBe("current");
    expect(h.get().gameDataUpdates.lastSuccessfulAttempt).toEqual(successful);
    vi.mocked(h.provider.checkForUpdate).mockRejectedValue(new Error("Offline"));
    await h.actions.checkGameDataUpdates();
    expect(h.get().gameDataUpdates.lastAttempt?.result).toBe("failed");
    expect(h.get().gameDataUpdates.lastSuccessfulAttempt).toEqual(successful);
    const persisted = vi.mocked(persistenceAdapter.saveSaveFile).mock.calls.at(-1)![0];
    expect(persisted.gameDataUpdates.lastSuccessfulAttempt).toEqual(successful);
  });
  it("queues one throttled GOOD retry and cancels queued work on teardown", async () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    const h = harness(() => new Date());
    try {
      await h.actions.checkGameDataUpdates();
      await h.actions.checkGameDataUpdates("good"); await h.actions.checkGameDataUpdates("good");
      expect(h.provider.checkForUpdate).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(60000);
      expect(h.provider.checkForUpdate).toHaveBeenCalledTimes(2);
      await h.actions.checkGameDataUpdates("good"); h.actions.cancelGameDataUpdate();
      await vi.advanceTimersByTimeAsync(60000);
      expect(h.provider.checkForUpdate).toHaveBeenCalledTimes(2);
    } finally { h.actions.cancelGameDataUpdate(); vi.useRealTimers(); }
  });
  it("persists explicit conflict decisions and validates upstream adoption", async () => {
    const h = harness(); const result = parseAnimeGameData2(hypotheticalPatchDataset(), now);
    const first = reconcileGameData(h.get().staticData, null, result, {});
    const manual = buildFarmingOverride(first.staticData, first.overridePack, { ...farmingConfigurationFor(first.staticData, "BrowserTeachings"), resinCost: 25 });
    const conflicting = reconcileGameData(loadStaticData(manual), manual, result, {});
    h.set({ overridePack: conflicting.overridePack, staticData: conflicting.staticData });
    const id = Object.keys(conflicting.overridePack.farmingConflicts!)[0];
    await h.actions.resolveFarmingConflict(id, false);
    expect(h.get().overridePack?.farmingConflicts?.[id].status).toBe("kept_manual");
    expect(h.get().staticData.materialSources.BrowserTeachings[0].resinCost).toBe(25);
    vi.mocked(persistenceAdapter.saveSaveFile).mockRejectedValueOnce(new Error("Storage full"));
    await expect(h.actions.resolveFarmingConflict(id, true)).rejects.toThrow("Storage full");
    expect(h.get().staticData.materialSources.BrowserTeachings[0].resinCost).toBe(25);
    await h.actions.resolveFarmingConflict(id, true);
    expect(h.get().staticData.materialSources.BrowserTeachings[0].resinCost).toBe(20);
    expect(h.get().overridePack?.farmingConflicts?.[id].status).toBe("accepted");
  });
  it("serializes activation with an inventory edit already waiting on the database write", async () => {
    const save = createDefaultSaveFile(now);
    const id = save.user.activeAccountId;
    save.user.accountsById[id].inventory = { NewFlower: 7 };
    save.user.accountsById[id].importedInventory = { NewFlower: 7 };
    useAppStore.setState({ ...save, staticData: loadStaticData() });
    const h = harness();
    const actions = createGameDataUpdateActions(useAppStore.getState, useAppStore.setState, h.provider, () => now);
    let release!: () => void;
    let blocked = false;
    vi.mocked(persistenceAdapter.saveSaveFile).mockImplementation(async candidate => {
      if (candidate.overridePack?.characters?.NewCharacter && !blocked) { blocked = true; await new Promise<void>(resolve => { release = resolve; }); }
    });
    const updating = actions.checkGameDataUpdates();
    await vi.waitFor(() => expect(release).toBeDefined());
    const edit = useAppStore.getState().setActiveMaterialQuantity("NewFlower", 99);
    release(); await Promise.all([updating, edit]);
    const state = useAppStore.getState();
    expect(state.user.accountsById[id].inventory.NewFlower).toBe(99);
    expect(state.user.accountsById[id].importedInventory.NewFlower).toBe(7);
    expect(state.gameDataUpdates.appliedRevision).toBe(newLivePatch().revision);
    const persisted = vi.mocked(persistenceAdapter.saveSaveFile).mock.calls.at(-1)![0];
    expect(persisted.user.accountsById[id].inventory.NewFlower).toBe(99);
    expect(persisted.overridePack?.characters?.NewCharacter.gameId).toBe(90000001);
    expect(persisted.gameDataUpdates.appliedRevision).toBe(newLivePatch().revision);
    await state.clearOverridePack();
    expect(useAppStore.getState().gameDataUpdates.appliedRevision).toBeUndefined();
    expect(useAppStore.getState().overridePack).toBeNull();
  });
  it("respects upstream retry windows even when a manual retry is requested", async () => {
    const h = harness();
    vi.mocked(h.provider.checkForUpdate).mockRejectedValue(new GameDataProviderError("Rate limited", 120000));
    await h.actions.checkGameDataUpdates(); await h.actions.checkGameDataUpdates();
    expect(h.provider.checkForUpdate).toHaveBeenCalledTimes(1);
    expect(h.get().gameDataUpdates.retryAfter).toBe("2026-09-28T12:02:00.000Z");
  });
  it("cancels downloaded results before activation and allows manual retry", async () => {
    const h = harness(); let finish!: (value: ReturnType<typeof newLivePatch>) => void;
    vi.mocked(h.provider.fetchLiveData).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const updating = h.actions.checkGameDataUpdates();
    await vi.waitFor(() => expect(finish).toBeDefined());
    h.actions.cancelGameDataUpdate(); finish(newLivePatch()); await updating;
    expect(h.get().gameDataUpdates.status).toBe("failed"); expect(h.get().overridePack).toBeNull();
    vi.mocked(h.provider.fetchLiveData).mockResolvedValue(newLivePatch());
    await h.actions.checkGameDataUpdates(); expect(h.get().gameDataUpdates.status).toBe("updated");
  });
  it("automatically commits validated updates and avoids downloads for unchanged revisions", async () => {
    const h = harness(); await h.actions.checkGameDataUpdates();
    expect(h.get().staticData.characters.NewCharacter.gameId).toBe(90000001);
    expect(h.get().gameDataUpdates.status).toBe("updated");
    await h.actions.checkGameDataUpdates();
    expect(h.provider.fetchLiveData).toHaveBeenCalledTimes(1);
    expect(h.get().gameDataUpdates.status).toBe("current");
    await h.actions.checkGameDataUpdates("startup");
    expect(h.provider.checkForUpdate).toHaveBeenCalledTimes(2);
  });
  it("deduplicates simultaneous checks", async () => {
    const h = harness(); await Promise.all([h.actions.checkGameDataUpdates(), h.actions.checkGameDataUpdates("good")]);
    expect(h.provider.fetchLiveData).toHaveBeenCalledTimes(1);
  });
  it("preserves imported account data and discoveries when upstream fails", async () => {
    const h = harness(); const id = h.get().user.activeAccountId;
    const imported = importGoodAccountFromText(good, h.get().staticData).account!;
    h.set({ user: { ...h.get().user, accountsById: { ...h.get().user.accountsById, [id]: { ...h.get().user.accountsById[id], ...imported, unmatchedWeapons: imported.unmatchedWeapons ?? [], importedInventory: imported.inventory } } } });
    vi.mocked(h.provider.checkForUpdate).mockRejectedValue(new Error("Offline"));
    await h.actions.recordGoodDiscoveries(id); await h.actions.checkGameDataUpdates();
    expect(h.get().gameDataUpdates.status).toBe("failed");
    expect(Object.values(h.get().gameDataUpdates.discoveries)).toHaveLength(3);
    expect(h.get().user.accountsById[id].inventory.NewFlower).toBe(7);
    expect(h.get().user.accountsById[id].unmatchedWeapons[0].weaponInstanceId).toBe(imported.unmatchedWeapons![0].weaponInstanceId);
    expect(h.get().overridePack).toBeNull();
  });
  it("preserves edits made while downloading and resolves current snapshots", async () => {
    const h = harness(); let finish!: (value: ReturnType<typeof newLivePatch>) => void;
    vi.mocked(h.provider.fetchLiveData).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const checking = h.actions.checkGameDataUpdates();
    await vi.waitFor(() => expect(finish).toBeDefined());
    const id = h.get().user.activeAccountId;
    const current = h.get().user.accountsById[id];
    h.set({ user: { ...h.get().user, accountsById: { ...h.get().user.accountsById, [id]: { ...current, inventory: { NewFlower: 99 }, importedInventory: { NewFlower: 7 } } } } });
    finish(newLivePatch()); await checking;
    expect(h.get().user.accountsById[id].inventory.NewFlower).toBe(99);
    expect(h.get().user.accountsById[id].importedInventory.NewFlower).toBe(7);
  });
  it("never publishes a candidate if persistence or integrity validation fails", async () => {
    const h = harness(); const previous = h.get().staticData;
    vi.mocked(persistenceAdapter.saveSaveFile).mockImplementation(async save => { if (save.overridePack?.characters?.NewCharacter) throw new Error("Storage full"); });
    await h.actions.checkGameDataUpdates();
    expect(h.get().staticData).toBe(previous); expect(h.get().gameDataUpdates.appliedRevision).toBeUndefined();
    vi.mocked(persistenceAdapter.saveSaveFile).mockResolvedValue();
    const invalid = newLivePatch(); invalid.observations.find(row => row.entityType === "character")!.characterRequirements!.ascension["1"].costs["202"] = -1;
    vi.mocked(h.provider.fetchLiveData).mockResolvedValue(invalid);
    await h.actions.checkGameDataUpdates(); expect(h.get().staticData).toBe(previous);
  });
  it("keeps unknown GOOD data, deduplicates discoveries, and resolves weapon instances", () => {
    const data = loadStaticData(); const imported = importGoodAccountFromText(good, data).account!;
    expect(imported.characters[0].characterId).toBe("NewCharacter"); expect(imported.inventory.NewFlower).toBe(7);
    expect(imported.unmatchedWeapons).toHaveLength(1);
    const discoveries = mergeGoodDiscoveries({}, imported, "one", data, now.toISOString());
    expect(Object.values(mergeGoodDiscoveries(discoveries, imported, "two", data, now.toISOString()))).toHaveLength(3);
    const result = reconcileGameData(data, null, newLivePatch(), discoveries);
    expect(Object.values(result.discoveries).every(row => row.status === "resolved")).toBe(true);
    const save = createDefaultSaveFile(now); const id = save.user.activeAccountId;
    save.user.accountsById[id] = { ...save.user.accountsById[id], ...imported, unmatchedWeapons: imported.unmatchedWeapons ?? [], importedInventory: imported.inventory };
    const resolved = resolvePreservedAccounts(save.user, result.staticData).accountsById[id];
    expect(resolved.unmatchedWeapons).toHaveLength(0);
    expect(resolved.weapons[0]).toMatchObject({ weaponKey: "NewSword", weaponInstanceId: imported.unmatchedWeapons![0].weaponInstanceId, lock: true });
  });
  it("known and aliased imports do not create discoveries or trigger checks", async () => {
    const h = harness(); const id = h.get().user.activeAccountId;
    await h.actions.recordGoodDiscoveries(id);
    expect(h.provider.checkForUpdate).not.toHaveBeenCalled();
    const data = loadStaticData({ version: 1, materials: { Mora: { key: "Mora", displayName: "Mora", category: "mora", aliases: ["Coins"] } } });
    const account = importGoodAccountFromText(JSON.stringify({ format: "GOOD", version: 1, characters: [], materials: { Coins: 20 } }), data).account!;
    expect(account.inventory).toEqual({ Mora: 20 });
    expect(mergeGoodDiscoveries({}, account, id, data, now.toISOString())).toEqual({});
  });
});
