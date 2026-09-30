import { useState } from "react";
import {
  EmptyStateCard,
  MetricStrip,
  PageHeader,
  PageShell,
  SectionCard,
  StatusBadge,
} from "../../app/layoutPrimitives";
import { REALM_LEVELS, REALM_TRUST_RANKS } from "../../domain/checklist/model";
import type {
  ChecklistAccountSummaryView,
  ChecklistDashboardSectionView,
  ChecklistTaskStatus,
  ChecklistTaskView,
  CooldownChecklistKey,
  ResetWindowChecklistKey,
} from "../../domain/checklist/types";
import {
  selectActiveAccount,
  selectActiveChecklistModel,
  selectAllAccountChecklistSummaries,
} from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

function getStatusTone(status: ChecklistTaskStatus): "default" | "accent" | "warning" | "success" | "muted" {
  switch (status) {
    case "complete":
      return "success";
    case "ready":
    case "available":
      return "accent";
    case "incomplete":
      return "warning";
    case "on_cooldown":
      return "muted";
    default:
      return "default";
  }
}

function formatDateTime(value?: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(value).toLocaleString();
}

function getHistoryLabel(task: ChecklistTaskView): string | null {
  const lastAction = task.lastCompletedAt ?? task.lastUsedAt;
  if (!lastAction) {
    return null;
  }
  return `Last updated ${formatDateTime(lastAction)}`;
}

function getAvailabilityTimestampLabel(task: ChecklistTaskView, showExactAvailability: boolean): string | null {
  if (!showExactAvailability) {
    return null;
  }

  const timestamp = task.nextAvailableAt ?? task.readyAt;
  if (!timestamp) {
    return null;
  }

  return task.status === "ready" ? `Ready since ${formatDateTime(timestamp)}` : `Ready at ${formatDateTime(timestamp)}`;
}

function getTaskRowTone(task: ChecklistTaskView, urgent: boolean): "urgent" | "quiet" | "default" {
  if (urgent) {
    return "urgent";
  }
  if (!task.needsAttention || task.status === "on_cooldown" || task.status === "complete") {
    return "quiet";
  }
  return "default";
}

function isResetTask(task: ChecklistTaskView): task is ChecklistTaskView & { key: ResetWindowChecklistKey } {
  return (
    task.key === "dailyCommissions" ||
    task.key === "dailyForging" ||
    task.key === "battlePassDailyClaims" ||
    task.key === "battlePassWeeklyClaims" ||
    task.key === "weeklyBountiesRequests" ||
    task.key === "stardustExchange" ||
    task.key === "artifactTransmuter" ||
    task.key === "realmDepot"
  );
}

function isCooldownTask(task: ChecklistTaskView): task is ChecklistTaskView & { key: CooldownChecklistKey } {
  return task.key === "parametricTransformer" || task.key === "crystalflyTrap" || task.key === "expeditions";
}

function ResetTaskActions({
  taskKey,
  complete,
  label,
}: {
  taskKey: ResetWindowChecklistKey;
  complete: boolean;
  label: string;
}) {
  const setChecklistResetTaskCompleted = useAppStore((state) => state.setChecklistResetTaskCompleted);
  return (
    <button
      type="button"
      className={complete ? "button-ghost is-compact" : "button-primary is-compact"}
      onClick={() => void setChecklistResetTaskCompleted(taskKey, !complete)}
      aria-label={complete ? `Undo ${label}` : `Mark ${label} complete`}
    >
      {complete ? "Undo" : "Mark complete"}
    </button>
  );
}

function CooldownTaskActions({
  taskKey,
  ready,
  label,
}: {
  taskKey: CooldownChecklistKey;
  ready: boolean;
  label: string;
}) {
  const startChecklistCooldown = useAppStore((state) => state.startChecklistCooldown);
  const clearChecklistCooldown = useAppStore((state) => state.clearChecklistCooldown);
  return (
    <div className="checklist-task-action-cluster">
      <button
        type="button"
        className={ready ? "button-primary is-compact" : "button-ghost is-compact"}
        onClick={() => void (ready ? startChecklistCooldown(taskKey) : clearChecklistCooldown(taskKey))}
        aria-label={ready ? `${taskKey === "expeditions" ? "Mark" : "Use"} ${label} now` : `Mark ${label} available`}
      >
        {taskKey === "expeditions" ? (ready ? "Claimed now" : "Mark available") : ready ? "Used now" : "Mark available"}
      </button>
    </div>
  );
}

