import { describe, expect, it } from "vitest";
import { newLivePatch } from "../../test/fixtures/newLivePatch";
import { reconcileGameData } from "../staticData/reconcileGameData";
import { loadStaticData } from "../staticData/loadStaticData";
import { buildFarmingOverride } from "../staticData/farmingConfiguration";
import { plannerReadiness } from "../staticData/plannerReadiness";
import { buildPlannerOutput } from "./buildPlannerRows";
import { DEFAULT_GOAL_STATE, DEFAULT_PLANNER_SETTINGS } from "../goals/types";
import type { StaticGameData } from "../staticData/types";

function releaseScenario() {
  const patch = newLivePatch();
  const names: Record<number, string> = { 113023: "NewBossMaterial", 113018: "NewWeeklyMaterial", 104323: "NewTalentLow", 104324: "NewTalentMid", 104325: "NewTalentHigh", 114001: "NewWeaponLow", 114002: "NewWeaponMid", 114003: "NewWeaponHigh", 114004: "NewWeaponTop" };
  const replacements = new Map<number, number>();
  for (const row of patch.observations) if (row.entityType === "material" && names[row.gameId]) {
    const original = row.gameId; row.gameId += 8000000; row.displayName = names[original]; row.canonicalKey = names[original]; replacements.set(original, row.gameId);
  }
  for (const row of patch.observations) {
    const steps = [...Object.values(row.characterRequirements?.ascension ?? row.weaponRequirements?.ascension ?? {}), ...Object.values(row.characterRequirements?.talents ?? {}).flatMap(Object.values)];
    for (const step of steps) for (const [old, replacement] of replacements) if (step.costs[String(old)]) { step.costs[String(replacement)] = step.costs[String(old)]; delete step.costs[String(old)]; }
  }
  return reconcileGameData(loadStaticData(), null, patch, {});
}
function planner(data: StaticGameData, inventory: Record<string, number> = {}) {
  return buildPlannerOutput({ staticData: data, inventory, ownership: { characters: [], weapons: [], artifacts: [] }, today: "Monday", resinSettings: DEFAULT_PLANNER_SETTINGS,
    goals: { ...DEFAULT_GOAL_STATE, plannerSettings: DEFAULT_PLANNER_SETTINGS,
      characterGoals: { NewCharacter: { characterKey: "NewCharacter", planningMode: "prefarm", enabled: true, priority: 3, targetAscension: 6, talents: { auto: 10, skill: 2, burst: 3 } } },
      weaponGoals: { NewSword: { weaponKey: "NewSword", planningMode: "prefarm", useOwnedInstance: false, enabled: true, priority: 3, targetLevel: 90, targetAscensionPhase: 6 } },
    },
  });
}
describe("new live patch acceptance scenario", () => {
  it("subtracts each owned combat talent independently and uses its ascension prerequisite", () => {
    const patch = newLivePatch();
    const exact = patch.observations.find(row => row.entityType === "character")!.characterRequirements!;
    exact.talents.normal["2"] = { costs: { "202": 101 }, requiredAscension: 2 };
    exact.talents.skill["3"] = { costs: { "202": 202 }, requiredAscension: 4 };
    exact.talents.burst["4"] = { costs: { "202": 303 }, requiredAscension: 3 };
    const data = reconcileGameData(loadStaticData(), null, patch, {}).staticData;
    const output = buildPlannerOutput({ staticData: data, today: "Monday", inventory: {}, resinSettings: DEFAULT_PLANNER_SETTINGS,
      ownership: { characters: [{ characterId: "NewCharacter", currentLevel: 1, currentAscension: 2, currentTalents: { normal: 1, skill: 2, burst: 3 } }], weapons: [], artifacts: [] },
      goals: { ...DEFAULT_GOAL_STATE, plannerSettings: DEFAULT_PLANNER_SETTINGS, characterGoals: { NewCharacter: { characterKey: "NewCharacter", planningMode: "owned", enabled: true, priority: 1, talents: { auto: 2, skill: 3, burst: 4 } } } },
    });
    const plan = output.byCharacter[0];
    expect(plan.breakdown.find(row => row.label === "Talent: Auto")?.materialTotals).toEqual({ Mora: 101 });
    expect(plan.breakdown.find(row => row.label === "Talent: Skill")?.materialTotals).toEqual({ Mora: 202 });
    expect(plan.breakdown.find(row => row.label === "Talent: Burst")?.materialTotals).toEqual({ Mora: 303 });
    expect(plan.breakdown.filter(row => !row.label.startsWith("Talent:")).reduce((sum, row) => sum + (row.materialTotals.NewFlower ?? 0), 0)).toBe(50);
  });
  it("calculates exact deficits before source setup without scheduling unknown days or bosses", () => {
    const result = releaseScenario();
    const output = planner(result.staticData, { NewFlower: 100 });
    expect(output.totalMissingByMaterial.find(row => row.materialKey === "NewFlower")?.missing).toBe(68);
    expect(output.totalMissingByMaterial.find(row => row.materialKey === "NewBossMaterial")?.needed).toBe(46);
    expect(output.byWeapon[0].breakdown.some(row => row.label.startsWith("Leveling") && row.materialTotals.Mora > 0)).toBe(true);
    const newSources = output.farmingEstimates.filter(row => row.relatedMaterialKeys.some(key => key.startsWith("New")));
    expect(newSources.length).toBeGreaterThan(0);
    expect(newSources.every(row => row.sourceType === "unknown" && row.availability === "UNKNOWN" && !row.isAvailableToday)).toBe(true);
  });
  it("becomes planner-ready using only farming configuration, including families and crafting", () => {
    const result = releaseScenario(); let pack = result.overridePack; let data = result.staticData;
    const configure = (materialKey: string, sourceType: "normal_boss" | "weekly_boss" | "local_specialty" | "domain_of_mastery" | "domain_of_forgery", sourceName: string, tierKeys: string[] = []) => {
      pack = buildFarmingOverride(data, pack, { materialKey, sourceType, sourceKey: sourceName, sourceName, availability: sourceType === "weekly_boss" ? "WEEKLY" : tierKeys.length ? "MON_THU_SUN" : "ALWAYS", resinCost: tierKeys.length ? 20 : sourceType === "normal_boss" ? 40 : sourceType === "weekly_boss" ? 30 : 0, region: "New region", familyKey: tierKeys.length ? sourceName : "", tierKeys });
      data = loadStaticData(pack);
    };
    configure("NewFlower", "local_specialty", "NewIsland");
    configure("NewBossMaterial", "normal_boss", "NewBoss");
    configure("NewWeeklyMaterial", "weekly_boss", "NewWeeklyBoss");
    configure("NewTalentLow", "domain_of_mastery", "NewTalentDomain", ["NewTalentLow", "NewTalentMid", "NewTalentHigh"]);
    configure("NewWeaponLow", "domain_of_forgery", "NewWeaponDomain", ["NewWeaponLow", "NewWeaponMid", "NewWeaponHigh", "NewWeaponTop"]);
    expect(plannerReadiness(data, "NewCharacter").state).toBe("planner_ready");
    expect(plannerReadiness(data, "NewSword").state).toBe("planner_ready");
    const output = planner(data, { NewTalentLow: 200, Mora: 1000000 });
    expect(output.farmingEstimates.some(row => row.sourceName === "NewTalentDomain" && row.isAvailableToday)).toBe(true);
    expect(output.farmingEstimates.some(row => row.sourceName === "NewBoss" && row.sourceType === "normal_boss")).toBe(true);
    expect(output.craftingPlan.suggestions.some(row => row.outputMaterialKey.startsWith("NewTalent") && row.craftableQuantity > 0)).toBe(true);
    expect(data.materials.NewTalentLow.gameId).toBe(8104323);
    expect(loadStaticData(pack).materialSources.NewWeaponHigh[0].availability).toBe("MON_THU_SUN");
    const expensive = buildFarmingOverride(data, pack, { materialKey: "NewBossMaterial", sourceType: "normal_boss", sourceKey: "NewBoss", sourceName: "NewBoss", availability: "ALWAYS", resinCost: 55, region: "New region", familyKey: "", tierKeys: [] });
    const estimate = planner(loadStaticData(expensive)).farmingEstimates.find(row => row.sourceName === "NewBoss")!;
    expect(estimate.resinCostPerRun).toBe(55);
    expect(estimate.estimatedResin).toBe(estimate.actionableRuns! * 55);
  });
});
