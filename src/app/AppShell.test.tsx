import "fake-indexeddb/auto";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistenceAdapter } from "../adapters/persistence";
import { createDefaultSaveFile } from "../domain/save/types";
import { createStaticData } from "../domain/staticData/staticDataFactory";
import { toSaveInfo } from "../store/persistenceHelpers";
import { useAppStore } from "../store/useAppStore";
import { AppShell } from "./AppShell";

const FIXED_DATE = new Date("2026-05-07T12:00:00.000Z");

function resetStore() {
  const saveFile = createDefaultSaveFile(FIXED_DATE);
  useAppStore.setState({
    staticData: createStaticData(),
    overridePack: null,
    user: structuredClone(saveFile.user),
    settings: structuredClone(saveFile.settings),
    today: "Monday",
    timeSensitiveAt: FIXED_DATE.toISOString(),
    importErrors: [],
    importWarnings: [],
    overrideText: "",
    saveInfo: toSaveInfo(saveFile),
    isHydrated: true,
  });
}

describe("AppShell navigation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(persistenceAdapter, "saveSaveFile").mockResolvedValue();
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the task-based navigation and switches to Inventory and Crafting", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    const navigation = screen.getByRole("navigation", { name: /Primary sections/i });
    expect(within(navigation).getByRole("button", { name: /Dashboard/i })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: /Checklist/i })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: /Planner/i })).toBeInTheDocument();
    const craftingButton = within(navigation)
      .getAllByRole("button")
      .find((button) => within(button).queryByText("Crafting"));
    expect(craftingButton).toBeDefined();
    expect(within(navigation).getByRole("button", { name: /Goals/i })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: /Inventory/i })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: /Database/i })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: /Settings/i })).toBeInTheDocument();

    await user.click(within(navigation).getByRole("button", { name: /Inventory/i }));

    expect(await screen.findByRole("heading", { name: /Import and review account inventory/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /Inventory sections/i })).toBeInTheDocument();

    await user.click(craftingButton!);

    const main = screen.getByRole("main");
    expect(within(main).getByRole("heading", { level: 1, name: "Crafting actions" })).toBeInTheDocument();
    expect(navigation).toBeInTheDocument();
  });
});
