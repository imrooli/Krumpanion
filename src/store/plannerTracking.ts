import type {
  GoalProgressBucketBaseline,
  KrumpanionAccount,
  PlannerRecalculationStatus,
  RecentGoalProgressPlannerChange,
  RecentImportEntry,
  RecentInventoryPlannerChange,
  RecentInventorySourceState,
  RecentPlannerChange,
  RecentPlannerChangeTrigger,
  RecentPlannerRecalculationChange,
} from "../domain/account/types";
import type { GoalResolutionItem, PlannerGoal, PlannerOutput } from "../domain/planner/types";
import { buildPlannerOutput } from "../domain/planner/buildPlannerRows";
import type { DayOfWeek } from "../domain/planner/types";
import type { StaticGameData } from "../domain/staticData/types";

const MAX_RECENT_CHANGES = 50;
const MAX_RECENT_IMPORTS = 10;
const MAX_IMPORT_MATERIAL_CHANGES = 20;

export type GoalProgressStatus = "completed" | "craftable" | "blocked" | "in_progress";

interface GoalProgressSnapshot {
  goalId: string;
  goalType: PlannerGoal["goalType"];
  goalLabel: string;
  status: GoalProgressStatus;
  summary: string;
  blocker?: string;
  shortageCount: number;
  estimatedResin: number;
}

export interface TrackedGoalProgressSnapshot {
  goalId: string;
  goalType: "character" | "weapon";
  goalLabel: string;
  targetSummary: string;
  status: GoalProgressStatus;
  blocker?: string;
  shortageCount: number;
  estimatedResin: number;
  buckets: GoalProgressBucketBaseline;
}

interface PlannerProgressDeltas {
  resolvedGoalCount: number;
  newlyCompletedGoalCount: number;
  newlyCraftableGoalCount: number;
  blockedGoalCountDelta: number;
  resolvedDeficitCount: number;
  materialDeficitCountDelta: number;
  estimatedResinDelta: number;
  estimatedDaysDelta?: number;
  warningCountDelta: number;
}

export function buildPlannerOutputForAccount(params: {
  account: KrumpanionAccount;
  staticData: StaticGameData;
  today: DayOfWeek;
}): PlannerOutput {
  return buildPlannerOutput({
    inventory: params.account.inventory,
    ownership: {
      characters: params.account.characters,
      weapons: params.account.weapons,
      artifacts: params.account.artifacts,
    },
    goals: {
      ...params.account.goals,
      plannerSettings: params.account.plannerSettings,
    },
    staticData: params.staticData,
    today: params.today,
    resinSettings: params.account.plannerSettings,
    enablePost90Planning: false,
  });
}

export function buildPlannerStatusFromOutput(output: PlannerOutput, timestamp: string): PlannerRecalculationStatus {
  return {
    status: output.warnings.length > 0 ? "recalculatedWithWarnings" : "recalculated",
    lastRecalculatedAt: timestamp,
    activeGoalCount: output.plannerGoals.filter((goal) => goal.enabled).length,
    materialDeficitCount: output.totalMissingByMaterial.filter((row) => row.effectiveDeficit > 0).length,
    totalEstimatedResin: output.summary.totalEstimatedResin,
    guaranteedTotalResin: output.summary.guaranteedTotalResin,
    expectedAdvisoryResin: output.summary.expectedAdvisoryResin,
    warningCount: output.warnings.length,
  };
}

export function buildPlannerFailureStatus(
  account: KrumpanionAccount,
  error: unknown,
  fallbackTimestamp: string,
): PlannerRecalculationStatus {
  return {
    ...account.plannerStatus,
    status: "failed",
    lastRecalculatedAt: account.plannerStatus.lastRecalculatedAt ?? fallbackTimestamp,
    lastError: error instanceof Error ? error.message : String(error),
  };
}

