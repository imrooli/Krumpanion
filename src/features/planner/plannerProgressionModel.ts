import type {
  GoalMilestoneLogEntry,
  GoalProgressBucketBaseline,
  GoalProgressTrackingRecord,
  PlannerRecalculationStatus,
  RecentGoalProgressPlannerChange,
  RecentImportEntry,
  RecentPlannerChange,
  RecentPlannerRecalculationChange,
} from "../../domain/account/types";
import type { MaterialNeedRow, PlannerOutput } from "../../domain/planner/types";
import { buildTrackedGoalProgressMap, type GoalProgressStatus } from "../../store/plannerTracking";

type ProgressTone = "success" | "accent" | "warning" | "muted";
type ProgressBarKey = "mora" | "characterExp" | "weaponExp" | "materials";
type GoalReadinessState = "ready" | "contested" | "blocked";
type SharedShortageKind = "mora" | "characterExp" | "weaponExp" | "material";

export interface PlannerProgressionItem {
  id: string;
  title: string;
  description: string;
  changedAt: string;
  tone: ProgressTone;
  badge?: string;
}

export interface PlannerGoalMilestone {
  label: string;
  tone: ProgressTone;
  occurredAt?: string;
  context?: string;
}

export interface PlannerGoalProgressBar {
  key: ProgressBarKey;
  label: string;
  tone: "mora" | "exp" | "materials";
  progressPercent: number;
  progressLabel: string;
  remaining: number;
  baseline: number;
  enough: boolean;
}

export interface PlannerProgressGoalRow {
  goalId: string;
  goalType: "character" | "weapon";
  planningMode?: "owned" | "prefarm" | "manual";
  goalLabel: string;
  priority: number;
  currentSummary: string;
  targetSummary: string;
  status: GoalProgressStatus;
  statusLabel: string;
  shortageCount: number;
  estimatedResin: number;
  warningCount: number;
  changedRecently: boolean;
  recentMilestone?: PlannerGoalMilestone;
  blocker?: string;
  startedAt?: string;
  completedAt?: string;
  enoughSharedMora: boolean;
  enoughSharedExperience: boolean;
  sharedMaterialCoveragePercent: number;
  sharedReadinessPercent: number;
  sharedReadinessState: GoalReadinessState;
  sharedReadinessLabel: string;
  isAccountReady: boolean;
  isContested: boolean;
  contestedMaterialNames: string[];
  bars: PlannerGoalProgressBar[];
  sharedShortages: Array<{
    label: string;
    missingQuantity: number;
    kind: SharedShortageKind;
  }>;
  missingMaterials: Array<{
    materialName: string;
    missingQuantity: number;
  }>;
  timeline: PlannerGoalMilestone[];
}

export interface PlannerProgressGoalGroup {
  key: "owned_character" | "prefarm_character" | "weapon";
  label: string;
  rows: PlannerProgressGoalRow[];
}

export interface PlannerArtifactProgressRow {
  goalId: string;
  goalLabel: string;
  domainSummary: string;
  targetSummary: string;
  weeklyResinBudget: number;
  enabled: boolean;
}

export interface PlannerResourceProgressRow {
  key: ProgressBarKey;
  label: string;
  progressPercent: number;
  progressLabel: string;
  enough: boolean;
  remaining: number;
  baseline: number;
  tone: "mora" | "exp" | "materials";
}

export interface PlannerProgressionModel {
  snapshot: {
    accountName: string;
    lastUpdatedAt?: string;
    activeGoalCount: number;
    materialDeficitCount: number;
    totalEstimatedResin: number;
    recentWinCount: number;
    summary: string;
    resourceBars: PlannerResourceProgressRow[];
  };
  goalGroups: PlannerProgressGoalGroup[];
  artifactGoals: PlannerArtifactProgressRow[];
  achievements: PlannerProgressionItem[];
  momentum: PlannerProgressionItem[];
  activity: PlannerProgressionItem[];
  review: PlannerProgressionItem[];
}

