import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PlannerOutput } from "../../domain/planner/types";
import { createDefaultSaveFile } from "../../domain/save/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { CraftingTab } from "./CraftingTab";

const FIXED_DATE = new Date("2026-06-03T12:00:00.000Z");

function createPlannerOutput(): PlannerOutput {
  return {
    totalMissingByMaterial: [
      {
        materialKey: "PhilosophiesOfEquity",
        displayName: "Philosophies of Equity",
        progressionNeeded: 1,
        extraNeeded: 0,
        needed: 1,
        owned: 0,
        missing: 1,
        rawMissing: 1,
        craftableQuantity: 1,
        effectiveOwned: 0,
        effectiveDeficit: 0,
        category: "talent_book",
        familyDisplayName: "Equity",
        usedBy: [],
        sources: [],
      },
      {
        materialKey: "AgnidusAgateChunk",
        displayName: "Agnidus Agate Chunk",
        progressionNeeded: 2,
        extraNeeded: 0,
        needed: 2,
        owned: 0,
        missing: 2,
        rawMissing: 2,
        craftableQuantity: 0,
        effectiveOwned: 0,
        effectiveDeficit: 2,
        category: "character_ascension_gem",
        familyDisplayName: "Pyro Gems",
        usedBy: [],
        sources: [],
      },
    ],
    craftingPlan: {
      reports: [
        {
          targetMaterialKey: "PhilosophiesOfEquity",
          targetMaterialName: "Philosophies of Equity",
          requiredAmount: 1,
          ownedAmount: 0,
          affectedGoals: [
            {
              goalType: "character",
              goalKey: "Neuvillette",
              displayName: "Neuvillette",
              amount: 1,
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
              amount: 1,
            },
          ],
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
            outputEquivalent: 1,
            expectedInputPerOutput: 2.7273,
            expectedSavingsPercent: 0.09,
            expectedAdditionalCoverage: 0,
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
        {
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
        },
      ],
      suggestions: [],
      warnings: [],
      guaranteedCoverageByMaterial: {},
      guaranteedRemainingByMaterial: {},
      expectedCoverageByMaterial: {},
      craftingMoraByMaterial: {},
      totalCraftingMora: 925,
      progressionMora: 0,
      totalMora: 925,
    },
  } as unknown as PlannerOutput;
}

function resetStore() {
  const saveFile = createDefaultSaveFile(FIXED_DATE);
  const staticData = createStaticData();
  const activeAccountId = saveFile.user.activeAccountId;

  saveFile.user.accountsById[activeAccountId] = {
    ...saveFile.user.accountsById[activeAccountId],
    name: "Main Account",
    inventory: {
      TeachingsOfEquity: 9,
      Mora: 2000,
      VarunadaLazuriteChunk: 2,
      DustOfAzoth: 18,
    },
  };

  useAppStore.setState({
    staticData,
    overridePack: null,
    user: structuredClone(saveFile.user),
    settings: structuredClone(saveFile.settings),
    today: "Tuesday",
    importErrors: [],
    importWarnings: [],
    overrideText: "",
    saveInfo: toSaveInfo(saveFile),
    isHydrated: true,
  });

  return { activeAccountId };
}

describe("CraftingTab", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders grouped craft actions and step-by-step bench guidance", async () => {
    render(<CraftingTab plannerOutput={createPlannerOutput()} />);

    expect(screen.getByRole("heading", { name: "Crafting bench companion" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Character Talent Material" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Character Ascension Material" })).toBeInTheDocument();
    expect(screen.getByText("Craft in this order")).toBeInTheDocument();
    expect(screen.getByText("Step 1: Craft Guide to Equity")).toBeInTheDocument();
    expect(screen.getByText("Uses Teachings of Equity x9")).toBeInTheDocument();
    expect(screen.getByLabelText("Completed crafts for Step 1: Craft Guide to Equity")).toHaveValue(3);

    await userEvent.click(screen.getByRole("button", { name: /Agnidus Agate Chunk/i }));
    expect(screen.getByText("Step 1: Convert Varunada Lazurite Chunk into Agnidus Agate Chunk")).toBeInTheDocument();
    expect(screen.getByText("Dust of Azoth x18")).toBeInTheDocument();
  });

  it("applies each crafting step separately and recalculates the next step for the active account only", async () => {
    const user = userEvent.setup();
    const mainId = useAppStore.getState().user.activeAccountId;
    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });

    useAppStore.setState((state) => ({
      user: {
        ...state.user,
        activeAccountId: mainId,
      },
    }));

    useAppStore.setState((state) => ({
      user: {
        ...state.user,
        accountsById: {
          ...state.user.accountsById,
          [altId]: {
            ...state.user.accountsById[altId],
            inventory: {
              TeachingsOfEquity: 9,
              Mora: 2000,
            },
          },
        },
      },
    }));

    render(<CraftingTab plannerOutput={createPlannerOutput()} />);

    await user.click(screen.getByRole("button", { name: "Apply craft result for Step 1: Craft Guide to Equity" }));

    await waitFor(() =>
      expect(useAppStore.getState().user.accountsById[mainId]?.inventory.GuideToEquity).toBe(3),
    );

    let mainAccount = useAppStore.getState().user.accountsById[mainId];
    expect(mainAccount?.inventory.TeachingsOfEquity).toBeUndefined();
    expect(mainAccount?.inventory.PhilosophiesOfEquity).toBeUndefined();
    expect(mainAccount?.inventory.Mora).toBe(1475);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Apply craft result for Step 1: Craft Philosophies of Equity" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Apply craft result for Step 1: Craft Philosophies of Equity" }));

    await waitFor(() =>
      expect(useAppStore.getState().user.accountsById[mainId]?.inventory.PhilosophiesOfEquity).toBe(1),
    );

    mainAccount = useAppStore.getState().user.accountsById[mainId];
    const altAccount = useAppStore.getState().user.accountsById[altId];

    expect(mainAccount?.inventory.TeachingsOfEquity).toBeUndefined();
    expect(mainAccount?.inventory.GuideToEquity).toBeUndefined();
    expect(mainAccount?.inventory.Mora).toBe(925);
    expect(altAccount?.inventory.PhilosophiesOfEquity).toBeUndefined();
    expect(altAccount?.inventory.TeachingsOfEquity).toBe(9);
    expect(altAccount?.inventory.Mora).toBe(2000);
  });

  it("rebinds step counts to the active account when accounts switch", async () => {
    const saveFile = createDefaultSaveFile(FIXED_DATE);
    const staticData = createStaticData();
    const mainId = saveFile.user.activeAccountId;
    const altId = "account-b";

    saveFile.user.accountsById[mainId] = {
      ...saveFile.user.accountsById[mainId],
      name: "Main Account",
      inventory: {
        TeachingsOfEquity: 6,
        Mora: 2000,
      },
    };
    saveFile.user.accountsById[altId] = {
      ...saveFile.user.accountsById[mainId],
      id: altId,
      name: "Alt Account",
      inventory: {
        TeachingsOfEquity: 9,
        Mora: 2000,
      },
    };
    saveFile.user.accountOrder = [mainId, altId];

    useAppStore.setState({
      staticData,
      overridePack: null,
      user: structuredClone(saveFile.user),
      settings: structuredClone(saveFile.settings),
      today: "Tuesday",
      importErrors: [],
      importWarnings: [],
      overrideText: "",
      saveInfo: toSaveInfo(saveFile),
      isHydrated: true,
    });

    render(<CraftingTab plannerOutput={createPlannerOutput()} />);

    expect(screen.getByLabelText("Completed crafts for Step 1: Craft Guide to Equity")).toHaveValue(2);
    expect(screen.queryByLabelText("Completed crafts for Step 2: Craft Philosophies of Equity")).not.toBeInTheDocument();

    useAppStore.setState((state) => ({
      user: {
        ...state.user,
        activeAccountId: altId,
      },
    }));

    await waitFor(() =>
      expect(screen.getByLabelText("Completed crafts for Step 1: Craft Guide to Equity")).toHaveValue(3),
    );
    expect(screen.getByLabelText("Completed crafts for Step 2: Craft Philosophies of Equity")).toHaveValue(1);
  });
});
