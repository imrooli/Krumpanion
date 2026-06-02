# Krumpanion Repository Snapshot

Generated from: `D:\Imran\Documents\Codex\Krumpanion\krumpanion_codex_ui_package`

## Package / toolchain summary

- name: krumpanion
- version: 0.1.0
- scripts:
  - dev: `vite`
  - build: `tsc --noEmit && vite build`
  - preview: `vite preview`
  - test: `vitest run`
  - test:watch: `vitest`
  - typecheck: `tsc --noEmit`
  - lint: `eslint . --ext ts,tsx --max-warnings 0`
  - data:build-good-catalogs: `node scripts/build-good-catalogs.mjs`
  - data:build-character-index: `tsx tools/data/build-character-material-index.ts`
  - data:validate: `tsx tools/data/validate-static-data.ts`
  - data:health: `npm run data:validate`
  - codex:snapshot: `python codex/scripts/repo_snapshot.py`
  - codex:scan-architecture: `python codex/scripts/scan_architecture_smells.py`
- notable dependencies:
- react: ^18.3.1
- vite: ^5.4.10 (dev)
- typescript: ^5.6.3 (dev)
- zustand: ^4.5.5
- zod: ^3.23.8
- vitest: ^2.1.4 (dev)


## Directory map

```text
.codex/
.codex\environments/
.codex\environments\environment.toml
.gitattributes
.gitignore
AGENTS.md
codex/
codex\docs/
codex\docs\IMPLEMENTATION_ORDER.md
codex\docs\KRUMPANION_ARCHITECTURE_DIRECTIVE.md
codex\docs\REPO_ANALYSIS_PROTOCOL.md
codex\docs\SEELIE_LESSONS_TO_APPLY.md
codex\docs\VALIDATION_CHECKLIST.md
codex\package-manifest.json
codex\prompts/
codex\prompts\00_BOOTSTRAP_REPO_ANALYSIS.md
codex\prompts\01_ARCHITECTURE_AUDIT.md
codex\prompts\02_IMPLEMENT_CORE_SCHEMAS.md
codex\prompts\03_MATERIAL_GRAPH_ENGINE.md
codex\prompts\04_CRAFTING_RESOLVER.md
codex\prompts\05_PLANNER_ENGINE.md
codex\prompts\06_GOOD_IMPORT_ADAPTER.md
codex\prompts\07_SAVE_EXPORT_MIGRATIONS.md
codex\prompts\08_UI_INTEGRATION.md
codex\prompts\09_TESTING_PASS.md
codex\reports/
codex\reports\.gitkeep
codex\reports\architecture_smells.md
codex\reports\codex_repo_snapshot.md
codex\reports\static_data_health.json
codex\reports\static_data_health.md
codex\scripts/
codex\scripts\repo_snapshot.py
codex\scripts\scan_architecture_smells.py
codex\templates/
codex\templates\codex_analysis_report.md
codex\templates\refactor_ticket.md
CODEX_TASK.md
data_sources/
data_sources\character-index/
data_sources\character-index\character-index-6.5-6.6.txt
docs/
docs\ARCHITECTURE_CHECKLIST.md
docs\CODEX_PROMPT_SNIPPET.md
docs\DATA_MODEL.md
docs\DATABASE_PIPELINE.md
docs\DEVELOPER_NOTES.md
docs\GOOD_IMPORT.md
docs\LOOT_MODELS.md
docs\PERFORMANCE_PLAN.md
docs\PLANNER_ENGINE.md
docs\PLANNER_UI.md
docs\RESIN_AND_AVAILABILITY_NOTES.md
docs\RESIN_CALCULATION.md
docs\STACK_DECISION.md
docs\UI_SPEC.md
docs\WEAPON_INVENTORY.md
eslint.config.js
examples/
examples\goals.example.json
examples\good.minimal.example.json
index.html
package-lock.json
package.json
README.md
reference/
reference\data_seed/
reference\data_seed\README.md
reference\krumpanion_codex_dropin/
reference\krumpanion_codex_dropin\codex/
reference\krumpanion_codex_dropin\codex\docs/
reference\krumpanion_codex_dropin\codex\package-manifest.json
reference\krumpanion_codex_dropin\codex\prompts/
reference\krumpanion_codex_dropin\codex\reports/
reference\krumpanion_codex_dropin\codex\scripts/
reference\krumpanion_codex_dropin\codex\templates/
reference\krumpanion_codex_dropin\README.md
reference\krumpanion_codex_dropin\ROOT_AGENTS_KRUMPANION.md
reference\README.md
schemas/
schemas\goals.schema.json
schemas\save.schema.json
scripts/
scripts\build-good-catalogs.mjs
src/
src\adapters/
src\adapters\goodImport.corpus.test.ts
src\adapters\goodImport.test.ts
src\adapters\goodImport.ts
src\adapters\persistence.test.ts
src\adapters\persistence.ts
src\app/
src\app\AppShell.test.tsx
src\app\AppShell.tsx
src\app\layoutPrimitives.tsx
src\app\navigationRegistry.tsx
src\app\styles.css
src\App.tsx
src\components/
src\components\ErrorBoundary.tsx
src\data/
src\data\database/
src\data\database\artifacts/
src\data\database\characters/
src\data\database\crafting/
src\data\database\index.test.ts
src\data\database\index.ts
src\data\database\materials/
src\data\database\progression/
src\data\database\schema.ts
src\data\database\sources/
src\data\database\validation/
src\data\database\weapons/
src\data\runtime/
src\data\runtime\artifactDomains.json
src\data\runtime\characterAscensionCosts.json
src\data\runtime\characters.json
src\data\runtime\discoveredArtifactSets.json
src\data\runtime\discoveredCharacters.json
src\data\runtime\discoveredMaterials.json
src\data\runtime\discoveredWeapons.json
src\data\runtime\generated/
src\data\runtime\materials.json
src\data\runtime\materialSources.json
src\data\runtime\progressionCore/
src\data\runtime\recipes.json
src\data\runtime\resinRules.json
src\data\runtime\talentCosts.json
src\data\runtime\weaponAscensionCosts.json
src\data\runtime\weapons.json
src\domain/
src\domain\account/
src\domain\account\types.ts
src\domain\crafting/
src\domain\crafting\craftingAvailability.ts
src\domain\crafting\resolveCraftingPlan.test.ts
src\domain\crafting\resolveCraftingPlan.ts
src\domain\crafting\types.ts
src\domain\goals/
src\domain\goals\goalDisplay.ts
src\domain\goals\goalState.test.ts
src\domain\goals\goalState.ts
src\domain\goals\types.ts
src\domain\good/
src\domain\good\parseGood.test.ts
src\domain\good\parseGood.ts
src\domain\good\types.ts
src\domain\inventory/
src\domain\inventory\bulkInventory.test.ts
src\domain\inventory\bulkInventory.ts
src\domain\planner/
src\domain\planner\buildFarmingEstimates.test.ts
src\domain\planner\buildFarmingEstimates.ts
src\domain\planner\buildPlannerReport.test.ts
src\domain\planner\buildPlannerReport.ts
src\domain\planner\buildPlannerRows.test.ts
src\domain\planner\buildPlannerRows.ts
src\domain\planner\calculateMissingMaterials.ts
src\domain\planner\classifySources.ts
src\domain\planner\compareInventory.ts
src\domain\planner\expandGoals.ts
src\domain\planner\groupByAvailability.ts
src\domain\planner\types.ts
src\domain\progression/
src\domain\progression\materialResolvers.ts
src\domain\progression\resolveCharacterProgression.test.ts
src\domain\progression\resolveCharacterProgression.ts
src\domain\progression\resolveWeaponProgression.test.ts
src\domain\progression\resolveWeaponProgression.ts
src\domain\save/
src\domain\save\migrations.ts
src\domain\save\types.ts
src\domain\staticData/
src\domain\staticData\applyOverridePack.ts
src\domain\staticData\assembleBaseStaticData.ts
src\domain\staticData\buildDerivedStaticDataIndexes.ts
src\domain\staticData\canonicalMaterialRegistry.ts
src\domain\staticData\catalogCoverage.test.ts
src\domain\staticData\characterMaterialImport.ts
src\domain\staticData\characterMaterialIndexRegistry.ts
src\domain\staticData\craftingRegistry.ts
src\domain\staticData\databaseEditor.test.ts
src\domain\staticData\databaseEditor.ts
src\domain\staticData\eliteEnemyDropRegistry.test.ts
src\domain\staticData\eliteEnemyDropRegistry.ts
src\domain\staticData\generalEnemyDropRegistry.test.ts
src\domain\staticData\generalEnemyDropRegistry.ts
src\domain\staticData\loadStaticData.runtime-source.test.ts
src\domain\staticData\loadStaticData.test.ts
src\domain\staticData\loadStaticData.ts
src\domain\staticData\localSpecialtyRegistry.test.ts
src\domain\staticData\localSpecialtyRegistry.ts
src\domain\staticData\materialKeyMapping.ts
src\domain\staticData\materialRecordRegistry.test.ts
src\domain\staticData\normalBossMaterialRegistry.ts
src\domain\staticData\normalizeStaticDataMaterialReferences.ts
src\domain\staticData\overrideSchema.test.ts
src\domain\staticData\overrideSchema.ts
src\domain\staticData\plannerResinRegistry.ts
src\domain\staticData\resolveEffectiveCharacterMetadata.ts
src\domain\staticData\resolveGeneratedCharacterMaterialReferences.ts
src\domain\staticData\runtimeSeedData.ts
src\domain\staticData\specialProgressionMaterialRegistry.ts
src\domain\staticData\staticDataFactory.ts
src\domain\staticData\targetability.ts
src\domain\staticData\travelerRegistry.ts
src\domain\staticData\types.ts
src\domain\staticData\validateStaticData.test.ts
src\domain\staticData\validateStaticData.ts
src\domain\staticData\weaponAscensionMaterialRegistry.ts
src\domain\staticData\weaponGoalProfileRegistry.test.ts
src\domain\staticData\weaponGoalProfileRegistry.ts
src\domain\staticData\weaponProgressionRegistry.test.ts
src\domain\staticData\weaponProgressionRegistry.ts
src\domain\staticData\weeklyBossMaterialRegistry.ts
src\domain\weapons/
src\domain\weapons\refinementTracker.test.ts
src\domain\weapons\refinementTracker.ts
src\features/
src\features\accounts/
src\features\accounts\AccountSwitcher.test.tsx
src\features\accounts\AccountSwitcher.tsx
src\features\artifactGoals/
src\features\artifactGoals\ArtifactGoalsTab.tsx
src\features\characters/
src\features\characters\CharactersTab.tsx
src\features\crafting/
src\features\crafting\CraftingTab.test.tsx
src\features\crafting\CraftingTab.tsx
src\features\dashboard/
src\features\dashboard\DashboardTab.tsx
src\features\database/
src\features\database\databaseConstants.ts
src\features\database\databaseCoverage.tsx
src\features\database\databaseGuidedEditors.tsx
src\features\database\databaseModel.test.ts
src\features\database\databaseModel.ts
src\features\database\databaseProfileHelpers.ts
src\features\database\databaseShared.tsx
src\features\database\DatabaseTab.test.tsx
src\features\database\DatabaseTab.tsx
src\features\database\DatabaseWorkspaceShell.tsx
src\features\goals/
src\features\goals\GoalsWorkspace.tsx
src\features\home/
src\features\home\HomeWorkspace.tsx
src\features\import/
src\features\import\GoodImportPanel.tsx
src\features\import\ImportWorkspace.tsx
src\features\importExport/
src\features\importExport\ImportExportTab.tsx
src\features\importExport\SaveWorkspace.tsx
src\features\inventory/
src\features\inventory\InventoryTab.tsx
src\features\inventory\InventoryWorkspace.test.tsx
src\features\inventory\InventoryWorkspace.tsx
src\features\planner/
src\features\planner\plannerFormatting.ts
src\features\planner\PlannerRecommendationCard.tsx
src\features\planner\PlannerTab.test.tsx
src\features\planner\PlannerTab.tsx
src\features\planner\plannerUiModel.test.ts
src\features\planner\plannerUiModel.ts
src\features\planning/
src\features\planning\PlannerAssumptionsPanel.tsx
src\features\planning\PlanningWorkspace.tsx
src\features\settings/
src\features\settings\SettingsDataTab.tsx
src\features\settings\SettingsWorkspace.tsx
src\features\settings\WarningsWorkspace.tsx
src\features\weapons/
src\features\weapons\WeaponsTab.test.tsx
src\features\weapons\WeaponsTab.tsx
src\main.tsx
src\store/
src\store\persistenceHelpers.ts
src\store\selectors.ts
src\store\useAppStore.test.ts
src\store\useAppStore.ts
src\test/
src\test\setup.ts
src\utils/
src\utils\collections.ts
src\utils\days.test.ts
src\utils\days.ts
src\utils\memoizeLast.ts
src\utils\stableIds.ts
src\vite-env.d.ts
start-krumpanion.bat
tools/
tools\data/
tools\data\build-canonical-database.ts
tools\data\build-character-material-index.ts
tools\data\validate-static-data.ts
tsconfig.json
tsconfig.tsbuildinfo
vite.config.js
vite.config.ts
```

