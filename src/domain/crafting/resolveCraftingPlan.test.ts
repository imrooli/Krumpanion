import { describe, expect, it } from "vitest";
import { DEFAULT_GOALS } from "../goals/types";
import { loadStaticData } from "../staticData/loadStaticData";
import { resolveCraftingPlan } from "./resolveCraftingPlan";
import type { MaterialNeedRow } from "../planner/types";

describe("resolveCraftingPlan", () => {
  const staticData = loadStaticData();

  function createMaterialRow(overrides: Partial<MaterialNeedRow> & Pick<MaterialNeedRow, "materialKey" | "displayName">): MaterialNeedRow {
    return {
      materialKey: overrides.materialKey,
      displayName: overrides.displayName,
      progressionNeeded: overrides.progressionNeeded ?? overrides.needed ?? 0,
      extraNeeded: overrides.extraNeeded ?? 0,
      needed: overrides.needed ?? 0,
      owned: overrides.owned ?? 0,
      missing: overrides.missing ?? 0,
      rawMissing: overrides.rawMissing ?? overrides.missing ?? 0,
      craftableQuantity: overrides.craftableQuantity ?? 0,
      effectiveOwned: overrides.effectiveOwned ?? overrides.owned ?? 0,
      effectiveDeficit: overrides.effectiveDeficit ?? overrides.missing ?? 0,
      category: overrides.category ?? "other",
      familyId: overrides.familyId,
      familyDisplayName: overrides.familyDisplayName,
      sourceEnemyFamily: overrides.sourceEnemyFamily,
      region: overrides.region,
      isPurchasable: overrides.isPurchasable,
      purchaseVendors: overrides.purchaseVendors,
      searchHint: overrides.searchHint,
      usedBy: overrides.usedBy ?? [],
      sources: overrides.sources ?? [],
      craftingReport: overrides.craftingReport,
    };
  }

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

  it("carries exact affected goals per target material without cross-linking families", () => {
    const materialRows: MaterialNeedRow[] = [
      createMaterialRow({
        materialKey: "PhilosophiesOfEquity",
        displayName: "Philosophies of Equity",
        progressionNeeded: 35,
        needed: 35,
        missing: 35,
        category: "talent_book",
        usedBy: [
          {
            goalType: "character",
            key: "Neuvillette",
            displayName: "Neuvillette",
            requirementLabel: "Talent: Skill",
            amount: 17,
          },
          {
            goalType: "character",
            key: "Neuvillette",
            displayName: "Neuvillette",
            requirementLabel: "Talent: Burst",
            amount: 18,
          },
        ],
        sources: staticData.materialSources.PhilosophiesOfEquity,
      }),
      createMaterialRow({
        materialKey: "PhilosophiesOfVagrancy",
        displayName: "Philosophies of Vagrancy",
        progressionNeeded: 12,
        needed: 12,
        missing: 12,
        category: "talent_book",
        usedBy: [
          {
            goalType: "character",
            key: "Jahoda",
            displayName: "Jahoda",
            requirementLabel: "Talent: Skill",
            amount: 12,
          },
        ],
        sources: staticData.materialSources.PhilosophiesOfVagrancy,
      }),
    ];

    const craftingPlan = resolveCraftingPlan({}, materialRows, staticData, "aggressive");
    const equityReport = craftingPlan.reports.find((report) => report.targetMaterialKey === "PhilosophiesOfEquity");
    const vagrancyReport = craftingPlan.reports.find((report) => report.targetMaterialKey === "PhilosophiesOfVagrancy");

    expect(equityReport?.affectedGoals).toEqual([
      {
        goalType: "character",
        goalKey: "Neuvillette",
        displayName: "Neuvillette",
        amount: 35,
      },
    ]);
    expect(equityReport?.affectedRequirementEntries).toEqual([
      expect.objectContaining({
        displayName: "Neuvillette",
        requirementLabel: "Talent: Burst",
        materialKey: "PhilosophiesOfEquity",
        amount: 18,
      }),
      expect.objectContaining({
        displayName: "Neuvillette",
        requirementLabel: "Talent: Skill",
        materialKey: "PhilosophiesOfEquity",
        amount: 17,
      }),
    ]);
    expect(equityReport?.affectedGoals.some((goal) => goal.displayName === "Jahoda")).toBe(false);
    expect(vagrancyReport?.affectedGoals).toEqual([
      {
        goalType: "character",
        goalKey: "Jahoda",
        displayName: "Jahoda",
        amount: 12,
      },
    ]);
    expect(vagrancyReport?.affectedGoals.some((goal) => goal.displayName === "Neuvillette")).toBe(false);
  });

  it("keeps lower-tier and higher-tier affected goals scoped to the selected output material", () => {
    const materialRows: MaterialNeedRow[] = [
      createMaterialRow({
        materialKey: "GuideToEquity",
        displayName: "Guide to Equity",
        progressionNeeded: 9,
        needed: 9,
        missing: 9,
        category: "talent_book",
        usedBy: [
          {
            goalType: "character",
            key: "Jadeite",
            displayName: "Jadeite",
            requirementLabel: "Talent: Skill",
            amount: 9,
          },
        ],
        sources: staticData.materialSources.GuideToEquity,
      }),
      createMaterialRow({
        materialKey: "PhilosophiesOfEquity",
        displayName: "Philosophies of Equity",
        progressionNeeded: 6,
        needed: 6,
        missing: 6,
        category: "talent_book",
        usedBy: [
          {
            goalType: "character",
            key: "Neuvillette",
            displayName: "Neuvillette",
            requirementLabel: "Talent: Burst",
            amount: 6,
          },
        ],
        sources: staticData.materialSources.PhilosophiesOfEquity,
      }),
    ];

    const craftingPlan = resolveCraftingPlan(
      {
        TeachingsOfEquity: 27,
      },
      materialRows,
      staticData,
      "aggressive",
    );

    const guideReport = craftingPlan.reports.find((report) => report.targetMaterialKey === "GuideToEquity");
    const philosophyReport = craftingPlan.reports.find((report) => report.targetMaterialKey === "PhilosophiesOfEquity");

    expect(guideReport?.affectedGoals).toEqual([
      expect.objectContaining({
        displayName: "Jadeite",
        amount: 9,
      }),
    ]);
    expect(guideReport?.affectedGoals.some((goal) => goal.displayName === "Neuvillette")).toBe(false);
    expect(philosophyReport?.affectedGoals).toEqual([
      expect.objectContaining({
        displayName: "Neuvillette",
        amount: 6,
      }),
    ]);
    expect(philosophyReport?.affectedGoals.some((goal) => goal.displayName === "Jadeite")).toBe(false);
  });

  it("does not attach off-element source materials as affected goals for Dust of Azoth targets", () => {
    const materialRows: MaterialNeedRow[] = [
      createMaterialRow({
        materialKey: "AgnidusAgateFragment",
        displayName: "Agnidus Agate Fragment",
        progressionNeeded: 2,
        needed: 2,
        missing: 2,
        category: "gemstone",
        usedBy: [
          {
            goalType: "character",
            key: "Diluc",
            displayName: "Diluc",
            requirementLabel: "Ascension",
            amount: 2,
          },
        ],
        sources: staticData.materialSources.AgnidusAgateFragment,
      }),
    ];

    const craftingPlan = resolveCraftingPlan(
      {
        VarunadaLazuriteFragment: 2,
        DustOfAzoth: 6,
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

    const report = craftingPlan.reports[0];
    expect(report?.dustOfAzothOption?.outputAmount).toBe(2);
    expect(report?.affectedGoals).toEqual([
      expect.objectContaining({
        displayName: "Diluc",
        amount: 2,
      }),
    ]);
    expect(report?.affectedRequirementEntries.every((entry) => entry.materialKey === "AgnidusAgateFragment")).toBe(true);
  });

  it("keeps weapon ascension families isolated per exact crafted material", () => {
    const materialRows: MaterialNeedRow[] = [
      createMaterialRow({
        materialKey: "ScatteredPieceOfDecarabiansDream",
        displayName: "Scattered Piece of Decarabian's Dream",
        progressionNeeded: 3,
        needed: 3,
        missing: 3,
        category: "weapon_ascension",
        usedBy: [
          {
            goalType: "weapon",
            key: "weapon-goal-favonius",
            displayName: "Favonius Sword weapon goal",
            requirementLabel: "Ascension 3",
            amount: 3,
          },
        ],
        sources: staticData.materialSources.ScatteredPieceOfDecarabiansDream,
      }),
      createMaterialRow({
        materialKey: "BorealWolfsBrokenFang",
        displayName: "Boreal Wolf's Broken Fang",
        progressionNeeded: 4,
        needed: 4,
        missing: 4,
        category: "weapon_ascension",
        usedBy: [
          {
            goalType: "weapon",
            key: "weapon-goal-rust",
            displayName: "Rust weapon goal",
            requirementLabel: "Ascension 4",
            amount: 4,
          },
        ],
        sources: staticData.materialSources.BorealWolfsBrokenFang,
      }),
    ];

    const craftingPlan = resolveCraftingPlan({}, materialRows, staticData, "aggressive");
    const decarabianReport = craftingPlan.reports.find(
      (report) => report.targetMaterialKey === "ScatteredPieceOfDecarabiansDream",
    );
    const borealReport = craftingPlan.reports.find((report) => report.targetMaterialKey === "BorealWolfsBrokenFang");

    expect(decarabianReport?.affectedGoals).toEqual([
      expect.objectContaining({
        displayName: "Favonius Sword weapon goal",
        amount: 3,
      }),
    ]);
    expect(decarabianReport?.affectedGoals.some((goal) => goal.displayName.includes("Rust"))).toBe(false);
    expect(borealReport?.affectedGoals).toEqual([
      expect.objectContaining({
        displayName: "Rust weapon goal",
        amount: 4,
      }),
    ]);
    expect(borealReport?.affectedGoals.some((goal) => goal.displayName.includes("Favonius"))).toBe(false);
  });
});
