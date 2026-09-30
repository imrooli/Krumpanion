# Database Pipeline

## Automatic Tier 1/2 updates

Database opens on Game Data. Live identity and exact progression updates use the existing change-set -> override -> `loadStaticData()` pipeline. Farming Setup, Discoveries, and Diagnostics expose configuration and review. Read [Automatic Database Updates](AUTOMATIC_DATABASE_UPDATES.md) for provider joins, filtering, migration, atomic persistence, and bundle import.

## Source of truth

Krumpanion now loads static game data from one canonical directory:

`src/data/database/`

Runtime startup path:
1. Load canonical records from `src/data/database/index.ts`
2. Validate the canonical database
3. Normalize canonical records into the existing `StaticGameData` shape
4. Apply validated override packs
5. Build derived lookup indexes only

The canonical bundle is the baseline. Validated automatic and manual changes are persisted as overrides; runtime does not load historical copied/generated catalogs as a separate source of truth.

Normal app/runtime consumers should enter through:
- `src/data/database/index.ts`
- `src/domain/staticData/loadStaticData.ts`
- `src/domain/staticData/assembleBaseStaticData.ts`

## Canonical categories

- `characters/`
- `weapons/`
- `materials/`
- `progression/`
- `sources/`
- `crafting/`
- `artifacts/`
- `validation/`

## What is canonical now

Canonical now:
- `src/data/database/**/*.json`
- `src/data/database/**/*.ts`

Migrated into the canonical DB:
- character profiles previously assembled from runtime JSON + generated character material bundles
- weapon profiles previously assembled from runtime JSON + generated weapon goal bundles
- material families previously split across progression-core JSON and TS registries
- source metadata previously split across runtime JSON and planner registries
- progression tables previously split across runtime JSON and TS registries

Deprecated as runtime truth:
- `src/data/runtime/characters.json`
- `src/data/runtime/discoveredCharacters.json`
- `src/data/runtime/materials.json`
- `src/data/runtime/discoveredMaterials.json`
- `src/data/runtime/weapons.json`
- `src/data/runtime/discoveredWeapons.json`
- `src/data/runtime/generated/characterMaterialProfiles.generated.json`
- `src/data/runtime/generated/generatedCharacters.generated.json`
- `src/data/runtime/generated/betaMaterials.generated.json`
- `src/data/runtime/generated/unresolvedCharacterMaterialReferences.generated.json`
- `src/data/runtime/generated/weaponGoalProfiles.generated.json`
- `src/data/runtime/progressionCore/*`

Maintenance or migration-only:
- `tools/data/build-character-material-index.ts`
- `tools/data/build-canonical-database.ts`
- `src/domain/staticData/characterMaterialIndexRegistry.ts`
- `src/domain/staticData/weaponGoalProfileRegistry.ts`
- `src/domain/staticData/resolveGeneratedCharacterMaterialReferences.ts`
- raw copied table inputs under `data_sources/`

## Validation

Run:

```bash
npm run data:validate
```

Canonical validation checks:
- character profile completeness and status rules
- Traveler special-case modeling
- weapon profile completeness and rarity rules
- required canonical material keys
- family member resolution
- material source key resolution
- resin metadata sanity checks
- progression constants such as weapon EXP item values

Runtime also fails loudly if canonical validation reports errors.

Maintenance diagnostics:
- `validateStaticData()` now validates the assembled canonical-backed runtime shape and override effects.
- `npm run data:validate` may still report legacy generated-bundle drift, but those bundles are diagnostics only and not runtime truth.

## Overrides

Override packs remain supported, but they are layered over canonical keys.

Rules:
- overrides do not become a second source of truth
- overrides must use canonical keys
- invalid overrides should not corrupt the canonical base model
- the UI should treat overrides as user patches, not canonical records

## GOOD import matching

GOOD import resolution now targets canonical database keys and aliases.

Matching order:
1. game ID when the input provides a genuine upstream identity
2. explicit alias
3. canonical key
4. unique normalized display name / key
5. unresolved discovery when no unique identity exists

GOOD weapon instance IDs are never upstream game IDs. Shared names such as the Prized Isshin Blade variants require a distinguishing canonical identity; name-only ownership remains preserved and unresolved.

Planner code should not add ad hoc fallback mappings for missing canonical records.

Phase 4 repair uses the assembled canonical material identities, including weekly/special registries, without user overrides. This resolves Nicole's false Counterfeit Resin mismatch while retaining her existing numerical costs. See [Phase 4 audit](PHASE4_DATABASE_PLANNER_AUDIT.md) for the complete closure evidence and maintenance boundaries.

## Traveler

Traveler is modeled separately from normal character profiles:
- one shared character-level / ascension profile
- separate element-specific talent variants
- planner access goes through explicit Traveler special-case logic

## Patch Update Wizard

Use Database > Advanced > Wizard for manual patch authoring. Automatic identity and progression maintenance is under Database > Game Data. The wizard creates a portable patch manifest, previews effective static data through the same override layer used at runtime, and commits the compiled patch directly into Krumpanion's persisted database override layer.


Wizard steps:
1. Patch Setup
2. New Materials
3. New Sources
4. Characters
5. Weapons
6. Artifacts
7. Crafting
8. Validate
9. Preview
10. Commit Patch

The manifest can cover linked patch records together:
- talent book, weapon ascension, enemy drop, boss, specialty, and standalone material records
- mastery, forgery, and trounce domain records
- character material assignments
- weapon material profiles
- artifact set to domain mappings
- generated tier-up recipes and tiered material indexes

New beta or unreleased planner records should default to `plannerEligible: false`. Flip planner eligibility only after live, planner-critical fields are verified.

## Committing a patch manifest

Open `Database > Advanced > Commit Patch`, review any blocking authoring or preview errors, then click `Commit Patch to Database`.

The in-app commit:
- compiles the manifest into a database override pack
- merges it with any existing active database overrides
- rebuilds Krumpanion's effective static database immediately
- persists the committed database with the normal save file

Manifest JSON export remains useful as a review artifact or backup, but no separate patch CLI is required for normal maintenance. Canonical source files under `src/data/database/**` remain the bundled baseline; committed patch data is applied through the local persisted database layer.

## Required commands before committing database changes

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run data:validate
```

## Next phase

Verified Tier 3 source/family automation uses the same provider-neutral observation boundary, diagnostics, and manual-field protection. Future weekday automation requires authoritative evidence; manual availability remains supported. Existing family calculations, Traveler handling, and generic patch manifests remain compatible.

## Structured farming extension

Schema 15 extends existing override persistence with shared farming provenance, review conflicts, relationship evidence, and compact synchronization metadata. Automatic farming observations pass through the existing change-set compiler and full candidate validation. They do not create another database. See [Farming Data Pipeline](FARMING_DATA_PIPELINE.md).


## Reproducible bundled repairs

Use `npm run data:repair-canonical -- <dataset-bundle.json>` to preview field-level canonical enrichment; append `--apply` to write the validated candidate. Both v1/v2 bundles use the normal checksum/parser boundary. Existing IDs/keys and curated values survive; contradictions are review findings. Release/status promotion also requires exact agreement between bundled and observed ascension/all three talent tables. Repeating the repair produces no additional changes.

Catalog validity is distinct from progression support: one-/two-star weapon identities may exist while `plannerEligible` and `refinementTrackable` stay false. No low-rarity planner feature was introduced. Combined health reports merge equal entity/field/condition findings and retain canonical/effective evidence; standalone canonical validation still runs. Missing explicit five-star refinement policy documents the existing manual-review default as information.