export function buildPlannerProgressionModel(params: {
  accountName: string;
  plannerStatus: PlannerRecalculationStatus;
  plannerOutput: PlannerOutput;
  recentChanges: RecentPlannerChange[];
  recentImports: RecentImportEntry[];
  goalProgressTracking: Record<string, GoalProgressTrackingRecord>;
  goalMilestones: GoalMilestoneLogEntry[];
}): PlannerProgressionModel {
  const recentRecalculations = params.recentChanges.filter(
    (entry): entry is RecentPlannerRecalculationChange => entry.kind === "recalculation",
  );
  const recentWinCount = recentRecalculations.reduce(
    (sum, entry) => sum + Math.max(0, entry.newlyCompletedGoalCount ?? 0) + Math.max(0, entry.newlyCraftableGoalCount ?? 0),
    0,
  );
  const resolvedDeficits = recentRecalculations.reduce((sum, entry) => sum + Math.max(0, entry.resolvedDeficitCount ?? 0), 0);
  const allGoalGroups = buildGoalGroups(
    params.plannerOutput,
    params.recentChanges,
    params.goalProgressTracking,
    params.goalMilestones,
  );
  const goalGroups = allGoalGroups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => row.status !== "completed"),
    }))
    .filter((group) => group.rows.length > 0);

  return {
    snapshot: {
      accountName: params.accountName,
      lastUpdatedAt: params.plannerStatus.lastRecalculatedAt,
      activeGoalCount: params.plannerStatus.activeGoalCount,
      materialDeficitCount: params.plannerStatus.materialDeficitCount,
      totalEstimatedResin: params.plannerStatus.totalEstimatedResin,
      recentWinCount,
      summary: buildSnapshotSummary(recentWinCount, resolvedDeficits, recentRecalculations),
      resourceBars: buildResourceBars(params.plannerOutput),
    },
    goalGroups,
    artifactGoals: buildArtifactGoalRows(params.plannerOutput),
    achievements: buildAchievementItems(params.goalMilestones, params.recentChanges, allGoalGroups, params.goalProgressTracking).slice(0, 10),
    momentum: buildMomentumItems(params.recentChanges, params.recentImports).slice(0, 8),
    activity: buildActivityItems(params.recentChanges, params.recentImports).slice(0, 10),
    review: buildReviewItems(params.recentChanges).slice(0, 8),
  };
}

function buildGoalGroups(
  plannerOutput: PlannerOutput,
  recentChanges: RecentPlannerChange[],
  tracking: Record<string, GoalProgressTrackingRecord>,
  goalMilestones: GoalMilestoneLogEntry[],
): PlannerProgressGoalGroup[] {
  const recentGoalChanges = buildRecentGoalChangeMap(recentChanges);
  const milestoneMap = buildGoalMilestoneMap(recentChanges, tracking, goalMilestones);
  const progressByGoal = buildTrackedGoalProgressMap(plannerOutput);
  const resolutionMap = new Map(
    plannerOutput.goalResolutions.map((resolution) => [`${resolution.goalType}:${resolution.goalKey}`, resolution] as const),
  );

  const rows = plannerOutput.plannerGoals
    .filter((goal): goal is (typeof plannerOutput.plannerGoals)[number] & { goalType: "character" | "weapon" } => goal.goalType === "character" || goal.goalType === "weapon")
    .map((goal) => {
      const trackingKey = `${goal.goalType}:${goal.id}`;
      const progress = progressByGoal.get(trackingKey);
      const baseline = tracking[trackingKey]?.baseline ?? progress?.buckets ?? emptyBuckets();
      const resolution =
        resolutionMap.get(`${goal.goalType}:${goal.id}`) ??
        resolutionMap.get(`${goal.goalType}:${goal.entityKey}`);
      const recentGoalChange = recentGoalChanges.get(goal.id);
      const localBuckets = progress?.buckets ?? emptyBuckets();

      return {
        goalId: goal.id,
        goalType: goal.goalType,
        planningMode: goal.planningMode,
        goalLabel: goal.label,
        priority: goal.priority,
        currentSummary: goal.currentSummary,
        targetSummary: goal.targetSummary,
        status: progress?.status ?? "in_progress",
        statusLabel: formatStatusLabel(progress?.status ?? "in_progress"),
        shortageCount: goal.shortageCount,
        estimatedResin: goal.estimatedResin,
        warningCount: goal.warningCount,
        changedRecently: Boolean(recentGoalChange),
        recentMilestone: buildGoalMilestone(recentGoalChange, tracking[trackingKey]),
        blocker: progress?.blocker,
        startedAt: tracking[trackingKey]?.startedAt,
        completedAt: progress?.status === "completed" ? tracking[trackingKey]?.completedAt : undefined,
        enoughSharedMora: localBuckets.mora <= 0,
        enoughSharedExperience:
          goal.goalType === "character"
            ? localBuckets.characterExp <= 0
            : localBuckets.weaponExp <= 0,
        sharedMaterialCoveragePercent: 0,
        sharedReadinessPercent: 0,
        sharedReadinessState: "blocked",
        sharedReadinessLabel: "Blocked",
        isAccountReady: false,
        isContested: false,
        contestedMaterialNames: [],
        bars: buildGoalBars(goal.goalType, baseline, progress?.buckets ?? emptyBuckets(), progress?.status ?? "in_progress"),
        sharedShortages: [],
        missingMaterials: getGoalMissingMaterials(resolution?.missingSummary ?? []),
        timeline: milestoneMap.get(goal.id) ?? [],
      } satisfies PlannerProgressGoalRow;
    })
    .sort((left, right) => right.priority - left.priority || left.goalLabel.localeCompare(right.goalLabel));

  const sharedReadinessByGoal = buildSharedReadinessMap(rows, plannerOutput);
  const enrichedRows = rows.map((row) => {
    const sharedReadiness = sharedReadinessByGoal.get(row.goalId);
    if (!sharedReadiness) {
      return row;
    }

    return {
      ...row,
      enoughSharedMora: sharedReadiness.enoughSharedMora,
      enoughSharedExperience: sharedReadiness.enoughSharedExperience,
      sharedMaterialCoveragePercent: sharedReadiness.sharedMaterialCoveragePercent,
      sharedReadinessPercent: sharedReadiness.sharedReadinessPercent,
      sharedReadinessState: sharedReadiness.sharedReadinessState,
      sharedReadinessLabel: sharedReadiness.sharedReadinessLabel,
      isAccountReady: sharedReadiness.isAccountReady,
      isContested: sharedReadiness.isContested,
      contestedMaterialNames: sharedReadiness.contestedMaterialNames,
      sharedShortages: sharedReadiness.sharedShortages,
    };
  });

  const groups: PlannerProgressGoalGroup[] = [
    {
      key: "owned_character",
      label: "Owned Characters",
      rows: enrichedRows.filter((row) => row.goalType === "character" && row.planningMode !== "prefarm"),
    },
    {
      key: "prefarm_character",
      label: "Pre-Farm Characters",
      rows: enrichedRows.filter((row) => row.goalType === "character" && row.planningMode === "prefarm"),
    },
    { key: "weapon", label: "Weapons", rows: enrichedRows.filter((row) => row.goalType === "weapon") },
  ];

  return groups.filter((group) => group.rows.length > 0);
}

