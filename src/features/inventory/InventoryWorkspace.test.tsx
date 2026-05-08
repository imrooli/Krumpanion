import "fake-indexeddb/auto";
import exampleGood from "../../../examples/good.minimal.example.json";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistenceAdapter } from "../../adapters/persistence";
import { createDefaultSaveFile } from "../../domain/save/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { selectPlannerOutput } from "../../store/selectors";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { InventoryWorkspace } from "./InventoryWorkspace";

const FIXED_DATE = new Date("2026-05-07T12:00:00.000Z");

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

describe("InventoryWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(persistenceAdapter, "saveSaveFile").mockResolvedValue();
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the GOOD import subview inside Inventory and can switch tabs", async () => {
    const user = userEvent.setup();
    await useAppStore.getState().importGoodText(JSON.stringify(exampleGood), {
      fileName: "inventory-test.json",
      source: "file",
    });
    const plannerOutput = selectPlannerOutput(useAppStore.getState());

    render(<InventoryWorkspace plannerOutput={plannerOutput} />);

    expect(screen.getByRole("heading", { name: /Import and review account inventory/i })).toBeInTheDocument();
    expect(screen.getByText(/Imports only update the active account/i)).toBeInTheDocument();
    expect(screen.getByText(/replaces that account's imported inventory/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Materials/i }));

    expect(await screen.findByRole("button", { name: /Bulk Edit Inventory/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Show planner-facing materials/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Search/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Bulk Edit Inventory/i }));
    expect(await screen.findByRole("textbox", { name: /Bulk inventory paste/i }, { timeout: 10000 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Characters Owned/i }));
    expect(await screen.findByRole("heading", { name: /Owned characters/i }, { timeout: 10000 })).toBeInTheDocument();
  }, 15000);
});
