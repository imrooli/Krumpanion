import { describe, expect, it } from "vitest";
import { loadStaticData } from "../../domain/staticData/loadStaticData";
import {
  buildDatabaseCoverage,
  buildCharacterRows,
  buildDatabaseSearchIndex,
  buildLocalSpecialtyRows,
  countFamilyUsage,
  filterDatabaseSearchIndex,
  getCharacterProfileCoverage,
} from "./databaseModel";

describe("databaseModel", () => {
  it("marks characters with shared-family coverage as complete", () => {
    const staticData = loadStaticData({
      version: 1,
      characters: {
        TestNoelle: {
          key: "TestNoelle",
          displayName: "Test Noelle",
          element: "Geo",
          weaponType: "Claymore",
          region: "Mondstadt",
        },
      },
      talentBookFamilies: {
        resistance: {
          key: "resistance",
          teachings: "TeachingsOfResistance",
          guide: "GuideToResistance",
          philosophies: "PhilosophiesOfResistance",
          availability: "TUE_FRI_SUN",
        },
      },
      generalEnemyDropFamilies: {
        masks: {
          familyId: "masks",
          displayName: "Masks",
          category: "general_enemy_drop",
          sourceType: "Common Enemies and some Elite Enemies",
          sourceEnemyFamily: "Hilichurls",
          materialNames: ["Damaged Mask", "Stained Mask", "Ominous Mask"],
          materialKeys: ["DamagedMask", "StainedMask", "OminousMask"],
          rarity: [1, 2, 3],
          usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
          usedByCharacters: [],
          usedByWeapons: [],
        },
      },
      localSpecialties: {
        Valberry: {
          key: "Valberry",
          region: "Mondstadt",
          displayName: "Valberry",
          category: "local_specialty",
          usedFor: ["character_ascension"],
          isPurchasable: false,
          purchaseVendors: [],
          searchHint: "Found nearby",
          craftable: false,
        },
      },
      materials: {
        BasaltPillar: { key: "BasaltPillar", displayName: "Basalt Pillar", category: "character_ascension" },
        DvalinsClaw: { key: "DvalinsClaw", displayName: "Dvalin's Claw", category: "weekly_boss" },
      },
      characterMaterialProfiles: {
        TestNoelle: {
          characterKey: "TestNoelle",
          talentBookSeriesKey: "resistance",
          commonEnemyMaterialFamilyId: "masks",
          localSpecialtyKey: "Valberry",
          normalBossMaterial: "BasaltPillar",
          weeklyBossMaterial: "DvalinsClaw",
        },
      },
    });

    const coverage = getCharacterProfileCoverage("TestNoelle", staticData);
    expect(coverage.complete).toBe(true);

    const rows = buildCharacterRows(staticData, null);
    expect(rows.find((row) => row.key === "TestNoelle")?.badges).toContain("profile complete");
  });

  it("treats normal boss materials as registry-backed character metadata", () => {
    const staticData = loadStaticData({
      version: 1,
      characters: {
        TestAmber: {
          key: "TestAmber",
          displayName: "Test Amber",
          element: "Pyro",
          weaponType: "Bow",
          region: "Mondstadt",
        },
      },
      talentBookFamilies: {
        freedom: {
          key: "freedom",
          teachings: "TeachingsOfFreedom",
          guide: "GuideToFreedom",
          philosophies: "PhilosophiesOfFreedom",
        },
      },
      generalEnemyDropFamilies: {
        arrows: {
          familyId: "arrows",
          displayName: "Arrows",
          category: "general_enemy_drop",
          sourceType: "Common Enemies and some Elite Enemies",
          sourceEnemyFamily: "Hilichurl Shooters",
          materialNames: ["Firm Arrowhead", "Sharp Arrowhead", "Weathered Arrowhead"],
          materialKeys: ["FirmArrowhead", "SharpArrowhead", "WeatheredArrowhead"],
          rarity: [1, 2, 3],
          usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
          usedByCharacters: [],
          usedByWeapons: [],
        },
      },
      localSpecialties: {
        SmallLampGrass: {
          key: "SmallLampGrass",
          displayName: "Small Lamp Grass",
          category: "local_specialty",
          region: "Mondstadt",
          usedFor: ["character_ascension"],
          isPurchasable: false,
          purchaseVendors: [],
          searchHint: "Found nearby",
          craftable: false,
        },
      },
      materials: {
        DvalinsSigh: { key: "DvalinsSigh", displayName: "Dvalin's Sigh", category: "weekly_boss" },
      },
      characterMaterialProfiles: {
        TestAmber: {
          characterKey: "TestAmber",
          talentBookSeriesKey: "freedom",
          commonEnemyMaterialFamilyId: "arrows",
          localSpecialtyKey: "SmallLampGrass",
          normalBossMaterialKey: "EverflameSeed",
          normalBossMaterial: "EverflameSeed",
          weeklyBossMaterial: "DvalinsSigh",
        },
      },
    });

    const coverage = getCharacterProfileCoverage("TestAmber", staticData);
    expect(coverage.normalBossReady).toBe(true);
    expect(staticData.normalBossMaterials.EverflameSeed.bossDisplayName).toBe("Pyro Regisvine");
  });

  it("builds global search records for catalog entries and shared families", () => {
    const staticData = loadStaticData({
      version: 1,
      characters: {
        Noelle: {
          key: "Noelle",
          displayName: "Noelle",
          element: "Geo",
        },
      },
      talentBookFamilies: {
        resistance: {
          key: "resistance",
          teachings: "TeachingsOfResistance",
          guide: "GuideToResistance",
          philosophies: "PhilosophiesOfResistance",
        },
      },
    });

    const searchIndex = buildDatabaseSearchIndex(staticData, null, null);
    const noelleResults = filterDatabaseSearchIndex(searchIndex, "noelle");
    const resistanceResults = filterDatabaseSearchIndex(searchIndex, "resistance");

    expect(noelleResults.some((record) => record.entityType === "character")).toBe(true);
    expect(noelleResults.some((record) => record.entityType === "character_profile")).toBe(true);
    expect(resistanceResults.some((record) => record.entityType === "talent_book_family")).toBe(true);
  });

  it("indexes local specialties as first-class database records", () => {
    const staticData = loadStaticData({
      version: 1,
      localSpecialties: {
        TestBloom: {
          key: "TestBloom",
          displayName: "Test Bloom",
          category: "local_specialty",
          region: "Natlan",
          usedFor: ["character_ascension"],
          isPurchasable: true,
          purchaseVendors: ["Vendor One"],
          searchHint: "Found near bright cliffs",
          craftable: false,
        },
      },
    });

    const rows = buildLocalSpecialtyRows(staticData);
    const searchIndex = buildDatabaseSearchIndex(staticData, null, null);
    const results = filterDatabaseSearchIndex(searchIndex, "test bloom");

    expect(rows.find((row) => row.key === "TestBloom")?.badges).toContain("local specialty");
    expect(results.some((record) => record.entityType === "local_specialty" && record.key === "TestBloom")).toBe(true);
  });

  it("counts family impact across linked profiles and element-derived characters", () => {
    const staticData = loadStaticData({
      version: 1,
      characters: {
        Ningguang: {
          key: "Ningguang",
          displayName: "Ningguang",
          element: "Geo",
        },
      },
      characterMaterialProfiles: {
        Noelle: {
          characterKey: "Noelle",
          gemFamilyKey: "Geo",
          normalBossMaterial: "BasaltPillar",
          weeklyBossMaterial: "DvalinsClaw",
        },
      },
    });

    expect(countFamilyUsage(staticData, "Geo", "element_gem_family")).toBeGreaterThanOrEqual(1);
  });

  it("counts local specialty usage by material key", () => {
    const staticData = loadStaticData({
      version: 1,
      localSpecialties: {
        TestBloom: {
          key: "TestBloom",
          displayName: "Test Bloom",
          category: "local_specialty",
          region: "Natlan",
          usedFor: ["character_ascension"],
          isPurchasable: false,
          purchaseVendors: [],
          searchHint: "Found somewhere",
          craftable: false,
        },
      },
      characterMaterialProfiles: {
        Chasca: {
          characterKey: "Chasca",
          localSpecialtyKey: "TestBloom",
          normalBossMaterial: "BossDrop",
          weeklyBossMaterial: "WeeklyDrop",
        },
      },
    });

    expect(countFamilyUsage(staticData, "TestBloom", "local_specialty")).toBe(1);
  });

  it("builds coverage queues for actionable database cleanup", () => {
    const staticData = loadStaticData({
      version: 1,
      characters: {
        Traveler: { key: "Traveler", displayName: "Traveler", element: "Anemo", weaponType: "Sword" },
      },
      characterMaterialProfiles: {
        Traveler: {
          characterKey: "Traveler",
          status: "needs_manual_review",
          normalBossMaterial: "",
          weeklyBossMaterial: "",
        },
      },
      materials: {
        TestMat: { key: "TestMat", displayName: "Test Material", category: "other" },
      },
    });

    const coverage = buildDatabaseCoverage(staticData, null);
    expect(coverage.groups.some((group) => group.key === "manual-review" && group.items.length > 0)).toBe(true);
    expect(coverage.rows.some((row) => row.badges.includes("manual review"))).toBe(true);
  });
});
