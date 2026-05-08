import type { DatabaseCoverageModel, CoverageQueueItem } from "./databaseModel";
import type { StaticDataHealthReport } from "../../domain/staticData/validateStaticData";

export function CoverageQueueList({
  title,
  description,
  items,
  onOpenItem,
}: {
  title: string;
  description: string;
  items: CoverageQueueItem[];
  onOpenItem: (item: CoverageQueueItem) => void;
}) {
  return (
    <article className="panel">
      <div className="section-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <span className="muted">{items.length}</span>
      </div>
      <div className="catalog-list">
        {items.slice(0, 12).map((item) => (
          <button key={item.id} type="button" className="catalog-item" onClick={() => onOpenItem(item)}>
            <div>
              <strong>{item.label}</strong>
              <small>{item.recordKey}</small>
              {item.subtitle ? <small>{item.subtitle}</small> : null}
            </div>
            <div className="badge-row">
              {item.badges.map((badge) => (
                <span key={`${item.id}-${badge}`} className="mini-badge">
                  {badge}
                </span>
              ))}
            </div>
          </button>
        ))}
        {items.length === 0 ? <p className="muted">Nothing is blocking this queue right now.</p> : null}
      </div>
    </article>
  );
}

export function DatabaseHomeCoverage({
  coverage,
  healthReport,
  onOpenItem,
}: {
  coverage: DatabaseCoverageModel;
  healthReport: StaticDataHealthReport;
  onOpenItem: (item: CoverageQueueItem) => void;
}) {
  return (
    <div className="database-coverage-grid">
      <article className="panel">
        <div className="section-header">
          <div>
            <h3>Static Data Health</h3>
            <p className="muted">Run <code>npm run data:validate</code> for the full JSON and markdown report.</p>
          </div>
        </div>
        <div className="workspace-card-grid">
          <article className="metric-card">
            <span>Errors</span>
            <strong>{healthReport.summary.errorCount}</strong>
          </article>
          <article className="metric-card">
            <span>Warnings</span>
            <strong>{healthReport.summary.warningCount}</strong>
          </article>
          <article className="metric-card">
            <span>Unresolved refs</span>
            <strong>
              {healthReport.summary.unresolvedCharacterMaterialReferenceCount +
                healthReport.summary.unresolvedCharacterReferenceCount +
                healthReport.summary.unresolvedWeaponReferenceCount}
            </strong>
          </article>
          <article className="metric-card">
            <span>Incomplete characters</span>
            <strong>{healthReport.summary.incompleteCharacterProfileCount}</strong>
          </article>
          <article className="metric-card">
            <span>Incomplete weapons</span>
            <strong>{healthReport.summary.incompleteWeaponProfileCount}</strong>
          </article>
          <article className="metric-card">
            <span>Missing sources</span>
            <strong>{healthReport.summary.missingMaterialSourceCount}</strong>
          </article>
        </div>
      </article>
      {coverage.groups.map((group) => (
        <CoverageQueueList
          key={group.key}
          title={group.title}
          description={group.description}
          items={group.items}
          onOpenItem={onOpenItem}
        />
      ))}
    </div>
  );
}
