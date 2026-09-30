import { describe, expect, it } from "vitest";
import type { CraftingPlan } from "../crafting/types";
import { DEFAULT_GOALS } from "../goals/types";
import { loadStaticData } from "../staticData/loadStaticData";
import type { PlannerInput, PlannerRecommendation } from "./types";
import type { FarmingEstimateDetail } from "./buildFarmingEstimates";
import {
  buildCraftingPlannerRecommendations,
  getGoalDisplayName,
  buildMaterialRecommendations,
  buildWeaponExpRecommendation,
  sortRecommendations,
} from "./buildPlannerReport";

const staticData = loadStaticData();

function buildPlannerInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
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
    ...overrides,
  };
}

function estimate(overrides: Partial<FarmingEstimateDetail>): FarmingEstimateDetail {
  return {
    estimateKey: "estimate",
    sourceKey: "source",
    sourceDisplayName: "Source",
    materialKey: "Mora",
    materialName: "Mora",
    missingAmount: 1,
    sourceType: "ley_line_wealth",
    sourceName: "Blossom of Wealth",
    deterministicRequirement: 1,
    relatedGoalKeys: ["goal"],
    relatedMaterialKeys: ["Mora"],
    relatedMaterialDisplayNames: { Mora: "Mora" },
    deterministicRequirementsByMaterial: { Mora: 1 },
    remainingDeficitsByMaterial: { Mora: 1 },
    guaranteedEstimate: {
      available: true,
      canGuarantee: true,
      basis: "Fixed reward",
      outputPerRun: 60000,
      runs: 1,
      actionableRuns: 1,
      resin: 20,
      daysNaturalResin: 20 / 180,
      weeksNaturalResin: 20 / 1260,
      dataQuality: "exact",
      warnings: [],
    },
    expectedEstimate: {
      available: true,
      basis: "Fixed reward",
      outputPerRun: 60000,
      runs: 1,
      actionableRuns: 1,
      resin: 20,
      daysNaturalResin: 20 / 180,
      weeksNaturalResin: 20 / 1260,
      dataQuality: "exact",
      warnings: [],
    },
    contributesToGuaranteedTotal: true,
    estimateClassification: "guaranteed",
    affectedMaterialKeys: ["Mora"],
    deficitsCovered: { Mora: 1 },
    resinCostPerRun: 20,
    estimatedRuns: 1,
    actionableRuns: 1,
    estimatedResin: 20,
    estimatedDaysNaturalResin: 20 / 180,
    estimatedWeeksNaturalResin: 20 / 1260,
    weeklyGate: undefined,
    assumptions: [],
    warnings: [],
    availability: "ALWAYS",
    isAvailableToday: true,
    ...overrides,
  } as FarmingEstimateDetail;
}

function recommendation(overrides: Partial<PlannerRecommendation>): PlannerRecommendation {
  return {
    id: "recommendation",
    title: "Recommendation",
    category: "leyline",
    actionGroup: "resin_gated",
    priority: 1,
    availability: "ALWAYS",
    sourceName: "Source",
    resinCost: 20,
    resinPerRun: 20,
    totalEstimatedResin: 20,
    resinLabel: "20",
    estimatedRuns: 1,
    relatedGoalKeys: ["goal"],
    requiredMaterials: [],
    expectedRewards: [],
    reason: "Test reason",
    blockedBy: [],
    isAvailableToday: true,
    ...overrides,
  };
}

