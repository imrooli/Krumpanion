import type { PlannerOutput } from "../../domain/planner/types";
import { selectActiveGoals } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

interface ArtifactGoalsTabProps {
  plannerOutput: PlannerOutput;
}

export function ArtifactGoalsTab({ plannerOutput }: ArtifactGoalsTabProps) {
  const goals = useAppStore((state) => selectActiveGoals(state).artifactGoals);
  const addArtifactGoal = useAppStore((state) => state.addArtifactGoal);
  const updateArtifactGoal = useAppStore((state) => state.updateArtifactGoal);
  const removeArtifactGoal = useAppStore((state) => state.removeArtifactGoal);

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Artifact Goals</h2>
          <p className="compact-helper-text">Keep artifact plans concise: target sets, budget, priority, and notes.</p>
        </div>
        <button type="button" className="button-primary" onClick={() => void addArtifactGoal()}>
          Add Goal
        </button>
      </div>

      <div className="artifact-goal-list">
        {goals.map((goal) => {
          const linkedPlan = plannerOutput.artifactFarmGoals.find((plan) => plan.id === goal.id);
          return (
            <article key={goal.id} className="artifact-card is-compact">
              <div className="artifact-goal-topline">
                <strong>{goal.characterKey || "Unassigned artifact goal"}</strong>
                <span className="table-toolbar-summary">{linkedPlan?.label ?? "Incomplete goal"}</span>
              </div>
              <div className="artifact-goal-fields">
                <label>
                  Character key
                  <input
                    className="text-input"
                    placeholder="Character key"
                    value={goal.characterKey ?? ""}
                    onChange={(event) => void updateArtifactGoal(goal.id, { characterKey: event.target.value || undefined })}
                  />
                </label>
                <label>
                  Domain key
                  <input
                    className="text-input"
                    placeholder="Domain key"
                    value={goal.domainKey}
                    onChange={(event) => void updateArtifactGoal(goal.id, { domainKey: event.target.value })}
                  />
                </label>
                <label>
                  Target set keys
                  <input
                    className="text-input"
                    placeholder="Comma separated"
                    value={goal.targetSetKeys.join(", ")}
                    onChange={(event) =>
                      void updateArtifactGoal(goal.id, {
                        targetSetKeys: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
              </div>
              <div className="artifact-inline-fields">
                <label>
                  Priority
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={goal.priority}
                    onChange={(event) => void updateArtifactGoal(goal.id, { priority: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Weekly Resin
                  <input
                    type="number"
                    min={0}
                    value={goal.weeklyResinBudget ?? 0}
                    onChange={(event) =>
                      void updateArtifactGoal(goal.id, {
                        weeklyResinBudget: event.target.value ? Number(event.target.value) : undefined,
                      })
                    }
                  />
                </label>
              </div>
              <label className="artifact-goal-notes">
                Notes
                <textarea
                  className="code-input compact"
                  rows={3}
                  placeholder="Notes"
                  value={goal.notes ?? ""}
                  onChange={(event) => void updateArtifactGoal(goal.id, { notes: event.target.value })}
                />
              </label>
              <div className="artifact-goal-meta">
                <span className="muted">Planner label: {linkedPlan?.label ?? "Incomplete goal"}</span>
                <button type="button" className="button-ghost" onClick={() => void removeArtifactGoal(goal.id)}>
                  Remove
                </button>
              </div>
            </article>
          );
        })}
        {goals.length === 0 ? <p>No artifact goals yet.</p> : null}
      </div>
    </section>
  );
}
