import { describe, expect, it } from "vitest";
import { createBlankAccount } from "../../domain/account/types";
import type { ArtifactGoal } from "../../domain/goals/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { buildArtifactCharacterOptions, buildArtifactGoalsViewModel } from "./artifactGoalsModel";

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
      flowerObtained: false,
      plumeObtained: false,
      sandsObtained: false,
      gobletObtained: false,
      circletObtained: false,
    },
    enabled: overrides.enabled ?? true,
    notes: overrides.notes,
  };
}

describe("buildArtifactGoalsViewModel", () => {
  it("includes goal-pickable unowned characters in artifact character options", () => {
    const staticData = createStaticData();
    const account = createAccountWithCharacters();

    const options = buildArtifactCharacterOptions(account, staticData);

    expect(options.find((option) => option.key === "Neuvillette")).toBeDefined();
    expect(options.find((option) => option.key === "KaedeharaKazuha")).toBeDefined();
    expect(options.find((option) => option.key === "Traveler")).toBeDefined();
  });

  it("groups same-domain and split-domain goals correctly in the domain view", () => {
    const staticData = createStaticData();
    const account = createAccountWithCharacters();
    const viewModel = buildArtifactGoalsViewModel({
      account,
      staticData,
      showCompleted: false,
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
    expect(denouement?.setGroups.map((group) => group.setLabel)).toEqual(expect.arrayContaining(["Marechaussee Hunter", "Golden Troupe"]));
    expect(denouement?.goals.find((goal) => goal.id === "neuv")?.mainStatSummary).toContain("Sands HP% / Energy Recharge%");
    expect(denouement?.setGroups[0]?.rows[0]?.slotLabel).toBeDefined();
    expect(valley?.goals.map((goal) => goal.id)).toContain("kazuha");
    expect(momiji?.goals.map((goal) => goal.id)).toContain("kazuha");
    expect(viewModel.characterGoals.visibleGoalIds).toEqual(["fischl", "kazuha", "neuv"]);
    expect(viewModel.goalEditor.visibleGoalIds).toEqual(["fischl", "kazuha", "neuv"]);
    expect(viewModel.domainGuide.visibleGoalIds).toEqual(expect.arrayContaining(["fischl", "kazuha", "neuv"]));
    expect(viewModel.selectedGoalSummariesById.neuv.domainSummary).toBe("Denouement of Sin");
    expect(viewModel.summary.charactersServed).toBe(3);
  });

  it("shows fallback domain grouping for unknown and no-standard-source sets", () => {
    const staticData = createStaticData();
    const account = createAccountWithCharacters();
    const viewModel = buildArtifactGoalsViewModel({
      account,
      staticData,
      showCompleted: false,
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
    expect(viewModel.summary.nonStandardSourceGoalCount).toBe(2);
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
          flowerObtained: true,
          plumeObtained: true,
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
          flowerObtained: false,
          plumeObtained: false,
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
      showCompleted: true,
    });
    const incompleteOnly = buildArtifactGoalsViewModel({
      account,
      staticData,
      goals,
      showCompleted: false,
    });

    expect(allGoals.goalRows.find((goal) => goal.id === "complete-goal")?.status).toBe("complete");
    expect(allGoals.goalRows.find((goal) => goal.id === "complete-goal")?.progressLabel).toBe("5/5 pieces obtained");
    expect(allGoals.goalRows.find((goal) => goal.id === "partial-goal")?.status).toBe("in_progress");
    expect(allGoals.goalRows.find((goal) => goal.id === "partial-goal")?.progressLabel).toBe("1/5 pieces obtained");
    expect(incompleteOnly.domainGroups.flatMap((group) => group.goals.map((goal) => goal.id))).toEqual(["partial-goal"]);
    expect(incompleteOnly.characterGroups.flatMap((group) => group.goals.map((goal) => goal.id))).toEqual(["partial-goal"]);
    expect(incompleteOnly.characterGoals.visibleGoalIds).toEqual(["partial-goal"]);
    expect(incompleteOnly.goalEditor.visibleGoalIds).toEqual(["partial-goal"]);
    expect(incompleteOnly.goalRowsById["complete-goal"]?.status).toBe("complete");
  });

  it("merges matching domain keep-guide rows across multiple characters", () => {
    const staticData = createStaticData();
    const account = createAccountWithCharacters();
    const viewModel = buildArtifactGoalsViewModel({
      account,
      staticData,
      showCompleted: false,
      goals: [
        createArtifactGoal({
          id: "raiden-like",
          characterKey: "Fischl",
          targetSetKeys: ["GoldenTroupe"],
          mainStatTargets: {
            sands: ["ATK%"],
            goblet: ["Electro DMG Bonus%"],
            circlet: ["CRIT Rate%"],
          },
          desiredSubstats: ["CRIT Rate%", "CRIT DMG%", "ATK%"],
        }),
        createArtifactGoal({
          id: "another-electro",
          characterKey: "Kazuha",
          targetSetKeys: ["GoldenTroupe"],
          mainStatTargets: {
            sands: ["ATK%"],
            goblet: ["Electro DMG Bonus%"],
            circlet: ["CRIT Rate%"],
          },
          desiredSubstats: ["CRIT Rate%", "CRIT DMG%", "ATK%"],
        }),
      ],
    });

    const denouement = viewModel.domainGroups.find((group) => group.label === "Denouement of Sin");
    const mergedSands = denouement?.setGroups
      .find((group) => group.setLabel === "Golden Troupe")
      ?.rows.find((row) => row.slotKey === "sands");

    expect(mergedSands?.usefulForCharacters).toEqual(["Fischl", "Kazuha"]);
    expect(mergedSands?.statusLabel).toBe("2 missing");
  });
});
