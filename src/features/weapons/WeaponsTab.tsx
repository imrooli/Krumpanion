import { useMemo, useState } from "react";
import { StatusBadge, WorkspaceTabs } from "../../app/layoutPrimitives";
import {
  defaultPlanningMode,
  getGoalCurrentStateLabel,
  getLinkedWeaponInstanceId,
  getWeaponGoalId,
  getWeaponGoalTargetAscension,
  resolveWeaponGoalCurrentState,
} from "../../domain/goals/goalState";
import type { GoalPlanningMode, WeaponGoal } from "../../domain/goals/types";
import type { PlannerOutput } from "../../domain/planner/types";
import { getGoalTrackableWeapons } from "../../domain/staticData/targetability";
import { analyzeWeaponRefinementCollection, type WeaponRefinementEntry, type WeaponRefinementStatus } from "../../domain/weapons/refinementTracker";
import { selectActiveAccount, selectActiveGoals, selectActiveOwnership } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

interface WeaponsTabProps {
  plannerOutput: PlannerOutput;
}

const LEVEL_OPTIONS = [undefined, 20, 40, 50, 60, 70, 80, 90];
const ASCENSION_OPTIONS = [undefined, 0, 1, 2, 3, 4, 5, 6];

type WeaponsMode = "progression" | "refinement";
type ProgressionTabKey = "owned" | "prefarm" | "stale";
type WeaponBulkPresetKey = "lvl-80-a5" | "lvl-90-a6";
type OwnershipFilter = "all" | "planned" | "not_planned";

const WEAPON_BULK_PRESETS: Array<{
  key: WeaponBulkPresetKey;
  label: string;
  updates: Partial<WeaponGoal>;
}> = [
  { key: "lvl-80-a5", label: "Level 80 / Ascension 5", updates: { targetLevel: 80, targetAscensionPhase: 5 } },
  { key: "lvl-90-a6", label: "Level 90 / Ascension 6", updates: { targetLevel: 90, targetAscensionPhase: 6 } },
];

const REFINEMENT_STATUS_LABELS: Record<WeaponRefinementStatus, string> = {
  complete_r5: "Complete R5",
  ready_to_r5: "Ready to R5",
  upgrade_available: "Upgrade Available",
  missing_duplicates: "Missing Duplicates",
  single_copy_only: "Single Copy Only",
  not_owned: "Not Owned",
  unknown_or_untracked: "Unmatched",
};

const REFINEMENT_STATUS_ORDER: WeaponRefinementStatus[] = [
  "ready_to_r5",
  "upgrade_available",
  "missing_duplicates",
  "single_copy_only",
  "not_owned",
  "complete_r5",
  "unknown_or_untracked",
];

function buildWeaponSourceHints(staticData: ReturnType<typeof useAppStore.getState>["staticData"], weaponKey: string, manual: boolean): string[] {
  const profile = staticData.weaponMaterialProfiles[weaponKey];
  if (!profile) {
    return ["Missing profile"];
  }
  const hints: string[] = [];
  if (profile.weaponAscensionFamilyKey || profile.weaponAscensionMaterialFamily?.length) {
    hints.push("Weapon ascension domain");
  }
  if (profile.eliteEnemyDropFamilyId || profile.eliteEnemyFamilyKey || profile.eliteEnemyFamily?.length) {
    hints.push("Elite enemy");
  }
  if (profile.commonEnemyFamilyKey || profile.commonEnemyFamily?.length) {
    hints.push("Common enemy");
  }
  if (manual) {
    hints.push("Manual current state");
  }
  return hints;
}

function refinementStatusTone(status: WeaponRefinementStatus): "success" | "warning" | "accent" | "muted" {
  switch (status) {
    case "complete_r5":
      return "success";
    case "ready_to_r5":
      return "accent";
    case "upgrade_available":
    case "missing_duplicates":
    case "single_copy_only":
      return "warning";
    case "not_owned":
    case "unknown_or_untracked":
    default:
      return "muted";
  }
}

function refinementSort(left: WeaponRefinementEntry, right: WeaponRefinementEntry): number {
  return (
    REFINEMENT_STATUS_ORDER.indexOf(left.status) - REFINEMENT_STATUS_ORDER.indexOf(right.status) ||
    (right.rarity ?? 0) - (left.rarity ?? 0) ||
    String(left.weaponType ?? "").localeCompare(String(right.weaponType ?? "")) ||
    left.name.localeCompare(right.name)
  );
}

function getSafeWeaponGoalId(goal: WeaponGoal, fallback: string): string {
  return getWeaponGoalId(goal, fallback);
}

