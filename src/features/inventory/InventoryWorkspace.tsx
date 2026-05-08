import { useState } from "react";
import {
  EmptyStateCard,
  MetricStrip,
  PageHeader,
  PageShell,
  SectionCard,
  StatusBadge,
  WorkspaceTabs,
} from "../../app/layoutPrimitives";
import type { PlannerOutput } from "../../domain/planner/types";
import { selectActiveAccount } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { GoodImportPanel } from "../import/GoodImportPanel";
import { InventoryTab } from "./InventoryTab";

type InventoryTabKey = "import" | "materials" | "characters" | "weapons";

interface InventoryWorkspaceProps {
  plannerOutput: PlannerOutput;
}

export function InventoryWorkspace({ plannerOutput }: InventoryWorkspaceProps) {
  const account = useAppStore(selectActiveAccount);
  const [activeTab, setActiveTab] = useState<InventoryTabKey>("import");

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="Inventory"
          title="Import and review account inventory"
          description="GOOD import, owned materials, and ownership reviews now live together so you can verify account state before setting or reviewing goals."
        />
      }
      metrics={
        <MetricStrip
          items={[
            { label: "Active account", value: account?.name ?? "No account", tone: "accent" },
            {
              label: "Last GOOD import",
              value: account?.importState.lastGoodImportAt
                ? new Date(account.importState.lastGoodImportAt).toLocaleDateString()
                : "Not imported",
              tone: account?.importState.lastGoodImportAt ? "success" : "warning",
            },
            { label: "Materials", value: String(Object.keys(account?.inventory ?? {}).length) },
            { label: "Characters owned", value: String(account?.characters.length ?? 0) },
            { label: "Weapons owned", value: String(account?.weapons.length ?? 0) },
          ]}
        />
      }
    >
      <WorkspaceTabs
        label="Inventory sections"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: "import", label: "Import GOOD" },
          { key: "materials", label: "Materials", count: Object.keys(account?.inventory ?? {}).length },
          { key: "characters", label: "Characters Owned", count: account?.characters.length ?? 0 },
          { key: "weapons", label: "Weapons Owned", count: account?.weapons.length ?? 0 },
        ]}
      />

      {activeTab === "import" ? (
        <div className="utility-grid inventory-import-grid">
          <GoodImportPanel />
          <SectionCard title="Import status" description="Imports only update the active account. Goals stay intact unless you change them yourself later.">
            <div className="stack">
              <div className="badge-row">
                <StatusBadge tone={account?.importState.lastGoodImportAt ? "success" : "warning"}>
                  {account?.importState.lastGoodImportAt ? "Snapshot loaded" : "No GOOD import"}
                </StatusBadge>
                <StatusBadge tone={account?.importState.importWarnings?.length ? "warning" : "success"}>
                  {account?.importState.importWarnings?.length
                    ? `${account.importState.importWarnings.length} import warning(s)`
                    : "No import warnings"}
                </StatusBadge>
              </div>
              <ul className="ranked-list">
                <li>
                  <strong>Active account</strong>
                  <span>{account?.name ?? "No account"}</span>
                </li>
                <li>
                  <strong>Last file</strong>
                  <span>{account?.importState.lastGoodFileName ?? "None"}</span>
                </li>
                <li>
                  <strong>Import source</strong>
                  <span>{account?.importState.lastGoodSource ?? "unknown"}</span>
                </li>
                <li>
                  <strong>Detected characters</strong>
                  <span>{account?.importState.importSummary?.characterCount ?? account?.characters.length ?? 0}</span>
                </li>
                <li>
                  <strong>Detected weapons</strong>
                  <span>{account?.importState.importSummary?.weaponCount ?? account?.weapons.length ?? 0}</span>
                </li>
                <li>
                  <strong>Detected artifacts</strong>
                  <span>{account?.importState.importSummary?.artifactCount ?? account?.artifacts.length ?? 0}</span>
                </li>
              </ul>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "materials" ? <InventoryTab plannerOutput={plannerOutput} embedded /> : null}

      {activeTab === "characters" ? (
        <SectionCard title="Owned characters" description="Review imported character ownership and current progression before editing goal targets.">
          {account?.characters.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Character</th>
                    <th>Level</th>
                    <th>Ascension</th>
                    <th>Talents</th>
                    <th>Constellation</th>
                  </tr>
                </thead>
                <tbody>
                  {account.characters.map((character) => (
                    <tr key={character.characterId}>
                      <td>{character.characterId}</td>
                      <td>{character.currentLevel}</td>
                      <td>A{character.currentAscension}</td>
                      <td>
                        {character.currentTalents.normal}/{character.currentTalents.skill}/{character.currentTalents.burst}
                      </td>
                      <td>{character.constellation ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyStateCard
              title="No characters imported yet"
              description="Import a GOOD file in the Import GOOD tab to populate account ownership."
            />
          )}
        </SectionCard>
      ) : null}

      {activeTab === "weapons" ? (
        <SectionCard title="Owned weapons" description="Imported weapon ownership stays separate from weapon goals so duplicate copies remain manageable.">
          {account?.weapons.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Weapon</th>
                    <th>Level</th>
                    <th>Ascension</th>
                    <th>Refinement</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {account.weapons.map((weapon) => (
                    <tr key={weapon.weaponInstanceId}>
                      <td>{weapon.weaponKey}</td>
                      <td>{weapon.currentLevel}</td>
                      <td>A{weapon.currentAscension}</td>
                      <td>R{weapon.refinement ?? 1}</td>
                      <td>{weapon.location ?? "Unequipped"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyStateCard
              title="No weapons imported yet"
              description="Import a GOOD file in the Import GOOD tab to populate account ownership."
            />
          )}
        </SectionCard>
      ) : null}
    </PageShell>
  );
}