function buildGoalBars(
  goalType: "character" | "weapon",
  baseline: GoalProgressBucketBaseline,
  current: GoalProgressBucketBaseline,
  status: GoalProgressStatus,
): PlannerGoalProgressBar[] {
  const bars: PlannerGoalProgressBar[] = [
    createGoalBar({
      key: "mora",
      label: "Mora",
      tone: "mora",
      baseline: baseline.mora,
      remaining: current.mora,
      status,
    }),
    createGoalBar({
      key: goalType === "character" ? "characterExp" : "weaponExp",
      label: goalType === "character" ? "Character EXP" : "Weapon EXP",
      tone: "exp",
      baseline: goalType === "character" ? baseline.characterExp : baseline.weaponExp,
      remaining: goalType === "character" ? current.characterExp : current.weaponExp,
      status,
    }),
    createGoalBar({
      key: "materials",
      label: "Materials",
      tone: "materials",
      baseline: baseline.materials,
      remaining: current.materials,
      status,
    }),
  ];

  return bars;
}

function createGoalBar(params: {
  key: ProgressBarKey;
  label: string;
  tone: "mora" | "exp" | "materials";
  baseline: number;
  remaining: number;
  status: GoalProgressStatus;
}): PlannerGoalProgressBar {
  const progressPercent = calculateProgressPercent(params.baseline, params.remaining);
  const enough = params.remaining <= 0;
  const progressLabel =
    params.key === "mora"
      ? enough
        ? "Enough Mora"
        : `${formatShortQuantity(params.remaining)} needed`
      : params.key === "characterExp" || params.key === "weaponExp"
        ? enough
          ? "Enough EXP"
          : `${formatShortQuantity(params.remaining)} needed`
        : enough
          ? params.status === "completed"
            ? "Completed"
            : "Ready now"
          : `${formatShortQuantity(params.remaining)} remaining`;

  return {
    key: params.key,
    label: params.label,
    tone: params.tone,
    progressPercent,
    progressLabel,
    remaining: params.remaining,
    baseline: params.baseline,
    enough,
  };
}

function buildResourceBars(plannerOutput: PlannerOutput): PlannerResourceProgressRow[] {
  const totals = plannerOutput.totalMissingByMaterial.reduce(
    (accumulator, row) => {
      const bucket = getCategoryBucket(row);
      accumulator[bucket].baseline += row.needed;
      accumulator[bucket].remaining += Math.max(0, row.effectiveDeficit);
      return accumulator;
    },
    {
      mora: { baseline: 0, remaining: 0 },
      characterExp: { baseline: 0, remaining: 0 },
      weaponExp: { baseline: 0, remaining: 0 },
      materials: { baseline: 0, remaining: 0 },
    },
  );

  const resourceRows: PlannerResourceProgressRow[] = [
    createResourceBar("mora", "Mora readiness", totals.mora.baseline, totals.mora.remaining),
  ];

  if (totals.characterExp.baseline > 0) {
    resourceRows.push(createResourceBar("characterExp", "Character EXP", totals.characterExp.baseline, totals.characterExp.remaining));
  }
  if (totals.weaponExp.baseline > 0) {
    resourceRows.push(createResourceBar("weaponExp", "Weapon EXP", totals.weaponExp.baseline, totals.weaponExp.remaining));
  }
  if (totals.materials.baseline > 0) {
    resourceRows.push(createResourceBar("materials", "Material readiness", totals.materials.baseline, totals.materials.remaining));
  }

  return resourceRows;
}

