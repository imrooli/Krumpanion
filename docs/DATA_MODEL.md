# Data Model

## Canonical static database

Krumpanion now has one codified source of truth for game data:

`src/data/database/`

Canonical records are stored there, mostly as JSON, with TypeScript only for:
- schemas
- validation
- indexing
- normalization into the runtime `StaticGameData` shape

Deprecated runtime-era sources such as `src/data/runtime/**`, `src/data/runtime/generated/**`, and copied table outputs are no longer loaded as normal runtime truth.

Runtime assembly order:
1. `canonicalDatabase` from `src/data/database/index.ts`
2. canonical validation
3. canonical-to-`StaticGameData` normalization
4. override application
5. derived lookup indexes

## Canonical database shape

Primary categories:
- `characters/characterProfiles.json`
- `characters/travelerProfile.json`
- `weapons/weaponProfiles.json`
- `materials/*.json`
- `progression/*.json`
- `sources/*.json`
- `crafting/*.json`
- `artifacts/artifactDomains.json`

The canonical index is:

`src/data/database/index.ts`

Runtime validation is:

`src/data/database/validation/validateDatabase.ts`

## Character profiles

Normal playable characters are modeled in `characterProfiles.json`.

Each canonical character profile includes:
- `characterKey`
- `displayName`
- `rarity`
- `weaponType`
- `element`
- `elementGemFamilyKey`
- `localSpecialtyKey`
- `commonEnemyDropFamilyKey`
- `talentBookFamilyKey`
- `normalBossMaterialKey`
- `weeklyBossMaterialKey`
- `releaseState`
- `status`
- `plannerEligible`
- `notes`

Status values:
- `verified`
- `unresolved`
- `beta`
- `special_case`
- `ignored`
- `deprecated`

Traveler is modeled separately in `travelerProfile.json` as a special-case shared character with element-specific talent variants.

## Weapon profiles

Canonical weapon profiles live in `weapons/weaponProfiles.json`.

Each record includes:
- `weaponKey`
- `displayName`
- `weaponType`
- `rarity`
- `weaponAscensionMaterialFamilyKey`
- `eliteEnemyDropFamilyKey`
- `commonEnemyDropFamilyKey`
- `releaseState`
- `status`
- `plannerEligible`
- `notes`

Only 3-star, 4-star, and 5-star weapons are progression-goal trackable by default.

## Material records and families

Canonical materials live in `materials/materials.json`.

Each material record includes:
- `materialKey`
- `displayName`
- canonical `category`
- compatibility `legacyCategory`
- `recordCategory` where the runtime still needs a legacy `MaterialRecord`
- `familyKey`
- `tier`
- `sourceKeys`
- `status`
- `notes`

Family/source groupings are stored separately:
- `elementalGemFamilies.json`
- `localSpecialties.json`
- `commonEnemyDropFamilies.json`
- `eliteEnemyDropFamilies.json`
- `normalBossMaterials.json`
- `weeklyBossMaterials.json`
- `talentBookFamilies.json`
- `weaponAscensionMaterialFamilies.json`
- `specialProgressionMaterials.json`

## Progression and source metadata

Canonical progression tables live in `progression/`.

Key tables:
- character ascension and level EXP curves
- talent level costs
- weapon ascension costs
- weapon level EXP curves
- weapon EXP item values
- compatibility exact progression totals still consumed by some planner paths

Canonical planner/source metadata lives in `sources/`.

Key tables:
- material source rows
- resin activity costs
- domain schedules
- ley line rewards
- domain loot estimates
- boss loot estimates
- enemy route / open-world source rows

## GOOD import model

GOOD import remains account-scoped.

Observed top-level keys:
- `format`
- `version`
- `source`
- `characters`
- `artifacts`
- `weapons`
- `materials`

Imported material, character, and weapon names are matched against canonical database keys and aliases. Unmatched records are reported, not silently discarded.

The GOOD adapter does not read runtime-era discovered/generated catalogs directly. It matches against canonical-backed `StaticGameData`, which is assembled from `src/data/database/`.

## Multi-account user model

Krumpanion persists user-owned progression data under a multi-account container:

```ts
type MultiAccountUserState = {
  schemaVersion: 1;
  activeAccountId: string;
  accountsById: Record<string, KrumpanionAccount>;
  accountOrder: string[];
};
```

Account-scoped data:
- imported GOOD snapshot data
- material inventory
- inventory edit metadata
- owned characters / weapons / artifacts
- goals
- planner settings
- world state
- import metadata

Global data:
- canonical static database
- validated override packs
- static-data health reports
- global UI settings

## Goal state

Active account goal state still uses a combined compatibility view at runtime:

```ts
type KrumpanionGoals = {
  version: 1;
  profileName?: string;
  characterGoals: Record<string, CharacterGoal>;
  weaponGoals: Record<string, WeaponGoal>;
  artifactGoals: ArtifactGoal[];
  plannerSettings: PlannerSettings;
};
```

Weapon goals are now structured and account-aware. They should not rely on fragile encoded IDs.

## Planner estimate models

Planner estimation is intentionally separate from deterministic cost calculation.

Key planner-side models:

- `DeterministicRequirement`
  - exact required quantity per material before inventory
- `InventoryCoverage`
  - exact active-account subtraction with zero-clamped remaining quantities
- `MaterialDeficit`
  - non-negative integer remaining quantity after inventory and guaranteed crafting
- `LootTableModel`
  - source/activity reward model with level dimension, expected outputs, and data quality
- `SourceEstimate`
  - grouped runs, actionable runs, total Resin, affected materials, and warnings for one activity
- `PlannerRecommendationSection`
  - grouped UI section for user-facing planner rows
- `PlannerReport`
  - grouped planner sections plus summary and warnings built from source estimates

Important rule:
- deterministic requirements and deficits are not allowed to mutate based on estimate assumptions
- farming estimates consume deficits, but do not rewrite them

## Inventory editing

- `account.inventory` is the single planner-facing quantity map.
- Direct edits write into `account.inventory`.
- Bulk edits write into the same map.
- `materialEditState` is UI metadata only.
- GOOD re-import replaces the imported inventory snapshot for that account only.
