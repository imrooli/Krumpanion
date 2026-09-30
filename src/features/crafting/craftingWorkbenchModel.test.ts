import { describe, expect, it } from "vitest";
import type { InventoryState } from "../../domain/account/types";
import { DEFAULT_GOAL_STATE, DEFAULT_PLANNER_SETTINGS } from "../../domain/goals/types";
import type { PlannerOutput } from "../../domain/planner/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import type { StaticGameData } from "../../domain/staticData/types";
import {
  buildCraftingPreview,
  buildCraftingWorkbenchModel,
  createCraftingRecordDraft,
} from "./craftingWorkbenchModel";

function createPlannerOutput(reports: PlannerOutput["craftingPlan"]["reports"]): PlannerOutput {
  return {
    totalMissingByMaterial: reports.map((report) => ({
      materialKey: report.targetMaterialKey,
      displayName: report.targetMaterialName,
      progressionNeeded: report.requiredAmount,
      extraNeeded: 0,
      needed: report.requiredAmount,
      owned: report.ownedAmount,
      missing: Math.max(report.requiredAmount - report.ownedAmount, 0),
      rawMissing: Math.max(report.requiredAmount - report.ownedAmount, 0),
      craftableQuantity: report.guaranteedCrafting.outputAmount,
      effectiveOwned: report.ownedAmount,
      effectiveDeficit: Math.max(report.guaranteedCrafting.remainingMissing, 0),
      category: "other",
      familyDisplayName: report.targetMaterialName,
      usedBy: [],
      sources: [],
    })),
    craftingPlan: {
      reports,
      suggestions: [],
      warnings: [],
      guaranteedCoverageByMaterial: {},
      guaranteedRemainingByMaterial: {},
      expectedCoverageByMaterial: {},
      craftingMoraByMaterial: {},
      totalCraftingMora: reports.reduce((sum, report) => sum + report.guaranteedCrafting.moraCost, 0),
      progressionMora: 0,
      totalMora: reports.reduce((sum, report) => sum + report.guaranteedCrafting.moraCost, 0),
    },
  } as unknown as PlannerOutput;
}

function createTalentBookReport() {
  return {
    targetMaterialKey: "PhilosophiesOfEquity",
    targetMaterialName: "Philosophies of Equity",
    requiredAmount: 1,
    ownedAmount: 0,
    affectedGoals: [],
    affectedRequirementEntries: [],
    lowerTierAvailable: {
      TeachingsOfEquity: 9,
    },
    guaranteedCrafting: {
      canSatisfy: true,
      outputAmount: 1,
      steps: [
        {
          outputKey: "GuideToEquity",
          outputMaterialKey: "GuideToEquity",
          outputName: "Guide to Equity",
          outputQuantity: 1,
          inputKey: "TeachingsOfEquity",
          inputName: "Teachings of Equity",
          inputQuantity: 3,
          crafts: 3,
          moraCostPerCraft: 125,
          totalMoraCost: 375,
        },
        {
          outputKey: "PhilosophiesOfEquity",
          outputMaterialKey: "PhilosophiesOfEquity",
          outputName: "Philosophies of Equity",
          outputQuantity: 1,
          inputKey: "GuideToEquity",
          inputName: "Guide to Equity",
          inputQuantity: 3,
          crafts: 1,
          moraCostPerCraft: 550,
          totalMoraCost: 550,
        },
      ],
      moraCost: 925,
      leftovers: {},
      remainingMissing: 0,
    },
    resinImpact: {
      resinBeforeCrafting: null,
      resinAfterGuaranteedCrafting: null,
      resinAfterExpectedPassive: null,
      resinSavedGuaranteed: null,
      resinSavedExpected: null,
    },
    warnings: [],
  } as PlannerOutput["craftingPlan"]["reports"][number];
}

function createDustReport() {
  return {
    targetMaterialKey: "AgnidusAgateChunk",
    targetMaterialName: "Agnidus Agate Chunk",
    requiredAmount: 2,
    ownedAmount: 0,
    affectedGoals: [],
    affectedRequirementEntries: [],
    lowerTierAvailable: {},
    guaranteedCrafting: {
      canSatisfy: false,
      outputAmount: 0,
      steps: [],
      moraCost: 0,
      leftovers: {},
      remainingMissing: 2,
    },
    dustOfAzothOption: {
      outputAmount: 2,
      dustRequired: 18,
      conversions: [
        {
          outputKey: "AgnidusAgateChunk",
          outputMaterialKey: "AgnidusAgateChunk",
          outputName: "Agnidus Agate Chunk",
          outputQuantity: 1,
          inputKey: "VarunadaLazuriteChunk",
          inputName: "Varunada Lazurite Chunk",
          inputQuantity: 1,
          crafts: 2,
          moraCostPerCraft: 0,
          totalMoraCost: 0,
          passiveUsed: null,
          isElementConversion: true,
        },
      ],
      remainingMissing: 0,
    },
    resinImpact: {
      resinBeforeCrafting: null,
      resinAfterGuaranteedCrafting: null,
      resinAfterExpectedPassive: null,
      resinSavedGuaranteed: null,
      resinSavedExpected: null,
    },
    warnings: [],
  } as PlannerOutput["craftingPlan"]["reports"][number];
}

