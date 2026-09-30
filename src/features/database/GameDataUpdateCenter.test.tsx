import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameDataUpdateCenter } from "./GameDataUpdateCenter";
import { useAppStore } from "../../store/useAppStore";
import { createDefaultSaveFile } from "../../domain/save/types";
import { loadStaticData } from "../../domain/staticData/loadStaticData";
import { newLivePatch } from "../../test/fixtures/newLivePatch";
import { reconcileGameData } from "../../domain/staticData/reconcileGameData";
import { plannerReadiness } from "../../domain/staticData/plannerReadiness";
import { persistenceAdapter } from "../../adapters/persistence";
import { GoodImportPanel } from "../import/GoodImportPanel";

beforeEach(() => {
  vi.restoreAllMocks(); vi.spyOn(persistenceAdapter, "saveSaveFile").mockResolvedValue();
  const save = createDefaultSaveFile(); useAppStore.setState({ ...save, staticData: loadStaticData(), importErrors: [], importWarnings: [] });
});
afterEach(cleanup);
describe("automatic database update UX", () => {
  it("shows supported bundled progression as ready before an exact upstream override exists", async () => {
    const user = userEvent.setup();
    render(<GameDataUpdateCenter view="automaticData" onNavigate={vi.fn()} />);
    await user.type(screen.getByLabelText('Find imported records'), 'Nicole');
    expect(screen.getByText(/Nicole.*Progression complete; planner ready/)).toBeInTheDocument();
  });
  it("keeps known-only GOOD imports free of update warnings", () => {
    render(<GoodImportPanel />);
    expect(screen.queryByText("New game data detected")).not.toBeInTheDocument();
  });
  it("shows discoveries and update status without discarding imported inventory", () => {
    const state = useAppStore.getState(); const now = new Date().toISOString();
    useAppStore.setState({ gameDataUpdates: { ...state.gameDataUpdates, status: "checking", discoveries: { flower: { id: "flower", entityType: "material", rawKey: "NewFlower", accountIds: [state.user.activeAccountId], firstSeen: now, lastSeen: now, source: "GOOD", status: "detected" } } } });
    render(<GoodImportPanel />);
    expect(screen.getByText("New game data detected")).toBeInTheDocument();
    expect(screen.getByText(/Checking the live game database/)).toBeInTheDocument();
  });
  it("shows revision and successful import summary", () => {
    const state = useAppStore.getState();
    useAppStore.setState({ gameDataUpdates: { ...state.gameDataUpdates, status: "updated", appliedRevision: "abc123", lastSummary: { character: 2, weapon: 1 }, lastDelta: { added: 3, changed: 0, unchanged: 0, review: 0, progression: 3, families: 0, domains: 0, schedules: 0, affectedKeys: [] } } });
    render(<GameDataUpdateCenter view="gameData" onNavigate={vi.fn()} />);
    expect(screen.getByText("Game database updated")).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(screen.getByText(/3 added/)).toBeInTheDocument();
  });
  it("completes missing farming information through the UI and preserves exact costs and identity", async () => {
    const result = reconcileGameData(loadStaticData(), null, newLivePatch(), {});
    useAppStore.setState({ staticData: result.staticData, overridePack: result.overridePack });
    const user = userEvent.setup(); render(<GameDataUpdateCenter view="farmingSetup" onNavigate={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "New Flower" }));
    await user.selectOptions(screen.getByLabelText("Source category"), "local_specialty");
    await user.type(screen.getByLabelText("Source / domain name"), "New Island");
    await user.selectOptions(screen.getByLabelText("Availability"), "ALWAYS");
    await user.click(screen.getByRole("button", { name: "Save Farming Data" }));
    await waitFor(() => expect(screen.getByText(/Farming data saved/)).toBeInTheDocument());
    const data = useAppStore.getState().staticData;
    expect(data.materials.NewFlower.gameId).toBe(90000003);
    expect(data.exactCharacterRequirements?.NewCharacter.ascension["1"].costs.NewFlower).toBe(3);
    expect(plannerReadiness(data, "NewCharacter").state).toBe("planner_ready");
    expect(loadStaticData(useAppStore.getState().overridePack).materialSources.NewFlower[0].sourceName).toBe("New Island");
  });
});
