import { describe, expect, it } from "vitest";
import { DEFAULT_GOALS } from "../../domain/goals/types";
import { buildPlannerOutput } from "../../domain/planner/buildPlannerRows";
import type { PlannerOutput, PlannerRecommendation, PlannerRecommendationSection, ResinSummary } from "../../domain/planner/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { buildPlannerUiModel } from "./plannerUiModel";

const staticData = createStaticData();

function makeRecommendation(overrides: Partial<PlannerRecommendation>): PlannerRecommendation {
  return {
    id: "row",
    title: "Recommendation",
    category: "custom",
    actionGroup: "passive_incidental",
    priority: 1,
    availability: "ALWAYS",
    sourceName: "Source",
    resinCost: undefined,
    resinPerRun: null,
    totalEstimatedResin: null,
    resinLabel: "No resin",
    estimatedRuns: null,
    actionableRuns: null,
    relatedGoalKeys: ["prefarm:CoolSteel"],
    relatedGoalLabels: ["Cool Steel weapon goal"],
    requiredMaterials: [],
    expectedRewards: [],
    reason: "Test reason",
    blockedBy: [],
    isAvailableToday: true,
    warnings: [],
    ...overrides,
  };
}

function makeSections(rows: PlannerRecommendation[]): PlannerRecommendationSection[] {
  return [
    { key: "summary", label: "Summary", rows: [] },
    { key: "resin_gated", label: "Resin Activities", rows: rows.filter((row) => row.actionGroup === "resin_gated") },
    { key: "weekly_resin", label: "Weekly Resin Activities", rows: rows.filter((row) => row.actionSubgroup === "weekly_resin") },
    { key: "domains", label: "Domains", rows: rows.filter((row) => row.actionSubgroup === "domains") },
    { key: "bosses", label: "Bosses", rows: rows.filter((row) => row.actionSubgroup === "bosses") },
    { key: "ley_lines", label: "Ley Lines", rows: rows.filter((row) => row.actionSubgroup === "ley_lines") },
    { key: "time_gated_non_resin", label: "Time-Gated", rows: rows.filter((row) => row.actionGroup === "time_gated_non_resin") },
    { key: "crafting", label: "Crafting", rows: rows.filter((row) => row.actionGroup === "crafting") },
    { key: "forging", label: "Forging", rows: rows.filter((row) => row.actionSubgroup === "forging") },
    { key: "open_world", label: "Open World", rows: rows.filter((row) => row.actionGroup === "open_world") },
    { key: "local_specialty", label: "Local Specialty", rows: rows.filter((row) => row.actionSubgroup === "local_specialty") },
    { key: "passive_incidental", label: "Passive", rows: rows.filter((row) => row.actionGroup === "passive_incidental" && row.actionSubgroup !== "unknown_estimates") },
    { key: "unknown_estimates", label: "Unknown", rows: rows.filter((row) => row.actionSubgroup === "unknown_estimates") },
  ];
}

function makeSummary(overrides: Partial<ResinSummary> = {}): ResinSummary {
  return {
    progressionMora: 0,
    craftingMora: 0,
    totalMora: 0,
    guaranteedTotalResin: 0,
    guaranteedNaturalResinDays: 0,
    guaranteedNaturalResinWeeks: 0,
    expectedAdvisoryResin: 0,
    expectedAdvisoryDays: 0,
    expectedAdvisoryWeeks: 0,
    chanceBasedTaskCount: 0,
    timeGatedTaskCount: 0,
    totalEstimatedResin: 0,
    totalEstimatedNaturalResinDays: 0,
    totalEstimatedNaturalResinWeeks: 0,
    weeklyGatedEstimateCount: 0,
    resinGatedEstimateCount: 0,
    openWorldEstimateCount: 0,
    noResinTaskCount: 0,
    unknownEstimateCount: 0,
    dailyResinBudget: 180,
    weeklyResinBudget: 1260,
    artifactBudget: 0,
    ...overrides,
  };
}

function buildPlannerOutputStub(rows: PlannerRecommendation[], summary: ResinSummary): PlannerOutput {
  const base = buildPlannerOutput({
    inventory: {},
    ownership: {
      characters: [],
      weapons: [],
      artifacts: [],
    },
    goals: DEFAULT_GOALS,
    staticData,
    today: "Monday",
    resinSettings: DEFAULT_GOALS.plannerSettings,
  });

  return {
    ...base,
    recommendations: rows,
    plannerReport: {
      summary,
      sections: makeSections(rows),
      warnings: [],
    },
    recommendationSections: makeSections(rows),
  };
}

