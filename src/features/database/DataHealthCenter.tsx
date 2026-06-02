import { useMemo, useState } from "react";
import { EmptyStateCard, FilterToolbar, MetricStrip, SectionCard, StatusBadge } from "../../app/layoutPrimitives";
import {
  filterDataHealthIssues,
  getDataHealthEmptyState,
  getDataHealthPrimaryActionLabel,
  getDataHealthStatus,
  groupDataHealthIssues,
  type DataHealthCenterModel,
  type DataHealthFilters,
  type DataHealthGroupBy,
  type DataHealthIssue,
  type DataHealthSeverity,
} from "./dataHealthModel";

interface DataHealthCenterProps {
  model: DataHealthCenterModel;
  onOpenIssue: (issue: DataHealthIssue) => void;
}

function toneForSeverity(severity: DataHealthSeverity): "warning" | "accent" | "muted" | "success" {
  switch (severity) {
    case "blocking":
    case "warning":
      return "warning";
    case "beta":
      return "accent";
    case "ignored":
      return "muted";
    default:
      return "success";
  }
}

function formatSeverityLabel(severity: DataHealthSeverity): string {
  switch (severity) {
    case "blocking":
      return "Blocking";
    case "warning":
      return "Warning";
    case "info":
      return "Info";
    case "beta":
      return "Beta";
    case "ignored":
      return "Ignored";
  }
}

