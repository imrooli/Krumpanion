import type { ReactNode } from "react";
import type { ImportedAccountState } from "../../domain/account/types";
import type { DatabaseSearchRecord, DatabaseSection, CatalogRow } from "./databaseModel";
import { CatalogBrowser, SearchResults } from "./databaseShared";

export interface DatabaseBrowserConfig {
  title: string;
  description: string;
  search: string;
  onSearchChange: (value: string) => void;
  badgeFilter: string;
  onBadgeFilterChange: (value: string) => void;
  rows: CatalogRow[];
}

interface DatabaseSectionTabsProps {
  sections: Array<{ key: DatabaseSection; label: string }>;
  activeSection: DatabaseSection;
  onSelectSection: (section: DatabaseSection) => void;
}

export function DatabaseSectionTabs({ sections, activeSection, onSelectSection }: DatabaseSectionTabsProps) {
  return (
    <nav className="database-section-tabs" aria-label="Database sections">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          className={`database-section-tab ${activeSection === section.key ? "is-active" : ""}`}
          onClick={() => onSelectSection(section.key)}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

interface DatabaseLeftRailProps {
  activeEntityOptions: Array<{ key: string; label: string }>;
  activeEntityType: string;
  onSelectEntityType: (entityType: string) => void;
  globalSearch: string;
  globalResults: DatabaseSearchRecord[];
  onUseSearchResult: (record: DatabaseSearchRecord) => void;
  entityQueue: ReactNode;
  browser: DatabaseBrowserConfig;
  selectedKey: string;
  onSelectRecord: (key: string) => void;
}

export function DatabaseLeftRail({
  activeEntityOptions,
  activeEntityType,
  onSelectEntityType,
  globalSearch,
  globalResults,
  onUseSearchResult,
  entityQueue,
  browser,
  selectedKey,
  onSelectRecord,
}: DatabaseLeftRailProps) {
  return (
    <aside className="database-left-rail">
      <article className="panel database-rail-panel">
        <div className="section-header">
          <div>
            <h3>Browse Records</h3>
            <p className="muted">Pick a database subsection, then search and switch records without leaving the editor.</p>
          </div>
        </div>
        <div className="database-entity-tabs" aria-label="Database entity types">
          {activeEntityOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`database-entity-tab ${activeEntityType === option.key ? "is-active" : ""}`}
              onClick={() => onSelectEntityType(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </article>

      {globalSearch.trim() ? <SearchResults query={globalSearch} results={globalResults} onUseResult={onUseSearchResult} /> : null}

      {entityQueue}

      <CatalogBrowser
        title={browser.title}
        description={browser.description}
        search={browser.search}
        onSearchChange={browser.onSearchChange}
        badgeFilter={browser.badgeFilter}
        onBadgeFilterChange={browser.onBadgeFilterChange}
        rows={browser.rows}
        selectedKey={selectedKey}
        onSelect={onSelectRecord}
      />
    </aside>
  );
}

interface DatabaseWorkspaceShellProps {
  account: ImportedAccountState | null;
  effectiveDatabaseRecordCount: number;
  familyCount: number;
  overrideCounts: number;
  sections: Array<{ key: DatabaseSection; label: string }>;
  activeSection: DatabaseSection;
  onSelectSection: (section: DatabaseSection) => void;
  labelDraft: string;
  onLabelDraftChange: (value: string) => void;
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  onSaveLabel: () => Promise<void>;
  onClearOverrides: () => Promise<void>;
  activeEntityOptions: Array<{ key: string; label: string }>;
  activeEntityType: string;
  onSelectEntityType: (entityType: string) => void;
  globalResults: DatabaseSearchRecord[];
  onUseSearchResult: (record: DatabaseSearchRecord) => void;
  entityQueue: ReactNode;
  browser: DatabaseBrowserConfig;
  selectedKey: string;
  onSelectRecord: (key: string) => void;
  selectedRow: CatalogRow | undefined;
  status: string;
  error: string;
  workspaceNotice?: ReactNode;
  editor: ReactNode;
  showSectionTabs?: boolean;
}

export function DatabaseWorkspaceShell({
  account,
  effectiveDatabaseRecordCount,
  familyCount,
  overrideCounts,
  sections,
  activeSection,
  onSelectSection,
  labelDraft,
  onLabelDraftChange,
  globalSearch,
  onGlobalSearchChange,
  onSaveLabel,
  onClearOverrides,
  activeEntityOptions,
  activeEntityType,
  onSelectEntityType,
  globalResults,
  onUseSearchResult,
  entityQueue,
  browser,
  selectedKey,
  onSelectRecord,
  selectedRow,
  status,
  error,
  workspaceNotice,
  editor,
  showSectionTabs = true,
}: DatabaseWorkspaceShellProps) {
  return (
    <section className="database-grid">
      <div className="panel">
        <div className="section-header">
          <div>
            <h2>Database Workspace</h2>
            <p>
              Search the full Krumpanion database, edit shared progression families once, and keep character or weapon entries profile-first instead
              of repeating the same gem, book, and weapon-mat patterns on every record.
            </p>
          </div>
        </div>
        <div className="card-grid">
          <div className="metric-card">
            <span>Imported Account</span>
            <strong>{account ? `${account.characters.length} chars / ${account.weapons.length} weapons` : "No GOOD import yet"}</strong>
          </div>
          <div className="metric-card">
            <span>Effective Database Records</span>
            <strong>{effectiveDatabaseRecordCount}</strong>
          </div>
          <div className="metric-card">
            <span>Override Entries</span>
            <strong>{overrideCounts}</strong>
          </div>
          <div className="metric-card">
            <span>Shared Families</span>
            <strong>{familyCount}</strong>
          </div>
        </div>
        <div className="database-actions">
          <label>
            Override Pack Label
            <input className="text-input" value={labelDraft} onChange={(event) => onLabelDraftChange(event.target.value)} />
          </label>
          <div className="database-toolbar">
            <input
              className="text-input"
              value={globalSearch}
              onChange={(event) => onGlobalSearchChange(event.target.value)}
              placeholder="Search any database entry, family, or profile..."
            />
            <div className="button-row">
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  void onSaveLabel();
                }}
              >
                Save Label
              </button>
              <button
                type="button"
                className="button-ghost"
                onClick={() => {
                  void onClearOverrides();
                }}
              >
                Clear Database Overrides
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSectionTabs ? (
        <DatabaseSectionTabs sections={sections} activeSection={activeSection} onSelectSection={onSelectSection} />
      ) : null}

      <div className="database-workspace">
        <DatabaseLeftRail
          activeEntityOptions={activeEntityOptions}
          activeEntityType={activeEntityType}
          onSelectEntityType={onSelectEntityType}
          globalSearch={globalSearch}
          globalResults={globalResults}
          onUseSearchResult={onUseSearchResult}
          entityQueue={entityQueue}
          browser={browser}
          selectedKey={selectedKey}
          onSelectRecord={onSelectRecord}
        />

        <section className="database-main-pane">
          {workspaceNotice}
          <article className="panel database-editor-header">
            <div className="section-header">
              <div>
                <h3>{selectedRow?.label ?? activeEntityOptions.find((option) => option.key === activeEntityType)?.label ?? "Database Editor"}</h3>
                <p className="muted">
                  {selectedRow?.subtitle ??
                    "Edit the selected record here. Shared families and profile coverage stay front-and-center while browsing remains available in the left rail."}
                </p>
              </div>
              <span className="muted">{browser.rows.length} records</span>
            </div>
            <div className="badge-row database-editor-badges">
              <span className="mini-badge">{activeSection}</span>
              <span className="mini-badge">{activeEntityOptions.find((option) => option.key === activeEntityType)?.label ?? activeEntityType}</span>
              {selectedRow?.badges.map((badge) => (
                <span key={`${selectedRow.key}-${badge}`} className="mini-badge">
                  {badge}
                </span>
              ))}
            </div>
            {status ? <p className="muted">{status}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </article>

          <div className="database-editor-pane">{editor}</div>
        </section>
      </div>
    </section>
  );
}