describe("buildPlannerUiModel", () => {
  it("keeps today domains focused while grouping all needed domains for the week", () => {
    const rows: PlannerRecommendation[] = [
      makeRecommendation({
        id: "mastery-today",
        title: "Farm Taishan Mansion",
        category: "talent_domain",
        actionGroup: "resin_gated",
        actionSubgroup: "domains",
        availability: "MON_THU_SUN",
        sourceName: "Taishan Mansion",
        totalEstimatedResin: 180,
        resinPerRun: 20,
        estimatedRuns: 9,
        actionableRuns: 9,
        isAvailableToday: true,
        requiredMaterials: [{ materialId: "TeachingsOfProsperity", quantity: 9 }],
      }),
      makeRecommendation({
        id: "forgery-later",
        title: "Farm Cecilia Garden",
        category: "weapon_domain",
        actionGroup: "resin_gated",
        actionSubgroup: "domains",
        availability: "TUE_FRI_SUN",
        sourceName: "Cecilia Garden",
        totalEstimatedResin: 360,
        resinPerRun: 20,
        estimatedRuns: 18,
        actionableRuns: 18,
        isAvailableToday: false,
        requiredMaterials: [{ materialId: "TileOfDecarabiansTower", quantity: 12 }],
      }),
    ];

    const plannerOutput = buildPlannerOutputStub(
      rows,
      makeSummary({
        totalEstimatedResin: 540,
        resinGatedEstimateCount: 2,
      }),
    );

    const model = buildPlannerUiModel({
      plannerOutput,
      account: null,
      goals: DEFAULT_GOALS,
      staticData,
      plannerSettings: DEFAULT_GOALS.plannerSettings,
      today: "Monday",
    });

    expect(model.todaySections.find((section) => section.key === "today_domains_mastery")?.rows.map((row) => row.id)).toEqual([
      "mastery-today",
    ]);
    expect(model.todaySections.find((section) => section.key === "today_domains_forgery")).toBeUndefined();
    expect(model.weekDomainGroups.find((group) => group.key === "MON_THU_SUN")?.masteryRows.map((row) => row.id)).toEqual([
      "mastery-today",
    ]);
    expect(model.weekDomainGroups.find((group) => group.key === "TUE_FRI_SUN")?.forgeryRows.map((row) => row.id)).toEqual([
      "forgery-later",
    ]);
    expect(model.weekDomainGroups.find((group) => group.key === "TUE_FRI_SUN")?.forgeryRows[0]?.earliestCompletionLabel).toContain(
      "Friday",
    );
  });

  it("shows boss primary needs as unique boss materials and excludes unknown or route-only tasks from day totals", () => {
    const rows: PlannerRecommendation[] = [
      makeRecommendation({
        id: "boss-row",
        title: "Farm Cryo Regisvine",
        category: "boss",
        actionGroup: "resin_gated",
        actionSubgroup: "bosses",
        availability: "ALWAYS",
        sourceName: "Cryo Regisvine",
        totalEstimatedResin: 160,
        resinPerRun: 40,
        estimatedRuns: 4,
        actionableRuns: 4,
        requiredMaterials: [
          { materialId: "HoarfrostCore", quantity: 12 },
          { materialId: "ShivadaJadeGemstone", quantity: 3 },
        ],
      }),
      makeRecommendation({
        id: "weekly-row",
        title: "Farm Joururi Workshop",
        category: "weekly_boss",
        actionGroup: "resin_gated",
        actionSubgroup: "weekly_resin",
        availability: "WEEKLY",
        sourceName: "Joururi Workshop",
        totalEstimatedResin: 90,
        resinPerRun: null,
        estimatedRuns: 3,
        actionableRuns: 3,
        weeklyGate: {
          isWeeklyGated: true,
          estimatedWeeks: 2,
          rewardLimit: "once_per_boss_per_week",
          discountedClaims: 3,
          fullCostClaims: 0,
        },
        requiredMaterials: [{ materialId: "MirrorOfMushin", quantity: 2 }],
      }),
      makeRecommendation({
        id: "forge-row",
        title: "Forge Mystic Enhancement Ore",
        category: "forging",
        actionGroup: "time_gated_non_resin",
        actionSubgroup: "forging",
        availability: "ALWAYS",
        sourceName: "Mystic Enhancement Ore forging",
        actionableRuns: 4,
        estimatedRuns: 4,
        requiredMaterials: [{ materialId: "MysticEnhancementOre", quantity: 40 }],
      }),
      makeRecommendation({
        id: "open-world-row",
        title: "Farm Hilichurl Shooters",
        category: "custom",
        actionGroup: "open_world",
        availability: "ALWAYS",
        sourceName: "Hilichurl Shooters",
        requiredMaterials: [{ materialId: "FirmArrowhead", quantity: 18 }],
      }),
      makeRecommendation({
        id: "unknown-row",
        title: "Resolve Mystery Ore",
        category: "custom",
        actionGroup: "passive_incidental",
        actionSubgroup: "unknown_estimates",
        availability: "UNKNOWN",
        sourceName: "Unknown source",
        relatedGoalKeys: ["prefarm:CoolSteel"],
        relatedGoalLabels: ["Cool Steel weapon goal"],
        requiredMaterials: [{ materialId: "MysteryOre", quantity: 4 }],
        reason: "Missing source metadata for Mystery Ore.",
      }),
    ];

    const plannerOutput = buildPlannerOutputStub(
      rows,
      makeSummary({
        totalEstimatedResin: 250,
        weeklyGatedEstimateCount: 1,
        resinGatedEstimateCount: 2,
        noResinTaskCount: 2,
        unknownEstimateCount: 1,
      }),
    );

    const model = buildPlannerUiModel({
      plannerOutput,
      account: null,
      goals: DEFAULT_GOALS,
      staticData,
      plannerSettings: DEFAULT_GOALS.plannerSettings,
      today: "Monday",
    });

    const bossRow = model.todaySections.find((section) => section.key === "bosses")?.rows[0];
    const forgingRow = model.standaloneSections.find((section) => section.key === "forging")?.rows[0];

    expect(bossRow?.primaryMaterials.map((material) => material.materialId)).toEqual(["HoarfrostCore"]);
    expect(bossRow?.incidentalMaterials.map((material) => material.materialId)).toEqual(["ShivadaJadeGemstone"]);
    expect(forgingRow?.estimatedDaysLabel).toBe("About 4 daily resets");
    expect(model.summary.totalEstimatedResinDays).toBeCloseTo(250 / 180, 1);
    expect(model.summary.timeGatedEstimateDays).toBeGreaterThanOrEqual(14);
    expect(model.summary.excludedTaskCount).toBe(2);
  });

  it("splits open-world enemy rows into common and elite planner sections", () => {
    const rows: PlannerRecommendation[] = [
      makeRecommendation({
        id: "common-open-world-row",
        title: "Farm Hilichurl Shooters",
        category: "custom",
        actionGroup: "open_world",
        availability: "ALWAYS",
        sourceName: "Hilichurl Shooters",
        requiredMaterials: [{ materialId: "FirmArrowhead", quantity: 18 }],
      }),
      makeRecommendation({
        id: "elite-open-world-row",
        title: "Farm Ruin Guards and Ruin Hunters",
        category: "custom",
        actionGroup: "open_world",
        availability: "ALWAYS",
        sourceName: "Ruin Guards and Ruin Hunters",
        requiredMaterials: [{ materialId: "ChaosCore", quantity: 6 }],
      }),
    ];

    const model = buildPlannerUiModel({
      plannerOutput: buildPlannerOutputStub(
        rows,
        makeSummary({
          openWorldEstimateCount: 2,
          noResinTaskCount: 2,
        }),
      ),
      account: null,
      goals: DEFAULT_GOALS,
      staticData,
      plannerSettings: DEFAULT_GOALS.plannerSettings,
      today: "Monday",
    });

    expect(model.standaloneSections.find((section) => section.key === "open_world_common")?.rows.map((row) => row.id)).toEqual([
      "common-open-world-row",
    ]);
    expect(model.standaloneSections.find((section) => section.key === "open_world_elite")?.rows.map((row) => row.id)).toEqual([
      "elite-open-world-row",
    ]);
  });
});
