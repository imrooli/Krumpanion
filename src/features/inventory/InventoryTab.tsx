import { useMemo, useState } from "react";
import {
  DataTableShell,
  EmptyStateCard,
  FilterToolbar,
  InspectorPanel,
  PageHeader,
  SectionCard,
  SplitWorkspace,
  StatusBadge,
  WarningPanel,
} from "../../app/layoutPrimitives";
import { parseBulkInventoryText } from "../../domain/inventory/bulkInventory";
import type { PlannerOutput } from "../../domain/planner/types";
import { selectActiveAccount, selectInventoryRows } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { InlineMaterialQuantityEditor } from "./InlineMaterialQuantityEditor";

interface InventoryTabProps {
  plannerOutput: PlannerOutput;
  embedded?: boolean;
}

interface InventoryViewRow {
  materialKey: string;
  displayName: string;
  category: string;
  familyKey?: string;
  owned: number;
  needed: number;
  effectiveDeficit: number;
  craftableQuantity: number;
  sourceSummary: string;
  sourceTypeSummary: string;
  sources: Array<{ sourceName: string; sourceType: string; region?: string; notes?: string }>;
  usedBy: string[];
  importedQuantity?: number;
  sourceState?: "manual" | "imported" | "missing_from_import" | "preview";
  manualEdit?: {
    editedAt: string;
    source: "manual" | "bulk";
  };
}

const PLANNER_FACING_CATEGORIES = new Set([
  "mora",
  "character_exp",
  "weapon_exp_material",
  "weapon_fodder_exp",
  "gemstone",
  "normal_boss_material",
  "weekly_boss",
  "local_specialty",
  "talent_book",
  "weapon_ascension",
  "general_enemy_drop",
  "elite_enemy_drop",
]);

const FORGING_ORE_KEYS = new Set(["CrystalChunk", "RainbowdropCrystal", "CondessenceCrystal"]);

function buildFamilyTierLabel(row: InventoryViewRow): string {
  if (row.familyKey) {
    return row.familyKey;
  }
  return "—";
}

function isPlannerFacingRow(row: InventoryViewRow): boolean {
  return (
    PLANNER_FACING_CATEGORIES.has(row.category) ||
    row.needed > 0 ||
    FORGING_ORE_KEYS.has(row.materialKey) ||
    row.sources.some((source) => source.sourceType === "forging" || source.sourceType === "world_gathering")
  );
}

