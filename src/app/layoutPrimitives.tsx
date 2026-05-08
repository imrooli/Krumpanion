import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function MetricStrip({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: "default" | "accent" | "warning" | "success" }>;
}) {
  return (
    <section className="metric-strip">
      {items.map((item) => (
        <article key={`${item.label}-${item.value}`} className={`metric-card metric-card-${item.tone ?? "default"}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

export function StatusBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "warning" | "success" | "muted";
}) {
  return <span className={`status-badge status-badge-${tone}`}>{children}</span>;
}

export function EmptyStateCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <article className="panel empty-state-card">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {action}
    </article>
  );
}

export function SplitWorkspace({
  left,
  center,
  right,
}: {
  left: ReactNode;
  center: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className={`split-workspace ${right ? "has-right" : ""}`}>
      <aside className="workspace-rail">{left}</aside>
      <div className="workspace-main">{center}</div>
      {right ? <aside className="workspace-inspector">{right}</aside> : null}
    </section>
  );
}

export function InspectorPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="panel inspector-panel">
      <h3>{title}</h3>
      <div className="stack">{children}</div>
    </article>
  );
}

export function SectionToolbar({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="section-toolbar">{children}</div>;
}

export function DataTableShell({
  title,
  description,
  toolbar,
  children,
}: {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="panel data-table-shell">
      <div className="section-header">
        <div>
          <h3>{title}</h3>
          {description ? <p className="muted">{description}</p> : null}
        </div>
      </div>
      {toolbar ? <SectionToolbar>{toolbar}</SectionToolbar> : null}
      <div className="table-wrapper">{children}</div>
    </article>
  );
}

export function PageShell({
  header,
  metrics,
  children,
}: {
  header: ReactNode;
  metrics?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="workspace-page">
      {header}
      {metrics}
      <div className="page-shell-body">{children}</div>
    </section>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="panel section-card">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {actions ? <div className="section-card-actions">{actions}</div> : null}
      </div>
      {children}
    </article>
  );
}

export function WorkspaceTabs<T extends string>({
  label,
  tabs,
  activeTab,
  onChange,
}: {
  label: string;
  tabs: Array<{ key: T; label: string; count?: number }>;
  activeTab: T;
  onChange: (key: T) => void;
}) {
  return (
    <nav className="workspace-tabs" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`workspace-tab ${activeTab === tab.key ? "is-active" : ""}`}
          onClick={() => onChange(tab.key)}
          aria-pressed={activeTab === tab.key}
        >
          <span>{tab.label}</span>
          {typeof tab.count === "number" ? <small>{tab.count}</small> : null}
        </button>
      ))}
    </nav>
  );
}

export function FilterToolbar({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="filter-toolbar">
      <div className="filter-toolbar-fields">{children}</div>
      {actions ? <div className="filter-toolbar-actions">{actions}</div> : null}
    </div>
  );
}

export function WarningPanel({
  title,
  tone = "warning",
  children,
}: {
  title: string;
  tone?: "warning" | "error" | "info";
  children: ReactNode;
}) {
  return (
    <article className={`warning-panel warning-panel-${tone}`} role={tone === "error" ? "alert" : undefined}>
      <div className="warning-panel-title">{title}</div>
      <div className="warning-panel-body">{children}</div>
    </article>
  );
}
