import { useEffect, useMemo, useState } from "react";
import { EmptyStateCard, MetricStrip, PageHeader, SectionCard, StatusBadge } from "../../app/layoutPrimitives";
import type { GoalBackupRecord, SaveRecoveryPointRecord } from "../../domain/save/types";
import {
  getAccountOrder,
  selectActiveAccount,
  selectActiveGoalBackups,
  selectSaveRecoveryPoints,
  selectSaveSummary,
} from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

function formatTimestamp(value?: string) {
  if (!value) {
    return "Not yet";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatReason(reason: string) {
  return reason
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function summarizeGoalBackup(record: GoalBackupRecord) {
  return {
    characterGoals: Object.keys(record.payload.goals.characterGoals ?? {}).length,
    weaponGoals: Object.keys(record.payload.goals.weaponGoals ?? {}).length,
    artifactGoals: record.payload.goals.artifactGoals?.length ?? 0,
  };
}

function summarizeSaveRecovery(record: SaveRecoveryPointRecord) {
  const saveFile = record.payload.saveFile;
  return {
    accountCount: saveFile.user.accountOrder.length,
    activeAccountName: saveFile.user.accountsById[saveFile.user.activeAccountId]?.name ?? "No account",
  };
}

function renderStatusTone(status: string): "default" | "accent" | "warning" | "success" {
  switch (status) {
    case "failed":
      return "warning";
    case "saved":
    case "backupSaved":
      return "success";
    case "saving":
    case "backupSaving":
      return "accent";
    default:
      return "default";
  }
}

export function SaveWorkspace({ embedded = false }: { embedded?: boolean }) {
  const exportSaveFile = useAppStore((state) => state.exportSaveFile);
  const importSaveFile = useAppStore((state) => state.importSaveFile);
  const exportAccount = useAppStore((state) => state.exportAccount);
  const importAccount = useAppStore((state) => state.importAccount);
  const restoreGoalBackup = useAppStore((state) => state.restoreGoalBackup);
  const restoreSaveRecoveryPoint = useAppStore((state) => state.restoreSaveRecoveryPoint);
  const refreshBackupState = useAppStore((state) => state.refreshBackupState);
  const activeAccount = useAppStore(selectActiveAccount);
  const goalBackups = useAppStore(selectActiveGoalBackups);
  const saveRecoveryPoints = useAppStore(selectSaveRecoveryPoints);
  const user = useAppStore((state) => state.user);
  const saveSummary = useAppStore(selectSaveSummary);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [accountDraft, setAccountDraft] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const accounts = useMemo(() => getAccountOrder(user), [user]);
  const selectedId = selectedAccountId || activeAccount?.id || accounts[0]?.id || "";

  useEffect(() => {
    void refreshBackupState();
  }, [activeAccount?.id, refreshBackupState]);

  const statusLabel =
    saveSummary.persistenceStatus === "failed"
      ? "Needs review"
      : saveSummary.lastBackupError
        ? "Backup warning"
        : "Protected";

  return (
    <section className="workspace-page">
      {!embedded ? (
        <PageHeader
          eyebrow="Settings"
          title="Backup and recovery"
          description="Keep account goals protected, restore a recent backup, or work with manual save exports."
        />
      ) : null}

      <MetricStrip
        items={[
          { label: "Status", value: statusLabel, tone: renderStatusTone(saveSummary.persistenceStatus) },
          { label: "Last save", value: formatTimestamp(saveSummary.lastSavedAt) },
          { label: "Last goal backup", value: formatTimestamp(saveSummary.lastGoalBackupAt) },
          { label: "Goal backups", value: String(saveSummary.goalBackupCount) },
          { label: "Recovery points", value: String(saveSummary.saveRecoveryPointCount) },
        ]}
      />

      <div className="utility-grid">
        <SectionCard
          title="Save health"
          actions={<StatusBadge tone={renderStatusTone(saveSummary.persistenceStatus)}>{saveSummary.persistenceStatus}</StatusBadge>}
        >
          <ul className="ranked-list">
            <li>
              <strong>Schema version</strong>
              <span>{saveSummary.schemaVersion}</span>
            </li>
            <li>
              <strong>App version</strong>
              <span>{saveSummary.appVersion}</span>
            </li>
            <li>
              <strong>Active account</strong>
              <span>{saveSummary.activeAccountName}</span>
            </li>
            <li>
              <strong>Accounts</strong>
              <span>{saveSummary.accountCount}</span>
            </li>
          </ul>
          {saveSummary.lastBackupError ? <p className="muted">Latest backup issue: {saveSummary.lastBackupError}</p> : null}
          {!saveSummary.lastBackupError && saveSummary.persistenceStatus !== "failed" ? (
            <p className="muted">Autosave stays primary. Recovery points stay local and quiet.</p>
          ) : null}
        </SectionCard>

        <SectionCard title="Goal Recovery" description="Restore only goals and planner settings for one account.">
          {!goalBackups.length ? (
            <EmptyStateCard title="No goal backups yet" description="Recent goal changes will start building recovery points automatically." />
          ) : (
            <div className="backup-record-list">
              {goalBackups.map((record) => {
                const summary = summarizeGoalBackup(record);
                return (
                  <article key={record.id} className="backup-record-row">
                    <div className="backup-record-main">
                      <strong>{formatTimestamp(record.createdAt)}</strong>
                      <span className="muted">
                        {record.payload.accountName} · {formatReason(record.reason)}
                      </span>
                      <span className="muted">
                        {summary.characterGoals} character · {summary.weaponGoals} weapon · {summary.artifactGoals} artifact goals
                      </span>
                    </div>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Restore goals for ${record.payload.accountName} from ${formatTimestamp(record.createdAt)}?`,
                        );
                        if (!confirmed) {
                          return;
                        }
                        await restoreGoalBackup(record.id);
                        setStatus(`Restored goals from ${formatTimestamp(record.createdAt)}.`);
                      }}
                    >
                      Restore goals
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Full Save Recovery" description="Restore the entire app save after imports or destructive changes.">
          {!saveRecoveryPoints.length ? (
            <EmptyStateCard title="No recovery points yet" description="Destructive actions will create rollback points automatically." />
          ) : (
            <div className="backup-record-list">
              {saveRecoveryPoints.map((record) => {
                const summary = summarizeSaveRecovery(record);
                return (
                  <article key={record.id} className="backup-record-row">
                    <div className="backup-record-main">
                      <strong>{formatTimestamp(record.createdAt)}</strong>
                      <span className="muted">{formatReason(record.reason)}</span>
                      <span className="muted">
                        {summary.accountCount} accounts · active: {summary.activeAccountName}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Restore the full save from ${formatTimestamp(record.createdAt)}? This will replace current accounts, settings, and override data.`,
                        );
                        if (!confirmed) {
                          return;
                        }
                        await restoreSaveRecoveryPoint(record.id);
                        setStatus(`Restored save from ${formatTimestamp(record.createdAt)}.`);
                      }}
                    >
                      Restore save
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Manual Export / Import" description="Export the full save or work with a single account.">
          <div className="stack">
            <div className="button-row wrap">
              <button
                type="button"
                className="button-secondary"
                onClick={async () => {
                  const exported = await exportSaveFile();
                  setDraft(exported);
                  setStatus("Save export loaded into the editor.");
                }}
              >
                Export Save
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={async () => {
                  await importSaveFile(draft);
                  setStatus("Save file imported.");
                }}
              >
                Import Save
              </button>
            </div>

            <label>
              Account
              <select value={selectedId} onChange={(event) => setSelectedAccountId(event.target.value)}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="button-row wrap">
              <button
                type="button"
                className="button-secondary"
                onClick={async () => {
                  const exported = await exportAccount(selectedId);
                  setAccountDraft(JSON.stringify(exported, null, 2));
                  setStatus("Account export loaded into the editor.");
                }}
              >
                Export Account
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={async () => {
                  const imported = JSON.parse(accountDraft) as unknown;
                  await importAccount(imported);
                  setStatus("Account imported as a new account.");
                }}
              >
                Import Account
              </button>
            </div>
          </div>
          {status ? <p className="muted">{status}</p> : null}
        </SectionCard>

        <SectionCard title="Advanced JSON" description="Inspect or edit raw save text only when needed.">
          <details className="backup-details">
            <summary>Full save JSON</summary>
            <textarea className="code-input" rows={18} value={draft} onChange={(event) => setDraft(event.target.value)} />
          </details>
          <details className="backup-details">
            <summary>Single account JSON</summary>
            <textarea
              className="code-input"
              rows={14}
              value={accountDraft}
              onChange={(event) => setAccountDraft(event.target.value)}
            />
          </details>
        </SectionCard>
      </div>
    </section>
  );
}