export function buildTrackedGoalProgressMap(output: PlannerOutput): Map<string, TrackedGoalProgressSnapshot> {
  const resolutionMap = buildGoalResolutionResolutionMap(output);

  return new Map(
    output.plannerGoals
      .filter((goal): goal is PlannerGoal & { goalType: "character" | "weapon" } => goal.enabled && (goal.goalType === "character" || goal.goalType === "weapon"))
      .map((goal) => {
        const resolution =
          resolutionMap.get(`${goal.goalType}:${goal.id}`) ??
          resolutionMap.get(`${goal.goalType}:${goal.entityKey}`);
        const blocker = getPlannerGoalBlocker(goal, resolution);
        const status = getPlannerGoalStatus(goal, resolution, blocker);
        return [
          `${goal.goalType}:${goal.id}`,
          {
            goalId: goal.id,
            goalType: goal.goalType,
            goalLabel: goal.label,
            targetSummary: goal.targetSummary,
            status,
            blocker,
            shortageCount: goal.shortageCount,
            estimatedResin: goal.estimatedResin,
            buckets: buildGoalBucketSnapshot(goal.goalType, resolution),
          } satisfies TrackedGoalProgressSnapshot,
        ] as const;
      }),
  );
}

export function createRecalculationChange(params: {
  trigger: RecentPlannerChangeTrigger;
  status: PlannerRecalculationStatus;
  changedAt: string;
  beforeOutput?: PlannerOutput | null;
  afterOutput?: PlannerOutput | null;
}): RecentPlannerRecalculationChange {
  const deltas =
    params.beforeOutput && params.afterOutput ? buildPlannerProgressDeltas(params.beforeOutput, params.afterOutput) : undefined;

  return {
    id: String(crypto.randomUUID()),
    kind: "recalculation",
    changedAt: params.changedAt,
    trigger: params.trigger,
    status: params.status.status === "idle" || params.status.status === "recalculating" ? "recalculated" : params.status.status,
    activeGoalCount: params.status.activeGoalCount,
    materialDeficitCount: params.status.materialDeficitCount,
    totalEstimatedResin: params.status.totalEstimatedResin,
    guaranteedTotalResin: params.status.guaranteedTotalResin ?? params.status.totalEstimatedResin,
    expectedAdvisoryResin: params.status.expectedAdvisoryResin,
    warningCount: params.status.warningCount,
    resolvedGoalCount: deltas?.resolvedGoalCount,
    newlyCompletedGoalCount: deltas?.newlyCompletedGoalCount,
    newlyCraftableGoalCount: deltas?.newlyCraftableGoalCount,
    blockedGoalCountDelta: deltas?.blockedGoalCountDelta,
    resolvedDeficitCount: deltas?.resolvedDeficitCount,
    materialDeficitCountDelta: deltas?.materialDeficitCountDelta,
    estimatedResinDelta: deltas?.estimatedResinDelta,
    estimatedDaysDelta: deltas?.estimatedDaysDelta,
    warningCountDelta: deltas?.warningCountDelta,
    errorMessage: params.status.lastError,
  };
}

export function appendRecentChanges(existing: RecentPlannerChange[], additions: RecentPlannerChange[]): RecentPlannerChange[] {
  return [...additions, ...existing].slice(0, MAX_RECENT_CHANGES);
}

export function appendRecentImports(existing: RecentImportEntry[], additions: RecentImportEntry[]): RecentImportEntry[] {
  return [...additions, ...existing].slice(0, MAX_RECENT_IMPORTS);
}

export function getInventorySourceState(account: Pick<KrumpanionAccount, "importedInventory" | "materialEditState">, materialKey: string): RecentInventorySourceState {
  if (account.materialEditState[materialKey]) {
    return "manual";
  }
  if (materialKey in account.importedInventory) {
    return "imported";
  }
  return "missing_from_import";
}

