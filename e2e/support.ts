import { expect, type Page, type BrowserContext } from "@playwright/test";
import { hypotheticalPatchDataset as patchDataset } from "../src/test/fixtures/farmingDataset";
import type { KrumpanionSaveFile } from "../src/domain/save/types";
export async function seed(page: Page, save: KrumpanionSaveFile) {
  await page.addInitScript(() => {
    const metrics = { maxTimerGapMs: 0, peakMainFrameHeapBytes: 0 };
    (globalThis as typeof globalThis & { updateTestMetrics: typeof metrics }).updateTestMetrics = metrics;
    let previous = performance.now();
    setInterval(() => {
      const current = performance.now(); metrics.maxTimerGapMs = Math.max(metrics.maxTimerGapMs, current - previous); previous = current;
      const memory = (performance as typeof performance & { memory?: { usedJSHeapSize: number } }).memory;
      if (memory) metrics.peakMainFrameHeapBytes = Math.max(metrics.peakMainFrameHeapBytes, memory.usedJSHeapSize);
    }, 50);
  });
  await page.route("**/seed", route => route.fulfill({ contentType: "text/html", body: "<html></html>" }));
  await page.goto("/seed");
  await page.evaluate(async value => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("KrumpanionDatabase", 20);
      request.onupgradeneeded = () => { request.result.createObjectStore("documents", { keyPath: "key" }); const backups = request.result.createObjectStore("backups", { keyPath: "id" }); for (const key of ["kind", "accountId", "createdAt"]) backups.createIndex(key, key); backups.createIndex("[kind+accountId+createdAt]", ["kind", "accountId", "createdAt"]); backups.createIndex("[kind+createdAt]", ["kind", "createdAt"]); };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { const db = request.result; const tx = db.transaction("documents", "readwrite"); tx.objectStore("documents").put({ key: "saveFile", value }); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    });
  }, save);
}
export async function saved(page: Page): Promise<KrumpanionSaveFile> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("KrumpanionDatabase"); request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; const read = db.transaction("documents").objectStore("documents").get("saveFile"); read.onsuccess = () => { db.close(); resolve(read.result.value); }; read.onerror = () => reject(read.error); };
  }));
}
export async function transport(context: BrowserContext, data = patchDataset(), failure?: number | "offline" | "schema") {
  let files = 0, checks = 0;
  await context.route("https://gitlab.com/api/v4/**", async route => {
    if (failure === "offline") return route.abort("internetdisconnected");
    if (typeof failure === "number") return route.fulfill({ status: failure, headers: failure === 429 ? { "Retry-After": "1", "Access-Control-Expose-Headers": "Retry-After" } : {}, body: "Unavailable" });
    if (route.request().url().includes("/commits?")) { checks++; return route.fulfill({ json: [{ id: data.revision, title: "RELWin7.1.0" }] }); }
    files++;
    const url = new URL(route.request().url()); expect(url.searchParams.get("ref")).toBe(data.revision);
    const path = decodeURIComponent(url.pathname.split("/files/")[1].replace(/\/raw$/, ""));
    return route.fulfill({ json: failure === "schema" && path.includes("AvatarExcel") ? [{ renamed: true }] : data.files[path] });
  });
  return { files: () => files, checks: () => checks };
}
