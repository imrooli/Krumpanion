import { EmptyStateCard, MetricStrip, PageHeader, PageShell, SectionCard, WorkspaceTabs } from "../../app/layoutPrimitives";
import type { PlannerOutput } from "../../domain/planner/types";
import { selectActiveAccount, selectActiveGoals } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { ArtifactGoalsTab } from "../artifactGoals/ArtifactGoalsTab";
import { CharactersTab } from "../characters/CharactersTab";
import { WeaponsTab } from "../weapons/WeaponsTab";
import { useMemo, useState } from "react";

type GoalsTabKey = "overview" | "characters" | "weapons" | "artifacts";

interface GoalsWorkspaceProps {
  plannerOutput: PlannerOutput;
}

export function GoalsWorkspace({ plannerOutput }: GoalsWorkspaceProps) {
  const account = useAppStore(selectActiveAccount);
  const goals = useAppStore(selectActiveGoals);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const [activeTab, setActiveTabState] = useState<GoalsTabKey>("overview");

  const goalCounts = useMemo(
    () => ({
      characters: Object.keys(goals.characterGoals).length,
      weapons: Object.keys(goals.weaponGoals).length,
      artifacts: goals.artifactGoals.length,
    }),
    [goals],
  );

  const totalGoals = goalCounts.characters + goalCounts.weapons + goalCounts.artifacts;

  if (!account) {
    return (
      <PageShell
        header={
          <PageHeader
            compact
            eyebrow="Goals"
            title="Set planning goals"
            description="Goals are account-scoped. Import a GOOD snapshot first so character and weapon goal editing starts from the right ownership state."
          />
        }
      >
        <EmptyStateCard
          title="No active account snapshot yet"
          description="Open Inventory to import GOOD data, then come back here to set character, weapon, and artifact goals for that account."
          action={
            <div className="button-row wrap">
              <button type="button" className="button-primary" onClick={() => void setActiveTab("inventory")}>
                Open Inventory
              </button>
            </div>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <PageHeader
          compact
          eyebrow="Goals"
          title="Track character, weapon, and artifact plans"
          description="Edit account-scoped progression goals, then jump into Planner for exact deficits and farming effort."
        />
      }
      metrics={
        <MetricStrip
          compact
          items={[
            { label: "Active account", value: account.name, tone: "accent" },
            { label: "Total goals", value: String(totalGoals), tone: totalGoals ? "accent" : "default" },
            { label: "Character goals", value: String(goalCounts.characters) },
            { label: "Weapon goals", value: String(goalCounts.weapons) },
            { label: "Artifact goals", value: String(goalCounts.artifacts) },
          ]}
        />
      }
    >
      <div className="goals-page">
      <WorkspaceTabs
        compact
        label="Goal sections"
        activeTab={activeTab}
        onChange={setActiveTabState}
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "characters", label: "Characters", count: goalCounts.characters },
          { key: "weapons", label: "Weapons", count: goalCounts.weapons },
          { key: "artifacts", label: "Artifacts", count: goalCounts.artifacts },
        ]}
      />

      {activeTab === "overview" ? (
        <div className="workspace-card-grid goals-overview-grid is-compact">
          <SectionCard
            title="Goal coverage"
            description="Edit what this account is actively building."
            compact
            actions={
              <button type="button" className="button-ghost" onClick={() => void setActiveTab("planner")}>
                Open Planner
              </button>
            }
          >
            <ul className="ranked-list compact-list">
              <li>
                <strong>Characters with goal rows</strong>
                <span>{goalCounts.characters}</span>
              </li>
              <li>
                <strong>Weapons with goal rows</strong>
                <span>{goalCounts.weapons}</span>
              </li>
              <li>
                <strong>Artifact plans</strong>
                <span>{goalCounts.artifacts}</span>
              </li>
            </ul>
          </SectionCard>

          <SectionCard title="Planning snapshot" description="Quick read before drilling into Planner." compact>
            <ul className="ranked-list compact-list">
              <li>
                <strong>Estimated resin</strong>
                <span>{plannerOutput.summary.totalEstimatedResin}</span>
              </li>
              <li>
                <strong>Missing material rows</strong>
                <span>{plannerOutput.totalMissingByMaterial.length}</span>
              </li>
              <li>
                <strong>Weekly-gated rows</strong>
                <span>{plannerOutput.summary.weeklyGatedEstimateCount}</span>
              </li>
            </ul>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "characters" ? <CharactersTab key={`characters-${account.id}`} plannerOutput={plannerOutput} /> : null}
      {activeTab === "weapons" ? <WeaponsTab key={`weapons-${account.id}`} plannerOutput={plannerOutput} /> : null}
      {activeTab === "artifacts" ? <ArtifactGoalsTab key={`artifacts-${account.id}`} plannerOutput={plannerOutput} /> : null}
      </div>
    </PageShell>
  );
}