export function buildInventoryChangeEntries(params: {
  beforeAccount: KrumpanionAccount;
  afterAccount: KrumpanionAccount;
  staticData: StaticGameData;
  changedAt: string;
  trigger: RecentInventoryPlannerChange["trigger"];
  changedKeys?: string[];
  limit?: number;
}): RecentInventoryPlannerChange[] {
  const candidateKeys =
    params.changedKeys ??
    [...new Set([...Object.keys(params.beforeAccount.inventory), ...Object.keys(params.afterAccount.inventory)])];

  const changedEntries: RecentInventoryPlannerChange[] = [];

  for (const materialKey of candidateKeys) {
    const previousQuantity = params.beforeAccount.inventory[materialKey] ?? 0;
    const nextQuantity = params.afterAccount.inventory[materialKey] ?? 0;
    if (previousQuantity === nextQuantity) {
      continue;
    }

    changedEntries.push({
      id: String(crypto.randomUUID()),
      kind: "inventory",
      changedAt: params.changedAt,
      trigger: params.trigger,
      materialKey,
      materialName: params.staticData.materials[materialKey]?.displayName ?? materialKey,
      previousQuantity,
      nextQuantity,
      sourceStateAfter: getInventorySourceState(params.afterAccount, materialKey),
    });
  }

  changedEntries.sort((left, right) => {
    const delta = Math.abs(right.nextQuantity - right.previousQuantity) - Math.abs(left.nextQuantity - left.previousQuantity);
    return delta || left.materialName.localeCompare(right.materialName);
  });

  return changedEntries.slice(0, params.limit ?? changedEntries.length);
}

export function buildRecentImportEntry(params: {
  account: KrumpanionAccount;
  changedAt: string;
  fileName?: string;
  source?: RecentImportEntry["source"];
  changedMaterialCount: number;
  overwrittenManualCount: number;
}): RecentImportEntry {
  const summary = params.account.importState.importSummary;
  return {
    id: String(crypto.randomUUID()),
    importedAt: params.changedAt,
    fileName: params.fileName,
    source: params.source,
    materialCount: summary?.materialCount ?? 0,
    characterCount: summary?.characterCount ?? 0,
    weaponCount: summary?.weaponCount ?? 0,
    unmatchedWeaponCount: summary?.unmatchedWeaponCount ?? 0,
    artifactCount: summary?.artifactCount ?? 0,
    warningCount: params.account.importState.importWarnings?.length ?? 0,
    changedMaterialCount: params.changedMaterialCount,
    overwrittenManualCount: params.overwrittenManualCount,
  };
}

export function buildGoalProgressChanges(params: {
  beforeOutput: PlannerOutput;
  afterOutput: PlannerOutput;
  changedAt: string;
  trigger: RecentGoalProgressPlannerChange["trigger"];
}): RecentGoalProgressPlannerChange[] {
  const beforeSnapshot = buildGoalProgressSnapshot(params.beforeOutput);
  const afterSnapshot = buildGoalProgressSnapshot(params.afterOutput);
  const keys = new Set([...beforeSnapshot.keys(), ...afterSnapshot.keys()]);
  const changes: RecentGoalProgressPlannerChange[] = [];

  for (const goalId of keys) {
    const previousGoal = beforeSnapshot.get(goalId);
    const nextGoal = afterSnapshot.get(goalId);
    if (!previousGoal || !nextGoal) {
      continue;
    }

    const statusChanged = previousGoal.status !== nextGoal.status;
    const summaryChanged =
      previousGoal.summary !== nextGoal.summary ||
      previousGoal.shortageCount !== nextGoal.shortageCount ||
      previousGoal.estimatedResin !== nextGoal.estimatedResin;

    if (!statusChanged && !summaryChanged) {
      continue;
    }

    changes.push({
      id: String(crypto.randomUUID()),
      kind: "goal_progress",
      changedAt: params.changedAt,
      trigger: params.trigger,
      goalId,
      goalType: nextGoal.goalType,
      goalLabel: nextGoal.goalLabel,
      previousStatus: previousGoal.status,
      nextStatus: nextGoal.status,
      previousSummary: previousGoal.summary,
      nextSummary: nextGoal.summary,
      blocker: nextGoal.blocker,
    });
  }

  return changes.slice(0, 20);
}

