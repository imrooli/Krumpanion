import { describe, expect, it } from "vitest";
import type { ImportWarning } from "../../domain/good/types";
import type { KrumpanionGoals } from "../../domain/goals/types";
import type { MaterialNeedRow, PlannerOutput, PlannerWarning } from "../../domain/planner/types";
import type { StaticDataIssue } from "../../domain/staticData/validateStaticData";
import {
  buildDataHealthCenterModel,
  filterDataHealthIssues,
  groupDataHealthIssues,
} from "./dataHealthModel";

const GOALS: KrumpanionGoals = {
  characterGoals: {
    Albedo: {
      characterKey: "Albedo",
      priority: 1,
      enabled: true,
    },
  },
  weaponGoals: {
    atlas: {
      weaponKey: "SkywardAtlas",
      priority: 1,
      enabled: true,
    },
  },
  artifactGoals: [],
  plannerSettings: {
    dailyResinBudget: 180,
    includeArtifactGoals: true,
  },
  version: 4,
};

function makeRow(overrides: Partial<MaterialNeedRow>): MaterialNeedRow {
  return {
    materialKey: "ChaosCore",
    displayName: "Chaos Core",
    progressionNeeded: 6,
    extraNeeded: 0,
    needed: 6,
    owned: 0,
    missing: 6,
    rawMissing: 6,
    craftableQuantity: 0,
    effectiveOwned: 0,
    effectiveDeficit: 6,
    category: "elite_enemy_drop",
    usedBy: [
      {
        goalType: "weapon",
        key: "atlas",
        amount: 6,
        displayName: "Skyward Atlas",
      },
    ],
    sources: [],
    ...overrides,
  };
}

const PLANNER_OUTPUT = {
  totalMissingByMaterial: [
    makeRow({ materialKey: "ChaosCore", displayName: "Chaos Core" }),
    makeRow({ materialKey: "BasaltPillar", displayName: "Basalt Pillar", category: "normal_boss_material" }),
  ],
  warnings: [],
} as unknown as PlannerOutput;

