import { useMemo, useState, type ReactNode } from "react";
import {
  EmptyStateCard,
  MetricStrip,
  PageHeader,
  PageShell,
  SectionCard,
  StatusBadge,
  WorkspaceTabs,
} from "../../app/layoutPrimitives";
import type { PlannerOutput } from "../../domain/planner/types";
import {
  selectActiveAccount,
  selectActiveGoals,
  selectActivePlannerSettings,
  selectActivePlannerStatus,
  selectActiveRecentChanges,
  selectActiveRecentImports,
  selectActiveWorldState,
} from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { formatDayCount, formatInteger } from "./plannerFormatting";
import { buildPlannerProgressionModel, type PlannerProgressGoalRow } from "./plannerProgressionModel";
import { buildPlannerUiModel, type PlannerUiSection, type PlannerWeekDomainGroup } from "./plannerUiModel";
import { PlannerRecommendationCard } from "./PlannerRecommendationCard";

interface PlannerTabProps {
  plannerOutput: PlannerOutput;
}

type PlannerWorkspaceTab = "today" | "week" | "no_resin" | "recent_changes";
type WeekCalendarFilter = "needed" | "all" | "talent" | "weapon";

function formatCraftingModeLabel(mode: string): string {
  return mode === "expected_value" ? "Expected value" : "Guaranteed";
}

function formatTimestamp(value?: string): string {
  return value ? new Date(value).toLocaleString() : "Not yet";
}

function formatPlannerStatus(status: string): string {
  switch (status) {
    case "recalculating":
      return "Recalculating...";
    case "recalculated":
      return "Updated";
    case "recalculatedWithWarnings":
      return "Updated with warnings";
    case "failed":
      return "Recalculation failed";
    case "idle":
    default:
      return "Idle";
  }
}

function statusTone(status: string): "default" | "accent" | "warning" | "success" | "muted" {
  switch (status) {
    case "failed":
    case "recalculatedWithWarnings":
      return "warning";
    case "recalculated":
      return "success";
    case "recalculating":
      return "accent";
    case "idle":
    default:
      return "muted";
  }
}

function SectionList({
  title,
  description,
  section,
  staticData,
  emptyMessage,
  enableInlineQuantityEditing = false,
}: {
  title: string;
  description?: string;
  section: PlannerUiSection | null;
  staticData: ReturnType<typeof useAppStore.getState>["staticData"];
  emptyMessage: string;
  enableInlineQuantityEditing?: boolean;
}) {
  return (
    <SectionCard title={title} description={description} compact>
      {section && section.rows.length > 0 ? (
        <div className="planner-row-table">
          {section.rows.map((row) => (
            <PlannerRecommendationCard
              key={row.id}
              row={row}
              staticData={staticData}
              compact
              enableInlineQuantityEditing={enableInlineQuantityEditing}
            />
          ))}
        </div>
      ) : (
        <p className="planner-empty-state">{emptyMessage}</p>
      )}
    </SectionCard>
  );
}

function RecentChangesList({
  title,
  description,
  entries,
}: {
  title: string;
  description?: string;
  entries: ReactNode[];
}) {
  return (
    <SectionCard title={title} description={description} compact>
      {entries.length > 0 ? <div className="planner-recent-list">{entries}</div> : <p className="planner-empty-state">No recent entries yet.</p>}
    </SectionCard>
  );
}

