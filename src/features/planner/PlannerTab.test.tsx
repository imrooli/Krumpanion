import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultSaveFile } from "../../domain/save/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { buildPlannerOutput } from "../../domain/planner/buildPlannerRows";
import { buildLeyLineEnemyDropRecommendations } from "../../domain/planner/buildLeyLineEnemyDropRecommendations";
import { DEFAULT_GOALS } from "../../domain/goals/types";
import type { MaterialNeedRow, PlannerOutput, PlannerRecommendation } from "../../domain/planner/types";
import { PlannerTab } from "./PlannerTab";

const FIXED_DATE = new Date("2026-05-07T12:00:00.000Z");

function resetStore() {
  const saveFile = createDefaultSaveFile(FIXED_DATE);
  useAppStore.setState({
    staticData: createStaticData(),
    overridePack: null,
    user: structuredClone(saveFile.user),
    settings: {
      ...structuredClone(saveFile.settings),
      plannerView: "today",
    },
    today: "Monday",
    importErrors: [],
    importWarnings: [],
    overrideText: "",
    saveInfo: toSaveInfo(saveFile),
    isHydrated: true,
  });
}

function withUnknownEstimateRow(plannerOutput: PlannerOutput): PlannerOutput {
  const unknownRow: PlannerRecommendation = {
    id: "unknown-row",
    title: "Resolve Mystery Ore",
    category: "custom",
    actionGroup: "passive_incidental",
    actionSubgroup: "unknown_estimates",
    priority: 1,
    availability: "UNKNOWN",
    sourceName: "Unknown source",
    resinCost: undefined,
    resinPerRun: null,
    totalEstimatedResin: null,
    resinLabel: "Missing estimate data",
    estimatedRuns: null,
    actionableRuns: null,
    relatedGoalKeys: ["prefarm:CoolSteel"],
    relatedGoalLabels: [],
    requiredMaterials: [{ materialId: "MysteryOre", quantity: 4 }],
    expectedRewards: [],
    reason: "Missing source metadata for Mystery Ore.",
    blockedBy: ["Missing source metadata for Mystery Ore."],
    isAvailableToday: false,
    warnings: ["Missing source metadata for Mystery Ore."],
    estimateBasis: "Add canonical source metadata for Mystery Ore.",
    dataQuality: "unknown",
  };

  const sections = plannerOutput.plannerReport.sections.filter((section) => section.key !== "unknown_estimates");
  sections.push({
    key: "unknown_estimates",
    label: "Unknown / Missing Estimate Data",
    rows: [unknownRow],
  });

  return {
    ...plannerOutput,
    plannerReport: {
      ...plannerOutput.plannerReport,
      sections,
    },
  };
}

function withLeyLineEnemyDropRow(plannerOutput: PlannerOutput): PlannerOutput {
  const staticData = createStaticData();
  const rows: MaterialNeedRow[] = [
    {
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
      familyId: "humanoid_ruin_machine_materials",
      familyDisplayName: "Humanoid Ruin Machine Materials",
      sourceEnemyFamily: "Ruin Guards and Ruin Hunters",
      usedBy: [{ goalType: "weapon", key: "prefarm:SkywardAtlas", amount: 6, displayName: "Skyward Atlas weapon goal" }],
      sources: staticData.materialSources.ChaosCore ?? [],
    },
  ];

  const [recommendation] = buildLeyLineEnemyDropRecommendations({
    materialRows: rows,
    staticData,
    goals: {
      ...DEFAULT_GOALS,
      characterGoals: {},
      weaponGoals: {
        "prefarm:SkywardAtlas": {
          id: "prefarm:SkywardAtlas",
          weaponKey: "SkywardAtlas",
          enabled: true,
          priority: 3,
          planningMode: "prefarm",
          targetLevel: 90,
          targetAscension: 6,
        },
      },
      artifactGoals: [],
    },
  });

  return {
    ...plannerOutput,
    recommendations: [...plannerOutput.recommendations, recommendation],
    plannerReport: {
      ...plannerOutput.plannerReport,
      sections: [
        ...plannerOutput.plannerReport.sections,
        {
          key: "ley_line_enemy_drops",
          label: "Ley Line Enemy Drop Recommendations",
          rows: [recommendation],
        },
      ],
    },
  };
}

