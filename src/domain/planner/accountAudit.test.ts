import { describe, expect, it } from "vitest";
import { loadStaticData } from "../staticData/loadStaticData";
import { buildPlannerOutput } from "./buildPlannerRows";
import { DEFAULT_GOAL_STATE, DEFAULT_PLANNER_SETTINGS } from "../goals/types";
import type { PlannerInput } from "./types";
import type { ExactCharacterRequirements } from "../staticData/upstreamTypes";
import { resolveCraftingPlan } from "../crafting/resolveCraftingPlan";
import { buildMaterialRows } from "./compareInventory";
import { expandGoals } from "./expandGoals";
import { WEEKDAYS } from "../../utils/days";
import { sortRecommendations } from "./buildPlannerReport";
import { buildPlannerProgressionModel } from "../../features/planner/plannerProgressionModel";

const provenance = { provider: "fixture", revision: "phase4", table: "audit" };
const baseline = loadStaticData();
function inputFor(costs: Array<Record<string, number>>, inventory: Record<string, number> = {}, weapon = false): PlannerInput {
  const data = structuredClone(baseline);
  const keys = ["KamisatoAyaka", "Furina", "Mavuika"];
  const input: PlannerInput = { staticData: data, inventory, ownership: { characters: [], weapons: [], artifacts: [] }, today: "Monday", resinSettings: { ...DEFAULT_PLANNER_SETTINGS }, goals: { ...DEFAULT_GOAL_STATE, characterGoals: {}, weaponGoals: {}, artifactGoals: [], plannerSettings: { ...DEFAULT_PLANNER_SETTINGS } } };
  costs.forEach((cost, index) => {
    const ascension = Object.fromEntries([1, 2, 3, 4, 5, 6].map(phase => [phase, { costs: phase === 1 ? cost : {} }]));
    if (weapon && index === costs.length - 1) {
      data.exactWeaponRequirements = { ...data.exactWeaponRequirements, CoolSteel: { ascension, provenance } };
      input.goals.weaponGoals.copy = { weaponKey: "CoolSteel", goalId: "copy", planningMode: "prefarm", useOwnedInstance: false, enabled: true, priority: 1, targetAscensionPhase: 1 };
    } else {
      const talents = Object.fromEntries(['normal', 'skill', 'burst'].map(slot => [slot, Object.fromEntries([2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => [level, { costs: {}, requiredAscension: 2 }]))])) as ExactCharacterRequirements['talents'];
      data.exactCharacterRequirements = { ...data.exactCharacterRequirements, [keys[index]]: { ascension, talents, provenance } };
      input.goals.characterGoals[keys[index]] = { characterKey: keys[index], planningMode: "prefarm", enabled: true, priority: index + 1, targetAscension: 1 };
    }
  });
  return input;
}
function row(input: PlannerInput, material = "BasaltPillar") {
  return buildPlannerOutput(input).totalMissingByMaterial.find(row => row.materialKey === material)!;
}
function crafts(input: PlannerInput) {
  return resolveCraftingPlan(input.inventory, buildMaterialRows(input, expandGoals(input).goalResolutions).rows, input.staticData, { plannerSettings: input.resinSettings });
}

