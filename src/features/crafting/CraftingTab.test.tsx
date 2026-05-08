import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PlannerOutput } from "../../domain/planner/types";
import { CraftingTab } from "./CraftingTab";

function createPlannerOutput(): PlannerOutput {
  return {
    totalMissingByMaterial: [
      {
        materialKey: "GuideToFreedom",
        displayName: "Guide to Freedom",
        progressionNeeded: 2,
        extraNeeded: 0,
        needed: 2,
        owned: 0,
        missing: 2,
        rawMissing: 2,
        craftableQuantity: 2,
        effectiveOwned: 0,
        effectiveDeficit: 0,
        category: "talent_book",
        familyDisplayName: "Freedom",
        usedBy: [{ goalType: "character", key: "Furina", amount: 2 }],
        sources: [],
      },
      {
        materialKey: "PhilosophiesOfJustice",
        displayName: "Philosophies of Justice",
        progressionNeeded: 1,
        extraNeeded: 0,
        needed: 1,
        owned: 0,
        missing: 1,
        rawMissing: 1,
        craftableQuantity: 0,
        effectiveOwned: 0,
        effectiveDeficit: 0,
        category: "talent_book",
        familyDisplayName: "Justice",
        usedBy: [{ goalType: "character", key: "Neuvillette", amount: 1 }],
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
    groupedRecommendations: [],
    plannerGoals: [],
    plannerGoalGroups: [],
    goalResolutions: [],
    farmingEstimates: [],
    warnings: [],
    summary: {
      progressionMora: 400,
      craftingMora: 950,
      totalMora: 1350,
      totalEstimatedResin: 0,
      totalEstimatedNaturalResinDays: 0,
      totalEstimatedNaturalResinWeeks: 0,
      weeklyGatedEstimateCount: 0,
      openWorldEstimateCount: 0,
      totalMoraFromGoals: 1350,
    },
    resinSummary: {
      totalEstimatedResin: 0,
      totalEstimatedNaturalResinDays: 0,
      totalEstimatedNaturalResinWeeks: 0,
      weeklyGatedEstimateCount: 0,
      openWorldEstimateCount: 0,
    },
    craftingPlan: {
      reports: [
        {
          targetMaterialKey: "GuideToFreedom",
          targetMaterialName: "Guide to Freedom",
          requiredAmount: 2,
          ownedAmount: 0,
          lowerTierAvailable: { TeachingsOfFreedom: 6 },
          guaranteedCrafting: {
            canSatisfy: true,
            outputAmount: 2,
            steps: [
              {
                outputKey: "GuideToFreedom",
                outputMaterialKey: "GuideToFreedom",
                outputName: "Guide to Freedom",
                outputQuantity: 1,
                inputKey: "TeachingsOfFreedom",
                inputName: "Teachings of Freedom",
                inputQuantity: 3,
                crafts: 2,
                moraCostPerCraft: 175,
                totalMoraCost: 350,
              },
            ],
            moraCost: 350,
            leftovers: {},
            remainingMissing: 0,
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
          resinImpact: {
            resinBeforeCrafting: 40,
            resinAfterGuaranteedCrafting: 0,
            resinAfterExpectedPassive: 0,
            resinSavedGuaranteed: 40,
            resinSavedExpected: 40,
          },
          warnings: [],
        },
        {
          targetMaterialKey: "PhilosophiesOfJustice",
          targetMaterialName: "Philosophies of Justice",
          requiredAmount: 1,
          ownedAmount: 0,
          lowerTierAvailable: {},
          guaranteedCrafting: {
            canSatisfy: false,
            outputAmount: 0,
            steps: [],
            moraCost: 0,
            leftovers: {},
            remainingMissing: 0,
          },
          dustOfAzothOption: {
            outputAmount: 1,
            dustRequired: 3,
            conversions: [],
            remainingMissing: 0,
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
          requiredAmount: 0,
          ownedAmount: 0,
          lowerTierAvailable: {},
          guaranteedCrafting: {
            canSatisfy: false,
            outputAmount: 0,
            steps: [],
            moraCost: 0,
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
    weaponExpSummary: {
      totalWeaponExpNeeded: 0,
      totalWeaponLevelingMoraNeeded: 0,
      mysticEquivalentNeeded: 0,
      enhancementOreOwned: 0,
      fineEnhancementOreOwned: 0,
      mysticEnhancementOreOwned: 0,
      ownedWeaponExpValue: 0,
      remainingWeaponExpAfterOwnedOre: 0,
      crystalChunkOwned: 0,
      rainbowdropCrystalOwned: 0,
      condessenceCrystalOwned: 0,
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
  it("shows only useful doable crafting actions and surfaces crafter guidance", async () => {
    const user = userEvent.setup();
    render(<CraftingTab plannerOutput={createPlannerOutput()} />);

    expect(screen.getByRole("heading", { name: /Doable crafting actions/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Freedom" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Justice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Guide to Freedom/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Philosophies of Justice/i })).toBeInTheDocument();
    expect(screen.queryByText("Teachings of Justice")).not.toBeInTheDocument();
    expect(screen.getByText(/Use Eula/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Philosophies of Justice/i }));

    expect(screen.getByText("No special crafter")).toBeInTheDocument();
    expect(screen.getByText(/Convert up to 1 same-tier gems using 3 Dust of Azoth/i)).toBeInTheDocument();
  });
});
