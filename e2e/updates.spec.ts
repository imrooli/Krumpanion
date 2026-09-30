import { seed, saved, transport } from "./support";
import { test, expect } from "@playwright/test";
import { hypotheticalPatchDataset as patchDataset } from "../src/test/fixtures/farmingDataset";
import { createDefaultSaveFile } from "../src/domain/save/types";

function initialSave() { const save = createDefaultSaveFile(); save.settings.activeTab = "database"; return save; }

test("startup at current revision checks metadata without downloading datasets", async ({ page, context }) => {
  const mock = await transport(context); const save = initialSave();
  save.gameDataUpdates.appliedRevision = patchDataset().revision; save.gameDataUpdates.appliedExtractorVersion = 3;
  await seed(page, save); await page.goto("/");
  await expect(page.getByText("Game database is current", { exact: true })).toBeVisible();
  expect(mock.checks()).toBe(1); expect(mock.files()).toBe(0);
  await page.getByRole("navigation").getByRole("button", { name: /^Planner/ }).click();
  await expect(page.getByRole("heading", { name: "Krumpanion", exact: true })).toBeVisible();
});

test("new revision runs the real worker, persists, reloads, and accepts a shared manual schedule", async ({ page, context }, testInfo) => {
  const mock = await transport(context); const save = initialSave();
  save.user.accountsById[save.user.activeAccountId].goals.characterGoals.BrowserCharacter = { characterKey: "BrowserCharacter", enabled: true, priority: 1, planningMode: "prefarm", talents: { auto: 2 } };
  await seed(page, save); await page.goto("/");
  await expect(page.getByText("Game database updated", { exact: true })).toBeVisible();
  expect(mock.files()).toBe(22);
  let snapshot = await saved(page);
  console.log("Update timing", JSON.stringify({ attempt: snapshot.gameDataUpdates.lastAttempt, browser: await page.evaluate(() => (globalThis as typeof globalThis & { updateTestMetrics: unknown }).updateTestMetrics) }));
  await testInfo.attach("update-performance", { body: JSON.stringify({ attempt: snapshot.gameDataUpdates.lastAttempt, browser: await page.evaluate(() => (globalThis as typeof globalThis & { updateTestMetrics: unknown }).updateTestMetrics), note: "Fixture payload; main-frame heap excludes worker heap. Timer gaps include rendering and startup." }, null, 2), contentType: "application/json" });
  expect(snapshot.overridePack?.characters?.BrowserCharacter.gameId).toBe(90000001);
  expect(snapshot.overridePack?.materialSources?.BrowserTeachings[0].availability).toBe("UNKNOWN");
  await page.reload(); await expect(page.getByRole("heading", { name: "Game Data", exact: true })).toBeVisible();
  expect(mock.files()).toBe(22);
  await page.getByRole("button", { name: /^Configure Farming Data/ }).click();
  await page.getByLabel("Find material", { exact: true }).fill("Browser Teachings");
  await page.getByRole("combobox", { name: "Edit material", exact: true }).selectOption("BrowserTeachings");
  await expect(page.getByText(/Automatically identified/).first()).toBeVisible();
  await expect(page.getByLabel("Source / domain name", { exact: true })).toHaveCount(0);
  await page.getByLabel("Monday", { exact: true }).check();
  await page.getByLabel("Wednesday", { exact: true }).check();
  await page.getByRole("button", { name: "Save Farming Data", exact: true }).click();
  await expect(page.getByText("Farming data saved. Readiness recalculated.")).toBeVisible();
  snapshot = await saved(page);
  await page.getByRole("button", { name: "Automatic Data", exact: true }).click();
  await expect(page.getByText(/Browser Character.*planner ready/)).toBeVisible();
  await page.getByRole("navigation", { name: "Primary sections" }).getByRole("button", { name: /^Planner/ }).click();
  await page.getByRole("button", { name: "This Week", exact: true }).click();
  await expect(page.getByText("Monday / Wednesday", { exact: true }).first()).toBeVisible();
  for (const key of ["BrowserTeachings", "BrowserGuide", "BrowserPhilosophies"]) expect(snapshot.overridePack?.materialSources?.[key][0].availability).toBe("DAYS_1010000");
  await page.reload();
  expect((await saved(page)).overridePack?.materialSources?.BrowserTeachings[0].availability).toBe("DAYS_1010000");
});

