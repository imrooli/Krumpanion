import { EXTRACTOR_VERSION } from "./animeFarming";
import type { UpstreamDiagnostic } from "../domain/staticData/upstreamTypes";
import { GameDataProviderError, type GameDataProvider, type GameDataProviderResult, type GameDataRevision } from "../domain/staticData/upstreamTypes";
import { checkAnimeRevision } from "./gameDataTransport";

function runWorker(request: { revision?: GameDataRevision; bundleText?: string }, signal?: AbortSignal): Promise<GameDataProviderResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error("Update cancelled")); return; }
    const worker = new Worker(new URL("./gameData.worker.ts", import.meta.url), { type: "module" });
    const cleanup = () => { worker.terminate(); signal?.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); reject(new Error("Update cancelled")); };
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<{ result?: GameDataProviderResult; error?: string; retryAfterMs?: number; diagnostics?: UpstreamDiagnostic[] }>) => {
      cleanup();
      if (event.data.result) resolve(event.data.result); else reject(new GameDataProviderError(event.data.error ?? "Dataset parsing failed", event.data.retryAfterMs, event.data.diagnostics));
    };
    worker.onerror = () => { cleanup(); reject(new Error("Dataset worker failed. Retry or import a dataset bundle.")); };
    worker.postMessage({ ...request, now: new Date().toISOString() });
  });
}
export const animeGameDataProvider: GameDataProvider = {
  id: "animegamedata2", extractorVersion: EXTRACTOR_VERSION, checkForUpdate: checkAnimeRevision,
  fetchLiveData: (revision, signal) => runWorker({ revision }, signal),
};
export const importGameDataset = (bundleText: string, signal?: AbortSignal) => runWorker({ bundleText }, signal);
