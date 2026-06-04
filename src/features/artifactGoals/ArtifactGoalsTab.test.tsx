import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PlannerOutput } from "../../domain/planner/types";
import { createDefaultSaveFile } from "../../domain/save/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { ArtifactGoalsTab } from "./ArtifactGoalsTab";

const FIXED_DATE = new Date("2026-06-03T12:00:00.000Z");

function resetStore() {
  const saveFile = createDefaultSaveFile(FIXED_DATE);
  const staticData = createStaticData();
  const activeAccountId = saveFile.user.activeAccountId;
  saveFile.user.accountsById[activeAccountId] = {
    ...saveFile.user.accountsById[activeAccountId],
    name: "Main Account",
    characters: [
      {
        characterId: "Neuvillette",
        currentLevel: 80,
        currentAscension: 5,
        currentTalents: {
          normal: 1,
          skill: 8,
          burst: 8,
        },
      },
      {
        characterId: "Fischl",
        currentLevel: 80,
        currentAscension: 5,
        currentTalents: {
          normal: 1,
          skill: 8,
          burst: 8,
        },
      },
    ],
  };

  useAppStore.setState({
    staticData,
    overridePack: null,
    user: structuredClone(saveFile.user),
    settings: structuredClone(saveFile.settings),
    today: "Tuesday",
    importErrors: [],
    importWarnings: [],
    overrideText: "",
    saveInfo: toSaveInfo(saveFile),
    isHydrated: true,
  });

  return { activeAccountId, staticData };
}

function getEditor() {
  return screen.getByRole("heading", { name: "Artifact Goal Editor" }).closest("article");
}

async function waitForEditor() {
  await screen.findByRole("heading", { name: "Artifact Goal Editor" });
  const editor = getEditor();
  if (!editor) {
    throw new Error("Artifact goal editor did not render.");
  }
  return editor;
}

function findArtifactBrowserButton(label: string) {
  return screen.getAllByRole("button").find((button) => button.className.includes("artifact-summary-select") && button.textContent?.includes(label));
}

function findPickerChoice(label: string, choice: string) {
  return within(screen.getByRole("group", { name: label })).getAllByRole("button", { name: choice });
}

const UNUSED_PLANNER_OUTPUT = {} as PlannerOutput;

