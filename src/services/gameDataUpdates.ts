import { applyFarmingField } from "../domain/staticData/reconcileFarming";
import { farmingConfigurationFor, buildFarmingOverride } from "../domain/staticData/farmingConfiguration";
import { parseOverrideDataPack } from "../domain/staticData/overrideSchema";
import { loadStaticData } from "../domain/staticData/loadStaticData";
import { validateStaticData } from "../domain/staticData/validateStaticData";
import { validateExactRequirements } from "../domain/staticData/validateExactRequirements";
import type { SyncAttempt } from "../domain/staticData/upstreamTypes";
import { animeGameDataProvider, importGameDataset } from "../adapters/gameDataProvider";
import { discoverGoodEntities, mergeGoodDiscoveries, resolvePreservedAccounts } from "../domain/staticData/goodDiscoveries";
import { reconcileGameData } from "../domain/staticData/reconcileGameData";
import { GameDataProviderError, type GameDataProvider, type GameDataProviderResult, type GameDataUpdateState } from "../domain/staticData/upstreamTypes";
import type { AppState } from "../store/useAppStore";
import { persistCurrentSnapshot, toSaveInfo, withPersistenceTransaction } from "../store/persistenceHelpers";

export interface GameDataUpdateActions {
  resolveFarmingConflict: (id: string, useUpstream: boolean) => Promise<void>;
  checkGameDataUpdates: (reason?: "manual" | "startup" | "good") => Promise<void>;
  importGameDataBundle: (text: string) => Promise<void>;
  cancelGameDataUpdate: () => void;
  recordGoodDiscoveries: (accountId: string) => Promise<void>;
  setDiscoveryIgnored: (id: string, ignored: boolean) => Promise<void>;
}
export function createGameDataUpdateActions(get: () => AppState, set: (patch: Partial<AppState>) => void, provider: GameDataProvider = animeGameDataProvider, clock: () => Date = () => new Date()): GameDataUpdateActions {
  let pending: Promise<void> | undefined;
  let generation = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let attempt: SyncAttempt | undefined;
  let started = 0;
  const scheduleGood = (delay: number) => { if (retryTimer !== undefined) return; retryTimer = setTimeout(() => { retryTimer = undefined; void actions.checkGameDataUpdates("good"); }, Math.max(1, delay)); };
  let controller: AbortController | undefined;
  const status = (patch: Partial<GameDataUpdateState>) => set({ gameDataUpdates: { ...get().gameDataUpdates, ...patch } });
  const saveMetadata = (patch: Partial<GameDataUpdateState> | ((state: AppState) => Partial<GameDataUpdateState>)) => withPersistenceTransaction(async () => {
    const state = get();
    const gameDataUpdates = { ...state.gameDataUpdates, ...(typeof patch === "function" ? patch(state) : patch) };
    const save = await persistCurrentSnapshot({ ...state, gameDataUpdates });
    set({ gameDataUpdates, saveInfo: toSaveInfo(save) });
  });
  const activate = (result: GameDataProviderResult) => withPersistenceTransaction(async () => {
    // Rebase after downloads and again if user edits overlap the IndexedDB write.
    for (;;) {
      const state = get();
      if (controller?.signal.aborted) throw new Error("Update cancelled");
      if (attempt) { attempt.stage = "reconcile"; attempt.recordsObserved = result.observations.length; attempt.metrics = result.metrics; attempt.farmingAccepted = result.farming?.length ?? 0; attempt.farmingRejected = result.diagnostics.filter(row => row.code === "farming_review").length; }
      const reconcileStarted = performance.now();
      const reconciled = reconcileGameData(state.staticData, state.overridePack, result, state.gameDataUpdates.discoveries, () => performance.now());
      if (attempt) { attempt.reconcileMs = performance.now() - reconcileStarted - reconciled.validationMs; attempt.validationMs = reconciled.validationMs; attempt.delta = reconciled.delta; attempt.stage = "persistence"; }
      const user = resolvePreservedAccounts(state.user, reconciled.staticData);
      const gameDataUpdates: GameDataUpdateState = { ...state.gameDataUpdates, provider: result.provider, checkedRevision: result.revision, appliedRevision: result.revision, releaseVersion: result.releaseVersion, lastChecked: clock().toISOString(), lastSynchronized: clock().toISOString(), effectiveVersion: state.gameDataUpdates.effectiveVersion + 1, status: "updated", error: undefined, retryAfter: undefined, discoveries: reconciled.discoveries, diagnostics: reconciled.diagnostics, lastSummary: reconciled.summary, lastDelta: reconciled.delta, appliedExtractorVersion: result.extractorVersion ?? provider.extractorVersion ?? 1, lastAttempt: attempt ? { ...attempt, metrics: result.metrics, checkedRevision: result.revision, result: "updated", stage: "complete", durationMs: performance.now() - started, finishedAt: clock().toISOString() } : undefined };
      gameDataUpdates.lastSuccessfulAttempt = gameDataUpdates.lastAttempt;
      const persistenceStarted = performance.now();
      const save = await persistCurrentSnapshot({ ...state, user, overridePack: reconciled.overridePack, gameDataUpdates });
      if (get().user !== state.user || get().overridePack !== state.overridePack || get().settings !== state.settings || get().gameDataUpdates !== state.gameDataUpdates) continue;
      if (gameDataUpdates.lastAttempt) {
        gameDataUpdates.lastAttempt.persistenceMs = performance.now() - persistenceStarted;
        gameDataUpdates.lastAttempt.durationMs = performance.now() - started;
      }
      set({ user, overridePack: reconciled.overridePack, staticData: reconciled.staticData, overrideText: JSON.stringify(reconciled.overridePack, null, 2), gameDataUpdates, saveInfo: toSaveInfo(save) });
      return;
    }
  });
  const run = (work: () => Promise<void>, trigger: SyncAttempt["trigger"]) => {
    if (pending) return pending;
    controller = new AbortController();
    started = performance.now();
    attempt = { trigger, startedAt: clock().toISOString(), previousRevision: get().gameDataUpdates.appliedRevision, result: "running", stage: trigger === "bundle" ? "parse" : "revision" };
    pending = work().catch(async error => {
      if (attempt && error instanceof GameDataProviderError && error.diagnostics?.[0]?.stage) attempt.stage = error.diagnostics[0].stage;
      const patch = { diagnostics: error instanceof GameDataProviderError && error.diagnostics ? error.diagnostics : get().gameDataUpdates.diagnostics, lastAttempt: attempt ? { ...attempt, result: "failed" as const, finishedAt: clock().toISOString(), durationMs: performance.now() - started } : undefined, status: "failed" as const, error: error instanceof Error ? error.message : String(error), retryAfter: error instanceof GameDataProviderError && error.retryAfterMs ? new Date(clock().getTime() + error.retryAfterMs).toISOString() : undefined };
      status(patch);
      try { await saveMetadata(patch); } catch { /* The active database is unchanged when persistence fails. */ }
    }).finally(() => { pending = undefined; controller = undefined; });
    return pending;
  };
  const actions: GameDataUpdateActions = {
    resolveFarmingConflict: (id, useUpstream) => withPersistenceTransaction(async () => {
      const state = get(); const conflict = state.overridePack?.farmingConflicts?.[id];
      if (!conflict) throw new Error("This farming conflict is no longer available");
      let pack = state.overridePack!;
      if (useUpstream) {
        const form = applyFarmingField(farmingConfigurationFor(state.staticData, conflict.materialKey), conflict.proposed, conflict.field);
        pack = buildFarmingOverride(state.staticData, pack, form, false);
        const resource = `family:${form.familyKey}`;
        pack.farmingOrigins = { ...pack.farmingOrigins, [resource]: { ...pack.farmingOrigins?.[resource], [conflict.field]: { source: "upstream", provenance: conflict.provenance, domainGameId: conflict.domainGameId } } };
      }
      pack = parseOverrideDataPack(JSON.stringify({ ...pack, farmingConflicts: { ...pack.farmingConflicts, [id]: { ...conflict, status: useUpstream ? "accepted" : "kept_manual" } } }));
      const staticData = loadStaticData(pack); validateExactRequirements(staticData);
      if (validateStaticData(staticData).issues.some(issue => issue.severity === "error")) throw new Error("Farming configuration failed integrity validation");
      const gameDataUpdates = { ...state.gameDataUpdates, effectiveVersion: state.gameDataUpdates.effectiveVersion + 1 };
      const save = await persistCurrentSnapshot({ ...state, overridePack: pack, gameDataUpdates });
      set({ gameDataUpdates, overridePack: pack, staticData, overrideText: JSON.stringify(pack, null, 2), saveInfo: toSaveInfo(save) });
    }),
    checkGameDataUpdates: (reason = "manual") => {
      if (pending) {
        const requestedGeneration = generation;
        if (reason === "good") void pending.then(() => {
          if (requestedGeneration !== generation) return;
          const latest = get().gameDataUpdates;
          if (Object.values(latest.discoveries).some(row => row.status === "detected")) scheduleGood(Math.max(0, 60000 - (clock().getTime() - Date.parse(latest.lastChecked ?? "1970-01-01")), Date.parse(latest.retryAfter ?? "1970-01-01") - clock().getTime()));
        });
        return pending;
      }
      const state = get().gameDataUpdates;
      if (state.retryAfter && Date.parse(state.retryAfter) > clock().getTime()) { if (reason === "good") scheduleGood(Date.parse(state.retryAfter) - clock().getTime()); return Promise.resolve(); }
      const elapsed = clock().getTime() - Date.parse(state.lastChecked ?? "1970-01-01T00:00:00Z");
      if (reason !== "manual" && elapsed < (reason === "startup" ? 86400000 : 60000)) { if (reason === "good") scheduleGood(60000 - elapsed); return Promise.resolve(); }
      return run(async () => {
        status({ status: "checking", error: undefined, retryAfter: undefined, lastChecked: clock().toISOString() });
        if (provider === animeGameDataProvider && typeof Worker === "undefined") throw new Error("This environment cannot run dataset workers. Open Krumpanion in a supported browser.");
        const revision = await provider.checkForUpdate(controller?.signal);
        if (attempt) { attempt.checkedRevision = revision.revision; attempt.revisionBytes = revision.bytes; }
        await saveMetadata({ lastChecked: clock().toISOString(), checkedRevision: revision.revision });
        if (get().gameDataUpdates.appliedRevision === revision.revision && (get().gameDataUpdates.appliedExtractorVersion ?? 1) >= (provider.extractorVersion ?? 1)) {
          await saveMetadata(latest => ({ lastAttempt: attempt ? { ...attempt, result: "current", stage: "complete", durationMs: performance.now() - started, finishedAt: clock().toISOString() } : undefined, status: "current", discoveries: Object.fromEntries(Object.entries(latest.gameDataUpdates.discoveries).map(([id, row]) => [id, row.status === "detected" ? { ...row, status: "needs_review" as const } : row])) })); return;
        }
        status({ status: "downloading" });
        if (attempt) attempt.stage = "download / parse";
        const result = await provider.fetchLiveData(revision, controller?.signal);
        if (controller?.signal.aborted) throw new Error("Update cancelled");
        await activate(result);
        try { await saveMetadata({ lastAttempt: get().gameDataUpdates.lastAttempt, lastSuccessfulAttempt: get().gameDataUpdates.lastSuccessfulAttempt }); } catch { /* Optional metrics cannot undo a successful activation. */ }
      }, reason);
    },
    importGameDataBundle: text => run(async () => { status({ status: "downloading", error: undefined }); await activate(await importGameDataset(text, controller?.signal)); }, "bundle"),
    cancelGameDataUpdate: () => { generation++; if (retryTimer !== undefined) clearTimeout(retryTimer); retryTimer = undefined; controller?.abort(); },
    recordGoodDiscoveries: async accountId => {
      const state = get(); const account = state.user.accountsById[accountId]; if (!account) return;
      const unknown = discoverGoodEntities(account, state.staticData);
      if (!unknown.length) return;
      const discoveries = mergeGoodDiscoveries(state.gameDataUpdates.discoveries, account, accountId, state.staticData, clock().toISOString());
      await saveMetadata(latest => ({ discoveries: mergeGoodDiscoveries(latest.gameDataUpdates.discoveries, latest.user.accountsById[accountId] ?? account, accountId, latest.staticData, clock().toISOString()) }));
      if (Object.values(discoveries).some(row => row.accountIds.includes(accountId) && row.status === "detected")) void actions.checkGameDataUpdates("good");
    },
    setDiscoveryIgnored: async (id, ignored) => {
      const state = get().gameDataUpdates; const discovery = state.discoveries[id]; if (!discovery) return;
      await saveMetadata(latest => ({ discoveries: { ...latest.gameDataUpdates.discoveries, [id]: { ...latest.gameDataUpdates.discoveries[id], status: ignored ? "ignored" : "needs_review" } } }));
    },
  };
  return actions;
}
