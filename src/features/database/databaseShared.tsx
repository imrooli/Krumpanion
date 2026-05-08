import { useMemo } from "react";
import type { CatalogRow, DatabaseSearchRecord } from "./databaseModel";
import { filterRows } from "./databaseModel";

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  includeBlank = true,
}: {
  label: string;
  value: T | "";
  options: readonly T[];
  onChange: (value: T | "") => void;
  includeBlank?: boolean;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value as T | "")}>
        {includeBlank ? <option value="">Unset</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function QueuePanel({
  title,
  description,
  keys,
  onUseKey,
}: {
  title: string;
  description: string;
  keys: string[];
  onUseKey: (key: string) => void;
}) {
  return (
    <article className="panel">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      <div className="pill-list">
        {keys.map((key) => (
          <button key={key} type="button" className="pill-button" onClick={() => onUseKey(key)}>
            {key}
          </button>
        ))}
        {keys.length === 0 ? <span className="muted">No missing entries from the current import.</span> : null}
      </div>
    </article>
  );
}

export function CatalogBrowser({
  title,
  description,
  search,
  onSearchChange,
  badgeFilter,
  onBadgeFilterChange,
  rows,
  selectedKey,
  onSelect,
}: {
  title: string;
  description: string;
  search: string;
  onSearchChange: (value: string) => void;
  badgeFilter: string;
  onBadgeFilterChange: (value: string) => void;
  rows: CatalogRow[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const filteredRows = useMemo(() => filterRows(rows, search, badgeFilter), [rows, search, badgeFilter]);
  const badgeOptions = useMemo(
    () => ["all", ...new Set(rows.flatMap((row) => row.badges).filter(Boolean))],
    [rows],
  );

  return (
    <article className="panel catalog-browser">
      <div className="section-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <span className="muted">{rows.length} total</span>
      </div>
      <div className="database-toolbar">
        <input
          className="text-input"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
        />
        <label>
          Filter
          <select value={badgeFilter} onChange={(event) => onBadgeFilterChange(event.target.value)}>
            {badgeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="catalog-list">
        {filteredRows.map((row) => (
          <button
            key={row.key}
            type="button"
            className={`catalog-item ${selectedKey === row.key ? "is-active" : ""}`}
            onClick={() => onSelect(row.key)}
          >
            <div>
              <strong>{row.label}</strong>
              <small>{row.key}</small>
              {row.subtitle ? <small>{row.subtitle}</small> : null}
            </div>
            <div className="badge-row">
              {row.badges.map((badge) => (
                <span key={`${row.key}-${badge}`} className="mini-badge">
                  {badge}
                </span>
              ))}
            </div>
          </button>
        ))}
        {filteredRows.length === 0 ? <p className="muted">No records match this search.</p> : null}
      </div>
    </article>
  );
}

export function SearchResults({
  query,
  results,
  onUseResult,
}: {
  query: string;
  results: DatabaseSearchRecord[];
  onUseResult: (record: DatabaseSearchRecord) => void;
}) {
  if (!query.trim()) {
    return null;
  }

  return (
    <article className="panel">
      <div className="section-header">
        <div>
          <h3>Global Database Search</h3>
          <p className="muted">Jump directly to records across catalog entries, profiles, and reusable shared families.</p>
        </div>
        <span className="muted">{results.length} matches</span>
      </div>
      <div className="catalog-list">
        {results.map((record) => (
          <button key={record.id} type="button" className="catalog-item" onClick={() => onUseResult(record)}>
            <div>
              <strong>{record.label}</strong>
              <small>{record.key}</small>
              {record.subtitle ? <small>{record.subtitle}</small> : null}
            </div>
            <div className="badge-row">
              <span className="mini-badge">{record.section}</span>
              {record.badges.slice(0, 3).map((badge) => (
                <span key={`${record.id}-${badge}`} className="mini-badge">
                  {badge}
                </span>
              ))}
            </div>
          </button>
        ))}
        {results.length === 0 ? <p className="muted">No records match this global search.</p> : null}
      </div>
    </article>
  );
}
