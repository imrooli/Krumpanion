import { describe, expect, it } from "vitest";
import { createBlankAccount } from "../../domain/account/types";
import type { ArtifactGoal } from "../../domain/goals/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { buildArtifactGoalsViewModel } from "./artifactGoalsModel";

function createAccountWithCharacters() {
  const account = createBlankAccount({
    id: "account-artifacts",
    name: "Artifacts",
    now: new Date("2026-06-03T12:00:00.000Z"),
  });

  return {
    ...account,
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
      {
        characterId: "Kazuha",
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
}

function createArtifactGoal(overrides: Partial<ArtifactGoal> = {}): ArtifactGoal {
  return {
    id: overrides.id ?? `artifact-goal-${Math.random().toString(16).slice(2)}`,
    characterKey: overrides.characterKey,
    goalName: overrides.goalName,
    targetSetKeys: overrides.targetSetKeys ?? [],
    priority: overrides.priority ?? 3,
    mainStatTargets: overrides.mainStatTargets ?? {
      sands: [],
      goblet: [],
      circlet: [],
    },
    desiredSubstats: overrides.desiredSubstats ?? [],
    progress: overrides.progress ?? {
      sandsObtained: false,
      gobletObtained: false,
      circletObtained: false,
    },
    enabled: overrides.enabled ?? true,
    notes: overrides.notes,
  };
}

describe("buildArtifactGoalsViewModel", () => {
  it("groups same-domain and split-domain goals correctly in the domain view", () => {
    const staticData = createStaticData();
    const account = createAccountWithCharacters();
    const viewModel = buildArtifactGoalsViewModel({
      account,
      staticData,
      incompleteOnly: false,
      goals: [
        createArtifactGoal({
          id: "neuv",
          characterKey: "Neuvillette",
          goalName: "Main DPS",
          targetSetKeys: ["MarechausseeHunter"],
          mainStatTargets: {
            sands: ["HP%", "Energy Recharge%"],
            goblet: ["Hydro DMG Bonus%"],
            circlet: ["CRIT DMG%", "CRIT Rate%"],
          },
          desiredSubstats: ["CRIT Rate%", "CRIT DMG%", "HP%", "Energy Recharge%"],
        }),
        createArtifactGoal({
          id: "fischl",
          characterKey: "Fischl",
          goalName: "Skill DPS",
          targetSetKeys: ["GoldenTroupe", "MarechausseeHunter"],
        }),
        createArtifactGoal({
          id: "kazuha",
          characterKey: "Kazuha",
          goalName: "Split domains",
          targetSetKeys: ["ViridescentVenerer", "EmblemOfSeveredFate"],
        }),
      ],
    });

    const denouement = viewModel.domainGroups.find((group) => group.label === "Denouement of Sin");
    const valley = viewModel.domainGroups.find((group) => group.label === "Valley of Remembrance");
    const momiji = viewModel.domainGroups.find((group) => group.label === "Momiji-Dyed Court");

    expect(denouement).toBeDefined();
    expect(denouement?.goals.map((goal) => goal.id)).toEqual(expect.arrayContaining(["neuv", "fischl"]));
    expect(denouement?.setLabels).toEqual(expect.arrayContaining(["Marechaussee Hunter", "Golden Troupe"]));
    expect(denouement?.goals.find((goal) => goal.id === "neuv")?.mainStatSummary).toContain("Sands HP% / Energy Recharge%");
    expect(valley?.goals.map((goal) => goal.id)).toContain("kazuha");
    expect(momiji?.goals.map((goal) => goal.id)).toContain("kazuha");
    expect(viewModel.visibleGoalIdsByView.character).toEqual(["fischl", "kazuha", "neuv"]);
    expect(viewModel.visibleGoalIdsByView.domain).toEqual(["fischl", "neuv", "kazuha"]);
    expect(viewModel.selectedGoalSummariesById.neuv.domainSummary).toBe("Denouement of Sin");
  });

  it("shows fallback domain grouping for unknown and no-standard-source sets", () => {
    const staticData = createStaticData();
    const account = createAccountWithCharacters();
    const viewModel = buildArtifactGoalsViewModel({
      account,
      staticData,
      incompleteOnly: false,
      goals: [
        createArtifactGoal({
          id: "glad",
          characterKey: "Neuvillette",
          targetSetKeys: ["GladiatorsFinale"],
        }),
        createArtifactGoal({
          id: "unknown",
          characterKey: "Fischl",
          targetSetKeys: ["UnknownArtifactSet"],
        }),
      ],
    });

    const fallbackGroup = viewModel.domainGroups.find((group) => group.key === "no-standard-source");
    expect(fallbackGroup).toBeDefined();
    expect(fallbackGroup?.goals.map((goal) => goal.id)).toEqual(expect.arrayContaining(["glad", "unknown"]));
    expect(fallbackGroup?.goals.find((goal) => goal.id === "unknown")?.warnings).toEqual(
      expect.arrayContaining(["Unknown artifact set UnknownArtifactSet."]),
    );
  });

  it("derives completion state and hides completed goals from incomplete-only view", () => {
    const staticData = createStaticData();
    const account = createAccountWithCharacters();
    const goals = [
      createArtifactGoal({
        id: "complete-goal",
        characterKey: "Neuvillette",
        targetSetKeys: ["MarechausseeHunter"],
        progress: {
          sandsObtained: true,
          gobletObtained: true,
          circletObtained: true,
        },
      }),
      createArtifactGoal({
        id: "partial-goal",
        characterKey: "Fischl",
        targetSetKeys: ["GoldenTroupe"],
        progress: {
          sandsObtained: true,
          gobletObtained: false,
          circletObtained: false,
        },
      }),
    ];

    const allGoals = buildArtifactGoalsViewModel({
      account,
      staticData,
      goals,
      incompleteOnly: false,
    });
    const incompleteOnly = buildArtifactGoalsViewModel({
      account,
      staticData,
      goals,
      incompleteOnly: true,
    });

    expect(allGoals.goalRows.find((goal) => goal.id === "complete-goal")?.status).toBe("complete");
    expect(allGoals.goalRows.find((goal) => goal.id === "complete-goal")?.progressLabel).toBe("3/3 key pieces obtained");
    expect(allGoals.goalRows.find((goal) => goal.id === "partial-goal")?.status).toBe("in_progress");
    expect(allGoals.goalRows.find((goal) => goal.id === "partial-goal")?.progressLabel).toBe("1/3 key pieces obtained");
    expect(incompleteOnly.domainGroups.flatMap((group) => group.goals.map((goal) => goal.id))).toEqual(["partial-goal"]);
    expect(incompleteOnly.characterGroups.flatMap((group) => group.goals.map((goal) => goal.id))).toEqual(["partial-goal"]);
    expect(incompleteOnly.visibleGoalIdsByView.character).toEqual(["partial-goal"]);
    expect(incompleteOnly.goalRowsById["complete-goal"]?.status).toBe("complete");
  });
});
