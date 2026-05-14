# Database Pipeline

## Source of truth

Krumpanion now loads static game data from one canonical directory:

`src/data/database/`

Runtime startup path:
1. Load canonical records from `src/data/database/index.ts`
2. Validate the canonical database
3. Normalize canonical records into the existing `StaticGameData` shape
4. Apply validated override packs
5. Build derived lookup indexes only

Normal runtime must not rebuild truth from copied tables, discovered catalogs, or generated scrape-like bundles.

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
1. exact canonical display name
2. exact canonical key
3. normalized canonical display name / key
4. unresolved import warning

Planner code should not add ad hoc fallback mappings for missing canonical records.

## Traveler

Traveler is modeled separately from normal character profiles:
- one shared character-level / ascension profile
- separate element-specific talent variants
- planner access goes through explicit Traveler special-case logic

## Adding new data

Add a new character:
1. update `characters/characterProfiles.json` or `characters/travelerProfile.json`
2. add referenced material/family/source records if missing
3. validate with `npm run data:validate`
4. run tests and build before committing

Add a new weapon:
1. update `weapons/weaponProfiles.json`
2. add any missing material family/source references
3. validate and test

Add a new material or family:
1. update `materials/materials.json`
2. update the relevant family/source file
3. validate and test

## Required commands before committing database changes

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run data:validate
```

## Deferred work

Patch 1 intentionally does not include:
- planner resin math refactor
- loot model improvements
- planner UI restructuring
- weapon refinement tracker
- database editor UX polish
