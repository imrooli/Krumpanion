import type { PlannerOutput, PlannerRecommendation } from "../../domain/planner/types";
import {
  MetricStrip,
  PageHeader,
  PageShell,
  SectionCard,
  WarningPanel,
  WorkspaceTabs,
} from "../../app/layoutPrimitives";
import { selectActivePlannerSettings } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

interface PlannerTabProps {
  plannerOutput: PlannerOutput;
}

const VIEW_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "materials", label: "All Missing Materials" },
  { key: "character", label: "By Character" },
  { key: "source", label: "By Domain/Boss" },
] as const;

export function PlannerTab({ plannerOutput }: PlannerTabProps) {
  const plannerView = useAppStore((state) => state.settings.plannerView);
  const setPlannerView = useAppStore((state) => state.setPlannerView);
  const plannerSettings = useAppStore(selectActivePlannerSettings);
  const updatePlannerSettings = useAppStore((state) => state.updatePlannerSettings);
  const staticData = useAppStore((state) => state.staticData);

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="Planner"
          title="Review deficits, crafting impact, and farming effort"
          description="This page keeps deterministic requirements separate from estimated farming effort so you can see what is exact, what is craftable, and what still needs resin."
        />
      }
      metrics={
        <MetricStrip
          items={[
            { label: "Estimated resin", value: String(plannerOutput.resinSummary.totalEstimatedResin), tone: "warning" },
            {
              label: "Natural days",
              value: plannerOutput.resinSummary.totalEstimatedNaturalResinDays.toFixed(2),
            },
            {
              label: "Natural weeks",
              value: plannerOutput.resinSummary.totalEstimatedNaturalResinWeeks.toFixed(2),
            },
            {
              label: "Weekly-gated rows",
              value: String(plannerOutput.resinSummary.weeklyGatedEstimateCount),
              tone: plannerOutput.resinSummary.weeklyGatedEstimateCount ? "warning" : "success",
            },
            { label: "Crafting Mora", value: String(plannerOutput.summary.craftingMora), tone: "accent" },
          ]}
        />
      }
    >
      {!!plannerOutput.warnings.length ? (
        <WarningPanel title="Planner assumptions and warnings" tone="warning">
          <ul className="warning-list">
            {plannerOutput.warnings.slice(0, 4).map((warning) => (
              <li key={`${warning.type}-${warning.message}`}>{warning.message}</li>
            ))}
          </ul>
        </WarningPanel>
      ) : null}

      <SectionCard title="Planner assumptions" description="Adjust account-scoped world and resin assumptions here before reviewing grouped deficit outputs.">
        <div className="planner-controls">
        <label>
          World Level
          <input
            type="number"
            min={0}
            max={9}
            value={plannerSettings.worldLevel ?? 8}
            onChange={(event) => void updatePlannerSettings({ worldLevel: Number(event.target.value) })}
          />
        </label>
        <label>
          Domain Level
          <select
            value={plannerSettings.domainLevel ?? "IV"}
            onChange={(event) => void updatePlannerSettings({ domainLevel: event.target.value as "I" | "II" | "III" | "IV" })}
          >
            {["I", "II", "III", "IV"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Daily Resin Budget
          <input
            type="number"
            min={0}
            value={plannerSettings.dailyResinBudget}
            onChange={(event) => void updatePlannerSettings({ dailyResinBudget: Number(event.target.value) })}
          />
        </label>
        <label>
          Current Resin
          <input
            type="number"
            min={0}
            value={plannerSettings.currentResin ?? 0}
            onChange={(event) => void updatePlannerSettings({ currentResin: Number(event.target.value) })}
          />
        </label>
        <label>
          Condensed Resin
          <input
            type="number"
            min={0}
            value={plannerSettings.condensedResinOwned ?? 0}
            onChange={(event) => void updatePlannerSettings({ condensedResinOwned: Number(event.target.value) })}
          />
        </label>
        <label>
          Fragile Resin
          <input
            type="number"
            min={0}
            value={plannerSettings.fragileResinOwned ?? 0}
            onChange={(event) => void updatePlannerSettings({ fragileResinOwned: Number(event.target.value) })}
          />
        </label>
        <label>
          Transient Resin
          <input
            type="number"
            min={0}
            value={plannerSettings.transientResinOwned ?? 0}
            onChange={(event) => void updatePlannerSettings({ transientResinOwned: Number(event.target.value) })}
          />
        </label>
        <label>
          Weekly discounts used
          <input
            type="number"
            min={0}
            max={3}
            value={plannerSettings.weeklyBossDiscountClaimsUsed ?? 0}
            onChange={(event) => void updatePlannerSettings({ weeklyBossDiscountClaimsUsed: Number(event.target.value) })}
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={plannerSettings.craftAwareEstimates ?? true}
            onChange={(event) => void updatePlannerSettings({ craftAwareEstimates: event.target.checked })}
          />
          Craft-aware estimates
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={plannerSettings.allowDustOfAzothConversion ?? false}
            onChange={(event) => void updatePlannerSettings({ allowDustOfAzothConversion: event.target.checked })}
          />
          Allow Dust of Azoth conversion
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={plannerSettings.showCraftingVarianceWarning ?? true}
            onChange={(event) => void updatePlannerSettings({ showCraftingVarianceWarning: event.target.checked })}
          />
          Show crafting RNG warnings
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={plannerSettings.assumeCondensedResinEquivalentForDomains ?? true}
            onChange={(event) => void updatePlannerSettings({ assumeCondensedResinEquivalentForDomains: event.target.checked })}
          />
          Count condensed-resin equivalent
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={plannerSettings.useHighestUnlockedDomain ?? true}
            onChange={(event) => void updatePlannerSettings({ useHighestUnlockedDomain: event.target.checked })}
          />
          Use highest unlocked domain
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={plannerSettings.includePrimogemRefillPlanning ?? false}
            onChange={(event) => void updatePlannerSettings({ includePrimogemRefillPlanning: event.target.checked })}
          />
          Include Primogem refill planning
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={plannerSettings.estimateOpenWorldEnemyDrops ?? false}
            onChange={(event) => void updatePlannerSettings({ estimateOpenWorldEnemyDrops: event.target.checked })}
          />
          Estimate open-world enemy drops
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
          checked={plannerSettings.includeArtifactGoals}
          onChange={(event) => void updatePlannerSettings({ includeArtifactGoals: event.target.checked })}
        />
          Include artifact goals
        </label>
        <label>
          Requirement crafting mode
          <select
            value={plannerSettings.craftingModeForRequirementSatisfaction ?? "guaranteed"}
            onChange={(event) =>
              void updatePlannerSettings({
                craftingModeForRequirementSatisfaction: event.target.value as "guaranteed" | "expected_value",
              })
            }
          >
            <option value="guaranteed">Guaranteed</option>
            <option value="expected_value">Expected value</option>
          </select>
        </label>
        <label>
          Resin crafting mode
          <select
            value={plannerSettings.craftingModeForResinEstimate ?? "expected_value"}
            onChange={(event) =>
              void updatePlannerSettings({
                craftingModeForResinEstimate: event.target.value as "guaranteed" | "expected_value",
              })
            }
          >
            <option value="guaranteed">Guaranteed</option>
            <option value="expected_value">Expected value</option>
          </select>
        </label>
        <PassiveOverrideSelect
          label="Talent passive"
          value={plannerSettings.craftingPassiveOverrides?.talentMaterials ?? ""}
          options={Object.values(staticData.craftingUtilityPassives)
            .filter((passive) => passive.appliesTo.includes("character_talent_material"))
            .map((passive) => ({ value: passive.key, label: passive.characterName }))}
          onChange={(value) =>
            void updatePlannerSettings({
              craftingPassiveOverrides: {
                ...(plannerSettings.craftingPassiveOverrides ?? {}),
                talentMaterials: value || null,
              },
            })
          }
        />
        <PassiveOverrideSelect
          label="Weapon passive"
          value={plannerSettings.craftingPassiveOverrides?.weaponAscensionMaterials ?? ""}
          options={Object.values(staticData.craftingUtilityPassives)
            .filter((passive) => passive.appliesTo.includes("weapon_ascension_material"))
            .map((passive) => ({ value: passive.key, label: passive.characterName }))}
          onChange={(value) =>
            void updatePlannerSettings({
              craftingPassiveOverrides: {
                ...(plannerSettings.craftingPassiveOverrides ?? {}),
                weaponAscensionMaterials: value || null,
              },
            })
          }
        />
        </div>
      </SectionCard>

      <SectionCard
        title="Weapon EXP planning"
        description="Weapon leveling now plans around Enhancement Ore tiers and Mystic Enhancement Ore forging instead of low-rarity weapon fodder."
      >
        <div className="metric-strip">
          <div className="metric-card">
            <span className="metric-label">Weapon EXP needed</span>
            <strong>{plannerOutput.weaponExpSummary.totalWeaponExpNeeded}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Mystic equivalent</span>
            <strong>{plannerOutput.weaponExpSummary.mysticEquivalentNeeded}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Owned ore EXP</span>
            <strong>{plannerOutput.weaponExpSummary.ownedWeaponExpValue}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Forgeable Mystic</span>
            <strong>{plannerOutput.weaponExpSummary.mysticForgeableFromCrystals}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Daily cap</span>
            <strong>{plannerOutput.weaponExpSummary.dailyMysticForgeCap}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Min daily resets</span>
            <strong>{plannerOutput.weaponExpSummary.minimumDailyResetsRequired}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Weapon Mora</span>
            <strong>{plannerOutput.weaponExpSummary.totalWeaponLevelingMoraNeeded}</strong>
          </div>
        </div>

        <div className="planner-controls">
          <div>
            <strong>Owned ore</strong>
            <div className="muted">
              Enhancement {plannerOutput.weaponExpSummary.enhancementOreOwned}, Fine {plannerOutput.weaponExpSummary.fineEnhancementOreOwned}, Mystic {plannerOutput.weaponExpSummary.mysticEnhancementOreOwned}
            </div>
            <div className="muted">
              Remaining after owned ore: {plannerOutput.weaponExpSummary.remainingWeaponExpAfterOwnedOre} Weapon EXP
            </div>
          </div>
          <div>
            <strong>Supported crystals</strong>
            <div className="muted">
              Crystal Chunk {plannerOutput.weaponExpSummary.crystalChunkOwned}, Rainbowdrop Crystal {plannerOutput.weaponExpSummary.rainbowdropCrystalOwned}, Condessence Crystal {plannerOutput.weaponExpSummary.condessenceCrystalOwned}
            </div>
            <div className="muted">
              Unforgeable Mystic-equivalent remainder: {plannerOutput.weaponExpSummary.remainingMysticEquivalentUnforgeable}
            </div>
          </div>
          <div>
            <strong>Ore route note</strong>
            <div className="muted">Ore veins respawn after {plannerOutput.weaponExpSummary.oreRespawnDays} days. Forging and ore gathering are non-resin.</div>
          </div>
        </div>

        <ul className="warning-list">
          {plannerOutput.weaponExpSummary.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </SectionCard>

      <WorkspaceTabs
        label="Planner views"
        activeTab={plannerView}
        onChange={(value) => {
          void setPlannerView(value);
        }}
        tabs={VIEW_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
      />

      {plannerView === "today" ? (
        <SectionCard
          title="Priority actions"
          description="The fastest answer to what you should farm next, based on today’s availability and the current active-account plan."
        >
          <ActivityTable rows={plannerOutput.today} />
        </SectionCard>
      ) : null}
      {plannerView === "week" ? (
        <SectionCard title="Availability view" description="Group recommendations by what is available now versus what should wait for another day or reset.">
          <AvailabilitySections groups={plannerOutput.byAvailability} />
        </SectionCard>
      ) : null}
      {plannerView === "materials" ? (
        <SectionCard title="Missing materials" description="Deterministic deficits first, with craft-aware and farming estimate details attached alongside them.">
          <MaterialTable plannerOutput={plannerOutput} />
        </SectionCard>
      ) : null}
      {plannerView === "character" ? (
        <SectionCard title="Goal plans" description="Review the per-character and per-goal planning breakdown without leaving the main planner page.">
          <CharacterPlans plannerOutput={plannerOutput} />
        </SectionCard>
      ) : null}
      {plannerView === "source" ? (
        <SectionCard title="By source" description="See domain, boss, ley line, and other farm groups as shared activity buckets instead of isolated material rows.">
          <AvailabilitySections groups={plannerOutput.bySource} />
        </SectionCard>
      ) : null}
    </PageShell>
  );
}

function ActivityTable({ rows }: { rows: PlannerOutput["today"] }) {
  const grouped = new Map<string, PlannerOutput["today"]>();
  const labels: Record<string, string> = {
    resin_gated: "Resin-Gated Activities",
    time_gated_non_resin: "Time-Gated / Daily-Capped Non-Resin",
    crafting: "Crafting Actions",
    open_world: "Open-World Farming",
    passive_incidental: "Passive / Incidental / Conversion",
  };

  for (const row of rows) {
    grouped.set(row.actionGroup, [...(grouped.get(row.actionGroup) ?? []), row]);
  }

  return (
    <div className="stack">
      {[...grouped.entries()].map(([groupKey, groupRows]) => (
        <article key={groupKey} className="availability-group">
          <h3>{labels[groupKey] ?? groupKey}</h3>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recommendation</th>
                  <th>Source</th>
                  <th>Reason</th>
                  <th>Related goals</th>
                  <th>Runs</th>
                  <th>Resin</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.sourceName ?? row.category}</td>
                    <td>
                      <div>{row.reason}</div>
                      {row.resinPerRun != null && row.estimatedRuns != null ? (
                        <div className="muted">
                          {row.estimatedRuns} run(s) × {row.resinPerRun} resin
                        </div>
                      ) : null}
                    </td>
                    <td>{row.relatedGoalKeys.join(", ") || "General"}</td>
                    <td>{row.estimatedRuns ?? "—"}</td>
                    <td>{row.resinLabel ?? (row.totalEstimatedResin != null ? String(row.totalEstimatedResin) : "No resin")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
      {rows.length === 0 ? <p className="muted">No planner rows yet. Import inventory and set goals first.</p> : null}
    </div>
  );
}

function AvailabilitySections({ groups }: { groups: Array<{ key: string; label: string; rows: PlannerRecommendation[] }> }) {
  return (
    <div className="stack">
      {groups.map((group) => (
        <article key={group.key} className="availability-group">
          <h3>{group.label}</h3>
          {group.rows.length ? (
            <ul className="ranked-list">
              {group.rows.map((row) => (
                <li key={row.id}>
                  <strong>{row.title}</strong>
                  <span>{row.reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No activities in this group.</p>
          )}
        </article>
      ))}
    </div>
  );
}

function MaterialTable({ plannerOutput }: { plannerOutput: PlannerOutput }) {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Key</th>
            <th>Family</th>
            <th>Enemy source</th>
            <th>Owned</th>
            <th>Craftable</th>
            <th>Craft Mora</th>
            <th>Passive</th>
            <th>Effective owned</th>
            <th>Needed</th>
            <th>Deficit</th>
            <th>Estimate source</th>
            <th>Runs</th>
            <th>Resin</th>
            <th>Days</th>
            <th>Weeks</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {plannerOutput.totalMissingByMaterial.map((row) => {
                  const estimate = plannerOutput.farmingEstimates.find(
                    (item) => item.materialKey === row.materialKey || item.relatedMaterialKeys?.includes(row.materialKey),
                  );
            const report = row.craftingReport;
            return (
            <tr key={row.materialKey}>
              <td>
                <strong>{row.displayName}</strong>
                {row.region ? <div className="muted">{row.region}</div> : null}
              </td>
              <td>{row.materialKey}</td>
              <td>{row.familyDisplayName ?? "—"}</td>
              <td>{row.sourceEnemyFamily ?? "—"}</td>
              <td>{row.owned}</td>
              <td>{row.craftableQuantity}</td>
              <td>{report?.guaranteedCrafting.moraCost ?? "—"}</td>
              <td>{report?.recommendedPassive?.characterName ?? "Auto"}</td>
              <td>{row.effectiveOwned}</td>
              <td>{row.needed}</td>
              <td>{row.effectiveDeficit}</td>
              <td>{estimate?.sourceType ?? "unknown"}</td>
              <td>{estimate?.estimatedRuns ?? "—"}</td>
              <td>{estimate?.estimatedResin ?? "—"}</td>
              <td>{estimate?.estimatedDaysNaturalResin?.toFixed(2) ?? "—"}</td>
              <td>{estimate?.weeklyGate?.estimatedWeeks ?? estimate?.estimatedWeeksNaturalResin?.toFixed(2) ?? "—"}</td>
              <td>
                <div>{row.sources[0]?.sourceName ?? "Unknown"}</div>
                {row.purchaseVendors?.length ? <div className="muted">Vendors: {row.purchaseVendors.join(", ")}</div> : null}
                {row.searchHint ? <div className="muted">{row.searchHint}</div> : null}
                {report?.warnings?.length ? <div className="muted">{report.warnings[0]}</div> : null}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CharacterPlans({ plannerOutput }: { plannerOutput: PlannerOutput }) {
  return (
      <div className="stack">
      <article className="availability-group">
        <h3>Crafting recommendations</h3>
        <ul className="ranked-list">
            {plannerOutput.craftingPlan.suggestions.map((suggestion) => (
              <li key={suggestion.outputMaterialKey}>
                <strong>{suggestion.outputDisplayName}</strong>
                <span>{suggestion.reason}</span>
              </li>
            ))}
          {plannerOutput.craftingPlan.suggestions.length === 0 ? <li>No craftable upgrades right now.</li> : null}
        </ul>
      </article>

      {plannerOutput.byCharacter.map((plan) => (
        <article key={plan.characterKey} className="availability-group">
          <h3>{plan.displayName}</h3>
          <p className="muted">Estimated Resin: {plan.estimatedResin}</p>
          {plan.breakdown.length ? (
            <ul className="ranked-list">
              {plan.breakdown.map((entry) => (
                <li key={`${plan.characterKey}-${entry.label}`}>
                  <strong>{entry.label}</strong>
                  <span>{Object.entries(entry.materialTotals).length} material type(s)</span>
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="ranked-list">
            {plan.missingSummary.map((row) => (
              <li key={row.materialKey}>
                <strong>{row.displayName}</strong>
                <span>{row.effectiveDeficit} deficit, {row.craftableQuantity} craftable</span>
              </li>
            ))}
            {plan.missingSummary.length === 0 ? <li>No shortages for this goal.</li> : null}
          </ul>
        </article>
      ))}
      {plannerOutput.byCharacter.length === 0 ? <p>No character plans yet.</p> : null}
    </div>
  );
}

function PassiveOverrideSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Auto-pick best</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
