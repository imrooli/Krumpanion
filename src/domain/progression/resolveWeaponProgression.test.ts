import { describe, expect, it } from "vitest";
import { loadStaticData } from "../staticData/loadStaticData";
import { resolveWeaponProgression } from "./resolveWeaponProgression";

describe("resolveWeaponProgression", () => {
  function buildStableWeaponData(rarity: 3 | 4 | 5) {
    return loadStaticData({
      version: 1,
      weaponMaterialProfiles: {
        TestWeapon: {
          weaponKey: "TestWeapon",
          rarity,
          weaponAscensionMaterialFamily: ["WeaponTier1", "WeaponTier2", "WeaponTier3", "WeaponTier4"],
          eliteEnemyFamily: ["EliteLow", "EliteMid", "EliteHigh"],
          commonEnemyFamily: ["CommonLow", "CommonMid", "CommonHigh"],
          availability: "TUE_FRI_SUN",
        },
      },
    });
  }

  it("maps universal weapon progression buckets by rarity into exact GOOD material keys", () => {
    const staticData = buildStableWeaponData(5);

    const result = resolveWeaponProgression("TestWeapon", staticData);
    expect(result.usingLegacyExact).toBe(false);
    expect(result.progression?.levelTotals["90"].Mora).toBe(906480);
    expect(result.progression?.levelTotals["90"].MysticEnhancementOre).toBe(903);
    expect(result.progression?.levelTotals["90"].ThreeStarWeaponFodder).toBeUndefined();
    expect(result.progression?.levelTotals["90"].TwoStarWeaponFodder).toBeUndefined();
    expect(result.progression?.levelTotals["90"].OneStarWeaponFodder).toBeUndefined();
    expect(result.progression?.ascensionTotals["6"].Mora).toBe(225000);
    expect(result.progression?.ascensionTotals["6"].WeaponTier4).toBe(6);
    expect(result.progression?.ascensionTotals["6"].EliteHigh).toBe(41);
    expect(result.progression?.ascensionTotals["6"].CommonHigh).toBe(27);
  });

  it("matches exact weapon ascension totals for 3-star, 4-star, and 5-star weapons", () => {
    const threeStar = resolveWeaponProgression("TestWeapon", buildStableWeaponData(3)).progression?.ascensionTotals["6"];
    const fourStar = resolveWeaponProgression("TestWeapon", buildStableWeaponData(4)).progression?.ascensionTotals["6"];
    const fiveStar = resolveWeaponProgression("TestWeapon", buildStableWeaponData(5)).progression?.ascensionTotals["6"];

    expect(threeStar).toEqual({
      Mora: 105000,
      WeaponTier1: 2,
      WeaponTier2: 6,
      WeaponTier3: 6,
      WeaponTier4: 3,
      EliteLow: 10,
      EliteMid: 12,
      EliteHigh: 18,
      CommonLow: 6,
      CommonMid: 10,
      CommonHigh: 12,
    });
    expect(fourStar).toEqual({
      Mora: 150000,
      WeaponTier1: 3,
      WeaponTier2: 9,
      WeaponTier3: 9,
      WeaponTier4: 4,
      EliteLow: 15,
      EliteMid: 18,
      EliteHigh: 27,
      CommonLow: 10,
      CommonMid: 15,
      CommonHigh: 18,
    });
    expect(fiveStar).toEqual({
      Mora: 225000,
      WeaponTier1: 5,
      WeaponTier2: 14,
      WeaponTier3: 14,
      WeaponTier4: 6,
      EliteLow: 23,
      EliteMid: 27,
      EliteHigh: 41,
      CommonLow: 15,
      CommonMid: 23,
      CommonHigh: 27,
    });
  });

  it("matches exact weapon level 1 to 90 totals for 3-star, 4-star, and 5-star weapons", () => {
    const threeStar = resolveWeaponProgression("TestWeapon", buildStableWeaponData(3)).progression?.levelTotals["90"];
    const fourStar = resolveWeaponProgression("TestWeapon", buildStableWeaponData(4)).progression?.levelTotals["90"];
    const fiveStar = resolveWeaponProgression("TestWeapon", buildStableWeaponData(5)).progression?.levelTotals["90"];

    expect(threeStar?.Mora).toBe(398880);
    expect(threeStar?.MysticEnhancementOre).toBe(395);
    expect(threeStar?.FineEnhancementOre).toBe(15);
    expect(threeStar?.EnhancementOre).toBe(4);

    expect(fourStar?.Mora).toBe(604320);
    expect(fourStar?.MysticEnhancementOre).toBe(600);
    expect(fourStar?.FineEnhancementOre).toBe(17);
    expect(fourStar?.EnhancementOre).toBe(5);

    expect(fiveStar?.Mora).toBe(906480);
    expect(fiveStar?.MysticEnhancementOre).toBe(903);
    expect(fiveStar?.FineEnhancementOre).toBe(12);
    expect(fiveStar?.EnhancementOre).toBe(6);
  });

  it("can resolve weapon profiles through shared ascension and enemy-drop families", () => {
    const staticData = loadStaticData({
      version: 1,
      weaponAscensionFamilies: {
        Decarabian: {
          key: "Decarabian",
          tier1: "TileOfDecarabiansTower",
          tier2: "DebrisOfDecarabiansCity",
          tier3: "FragmentOfDecarabiansEpic",
          tier4: "ScatteredPieceOfDecarabiansDream",
          availability: "MON_THU_SUN",
        },
      },
      enemyDropFamilies: {
        Horns: {
          key: "Horns",
          low: "HeavyHorn",
          mid: "BlackBronzeHorn",
          high: "BlackCrystalHorn",
        },
        Scrolls: {
          key: "Scrolls",
          low: "DiviningScroll",
          mid: "SealedScroll",
          high: "ForbiddenCurseScroll",
        },
      },
      weaponMaterialProfiles: {
        TestSword: {
          weaponKey: "TestSword",
          rarity: 4,
          weaponAscensionFamilyKey: "Decarabian",
          eliteEnemyFamilyKey: "Horns",
          commonEnemyFamilyKey: "Scrolls",
        },
      },
    });

    const result = resolveWeaponProgression("TestSword", staticData);
    expect(result.warnings).toHaveLength(0);
    expect(result.progression?.ascensionTotals["6"].ScatteredPieceOfDecarabiansDream).toBe(4);
    expect(result.progression?.ascensionTotals["6"].BlackCrystalHorn).toBe(27);
    expect(result.progression?.ascensionTotals["6"].ForbiddenCurseScroll).toBe(18);
  });

  it("prefers first-class elite enemy family records for canonical weapon links", () => {
    const staticData = loadStaticData({
      version: 1,
      weaponMaterialProfiles: {
        EtherlightSpindlelute: {
          weaponKey: "EtherlightSpindlelute",
          rarity: 5,
          weaponAscensionMaterialFamily: ["WeaponTier1", "WeaponTier2", "WeaponTier3", "WeaponTier4"],
          commonEnemyFamily: ["CommonLow", "CommonMid", "CommonHigh"],
        },
      },
    });
    const result = resolveWeaponProgression("EtherlightSpindlelute", staticData);

    expect(result.warnings).not.toContainEqual(
      expect.objectContaining({
        type: "missing_enemy_drop_family",
      }),
    );
    expect(result.progression?.ascensionTotals["6"].RadiantExoskeleton).toBeGreaterThan(0);
  });

  it("blocks manual-review weapon profiles from normal goal calculation", () => {
    const staticData = loadStaticData({
      version: 1,
      weaponMaterialProfiles: {
        TestManualWeapon: {
          weaponKey: "TestManualWeapon",
          rarity: 4,
          weaponAscensionFamilyKey: "Decarabian",
          eliteEnemyFamilyKey: "mitachurl_materials",
          commonEnemyFamilyKey: "slime_materials",
          goalTrackable: false,
          status: "needs_manual_review",
        },
      },
    });

    const result = resolveWeaponProgression("TestManualWeapon", staticData);
    expect(result.progression).toBeNull();
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        type: "weapon_requires_manual_review",
      }),
    );
  });

  it("can fall back to seeded general enemy drop family links for common enemy materials", () => {
    const staticData = loadStaticData({
      version: 1,
      weaponMaterialProfiles: {
        FavoniusLance: {
          weaponKey: "FavoniusLance",
          rarity: 4,
          weaponAscensionMaterialFamily: ["TileOfDecarabiansTower", "DebrisOfDecarabiansCity", "FragmentOfDecarabiansEpic", "ScatteredPieceOfDecarabiansDream"],
          eliteEnemyFamily: ["ChaosDevice", "ChaosCircuit", "ChaosCore"],
        },
      },
    });

    const result = resolveWeaponProgression("FavoniusLance", staticData);
    expect(result.warnings).toHaveLength(0);
    expect(result.progression?.ascensionTotals["6"].SlimeConcentrate).toBe(18);
  });
});
