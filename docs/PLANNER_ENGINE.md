# Planner Engine

Krumpanion's planner should be deterministic, fast, and separated from React components.

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
  totalMissingByMaterial: MaterialNeedRow[];
  byCharacter: CharacterPlan[];
  byWeapon: WeaponPlan[];
  artifactFarmGoals: ArtifactFarmPlan[];
  byAvailability: AvailabilityGroup[];
  today: PlannerActivityRow[];
  resinSummary: ResinSummary;
  warnings: PlannerWarning[];
};
```

## Calculation pipeline

1. Read the active account snapshot.
2. Read active account inventory, ownership, goals, and planner settings as separate inputs.
3. Normalize goals.
4. For each character goal:
   - calculate level/ascension materials missing
   - calculate each talent's materials missing
   - group into a character plan
5. For each weapon goal:
   - calculate weapon EXP/ascension materials missing
   - group into a weapon plan
6. For each artifact goal:
   - add as a Resin-budgeted farming plan, not a deterministic material shortage
7. Sum material requirements across all goals.
8. Subtract owned material quantities from the active account inventory.
9. Apply guaranteed or expected-value crafting coverage for estimation, without mutating deterministic requirements.
10. Attach source metadata:
   - domain
   - boss
   - ley line
   - weekly boss
   - day availability
   - Resin cost
11. Build source-level farming estimates:
   - deterministic requirements stay exact
   - inventory deficits stay exact
   - crafting-adjusted deficits feed the estimator
   - one activity claim can satisfy multiple related material deficits
12. Group by availability.
13. Build Planner tab rows.

## Core rule

A material calculator should never mutate inventory. It should only produce a plan.

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

## Display normalization

- Deterministic requirements and inventory quantities are integers.
- Crafting-adjusted deficits shown to users are clamped for floating-point noise and rounded up to the next whole unit when a positive fractional expected deficit remains.
- Tiny floating-point artifacts near zero are treated as zero and do not create actionable rows.
- Crafting suggestions only render when the useful crafted quantity is positive.
- Crafting suggestions cap displayed coverage to the useful deficit and never show negative coverage.