export function InventoryTab({ plannerOutput, embedded = false }: InventoryTabProps) {
  const account = useAppStore(selectActiveAccount);
  const inventoryRows = useAppStore(selectInventoryRows);
  const staticData = useAppStore((state) => state.staticData);
  const setActiveMaterialQuantity = useAppStore((state) => state.setActiveMaterialQuantity);
  const bulkSetActiveMaterialQuantities = useAppStore((state) => state.bulkSetActiveMaterialQuantities);
  const resetActiveMaterialToImported = useAppStore((state) => state.resetActiveMaterialToImported);
  const clearActiveMaterialQuantity = useAppStore((state) => state.clearActiveMaterialQuantity);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [showShortagesOnly, setShowShortagesOnly] = useState(false);
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [showPlannerFacingOnly, setShowPlannerFacingOnly] = useState(true);
  const [selectedMaterialKey, setSelectedMaterialKey] = useState("");
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const mergedRows = useMemo<InventoryViewRow[]>(() => {
    const rowsByKey = new Map<string, InventoryViewRow>();

    for (const row of inventoryRows) {
      rowsByKey.set(row.materialKey, {
        materialKey: row.materialKey,
        displayName: row.displayName,
        category: row.category,
        familyKey: row.familyKey,
        owned: row.quantity,
        needed: 0,
        effectiveDeficit: 0,
        craftableQuantity: 0,
        sourceSummary: row.sources[0]?.sourceName ?? "Unknown",
        sourceTypeSummary: row.sources[0]?.sourceType ?? "unknown",
        sources: row.sources.map((source) => ({
          sourceName: source.sourceName,
          sourceType: source.sourceType,
          region: source.region,
          notes: source.notes,
        })),
        usedBy: [],
        importedQuantity: row.importedQuantity,
        sourceState: row.sourceState as InventoryViewRow["sourceState"],
        manualEdit: row.manualEdit,
      });
    }

    for (const row of plannerOutput.totalMissingByMaterial) {
      const existing = rowsByKey.get(row.materialKey);
      rowsByKey.set(row.materialKey, {
        materialKey: row.materialKey,
        displayName: row.displayName,
        category: row.category,
        familyKey: existing?.familyKey ?? staticData.materialRecords[row.materialKey]?.familyKey,
        owned: existing?.owned ?? row.owned,
        needed: row.needed,
        effectiveDeficit: row.effectiveDeficit,
        craftableQuantity: row.craftableQuantity,
        sourceSummary:
          row.sources[0]?.sourceName ?? row.sourceEnemyFamily ?? row.region ?? existing?.sourceSummary ?? "Unknown",
        sourceTypeSummary: row.sources[0]?.sourceType ?? existing?.sourceTypeSummary ?? "unknown",
        sources: row.sources.map((source) => ({
          sourceName: source.sourceName,
          sourceType: source.sourceType,
          region: source.region,
          notes: source.notes,
        })),
        usedBy: row.usedBy.map((goal) => `${goal.goalType}: ${goal.key}`),
        importedQuantity: existing?.importedQuantity,
        sourceState: existing?.sourceState,
        manualEdit: existing?.manualEdit,
      });
    }

    return [...rowsByKey.values()].sort((left, right) => {
      if (right.effectiveDeficit !== left.effectiveDeficit) {
        return right.effectiveDeficit - left.effectiveDeficit;
      }
      if (right.owned !== left.owned) {
        return right.owned - left.owned;
      }
      return left.displayName.localeCompare(right.displayName);
    });
  }, [inventoryRows, plannerOutput.totalMissingByMaterial, staticData.materialRecords]);

  const categoryOptions = useMemo(
    () => ["all", ...new Set(mergedRows.map((row) => row.category).filter(Boolean))],
    [mergedRows],
  );

  const sourceOptions = useMemo(
    () => [
      "all",
      ...new Set(
        mergedRows.flatMap((row) => row.sources.map((source) => source.sourceType)).filter((value): value is string => Boolean(value)),
      ),
    ],
    [mergedRows],
  );

  const familyOptions = useMemo(
    () => ["all", ...new Set(mergedRows.map((row) => row.familyKey).filter((value): value is string => Boolean(value)))],
    [mergedRows],
  );

  const filteredRows = useMemo(
    () =>
      mergedRows.filter((row) => {
        const matchesSearch =
          row.displayName.toLowerCase().includes(search.toLowerCase()) ||
          row.materialKey.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
        const matchesSource = sourceFilter === "all" || row.sources.some((source) => source.sourceType === sourceFilter);
        const matchesFamily = familyFilter === "all" || row.familyKey === familyFilter;
        const matchesShortage = !showShortagesOnly || row.effectiveDeficit > 0;
        const matchesOwned = !showOwnedOnly || row.owned > 0;
        const matchesPlannerFacing = !showPlannerFacingOnly || isPlannerFacingRow(row);
        return (
          matchesSearch &&
          matchesCategory &&
          matchesSource &&
          matchesFamily &&
          matchesShortage &&
          matchesOwned &&
          matchesPlannerFacing
        );
      }),
    [categoryFilter, familyFilter, mergedRows, search, showOwnedOnly, showPlannerFacingOnly, showShortagesOnly, sourceFilter],
  );

  const selectedRow = filteredRows.find((row) => row.materialKey === selectedMaterialKey) ?? filteredRows[0];
  const shortageCount = filteredRows.filter((row) => row.effectiveDeficit > 0).length;
  const manualEditCount = filteredRows.filter((row) => row.manualEdit).length;
  const bulkPreview = useMemo(() => parseBulkInventoryText(bulkText, staticData), [bulkText, staticData]);

  async function applyBulkUpdates() {
    if (!bulkPreview.validUpdates.length) {
      return;
    }

    await bulkSetActiveMaterialQuantities(
      Object.fromEntries(bulkPreview.validUpdates.map((update) => [update.materialKey, update.quantity])),
      { source: "bulk" },
    );
    setSelectedMaterialKey(bulkPreview.validUpdates[0]?.materialKey ?? "");
    setShowBulkEditor(false);
    setBulkText("");
  }

  if (!mergedRows.length) {
    return (
      <section className="workspace-page">
        {!embedded ? (
          <PageHeader
            eyebrow="Inventory"
            title="Owned resources and shortage context"
            description="Inventory stays separate from static database editing and becomes richer once a GOOD snapshot is loaded."
          />
        ) : null}
        <EmptyStateCard
          title="No inventory snapshot yet"
          description="Import a GOOD file to see owned materials, planner demand, effective deficits, and direct editable quantities in one place."
        />
      </section>
    );
  }

  return (
    <section className="workspace-page">
      {!embedded ? (
        <PageHeader
          eyebrow="Inventory"
          title="Owned resources with live planning context"
          description="Edit material quantities directly, paste bulk inventory updates, and review how each change affects the active account plan."
        />
      ) : null}

      <SplitWorkspace
        left={
          <article className="panel">
            <div className="section-header">
              <div>
                <h2>Filters</h2>
                <p className="muted">Search, narrow, and inspect planner-facing materials without digging through one giant list.</p>
              </div>
            </div>
            <FilterToolbar>
              <label>
                Search
                <input
                  className="text-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search materials"
                />
              </label>
              <label>
                Category
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All categories" : option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Source
                <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                  {sourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All sources" : option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Family
                <select value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value)}>
                  {familyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All families" : option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={showPlannerFacingOnly}
                  onChange={(event) => setShowPlannerFacingOnly(event.target.checked)}
                />
                Show planner-facing materials
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={showShortagesOnly}
                  onChange={(event) => setShowShortagesOnly(event.target.checked)}
                />
                Show shortages only
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={showOwnedOnly} onChange={(event) => setShowOwnedOnly(event.target.checked)} />
                Show nonzero only
              </label>
            </FilterToolbar>
            <div className="workspace-card-grid inventory-metric-strip">
              <article className="metric-card">
                <span>Visible rows</span>
                <strong>{filteredRows.length}</strong>
              </article>
              <article className="metric-card">
                <span>Shortages</span>
                <strong>{shortageCount}</strong>
              </article>
              <article className="metric-card">
                <span>Manual edits</span>
                <strong>{manualEditCount}</strong>
              </article>
            </div>
          </article>
        }
        center={
          <div className="stack">
            <SectionCard
              title="Inventory editing policy"
              description="Manual quantity edits update the active account directly. Re-importing GOOD into this account replaces imported inventory and may overwrite manual quantity edits."
              actions={
                <div className="button-row wrap">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setShowBulkEditor((current) => !current)}
                    aria-expanded={showBulkEditor}
                    aria-controls="bulk-inventory-editor"
                  >
                    {showBulkEditor ? "Hide Bulk Edit Inventory" : "Bulk Edit Inventory"}
                  </button>
                </div>
              }
            >
              <div className="badge-row">
                <StatusBadge tone="accent">{account?.name ?? "No account"}</StatusBadge>
                <StatusBadge tone="warning">GOOD import replaces imported and active quantities</StatusBadge>
              </div>
            </SectionCard>

            {showBulkEditor ? (
              <SectionCard
                title="Bulk edit inventory"
                description="Paste 'material name, quantity', 'material key, quantity', or tab-separated rows. Duplicate rows merge by summing their quantities before apply."
              >
                <div id="bulk-inventory-editor" className="stack">
                  <label>
                    Bulk inventory paste
                    <textarea
                      className="code-input"
                      rows={10}
                      value={bulkText}
                      onChange={(event) => setBulkText(event.target.value)}
                      placeholder={"Mora, 1200000\nHero's Wit\t24\nMysticEnhancementOre, 60"}
                      aria-describedby="bulk-inventory-help"
                    />
                  </label>
                  <p id="bulk-inventory-help" className="muted">
                    Supported formats: material name or material key, followed by a comma or tab, then a non-negative integer quantity.
                  </p>
                  <div className="badge-row">
                    <StatusBadge tone={bulkPreview.validUpdates.length ? "success" : "muted"}>
                      {bulkPreview.validUpdates.length} valid update(s)
                    </StatusBadge>
                    <StatusBadge tone={bulkPreview.duplicateRows.length ? "warning" : "muted"}>
                      {bulkPreview.duplicateRows.length} merged duplicate group(s)
                    </StatusBadge>
                    <StatusBadge tone={bulkPreview.unmatchedRows.length ? "warning" : "muted"}>
                      {bulkPreview.unmatchedRows.length} unmatched row(s)
                    </StatusBadge>
                    <StatusBadge tone={bulkPreview.invalidRows.length ? "warning" : "muted"}>
                      {bulkPreview.invalidRows.length} invalid row(s)
                    </StatusBadge>
                  </div>

                  {bulkPreview.validUpdates.length ? (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Matched input</th>
                            <th>Resolved material</th>
                            <th>Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPreview.validUpdates.map((update) => (
                            <tr key={`${update.materialKey}-${update.inputName}`}>
                              <td>{update.inputName}</td>
                              <td>
                                <strong>{update.displayName}</strong>
                                <div className="muted">{update.materialKey}</div>
                              </td>
                              <td>{update.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {bulkPreview.duplicateRows.length ? (
                    <WarningPanel title="Merged duplicate rows" tone="warning">
                      <ul className="warning-list">
                        {bulkPreview.duplicateRows.map((duplicate) => (
                          <li key={duplicate.materialKey}>
                            {duplicate.displayName} ({duplicate.materialKey}) merged rows {duplicate.rowNumbers.join(", ")} into quantity{" "}
                            {duplicate.resolvedQuantity}.
                          </li>
                        ))}
                      </ul>
                    </WarningPanel>
                  ) : null}

                  {bulkPreview.unmatchedRows.length ? (
                    <WarningPanel title="Unmatched rows" tone="warning">
                      <ul className="warning-list">
                        {bulkPreview.unmatchedRows.map((row) => (
                          <li key={`unmatched-${row.rowNumber}`}>
                            Row {row.rowNumber}: {row.inputName} ({row.rawQuantity ?? "no quantity"}) - {row.reason}
                          </li>
                        ))}
                      </ul>
                    </WarningPanel>
                  ) : null}

                  {bulkPreview.invalidRows.length ? (
                    <WarningPanel title="Invalid rows" tone="warning">
                      <ul className="warning-list">
                        {bulkPreview.invalidRows.map((row) => (
                          <li key={`invalid-${row.rowNumber}`}>
                            Row {row.rowNumber}: {row.raw} - {row.reason}
                          </li>
                        ))}
                      </ul>
                    </WarningPanel>
                  ) : null}

                  <div className="button-row wrap">
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => void applyBulkUpdates()}
                      disabled={!bulkPreview.validUpdates.length}
                    >
                      Apply {bulkPreview.validUpdates.length} update(s)
                    </button>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => {
                        setBulkText("");
                        setShowBulkEditor(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </SectionCard>
            ) : null}

            <DataTableShell
              title="Inventory Table"
              description="Owned counts update the active account immediately. Planner shortages recalculate from the same inventory map."
              toolbar={
                <div className="badge-row">
                  <StatusBadge tone="accent">{filteredRows.length} visible</StatusBadge>
                  <StatusBadge tone={showPlannerFacingOnly ? "success" : "muted"}>
                    {showPlannerFacingOnly ? "Planner-facing filter on" : "All materials"}
                  </StatusBadge>
                </div>
              }
            >
              <table className="data-table inventory-edit-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Category</th>
                    <th>Family / tier</th>
                    <th>Quantity</th>
                    <th>Needed</th>
                    <th>Deficit</th>
                    <th>Source summary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.materialKey}
                      className={selectedRow?.materialKey === row.materialKey ? "data-row-selected" : ""}
                      onClick={() => setSelectedMaterialKey(row.materialKey)}
                    >
                      <td>
                        <strong>{row.displayName}</strong>
                        <div className="muted">{row.materialKey}</div>
                        <div className="badge-row">
                          {row.manualEdit ? (
                            <StatusBadge tone={row.manualEdit.source === "bulk" ? "accent" : "warning"}>
                              {row.manualEdit.source === "bulk" ? "Bulk edited" : "Manually edited"}
                            </StatusBadge>
                          ) : null}
                          {!row.manualEdit && row.sourceState === "imported" ? <StatusBadge tone="success">Imported</StatusBadge> : null}
                          {row.sourceState === "missing_from_import" ? <StatusBadge tone="muted">Missing from import</StatusBadge> : null}
                        </div>
                      </td>
                      <td>{row.category}</td>
                      <td>{buildFamilyTierLabel(row)}</td>
                      <td>
                        <InlineMaterialQuantityEditor
                          materialKey={row.materialKey}
                          materialName={row.displayName}
                          quantity={row.owned}
                          importedQuantity={row.importedQuantity}
                          onCommit={(quantity) => void setActiveMaterialQuantity(row.materialKey, quantity)}
                          onResetToImported={
                            typeof row.importedQuantity === "number" ? () => void resetActiveMaterialToImported(row.materialKey) : undefined
                          }
                        />
                      </td>
                      <td>{row.needed}</td>
                      <td>
                        <div className="badge-row">
                          <StatusBadge tone={row.effectiveDeficit > 0 ? "warning" : "success"}>{row.effectiveDeficit}</StatusBadge>
                          {row.craftableQuantity > 0 ? <StatusBadge tone="accent">{row.craftableQuantity} craftable</StatusBadge> : null}
                        </div>
                      </td>
                      <td>{row.sourceSummary}</td>
                      <td>
                        <button
                          type="button"
                          className="button-ghost button-destructive"
                          aria-label={`${row.manualEdit ? "Clear" : "Remove"} quantity for ${row.displayName}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void clearActiveMaterialQuantity(row.materialKey);
                          }}
                        >
                          Clear
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredRows.length ? (
                    <tr>
                      <td colSpan={8}>No inventory rows match the current filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </DataTableShell>
          </div>
        }
        right={
          selectedRow ? (
            <InspectorPanel title="Material Inspector">
              <div>
                <strong>{selectedRow.displayName}</strong>
                <div className="muted">{selectedRow.materialKey}</div>
              </div>
              <div className="workspace-card-grid inventory-inspector-grid">
                <article className="metric-card">
                  <span>Owned</span>
                  <strong>{selectedRow.owned}</strong>
                </article>
                <article className="metric-card">
                  <span>Needed</span>
                  <strong>{selectedRow.needed}</strong>
                </article>
                <article className="metric-card">
                  <span>Deficit</span>
                  <strong>{selectedRow.effectiveDeficit}</strong>
                </article>
              </div>
              <div>
                <strong>Inventory source</strong>
                <div className="muted">
                  {selectedRow.manualEdit
                    ? "Manual override is active."
                    : selectedRow.sourceState === "imported"
                      ? `Imported baseline${typeof selectedRow.importedQuantity === "number" ? `: ${selectedRow.importedQuantity}` : ""}.`
                      : "No imported baseline for this material."}
                </div>
              </div>
              <div>
                <strong>Manual edit status</strong>
                <div className="muted">
                  {selectedRow.manualEdit
                    ? `${selectedRow.manualEdit.source === "bulk" ? "Bulk edit" : "Manual edit"} at ${new Date(selectedRow.manualEdit.editedAt).toLocaleString()}`
                    : "No manual edit metadata for this material."}
                </div>
              </div>
              <div>
                <strong>Used by goals</strong>
                <ul className="warning-list">
                  {selectedRow.usedBy.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                  {!selectedRow.usedBy.length ? <li>No active goals currently require this material.</li> : null}
                </ul>
              </div>
              <div>
                <strong>Source locations</strong>
                <ul className="warning-list">
                  {selectedRow.sources.map((source) => (
                    <li key={`${selectedRow.materialKey}-${source.sourceName}-${source.sourceType}`}>
                      <div>
                        <strong>{source.sourceName}</strong>
                        <div className="muted">
                          {source.sourceType}
                          {source.region ? ` - ${source.region}` : ""}
                        </div>
                      </div>
                      <span>{source.notes ?? ""}</span>
                    </li>
                  ))}
                  {!selectedRow.sources.length ? <li>No source metadata recorded yet.</li> : null}
                </ul>
              </div>
            </InspectorPanel>
          ) : undefined
        }
      />
    </section>
  );
}
