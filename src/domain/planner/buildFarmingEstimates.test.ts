import { describe, expect, it } from "vitest";
import { DEFAULT_GOALS } from "../goals/types";
import { loadStaticData } from "../staticData/loadStaticData";
import { buildPlannerOutput } from "./buildPlannerRows";
import { buildFarmingEstimates } from "./buildFarmingEstimates";
import type { SourceAssignment } from "./types";

function assignment(overrides: Partial<SourceAssignment>): SourceAssignment {
  return {
    id: "assignment",
    goalKey: "goal",
    goalType: "character",
    displayName: "Test Goal",
    materialKey: "Mora",
    materialName: "Mora",
    requiredAmount: 0,
    missingAmount: 0,
    kind: "mora",
    availability: "ALWAYS",
    assumptions: [],
    warnings: [],
    sourceType: "ley_line_wealth",
    sourceName: "Blossom of Wealth",
    targetTierIndex: 0,
    ...overrides,
  };
}

describe("planner farming estimates", () => {
  it("groups all Mora deficits into one Blossom of Wealth estimate", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({ goalKey: "goal-a", requiredAmount: 100000, missingAmount: 100000 }),
        assignment({ goalKey: "goal-b", requiredAmount: 25000, missingAmount: 25000 }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        worldLevel: 8,
      },
      today: "Monday",
    });

    expect(result.farmingEstimates).toHaveLength(1);
    expect(result.farmingEstimates[0]?.sourceType).toBe("ley_line_wealth");
    expect(result.farmingEstimates[0]?.estimatedRuns).toBeCloseTo(2.0833333333333335);
    expect(result.farmingEstimates[0]?.actionableRuns).toBe(3);
    expect(result.farmingEstimates[0]?.estimatedResin).toBe(60);
  });

  it("groups character EXP deficits into one Blossom of Revelation estimate using EXP value", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "HerosWit",
          materialName: "Hero's Wit",
          requiredAmount: 4,
          missingAmount: 4,
          kind: "character_exp",
          sourceType: "ley_line_revelation",
          sourceName: "Blossom of Revelation",
        }),
        assignment({
          materialKey: "AdventurersExperience",
          materialName: "Adventurer's Experience",
          requiredAmount: 3,
          missingAmount: 3,
          kind: "character_exp",
          sourceType: "ley_line_revelation",
          sourceName: "Blossom of Revelation",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        worldLevel: 8,
      },
      today: "Monday",
    });

    expect(result.farmingEstimates).toHaveLength(1);
    expect(result.farmingEstimates[0]?.sourceType).toBe("ley_line_revelation");
    expect(result.farmingEstimates[0]?.estimatedRuns).toBeCloseTo(95000 / 110000);
    expect(result.farmingEstimates[0]?.actionableRuns).toBe(1);
    expect(result.farmingEstimates[0]?.estimatedResin).toBe(20);
    expect(result.farmingEstimates[0]?.expectedEstimate.runs).toBeCloseTo(95000 / 122500);
    expect(result.farmingEstimates[0]?.assumptions.some((line) => line.includes("122500"))).toBe(true);
  });

  it("builds one source-level Domain of Mastery estimate and avoids naive per-tier resin overcounting", () => {
    const staticData = loadStaticData();
    const estimates = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "TeachingsOfFreedom",
          materialName: "Teachings of Freedom",
          requiredAmount: 3,
          missingAmount: 3,
          kind: "talent_book",
          sourceType: "domain_of_mastery",
          sourceName: "Forsaken Rift",
          availability: "MON_THU_SUN",
          targetTierIndex: 0,
          talentBookFamilyKey: "Freedom",
        }),
        assignment({
          materialKey: "GuideToFreedom",
          materialName: "Guide to Freedom",
          requiredAmount: 2,
          missingAmount: 2,
          kind: "talent_book",
          sourceType: "domain_of_mastery",
          sourceName: "Forsaken Rift",
          availability: "MON_THU_SUN",
          targetTierIndex: 1,
          talentBookFamilyKey: "Freedom",
        }),
        assignment({
          materialKey: "PhilosophiesOfFreedom",
          materialName: "Philosophies of Freedom",
          requiredAmount: 1,
          missingAmount: 1,
          kind: "talent_book",
          sourceType: "domain_of_mastery",
          sourceName: "Forsaken Rift",
          availability: "MON_THU_SUN",
          targetTierIndex: 2,
          talentBookFamilyKey: "Freedom",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        domainLevel: "IV",
        craftAwareEstimates: true,
      },
      today: "Monday",
    });

    const estimate = estimates.farmingEstimates[0];
    const model = staticData.talentBookDomainDropModel.IV.overall;
    const naiveRuns =
      Math.ceil(3 / (model.twoStar?.average ?? 1)) +
      Math.ceil(2 / (model.threeStar?.average ?? 1)) +
      Math.ceil(1 / (model.fourStar?.average ?? 1));

    expect(estimates.farmingEstimates).toHaveLength(1);
    expect(estimate?.sourceType).toBe("domain_of_mastery");
    expect(estimate?.relatedMaterialKeys).toEqual(
      expect.arrayContaining(["TeachingsOfFreedom", "GuideToFreedom", "PhilosophiesOfFreedom"]),
    );
    expect(estimate?.estimatedRuns).toBe(9);
    expect(estimate?.expectedEstimate.runs).toBeLessThan(naiveRuns);
    expect(estimate?.estimatedResin).toBe((estimate?.actionableRuns ?? 0) * 20);
  });

  it("does not collapse a 44-philosophy deficit into only a few expected Level IV runs", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "PhilosophiesOfVagrancy",
          materialName: "Philosophies of Vagrancy",
          requiredAmount: 44,
          missingAmount: 44,
          kind: "talent_book",
          sourceType: "domain_of_mastery",
          sourceName: "Lightless Capital",
          availability: "WED_SAT_SUN",
          targetTierIndex: 2,
          talentBookFamilyKey: "Vagrancy",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        domainLevel: "IV",
        craftAwareEstimates: true,
      },
      today: "Wednesday",
    });

    const estimate = result.farmingEstimates[0];
    expect(estimate?.guaranteedEstimate.actionableRuns).toBe(198);
    expect(estimate?.expectedEstimate.runs).toBeCloseTo(396 / 10.12, 5);
    expect(estimate?.expectedEstimate.actionableRuns).toBe(40);
    expect(estimate?.expectedEstimate.resin).toBe(800);
  });

  it("uses the max direct-tier runs when craft-aware estimates are disabled", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "TileOfDecarabiansTower",
          materialName: "Tile of Decarabian's Tower",
          requiredAmount: 6,
          missingAmount: 6,
          kind: "weapon_ascension_material",
          sourceType: "domain_of_forgery",
          sourceName: "Cecilia Garden",
          availability: "MON_THU_SUN",
          targetTierIndex: 0,
          weaponAscensionFamilyKey: "Decarabian",
        }),
        assignment({
          materialKey: "DebrisOfDecarabiansCity",
          materialName: "Debris of Decarabian's City",
          requiredAmount: 2,
          missingAmount: 2,
          kind: "weapon_ascension_material",
          sourceType: "domain_of_forgery",
          sourceName: "Cecilia Garden",
          availability: "MON_THU_SUN",
          targetTierIndex: 1,
          weaponAscensionFamilyKey: "Decarabian",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        domainLevel: "IV",
        craftAwareEstimates: false,
      },
      today: "Monday",
    });

    const model = staticData.weaponAscensionDomainDropModel.IV.overall;
    const expectedRuns = Math.max(
      Math.ceil(6 / (model.twoStar?.average ?? 1)),
      Math.ceil(2 / (model.threeStar?.average ?? 1)),
    );
    const expectedEstimatedRuns = Math.max(
      6 / (model.twoStar?.average ?? 1),
      2 / (model.threeStar?.average ?? 1),
    );

    expect(result.farmingEstimates[0]?.estimatedRuns).toBe(6);
    expect(result.farmingEstimates[0]?.actionableRuns).toBe(6);
    expect(result.farmingEstimates[0]?.estimatedResin).toBe(120);
    expect(result.farmingEstimates[0]?.expectedEstimate.runs).toBeCloseTo(expectedEstimatedRuns);
    expect(result.farmingEstimates[0]?.expectedEstimate.actionableRuns).toBe(expectedRuns);
  });

  it("drives normal boss resin only from missing unique boss materials", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "BasaltPillar",
          materialName: "Basalt Pillar",
          requiredAmount: 5,
          missingAmount: 5,
          kind: "normal_boss_material",
          sourceType: "normal_boss",
          sourceName: "Geo Hypostasis",
          targetTierIndex: 0,
          normalBossMaterialKey: "BasaltPillar",
        }),
        assignment({
          materialKey: "PrithivaTopazChunk",
          materialName: "Prithiva Topaz Chunk",
          requiredAmount: 9,
          missingAmount: 9,
          kind: "ascension_gem",
          sourceType: "normal_boss",
          sourceName: "Geo Hypostasis",
          targetTierIndex: 2,
          normalBossMaterialKey: "BasaltPillar",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        worldLevel: 8,
      },
      today: "Monday",
    });

    const estimate = result.farmingEstimates[0];
    expect(estimate?.materialKey).toBe("BasaltPillar");
    expect(estimate?.estimatedRuns).toBe(2.5);
    expect(estimate?.actionableRuns).toBe(3);
    expect(estimate?.estimatedResin).toBe(120);
    expect(estimate?.expectedEstimate.runs).toBeCloseTo(5 / 2.5556);
    expect(estimate?.relatedMaterialKeys).toEqual(expect.arrayContaining(["BasaltPillar", "PrithivaTopazChunk"]));
    expect(estimate?.assumptions.some((line) => line.includes("incidental"))).toBe(true);
  });

  it("supports world level 9 normal boss resin estimates", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "BasaltPillar",
          materialName: "Basalt Pillar",
          requiredAmount: 5,
          missingAmount: 5,
          kind: "normal_boss_material",
          sourceType: "normal_boss",
          sourceName: "Geo Hypostasis",
          targetTierIndex: 0,
          normalBossMaterialKey: "BasaltPillar",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        worldLevel: 9,
      },
      today: "Monday",
    });

    expect(result.farmingEstimates[0]).toMatchObject({
      sourceType: "normal_boss",
      estimatedRuns: 5 / 3,
      actionableRuns: 2,
      estimatedResin: 80,
    });
    expect(result.farmingEstimates[0]?.warnings.some((warning) => warning.includes("guaranteed 3 boss materials"))).toBe(true);
  });

  it("does not create a normal boss resin estimate for gem-only deficits", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "PrithivaTopazChunk",
          materialName: "Prithiva Topaz Chunk",
          requiredAmount: 9,
          missingAmount: 9,
          kind: "ascension_gem",
          sourceType: "normal_boss",
          sourceName: "Geo Hypostasis",
          targetTierIndex: 2,
          normalBossMaterialKey: "BasaltPillar",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        worldLevel: 8,
      },
      today: "Monday",
    });

    expect(result.farmingEstimates.some((estimate) => estimate.sourceType === "normal_boss")).toBe(false);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        type: "planner_advisory",
      }),
    );
  });

  it("uses target-specific weekly mean and source-level weekly scheduling", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "DvalinsPlume",
          materialName: "Dvalin's Plume",
          requiredAmount: 6,
          missingAmount: 6,
          kind: "weekly_boss_material",
          sourceType: "weekly_boss",
          sourceName: "Confront Stormterror",
          availability: "WEEKLY",
          weeklyBossMaterialKey: "DvalinsPlume",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        worldLevel: 8,
        weeklyBossDiscountClaimsUsed: 0,
      },
      today: "Monday",
    });

    expect(result.farmingEstimates[0]?.estimatedRuns).toBeNull();
    expect(result.farmingEstimates[0]?.actionableRuns).toBeNull();
    expect(result.farmingEstimates[0]?.weeklyGate?.estimatedWeeks).toBe(8);
    expect(result.farmingEstimates[0]?.estimatedResin).toBeNull();
    expect(result.farmingEstimates[0]?.expectedEstimate.runs).toBeCloseTo(7.5);
    expect(result.farmingEstimates[0]?.expectedEstimate.resin).toBe(240);
    expect(result.farmingEstimates[0]?.assumptions.some((line) => line.includes("0.8 target-specific"))).toBe(true);
  });

  it("supports world level 9 weekly boss resin estimates", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "DvalinsPlume",
          materialName: "Dvalin's Plume",
          requiredAmount: 6,
          missingAmount: 6,
          kind: "weekly_boss_material",
          sourceType: "weekly_boss",
          sourceName: "Confront Stormterror",
          availability: "WEEKLY",
          weeklyBossMaterialKey: "DvalinsPlume",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        worldLevel: 9,
        weeklyBossDiscountClaimsUsed: 0,
      },
      today: "Monday",
    });

    expect(result.farmingEstimates[0]).toMatchObject({
      sourceType: "weekly_boss",
      estimatedRuns: null,
      actionableRuns: null,
      estimatedResin: null,
      contributesToGuaranteedTotal: false,
    });
    expect(result.farmingEstimates[0]?.expectedEstimate).toMatchObject({
      runs: 9,
      actionableRuns: 9,
      resin: 270,
    });
    expect(result.farmingEstimates[0]?.warnings.some((warning) => warning.includes("2/3 expected target material"))).toBe(true);
  });

  it("does not duplicate weekly scheduling for multiple material goals from the same boss", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "DvalinsPlume",
          materialName: "Dvalin's Plume",
          requiredAmount: 1,
          missingAmount: 1,
          kind: "weekly_boss_material",
          sourceType: "weekly_boss",
          sourceName: "Confront Stormterror",
          availability: "WEEKLY",
        }),
        assignment({
          materialKey: "DvalinsClaw",
          materialName: "Dvalin's Claw",
          requiredAmount: 1,
          missingAmount: 1,
          kind: "weekly_boss_material",
          sourceType: "weekly_boss",
          sourceName: "Confront Stormterror",
          availability: "WEEKLY",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        worldLevel: 8,
      },
      today: "Monday",
    });

    expect(result.farmingEstimates).toHaveLength(1);
    expect(result.farmingEstimates[0]?.estimatedRuns).toBeNull();
    expect(result.farmingEstimates[0]?.expectedEstimate.runs).toBeCloseTo(1.25);
    expect(result.farmingEstimates[0]?.expectedEstimate.actionableRuns).toBe(2);
    expect(result.farmingEstimates[0]?.expectedEstimate.resin).toBe(60);
  });

  it("applies the first-week weekly discount remainder across multiple bosses", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "DvalinsPlume",
          materialName: "Dvalin's Plume",
          requiredAmount: 1,
          missingAmount: 1,
          kind: "weekly_boss_material",
          sourceType: "weekly_boss",
          sourceName: "Confront Stormterror",
          availability: "WEEKLY",
        }),
        assignment({
          materialKey: "TuskOfMonocerosCaeli",
          materialName: "Tusk of Monoceros Caeli",
          requiredAmount: 1,
          missingAmount: 1,
          kind: "weekly_boss_material",
          sourceType: "weekly_boss",
          sourceName: "Enter the Golden House",
          availability: "WEEKLY",
        }),
      ],
      staticData,
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        worldLevel: 8,
        weeklyBossDiscountClaimsUsed: 2,
      },
      today: "Monday",
    });

    const guaranteedResin = result.farmingEstimates.reduce((sum, estimate) => sum + (estimate.estimatedResin ?? 0), 0);
    const expectedResin = result.farmingEstimates.reduce((sum, estimate) => sum + (estimate.expectedEstimate.resin ?? 0), 0);
    expect(guaranteedResin).toBe(0);
    expect(expectedResin).toBe(150);
  });

  it("keeps local specialties and open-world drops out of total resin", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "CallaLily",
          materialName: "Calla Lily",
          requiredAmount: 5,
          missingAmount: 5,
          kind: "local_specialty",
          sourceType: "local_specialty",
          sourceName: "Mondstadt",
        }),
        assignment({
          materialKey: "SlimeConcentrate",
          materialName: "Slime Concentrate",
          requiredAmount: 4,
          missingAmount: 4,
          kind: "general_enemy_drop",
          sourceType: "open_world_enemy",
          sourceName: "Slimes",
        }),
      ],
      staticData,
      resinSettings: DEFAULT_GOALS.plannerSettings,
      today: "Monday",
    });

    expect(result.farmingEstimates.every((estimate) => estimate.estimatedResin === null)).toBe(true);
  });

  it("aggregates open-world enemy tiers by shared source and keeps related deficits in one row", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "MeshingGear",
          materialName: "Meshing Gear",
          requiredAmount: 12,
          missingAmount: 12,
          kind: "elite_enemy_drop",
          sourceType: "open_world_enemy",
          sourceName: "Clockwork Meka",
        }),
        assignment({
          materialKey: "MechanicalSpurGear",
          materialName: "Mechanical Spur Gear",
          requiredAmount: 38,
          missingAmount: 38,
          kind: "elite_enemy_drop",
          sourceType: "open_world_enemy",
          sourceName: "Clockwork Meka",
        }),
      ],
      staticData,
      resinSettings: DEFAULT_GOALS.plannerSettings,
      today: "Monday",
    });

    expect(result.farmingEstimates).toHaveLength(1);
    expect(result.farmingEstimates[0]).toMatchObject({
      sourceType: "open_world_enemy",
      sourceName: "Clockwork Meka",
      estimatedResin: null,
    });
    expect(result.farmingEstimates[0]?.relatedMaterialKeys).toEqual(
      expect.arrayContaining(["MeshingGear", "MechanicalSpurGear"]),
    );
  });

  it("rounds positive fractional deficits up for actionable display", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "LeyLineSprout",
          materialName: "Ley Line Sprout",
          requiredAmount: 52.42333333333333,
          missingAmount: 52.42333333333333,
          kind: "elite_enemy_drop",
          sourceType: "open_world_enemy",
          sourceName: "Abyss Mages",
        }),
      ],
      staticData,
      resinSettings: DEFAULT_GOALS.plannerSettings,
      today: "Monday",
    });

    expect(result.farmingEstimates[0]?.missingAmount).toBe(53);
    expect(result.farmingEstimates[0]?.remainingDeficitsByMaterial.LeyLineSprout).toBe(53);
  });

  it("clamps tiny floating-point deficit noise to zero and omits the row", () => {
    const staticData = loadStaticData();
    const result = buildFarmingEstimates({
      sourceAssignments: [
        assignment({
          materialKey: "DeadLeyLineLeaves",
          materialName: "Dead Ley Line Leaves",
          requiredAmount: 1e-10,
          missingAmount: 1e-10,
          kind: "elite_enemy_drop",
          sourceType: "open_world_enemy",
          sourceName: "Abyss Mages",
        }),
      ],
      staticData,
      resinSettings: DEFAULT_GOALS.plannerSettings,
      today: "Monday",
    });

    expect(result.farmingEstimates).toHaveLength(0);
  });

  it("subtracts owned inventory before source-level estimates and keeps deterministic rows stable", () => {
    const staticData = loadStaticData({
      version: 1,
      characterMaterialProfiles: {
        TestCharacter: {
          characterKey: "TestCharacter",
          gemSeries: ["TestGemSliver", "TestGemFragment", "TestGemChunk", "TestGemstone"],
          localSpecialty: "CallaLily",
          normalBossMaterial: "BasaltPillar",
          enemyDropFamily: ["SlimeCondensate", "SlimeSecretions", "SlimeConcentrate"],
          talentBookFamily: ["TeachingsOfFreedom", "GuideToFreedom", "PhilosophiesOfFreedom"],
          weeklyBossMaterial: "DvalinsPlume",
        },
      },
    });

    const buildInput = (inventory: Record<string, number>, resinSettings = DEFAULT_GOALS.plannerSettings) =>
      buildPlannerOutput({
        inventory,
        ownership: {
          characters: [
            {
              characterId: "TestCharacter",
              currentLevel: 1,
              currentAscension: 0,
              currentTalents: { normal: 1, skill: 1, burst: 1 },
            },
          ],
          weapons: [],
          artifacts: [],
        },
        goals: {
          ...DEFAULT_GOALS,
          characterGoals: {
            TestCharacter: {
              characterKey: "TestCharacter",
              enabled: true,
              priority: 3,
              targetLevel: 90,
              targetAscension: 6,
            },
          },
          weaponGoals: {},
          artifactGoals: [],
        },
        staticData,
        today: "Monday",
        resinSettings,
      });

    const emptyInventory = buildInput({});
    const withBooks = buildInput({ HerosWit: 200, AdventurersExperience: 11, WanderersAdvice: 12 });
    const changedEstimateSettings = buildInput({}, { ...DEFAULT_GOALS.plannerSettings, worldLevel: 5, domainLevel: "II" });

    const emptyExpEstimate = emptyInventory.farmingEstimates.find((estimate) => estimate.sourceType === "ley_line_revelation");
    const coveredExpEstimate = withBooks.farmingEstimates.find((estimate) => estimate.sourceType === "ley_line_revelation");

    expect(coveredExpEstimate?.estimatedRuns ?? 0).toBeLessThan(emptyExpEstimate?.estimatedRuns ?? 0);
    expect(emptyInventory.totalMissingByMaterial.map((row) => [row.materialKey, row.needed])).toEqual(
      changedEstimateSettings.totalMissingByMaterial.map((row) => [row.materialKey, row.needed]),
    );
  });

  it("uses total owned Character EXP book value before estimating Revelation blossoms", () => {
    const staticData = loadStaticData({
      version: 1,
      characterMaterialProfiles: {
        TestCharacter: {
          characterKey: "TestCharacter",
          gemSeries: ["TestGemSliver", "TestGemFragment", "TestGemChunk", "TestGemstone"],
          localSpecialty: "CallaLily",
          normalBossMaterial: "BasaltPillar",
          enemyDropFamily: ["SlimeCondensate", "SlimeSecretions", "SlimeConcentrate"],
          talentBookFamily: ["TeachingsOfFreedom", "GuideToFreedom", "PhilosophiesOfFreedom"],
          weeklyBossMaterial: "DvalinsPlume",
        },
      },
    });
    const planner = buildPlannerOutput({
      inventory: {
        HerosWit: 100,
        AdventurersExperience: 1000,
        WanderersAdvice: 1367,
      },
      ownership: {
        characters: [
          {
            characterId: "TestCharacter",
            currentLevel: 1,
            currentAscension: 0,
            currentTalents: { normal: 1, skill: 1, burst: 1 },
          },
        ],
        weapons: [],
        artifacts: [],
      },
      goals: {
        ...DEFAULT_GOALS,
        characterGoals: {
          TestCharacter: {
            characterKey: "TestCharacter",
            enabled: true,
            priority: 3,
            targetLevel: 90,
            targetAscension: 6,
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      },
      staticData,
      today: "Monday",
      resinSettings: {
        ...DEFAULT_GOALS.plannerSettings,
        worldLevel: 8,
      },
    });

    const expRequirement = planner.deterministicRequirements
      .filter((requirement) => requirement.category === "character_exp")
      .reduce((sum, requirement) => {
        const fallbackValues: Record<string, number> = {
          HerosWit: 20000,
          AdventurersExperience: 5000,
          WanderersAdvice: 1000,
        };
        const material = staticData.materials[requirement.materialKey] as
          | (typeof staticData.materials[string] & { expValue?: number })
          | undefined;
        return sum + requirement.quantityRequired * (material?.characterExpValue ?? fallbackValues[requirement.materialKey] ?? 0);
      }, 0);
    const ownedExp = 100 * 20000 + 1000 * 5000 + 1367 * 1000;

    expect(ownedExp).toBe(expRequirement);
    expect(planner.farmingEstimates.some((estimate) => estimate.sourceType === "ley_line_revelation")).toBe(false);
  });
});