test("unknown GOOD is saved before the check, resolves ownership, and preserves edits and other accounts", async ({ page, context }) => {
  const data = patchDataset(); const save = initialSave(); save.settings.activeTab = "inventory";
  save.gameDataUpdates.lastChecked = new Date(Date.now() - 120000).toISOString();
  const other = structuredClone(save.user.accountsById[save.user.activeAccountId]); other.id = "other"; other.inventory = { Mora: 888 }; save.user.accountsById.other = other; save.user.accountOrder.push("other");
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await context.route("https://gitlab.com/api/v4/**", async route => {
    requests++;
    if (route.request().url().includes("/commits?")) { const current = await saved(page); expect(current.user.accountsById[current.user.activeAccountId].inventory.Mora).toBe(7); await gate; return route.fulfill({ json: [{ id: data.revision, title: "RELWin7.1.0" }] }); }
    const path = decodeURIComponent(new URL(route.request().url()).pathname.split("/files/")[1].replace(/\/raw$/, "")); return route.fulfill({ json: data.files[path] });
  });
  await seed(page, save); await page.goto("/");
  await page.getByPlaceholder("Paste a GOOD JSON export here.").fill(JSON.stringify({ format: "GOOD", version: 1, characters: [{ key: "BrowserCharacter", level: 1, ascension: 0, constellation: 0, talent: { auto: 1, skill: 1, burst: 1 } }], weapons: [{ key: "BrowserSword", id: 555, level: 1, ascension: 0, refinement: 1 }], materials: { Mora: 7 } }));
  await page.getByRole("button", { name: "Parse Text", exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  await page.getByRole("button", { name: /^Materials/ }).click();
  const quantity = page.getByRole("textbox", { name: "Quantity for Mora", exact: true });
  await quantity.fill("99"); await quantity.press("Enter");
  await expect.poll(async () => { const current = await saved(page); return current.user.accountsById[current.user.activeAccountId].inventory.Mora; }).toBe(99);
  release();
  await expect.poll(async () => (await saved(page)).gameDataUpdates.status).toBe("updated");
  const current = await saved(page); const account = current.user.accountsById[current.user.activeAccountId];
  expect(account.inventory.Mora).toBe(99); expect(account.importedInventory.Mora).toBe(7); expect(current.user.accountsById.other.inventory.Mora).toBe(888);
  expect(account.characters.some(row => row.characterId === "BrowserCharacter")).toBe(true);
  expect(account.weapons.some(row => row.weaponKey === "BrowserSword")).toBe(true);
  expect(Object.values(current.gameDataUpdates.discoveries).every(row => row.status === "resolved")).toBe(true);
  expect(current.overridePack?.materialSources?.BrowserTeachings[0].availability).toBe("UNKNOWN");
});

for (const failure of ["offline", 503, 429, "schema"] as const) test(`provider ${failure} leaves the validated database active and permits retry`, async ({ page, context }) => {
  await transport(context, patchDataset(), failure); const save = initialSave();
  save.gameDataUpdates.appliedRevision = "a".repeat(40); save.user.accountsById[save.user.activeAccountId].inventory.Mora = 37;
  save.settings.activeTab = "inventory"; save.gameDataUpdates.lastChecked = new Date(Date.now() - 120000).toISOString();
  await seed(page, save); await page.goto("/");
  await page.getByPlaceholder("Paste a GOOD JSON export here.").fill(JSON.stringify({ format: "GOOD", version: 1, characters: [{ key: "BrowserCharacter", level: 1, ascension: 0, constellation: 0, talent: { auto: 1, skill: 1, burst: 1 } }], weapons: [], materials: { Mora: 37 } }));
  await page.getByRole("button", { name: "Parse Text", exact: true }).click();
  await expect.poll(async () => (await saved(page)).gameDataUpdates.status).toBe("failed");
  await page.getByRole("navigation", { name: "Primary sections" }).getByRole("button", { name: /^Database/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: /saved database/ })).toBeVisible();
  const current = await saved(page);
  expect(current.gameDataUpdates.appliedRevision).toBe(save.gameDataUpdates.appliedRevision);
  expect(current.overridePack).toBeNull(); expect(current.user.accountsById[current.user.activeAccountId].inventory.Mora).toBe(37);
  expect(current.user.accountsById[current.user.activeAccountId].characters.some(row => row.characterId === "BrowserCharacter")).toBe(true);
  expect(Object.values(current.gameDataUpdates.discoveries).some(row => row.rawKey === "BrowserCharacter" && row.status !== "resolved")).toBe(true);
  await expect(page.getByRole("button", { name: "Check for Updates", exact: true })).toBeEnabled();
  await context.unroute("https://gitlab.com/api/v4/**"); await transport(context);
  if (current.gameDataUpdates.retryAfter) await expect.poll(() => Date.now() >= Date.parse(current.gameDataUpdates.retryAfter!)).toBe(true);
  await page.getByRole("button", { name: "Check for Updates", exact: true }).click();
  await expect(page.getByText("Game database updated", { exact: true })).toBeVisible();
});