function buildPlannerProgressDeltas(beforeOutput: PlannerOutput, afterOutput: PlannerOutput): PlannerProgressDeltas {
  const beforeGoals = buildGoalProgressSnapshot(beforeOutput);
  const afterGoals = buildGoalProgressSnapshot(afterOutput);
  const goalKeys = new Set([...beforeGoals.keys(), ...afterGoals.keys()]);
  const statusRank: Record<GoalProgressStatus, number> = {
    blocked: 0,
    in_progress: 1,
    craftable: 2,
    completed: 3,
  };

  let resolvedGoalCount = 0;
  let newlyCompletedGoalCount = 0;
  let newlyCraftableGoalCount = 0;

  for (const goalId of goalKeys) {
    const previousGoal = beforeGoals.get(goalId);
    const nextGoal = afterGoals.get(goalId);
    if (!previousGoal || !nextGoal) {
      continue;
    }

    if (previousGoal.status !== "completed" && nextGoal.status === "completed") {
      newlyCompletedGoalCount += 1;
    }

    if (previousGoal.status !== "craftable" && previousGoal.status !== "completed" && nextGoal.status === "craftable") {
      newlyCraftableGoalCount += 1;
    }

    const improved =
      statusRank[nextGoal.status] > statusRank[previousGoal.status] ||
      (previousGoal.blocker && !nextGoal.blocker) ||
      nextGoal.shortageCount < previousGoal.shortageCount ||
      nextGoal.estimatedResin < previousGoal.estimatedResin;

    if (improved) {
      resolvedGoalCount += 1;
    }
  }

  const blockedGoalCountDelta = countGoalsByStatus(afterGoals, "blocked") - countGoalsByStatus(beforeGoals, "blocked");
  const resolvedDeficitCount = countResolvedDeficits(beforeOutput, afterOutput);
  const materialDeficitCountDelta =
    afterOutput.totalMissingByMaterial.filter((row) => row.effectiveDeficit > 0).length -
    beforeOutput.totalMissingByMaterial.filter((row) => row.effectiveDeficit > 0).length;

  return {
    resolvedGoalCount,
    newlyCompletedGoalCount,
    newlyCraftableGoalCount,
    blockedGoalCountDelta,
    resolvedDeficitCount,
    materialDeficitCountDelta,
    estimatedResinDelta: afterOutput.summary.totalEstimatedResin - beforeOutput.summary.totalEstimatedResin,
    estimatedDaysDelta: undefined,
    warningCountDelta: afterOutput.warnings.length - beforeOutput.warnings.length,
  };
}

function countGoalsByStatus(goals: Map<string, GoalProgressSnapshot>, status: GoalProgressStatus): number {
  let count = 0;
  for (const goal of goals.values()) {
    if (goal.status === status) {
      count += 1;
    }
  }
  return count;
}

function countResolvedDeficits(beforeOutput: PlannerOutput, afterOutput: PlannerOutput): number {
  const afterDeficits = new Map(
    afterOutput.totalMissingByMaterial.map((row) => [row.materialKey, row.effectiveDeficit] as const),
  );

  return beforeOutput.totalMissingByMaterial.reduce((count, row) => {
    if (row.effectiveDeficit <= 0) {
      return count;
    }
    return (afterDeficits.get(row.materialKey) ?? 0) <= 0 ? count + 1 : count;
  }, 0);
}

function buildGoalResolutionResolutionMap(output: PlannerOutput): Map<string, GoalResolutionItem> {
  const map = new Map<string, GoalResolutionItem>();
  for (const resolution of output.goalResolutions) {
    map.set(`${resolution.goalType}:${resolution.goalKey}`, resolution);
    if (resolution.goalType === "character") {
      map.set(`${resolution.goalType}:${resolution.characterKey}`, resolution);
    }
    if (resolution.goalType === "weapon") {
      map.set(`${resolution.goalType}:${resolution.weaponId}`, resolution);
      map.set(`${resolution.goalType}:${resolution.weaponKey}`, resolution);
    }
  }
  return map;
}

