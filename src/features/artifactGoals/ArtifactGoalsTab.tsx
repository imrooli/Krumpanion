import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { EmptyStateCard, FilterToolbar, MetricStrip, SectionCard, SplitWorkspace, StatusBadge, WorkspaceTabs } from "../../app/layoutPrimitives";
import type {
  ArtifactCircletMainStat,
  ArtifactDesiredSubstat,
  ArtifactGoal,
  ArtifactGoalProgress,
  ArtifactGobletMainStat,
  ArtifactSandsMainStat,
} from "../../domain/goals/types";
import type { PlannerOutput } from "../../domain/planner/types";
import { selectActiveAccount, selectActiveGoals } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import {
  ARTIFACT_CIRCLET_OPTIONS,
  ARTIFACT_GOBLET_OPTIONS,
  ARTIFACT_SANDS_OPTIONS,
  ARTIFACT_SUBSTAT_OPTIONS,
  ARTIFACT_VIEW_OPTIONS,
  buildArtifactCharacterOptions,
  buildArtifactGoalsViewModel,
  buildArtifactSetOptions,
  type ArtifactDomainGroupViewModel,
  type ArtifactDomainKeepGuideRowViewModel,
  type ArtifactGoalViewModel,
  type ArtifactViewKey,
} from "./artifactGoalsModel";

interface ArtifactGoalsTabProps {
  plannerOutput: PlannerOutput;
}

type ArtifactProgressKey = keyof ArtifactGoalProgress;

const ARTIFACT_PROGRESS_FIELDS: Array<{ key: ArtifactProgressKey; label: string }> = [
  { key: "flowerObtained", label: "Flower" },
  { key: "plumeObtained", label: "Plume" },
  { key: "sandsObtained", label: "Sands" },
  { key: "gobletObtained", label: "Goblet" },
  { key: "circletObtained", label: "Circlet" },
];

function resolveReplacementSelection(params: {
  selectedGoalId: string;
  visibleGoalIds: string[];
  allGoalIds: string[];
}): string | null {
  const visibleWithoutSelected = params.visibleGoalIds.filter((goalId) => goalId !== params.selectedGoalId);
  const allWithoutSelected = params.allGoalIds.filter((goalId) => goalId !== params.selectedGoalId);
  const visibleIndex = params.visibleGoalIds.indexOf(params.selectedGoalId);
  if (visibleIndex >= 0) {
    return params.visibleGoalIds[visibleIndex + 1] ?? params.visibleGoalIds[visibleIndex - 1] ?? allWithoutSelected[0] ?? null;
  }
  return visibleWithoutSelected[0] ?? allWithoutSelected[0] ?? null;
}

