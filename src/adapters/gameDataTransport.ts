import { FARMING_TABLE_FILES, requiredScenePointFiles } from "./animeFarming";
import { schemaFailure } from "./animeSchema";
import { z } from "zod";
import { ANIME_FILES, ALL_ANIME_FILES, type AnimeDataset } from "./animeGameData2";
import type { GameDataRevision } from "../domain/staticData/upstreamTypes";
import { GameDataProviderError } from "../domain/staticData/upstreamTypes";

const API = "https://gitlab.com/api/v4/projects/83871005/repository";
export type FetchTransport = typeof globalThis.fetch;
export async function requestUpstream(url: string, signal?: AbortSignal, transport: FetchTransport = globalThis.fetch): Promise<Response> {
  const response = await transport(url, { signal });
  if (!response.ok) {
    const retry = response.headers.get("Retry-After");
    const retryAfterMs = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now())) : response.status === 429 ? 60000 : undefined;
    throw new GameDataProviderError(`Upstream request failed (${response.status}).${retry ? ` Retry-After: ${retry}.` : " Retry later or import a dataset bundle."}`, Number.isFinite(retryAfterMs) ? retryAfterMs : undefined);
  }
  return response;
}
export async function checkAnimeRevision(signal?: AbortSignal, transport?: FetchTransport): Promise<GameDataRevision> {
  const response = await requestUpstream(`${API}/commits?ref_name=main&per_page=5`, signal, transport);
  const payload = await response.text();
  let raw: unknown;
  try { raw = JSON.parse(payload); } catch { schemaFailure("GitLab revision metadata", "valid JSON"); }
  const parsed = z.array(z.object({ id: z.string().regex(/^[a-f0-9]{40}$/), title: z.string() })).min(1).safeParse(raw);
  if (!parsed.success) schemaFailure("GitLab revision metadata", "commit id/title");
  const commits = parsed.data;
  return { bytes: new TextEncoder().encode(payload).byteLength, revision: commits[0].id, releaseVersion: commits.map(commit => /RELWin(\d+\.\d+\.\d+)/.exec(commit.title)?.[1]).find(Boolean) };
}
const bundleSchema = z.object({
  format: z.literal("KrumpanionGameDataset"), version: z.union([z.literal(1), z.literal(2)]), provider: z.literal("animegamedata2"),
  revision: z.string().regex(/^[a-f0-9]{40}$/), releaseVersion: z.string().optional(),
  capabilities: z.array(z.enum(["identity-progression", "farming", "scene-points"])).optional(),
  files: z.record(z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/), content: z.string() })),
});
export type GameDatasetBundle = z.infer<typeof bundleSchema>;
async function digest(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes))).map(value => value.toString(16).padStart(2, "0")).join("");
}
export async function fetchAnimeBundle(revision: GameDataRevision, signal?: AbortSignal, transport?: FetchTransport, includeFarming = true): Promise<GameDatasetBundle> {
  if (!/^[a-f0-9]{40}$/.test(revision.revision)) throw new Error("Invalid upstream commit");
  const paths = includeFarming ? [...ANIME_FILES, ...FARMING_TABLE_FILES] : ANIME_FILES;
  const files: GameDatasetBundle["files"] = {};
  let cursor = 0;
  let failed = false;
  const download = async () => { await Promise.all(Array.from({ length: 3 }, async () => {
    while (!failed && cursor < paths.length) {
      const path = paths[cursor++];
      try {
      const response = await requestUpstream(`${API}/files/${encodeURIComponent(path)}/raw?ref=${revision.revision}`, signal, transport);
      const content = await response.text();
      files[path] = { content, sha256: await digest(content) };
      } catch (error) { failed = true; throw new GameDataProviderError(`Dataset ${path}: ${error instanceof Error ? error.message : String(error)}`, error instanceof GameDataProviderError ? error.retryAfterMs : undefined, [{ code: "dataset_download", dataset: path, severity: "error", stage: "download", message: `Unable to retrieve required dataset ${path}; no candidate was activated.` }]); }
    }
  })); };
  await download();
  if (includeFarming) {
    let entries: unknown;
    try { entries = JSON.parse(files["ExcelBinOutput/DungeonEntryExcelConfigData.json"].content); } catch { schemaFailure("DungeonEntryExcelConfigData", "valid JSON"); }
    paths.push(...requiredScenePointFiles(entries));
    await download();
  }
  return { format: "KrumpanionGameDataset", version: includeFarming ? 2 : 1, capabilities: includeFarming ? ["identity-progression", "farming", "scene-points"] : ["identity-progression"], provider: "animegamedata2", ...revision, files };
}
export async function decodeAnimeBundle(input: unknown): Promise<AnimeDataset> {
  const bundle = bundleSchema.parse(input);
  const files: AnimeDataset["files"] = {};
  if (bundle.version === 2 && (!bundle.capabilities?.includes("identity-progression") || !bundle.capabilities.includes("farming"))) throw new Error("Unsupported dataset capabilities");
  const dynamicScenes = bundle.version === 2 && bundle.capabilities?.includes("scene-points");
  const paths = dynamicScenes ? [...ANIME_FILES, ...FARMING_TABLE_FILES] : [...(bundle.version === 2 ? ALL_ANIME_FILES : ANIME_FILES)];
  for (const path of paths) {
    const file = bundle.files[path];
    if (!file) throw new Error(`Dataset is missing ${path}`);
    if (await digest(file.content) !== file.sha256) throw new Error(`Dataset checksum mismatch: ${path}`);
    try { files[path] = JSON.parse(file.content) as unknown; } catch { schemaFailure(path, "valid JSON"); }
    if (dynamicScenes && path === "ExcelBinOutput/DungeonEntryExcelConfigData.json") paths.push(...requiredScenePointFiles(files[path]));
  }
  return { capabilities: bundle.version === 2 ? bundle.capabilities : ["identity-progression"], revision: bundle.revision, releaseVersion: bundle.releaseVersion, files };
}
