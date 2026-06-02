import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PlannerOutput } from "../../domain/planner/types";
import { CraftingTab } from "./CraftingTab";

function createPlannerOutput(): PlannerOutput {
  return {
    totalMissingByMaterial: [
      {
        materialKey: "PhilosophiesOfEquity",
        displayName: "Philosophies of Equity",
        progressionNeeded: 35,
        extraNeeded: 0,
        needed: 35,
        owned: 0,
        missing: 35,
        rawMissing: 35,
        craftableQuantity: 2,
        effectiveOwned: 0,
        effectiveDeficit: 33,
        category: "talent_book",
        familyDisplayName: "Equity",
        usedBy: [{ goalType: "character", key: "Jahoda", amount: 99, displayName: "Jahoda" }],
        sources: [],
      },
      {
        materialKey: "PhilosophiesOfVagrancy",
        displayName: "Philosophies of Vagrancy",
        progressionNeeded: 12,
        extraNeeded: 0,
        needed: 12,
        owned: 0,
        missing: 12,
        rawMissing: 12,
        craftableQuantity: 1,
        effectiveOwned: 0,
        effectiveDeficit: 11,
        category: "talent_book",
        familyDisplayName: "Vagrancy",
        usedBy: [{ goalType: "character", key: "Neuvillette", amount: 99, displayName: "Neuvillette" }],
        sources: [],
      },
      {
        materialKey: "TeachingsOfJustice",
        displayName: "Teachings of Justice",
        progressionNeeded: 2,
        extraNeeded: 0,
        needed: 2,
        owned: 0,
        missing: 2,
        rawMissing: 2,
        craftableQuantity: 1,
        effectiveOwned: 0,
        effectiveDeficit: 1,
        category: "talent_book",
        familyDisplayName: "Justice",
        usedBy: [],
        sources: [],
      },
    ],
    exactRequirementsByMaterial: [],
    byCharacter: [],
    byWeapon: [],
    artifactFarmGoals: [],
    byAvailability: [],
    today: [],
    bySource: [],
    recommendationSections: [],
    plannerGoals: [],
    plannerGoalGroups: [],
    goalResolutions: [],
    deterministicRequirements: [],
    inventoryCoverage: [],
    materialDeficits: [],
    farmingEstimates: [],
    plannerReport: {
      summary: {
        progressionMora: 400,
        craftingMora: 950,
        totalMora: 1350,
        totalEstimatedResin: 0,
        totalEstimatedNaturalResinDays: 0,
        totalEstimatedNaturalResinWeeks: 0,
        weeklyGatedEstimateCount: 0,
        resinGatedEstimateCount: 0,
        openWorldEstimateCount: 0,
        noResinTaskCount: 0,
        unknownEstimateCount: 0,
        dailyResinBudget: 180,
        weeklyResinBudget: 1260,
        artifactBudget: 0,
      },
      sections: [],
      warnings: [],
    },
    warnings: [],
    summary: {
      progressionMora: 400,
      craftingMora: 950,
      totalMora: 1350,
      totalEstimatedResin: 0,
      totalEstimatedNaturalResinDays: 0,
      totalEstimatedNaturalResinWeeks: 0,
      weeklyGatedEstimateCount: 0,
      resinGatedEstimateCount: 0,
      openWorldEstimateCount: 0,
      noResinTaskCount: 0,
      unknownEstimateCount: 0,
      dailyResinBudget: 180,
      weeklyResinBudget: 1260,
      artifactBudget: 0,
    },
    resinSummary: {
      progressionMora: 400,
      craftingMora: 950,
      totalMora: 1350,
      totalEstimatedResin: 0,
      totalEstimatedNaturalResinDays: 0,
      totalEstimatedNaturalResinWeeks: 0,
      weeklyGatedEstimateCount: 0,
      resinGatedEstimateCount: 0,
      openWorldEstimateCount: 0,
      noResinTaskCount: 0,
      unknownEstimateCount: 0,
      dailyResinBudget: 180,
      weeklyResinBudget: 1260,
      artifactBudget: 0,
    },
    craftingPlan: {
      reports: [
        {
          targetMaterialKey: "PhilosophiesOfEquity",
          targetMaterialName: "Philosophies of Equity",
          requiredAmount: 35,
          ownedAmount: 0,
          affectedGoals: [
            {
              goalType: "character",
              goalKey: "Neuvillette",
              displayName: "Neuvillette",
              amount: 35,
            },
          ],
          affectedRequirementEntries: [
            {
              goalType: "character",
              goalKey: "Neuvillette",
              displayName: "Neuvillette",
              requirementLabel: "Talent: Skill",
              materialKey: "PhilosophiesOfEquity",
              materialName: "Philosophies of Equity",
              amount: 17,
            },
            {
              goalType: "character",
              goalKey: "Neuvillette",
              displayName: "Neuvillette",
              requirementLabel: "Talent: Burst",
              materialKey: "PhilosophiesOfEquity",
              materialName: "Philosophies of Equity",
              amount: 18,
            },
          ],
          lowerTierAvailable: { GuideToEquity: 6 },
          guaranteedCrafting: {
            canSatisfy: false,
            outputAmount: 2,
            steps: [
              {
                outputKey: "PhilosophiesOfEquity",
                outputMaterialKey: "PhilosophiesOfEquity",
                outputName: "Philosophies of Equity",
                outputQuantity: 1,
                inputKey: "GuideToEquity",
                inputName: "Guide to Equity",
                inputQuantity: 3,
                crafts: 2,
                moraCostPerCraft: 550,
                totalMoraCost: 1100,
              },
            ],
            moraCost: 1100,
            leftovers: {},
            remainingMissing: 33,
          },
          recommendedPassive: {
            passiveKey: "eula-passive",
            characterName: "Eula",
            talentName: "Aristocratic Introspection",
            effectType: "refund_one_input",
            expectedInputPerOutput: 2.7273,
            expectedSavingsPercent: 0.09,
            warning: "Crafting talent bonuses are probabilistic and not guaranteed.",
            rationale: "Best expected refund for this recipe.",
          },
          expectedValue: {
            passiveKey: "eula-passive",
            outputEquivalent: 2,
            expectedInputPerOutput: 2.7273,
            expectedSavingsPercent: 0.09,
            expectedAdditionalCoverage: 0,
          },
          resinImpact: {
            resinBeforeCrafting: 40,
            resinAfterGuaranteedCrafting: 20,
            resinAfterExpectedPassive: 20,
            resinSavedGuaranteed: 20,
            resinSavedExpected: 20,
          },
          warnings: [],
        },
        {
          targetMaterialKey: "PhilosophiesOfVagrancy",
          targetMaterialName: "Philosophies of Vagrancy",
          requiredAmount: 12,
          ownedAmount: 0,
          affectedGoals: [
            {
              goalType: "character",
              goalKey: "Jahoda",
              displayName: "Jahoda",
              amount: 12,
            },
          ],
          affectedRequirementEntries: [
            {
              goalType: "character",
              goalKey: "Jahoda",
              displayName: "Jahoda",
              requirementLabel: "Talent: Skill",
              materialKey: "PhilosophiesOfVagrancy",
              materialName: "Philosophies of Vagrancy",
              amount: 12,
            },
          ],
          lowerTierAvailable: { GuideToVagrancy: 3 },
          guaranteedCrafting: {
            canSatisfy: false,
            outputAmount: 1,
            steps: [
              {
                outputKey: "PhilosophiesOfVagrancy",
                outputMaterialKey: "PhilosophiesOfVagrancy",
                outputName: "Philosophies of Vagrancy",
                outputQuantity: 1,
                inputKey: "GuideToVagrancy",
                inputName: "Guide to Vagrancy",
                inputQuantity: 3,
                crafts: 1,
                moraCostPerCraft: 550,
                totalMoraCost: 550,
              },
            ],
            moraCost: 550,
            leftovers: {},
            remainingMissing: 11,
          },
          resinImpact: {
            resinBeforeCrafting: 20,
            resinAfterGuaranteedCrafting: 20,
            resinAfterExpectedPassive: 20,
            resinSavedGuaranteed: 0,
            resinSavedExpected: 0,
          },
          warnings: [],
        },
        {
          targetMaterialKey: "TeachingsOfJustice",
          targetMaterialName: "Teachings of Justice",
          requiredAmount: 2,
          ownedAmount: 0,
          affectedGoals: [],
          affectedRequirementEntries: [],
          lowerTierAvailable: {},
          guaranteedCrafting: {
            canSatisfy: false,
            outputAmount: 1,
            steps: [
              {
                outputKey: "TeachingsOfJustice",
                outputMaterialKey: "TeachingsOfJustice",
                outputName: "Teachings of Justice",
                outputQuantity: 1,
                inputKey: "TeachingsOfJusticeShard",
                inputName: "Teachings of Justice Shard",
                inputQuantity: 3,
                crafts: 1,
                moraCostPerCraft: 175,
                totalMoraCost: 175,
              },
            ],
            moraCost: 175,
            leftovers: {},
            remainingMissing: 1,
          },
          resinImpact: {
            resinBeforeCrafting: null,
            resinAfterGuaranteedCrafting: null,
            resinAfterExpectedPassive: null,
            resinSavedGuaranteed: null,
            resinSavedExpected: null,
          },
          warnings: [],
        },
      ],
      suggestions: [],
      warnings: [],
      guaranteedCoverageByMaterial: {},
      guaranteedRemainingByMaterial: {},
      expectedCoverageByMaterial: {},
      craftingMoraByMaterial: {},
      totalCraftingMora: 950,
      progressionMora: 0,
      totalMora: 950,
    },
    recommendations: [],
    weaponExpSummary: {
      totalWeaponExpNeeded: 0,
      totalWeaponLevelingMoraNeeded: 0,
      enhancementOreOwned: 0,
      fineEnhancementOreOwned: 0,
      mysticEnhancementOreOwned: 0,
      crystalChunkOwned: 0,
      rainbowdropCrystalOwned: 0,
      condessenceCrystalOwned: 0,
      ownedWeaponExpValue: 0,
      remainingWeaponExpAfterOwnedOre: 0,
      mysticEquivalentNeeded: 0,
      mysticForgeableFromCrystals: 0,
      remainingMysticEquivalentUnforgeable: 0,
      dailyMysticForgeCap: 40,
      minimumDailyResetsRequired: 0,
      oreRespawnDays: 3,
      notes: [],
    },
  } as unknown as PlannerOutput;
}

