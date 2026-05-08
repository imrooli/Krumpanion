import { type ReactNode, useEffect, useMemo, useState } from "react";
import { EmptyStateCard, MetricStrip, PageHeader, StatusBadge } from "../../app/layoutPrimitives";
import { getLinkedWeaponInstanceId, getWeaponGoalTargetAscension } from "../../domain/goals/goalState";
import type { PlannerGoal, PlannerOutput } from "../../domain/planner/types";
import { selectActiveAccount, selectActiveGoals } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { ArtifactGoalsTab } from "../artifactGoals/ArtifactGoalsTab";
import { CharactersTab } from "../characters/CharactersTab";
import { WeaponsTab } from "../weapons/WeaponsTab";
import { PlannerAssumptionsPanel } from "./PlannerAssumptionsPanel";

type GoalFilter = "all" | "character" | "weapon" | "artifact";
type PlanningSubview = "calculator" | "characters" | "weapons" | "artifacts";

interface PlanningWorkspaceProps {
  plannerOutput: PlannerOutput;
}

export function PlanningWorkspace({ plannerOutput }: PlanningWorkspaceProps) {
  const account = useAppStore(selectActiveAccount);
  const staticData = useAppStore((state) => state.staticData);
  const addArtifactGoal = useAppStore((state) => state.addArtifactGoal);
  const [subview, setSubview] = useState<PlanningSubview>("calculator");
  const [goalFilter, setGoalFilter] = useState<GoalFilter>("all");
  const filteredGoals = plannerOutput.plannerGoalGroups.find((group) => group.key === goalFilter)?.goals ?? plannerOutput.plannerGoals;
  const [selectedGoalId, setSelectedGoalId] = useState(filteredGoals[0]?.id ?? plannerOutput.plannerGoals[0]?.id ?? "");

  useEffect(() => {
    if (!filteredGoals.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId(filteredGoals[0]?.id ?? plannerOutput.plannerGoals[0]?.id ?? "");
    }
  }, [filteredGoals, plannerOutput.plannerGoals, selectedGoalId]);

  const selectedGoal = filteredGoals.find((goal) => goal.id === selectedGoalId) ??
    plannerOutput.plannerGoals.find((goal) => goal.id === selectedGoalId) ??
    plannerOutput.plannerGoals[0];

  const selectedCharacterPlan =
    selectedGoal?.goalType === "character" ? plannerOutput.byCharacter.find((plan) => plan.goalKey === selectedGoal.id) : undefined;
  const selectedWeaponPlan =
    selectedGoal?.goalType === "weapon" ? plannerOutput.byWeapon.find((plan) => plan.goalKey === selectedGoal.id) : undefined;
  const selectedArtifactPlan =
    selectedGoal?.goalType === "artifact" ? plannerOutput.artifactFarmGoals.find((plan) => plan.id === selectedGoal.id) : undefined;

  const selectedMaterialRows = useMemo(() => {
    if (!selectedGoal) {
      return plannerOutput.totalMissingByMaterial;
    }
    if (selectedGoal.goalType === "artifact") {
      return plannerOutput.totalMissingByMaterial;
    }
    return plannerOutput.totalMissingByMaterial.filter((row) => row.usedBy.some((usage) => usage.key === selectedGoal.id));
  }, [plannerOutput.totalMissingByMaterial, selectedGoal]);

  const selectedExactRows = useMemo(() => {
    if (!selectedGoal || selectedGoal.goalType === "artifact") {
      return plannerOutput.exactRequirementsByMaterial;
    }
    return plannerOutput.exactRequirementsByMaterial.filter((row) => row.usedBy.some((usage) => usage.key === selectedGoal.id));
  }, [plannerOutput.exactRequirementsByMaterial, selectedGoal]);

  const selectedFarmingEstimates = useMemo(() => {
    if (!selectedGoal || selectedGoal.goalType === "artifact") {
      return plannerOutput.farmingEstimates;
    }
    return plannerOutput.farmingEstimates.filter((estimate) => estimate.relatedGoalKeys?.includes(selectedGoal.id));
  }, [plannerOutput.farmingEstimates, selectedGoal]);

  const selectedCraftingReports = useMemo(() => {
    if (!selectedGoal || selectedGoal.goalType === "artifact") {
      return plannerOutput.craftingPlan.reports.filter(
        (report) => report.guaranteedCrafting.outputAmount > 0 || (report.resinImpact.resinSavedGuaranteed ?? 0) > 0,
      );
    }
    return plannerOutput.craftingPlan.reports.filter((report) =>
      selectedMaterialRows.some((row) => row.materialKey === report.targetMaterialKey),
    );
  }, [plannerOutput.craftingPlan.reports, selectedGoal, selectedMaterialRows]);

  if (!account) {
    return (
      <section className="workspace-page">
        <PageHeader
          eyebrow="Calculator Planning"
          title="Unified planner calculator"
          description="Import a GOOD inventory first so Krumpanion can resolve exact deficits, crafting options, and resin estimates."
        />
        <EmptyStateCard
          title="No GOOD account loaded"
          description="Once an inventory is loaded, this workspace becomes a single calculator flow for characters, weapons, crafting, and farming."
        />
      </section>
    );
  }

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Calculator-First Planning"
        title="Goals, exact deficits, crafting, and resin in one flow"
        description="Define goals, adjust assumptions, inspect exact shortages, then review crafting impact and farming effort without leaving Planning."
        actions={
          <div className="button-row wrap">
            <button type="button" className={`button-secondary ${subview === "calculator" ? "is-active" : ""}`} onClick={() => setSubview("calculator")}>
              Calculator
            </button>
            <button type="button" className={`button-secondary ${subview === "characters" ? "is-active" : ""}`} onClick={() => setSubview("characters")}>
              Characters
            </button>
            <button type="button" className={`button-secondary ${subview === "weapons" ? "is-active" : ""}`} onClick={() => setSubview("weapons")}>
              Weapons
            </button>
            <button type="button" className={`button-secondary ${subview === "artifacts" ? "is-active" : ""}`} onClick={() => setSubview("artifacts")}>
              Artifacts
            </button>
            <button type="button" className="button-primary" onClick={() => void addArtifactGoal()}>
              Add Artifact Goal
            </button>
          </div>
        }
      />

      <MetricStrip
        items={[
          { label: "Planner goals", value: String(plannerOutput.plannerGoals.length), tone: "accent" },
          { label: "Progression Mora", value: String(plannerOutput.summary.progressionMora) },
          { label: "Crafting Mora", value: String(plannerOutput.summary.craftingMora), tone: "accent" },
          { label: "Total Mora", value: String(plannerOutput.summary.totalMora), tone: "warning" },
          { label: "Estimated resin", value: String(plannerOutput.summary.totalEstimatedResin), tone: "warning" },
          { label: "Natural days", value: plannerOutput.summary.totalEstimatedNaturalResinDays.toFixed(2) },
          { label: "Weekly-gated", value: String(plannerOutput.summary.weeklyGatedEstimateCount), tone: "warning" },
          { label: "Open-world rows", value: String(plannerOutput.summary.openWorldEstimateCount) },
        ]}
      />

      {subview === "characters" ? <CharactersTab key={`characters-${account.id}`} plannerOutput={plannerOutput} /> : null}
      {subview === "weapons" ? <WeaponsTab key={`weapons-${account.id}`} plannerOutput={plannerOutput} /> : null}
      {subview === "artifacts" ? <ArtifactGoalsTab key={`artifacts-${account.id}`} plannerOutput={plannerOutput} /> : null}

      {subview === "calculator" ? (
        <>
      <div className="planning-overview-grid">
        <PlannerGoalList
          goals={plannerOutput.plannerGoals}
          filter={goalFilter}
          onFilterChange={setGoalFilter}
          selectedGoalId={selectedGoal?.id ?? ""}
          onSelectGoal={setSelectedGoalId}
        />
        <GoalEditorCard plannerOutput={plannerOutput} selectedGoal={selectedGoal} />
        <PlannerAssumptionsPanel staticData={staticData} />
      </div>

      <div className="stack">
        <PlannerSectionCard
          title="1. Exact Requirements"
          description="Deterministic goal requirements before crafting passives or farming estimates."
        >
          <RequirementTable rows={selectedExactRows} />
        </PlannerSectionCard>

        <PlannerSectionCard
          title="2. Crafting Opportunities"
          description="Guaranteed same-family crafts first, with expected-value passive notes shown separately."
        >
          <CraftingReportList reports={selectedCraftingReports} />
        </PlannerSectionCard>

        <PlannerSectionCard
          title="3. Missing Materials"
          description="Post-crafting shortages used by the farming calculator."
        >
          <MissingMaterialsTable rows={selectedMaterialRows} estimates={plannerOutput.farmingEstimates} />
        </PlannerSectionCard>

        <PlannerSectionCard
          title="4. Farming and Resin Estimates"
          description="Resin-gated estimates stay separate from open-world and weekly-gated activities."
        >
          <FarmingEstimateTable estimates={selectedFarmingEstimates} />
        </PlannerSectionCard>
      </div>

      {(selectedCharacterPlan || selectedWeaponPlan || selectedArtifactPlan) ? (
        <article className="panel">
          <div className="section-header">
            <div>
              <h2>Selected Goal Summary</h2>
              <p className="muted">A focused summary for the currently selected goal.</p>
            </div>
          </div>
          {selectedGoal?.goalType === "character" && selectedCharacterPlan ? (
            <GoalSummaryList
              title={selectedCharacterPlan.displayName}
              estimatedResin={selectedCharacterPlan.estimatedResin}
              breakdownLabels={selectedCharacterPlan.breakdown.map((entry) => entry.label)}
              warnings={selectedCharacterPlan.warnings.map((warning) => warning.message)}
            />
          ) : null}
          {selectedGoal?.goalType === "weapon" && selectedWeaponPlan ? (
            <GoalSummaryList
              title={selectedWeaponPlan.displayName}
              estimatedResin={selectedWeaponPlan.estimatedResin}
              breakdownLabels={selectedWeaponPlan.breakdown.map((entry) => entry.label)}
              warnings={selectedWeaponPlan.warnings.map((warning) => warning.message)}
            />
          ) : null}
          {selectedGoal?.goalType === "artifact" && selectedArtifactPlan ? (
            <GoalSummaryList
              title={selectedArtifactPlan.label}
              estimatedResin={selectedArtifactPlan.weeklyResinBudget ?? 0}
              breakdownLabels={[selectedArtifactPlan.domainName, selectedArtifactPlan.targetSetKeys.join(", ")]}
              warnings={[]}
            />
          ) : null}
        </article>
      ) : null}
        </>
      ) : null}
    </section>
  );
}