function createResourceBar(
  key: ProgressBarKey,
  label: string,
  baseline: number,
  remaining: number,
): PlannerResourceProgressRow {
  const enough = remaining <= 0;
  return {
    key,
    label,
    progressPercent: calculateProgressPercent(baseline, remaining),
    progressLabel: enough ? "Enough on hand" : `${formatShortQuantity(remaining)} still needed`,
    enough,
    remaining,
    baseline,
    tone: key === "mora" ? "mora" : key === "materials" ? "materials" : "exp",
  };
}

function buildArtifactGoalRows(plannerOutput: PlannerOutput): PlannerArtifactProgressRow[] {
  return plannerOutput.plannerGoals
    .filter((goal) => goal.goalType === "artifact")
    .map((goal) => ({
      goalId: goal.id,
      goalLabel: goal.label,
      domainSummary: goal.currentSummary,
      targetSummary: goal.targetSummary,
      weeklyResinBudget: goal.estimatedResin,
      enabled: goal.enabled,
    }));
}

function buildRecentGoalChangeMap(recentChanges: RecentPlannerChange[]): Map<string, RecentGoalProgressPlannerChange> {
  const map = new Map<string, RecentGoalProgressPlannerChange>();

  for (const entry of recentChanges) {
    if (entry.kind !== "goal_progress" || map.has(entry.goalId)) {
      continue;
    }
    map.set(entry.goalId, entry);
  }

  return map;
}

function buildGoalMilestone(
  change: RecentGoalProgressPlannerChange | undefined,
  tracking: GoalProgressTrackingRecord | undefined,
): PlannerGoalMilestone | undefined {
  if (tracking?.completedAt) {
    return {
      label: "Goal met",
      tone: "success",
      occurredAt: tracking.completedAt,
      context: `Completed ${new Date(tracking.completedAt).toLocaleString()}`,
    };
  }

  if (!change) {
    return undefined;
  }

  const context = `${change.previousSummary} -> ${change.nextSummary}`;
  if (change.nextStatus === "craftable" && change.previousStatus !== "craftable" && change.previousStatus !== "completed") {
    return { label: "Craftable recently", tone: "accent", occurredAt: change.changedAt, context };
  }
  if (change.previousStatus === "blocked" && change.nextStatus !== "blocked") {
    return { label: "Unblocked recently", tone: "accent", occurredAt: change.changedAt, context };
  }
  if (change.nextStatus === "blocked" && change.previousStatus !== "blocked") {
    return { label: "Blocked recently", tone: "warning", occurredAt: change.changedAt, context: change.blocker ?? context };
  }
  if (change.previousSummary !== change.nextSummary) {
    return { label: "Progress updated", tone: "accent", occurredAt: change.changedAt, context };
  }

  return undefined;
}

function buildSnapshotSummary(
  recentWinCount: number,
  resolvedDeficits: number,
  recentRecalculations: RecentPlannerRecalculationChange[],
): string {
  if (recentWinCount > 0) {
    return `${recentWinCount} goal milestone${recentWinCount === 1 ? "" : "s"} reached recently.`;
  }
  if (resolvedDeficits > 0) {
    return `${resolvedDeficits} material deficit${resolvedDeficits === 1 ? "" : "s"} resolved recently.`;
  }
  if (recentRecalculations.some((entry) => (entry.estimatedResinDelta ?? 0) < 0)) {
    return "Estimated resin has dropped recently, showing steady account growth.";
  }
  return "Progress starts from each goal's original tracked baseline.";
}