export function DataHealthCenter({ model, onOpenIssue }: DataHealthCenterProps) {
  const [filters, setFilters] = useState<DataHealthFilters>({
    search: "",
    severity: "all",
    category: "all",
    affectedType: "all",
    activeGoalImpactOnly: false,
  });
  const [groupBy, setGroupBy] = useState<DataHealthGroupBy>("category");

  const filteredIssues = useMemo(() => filterDataHealthIssues(model.issues, filters), [filters, model.issues]);
  const groupedIssues = useMemo(() => groupDataHealthIssues(filteredIssues, groupBy), [filteredIssues, groupBy]);
  const emptyState = useMemo(() => getDataHealthEmptyState(model.summary, filters, filteredIssues), [filteredIssues, filters, model.summary]);
  const status = getDataHealthStatus(model.summary);

  return (
    <div className="database-overview-stack">
      <SectionCard
        title="Data Health Center"
        description="Review the highest-impact database, planner, and import issues first, then drill into details only when needed."
        actions={<StatusBadge tone={status === "Healthy" ? "success" : "warning"}>{status}</StatusBadge>}
      >
        <MetricStrip
          items={[
            { label: "Blocking", value: String(model.summary.blockingCount), tone: model.summary.blockingCount ? "warning" : "success" },
            { label: "Warnings", value: String(model.summary.warningCount), tone: model.summary.warningCount ? "warning" : "success" },
            { label: "Info", value: String(model.summary.infoCount), tone: model.summary.infoCount ? "accent" : "default" },
            { label: "Beta", value: String(model.summary.betaCount), tone: model.summary.betaCount ? "accent" : "default" },
            { label: "Ignored", value: String(model.summary.ignoredCount), tone: model.summary.ignoredCount ? "default" : "default" },
          ]}
        />
      </SectionCard>

      {model.cleanupItems.length ? (
        <SectionCard title="Suggested fixes" description="Use these shortcuts to focus on the next most useful cleanup pass.">
          <div className="data-health-cleanup-grid">
            {model.cleanupItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className="data-health-cleanup-item"
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    severity: item.severity ?? "all",
                    category: item.category ?? "all",
                    activeGoalImpactOnly: item.activeOnly ?? false,
                  }))
                }
              >
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Issues"
        description="Compact rows stay focused on what needs attention now. Expand a row for source context and the next action."
      >
        <FilterToolbar
          actions={
            <div className="badge-row">
              <StatusBadge tone={filters.activeGoalImpactOnly ? "warning" : "muted"}>
                {filters.activeGoalImpactOnly ? "Active-goal focus" : "All goals"}
              </StatusBadge>
              <button
                type="button"
                className="button-ghost"
                onClick={() =>
                  setFilters({
                    search: "",
                    severity: "all",
                    category: "all",
                    affectedType: "all",
                    activeGoalImpactOnly: false,
                  })
                }
              >
                Reset
              </button>
            </div>
          }
        >
          <label>
            Search issues
            <input
              className="text-input"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search by name, material, source, or fix"
            />
          </label>
          <label>
            Severity
            <select
              value={filters.severity}
              onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value as DataHealthSeverity | "all" }))}
            >
              <option value="all">All</option>
              <option value="blocking">Blocking</option>
              <option value="warning">Warnings</option>
              <option value="info">Info</option>
              <option value="beta">Beta</option>
              <option value="ignored">Ignored</option>
            </select>
          </label>
          <label>
            Category
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value as typeof current.category }))}
            >
              <option value="all">All categories</option>
              {model.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Affected type
            <select
              value={filters.affectedType}
              onChange={(event) => setFilters((current) => ({ ...current, affectedType: event.target.value as typeof current.affectedType }))}
            >
              <option value="all">All types</option>
              {model.affectedTypes.map((affectedType) => (
                <option key={affectedType} value={affectedType}>
                  {affectedType}
                </option>
              ))}
            </select>
          </label>
          <label>
            Group by
            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as DataHealthGroupBy)}>
              <option value="category">Category</option>
              <option value="source">Source</option>
              <option value="affectedType">Affected type</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={filters.activeGoalImpactOnly}
              onChange={(event) => setFilters((current) => ({ ...current, activeGoalImpactOnly: event.target.checked }))}
            />
            Active goal impact
          </label>
        </FilterToolbar>

        {!filteredIssues.length ? (
          <EmptyStateCard title={emptyState.title} description={emptyState.description} />
        ) : (
          <div className="data-health-group-list">
            {groupedIssues.map((group) => (
              <section key={group.key} className="data-health-group">
                <div className="data-health-group-header">
                  <h3>{group.label}</h3>
                  <StatusBadge tone="muted">{group.issues.length}</StatusBadge>
                </div>
                <div className="data-health-issue-list">
                  {group.issues.map((issue) => (
                    <details key={issue.id} className="data-health-issue">
                      <summary className="data-health-issue-summary">
                        <div className="data-health-issue-main">
                          <div className="data-health-issue-heading">
                            <span className={`data-health-severity-pill data-health-severity-${issue.severity}`}>
                              {formatSeverityLabel(issue.severity)}
                            </span>
                            <strong>
                              {[issue.affectedType ? issue.affectedType : null, issue.affectedName ?? issue.affectedKey ?? null]
                                .filter(Boolean)
                                .join(" · ") || "System"}
                            </strong>
                          </div>
                          <div className="data-health-issue-title">{issue.title}</div>
                          <p className="muted">{issue.shortMessage}</p>
                        </div>
                        <div className="data-health-issue-badges">
                          {issue.affectsActiveGoals ? <StatusBadge tone="warning">Affects active goals</StatusBadge> : null}
                          {issue.severity === "beta" ? <StatusBadge tone="accent">Beta only</StatusBadge> : null}
                          {issue.severity === "ignored" ? <StatusBadge tone="muted">Ignored</StatusBadge> : null}
                          {issue.category === "Missing Material Source" ? <StatusBadge tone="warning">Missing source</StatusBadge> : null}
                        </div>
                      </summary>
                      <div className="data-health-issue-details">
                        <dl className="data-health-detail-grid">
                          <div>
                            <dt>Category</dt>
                            <dd>{issue.category}</dd>
                          </div>
                          <div>
                            <dt>Source</dt>
                            <dd>{issue.sourceArea ?? "Database"}</dd>
                          </div>
                          {issue.sourceFile ? (
                            <div>
                              <dt>File</dt>
                              <dd>{issue.sourceFile}</dd>
                            </div>
                          ) : null}
                          {issue.suggestedAction ? (
                            <div>
                              <dt>Action</dt>
                              <dd>{issue.suggestedAction}</dd>
                            </div>
                          ) : null}
                        </dl>
                        {issue.details ? <p className="muted">{issue.details}</p> : null}
                        <div className="button-row wrap">
                          <button type="button" className="button-secondary" onClick={() => onOpenIssue(issue)}>
                            {getDataHealthPrimaryActionLabel(issue)}
                          </button>
                          <StatusBadge tone={toneForSeverity(issue.severity)}>{formatSeverityLabel(issue.severity)}</StatusBadge>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
