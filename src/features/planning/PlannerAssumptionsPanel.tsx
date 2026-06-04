import type { StaticGameData } from "../../domain/staticData/types";
import { selectActivePlannerSettings } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

interface PlannerAssumptionsPanelProps {
  staticData: StaticGameData;
}

export function PlannerAssumptionsPanel({ staticData }: PlannerAssumptionsPanelProps) {
  const plannerSettings = useAppStore(selectActivePlannerSettings);
  const updatePlannerSettings = useAppStore((state) => state.updatePlannerSettings);

  return (
    <article className="panel">
      <div className="section-header">
        <div>
          <h2>Calculator Assumptions</h2>
          <p className="muted">Set world, domain, resin, and crafting assumptions once for the whole planning run.</p>
        </div>
      </div>

      <div className="goal-card-grid">
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
          Weekly Discounts Used
          <input
            type="number"
            min={0}
            max={3}
            value={plannerSettings.weeklyBossDiscountClaimsUsed ?? 0}
            onChange={(event) => void updatePlannerSettings({ weeklyBossDiscountClaimsUsed: Number(event.target.value) })}
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
          Requirement Crafting
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
          Resin Crafting
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

      <div className="button-row wrap">
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
          Allow Dust of Azoth
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
          Include Primogem refills
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={plannerSettings.estimateOpenWorldEnemyDrops ?? false}
            onChange={(event) => void updatePlannerSettings({ estimateOpenWorldEnemyDrops: event.target.checked })}
          />
          Estimate open-world enemy drops
        </label>
      </div>
    </article>
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
