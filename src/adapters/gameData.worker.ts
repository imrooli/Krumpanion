import { parseAnimeGameData2 } from "./animeGameData2";
import { decodeAnimeBundle, fetchAnimeBundle, type GameDatasetBundle } from "./gameDataTransport";
import { GameDataProviderError, type GameDataRevision } from "../domain/staticData/upstreamTypes";

globalThis.onmessage = async (event: MessageEvent<{ revision?: GameDataRevision; bundleText?: string; now: string }>) => {
  try {
    const started = performance.now();
    const bundle = event.data.bundleText !== undefined ? JSON.parse(event.data.bundleText) as unknown : await fetchAnimeBundle(event.data.revision!);
    const downloaded = performance.now();
    const result = parseAnimeGameData2(await decodeAnimeBundle(bundle), new Date(event.data.now));
    const files = Object.values((bundle as GameDatasetBundle).files);
    result.metrics = { bytes: files.reduce((sum, file) => sum + new TextEncoder().encode(file.content).byteLength, 0), fetched: event.data.bundleText === undefined ? files.length : 0, reused: event.data.bundleText === undefined ? 0 : files.length, downloadMs: downloaded - started, parseMs: performance.now() - downloaded };
    globalThis.postMessage({ result });
  } catch (error) { globalThis.postMessage({ error: error instanceof Error ? error.message : String(error), diagnostics: error instanceof GameDataProviderError ? error.diagnostics : undefined, retryAfterMs: error instanceof GameDataProviderError ? error.retryAfterMs : undefined }); }
};