describe("buildPlannerReport helpers", () => {
  it("uses total estimated resin as the main resin label for resin-gated rows", () => {
    const rows = buildMaterialRecommendations(buildPlannerInput(), [
      estimate({
        estimateKey: "wealth",
        sourceKey: "BlossomOfWealth",
        sourceType: "ley_line_wealth",
        sourceName: "Blossom of Wealth",
        missingAmount: 26_100_000,
        deterministicRequirement: 26_100_000,
        remainingDeficitsByMaterial: { Mora: 26_100_000 },
        estimatedRuns: 435,
        estimatedResin: 8700,
      }),
    ]);

    expect(rows[0]).toMatchObject({
      actionGroup: "resin_gated",
      estimatedRuns: 435,
      resinPerRun: 20,
      totalEstimatedResin: 8700,
      resinLabel: "8700",
    });
  });

  it("keeps character EXP books grouped into one Blossom of Revelation recommendation", () => {
    const rows = buildMaterialRecommendations(buildPlannerInput(), [
      estimate({
        estimateKey: "revelation",
        sourceKey: "BlossomOfRevelation",
        sourceType: "ley_line_revelation",
        sourceName: "Blossom of Revelation",
        materialKey: "HerosWit",
        materialName: "Character EXP",
        missingAmount: 7680000,
        deterministicRequirement: 7680000,
        relatedMaterialKeys: ["HerosWit", "WanderersAdvice"],
        relatedMaterialDisplayNames: {
          HerosWit: "Hero's Wit",
          WanderersAdvice: "Wanderer's Advice",
        },
        deterministicRequirementsByMaterial: {
          HerosWit: 384,
          WanderersAdvice: 120,
        },
        remainingDeficitsByMaterial: {
          HerosWit: 384,
          WanderersAdvice: 120,
        },
        estimatedRuns: 63,
        estimatedResin: 1260,
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Farm Blossom of Revelation");
    expect(rows[0]?.reason).toContain("Character EXP value");
    expect(rows[0]?.requiredMaterials).toEqual(
      expect.arrayContaining([
        { materialId: "HerosWit", quantity: 384 },
        { materialId: "WanderersAdvice", quantity: 120 },
      ]),
    );
  });

  it("maps related goals to readable labels instead of exposing raw goal ids", () => {
    const input = buildPlannerInput({
      goals: {
        ...DEFAULT_GOALS,
        characterGoals: {},
        weaponGoals: {
          "prefarm:CoolSteel": {
            id: "prefarm:CoolSteel",
            weaponKey: "CoolSteel",
            enabled: true,
            priority: 3,
            planningMode: "prefarm",
            targetLevel: 40,
            targetAscension: 1,
          },
        },
        artifactGoals: [],
      },
    });

    const rows = buildMaterialRecommendations(input, [
      estimate({
        estimateKey: "weapon-domain",
        sourceKey: "Decarabian",
        sourceDisplayName: "Cecilia Garden",
        sourceType: "domain_of_forgery",
        sourceName: "Cecilia Garden",
        materialKey: "TileOfDecarabiansTower",
        materialName: "Tile of Decarabian's Tower",
        missingAmount: 6,
        deterministicRequirement: 6,
        relatedGoalKeys: ["prefarm:CoolSteel"],
        relatedMaterialKeys: ["TileOfDecarabiansTower"],
        relatedMaterialDisplayNames: {
          TileOfDecarabiansTower: "Tile of Decarabian's Tower",
        },
        deterministicRequirementsByMaterial: {
          TileOfDecarabiansTower: 6,
        },
        remainingDeficitsByMaterial: {
          TileOfDecarabiansTower: 6,
        },
        affectedMaterialKeys: ["TileOfDecarabiansTower"],
        deficitsCovered: { TileOfDecarabiansTower: 6 },
        resinCostPerRun: 20,
        estimatedRuns: 3,
        actionableRuns: 3,
        estimatedResin: 60,
      }),
    ]);

    expect(rows[0]?.relatedGoalLabels).toEqual(["Cool Steel weapon goal"]);
    expect(rows[0]?.relatedGoalLabels).not.toContain("prefarm:CoolSteel");
  });

  it("uses readable character display names for artifact goals", () => {
    const input = buildPlannerInput({
      goals: {
        ...DEFAULT_GOALS,
        characterGoals: {},
        weaponGoals: {},
        artifactGoals: [
          {
            id: "artifact-raiden",
            characterKey: "RaidenShogun",
            targetSetKeys: ["EmblemOfSeveredFate"],
            priority: 3,
            mainStatTargets: {
              sands: [],
              goblet: [],
              circlet: [],
            },
            desiredSubstats: [],
            progress: {
              flowerObtained: false,
              plumeObtained: false,
              sandsObtained: false,
              gobletObtained: false,
              circletObtained: false,
            },
            enabled: true,
          },
        ],
      },
    });

    expect(getGoalDisplayName("artifact-raiden", input)).toBe("Raiden Shogun artifact goal");
  });

  it("reports weekly boss resin using the exact discounted/full-cost schedule instead of an averaged per-run cost", () => {
    const rows = buildMaterialRecommendations(buildPlannerInput(), [
      estimate({
        estimateKey: "stormterror",
        sourceKey: "ConfrontStormterror",
        sourceType: "weekly_boss",
        sourceName: "Confront Stormterror",
        materialKey: "DvalinsPlume",
        materialName: "Dvalin's Plume",
        missingAmount: 6,
        deterministicRequirement: 6,
        remainingDeficitsByMaterial: { DvalinsPlume: 6 },
        estimatedRuns: null,
        actionableRuns: null,
        estimatedResin: null,
        contributesToGuaranteedTotal: false,
        estimateClassification: "chance_based",
        guaranteedEstimate: {
          available: false,
          canGuarantee: false,
          basis: "Chance-based weekly target material",
          outputPerRun: null,
          runs: null,
          actionableRuns: null,
          resin: null,
          daysNaturalResin: null,
          weeksNaturalResin: null,
          dataQuality: "exact",
          warnings: [],
        },
        expectedEstimate: {
          available: true,
          basis: "Weekly boss mean",
          outputPerRun: 0.8,
          runs: 6,
          actionableRuns: 6,
          resin: 270,
          daysNaturalResin: 1.5,
          weeksNaturalResin: 0.21,
          dataQuality: "observed_estimate",
          warnings: [],
        },
        weeklyGate: {
          isWeeklyGated: true,
          estimatedWeeks: 3,
          rewardLimit: "once_per_boss_per_week",
          discountedClaims: 3,
          fullCostClaims: 3,
        },
      }),
    ]);

    expect(rows[0]).toMatchObject({
      title: "Farm Confront Stormterror",
      totalEstimatedResin: null,
      expectedAdvisoryResin: 270,
      resinPerRun: null,
    });
    expect(rows[0]?.reason).toContain("3 discounted claim(s) and 3 full-cost claim(s)");
    expect(rows[0]?.reason).toContain("advisory only");
  });

  it("marks known non-resin source recommendations as No resin", () => {
    const rows = buildMaterialRecommendations(buildPlannerInput(), [
      estimate({
        estimateKey: "enemy",
        sourceKey: "ClockworkMeka",
        sourceType: "open_world_enemy",
        sourceName: "Clockwork Meka",
        materialKey: "MeshingGear",
        materialName: "Meshing Gear",
        missingAmount: 12,
        estimatedRuns: null,
        estimatedResin: null,
      }),
    ]);

    expect(rows[0]).toMatchObject({
      actionGroup: "open_world",
      totalEstimatedResin: null,
      resinLabel: "No resin",
    });
    expect(rows[0]?.reason).toContain("No resin");
  });

  it("keeps crafting and grouped weapon EXP forging out of resin-gated rows", () => {
    const craftingPlan: CraftingPlan = {
      reports: [],
      suggestions: [
        {
          outputMaterialKey: "PhilosophiesOfMoonlight",
          outputDisplayName: "Philosophies of Moonlight",
          craftableQuantity: 8,
          missingQuantityCovered: 8,
          ingredientsConsumed: { GuideToMoonlight: 24 },
          reason: "Craft 8 Philosophies of Moonlight to cover 8 missing units, costing 4400 Mora.",
          moraCost: 4400,
          steps: [],
        },
      ],
      warnings: [],
      guaranteedCoverageByMaterial: {},
      guaranteedRemainingByMaterial: {},
      expectedCoverageByMaterial: {},
      craftingMoraByMaterial: {},
      totalCraftingMora: 4400,
      progressionMora: 0,
      totalMora: 4400,
    };

    const craftingRows = buildCraftingPlannerRecommendations(craftingPlan);
    const forgingRows = buildWeaponExpRecommendation(
      {
        totalWeaponExpNeeded: 340000,
        totalWeaponLevelingMoraNeeded: 34000,
        ownedWeaponExpValue: 10000,
        remainingWeaponExpAfterOwnedOre: 330000,
        mysticEquivalentNeeded: 33,
        enhancementOreOwned: 0,
        fineEnhancementOreOwned: 0,
        mysticEnhancementOreOwned: 1,
        crystalChunkOwned: 120,
        rainbowdropCrystalOwned: 0,
        condessenceCrystalOwned: 0,
        mysticForgeableFromCrystals: 30,
        remainingMysticEquivalentUnforgeable: 3,
        dailyMysticForgeCap: 40,
        minimumDailyResetsRequired: 1,
        oreRespawnDays: 3,
        notes: [],
      },
      [{ key: "weapon-1", label: "Test Weapon goal" }],
    );

    expect(craftingRows[0]).toMatchObject({
      actionGroup: "crafting",
      resinLabel: "No resin",
    });
    expect(forgingRows[0]).toMatchObject({
      actionGroup: "time_gated_non_resin",
      resinLabel: "No resin",
      totalEstimatedResin: null,
      relatedGoalLabels: ["Test Weapon goal"],
    });
  });

  it("sorts recommendations by actionable group before local priority", () => {
    const rows = sortRecommendations([
      recommendation({ id: "open-world", actionGroup: "open_world", priority: 999, title: "Farm Slimes", totalEstimatedResin: null, resinLabel: "No resin", resinPerRun: null, resinCost: 0 }),
      recommendation({ id: "crafting", actionGroup: "crafting", priority: 5, title: "Craft Books", totalEstimatedResin: null, resinLabel: "No resin", resinPerRun: null, resinCost: 0 }),
      recommendation({ id: "resin", actionGroup: "resin_gated", priority: 1, title: "Farm Blossom of Wealth", totalEstimatedResin: 400, resinLabel: "400", resinPerRun: 20, resinCost: 400 }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(["resin", "crafting", "open-world"]);
  });
});
