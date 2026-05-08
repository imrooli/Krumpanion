import type { ImportWarning } from "../../domain/good/types";
import type { PlannerWarning } from "../../domain/planner/types";
import { EmptyStateCard, MetricStrip, PageHeader, StatusBadge } from "../../app/layoutPrimitives";
import { useAppStore } from "../../store/useAppStore";

interface WarningsWorkspaceProps {
  importWarnings: ImportWarning[];
  overrideWarnings: PlannerWarning[];
  plannerWarnings: PlannerWarning[];
  embedded?: boolean;
}

export function WarningsWorkspace({
  importWarnings,
  overrideWarnings,
  plannerWarnings,
  embedded = false,
}: WarningsWorkspaceProps) {
  const staticData = useAppStore((state) => state.staticData);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const unresolvedRows = [
    ...staticData.unresolvedCharacterMaterialReferences.map((row) => ({
      key: `${row.characterKey}-${row.materialSlot}-${row.generatedKey}`,
      label: `${row.displayName} • ${row.materialSlot}`,
      detail: `${row.rawName} -> ${row.generatedKey}`,
      reason: row.reason,
    })),
    ...staticData.unresolvedCharacterReferences.map((row) => ({
      key: `character-${row.generatedKey}`,
      label: `Character family reference`,
      detail: `${row.displayName} -> ${row.generatedKey}`,
      reason: "Character reference did not resolve to a known registry entry.",
    })),
    ...staticData.unresolvedWeaponReferences.map((row) => ({
      key: `weapon-${row.generatedKey}`,
      label: `Weapon family reference`,
      detail: `${row.weaponName} -> ${row.generatedKey}`,
      reason: "Weapon reference did not resolve to a known registry entry.",
    })),
  ];

  const totalWarnings = importWarnings.length + overrideWarnings.length + plannerWarnings.length + unresolvedRows.length;

  return (
    <section className="workspace-page">
      {!embedded ? (
        <PageHeader
          eyebrow="Settings"
          title="Warnings and diagnostics"
          description="One place for import, override, planner, and unresolved-database issues so you can jump straight to the right fix."
          actions={
            <div className="button-row wrap">
              <button type="button" className="button-secondary" onClick={() => void setActiveTab("inventory")}>
                Open Inventory
              </button>
              <button type="button" className="button-secondary" onClick={() => void setActiveTab("database")}>
                Open Database
              </button>
            </div>
          }
        />
      ) : null}

      <MetricStrip
        items={[
          { label: "Total warning items", value: String(totalWarnings), tone: totalWarnings ? "warning" : "success" },
          { label: "Import warnings", value: String(importWarnings.length), tone: importWarnings.length ? "warning" : "success" },
          { label: "Override warnings", value: String(overrideWarnings.length), tone: overrideWarnings.length ? "warning" : "success" },
          { label: "Planner warnings", value: String(plannerWarnings.length), tone: plannerWarnings.length ? "warning" : "success" },
          { label: "Unresolved data refs", value: String(unresolvedRows.length), tone: unresolvedRows.length ? "warning" : "success" },
        ]}
      />

      <div className="utility-grid utility-grid-warnings">
        <article className="panel">
          <div className="section-header">
            <div>
              <h2>Import Warnings</h2>
              <p className="muted">Parsing and inventory-shape issues from the latest GOOD import.</p>
            </div>
            <StatusBadge tone={importWarnings.length ? "warning" : "success"}>
              {importWarnings.length ? `${importWarnings.length} issue(s)` : "Clear"}
            </StatusBadge>
          </div>
          {importWarnings.length ? (
            <ul className="warning-list">
              {importWarnings.map((warning) => (
                <li key={`${warning.type}-${warning.key ?? warning.message}`}>
                  <strong>{warning.type}</strong>
                  <span>{warning.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyStateCard title="Import health is clear" description="The latest GOOD snapshot did not produce parser warnings." />
          )}
        </article>

        <article className="panel">
          <div className="section-header">
            <div>
              <h2>Override and Planner Warnings</h2>
              <p className="muted">Warnings produced by override validation and planner derivation.</p>
            </div>
            <StatusBadge tone={overrideWarnings.length + plannerWarnings.length ? "warning" : "success"}>
              {overrideWarnings.length + plannerWarnings.length ? "Needs review" : "Clear"}
            </StatusBadge>
          </div>
          <div className="stack">
            <div>
              <h3>Override warnings</h3>
              <ul className="warning-list">
                {overrideWarnings.map((warning) => (
                  <li key={`${warning.type}-${warning.key ?? warning.message}`}>{warning.message}</li>
                ))}
                {!overrideWarnings.length ? <li>No override warnings.</li> : null}
              </ul>
            </div>
            <div>
              <h3>Planner warnings</h3>
              <ul className="warning-list">
                {plannerWarnings.map((warning) => (
                  <li key={`${warning.type}-${warning.key ?? warning.message}`}>{warning.message}</li>
                ))}
                {!plannerWarnings.length ? <li>No planner warnings.</li> : null}
              </ul>
            </div>
          </div>
        </article>

        <article className="panel utility-wide-panel">
          <div className="section-header">
            <div>
              <h2>Unresolved Database References</h2>
              <p className="muted">Generated keys and registry misses are surfaced here instead of being silently remapped.</p>
            </div>
            <StatusBadge tone={unresolvedRows.length ? "warning" : "success"}>
              {unresolvedRows.length ? `${unresolvedRows.length} unresolved` : "Clear"}
            </StatusBadge>
          </div>
          <ul className="warning-list">
            {unresolvedRows.map((row) => (
              <li key={row.key}>
                <div>
                  <strong>{row.label}</strong>
                  <div className="muted">{row.detail}</div>
                </div>
                <span>{row.reason}</span>
              </li>
            ))}
            {!unresolvedRows.length ? <li>No unresolved database references.</li> : null}
          </ul>
        </article>
      </div>
    </section>
  );
}
