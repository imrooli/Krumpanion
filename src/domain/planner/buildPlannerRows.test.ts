import exampleGood from "../../../examples/good.minimal.example.json";
import exampleGoals from "../../../examples/goals.example.json";
import { describe, expect, it } from "vitest";
import { importGoodAccountFromText } from "../../adapters/goodImport";
import type { ImportedAccountState } from "../account/types";
import type { KrumpanionGoals } from "../goals/types";
import { loadStaticData } from "../staticData/loadStaticData";
import { buildPlannerOutput } from "./buildPlannerRows";

function buildPlannerInput(account: ImportedAccountState | null, overrides: Record<string, unknown> = {}) {
  return {
    inventory: account?.inventory ?? {},
    ownership: {
      characters: account?.characters ?? [],
      weapons: account?.weapons ?? [],
      artifacts: account?.artifacts ?? [],
    },
    ...overrides,
  };
}

describe("buildPlannerOutput", () => {
  it("builds partial planner rows without crashing on unknown materials", () => {
    const imported = importGoodAccountFromText(
      JSON.stringify({
      ...exampleGood,
      materials: {
        ...exampleGood.materials,
        FutureMaterial: 8,
      },
    }),
    );

    const planner = buildPlannerOutput({
      ...buildPlannerInput(imported.account),
      goals: exampleGoals as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Tuesday",
      resinSettings: exampleGoals.plannerSettings,
    });

    expect(planner.totalMissingByMaterial.length).toBeGreaterThan(0);
    expect(planner.byAvailability.some((group) => group.key === "TUE_FRI_SUN")).toBe(true);
    expect(planner.artifactFarmGoals[0]?.domainName).toBe("Denouement of Sin");
    expect(planner.today[0]?.reason).toContain("Estimated");
    expect(planner.goalResolutions.length).toBe(planner.byCharacter.length + planner.byWeapon.length);
    expect(planner.plannerGoals.length).toBeGreaterThan(0);
    expect(planner.exactRequirementsByMaterial.length).toBeGreaterThan(0);
    expect(planner.summary.totalMora).toBe(planner.summary.progressionMora + planner.summary.craftingMora);
  });

  it("exposes deterministic requirements, inventory coverage, and exact deficits as separate planner stages", () => {
    const planner = buildPlannerOutput({
      ...buildPlannerInput({
        importMeta: {
          format: "GOOD",
          version: 1,
          importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
        },
        characters: [
          {
            characterId: "Zhongli",
            currentLevel: 1,
            currentAscension: 0,
            currentTalents: {
              normal: 1,
              skill: 1,
              burst: 1,
            },
          },
        ],
        weapons: [],
        artifacts: [],
        inventory: {
          BasaltPillar: 5,
          SlimeConcentrate: 3,
        },
        warnings: [],
      }),
      goals: {
        ...exampleGoals,
        characterGoals: {
          Zhongli: {
            characterKey: "Zhongli",
            enabled: true,
            priority: 3,
            targetLevel: 90,
            targetAscension: 6,
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    expect(planner.deterministicRequirements.length).toBeGreaterThan(0);
    expect(planner.inventoryCoverage.length).toBeGreaterThan(0);
    expect(planner.materialDeficits.every((deficit) => deficit.missingQuantity >= 0)).toBe(true);
    expect(
      planner.materialDeficits.every((deficit) => Number.isInteger(deficit.missingQuantity)),
    ).toBe(true);
    expect(planner.plannerReport.summary.totalEstimatedResin).toBe(planner.resinSummary.totalEstimatedResin);

    const deterministicBossMaterial = planner.deterministicRequirements.find(
      (requirement) => requirement.materialKey === "BasaltPillar",
    );
    const inventoryCoverage = planner.inventoryCoverage.find((coverage) => coverage.materialKey === "BasaltPillar");
    const deficit = planner.materialDeficits.find((item) => item.materialKey === "BasaltPillar");

    expect(deterministicBossMaterial?.quantityRequired).toBe(46);
    expect(inventoryCoverage?.quantityOwned).toBe(5);
    expect(inventoryCoverage?.remainingAfterInventory).toBe(41);
    expect(deficit?.missingQuantity).toBe(41);
  });

  it("keeps deterministic rows separate from calculator rows and reports crafting resin impact", () => {
    const planner = buildPlannerOutput({
      ...buildPlannerInput(importGoodAccountFromText(JSON.stringify(exampleGood)).account),
      goals: exampleGoals as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Sunday",
      resinSettings: exampleGoals.plannerSettings,
    });

    const moraExact = planner.exactRequirementsByMaterial.find((row) => row.materialKey === "Mora");
    const moraCalculator = planner.totalMissingByMaterial.find((row) => row.materialKey === "Mora");

    expect(moraExact?.progressionNeeded).toBe(moraExact?.needed);
    expect(moraCalculator?.needed).toBeGreaterThanOrEqual(moraCalculator?.progressionNeeded ?? 0);
    expect(planner.recommendationSections.some((section) => section.key === "crafting")).toBe(true);
    expect(planner.craftingPlan.reports.every((report) => report.resinImpact.resinBeforeCrafting !== undefined)).toBe(true);
  });

  it("groups priority recommendations by actionable section instead of legacy raw-priority buckets", () => {
    const planner = buildPlannerOutput({
      ...buildPlannerInput(importGoodAccountFromText(JSON.stringify(exampleGood)).account),
      goals: exampleGoals as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Sunday",
      resinSettings: exampleGoals.plannerSettings,
    });

    expect(planner.recommendationSections.map((section) => section.key)).toEqual(
      expect.arrayContaining(["resin_gated", "crafting"]),
    );
    expect(planner.today.every((row) => row.actionGroup)).toBe(true);
  });

  it("uses lower-tier elite enemy drops before reporting a final weapon deficit", () => {
    const staticData = loadStaticData({
      version: 1,
      weapons: {
        TestEliteWeapon: {
          key: "TestEliteWeapon",
          displayName: "Test Elite Weapon",
          rarity: 5,
        },
      },
      weaponProgressions: {
        TestEliteWeapon: {
          key: "TestEliteWeapon",
          levelTotals: { "1": {}, "90": {} },
          ascensionTotals: {
            "0": {},
            "6": {
              RadiantExoskeleton: 5,
            },
          },
        },
      },
      legacyExactWeaponProgressions: {
        TestEliteWeapon: {
          key: "TestEliteWeapon",
          levelTotals: { "1": {}, "90": {} },
          ascensionTotals: {
            "0": {},
            "6": {
              RadiantExoskeleton: 5,
            },
          },
        },
      },
    });

    const account: ImportedAccountState = {
      importMeta: {
        format: "GOOD",
        version: 1,
        importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
      },
      characters: [],
      weapons: [
        {
          weaponInstanceId: "weapon-1",
          weaponKey: "TestEliteWeapon",
          weaponId: "TestEliteWeapon",
          currentLevel: 1,
          currentAscension: 0,
        },
      ],
      artifacts: [],
      inventory: {
        RadiantExoskeleton: 2,
        GlowingRemains: 9,
      },
      warnings: [],
    };

    const planner = buildPlannerOutput({
      ...buildPlannerInput(account),
      goals: {
        ...exampleGoals,
        weaponGoals: {
          "weapon-1": {
            id: "weapon-1",
            weaponKey: "TestEliteWeapon",
            targetLevel: 90,
            targetAscension: 6,
            enabled: true,
          },
        },
        characterGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData,
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    const row = planner.totalMissingByMaterial.find((item) => item.materialKey === "RadiantExoskeleton");
    expect(row).toBeDefined();
    expect(row?.owned).toBe(2);
    expect(row?.craftableQuantity).toBe(3);
    expect(row?.effectiveDeficit).toBe(0);
  });

  it("uses lower-tier general enemy drops before reporting a final character deficit", () => {
    const staticData = loadStaticData({
      version: 1,
      characterProgressions: {
        TestCharacter: {
          key: "TestCharacter",
          levelTotals: { "1": {}, "90": {} },
          ascensionTotals: {
            "0": {},
            "6": {
              SlimeConcentrate: 5,
            },
          },
          talentTotals: { "1": {} },
        },
      },
      legacyExactCharacterProgressions: {
        TestCharacter: {
          key: "TestCharacter",
          levelTotals: { "1": {}, "90": {} },
          ascensionTotals: {
            "0": {},
            "6": {
              SlimeConcentrate: 5,
            },
          },
          talentTotals: { "1": {} },
        },
      },
    });

    const account: ImportedAccountState = {
      importMeta: {
        format: "GOOD",
        version: 1,
        importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
      },
      characters: [
        {
          characterId: "TestCharacter",
          currentLevel: 1,
          currentAscension: 0,
          currentTalents: {
            normal: 1,
            skill: 1,
            burst: 1,
          },
        },
      ],
      weapons: [],
      artifacts: [],
      inventory: {
        SlimeConcentrate: 2,
        SlimeSecretions: 9,
      },
      warnings: [],
    };

    const planner = buildPlannerOutput({
      ...buildPlannerInput(account),
      goals: {
        ...exampleGoals,
        characterGoals: {
          TestCharacter: {
            characterKey: "TestCharacter",
            targetLevel: 90,
            targetAscension: 6,
            talents: {
              auto: 1,
              skill: 1,
              burst: 1,
            },
            enabled: true,
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData,
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    const row = planner.totalMissingByMaterial.find((item) => item.materialKey === "SlimeConcentrate");
    expect(row).toBeDefined();
    expect(row?.owned).toBe(2);
    expect(row?.craftableQuantity).toBe(3);
    expect(row?.effectiveDeficit).toBe(0);
  });

  it("uses direct subtraction only for local specialty deficits", () => {
    const staticData = loadStaticData({
      version: 1,
      characterProgressions: {
        TestLocalSpecialtyCharacter: {
          key: "TestLocalSpecialtyCharacter",
          levelTotals: { "1": {}, "90": {} },
          ascensionTotals: {
            "0": {},
            "6": {
              CallaLily: 5,
            },
          },
          talentTotals: { "1": {} },
        },
      },
      legacyExactCharacterProgressions: {
        TestLocalSpecialtyCharacter: {
          key: "TestLocalSpecialtyCharacter",
          levelTotals: { "1": {}, "90": {} },
          ascensionTotals: {
            "0": {},
            "6": {
              CallaLily: 5,
            },
          },
          talentTotals: { "1": {} },
        },
      },
    });

    const account: ImportedAccountState = {
      importMeta: {
        format: "GOOD",
        version: 1,
        importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
      },
      characters: [
        {
          characterId: "TestLocalSpecialtyCharacter",
          currentLevel: 1,
          currentAscension: 0,
          currentTalents: {
            normal: 1,
            skill: 1,
            burst: 1,
          },
        },
      ],
      weapons: [],
      artifacts: [],
      inventory: {
        CallaLily: 2,
      },
      warnings: [],
    };

    const planner = buildPlannerOutput({
      ...buildPlannerInput(account),
      goals: {
        ...exampleGoals,
        characterGoals: {
          TestLocalSpecialtyCharacter: {
            characterKey: "TestLocalSpecialtyCharacter",
            targetLevel: 90,
            targetAscension: 6,
            talents: {
              auto: 1,
              skill: 1,
              burst: 1,
            },
            enabled: true,
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData,
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    const row = planner.totalMissingByMaterial.find((item) => item.materialKey === "CallaLily");
    expect(row).toBeDefined();
    expect(row?.owned).toBe(2);
    expect(row?.craftableQuantity).toBe(0);
    expect(row?.effectiveDeficit).toBe(3);
    expect(row?.region).toBe("Mondstadt");
    expect(row?.purchaseVendors).toEqual(["Flora"]);
  });

  it("derives required ascensions from the target level even when target ascension is omitted", () => {
    const staticData = loadStaticData({
      version: 1,
      characterMaterialProfiles: {
        TestCharacter: {
          characterKey: "TestCharacter",
          gemSeries: ["TestGemSliver", "TestGemFragment", "TestGemChunk", "TestGemstone"],
          localSpecialty: "TestLocalSpecialty",
          normalBossMaterial: "TestBossMaterial",
          enemyDropFamily: ["TestEnemyLow", "TestEnemyMid", "TestEnemyHigh"],
          talentBookFamily: ["TestTeachings", "TestGuide", "TestPhilosophies"],
          weeklyBossMaterial: "TestWeeklyBoss",
        },
      },
    });

    const account: ImportedAccountState = {
      importMeta: {
        format: "GOOD",
        version: 1,
        importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
      },
      characters: [
        {
          characterId: "TestCharacter",
          currentLevel: 1,
          currentAscension: 0,
          currentTalents: {
            normal: 1,
            skill: 1,
            burst: 1,
          },
        },
      ],
      weapons: [],
      artifacts: [],
      inventory: {},
      warnings: [],
    };

    const planner = buildPlannerOutput({
      ...buildPlannerInput(account),
      goals: {
        ...exampleGoals,
        characterGoals: {
          TestCharacter: {
            characterKey: "TestCharacter",
            targetLevel: 90,
            enabled: true,
            priority: 3,
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData,
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    const specialtyRow = planner.totalMissingByMaterial.find((row) => row.materialKey === "TestLocalSpecialty");
    const bossRow = planner.totalMissingByMaterial.find((row) => row.materialKey === "TestBossMaterial");
    expect(specialtyRow?.needed).toBe(168);
    expect(bossRow?.needed).toBe(46);
  });

  it("reports when a talent goal needs a higher ascension phase and includes the required ascension costs", () => {
    const staticData = loadStaticData({
      version: 1,
      characterMaterialProfiles: {
        TestTalentCharacter: {
          characterKey: "TestTalentCharacter",
          gemSeries: ["TestGemSliver", "TestGemFragment", "TestGemChunk", "TestGemstone"],
          localSpecialty: "TestLocalSpecialty",
          normalBossMaterial: "TestBossMaterial",
          enemyDropFamily: ["TestEnemyLow", "TestEnemyMid", "TestEnemyHigh"],
          talentBookFamily: ["TestTeachings", "TestGuide", "TestPhilosophies"],
          weeklyBossMaterial: "TestWeeklyBoss",
        },
      },
    });

    const account: ImportedAccountState = {
      importMeta: {
        format: "GOOD",
        version: 1,
        importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
      },
      characters: [
        {
          characterId: "TestTalentCharacter",
          currentLevel: 70,
          currentAscension: 4,
          currentTalents: {
            normal: 1,
            skill: 6,
            burst: 1,
          },
        },
      ],
      weapons: [],
      artifacts: [],
      inventory: {},
      warnings: [],
    };

    const planner = buildPlannerOutput({
      ...buildPlannerInput(account),
      goals: {
        ...exampleGoals,
        characterGoals: {
          TestTalentCharacter: {
            characterKey: "TestTalentCharacter",
            enabled: true,
            priority: 3,
            talents: {
              skill: 9,
            },
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData,
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    expect(
      planner.warnings.some(
        (warning) =>
          warning.type === "insufficient_ascension_for_talent_goal" &&
          warning.key === "TestTalentCharacter" &&
          warning.message.includes("phase 6"),
      ),
    ).toBe(true);
    expect(planner.totalMissingByMaterial.some((row) => row.materialKey === "TestLocalSpecialty")).toBe(true);
    expect(planner.totalMissingByMaterial.some((row) => row.materialKey === "TestBossMaterial")).toBe(true);
    expect(planner.totalMissingByMaterial.find((row) => row.materialKey === "TestPhilosophies")?.needed).toBe(22);
  });

  it("does not surface post-90 special progression materials in the standard planner deficit tables", () => {
    const staticData = loadStaticData({
      version: 1,
      characterMaterialProfiles: {
        TestPost90Character: {
          characterKey: "TestPost90Character",
          gemSeries: ["TestGemSliver", "TestGemFragment", "TestGemChunk", "TestGemstone"],
          localSpecialty: "TestLocalSpecialty",
          normalBossMaterial: "TestBossMaterial",
          enemyDropFamily: ["TestEnemyLow", "TestEnemyMid", "TestEnemyHigh"],
          talentBookFamily: ["TestTeachings", "TestGuide", "TestPhilosophies"],
          weeklyBossMaterial: "TestWeeklyBoss",
          post90ResourceKey: "MasterlessStellaFortuna",
        },
      },
    });

    const account: ImportedAccountState = {
      importMeta: {
        format: "GOOD",
        version: 1,
        importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
      },
      characters: [
        {
          characterId: "TestPost90Character",
          currentLevel: 90,
          currentAscension: 6,
          currentTalents: {
            normal: 1,
            skill: 1,
            burst: 1,
          },
        },
      ],
      weapons: [],
      artifacts: [],
      inventory: {},
      warnings: [],
    };

    const planner = buildPlannerOutput({
      ...buildPlannerInput(account),
      goals: {
        ...exampleGoals,
        characterGoals: {
          TestPost90Character: {
            characterKey: "TestPost90Character",
            targetLevel: 95,
            targetAscension: 7,
            enabled: true,
            priority: 3,
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData,
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
      enablePost90Planning: true,
    });

    expect(planner.byCharacter[0]?.missingByMaterial.MasterlessStellaFortuna).toBeUndefined();
    expect(planner.warnings.some((warning) => warning.type === "post_90_profile_incomplete")).toBe(false);
  });

  it("builds exact weapon milestone costs from the seeded range and ascension tables", () => {
    const staticData = loadStaticData({
      version: 1,
      weapons: {
        TestWeapon: {
          key: "TestWeapon",
          displayName: "Test Weapon",
          rarity: 5,
          weaponType: "Sword",
        },
      },
      weaponMaterialProfiles: {
        TestWeapon: {
          weaponKey: "TestWeapon",
          rarity: 5,
          weaponType: "Sword",
          weaponAscensionMaterialFamily: ["WeaponTier2", "WeaponTier3", "WeaponTier4", "WeaponTier5"],
          eliteEnemyFamily: ["Elite2", "Elite3", "Elite4"],
          commonEnemyFamily: ["Common1", "Common2", "Common3"],
        },
      },
    });

    const account: ImportedAccountState = {
      importMeta: {
        format: "GOOD",
        version: 1,
        importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
      },
      characters: [],
      weapons: [
        {
          weaponInstanceId: "weapon-1",
          weaponKey: "TestWeapon",
          weaponId: "TestWeapon",
          currentLevel: 1,
          currentAscension: 0,
        },
      ],
      artifacts: [],
      inventory: {},
      warnings: [],
    };

    const planner = buildPlannerOutput({
      ...buildPlannerInput(account),
      goals: {
        ...exampleGoals,
        weaponGoals: {
          "weapon-1": {
            id: "weapon-1",
            weaponKey: "TestWeapon",
            targetLevel: 90,
            targetAscension: 6,
            enabled: true,
            priority: 5,
          },
        },
        characterGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData,
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    const plan = planner.byWeapon[0];
    expect(plan.breakdown).toHaveLength(13);
    expect(plan.missingByMaterial.Mora).toBe(1131480);
    expect(plan.missingByMaterial.MysticEnhancementOre).toBe(903);
    expect(plan.missingByMaterial.WeaponTier5).toBe(6);
    expect(plan.missingByMaterial.Elite4).toBe(41);
    expect(plan.missingByMaterial.Common3).toBe(27);
  });

  it("reduces linked owned weapon goal costs to zero once the owned copy reaches the target", () => {
    const account: ImportedAccountState = {
      importMeta: {
        format: "GOOD",
        version: 1,
        importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
      },
      characters: [],
      weapons: [
        {
          weaponInstanceId: "weapon-favonius",
          weaponKey: "FavoniusSword",
          weaponId: "FavoniusSword",
          currentLevel: 90,
          currentAscension: 6,
          refinement: 5,
          equippedByCharacterId: "Furina",
          location: "Furina",
          lock: true,
        },
      ],
      artifacts: [],
      inventory: {},
      warnings: [],
    };

    const planner = buildPlannerOutput({
      ...buildPlannerInput(account),
      goals: {
        ...exampleGoals,
        characterGoals: {},
        weaponGoals: {
          "weapon-goal-favonius": {
            goalId: "weapon-goal-favonius",
            id: "weapon-goal-favonius",
            accountId: "test-account",
            weaponKey: "FavoniusSword",
            linkedInventoryInstanceId: "weapon-favonius",
            useOwnedInstance: true,
            linkStatus: "linked",
            enabled: true,
            priority: 3,
            targetLevel: 90,
            targetAscensionPhase: 6,
          },
        },
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    const plan = planner.byWeapon.find((entry) => entry.goalKey === "weapon-goal-favonius");
    expect(plan).toBeDefined();
    expect(plan?.breakdown).toHaveLength(0);
    expect(plan?.missingByMaterial).toEqual({});
    expect(plan?.estimatedResin).toBe(0);
  });

  it("warns on partial weapon level ranges instead of approximating EXP costs", () => {
    const staticData = loadStaticData({
      version: 1,
      weapons: {
        TestWeapon: {
          key: "TestWeapon",
          displayName: "Test Weapon",
          rarity: 4,
          weaponType: "Bow",
        },
      },
      weaponMaterialProfiles: {
        TestWeapon: {
          weaponKey: "TestWeapon",
          rarity: 4,
          weaponType: "Bow",
          weaponAscensionMaterialFamily: ["WeaponTier2", "WeaponTier3", "WeaponTier4", "WeaponTier5"],
          eliteEnemyFamily: ["Elite2", "Elite3", "Elite4"],
          commonEnemyFamily: ["Common1", "Common2", "Common3"],
        },
      },
    });

    const account: ImportedAccountState = {
      importMeta: {
        format: "GOOD",
        version: 1,
        importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
      },
      characters: [],
      weapons: [
        {
          weaponInstanceId: "weapon-1",
          weaponKey: "TestWeapon",
          weaponId: "TestWeapon",
          currentLevel: 25,
          currentAscension: 1,
        },
      ],
      artifacts: [],
      inventory: {},
      warnings: [],
    };

    const planner = buildPlannerOutput({
      ...buildPlannerInput(account),
      goals: {
        ...exampleGoals,
        weaponGoals: {
          "weapon-1": {
            id: "weapon-1",
            weaponKey: "TestWeapon",
            targetLevel: 40,
            targetAscension: 1,
            enabled: true,
            priority: 5,
          },
        },
        characterGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData,
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    const plan = planner.byWeapon[0];
    expect(plan.warnings.some((warning) => warning.type === "weapon_partial_level_range_requires_curve")).toBe(true);
    expect(plan.missingByMaterial.MysticEnhancementOre).toBeUndefined();
    expect(plan.breakdown).toHaveLength(0);
  });

  it("includes owned and prefarm character goals together without requiring GOOD ownership for the prefarm target", () => {
    const account: ImportedAccountState = {
      importMeta: {
        format: "GOOD",
        version: 1,
        importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
      },
      characters: [
        {
          characterId: "Furina",
          currentLevel: 70,
          currentAscension: 4,
          currentTalents: {
            normal: 1,
            skill: 8,
            burst: 8,
          },
        },
      ],
      weapons: [],
      artifacts: [],
      inventory: {
        Mora: 5000,
      },
      warnings: [],
    };

    const planner = buildPlannerOutput({
      ...buildPlannerInput(account),
      goals: {
        ...exampleGoals,
        characterGoals: {
          Furina: {
            characterKey: "Furina",
            enabled: true,
            priority: 3,
            planningMode: "owned",
            targetLevel: 90,
          },
          Mavuika: {
            characterKey: "Mavuika",
            enabled: true,
            priority: 4,
            planningMode: "prefarm",
            targetLevel: 90,
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    expect(planner.byCharacter.map((plan) => plan.characterKey)).toEqual(expect.arrayContaining(["Furina", "Mavuika"]));
    expect(planner.totalMissingByMaterial.length).toBeGreaterThan(0);
  });

  it("excludes paused character and weapon goals from planner output while retaining active goals", () => {
    const planner = buildPlannerOutput({
      ...buildPlannerInput({
        importMeta: {
          format: "GOOD",
          version: 1,
          importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
        },
        characters: [
          {
            characterId: "Furina",
            currentLevel: 70,
            currentAscension: 4,
            currentTalents: {
              normal: 1,
              skill: 8,
              burst: 8,
            },
          },
        ],
        weapons: [
          {
            weaponInstanceId: "weapon-cool-steel",
            weaponKey: "CoolSteel",
            weaponId: "CoolSteel",
            currentLevel: 1,
            currentAscension: 0,
          },
        ],
        artifacts: [],
        inventory: {},
        warnings: [],
      }),
      goals: {
        ...exampleGoals,
        characterGoals: {
          Furina: {
            characterKey: "Furina",
            enabled: true,
            paused: false,
            priority: 3,
            planningMode: "owned",
            targetLevel: 90,
          },
          Mavuika: {
            characterKey: "Mavuika",
            enabled: true,
            paused: true,
            priority: 4,
            planningMode: "prefarm",
            targetLevel: 90,
          },
        },
        weaponGoals: {
          "weapon-cool-steel": {
            id: "weapon-cool-steel",
            weaponKey: "CoolSteel",
            enabled: true,
            paused: true,
            priority: 3,
            planningMode: "owned",
            linkedInventoryInstanceId: "weapon-cool-steel",
            useOwnedInstance: true,
            targetLevel: 40,
            targetAscensionPhase: 1,
          },
        },
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    expect(planner.byCharacter.map((plan) => plan.characterKey)).toEqual(["Furina"]);
    expect(planner.byWeapon).toHaveLength(0);
    expect(planner.plannerGoals.some((goal) => goal.entityKey === "Mavuika")).toBe(false);
    expect(planner.plannerGoals.some((goal) => goal.entityKey === "CoolSteel")).toBe(false);
  });

  it("supports unowned prefarm weapon goals from level 1 without an imported weapon instance", () => {
    const planner = buildPlannerOutput({
      ...buildPlannerInput({
        importMeta: {
          format: "GOOD",
          version: 1,
          importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
        },
        characters: [],
        weapons: [],
        artifacts: [],
        inventory: {},
        warnings: [],
      }),
      goals: {
        ...exampleGoals,
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
      } as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    expect(planner.byWeapon[0]?.weaponKey).toBe("CoolSteel");
    expect(planner.byWeapon[0]?.missingByMaterial.Mora).toBeGreaterThan(0);
  });

  it("traces talent-book usage by exact material key without cross-linking Jahoda and Neuvillette", () => {
    const planner = buildPlannerOutput({
      ...buildPlannerInput({
        importMeta: {
          format: "GOOD",
          version: 1,
          importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
        },
        characters: [],
        weapons: [],
        artifacts: [],
        inventory: {},
        warnings: [],
      }),
      goals: {
        ...exampleGoals,
        characterGoals: {
          Jahoda: {
            characterKey: "Jahoda",
            enabled: true,
            priority: 3,
            planningMode: "prefarm",
            talents: {
              skill: 10,
            },
          },
          Neuvillette: {
            characterKey: "Neuvillette",
            enabled: true,
            priority: 3,
            planningMode: "prefarm",
            talents: {
              skill: 10,
              burst: 10,
            },
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    const equityRow = planner.exactRequirementsByMaterial.find((row) => row.materialKey === "PhilosophiesOfEquity");
    const vagrancyRow = planner.exactRequirementsByMaterial.find((row) => row.materialKey === "PhilosophiesOfVagrancy");

    expect(equityRow).toBeDefined();
    expect(vagrancyRow).toBeDefined();
    expect(equityRow?.usedBy.every((usage) => usage.key === "Neuvillette")).toBe(true);
    expect(equityRow?.usedBy.map((usage) => usage.requirementLabel).sort()).toEqual(["Talent: Burst", "Talent: Skill"]);
    expect(equityRow?.usedBy.every((usage) => usage.displayName === "Neuvillette")).toBe(true);
    expect(vagrancyRow?.usedBy).toEqual([
      expect.objectContaining({
        key: "Jahoda",
        displayName: "Jahoda",
        requirementLabel: "Talent: Skill",
      }),
    ]);
    expect(vagrancyRow?.usedBy.some((usage) => usage.key === "Neuvillette")).toBe(false);
  });

  it("deduplicates Traveler shared ascension costs across multiple elemental Traveler goals", () => {
    const planner = buildPlannerOutput({
      ...buildPlannerInput({
        importMeta: {
          format: "GOOD",
          version: 1,
          importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
        },
        characters: [
          {
            characterId: "Traveler",
            currentLevel: 1,
            currentAscension: 0,
            currentTalents: { normal: 1, skill: 1, burst: 1 },
          },
        ],
        weapons: [],
        artifacts: [],
        inventory: {},
        warnings: [],
      }),
      goals: {
        ...exampleGoals,
        characterGoals: {
          Traveler: {
            characterKey: "Traveler",
            enabled: true,
            priority: 3,
            planningMode: "owned",
            targetLevel: 90,
          },
          traveler_anemo: {
            characterKey: "traveler_anemo",
            enabled: true,
            priority: 3,
            planningMode: "owned",
            talents: { auto: 6, skill: 6, burst: 6 },
          },
          traveler_geo: {
            characterKey: "traveler_geo",
            enabled: true,
            priority: 3,
            planningMode: "owned",
            talents: { auto: 6, skill: 6, burst: 6 },
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    expect(planner.byCharacter.map((plan) => plan.characterKey)).toEqual(
      expect.arrayContaining(["Traveler", "traveler_anemo", "traveler_geo"]),
    );
    expect(planner.totalMissingByMaterial.find((row) => row.materialKey === "WindwheelAster")?.needed).toBe(168);
    expect(planner.totalMissingByMaterial.some((row) => row.materialKey === "TeachingsOfFreedom")).toBe(true);
    expect(planner.totalMissingByMaterial.some((row) => row.materialKey === "TeachingsOfGold")).toBe(true);
    expect(planner.totalMissingByMaterial.some((row) => row.materialKey === "DvalinsSigh")).toBe(false);
    expect(planner.totalMissingByMaterial.some((row) => row.materialKey === "TailOfBoreas")).toBe(false);
  });

  it("summarizes weapon EXP around enhancement ore and supported crystal forging", () => {
    const planner = buildPlannerOutput({
      ...buildPlannerInput({
        importMeta: {
          format: "GOOD",
          version: 1,
          importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
        },
        characters: [],
        weapons: [],
        artifacts: [],
        inventory: {
          CrystalChunk: 160,
          RainbowdropCrystal: 40,
          CondessenceCrystal: 0,
          EnhancementOre: 10,
          FineEnhancementOre: 5,
          MysticEnhancementOre: 2,
        },
        warnings: [],
      }),
      goals: {
        ...exampleGoals,
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
      } as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Monday",
      resinSettings: exampleGoals.plannerSettings,
    });

    expect(planner.weaponExpSummary.totalWeaponExpNeeded).toBeGreaterThan(0);
    expect(planner.weaponExpSummary.ownedWeaponExpValue).toBe(34000);
    expect(planner.weaponExpSummary.remainingWeaponExpAfterOwnedOre).toBe(293475);
    expect(planner.weaponExpSummary.mysticEquivalentNeeded).toBe(30);
    expect(planner.weaponExpSummary.mysticForgeableFromCrystals).toBe(50);
    expect(planner.weaponExpSummary.remainingMysticEquivalentUnforgeable).toBe(0);
    expect(planner.weaponExpSummary.dailyMysticForgeCap).toBe(40);
    expect(planner.weaponExpSummary.minimumDailyResetsRequired).toBe(1);
    expect(planner.weaponExpSummary.oreRespawnDays).toBe(3);
    expect(planner.totalMissingByMaterial.some((row) => row.materialKey === "ThreeStarWeaponFodder")).toBe(false);
    expect(planner.weaponExpSummary.notes.some((note) => note.includes("Low-rarity weapon fodder"))).toBe(true);
  });

  it("includes normal boss and weekly boss resin in the planner summary for real character goals, including world level 9", () => {
    const planner = buildPlannerOutput({
      ...buildPlannerInput({
        importMeta: {
          format: "GOOD",
          version: 1,
          importedAt: new Date("2026-05-02T00:00:00.000Z").toISOString(),
        },
        characters: [
          {
            characterId: "Zhongli",
            currentLevel: 1,
            currentAscension: 0,
            currentTalents: {
              normal: 1,
              skill: 1,
              burst: 1,
            },
          },
        ],
        weapons: [],
        artifacts: [],
        inventory: {},
        warnings: [],
      }),
      goals: {
        ...exampleGoals,
        characterGoals: {
          Zhongli: {
            characterKey: "Zhongli",
            enabled: true,
            priority: 3,
            targetLevel: 90,
            targetAscension: 6,
            talents: {
              auto: 10,
              skill: 10,
              burst: 10,
            },
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      } as unknown as KrumpanionGoals,
      staticData: loadStaticData(),
      today: "Monday",
      resinSettings: {
        ...exampleGoals.plannerSettings,
        worldLevel: 9,
      },
    });

    const normalBossEstimate = planner.farmingEstimates.find((estimate) => estimate.sourceType === "normal_boss");
    const weeklyBossEstimate = planner.farmingEstimates.find((estimate) => estimate.sourceType === "weekly_boss");
    const goalPlan = planner.byCharacter.find((plan) => plan.characterKey === "Zhongli");
    const bossRecommendations = planner.recommendationSections
      .find((section) => section.key === "resin_gated")
      ?.rows.filter((row) => row.category === "boss" || row.category === "weekly_boss");

    expect(normalBossEstimate).toMatchObject({
      sourceName: "Geo Hypostasis",
      estimatedRuns: 46 / 3,
      actionableRuns: 16,
      estimatedResin: 640,
    });
    expect(weeklyBossEstimate).toMatchObject({
      sourceName: "Enter the Golden House",
      estimatedRuns: 9,
      actionableRuns: 9,
      estimatedResin: 270,
    });
    expect(planner.resinSummary.totalEstimatedResin).toBeGreaterThanOrEqual(910);
    expect(goalPlan?.estimatedResin).toBeGreaterThanOrEqual(910);
    expect(bossRecommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Farm Geo Hypostasis", totalEstimatedResin: 640, resinPerRun: 40 }),
        expect.objectContaining({ title: "Farm Enter the Golden House", totalEstimatedResin: 270 }),
      ]),
    );
  });
});
