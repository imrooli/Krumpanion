import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultSaveFile } from "../../domain/save/types";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { toSaveInfo } from "../../store/persistenceHelpers";
import { useAppStore } from "../../store/useAppStore";
import { buildPlannerOutput } from "../../domain/planner/buildPlannerRows";
import { DEFAULT_GOALS } from "../../domain/goals/types";
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

describe("PlannerTab", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders readable goal labels and no-resin rows instead of encoded goal ids", () => {
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

    expect(screen.getAllByText("Cool Steel weapon goal").length).toBeGreaterThan(0);
    expect(screen.queryByText("prefarm:CoolSteel")).not.toBeInTheDocument();
    expect(screen.getAllByText("No resin").length).toBeGreaterThan(0);
  });

  it("renders WL9 partial-estimate warnings in the planner details", () => {
    const plannerOutput = buildPlannerOutput({
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
    });

    render(<PlannerTab plannerOutput={plannerOutput} />);

    expect(
      screen.getAllByText(/WL9 estimate: assumes guaranteed 3 boss materials per claim/i).length,
    ).toBeGreaterThan(0);
  });
});
