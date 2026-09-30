# GOOD Import

## Canonical matching

GOOD import is account-scoped and matches against canonical-backed runtime data.

Import flow:
1. Parse GOOD JSON into normalized GOOD records
2. Load canonical-backed `StaticGameData` through `loadStaticData()`
3. Resolve characters, weapons, materials, and artifact sets against the effective canonical/override identities
4. Persist ownership and inventory in the target account, preserving unknown records
5. Persist deduplicated application-wide discoveries with account associations
6. Trigger a shared upstream check only when unresolved, nonignored discoveries need it

Krumpanion should not use `src/data/runtime/**`, generated bundles, or planner-side fallback maps to resolve GOOD records.

## Matching behavior

The shared type-scoped identity resolver prefers:
1. upstream game ID when supplied by an adapter
2. explicit alias
3. canonical key
4. unique normalized display name/key
5. unresolved discovery when no unique match exists

Standard GOOD keys supply name/key evidence. GOOD weapon IDs identify individual owned copies and are never interpreted as upstream game IDs. Canonical keys remain stable across upstream renames. Unknown ownership, inventory quantities, and artifact set names are retained; ambiguities require review.

After activation, the latest internal snapshots are resolved across accounts without replaying stale GOOD payloads. This preserves manual edits made during the check, imported inventory baselines, goals, copy IDs, and equipment links. Known-only imports show concise status. Unknown imports show the shared update status/counts and a direct Configure Farming Data action. Ignored discoveries remain ignored on repeated import. Unchanged upstream revisions leave unmatched discoveries available for review.

Full save schema 14 includes discoveries and update metadata; account-only exports remain account-scoped. See [Automatic Database Updates](AUTOMATIC_DATABASE_UPDATES.md) for synchronization, failures, migration, and configuration.

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

- use the shared resolver ordering above
- if extra aliases are needed, add them in the canonical/static-data matching layer
- do not add ad hoc planner-only or UI-only fallback mappings

## Checks and farming readiness

Unknown GOOD ownership is saved before checking upstream. Concurrent checks are shared; a throttled GOOD request queues one eligible retry, respecting provider retry windows. Recovery resolves the current account state rather than replaying an import snapshot. Identity resolution does not wait for farming readiness. Verified families/domains reduce the remaining Farming Setup fields, and a manual weekday setting applies to every consumer of the shared family.

Phase 3 includes the ten ordinary low-rarity weapon identities in the bundled catalog. GOOD can resolve their ownership without making them eligible for progression goals or refinement tracking. Scene extraction capability upgrades preserve the same save-first and current-state recovery behavior.

## Phase 4 identity audit

Prized Isshin Blade IDs 11419, 11420, and 11421 retain separate canonical keys and the same official name. Their upstream identities do not establish supported progression or permanent ownership. A name-only GOOD record remains unmatched/discoverable, including when its instance ID resembles one of these IDs; an exact unambiguous canonical key resolves. No new GOOD extension or account-export field was added.

See [Phase 4 audit](PHASE4_DATABASE_PLANNER_AUDIT.md) for identity evidence, account conservation tests, and pipeline closure results.
