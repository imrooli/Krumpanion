# Planner Engine

Krumpanion's planner should be deterministic, fast, and separated from React components.

## Static data source

The planner now reads game data through the normalized static-data layer built from the
canonical database in `src/data/database/`.

Runtime loading order:

1. Load the canonical database from `src/data/database/index.ts`.
2. Validate the canonical database.
3. Normalize the canonical records into the runtime `StaticGameData` shape.
4. Apply validated override packs on top of canonical keys.
5. Build derived lookup indexes used by planner and UI selectors.

The planner must not read or depend on:

- generated copied-table outputs as runtime truth
- discovered runtime catalogs as runtime truth
- raw scraped table rows
- name-based fallback guesses
- one-off hardcoded planner fixes for missing character or material data

If a planner-critical relationship is missing from canonical data, that is a database validation
issue or planner warning. The planner should not silently guess.

## Inputs

```ts
type PlannerInput = {
  inventory: Record<string, number>;
  ownership: {
    characters: OwnedCharacter[];
    weapons: OwnedWeapon[];
    artifacts: OwnedArtifact[];
  };
  goals: KrumpanionGoals;
  staticData: StaticGameData;
  today: DayOfWeek;
  resinSettings: ResinSettings;
};
```

The planner always reads from the active account. It must not read global inventory, global goals, or stale data from a previously active account.

## Outputs

```ts
type PlannerOutput = {
  deterministicRequirements: DeterministicRequirement[];
  inventoryCoverage: InventoryCoverage[];
  materialDeficits: MaterialDeficit[];
  totalMissingByMaterial: MaterialNeedRow[];
  byCharacter: CharacterPlan[];
  byWeapon: WeaponPlan[];
  artifactFarmGoals: ArtifactFarmPlan[];
  byAvailability: AvailabilityGroup[];
  today: PlannerRecommendation[];
  resinSummary: ResinSummary;
  plannerReport: PlannerReport;
  warnings: PlannerWarning[];
};
```

## Calculation pipeline

1. Read the active account snapshot.
2. Read active account inventory, ownership, goals, and planner settings as separate inputs.
3. Read normalized static game data derived from the canonical database.
4. Normalize goals.
5. For each character goal:
   - calculate level/ascension materials missing
   - calculate each talent's materials missing
   - group into a character plan
6. For each weapon goal:
   - calculate weapon EXP/ascension materials missing
   - group into a weapon plan
7. For each artifact goal:
   - add as a Resin-budgeted farming plan, not a deterministic material shortage
8. Sum material requirements across all goals.
9. Build deterministic inventory coverage from the active account inventory only.
10. Apply guaranteed crafting coverage to exact deficits and expected-value crafting coverage only to estimate-side resin projections.
11. Build exact non-negative material deficits.
12. Attach source metadata:
   - domain
   - boss
   - ley line
   - weekly boss
   - day availability
   - Resin cost
13. Build source-level farming estimates:
   - deterministic requirements stay exact
   - inventory deficits stay exact
   - crafting-adjusted deficits feed the estimator
   - one activity claim can satisfy multiple related material deficits
14. Group by availability and source section.
15. Build Planner tab rows.

## Core rule

A material calculator should never mutate inventory. It should only produce a plan.

## Canonical relationship rules

Planner relationships are resolved through canonical normalized profiles:

- character profile -> local specialty
- character profile -> common enemy family
- character profile -> normal boss material
- character profile -> weekly boss material
- character profile -> talent book family
- character profile -> elemental gem family
- weapon profile -> weapon ascension family
- weapon profile -> elite enemy family
- weapon profile -> common enemy family

Traveler remains a special-case profile and is resolved through the dedicated Traveler data path
instead of a normal single-element character profile.

## Account scoping rule

- Inventory, ownership, goals, planner settings, world state, and import metadata are account-scoped.
- Static data, override packs, and health reports are global.
- Any new planner selector or cache key must include the active account identity when it depends on account-owned data.
- Direct and bulk material edits update the active account inventory map in place, so planner recalculation must invalidate whenever those quantities change.

