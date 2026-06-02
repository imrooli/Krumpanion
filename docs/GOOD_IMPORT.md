# GOOD Import

## Canonical matching

GOOD import is account-scoped and matches against canonical-backed runtime data.

Import flow:
1. Parse GOOD JSON into normalized GOOD records
2. Load canonical-backed `StaticGameData` through `loadStaticData()`
3. Match character, weapon, and material names/keys against canonical runtime records
4. Write the result into the active account only
5. Report unmatched records as warnings

Krumpanion should not use `src/data/runtime/**`, generated bundles, or planner-side fallback maps to resolve GOOD records.

## Matching behavior

Weapon matching currently prefers:
1. exact canonical display name
2. exact canonical key
3. normalized canonical display name / key
4. unmatched warning

Character and material import data should also resolve through canonical keys and canonical compatibility helpers, not runtime-era discovered catalogs.

## Weapon inventory import

GOOD weapon rows are imported as separate account-owned weapon instances.

Rules:

- every GOOD weapon row becomes one owned weapon instance
- duplicate copies are preserved as distinct instances
- refinement rank, level, ascension, lock, and equipped state are preserved when GOOD provides them
- GOOD ids are retained through `importSourceId` when available
- if GOOD has no stable weapon id, Krumpanion generates a deterministic local instance id
- unknown weapon names are reported in warnings and moved into unmatched imported weapons

Krumpanion must not collapse duplicate weapons into a count-only aggregate during import.

## Guarantees

- importing one account does not modify another account
- unmatched GOOD records are reported, not silently discarded
- imported inventory continues to feed planner inputs
- pre-farm goals remain independent from ownership state
- imported weapon instances remain account-scoped and copy-specific

## When adding import aliases

- prefer canonical keys and canonical display names first
- if extra aliases are needed, add them in the canonical/static-data matching layer
- do not add ad hoc planner-only or UI-only fallback mappings