describe("buildDataHealthCenterModel", () => {
  it("normalizes static, planner, and import warnings into user-facing issues", () => {
    const staticIssues: StaticDataIssue[] = [
      {
        id: "character_profile:missing_rarity:Albedo",
        severity: "warning",
        category: "character_profile",
        subCategory: "character_catalog_metadata",
        recordType: "character",
        entityKey: "Albedo",
        entityName: "Albedo",
        message: "Albedo is missing rarity metadata.",
        suggestedFix: "Add rarity to the character profile.",
      },
    ];
    const plannerWarnings: PlannerWarning[] = [
      {
        type: "missing_source_metadata",
        key: "ChaosCore",
        message: "Chaos Core is missing source metadata.",
      },
    ];
    const importWarnings: ImportWarning[] = [
      {
        type: "unknown_weapon",
        key: "UnknownBlade",
        message: "Weapon UnknownBlade could not be matched to the canonical weapon database.",
      },
    ];

    const model = buildDataHealthCenterModel({
      staticIssues,
      plannerWarnings,
      importWarnings,
      goals: GOALS,
      plannerOutput: PLANNER_OUTPUT,
    });

    expect(model.summary.warningCount).toBe(3);
    expect(model.categories).toContain("Missing Playable Profile Data");
    expect(model.categories).toContain("Missing Material Source");
    expect(model.categories).toContain("Naming or GOOD Import Mismatch");
    expect(model.issues.find((issue) => issue.affectedName === "Albedo")?.editorTarget?.entityType).toBe("characters");
    expect(model.issues.find((issue) => issue.affectedKey === "ChaosCore")?.category).toBe("Missing Material Source");
    expect(model.issues.find((issue) => issue.affectedKey === "UnknownBlade")?.canNavigateToEditor).toBe(false);
    expect(model.issues.find((issue) => issue.affectedKey === "UnknownBlade")?.editorTarget?.workspaceTab).toBe("rawHealth");
  });

  it("maps beta and ignored static issues into separate severities", () => {
    const staticIssues: StaticDataIssue[] = [
      {
        id: "weapon_profile:manual_review:TestBlade",
        severity: "warning",
        category: "weapon_profile",
        actionGroup: "manual_review",
        recordType: "weapon",
        entityKey: "TestBlade",
        message: "Test Blade still requires manual review.",
      },
      {
        id: "character_profile:ignored:Manekin",
        severity: "info",
        category: "character_profile",
        actionGroup: "ignored_records",
        subCategory: "ignored_record",
        recordType: "character",
        entityKey: "Manekin",
        message: "Manekin is intentionally excluded from playable planning.",
      },
    ];

    const model = buildDataHealthCenterModel({
      staticIssues,
      plannerWarnings: [],
      importWarnings: [],
      goals: GOALS,
      plannerOutput: PLANNER_OUTPUT,
    });

    expect(model.summary.betaCount).toBe(1);
    expect(model.summary.ignoredCount).toBe(1);
    expect(model.issues.find((issue) => issue.affectedKey === "TestBlade")?.severity).toBe("beta");
    expect(model.issues.find((issue) => issue.affectedKey === "Manekin")?.severity).toBe("ignored");
  });

  it("prioritizes issues that affect active goals above unrelated warnings", () => {
    const staticIssues: StaticDataIssue[] = [
      {
        id: "material_source:missing:ChaosCore",
        severity: "warning",
        category: "material_source",
        recordType: "material",
        entityKey: "ChaosCore",
        entityName: "Chaos Core",
        message: "Chaos Core has no source metadata.",
      },
      {
        id: "material_source:missing:UnusedMaterial",
        severity: "warning",
        category: "material_source",
        recordType: "material",
        entityKey: "UnusedMaterial",
        entityName: "Unused Material",
        message: "Unused Material has no source metadata.",
      },
    ];

    const model = buildDataHealthCenterModel({
      staticIssues,
      plannerWarnings: [],
      importWarnings: [],
      goals: GOALS,
      plannerOutput: PLANNER_OUTPUT,
    });

    expect(model.issues[0]?.affectedKey).toBe("ChaosCore");
    expect(model.issues[0]?.affectsActiveGoals).toBe(true);
    expect(model.issues[1]?.affectedKey).toBe("UnusedMaterial");
    expect(model.issues[1]?.affectsActiveGoals).toBe(false);
  });

  it("filters by severity, category, affected type, active-goal impact, and search", () => {
    const model = buildDataHealthCenterModel({
      staticIssues: [
        {
          id: "character_profile:missing:Albedo",
          severity: "warning",
          category: "character_profile",
          recordType: "character",
          entityKey: "Albedo",
          entityName: "Albedo",
          message: "Albedo is missing rarity metadata.",
        },
      ],
      plannerWarnings: [
        {
          type: "missing_source_metadata",
          key: "ChaosCore",
          message: "Chaos Core is missing source metadata.",
        },
      ],
      importWarnings: [],
      goals: GOALS,
      plannerOutput: PLANNER_OUTPUT,
    });

    const filtered = filterDataHealthIssues(model.issues, {
      search: "chaos",
      severity: "warning",
      category: "Missing Material Source",
      affectedType: "material",
      activeGoalImpactOnly: true,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.affectedKey).toBe("ChaosCore");
  });

  it("groups filtered issues by category, source, or affected type", () => {
    const model = buildDataHealthCenterModel({
      staticIssues: [
        {
          id: "character_profile:missing:Albedo",
          severity: "warning",
          category: "character_profile",
          recordType: "character",
          entityKey: "Albedo",
          entityName: "Albedo",
          message: "Albedo is missing rarity metadata.",
        },
      ],
      plannerWarnings: [
        {
          type: "missing_source_metadata",
          key: "ChaosCore",
          message: "Chaos Core is missing source metadata.",
        },
      ],
      importWarnings: [],
      goals: GOALS,
      plannerOutput: PLANNER_OUTPUT,
    });

    expect(groupDataHealthIssues(model.issues, "category").map((group) => group.label)).toContain("Missing Material Source");
    expect(groupDataHealthIssues(model.issues, "source").map((group) => group.label)).toContain("planner");
    expect(groupDataHealthIssues(model.issues, "affectedType").map((group) => group.label)).toContain("Character");
  });
});
