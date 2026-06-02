import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultSaveFile } from "../../domain/save/types";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { SaveWorkspace } from "./SaveWorkspace";

const SAVE_FILE = createDefaultSaveFile(new Date("2026-05-07T12:00:00.000Z"));

function resetStore() {
  useAppStore.setState({
    staticData: useAppStore.getState().staticData,
    overridePack: null,
    user: structuredClone(SAVE_FILE.user),
    settings: structuredClone(SAVE_FILE.settings),
    today: "Monday",
    importErrors: [],
    importWarnings: [],
    overrideText: "",
    saveInfo: toSaveInfo(SAVE_FILE),
    persistenceStatus: {
      status: "saved",
      lastSavedAt: SAVE_FILE.updatedAt,
      lastGoalBackupAtByAccount: {},
    },
    goalBackups: [],
    saveRecoveryPoints: [],
    isHydrated: true,
    refreshBackupState: vi.fn().mockResolvedValue(undefined),
  });
}

describe("SaveWorkspace", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows compact recovery summaries and empty states by default", () => {
    render(<SaveWorkspace embedded />);

    expect(screen.getByText(/Save health/i)).toBeInTheDocument();
    expect(screen.getByText(/Goal Recovery/i)).toBeInTheDocument();
    expect(screen.getByText(/No goal backups yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No recovery points yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Advanced JSON/i)).toBeInTheDocument();
  });

  it("renders goal backups and full recovery rows when available", () => {
    const activeAccountId = SAVE_FILE.user.activeAccountId;
    const activeAccount = SAVE_FILE.user.accountsById[activeAccountId];

    useAppStore.setState({
      goalBackups: [
        {
          id: "goal-1",
          kind: "goal_backup",
          accountId: activeAccountId,
          createdAt: "2026-05-07T12:05:00.000Z",
          reason: "goal_edit",
          payload: {
            accountId: activeAccountId,
            accountName: activeAccount.name,
            goals: structuredClone(activeAccount.goals),
            plannerSettings: structuredClone(activeAccount.plannerSettings),
          },
        },
      ],
      saveRecoveryPoints: [
        {
          id: "save-1",
          kind: "save_recovery_point",
          accountId: activeAccountId,
          createdAt: "2026-05-07T12:06:00.000Z",
          reason: "good_import_preflight",
          payload: {
            saveFile: structuredClone(SAVE_FILE),
          },
        },
      ],
      persistenceStatus: {
        status: "backupSaved",
        lastSavedAt: SAVE_FILE.updatedAt,
        lastGoalBackupAtByAccount: {
          [activeAccountId]: "2026-05-07T12:05:00.000Z",
        },
      },
    });

    render(<SaveWorkspace embedded />);

    expect(screen.getByRole("button", { name: /Restore goals/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Restore save/i })).toBeInTheDocument();
    expect(screen.getByText(/Goal Edit/i)).toBeInTheDocument();
    expect(screen.getByText(/Good Import Preflight/i)).toBeInTheDocument();
  });
});
