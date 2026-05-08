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
