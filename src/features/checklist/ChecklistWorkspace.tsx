import { useState } from "react";
import {
  MetricStrip,
  PageHeader,
  PageShell,
  SectionCard,
  StatusBadge,
} from "../../app/layoutPrimitives";
import { REALM_LEVELS, REALM_TRUST_RANKS } from "../../domain/checklist/model";
import type {
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
    <button
      type="button"
      className={ready ? "button-primary is-compact" : "button-ghost is-compact"}
      onClick={() => void (ready ? startChecklistCooldown(taskKey) : clearChecklistCooldown(taskKey))}
      aria-label={
        ready
          ? `${taskKey === "expeditions" ? "Mark" : "Use"} ${label} now`
          : `Mark ${label} available`
      }
    >
      {taskKey === "expeditions" ? (ready ? "Claimed now" : "Mark available") : ready ? "Used now" : "Mark available"}
    </button>
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
  const adjustWeeklyBossClaims = useAppStore((state) => state.adjustWeeklyBossClaims);
  return (
    <div className="checklist-claim-actions">
      <div className="button-row">
        <button
          type="button"
          className="button-ghost is-compact"
          onClick={() => void adjustWeeklyBossClaims(-1)}
          disabled={usedCount <= 0}
        >
          -1
        </button>
        <StatusBadge compact tone={usedCount >= maxCount ? "success" : "warning"}>
          {usedCount} / {maxCount}
        </StatusBadge>
        <button
          type="button"
          className="button-primary is-compact"
          onClick={() => void adjustWeeklyBossClaims(1)}
          disabled={usedCount >= maxCount}
        >
          +1
        </button>
      </div>
      <div className="button-row">
        {[0, 1, 2, 3].map((count) => (
          <button
            key={count}
            type="button"
            className={`button-ghost is-compact ${count === usedCount ? "is-active" : ""}`.trim()}
            onClick={() => void setWeeklyBossClaimsUsed(count)}
          >
            {count}/3
          </button>
        ))}
      </div>
    </div>
  );
}

function ChecklistTaskRow({ task }: { task: ChecklistTaskView }) {
  const [showRealmSettings, setShowRealmSettings] = useState(false);
  const setRealmCurrencyClaimedNow = useAppStore((state) => state.setRealmCurrencyClaimedNow);
  const updateRealmCurrencySettings = useAppStore((state) => state.updateRealmCurrencySettings);

  return (
    <div className="checklist-task-row">
      <div className="checklist-task-main">
        <div className="checklist-task-header">
          <strong>{task.label}</strong>
          <div className="badge-row is-compact">
            <StatusBadge compact tone={getStatusTone(task.status)}>
              {task.statusLabel}
            </StatusBadge>
            {task.resetsSoon ? <StatusBadge compact tone="warning">Soon</StatusBadge> : null}
          </div>
        </div>
        <p className="checklist-task-meta">
          <span>{task.windowLabel}</span>
          <span>{task.timeLabel}</span>
          {task.settingsSummary ? <span>{task.settingsSummary}</span> : null}
          {getHistoryLabel(task) ? <span>{getHistoryLabel(task)}</span> : null}
        </p>
        {task.key === "realmCurrency" && showRealmSettings ? (
          <div className="checklist-realm-settings">
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
            <p className="checklist-task-meta">
              <span>Rate: {task.ratePerHour}/hr</span>
              <span>Capacity: {task.capacity?.toLocaleString()}</span>
              <span>Time to full: {task.timeToFullHours ? `${Math.floor(task.timeToFullHours / 24)}d ${Math.round(task.timeToFullHours % 24)}h` : "0h"}</span>
            </p>
          </div>
        ) : null}
      </div>
      <div className="checklist-task-actions">
        {task.key === "realmCurrency" ? (
          <div className="button-row">
            <button
              type="button"
              className="button-primary is-compact"
              onClick={() => void setRealmCurrencyClaimedNow()}
            >
              Claimed now
            </button>
            <button
              type="button"
              className="button-ghost is-compact"
              onClick={() => setShowRealmSettings((value) => !value)}
            >
              {showRealmSettings ? "Hide settings" : "Settings"}
            </button>
          </div>
        ) : task.key === "weeklyBossClaims" ? (
          <WeeklyBossClaimActions usedCount={task.usedCount ?? 0} maxCount={task.maxCount ?? 3} />
        ) : task.section === "cooldowns" ? (
          <CooldownTaskActions taskKey={task.key as CooldownChecklistKey} ready={task.status === "ready"} label={task.label} />
        ) : (
          <ResetTaskActions taskKey={task.key as ResetWindowChecklistKey} complete={task.status === "complete"} label={task.label} />
        )}
      </div>
    </div>
  );
}

export function ChecklistWorkspace() {
  const activeAccount = useAppStore(selectActiveAccount);
  const checklist = useAppStore(selectActiveChecklistModel);
  const accountSummaries = useAppStore(selectAllAccountChecklistSummaries);
  const switchAccount = useAppStore((state) => state.switchAccount);

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="Checklist"
          title="Reset windows and cooldowns"
          description="Track the current account's daily, weekly, monthly, realm, and cooldown tasks without mixing them into planner rows."
          compact
        />
      }
      metrics={
        <MetricStrip
          compact
          items={[
            { label: "Need attention", value: String(checklist.summary.needsAttentionCount), tone: checklist.summary.needsAttentionCount ? "warning" : "success" },
            { label: "Complete", value: String(checklist.summary.completeCount), tone: "success" },
            { label: "On cooldown", value: String(checklist.summary.onCooldownCount) },
            { label: "Next reset", value: checklist.summary.nextResetLabel, tone: "accent" },
          ]}
        />
      }
    >
      {accountSummaries.length > 1 ? (
        <SectionCard title="Account attention" description="Switch accounts here to review who still needs daily or weekly follow-up." compact>
          <div className="checklist-account-list">
            {accountSummaries.map((summary) => (
              <button
                key={summary.accountId}
                type="button"
                className={`checklist-account-row ${summary.accountId === activeAccount?.id ? "is-active" : ""}`.trim()}
                onClick={() => void switchAccount(summary.accountId)}
              >
                <strong>{summary.accountName}</strong>
                <span>{summary.needsAttentionCount} need attention</span>
                <span>{summary.completeCount} complete</span>
                <span>{summary.onCooldownCount} cooling down</span>
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="checklist-section-stack">
        {checklist.sections.map((section) => (
          <SectionCard key={section.key} title={section.label} compact>
            <div className="checklist-task-list">
              {section.tasks.map((task) => (
                <ChecklistTaskRow key={task.key} task={task} />
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </PageShell>
  );
}
