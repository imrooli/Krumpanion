import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistenceAdapter } from "../../adapters/persistence";
import { createDefaultSaveFile } from "../../domain/save/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import type { PlannerUiRow } from "./plannerUiModel";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { PlannerRecommendationCard } from "./PlannerRecommendationCard";

const FIXED_DATE = new Date("2026-05-26T12:00:00.000Z");

function resetStore() {
  const saveFile = createDefaultSaveFile(FIXED_DATE);
  useAppStore.setState({
    staticData: createStaticData(),
    overridePack: null,
    user: structuredClone(saveFile.user),
    settings: structuredClone(saveFile.settings),
    today: "Monday",
    importErrors: [],
    importWarnings: [],
    overrideText: "",
    saveInfo: toSaveInfo(saveFile),
    isHydrated: true,
  });
}

function createPlannerRow(): PlannerUiRow {
  return {
    id: "planner-row-gold",
    title: "Build Gold books",
    category: "crafting",
    actionGroup: "crafting",
    priority: 2,
    priorityLabel: "Medium",
    availability: "ALWAYS",
    sourceName: "Gold crafting",
    totalEstimatedResin: null,
    resinPerRun: null,
    estimatedRuns: null,
    actionableRuns: null,
    estimatedDaysNaturalResin: null,
    estimatedWeeksNaturalResin: null,
    relatedGoalKeys: ["Zhongli"],
    relatedGoalLabels: ["Zhongli character goal"],
    requiredMaterials: [
      { materialId: "GuideToGold", quantity: 1 },
      { materialId: "PhilosophiesOfGold", quantity: 1 },
      { materialId: "Mora", quantity: 1000 },
    ],
    expectedRewards: [],
    reason: "Convert lower-tier books and track remaining Mora.",
    blockedBy: [],
    isAvailableToday: true,
    warnings: [],
    estimateBasis: "Guaranteed crafting coverage from owned lower tiers.",
    primaryMaterials: [
      { materialId: "GuideToGold", quantity: 1 },
      { materialId: "PhilosophiesOfGold", quantity: 1 },
      { materialId: "Mora", quantity: 1000 },
    ],
    incidentalMaterials: [],
    estimatedDaysLabel: null,
    earliestCompletionLabel: null,
    dayEstimateNote: null,
    timeGatedCompletionDays: null,
    excludedFromDayTotals: true,
  };
}