describe("account requirement accounting, independently of recommendation policy", () => {
  it.each([
    { demands: [8, 6], owned: 6, deficit: 8 },
    { demands: [8, 6, 4], owned: 10, deficit: 8 },
    { demands: [8, 6, 4], owned: 100, deficit: 0 },
    { demands: [8, 6], owned: 0, deficit: 14 },
  ])("aggregates $demands before using $owned owned units", ({ demands, owned, deficit }) => {
    const input = inputFor(demands.map(BasaltPillar => ({ BasaltPillar })), { BasaltPillar: owned });
    expect(row(input)).toMatchObject({ needed: demands.reduce((a, b) => a + b), rawMissing: deficit, missing: deficit });
    for (const goal of Object.values(input.goals.characterGoals)) goal.priority = 6 - goal.priority;
    input.goals.characterGoals = Object.fromEntries(Object.entries(input.goals.characterGoals).reverse());
    expect(row(input).missing).toBe(deficit);
  });
  it("shares inventory across character and weapon goals and keeps separate account inputs isolated", () => {
    const a = inputFor([{ BasaltPillar: 8 }, { BasaltPillar: 6 }], { BasaltPillar: 6 }, true);
    expect(row(a).missing).toBe(8);
    expect(row({ ...a, inventory: { BasaltPillar: 14 } }).missing).toBe(0);
    expect(row(a).missing).toBe(8);
    expect(a.inventory.BasaltPillar).toBe(6);
  });
  it("allocates per-goal UI readiness using each goal's demand rather than repeating the account total", () => {
    const input = inputFor([{ BasaltPillar: 8 }, { BasaltPillar: 6 }], { BasaltPillar: 6 });
    const output = buildPlannerOutput(input);
    const model = buildPlannerProgressionModel({ accountName: 'A', plannerStatus: { status: 'recalculated', activeGoalCount: 2, materialDeficitCount: 1, totalEstimatedResin: 0, warningCount: 0 }, plannerOutput: output, recentChanges: [], recentImports: [], goalProgressTracking: {}, goalMilestones: [] });
    const rows = model.goalGroups.flatMap(group => group.rows);
    const unique = [...new Map(rows.map(row => [row.goalId, row])).values()];
    expect(unique.find(row => row.goalId === 'Furina')?.isAccountReady).toBe(true);
    expect(unique.find(row => row.goalId === 'KamisatoAyaka')?.sharedShortages.find(row => row.label === 'Basalt Pillar')?.missingQuantity).toBe(8);
    expect(output.totalMissingByMaterial.find(row => row.materialKey === 'BasaltPillar')?.missing).toBe(8);
  });
  it("subtracts completed progression before aggregating remaining demand", () => {
    const input = inputFor([{ BasaltPillar: 8 }, { BasaltPillar: 6 }], { BasaltPillar: 2 });
    input.goals.characterGoals.KamisatoAyaka.planningMode = "owned";
    input.goals.characterGoals.KamisatoAyaka.targetAscension = 2;
    input.staticData.exactCharacterRequirements!.KamisatoAyaka.ascension['2'].costs = { BasaltPillar: 3 };
    input.ownership.characters.push({ characterId: "KamisatoAyaka", currentLevel: 40, currentAscension: 1, currentTalents: { normal: 1, skill: 1, burst: 1 } });
    expect(row(input)).toMatchObject({ needed: 9, missing: 7 });
    input.ownership.characters[0].currentAscension = 2;
    expect(row(input)).toMatchObject({ needed: 6, missing: 4 });
  });
  it("does not offer independent paused crafts as executable against the active inventory pool", () => {
    const input = inputFor([{ GuideToFreedom: 3 }, { PhilosophiesOfFreedom: 1 }], { TeachingsOfFreedom: 9 });
    input.goals.characterGoals.Furina.paused = true;
    const output = buildPlannerOutput(input);
    expect(output.craftingPlan.guaranteedCoverageByMaterial.GuideToFreedom).toBe(3);
    expect(output.recommendations.filter(row => row.id.startsWith('paused-') && row.actionGroup === 'crafting')).toEqual([]);
  });
});

describe("shared crafting pool and resource conservation", () => {
  it.each([
    { low: 9, mid: 0, coveredMid: 3, coveredHigh: 0, mora: 525 },
    { low: 9, mid: 3, coveredMid: 0, coveredHigh: 1, mora: 1075 },
    { low: 6, mid: 0, coveredMid: 2, coveredHigh: 0, mora: 350 },
    { low: 18, mid: 0, coveredMid: 3, coveredHigh: 1, mora: 1600 },
  ])("reserves direct tiers with $low low and $mid intermediate units", ({ low, mid, coveredMid, coveredHigh, mora }) => {
    const input = inputFor([{ PhilosophiesOfFreedom: 1 }, { GuideToFreedom: 3 }], { TeachingsOfFreedom: low, GuideToFreedom: mid });
    const result = crafts(input);
    expect(result.guaranteedCoverageByMaterial.GuideToFreedom).toBe(coveredMid);
    expect(result.guaranteedCoverageByMaterial.PhilosophiesOfFreedom).toBe(coveredHigh);
    expect(result.totalCraftingMora).toBe(mora);
    const consumedLow = result.reports.flatMap(r => r.guaranteedCrafting.steps).filter(s => s.inputKey === 'TeachingsOfFreedom').reduce((sum, s) => sum + s.inputQuantity * s.crafts, 0);
    expect(consumedLow).toBeLessThanOrEqual(low);
    input.goals.characterGoals = Object.fromEntries(Object.entries(input.goals.characterGoals).reverse());
    for (const goal of Object.values(input.goals.characterGoals)) goal.priority = 5;
    expect(crafts(input).guaranteedCoverageByMaterial).toEqual(result.guaranteedCoverageByMaterial);
  });
  it.each([0, 100, 200, 500])("uses surplus Mora once for crafting with %i owned", owned => {
    const input = inputFor([{ GuideToFreedom: 1, Mora: 100 }], { TeachingsOfFreedom: 3, Mora: owned });
    const output = buildPlannerOutput(input);
    const expected = Math.max(275 - owned, 0);
    expect(output.totalMissingByMaterial.find(r => r.materialKey === 'Mora')?.missing).toBe(expected);
    expect(output.farmingEstimates.filter(r => r.sourceType === 'ley_line_wealth').reduce((sum, r) => sum + r.missingAmount, 0)).toBe(expected);
  });
  it("reserves direct gems and consumes every converted gem across competing targets", () => {
    const input = inputFor([{ ShivadaJadeFragment: 2 }, { AgnidusAgateFragment: 2 }, { VarunadaLazuriteFragment: 1 }], { VarunadaLazuriteFragment: 4, DustOfAzoth: 30 });
    input.resinSettings.allowDustOfAzothConversion = true;
    const result = crafts(input);
    expect(result.guaranteedCoverageByMaterial.ShivadaJadeFragment + result.guaranteedCoverageByMaterial.AgnidusAgateFragment).toBe(3);
    expect(result.guaranteedRemainingByMaterial.VarunadaLazuriteFragment).toBe(0);
    expect(result.reports.flatMap(r => r.dustOfAzothOption?.conversions ?? []).reduce((sum, s) => sum + s.inputQuantity * s.crafts, 0)).toBe(3);
  });
});