## Root config files

## AGENTS.md

```text
# Krumpanion Repository Instructions for Codex

These instructions apply to the entire repository unless a more specific `AGENTS.md` exists in a subdirectory.

## Project goal

Krumpanion is a local-first Genshin Impact planning application focused on:

- Character and weapon goal planning.
- Material inventory tracking.
- Talent, weapon, ascension, EXP, and mora cost calculation.
- Crafting / conversion strategy.
- Resin-use recommendations based on material availability by day.
- GOOD file import support.
- Artifact goal planning independent from artifact inventory.

## Do not rebuild from scratch

Before making structural changes:

1. Inspect the existing repository.
2. Identify the current framework, package manager, routing approach, state approach, and test setup.
3. Preserve working UI and user-facing behavior whenever possible.
4. Propose the smallest safe change that moves the code toward the architecture.
5. Prefer incremental refactors over wholesale rewrites.

## Architecture rules

### Separate static game data from user state

Static Genshin data should live in a dedicated core data layer, not inside UI components.

Preferred shape:

```text
src/core/game-data/
  characters.*
  weapons.*
  materials.*
  recipes.*
  schedules.*
```

User state should live separately:

```text
OwnedCharacter
OwnedWeapon
InventoryState
GoalState
UserSettings
```

### Separate ownership from goals

Owning a character or weapon is not the same as actively planning it.

Use separate domain concepts:

```text
OwnedCharacter != CharacterGoal
OwnedWeapon != WeaponGoal
ArtifactGoal != ArtifactInventory
```

### Keep core calculations pure

Files under `src/core/` should not import React components, browser storage, DOM APIs, or UI-only utilities.

Core calculation functions should receive input objects and return output objects.

Good:

```ts
resolveCharacterGoalCost({ character, goal, gameData })
```

Bad:

```ts
resolveCharacterGoalCostFromReactState()
```

### Planner output is derived

Planner recommendations should be generated from:

- Game data.
- Date / day-of-week.
- User goals.
- User inventory.
- Resin preferences.
- Crafting options.

Do not store generated planner tasks as source-of-truth user data.

### Adapter boundary

External formats such as GOOD should be parsed and normalized in `services/import-export` or equivalent.

Do not let external schema field names spread throughout UI or core calculation code.

### Artifact goals

Artifact goals should initially work without artifact inventory.

Support:

- Target sets.
- Sands / goblet / circlet main stats.
- Desired substats.
- Priority.
- Notes.

Do not block material planning on artifact inventory support.

## Testing expectations

When changing calculation logic:

- Add or update unit tests.
- Include edge cases for missing inventory, partial inventory, and craftable lower-tier materials.
- Add fixtures for known character/weapon/talent costs where practical.
- Prefer deterministic tests for planner recommendations.

When changing import/export:

- Add schema validation tests.
- Add malformed-input tests.
- Ensure imported data maps into Krumpanion internal state, not directly into UI-only state.

## Preferred implementation order

1. Analyze current repo structure.
2. Create or align domain schemas.
3. Isolate static game data.
4. Implement total-cost calculators.
5. Implement inventory subtraction.
6. Implement crafting resolver.
7. Implement planner recommendation engine.
8. Connect UI through selectors/view-models.
9. Add GOOD import adapter.
10. Add save-file export/import with schema versioning.

## Response style for Codex

When reporting back:

- Summarize what changed.
- List files modified.
- List tests run and results.
- Call out skipped tests or assumptions.
- Suggest the next smallest follow-up task.

```