function buildAchievementItems(
  goalMilestones: GoalMilestoneLogEntry[],
  recentChanges: RecentPlannerChange[],
  goalGroups: PlannerProgressGoalGroup[],
  tracking: Record<string, GoalProgressTrackingRecord>,
): PlannerProgressionItem[] {
  const rowByGoalId = new Map(goalGroups.flatMap((group) => group.rows.map((row) => [row.goalId, row] as const)));
  const milestoneItems = goalMilestones.map((entry) => ({
    id: entry.id,
    title: entry.goalLabel,
    description:
      entry.milestoneType === "character_built"
        ? `Character built${entry.targetSummary ? ` at ${entry.targetSummary}` : "."}`
        : `Weapon goal met${entry.targetSummary ? ` at ${entry.targetSummary}` : "."}`,
    changedAt: entry.occurredAt,
    tone: "success" as const,
    badge: entry.milestoneType === "character_built" ? "Built" : "Goal met",
  }));
  const fallbackCompletedItems = Object.entries(tracking)
    .filter(([, record]) => Boolean(record.completedAt))
    .filter(([, record]) => !goalMilestones.some((entry) => entry.goalId === record.goalId))
    .map(([trackingKey, record]) => {
      const row = rowByGoalId.get(record.goalId);
      return {
        id: `${trackingKey}:completed`,
        title: record.goalLabel,
        description: row?.targetSummary ? `Goal met at ${row.targetSummary}` : "Goal met.",
        changedAt: record.completedAt ?? record.startedAt,
        tone: "success" as const,
        badge: "Goal met",
      };
    });
  const allMilestoneItems = [...milestoneItems, ...fallbackCompletedItems].sort(
    (left, right) => Date.parse(right.changedAt) - Date.parse(left.changedAt),
  );

  if (allMilestoneItems.length > 0) {
    return allMilestoneItems;
  }

  const fallbackItems: PlannerProgressionItem[] = [];
  for (const entry of recentChanges) {
    const goalRow = entry.kind === "goal_progress" ? rowByGoalId.get(entry.goalId) : undefined;

    if (
      entry.kind === "goal_progress" &&
      entry.nextStatus === "craftable" &&
      entry.previousStatus !== "craftable" &&
      entry.previousStatus !== "completed" &&
      goalRow?.isAccountReady
    ) {
      fallbackItems.push({
        id: entry.id,
        title: entry.goalLabel,
        description: "Now craftable from current materials.",
        changedAt: entry.changedAt,
        tone: "accent",
        badge: "Craftable",
      });
      continue;
    }
    if (entry.kind === "recalculation" && ((entry.newlyCompletedGoalCount ?? 0) > 0 || (entry.newlyCraftableGoalCount ?? 0) > 0)) {
      fallbackItems.push({
        id: entry.id,
        title: "Planner progress updated",
        description: summarizeRecalculationWins(entry),
        changedAt: entry.changedAt,
        tone: "success",
        badge: "Milestone",
      });
    }
  }

  return fallbackItems;
}

function buildMomentumItems(recentChanges: RecentPlannerChange[], recentImports: RecentImportEntry[]): PlannerProgressionItem[] {
  const items: PlannerProgressionItem[] = [];

  for (const entry of recentChanges) {
    if (entry.kind === "recalculation") {
      if ((entry.estimatedResinDelta ?? 0) < 0 || (entry.materialDeficitCountDelta ?? 0) < 0 || (entry.resolvedDeficitCount ?? 0) > 0) {
        items.push({
          id: entry.id,
          title: "Account growth",
          description: summarizeMomentum(entry),
          changedAt: entry.changedAt,
          tone: "accent",
          badge: "Momentum",
        });
      }
      continue;
    }

    if (entry.kind === "inventory" && entry.nextQuantity > entry.previousQuantity) {
      items.push({
        id: entry.id,
        title: entry.materialName,
        description: `Inventory increased by ${entry.nextQuantity - entry.previousQuantity}.`,
        changedAt: entry.changedAt,
        tone: "accent",
        badge: entry.trigger === "good_import" ? "Import gain" : "Inventory gain",
      });
    }
  }

  for (const entry of recentImports) {
    if (entry.changedMaterialCount > 0 || entry.characterCount > 0 || entry.weaponCount > 0) {
      items.push({
        id: entry.id,
        title: entry.fileName ?? "GOOD import",
        description: `${entry.changedMaterialCount} material updates, ${entry.characterCount} characters, ${entry.weaponCount} weapons.`,
        changedAt: entry.importedAt,
        tone: "accent",
        badge: "Import",
      });
    }
  }

  return items.sort((left, right) => Date.parse(right.changedAt) - Date.parse(left.changedAt));
}

function buildActivityItems(recentChanges: RecentPlannerChange[], recentImports: RecentImportEntry[]): PlannerProgressionItem[] {
  const activityFromChanges: PlannerProgressionItem[] = [];

  for (const entry of recentChanges) {
    if (entry.kind === "inventory") {
      activityFromChanges.push({
        id: entry.id,
        title: entry.materialName,
        description: `${entry.previousQuantity} -> ${entry.nextQuantity} via ${entry.trigger.replace(/_/g, " ")}.`,
        changedAt: entry.changedAt,
        tone: entry.trigger === "reset_to_imported" ? "muted" : "accent",
        badge: entry.trigger === "reset_to_imported" ? "Reset" : "Inventory",
      });
      continue;
    }

    if (entry.kind === "recalculation") {
      activityFromChanges.push({
        id: entry.id,
        title: "Planner recalculated",
        description: entry.status === "failed" ? entry.errorMessage ?? "Recalculation failed." : summarizeActivity(entry),
        changedAt: entry.changedAt,
        tone: entry.status === "failed" ? "warning" : "muted",
        badge: entry.status === "failed" ? "Failed" : "Updated",
      });
    }
  }

  const importActivity = recentImports.map((entry) => ({
    id: entry.id,
    title: entry.fileName ?? "GOOD import",
    description: `${entry.materialCount} materials, ${entry.characterCount} characters, ${entry.weaponCount} weapons.`,
    changedAt: entry.importedAt,
    tone: "muted" as const,
    badge: "Import",
  }));

  return [...activityFromChanges, ...importActivity].sort((left, right) => Date.parse(right.changedAt) - Date.parse(left.changedAt));
}

