import { describe, expect, it } from "vitest";
import { DEFAULT_GOALS } from "../goals/types";
import { loadStaticData } from "../staticData/loadStaticData";
import type { MaterialNeedRow } from "./types";
import { buildLeyLineEnemyDropRecommendations } from "./buildLeyLineEnemyDropRecommendations";

const staticData = loadStaticData();

function enemyDropRow(materialKey: string, missing: number, goalKey = "prefarm:SkywardAtlas"): MaterialNeedRow {
  const family = staticData.materialFamilyByKey[materialKey];
  return {
    materialKey,
    displayName: staticData.materials[materialKey]?.displayName ?? materialKey,
    progressionNeeded: missing,
    extraNeeded: 0,
    needed: missing,
    owned: 0,
    missing,
    rawMissing: missing,
    craftableQuantity: 0,
    effectiveOwned: 0,
    effectiveDeficit: missing,
    category: staticData.materials[materialKey]?.category ?? "other",
    familyId: family?.familyId,
    familyDisplayName: family?.displayName,
    sourceEnemyFamily: family?.sourceEnemyFamily,
    usedBy: [{ goalType: "weapon", key: goalKey, amount: missing, displayName: "Skyward Atlas weapon goal" }],
    sources: staticData.materialSources[materialKey] ?? [],
  };
}

function buildRecommendations(rows: MaterialNeedRow[]) {
  return buildLeyLineEnemyDropRecommendations({
    materialRows: rows,
    staticData,
    goals: {
      ...DEFAULT_GOALS,
      characterGoals: {},
      weaponGoals: {
        "prefarm:SkywardAtlas": {
          id: "prefarm:SkywardAtlas",
          weaponKey: "SkywardAtlas",
          enabled: true,
          priority: 3,
          planningMode: "prefarm",
          targetLevel: 90,
          targetAscension: 6,
        },
      },
      artifactGoals: [],
    },
  });
}

