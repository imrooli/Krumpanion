import { describe, expect, it } from "vitest";
import type {
  GoalMilestoneLogEntry,
  GoalProgressTrackingRecord,
  PlannerRecalculationStatus,
  RecentImportEntry,
  RecentPlannerChange,
} from "../../domain/account/types";
import type { PlannerOutput } from "../../domain/planner/types";
import { buildPlannerProgressionModel } from "./plannerProgressionModel";

describe("buildPlannerProgressionModel", () => {
  it("builds baseline-based multi-bars, shared readiness, and milestone logs", () => {
    const plannerStatus: PlannerRecalculationStatus = {
      status: "recalculated",
      lastRecalculatedAt: "2026-05-26T12:00:00.000Z",
      activeGoalCount: 3,
      materialDeficitCount: 4,
      totalEstimatedResin: 1840,
      warningCount: 0,
    };

    const plannerOutput = {
      plannerGoals: [
        {
          id: "Zhongli",
          goalType: "character",
          entityKey: "Zhongli",
          label: "Zhongli",
          currentSummary: "Lv 80 / A5 / 8-8-8",
          targetSummary: "Lv 90 / A6 / 9-9-9",
          enabled: true,
          priority: 4,
          shortageCount: 2,
          estimatedResin: 280,
          warningCount: 0,
        },
        {
          id: "prefarm:Albedo",
          goalType: "character",
          entityKey: "Albedo",
          label: "Albedo",
          currentSummary: "Not owned",
          targetSummary: "Lv 90 / A6 / 9-9-9",
          enabled: true,
          priority: 3,
          planningMode: "prefarm",
          shortageCount: 3,
          estimatedResin: 420,
          warningCount: 0,
        },
        {
          id: "prefarm:SkywardAtlas",
          goalType: "weapon",
          entityKey: "SkywardAtlas",
          label: "Skyward Atlas",
          currentSummary: "Lv 80 / A5",
          targetSummary: "Lv 90 / A6",
          enabled: true,
          priority: 3,
          shortageCount: 0,
          estimatedResin: 0,
          warningCount: 0,
        },
        {
          id: "artifact-goal-1",
          goalType: "artifact",
          entityKey: "ClearPoolAndMountainCavern",
          label: "Zhongli Artifact Goal",
          currentSummary: "Clear Pool and Mountain Cavern",
          targetSummary: "Tenacity of the Millelith",
          enabled: true,
          priority: 2,
          shortageCount: 0,
          estimatedResin: 240,
          warningCount: 0,
        },
      ],
      goalResolutions: [
        {
          goalType: "character",
          goalKey: "Zhongli",
          characterKey: "Zhongli",
          displayName: "Zhongli",
          missingByMaterial: {
            Mora: 400000,
            HerosWit: 20,
            SlimeConcentrate: 8,
          },
          breakdown: [],
          missingSummary: [
            {
              materialKey: "Mora",
              displayName: "Mora",
              progressionNeeded: 400000,
              extraNeeded: 0,
              needed: 400000,
              owned: 0,
              missing: 400000,
              rawMissing: 400000,
              craftableQuantity: 0,
              effectiveOwned: 0,
              effectiveDeficit: 400000,
              category: "mora",
              usedBy: [],
              sources: [],
            },
            {
              materialKey: "HerosWit",
              displayName: "Hero's Wit",
              progressionNeeded: 20,
              extraNeeded: 0,
              needed: 20,
              owned: 8,
              missing: 12,
              rawMissing: 12,
              craftableQuantity: 0,
              effectiveOwned: 8,
              effectiveDeficit: 12,
              category: "character_exp",
              usedBy: [],
              sources: [],
            },
            {
              materialKey: "SlimeConcentrate",
              displayName: "Slime Concentrate",
              progressionNeeded: 8,
              extraNeeded: 0,
              needed: 8,
              owned: 4,
              missing: 4,
              rawMissing: 4,
              craftableQuantity: 0,
              effectiveOwned: 4,
              effectiveDeficit: 4,
              category: "general_enemy_drop",
              usedBy: [],
              sources: [],
            },
          ],
          estimatedResin: 280,
          warnings: [],
        },
        {
          goalType: "character",
          goalKey: "prefarm:Albedo",
          characterKey: "Albedo",
          displayName: "Albedo",
          missingByMaterial: {
            Mora: 600000,
            HerosWit: 30,
            DiviningScroll: 12,
          },
          breakdown: [],
          missingSummary: [
            {
              materialKey: "Mora",
              displayName: "Mora",
              progressionNeeded: 600000,
              extraNeeded: 0,
              needed: 600000,
              owned: 0,
              missing: 600000,
              rawMissing: 600000,
              craftableQuantity: 0,
              effectiveOwned: 0,
              effectiveDeficit: 600000,
              category: "mora",
              usedBy: [],
              sources: [],
            },
            {
              materialKey: "HerosWit",
              displayName: "Hero's Wit",
              progressionNeeded: 30,
              extraNeeded: 0,
              needed: 30,
              owned: 10,
              missing: 20,
              rawMissing: 20,
              craftableQuantity: 0,
              effectiveOwned: 10,
              effectiveDeficit: 20,
              category: "character_exp",
              usedBy: [],
              sources: [],
            },
            {
              materialKey: "DiviningScroll",
              displayName: "Divining Scroll",
              progressionNeeded: 12,
              extraNeeded: 0,
              needed: 12,
              owned: 3,
              missing: 9,
              rawMissing: 9,
              craftableQuantity: 0,
              effectiveOwned: 3,
              effectiveDeficit: 9,
              category: "general_enemy_drop",
              usedBy: [],
              sources: [],
            },
          ],
          estimatedResin: 420,
          warnings: [],
        },
        {
          goalType: "weapon",
          goalKey: "prefarm:SkywardAtlas",
          weaponId: "prefarm:SkywardAtlas",
          weaponKey: "SkywardAtlas",
          displayName: "Skyward Atlas",
          missingByMaterial: {
            Mora: 0,
            MysticEnhancementOre: 0,
            ChaosCore: 0,
          },
          breakdown: [],
          missingSummary: [],
          estimatedResin: 0,
          warnings: [],
        },
      ],
      totalMissingByMaterial: [
        {
          materialKey: "Mora",
          displayName: "Mora",
          progressionNeeded: 1000000,
          extraNeeded: 0,
          needed: 1000000,
          owned: 0,
          missing: 1000000,
          rawMissing: 1000000,
          craftableQuantity: 0,
          effectiveOwned: 0,
          effectiveDeficit: 1000000,
          category: "mora",
          usedBy: [],
          sources: [],
        },
        {
          materialKey: "HerosWit",
          displayName: "Hero's Wit",
          progressionNeeded: 50,
          extraNeeded: 0,
          needed: 50,
          owned: 18,
          missing: 32,
          rawMissing: 32,
          craftableQuantity: 0,
          effectiveOwned: 18,
          effectiveDeficit: 32,
          category: "character_exp",
          usedBy: [],
          sources: [],
        },
        {
          materialKey: "DiviningScroll",
          displayName: "Divining Scroll",
          progressionNeeded: 12,
          extraNeeded: 0,
          needed: 12,
          owned: 3,
          missing: 9,
          rawMissing: 9,
          craftableQuantity: 0,
          effectiveOwned: 3,
          effectiveDeficit: 9,
          category: "general_enemy_drop",
          usedBy: [],
          sources: [],
        },
        {
          materialKey: "SlimeConcentrate",
          displayName: "Slime Concentrate",
          progressionNeeded: 8,
          extraNeeded: 0,
          needed: 8,
          owned: 4,
          missing: 4,
          rawMissing: 4,
          craftableQuantity: 0,
          effectiveOwned: 4,
          effectiveDeficit: 4,
          category: "general_enemy_drop",
          usedBy: [],
          sources: [],
        },
      ],
    } as unknown as PlannerOutput;

    const recentChanges: RecentPlannerChange[] = [
      {
        id: "goal-craftable",
        kind: "goal_progress",
        changedAt: "2026-05-26T11:58:00.000Z",
        trigger: "good_import",
        goalId: "Zhongli",
        goalType: "character",
        goalLabel: "Zhongli",
        previousStatus: "blocked",
        nextStatus: "in_progress",
        previousSummary: "Blocked",
        nextSummary: "2 shortages remaining",
      },
      {
        id: "recalc-success",
        kind: "recalculation",
        changedAt: "2026-05-26T12:00:00.000Z",
        trigger: "manual_edit",
        status: "recalculated",
        activeGoalCount: 3,
        materialDeficitCount: 4,
        totalEstimatedResin: 1840,
        warningCount: 0,
        newlyCompletedGoalCount: 1,
        resolvedDeficitCount: 3,
        materialDeficitCountDelta: -3,
        estimatedResinDelta: -240,
      },
    ];

    const recentImports: RecentImportEntry[] = [
      {
        id: "import-1",
        importedAt: "2026-05-26T11:54:00.000Z",
        fileName: "active-account.good.json",
        source: "file",
        materialCount: 120,
        characterCount: 18,
        weaponCount: 14,
        unmatchedWeaponCount: 0,
        artifactCount: 350,
        warningCount: 1,
        changedMaterialCount: 10,
        overwrittenManualCount: 1,
      },
    ];

    const goalProgressTracking: Record<string, GoalProgressTrackingRecord> = {
      "character:Zhongli": {
        goalId: "Zhongli",
        goalType: "character",
        goalLabel: "Zhongli",
        targetSignature: "zhongli-target",
        startedAt: "2026-05-20T09:00:00.000Z",
        baseline: {
          mora: 800000,
          characterExp: 24,
          weaponExp: 0,
          materials: 8,
        },
      },
      "character:prefarm:Albedo": {
        goalId: "prefarm:Albedo",
        goalType: "character",
        goalLabel: "Albedo",
        targetSignature: "albedo-target",
        startedAt: "2026-05-19T09:00:00.000Z",
        baseline: {
          mora: 1000000,
          characterExp: 40,
          weaponExp: 0,
          materials: 12,
        },
      },
      "weapon:prefarm:SkywardAtlas": {
        goalId: "prefarm:SkywardAtlas",
        goalType: "weapon",
        goalLabel: "Skyward Atlas",
        targetSignature: "atlas-target",
        startedAt: "2026-05-18T09:00:00.000Z",
        completedAt: "2026-05-26T11:57:00.000Z",
        baseline: {
          mora: 200000,
          characterExp: 0,
          weaponExp: 40,
          materials: 6,
        },
      },
    };

    const goalMilestones: GoalMilestoneLogEntry[] = [
      {
        id: "milestone-atlas",
        goalId: "prefarm:SkywardAtlas",
        goalType: "weapon",
        goalLabel: "Skyward Atlas",
        milestoneType: "weapon_goal_met",
        occurredAt: "2026-05-26T11:57:00.000Z",
        startedAt: "2026-05-18T09:00:00.000Z",
        targetSummary: "Lv 90 / A6",
      },
    ];

    const model = buildPlannerProgressionModel({
      accountName: "Main Account",
      plannerStatus,
      plannerOutput,
      recentChanges,
      recentImports,
      goalProgressTracking,
      goalMilestones,
    });

    expect(model.snapshot.accountName).toBe("Main Account");
    expect(model.snapshot.resourceBars.find((bar) => bar.key === "mora")?.progressPercent).toBe(0);
    expect(model.snapshot.resourceBars.find((bar) => bar.key === "characterExp")?.progressPercent).toBe(36);
    expect(model.snapshot.resourceBars.find((bar) => bar.key === "materials")?.progressPercent).toBe(35);

    expect(model.goalGroups.map((group) => group.label)).toEqual(["Owned Characters", "Pre-Farm Characters"]);

    const zhongliRow = model.goalGroups.find((group) => group.key === "owned_character")?.rows[0];
    expect(zhongliRow?.bars).toHaveLength(3);
    expect(zhongliRow?.bars.find((bar) => bar.key === "mora")?.progressPercent).toBe(50);
    expect(zhongliRow?.bars.find((bar) => bar.key === "characterExp")?.progressPercent).toBe(50);
    expect(zhongliRow?.bars.find((bar) => bar.key === "materials")?.progressPercent).toBe(50);
    expect(zhongliRow?.enoughSharedMora).toBe(false);
    expect(zhongliRow?.enoughSharedExperience).toBe(false);
    expect(zhongliRow?.sharedReadinessState).toBe("blocked");
    expect(zhongliRow?.startedAt).toBe("2026-05-20T09:00:00.000Z");
    expect(zhongliRow?.timeline.some((entry) => entry.label === "Goal set")).toBe(true);

    const albedoRow = model.goalGroups.find((group) => group.key === "prefarm_character")?.rows[0];
    expect(albedoRow?.planningMode).toBe("prefarm");
    expect(albedoRow?.goalLabel).toBe("Albedo");
    expect(albedoRow?.bars.find((bar) => bar.key === "mora")?.progressPercent).toBe(40);
    expect(albedoRow?.bars.find((bar) => bar.key === "characterExp")?.progressPercent).toBe(50);
    expect(albedoRow?.sharedMaterialCoveragePercent).toBe(25);

    expect(model.goalGroups.find((group) => group.key === "weapon")).toBeUndefined();

    expect(model.artifactGoals).toHaveLength(1);
    expect(model.achievements[0]?.title).toBe("Skyward Atlas");
    expect(model.achievements[0]?.badge).toMatch(/Goal met/i);
    expect(model.achievements[0]?.changedAt).toBe("2026-05-26T11:57:00.000Z");
    expect(model.momentum.some((entry) => entry.title === "Account growth")).toBe(true);
    expect(model.activity.some((entry) => entry.title === "active-account.good.json")).toBe(true);
  });

  it("marks later goals as contested when shared materials are already allocated", () => {
    const plannerStatus: PlannerRecalculationStatus = {
      status: "recalculated",
      lastRecalculatedAt: "2026-05-26T12:00:00.000Z",
      activeGoalCount: 2,
      materialDeficitCount: 1,
      totalEstimatedResin: 240,
      warningCount: 0,
    };

    const plannerOutput = {
      plannerGoals: [
        {
          id: "Zhongli",
          goalType: "character",
          entityKey: "Zhongli",
          label: "Zhongli",
          currentSummary: "Lv 80 / A5 / 8-8-8",
          targetSummary: "Lv 90 / A6 / 9-9-9",
          enabled: true,
          priority: 4,
          shortageCount: 1,
          estimatedResin: 120,
          warningCount: 0,
        },
        {
          id: "Furina",
          goalType: "character",
          entityKey: "Furina",
          label: "Furina",
          currentSummary: "Lv 80 / A5 / 8-8-8",
          targetSummary: "Lv 90 / A6 / 9-9-9",
          enabled: true,
          priority: 3,
          shortageCount: 1,
          estimatedResin: 120,
          warningCount: 0,
        },
      ],
      goalResolutions: [
        {
          goalType: "character",
          goalKey: "Zhongli",
          characterKey: "Zhongli",
          displayName: "Zhongli",
          missingByMaterial: { SlimeConcentrate: 6 },
          breakdown: [],
          missingSummary: [
            {
              materialKey: "SlimeConcentrate",
              displayName: "Slime Concentrate",
              progressionNeeded: 6,
              extraNeeded: 0,
              needed: 6,
              owned: 4,
              missing: 2,
              rawMissing: 2,
              craftableQuantity: 2,
              effectiveOwned: 6,
              effectiveDeficit: 0,
              category: "general_enemy_drop",
              usedBy: [],
              sources: [],
            },
          ],
          estimatedResin: 120,
          warnings: [],
        },
        {
          goalType: "character",
          goalKey: "Furina",
          characterKey: "Furina",
          displayName: "Furina",
          missingByMaterial: { SlimeConcentrate: 6 },
          breakdown: [],
          missingSummary: [
            {
              materialKey: "SlimeConcentrate",
              displayName: "Slime Concentrate",
              progressionNeeded: 6,
              extraNeeded: 0,
              needed: 6,
              owned: 4,
              missing: 2,
              rawMissing: 2,
              craftableQuantity: 2,
              effectiveOwned: 6,
              effectiveDeficit: 0,
              category: "general_enemy_drop",
              usedBy: [],
              sources: [],
            },
          ],
          estimatedResin: 120,
          warnings: [],
        },
      ],
      totalMissingByMaterial: [
        {
          materialKey: "SlimeConcentrate",
          displayName: "Slime Concentrate",
          progressionNeeded: 12,
          extraNeeded: 0,
          needed: 12,
          owned: 4,
          missing: 8,
          rawMissing: 8,
          craftableQuantity: 2,
          effectiveOwned: 6,
          effectiveDeficit: 6,
          category: "general_enemy_drop",
          usedBy: [],
          sources: [],
        },
      ],
    } as unknown as PlannerOutput;

    const goalProgressTracking: Record<string, GoalProgressTrackingRecord> = {
      "character:Zhongli": {
        goalId: "Zhongli",
        goalType: "character",
        goalLabel: "Zhongli",
        targetSignature: "zhongli",
        startedAt: "2026-05-20T09:00:00.000Z",
        baseline: { mora: 0, characterExp: 0, weaponExp: 0, materials: 6 },
      },
      "character:Furina": {
        goalId: "Furina",
        goalType: "character",
        goalLabel: "Furina",
        targetSignature: "furina",
        startedAt: "2026-05-21T09:00:00.000Z",
        baseline: { mora: 0, characterExp: 0, weaponExp: 0, materials: 6 },
      },
    };

    const model = buildPlannerProgressionModel({
      accountName: "Main Account",
      plannerStatus,
      plannerOutput,
      recentChanges: [],
      recentImports: [],
      goalProgressTracking,
      goalMilestones: [],
    });

    const ownedRows = model.goalGroups.find((group) => group.key === "owned_character")?.rows ?? [];
    expect(ownedRows[0]?.goalLabel).toBe("Zhongli");
    expect(ownedRows[0]?.sharedReadinessState).toBe("ready");
    expect(ownedRows[1]?.goalLabel).toBe("Furina");
    expect(ownedRows[1]?.sharedReadinessState).toBe("contested");
    expect(ownedRows[1]?.contestedMaterialNames).toContain("Slime Concentrate");
    expect(model.snapshot.resourceBars.find((bar) => bar.key === "materials")?.progressPercent).toBe(50);
  });
});