function buildReviewItems(recentChanges: RecentPlannerChange[]): PlannerProgressionItem[] {
  const items: PlannerProgressionItem[] = [];

  for (const entry of recentChanges) {
    if (entry.kind === "goal_progress" && entry.nextStatus === "blocked" && entry.previousStatus !== "blocked") {
      items.push({
        id: entry.id,
        title: entry.goalLabel,
        description: entry.blocker ?? "This goal is currently blocked.",
        changedAt: entry.changedAt,
        tone: "warning",
        badge: "Blocked",
      });
      continue;
    }

    if (entry.kind === "recalculation") {
      if (entry.status === "failed") {
        items.push({
          id: entry.id,
          title: "Planner recalculation failed",
          description: entry.errorMessage ?? "Review the latest planner issues.",
          changedAt: entry.changedAt,
          tone: "warning",
          badge: "Failed",
        });
        continue;
      }

      if (entry.status === "recalculatedWithWarnings" || (entry.blockedGoalCountDelta ?? 0) > 0 || (entry.estimatedResinDelta ?? 0) > 0) {
        items.push({
          id: entry.id,
          title: "Needs review",
          description: summarizeReview(entry),
          changedAt: entry.changedAt,
          tone: "warning",
          badge: "Review",
        });
      }
    }
  }

  return items;
}

function getGoalMissingMaterials(rows: MaterialNeedRow[]): Array<{ materialName: string; missingQuantity: number }> {
  return rows
    .filter((row) => row.effectiveDeficit > 0)
    .sort((left, right) => right.effectiveDeficit - left.effectiveDeficit || left.displayName.localeCompare(right.displayName))
    .slice(0, 4)
    .map((row) => ({
      materialName: row.displayName,
      missingQuantity: row.effectiveDeficit,
    }));
}