describe("ArtifactGoalsTab", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("defaults to by-character editing and keeps goal edits isolated across characters", async () => {
    const user = userEvent.setup();

    render(<ArtifactGoalsTab plannerOutput={UNUSED_PLANNER_OUTPUT} />);

    expect(screen.getByText("No artifact goals yet")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Add Artifact Goal" })[0]);

    let editor = await waitForEditor();

    expect(screen.getByRole("button", { name: "By Character" })).toHaveAttribute("aria-pressed", "true");

    await user.selectOptions(within(editor).getByLabelText("Character"), "Neuvillette");
    await user.type(within(editor).getByLabelText("Goal name"), "Neuv Goal");
    await user.click(within(within(editor).getByRole("group", { name: "Artifact sets" })).getByRole("button", { name: "Marechaussee Hunter" }));
    await user.click(within(within(editor).getByRole("group", { name: "Sands" })).getByRole("button", { name: "HP%" }));
    await waitFor(() => expect(findArtifactBrowserButton("Neuvillette")).toBeTruthy());

    await user.click(screen.getAllByRole("button", { name: "Add Artifact Goal" })[0]);

    editor = await waitForEditor();

    await user.selectOptions(within(editor).getByLabelText("Character"), "Fischl");
    await user.type(within(editor).getByLabelText("Goal name"), "Fischl Goal");
    await user.click(within(within(editor).getByRole("group", { name: "Artifact sets" })).getByRole("button", { name: "Golden Troupe" }));
    await waitFor(() => expect(findArtifactBrowserButton("Fischl")).toBeTruthy());

    const neuvSection = findArtifactBrowserButton("Neuvillette");
    if (!neuvSection) {
      throw new Error("Neuvillette browser row missing.");
    }
    await user.click(neuvSection);

    await waitFor(() => expect(screen.getByLabelText("Character")).toHaveValue("Neuvillette"));
    expect(findPickerChoice("Sands", "HP%").some((button) => button.getAttribute("aria-pressed") === "true")).toBe(true);
    expect(screen.getByRole("button", { name: "Golden Troupe", pressed: false })).toBeInTheDocument();

    const fischlSection = screen.getAllByRole("button").find((button) => button.className.includes("artifact-summary-select") && button.textContent?.includes("Fischl"));
    if (!fischlSection) {
      throw new Error("Fischl browser row missing.");
    }
    await user.click(fischlSection);

    await waitFor(() => expect(screen.getByLabelText("Character")).toHaveValue("Fischl"));
    expect(findPickerChoice("Sands", "HP%").some((button) => button.getAttribute("aria-pressed") === "true")).toBe(false);
    expect(screen.getByRole("button", { name: "Golden Troupe", pressed: true })).toBeInTheDocument();
  });

  it("preserves selection across view changes and keeps the editor visible when incomplete-only hides the row", async () => {
    const user = userEvent.setup();

    render(<ArtifactGoalsTab plannerOutput={UNUSED_PLANNER_OUTPUT} />);

    await user.click(screen.getAllByRole("button", { name: "Add Artifact Goal" })[0]);

    const editor = await waitForEditor();

    await user.selectOptions(within(editor).getByLabelText("Character"), "Neuvillette");
    await user.type(within(editor).getByLabelText("Goal name"), "Persistent Goal");
    await user.click(within(within(editor).getByRole("group", { name: "Artifact sets" })).getByRole("button", { name: "Marechaussee Hunter" }));
    await waitFor(() => expect(findArtifactBrowserButton("Neuvillette")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /By Domain/i }));
    await waitFor(() => expect(screen.getByLabelText("Character")).toHaveValue("Neuvillette"));
    expect(screen.getAllByText("Denouement of Sin").length).toBeGreaterThan(0);

    await user.click(within(editor).getByLabelText(/Sands obtained/i));
    await user.click(within(editor).getByLabelText(/Goblet obtained/i));
    await user.click(within(editor).getByLabelText(/Circlet obtained/i));
    await waitFor(() => expect(screen.getAllByText("3/3 key pieces obtained").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("checkbox", { name: /Incomplete Only/i }));

    expect(screen.getByText("No goals match this filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Character")).toHaveValue("Neuvillette");
    expect(screen.getByText("Changes save automatically.")).toBeInTheDocument();
  });

  it("selects a deterministic fallback goal after deletion", async () => {
    const user = userEvent.setup();

    render(<ArtifactGoalsTab plannerOutput={UNUSED_PLANNER_OUTPUT} />);

    await user.click(screen.getAllByRole("button", { name: "Add Artifact Goal" })[0]);
    let editor = await waitForEditor();
    await user.selectOptions(within(editor).getByLabelText("Character"), "Fischl");
    await user.type(within(editor).getByLabelText("Goal name"), "Fischl Goal");
    await waitFor(() => expect(findArtifactBrowserButton("Fischl")).toBeTruthy());

    await user.click(screen.getAllByRole("button", { name: "Add Artifact Goal" })[0]);
    editor = await waitForEditor();
    await user.selectOptions(within(editor).getByLabelText("Character"), "Neuvillette");
    await user.type(within(editor).getByLabelText("Goal name"), "Neuv Goal");
    await waitFor(() => expect(findArtifactBrowserButton("Neuvillette")).toBeTruthy());

    const neuvSection = findArtifactBrowserButton("Neuvillette");
    if (!neuvSection) {
      throw new Error("Neuvillette browser row missing before delete.");
    }
    await user.click(neuvSection);
    await waitFor(() => expect(screen.getByLabelText("Character")).toHaveValue("Neuvillette"));

    const activeEditor = getEditor();
    if (!activeEditor) {
      throw new Error("Active editor missing before delete.");
    }
    await user.click(within(activeEditor).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.getByLabelText("Character")).toHaveValue("Fischl"));
    expect(screen.getByLabelText("Character")).toHaveValue("Fischl");
  });

  it("stays scoped to the active account when switching accounts", async () => {
    const saveFile = createDefaultSaveFile(FIXED_DATE);
    const staticData = createStaticData();
    const accountAId = saveFile.user.activeAccountId;
    const accountBId = "account-b";

    saveFile.user.accountsById[accountAId] = {
      ...saveFile.user.accountsById[accountAId],
      name: "Account A",
      characters: [
        {
          characterId: "Neuvillette",
          currentLevel: 80,
          currentAscension: 5,
          currentTalents: { normal: 1, skill: 8, burst: 8 },
        },
      ],
      goals: {
        ...saveFile.user.accountsById[accountAId].goals,
        artifactGoals: [
          {
            id: "artifact-a",
            characterKey: "Neuvillette",
            goalName: "A goal",
            targetSetKeys: ["MarechausseeHunter"],
            priority: 3,
            mainStatTargets: { sands: [], goblet: [], circlet: [] },
            desiredSubstats: [],
            progress: {
              sandsObtained: false,
              gobletObtained: false,
              circletObtained: false,
            },
            enabled: true,
          },
        ],
      },
    };
    saveFile.user.accountsById[accountBId] = {
      ...saveFile.user.accountsById[accountAId],
      id: accountBId,
      name: "Account B",
      characters: [
        {
          characterId: "Fischl",
          currentLevel: 80,
          currentAscension: 5,
          currentTalents: { normal: 1, skill: 8, burst: 8 },
        },
      ],
      goals: {
        ...saveFile.user.accountsById[accountAId].goals,
        artifactGoals: [
          {
            id: "artifact-b",
            characterKey: "Fischl",
            goalName: "B goal",
            targetSetKeys: ["GoldenTroupe"],
            priority: 3,
            mainStatTargets: { sands: [], goblet: [], circlet: [] },
            desiredSubstats: [],
            progress: {
              sandsObtained: false,
              gobletObtained: false,
              circletObtained: false,
            },
            enabled: true,
          },
        ],
      },
    };
    saveFile.user.accountOrder = [accountAId, accountBId];

    useAppStore.setState({
      staticData,
      overridePack: null,
      user: structuredClone(saveFile.user),
      settings: structuredClone(saveFile.settings),
      today: "Tuesday",
      importErrors: [],
      importWarnings: [],
      overrideText: "",
      saveInfo: toSaveInfo(saveFile),
      isHydrated: true,
    });

    render(<ArtifactGoalsTab plannerOutput={UNUSED_PLANNER_OUTPUT} />);

    expect(screen.getByLabelText("Character")).toHaveValue("Neuvillette");

    useAppStore.setState((state) => ({
      user: {
        ...state.user,
        activeAccountId: accountBId,
      },
    }));

    await waitFor(() => expect(screen.getByLabelText("Character")).toHaveValue("Fischl"));
    expect(screen.queryByDisplayValue("A goal")).not.toBeInTheDocument();
  });
});
