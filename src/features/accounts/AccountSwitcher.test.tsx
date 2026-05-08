import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistenceAdapter } from "../../adapters/persistence";
import { createDefaultSaveFile } from "../../domain/save/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { AccountSwitcher } from "./AccountSwitcher";

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

describe("AccountSwitcher", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(persistenceAdapter, "saveSaveFile").mockResolvedValue();
    resetStore();
    await useAppStore.getState().createAccount({ name: "Alt Account" });
    await useAppStore.getState().switchAccount(useAppStore.getState().user.accountOrder[0]);
  });

  it("renders the current account and switches accounts through the UI", async () => {
    const user = userEvent.setup();
    render(<AccountSwitcher />);

    const select = screen.getByLabelText("Active account");
    expect(select).toHaveValue(useAppStore.getState().user.accountOrder[0]);

    const altAccountId = useAppStore
      .getState()
      .user.accountOrder.find((accountId) => useAppStore.getState().user.accountsById[accountId]?.name === "Alt Account");

    expect(altAccountId).toBeDefined();
    await user.selectOptions(select, altAccountId!);

    await waitFor(() => {
      expect(useAppStore.getState().user.activeAccountId).toBe(altAccountId);
    });
  });

  it("requires confirmation before deleting the active account", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<AccountSwitcher />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(useAppStore.getState().user.accountOrder).toHaveLength(2);
  });
});