function buildSharedReadinessMap(
  rows: PlannerProgressGoalRow[],
  plannerOutput: PlannerOutput,
): Map<string, Omit<PlannerProgressGoalRow, "goalId" | "goalType" | "planningMode" | "goalLabel" | "priority" | "currentSummary" | "targetSummary" | "status" | "statusLabel" | "shortageCount" | "estimatedResin" | "warningCount" | "changedRecently" | "recentMilestone" | "blocker" | "startedAt" | "completedAt" | "bars" | "missingMaterials" | "timeline">> {
  const totalRowByMaterial = new Map(plannerOutput.totalMissingByMaterial.map((row) => [row.materialKey, row] as const));
  const resolutionMap = new Map(
    plannerOutput.goalResolutions.map((resolution) => [`${resolution.goalType}:${resolution.goalKey}`, resolution] as const),
  );
  const remainingByMaterial = new Map<string, number>();

  for (const row of plannerOutput.totalMissingByMaterial) {
    remainingByMaterial.set(row.materialKey, Math.max(0, row.effectiveOwned - (row.materialKey === 'Mora' ? plannerOutput.craftingPlan?.totalCraftingMora ?? 0 : 0)));
  }

  const result = new Map<string, Omit<PlannerProgressGoalRow, "goalId" | "goalType" | "planningMode" | "goalLabel" | "priority" | "currentSummary" | "targetSummary" | "status" | "statusLabel" | "shortageCount" | "estimatedResin" | "warningCount" | "changedRecently" | "recentMilestone" | "blocker" | "startedAt" | "completedAt" | "bars" | "missingMaterials" | "timeline">>();

  for (const row of rows) {
    const resolution =
      resolutionMap.get(`${row.goalType}:${row.goalId}`) ??
      resolutionMap.get(`${row.goalType}:${row.goalType === "character" ? row.goalId : row.goalId}`);

    const requirements = resolution?.missingSummary ?? [];
    const totals = {
      required: 0,
      covered: 0,
      materialsRequired: 0,
      materialsCovered: 0,
      moraRequired: 0,
      moraCovered: 0,
      experienceRequired: 0,
      experienceCovered: 0,
    };
    const sharedShortages: Array<{ label: string; missingQuantity: number; kind: SharedShortageKind }> = [];

    for (const requirement of requirements) {
      // missingSummary contains account aggregate rows; only this goal's remaining
      // progression demand may consume the shared pool here.
      const required = Math.max(0, resolution?.missingByMaterial[requirement.materialKey] ?? 0);
      if (required <= 0) {
        continue;
      }

      const available = remainingByMaterial.get(requirement.materialKey) ?? totalRowByMaterial.get(requirement.materialKey)?.effectiveOwned ?? 0;
      const covered = Math.min(available, required);
      const missing = Math.max(0, required - covered);
      remainingByMaterial.set(requirement.materialKey, Math.max(0, available - covered));

      totals.required += required;
      totals.covered += covered;

      const kind = getSharedShortageKind(row.goalType, requirement);
      if (kind === "mora") {
        totals.moraRequired += required;
        totals.moraCovered += covered;
      } else if (kind === "characterExp" || kind === "weaponExp") {
        totals.experienceRequired += required;
        totals.experienceCovered += covered;
      } else {
        totals.materialsRequired += required;
        totals.materialsCovered += covered;
      }

      if (missing > 0) {
        sharedShortages.push({
          label: requirement.displayName,
          missingQuantity: missing,
          kind,
        });
      }
    }

    const localReady = row.bars.every((bar) => bar.remaining <= 0);
    const isAccountReady = sharedShortages.length === 0;
    const isContested = !isAccountReady && localReady;
    const sharedReadinessState: GoalReadinessState = isAccountReady ? "ready" : isContested ? "contested" : "blocked";

    result.set(row.goalId, {
      enoughSharedMora: totals.moraRequired <= 0 || totals.moraCovered >= totals.moraRequired,
      enoughSharedExperience: totals.experienceRequired <= 0 || totals.experienceCovered >= totals.experienceRequired,
      sharedMaterialCoveragePercent: calculateCoveragePercent(totals.materialsRequired, totals.materialsCovered),
      sharedReadinessPercent: calculateCoveragePercent(totals.required, totals.covered),
      sharedReadinessState,
      sharedReadinessLabel: sharedReadinessState === "ready" ? "Ready" : sharedReadinessState === "contested" ? "Contested" : "Blocked",
      isAccountReady,
      isContested,
      contestedMaterialNames: sharedShortages.filter((entry) => entry.kind === "material").map((entry) => entry.label).slice(0, 4),
      sharedShortages: sharedShortages.slice(0, 6),
    });
  }

  return result;
}

function buildGoalMilestoneMap(
  recentChanges: RecentPlannerChange[],
  tracking: Record<string, GoalProgressTrackingRecord>,
  goalMilestones: GoalMilestoneLogEntry[],
): Map<string, PlannerGoalMilestone[]> {
  const timelineMap = new Map<string, PlannerGoalMilestone[]>();

  for (const [trackingKey, record] of Object.entries(tracking)) {
    const goalId = trackingKey.split(":").slice(1).join(":");
    const entries: PlannerGoalMilestone[] = [
      {
        label: "Goal set",
        tone: "muted",
        occurredAt: record.startedAt,
        context: "Progress tracking began for this goal.",
      },
    ];

    if (record.completedAt) {
      entries.push({
        label: "Completed",
        tone: "success",
        occurredAt: record.completedAt,
        context: "This goal reached its tracked target.",
      });
    }

    timelineMap.set(goalId, entries);
  }

  for (const entry of recentChanges) {
    if (entry.kind !== "goal_progress") {
      continue;
    }

    const timeline = timelineMap.get(entry.goalId) ?? [];
    if (entry.nextStatus === "craftable" && entry.previousStatus !== "craftable" && entry.previousStatus !== "completed") {
      timeline.push({
        label: "Craftable",
        tone: "accent",
        occurredAt: entry.changedAt,
        context: `${entry.previousSummary} -> ${entry.nextSummary}`,
      });
    } else if (entry.previousStatus === "blocked" && entry.nextStatus !== "blocked") {
      timeline.push({
        label: "Unblocked",
        tone: "accent",
        occurredAt: entry.changedAt,
        context: `${entry.previousSummary} -> ${entry.nextSummary}`,
      });
    } else if (entry.nextStatus === "blocked" && entry.previousStatus !== "blocked") {
      timeline.push({
        label: "Blocked",
        tone: "warning",
        occurredAt: entry.changedAt,
        context: entry.blocker ?? `${entry.previousSummary} -> ${entry.nextSummary}`,
      });
    }
    timelineMap.set(entry.goalId, dedupeTimeline(timeline));
  }

  for (const entry of goalMilestones) {
    const timeline = timelineMap.get(entry.goalId) ?? [];
    timeline.push({
      label: entry.milestoneType === "character_built" ? "Built" : "Goal met",
      tone: "success",
      occurredAt: entry.occurredAt,
      context: entry.targetSummary ? `Reached ${entry.targetSummary}` : undefined,
    });
    timelineMap.set(entry.goalId, dedupeTimeline(timeline));
  }

  return new Map(
    [...timelineMap.entries()].map(([goalId, entries]) => [
      goalId,
      entries.sort((left, right) => Date.parse(right.occurredAt ?? "") - Date.parse(left.occurredAt ?? "")),
    ]),
  );
}

