import { describe, expect, it } from "vitest";
import { DEFAULT_GOALS } from "../goals/types";
import { loadStaticData } from "../staticData/loadStaticData";
import { resolveCraftingPlan } from "./resolveCraftingPlan";
import type { MaterialNeedRow } from "../planner/types";

describe("resolveCraftingPlan", () => {
  const staticData = loadStaticData();

  it("creates conservative crafting suggestions from lower-tier materials", () => {
    const materialRows: MaterialNeedRow[] = [
      {
        materialKey: "GuideToJustice",
        displayName: "Guide to Justice",
        progressionNeeded: 5,
        extraNeeded: 0,
        needed: 5,
        owned: 0,
        missing: 2,
        rawMissing: 2,
        craftableQuantity: 0,
        effectiveOwned: 0,
        effectiveDeficit: 2,
        category: "talent_book",
        usedBy: [],
        sources: staticData.materialSources.GuideToJustice,
      },
    ];

    const craftingPlan = resolveCraftingPlan(
      {
        TeachingsOfJustice: 9,
      },
      materialRows,
      staticData,
      "aggressive",
    );

    expect(craftingPlan.suggestions[0]?.outputMaterialKey).toBe("GuideToJustice");
    expect(craftingPlan.suggestions[0]?.craftableQuantity).toBe(2);
  });

  it("uses the minimal multi-tier path and exact Mora for a single philosophy", () => {
    const materialRows: MaterialNeedRow[] = [
      {
        materialKey: "PhilosophiesOfFreedom",
        displayName: "Philosophies of Freedom",
        progressionNeeded: 1,
        extraNeeded: 0,
        needed: 1,
        owned: 0,
        missing: 1,
        rawMissing: 1,
        craftableQuantity: 0,
        effectiveOwned: 0,
        effectiveDeficit: 1,
        category: "talent_book",
        usedBy: [],
        sources: staticData.materialSources.PhilosophiesOfFreedom,
      },
    ];

    const craftingPlan = resolveCraftingPlan(
      {
        TeachingsOfFreedom: 27,
      },
      materialRows,
      staticData,
      "aggressive",
    );

    const report = craftingPlan.reports[0];
    expect(report?.guaranteedCrafting.outputAmount).toBe(1);
    expect(report?.guaranteedCrafting.steps).toHaveLength(2);
    expect(report?.guaranteedCrafting.steps[0]).toMatchObject({
      outputMaterialKey: "GuideToFreedom",
      crafts: 3,
      totalMoraCost: 525,
    });
    expect(report?.guaranteedCrafting.steps[1]).toMatchObject({
      outputMaterialKey: "PhilosophiesOfFreedom",
      crafts: 1,
      totalMoraCost: 550,
    });
    expect(report?.guaranteedCrafting.moraCost).toBe(1075);
  });

  it("preserves earlier progression materials instead of consuming them for higher-tier crafts", () => {
    const materialRows: MaterialNeedRow[] = [
      {
        materialKey: "GuideToFreedom",
        displayName: "Guide to Freedom",
        progressionNeeded: 3,
        extraNeeded: 0,
        needed: 3,
        owned: 3,
        missing: 0,
        rawMissing: 0,
        craftableQuantity: 0,
        effectiveOwned: 3,
        effectiveDeficit: 0,
        category: "talent_book",
        usedBy: [],
        sources: staticData.materialSources.GuideToFreedom,
      },
      {
        materialKey: "PhilosophiesOfFreedom",
        displayName: "Philosophies of Freedom",
        progressionNeeded: 1,
        extraNeeded: 0,
        needed: 1,
        owned: 0,
        missing: 1,
        rawMissing: 1,
        craftableQuantity: 0,
        effectiveOwned: 0,
        effectiveDeficit: 1,
        category: "talent_book",
        usedBy: [],
        sources: staticData.materialSources.PhilosophiesOfFreedom,
      },
    ];

    const craftingPlan = resolveCraftingPlan(
      {
        GuideToFreedom: 3,
        TeachingsOfFreedom: 9,
      },
      materialRows,
      staticData,
      "aggressive",
    );

    const guideReport = craftingPlan.reports.find((report) => report.targetMaterialKey === "GuideToFreedom");
    const philosophyReport = craftingPlan.reports.find((report) => report.targetMaterialKey === "PhilosophiesOfFreedom");

    expect(guideReport?.guaranteedCrafting.outputAmount).toBe(0);
    expect(philosophyReport?.guaranteedCrafting.outputAmount).toBe(1);
    expect(philosophyReport?.guaranteedCrafting.steps).toHaveLength(2);
    expect(philosophyReport?.guaranteedCrafting.leftovers.GuideToFreedom).toBe(3);
  });

  it("uses exact weapon ascension tier-up Mora", () => {
    const materialRows: MaterialNeedRow[] = [
      {
        materialKey: "ScatteredPieceOfDecarabiansDream",
        displayName: "Scattered Piece of Decarabian's Dream",
        progressionNeeded: 1,
        extraNeeded: 0,
        needed: 1,
        owned: 0,
        missing: 1,
        rawMissing: 1,
        craftableQuantity: 0,
        effectiveOwned: 0,
        effectiveDeficit: 1,
        category: "weapon_ascension",
        usedBy: [],
        sources: staticData.materialSources.ScatteredPieceOfDecarabiansDream,
      },
    ];

    const craftingPlan = resolveCraftingPlan(
      {
        FragmentOfDecarabiansEpic: 3,
      },
      materialRows,
      staticData,
      "aggressive",
    );

    expect(craftingPlan.reports[0]?.guaranteedCrafting.steps[0]).toMatchObject({
      outputMaterialKey: "ScatteredPieceOfDecarabiansDream",
      crafts: 1,
      totalMoraCost: 1075,
    });
  });

  it("uses exact gem tier-up Mora and exposes Dust of Azoth conversion options", () => {
    const materialRows: MaterialNeedRow[] = [
      {
        materialKey: "AgnidusAgateFragment",
        displayName: "Agnidus Agate Fragment",
        progressionNeeded: 2,
        extraNeeded: 0,
        needed: 2,
        owned: 0,
        missing: 2,
        rawMissing: 2,
        craftableQuantity: 0,
        effectiveOwned: 0,
        effectiveDeficit: 2,
        category: "gemstone",
        usedBy: [],
        sources: staticData.materialSources.AgnidusAgateFragment,
      },
    ];

    const craftingPlan = resolveCraftingPlan(
      {
        AgnidusAgateSliver: 3,
        VarunadaLazuriteFragment: 1,
        DustOfAzoth: 3,
      },
      materialRows,
      staticData,
      {
        mode: "aggressive",
        plannerSettings: {
          ...DEFAULT_GOALS.plannerSettings,
          ...staticData.craftingPlannerDefaults,
          ...staticData.gemConversionDefaults,
          showDustOfAzothOption: true,
        },
      },
    );

    expect(craftingPlan.reports[0]?.guaranteedCrafting.steps[0]).toMatchObject({
      outputMaterialKey: "AgnidusAgateFragment",
      totalMoraCost: 300,
    });
    expect(craftingPlan.reports[0]?.dustOfAzothOption).toMatchObject({
      outputAmount: 1,
      dustRequired: 3,
      remainingMissing: 0,
    });
  });

  it("recommends expected-value crafting passives without treating them as guaranteed", () => {
    const materialRows: MaterialNeedRow[] = [
      {
        materialKey: "GuideToFreedom",
        displayName: "Guide to Freedom",
        progressionNeeded: 2,
        extraNeeded: 0,
        needed: 2,
        owned: 0,
        missing: 2,
        rawMissing: 2,
        craftableQuantity: 0,
        effectiveOwned: 0,
        effectiveDeficit: 2,
        category: "talent_book",
        usedBy: [],
        sources: staticData.materialSources.GuideToFreedom,
      },
    ];

    const craftingPlan = resolveCraftingPlan(
      {
        TeachingsOfFreedom: 6,
      },
      materialRows,
      staticData,
      {
        mode: "aggressive",
        ownedCharacterKeys: ["Xingqiu", "Eula", "YaeMiko"],
        plannerSettings: {
          ...DEFAULT_GOALS.plannerSettings,
          ...staticData.craftingPlannerDefaults,
          ...staticData.gemConversionDefaults,
          craftingModeForResinEstimate: "expected_value",
          allowCraftingTalentExpectedValue: true,
          showCraftingVarianceWarning: true,
        },
      },
    );

    expect(craftingPlan.reports[0]?.guaranteedCrafting.outputAmount).toBe(2);
    expect(craftingPlan.reports[0]?.recommendedPassive?.characterName).toBe("Eula");
    expect(craftingPlan.reports[0]?.recommendedPassive?.expectedInputPerOutput).toBeCloseTo(2.7273, 3);
    expect(craftingPlan.reports[0]?.warnings.some((warning) => warning.includes("probabilistic"))).toBe(true);
    expect(craftingPlan.reports[0]?.recommendedPassive?.characterName).not.toBe("Yae Miko");
  });

  it("caps displayed crafting suggestions to the useful deficit and keeps coverage non-negative", () => {
    const materialRows: MaterialNeedRow[] = [
      {
        materialKey: "GuideToFreedom",
        displayName: "Guide to Freedom",
        progressionNeeded: 1,
        extraNeeded: 0,
        needed: 1,
        owned: 0,
        missing: 1,
        rawMissing: 1,
        craftableQuantity: 0,
        effectiveOwned: 0,
        effectiveDeficit: 1,
        category: "talent_book",
        usedBy: [],
        sources: staticData.materialSources.GuideToFreedom,
      },
    ];

    const craftingPlan = resolveCraftingPlan(
      {
        TeachingsOfFreedom: 12,
      },
      materialRows,
      staticData,
      "aggressive",
    );

    expect(craftingPlan.suggestions[0]?.craftableQuantity).toBe(1);
    expect(craftingPlan.suggestions[0]?.missingQuantityCovered).toBe(1);
    expect(craftingPlan.suggestions[0]?.reason).toContain("cover 1 missing units");
    expect(craftingPlan.suggestions[0]?.reason).not.toContain("cover -");
  });

  it("omits crafting suggestions when the useful deficit is zero", () => {
    const materialRows: MaterialNeedRow[] = [
      {
        materialKey: "GuideToFreedom",
        displayName: "Guide to Freedom",
        progressionNeeded: 1,
        extraNeeded: 0,
        needed: 1,
        owned: 1,
        missing: 0,
        rawMissing: 0,
        craftableQuantity: 0,
        effectiveOwned: 1,
        effectiveDeficit: 0,
        category: "talent_book",
        usedBy: [],
        sources: staticData.materialSources.GuideToFreedom,
      },
    ];

    const craftingPlan = resolveCraftingPlan(
      {
        TeachingsOfFreedom: 9,
      },
      materialRows,
      staticData,
      "aggressive",
    );

    expect(craftingPlan.suggestions).toHaveLength(0);
  });
});