## Inventory editing rule

- Planner math reads the active account inventory directly; it does not read a separate manual-delta layer.
- GOOD re-import for an account replaces that account's imported inventory snapshot.
- Manual edit metadata is for UI hints and auditability only; it is not a second source of inventory truth.

## Material grouping

For each missing material, store:

```ts
type MaterialNeedRow = {
  materialKey: string;
  needed: number;
  owned: number;
  missing: number;
  category:
    | "mora"
    | "character_exp"
    | "character_ascension"
    | "talent_book"
    | "weapon_ascension"
    | "enemy_drop"
    | "weekly_boss"
    | "local_specialty"
    | "gemstone"
    | "artifact_domain"
    | "other";
  usedBy: Array<{
    goalType: "character" | "talent" | "weapon" | "artifact";
    key: string;
    amount: number;
  }>;
  sources: MaterialSource[];
};
```

## Availability grouping

```ts
type AvailabilityGroupKey =
  | "MON_THU_SUN"
  | "TUE_FRI_SUN"
  | "WED_SAT_SUN"
  | "ALWAYS"
  | "WEEKLY"
  | "UNKNOWN";
```

Sunday should show all rotating talent/weapon domain materials.

## Priority calculation

Planner Priority is now grouped by actionable activity first, then sorted within each group:

1. Resin-Gated Activities
   - Blossom of Wealth
   - Blossom of Revelation
   - Domains of Mastery
   - Domains of Forgery
   - Normal Bosses driven by unique boss materials only
   - Weekly Bosses driven by weekly talent materials
2. Time-Gated / Daily-Capped Non-Resin
   - Mystic Enhancement Ore forging
   - crystal / ore collection notes
3. Crafting Actions
4. Open-World Farming
5. Passive / Incidental / Conversion

Within the Resin-Gated group, rows are sorted by total estimated Resin descending, then estimated runs, then title.

The Priority table's Resin column shows total estimated Resin for the recommendation. Per-run Resin belongs in detail text only, for example `435 runs x 20 resin`.

The internal score still starts from:

```txt
priorityScore =
  explicitGoalPriority * 100
  + isFarmableToday * 25
  + sharedByGoalCount * 10
  + resinEfficiencyHint
  - blockedByWeeklyLimitPenalty
```

Keep this configurable later.

## Planner layers

Krumpanion now keeps four layers separate:

1. Deterministic requirements
   - Exact character, weapon, talent, EXP, Mora, and ascension costs.
2. Inventory deficits
   - Exact requirements minus the active account inventory.
3. Crafting-adjusted deficits
   - Exact deficits after guaranteed same-family crafting, and optionally expected-value passives for estimation.
4. Source-level farming estimates
   - Estimated activity claims and Resin based on source-level drop models.

Changing world level, domain level, or estimate settings must never change deterministic requirements.

Current planner typing is organized around these ideas:

1. `DeterministicRequirement`
   - Exact pre-inventory costs only.
2. `InventoryCoverage`
   - Exact account-scoped subtraction with zero-clamped remaining quantities.
3. `MaterialDeficit`
   - Exact post-inventory and post-guaranteed-crafting remaining material quantities.
4. `LootTableModel`
   - Canonical activity/source reward model with data-quality metadata.
5. `SourceEstimate`
   - Grouped runs, actionable runs, Resin, and warnings for one activity.
6. `PlannerRecommendationSection`
   - User-facing grouped sections for the Planner tab.
7. `PlannerReport`
   - Summary, grouped sections, and warnings built from source estimates.

## Resin estimates

Krumpanion now uses local static drop tables and source-aware grouping for estimates.

Examples:
- Domain of Mastery: 20 Resin
- Domain of Forgery: 20 Resin
- Artifact Domain: 20 Resin
- Normal Boss: 40 Resin
- Ley Line: 20 Resin
- Weekly Boss: first 3 discounted claims at 30 Resin, later claims at 60 Resin

