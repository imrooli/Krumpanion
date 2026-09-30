import { buildPlannerOutput } from "../planner/buildPlannerRows";
import { DEFAULT_GOAL_STATE, DEFAULT_PLANNER_SETTINGS } from "../goals/types";
import { describe, expect, it } from "vitest";
import { hypotheticalPatchDataset } from "../../test/fixtures/farmingDataset";
import { parseAnimeGameData2 } from "../../adapters/animeGameData2";
import { reconcileGameData } from "./reconcileGameData";
import { loadStaticData } from "./loadStaticData";
import { farmingConfigurationFor, buildFarmingOverride } from "./farmingConfiguration";
import { farmingRequirements, plannerReadiness } from "./plannerReadiness";
import { availabilityMatchesDay } from "../../utils/days";

function upstream() { return parseAnimeGameData2(hypotheticalPatchDataset(), new Date("2026-09-29T12:00:00Z")); }
describe("farming reconciliation and manual precedence", () => {
  it("imports shared family relationships with exact crafting costs but no fabricated weekdays", () => {
    const result = reconcileGameData(loadStaticData(), null, upstream(), {});
    expect(result.staticData.tieredMaterialIndex.BrowserTeachings.tierKeys).toEqual(["BrowserTeachings", "BrowserGuide", "BrowserPhilosophies"]);
    expect(result.staticData.materialSources.BrowserTeachings[0]).toMatchObject({ sourceName: "Violet Court", availability: "UNKNOWN", resinCost: 20 });
    expect(result.staticData.recipes.BrowserPhilosophies.moraCost).toBe(550);
    expect(farmingRequirements(result.staticData).find(row => row.materialKey === "BrowserTeachings")?.fields).toEqual(["Availability / domain schedule"]);
    const second = reconcileGameData(result.staticData, result.overridePack, upstream(), {});
    expect(second.delta.added).toBe(0); expect(second.delta.changed).toBe(0);
    expect(second.delta.families).toBe(0);
  });
  it("keeps manual domain, cost and custom weekdays through conflicts and disappearing observations", () => {
    const first = reconcileGameData(loadStaticData(), null, upstream(), {});
    const form = { ...farmingConfigurationFor(first.staticData, "BrowserTeachings"), sourceKey: "ManualDomain", sourceName: "Manual Domain", resinCost: 25, availability: "DAYS_1010000" as const };
    const pack = buildFarmingOverride(first.staticData, first.overridePack, form);
    const result = reconcileGameData(loadStaticData(pack), pack, upstream(), {});
    for (const key of form.tierKeys) expect(result.staticData.materialSources[key][0]).toMatchObject({ sourceKey: "ManualDomain", resinCost: 25, availability: "DAYS_1010000" });
    expect(Object.values(result.overridePack.farmingConflicts ?? {}).filter(row => row.status === "pending")).toHaveLength(2);
    expect(result.staticData.recipes.BrowserPhilosophies.moraCost).toBe(550);
    expect(availabilityMatchesDay(form.availability, "Monday")).toBe(true);
    expect(availabilityMatchesDay(form.availability, "Tuesday")).toBe(false);
    const absent = upstream(); absent.farming = [];
    expect(reconcileGameData(result.staticData, result.overridePack, absent, {}).staticData.materialSources.BrowserTeachings[0].sourceKey).toBe("ManualDomain");
  });
  it("does not mark manual values automatic when upstream corroborates them", () => {
    const first = reconcileGameData(loadStaticData(), null, upstream(), {});
    const pack = structuredClone(first.overridePack); pack.farmingOrigins = {};
    const second = reconcileGameData(first.staticData, pack, upstream(), {});
    expect(second.overridePack.farmingOrigins).toEqual({});
    expect(second.overridePack.farmingConflicts ?? {}).toEqual({});
  });
  it("shares one manual schedule across consumers and plans exact deficits with missing, partial and craftable inventory", () => {
    const observations = upstream(); const character = observations.observations.find(row => row.entityType === "character")!;
    observations.observations.push({ ...character, gameId: 90000004, displayName: "Second Browser Character" });
    const first = reconcileGameData(loadStaticData(), null, observations, {});
    expect(farmingRequirements(first.staticData).find(row => row.materialKey === "BrowserTeachings")?.affectedKeys).toHaveLength(2);
    const pack = buildFarmingOverride(first.staticData, first.overridePack, { ...farmingConfigurationFor(first.staticData, "BrowserTeachings"), availability: "DAYS_1010000" });
    const data = loadStaticData(pack);
    expect(plannerReadiness(data, "BrowserCharacter").state).toBe("planner_ready");
    expect(plannerReadiness(data, "SecondBrowserCharacter").state).toBe("planner_ready");
    const planner = (inventory: Record<string, number>) => buildPlannerOutput({ staticData: data, inventory, ownership: { characters: [], weapons: [], artifacts: [] }, today: "Monday", resinSettings: DEFAULT_PLANNER_SETTINGS, goals: { ...DEFAULT_GOAL_STATE, plannerSettings: DEFAULT_PLANNER_SETTINGS, characterGoals: { BrowserCharacter: { characterKey: "BrowserCharacter", planningMode: "prefarm", enabled: true, priority: 1, talents: { auto: 3 } } } } });
    const empty = planner({}); const partial = planner({ BrowserGuide: 1 }); const craftable = planner({ BrowserTeachings: 99, Mora: 1000000 });
    const deficit = (output: typeof empty, key: string) => output.totalMissingByMaterial.find(row => row.materialKey === key)!;
    expect(deficit(empty, "BrowserGuide").missing).toBe(2);
    expect(deficit(partial, "BrowserGuide").missing).toBe(1);
    expect(deficit(craftable, "BrowserGuide").effectiveDeficit).toBe(0);
    expect(empty.farmingEstimates.some(row => row.sourceName === "Violet Court" && row.isAvailableToday)).toBe(true);
  });
  it("rejects invalid weekday masks", () => {
    const first = reconcileGameData(loadStaticData(), null, upstream(), {});
    expect(() => buildFarmingOverride(first.staticData, first.overridePack, { ...farmingConfigurationFor(first.staticData, "BrowserTeachings"), availability: "DAYS_9999999" })).toThrow(/valid availability/);
  });
});
