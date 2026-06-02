import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataHealthCenterModel } from "./dataHealthModel";
import { DataHealthCenter } from "./DataHealthCenter";

const MODEL: DataHealthCenterModel = {
  summary: {
    totalIssues: 3,
    blockingCount: 0,
    warningCount: 2,
    infoCount: 0,
    betaCount: 1,
    ignoredCount: 0,
  },
  categories: [
    "Missing Material Source",
    "Missing Playable Profile Data",
    "Beta or Unverified Data",
  ],
  affectedTypes: ["character", "material", "weapon"],
  cleanupItems: [
    {
      key: "active_goal_issues",
      label: "Fix active goal issues",
      count: 1,
      severity: "all",
      activeOnly: true,
    },
  ],
  issues: [
    {
      id: "issue-material",
      severity: "warning",
      category: "Missing Material Source",
      title: "Material source missing",
      shortMessage: "Chaos Core is missing source metadata.",
      affectedType: "material",
      affectedKey: "ChaosCore",
      affectedName: "Chaos Core",
      sourceArea: "sources",
      sourceFile: "src/data/database/sources/materialSources.json",
      suggestedAction: "Add material source rows.",
      canNavigateToEditor: true,
      editorTarget: {
        workspaceTab: "legacy",
        section: "sources",
        entityType: "materialSources",
        recordKey: "ChaosCore",
      },
      relatedKeys: ["ChaosCore"],
      details: "Add enemy-drop or domain source metadata.",
      affectsActiveGoals: true,
      priorityRank: 0,
      rawSourceType: "static_data",
    },
    {
      id: "issue-character",
      severity: "warning",
      category: "Missing Playable Profile Data",
      title: "Character rarity missing",
      shortMessage: "Albedo is missing rarity metadata.",
      affectedType: "character",
      affectedKey: "Albedo",
      affectedName: "Albedo",
      sourceArea: "characters",
      sourceFile: "src/data/database/characters/characterProfiles.json",
      suggestedAction: "Add rarity metadata.",
      canNavigateToEditor: true,
      editorTarget: {
        workspaceTab: "legacy",
        section: "profiles",
        entityType: "characterProfiles",
        recordKey: "Albedo",
      },
      relatedKeys: ["Albedo"],
      details: "Character rarity is used for filtering and display.",
      affectsActiveGoals: false,
      priorityRank: 3,
      rawSourceType: "static_data",
    },
    {
      id: "issue-beta",
      severity: "beta",
      category: "Beta or Unverified Data",
      title: "Weapon profile needs manual review",
      shortMessage: "Test Blade still requires manual review.",
      affectedType: "weapon",
      affectedKey: "TestBlade",
      affectedName: "Test Blade",
      sourceArea: "weapons",
      sourceFile: "src/data/database/weapons/weaponProfiles.json",
      suggestedAction: "Keep excluded until verified.",
      canNavigateToEditor: true,
      editorTarget: {
        workspaceTab: "legacy",
        section: "profiles",
        entityType: "weaponProfiles",
        recordKey: "TestBlade",
      },
      relatedKeys: ["TestBlade"],
      details: "Manual-review records should stay out of normal planning.",
      affectsActiveGoals: false,
      priorityRank: 6,
      rawSourceType: "static_data",
    },
  ],
};

describe("DataHealthCenter", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a compact summary and keeps details collapsed by default", () => {
    render(<DataHealthCenter model={MODEL} onOpenIssue={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /Data Health Center/i })).toBeInTheDocument();
    expect(screen.getAllByText("Blocking").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Warnings").length).toBeGreaterThan(0);
    expect(screen.getByText(/Add enemy-drop or domain source metadata/i)).not.toBeVisible();
  });

  it("shows issue details only when expanded", async () => {
    const user = userEvent.setup();
    render(<DataHealthCenter model={MODEL} onOpenIssue={vi.fn()} />);

    await user.click(screen.getByText(/Material source missing/i));
    expect(screen.getByText(/Add enemy-drop or domain source metadata/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit material source/i })).toBeInTheDocument();
  });

  it("supports filters, search, and active-goal shortcuts", async () => {
    const user = userEvent.setup();
    render(<DataHealthCenter model={MODEL} onOpenIssue={vi.fn()} />);

    await user.type(screen.getByLabelText(/Search issues/i), "Albedo");
    expect(screen.getByText(/Character rarity missing/i)).toBeInTheDocument();
    expect(screen.queryByText(/Material source missing/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Search issues/i));
    await user.selectOptions(screen.getByLabelText(/Severity/i), "beta");
    expect(screen.getByText(/Weapon profile needs manual review/i)).toBeInTheDocument();
    expect(screen.queryByText(/Character rarity missing/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Severity/i), "all");
    await user.click(screen.getByRole("button", { name: /Fix active goal issues/i }));
    expect(screen.getByText(/Material source missing/i)).toBeInTheDocument();
    expect(screen.queryByText(/Character rarity missing/i)).not.toBeInTheDocument();
  });

  it("shows a helpful empty state when filters hide everything", async () => {
    const user = userEvent.setup();
    render(<DataHealthCenter model={MODEL} onOpenIssue={vi.fn()} />);

    await user.type(screen.getByLabelText(/Search issues/i), "NoMatch");
    expect(screen.getByText(/No issues match these filters/i)).toBeInTheDocument();
  });

  it("shows the active-goal empty state when nothing active is affected", async () => {
    const user = userEvent.setup();
    const idleModel: DataHealthCenterModel = {
      ...MODEL,
      issues: MODEL.issues.map((issue) => ({ ...issue, affectsActiveGoals: false, priorityRank: 8 })),
      cleanupItems: [],
    };

    render(<DataHealthCenter model={idleModel} onOpenIssue={vi.fn()} />);

    await user.click(screen.getByLabelText(/Active goal impact/i));
    expect(screen.getByText(/No active goals are affected by current database warnings/i)).toBeInTheDocument();
  });
});
