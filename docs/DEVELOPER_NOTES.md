# Developer Notes

## Product direction

- Follow [PRODUCT_ROADMAP.md](D:/Imran/Documents/Codex/Krumpanion/krumpanion_codex_ui_package/docs/PRODUCT_ROADMAP.md) for UX and workflow tradeoff decisions.
- Current product priority order:
  - live-update trust and change visibility
  - planner simplification and decision-first layout
  - visual consistency, spacing, and interface polish
- When a change could add clutter, repeated explanation, or another disconnected workflow, prefer the simpler path unless there is a strong accuracy reason not to.

## Canonical database rules

- `src/data/database/` is the only runtime source of truth for static game data.
- `src/data/runtime/**`, `src/data/runtime/generated/**`, and copied table inputs are deprecated runtime-era data.
- Maintenance helpers may still read deprecated/generated files, but `loadStaticData()` and normal app runtime must not.
- If canonical data is missing, fix `src/data/database/` or the canonical validator. Do not patch planner/UI code with one-off fallback maps.

## Static-data pipeline

Runtime flow:
1. `src/data/database/index.ts`
2. `assertCanonicalDatabaseValid()`
3. `assembleBaseStaticData()`
4. `applyOverridePack()`
5. `buildDerivedStaticDataIndexes()`

Override packs remain supported, but they are layered patches over canonical keys rather than a second source of truth.

## Planner guardrails

- Keep deterministic progression math separate from farming estimates.
- Keep the planner pipeline explicit:
  - deterministic requirements
  - inventory coverage
  - guaranteed crafting coverage
  - exact deficits
  - source estimates
  - planner report sections
- Do not let source estimation mutate exact requirements or exact inventory subtraction.
- Do not add planner-side one-off data repairs for known characters, weapons, or materials.
- Prefer canonical source metadata in `src/data/database/` over local fallback maps.
- Keep `plannerReport` as the engine-facing Planner UI contract.
- Keep the Planner-tab presentation adapter display-only.
- Never expose raw goal ids, raw keys, or raw numeric priority scores in normal UI.
- Keep the main Planner dashboard focused on today's actionable domains.
- Keep the weekly domain schedule as a separate planning view below normal boss recommendations.
- Keep Domains of Mastery and Domains of Forgery visually separate in both today and weekly views.

## Goal display rules

- Use shared goal-display helpers from `src/domain/goals/goalDisplay.ts`.
- Planner rows, related-goal chips, stale-goal panels, and artifact labels should all resolve
  through the same helper path.
- If a display label is missing, recompute it from structured goal data instead of falling back to
  `goal.id` or `goalKey`.
- Raw ids are acceptable only for debug tooling or persistence internals.

## Weapon inventory and refinement guardrails

- Keep canonical weapon profiles separate from owned weapon instances.
- GOOD import must preserve duplicate weapon copies as separate instances.
- Keep weapon inventory account-scoped; do not mix instances across accounts.
- Refinement tracking is advisory UI/state only and must not create resin tasks by default.
- Never recommend consuming:
  - the only copy
  - a locked copy
  - an equipped copy
  - a goal-linked copy
  - a more-invested copy when a weaker base exists
- 5-star duplicate refinement should default to manual review unless canonical policy explicitly says otherwise.
- 1-star and 2-star weapons may be visible in raw inventory/import state, but they are not refinement-goal tracked.
- Do not expose raw GOOD instance ids in normal UI.

## Planner presentation rules

- Normal boss cards should lead with unique boss material deficits.
- Ascension gems are incidental detail only in boss rows.
- Per-row and summary day estimates should be derived from existing planner fields, not invented math.
- Route-based no-resin work should not be folded into Resin-day totals unless the planner has an explicit time estimate.

## When adding planner estimate logic

1. Add or update canonical source/loot metadata first.
2. Keep the estimate in the source-estimate layer.
3. Preserve non-negative integer displayed deficits.
4. Add warnings for inferred or partial data instead of silently pretending the value is exact.
5. Add regression tests for:
   - deterministic totals unchanged
   - source grouping correct
   - total Resin semantics correct
   - UI-facing labels not misleading

## Before committing planner/data changes

Run:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run data:validate`

If available, also run:

- `npm run codex:snapshot`
- `npm run codex:scan-architecture`
