import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { EmptyStateCard, MetricStrip, SectionCard, SplitWorkspace, StatusBadge, WorkspaceTabs } from "../../app/layoutPrimitives";
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
  ARTIFACT_PAGE_OPTIONS,
  ARTIFACT_SANDS_OPTIONS,
  ARTIFACT_SUBSTAT_OPTIONS,
  buildArtifactCharacterOptions,
  buildArtifactGoalsViewModel,
  buildArtifactSetOptions,
  type ArtifactCharacterGroupViewModel,
  type ArtifactDomainGroupViewModel,
  type ArtifactDomainKeepGuideRowViewModel,
  type ArtifactGoalViewModel,
  type ArtifactPageKey,
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

function cleanArtifactText(value: string): string {
  return value.replace(/Â·/g, "·");
}

function buildDomainUsefulnessLabel(group: ArtifactDomainGroupViewModel): string {
  return `${group.usefulness.usefulSetCount} useful sets · ${group.usefulness.incompleteGoalCount} goals · ${group.usefulness.missingSlotTargetCount} missing slots`;
}

export function ArtifactGoalsTab(props: ArtifactGoalsTabProps) {
  void props;
  const account = useAppStore(selectActiveAccount);
  const goals = useAppStore((state) => selectActiveGoals(state).artifactGoals);
  const staticData = useAppStore((state) => state.staticData);
  const addArtifactGoal = useAppStore((state) => state.addArtifactGoal);
  const updateArtifactGoal = useAppStore((state) => state.updateArtifactGoal);
  const removeArtifactGoal = useAppStore((state) => state.removeArtifactGoal);
  const [activePage, setActivePage] = useState<ArtifactPageKey>("domainGuide");
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
  const visibleGoalIdsByPage: Record<ArtifactPageKey, string[]> = {
    domainGuide: viewModel.domainGuide.visibleGoalIds,
    characterGoals: viewModel.characterGoals.visibleGoalIds,
    setGoals: viewModel.goalEditor.visibleGoalIds,
  };
  const visibleGoalIds = visibleGoalIdsByPage[activePage];
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
    setActivePage("setGoals");
  }

  function openGoalInEditor(goalId: string) {
    setSelectedGoalId(goalId);
    setActivePage("setGoals");
  }

  function deleteGoal(goalId: string) {
    const nextSelectedGoalId = resolveReplacementSelection({
      selectedGoalId: goalId,
      visibleGoalIds: visibleGoalIdsByPage.setGoals,
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
          title="No characters available"
          description="Artifact goals can target owned or future characters, but this static data snapshot does not currently expose any goal-pickable characters."
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
          { label: "Characters served", value: String(viewModel.summary.charactersServed) },
          { label: "Domains needed", value: String(viewModel.summary.domainsNeeded), tone: viewModel.summary.domainsNeeded ? "warning" : "default" },
          {
            label: "No standard source",
            value: String(viewModel.summary.nonStandardSourceGoalCount),
            tone: viewModel.summary.nonStandardSourceGoalCount ? "warning" : "default",
          },
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
        <>
          <div className="artifact-page-toolbar panel">
            <WorkspaceTabs
              compact
              label="Artifact pages"
              activeTab={activePage}
              onChange={setActivePage}
              tabs={ARTIFACT_PAGE_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(event) => setShowCompleted(event.target.checked)}
              />
              Show completed
            </label>
          </div>

          {activePage === "domainGuide" ? (
            <ArtifactDomainGuidePage
              groups={viewModel.domainGuide.groups}
              selectedGoalId={effectiveSelectedGoalId}
              onSelectGoal={openGoalInEditor}
            />
          ) : null}

          {activePage === "characterGoals" ? (
            <ArtifactCharacterGoalsPage
              groups={viewModel.characterGoals.groups}
              onAddGoal={(characterKey) => void createArtifactGoal(characterKey)}
              onEditGoal={openGoalInEditor}
            />
          ) : null}

          {activePage === "setGoals" ? (
            <ArtifactSetGoalsPage
              groups={viewModel.goalEditor.groups}
              visibleGoalIds={viewModel.goalEditor.visibleGoalIds}
              selectedGoal={selectedGoal}
              selectedGoalView={selectedGoalView}
              selectedGoalSummary={selectedGoalSummary}
              characterOptions={characterOptions}
              setOptions={setOptions}
              onAddGoal={(characterKey) => void createArtifactGoal(characterKey)}
              onSelectGoal={setSelectedGoalId}
              onChangeGoal={(goalId, updates) => void updateArtifactGoal(goalId, updates)}
              onDeleteGoal={deleteGoal}
            />
          ) : null}
        </>
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

function ArtifactDomainGuidePage({
  groups,
  selectedGoalId,
  onSelectGoal,
}: {
  groups: ArtifactDomainGroupViewModel[];
  selectedGoalId: string | null;
  onSelectGoal: (goalId: string) => void;
}) {
  return (
    <SectionCard
      compact
      title="Domain Farming Guide"
      description="See which domains are worth farming right now, what slots to keep, and which characters benefit from each drop."
    >
      {groups.length > 0 ? (
        <div className="artifact-domain-guide-stack">
          {groups.map((group) => (
            <ArtifactDomainGroup
              key={group.key}
              group={group}
              selectedGoalId={selectedGoalId}
              onSelectGoal={onSelectGoal}
            />
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title="No visible domain targets"
          description="Your current filter is hiding every domain target. Turn on completed goals if you want to review finished domains too."
        />
      )}
    </SectionCard>
  );
}

function ArtifactCharacterGoalsPage({
  groups,
  onAddGoal,
  onEditGoal,
}: {
  groups: ArtifactCharacterGroupViewModel[];
  onAddGoal: (characterKey?: string) => void;
  onEditGoal: (goalId: string) => void;
}) {
  return (
    <SectionCard
      compact
      title="Character Goals"
      description="Review each character's artifact plans and jump straight into goal editing when you need to adjust sets, stats, or progress."
    >
      {groups.length > 0 ? (
        <div className="artifact-character-page-stack">
          {groups.map((group) => (
            <section key={group.characterKey ?? group.characterLabel} className="artifact-browser-group artifact-character-section">
              <div className="artifact-browser-group-header">
                <div>
                  <strong>{group.characterLabel}</strong>
                  <div className="table-toolbar-summary">
                    {group.goalCount} goals · {group.incompleteGoalCount} incomplete · {group.domainCount} domains
                  </div>
                </div>
                <button
                  type="button"
                  className="button-ghost"
                  onClick={() => onAddGoal(group.characterKey)}
                >
                  Add goal
                </button>
              </div>

              <div className="artifact-character-goal-grid">
                {group.goals.map((goal) => (
                  <article key={goal.id} className="artifact-character-goal-card">
                    <div className="artifact-goal-topline">
                      <div>
                        <strong>{goal.goalName}</strong>
                        <div className="table-toolbar-summary">{goal.progressLabel}</div>
                      </div>
                      <StatusBadge compact tone={goal.status === "complete" ? "success" : goal.status === "in_progress" ? "accent" : "warning"}>
                        {goal.statusLabel}
                      </StatusBadge>
                    </div>

                    <div className="artifact-summary-details">
                      <div><span className="muted">Sets:</span> {goal.setSummary}</div>
                      <div>{cleanArtifactText(goal.mainStatSummary)}</div>
                      <div className="muted">Look for: {goal.desiredSubstatsSummary}</div>
                      <div className="muted">Domains: {goal.domainSummary}</div>
                      {goal.warningSummary ? <div className="muted">Review: {goal.warningSummary}</div> : null}
                    </div>

                    <div className="artifact-card-actions">
                      <button type="button" className="button-ghost" onClick={() => onEditGoal(goal.id)}>
                        Edit goal
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title="No visible character goals"
          description="Your current filter is hiding every character goal. Turn on completed goals if you want to review finished plans too."
        />
      )}
    </SectionCard>
  );
}

function ArtifactSetGoalsPage({
  groups,
  visibleGoalIds,
  selectedGoal,
  selectedGoalView,
  selectedGoalSummary,
  characterOptions,
  setOptions,
  onAddGoal,
  onSelectGoal,
  onChangeGoal,
  onDeleteGoal,
}: {
  groups: ArtifactCharacterGroupViewModel[];
  visibleGoalIds: string[];
  selectedGoal: ArtifactGoal | null;
  selectedGoalView: ArtifactGoalViewModel | null;
  selectedGoalSummary: {
    characterLabel: string;
    goalName: string;
    setSummary: string;
    progressLabel: string;
    domainSummary: string;
    warningSummary?: string;
  } | null;
  characterOptions: Array<{ key: string; label: string }>;
  setOptions: Array<{ key: string; label: string }>;
  onAddGoal: (characterKey?: string) => void;
  onSelectGoal: (goalId: string) => void;
  onChangeGoal: (goalId: string, updates: Partial<ArtifactGoal>) => void;
  onDeleteGoal: (goalId: string) => void;
}) {
  return (
    <div className="artifact-goals-workspace">
      <SplitWorkspace
        left={
          <SectionCard
            compact
            title="Set Goals"
            description="Select a goal to edit it, or add a new goal under the relevant character."
          >
            <div className="artifact-browser stack">
              {groups.map((group) => (
                <section key={group.characterKey ?? group.characterLabel} className="artifact-browser-group">
                  <div className="artifact-browser-group-header">
                    <div>
                      <strong>{group.characterLabel}</strong>
                      <div className="table-toolbar-summary">
                        {group.goalCount} goals · {group.incompleteGoalCount} incomplete
                      </div>
                    </div>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => onAddGoal(group.characterKey)}
                    >
                      Add goal
                    </button>
                  </div>

                  <div className="artifact-goal-list">
                    {group.goals.map((goal) => (
                      <ArtifactGoalBrowserCard
                        key={goal.id}
                        goal={goal}
                        selected={selectedGoal?.id === goal.id}
                        onSelect={() => onSelectGoal(goal.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}

              {visibleGoalIds.length <= 0 ? (
                <EmptyStateCard
                  title="No goals match this filter"
                  description="Your current filter is empty, but the selected goal can stay open in the editor until you switch selection."
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
                onChange={(updates) => onChangeGoal(selectedGoal.id, updates)}
                onDelete={() => onDeleteGoal(selectedGoal.id)}
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
  );
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
              ? cleanArtifactText([group.location, group.region].filter(Boolean).join(" · "))
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
          <span className="table-toolbar-summary">{buildDomainUsefulnessLabel(group)}</span>
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
      aria-label={`Open ${row.setLabel} ${row.slotLabel} target in Set Goals`}
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

function ArtifactGoalBrowserCard({
  goal,
  selected,
  onSelect,
}: {
  goal: ArtifactGoalViewModel;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article className={`artifact-summary-card artifact-browser-goal-card ${selected ? "is-selected" : ""}`.trim()}>
      <button type="button" className="artifact-summary-select" onClick={onSelect} aria-pressed={selected}>
        <div className="artifact-goal-topline">
          <div>
            <strong>{goal.goalName}</strong>
            <div className="table-toolbar-summary">{goal.progressLabel}</div>
          </div>
          <StatusBadge compact tone={goal.status === "complete" ? "success" : goal.status === "in_progress" ? "accent" : "warning"}>
            {selected ? "Editing" : goal.statusLabel}
          </StatusBadge>
        </div>

        <div className="artifact-summary-details">
          <div><span className="muted">Sets:</span> {goal.setSummary}</div>
          <div>{cleanArtifactText(goal.mainStatSummary)}</div>
          <div className="muted">Domains: {goal.domainSummary}</div>
          {goal.warningSummary ? <div className="muted">Review: {goal.warningSummary}</div> : null}
        </div>
      </button>
    </article>
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
