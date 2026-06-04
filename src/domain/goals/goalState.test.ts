import { describe, expect, it } from "vitest";
import {
  normalizeArtifactGoalRecord,
  normalizeCharacterGoalRecord,
  normalizeWeaponGoalRecord,
  resolveCharacterGoalCurrentState,
  resolveWeaponGoalCurrentState,
  validateGoalStateAgainstStaticData,
} from "./goalState";
import { loadStaticData } from "../staticData/loadStaticData";
import type { AccountOwnershipState } from "../account/types";
import type { KrumpanionGoalState } from "./types";

const EMPTY_OWNERSHIP: AccountOwnershipState = {
  characters: [],
  weapons: [],
  artifacts: [],
};

describe("goalState", () => {
  it("uses the prefarm baseline for an unowned character goal", () => {
    const resolved = resolveCharacterGoalCurrentState(
      {
        characterKey: "Furina",
        enabled: true,
        priority: 3,
        planningMode: "prefarm",
      },
      EMPTY_OWNERSHIP,
    );

    expect(resolved.source).toBe("prefarm_baseline");
    expect(resolved.state.currentLevel).toBe(1);
    expect(resolved.state.currentAscension).toBe(0);
    expect(resolved.state.currentTalents).toEqual({ normal: 1, skill: 1, burst: 1 });
  });

  it("uses owned progression before prefarm when an owned character exists", () => {
    const resolved = resolveCharacterGoalCurrentState(
      {
        characterKey: "Furina",
        enabled: true,
        priority: 3,
        planningMode: "owned",
      },
      {
        ...EMPTY_OWNERSHIP,
        characters: [
          {
            characterId: "Furina",
            currentLevel: 70,
            currentAscension: 4,
            currentTalents: { normal: 1, skill: 8, burst: 8 },
          },
        ],
      },
    );

    expect(resolved.source).toBe("owned_import");
    expect(resolved.state.currentLevel).toBe(70);
    expect(resolved.state.currentTalents.skill).toBe(8);
  });

  it("lets a manual current override win over imported ownership", () => {
    const resolved = resolveCharacterGoalCurrentState(
      {
        characterKey: "Furina",
        enabled: true,
        priority: 3,
        planningMode: "manual",
        currentOverride: {
          level: 80,
          ascension: 5,
          talents: {
            skill: 9,
          },
        },
      },
      {
        ...EMPTY_OWNERSHIP,
        characters: [
          {
            characterId: "Furina",
            currentLevel: 70,
            currentAscension: 4,
            currentTalents: { normal: 1, skill: 8, burst: 8 },
          },
        ],
      },
    );

    expect(resolved.source).toBe("manual_override");
    expect(resolved.state.currentLevel).toBe(80);
    expect(resolved.state.currentAscension).toBe(5);
    expect(resolved.state.currentTalents.skill).toBe(9);
  });

  it("uses generic Traveler ownership only for shared Traveler level and ascension", () => {
    const resolved = resolveCharacterGoalCurrentState(
      {
        characterKey: "traveler_anemo",
        enabled: true,
        priority: 3,
        planningMode: "owned",
      },
      {
        ...EMPTY_OWNERSHIP,
        characters: [
          {
            characterId: "Traveler",
            currentLevel: 80,
            currentAscension: 5,
            currentTalents: { normal: 6, skill: 6, burst: 6 },
          },
        ],
      },
    );

    expect(resolved.source).toBe("traveler_shared_import");
    expect(resolved.state.currentLevel).toBe(80);
    expect(resolved.state.currentAscension).toBe(5);
    expect(resolved.state.currentTalents).toEqual({ normal: 1, skill: 1, burst: 1 });
  });

  it("lets manual overrides win for Traveler elemental talent goals", () => {
    const resolved = resolveCharacterGoalCurrentState(
      {
        characterKey: "traveler_geo",
        enabled: true,
        priority: 3,
        planningMode: "manual",
        currentOverride: {
          talents: {
            auto: 4,
            skill: 8,
            burst: 9,
          },
        },
      },
      {
        ...EMPTY_OWNERSHIP,
        characters: [
          {
            characterId: "Traveler",
            currentLevel: 80,
            currentAscension: 5,
            currentTalents: { normal: 6, skill: 6, burst: 6 },
          },
        ],
      },
    );

    expect(resolved.source).toBe("manual_override");
    expect(resolved.state.currentLevel).toBe(80);
    expect(resolved.state.currentTalents).toEqual({ normal: 4, skill: 8, burst: 9 });
  });

  it("uses the prefarm baseline for an unowned weapon goal", () => {
    const resolved = resolveWeaponGoalCurrentState(
      {
        id: "prefarm:CoolSteel",
        weaponKey: "CoolSteel",
        enabled: true,
        priority: 3,
        planningMode: "prefarm",
      },
      EMPTY_OWNERSHIP,
    );

    expect(resolved.source).toBe("prefarm_baseline");
    expect(resolved.state.currentLevel).toBe(1);
    expect(resolved.state.currentAscension).toBe(0);
  });

  it("disables ignored or non-trackable persisted goals instead of crashing", () => {
    const staticData = loadStaticData();
    const goals: KrumpanionGoalState = {
      version: 7,
      characterGoals: {
        Manekin: {
          characterKey: "Manekin",
          enabled: true,
          priority: 3,
        },
      },
      weaponGoals: {
        dull_blade_prefarm: {
          id: "dull_blade_prefarm",
          weaponKey: "DullBlade",
          enabled: true,
          priority: 3,
          planningMode: "prefarm",
        },
      },
      artifactGoals: [],
    };

    const result = validateGoalStateAgainstStaticData(goals, staticData);

    expect(result.goals.characterGoals.Manekin.enabled).toBe(false);
    expect(result.goals.weaponGoals.dull_blade_prefarm.enabled).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("defaults paused goals to false and preserves paused state during normalization and validation", () => {
    const staticData = loadStaticData();
    const normalizedCharacter = normalizeCharacterGoalRecord(
      "Furina",
      {
        characterKey: "Furina",
        enabled: true,
        priority: 3,
      },
      true,
      staticData,
    );
    const normalizedWeapon = normalizeWeaponGoalRecord("prefarm:CoolSteel", {
      id: "prefarm:CoolSteel",
      weaponKey: "CoolSteel",
      enabled: true,
      priority: 3,
      planningMode: "prefarm",
    });

    expect(normalizedCharacter.paused).toBe(false);
    expect(normalizedWeapon.paused).toBe(false);

    const result = validateGoalStateAgainstStaticData(
      {
        version: 7,
        characterGoals: {
          Manekin: {
            characterKey: "Manekin",
            enabled: true,
            paused: true,
            priority: 3,
          },
        },
        weaponGoals: {},
        artifactGoals: [],
      },
      staticData,
    );

    expect(result.goals.characterGoals.Manekin.enabled).toBe(false);
    expect(result.goals.characterGoals.Manekin.paused).toBe(true);
  });

  it("normalizes artifact goals into array-based affix targets and deduped set/substat selections", () => {
    const normalized = normalizeArtifactGoalRecord({
      id: "artifact-goal-1",
      characterKey: "Neuvillette",
      targetSetKeys: ["MarechausseeHunter", "MarechausseeHunter", "GoldenTroupe"],
      priority: 3,
      mainStatTargets: {
        sands: ["HP%", "Energy Recharge%", "HP%"],
        goblet: ["Hydro DMG Bonus%"],
        circlet: ["critDMG_", "critRate_", "critDMG_"] as never,
      },
      desiredSubstats: ["critRate_", "critDMG_", "critRate_", "enerRech_"] as never,
      progress: {
        flowerObtained: false,
        plumeObtained: false,
        sandsObtained: false,
        gobletObtained: false,
        circletObtained: false,
      },
      enabled: true,
      desiredMainStats: {
        sands: ["ATK%"],
      },
    });

    expect(normalized.targetSetKeys).toEqual(["MarechausseeHunter", "GoldenTroupe"]);
    expect(normalized.mainStatTargets.sands).toEqual(["HP%", "Energy Recharge%"]);
    expect(normalized.mainStatTargets.goblet).toEqual(["Hydro DMG Bonus%"]);
    expect(normalized.mainStatTargets.circlet).toEqual(["CRIT DMG%", "CRIT Rate%"]);
    expect(normalized.desiredSubstats).toEqual(["CRIT Rate%", "CRIT DMG%", "Energy Recharge%"]);
    expect(normalized.progress.flowerObtained).toBe(false);
    expect(normalized.progress.plumeObtained).toBe(false);
  });
});
