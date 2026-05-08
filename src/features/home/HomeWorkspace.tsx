import type { ImportWarning } from "../../domain/good/types";
import type { PlannerOutput, PlannerWarning } from "../../domain/planner/types";
import { selectActiveAccount, selectActiveGoals } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { EmptyStateCard, MetricStrip, PageHeader, StatusBadge } from "../../app/layoutPrimitives";

interface HomeWorkspaceProps {
  plannerOutput: PlannerOutput;
  importWarnings: ImportWarning[];
  overrideWarnings: PlannerWarning[];
}

export function HomeWorkspace({ plannerOutput, importWarnings, overrideWarnings }: HomeWorkspaceProps) {
  const account = useAppStore(selectActiveAccount);
  const goals = useAppStore(selectActiveGoals);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const staticData = useAppStore((state) => state.staticData);

  const totalGoals =
    Object.keys(goals.characterGoals).length + Object.keys(goals.weaponGoals).length + goals.artifactGoals.length;
  const totalWarnings = importWarnings.length + overrideWarnings.length + plannerOutput.warnings.length;
  const healthCount =
    staticData.unresolvedCharacterMaterialReferences.length +
    staticData.unresolvedCharacterReferences.length +
    staticData.unresolvedWeaponReferences.length;

  if (!account) {
    return (
      <section className="workspace-page">
        <PageHeader
          eyebrow="Dashboard"
          title="Welcome to Krumpanion"
          description="Import a GOOD inventory to unlock actionable planning, shortage analysis, and database health guidance."
        />
        <EmptyStateCard
          title="Start with a GOOD inventory"
          description="The redesigned home screen becomes actionable once an account snapshot is loaded. You can import your own file or use the bundled example."
          action={
            <div className="button-row">
              <button type="button" className="button-primary" onClick={() => void setActiveTab("inventory")}>
                Open Inventory
              </button>
              <button type="button" className="button-secondary" onClick={() => void setActiveTab("database")}>
                Review Database Health
              </button>
            </div>
          }
        />
      </section>
    );
  }

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Dashboard"
        title="What should you work on next?"
        description={`A compact overview for ${account.name}, including deterministic shortages, farming estimates, resin pressure, and data blockers.`}
      />

      <MetricStrip
        items={[
          { label: "Account", value: account.name, tone: "accent" },
          { label: "GOOD snapshot", value: `${account.importMeta.source ?? "GOOD"} v${account.importMeta.version}` },
          { label: "Active goals", value: String(totalGoals), tone: totalGoals ? "accent" : "default" },
          { label: "Estimated resin", value: String(plannerOutput.summary.totalEstimatedResin), tone: "warning" },
          { label: "Crafting Mora", value: String(plannerOutput.summary.craftingMora), tone: "accent" },
          { label: "Total Mora", value: String(plannerOutput.summary.totalMora), tone: "warning" },
          { label: "Natural days", value: plannerOutput.resinSummary.totalEstimatedNaturalResinDays.toFixed(2) },
          {
            label: "Weekly-gated",
            value: String(plannerOutput.summary.weeklyGatedEstimateCount),
            tone: plannerOutput.summary.weeklyGatedEstimateCount ? "warning" : "success",
          },
          { label: "Warnings", value: String(totalWarnings), tone: totalWarnings ? "warning" : "success" },
          { label: "Data health issues", value: String(healthCount), tone: healthCount ? "warning" : "success" },
        ]}
      />

      <div className="home-grid">
        <article className="panel home-primary-panel">
          <div className="section-header">
            <div>
              <h2>Next Actions</h2>
              <p className="muted">Today&apos;s highest-signal recommendations, including blockers when planning certainty is limited.</p>
            </div>
            <button type="button" className="button-secondary" onClick={() => void setActiveTab("planner")}>
              Open Planner
            </button>
          </div>
          <ul className="ranked-list">
            {plannerOutput.today.slice(0, 6).map((recommendation) => (
              <li key={recommendation.id}>
                <div>
                  <strong>{recommendation.title}</strong>
                  <div className="muted">{recommendation.reason}</div>
                </div>
                <div className="badge-row">
                  <StatusBadge tone={recommendation.isAvailableToday ? "success" : "warning"}>
                    {recommendation.isAvailableToday ? "Available today" : "Blocked"}
                  </StatusBadge>
                  <StatusBadge tone="muted">{recommendation.sourceName ?? recommendation.category}</StatusBadge>
                </div>
              </li>
            ))}
            {plannerOutput.today.length === 0 ? <li>No recommendations yet. Set goals in Planning first.</li> : null}
          </ul>
        </article>

        <article className="panel">
          <div className="section-header">
            <div>
              <h2>Shortage Snapshot</h2>
              <p className="muted">Top missing materials across goals, with source and resin context.</p>
            </div>
            <button type="button" className="button-ghost" onClick={() => void setActiveTab("inventory")}>
              View Inventory
            </button>
          </div>
          <ul className="ranked-list">
            {plannerOutput.totalMissingByMaterial.slice(0, 8).map((row) => {
                    const estimate = plannerOutput.farmingEstimates.find(
                      (item) => item.materialKey === row.materialKey || item.relatedMaterialKeys?.includes(row.materialKey),
                    );
              return (
                <li key={row.materialKey}>
                  <div>
                    <strong>{row.displayName}</strong>
                    <div className="muted">
                      {row.familyDisplayName ?? row.category}
                      {row.region ? ` • ${row.region}` : ""}
                    </div>
                  </div>
                  <div className="badge-row">
                    <StatusBadge tone="warning">{row.effectiveDeficit} deficit</StatusBadge>
                    {estimate?.estimatedResin ? <StatusBadge tone="muted">{estimate.estimatedResin} resin</StatusBadge> : null}
                    {row.craftableQuantity > 0 ? <StatusBadge tone="accent">{row.craftableQuantity} craftable</StatusBadge> : null}
                  </div>
                </li>
              );
            })}
            {plannerOutput.totalMissingByMaterial.length === 0 ? <li>No shortages right now.</li> : null}
          </ul>
        </article>

        <article className="panel">
          <div className="section-header">
            <div>
              <h2>Resin Outlook</h2>
              <p className="muted">Keep exact shortages separate from estimated resin, time, and weekly gates.</p>
            </div>
          </div>
          <ul className="ranked-list">
            <li>
              <strong>Progression Mora</strong>
              <span>{plannerOutput.summary.progressionMora}</span>
            </li>
            <li>
              <strong>Crafting Mora</strong>
              <span>{plannerOutput.summary.craftingMora}</span>
            </li>
            <li>
              <strong>Natural resin days</strong>
              <span>{plannerOutput.summary.totalEstimatedNaturalResinDays.toFixed(2)}</span>
            </li>
            <li>
              <strong>Natural resin weeks</strong>
              <span>{plannerOutput.summary.totalEstimatedNaturalResinWeeks.toFixed(2)}</span>
            </li>
            <li>
              <strong>Weekly-gated estimates</strong>
              <span>{plannerOutput.summary.weeklyGatedEstimateCount}</span>
            </li>
            <li>
              <strong>Source-modeled rows</strong>
              <span>{plannerOutput.farmingEstimates.length}</span>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="section-header">
            <div>
              <h2>Data Health</h2>
              <p className="muted">Unresolved data and warnings that affect planning confidence.</p>
            </div>
            <div className="button-row">
              <button type="button" className="button-secondary" onClick={() => void setActiveTab("settings")}>
                Review Diagnostics
              </button>
              <button type="button" className="button-ghost" onClick={() => void setActiveTab("database")}>
                Open Database
              </button>
            </div>
          </div>
          <ul className="ranked-list">
            <li>
              <strong>Import warnings</strong>
              <span>{importWarnings.length}</span>
            </li>
            <li>
              <strong>Override / data warnings</strong>
              <span>{overrideWarnings.length}</span>
            </li>
            <li>
              <strong>Planner warnings</strong>
              <span>{plannerOutput.warnings.length}</span>
            </li>
            <li>
              <strong>Unresolved source references</strong>
              <span>{healthCount}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
