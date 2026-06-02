import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistenceAdapter } from "../../adapters/persistence";
import { createDefaultSaveFile } from "../../domain/save/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { DatabaseTab } from "./DatabaseTab";

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

describe("DatabaseTab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(persistenceAdapter, "saveSaveFile").mockResolvedValue();
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the workflow-first database workbench tabs", async () => {
    render(<DatabaseTab />);

    expect(screen.getByRole("heading", { name: /Inspect and maintain static game data/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Release Update/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Materials & Families/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Character Assignments/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Validation & Export/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Legacy Overrides/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Canonical update workbench/i })).toBeInTheDocument();
  });

  it("renders guided release and validation workbench surfaces", async () => {
    const user = userEvent.setup();
    render(<DatabaseTab />);

    await user.click(screen.getByRole("button", { name: /Release Update/i }));
    expect(await screen.findByRole("heading", { name: /Release update draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Weekly Boss Group/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Talent Book Family/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Validation & Export/i }));
    expect(await screen.findByRole("heading", { name: /Change-set validation/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Canonical export bundle/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Preview override pack/i })).toBeInTheDocument();
  });

  it("exposes the compact data health center, raw issues, and legacy overrides", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<DatabaseTab />);

    await user.click(screen.getByRole("button", { name: /Data Health/i }));

    expect(await screen.findByRole("heading", { name: /Data Health Center/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Suggested fixes/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Search issues/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Raw Issues/i }));

    expect(await screen.findByRole("heading", { name: /Static data health issues/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Health fix queue/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Repository hygiene/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Legacy Overrides/i }));
    expect(await screen.findByRole("heading", { name: /Override pack controls/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Clear Database Overrides/i }).length).toBeGreaterThan(0);
  });
});