function WeeklyBossClaimActions({
  usedCount,
  maxCount,
}: {
  usedCount: number;
  maxCount: number;
}) {
  const setWeeklyBossClaimsUsed = useAppStore((state) => state.setWeeklyBossClaimsUsed);

  return (
    <div className="checklist-claim-actions">
      <StatusBadge compact tone={usedCount >= maxCount ? "success" : "warning"}>
        {usedCount} / {maxCount}
      </StatusBadge>
      <div className="checklist-segmented-control" role="group" aria-label="Weekly boss claims used">
        {[0, 1, 2, 3].map((count) => (
          <button
            key={count}
            type="button"
            className={`checklist-segmented-button ${count === usedCount ? "is-active" : ""}`.trim()}
            onClick={() => void setWeeklyBossClaimsUsed(count)}
            aria-pressed={count === usedCount}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );
}

function RealmCurrencySettings({
  task,
}: {
  task: ChecklistTaskView;
}) {
  const updateRealmCurrencySettings = useAppStore((state) => state.updateRealmCurrencySettings);

  return (
    <div className="checklist-realm-settings">
      <div className="checklist-realm-settings-grid">
        <label>
          <span>Realm Level</span>
          <select
            value={task.realmLevel ?? 10}
            onChange={(event) => void updateRealmCurrencySettings({ realmLevel: Number(event.target.value) })}
          >
            {REALM_LEVELS.map((entry) => (
              <option key={entry.level} value={entry.level}>
                {entry.level} · {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Trust Rank</span>
          <select
            value={task.trustRank ?? 10}
            onChange={(event) => void updateRealmCurrencySettings({ trustRank: Number(event.target.value) })}
          >
            {REALM_TRUST_RANKS.map((entry) => (
              <option key={entry.trustRank} value={entry.trustRank}>
                Rank {entry.trustRank}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="checklist-task-meta">
        <span>Rate {task.ratePerHour}/hr</span>
        <span>Cap {task.capacity?.toLocaleString()}</span>
        <span>
          Full in{" "}
          {task.timeToFullHours ? `${Math.floor(task.timeToFullHours / 24)}d ${Math.round(task.timeToFullHours % 24)}h` : "0h"}
        </span>
      </p>
    </div>
  );
}

function ChecklistTaskActions({ task }: { task: ChecklistTaskView }) {
  const setRealmCurrencyClaimedNow = useAppStore((state) => state.setRealmCurrencyClaimedNow);
  const [showRealmSettings, setShowRealmSettings] = useState(false);

  if (task.key === "realmCurrency") {
    return (
      <div className="checklist-task-action-cluster">
        <div className="button-row">
          <button
            type="button"
            className={task.status === "ready" ? "button-primary is-compact" : "button-ghost is-compact"}
            onClick={() => void setRealmCurrencyClaimedNow()}
          >
            Claimed now
          </button>
          <button
            type="button"
            className="button-ghost is-compact"
            onClick={() => setShowRealmSettings((value) => !value)}
            aria-expanded={showRealmSettings}
          >
            {showRealmSettings ? "Hide settings" : "Settings"}
          </button>
        </div>
        {showRealmSettings ? <RealmCurrencySettings task={task} /> : null}
      </div>
    );
  }

  if (task.key === "weeklyBossClaims") {
    return <WeeklyBossClaimActions usedCount={task.usedCount ?? 0} maxCount={task.maxCount ?? 3} />;
  }

  if (isCooldownTask(task)) {
    return <CooldownTaskActions taskKey={task.key} ready={task.status === "ready"} label={task.label} />;
  }

  if (isResetTask(task)) {
    return <ResetTaskActions taskKey={task.key} complete={task.status === "complete"} label={task.label} />;
  }

  return null;
}

function ChecklistTaskRow({
  task,
  urgent = false,
  showExactAvailability = false,
}: {
  task: ChecklistTaskView;
  urgent?: boolean;
  showExactAvailability?: boolean;
}) {
  const rowTone = getTaskRowTone(task, urgent);
  const availabilityTimestampLabel = getAvailabilityTimestampLabel(task, showExactAvailability);

  return (
    <div className={`checklist-task-row is-${rowTone}`.trim()}>
      <div className="checklist-task-main">
        <div className="checklist-task-header">
          <strong>{task.label}</strong>
          <div className="badge-row is-compact">
            <StatusBadge compact tone={getStatusTone(task.status)}>
              {task.statusLabel}
            </StatusBadge>
            {task.urgencyLabel ? (
              <StatusBadge compact tone={urgent || task.expiresSoon ? "warning" : "default"}>
                {task.urgencyLabel}
              </StatusBadge>
            ) : null}
          </div>
        </div>
        <p className="checklist-task-reason">{task.priorityReason}</p>
        <p className="checklist-task-meta">
          <span>{task.windowLabel}</span>
          <span>{task.timeLabel}</span>
          {availabilityTimestampLabel ? <span>{availabilityTimestampLabel}</span> : null}
          {task.settingsSummary ? <span>{task.settingsSummary}</span> : null}
          {getHistoryLabel(task) ? <span>{getHistoryLabel(task)}</span> : null}
        </p>
      </div>
      <div className="checklist-task-actions">
        <ChecklistTaskActions task={task} />
      </div>
    </div>
  );
}

function ChecklistSection({
  section,
  urgent = false,
  emptyState,
}: {
  section: ChecklistDashboardSectionView;
  urgent?: boolean;
  emptyState?: { title: string; description: string };
}) {
  return (
    <SectionCard title={section.label} description={section.description} compact>
      {section.tasks.length > 0 ? (
        <div className="checklist-task-list">
          {section.tasks.map((task) => (
            <ChecklistTaskRow
              key={`${section.key}-${task.key}`}
              task={task}
              urgent={urgent}
              showExactAvailability={section.key === "cooldowns_accumulators"}
            />
          ))}
        </div>
      ) : emptyState ? (
        <EmptyStateCard title={emptyState.title} description={emptyState.description} />
      ) : (
        <p className="muted checklist-section-empty">Nothing here right now.</p>
      )}
    </SectionCard>
  );
}

function AccountAttentionCard({
  summaries,
  activeAccountId,
}: {
  summaries: ChecklistAccountSummaryView[];
  activeAccountId?: string;
}) {
  const switchAccount = useAppStore((state) => state.switchAccount);

  return (
    <SectionCard
      title="Account Attention"
      description="Switch accounts here when another account has more urgent timers or reset pressure."
      compact
    >
      <div className="checklist-account-list">
        {summaries.map((summary) => (
          <button
            key={summary.accountId}
            type="button"
            className={`checklist-account-row ${summary.accountId === activeAccountId ? "is-active" : ""}`.trim()}
            onClick={() => void switchAccount(summary.accountId)}
          >
            <strong>{summary.accountName}</strong>
            <span>{summary.urgentCount} urgent</span>
            <span>{summary.needsAttentionCount} total</span>
            <span>{summary.nextUrgentLabel ? `${summary.nextUrgentLabel} · ${summary.nextUrgentTimeLabel ?? "Ready now"}` : "No urgent items"}</span>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

export function ChecklistWorkspace() {
  const activeAccount = useAppStore(selectActiveAccount);
  const checklist = useAppStore(selectActiveChecklistModel);
  const accountSummaries = useAppStore(selectAllAccountChecklistSummaries);

  if (!activeAccount) {
    return (
      <PageShell
        header={<PageHeader eyebrow="Checklist" title="Checklist" description="No active account available." compact />}
      >
        <EmptyStateCard
          title="No active account"
          description="Create or restore an account to track daily, weekly, and cooldown checklist progress."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="Checklist"
          title="Progression Priority Dashboard"
          description="See what to do first, which timers are stalling account progression, and what still resets this cycle."
          compact
        />
      }
      metrics={
        <MetricStrip
          compact
          items={[
            {
              label: "Do Now",
              value: String(checklist.summary.urgentCount),
              tone: checklist.summary.urgentCount ? "warning" : "success",
            },
            {
              label: "Today Remaining",
              value: String(checklist.summary.todayRemainingCount),
              tone: checklist.summary.todayRemainingCount ? "warning" : "success",
            },
            {
              label: "Weekly Remaining",
              value: String(checklist.summary.weeklyRemainingCount),
              tone: checklist.summary.weeklyRemainingCount ? "accent" : "success",
            },
            { label: "Next Reset", value: checklist.summary.nextResetLabel, tone: "accent" },
            { label: "Cooling Down", value: String(checklist.summary.coolingDownCount) },
          ]}
        />
      }
    >
      <div className="checklist-dashboard-stack">
        {accountSummaries.length > 1 ? (
          <AccountAttentionCard summaries={accountSummaries} activeAccountId={activeAccount.id} />
        ) : null}

        <ChecklistSection
          section={checklist.dashboard.doNow}
          urgent
          emptyState={{
            title: "All urgent checklist items are handled.",
            description: "Nothing is currently paused, full, or at risk of expiring soon.",
          }}
        />

        <ChecklistSection section={checklist.dashboard.today} />
        <ChecklistSection section={checklist.dashboard.thisWeek} />
        <ChecklistSection section={checklist.dashboard.longCycle} />
        <ChecklistSection section={checklist.dashboard.cooldownsAndAccumulators} />
        <ChecklistSection section={checklist.dashboard.completedOrCoolingDown} />
      </div>
    </PageShell>
  );
}