function dedupeTimeline(entries: PlannerGoalMilestone[]): PlannerGoalMilestone[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.label}:${entry.occurredAt ?? ""}:${entry.context ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getSharedShortageKind(
  goalType: "character" | "weapon",
  row: MaterialNeedRow,
): SharedShortageKind {
  if (row.materialKey === "Mora" || row.category === "mora") {
    return "mora";
  }
  if (goalType === "character" && row.category === "character_exp") {
    return "characterExp";
  }
  if (goalType === "weapon" && (row.category === "weapon_exp_material" || row.category === "weapon_fodder_exp")) {
    return "weaponExp";
  }
  return "material";
}

function getCategoryBucket(row: MaterialNeedRow): ProgressBarKey {
  if (row.materialKey === "Mora" || row.category === "mora") {
    return "mora";
  }
  if (row.category === "character_exp") {
    return "characterExp";
  }
  if (row.category === "weapon_exp_material" || row.category === "weapon_fodder_exp") {
    return "weaponExp";
  }
  return "materials";
}

function calculateCoveragePercent(required: number, covered: number): number {
  if (required <= 0) {
    return 100;
  }
  return clampPercent(Math.round((Math.max(0, covered) / required) * 100));
}

function calculateProgressPercent(baseline: number, remaining: number): number {
  if (baseline <= 0) {
    return remaining <= 0 ? 100 : 0;
  }
  return clampPercent(Math.round(((baseline - Math.max(0, remaining)) / baseline) * 100));
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function formatStatusLabel(status: GoalProgressStatus): string {
  return status.replace(/_/g, " ");
}

function formatShortQuantity(value: number): string {
  return value.toLocaleString();
}

function emptyBuckets(): GoalProgressBucketBaseline {
  return {
    mora: 0,
    characterExp: 0,
    weaponExp: 0,
    materials: 0,
  };
}

function summarizeRecalculationWins(entry: RecentPlannerRecalculationChange): string {
  const parts: string[] = [];

  if ((entry.newlyCompletedGoalCount ?? 0) > 0) {
    parts.push(`${entry.newlyCompletedGoalCount} completed`);
  }
  if ((entry.newlyCraftableGoalCount ?? 0) > 0) {
    parts.push(`${entry.newlyCraftableGoalCount} craftable`);
  }
  if ((entry.resolvedDeficitCount ?? 0) > 0) {
    parts.push(`${entry.resolvedDeficitCount} deficits resolved`);
  }

  return parts.length > 0 ? parts.join(" | ") : "Planner progress improved.";
}

function summarizeMomentum(entry: RecentPlannerRecalculationChange): string {
  const parts: string[] = [];

  if ((entry.materialDeficitCountDelta ?? 0) < 0) {
    parts.push(`${Math.abs(entry.materialDeficitCountDelta ?? 0)} fewer deficits`);
  }
  if ((entry.estimatedResinDelta ?? 0) < 0) {
    parts.push(`${Math.abs(entry.estimatedResinDelta ?? 0)} less resin`);
  }
  if ((entry.estimatedDaysDelta ?? 0) < 0) {
    parts.push(`${Math.abs(entry.estimatedDaysDelta ?? 0).toFixed(1)} fewer resin days`);
  }

  return parts.length > 0 ? parts.join(" | ") : "Progress is moving in the right direction.";
}

function summarizeActivity(entry: RecentPlannerRecalculationChange): string {
  return `${entry.activeGoalCount} active goals | ${entry.materialDeficitCount} deficits | ${entry.totalEstimatedResin} resin remaining.`;
}

function summarizeReview(entry: RecentPlannerRecalculationChange): string {
  const parts: string[] = [];

  if (entry.status === "recalculatedWithWarnings" && entry.warningCount > 0) {
    parts.push(`${entry.warningCount} warning${entry.warningCount === 1 ? "" : "s"}`);
  }
  if ((entry.blockedGoalCountDelta ?? 0) > 0) {
    parts.push(`${entry.blockedGoalCountDelta} new blocked goal${entry.blockedGoalCountDelta === 1 ? "" : "s"}`);
  }
  if ((entry.estimatedResinDelta ?? 0) > 0) {
    parts.push(`${entry.estimatedResinDelta} more resin needed`);
  }

  return parts.length > 0 ? parts.join(" | ") : "Planner output needs review.";
}
