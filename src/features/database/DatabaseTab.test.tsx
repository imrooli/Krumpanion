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
    gameDataUpdates: structuredClone(saveFile.gameDataUpdates),
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

  it("opens the game data center and keeps patch authoring under Advanced", async () => {
    render(<DatabaseTab />);
    expect(screen.getByRole("heading", { name: "Game data and farming setup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check for Updates" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wizard" })).not.toBeInTheDocument();
    for (const name of ["Game Data", "Automatic Data", "Farming Setup", "Discoveries", "Diagnostics", "Advanced"]) expect(screen.getByRole("button", { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Advanced" }));
    expect(screen.getByRole("button", { name: "Wizard" })).toBeInTheDocument();
  });

  it("renders guided wizard, validation, and commit surfaces", async () => {
    const user = userEvent.setup();
    render(<DatabaseTab />);
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByRole("button", { name: "Wizard" }));

    expect(screen.getByRole("button", { name: /Add Weekly Boss Group/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Talent Book Family/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Source Domain/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Weapon Draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Artifact Domain Mapping/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Clone Existing Record/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Patch manifest import\/export/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Validate & Preview/i }));
    expect(await screen.findByRole("heading", { name: /Change-set validation/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Compiled database payloads/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Preview override pack/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Commit Patch/i }));
    expect(await screen.findByRole("heading", { name: /Commit Patch to Database/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Commit Patch to Database/i })).toBeDisabled();
    expect(screen.queryByText(/npm run data:patch -- --manifest/i)).not.toBeInTheDocument();
  });

  it("adds, edits, renames, and deletes manifest records from the guided workflow", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<DatabaseTab />);
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByRole("button", { name: "Wizard" }));

    await user.click(screen.getByRole("button", { name: /Add New Character Draft/i }));

    expect(await screen.findByRole("heading", { name: /Manifest Records/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Workflow/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Record status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Rename key/i)).toHaveValue("NewCharacter1");
    await user.clear(screen.getByLabelText(/Display name/i));
    await user.type(screen.getByLabelText(/Display name/i), "Test Patch Character");
    await user.clear(screen.getByLabelText(/Rename key/i));
    await user.type(screen.getByLabelText(/Rename key/i), "TestPatchCharacter");
    await user.click(screen.getByRole("button", { name: /^Rename key$/i }));

    expect(screen.getByLabelText(/Rename key/i)).toHaveValue("TestPatchCharacter");
    expect(screen.getAllByText(/Test Patch Character/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Duplicate/i }));
    expect(screen.getByLabelText(/Rename key/i)).toHaveValue("TestPatchCharacterCopy");

    await user.click(screen.getByRole("button", { name: /Delete from Manifest/i }));
    expect(screen.getByLabelText(/Rename key/i)).toHaveValue("TestPatchCharacter");
  });

  it("selects multiple linked family keys for source domains", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<DatabaseTab />);
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByRole("button", { name: "Wizard" }));

    await user.click(screen.getByRole("button", { name: /Add Source Domain/i }));

    expect(await screen.findByRole("heading", { name: /Manifest Records/i })).toBeInTheDocument();
    const linkedFamilySearch = screen.getByLabelText(/Search Linked family keys/i);

    await user.type(linkedFamilySearch, "Prosperity");
    await user.click(await screen.findByRole("button", { name: /Add Prosperity/i }));

    await user.clear(linkedFamilySearch);
    await user.type(linkedFamilySearch, "Diligence");
    await user.click(await screen.findByRole("button", { name: /Add Diligence/i }));

    expect(screen.getByRole("button", { name: /Remove Prosperity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove Diligence/i })).toBeInTheDocument();
  });

  it("shows which manifest entry caused validation issues and links back to edit it", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<DatabaseTab />);
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByRole("button", { name: "Wizard" }));

    await user.click(screen.getByRole("button", { name: /Add New Character Draft/i }));
    await user.click(await screen.findByRole("button", { name: /Validate & Preview/i }));

    expect(await screen.findByText(/Entry: characterAssignment · NewCharacter1/i)).toBeInTheDocument();
    expect(screen.getByText(/Character assignments are incomplete/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Edit entry/i }));

    expect(await screen.findByRole("heading", { name: /Manifest Records/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Rename key/i)).toHaveValue("NewCharacter1");
  });

  it("clones existing canonical records into the patch manifest", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<DatabaseTab />);
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByRole("button", { name: "Wizard" }));

    const cloneButtons = await screen.findAllByText(/Edit in Patch Manifest/i);
    await user.click(cloneButtons[0]);

    expect(await screen.findByRole("heading", { name: /Manifest Records/i })).toBeInTheDocument();
    expect(screen.getByText(/Cloned from canonical key/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Commit Patch/i }));
    await user.click(await screen.findByRole("button", { name: /Commit Patch to Database/i }));
    expect(await screen.findByText(/Patch committed to Krumpanion database/i, undefined, { timeout: 10000 })).toBeInTheDocument();
  });

  it("exposes the compact data health center and advanced raw overrides", { timeout: 30000 }, async () => {
    const user = userEvent.setup();
    render(<DatabaseTab />);
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByRole("button", { name: "Wizard" }));

    await user.click(screen.getByRole("button", { name: /^Diagnostics/i }));

    expect(await screen.findByRole("heading", { name: /Data Health Center/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Suggested fixes/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Search issues/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByRole("button", { name: /Advanced Raw Overrides/i }));
    expect(await screen.findByRole("heading", { name: /Advanced raw override controls/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Clear Database Overrides/i }).length).toBeGreaterThan(0);
  });
});