function findAction(staticData: StaticGameData, reports: PlannerOutput["craftingPlan"]["reports"], id: string) {
  return buildCraftingWorkbenchModel(createPlannerOutput(reports), staticData).actions.find((action) => action.id === id);
}

describe("craftingWorkbenchModel", () => {
  it("groups actions into the requested progression buckets and derives bench steps", () => {
    const staticData = createStaticData();
    const reports = [
      {
        targetMaterialKey: "AgentsSacrificialKnife",
        targetMaterialName: "Agent's Sacrificial Knife",
        requiredAmount: 1,
        ownedAmount: 0,
        affectedGoals: [],
        affectedRequirementEntries: [],
        lowerTierAvailable: {},
        guaranteedCrafting: {
          canSatisfy: true,
          outputAmount: 1,
          steps: [],
          moraCost: 50,
          leftovers: {},
          remainingMissing: 0,
        },
        resinImpact: {
          resinBeforeCrafting: null,
          resinAfterGuaranteedCrafting: null,
          resinAfterExpectedPassive: null,
          resinSavedGuaranteed: null,
          resinSavedExpected: null,
        },
        warnings: [],
      } as PlannerOutput["craftingPlan"]["reports"][number],
      createTalentBookReport(),
      createDustReport(),
    ];

    const model = buildCraftingWorkbenchModel(createPlannerOutput(reports), staticData);
    const talentAction = model.actions.find((action) => action.id === "standard:PhilosophiesOfEquity");

    expect(model.groups.map((group) => group.label)).toEqual([
      "Character and Weapon Enhancement Material",
      "Character Talent Material",
      "Character Ascension Material",
    ]);
    expect(model.actions.some((action) => action.id === "dust:AgnidusAgateChunk")).toBe(true);
    expect(talentAction?.benchSteps.map((step) => step.outputMaterialKey)).toEqual([
      "GuideToEquity",
      "PhilosophiesOfEquity",
    ]);
  });

  it("updates preview from per-step standard craft records", () => {
    const staticData = createStaticData();
    const report = createTalentBookReport();
    const action = findAction(staticData, [report], "standard:PhilosophiesOfEquity");
    expect(action).toBeDefined();
    if (!action) {
      return;
    }

    const draft = createCraftingRecordDraft(action);
    draft.stepRecords[0] = {
      ...draft.stepRecords[0],
      completedCrafts: 1,
      refundedInputs: 1,
    };
    draft.stepRecords[1] = {
      ...draft.stepRecords[1],
      completedCrafts: 0,
      bonusOutputs: 0,
    };

    const preview = buildCraftingPreview({
      action,
      draft,
      inventory: {
        TeachingsOfEquity: 9,
        Mora: 5000,
      },
      plannerOutput: createPlannerOutput([report]),
      account: {
        characters: [],
        weapons: [],
        artifacts: [],
      },
      goals: {
        ...structuredClone(DEFAULT_GOAL_STATE),
        plannerSettings: structuredClone(DEFAULT_PLANNER_SETTINGS),
      },
      staticData,
      today: "Tuesday",
    });

    expect(preview.errors).toEqual([]);
    expect(preview.deltaLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ materialKey: "TeachingsOfEquity", delta: -2 }),
        expect.objectContaining({ materialKey: "GuideToEquity", delta: 1 }),
        expect.objectContaining({ materialKey: "Mora", delta: -175 }),
      ]),
    );
    expect(preview.deltaLines.some((line) => line.materialKey === "PhilosophiesOfEquity")).toBe(false);
  });

  it("uses the exact current Dust conversion path for partial gem conversions", () => {
    const staticData = createStaticData();
    const report = createDustReport();
    const action = findAction(staticData, [report], "dust:AgnidusAgateChunk");
    expect(action).toBeDefined();
    if (!action) {
      return;
    }

    const draft = createCraftingRecordDraft(action);
    draft.stepRecords[0] = {
      ...draft.stepRecords[0],
      completedCrafts: 1,
    };

    const preview = buildCraftingPreview({
      action,
      draft,
      inventory: {
        VarunadaLazuriteChunk: 2,
        DustOfAzoth: 18,
      } as InventoryState,
      plannerOutput: createPlannerOutput([report]),
      account: {
        characters: [],
        weapons: [],
        artifacts: [],
      },
      goals: {
        ...structuredClone(DEFAULT_GOAL_STATE),
        plannerSettings: structuredClone(DEFAULT_PLANNER_SETTINGS),
      },
      staticData,
      today: "Tuesday",
    });

    expect(preview.errors).toEqual([]);
    expect(preview.deltaLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ materialKey: "VarunadaLazuriteChunk", delta: -1 }),
        expect.objectContaining({ materialKey: "DustOfAzoth", delta: -9 }),
        expect.objectContaining({ materialKey: "AgnidusAgateChunk", delta: 1 }),
      ]),
    );
  });
});
