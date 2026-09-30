import { test, expect } from "@playwright/test";
import { seed, saved, transport } from "./support";
import { createDefaultSaveFile } from "../src/domain/save/types";

for (let run = 1; run <= 5; run++) test(`update benchmark ${run}`, async ({ page, context, browser }, info) => {
  const save = createDefaultSaveFile(); save.settings.activeTab = "database";
  save.gameDataUpdates.lastChecked = new Date().toISOString();
  await transport(context);
  await seed(page, save); await page.goto("/");
  await expect(page.getByRole("button", { name: "Check for Updates", exact: true })).toBeEnabled();
  // Reset only after hydration and one painted frame: startup is outside the measured window.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
    const metrics = { maxTimerGapMs: 0, maxFrameGapMs: 0 }; let previous = performance.now(), frame = previous;
    (globalThis as typeof globalThis & { phase3Metrics: typeof metrics }).phase3Metrics = metrics;
    const timer = setInterval(() => { const now = performance.now(); metrics.maxTimerGapMs = Math.max(metrics.maxTimerGapMs, now - previous); previous = now; }, 16);
    const tick = () => { const now = performance.now(); metrics.maxFrameGapMs = Math.max(metrics.maxFrameGapMs, now - frame); frame = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick); setTimeout(() => clearInterval(timer), 10000); resolve();
  }))));
  await page.getByRole("button", { name: "Check for Updates", exact: true }).click();
  const interactionStart = performance.now();
  await page.getByRole("button", { name: "Automatic Data", exact: true }).click();
  await page.getByLabel("Find imported records", { exact: true }).fill("Browser");
  const interactionMs = performance.now() - interactionStart;
  await expect.poll(async () => (await saved(page)).gameDataUpdates.status).toBe("updated");
  const result = { run, browser: browser.version(), interactionMs, metrics: await page.evaluate(() => (globalThis as typeof globalThis & { phase3Metrics: unknown }).phase3Metrics), attempt: (await saved(page)).gameDataUpdates.lastSuccessfulAttempt };
  console.log("PHASE3_PERFORMANCE", JSON.stringify(result));
  await info.attach("phase3-performance", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
});