function ProgressionList({
  title,
  description,
  entries,
  emptyMessage,
}: {
  title: string;
  description?: string;
  entries: ReturnType<typeof buildPlannerProgressionModel>["achievements"];
  emptyMessage: string;
}) {
  return (
    <SectionCard title={title} description={description} compact>
      {entries.length > 0 ? (
        <div className="planner-recent-list">
          {entries.map((entry) => (
            <article key={entry.id} className="planner-recent-item">
              <div>
                <strong>{entry.title}</strong>
                <div className="muted">{entry.description}</div>
              </div>
              <div className="button-row wrap">
                {entry.badge ? (
                  <StatusBadge compact tone={entry.tone}>
                    {entry.badge}
                  </StatusBadge>
                ) : null}
                <span className="muted">{formatTimestamp(entry.changedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="planner-empty-state">{emptyMessage}</p>
      )}
    </SectionCard>
  );
}

function formatProgressStatusLabel(status: PlannerProgressGoalRow["status"]): string {
  return status.replace(/_/g, " ");
}

function goalProgressTone(status: PlannerProgressGoalRow["status"]): "success" | "accent" | "warning" | "muted" {
  switch (status) {
    case "completed":
      return "success";
    case "craftable":
      return "accent";
    case "blocked":
      return "warning";
    case "in_progress":
    default:
      return "muted";
  }
}

function readinessTone(state: PlannerProgressGoalRow["sharedReadinessState"]): "success" | "accent" | "warning" | "muted" {
  switch (state) {
    case "ready":
      return "success";
    case "contested":
      return "warning";
    case "blocked":
    default:
      return "muted";
  }
}

function formatTrackedDuration(startedAt?: string, completedAt?: string): string | null {
  if (!startedAt) {
    return null;
  }

  const start = Date.parse(startedAt);
  const end = Date.parse(completedAt ?? new Date().toISOString());
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }

  const days = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  return days === 0 ? "Started today" : `${formatInteger(days)} day${days === 1 ? "" : "s"} tracked`;
}

function GoalProgressBoard({
  progression,
}: {
  progression: ReturnType<typeof buildPlannerProgressionModel>;
}) {
  return (
    <SectionCard title="Goal Progress" description="All character and weapon goals at a glance." compact>
      {progression.goalGroups.length > 0 ? (
        <div className="planner-section-group">
          {progression.goalGroups.map((group) => (
            <div key={group.key} className="planner-section-group">
              <div className="planner-section-group-heading">
                <h3>{group.label}</h3>
                <span className="muted">{group.rows.length} goals</span>
              </div>
              {group.rows.length > 0 ? (
                <div className="planner-goal-progress-list">
                  {group.rows.map((row) => (
                    <details key={row.goalId} className={`planner-goal-progress-row is-${row.status}`}>
                    <summary className="planner-goal-progress-summary">
                      <div className="planner-goal-progress-main">
                        <div className="planner-goal-progress-title-row">
                          <strong>{row.goalLabel}</strong>
                          <div className="button-row wrap">
                            <StatusBadge compact tone={goalProgressTone(row.status)}>
                              {formatProgressStatusLabel(row.status)}
                            </StatusBadge>
                            {row.recentMilestone ? (
                              <StatusBadge compact tone={row.recentMilestone.tone}>
                                {row.recentMilestone.label}
                              </StatusBadge>
                            ) : null}
                            {row.warningCount > 0 ? (
                              <StatusBadge compact tone="warning">
                                {formatInteger(row.warningCount)} warning{row.warningCount === 1 ? "" : "s"}
                              </StatusBadge>
                            ) : null}
                          </div>
                        </div>
                        <div className="muted">
                          {row.currentSummary} {"->"} {row.targetSummary}
                        </div>
                        <div className="planner-goal-bar-list">
                          {row.bars.map((bar) => (
                            <div key={`${row.goalId}-${bar.key}`} className="planner-goal-bar-item">
                              <div className="planner-goal-bar-meta">
                                <span>{bar.label}</span>
                                <span className="muted">{bar.progressLabel}</span>
                              </div>
                              <div className="planner-goal-progress-track-row">
                                <div
                                  className={`planner-goal-progress-track is-${bar.tone}`}
                                  role="progressbar"
                                  aria-label={`${row.goalLabel} ${bar.label} progress`}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={bar.progressPercent}
                                >
                                  <div
                                    className={`planner-goal-progress-fill is-${bar.tone}`}
                                    style={{ width: `${bar.progressPercent}%` }}
                                  />
                                </div>
                                <span className="planner-goal-progress-percent">{bar.progressPercent}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="planner-goal-bar-item planner-goal-bar-item--readiness">
                          <div className="planner-goal-bar-meta">
                            <span>Account readiness</span>
                            <span className="muted">
                              {row.isAccountReady
                                ? "Shared resources cover this goal."
                                : row.isContested
                                  ? "Shared resources are contested."
                                  : "Shared resources still fall short."}
                            </span>
                          </div>
                          <div className="planner-goal-progress-track-row">
                            <div
                              className={`planner-goal-readiness-track is-${row.sharedReadinessState}`}
                              role="progressbar"
                              aria-label={`${row.goalLabel} account readiness`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={row.sharedReadinessPercent}
                            >
                              <div
                                className={`planner-goal-readiness-fill is-${row.sharedReadinessState}`}
                                style={{ width: `${row.sharedReadinessPercent}%` }}
                              />
                            </div>
                            <span className="planner-goal-progress-percent">{row.sharedReadinessPercent}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="planner-compact-summary">
                        <strong>{row.sharedReadinessLabel}</strong>
                        <div className="muted">
                          {formatInteger(row.shortageCount)} shortages {" | "} {formatInteger(row.estimatedResin)} resin
                        </div>
                        <div className="planner-inline-summary-row">
                          <StatusBadge compact tone={readinessTone(row.sharedReadinessState)}>
                            {row.sharedReadinessLabel}
                          </StatusBadge>
                          <span className={`planner-chip ${row.enoughSharedMora ? "is-success" : ""}`}>
                            {row.enoughSharedMora ? "Shared Mora ready" : "Needs shared Mora"}
                          </span>
                          <span className={`planner-chip ${row.enoughSharedExperience ? "is-success" : ""}`}>
                            {row.enoughSharedExperience ? "Shared EXP ready" : "Needs shared EXP"}
                          </span>
                          {row.isContested ? <span className="planner-chip">Contested materials</span> : null}
                        </div>
                      </div>
                    </summary>
                    <div className="planner-goal-progress-details">
                      {row.startedAt ? (
                        <p className="planner-inline-note">
                          Tracking since {formatTimestamp(row.startedAt)}
                          {formatTrackedDuration(row.startedAt, row.completedAt) ? ` | ${formatTrackedDuration(row.startedAt, row.completedAt)}` : ""}
                        </p>
                      ) : null}
                      {row.completedAt ? <p className="planner-inline-note">Goal met: {formatTimestamp(row.completedAt)}</p> : null}
                      {row.recentMilestone?.context ? (
                        <p className="planner-inline-note">Recent change: {row.recentMilestone.context}</p>
                      ) : null}
                      {row.sharedShortages.length > 0 ? (
                        <>
                          <p className="planner-inline-note">
                            Shared allocation: {row.sharedReadinessLabel.toLowerCase()}
                            {row.isContested && row.contestedMaterialNames.length > 0
                              ? ` | Contested: ${row.contestedMaterialNames.join(", ")}`
                              : ""}
                          </p>
                          <div className="planner-inline-summary-row">
                            {row.sharedShortages.map((shortage) => (
                              <span key={`${row.goalId}-shared-${shortage.label}`} className="planner-chip">
                                {shortage.label} x{formatInteger(shortage.missingQuantity)}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : null}
                      {row.blocker ? <p className="planner-inline-note">Blocker: {row.blocker}</p> : null}
                      {row.missingMaterials.length > 0 ? (
                        <div className="planner-inline-summary-row">
                          {row.missingMaterials.map((material) => (
                            <span key={`${row.goalId}-${material.materialName}`} className="planner-chip">
                              {material.materialName} x{formatInteger(material.missingQuantity)}
                            </span>
                          ))}
                        </div>
                      ) : (
                          <p className="planner-inline-note">No unresolved missing materials for this goal.</p>
                      )}
                      {row.timeline.length > 0 ? (
                        <div className="planner-goal-timeline">
                          {row.timeline.map((entry, index) => (
                            <article key={`${row.goalId}-timeline-${entry.label}-${entry.occurredAt ?? index}`} className="planner-goal-timeline-item">
                              <div className="button-row wrap">
                                <StatusBadge compact tone={entry.tone}>
                                  {entry.label}
                                </StatusBadge>
                                {entry.occurredAt ? <span className="muted">{formatTimestamp(entry.occurredAt)}</span> : null}
                              </div>
                              {entry.context ? <div className="muted">{entry.context}</div> : null}
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="planner-empty-state">No active {group.label.toLowerCase()} goals.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="planner-empty-state">No incomplete character or weapon goals right now. Completed goals move into Recent Achievements.</p>
      )}
    </SectionCard>
  );
}

function TodayPlannerTab({
  uiModel,
  staticData,
  onOpenWarnings,
}: {
  uiModel: ReturnType<typeof buildPlannerUiModel>;
  staticData: ReturnType<typeof useAppStore.getState>["staticData"];
  onOpenWarnings: () => void;
}) {
  const todayBestActions = useMemo(
    () =>
      uiModel.todaySections
        .flatMap((section) => section.rows)
        .sort((left, right) => right.priority - left.priority)
        .slice(0, 6),
    [uiModel.todaySections],
  );
  const leyLineSection = uiModel.todaySections.find((section) => section.key === "ley_lines") ?? null;
  const masterySection = uiModel.todaySections.find((section) => section.key === "today_domains_mastery") ?? null;
  const forgerySection = uiModel.todaySections.find((section) => section.key === "today_domains_forgery") ?? null;
  const bossSection = uiModel.todaySections.find((section) => section.key === "bosses") ?? null;

  return (
    <div className="planner-tab-stack">
      <SectionCard title="Today Summary" description="What is actionable right now." compact>
        <MetricStrip
          compact
          items={[
            { label: "Total resin remaining", value: formatInteger(uiModel.summary.totalEstimatedResin), tone: "warning" },
            {
              label: "Estimated days",
              value:
                uiModel.summary.totalEstimatedResinDays != null
                  ? formatDayCount(uiModel.summary.totalEstimatedResinDays, "day")
                  : "Unavailable",
              tone: "accent",
            },
            {
              label: "Available today",
              value: `${formatInteger(uiModel.todayOverview.domainCount)} domains | ${formatInteger(uiModel.todayOverview.bossCount)} bosses`,
              tone: "default",
            },
            {
              label: "Weekly locked",
              value: formatInteger(uiModel.summary.weeklyLimitedCount),
              tone: uiModel.summary.weeklyLimitedCount ? "warning" : "success",
            },
            { label: "No-resin tasks", value: formatInteger(uiModel.summary.noResinCount), tone: "default" },
          ]}
        />
        <div className="planner-inline-summary-row">
          <span className="planner-chip">Requirement crafting: {formatCraftingModeLabel(uiModel.summary.requirementCraftingMode)}</span>
          <span className="planner-chip">Resin crafting: {formatCraftingModeLabel(uiModel.summary.resinCraftingMode)}</span>
        </div>
      </SectionCard>

      <SectionCard title="Best Next Actions" description="Top recommended actions for today." compact>
        {todayBestActions.length > 0 ? (
          <div className="planner-row-table">
            {todayBestActions.map((row) => (
              <PlannerRecommendationCard key={row.id} row={row} staticData={staticData} compact enableInlineQuantityEditing />
            ))}
          </div>
        ) : (
          <p className="planner-empty-state">No resin-gated actions are available today.</p>
        )}
      </SectionCard>

      <SectionList
        title="Today's Domains of Mastery"
        description="Talent-book domains available today."
        section={masterySection}
        staticData={staticData}
        emptyMessage="No talent-book domains are needed today."
        enableInlineQuantityEditing
      />
      <SectionList
        title="Today's Domains of Forgery"
        description="Weapon ascension domains available today."
        section={forgerySection}
        staticData={staticData}
        emptyMessage="No weapon ascension domains are needed today."
        enableInlineQuantityEditing
      />
      <SectionList
        title="Normal Bosses"
        description="Unique boss-material deficits only."
        section={bossSection}
        staticData={staticData}
        emptyMessage="No normal boss materials are missing right now."
        enableInlineQuantityEditing
      />
      <SectionList
        title="Ley Lines"
        description="Mora and Character EXP claims only."
        section={leyLineSection}
        staticData={staticData}
        emptyMessage="No Mora or Character EXP Ley Line work is needed today."
      />

      {uiModel.summary.warningCount > 0 ? (
        <SectionCard title="Warnings" description="Compact review of planner assumptions that need attention." compact>
          <div className="planner-status-strip">
            <StatusBadge compact tone="warning">
              {formatInteger(uiModel.summary.warningCount)} assumptions need review
            </StatusBadge>
            <button type="button" className="button-ghost planner-warning-summary-link" onClick={onOpenWarnings}>
              Review in Data Health
            </button>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function filterWeekGroups(groups: PlannerWeekDomainGroup[], filter: WeekCalendarFilter) {
  if (filter === "all" || filter === "needed") {
    return groups;
  }

  return groups
    .map((group) => ({
      ...group,
      masteryRows: filter === "weapon" ? [] : group.masteryRows,
      forgeryRows: filter === "talent" ? [] : group.forgeryRows,
      rowCount: (filter === "weapon" ? 0 : group.masteryRows.length) + (filter === "talent" ? 0 : group.forgeryRows.length),
    }))
    .filter((group) => group.rowCount > 0);
}

function ThisWeekPlannerTab({
  uiModel,
  staticData,
}: {
  uiModel: ReturnType<typeof buildPlannerUiModel>;
  staticData: ReturnType<typeof useAppStore.getState>["staticData"];
}) {
  const worldState = useAppStore(selectActiveWorldState);
  const [calendarFilter, setCalendarFilter] = useState<WeekCalendarFilter>("needed");
  const visibleWeekGroups = useMemo(() => filterWeekGroups(uiModel.weekDomainGroups, calendarFilter), [calendarFilter, uiModel.weekDomainGroups]);
  const timeGatedRows = useMemo(
    () =>
      [...uiModel.weeklyBossSection.rows, ...uiModel.weekDomainGroups.flatMap((group) => [...group.masteryRows, ...group.forgeryRows])]
        .filter((row) => row.earliestCompletionLabel || row.weeklyGate?.isWeeklyGated)
        .slice(0, 10),
    [uiModel.weekDomainGroups, uiModel.weeklyBossSection.rows],
  );
  const discountedWeeklyClaims = Math.max(0, 3 - (worldState.weeklyBossDiscountsUsed ?? 0));
  const weeklyDomainResin = uiModel.weekDomainGroups.reduce((sum, group) => sum + (group.totalResin ?? 0), 0);

  return (
    <div className="planner-tab-stack">
      <SectionCard title="Weekly Summary" description="What to plan around this week." compact>
        <MetricStrip
          compact
          items={[
            {
              label: "Weekly boss claims",
              value: formatInteger(uiModel.weeklyBossSection.rowCount),
              tone: uiModel.weeklyBossSection.rowCount ? "warning" : "success",
            },
            { label: "Discounted claims", value: formatInteger(discountedWeeklyClaims), tone: "accent" },
            {
              label: "Time-gated families",
              value: formatInteger(uiModel.weekDomainGroups.reduce((sum, group) => sum + group.rowCount, 0)),
              tone: "default",
            },
            {
              label: "Estimated weekly resin",
              value: formatInteger((uiModel.weeklyBossSection.totalResin ?? 0) + (uiModel.otherResinSection?.totalResin ?? 0) + weeklyDomainResin),
              tone: "warning",
            },
          ]}
        />
      </SectionCard>

      <SectionList
        title="Weekly Bosses"
        description="Discount rules and weekly claim assumptions stay separate from daily resin."
        section={uiModel.weeklyBossSection}
        staticData={staticData}
        emptyMessage="No weekly boss materials are currently missing."
        enableInlineQuantityEditing
      />

      <SectionCard
        title="Domain Calendar"
        description="Only relevant weekly domain windows are shown by default."
        compact
        actions={
          <div className="planner-inline-filter-row">
            <button type="button" className={`button-ghost ${calendarFilter === "needed" ? "is-active" : ""}`} onClick={() => setCalendarFilter("needed")}>
              Show only needed
            </button>
            <button type="button" className={`button-ghost ${calendarFilter === "all" ? "is-active" : ""}`} onClick={() => setCalendarFilter("all")}>
              Show all available
            </button>
            <button type="button" className={`button-ghost ${calendarFilter === "talent" ? "is-active" : ""}`} onClick={() => setCalendarFilter("talent")}>
              Talent only
            </button>
            <button type="button" className={`button-ghost ${calendarFilter === "weapon" ? "is-active" : ""}`} onClick={() => setCalendarFilter("weapon")}>
              Weapon only
            </button>
          </div>
        }
      >
        {visibleWeekGroups.length > 0 ? (
          <div className="planner-section-group">
            {visibleWeekGroups.map((group) => (
              <div key={group.key} className="planner-section-group">
                <div className="planner-section-group-heading">
                  <h4>{group.label}</h4>
                  <span className="muted">{group.rowCount} rows</span>
                </div>
                <div className="planner-row-table">
                  {group.masteryRows.map((row) => (
                    <PlannerRecommendationCard key={row.id} row={row} staticData={staticData} compact enableInlineQuantityEditing />
                  ))}
                  {group.forgeryRows.map((row) => (
                    <PlannerRecommendationCard key={row.id} row={row} staticData={staticData} compact enableInlineQuantityEditing />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="planner-empty-state">No weekly domain rows match the current filter.</p>
        )}
      </SectionCard>

      <SectionCard title="Time-Gated Materials" description="Items that need future domain days or weekly resets." compact>
        {timeGatedRows.length > 0 ? (
          <div className="planner-recent-list">
            {timeGatedRows.map((row) => (
              <article key={`time-gated-${row.id}`} className="planner-recent-item">
                <div>
                  <strong>{row.sourceName ?? row.title}</strong>
                  <div className="muted">{row.earliestCompletionLabel ?? "Weekly lockout applies."}</div>
                </div>
                <StatusBadge compact tone={row.weeklyGate?.isWeeklyGated ? "warning" : "accent"}>
                  {row.weeklyGate?.isWeeklyGated ? "Weekly lock" : "Scheduled"}
                </StatusBadge>
              </article>
            ))}
          </div>
        ) : (
          <p className="planner-empty-state">No time-gated items are blocking this week’s plan.</p>
        )}
      </SectionCard>
    </div>
  );
}

function NoResinPlannerTab({
  uiModel,
  staticData,
}: {
  uiModel: ReturnType<typeof buildPlannerUiModel>;
  staticData: ReturnType<typeof useAppStore.getState>["staticData"];
}) {
  const sectionMap = new Map(uiModel.standaloneSections.map((section) => [section.key, section]));

  return (
    <div className="planner-tab-stack">
      <SectionList
        title="Craftable Improvements"
        description="Guaranteed conversions and craft-up options."
        section={sectionMap.get("crafting") ?? null}
        staticData={staticData}
        emptyMessage="No deterministic crafting improvements are available."
        enableInlineQuantityEditing
      />
      <SectionList
        title="Local Specialties"
        description="Regional gathering with no resin cost."
        section={sectionMap.get("local_specialty") ?? null}
        staticData={staticData}
        emptyMessage="No local specialties are currently missing."
        enableInlineQuantityEditing
      />
      <SectionList
        title="Common Enemy Drops"
        description="Common-enemy material deficits without resin cost."
        section={sectionMap.get("open_world_common") ?? null}
        staticData={staticData}
        emptyMessage="No common enemy-drop materials are currently missing."
        enableInlineQuantityEditing
      />
      <SectionList
        title="Elite Enemy Drops"
        description="Elite-enemy material deficits without resin cost."
        section={sectionMap.get("open_world_elite") ?? null}
        staticData={staticData}
        emptyMessage="No elite enemy-drop materials are currently missing."
        enableInlineQuantityEditing
      />
      <SectionList
        title="Ley Line Enemy Drop Recommendations"
        description="Incidental enemy drops only. No resin reward estimate is added here."
        section={sectionMap.get("ley_line_enemy_drops") ?? null}
        staticData={staticData}
        emptyMessage="No Ley Line enemy-spawn recommendations are active."
        enableInlineQuantityEditing
      />
      <SectionList
        title="Forgeable Weapon EXP"
        description="Forge-cap aware weapon EXP planning."
        section={sectionMap.get("forging") ?? null}
        staticData={staticData}
        emptyMessage="No forgeable Weapon EXP work is currently needed."
        enableInlineQuantityEditing
      />
    </div>
  );
}

function ProgressionPlannerTab({ plannerOutput }: { plannerOutput: PlannerOutput }) {
  const account = useAppStore(selectActiveAccount);
  const plannerStatus = useAppStore(selectActivePlannerStatus);
  const recentChanges = useAppStore(selectActiveRecentChanges);
  const recentImports = useAppStore(selectActiveRecentImports);
  const progression = useMemo(
    () =>
      plannerStatus
        ? buildPlannerProgressionModel({
            accountName: account?.name ?? "No account",
            plannerStatus,
            plannerOutput,
            recentChanges,
            recentImports,
            goalProgressTracking: account?.goalProgressTracking ?? {},
            goalMilestones: account?.goalMilestones ?? [],
          })
        : null,
    [account?.goalMilestones, account?.goalProgressTracking, account?.name, plannerOutput, plannerStatus, recentChanges, recentImports],
  );

  if (!plannerStatus || !progression) {
    return null;
  }

  return (
    <div className="planner-tab-stack">
      <SectionCard title="Progress Snapshot" description="Rolling account growth for the active planner." compact>
        <div className="planner-status-strip">
          <StatusBadge compact tone={statusTone(plannerStatus.status)}>
            {formatPlannerStatus(plannerStatus.status)}
          </StatusBadge>
          <span className="muted">{progression.snapshot.accountName}</span>
          <span className="muted">Updated: {formatTimestamp(progression.snapshot.lastUpdatedAt)}</span>
        </div>
        <MetricStrip
          compact
          items={[
            { label: "Active goals", value: formatInteger(progression.snapshot.activeGoalCount), tone: "default" },
            { label: "Recent wins", value: formatInteger(progression.snapshot.recentWinCount), tone: "success" },
            { label: "Deficits remaining", value: formatInteger(progression.snapshot.materialDeficitCount), tone: "warning" },
            { label: "Resin remaining", value: formatInteger(progression.snapshot.totalEstimatedResin), tone: "accent" },
          ]}
        />
        <p className="planner-inline-note">{progression.snapshot.summary}</p>
        {progression.snapshot.resourceBars.length > 0 ? (
          <div className="planner-goal-bar-list planner-goal-bar-list--snapshot">
            {progression.snapshot.resourceBars.map((bar) => (
              <div key={bar.key} className="planner-goal-bar-item">
                <div className="planner-goal-bar-meta">
                  <span>{bar.label}</span>
                  <span className="muted">{bar.progressLabel}</span>
                </div>
                <div className="planner-goal-progress-track-row">
                  <div
                    className={`planner-goal-progress-track is-${bar.tone}`}
                    role="progressbar"
                    aria-label={`${bar.label} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={bar.progressPercent}
                  >
                    <div className={`planner-goal-progress-fill is-${bar.tone}`} style={{ width: `${bar.progressPercent}%` }} />
                  </div>
                  <span className="planner-goal-progress-percent">{bar.progressPercent}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {plannerStatus.lastError ? <p className="planner-inline-note">Reason: {plannerStatus.lastError}</p> : null}
      </SectionCard>

      <GoalProgressBoard progression={progression} />

      <ProgressionList
        title="Recent Achievements"
        description="Built characters and met goals over time."
        entries={progression.achievements}
        emptyMessage="No major milestones yet. Progress will appear here as goals move forward."
      />

      <ProgressionList
        title="Momentum / Account Growth"
        description="Wider account gains like lower resin, fewer deficits, and useful inventory increases."
        entries={progression.momentum}
        emptyMessage="No broad growth signals yet. Imports and edits that move the plan forward will show here."
      />

      <RecentChangesList
        title="Recent Activity"
        description="Imports, manual edits, resets, and planner refreshes for this account."
        entries={progression.activity.map((entry) => (
          <article key={entry.id} className="planner-recent-item">
            <div>
              <strong>{entry.title}</strong>
              <div className="muted">{entry.description}</div>
            </div>
            <div className="button-row wrap">
              {entry.badge ? (
                <StatusBadge compact tone={entry.tone}>
                  {entry.badge}
                </StatusBadge>
              ) : null}
              <span className="muted">{formatTimestamp(entry.changedAt)}</span>
            </div>
          </article>
        ))}
      />

      <ProgressionList
        title="Needs Review"
        description="New blockers, warnings, or setbacks that should stay visible without leading the page."
        entries={progression.review}
        emptyMessage="No setbacks to review right now."
      />

      {progression.artifactGoals.length > 0 ? (
        <SectionCard title="Artifact Goals" description="Tracked separately from material-completion bars." compact>
          <div className="planner-recent-list">
            {progression.artifactGoals.map((goal) => (
              <article key={goal.goalId} className="planner-recent-item">
                <div>
                  <strong>{goal.goalLabel}</strong>
                  <div className="muted">
                    {goal.domainSummary} {"->"} {goal.targetSummary}
                  </div>
                </div>
                <div className="planner-compact-summary">
                  <StatusBadge compact tone={goal.enabled ? "accent" : "muted"}>
                    {goal.enabled ? "Tracking" : "Disabled"}
                  </StatusBadge>
                  <div className="muted">Weekly resin: {formatInteger(goal.weeklyResinBudget)}</div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {plannerOutput.warnings.length === 0 && recentChanges.length === 0 && recentImports.length === 0 ? (
        <EmptyStateCard title="No progression yet" description="Milestones, imports, and goal updates will appear here once this account starts moving forward." />
      ) : null}
    </div>
  );
}

export function PlannerTab({ plannerOutput }: PlannerTabProps) {
  const account = useAppStore(selectActiveAccount);
  const goals = useAppStore(selectActiveGoals);
  const plannerSettings = useAppStore(selectActivePlannerSettings);
  const plannerStatus = useAppStore(selectActivePlannerStatus);
  const staticData = useAppStore((state) => state.staticData);
  const today = useAppStore((state) => state.today);
  const plannerView = useAppStore((state) => state.settings.plannerView) as PlannerWorkspaceTab;
  const setPlannerView = useAppStore((state) => state.setPlannerView);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const uiModel = buildPlannerUiModel({
    plannerOutput,
    account,
    goals,
    staticData,
    plannerSettings,
    today,
  });

  return (
      <PageShell
      header={
        <PageHeader
          compact
          eyebrow="Planner"
          title="Actionable farming dashboard"
          description="A compact plan organized around what to do today, this week, without resin, and how this account is progressing."
        />
      }
      metrics={
        <MetricStrip
          compact
          items={[
            { label: "Total resin", value: formatInteger(uiModel.summary.totalEstimatedResin), tone: "warning" },
            {
              label: "Estimated days",
              value:
                uiModel.summary.totalEstimatedResinDays != null
                  ? formatDayCount(uiModel.summary.totalEstimatedResinDays, "day")
                  : "Unavailable",
              tone: "accent",
            },
            {
              label: "Weekly locks",
              value: formatInteger(uiModel.summary.weeklyLimitedCount),
              tone: uiModel.summary.weeklyLimitedCount ? "warning" : "success",
            },
            { label: "No-resin tasks", value: formatInteger(uiModel.summary.noResinCount), tone: "default" },
            {
              label: "Warnings",
              value: formatInteger(uiModel.summary.warningCount),
              tone: uiModel.summary.warningCount ? "warning" : "success",
            },
          ]}
        />
      }
    >
      <div className="planner-page">
      {plannerStatus ? (
        <SectionCard title="Planner Status" description="Latest refresh for the active account." compact>
          <div className="planner-status-strip">
            <StatusBadge compact tone={statusTone(plannerStatus.status)}>
              {formatPlannerStatus(plannerStatus.status)}
            </StatusBadge>
            <span className="muted">{account?.name ?? "No account"}</span>
            <span className="muted">Updated: {formatTimestamp(plannerStatus.lastRecalculatedAt)}</span>
            {plannerStatus.warningCount ? (
              <StatusBadge compact tone="warning">
                {formatInteger(plannerStatus.warningCount)} warnings
              </StatusBadge>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      <WorkspaceTabs
        compact
        label="Planner views"
        tabs={[
          { key: "today", label: "Today" },
          { key: "week", label: "This Week" },
          { key: "no_resin", label: "No Resin" },
          { key: "recent_changes", label: "Progression" },
        ]}
        activeTab={plannerView}
        onChange={(nextTab) => void setPlannerView(nextTab)}
      />

      {plannerView === "today" ? (
        <TodayPlannerTab uiModel={uiModel} staticData={staticData} onOpenWarnings={() => void setActiveTab("database")} />
      ) : null}
      {plannerView === "week" ? <ThisWeekPlannerTab uiModel={uiModel} staticData={staticData} /> : null}
      {plannerView === "no_resin" ? <NoResinPlannerTab uiModel={uiModel} staticData={staticData} /> : null}
      {plannerView === "recent_changes" ? <ProgressionPlannerTab plannerOutput={plannerOutput} /> : null}
      </div>
    </PageShell>
  );
}
