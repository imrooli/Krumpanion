# Krumpanion

Krumpanion is a Genshin Impact planning and database workspace that imports GOOD / Irminsul-style inventory exports, keeps goal state locally, and resolves character, weapon, artifact, crafting, and material planning against a curated static-data layer.

Krumpanion now supports multiple accounts in one installation. Each account keeps its own imported GOOD snapshot, owned characters and weapons, goals, planner settings, world state, and import history, while the static game database and override packs remain global.

Automatic Tier 1/2 updates import live identities and exact progression from AnimeGameData2. Open **Database > Game Data** for revision checks and dataset import, **Farming Setup** for missing sources, and **Advanced** for portable patch authoring. See [Automatic Database Updates](docs/AUTOMATIC_DATABASE_UPDATES.md) and the [implementation report](docs/AUTOMATIC_DATABASE_UPDATES_REPORT.md).

## Architecture

- `src/`
  Runtime application code only.
- `src/data/database/`
  Canonical bundled game data.
- `src/data/runtime/`
  Historical/reference artifacts; not the runtime source of truth.
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

The runtime loads the canonical bundle through `loadStaticData()` and applies validated local override packs. Automatic updates use the existing change-set compiler, merge, validation, and persistence pipeline. Farming metadata remains manual. Historical builders in `tools/data/` can still prepare authoring references; their generated artifacts are not loaded as a second database.

- `npm run data:fetch-upstream -- <output.json>` creates a versioned, integrity-checked dataset bundle for application import.
- `npm run data:validate` writes the bundled database health reports.
- Save schema 15 includes application-wide synchronization metadata, account-associated discoveries, farming provenance/conflicts, and extractor capability in full backups.

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

Automatic updates now include verified material-family and domain relationships, protected manual farming fields, and shared weekday configuration. See [Farming Data Pipeline](docs/FARMING_DATA_PIPELINE.md). Run `npm run test:e2e` for the required Firefox browser suite and `npm run data:validate-upstream` for opt-in live provider validation.

Phase 3 adds reproducible canonical repair (`data:repair-canonical`), dynamic scene coverage, an opt-in five-run browser benchmark (`test:performance`), and bundle analysis (`data:analyze-bundle`). See the Phase 3 section of the automatic-update implementation report for acceptance evidence and remaining manual data.