describe("availability independently of accounting", () => {
  it("selects an established alternative available today with its own resin cost", () => {
    const input = inputFor([{ GuideToFreedom: 2 }]);
    const source = input.staticData.materialSources.GuideToFreedom[0];
    input.staticData.materialSources.GuideToFreedom = [
      { ...source, sourceKey: 'MondayDomain', sourceName: 'Monday Domain', availability: 'DAYS_1000000', resinCost: 20 },
      { ...source, sourceKey: 'TuesdayDomain', sourceName: 'Tuesday Domain', availability: 'DAYS_0100000', resinCost: 25 },
    ];
    const output = buildPlannerOutput({ ...input, today: 'Tuesday' });
    const estimate = output.farmingEstimates.find(r => r.relatedMaterialKeys.includes('GuideToFreedom'))!;
    expect(estimate).toMatchObject({ sourceName: 'Tuesday Domain', isAvailableToday: true, resinCostPerRun: 25 });
    expect(output.totalMissingByMaterial.find(r => r.materialKey === 'GuideToFreedom')?.missing).toBe(2);
    input.staticData.materialSources.GuideToFreedom = [];
    const unresolved = buildPlannerOutput(input);
    expect(unresolved.totalMissingByMaterial.find(r => r.materialKey === 'GuideToFreedom')?.missing).toBe(2);
    expect(unresolved.farmingEstimates.every(r => !r.isAvailableToday)).toBe(true);
  });
  it("keeps exact deficits constant on all seven days and respects a custom Monday-only schedule", () => {
    const input = inputFor([{ GuideToFreedom: 2 }]);
    input.staticData.materialSources.GuideToFreedom = input.staticData.materialSources.GuideToFreedom.map(source => ({ ...source, availability: 'DAYS_1000000' }));
    for (const today of WEEKDAYS) {
      const output = buildPlannerOutput({ ...input, today });
      expect(output.totalMissingByMaterial.find(r => r.materialKey === 'GuideToFreedom')?.missing).toBe(2);
      const estimate = output.farmingEstimates.find(r => r.relatedMaterialKeys.includes('GuideToFreedom'))!;
      expect(estimate.isAvailableToday).toBe(today === 'Monday');
    }
  });
});

describe("recommendation policy characterization, separate from deficit correctness", () => {
  it("uses title as a resin tie-breaker, even against the numeric priority", () => {
    const input = inputFor([{ GuideToFreedom: 2 }]);
    const sample = buildPlannerOutput(input).recommendations.find(row => row.actionGroup === 'resin_gated')!;
    const a = { ...sample, id: 'a', title: 'A domain', priority: 1 };
    const z = { ...sample, id: 'z', title: 'Z domain', priority: 999 };
    expect(sortRecommendations([z, a]).map(row => row.id)).toEqual(['a', 'z']);
    expect(sortRecommendations([a, z]).map(row => row.id)).toEqual(['a', 'z']);
    input.goals.characterGoals.KamisatoAyaka.priority = 5;
    expect(buildPlannerOutput(input).recommendations.find(row => row.id === sample.id)?.priority).toBe(sample.priority);
  });
});