export function WeaponsTab({ plannerOutput }: WeaponsTabProps) {
  const account = useAppStore(selectActiveAccount);
  const ownership = useAppStore(selectActiveOwnership);
  const staticData = useAppStore((state) => state.staticData);
  const weaponGoals = useAppStore((state) => selectActiveGoals(state).weaponGoals);
  const createWeaponGoal = useAppStore((state) => state.createWeaponGoal);
  const updateWeaponGoal = useAppStore((state) => state.updateWeaponGoal);
  const resetWeaponGoal = useAppStore((state) => state.resetWeaponGoal);
  const bulkUpdateWeaponGoals = useAppStore((state) => state.bulkUpdateWeaponGoals);
  const [mode, setMode] = useState<WeaponsMode>("progression");
  const [progressionTab, setProgressionTab] = useState<ProgressionTabKey>("owned");
  const [search, setSearch] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [weaponTypeFilter, setWeaponTypeFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [selectedPresetKey, setSelectedPresetKey] = useState<WeaponBulkPresetKey>("lvl-80-a5");
  const [refinementWeaponTypeFilter, setRefinementWeaponTypeFilter] = useState("all");
  const [refinementRarityFilter, setRefinementRarityFilter] = useState("all");
  const [refinementStatusFilter, setRefinementStatusFilter] = useState<WeaponRefinementStatus | "all">("all");
  const [showCompletedR5, setShowCompletedR5] = useState(false);
  const [showNotOwned, setShowNotOwned] = useState(false);
  const [refinementSearch, setRefinementSearch] = useState("");

  const plansByGoalId = useMemo(
    () => Object.fromEntries(plannerOutput.byWeapon.map((plan) => [plan.goalKey, plan])),
    [plannerOutput.byWeapon],
  );

  const ownedWeapons = account?.weapons ?? [];
  const staleGoals = useMemo(
    () =>
      Object.values(weaponGoals)
        .filter((goal) => goal.useOwnedInstance && goal.linkStatus === "stale")
        .sort((left, right) => left.weaponKey.localeCompare(right.weaponKey)),
    [weaponGoals],
  );

  const progressableOwnedWeapons = useMemo(
    () =>
      ownedWeapons.filter((weapon) => {
        const record = staticData.weapons[weapon.weaponKey];
        return record?.rarity === 3 || record?.rarity === 4 || record?.rarity === 5;
      }),
    [ownedWeapons, staticData.weapons],
  );

  const prefarmCatalog = useMemo(() => getGoalTrackableWeapons(staticData), [staticData]);
  const ownedGoalByInstanceId = useMemo(
    () =>
      Object.values(weaponGoals).reduce<Record<string, WeaponGoal>>((accumulator, goal) => {
        const linkedInventoryInstanceId = getLinkedWeaponInstanceId(goal);
        if (goal.useOwnedInstance && linkedInventoryInstanceId) {
          accumulator[linkedInventoryInstanceId] = goal;
        }
        return accumulator;
      }, {}),
    [weaponGoals],
  );
  const prefarmGoalByWeaponKey = useMemo(
    () =>
      Object.values(weaponGoals).reduce<Record<string, WeaponGoal>>((accumulator, goal) => {
        if (!goal.useOwnedInstance) {
          accumulator[goal.weaponKey] = goal;
        }
        return accumulator;
      }, {}),
    [weaponGoals],
  );

  const filteredOwnedWeapons = useMemo(
    () =>
      progressableOwnedWeapons
        .filter((weapon) => {
          const goal = ownedGoalByInstanceId[weapon.weaponInstanceId];
          const weaponRecord = staticData.weapons[weapon.weaponKey];
          const displayName = weaponRecord?.displayName ?? weapon.weaponKey;
          const matchesSearch =
            displayName.toLowerCase().includes(search.toLowerCase()) ||
            weapon.weaponKey.toLowerCase().includes(search.toLowerCase());
          const matchesScope =
            ownershipFilter === "all" ||
            (ownershipFilter === "planned" && Boolean(goal)) ||
            (ownershipFilter === "not_planned" && !goal);
          const matchesWeaponType = weaponTypeFilter === "all" || weaponRecord?.weaponType === weaponTypeFilter;
          const matchesRarity = rarityFilter === "all" || String(weaponRecord?.rarity ?? "") === rarityFilter;
          return matchesSearch && matchesScope && matchesWeaponType && matchesRarity;
        })
        .sort((left, right) => {
          const leftRecord = staticData.weapons[left.weaponKey];
          const rightRecord = staticData.weapons[right.weaponKey];
          return (
            (rightRecord?.rarity ?? 0) - (leftRecord?.rarity ?? 0) ||
            (right.currentLevel - left.currentLevel) ||
            (right.currentAscension - left.currentAscension) ||
            (leftRecord?.displayName ?? left.weaponKey).localeCompare(rightRecord?.displayName ?? right.weaponKey)
          );
        }),
    [ownedGoalByInstanceId, ownershipFilter, progressableOwnedWeapons, rarityFilter, search, staticData.weapons, weaponTypeFilter],
  );

  const filteredPrefarmWeapons = useMemo(
    () =>
      prefarmCatalog
        .filter((weapon) => {
          const goal = prefarmGoalByWeaponKey[weapon.key];
          const matchesSearch =
            weapon.displayName.toLowerCase().includes(search.toLowerCase()) || weapon.key.toLowerCase().includes(search.toLowerCase());
          const matchesScope =
            ownershipFilter === "all" ||
            (ownershipFilter === "planned" && Boolean(goal)) ||
            (ownershipFilter === "not_planned" && !goal);
          const matchesWeaponType = weaponTypeFilter === "all" || weapon.weaponType === weaponTypeFilter;
          const matchesRarity = rarityFilter === "all" || String(weapon.rarity ?? "") === rarityFilter;
          return matchesSearch && matchesScope && matchesWeaponType && matchesRarity;
        })
        .sort((left, right) => {
          return (
            (right.rarity ?? 0) - (left.rarity ?? 0) ||
            String(left.weaponType ?? "").localeCompare(String(right.weaponType ?? "")) ||
            left.displayName.localeCompare(right.displayName)
          );
        }),
    [ownershipFilter, prefarmCatalog, prefarmGoalByWeaponKey, rarityFilter, search, weaponTypeFilter],
  );

  const selectedPreset = WEAPON_BULK_PRESETS.find((preset) => preset.key === selectedPresetKey) ?? WEAPON_BULK_PRESETS[0];
  const visibleSelectedGoalIds = selectedGoalIds.filter((goalId) => {
    if (progressionTab === "owned") {
      return filteredOwnedWeapons.some((weapon) => ownedGoalByInstanceId[weapon.weaponInstanceId]?.goalId === goalId);
    }
    if (progressionTab === "prefarm") {
      return filteredPrefarmWeapons.some((weapon) => prefarmGoalByWeaponKey[weapon.key]?.goalId === goalId);
    }
    return staleGoals.some((goal) => goal.goalId === goalId);
  });

  const refinementAnalysis = useMemo(
    () =>
      analyzeWeaponRefinementCollection({
        staticData,
        ownedWeapons,
        unmatchedWeapons: account?.unmatchedWeapons ?? [],
      }),
    [account?.unmatchedWeapons, ownedWeapons, staticData],
  );

  const filteredRefinementEntries = useMemo(() => {
    return [...refinementAnalysis.entries]
      .filter((entry) => {
        if (!showCompletedR5 && entry.status === "complete_r5") {
          return false;
        }
        if (!showNotOwned && entry.status === "not_owned") {
          return false;
        }
        if (refinementStatusFilter !== "all" && entry.status !== refinementStatusFilter) {
          return false;
        }
        if (refinementWeaponTypeFilter !== "all" && entry.weaponType !== refinementWeaponTypeFilter) {
          return false;
        }
        if (refinementRarityFilter !== "all" && String(entry.rarity ?? "") !== refinementRarityFilter) {
          return false;
        }
        if (
          refinementSearch &&
          !entry.name.toLowerCase().includes(refinementSearch.toLowerCase()) &&
          !entry.weaponKey.toLowerCase().includes(refinementSearch.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort(refinementSort);
  }, [
    refinementAnalysis.entries,
    refinementRarityFilter,
    refinementSearch,
    refinementStatusFilter,
    refinementWeaponTypeFilter,
    showCompletedR5,
    showNotOwned,
  ]);

  const refinementSections = useMemo(
    () =>
      REFINEMENT_STATUS_ORDER.map((status) => ({
        status,
        label: REFINEMENT_STATUS_LABELS[status],
        rows: filteredRefinementEntries.filter((entry) => entry.status === status),
      })).filter((section) => section.rows.length > 0),
    [filteredRefinementEntries],
  );

  async function applyWeaponPreset() {
    if (visibleSelectedGoalIds.length === 0) {
      return;
    }
    await bulkUpdateWeaponGoals(visibleSelectedGoalIds, selectedPreset.updates);
  }

  if (!account) {
    return (
      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Weapons</h2>
            <p>Import a GOOD account first to plan weapon progression and review refinement opportunities.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Weapons</h2>
          <p>Split weapon planning into explicit progression goals and a separate R5 collection tracker so upgrades and duplicate analysis stay easy to reason about.</p>
        </div>
      </div>

      <WorkspaceTabs
        label="Weapon workspace modes"
        activeTab={mode}
        onChange={(value) => setMode(value as WeaponsMode)}
        tabs={[
          { key: "progression", label: "Progression Goals", count: Object.keys(weaponGoals).length },
          { key: "refinement", label: "R5 Collection Tracker", count: refinementAnalysis.entries.length },
        ]}
      />

      {mode === "progression" ? (
        <>
          <WorkspaceTabs
            label="Weapon progression sections"
            activeTab={progressionTab}
            onChange={(value) => setProgressionTab(value as ProgressionTabKey)}
            tabs={[
              { key: "owned", label: "Owned instances", count: filteredOwnedWeapons.length },
              { key: "prefarm", label: "Unowned pre-farm", count: filteredPrefarmWeapons.length },
              { key: "stale", label: "Stale links", count: staleGoals.length },
            ]}
          />

          <div className="button-row wrap">
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                setSelectedGoalIds(
                  progressionTab === "owned"
                    ? filteredOwnedWeapons
                        .map((weapon) => ownedGoalByInstanceId[weapon.weaponInstanceId]?.goalId)
                        .filter((goalId): goalId is string => Boolean(goalId))
                    : progressionTab === "prefarm"
                      ? filteredPrefarmWeapons
                          .map((weapon) => prefarmGoalByWeaponKey[weapon.key]?.goalId)
                          .filter((goalId): goalId is string => Boolean(goalId))
                      : staleGoals.map((goal) => getSafeWeaponGoalId(goal, goal.weaponKey)),
                )
              }
            >
              Select visible goals
            </button>
            <button type="button" className="button-ghost" onClick={() => setSelectedGoalIds([])}>
              Clear selection
            </button>
            <label>
              Bulk preset
              <select value={selectedPresetKey} onChange={(event) => setSelectedPresetKey(event.target.value as WeaponBulkPresetKey)}>
                {WEAPON_BULK_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="button-primary" disabled={visibleSelectedGoalIds.length === 0} onClick={() => void applyWeaponPreset()}>
              Apply to {visibleSelectedGoalIds.length} goal(s)
            </button>
          </div>

          <div className="planner-controls">
            <label>
              Search
              <input className="text-input" placeholder="Search weapons" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label>
              Scope
              <select value={ownershipFilter} onChange={(event) => setOwnershipFilter(event.target.value as OwnershipFilter)}>
                <option value="all">All</option>
                <option value="planned">Planned</option>
                <option value="not_planned">Not planned</option>
              </select>
            </label>
            <label>
              Weapon Type
              <select value={weaponTypeFilter} onChange={(event) => setWeaponTypeFilter(event.target.value)}>
                <option value="all">All</option>
                {["Sword", "Polearm", "Claymore", "Bow", "Catalyst"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rarity
              <select value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)}>
                <option value="all">All</option>
                <option value="3">3-Star</option>
                <option value="4">4-Star</option>
                <option value="5">5-Star</option>
              </select>
            </label>
          </div>

          {progressionTab === "owned" ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Weapon</th>
                    <th>Status</th>
                    <th>Current</th>
                    <th>Targets</th>
                    <th>Source categories</th>
                    <th>Missing</th>
                    <th>Resin</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredOwnedWeapons.map((weapon) => {
                    const goal = ownedGoalByInstanceId[weapon.weaponInstanceId];
                    const goalId = goal ? getSafeWeaponGoalId(goal, weapon.weaponInstanceId) : weapon.weaponInstanceId;
                    const planningMode = goal?.planningMode ?? defaultPlanningMode(true);
                    const resolvedCurrent = goal
                      ? resolveWeaponGoalCurrentState(goal, ownership)
                      : {
                          source: "owned_import" as const,
                          state: {
                            weaponInstanceId: weapon.weaponInstanceId,
                            weaponKey: weapon.weaponKey,
                            currentLevel: weapon.currentLevel,
                            currentAscension: weapon.currentAscension,
                          },
                        };
                    const plan = goal ? plansByGoalId[goalId] : undefined;
                    const profile = staticData.weaponMaterialProfiles[weapon.weaponKey];
                    const hints = buildWeaponSourceHints(staticData, weapon.weaponKey, planningMode === "manual");
                    const displayName = staticData.weapons[weapon.weaponKey]?.displayName ?? weapon.weaponKey;

                    return (
                      <tr key={weapon.weaponInstanceId}>
                        <td>
                          <input
                            type="checkbox"
                            checked={goal ? selectedGoalIds.includes(goalId) : false}
                            disabled={!goal}
                            onChange={(event) =>
                              setSelectedGoalIds((current) =>
                                !goal
                                  ? current
                                  : event.target.checked
                                    ? [...new Set([...current, goalId])]
                                    : current.filter((currentGoalId) => currentGoalId !== goalId),
                              )
                            }
                          />
                        </td>
                        <td>
                          <strong>{displayName}</strong>
                          <div className="muted">{weapon.location || "Unequipped"}</div>
                          <div className="muted">Instance {weapon.weaponInstanceId}</div>
                        </td>
                        <td>
                          <div className="badge-row">
                            <StatusBadge tone="success">Owned</StatusBadge>
                            {goal ? <StatusBadge tone={goal.linkStatus === "stale" ? "warning" : "accent"}>{goal.linkStatus === "stale" ? "Stale link" : "Planned"}</StatusBadge> : null}
                            <StatusBadge tone={planningMode === "manual" ? "warning" : "muted"}>
                              {planningMode === "manual" ? "Manual current" : "Owned instance"}
                            </StatusBadge>
                            {!profile ? <StatusBadge tone="warning">Missing Profile</StatusBadge> : null}
                            {profile?.status === "needs_manual_review" ? <StatusBadge tone="warning">Manual Review</StatusBadge> : null}
                          </div>
                        </td>
                        <td>
                          <div>{getGoalCurrentStateLabel(resolvedCurrent.source)}</div>
                          <div className="muted">
                            Lv {resolvedCurrent.state.currentLevel} / A{resolvedCurrent.state.currentAscension}
                          </div>
                          <div className="muted">R{weapon.refinement ?? 1}</div>
                        </td>
                        <td className="goal-grid">
                          {goal ? (
                            <>
                              <select
                                value={planningMode}
                                onChange={(event) =>
                                  void updateWeaponGoal(goalId, goal.weaponKey, {
                                    planningMode: event.target.value as GoalPlanningMode,
                                    useOwnedInstance: true,
                                    linkedInventoryInstanceId: weapon.weaponInstanceId,
                                  })
                                }
                              >
                                <option value="owned">Owned</option>
                                <option value="manual">Manual</option>
                              </select>
                              <select
                                value={goal.targetLevel ?? ""}
                                onChange={(event) =>
                                  void updateWeaponGoal(goalId, goal.weaponKey, {
                                    targetLevel: event.target.value ? Number(event.target.value) : undefined,
                                    linkedInventoryInstanceId: weapon.weaponInstanceId,
                                  })
                                }
                              >
                                {LEVEL_OPTIONS.map((value) => (
                                  <option key={String(value)} value={value ?? ""}>
                                    Lv {value ?? "current"}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={getWeaponGoalTargetAscension(goal) ?? ""}
                                onChange={(event) =>
                                  void updateWeaponGoal(goalId, goal.weaponKey, {
                                    targetAscensionPhase: event.target.value ? Number(event.target.value) : undefined,
                                    linkedInventoryInstanceId: weapon.weaponInstanceId,
                                  })
                                }
                              >
                                {ASCENSION_OPTIONS.map((value) => (
                                  <option key={String(value)} value={value ?? ""}>
                                    A{value ?? "current"}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={goal.priority}
                                onChange={(event) =>
                                  void updateWeaponGoal(goalId, goal.weaponKey, {
                                    priority: Number(event.target.value),
                                    linkedInventoryInstanceId: weapon.weaponInstanceId,
                                  })
                                }
                              >
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <option key={value} value={value}>
                                    Priority {value}
                                  </option>
                                ))}
                              </select>
                              {planningMode === "manual" ? (
                                <>
                                  <select
                                    value={goal.currentOverride?.level ?? ""}
                                    onChange={(event) =>
                                      void updateWeaponGoal(goalId, goal.weaponKey, {
                                        linkedInventoryInstanceId: weapon.weaponInstanceId,
                                        currentOverride: {
                                          level: event.target.value ? Number(event.target.value) : undefined,
                                        },
                                      })
                                    }
                                  >
                                    {LEVEL_OPTIONS.map((value) => (
                                      <option key={`manual-level-${String(value)}`} value={value ?? ""}>
                                        Current Lv {value ?? "imported"}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={goal.currentOverride?.ascension ?? ""}
                                    onChange={(event) =>
                                      void updateWeaponGoal(goalId, goal.weaponKey, {
                                        linkedInventoryInstanceId: weapon.weaponInstanceId,
                                        currentOverride: {
                                          ascension: event.target.value ? Number(event.target.value) : undefined,
                                        },
                                      })
                                    }
                                  >
                                    {ASCENSION_OPTIONS.map((value) => (
                                      <option key={`manual-ascension-${String(value)}`} value={value ?? ""}>
                                        Current A{value ?? "imported"}
                                      </option>
                                    ))}
                                  </select>
                                </>
                              ) : null}
                            </>
                          ) : (
                            <div className="muted">No goal yet</div>
                          )}
                        </td>
                        <td>
                          <div className="badge-row">
                            {hints.map((hint) => (
                              <StatusBadge key={`${weapon.weaponInstanceId}-${hint}`} tone="muted">
                                {hint}
                              </StatusBadge>
                            ))}
                          </div>
                        </td>
                        <td>{plan?.missingSummary.slice(0, 3).map((row: PlannerOutput["byWeapon"][number]["missingSummary"][number]) => `${row.displayName}: ${row.effectiveDeficit}`).join(", ") || "No shortages"}</td>
                        <td>{plan?.estimatedResin ?? 0}</td>
                        <td>
                          {goal ? (
                            <button type="button" className="button-ghost" onClick={() => void resetWeaponGoal(goalId)}>
                              Reset
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() =>
                                void createWeaponGoal({
                                  weaponKey: weapon.weaponKey,
                                  linkedInventoryInstanceId: weapon.weaponInstanceId,
                                  linkedCharacterKey: weapon.equippedByCharacterId,
                                  useOwnedInstance: true,
                                })
                              }
                            >
                              Add goal
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOwnedWeapons.length === 0 ? (
                    <tr>
                      <td colSpan={9}>No owned 3-star, 4-star, or 5-star weapons match the current filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {progressionTab === "prefarm" ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Weapon</th>
                    <th>Status</th>
                    <th>Current</th>
                    <th>Targets</th>
                    <th>Source categories</th>
                    <th>Missing</th>
                    <th>Resin</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredPrefarmWeapons.map((weapon) => {
                    const goal = prefarmGoalByWeaponKey[weapon.key];
                    const goalId = goal ? getSafeWeaponGoalId(goal, `prefarm:${weapon.key}`) : `prefarm:${weapon.key}`;
                    const planningMode = goal?.planningMode ?? defaultPlanningMode(false);
                    const resolvedCurrent = goal
                      ? resolveWeaponGoalCurrentState(goal, ownership)
                      : {
                          source: "prefarm_baseline" as const,
                          state: {
                            weaponInstanceId: `prefarm:${weapon.key}`,
                            weaponKey: weapon.key,
                            currentLevel: 1,
                            currentAscension: 0,
                          },
                        };
                    const plan = goal ? plansByGoalId[goalId] : undefined;
                    const profile = staticData.weaponMaterialProfiles[weapon.key];
                    const hints = buildWeaponSourceHints(staticData, weapon.key, planningMode === "manual");

                    return (
                      <tr key={weapon.key}>
                        <td>
                          <input
                            type="checkbox"
                            checked={goal ? selectedGoalIds.includes(goalId) : false}
                            disabled={!goal}
                            onChange={(event) =>
                              setSelectedGoalIds((current) =>
                                !goal
                                  ? current
                                  : event.target.checked
                                    ? [...new Set([...current, goalId])]
                                    : current.filter((currentGoalId) => currentGoalId !== goalId),
                              )
                            }
                          />
                        </td>
                        <td>
                          <strong>{weapon.displayName}</strong>
                          <div className="muted">{weapon.key}</div>
                        </td>
                        <td>
                          <div className="badge-row">
                            <StatusBadge tone="muted">Pre-farm</StatusBadge>
                            {goal ? <StatusBadge tone="accent">Planned</StatusBadge> : null}
                            <StatusBadge tone={planningMode === "manual" ? "warning" : "muted"}>
                              {planningMode === "manual" ? "Manual current" : "Baseline"}
                            </StatusBadge>
                            {!profile ? <StatusBadge tone="warning">Missing Profile</StatusBadge> : null}
                            {profile?.status === "needs_manual_review" ? <StatusBadge tone="warning">Manual Review</StatusBadge> : null}
                          </div>
                        </td>
                        <td>
                          <div>{getGoalCurrentStateLabel(resolvedCurrent.source)}</div>
                          <div className="muted">
                            Lv {resolvedCurrent.state.currentLevel} / A{resolvedCurrent.state.currentAscension}
                          </div>
                        </td>
                        <td className="goal-grid">
                          {goal ? (
                            <>
                              <select
                                value={planningMode}
                                onChange={(event) =>
                                  void updateWeaponGoal(goalId, goal.weaponKey, {
                                    planningMode: event.target.value as GoalPlanningMode,
                                    useOwnedInstance: false,
                                  })
                                }
                              >
                                <option value="prefarm">Pre-farm</option>
                                <option value="manual">Manual</option>
                              </select>
                              <select
                                value={goal.targetLevel ?? ""}
                                onChange={(event) =>
                                  void updateWeaponGoal(goalId, goal.weaponKey, {
                                    targetLevel: event.target.value ? Number(event.target.value) : undefined,
                                  })
                                }
                              >
                                {LEVEL_OPTIONS.map((value) => (
                                  <option key={String(value)} value={value ?? ""}>
                                    Lv {value ?? "current"}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={getWeaponGoalTargetAscension(goal) ?? ""}
                                onChange={(event) =>
                                  void updateWeaponGoal(goalId, goal.weaponKey, {
                                    targetAscensionPhase: event.target.value ? Number(event.target.value) : undefined,
                                  })
                                }
                              >
                                {ASCENSION_OPTIONS.map((value) => (
                                  <option key={String(value)} value={value ?? ""}>
                                    A{value ?? "current"}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={goal.priority}
                                onChange={(event) =>
                                  void updateWeaponGoal(goalId, goal.weaponKey, {
                                    priority: Number(event.target.value),
                                  })
                                }
                              >
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <option key={value} value={value}>
                                    Priority {value}
                                  </option>
                                ))}
                              </select>
                              {planningMode === "manual" ? (
                                <>
                                  <select
                                    value={goal.currentOverride?.level ?? ""}
                                    onChange={(event) =>
                                      void updateWeaponGoal(goalId, goal.weaponKey, {
                                        currentOverride: {
                                          level: event.target.value ? Number(event.target.value) : undefined,
                                        },
                                      })
                                    }
                                  >
                                    {LEVEL_OPTIONS.map((value) => (
                                      <option key={`prefarm-manual-level-${String(value)}`} value={value ?? ""}>
                                        Current Lv {value ?? "prefarm"}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={goal.currentOverride?.ascension ?? ""}
                                    onChange={(event) =>
                                      void updateWeaponGoal(goalId, goal.weaponKey, {
                                        currentOverride: {
                                          ascension: event.target.value ? Number(event.target.value) : undefined,
                                        },
                                      })
                                    }
                                  >
                                    {ASCENSION_OPTIONS.map((value) => (
                                      <option key={`prefarm-manual-ascension-${String(value)}`} value={value ?? ""}>
                                        Current A{value ?? "prefarm"}
                                      </option>
                                    ))}
                                  </select>
                                </>
                              ) : null}
                            </>
                          ) : (
                            <div className="muted">No goal yet</div>
                          )}
                        </td>
                        <td>
                          <div className="badge-row">
                            {hints.map((hint) => (
                              <StatusBadge key={`${weapon.key}-${hint}`} tone="muted">
                                {hint}
                              </StatusBadge>
                            ))}
                          </div>
                        </td>
                        <td>{plan?.missingSummary.slice(0, 3).map((row: PlannerOutput["byWeapon"][number]["missingSummary"][number]) => `${row.displayName}: ${row.effectiveDeficit}`).join(", ") || "No shortages"}</td>
                        <td>{plan?.estimatedResin ?? 0}</td>
                        <td>
                          {goal ? (
                            <button type="button" className="button-ghost" onClick={() => void resetWeaponGoal(goalId)}>
                              Reset
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() =>
                                void createWeaponGoal({
                                  weaponKey: weapon.key,
                                  useOwnedInstance: false,
                                })
                              }
                            >
                              Add pre-farm goal
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPrefarmWeapons.length === 0 ? (
                    <tr>
                      <td colSpan={9}>No prefarm weapons match the current filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {progressionTab === "stale" ? (
            <div className="catalog-list">
              {staleGoals.map((goal) => {
                const goalId = getSafeWeaponGoalId(goal, goal.weaponKey);
                const displayName = staticData.weapons[goal.weaponKey]?.displayName ?? goal.weaponKey;
                const relinkOptions = progressableOwnedWeapons
                  .filter((weapon) => weapon.weaponKey === goal.weaponKey)
                  .sort((left, right) => right.currentLevel - left.currentLevel || right.currentAscension - left.currentAscension);
                return (
                  <article key={goalId} className="catalog-item">
                    <div>
                      <strong>{displayName}</strong>
                      <div className="muted">Goal {goalId}</div>
                      <div className="muted">
                        Target Lv {goal.targetLevel ?? "current"} / A{getWeaponGoalTargetAscension(goal) ?? "current"}
                      </div>
                      <div className="muted">The linked owned instance no longer exists in the latest GOOD import.</div>
                    </div>
                    <div className="button-row wrap">
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          if (!event.target.value) {
                            return;
                          }
                          void updateWeaponGoal(goalId, goal.weaponKey, {
                            linkedInventoryInstanceId: event.target.value,
                            useOwnedInstance: true,
                            planningMode: "owned",
                            linkStatus: "linked",
                          });
                        }}
                      >
                        <option value="">Relink to owned copy</option>
                        {relinkOptions.map((weapon) => (
                          <option key={weapon.weaponInstanceId} value={weapon.weaponInstanceId}>
                            Lv {weapon.currentLevel} / A{weapon.currentAscension} / R{weapon.refinement ?? 1} {weapon.location ? `• ${weapon.location}` : ""}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="button-ghost" onClick={() => void resetWeaponGoal(goalId)}>
                        Remove goal
                      </button>
                    </div>
                  </article>
                );
              })}
              {staleGoals.length === 0 ? <p className="muted">No stale owned-weapon links.</p> : null}
            </div>
          ) : null}
        </>
      ) : null}

      {mode === "refinement" ? (
        <>
          <div className="planner-controls">
            <label>
              Search
              <input
                className="text-input"
                placeholder="Search weapon name"
                value={refinementSearch}
                onChange={(event) => setRefinementSearch(event.target.value)}
              />
            </label>
            <label>
              Weapon Type
              <select value={refinementWeaponTypeFilter} onChange={(event) => setRefinementWeaponTypeFilter(event.target.value)}>
                <option value="all">All</option>
                {["Sword", "Polearm", "Claymore", "Bow", "Catalyst"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rarity
              <select value={refinementRarityFilter} onChange={(event) => setRefinementRarityFilter(event.target.value)}>
                <option value="all">All</option>
                <option value="3">3-Star</option>
                <option value="4">4-Star</option>
                <option value="5">5-Star</option>
              </select>
            </label>
            <label>
              Status
              <select value={refinementStatusFilter} onChange={(event) => setRefinementStatusFilter(event.target.value as WeaponRefinementStatus | "all")}>
                <option value="all">All</option>
                {REFINEMENT_STATUS_ORDER.filter((status) => status !== "unknown_or_untracked").map((status) => (
                  <option key={status} value={status}>
                    {REFINEMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={showCompletedR5} onChange={(event) => setShowCompletedR5(event.target.checked)} />
              Show completed R5
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={showNotOwned} onChange={(event) => setShowNotOwned(event.target.checked)} />
              Show not owned
            </label>
          </div>

          {refinementSections.map((section) => (
            <article key={section.status} className="panel">
              <div className="section-header">
                <div>
                  <h3>{section.label}</h3>
                  <p className="muted">{section.rows.length} weapon(s)</p>
                </div>
              </div>
              <div className="catalog-list">
                {section.rows.map((entry) => (
                  <article key={entry.weaponKey} className="catalog-item">
                    <div>
                      <strong>{entry.name}</strong>
                      <div className="muted">
                        {entry.weaponType ?? "Unknown type"} • {entry.rarity ? `${entry.rarity}-Star` : "Unknown rarity"}
                      </div>
                      <div className="muted">{entry.recommendation}</div>
                      {entry.warnings.length > 0 ? (
                        <ul className="warning-list">
                          {entry.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="badge-row">
                      <StatusBadge tone={refinementStatusTone(entry.status)}>{REFINEMENT_STATUS_LABELS[entry.status]}</StatusBadge>
                      <StatusBadge tone="muted">Best R{entry.bestOwnedRefinement ?? "—"}</StatusBadge>
                      <StatusBadge tone="muted">Duplicates {entry.duplicateCopiesAvailable}</StatusBadge>
                      <StatusBadge tone="muted">Possible R{entry.possibleNewRefinement ?? "—"}</StatusBadge>
                      <StatusBadge tone="muted">Needs {entry.missingCopiesToR5}</StatusBadge>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ))}

          {refinementSections.length === 0 ? <p className="muted">No refinement tracker rows match the current filters.</p> : null}

          {refinementAnalysis.unmatchedEntries.length > 0 ? (
            <article className="panel">
              <div className="section-header">
                <div>
                  <h3>Unmatched imported weapons</h3>
                  <p className="muted">These GOOD weapon instances could not be matched to the canonical weapon database, so they are excluded from the R5 tracker until the static catalog is patched.</p>
                </div>
              </div>
              <div className="catalog-list">
                {refinementAnalysis.unmatchedEntries.map((entry) => (
                  <article key={entry.weaponInstanceId} className="catalog-item">
                    <div>
                      <strong>{entry.importName}</strong>
                      <div className="muted">
                        Lv {entry.currentLevel} / A{entry.currentAscension} / R{entry.refinement}
                      </div>
                      <div className="muted">{entry.recommendation}</div>
                    </div>
                    <div className="badge-row">
                      <StatusBadge tone="warning">Unmatched</StatusBadge>
                      {entry.lock ? <StatusBadge tone="muted">Locked</StatusBadge> : null}
                      {entry.equippedByCharacterId ? <StatusBadge tone="muted">Equipped</StatusBadge> : null}
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