describe("PlannerRecommendationCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(persistenceAdapter, "saveSaveFile").mockResolvedValue();
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows expected domain planning values before the worst-case guarantee", () => {
    const staticData = createStaticData();
    render(
      <PlannerRecommendationCard
        staticData={staticData}
        row={{
          ...createPlannerRow(),
          id: "cecilia-garden",
          title: "Farm Cecilia Garden",
          category: "weapon_domain",
          actionGroup: "resin_gated",
          actionSubgroup: "domains",
          sourceName: "Cecilia Garden",
          availability: "WED_SAT_SUN",
          resinPerRun: 20,
          totalEstimatedResin: 1260,
          estimatedRuns: 63,
          actionableRuns: 63,
          estimatedDaysNaturalResin: 7,
          expectedAdvisoryResin: 160,
          expectedAdvisoryRuns: 7.6,
          expectedAdvisoryActionableRuns: 8,
          expectedAdvisoryDays: 160 / 180,
          estimatedDaysLabel: "About 0.9 resin days",
        }}
      />,
    );

    expect(screen.getByText("8 expected runs | 20 resin/run | 160 expected resin")).toBeInTheDocument();
    const metadata = screen.getByText("160 expected resin").parentElement;
    expect(metadata).not.toBeNull();
    expect(metadata?.textContent?.indexOf("160 expected resin")).toBeLessThan(
      metadata?.textContent?.indexOf("1,260 worst-case guaranteed resin") ?? -1,
    );
    expect(screen.getByText("63 runs worst-case")).toBeInTheDocument();
  });

  it("groups craftable family materials, uses compact step buttons, and supports reset to imported", async () => {
    const user = userEvent.setup();
    const staticData = createStaticData();
    const activeAccountId = useAppStore.getState().user.activeAccountId;

    useAppStore.setState((state) => ({
      staticData,
      user: {
        ...state.user,
        accountsById: {
          ...state.user.accountsById,
          [activeAccountId]: {
            ...state.user.accountsById[activeAccountId],
            inventory: {
              ...state.user.accountsById[activeAccountId].inventory,
              TeachingsOfGold: 12,
              GuideToGold: 0,
              PhilosophiesOfGold: 0,
              Mora: 500,
            },
            importedInventory: {
              ...state.user.accountsById[activeAccountId].importedInventory,
              TeachingsOfGold: 9,
              GuideToGold: 1,
              PhilosophiesOfGold: 0,
              Mora: 400,
            },
            plannerSettings: {
              ...state.user.accountsById[activeAccountId].plannerSettings,
              craftingModeForRequirementSatisfaction: "expected_value",
              craftingPassiveOverrides: {
                ...state.user.accountsById[activeAccountId].plannerSettings.craftingPassiveOverrides,
                talentMaterials: "Xingqiu",
              },
            },
          },
        },
      },
    }));

    render(<PlannerRecommendationCard row={createPlannerRow()} staticData={staticData} enableInlineQuantityEditing />);

    await user.click(screen.getByText("Details and edit quantities"));

    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Teachings of Gold")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Guide to Gold")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Philosophies of Gold")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Mora")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Increase Guide to Gold by 10/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Decrease Teachings of Gold by 10/i })).not.toBeInTheDocument();
    expect(screen.getByText("Expected-value crafting enabled • Passive override: Xingqiu")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Custom amount to add for Guide to Gold"), "7");
    await user.click(screen.getByRole("button", { name: "Add custom amount for Guide to Gold" }));

    await waitFor(() => {
      expect(useAppStore.getState().user.accountsById[activeAccountId]?.inventory.GuideToGold).toBe(7);
    });

    await user.click(screen.getByRole("button", { name: /Reset Guide to Gold to imported quantity/i }));

    await waitFor(() => {
      expect(useAppStore.getState().user.accountsById[activeAccountId]?.inventory.GuideToGold).toBe(1);
    });
  });

  it("applies craft actions atomically and recalculates the planner", async () => {
    const user = userEvent.setup();
    const staticData = createStaticData();
    const activeAccountId = useAppStore.getState().user.activeAccountId;

    useAppStore.setState((state) => ({
      staticData,
      user: {
        ...state.user,
        accountsById: {
          ...state.user.accountsById,
          [activeAccountId]: {
            ...state.user.accountsById[activeAccountId],
            inventory: {
              ...state.user.accountsById[activeAccountId].inventory,
              TeachingsOfGold: 12,
              GuideToGold: 0,
              PhilosophiesOfGold: 0,
            },
            importedInventory: {
              ...state.user.accountsById[activeAccountId].importedInventory,
              TeachingsOfGold: 12,
              GuideToGold: 0,
              PhilosophiesOfGold: 0,
            },
          },
        },
      },
    }));

    render(<PlannerRecommendationCard row={createPlannerRow()} staticData={staticData} enableInlineQuantityEditing />);

    await user.click(screen.getByText("Details and edit quantities"));

    const teachingsToGuideRow = screen.getByText("Teachings of Gold -> Guide to Gold").closest(".planner-editable-family-craft-row");
    expect(teachingsToGuideRow).not.toBeNull();
    if (!teachingsToGuideRow) {
      throw new Error("Teachings to Guide craft row was not rendered.");
    }

    await user.click(within(teachingsToGuideRow as HTMLElement).getByRole("button", { name: "Craft 1" }));

    await waitFor(() => {
      const account = useAppStore.getState().user.accountsById[activeAccountId];
      expect(account?.inventory.TeachingsOfGold).toBe(9);
      expect(account?.inventory.GuideToGold).toBe(1);
      expect(account?.recentChanges[0]?.kind).toBe("recalculation");
    });

    const refreshedCraftRow = screen.getByText("Teachings of Gold -> Guide to Gold").closest(".planner-editable-family-craft-row");
    expect(refreshedCraftRow).not.toBeNull();
    if (!refreshedCraftRow) {
      throw new Error("Teachings to Guide craft row was not rendered after crafting.");
    }

    await user.click(within(refreshedCraftRow as HTMLElement).getByRole("button", { name: "Craft max useful" }));

    await waitFor(() => {
      const account = useAppStore.getState().user.accountsById[activeAccountId];
      expect(account?.inventory.TeachingsOfGold ?? 0).toBe(0);
      expect(account?.inventory.GuideToGold ?? 0).toBe(4);
    });
  });
});