describe("CraftingTab", () => {
  it("uses report-owned affected goals instead of a broad totalMissingByMaterial lookup", async () => {
    const user = userEvent.setup();
    render(<CraftingTab plannerOutput={createPlannerOutput()} />);

    expect(screen.getByRole("heading", { name: /Doable crafting actions/i })).toBeInTheDocument();
    expect(screen.getByText("Neuvillette - 35 needed")).toBeInTheDocument();
    expect(screen.getByText("Neuvillette - Talent: Skill - 17")).toBeInTheDocument();
    expect(screen.getByText("Neuvillette - Talent: Burst - 18")).toBeInTheDocument();
    expect(screen.queryByText("Jahoda - 99 needed")).not.toBeInTheDocument();
    expect(screen.queryByText("character: Jahoda")).not.toBeInTheDocument();
    expect(screen.getByText("33")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Philosophies of Vagrancy/i }));

    expect(screen.getByText("Jahoda - 12 needed")).toBeInTheDocument();
    expect(screen.getByText("Jahoda - Talent: Skill - 12")).toBeInTheDocument();
    expect(screen.queryByText("Neuvillette - 35 needed")).not.toBeInTheDocument();
  });

  it("shows a fallback when no linked goal details are available", async () => {
    const user = userEvent.setup();
    render(<CraftingTab plannerOutput={createPlannerOutput()} />);

    await user.click(screen.getAllByRole("button", { name: /^Teachings of Justice/i })[0]);

    expect(screen.getByText("No linked goal details available.")).toBeInTheDocument();
  });
});
