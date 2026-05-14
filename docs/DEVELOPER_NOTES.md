# Developer Notes

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