function withOverallLeyLineEnemyDropRows(plannerOutput: PlannerOutput): PlannerOutput {
  const staticData = createStaticData();
  const rows: MaterialNeedRow[] = [
    {
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
      familyId: "humanoid_ruin_machine_materials",
      familyDisplayName: "Humanoid Ruin Machine Materials",
      sourceEnemyFamily: "Ruin Guards and Ruin Hunters",
      usedBy: [{ goalType: "weapon", key: "prefarm:SkywardAtlas", amount: 6, displayName: "Skyward Atlas weapon goal" }],
      sources: staticData.materialSources.ChaosCore ?? [],
    },
    {
      materialKey: "FeatheryFin",
      displayName: "Feathery Fin",
      progressionNeeded: 4,
      extraNeeded: 0,
      needed: 4,
      owned: 0,
      missing: 4,
      rawMissing: 4,
      craftableQuantity: 0,
      effectiveOwned: 0,
      effectiveDeficit: 4,
      category: "elite_enemy_drop",
      familyId: "xuanwen_beast_materials",
      familyDisplayName: "Xuanwen Beast Materials",
      sourceEnemyFamily: "Xuanwen Beasts",
      usedBy: [{ goalType: "weapon", key: "prefarm:SkywardAtlas", amount: 4, displayName: "Skyward Atlas weapon goal" }],
      sources: staticData.materialSources.FeatheryFin ?? [],
    },
  ];

  const recommendations = buildLeyLineEnemyDropRecommendations({
    materialRows: rows,
    staticData,
    goals: {
      ...DEFAULT_GOALS,
      characterGoals: {},
      weaponGoals: {
        "prefarm:SkywardAtlas": {
          id: "prefarm:SkywardAtlas",
          weaponKey: "SkywardAtlas",
          enabled: true,
          priority: 3,
          planningMode: "prefarm",
          targetLevel: 90,
          targetAscension: 6,
        },
      },
      artifactGoals: [],
    },
  });

  return {
    ...plannerOutput,
    recommendations: [...plannerOutput.recommendations, ...recommendations],
    plannerReport: {
      ...plannerOutput.plannerReport,
      sections: [
        ...plannerOutput.plannerReport.sections,
        {
          key: "ley_line_enemy_drops",
          label: "Ley Line Enemy Drop Recommendations",
          rows: recommendations,
        },
      ],
    },
  };
}

function withOpenWorldEnemyRows(plannerOutput: PlannerOutput): PlannerOutput {
  const commonEnemyRow: PlannerRecommendation = {
    id: "open-world-common-row",
    title: "Farm Hilichurl Shooters",
    category: "custom",
    actionGroup: "open_world",
    priority: 12,
    availability: "ALWAYS",
    sourceName: "Hilichurl Shooters",
    resinCost: undefined,
    resinPerRun: null,
    totalEstimatedResin: null,
    resinLabel: "No resin",
    estimatedRuns: null,
    actionableRuns: null,
    relatedGoalKeys: ["Amber"],
    relatedGoalLabels: ["Amber character goal"],
    requiredMaterials: [{ materialId: "FirmArrowhead", quantity: 18 }],
    expectedRewards: [],
    reason: "Need Firm Arrowhead for Amber.",
    blockedBy: [],
    isAvailableToday: true,
    warnings: [],
  };

  const eliteEnemyRow: PlannerRecommendation = {
    id: "open-world-elite-row",
    title: "Farm Ruin Guards and Ruin Hunters",
    category: "custom",
    actionGroup: "open_world",
    priority: 10,
    availability: "ALWAYS",
    sourceName: "Ruin Guards and Ruin Hunters",
    resinCost: undefined,
    resinPerRun: null,
    totalEstimatedResin: null,
    resinLabel: "No resin",
    estimatedRuns: null,
    actionableRuns: null,
    relatedGoalKeys: ["prefarm:SkywardAtlas"],
    relatedGoalLabels: ["Skyward Atlas weapon goal"],
    requiredMaterials: [{ materialId: "ChaosCore", quantity: 6 }],
    expectedRewards: [],
    reason: "Need Chaos Core for Skyward Atlas.",
    blockedBy: [],
    isAvailableToday: true,
    warnings: [],
  };

  const sections = plannerOutput.plannerReport.sections.filter((section) => section.key !== "open_world");
  sections.push({
    key: "open_world",
    label: "Open World",
    rows: [commonEnemyRow, eliteEnemyRow],
  });

  return {
    ...plannerOutput,
    recommendations: [...plannerOutput.recommendations, commonEnemyRow, eliteEnemyRow],
    plannerReport: {
      ...plannerOutput.plannerReport,
      sections,
    },
  };
}

