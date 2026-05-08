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

  it("renders overview-first tabs and switches to Health Issues", async () => {
    const user = userEvent.setup();
    render(<DatabaseTab />);

    expect(screen.getByRole("heading", { name: /Inspect and maintain static game data/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Health Issues/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Health Issues/i }));

    expect(await screen.findByRole("heading", { name: /Static data health issues/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Health fix queue/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Repository hygiene/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });
});
