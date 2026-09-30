# Automatic database updates

Krumpanion updates Tier 1 identities and Tier 2 progression requirements from [AnimeGameData2](https://gitlab.com/Dimbreath/animegamedata2). Verified Tier 3 material families, domain relationships, crafting costs, and resin costs are also extracted. Weekdays, boss sources, artifact farming, and unresolved relationships remain manually configured. React/Vite, Zustand, Dexie, the canonical bundle, and the existing change-set/override pipeline remain in use.

## Application workflow

Database opens on **Game Data**. It displays the bundled database version, effective local-update counter, checked and applied upstream revisions, upstream release, timestamps, current check state, import counts, and errors. Checks run after hydration at most once per 24 hours, after a saved GOOD import with unknown entities, and from **Check for Updates**. Automatic GOOD retries have a 60-second minimum interval. Simultaneous triggers share one operation. Server Retry-After windows also apply to manual network retries; local bundle import remains possible.

**Automatic Data** lists synchronized identities and character/weapon readiness. **Farming Setup** shows the exact missing fields and affected entities. Select a material, choose or create its source, supply its availability and resin cost where applicable, and link the material tiers when a domain or enemy family is needed. Existing identities and exact progression are preserved. Incomplete drafts can be saved and remain explicitly unready. Configuration immediately rebuilds the effective database and planner output. **Discoveries** retains unknown GOOD identities and ignore decisions. **Diagnostics** contains upstream review findings and the existing data-health diagnostics. Portable patch authoring, validation, commit, and raw overrides are under **Advanced**.

Imported records can have complete progression while farming setup is still required. Their costs and inventory deficits are calculated immediately. Unconfigured sources have UNKNOWN availability and are not scheduled. Established materials continue to be planned. Readiness and tasks are derived; neither is saved as authoritative game data. Established nonfarmable rewards, such as Crown of Insight, do not acquire invented schedules.

## Provider boundary and actual joins

The inspected and exercised release revision is `b061b403c8afc7bca633cf4f201edc4a3baa75fe` (release metadata 7.1.0). GitLab schemas and transport are confined to `src/adapters/`. Provider-neutral observations, identities, provenance, diagnostics, reconciliation, and readiness live in `src/domain/staticData/`; orchestration lives in `src/services/gameDataUpdates.ts`.

| Entity/data | Relationship |
| --- | --- |
| Character identity | `AvatarExcelConfigData.id` joined to `AvatarCodexExcelConfigData.avatarId` |
| Character ascension | `avatarPromoteId` joined to `AvatarPromoteExcelConfigData.avatarPromoteId`; phases 1–6 use `promoteLevel`, `costItems`, `scoinCost` |
| Combat talents | `skillDepotId` joins `AvatarSkillDepotExcelConfigData.id`; `skills[0]`, `skills[1]`, `energySkill` join `AvatarSkillExcelConfigData.id`; `proudSkillGroupId` joins `ProudSkillExcelConfigData.proudSkillGroupId`; levels 2–10 use `costItems`, `coinCost`, and `breakLevel` |
| Weapon identity | `WeaponExcelConfigData.id` joined to `WeaponCodexExcelConfigData.weaponId` |
| Weapon ascension | `weaponPromoteId` joins `WeaponPromoteExcelConfigData.weaponPromoteId`; phases 1–6 use `promoteLevel`, `costItems`, `coinCost` |
| Material identity | Referenced cost-item IDs join `MaterialExcelConfigData.id`; Mora uses material 202 |
| Artifact identity | `ReliquaryCodexExcelConfigData.suitId` joins `ReliquarySetExcelConfigData.setId`; `containsList` members join `ReliquaryExcelConfigData.id` and must have the same `setId`; `equipAffixId` joins `EquipAffixExcelConfigData.id` for its name hash |
| English localization | Name hashes resolve through `TextMap/TextMap_MediumEN.json` |

The larger TextMapEN file is not substituted: sampled entity names were absent there. Missing localization produces a finding, never a hash-valued display name. Character activation requires a formal avatar, codex entry, elapsed release date, valid rarity/weapon/element, one supported skill depot, and complete supported progression. Uncodexed, abandoned, test, future, and ambiguous multi-depot avatars remain excluded/reviewed. Bundled Traveler behavior and existing special-avatar exclusions are preserved. Codex dates have no timezone; activation conservatively waits until the end of that UTC date. Weapons require codex membership and must not be marked `isDisuse`. Rarity 1–2 weapons are identity-only because planner progression supports rarity 3–5.

Only the three combat skill relationships are followed; passive/internal skills and constellation-only talent levels are excluded. Empty `{}` cost slots are ignored. Unsupported relationships, missing references, duplicate identities, malformed tables, and invalid quantities cannot silently become active progression. Expected per-record exclusions are diagnostics; missing/malformed required table containers, duplicate required table IDs, or unusable required character/weapon datasets abort the entire update.

New materials are activated when referenced by accepted progression or validated adjacent tiers in an eligible farming family. The same material table reconciles identities already in the effective database. An unmatched GOOD material can receive an upstream candidate ID for review without activating arbitrary internal items. Upstream fields do not establish farming categories reliably, so new materials start conservatively as `other`.

## Transport and offline bundles

The browser checks GitLab API revision metadata first, then pins core tables and required scene-point requests (22 files at the inspected revision) to that commit. At most three requests run concurrently. Fetching the large files, SHA-256 integrity checks, JSON parsing, and extraction run in a Vite module worker. Cancellation terminates the worker. Failed downloads never reach activation; unchanged applied revisions with the current extractor capability avoid dataset downloads. GitLab CORS was verified; no proxy or repository clone is needed.

To produce an importable bundle from the current revision:

```powershell
npm run data:fetch-upstream -- "D:\Downloads\krumpanion-game-dataset.json"
```

Open **Database > Game Data > Import Dataset Bundle** and select the result. Current bundle format version 2 is JSON with `format: "KrumpanionGameDataset"`, `version: 2`, capabilities `identity-progression`, `farming`, and `scene-points`, `provider: "animegamedata2"`, the 40-character `revision`, optional `releaseVersion`, and `files`. Each required path maps to `{ "sha256": "...", "content": "raw UTF-8 JSON text" }`. Every required file must be present and its digest must match. Both live and file import use `decodeAnimeBundle`, `parseAnimeGameData2`, and the same reconciliation/validation/activation path. Integrity detects corruption, not publisher authenticity. Raw upstream datasets are not retained in browser storage.

## Identity, exact costs, and manual edits

Optional positive-integer `gameId`, aliases, and provider-neutral provenance extend canonical and effective identities. Legacy saves and bundled records may omit IDs. New upstream observations must supply them. Type-scoped indexes resolve by game ID, explicit alias, canonical key, then a unique normalized name. Ambiguity and conflicts require review. Existing keys survive display-name changes; previous display names become aliases. New keys follow the existing PascalCase conventions and are checked for collisions.

`DatabaseChangeSet.automaticData` compiles into optional identity, artifact-set, `exactCharacterRequirements`, and `exactWeaponRequirements` override sections. Old manifests still compile. Exact requirements store phase deltas and separate normal/skill/burst talent deltas. Resolution uses exact requirements first, existing family formulas second, and legacy compatibility last; automatic exact data is never labeled legacy. Universal character/weapon EXP and leveling constants are reused. Both goal normalization and cost subtraction use the corresponding combat talent's ascension prerequisite.

Synchronization preserves material sources, families, recipes, schedules, resin settings, and other manual farming fields. Overrides without provenance are treated as manual. Conflicting manual identity or progression edits remain active and produce review diagnostics. Editing an imported identity or exact table records its manual protection. Configuring a family preserves imported IDs/provenance; adding a family to an existing domain preserves that domain's other rewards. Configured boss/domain resin costs feed both expected and guaranteed estimates. Weekly discounted cost is editable here; the established trounce-domain full cost remains available through Advanced.

## Persistence and GOOD recovery

Save schema **15** adds application-wide `gameDataUpdates` metadata and account-associated discoveries. Full exports, hydration, imports, and recovery points include these fields. Account-only exports stay account-scoped. Earlier saves migrate with empty update metadata and retain inventories/overrides. Interrupted checks reload as failed/retryable, and in-progress discoveries become detected.

Checks track `checkedRevision` separately from `appliedRevision`. Activation reconciles against the latest effective database, validates the complete candidate, and saves overrides, account references, and applied metadata together in one Dexie document write before publishing to Zustand. Store edits and updater writes share a serialized read/save/publish queue, with changes rebased onto the latest state. Failed network, parsing, validation, or persistence leaves the prior effective database active. Clearing overrides invalidates the applied revision so the same upstream commit can be reapplied.

GOOD is ownership/inventory evidence, never static-data truth. The GOOD snapshot is saved before a check starts. Unknown characters, weapon instances, materials, and artifact sets survive import. Discoveries deduplicate by entity type and normalized raw identity, retaining account associations, first/last timestamps, candidate identity, status, notes, and ignored decisions. Successful activation resolves the current account snapshots rather than replaying an old import. Manual inventory edits, imported baselines, copy-specific weapon IDs, equipment links, goals, and account boundaries are preserved. GOOD weapon IDs are instance IDs, never upstream game IDs. Unchanged revisions and ambiguous matches retain discoveries for review. Known-only imports keep a concise status; unknown imports expose check results, counts, and a direct Farming Setup action.

## Validation and limits

Small fixtures derive from the pinned upstream revision, with deterministic clocks and mocked transport. Tests cover extraction, identity conflicts, rename/idempotence, manual protection, exact costs/prerequisites, missing/partial/craftable inventory, incomplete setup, GOOD recovery, account references, write overlap, cancellation, throttling/rate limits, corrupt bundles, migration/recovery, persistence failures, and the new-character/new-weapon configuration scenario. See [the implementation report](AUTOMATIC_DATABASE_UPDATES_REPORT.md) for the executed commands and results.

This feature does not automate weekdays, boss relationships, drop rates, regional routing, artifact farming sources, passive talents, ambiguous multi-depot progression, low-rarity weapon planning, or unsupported progression shapes. Browser worker/Web Crypto support and enough memory for the upstream files are required. Current data includes a roughly 20 MB English text map; bundle files are larger because they retain raw JSON text. Network availability and upstream schema changes can require a retry, bundle import, or adapter update. Future weekday automation requires an authoritative relationship behind this same boundary and must preserve manual provenance rules.

## Production hardening and farming relationships (schema 15)

See [Farming Data Pipeline](FARMING_DATA_PIPELINE.md) for verified material-family/domain joins, manual-field provenance, conflict review, shared weekday configuration, schema drift, and capability-aware reprocessing. The current extractor capability is 3; current save schema is 15. Version-1 dataset bundles remain supported for identity/progression.

Database > Diagnostics retains the latest attempt separately from the last successful change summary. A check may reprocess the same upstream revision when the extractor capability advances. Update summaries distinguish additions, changes, unchanged records, progression changes, and configured farming relationships.

Phase 3 repairs stable bundled metadata through `npm run data:repair-canonical -- <bundle.json>` (preview) and the explicit `--apply` option. The command validates the full candidate, preserves conflicting curated fields, and never reads local user overrides. See the implementation report for the completed repair audit and weekday evidence.
# Phase 4 closure

The [Phase 4 database and planner audit](PHASE4_DATABASE_PLANNER_AUDIT.md) records canonical identity repairs, account-wide accounting and crafting corrections, manual workflow counts, and the maintenance-mode recommendation. Save schema remains 15 and extractor capability remains 3. No new upstream relationship or weekday inference is introduced.

