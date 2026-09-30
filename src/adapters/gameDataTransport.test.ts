import { farmingDataset } from "../test/fixtures/farmingDataset";
import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "../test/fixtures/animeGameData2.release.json";
import { ANIME_FILES } from "./animeGameData2";
import { checkAnimeRevision, decodeAnimeBundle, fetchAnimeBundle } from "./gameDataTransport";

afterEach(() => vi.unstubAllGlobals());
describe("revision-pinned dataset transport", () => {
  it("checks lightweight commit metadata and identifies the release despite README commits", async () => {
    const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: fixture.revision, title: "Edit README.md" }, { id: "a".repeat(40), title: "CNRELWin7.1.0_R48145775" }])));
    expect(await checkAnimeRevision(undefined, transport)).toMatchObject({ revision: fixture.revision, releaseVersion: "7.1.0" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("fetches only required files at one revision and roundtrips verified bundles", async () => {
    vi.stubGlobal("crypto", webcrypto);
    let active = 0; let maxActive = 0;
    const transport = vi.fn(async (url: string | URL | Request) => {
      active++; maxActive = Math.max(maxActive, active);
      const path = decodeURIComponent(String(url).split("/files/")[1].split("/raw?")[0]);
      await Promise.resolve(); active--;
      return new Response(JSON.stringify((fixture.files as Record<string, unknown>)[path]));
    });
    const bundle = await fetchAnimeBundle({ revision: fixture.revision }, undefined, transport, false);
    expect(maxActive).toBeLessThanOrEqual(3);
    expect(transport).toHaveBeenCalledTimes(ANIME_FILES.length);
    expect(transport.mock.calls.every(([url]) => String(url).endsWith(`ref=${fixture.revision}`))).toBe(true);
    expect((await decodeAnimeBundle(bundle)).files).toEqual(fixture.files);
    bundle.files[ANIME_FILES[0]].content = "[]";
    await expect(decodeAnimeBundle(bundle)).rejects.toThrow(/checksum/);
  });
  it("roundtrips v2 capabilities and rejects incomplete or tampered farming bundles", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const data = farmingDataset();
    const transport = vi.fn(async (url: string | URL | Request) => {
      const path = decodeURIComponent(String(url).split("/files/")[1].split("/raw?")[0]);
      return new Response(JSON.stringify(data.files[path]));
    });
    const bundle = await fetchAnimeBundle({ revision: data.revision }, undefined, transport);
    expect(bundle.version).toBe(2);
    expect((await decodeAnimeBundle(bundle)).capabilities).toContain("farming");
    delete bundle.files["ExcelBinOutput/CombineExcelConfigData.json"];
    await expect(decodeAnimeBundle(bundle)).rejects.toThrow(/missing.*Combine/);
  });
  it("requests each relevant scene once and accepts older v2 bundles", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const data = farmingDataset();
    const entries = data.files["ExcelBinOutput/DungeonEntryExcelConfigData.json"] as Array<{ sceneId: number }>;
    for (const entry of entries) entry.sceneId = 99;
    data.files["BinOutput/Scene/Point/scene99_point.json"] = data.files["BinOutput/Scene/Point/scene3_point.json"];
    const transport = vi.fn(async (url: string | URL | Request) => new Response(JSON.stringify(data.files[decodeURIComponent(String(url).split("/files/")[1].split("/raw?")[0])])));
    const bundle = await fetchAnimeBundle({ revision: data.revision }, undefined, transport);
    expect(transport.mock.calls.filter(([url]) => String(url).includes("scene99"))).toHaveLength(1);
    expect(transport.mock.calls.some(([url]) => String(url).includes("scene3"))).toBe(false);
    expect((await decodeAnimeBundle(bundle)).files["BinOutput/Scene/Point/scene99_point.json"]).toBeDefined();
    delete bundle.files["BinOutput/Scene/Point/scene99_point.json"];
    await expect(decodeAnimeBundle(bundle)).rejects.toThrow(/missing.*scene99/);
    const old = farmingDataset();
    const legacy = await fetchAnimeBundle({ revision: old.revision }, undefined, async url => new Response(JSON.stringify(old.files[decodeURIComponent(String(url).split("/files/")[1].split("/raw?")[0])])));
    legacy.capabilities = ["identity-progression", "farming"];
    expect((await decodeAnimeBundle(legacy)).capabilities).not.toContain("scene-points");
  });
  it("reports rate limits and aborts incomplete downloads without retry storms", async () => {
    const transport = vi.fn().mockResolvedValue(new Response("", { status: 429, headers: { "Retry-After": "60" } }));
    await expect(checkAnimeRevision(undefined, transport)).rejects.toThrow(/Retry-After: 60/);
    expect(transport).toHaveBeenCalledTimes(1);
    const controller = new AbortController(); controller.abort();
    const aborted = vi.fn().mockRejectedValue(new Error("Aborted"));
    await expect(fetchAnimeBundle({ revision: fixture.revision }, controller.signal, aborted)).rejects.toThrow(/Aborted/);
  });
});
