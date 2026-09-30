import { performance } from "node:perf_hooks";
import { checkAnimeRevision, decodeAnimeBundle, fetchAnimeBundle } from "../../src/adapters/gameDataTransport";
import { parseAnimeGameData2 } from "../../src/adapters/animeGameData2";
import { reconcileGameData } from "../../src/domain/staticData/reconcileGameData";
import { loadStaticData } from "../../src/domain/staticData/loadStaticData";

// Explicit opt-in command. Never runs as part of the deterministic test suite.
const started = performance.now();
const revision = await checkAnimeRevision();
const bundle = await fetchAnimeBundle(revision);
const downloaded = performance.now();
const result = parseAnimeGameData2(await decodeAnimeBundle(bundle));
const parsed = performance.now();
const candidate = reconcileGameData(loadStaticData(), null, result, {}, () => performance.now());
console.log(JSON.stringify({ revision, files: Object.keys(bundle.files).length, bytes: Object.values(bundle.files).reduce((sum, file) => sum + Buffer.byteLength(file.content), 0), downloadMs: downloaded - started, parseMs: parsed - downloaded, reconcileAndValidateMs: performance.now() - parsed, validationMs: candidate.validationMs, memory: process.memoryUsage(), maxRssKiB: process.resourceUsage().maxRSS, observations: result.observations.length, farming: result.farming?.length, delta: { ...candidate.delta, affectedKeys: candidate.delta.affectedKeys.length }, schemaDiagnostics: result.diagnostics.filter(row => row.code === "unsupported_schema"), review: candidate.diagnostics.length }, null, 2));
if (!result.farming?.length || !result.farming.some(row => row.domain)) throw new Error("Expected live structured farming joins were not found");