describe("buildLeyLineEnemyDropRecommendations", () => {
  it("resolves Chaos Core to Humanoid Ruin Machine locations only", () => {
    const recommendations = buildRecommendations([enemyDropRow("ChaosCore", 6)]);
    const recommendation = recommendations[0];

    expect(recommendation.leyLineEnemyDropDetails?.familyKey).toBe("humanoid_ruin_machine_materials");
    expect(recommendation.leyLineEnemyDropDetails?.bestRegion).toBe("Liyue");
    expect(recommendation.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.areaName.includes("Yaodie Valley"))).toBe(true);
    expect(recommendation.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.coveredFamilyKeys.includes("ruin_sentinel_materials"))).toBe(false);
    expect(recommendation.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.coveredFamilyKeys.includes("ruin_drake_materials"))).toBe(false);
    expect(recommendation.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.coveredFamilyKeys.includes("secret_source_automaton_hunter_seeker_materials"))).toBe(false);
  });

  it("resolves Chaos Gear to Ruin Sentinel locations only", () => {
    const recommendations = buildRecommendations([enemyDropRow("ChaosGear", 6)]);
    const recommendation = recommendations[0];

    expect(recommendation.leyLineEnemyDropDetails?.familyKey).toBe("ruin_sentinel_materials");
    expect(recommendation.leyLineEnemyDropDetails?.bestRegion).toBe("Inazuma");
    expect(recommendation.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.region === "Inazuma")).toBe(true);
    expect(recommendation.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.coveredFamilyKeys.includes("humanoid_ruin_machine_materials"))).toBe(false);
  });

  it("resolves Chaos Storage to Ruin Drake locations only", () => {
    const recommendations = buildRecommendations([enemyDropRow("ChaosStorage", 3)]);
    const recommendation = recommendations[0];

    expect(recommendation.leyLineEnemyDropDetails?.familyKey).toBe("ruin_drake_materials");
    expect(recommendation.leyLineEnemyDropDetails?.bestRegion).toBe("Sumeru");
    expect(recommendation.leyLineEnemyDropDetails?.locationRecommendations.every((location) => location.region === "Sumeru")).toBe(true);
    expect(recommendation.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.coveredFamilyKeys.includes("ruin_sentinel_materials"))).toBe(false);
  });

  it("keeps Abyss Mage and Fatui Cicin Mage families separate", () => {
    const abyss = buildRecommendations([enemyDropRow("DeadLeyLineLeaves", 4)])[0];
    const cicin = buildRecommendations([enemyDropRow("MistGrass", 4)])[0];

    expect(abyss.leyLineEnemyDropDetails?.familyKey).toBe("abyss_mage_materials");
    expect(cicin.leyLineEnemyDropDetails?.familyKey).toBe("fatui_cicin_mage_materials");
    expect(abyss.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.coveredFamilyKeys.includes("fatui_cicin_mage_materials"))).toBe(false);
    expect(cicin.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.coveredFamilyKeys.includes("abyss_mage_materials"))).toBe(false);
  });

  it("recommends Treasure Hoarder locations from exact family coverage", () => {
    const recommendation = buildRecommendations([enemyDropRow("TreasureHoarderInsignia", 12)])[0];
    const windwail = recommendation.leyLineEnemyDropDetails?.locationRecommendations.find(
      (location) => location.locationKey === "leyline.mondstadt.windwail_highland_north.1",
    );

    expect(recommendation.leyLineEnemyDropDetails?.familyKey).toBe("treasure_hoarder_materials");
    expect(windwail).toBeDefined();
    expect(windwail?.totalGuaranteedEnemyCount ?? 0).toBeGreaterThan(0);
    expect(windwail?.optionalNearbyEnemySpawns ?? []).toEqual([]);
  });

  it("keeps Fontemer Aberrants, Clockwork Meka, and Tainted Hydro Phantasms separate", () => {
    const meka = buildRecommendations([enemyDropRow("MechanicalSpurGear", 10)])[0];
    const fontemer = buildRecommendations([enemyDropRow("TransoceanicPearl", 8)])[0];
    const tainted = buildRecommendations([enemyDropRow("DropOfTaintedWater", 5)])[0];

    expect(meka.leyLineEnemyDropDetails?.familyKey).toBe("clockwork_meka_materials");
    expect(meka.leyLineEnemyDropDetails?.bestRegion).toBe("Fontaine");
    expect(fontemer.leyLineEnemyDropDetails?.familyKey).toBe("fontemer_aberrant_materials");
    expect(fontemer.leyLineEnemyDropDetails?.bestRegion).toBe("Fontaine");
    expect(tainted.leyLineEnemyDropDetails?.familyKey).toBe("tainted_hydro_phantasm_materials");
    expect(tainted.leyLineEnemyDropDetails?.bestRegion).toBe("Fontaine");
    expect(meka.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.coveredFamilyKeys.includes("fontemer_aberrant_materials"))).toBe(false);
    expect(fontemer.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.coveredFamilyKeys.includes("clockwork_meka_materials"))).toBe(false);
  });

  it("recommends Xuanwen Beast and Furnace Shell locations from exact elite material families", () => {
    const xuanwen = buildRecommendations([enemyDropRow("FeatheryFin", 4)])[0];
    const furnace = buildRecommendations([enemyDropRow("ColdCrackedShellshard", 2)])[0];

    expect(xuanwen.leyLineEnemyDropDetails?.familyKey).toBe("xuanwen_beast_materials");
    expect(xuanwen.leyLineEnemyDropDetails?.bestRegion).toBe("Liyue");
    expect(xuanwen.leyLineEnemyDropDetails?.locationRecommendations.some((location) => location.areaName === "Mt. Xuanlian")).toBe(true);
    expect(furnace.leyLineEnemyDropDetails?.familyKey).toBe("furnace_shell_mountain_weasel_materials");
    expect(furnace.leyLineEnemyDropDetails?.bestRegion).toBe("Natlan");
    expect(furnace.leyLineEnemyDropDetails?.locationRecommendations[0]?.areaName).toBe("Atocpan");
  });

  it("boosts mixed-use locations when multiple enemy-drop families are missing", () => {
    const recommendations = buildRecommendations([
      enemyDropRow("TreasureHoarderInsignia", 10),
      enemyDropRow("RecruitsInsignia", 6),
    ]);

    const treasureHoarderRecommendation = recommendations.find(
      (recommendation) => recommendation.leyLineEnemyDropDetails?.familyKey === "treasure_hoarder_materials",
    );
    expect(treasureHoarderRecommendation?.leyLineEnemyDropDetails?.locationRecommendations[0]?.coveredFamilyKeys.length).toBeGreaterThanOrEqual(1);
    expect(treasureHoarderRecommendation?.leyLineEnemyDropDetails?.regionRecommendations.length ?? 0).toBeGreaterThan(0);
  });

  it("adds an overall nation-ranking recommendation across multiple enemy-drop families", () => {
    const recommendations = buildRecommendations([
      enemyDropRow("ChaosCore", 6),
      enemyDropRow("FeatheryFin", 4),
    ]);

    const overallRecommendation = recommendations.find(
      (recommendation) => recommendation.leyLineEnemyDropDetails?.familyKey === "__overall__",
    );

    expect(overallRecommendation).toBeDefined();
    expect(overallRecommendation?.sourceName).toBe("Best nations overall");
    expect(overallRecommendation?.leyLineEnemyDropDetails?.bestRegion).toBe("Liyue");
    expect(overallRecommendation?.leyLineEnemyDropDetails?.regionRecommendations[0]?.region).toBe("Liyue");
    expect(overallRecommendation?.leyLineEnemyDropDetails?.regionRecommendations[0]?.coveredFamilyKeys).toEqual(
      expect.arrayContaining(["humanoid_ruin_machine_materials", "xuanwen_beast_materials"]),
    );
  });

  it("does not create Ley Line enemy-drop recommendations for non-enemy materials", () => {
    const rows = [
      enemyDropRow("ChaosCore", 1),
      {
        ...enemyDropRow("ChaosCore", 1),
        materialKey: "PhilosophiesOfEquity",
        displayName: "Philosophies of Equity",
        category: "talent_book" as const,
        familyId: undefined,
        familyDisplayName: undefined,
        sourceEnemyFamily: undefined,
        sources: staticData.materialSources.PhilosophiesOfEquity ?? [],
      },
    ];

    const recommendations = buildRecommendations(rows);
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]?.leyLineEnemyDropDetails?.familyKey).toBe("humanoid_ruin_machine_materials");
  });

  it("returns no recommendations when there are no enemy-drop deficits", () => {
    const recommendations = buildRecommendations([]);
    expect(recommendations).toEqual([]);
  });
});