## README.md

```text
# Krumpanion

Krumpanion is a Genshin Impact planning and database workspace that imports GOOD / Irminsul-style inventory exports, keeps goal state locally, and resolves character, weapon, artifact, crafting, and material planning against a curated static-data layer.

Krumpanion now supports multiple accounts in one installation. Each account keeps its own imported GOOD snapshot, owned characters and weapons, goals, planner settings, world state, and import history, while the static game database and override packs remain global.

## Architecture

- `src/`
  Runtime application code only.
- `src/data/runtime/`
  Runtime-loaded seed data and generated normalized database artifacts.
- `data_sources/`
  Raw import payloads and staging source tables used to build generated runtime data.
- `tools/data/`
  Data build and normalization scripts.
- `reference/`
  Non-runtime support packages, historical drop-ins, and reference-only material.
- `codex/`
  Developer tooling and workflow helpers for repository analysis.

## Core Runtime Layers

- `src/domain/staticData/`
  Static data assembly, normalization, override application, and derived indexes.
- `src/domain/progression/`
  Character and weapon progression resolution from shared families and exact materials.
- `src/domain/planner/`
  Missing-material calculation, crafting-aware planner rows, and availability grouping.
- `src/features/database/`
  Database workspace for editing catalogs, families, profiles, sources, and legacy compatibility records.
- `src/store/`
  Application state, selectors, and persistence orchestration.

## Data Workflow

Krumpanion now separates raw source payloads from runtime data.

- Raw tables belong in `data_sources/`
- Builders in `tools/data/` normalize them into generated runtime JSON under `src/data/runtime/generated/`
- The runtime app consumes only normalized runtime data and override packs

Current generated workflow:

- `npm run data:build-character-index`

This rebuilds Character Index-derived material profile artifacts from the raw source table in `data_sources/character-index/`.

## Multi-Account Notes

- GOOD imports are scoped to the currently active account by default.
- The import workspace also supports importing a GOOD file as a brand-new account.
- Planner, inventory, characters, weapons, and artifact goals always read from the active account only.
- Static data, override packs, and static-data health reports remain global.
- Full save exports include every account.
- Single-account exports can be imported into another Krumpanion installation without overwriting existing accounts.

## Inventory Editing

- The active account inventory is the single planner-facing quantity map.
- Direct material edits update that account immediately and recalculate planner deficits from the same inventory state.
- Manual edit metadata is tracked per material with a lightweight `source` (`manual` or `bulk`) and `editedAt` timestamp.
- Re-importing GOOD into an account replaces that account's imported inventory snapshot and may overwrite manual quantity edits for the same materials.

### Bulk inventory paste

Krumpanion accepts these formats inside `Bulk Edit Inventory`:

- `material name, quantity`
- `material key, quantity`
- `material name<TAB>quantity`
- `material key<TAB>quantity`

Bulk paste rules:

- names and keys resolve through canonical material aliases plus exact display-name matching
- duplicate rows merge by summing their quantities and are shown in preview
- unmatched rows are reported and never create new materials
- invalid quantities are skipped and reported
- only non-negative integers are accepted

## Goal Presets

- Character goal bulk presets apply only to selected existing character goals.
- Weapon goal bulk presets apply only to selected existing weapon goals.
- Presets update target values only; they do not create goals or change ownership, notes, priorities, or planning mode.

## Developer Commands

- `npm run dev`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run data:build-good-catalogs`
- `npm run data:build-character-index`
- `npm run data:validate`
- `npm run codex:snapshot`
- `npm run codex:scan-architecture`

