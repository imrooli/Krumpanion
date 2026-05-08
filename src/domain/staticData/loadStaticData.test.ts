import { describe, expect, it } from "vitest";
import { loadStaticData } from "./loadStaticData";

describe("loadStaticData", () => {
  it("merges override data on top of bundled seed registries", () => {
    const staticData = loadStaticData({
      version: 1,
      characters: {
        Charlotte: {
          key: "Charlotte",
          displayName: "Charlotte",
          region: "Fontaine",
        },
      },
      materials: {
        FutureMaterial: {
          key: "FutureMaterial",
          displayName: "Future Material",
          category: "other",
        },
      },
      talentBookFamilies: {
        Resistance: {
          key: "Resistance",
          teachings: "TeachingsOfResistance",
          guide: "GuideToResistance",
          philosophies: "PhilosophiesOfResistance",
        },
      },
    });

    expect(staticData.characters.Charlotte.displayName).toBe("Charlotte");
    expect(staticData.materials.FutureMaterial.displayName).toBe("Future Material");
    expect(staticData.elementGemFamilies.Geo.sliver).toBe("PrithivaTopazSliver");
    expect(staticData.talentBookFamilies.Resistance.guide).toBe("GuideToResistance");
    expect(staticData.appliedOverrideKeys).toContain("Charlotte");
  });

  it("loads seeded talent book families, source mappings, and character profile links", () => {
    const staticData = loadStaticData();

    expect(staticData.talentBookFamilies.Freedom.domainKey).toBe("ForsakenRift");
    expect(staticData.talentBookFamilies.Moonlight.region).toBe("Nod-Krai");
    expect(staticData.elementGemFamilies.Traveler.sliver).toBe("BrilliantDiamondSliver");
    expect(staticData.materials.TeachingsOfFreedom.category).toBe("talent_book");
    expect(staticData.materialSources.TeachingsOfMoonlight?.[0]?.availability).toBe("MON_THU_SUN");
    expect(staticData.characterMaterialProfiles.Venti.talentBookFamilyKey).toBe("Ballad");
    expect(staticData.characterMaterialProfiles.Furina.talentBookFamilyKey).toBe("Justice");
    expect(staticData.characters.Chasca.region).toBe("Natlan");
    expect(staticData.characters.Columbina.element).toBe("Hydro");
    expect(staticData.generalEnemyDropFamilies.slime_materials.materialKeys[2]).toBe("SlimeConcentrate");
    expect(staticData.characterGeneralEnemyDropFamilyByKey.Traveler).toBe("sauroform_tribal_warrior_materials");
    expect(staticData.generalEnemyDropCharacterReferences.some((reference) => reference.displayName === "Traveler (Anemo)" && reference.travelerElement === "Anemo")).toBe(true);
    expect(staticData.localSpecialties.CallaLily.region).toBe("Mondstadt");
    expect(staticData.localSpecialties.RukkhashavaMushrooms.purchaseVendors).toEqual(["Aramani", "Ashpazi"]);
    expect(staticData.localSpecialtiesByRegion.Fontaine).toHaveLength(8);
    expect(staticData.normalBossMaterials.BasaltPillar.bossDisplayName).toBe("Geo Hypostasis");
    expect(staticData.materials.BasaltPillar.category).toBe("normal_boss_material");
    expect(staticData.materialRecords.BasaltPillar.category).toBe("normal_boss_material");
    expect(staticData.materialSources.BasaltPillar?.[0]?.sourceType).toBe("normal_boss");
    expect(staticData.weeklyBossMaterials.DvalinsSigh.source.type).toBe("weekly_boss");
    expect(staticData.specialProgressionMaterials.MasterlessStellaFortuna.status).toBe("needs_manual_review");
    expect(staticData.materialRecords.MasterlessStellaFortuna.category).toBe("special_progression_material");
    expect(staticData.eliteEnemyDropFamilies.radiant_beast_materials.materialKeys[2]).toBe("RadiantExoskeleton");
    expect(staticData.weaponEliteEnemyDropFamilyByKey.EtherlightSpindlelute).toBe("radiant_beast_materials");
    expect(staticData.weaponAscensionMaterialFamilies.Decarabian.tiers.fiveStar).toBe("ScatteredPieceOfDecarabiansDream");
    expect(staticData.materialRecords.ScatteredPieceOfDecarabiansDream.category).toBe("weapon_ascension_material");
    expect(staticData.materialRecords.MysticEnhancementOre.category).toBe("weapon_exp_material");
    expect(staticData.weaponMaterialProfiles.FavoniusSword.weaponAscensionFamilyKey).toBe("Decarabian");
    expect(staticData.weaponMaterialProfiles.CoolSteel.goalTrackable).toBe(true);
    expect(staticData.weaponMaterialProfiles.CoolSteel.status).toBe("verified");
    expect(staticData.weapons.MoonweaversDawn.weaponType).toBe("Sword");
    expect(staticData.weapons.MoonweaversDawn.rarity).toBe(4);
  });

  it("loads universal character ascension and post-90 tables with the expected totals", () => {
    const staticData = loadStaticData();
    const ascensionCosts = staticData.universalCharacterProgressionCore.ascensionCosts;
    const post90Costs = staticData.universalCharacterProgressionCore.post90LevelCapExtensionCosts;

    expect(ascensionCosts).toHaveLength(6);
    expect(ascensionCosts.map((row) => [row.fromPhase, row.toPhase])).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ]);
    expect(ascensionCosts.map((row) => row.resultingMaxLevel)).toEqual([40, 50, 60, 70, 80, 90]);
    expect(ascensionCosts.map((row) => row.requiredAdventureRank)).toEqual([15, 25, 30, 35, 40, 50]);
    expect(ascensionCosts.map((row) => row.mora)).toEqual([20000, 40000, 60000, 80000, 100000, 120000]);
    expect(ascensionCosts.reduce((sum, row) => sum + row.mora, 0)).toBe(420000);
    expect(ascensionCosts.reduce((sum, row) => sum + (row.localSpecialtyCount ?? 0), 0)).toBe(168);
    expect(ascensionCosts.reduce((sum, row) => sum + (row.normalBossMaterialCount ?? 0), 0)).toBe(46);
    expect(ascensionCosts.filter((row) => row.commonEnemyTier === 1).reduce((sum, row) => sum + (row.commonEnemyCount ?? 0), 0)).toBe(18);
    expect(ascensionCosts.filter((row) => row.commonEnemyTier === 2).reduce((sum, row) => sum + (row.commonEnemyCount ?? 0), 0)).toBe(30);
    expect(ascensionCosts.filter((row) => row.commonEnemyTier === 3).reduce((sum, row) => sum + (row.commonEnemyCount ?? 0), 0)).toBe(36);
    expect(ascensionCosts.filter((row) => row.gemTier === "sliver").reduce((sum, row) => sum + (row.gemCount ?? 0), 0)).toBe(1);
    expect(ascensionCosts.filter((row) => row.gemTier === "fragment").reduce((sum, row) => sum + (row.gemCount ?? 0), 0)).toBe(9);
    expect(ascensionCosts.filter((row) => row.gemTier === "chunk").reduce((sum, row) => sum + (row.gemCount ?? 0), 0)).toBe(9);
    expect(ascensionCosts.filter((row) => row.gemTier === "gemstone").reduce((sum, row) => sum + (row.gemCount ?? 0), 0)).toBe(6);
    expect(
      ascensionCosts.reduce(
        (sum, row) => sum + (row.rewards?.find((reward) => reward.key === "AcquaintFate")?.count ?? 0),
        0,
      ),
    ).toBe(3);
    expect(post90Costs).toEqual([
      {
        fromMaxLevel: 90,
        toMaxLevel: 95,
        materialKey: "MasterlessStellaFortuna",
        materialCount: 1,
      },
      {
        fromMaxLevel: 95,
        toMaxLevel: 100,
        materialKey: "MasterlessStellaFortuna",
        materialCount: 2,
      },
    ]);
    expect(post90Costs.reduce((sum, row) => sum + row.materialCount, 0)).toBe(3);
    expect(staticData.universalCharacterProgressionCore.ascensionTotals["7"]).toBeUndefined();
  });

  it("loads universal talent upgrade tables with the expected totals", () => {
    const staticData = loadStaticData();
    const upgradeCosts = staticData.universalTalentProgressionCore.upgradeCosts;

    expect(upgradeCosts).toHaveLength(9);
    expect(upgradeCosts.map((row) => [row.fromLevel, row.toLevel])).toEqual([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
    ]);
    expect(upgradeCosts.reduce((sum, row) => sum + row.mora, 0)).toBe(1652500);
    expect(upgradeCosts.filter((row) => row.commonEnemyTier === 1).reduce((sum, row) => sum + (row.commonEnemyCount ?? 0), 0)).toBe(6);
    expect(upgradeCosts.filter((row) => row.commonEnemyTier === 2).reduce((sum, row) => sum + (row.commonEnemyCount ?? 0), 0)).toBe(22);
    expect(upgradeCosts.filter((row) => row.commonEnemyTier === 3).reduce((sum, row) => sum + (row.commonEnemyCount ?? 0), 0)).toBe(31);
    expect(upgradeCosts.filter((row) => row.talentBookTier === "teachings").reduce((sum, row) => sum + (row.talentBookCount ?? 0), 0)).toBe(3);
    expect(upgradeCosts.filter((row) => row.talentBookTier === "guide").reduce((sum, row) => sum + (row.talentBookCount ?? 0), 0)).toBe(21);
    expect(upgradeCosts.filter((row) => row.talentBookTier === "philosophies").reduce((sum, row) => sum + (row.talentBookCount ?? 0), 0)).toBe(38);
    expect(upgradeCosts.reduce((sum, row) => sum + (row.weeklyBossMaterialCount ?? 0), 0)).toBe(6);
    expect(upgradeCosts.reduce((sum, row) => sum + (row.crownOfInsightCount ?? 0), 0)).toBe(1);
  });

  it("builds character material profiles from the Character Index table and flags edge cases explicitly", () => {
    const staticData = loadStaticData();

    expect(staticData.characterMaterialProfiles.Albedo.gemFamilyKey).toBe("Geo");
    expect(staticData.characterMaterialProfiles.Albedo.commonEnemyMaterialFamilyId).toBe("samachurl_materials");
    expect(staticData.characterMaterialProfiles.Albedo.localSpecialtyKey).toBe("Cecilia");
    expect(staticData.characterMaterialProfiles.Albedo.talentBookSeriesKey).toBe("Ballad");
    expect(staticData.characterMaterialProfiles.Albedo.weeklyBossMaterialKey).toBe("TuskOfMonocerosCaeli");
    const albedoBossIssue = staticData.unresolvedCharacterMaterialReferences.find(
      (reference) => reference.characterKey === "Albedo" && reference.materialSlot === "normalBossMaterial",
    );
    expect(albedoBossIssue).toBeUndefined();
    expect(staticData.characterMaterialProfiles.Albedo.normalBossMaterialKey).toBe("BasaltPillar");

    expect(staticData.characterMaterialProfiles.Ineffa.displayName).toBe("Ineffa");
    expect(staticData.characterMaterialProfiles.Ineffa.notes).not.toContain("Conflicting duplicate Character Index rows detected.");

    expect(staticData.characterMaterialProfiles.Traveler.status).toBe("verified");
    expect(
      staticData.characterMaterialProfiles.Traveler.notes?.some((note) =>
        note.includes("shared level and ascension are modeled separately"),
      ),
    ).toBe(true);

    const nicoleWeeklyIssue = staticData.unresolvedCharacterMaterialReferences.find(
      (reference) => reference.characterKey === "Nicole" && reference.materialSlot === "weeklyBossMaterial",
    );
    expect(nicoleWeeklyIssue?.rawName).toBe("???");
    expect(nicoleWeeklyIssue?.status).toBe("unresolved");
    expect(staticData.characterMaterialProfiles.Nicole.weeklyBossMaterialKey).toBe("");
  });

  it("normalizes display-style material names into GOOD inventory keys", () => {
    const staticData = loadStaticData({
      version: 1,
      enemyDropFamilies: {
        Whistles: {
          key: "Whistles",
          low: "Sentry's Wooden Whistle",
          mid: "Warrior's Metal Whistle",
          high: "Saurian-Crowned Warrior's Golden Whistle",
        },
      },
      characterMaterialProfiles: {
        Iansan: {
          characterKey: "Iansan",
          enemyDropFamilyKey: "Whistles",
          talentBookFamily: ["Teachings of Contention", "Guide to Contention", "Philosophies of Contention"],
          localSpecialty: "Glowing Remains",
          normalBossMaterial: "Lightless Bone",
          weeklyBossMaterial: "Radiant Exoskeleton",
        },
      },
      materialSources: {
        "Glowing Remains": [
          {
            materialKey: "Glowing Remains",
            sourceType: "enemy_drop",
            sourceKey: "TestSource",
            sourceName: "Test Source",
            availability: "ALWAYS",
          },
        ],
      },
    });

    expect(staticData.enemyDropFamilies.Whistles.high).toBe("SaurianCrownedWarriorsGoldenWhistle");
    expect(staticData.characterMaterialProfiles.Iansan.localSpecialty).toBe("GlowingRemains");
    expect(staticData.characterMaterialProfiles.Iansan.weeklyBossMaterial).toBe("RadiantExoskeleton");
    expect(staticData.characterMaterialProfiles.Iansan.talentBookFamily?.[0]).toBe("TeachingsOfContention");
    expect(staticData.materialSources.GlowingRemains?.[0]?.materialKey).toBe("GlowingRemains");
  });

  it("normalizes local specialty display names to their GOOD inventory keys", () => {
    const staticData = loadStaticData({
      version: 1,
      characterMaterialProfiles: {
        TestCharacter: {
          characterKey: "TestCharacter",
          gemSeries: ["TestGemSliver", "TestGemFragment", "TestGemChunk", "TestGemstone"],
          localSpecialty: "Rukkhashava Mushrooms",
          normalBossMaterial: "TestBossMaterial",
          enemyDropFamily: ["TestEnemyLow", "TestEnemyMid", "TestEnemyHigh"],
          talentBookFamily: ["TestTeachings", "TestGuide", "TestPhilosophies"],
          weeklyBossMaterial: "TestWeeklyBoss",
        },
      },
    });

    expect(staticData.characterMaterialProfiles.TestCharacter.localSpecialty).toBe("RukkhashavaMushrooms");
    expect(staticData.localSpecialties.RukkhashavaMushrooms.searchHint).toContain("Ashavan Realm");
  });

  it("loads the planner resin, ley line, domain, and boss registries with the expected constants", () => {
    const staticData = loadStaticData();

    expect(staticData.resinSystem.originalResin.softCap).toBe(200);
    expect(staticData.resinSystem.originalResin.regenMinutesPerResin).toBe(8);
    expect(staticData.resinSystem.originalResin.resinPerDay).toBe(180);
    expect(staticData.resinSystem.originalResin.resinPerWeek).toBe(1260);
    expect(staticData.resinSystem.originalResin.fullRechargeFromZeroMinutes).toBe(1600);
    expect(staticData.resinActivityCosts.leyLineOutcrop.resin).toBe(20);
    expect(staticData.resinActivityCosts.domain.resin).toBe(20);
    expect(staticData.resinActivityCosts.normalBoss.resin).toBe(40);
    expect(staticData.resinActivityCosts.weeklyBoss.firstThreePerWeekResin).toBe(30);
    expect(staticData.resinActivityCosts.weeklyBoss.afterFirstThreePerWeekResin).toBe(60);
    expect(staticData.leyLineRewardsByWorldLevel["8"].wealth.mora).toBe(60000);
    expect(staticData.leyLineRewardsByWorldLevel["8"].revelation.averageCharacterExp).toBe(122500);
    expect(staticData.domainsOfForgery.CeciliaGarden.weaponAscensionFamilies).toEqual([
      "Decarabian",
      "BorealWolf",
      "DandelionGladiator",
    ]);
    expect(staticData.domainsOfMastery.ForsakenRift.talentFamilies).toEqual(["Freedom", "Resistance", "Ballad"]);
    expect(staticData.trounceDomains.ConfrontStormterror.weeklyTalentMaterials).toEqual([
      "Dvalin's Plume",
      "Dvalin's Claw",
      "Dvalin's Sigh",
    ]);
    expect(staticData.weaponAscensionDomainDropModel.IV.overall.twoStar?.average).toBe(2.2);
    expect(staticData.weaponAscensionDomainDropModel.IV.overall.threeStar?.average).toBe(2.418);
    expect(staticData.weaponAscensionDomainDropModel.IV.overall.fourStar?.average).toBe(0.62);
    expect(staticData.weaponAscensionDomainDropModel.IV.overall.fiveStar?.average).toBe(0.062);
    expect(staticData.talentBookDomainDropModel.IV.overall.twoStar?.average).toBe(2.2);
    expect(staticData.talentBookDomainDropModel.IV.overall.threeStar?.average).toBe(1.98);
    expect(staticData.talentBookDomainDropModel.IV.overall.fourStar?.average).toBe(0.22);
    expect(staticData.normalBossUniqueMaterialDropMeanByWorldLevel["8"].dropMean).toBe(2.5556);
    expect(staticData.weeklyTalentMaterialDropMeanByWorldLevel["8"].dropMean).toBe(2.4);
    expect(staticData.plannerDefaults.worldLevel).toBe(8);
    expect(staticData.plannerDefaults.domainLevel).toBe("IV");
  });
});
