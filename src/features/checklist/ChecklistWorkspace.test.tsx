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

  it("renders the priority dashboard and updates today task status in place", async () => {
    const user = userEvent.setup();
    render(<ChecklistWorkspace />);

    expect(screen.getByRole("heading", { name: /Progression Priority Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Do Now" })).toBeInTheDocument();

    const todaySection = screen.getByRole("heading", { name: "Today" }).closest("article");
    expect(todaySection).not.toBeNull();
    expect(within(todaySection!).getByText("Daily Commissions")).toBeInTheDocument();
    expect(within(todaySection!).getByText("Daily Forging")).toBeInTheDocument();

    await user.click(within(todaySection!).getByRole("button", { name: /Mark Daily Commissions complete/i }));

    expect(within(todaySection!).getAllByText("Complete").length).toBeGreaterThan(0);
    await user.click(within(todaySection!).getByRole("button", { name: /Undo Daily Commissions/i }));
    expect(within(todaySection!).getAllByText("Incomplete").length).toBeGreaterThan(0);
  });

  it("renders a calm do now empty state when urgent items are already handled", async () => {
    await useAppStore.getState().setChecklistResetTaskCompleted("dailyCommissions", true);
    await useAppStore.getState().setChecklistResetTaskCompleted("dailyForging", true);
    await useAppStore.getState().setChecklistResetTaskCompleted("battlePassDailyClaims", true);
    await useAppStore.getState().setChecklistResetTaskCompleted("battlePassWeeklyClaims", true);
    await useAppStore.getState().setChecklistResetTaskCompleted("weeklyBountiesRequests", true);
    await useAppStore.getState().setChecklistResetTaskCompleted("realmDepot", true);
    await useAppStore.getState().setChecklistResetTaskCompleted("stardustExchange", true);
    await useAppStore.getState().setChecklistResetTaskCompleted("artifactTransmuter", true);
    await useAppStore.getState().setWeeklyBossClaimsUsed(3);
    await useAppStore.getState().setRealmCurrencyClaimedNow("2026-06-02T12:00:00.000Z");
    await useAppStore.getState().startChecklistCooldown("expeditions", "2026-06-02T12:00:00.000Z");
    await useAppStore.getState().startChecklistCooldown("parametricTransformer", "2026-06-02T12:00:00.000Z");
    await useAppStore.getState().startChecklistCooldown("crystalflyTrap", "2026-06-02T12:00:00.000Z");

    render(<ChecklistWorkspace />);

    const doNowSection = screen.getByRole("heading", { name: "Do Now" }).closest("article");
    expect(doNowSection).not.toBeNull();
    expect(within(doNowSection!).getByText("All urgent checklist items are handled.")).toBeInTheDocument();
  });

  it("renders multi-account attention and switches active accounts", async () => {
    const user = userEvent.setup();
    const altId = await useAppStore.getState().createAccount({ name: "Alt Account" });
    await useAppStore.getState().setChecklistResetTaskCompleted("dailyCommissions", true);
    await useAppStore.getState().switchAccount(useAppStore.getState().user.accountOrder[0]);

    render(<ChecklistWorkspace />);

    const summarySection = screen.getByRole("heading", { name: /Account Attention/i }).closest("article");
    expect(summarySection).not.toBeNull();
    expect(within(summarySection!).getByRole("button", { name: /Alt Account/i })).toBeInTheDocument();

    await user.click(within(summarySection!).getByRole("button", { name: /Alt Account/i }));
    expect(useAppStore.getState().user.activeAccountId).toBe(altId);
  });

  it("supports compact weekly boss claim adjustments from the weekly section", async () => {
    const user = userEvent.setup();
    render(<ChecklistWorkspace />);

    const weeklySection = screen.getByRole("heading", { name: "This Week" }).closest("article");
    expect(weeklySection).not.toBeNull();
    expect(within(weeklySection!).getByText("Weekly Bounties / Requests")).toBeInTheDocument();

    await user.click(within(weeklySection!).getByRole("button", { name: "1" }));
    expect(within(weeklySection!).getByText("1 / 3")).toBeInTheDocument();

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    expect(activeAccount.plannerSettings.weeklyBossDiscountClaimsUsed).toBe(1);
    expect(activeAccount.worldState.weeklyBossDiscountsUsed).toBe(1);
  });

  it("renders cooldown and accumulator rows and lets realm settings be adjusted", async () => {
    const user = userEvent.setup();
    render(<ChecklistWorkspace />);

    const cooldownSection = screen.getByRole("heading", { name: "Cooldowns & Accumulators" }).closest("article");
    expect(cooldownSection).not.toBeNull();
    expect(within(cooldownSection!).getByText("Realm Currency")).toBeInTheDocument();
    expect(within(cooldownSection!).getByText("Expeditions")).toBeInTheDocument();

    await user.click(within(cooldownSection!).getByRole("button", { name: /Settings/i }));
    expect(within(cooldownSection!).getByText("Rate 30/hr")).toBeInTheDocument();

    const selects = within(cooldownSection!).getAllByRole("combobox");
    await user.selectOptions(selects[0], "8");
    await user.selectOptions(selects[1], "9");

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    expect(activeAccount.checklist.realmCurrency.realmLevel).toBe(8);
    expect(activeAccount.checklist.realmCurrency.trustRank).toBe(9);
  });

  it("shows exact ready timestamps for cooldowns and accumulators", async () => {
    await useAppStore.getState().setRealmCurrencyClaimedNow("2026-06-02T12:00:00.000Z");
    await useAppStore.getState().startChecklistCooldown("expeditions", "2026-06-02T12:00:00.000Z");

    render(<ChecklistWorkspace />);

    const cooldownSection = screen.getByRole("heading", { name: "Cooldowns & Accumulators" }).closest("article");
    expect(cooldownSection).not.toBeNull();

    expect(
      within(cooldownSection!).getByText(`Ready at ${new Date("2026-06-03T08:00:00.000Z").toLocaleString()}`),
    ).toBeInTheDocument();
    expect(
      within(cooldownSection!).getByText(`Ready at ${new Date("2026-06-05T20:00:00.000Z").toLocaleString()}`),
    ).toBeInTheDocument();
  });

  it("starts and restarts the realm currency timer from the dashboard", async () => {
    const user = userEvent.setup();
    render(<ChecklistWorkspace />);

    const doNowSection = screen.getByRole("heading", { name: "Do Now" }).closest("article");
    expect(doNowSection).not.toBeNull();

    await user.click(within(doNowSection!).getAllByRole("button", { name: /Claimed now/i })[0]);

    const activeAccount = useAppStore.getState().user.accountsById[useAppStore.getState().user.activeAccountId];
    expect(activeAccount.checklist.realmCurrency.lastClaimedAt).toBeDefined();
  });
});