describe("PlannerTab", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the new planner tabs and today-first layout", () => {
    const plannerOutput = buildPlannerOutput({
      inventory: {
        CrystalChunk: 160,
        RainbowdropCrystal: 40,
        EnhancementOre: 10,
        FineEnhancementOre: 5,
        MysticEnhancementOre: 2,
      },
      ownership: {
        characters: [],
        weapons: [],
        artifacts: [],
      },
      goals: {
        ...DEFAULT_GOALS,
        characterGoals: {},
        weaponGoals: {
          "prefarm:CoolSteel": {
            id: "prefarm:CoolSteel",
            weaponKey: "CoolSteel",
            enabled: true,
            priority: 3,
            planningMode: "prefarm",
            targetLevel: 40,
            targetAscension: 1,
          },
        },
        artifactGoals: [],
      },
      staticData: createStaticData(),
      today: "Monday",
      resinSettings: DEFAULT_GOALS.plannerSettings,
    });

    render(<PlannerTab plannerOutput={plannerOutput} />);

    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "This Week" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No Resin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Progression" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today Summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Best Next Actions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today's Domains of Forgery" })).toBeInTheDocument();
    expect(screen.getAllByText("Cool Steel weapon goal").length).toBeGreaterThan(0);
  });

  it("shows weekly and no-resin content in their dedicated tabs", async () => {
    const user = userEvent.setup();
    const plannerOutput = withLeyLineEnemyDropRow(
      withUnknownEstimateRow(
        buildPlannerOutput({
          inventory: {},
          ownership: {
            characters: [
              {
                characterId: "Zhongli",
                currentLevel: 1,
                currentAscension: 0,
                currentTalents: {
                  normal: 1,
                  skill: 1,
                  burst: 1,
                },
              },
            ],
            weapons: [],
            artifacts: [],
          },
          goals: {
            ...DEFAULT_GOALS,
            characterGoals: {
              Zhongli: {
                characterKey: "Zhongli",
                enabled: true,
                priority: 3,
                targetLevel: 90,
                targetAscension: 6,
              },
            },
            weaponGoals: {},
            artifactGoals: [],
          },
          staticData: createStaticData(),
          today: "Monday",
          resinSettings: {
            ...DEFAULT_GOALS.plannerSettings,
            worldLevel: 9,
          },
        }),
      ),
    );

    render(<PlannerTab plannerOutput={plannerOutput} />);

    await user.click(screen.getByRole("button", { name: "This Week" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "This Week" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("heading", { name: "Weekly Summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Domain Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Time-Gated Materials" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "No Resin" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "No Resin" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("heading", { name: "Ley Line Enemy Drop Recommendations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Craftable Improvements" })).toBeInTheDocument();
    expect(screen.getAllByText("Humanoid Ruin Machine Materials").length).toBeGreaterThan(0);
    expect(screen.getByText("Chaos Core x6")).toBeInTheDocument();
    expect(screen.getByText("Best nation")).toBeInTheDocument();
    expect(screen.getAllByText("Liyue").length).toBeGreaterThan(0);
  });

  it("shows overall ley line nation guidance in the no-resin tab", async () => {
    const user = userEvent.setup();
    const plannerOutput = withOverallLeyLineEnemyDropRows(
      buildPlannerOutput({
        inventory: {},
        ownership: {
          characters: [],
          weapons: [],
          artifacts: [],
        },
        goals: {
          ...DEFAULT_GOALS,
          characterGoals: {},
          weaponGoals: {},
          artifactGoals: [],
        },
        staticData: createStaticData(),
        today: "Monday",
        resinSettings: DEFAULT_GOALS.plannerSettings,
      }),
    );

    render(<PlannerTab plannerOutput={plannerOutput} />);

    await user.click(screen.getByRole("button", { name: "No Resin" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "No Resin" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getAllByText("Best nations overall").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Best nation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Liyue").length).toBeGreaterThan(0);
  });

  it("separates open-world enemy drops into common and elite sections", async () => {
    const user = userEvent.setup();
    const plannerOutput = withOpenWorldEnemyRows(
      buildPlannerOutput({
        inventory: {},
        ownership: {
          characters: [],
          weapons: [],
          artifacts: [],
        },
        goals: {
          ...DEFAULT_GOALS,
          characterGoals: {},
          weaponGoals: {},
          artifactGoals: [],
        },
        staticData: createStaticData(),
        today: "Monday",
        resinSettings: DEFAULT_GOALS.plannerSettings,
      }),
    );

    render(<PlannerTab plannerOutput={plannerOutput} />);

    await user.click(screen.getByRole("button", { name: "No Resin" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "No Resin" })).toHaveAttribute("aria-pressed", "true"));

    const commonSection = screen.getByRole("heading", { name: "Common Enemy Drops" }).closest("article.section-card");
    const eliteSection = screen.getByRole("heading", { name: "Elite Enemy Drops" }).closest("article.section-card");

    expect(commonSection).not.toBeNull();
    expect(eliteSection).not.toBeNull();
    expect(within(commonSection as HTMLElement).getByText("Hilichurl Shooters")).toBeInTheDocument();
    expect(within(commonSection as HTMLElement).queryByText("Ruin Guards and Ruin Hunters")).not.toBeInTheDocument();
    expect(within(eliteSection as HTMLElement).getByText("Ruin Guards and Ruin Hunters")).toBeInTheDocument();
    expect(within(eliteSection as HTMLElement).queryByText("Hilichurl Shooters")).not.toBeInTheDocument();
  });

  it("shows grouped goal progress bars and secondary artifact summaries in the progression tab", async () => {
    const user = userEvent.setup();
    await useAppStore.getState().setActiveMaterialQuantity("Mora", 1200);
    const activeAccountId = useAppStore.getState().user.activeAccountId;
    useAppStore.setState((state) => ({
      user: {
        ...state.user,
        accountsById: {
          ...state.user.accountsById,
          [activeAccountId]: {
            ...state.user.accountsById[activeAccountId],
            goalProgressTracking: {
              "character:Zhongli": {
                goalId: "Zhongli",
                goalType: "character",
                goalLabel: "Zhongli",
                targetSignature: "zhongli",
                startedAt: "2026-05-20T09:00:00.000Z",
                completedAt: "2026-05-26T12:00:00.000Z",
                baseline: {
                  mora: 1000,
                  characterExp: 0,
                  weaponExp: 0,
                  materials: 0,
                },
              },
              "character:Furina": {
                goalId: "Furina",
                goalType: "character",
                goalLabel: "Furina",
                targetSignature: "furina",
                startedAt: "2026-05-22T09:00:00.000Z",
                baseline: {
                  mora: 1200000,
                  characterExp: 80,
                  weaponExp: 0,
                  materials: 18,
                },
              },
              "weapon:prefarm:CoolSteel": {
                goalId: "prefarm:CoolSteel",
                goalType: "weapon",
                goalLabel: "Cool Steel",
                targetSignature: "cool-steel",
                startedAt: "2026-05-24T09:00:00.000Z",
                baseline: {
                  mora: 2000,
                  characterExp: 0,
                  weaponExp: 10,
                  materials: 2,
                },
              },
            },
            goalMilestones: [
              {
                id: "milestone-zhongli",
                goalId: "Zhongli",
                goalType: "character",
                goalLabel: "Zhongli",
                milestoneType: "character_built",
                occurredAt: "2026-05-26T12:00:00.000Z",
                startedAt: "2026-05-20T09:00:00.000Z",
                targetSummary: "Lv 90 / A6 / 9-9-9",
              },
            ],
          },
        },
      },
    }));
    const plannerOutput = buildPlannerOutput({
      inventory: useAppStore.getState().user.accountsById[activeAccountId]?.inventory ?? {},
      ownership: {
        characters: [
          {
            characterId: "Zhongli",
            currentLevel: 90,
            currentAscension: 6,
            currentTalents: {
              normal: 9,
              skill: 9,
              burst: 9,
            },
          },
        ],
        weapons: [
          {
            weaponInstanceId: "weapon-1",
            weaponKey: "CoolSteel",
            currentLevel: 1,
            currentAscension: 0,
            refinement: 1,
          },
        ],
        artifacts: [],
      },
      goals: {
        ...DEFAULT_GOALS,
        characterGoals: {
          Zhongli: {
            characterKey: "Zhongli",
            enabled: true,
            priority: 4,
            targetLevel: 90,
            targetAscension: 6,
            talents: {
              auto: 9,
              skill: 9,
              burst: 9,
            },
          },
          Furina: {
            characterKey: "Furina",
            enabled: true,
            priority: 3,
            planningMode: "prefarm",
            targetLevel: 90,
            targetAscension: 6,
            talents: {
              auto: 9,
              skill: 9,
              burst: 9,
            },
          },
        },
        weaponGoals: {
          "prefarm:CoolSteel": {
            id: "prefarm:CoolSteel",
            weaponKey: "CoolSteel",
            enabled: true,
            priority: 3,
            planningMode: "prefarm",
            targetLevel: 40,
            targetAscension: 1,
          },
        },
        artifactGoals: [
          {
            id: "artifact-goal-1",
            targetSetKeys: [],
            priority: 2,
            mainStatTargets: {
              sands: [],
              goblet: [],
              circlet: [],
            },
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
      staticData: createStaticData(),
      today: "Monday",
      resinSettings: DEFAULT_GOALS.plannerSettings,
    });

    render(<PlannerTab plannerOutput={plannerOutput} />);

    await user.click(screen.getByRole("button", { name: "Progression" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Progression" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("heading", { name: "Progress Snapshot" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Goal Progress" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Owned Characters" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pre-Farm Characters" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Weapons" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Mora readiness progress" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Material readiness progress" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Furina Character EXP progress" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Cool Steel Weapon EXP progress" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Zhongli Mora progress" })).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Zhongli account readiness" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Built").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Shared Mora ready|Needs shared Mora/i).length).toBeGreaterThan(0);
    const achievementsSection = screen.getByRole("heading", { name: "Recent Achievements" }).closest("article");
    expect(achievementsSection).not.toBeNull();
    if (!achievementsSection) {
      throw new Error("Recent Achievements section was not rendered.");
    }
    expect(within(achievementsSection).getByText(/Character built at Lv 90 \/ A6 \/ 9-9-9/i)).toBeInTheDocument();
    expect(within(achievementsSection).getByText(/5\/26\/2026/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent Activity" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Artifact Goals" })).not.toBeInTheDocument();
    const activitySection = screen.getByRole("heading", { name: "Recent Activity" }).closest("article");
    expect(activitySection).not.toBeNull();
    if (!activitySection) {
      throw new Error("Recent Activity section was not rendered.");
    }
    expect(within(activitySection).getByText("Mora")).toBeInTheDocument();
    expect(within(activitySection).getAllByText(/manual edit/i).length).toBeGreaterThan(0);
  });
});