function getPlannerGoalBlocker(goal: PlannerGoal, resolution?: GoalResolutionItem): string | undefined {
  return resolution?.warnings?.[0]?.message ?? (goal.warningCount > 0 ? `${goal.warningCount} planner warning(s)` : undefined);
}

function getPlannerGoalStatus(
  goal: PlannerGoal & { goalType: "character" | "weapon" },
  resolution: GoalResolutionItem | undefined,
  blocker?: string,
): GoalProgressStatus {
  const craftableNow =
    (resolution?.missingSummary ?? []).length > 0 &&
    (resolution?.missingSummary ?? []).every((row) => row.effectiveDeficit <= 0) &&
    (resolution?.missingSummary ?? []).some((row) => row.craftableQuantity > 0);

  if (goal.shortageCount === 0) {
    return "completed";
  }
  if (craftableNow) {
    return "craftable";
  }
  if (blocker && goal.estimatedResin === 0) {
    return "blocked";
  }
  return "in_progress";
}

export function buildGoalBucketSnapshot(
  goalType: "character" | "weapon",
  resolution: GoalResolutionItem | undefined,
): GoalProgressBucketBaseline {
  const snapshot: GoalProgressBucketBaseline = {
    mora: 0,
    characterExp: 0,
    weaponExp: 0,
    materials: 0,
  };

  for (const row of resolution?.missingSummary ?? []) {
    const remaining = Math.max(0, row.effectiveDeficit);
    if (remaining <= 0) {
      continue;
    }

    if (row.materialKey === "Mora" || row.category === "mora") {
      snapshot.mora += remaining;
      continue;
    }

    if (goalType === "character" && row.category === "character_exp") {
      snapshot.characterExp += remaining;
      continue;
    }

    if (goalType === "weapon" && (row.category === "weapon_exp_material" || row.category === "weapon_fodder_exp")) {
      snapshot.weaponExp += remaining;
      continue;
    }

    snapshot.materials += remaining;
  }

  return snapshot;
}

function buildGoalProgressSnapshot(output: PlannerOutput): Map<string, GoalProgressSnapshot> {
  const resolutionByGoalKey = new Map(
    output.goalResolutions.map((resolution) => [`${resolution.goalType}:${resolution.goalKey}`, resolution] as const),
  );

  return new Map(
    output.plannerGoals
      .filter((goal) => goal.enabled)
      .map((goal) => {
        const resolution =
          goal.goalType === "artifact"
            ? undefined
            : resolutionByGoalKey.get(`${goal.goalType}:${goal.id}`) ??
              resolutionByGoalKey.get(`${goal.goalType}:${goal.entityKey}`);
        const blocker = resolution?.warnings?.[0]?.message ?? (goal.warningCount > 0 ? `${goal.warningCount} planner warning(s)` : undefined);
        const craftableNow =
          (resolution?.missingSummary ?? []).length > 0 &&
          (resolution?.missingSummary ?? []).every((row) => row.effectiveDeficit <= 0) &&
          (resolution?.missingSummary ?? []).some((row) => row.craftableQuantity > 0);

        let status: GoalProgressStatus = "in_progress";
        if (goal.shortageCount === 0) {
          status = "completed";
        } else if (craftableNow) {
          status = "craftable";
        } else if (blocker && goal.estimatedResin === 0) {
          status = "blocked";
        }

        const summary =
          status === "completed"
            ? "Completed"
            : status === "craftable"
              ? "Craftable now"
              : status === "blocked"
                ? blocker ?? "Blocked"
                : `${goal.shortageCount} shortage(s) remaining`;

        return [
          goal.id,
          {
            goalId: goal.id,
            goalType: goal.goalType,
            goalLabel: goal.label,
            status,
            summary,
            blocker,
            shortageCount: goal.shortageCount,
            estimatedResin: goal.estimatedResin,
          } satisfies GoalProgressSnapshot,
        ] as const;
      }),
  );
}

export { MAX_IMPORT_MATERIAL_CHANGES };