export function ArtifactGoalsTab(_props: ArtifactGoalsTabProps) {
  void _props;
  const account = useAppStore(selectActiveAccount);
  const goals = useAppStore((state) => selectActiveGoals(state).artifactGoals);
  const staticData = useAppStore((state) => state.staticData);
  const addArtifactGoal = useAppStore((state) => state.addArtifactGoal);
  const updateArtifactGoal = useAppStore((state) => state.updateArtifactGoal);
  const removeArtifactGoal = useAppStore((state) => state.removeArtifactGoal);
  const [activeView, setActiveView] = useState<ArtifactViewKey>("domain");
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const characterOptions = useMemo(() => buildArtifactCharacterOptions(account, staticData), [account, staticData]);
  const setOptions = useMemo(() => buildArtifactSetOptions(staticData), [staticData]);
  const viewModel = useMemo(
    () =>
      buildArtifactGoalsViewModel({
        account,
        staticData,
        goals,
        showCompleted,
      }),
    [account, staticData, goals, showCompleted],
  );
  const visibleGoalIds = viewModel.visibleGoalIdsByView[activeView];
  const allGoalIds = viewModel.goalRows.map((goal) => goal.id);
  const effectiveSelectedGoalId = selectedGoalId && allGoalIds.includes(selectedGoalId)
    ? selectedGoalId
    : visibleGoalIds[0] ?? allGoalIds[0] ?? null;

  useEffect(() => {
    if (goals.length <= 0) {
      if (selectedGoalId !== null) {
        setSelectedGoalId(null);
      }
      return;
    }
    if (selectedGoalId && goals.some((goal) => goal.id === selectedGoalId)) {
      return;
    }
    if (selectedGoalId !== effectiveSelectedGoalId) {
      setSelectedGoalId(effectiveSelectedGoalId);
    }
  }, [effectiveSelectedGoalId, goals, selectedGoalId]);

  const selectedGoal = goals.find((goal) => goal.id === effectiveSelectedGoalId) ?? null;
  const selectedGoalView = effectiveSelectedGoalId ? viewModel.goalRowsById[effectiveSelectedGoalId] ?? null : null;
  const selectedGoalSummary = effectiveSelectedGoalId ? viewModel.selectedGoalSummariesById[effectiveSelectedGoalId] ?? null : null;

  async function createArtifactGoal(prefilledCharacterKey?: string) {
    const id = await addArtifactGoal({
      characterKey: prefilledCharacterKey ?? characterOptions[0]?.key,
    });
    setSelectedGoalId(id);
  }

  function updateGoalProgress(goalId: string, pieceKey: ArtifactProgressKey, value: boolean) {
    const currentGoal = goals.find((entry) => entry.id === goalId);
    if (!currentGoal) {
      return;
    }

    setSelectedGoalId(goalId);
    void updateArtifactGoal(goalId, {
      progress: {
        ...currentGoal.progress,
        [pieceKey]: value,
      },
    });
  }

  function deleteGoal(goalId: string) {
    const nextSelectedGoalId = resolveReplacementSelection({
      selectedGoalId: goalId,
      visibleGoalIds,
      allGoalIds,
    });
    setSelectedGoalId(nextSelectedGoalId);
    void removeArtifactGoal(goalId);
  }

  if (!account) {
    return (
      <section className="panel">
        <EmptyStateCard
          title="No active account"
          description="Artifact farming goals are account-scoped. Load or create an account first, then come back here to map characters to the right domains and target stats."
        />
      </section>
    );
  }

  if (characterOptions.length === 0 && goals.length === 0) {
    return (
      <section className="panel">
        <EmptyStateCard
          title="No owned characters yet"
          description="Artifact goals start from owned characters on the active account. Import a GOOD snapshot first, then add artifact farming goals here."
        />
      </section>
    );
  }

  return (
    <section className="stack artifact-goals-page">
      <div className="section-header">
        <div>
          <h2>Artifact Goals</h2>
          <p className="compact-helper-text">Practical domain guidance only. Artifact farming is chance-based and not included in deterministic resin totals.</p>
        </div>
        <div className="button-row wrap">
          <button type="button" className="button-primary" onClick={() => void createArtifactGoal()}>
            Add Artifact Goal
          </button>
        </div>
      </div>

      <MetricStrip
        compact
        items={[
          { label: "Artifact goals", value: String(viewModel.summary.totalGoals), tone: "accent" },
          { label: "Incomplete", value: String(viewModel.summary.incompleteGoals), tone: viewModel.summary.incompleteGoals ? "warning" : "default" },
          { label: "Domains needed", value: String(viewModel.summary.domainsNeeded) },
          { label: "Completed", value: String(viewModel.summary.completedGoals), tone: viewModel.summary.completedGoals ? "success" : "default" },
        ]}
      />

      {viewModel.goalRows.length === 0 ? (
        <EmptyStateCard
          title="No artifact goals yet"
          description="Add an artifact goal to track which domains to farm, what main stats to chase, and which pieces are already done."
          action={
            <div className="button-row wrap">
              <button type="button" className="button-primary" onClick={() => void createArtifactGoal()}>
                Add Artifact Goal
              </button>
            </div>
          }
        />
      ) : (
        <div className="artifact-goals-workspace">
          <SplitWorkspace
            left={
              <SectionCard
                compact
                title="Domain Farming Guide"
                description="Browse current artifact farming needs by domain, then select a goal to edit it on the right."
              >
                <FilterToolbar
                  compact
                  actions={
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={showCompleted}
                        onChange={(event) => setShowCompleted(event.target.checked)}
                      />
                      Show completed
                    </label>
                  }
                >
                  <WorkspaceTabs
                    compact
                    label="Artifact views"
                    activeTab={activeView}
                    onChange={setActiveView}
                    tabs={ARTIFACT_VIEW_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
                  />
                </FilterToolbar>

                <div className="artifact-browser stack">
                  {activeView === "domain"
                    ? viewModel.domainGroups.map((group) => (
                        <ArtifactDomainGroup
                          key={group.key}
                          group={group}
                          selectedGoalId={effectiveSelectedGoalId}
                          onSelectGoal={setSelectedGoalId}
                        />
                      ))
                    : null}

                  {activeView === "character"
                    ? viewModel.characterGroups.map((group) => (
                        <section key={group.characterKey ?? group.characterLabel} className="artifact-browser-group">
                          <div className="artifact-browser-group-header">
                            <div>
                              <strong>{group.characterLabel}</strong>
                              <div className="table-toolbar-summary">
                                {group.goalCount} goals | {group.incompleteGoalCount} incomplete
                              </div>
                            </div>
                            <button
                              type="button"
                              className="button-ghost"
                              onClick={() => void createArtifactGoal(group.characterKey)}
                            >
                              Add goal
                            </button>
                          </div>
                          <div className="artifact-goal-list">
                            {group.goals.map((goal) => (
                              <ArtifactGoalRow
                                key={goal.id}
                                goal={goal}
                                selected={goal.id === effectiveSelectedGoalId}
                                onSelect={() => setSelectedGoalId(goal.id)}
                                onDelete={() => deleteGoal(goal.id)}
                                onTogglePiece={(pieceKey, value) => updateGoalProgress(goal.id, pieceKey, value)}
                              />
                            ))}
                          </div>
                        </section>
                      ))
                    : null}

                  {visibleGoalIds.length <= 0 ? (
                    <EmptyStateCard
                      title="No goals match this filter"
                      description="Your current browser filter is empty, but the selected goal can stay open in the editor until you switch selection."
                    />
                  ) : null}
                </div>
              </SectionCard>
            }
            center={
              selectedGoal && selectedGoalView && selectedGoalSummary ? (
                <div className="stack">
                  <article className="panel artifact-selected-summary">
                    <div className="artifact-selected-summary-header">
                      <div>
                        <div className="artifact-selected-kicker">Editing artifact goal</div>
                        <h3>{selectedGoalSummary.characterLabel}</h3>
                        <p className="compact-helper-text">{selectedGoalSummary.goalName}</p>
                      </div>
                      <StatusBadge compact tone={selectedGoalView.status === "complete" ? "success" : selectedGoalView.status === "in_progress" ? "accent" : "warning"}>
                        {selectedGoalView.statusLabel}
                      </StatusBadge>
                    </div>
                    <div className="artifact-selected-summary-grid">
                      <div>
                        <span className="table-toolbar-summary">Sets</span>
                        <strong>{selectedGoalSummary.setSummary}</strong>
                      </div>
                      <div>
                        <span className="table-toolbar-summary">Progress</span>
                        <strong>{selectedGoalSummary.progressLabel}</strong>
                      </div>
                      <div>
                        <span className="table-toolbar-summary">Domains</span>
                        <strong>{selectedGoalSummary.domainSummary}</strong>
                      </div>
                    </div>
                    <div className="artifact-selected-summary-footer">
                      <span className="table-toolbar-summary">Changes save automatically.</span>
                      {selectedGoalSummary.warningSummary ? <span className="table-toolbar-summary">Review: {selectedGoalSummary.warningSummary}</span> : null}
                    </div>
                  </article>

                  <ArtifactGoalEditor
                    goal={selectedGoal}
                    characterOptions={characterOptions}
                    setOptions={setOptions}
                    onChange={(updates) => void updateArtifactGoal(selectedGoal.id, updates)}
                    onDelete={() => deleteGoal(selectedGoal.id)}
                  />
                </div>
              ) : (
                <EmptyStateCard
                  title="Select an artifact goal"
                  description="Pick a goal from the browser to edit sets, affixes, substats, and slot progress."
                />
              )
            }
          />
        </div>
      )}
    </section>
  );
}

function handleRowKeyboardSelect(event: KeyboardEvent<HTMLElement>, onSelect: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect();
  }
}