Important estimator rules:

- Mora deficits are grouped into one Blossom of Wealth estimate.
- Character EXP material deficits are converted into total EXP value, then grouped into one Blossom of Revelation estimate.
- Talent book domains are estimated at the family/domain level, not one Resin total per tier.
- Weapon ascension domains are estimated at the family/domain level, not one Resin total per tier.
- Normal Boss Resin is driven only by missing unique boss materials.
- Character Ascension Gems remain deterministic requirements and crafting-aware deficits, but are not default direct Resin-farming targets.
- Gem-only deficits surface as passive/incidental/crafting advisories by default.
- Weekly boss estimates use target-specific mean drops and once-per-boss-per-week scheduling.
- Open-world enemy drops, local specialties, forging ores, and Mystic forging do not contribute to total estimated Resin.

## World Level 9 handling

World Level 9 is supported explicitly, but some sources still rely on conservative or inferred modeling:

- Normal bosses:
  - use a conservative estimate of `3` unique boss materials per claim
  - do not reuse the WL8 mean of `2.5556`
  - warn that the chance of a 4th drop is not modeled exactly
- Weekly bosses:
  - use a conservative total of `2` weekly talent drops per claim
  - assume equal distribution across the boss's `3` weekly materials
  - therefore estimate `2/3` target-specific material per claim unless better data is added
- Open-world enemies:
  - WL9 exact drop improvements are not fully modeled
  - route guidance may use a WL8 baseline with a warning

These warnings belong to the estimate layer and must remain visible in the Planner UI.

## Planner UI grouping

The Planner tab now treats `plannerReport` as the primary UI contract and renders a
today-focused dashboard plus a dedicated weekly domain schedule inside the same workspace,
instead of relying on the older `today | week | materials | character | source` table split.

The dashboard uses a presentation adapter to:

- repartition overlapping engine sections into exclusive UI sections
- deduplicate repeated warning text
- recompute readable goal labels when a row is missing them
- keep PlannerReport math intact while improving display structure

Grouped recommendation rows now surface clearer activity buckets:

- Today's Resin Activities
- Bosses
- Ley Lines
- Domains of Mastery available today
- Domains of Forgery available today
- This Week domain schedule grouped by availability day
- Weekly Resin Activities
- Crafting / Conversion
- Forging
- Open-World Enemy Farming
- Local Specialties
- Passive / Incidental
- Unknown / Missing Estimate Data

Displayed Resin semantics:

- `estimatedRuns`
  - decimal expected-value run estimate
- `actionableRuns`
  - rounded-up run or claim count the user can actually act on
- `resinPerRun`
  - one-claim Resin cost when applicable
- `totalEstimatedResin`
  - `actionableRuns * resinPerRun` for standard Resin-gated activities

No-resin activities must display `No resin`, never `?`.

The deep deterministic tables still belong in the calculator-oriented Planning workspace, not the
main Planner dashboard.

## Planner day estimates

The engine already provides the raw ingredients for lightweight UI time estimates:

- `totalEstimatedResin`
- `estimatedDaysNaturalResin`
- weekly gate metadata
- domain availability
- forging daily reset counts

The Planner UI adapter may derive:

- total estimated Resin days
- a conservative time-gated completion estimate
- per-row day labels
- earliest completion labels for rotating domains

The UI adapter must not change the underlying deterministic planner math when deriving these labels.

## Display normalization

- Deterministic requirements and inventory quantities are integers.
- Crafting-adjusted deficits shown to users are clamped for floating-point noise and rounded up to the next whole unit when a positive fractional expected deficit remains.
- Tiny floating-point artifacts near zero are treated as zero and do not create actionable rows.
- Crafting suggestions only render when the useful crafted quantity is positive.
- Crafting suggestions cap displayed coverage to the useful deficit and never show negative coverage.
