import { useCallback, useMemo, useState } from "react";
import { StatusBadge } from "../../app/layoutPrimitives";
import { defaultPlanningMode, getGoalCurrentStateLabel, resolveCharacterGoalCurrentState } from "../../domain/goals/goalState";
import type { CharacterGoal } from "../../domain/goals/types";
import type { PlannerOutput } from "../../domain/planner/types";
import { getGoalPickableCharacters } from "../../domain/staticData/targetability";
import {
  getTravelerGoalLabel,
  isTravelerElementKey,
  isTravelerGoalKey,
  isTravelerSharedKey,
  TRAVELER_SHARED_KEY,
} from "../../domain/staticData/travelerRegistry";
import { selectActiveGoals, selectActiveOwnership } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

interface CharactersTabProps {
  plannerOutput: PlannerOutput;
}

const LEVEL_OPTIONS = [undefined, 20, 40, 50, 60, 70, 80, 90];
const ASCENSION_OPTIONS = [undefined, 0, 1, 2, 3, 4, 5, 6];
const TALENT_OPTIONS = [undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type OwnershipFilter = "all" | "owned" | "unowned" | "planned" | "not_planned";
type ProfileFilter = "all" | "missing_profile" | "manual_review";

const CHARACTER_BULK_PRESETS: Array<{ key: string; label: string; updates: Partial<CharacterGoal> }> = [
  { key: "lvl-80-a5", label: "Level 80 / Ascension 5", updates: { targetLevel: 80, targetAscension: 5 } },
  { key: "lvl-80-a6", label: "Level 80 / Ascension 6", updates: { targetLevel: 80, targetAscension: 6 } },
  { key: "lvl-90-a6", label: "Level 90 / Ascension 6", updates: { targetLevel: 90, targetAscension: 6 } },
  { key: "talent-666", label: "Talents 6/6/6", updates: { talents: { auto: 6, skill: 6, burst: 6 } } },
  { key: "talent-888", label: "Talents 8/8/8", updates: { talents: { auto: 8, skill: 8, burst: 8 } } },
  { key: "talent-999", label: "Talents 9/9/9", updates: { talents: { auto: 9, skill: 9, burst: 9 } } },
  { key: "talent-199", label: "Talents 1/9/9", updates: { talents: { auto: 1, skill: 9, burst: 9 } } },
  { key: "talent-101010", label: "Talents 10/10/10", updates: { talents: { auto: 10, skill: 10, burst: 10 } } },
];

function buildSourceCategoryHints(goal: CharacterGoal | undefined, staticData: ReturnType<typeof useAppStore.getState>["staticData"], characterKey: string): string[] {
  if (isTravelerSharedKey(characterKey)) {
    return ["Shared level", "Windwheel Aster", "Mask drops", "Brilliant Diamond"];
  }

  if (isTravelerElementKey(characterKey)) {
    const travelerElementProfile = staticData.travelerElementProfiles[characterKey];
    return [
      "Element talents",
      travelerElementProfile?.displayName.replace("Traveler: ", "").replace(" Talents", "") ?? "Traveler element",
      "Elemental talent books",
      "Weekly boss",
    ];
  }

  const profile = staticData.characterMaterialProfiles[characterKey];
  if (!profile) {
    return ["Missing profile"];
  }

  const labels: string[] = [];
  if (profile.normalBossMaterialKey || profile.normalBossMaterial) {
    labels.push("Normal boss");
  }
  if (profile.localSpecialtyKey || profile.localSpecialty) {
    labels.push("Local specialty");
  }
  if (profile.talentBookSeriesKey || profile.talentBookFamilyKey || profile.talentBookFamily?.length) {
    labels.push("Talent books");
  }
  if (profile.weeklyBossMaterialKey || profile.weeklyBossMaterial) {
    labels.push("Weekly boss");
  }
  if (profile.commonEnemyMaterialFamilyId || profile.enemyDropFamilyKey || profile.enemyDropFamily?.length) {
    labels.push("Common enemy");
  }
  if (goal?.planningMode === "manual") {
    labels.push("Manual current state");
  }
  return labels;
}

export function CharactersTab({ plannerOutput }: CharactersTabProps) {
  const ownership = useAppStore(selectActiveOwnership);
  const staticData = useAppStore((state) => state.staticData);
  const goals = useAppStore((state) => selectActiveGoals(state).characterGoals);
  const updateCharacterGoal = useAppStore((state) => state.updateCharacterGoal);
  const resetCharacterGoal = useAppStore((state) => state.resetCharacterGoal);
  const bulkUpdateCharacterGoals = useAppStore((state) => state.bulkUpdateCharacterGoals);
  const [search, setSearch] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [elementFilter, setElementFilter] = useState("all");
  const [weaponTypeFilter, setWeaponTypeFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const [selectedCharacterKeys, setSelectedCharacterKeys] = useState<string[]>([]);
  const [selectedPresetKey, setSelectedPresetKey] = useState(CHARACTER_BULK_PRESETS[0]?.key ?? "");

  const plansByCharacter = useMemo(
    () => Object.fromEntries(plannerOutput.byCharacter.map((plan) => [plan.characterKey, plan])),
    [plannerOutput.byCharacter],
  );

  const ownedCharacterKeys = useMemo(
    () => new Set(ownership.characters.map((character) => character.characterId)),
    [ownership.characters],
  );

  const isCharacterOwned = useCallback(
    (characterKey: string) =>
      ownedCharacterKeys.has(characterKey) ||
      (isTravelerElementKey(characterKey) && ownedCharacterKeys.has(TRAVELER_SHARED_KEY)),
    [ownedCharacterKeys],
  );

  const rows = useMemo(() => {
    return getGoalPickableCharacters(staticData).filter((character) => {
      const goal = goals[character.key];
      const owned = isCharacterOwned(character.key);
      const profile = staticData.characterMaterialProfiles[character.key];
      const label = character.displayName ?? character.key;
      const matchesSearch =
        label.toLowerCase().includes(search.toLowerCase()) || character.key.toLowerCase().includes(search.toLowerCase());
      const matchesOwnership =
        ownershipFilter === "all" ||
        (ownershipFilter === "owned" && owned) ||
        (ownershipFilter === "unowned" && !owned) ||
        (ownershipFilter === "planned" && Boolean(goal)) ||
        (ownershipFilter === "not_planned" && !goal);
      const matchesElement = elementFilter === "all" || character.element === elementFilter;
      const matchesWeaponType = weaponTypeFilter === "all" || character.weaponType === weaponTypeFilter;
      const matchesRarity = rarityFilter === "all" || String(character.rarity ?? "") === rarityFilter;
      const matchesProfile =
        profileFilter === "all" ||
        (profileFilter === "missing_profile" && !profile) ||
        (profileFilter === "manual_review" && profile?.status === "needs_manual_review");

      return matchesSearch && matchesOwnership && matchesElement && matchesWeaponType && matchesRarity && matchesProfile;
    }).sort((left, right) => {
      const leftTraveler = isTravelerGoalKey(left.key) ? 0 : 1;
      const rightTraveler = isTravelerGoalKey(right.key) ? 0 : 1;
      return leftTraveler - rightTraveler || (getTravelerGoalLabel(left.key) ?? left.displayName).localeCompare(getTravelerGoalLabel(right.key) ?? right.displayName);
    });
  }, [elementFilter, goals, isCharacterOwned, ownershipFilter, profileFilter, rarityFilter, search, staticData, weaponTypeFilter]);

  const selectedVisibleCharacterKeys = selectedCharacterKeys.filter((characterKey) =>
    rows.some((row) => row.key === characterKey && Boolean(goals[characterKey])),
  );
  const selectedPreset = CHARACTER_BULK_PRESETS.find((preset) => preset.key === selectedPresetKey) ?? CHARACTER_BULK_PRESETS[0];

  async function applyCharacterPreset() {
    if (!selectedPreset || selectedVisibleCharacterKeys.length === 0) {
      return;
    }
    if (!window.confirm(`Apply ${selectedPreset.label} to ${selectedVisibleCharacterKeys.length} character goal(s)?`)) {
      return;
    }
    await bulkUpdateCharacterGoals(selectedVisibleCharacterKeys, selectedPreset.updates);
  }

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Characters</h2>
          <p>Plan owned or unowned characters. Prefarm goals use a level 1, ascension 0, talent 1-1-1 baseline until you provide imported or manual current state.</p>
          <p className="muted">Traveler is grouped as one shared level goal plus separate elemental talent goals.</p>
        </div>
      </div>

      <div className="button-row wrap">
        <button
          type="button"
          className="button-secondary"
          onClick={() =>
            setSelectedCharacterKeys(rows.filter((character) => Boolean(goals[character.key])).map((character) => character.key))
          }
        >
          Select visible goals
        </button>
        <button type="button" className="button-ghost" onClick={() => setSelectedCharacterKeys([])}>
          Clear selection
        </button>
        <label>
          Character preset
          <select value={selectedPresetKey} onChange={(event) => setSelectedPresetKey(event.target.value)}>
            {CHARACTER_BULK_PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button-primary"
          disabled={selectedVisibleCharacterKeys.length === 0}
          onClick={() => void applyCharacterPreset()}
        >
          Apply to {selectedVisibleCharacterKeys.length} goal(s)
        </button>
      </div>

      <div className="planner-controls">
        <label>
          Search
          <input className="text-input" placeholder="Search characters" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          Scope
          <select value={ownershipFilter} onChange={(event) => setOwnershipFilter(event.target.value as OwnershipFilter)}>
            <option value="all">All</option>
            <option value="owned">Owned</option>
            <option value="unowned">Unowned</option>
            <option value="planned">Planned</option>
            <option value="not_planned">Not planned</option>
          </select>
        </label>
        <label>
          Element
          <select value={elementFilter} onChange={(event) => setElementFilter(event.target.value)}>
            <option value="all">All</option>
            {["Anemo", "Cryo", "Dendro", "Electro", "Geo", "Hydro", "Pyro"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
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
            <option value="4">4★</option>
            <option value="5">5★</option>
          </select>
        </label>
        <label>
          Profile
          <select value={profileFilter} onChange={(event) => setProfileFilter(event.target.value as ProfileFilter)}>
            <option value="all">All</option>
            <option value="missing_profile">Missing profile</option>
            <option value="manual_review">Manual review</option>
          </select>
        </label>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Character</th>
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
            {rows.map((character) => {
              const goal = goals[character.key];
              const owned = isCharacterOwned(character.key);
              const planningMode = goal?.planningMode ?? defaultPlanningMode(owned);
              const resolvedCurrent = resolveCharacterGoalCurrentState(
                {
                  characterKey: character.key,
                  enabled: goal?.enabled ?? false,
                  priority: goal?.priority ?? 3,
                  planningMode,
                  targetLevel: goal?.targetLevel,
                  targetAscension: goal?.targetAscension,
                  talents: goal?.talents,
                  currentOverride: goal?.currentOverride,
                },
                ownership,
              );
              const profile = staticData.characterMaterialProfiles[character.key];
              const plan = plansByCharacter[character.key];
              const sourceHints = buildSourceCategoryHints(goal, staticData, character.key);
              const travelerLabel = getTravelerGoalLabel(character.key);
              const isTravelerShared = isTravelerSharedKey(character.key);
              const isTravelerElement = isTravelerElementKey(character.key);
              const displayName = travelerLabel ?? character.displayName;

              return (
                <tr key={character.key}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${displayName} goal`}
                      checked={selectedCharacterKeys.includes(character.key)}
                      disabled={!goal}
                      onChange={(event) =>
                        setSelectedCharacterKeys((current) =>
                          event.target.checked
                            ? [...new Set([...current, character.key])]
                            : current.filter((key) => key !== character.key),
                        )
                      }
                    />
                  </td>
                  <td>
                    <strong>{displayName}</strong>
                    <div className="muted">{character.key}</div>
                  </td>
                  <td>
                    <div className="badge-row">
                      <StatusBadge tone={owned ? "success" : "muted"}>{owned ? "Owned" : "Unowned"}</StatusBadge>
                      <StatusBadge tone={planningMode === "prefarm" ? "accent" : planningMode === "manual" ? "warning" : "muted"}>
                        {planningMode === "prefarm" ? "Pre-farm" : planningMode === "manual" ? "Manual" : "Owned"}
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
                    <div className="muted">
                      Talents {resolvedCurrent.state.currentTalents.normal}/{resolvedCurrent.state.currentTalents.skill}/{resolvedCurrent.state.currentTalents.burst}
                    </div>
                  </td>
                  <td className="goal-grid">
                    <select
                      aria-label={`Planning mode for ${displayName}`}
                      value={planningMode}
                      onChange={(event) =>
                        void updateCharacterGoal(character.key, {
                          characterKey: character.key,
                          planningMode: event.target.value as CharacterGoal["planningMode"],
                        })
                      }
                    >
                      <option value="owned">Owned</option>
                      <option value="prefarm">Pre-farm</option>
                      <option value="manual">Manual</option>
                    </select>
                    {!isTravelerElement ? (
                      <>
                        <select
                          value={goal?.targetLevel ?? ""}
                          onChange={(event) =>
                            void updateCharacterGoal(character.key, {
                              characterKey: character.key,
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
                          value={goal?.targetAscension ?? ""}
                          onChange={(event) =>
                            void updateCharacterGoal(character.key, {
                              characterKey: character.key,
                              targetAscension: event.target.value ? Number(event.target.value) : undefined,
                            })
                          }
                        >
                          {ASCENSION_OPTIONS.map((value) => (
                            <option key={String(value)} value={value ?? ""}>
                              A{value ?? "current"}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : null}
                    {!isTravelerShared ? (
                      (["auto", "skill", "burst"] as const).map((talentKey) => (
                        <select
                          key={talentKey}
                          value={goal?.talents?.[talentKey] ?? ""}
                          onChange={(event) =>
                            void updateCharacterGoal(character.key, {
                              characterKey: character.key,
                              talents: {
                                [talentKey]: event.target.value ? Number(event.target.value) : undefined,
                              },
                            })
                          }
                        >
                          {TALENT_OPTIONS.map((value) => (
                            <option key={String(value)} value={value ?? ""}>
                              {talentKey} {value ?? "current"}
                            </option>
                          ))}
                        </select>
                      ))
                    ) : (
                      <div className="muted">Traveler talents are tracked in the elemental rows below.</div>
                    )}
                    {planningMode === "manual" ? (
                      <>
                        <div className="muted">Manual current state</div>
                        {!isTravelerElement ? (
                          <>
                            <select
                              value={goal?.currentOverride?.level ?? ""}
                              onChange={(event) =>
                                void updateCharacterGoal(character.key, {
                                  characterKey: character.key,
                                  currentOverride: {
                                    level: event.target.value ? Number(event.target.value) : undefined,
                                  },
                                })
                              }
                            >
                              {LEVEL_OPTIONS.map((value) => (
                                <option key={`current-level-${String(value)}`} value={value ?? ""}>
                                  Current Lv {value ?? "owned/prefarm"}
                                </option>
                              ))}
                            </select>
                            <select
                              value={goal?.currentOverride?.ascension ?? ""}
                              onChange={(event) =>
                                void updateCharacterGoal(character.key, {
                                  characterKey: character.key,
                                  currentOverride: {
                                    ascension: event.target.value ? Number(event.target.value) : undefined,
                                  },
                                })
                              }
                            >
                              {ASCENSION_OPTIONS.map((value) => (
                                <option key={`current-ascension-${String(value)}`} value={value ?? ""}>
                                  Current A{value ?? "owned/prefarm"}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <div className="muted">Shared Traveler level still comes from the shared Traveler row or GOOD import.</div>
                        )}
                        {!isTravelerShared
                          ? (["auto", "skill", "burst"] as const).map((talentKey) => (
                              <select
                                key={`current-talent-${talentKey}`}
                                value={goal?.currentOverride?.talents?.[talentKey] ?? ""}
                                onChange={(event) =>
                                  void updateCharacterGoal(character.key, {
                                    characterKey: character.key,
                                    currentOverride: {
                                      talents: {
                                        [talentKey]: event.target.value ? Number(event.target.value) : undefined,
                                      },
                                    },
                                  })
                                }
                              >
                                {TALENT_OPTIONS.map((value) => (
                                  <option key={`current-talent-${talentKey}-${String(value)}`} value={value ?? ""}>
                                    Current {talentKey} {value ?? "owned/prefarm"}
                                  </option>
                                ))}
                              </select>
                            ))
                          : null}
                      </>
                    ) : null}
                  </td>
                  <td>
                    <div className="badge-row">
                      {sourceHints.map((hint) => (
                        <StatusBadge key={`${character.key}-${hint}`} tone="muted">
                          {hint}
                        </StatusBadge>
                      ))}
                    </div>
                  </td>
                  <td>{plan?.missingSummary.slice(0, 3).map((row) => `${row.displayName}: ${row.effectiveDeficit}`).join(", ") || "No shortages"}</td>
                  <td>{plan?.estimatedResin ?? 0}</td>
                  <td>
                    {goal ? (
                      <button type="button" className="button-ghost" onClick={() => void resetCharacterGoal(character.key)}>
                        Reset
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() =>
                          void updateCharacterGoal(character.key, {
                            characterKey: character.key,
                            planningMode: defaultPlanningMode(owned),
                            enabled: true,
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9}>No characters match the current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