function PlannerGoalList({
  goals,
  filter,
  onFilterChange,
  selectedGoalId,
  onSelectGoal,
}: {
  goals: PlannerGoal[];
  filter: GoalFilter;
  onFilterChange: (filter: GoalFilter) => void;
  selectedGoalId: string;
  onSelectGoal: (goalId: string) => void;
}) {
  const filteredGoals = goals.filter((goal) => filter === "all" || goal.goalType === filter);

  return (
    <article className="panel">
      <div className="section-header">
        <div>
          <h2>1. Goals</h2>
          <p className="muted">Pick one goal to edit, while the calculator keeps the full account plan in view.</p>
        </div>
      </div>
      <div className="button-row wrap">
        {(["all", "character", "weapon", "artifact"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={`button-secondary ${filter === item ? "is-active" : ""}`}
            onClick={() => onFilterChange(item)}
          >
            {item === "all" ? "All" : item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <div className="catalog-list">
        {filteredGoals.map((goal) => (
          <button
            key={goal.id}
            type="button"
            className={`catalog-item ${selectedGoalId === goal.id ? "is-active" : ""}`}
            onClick={() => onSelectGoal(goal.id)}
          >
            <div>
              <strong>{goal.label}</strong>
              <small>{goal.currentSummary}</small>
              <div className="muted">{goal.targetSummary}</div>
            </div>
            <div className="badge-row">
              <StatusBadge tone={goal.shortageCount ? "warning" : "success"}>
                {goal.shortageCount ? `${goal.shortageCount} shortages` : "Clear"}
              </StatusBadge>
              <StatusBadge tone="muted">{goal.estimatedResin} resin</StatusBadge>
            </div>
          </button>
        ))}
        {filteredGoals.length === 0 ? <p className="muted">No goals in this filter yet.</p> : null}
      </div>
    </article>
  );
}

function GoalEditorCard({ plannerOutput, selectedGoal }: { plannerOutput: PlannerOutput; selectedGoal: PlannerGoal | undefined }) {
  const account = useAppStore(selectActiveAccount);
  const staticData = useAppStore((state) => state.staticData);
  const characterGoals = useAppStore((state) => selectActiveGoals(state).characterGoals);
  const weaponGoals = useAppStore((state) => selectActiveGoals(state).weaponGoals);
  const artifactGoals = useAppStore((state) => selectActiveGoals(state).artifactGoals);
  const updateCharacterGoal = useAppStore((state) => state.updateCharacterGoal);
  const resetCharacterGoal = useAppStore((state) => state.resetCharacterGoal);
  const updateWeaponGoal = useAppStore((state) => state.updateWeaponGoal);
  const resetWeaponGoal = useAppStore((state) => state.resetWeaponGoal);
  const updateArtifactGoal = useAppStore((state) => state.updateArtifactGoal);
  const removeArtifactGoal = useAppStore((state) => state.removeArtifactGoal);

  if (!selectedGoal) {
    return (
      <article className="panel">
        <h2>2. Goal Editor</h2>
        <p className="muted">Select a goal to edit it here.</p>
      </article>
    );
  }

  if (selectedGoal.goalType === "character") {
    const current = account?.characters.find((character) => character.characterId === selectedGoal.entityKey);
    const goal = characterGoals[selectedGoal.entityKey];
    const levelOptions = [undefined, 20, 40, 50, 60, 70, 80, 90];
    return (
      <article className="panel">
        <div className="section-header">
          <div>
            <h2>2. Goal Editor</h2>
            <p className="muted">{selectedGoal.label}</p>
          </div>
          <button type="button" className="button-ghost" onClick={() => void resetCharacterGoal(selectedGoal.entityKey)}>
            Reset
          </button>
        </div>
        <div className="workspace-card-grid">
          <article className="metric-card">
            <span>Current</span>
            <strong>Lv {current?.currentLevel ?? "?"}</strong>
          </article>
          <article className="metric-card">
            <span>Ascension</span>
            <strong>A{current?.currentAscension ?? "?"}</strong>
          </article>
          <article className="metric-card">
            <span>Estimated resin</span>
            <strong>{plannerOutput.byCharacter.find((plan) => plan.characterKey === selectedGoal.entityKey)?.estimatedResin ?? 0}</strong>
          </article>
        </div>
        <div className="goal-card-grid">
          <label>
            Target level
            <select
              value={goal?.targetLevel ?? ""}
              onChange={(event) =>
                void updateCharacterGoal(selectedGoal.entityKey, {
                  targetLevel: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            >
              {levelOptions.map((value) => (
                <option key={String(value)} value={value ?? ""}>
                  Lv {value ?? "current"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target ascension
            <select
              value={goal?.targetAscension ?? ""}
              onChange={(event) =>
                void updateCharacterGoal(selectedGoal.entityKey, {
                  targetAscension: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            >
              {[undefined, 0, 1, 2, 3, 4, 5, 6].map((value) => (
                <option key={String(value)} value={value ?? ""}>
                  A{value ?? "current"}
                </option>
              ))}
            </select>
          </label>
          {(["auto", "skill", "burst"] as const).map((talentKey) => (
            <label key={talentKey}>
              {talentKey}
              <select
                value={goal?.talents?.[talentKey] ?? ""}
                onChange={(event) =>
                  void updateCharacterGoal(selectedGoal.entityKey, {
                    talents: {
                      [talentKey]: event.target.value ? Number(event.target.value) : undefined,
                    },
                  })
                }
              >
                {[undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <option key={String(value)} value={value ?? ""}>
                    {value ?? "current"}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="muted">{staticData.characters[selectedGoal.entityKey]?.displayName ?? selectedGoal.entityKey}</p>
      </article>
    );
  }

  if (selectedGoal.goalType === "weapon") {
    const goal = weaponGoals[selectedGoal.id];
    const linkedInventoryInstanceId = goal ? getLinkedWeaponInstanceId(goal) : undefined;
    const current = account?.weapons.find((weapon) => weapon.weaponInstanceId === linkedInventoryInstanceId);
    return (
      <article className="panel">
        <div className="section-header">
          <div>
            <h2>2. Goal Editor</h2>
            <p className="muted">{selectedGoal.label}</p>
          </div>
          <button type="button" className="button-ghost" onClick={() => void resetWeaponGoal(selectedGoal.id)}>
            Reset
          </button>
        </div>
        <div className="workspace-card-grid">
          <article className="metric-card">
            <span>Current</span>
            <strong>Lv {current?.currentLevel ?? "?"}</strong>
          </article>
          <article className="metric-card">
            <span>Ascension</span>
            <strong>A{current?.currentAscension ?? "?"}</strong>
          </article>
          <article className="metric-card">
            <span>Estimated resin</span>
            <strong>{plannerOutput.byWeapon.find((plan) => plan.goalKey === selectedGoal.id)?.estimatedResin ?? 0}</strong>
          </article>
        </div>
        <div className="goal-card-grid">
          <label>
            Target level
            <select
              value={goal?.targetLevel ?? ""}
              onChange={(event) => {
                if (!goal) {
                  return;
                }
                void updateWeaponGoal(selectedGoal.id, goal.weaponKey, {
                  targetLevel: event.target.value ? Number(event.target.value) : undefined,
                  linkedInventoryInstanceId,
                });
              }}
            >
              {[undefined, 20, 40, 50, 60, 70, 80, 90].map((value) => (
                <option key={String(value)} value={value ?? ""}>
                  Lv {value ?? "current"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target ascension
            <select
              value={goal ? (getWeaponGoalTargetAscension(goal) ?? "") : ""}
              onChange={(event) => {
                if (!goal) {
                  return;
                }
                void updateWeaponGoal(selectedGoal.id, goal.weaponKey, {
                  targetAscensionPhase: event.target.value ? Number(event.target.value) : undefined,
                  linkedInventoryInstanceId,
                });
              }}
            >
              {[undefined, 0, 1, 2, 3, 4, 5, 6].map((value) => (
                <option key={String(value)} value={value ?? ""}>
                  A{value ?? "current"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted">
          {goal?.linkStatus === "stale"
            ? "Linked owned instance is missing from the latest import."
            : current?.location || "Unequipped"}
        </p>
      </article>
    );
  }

  const artifactGoal = artifactGoals.find((goal) => goal.id === selectedGoal.id);
  if (!artifactGoal) {
    return (
      <article className="panel">
        <h2>2. Goal Editor</h2>
        <p className="muted">Artifact goal details are unavailable.</p>
      </article>
    );
  }

  return (
    <article className="panel">
      <div className="section-header">
        <div>
          <h2>2. Goal Editor</h2>
          <p className="muted">{selectedGoal.label}</p>
        </div>
        <button type="button" className="button-ghost" onClick={() => void removeArtifactGoal(artifactGoal.id)}>
          Remove
        </button>
      </div>
      <div className="goal-card-grid">
        <label>
          Character key
          <input
            className="text-input"
            value={artifactGoal.characterKey ?? ""}
            onChange={(event) => void updateArtifactGoal(artifactGoal.id, { characterKey: event.target.value || undefined })}
          />
        </label>
        <label>
          Domain key
          <input
            className="text-input"
            value={artifactGoal.domainKey}
            onChange={(event) => void updateArtifactGoal(artifactGoal.id, { domainKey: event.target.value })}
          />
        </label>
        <label>
          Set keys
          <input
            className="text-input"
            value={artifactGoal.targetSetKeys.join(", ")}
            onChange={(event) =>
              void updateArtifactGoal(artifactGoal.id, {
                targetSetKeys: event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
              })
            }
          />
        </label>
        <label>
          Weekly resin budget
          <input
            type="number"
            min={0}
            value={artifactGoal.weeklyResinBudget ?? 0}
            onChange={(event) =>
              void updateArtifactGoal(artifactGoal.id, {
                weeklyResinBudget: event.target.value ? Number(event.target.value) : undefined,
              })
            }
          />
        </label>
      </div>
    </article>
  );
}

function PlannerSectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="panel">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

function RequirementTable({ rows }: { rows: PlannerOutput["exactRequirementsByMaterial"] }) {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Owned</th>
            <th>Progression need</th>
            <th>Direct deficit</th>
            <th>Family</th>
            <th>Goals</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.materialKey}>
              <td>{row.displayName}</td>
              <td>{row.owned}</td>
              <td>{row.progressionNeeded}</td>
              <td>{row.rawMissing}</td>
              <td>{row.familyDisplayName ?? row.category}</td>
              <td>{row.usedBy.length}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>No deterministic requirements for this selection.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function CraftingReportList({ reports }: { reports: PlannerOutput["craftingPlan"]["reports"] }) {
  return (
    <ul className="ranked-list">
      {reports
        .filter((report) => report.guaranteedCrafting.outputAmount > 0 || (report.resinImpact.resinSavedGuaranteed ?? 0) > 0)
        .map((report) => (
          <li key={report.targetMaterialKey}>
            <div>
              <strong>{report.targetMaterialName}</strong>
              <div className="muted">
                Guaranteed output {report.guaranteedCrafting.outputAmount} • Mora {report.guaranteedCrafting.moraCost}
                {report.recommendedPassive ? ` • Best passive ${report.recommendedPassive.characterName}` : ""}
              </div>
              <div className="muted">
                Resin before {report.resinImpact.resinBeforeCrafting ?? "—"} • after guaranteed {report.resinImpact.resinAfterGuaranteedCrafting ?? "—"} • after expected {report.resinImpact.resinAfterExpectedPassive ?? "—"}
              </div>
            </div>
            <div className="badge-row">
              {report.guaranteedCrafting.canSatisfy ? <StatusBadge tone="success">Can satisfy</StatusBadge> : <StatusBadge tone="warning">Still short</StatusBadge>}
              {(report.expectedValue?.expectedAdditionalCoverage ?? 0) > 0 ? (
                <StatusBadge tone="accent">Expected +{report.expectedValue?.expectedAdditionalCoverage.toFixed(2)}</StatusBadge>
              ) : null}
            </div>
          </li>
        ))}
      {reports.filter((report) => report.guaranteedCrafting.outputAmount > 0 || (report.resinImpact.resinSavedGuaranteed ?? 0) > 0).length === 0 ? (
        <li>No meaningful crafting opportunities for this selection.</li>
      ) : null}
    </ul>
  );
}

function MissingMaterialsTable({
  rows,
  estimates,
}: {
  rows: PlannerOutput["totalMissingByMaterial"];
  estimates: PlannerOutput["farmingEstimates"];
}) {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Owned</th>
            <th>Craftable</th>
            <th>Effective owned</th>
            <th>Total need</th>
            <th>Deficit</th>
            <th>Extra Mora</th>
            <th>Estimate source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const estimate = estimates.find(
              (item) => item.materialKey === row.materialKey || item.relatedMaterialKeys?.includes(row.materialKey),
            );
            return (
              <tr key={row.materialKey}>
                <td>{row.displayName}</td>
                <td>{row.owned}</td>
                <td>{row.craftableQuantity}</td>
                <td>{row.effectiveOwned}</td>
                <td>{row.needed}</td>
                <td>{row.effectiveDeficit}</td>
                <td>{row.extraNeeded}</td>
                <td>{estimate?.sourceName ?? estimate?.sourceType ?? row.sources[0]?.sourceName ?? "Unknown"}</td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8}>No shortages after crafting for this selection.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function FarmingEstimateTable({ estimates }: { estimates: PlannerOutput["farmingEstimates"] }) {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Source</th>
            <th>Type</th>
            <th>Runs</th>
            <th>Resin</th>
            <th>Days</th>
            <th>Weeks</th>
            <th>Assumptions</th>
          </tr>
        </thead>
        <tbody>
          {estimates.map((estimate) => (
            <tr key={estimate.estimateKey}>
              <td>{estimate.materialName}</td>
              <td>{estimate.sourceName ?? "Unknown"}</td>
              <td>{estimate.sourceType}</td>
              <td>{estimate.estimatedRuns ?? "—"}</td>
              <td>{estimate.estimatedResin ?? "—"}</td>
              <td>{estimate.estimatedDaysNaturalResin?.toFixed(2) ?? "—"}</td>
              <td>{estimate.weeklyGate?.estimatedWeeks ?? estimate.estimatedWeeksNaturalResin?.toFixed(2) ?? "—"}</td>
              <td>{estimate.assumptions[0] ?? "—"}</td>
            </tr>
          ))}
          {estimates.length === 0 ? (
            <tr>
              <td colSpan={8}>No farming estimates for this selection.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function GoalSummaryList({
  title,
  estimatedResin,
  breakdownLabels,
  warnings,
}: {
  title: string;
  estimatedResin: number;
  breakdownLabels: string[];
  warnings: string[];
}) {
  return (
    <div className="planning-overview-grid">
      <article className="panel">
        <h3>{title}</h3>
        <p className="muted">Estimated resin {estimatedResin}</p>
        <ul className="ranked-list">
          {breakdownLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
          {breakdownLabels.length === 0 ? <li>No breakdown rows.</li> : null}
        </ul>
      </article>
      <article className="panel">
        <h3>Warnings</h3>
        <ul className="warning-list">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
          {warnings.length === 0 ? <li>No warnings.</li> : null}
        </ul>
      </article>
    </div>
  );
}
