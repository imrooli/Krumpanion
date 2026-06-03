import "fake-indexeddb/auto";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistenceAdapter } from "../../adapters/persistence";
import { createDefaultSaveFile } from "../../domain/save/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { ChecklistWorkspace } from "./ChecklistWorkspace";

const FIXED_DATE = new Date("2026-06-02T12:00:00.000Z");

function resetStore() {
  const saveFile = createDefaultSaveFile(FIXED_DATE);
  useAppStore.setState({
    staticData: createStaticData(),
    overridePack: null,
    user: structuredClone(saveFile.user),
    settings: structuredClone(saveFile.settings),
    today: "Tuesday",
    timeSensitiveAt: FIXED_DATE.toISOString(),
    importErrors: [],
    importWarnings: [],
    overrideText: "",
    saveInfo: toSaveInfo(saveFile),
    persistenceStatus: {
      status: "idle",
      lastSavedAt: saveFile.updatedAt,
      lastGoalBackupAtByAccount: {},
    },
    goalBackups: [],
    saveRecoveryPoints: [],
    isHydrated: true,
  });
}

describe("ChecklistWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(persistenceAdapter, "saveSaveFile").mockResolvedValue();
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders checklist sections and updates task status in place", async () => {
    const user = userEvent.setup();
    render(<ChecklistWorkspace />);

    expect(screen.getByRole("heading", { name: /Reset windows and cooldowns/i })).toBeInTheDocument();
    const dailySection = screen.getByRole("heading", { name: "Daily" }).closest("article");
    expect(dailySection).not.toBeNull();
    expect(within(dailySection!).getByText("Daily Commissions")).toBeInTheDocument();
    expect(within(dailySection!).getByText("Daily Forging")).toBeInTheDocument();

    await user.click(within(dailySection!).getByRole("button", { name: /Mark Daily Commissions complete/i }));

    expect(within(dailySection!).getAllByText("Complete").length).toBeGreaterThan(0);
    await user.click(within(dailySection!).getByRole("button", { name: /Undo Daily Commissions/i }));
    expect(within(dailySection!).getAllByText("Incomplete").length).toBeGreaterThan(0);
  });

  it("renders multi-account attention and switches active accounts", async () => {
    const user = userEvent.setup();
    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });
    await useAppStore.getState().setChecklistResetTaskCompleted("dailyCommissions", true);
    await useAppStore.getState().switchAccount(useAppStore.getState().user.accountOrder[0]);

    render(<ChecklistWorkspace />);

    const summarySection = screen.getByRole("heading", { name: /Account attention/i }).closest("article");
    expect(summarySection).not.toBeNull();
    expect(within(summarySection!).getByRole("button", { name: /Alt Account/i })).toBeInTheDocument();

    await user.click(within(summarySection!).getByRole("button", { name: /Alt Account/i }));
    expect(useAppStore.getState().user.activeAccountId).toBe(altId);
  });

  it("supports weekly boss claim adjustments from the checklist", async () => {
    const user = userEvent.setup();
    render(<ChecklistWorkspace />);

    const weeklySection = screen.getByRole("heading", { name: "Weekly" }).closest("article");
    expect(weeklySection).not.toBeNull();
    expect(within(weeklySection!).getByText("Weekly Bounties / Requests")).toBeInTheDocument();

    await user.click(within(weeklySection!).getByRole("button", { name: "+1" }));
    expect(within(weeklySection!).getByText("1 / 3")).toBeInTheDocument();

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    expect(activeAccount.plannerSettings.weeklyBossDiscountClaimsUsed).toBe(1);
    expect(activeAccount.worldState.weeklyBossDiscountsUsed).toBe(1);
  });

  it("renders the realm section and lets realm currency settings be adjusted", async () => {
    const user = userEvent.setup();
    render(<ChecklistWorkspace />);

    const realmSection = screen.getByRole("heading", { name: "Realm" }).closest("article");
    expect(realmSection).not.toBeNull();
    expect(within(realmSection!).getByText("Realm Depot")).toBeInTheDocument();
    expect(within(realmSection!).getByText("Realm Currency")).toBeInTheDocument();

    await user.click(within(realmSection!).getByRole("button", { name: /Settings/i }));
    expect(within(realmSection!).getByText("Rate: 30/hr")).toBeInTheDocument();

    const selects = within(realmSection!).getAllByRole("combobox");
    await user.selectOptions(selects[0], "8");
    await user.selectOptions(selects[1], "9");

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    expect(activeAccount.checklist.realmCurrency.realmLevel).toBe(8);
    expect(activeAccount.checklist.realmCurrency.trustRank).toBe(9);
  });

  it("starts and restarts the realm currency timer from the checklist", async () => {
    const user = userEvent.setup();
    render(<ChecklistWorkspace />);

    const realmSection = screen.getByRole("heading", { name: "Realm" }).closest("article");
    expect(realmSection).not.toBeNull();

    await user.click(within(realmSection!).getAllByRole("button", { name: /Claimed now/i })[0]);

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    expect(activeAccount.checklist.realmCurrency.lastClaimedAt).toBeDefined();
  });
});