function ArtifactDomainGroup({
  group,
  selectedGoalId,
  onSelectGoal,
}: {
  group: ArtifactDomainGroupViewModel;
  selectedGoalId: string | null;
  onSelectGoal: (goalId: string) => void;
}) {
  return (
    <section className="artifact-browser-group artifact-domain-card">
      <div className="artifact-browser-group-header">
        <div>
          <strong>{group.label}</strong>
          <div className="table-toolbar-summary">
            {group.hasStandardDomainSource
              ? [group.location, group.region].filter(Boolean).join(" · ")
              : "No standard Domain of Blessing source"}
          </div>
          <div className="table-toolbar-summary">Drops: {group.setLabels.join(", ") || "No standard domain sets"}</div>
          {group.characterLabels.length > 0 ? (
            <div className="table-toolbar-summary">Useful for: {group.characterLabels.join(", ")}</div>
          ) : null}
        </div>
        <div className="artifact-domain-summary">
          <StatusBadge compact tone={group.usefulness.bothDomainSetsUseful ? "accent" : "default"}>
            {group.usefulness.bothDomainSetsUseful ? "High value" : "Useful"}
          </StatusBadge>
          <span className="table-toolbar-summary">{group.usefulness.summaryLabel}</span>
        </div>
      </div>

      <div className="artifact-domain-set-stack">
        {group.setGroups.map((setGroup) => (
          <article key={`${group.key}-${setGroup.setKey}`} className="artifact-domain-set-group">
            <div className="artifact-domain-set-header">
              <strong>{setGroup.setLabel}</strong>
              <span className="table-toolbar-summary">{setGroup.rows.length} slot targets</span>
            </div>
            <div className="table-wrapper is-compact artifact-domain-table-wrapper">
              <table className="data-table is-compact artifact-domain-table">
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>Set</th>
                    <th>Main Stat</th>
                    <th>Useful For</th>
                    <th>Desired Substats</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {setGroup.rows.map((row) => (
                    <ArtifactKeepGuideRow
                      key={row.key}
                      row={row}
                      selected={row.goalIds.includes(selectedGoalId ?? "")}
                      onSelect={() => onSelectGoal(row.representativeGoalId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ArtifactKeepGuideRow({
  row,
  selected,
  onSelect,
}: {
  row: ArtifactDomainKeepGuideRowViewModel;
  selected: boolean;
  onSelect: () => void;
}) {
  const rowClassName = `artifact-domain-row ${selected ? "data-row-selected" : ""} ${row.status === "complete" ? "is-complete" : ""}`.trim();

  return (
    <tr
      className={rowClassName}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => handleRowKeyboardSelect(event, onSelect)}
      aria-label={`Edit ${row.setLabel} ${row.slotLabel} target`}
    >
      <td>{row.slotLabel}</td>
      <td>{row.setLabel}</td>
      <td>{row.mainStatLabel}</td>
      <td>
        <div className="artifact-domain-cell-stack">
          <span>{row.usefulForCharacters.join(", ") || "No active characters"}</span>
          {row.completedCharacters.length > 0 ? (
            <span className="table-toolbar-summary">Completed for: {row.completedCharacters.join(", ")}</span>
          ) : null}
        </div>
      </td>
      <td>{row.desiredSubstatsSummary}</td>
      <td>
        <StatusBadge compact tone={row.status === "complete" ? "success" : row.status === "partial" ? "accent" : "warning"}>
          {row.statusLabel}
        </StatusBadge>
      </td>
    </tr>
  );
}

function toggleChoice<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function ArtifactChoicePicker<T extends string>({
  label,
  options,
  values,
  emptyLabel,
  onChange,
}: {
  label: string;
  options: T[];
  values: T[];
  emptyLabel: string;
  onChange: (values: T[]) => void;
}) {
  return (
    <div className="artifact-choice-picker">
      <div className="artifact-choice-label">{label}</div>
      <div className="artifact-choice-selected" aria-label={`${label} selected`}>
        {values.length > 0
          ? values.map((value) => (
              <button
                key={value}
                type="button"
                className="artifact-chip artifact-chip-selected"
                onClick={() => onChange(values.filter((entry) => entry !== value))}
                aria-label={`Remove ${value}`}
              >
                {value}
              </button>
            ))
          : <span className="muted">{emptyLabel}</span>}
      </div>
      <div className="artifact-choice-grid" role="group" aria-label={label}>
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={selected ? "artifact-chip artifact-chip-selected" : "artifact-chip"}
              aria-pressed={selected}
              onClick={() => onChange(toggleChoice(values, option))}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ArtifactGoalEditor({
  goal,
  characterOptions,
  setOptions,
  onChange,
  onDelete,
}: {
  goal: ArtifactGoal;
  characterOptions: Array<{ key: string; label: string }>;
  setOptions: Array<{ key: string; label: string }>;
  onChange: (updates: Partial<ArtifactGoal>) => void;
  onDelete: () => void;
}) {
  return (
    <SectionCard
      compact
      title="Artifact Goal Editor"
      description="Pick the relevant sets, acceptable slot affixes, and the pieces you already have."
      actions={
        <div className="button-row wrap">
          <button type="button" className="button-ghost" onClick={onDelete}>
            Delete
          </button>
        </div>
      }
    >
      <div className="artifact-editor-grid">
        <label>
          Character
          <select
            value={goal.characterKey ?? ""}
            onChange={(event) => onChange({ characterKey: event.target.value || undefined })}
          >
            <option value="">Select character</option>
            {characterOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Goal name
          <input
            className="text-input"
            placeholder="Optional label"
            value={goal.goalName ?? ""}
            onChange={(event) => onChange({ goalName: event.target.value || undefined })}
          />
        </label>
      </div>

      <ArtifactChoicePicker
        label="Artifact sets"
        options={setOptions.map((option) => option.label)}
        values={goal.targetSetKeys.map((setKey) => setOptions.find((option) => option.key === setKey)?.label ?? setKey)}
        emptyLabel="No sets selected yet"
        onChange={(labels) =>
          onChange({
            targetSetKeys: labels
              .map((label) => setOptions.find((option) => option.label === label)?.key)
              .filter((value): value is string => Boolean(value)),
          })
        }
      />

      <div className="artifact-picker-grid">
        <ArtifactChoicePicker<ArtifactSandsMainStat>
          label="Sands"
          options={ARTIFACT_SANDS_OPTIONS}
          values={goal.mainStatTargets.sands}
          emptyLabel="Any Sands main stat"
          onChange={(values) =>
            onChange({
              mainStatTargets: {
                ...goal.mainStatTargets,
                sands: values,
              },
            })
          }
        />
        <ArtifactChoicePicker<ArtifactGobletMainStat>
          label="Goblet"
          options={ARTIFACT_GOBLET_OPTIONS}
          values={goal.mainStatTargets.goblet}
          emptyLabel="Any Goblet main stat"
          onChange={(values) =>
            onChange({
              mainStatTargets: {
                ...goal.mainStatTargets,
                goblet: values,
              },
            })
          }
        />
        <ArtifactChoicePicker<ArtifactCircletMainStat>
          label="Circlet"
          options={ARTIFACT_CIRCLET_OPTIONS}
          values={goal.mainStatTargets.circlet}
          emptyLabel="Any Circlet main stat"
          onChange={(values) =>
            onChange({
              mainStatTargets: {
                ...goal.mainStatTargets,
                circlet: values,
              },
            })
          }
        />
      </div>

      <ArtifactChoicePicker<ArtifactDesiredSubstat>
        label="Desired substats"
        options={ARTIFACT_SUBSTAT_OPTIONS}
        values={goal.desiredSubstats}
        emptyLabel="No substats selected yet"
        onChange={(desiredSubstats) => onChange({ desiredSubstats })}
      />

      <div className="artifact-progress-section">
        <div className="artifact-choice-label">Obtained slots</div>
        <div className="button-row wrap artifact-progress-controls">
          {ARTIFACT_PROGRESS_FIELDS.map((field) => (
            <label key={field.key} className="checkbox-row">
              <input
                type="checkbox"
                checked={goal.progress[field.key]}
                onChange={(event) => onChange({ progress: { ...goal.progress, [field.key]: event.target.checked } })}
              />
              {field.label} obtained
            </label>
          ))}
        </div>
      </div>

      <label className="artifact-goal-notes">
        Notes
        <textarea
          className="code-input compact"
          rows={3}
          value={goal.notes ?? ""}
          placeholder="Optional farming notes"
          onChange={(event) => onChange({ notes: event.target.value || undefined })}
        />
      </label>
    </SectionCard>
  );
}

function ArtifactGoalRow({
  goal,
  selected,
  onSelect,
  onDelete,
  onTogglePiece,
}: {
  goal: ArtifactGoalViewModel;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePiece: (pieceKey: ArtifactProgressKey, value: boolean) => void;
}) {
  return (
    <article className={`artifact-summary-card ${selected ? "is-selected" : ""}`.trim()}>
      <button type="button" className="artifact-summary-select" onClick={onSelect} aria-pressed={selected}>
        <div className="artifact-goal-topline">
          <div>
            <strong>{goal.characterLabel}</strong>
            <div className="muted">{goal.goalName}</div>
          </div>
          <div className="badge-row">
            <StatusBadge compact tone={goal.status === "complete" ? "success" : goal.status === "in_progress" ? "accent" : "warning"}>
              {goal.statusLabel}
            </StatusBadge>
          </div>
        </div>

        <div className="artifact-summary-details">
          <div><span className="muted">Sets:</span> {goal.setSummary}</div>
          <div>{goal.mainStatSummary}</div>
          <div className="muted">Look for: {goal.desiredSubstatsSummary}</div>
          <div className="muted">Domains: {goal.domainSummary}</div>
          {goal.warnings.length > 0 ? <div className="muted">Review: {goal.warnings.join(" | ")}</div> : null}
        </div>

        <div className="artifact-goal-meta">
          <span className="table-toolbar-summary">{goal.progressLabel}</span>
        </div>
      </button>

      <div className="artifact-piece-toggle-row">
        {ARTIFACT_PROGRESS_FIELDS.map((field) => (
          <label key={`${goal.id}-${field.key}`} className="checkbox-row">
            <input
              aria-label={field.label}
              type="checkbox"
              checked={goal.pieceProgress[field.key]}
              onChange={(event) => onTogglePiece(field.key, event.target.checked)}
            />
            {field.label}
          </label>
        ))}
        <div className="button-row wrap">
          <button type="button" className="button-ghost" onClick={onSelect}>
            {selected ? "Editing" : "Edit"}
          </button>
          <button type="button" className="button-ghost" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
