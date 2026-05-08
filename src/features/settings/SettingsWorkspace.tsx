import { useMemo, useState } from "react";
import type { ImportWarning } from "../../domain/good/types";
import type { PlannerWarning } from "../../domain/planner/types";
import {
  MetricStrip,
  PageHeader,
  PageShell,
  SectionCard,
  StatusBadge,
  WorkspaceTabs,
} from "../../app/layoutPrimitives";
import { selectActiveAccount, selectSaveSummary } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { SaveWorkspace } from "../importExport/SaveWorkspace";
import { WarningsWorkspace } from "./WarningsWorkspace";

type SettingsTabKey = "account" | "backup" | "diagnostics" | "overrides";

interface SettingsWorkspaceProps {
  importWarnings: ImportWarning[];
  overrideWarnings: PlannerWarning[];
  plannerWarnings: PlannerWarning[];
}

export function SettingsWorkspace({ importWarnings, overrideWarnings, plannerWarnings }: SettingsWorkspaceProps) {
  const activeAccount = useAppStore(selectActiveAccount);
  const overrideText = useAppStore((state) => state.overrideText);
  const staticData = useAppStore((state) => state.staticData);
  const importOverrideText = useAppStore((state) => state.importOverrideText);
  const clearOverridePack = useAppStore((state) => state.clearOverridePack);
  const saveSummary = useAppStore(selectSaveSummary);
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("account");
  const [draft, setDraft] = useState(overrideText);
  const [status, setStatus] = useState("");

  const warningCount = importWarnings.length + overrideWarnings.length + plannerWarnings.length;
  const tabs = useMemo(
    () => [
      { key: "account" as const, label: "Account / App" },
      { key: "backup" as const, label: "Backup / Export" },
      { key: "diagnostics" as const, label: "Warnings / Diagnostics", count: warningCount },
      { key: "overrides" as const, label: "Overrides", count: staticData.appliedOverrideKeys.length },
    ],
    [staticData.appliedOverrideKeys.length, warningCount],
  );

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="Settings"
          title="App state, backups, and diagnostics"
          description="Account summary, planner-adjacent utilities, save backups, warnings, and override-pack management live together here instead of being scattered across utility pages."
        />
      }
      metrics={
        <MetricStrip
          items={[
            { label: "Active account", value: activeAccount?.name ?? "No account", tone: "accent" },
            { label: "Accounts", value: String(saveSummary.accountCount) },
            { label: "Warnings", value: String(warningCount), tone: warningCount ? "warning" : "success" },
            { label: "Override keys", value: String(staticData.appliedOverrideKeys.length) },
            { label: "Save schema", value: `v${saveSummary.schemaVersion}` },
          ]}
        />
      }
    >
      <WorkspaceTabs label="Settings sections" tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "account" ? (
        <div className="workspace-card-grid settings-overview-grid">
          <SectionCard title="Account summary" description="Planner assumptions are best adjusted in Planner. This page focuses on account status and broader app management.">
            <ul className="ranked-list">
              <li>
                <strong>Active account</strong>
                <span>{activeAccount?.name ?? "No account"}</span>
              </li>
              <li>
                <strong>Last GOOD import</strong>
                <span>
                  {activeAccount?.importState.lastGoodImportAt
                    ? new Date(activeAccount.importState.lastGoodImportAt).toLocaleString()
                    : "Not imported"}
                </span>
              </li>
              <li>
                <strong>Server region</strong>
                <span>{activeAccount?.metadata.serverRegion ?? "unknown"}</span>
              </li>
              <li>
                <strong>UID</strong>
                <span>{activeAccount?.metadata.uid ?? "Not stored"}</span>
              </li>
            </ul>
          </SectionCard>

          <SectionCard title="App summary" description="Global static data and save metadata remain shared across every account.">
            <ul className="ranked-list">
              <li>
                <strong>App version</strong>
                <span>{saveSummary.appVersion}</span>
              </li>
              <li>
                <strong>Bundled characters</strong>
                <span>{Object.keys(staticData.characters).length}</span>
              </li>
              <li>
                <strong>Bundled materials</strong>
                <span>{Object.keys(staticData.materials).length}</span>
              </li>
              <li>
                <strong>Override keys applied</strong>
                <span>{staticData.appliedOverrideKeys.length}</span>
              </li>
            </ul>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "backup" ? <SaveWorkspace embedded /> : null}
      {activeTab === "diagnostics" ? (
        <WarningsWorkspace
          embedded
          importWarnings={importWarnings}
          overrideWarnings={overrideWarnings}
          plannerWarnings={plannerWarnings}
        />
      ) : null}

      {activeTab === "overrides" ? (
        <div className="workspace-card-grid settings-overview-grid">
          <SectionCard title="Override coverage" description="Overrides stay global so database edits are applied consistently across all accounts.">
            <ul className="ranked-list">
              <li>
                <strong>Applied override keys</strong>
                <span>{staticData.appliedOverrideKeys.length}</span>
              </li>
              <li>
                <strong>Character profiles</strong>
                <span>{Object.keys(staticData.characterMaterialProfiles).length}</span>
              </li>
              <li>
                <strong>Weapon profiles</strong>
                <span>{Object.keys(staticData.weaponMaterialProfiles).length}</span>
              </li>
              <li>
                <strong>Active warning sources</strong>
                <span>{warningCount}</span>
              </li>
            </ul>
            <div className="badge-row">
              <StatusBadge tone={staticData.appliedOverrideKeys.length ? "accent" : "muted"}>
                {staticData.appliedOverrideKeys.length} override key(s) applied
              </StatusBadge>
            </div>
          </SectionCard>

          <SectionCard title="Override pack editor" description="Use override packs for local maintenance and future data patches without modifying the bundled database.">
            <textarea className="code-input" rows={16} value={draft} onChange={(event) => setDraft(event.target.value)} />
            <div className="button-row wrap">
              <button
                type="button"
                className="button-primary"
                onClick={async () => {
                  await importOverrideText(draft);
                  setStatus("Override pack imported.");
                }}
              >
                Save Override Pack
              </button>
              <button
                type="button"
                className="button-ghost button-destructive"
                onClick={async () => {
                  await clearOverridePack();
                  setDraft("");
                  setStatus("Override pack cleared.");
                }}
              >
                Clear Override Pack
              </button>
            </div>
            <p className="muted">{status}</p>
          </SectionCard>
        </div>
      ) : null}
    </PageShell>
  );
}
