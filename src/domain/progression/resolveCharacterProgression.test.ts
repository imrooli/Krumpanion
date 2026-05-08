import { describe, expect, it } from "vitest";
import { loadStaticData } from "../staticData/loadStaticData";
import { resolveCharacterProgression } from "./resolveCharacterProgression";

describe("resolveCharacterProgression", () => {
  function buildStableCharacterData() {
    return loadStaticData({
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
  }

  it("maps universal character progression buckets into exact GOOD material keys", () => {
    const staticData = buildStableCharacterData();

    const result = resolveCharacterProgression("TestCharacter", staticData, false);
    expect(result.usingLegacyExact).toBe(false);
    expect(result.progression?.levelTotals["90"].Mora).toBe(1673400);
    expect(result.progression?.ascensionTotals["6"].TestLocalSpecialty).toBe(168);
    expect(result.progression?.ascensionTotals["6"].TestBossMaterial).toBe(46);
    expect(result.progression?.ascensionTotals["6"].TestEnemyHigh).toBe(36);
    expect(result.progression?.ascensionTotals["6"].AcquaintFate).toBeUndefined();
    expect(result.progression?.talentTotals["10"].TestPhilosophies).toBe(38);
    expect(result.progression?.talentTotals["10"].TestWeeklyBoss).toBe(6);
    expect(result.progression?.talentTotals["10"].CrownOfInsight).toBe(1);
  });

  it("matches the exact character ascension 0 to 6 totals", () => {
    const staticData = buildStableCharacterData();
    const result = resolveCharacterProgression("TestCharacter", staticData, false);

    expect(result.progression?.ascensionTotals["6"]).toEqual({
      Mora: 420000,
      TestGemSliver: 1,
      TestGemFragment: 9,
      TestGemChunk: 9,
      TestGemstone: 6,
      TestBossMaterial: 46,
      TestLocalSpecialty: 168,
      TestEnemyLow: 18,
      TestEnemyMid: 30,
      TestEnemyHigh: 36,
    });
  });

  it("matches the exact character level 1 to 90 totals and recommended book mix", () => {
    const staticData = buildStableCharacterData();
    const result = resolveCharacterProgression("TestCharacter", staticData, false);

    expect(result.progression?.levelTotals["90"]).toEqual({
      Mora: 1673400,
      HerosWit: 415,
      AdventurersExperience: 11,
      WanderersAdvice: 12,
    });
  });

  it("matches the exact character talent 1 to 10 totals per talent", () => {
    const staticData = buildStableCharacterData();
    const result = resolveCharacterProgression("TestCharacter", staticData, false);

    expect(result.progression?.talentTotals["10"]).toEqual({
      Mora: 1652500,
      TestTeachings: 3,
      TestGuide: 21,
      TestPhilosophies: 38,
      TestEnemyLow: 6,
      TestEnemyMid: 22,
      TestEnemyHigh: 31,
      TestWeeklyBoss: 6,
      CrownOfInsight: 1,
    });
  });

  it("keeps combined character leveling and ascension Mora at the known total before talents", () => {
    const staticData = buildStableCharacterData();
    const result = resolveCharacterProgression("TestCharacter", staticData, false);
    const totalMora = (result.progression?.levelTotals["90"].Mora ?? 0) + (result.progression?.ascensionTotals["6"].Mora ?? 0);

    expect(totalMora).toBe(2093400);
  });

  it("can resolve shared families and auto-inherit the element gem family from the character catalog", () => {
    const staticData = loadStaticData({
      version: 1,
      characters: {
        GeoTraveler: {
          key: "GeoTraveler",
          displayName: "Geo Traveler",
          element: "Geo",
        },
      },
      talentBookFamilies: {
        Gold: {
          key: "Gold",
          teachings: "TeachingsOfGold",
          guide: "GuideToGold",
          philosophies: "PhilosophiesOfGold",
          availability: "WED_SAT_SUN",
        },
      },
      enemyDropFamilies: {
        Slime: {
          key: "Slime",
          low: "SlimeCondensate",
          mid: "SlimeSecretions",
          high: "SlimeConcentrate",
        },
      },
      localSpecialtySources: {
        Lapis: {
          key: "Lapis",
          materialKey: "CorLapis",
          region: "Liyue",
        },
      },
      characterMaterialProfiles: {
        GeoTraveler: {
          characterKey: "GeoTraveler",
          talentBookFamilyKey: "Gold",
          enemyDropFamilyKey: "Slime",
          localSpecialtySourceKey: "Lapis",
          normalBossMaterial: "BasaltPillar",
          weeklyBossMaterial: "DvalinsClaw",
        },
      },
    });

    const result = resolveCharacterProgression("GeoTraveler", staticData, false);
    expect(result.warnings).toHaveLength(0);
    expect(result.progression?.ascensionTotals["1"].PrithivaTopazSliver).toBe(1);
    expect(result.progression?.ascensionTotals["6"].CorLapis).toBe(168);
    expect(result.progression?.talentTotals["10"].PhilosophiesOfGold).toBe(38);
    expect(result.progression?.talentTotals["10"].SlimeConcentrate).toBe(31);
  });

  it("can fall back to seeded general enemy drop family links", () => {
    const staticData = loadStaticData({
      version: 1,
      characterMaterialProfiles: {
        Lisa: {
          characterKey: "Lisa",
          gemSeries: ["VajradaAmethystSliver", "VajradaAmethystFragment", "VajradaAmethystChunk", "VajradaAmethystGemstone"],
          localSpecialty: "Valberry",
          normalBossMaterial: "LightningPrism",
          talentBookFamilyKey: "Ballad",
          weeklyBossMaterial: "DvalinsClaw",
        },
      },
    });

    const result = resolveCharacterProgression("Lisa", staticData, false);
    expect(result.warnings).toHaveLength(0);
    expect(result.progression?.ascensionTotals["6"].SlimeConcentrate).toBe(36);
    expect(result.progression?.talentTotals["10"].SlimeConcentrate).toBe(31);
  });

  it("separates post-90 level cap extension costs from normal ascension totals", () => {
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

    const disabled = resolveCharacterProgression("TestCharacter", staticData, false);
    expect(disabled.progression?.levelCapExtensionTotals).toBeUndefined();
    expect(disabled.progression?.ascensionTotals["6"].MasterlessStellaFortuna).toBeUndefined();

    const enabled = resolveCharacterProgression("TestCharacter", staticData, true);
    expect(enabled.progression?.levelCapExtensionTotals?.["95"].MasterlessStellaFortuna).toBe(1);
    expect(enabled.progression?.levelCapExtensionTotals?.["100"].MasterlessStellaFortuna).toBe(3);
    expect(enabled.progression?.ascensionTotals["6"].MasterlessStellaFortuna).toBeUndefined();
  });

  it("builds Traveler shared ascension without normal boss materials", () => {
    const staticData = loadStaticData();

    const result = resolveCharacterProgression("Traveler", staticData, false);

    expect(result.warnings.some((warning) => warning.type === "missing_character_profile")).toBe(false);
    expect(result.progression?.ascensionTotals["6"].WindwheelAster).toBe(168);
    expect(result.progression?.ascensionTotals["6"].OminousMask).toBe(36);
    expect(result.progression?.ascensionTotals["6"].BrilliantDiamondGemstone).toBe(6);
  });

  it("builds Traveler elemental goals as talent-only progression", () => {
    const staticData = loadStaticData();

    const result = resolveCharacterProgression("traveler_anemo", staticData, false);

    expect(result.progression?.levelTotals["1"]).toEqual({});
    expect(result.progression?.ascensionTotals["6"]).toEqual({});
    expect(result.progression?.talentTotals["10"].DvalinsSigh).toBe(6);
    expect(result.progression?.talentTotals["10"].DiviningScroll).toBeGreaterThan(0);
  });
});