## Notes

- Missing material keys in imported GOOD / Irminsul JSON are treated as `0` owned.
- Legacy exact progression data is still supported as a compatibility layer.
- The runtime database prefers profile- and family-driven material resolution over handwritten per-entity tables.
- Any new user-owned, goal, planner, or import state should be account-scoped by default.
- Any new static game database data should remain global.

```

## package-lock.json

```text
{
  "name": "krumpanion",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "krumpanion",
      "version": "0.1.0",
      "dependencies": {
        "ajv": "^8.17.1",
        "dexie": "^4.0.8",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "zod": "^3.23.8",
        "zustand": "^4.5.5"
      },
      "devDependencies": {
        "@testing-library/jest-dom": "^6.4.8",
        "@testing-library/react": "^16.0.0",
        "@testing-library/user-event": "^14.5.2",
        "@types/node": "^22.8.1",
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        "@typescript-eslint/eslint-plugin": "^8.12.2",
        "@typescript-eslint/parser": "^8.12.2",
        "@vitejs/plugin-react": "^4.3.2",
        "eslint": "^9.13.0",
        "eslint-plugin-react-hooks": "^5.0.0",
        "eslint-plugin-react-refresh": "^0.4.12",
        "fake-indexeddb": "^6.0.0",
        "jsdom": "^25.0.1",
        "tsx": "^4.21.0",
        "typescript": "^5.6.3",
        "vite": "^5.4.10",
        "vitest": "^2.1.4"
      }
    },
    "node_modules/@adobe/css-tools": {
      "version": "4.4.4",
      "resolved": "https://registry.npmjs.org/@adobe/css-tools/-/css-tools-4.4.4.tgz",
      "integrity": "sha512-Elp+iwUx5rN5+Y8xLt5/GRoG20WGoDCQ/1Fb+1LiGtvwbDavuSk0jhD/eZdckHAuzcDzccnkv+rEjyWfRx18gg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@asamuzakjp/css-color": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/@asamuzakjp/css-color/-/css-color-3.2.0.tgz",
      "integrity": "sha512-K1A6z8tS3XsmCMM86xoWdn7Fkdn9m6RSVtocUrJYIwZnFVkng/PvkEoWtOWmP+Scc6saYWHWZYbndEEXxl24jw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@csstools/css-calc": "^2.1.3",
        "@csstools/css-color-parser": "^3.0.9",
        "@csstools/css-parser-algorithms": "^3.0.4",
        "@csstools/css-tokenizer": "^3.0.3",
        "lru-cache": "^10.4.3"
      }
    },
    "node_modules/@asamuzakjp/css-color/node_modules/lru-cache": {
      "version": "10.4.3",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-10.4.3.tgz",
      "integrity": "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/@babel/code-frame": {
      "version": "7.29.0",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.0.tgz",
      "integrity": "sha512-9NhCeYjq9+3uxgdtp20LSiJXJvN0FeCtNGpJxuMFZ1Kv3cWUNb6DOhJwUvcVCzKGR66cw4njwM6hrJLqgOwbcw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.28.5",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.1.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.29.3",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.29.3.tgz",
      "integrity": "sha512-LIVqM46zQWZhj17qA8wb4nW/ixr2y1Nw+r1etiAWgRM6U1IqP+LNhL1yg440jYZR72jCWcWbLWzIosH+uP1fqg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.29.0",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.29.0.tgz",
      "integrity": "sha512-CGOfOJqWjg2qW/Mb6zNsDm+u5vFQ8DxXfbM09z69p5Z6+mE1ikP2jUXw+j42Pf1XTYED2Rni5f95npYeuwMDQA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.0",
        "@babel/generator": "^7.29.0",
        "@babel/helper-compilation-targets": "^7.28.6",
        "@babel/helper-module-transforms": "^7.28.6",
        "@babel/helpers": "^7.28.6",
        "@babel/parser": "^7.29.0",
        "@babel/template": "^7.28.6",
        "@babel/traverse": "^7.29.0",
        "@babel/types": "^7.29.0",
        "@jridgewell/remapping": "^2.3.5",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/core/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.29.1",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.29.1.tgz",
      "integrity": "sha512-qsaF+9Qcm2Qv8SRIMMscAvG4O3lJ0F1GuMo5HR/Bp02LopNgnZBC/EkbevHFeGs4ls/oPz9v+Bsmzbkbe+0dUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.29.0",
        "@babel/types": "^7.29.0",
        "@jridgewell/gen-mapping": "^0.3.12",
        "@jridgewell/trace-mapping": "^0.3.28",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.28.6.tgz",
      "integrity": "sha512-JYtls3hqi15fcx5GaSNL7SCTJ2MNmjrkHXg4FSpOA/grxK8KwyZ5bubHsCq8FXCkua6xhuaaBit+3b7+VZRfcA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.28.6",
        "@babel/helper-validator-option": "^7.27.1",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/@babel/helper-globals": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/helper-globals/-/helper-globals-7.28.0.tgz",
      "integrity": "sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.28.6.tgz",
      "integrity": "sha512-l5XkZK7r7wa9LucGw9LwZyyCUscb4x37JWTPz7swwFE/0FMQAGpiWUZn8u9DzkSBWEcK25jmvubfpw2dnAMdbw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.28.6",
        "@babel/types": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.28.6.tgz",
      "integrity": "sha512-67oXFAYr2cDLDVGLXTEABjdBJZ6drElUSI7WKp70NrpyISso3plG9SAGEF6y7zbha/wOzUByWWTJvEDVNIUGcA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.28.6",
        "@babel/helper-validator-identifier": "^7.28.5",
        "@babel/traverse": "^7.28.6"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-plugin-utils": {
      "version": "7.28.6",
      "resolved": "https://registry.npmjs.org/@babel/helper-plugin-utils/-/helper-plugin-utils-7.28.6.tgz",
      "integrity": "sha512-S9gzZ/bz83GRysI7gAD4wPT/AI3uCnY+9xn+Mx/KPs2JwHJIz1W8PZkg2cqyt3RNOBM8ejcXhV6y8Og7ly/Dug==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.27.1.tgz",
      "integrity": "sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.28.5",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.28.5.tgz",
      "integrity": "sha512-qSs4ifwzKJSV39ucNjsvc6WVHs6b7S03sOh2OcHF9UHfVPqWWALUsNUVzhSBiItjRZoLHx7nIarVjqKVusUZ1Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.27.1.tgz",
      "integrity": "sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helpers": {
      "version": "7.29.2",
      "resolved": "https://registry.npmjs.org/@babel/helpers/-/helpers-7.29.2.tgz",
      "integrity": "sha512-HoGuUs4sCZNezVEKdVcwqmZN8GoHirLUcLaYVNBK2J0DadGtdcqgr3BCbvH8+XUo4NGjNl3VOtSjEKNzqfFgKw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/template": "^7.28.6",
        "@babel/types": "^7.29.0"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.29.3",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.29.3.tgz",
      "integrity": "sha512-b3ctpQwp+PROvU/cttc4OYl4MzfJUWy6FZg+PMXfzmt/+39iHVF0sDfqay8TQM3JA2EUOyKcFZt75jWriQijsA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.29.0"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-self": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-self/-/plugin-transform-react-jsx-self-7.27.1.tgz",
      "integrity": "sha512-6UzkCs+ejGdZ5mFFC/OCUrv028ab2fp1znZmCZjAOBKiBK2jXD1O+BPSfX8X2qjJ75fZBMSnQn3Rq2mrBJK2mw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-source": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-source/-/plugin-transform-react-jsx-source-7.27.1.tgz",
      "integrity": "sha512-zbwoTsBruTeKB9hSq73ha66iFeJHuaFkUbwvqElnygoNbj/jHRsSeokowZFN3CZ64IvEqcmmkVe89OPXc7ldAw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/runtime": {
      "version": "7.29.2",
      "resolved": "https://registry.npmjs.org/@babel/runtime/-/runtime-7.29.2.tgz",
      "integrity": "sha512-JiDShH45zKHWyGe4ZNVRrCjBz8Nh9TMmZG1kh4QTK8hCBTWBi8Da+i7s1fJw7/lYp

[Truncated]
```

## package.json

```text
{
  "name": "krumpanion",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --max-warnings 0",
    "data:build-good-catalogs": "node scripts/build-good-catalogs.mjs",
    "data:build-character-index": "tsx tools/data/build-character-material-index.ts",
    "data:validate": "tsx tools/data/validate-static-data.ts",
    "data:health": "npm run data:validate",
    "codex:snapshot": "python codex/scripts/repo_snapshot.py",
    "codex:scan-architecture": "python codex/scripts/scan_architecture_smells.py"
  },
  "dependencies": {
    "ajv": "^8.17.1",
    "dexie": "^4.0.8",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.8.1",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.12.2",
    "@typescript-eslint/parser": "^8.12.2",
    "@vitejs/plugin-react": "^4.3.2",
    "eslint": "^9.13.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.12",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.1",
    "tsx": "^4.21.0",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}

```

## tsconfig.json

```text
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "schemas", "examples", "vite.config.ts"]
}

```

## vite.config.js

```text
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: "./src/test/setup.ts",
    },
});

```

## vite.config.ts

```text
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});

```

## Common source entrypoints

## src/main.tsx

```text
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./app/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

```

## src/App.tsx

```text
import { useEffect } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./app/AppShell";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const hydrate = useAppStore((state) => state.hydrate);
  const isHydrated = useAppStore((state) => state.isHydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <ErrorBoundary>
      {isHydrated ? <AppShell /> : <div className="loading-screen">Loading Krumpanion…</div>}
    </ErrorBoundary>
  );
}

```

## Suggested next prompt

Paste `codex/prompts/00_BOOTSTRAP_REPO_ANALYSIS.md` into Codex from the repository root.
