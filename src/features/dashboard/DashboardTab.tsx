import type { PlannerOutput } from "../../domain/planner/types";
import { selectActiveAccount, selectActiveGoals } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import type { ImportWarning } from "../../domain/good/types";

interface DashboardTabProps {
  plannerOutput: PlannerOutput;
  importWarnings: ImportWarning[];
}

export function DashboardTab({ plannerOutput, importWarnings }: DashboardTabProps) {
  const account = useAppStore(selectActiveAccount);
  const goals = useAppStore(selectActiveGoals);

  const totalGoals =
    Object.keys(goals.characterGoals).length + Object.keys(goals.weaponGoals).length + goals.artifactGoals.length;

  return (
    <section className="dashboard-grid">
      <div className="panel card-grid">
        <MetricCard label="GOOD source" value={account?.importMeta.source ?? "Not imported"} />
        <MetricCard label="Characters owned" value={String(account?.characters.length ?? 0)} />
        <MetricCard label="Weapons owned" value={String(account?.weapons.length ?? 0)} />
        <MetricCard label="Materials tracked" value={String(Object.keys(account?.inventory ?? {}).length)} />
        <MetricCard label="Active goals" value={String(totalGoals)} />
        <MetricCard label="Guaranteed resin" value={`${plannerOutput.resinSummary.guaranteedTotalResin}`} />
        <MetricCard label="Expected · Advisory" value={`${plannerOutput.resinSummary.expectedAdvisoryResin}`} />
      </div>

      <div className="panel">
        <h2>Top Resin bottlenecks</h2>
        <ul className="ranked-list">
          {plannerOutput.totalMissingByMaterial.slice(0, 5).map((row) => (
            <li key={row.materialKey}>
              <strong>{row.displayName}</strong>
              <span>{row.missing} missing</span>
            </li>
          ))}
          {plannerOutput.totalMissingByMaterial.length === 0 ? <li>No missing materials yet.</li> : null}
        </ul>
      </div>

      <div className="panel">
        <h2>Today’s recommendations</h2>
        <ul className="ranked-list">
          {plannerOutput.today.slice(0, 5).map((recommendation) => (
            <li key={recommendation.id}>
              <strong>{recommendation.title}</strong>
              <span>{recommendation.reason}</span>
            </li>
          ))}
          {plannerOutput.today.length === 0 ? <li>No recommendations yet.</li> : null}
        </ul>
      </div>

      <div className="panel">
        <h2>Warnings</h2>
        <ul className="warning-list">
          {importWarnings.map((warning) => (
            <li key={`${warning.type}-${warning.key ?? warning.message}`}>{warning.message}</li>
          ))}
          {plannerOutput.warnings.map((warning) => (
            <li key={`${warning.type}-${warning.key ?? warning.message}`}>{warning.message}</li>
          ))}
          {importWarnings.length + plannerOutput.warnings.length === 0 ? <li>No warnings.</li> : null}
        </ul>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
