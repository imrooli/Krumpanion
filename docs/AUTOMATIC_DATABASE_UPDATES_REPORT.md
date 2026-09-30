# Automatic database updates: implementation and acceptance report

Updated 2026-09-29. This report includes Phase 1 work recovered from interrupted sessions and the subsequent hardening/farming phase. No Git commit was created; unrelated working-tree edits were preserved.

**The implementation and deterministic/live checks are complete. Mandatory Firefox acceptance remains blocked by a host browser-launch failure. It is not accurate to claim that every plan objective has been verified.** Supplementary Chromium results do not satisfy the Firefox requirement.

## Earlier Phase 1 work

Phase 1 replaced the retired provider integration with AnimeGameData2, preserving React/Vite, Zustand, Dexie, canonical records, and the change-set → override → `loadStaticData()` pipeline. Removed provider-specific adapters, collector/CLI tooling, manifests, examples, tests, scripts, and active documentation. Generic patch authoring and its non-provider-specific manifest remain available. Legitimate game-item names remain unchanged.

Identity work introduced optional positive game IDs, aliases, provenance, type-scoped resolution by ID/alias/key/unique normalized name, stable canonical keys across renames, and collision review. Exact character ascension, separate normal/skill/burst talent requirements, and weapon ascension take precedence over family and legacy fallbacks. Universal leveling constants and bundled Traveler behavior remain intact. Passive/internal talents, uncertain multi-depot avatars, future/test/abandoned records, and unsupported progression shapes are excluded or reviewed.

GOOD imports preserve unknown ownership/inventory and record deduplicated account-associated discoveries. Weapon instance IDs remain instance IDs. Import saves precede upstream checks; post-update resolution uses current account state rather than replaying stale inventory. Atomic validated activation preserves goals, equipment references, account separation, and inventory edits. Daily startup, unknown-GOOD, manual, and versioned bundle triggers were added. Schema 13 → 14 added application-wide update metadata and discoveries, included in full backup/restore but not leaked into account-only exports.

Database now opens on Game Data with Automatic Data, Farming Setup, Discoveries, and Diagnostics. Advanced retains generic patch authoring/raw overrides. Readiness/configuration requirements remain derived; exact costs can calculate before farming setup, and unresolved sources never acquire fabricated schedules. Guided configuration retains incomplete drafts and protects imported IDs/progression.

Phase 1 validation: typecheck/lint/build passed; 361 tests across 57 files passed; bundled validation had 0 errors, 690 warnings, 7 information; live pinned extraction/reconciliation and diff whitespace checks passed. The build retained a large-chunk warning. The following 19 sections record Phase 2 and supersede Phase 1's manual-only family/domain and jsdom-only browser coverage limits where evidence is provided.

Phase 1 modules include `src/adapters/{animeGameData2,gameDataTransport,gameDataProvider,gameData.worker,goodImport,persistence}`, `src/services/gameDataUpdates`, `src/domain/staticData/{entityIdentity,reconcileGameData,goodDiscoveries,upstreamTypes,upstreamSchema,validateExactRequirements,farmingConfiguration,plannerReadiness}`, `src/domain/progression/{exactRequirements,resolveCharacterProgression,resolveWeaponProgression}`, save migrations/types/schema, static-data compilation/validation, planner source classification/selectors, store persistence/actions, GameDataUpdateCenter/DatabaseTab/GOOD UI, fixtures/tests, and the dataset helper/documentation. Some modules also contain pre-existing unrelated changes; this list does not claim their entire diff.

## 1. Phase 1 runtime architecture verified

The normal browser remains the runtime. No proxy, repository clone, development test tool, or second database is required. Provider adapters normalize observations; pure domain reconciliation uses existing change sets, farming editors, overrides, and complete validation. Activation rebases against current state and persists before publishing to Zustand. Download-overlap browser tests and persistence-overlap integration tests exercise protection against stale user-state replay.

## 2. Browser E2E infrastructure and results

Added pinned Playwright 1.63.0 with required Firefox and supplementary Chromium projects. Seven scenarios run against a production Vite build, real Workers and IndexedDB. Transport is mocked at the browser-context boundary; tests assert UI behavior and saved state after reload.

Chromium: **7 passed**. Firefox: **7 failed before application execution**, all at `browserType.launch: spawn UNKNOWN`. Windows SideBySide events identify an unresolved `mozglue` assembly; direct execution reports incorrect side-by-side configuration. Reinstalling supported browser distributions and trying multiple versions did not resolve the host failure. Final configuration retains Playwright 1.63.0 / Firefox 155 build 1543. The user's installed Firefox/profile was not modified.

Playwright's Firefox is a patched testing build, not the installed personal browser ([official documentation](https://playwright.dev/docs/browsers)). Run `npx playwright install firefox` and `npm run test:e2e` on a working host to close this mandatory gate. Chromium is supplementary evidence only.

## 3. Live upstream validation

`npm run data:validate-upstream` passed at `b061b403c8afc7bca633cf4f201edc4a3baa75fe`, release 7.1.0. It performs metadata retrieval, commit-pinned downloads, SHA-256 generation/verification, bundle decoding, extraction, joins, reconciliation, and complete candidate validation. Ordinary tests never contact GitLab.

The run fetched 22 files and produced 10,675 normalized observations, 48 structured farming families, 77 added records, 2,136 changed records, 223 review findings, 359 progression changes, six activated family changes, six domain-relationship changes, and 369 affected character/weapon keys. Zero schedules were inferred. There were no unsupported-schema diagnostics or candidate integrity errors. Observations include unactivated material candidates; they are not import totals.

## 4. Schema-drift protections

Dataset-specific validators check minimum required shapes, field types/presence, formal-avatar identities, localization, and cost structures. Farming datasets receive their own checks. Structured diagnostics identify dataset, field, record when available, severity, code, and stage. Malformed required datasets abort the entire attempt. Expected exclusions, ambiguous relationships, and unsupported family shapes remain review findings. Partial downloads/parses never activate. Raw upstream payloads are not saved as logs.

## 5. Tier 3 relationships investigated

Investigated crafting chains, material ranks, progression usage, dungeon subtype, source groups, reward preview membership, entry reward membership, physical naming, explicit resin costs, and scheduling fields. Branching/conversion/randomized recipes, inconsistent costs, and ambiguous domain relationships are rejected or reviewed. Empty random-output slots are ignored; actual randomized output is excluded.

Classification uses structured combine types plus progression usage or released dungeon subtype, not English names or tier count alone. Arbitrary-length material arrays are representable in normalized/persisted relationship evidence. The current compiler activates supported three-tier talent/four-tier weapon families; unusual future shapes remain representable without a save migration, while planner support may require extension.

## 6. Actual upstream joins

| Data | Implemented relationship |
| --- | --- |
| Character identity | `Avatar.id` → `AvatarCodex.avatarId`, with formal/released filtering |
| Character ascension | `avatarPromoteId` → `AvatarPromote`, phase, `costItems`, `scoinCost` |
| Combat talents | `skillDepotId` → depot first two combat skills and `energySkill` → `AvatarSkill.proudSkillGroupId` → `ProudSkill` level/costs; passive/internal skills excluded |
| Weapon identity/ascension | `Weapon.id` → `WeaponCodex.weaponId`; `weaponPromoteId` → `WeaponPromote`; disused entries excluded |
| Material/name | Referenced costs → `Material.id`; name hashes → `TextMap_MediumEN` |
| Artifact identity | Codex suit → set → member reliquaries and equip-affix name; no farming extraction |
| Families | `Combine.materialItems` → `resultItemId`, increasing ranks, single actual input/output, structured type corroboration |
| Domain rewards | `MaterialSourceData.dungeonGroup` → `Dungeon` → `passRewardPreviewID` → `RewardPreview.previewItems`, corroborated by `DungeonEntry.descriptionCycleRewardList` |
| Physical domain name | `DungeonEntry.sceneId/dungeonEntryId` → scene-3 point `titleTextID` → `ManualTextMap.textMapId` → `textMapContentTextMapHash` → `TextMap_MediumEN` |
| Resin | Consistent explicit resin-item (106) costs across verified stages |

Excel table names above abbreviate the `ExcelConfigData` suffix. Physical domain identity/name, stage IDs, material family IDs, preview relationship IDs, and provenance remain separate fields. Availability belongs to family/material-source relationships, allowing different schedules at one physical location. Scene support currently covers the inspected scene-3 point file.

## 7. Automated farming data

Activates relevant unambiguous supported material chains, validated adjacent tiers, crafting recipes with explicit crafting mora costs, verified physical domain associations, and consistent resin costs. Existing keys survive; ordered material identities reconcile families and new keys are collision-checked. Only accepted progression/existing canonical material families are eligible.

RewardPreview establishes corroborated membership only. It never supplies guaranteed quantity, probability, expected yield, resin efficiency, or deterministic acquisition. Existing planner yield assumptions remain independent.

## 8. Deliberately manual data

Weekdays remain manual: obfuscated fields and array order do not establish weekday semantics. Boss/weekly sources, artifact farming, regional routes, and speculative drop rates remain manual. Missing schedules produce explicit configuration requirements and unresolved deficits, not fabricated planner tasks. Progression-complete entities still calculate costs and known-source tasks.

## 9. Manual precedence, persistence, and bundles

Added shared field provenance for family/source/availability/resin, relationship evidence, and deduplicated conflicts. Unannotated overrides and curated bundled relationships count as manual. Agreement preserves manual ownership; disagreement requests review; absent observations never delete manual values. **Keep manual** saves the decision. **Use upstream** applies the selected field, validates the entire candidate, and persists atomically. Advanced farming edits receive manual provenance.

Save schema **14 → 15** preserves inventory, overrides, discoveries, goals, and accounts while adding optional farming metadata, extractor capability, and compact statistics. Full backups/restore/hydration retain them; account-only boundaries remain unchanged. Interrupted attempts become retryable.

Bundle v2 declares capabilities and checks file integrity; v1 still imports Tier 1/2. Extractor capability is independent of Git revision: a new capability reprocesses an unchanged revision, reacquiring pinned files if necessary. A subsequent current-revision/current-capability check avoids downloads. There is no persistent raw-dataset cache. Worker parsing, bounded concurrency, and cancellation remain in use.

## 10. Farming Setup UX

The resource-centric queue groups shared needs. Established family/domain/resin values appear as compact summaries; users enter missing fields and can deliberately edit existing values. Monday–Sunday checkboxes support custom valid schedules alongside existing groups. One family schedule updates every consumer's readiness and planner output. Incomplete drafts remain explicitly unready. Form saves merge edited fields onto the latest effective configuration, preserving imported IDs/exact progression and updates arriving while the editor is open.

## 11. Update summaries

Summaries use actual added/changed/unchanged/review counts, progression and family/domain changes, remaining schedule requirements, and affected entity readiness. Known-only GOOD imports remain concise. New data offers focused farming configuration. Bundled version, upstream revision, extractor capability, and local effective version remain distinct.

## 12. GOOD workflow

Imports persist before upstream checks. Concurrent triggers share work; throttled GOOD checks queue one eligible retry and respect rate-limit windows. Restore/teardown cancels pending work. Manual network retry also honors active server retry windows.

Identity activation resolves preserved ownership before farming readiness. Recovery reads current account state. Browser tests retain an imported Mora baseline of 7 while a later edit to 99 survives the update; another account remains at 888. Unknown records/discoveries survive offline, HTTP, rate-limit, and malformed responses and resolve after retry. Existing instance IDs, equipment links, goals, and account isolation retain Phase 1 behavior.

## 13. Data Health audit

Reports now contain **0 errors / 673 warnings / 24 information**, still 697 total findings. No integrity error was downgraded. UI and Markdown group repeated/systemic findings with expandable evidence; JSON retains every detailed finding.

| Cause | Warnings before → after | Rationale |
| --- | --- | --- |
| Character rarity/type/status metadata | 234 → 234 (116/114/4) | Actionable bundled metadata retained |
| Unresolved weapon-family references | 20 → 20 | Repair/review still required |
| Generated legacy references already canonically resolved | 15 → 0 | Verified resolution; moved to information |
| Ley-line enemy mappings | 63 → 63 | Manual mapping warnings retained |
| Canonical character/source mirrors | 285 → 285 (222/63) | Grouped, detailed evidence retained |
| Refinement policy | 71 → 71 | No policy invented |
| Build directory/TypeScript build metadata | 2 → 0 | Informational build artifacts |
| Total | 690 → 673 | 17 moved to information; original seven retained |

This is the bundled baseline report, not an installed automatic update. Missing material sources and invalid crafting recipes are both zero. Automatic effective identity updates do not rewrite bundled JSON.

## 14. Observability

Latest attempt and last successful update statistics are persisted separately. A failed or unchanged check cannot erase previous successful statistics. Fields include trigger, revisions, stage/result, timestamps, duration, revision/dataset bytes, files fetched/reused, parse/reconcile/validation/persistence timings, deltas, and review counts. Only compact statistics/evidence are retained. Final persistence timing is saved as optional metadata after atomic activation; failure of that optional write cannot undo the update.

## 15. Measurements

Final live Node run: revision **3,272 bytes**, datasets **63,263,431 bytes**, 22 files; revision/download/checksum preparation **4,474 ms**, decode/checksum/parse **1,962 ms**, base assembly/reconciliation/validation **987 ms**, final validation **38.7 ms**. End heap **352,589,192 bytes**, RSS **601,051,136 bytes**, peak RSS **586,976 KiB**. Bytes are decoded UTF-8 payload sizes, not compressed wire traffic.

An earlier reconciliation/validation run took about 3,513 ms. Removing repeated full assembly between family operations and repeated linear lookups reduced the observed stage to about 987 ms while retaining final complete validation. These are individual observations, not a controlled benchmark.

Production Chromium fixture run: 22 files/**33,852 bytes**, download **92.9 ms**, worker parse **14.7 ms**, reconcile **177.4 ms**, validation **10.9 ms**, persistence **6.8 ms**, total update **452.8 ms**. A 50 ms timer observed a **402.4 ms** maximum gap including startup/rendering. Main-frame heap reported a coarse **10 MB**, excluding the worker; it is not a total-browser peak. Full-live browser memory/responsiveness and Firefox performance remain unverified. Node memory is not a browser measurement. Main-thread reconciliation remains measurable work.

## 16. Tests added

New farming extraction/reconciliation suites cover structured classification, increasing ranks, empty/random slots, domain ambiguity, conservative schedules, exact recipe costs, manual precedence, conflict resolution, custom weekdays, shared consumers, and missing/partial/craftable inventory. Extended tests cover schema drift, v1/v2 integrity, same-revision capability upgrades, queued retry/cancellation, migration/reload, persistence failures, and retained successful statistics.

Seven browser scenarios cover metadata-only startup; real-worker activation/reload/configuration/weekly planner; unknown GOOD recovery with edits and account isolation; offline/503/429/schema failure preservation and retry. Persistence-overlap concurrency is covered in integration tests, not independently gated inside a real browser transaction.

## 17. Validation results

| Check | Result |
| --- | --- |
| Typecheck | Pass |
| Lint | Pass; rules unchanged |
| Unit/integration | **380 tests / 59 files pass**, versus Phase 1 361/57 |
| Production build | Pass; existing large-main-chunk warning |
| `data:validate` | Pass: 0 errors, 673 warnings, 24 information; reports inspected |
| Required Firefox E2E | Blocked: seven browser-launch failures before app execution |
| Supplementary Chromium E2E | Seven pass |
| Live upstream validation | Pass: pinned downloads, integrity, parsing, joins, reconciliation, candidate validation |
| `git diff --check` | Pass |
| Retired-provider source audit | 30 matching lines; five legitimate game-item names in canonical/discovered material JSON |

## 18. Modified modules and limitations

Phase 2 files/modules, including updates to files originally introduced in Phase 1:

- Adapters: `src/adapters/animeSchema.ts`, `animeFarming.ts`, `animeGameData2.ts`, `gameDataTransport.ts`, `gameDataProvider.ts`, `gameData.worker.ts`, associated tests and `src/test/fixtures/farmingDataset.ts`/fixture JSON.
- Domain: `src/domain/staticData/upstreamTypes.ts`, `upstreamSchema.ts`, `types.ts`, `overrideSchema.ts`, `databaseChangeSet.ts`, `reconcileGameData.ts`, `reconcileFarming.ts`, `farmingConfiguration.ts`, `databaseEditor.ts`, `plannerReadiness.ts`, `canonicalMaterialRegistry.ts`, associated tests.
- Runtime/save: `src/services/gameDataUpdates.ts` and tests, `src/App.tsx`, `src/domain/save/types.ts`, `migrations.ts`, `src/adapters/persistence.test.ts`, `schemas/save.schema.json`.
- Scheduling: `src/utils/days.ts`, `src/domain/planner/groupByAvailability.ts`, `src/features/planner/plannerUiModel.ts`, `plannerFormatting.ts`.
- UI: `src/features/database/GameDataUpdateCenter.tsx` and tests, `DataHealthCenter.tsx`, `src/features/import/GoodImportPanel.tsx`.
- Tools/reports: `tools/data/validate-upstream.ts`, `fetch-game-dataset.ts`, `validate-static-data.ts`, `codex/reports/static_data_health.json`, `static_data_health.md`.
- Test/build: `e2e/updates.spec.ts`, `playwright.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vite.config.js`, `eslint.config.js`, `.gitignore`.
- Docs: `README.md`, `docs/AUTOMATIC_DATABASE_UPDATES.md`, this report, `FARMING_DATA_PIPELINE.md`, `DATABASE_PIPELINE.md`, `GOOD_IMPORT.md`, `PLANNER_ENGINE.md`.

Existing unrelated crafting, artifact, checklist, loot-model, planner presentation, generic patch-wizard, and source-data edits were preserved; this inventory does not claim their whole diff. The pre-existing ZIP was not changed. No reset/rebase/commit was performed.

Outstanding limits: Firefox gate; full-live browser memory/responsiveness; existing bundled warnings; scene-3-only physical localization; review-only unusual compiler shapes; manual weekdays/bosses/artifact farming; existing large bundle. SHA-256 detects corruption, not publisher authenticity. Low-rarity weapon planning, ambiguous multi-depot progression, and conservative release-date handling retain Phase 1 limits.

## 19. Next target

First close the required Firefox gate on a working Playwright Firefox host. Next investigate an authoritative weekday relationship through the normalized observation/provenance boundary. Manual weekday entry remains supported regardless of future automation. Never infer schedules from array order or English names.


# Phase 3 completion report — 2026-09-29

This section supersedes earlier acceptance counts and limitations only where new evidence is stated. It includes the work resumed after the usage interruption. Phase 1/2 architecture and unrelated uncommitted work were preserved. No commit, reset, personal-browser modification, or new application runtime service was introduced.

Phase 3's accepted outcome is met: database debt is repaired/classified, Firefox is reproducibly isolated as an external launch blocker, and weekday automation is deliberately rejected because authoritative semantics were not established. Firefox application compatibility itself is still unverified; environmental isolation is not a Firefox pass.

## 1. Firefox diagnosis and acceptance status

A standalone Playwright launch, independent of Vite and application code, fails with `browserType.launch: spawn UNKNOWN`. Windows Application/SideBySide reports that activation context generation for `firefox-1543/firefox/firefox.exe` cannot resolve assembly `mozglue, language=*, type=win32, version=1.0.0.0`. The expected executable and DLL both exist; their sizes, SHA-256 hashes, embedded manifest text, installed Playwright version 1.63.0, and reproduction classification are captured in `codex/reports/phase3_firefox_diagnosis.json`.

No repository configuration cause was demonstrated. The supported Firefox 155 build cannot start on this Windows host. No equivalent reinstall was repeated in Phase 3, and no personal Firefox/profile or system configuration was changed. On a compatible host run `npm ci`, `npx playwright install firefox`, and `npm run test:e2e`. Playwright uses its patched testing browser, not installed personal Firefox.

## 2. Browser E2E results

All seven original application scenarios remain intact against the production Vite build, real Workers and IndexedDB, with browser-context transport interception. Shared seed/transport/readback helpers moved into `e2e/support.ts`; assertions were not weakened. Chromium: seven passed. Firefox: seven launch failures before any application scenario executed, classified as environmental blockage. Current-revision startup, update/reload, farming/manual weekdays/weekly planner, unknown GOOD recovery, account isolation, edits during synchronization, offline/503/429/schema failure and retry remain covered.

A separate performance configuration runs five opt-in browser benchmarks; it does not change the seven-test acceptance suite.

## 3. Data Health totals

Before: **0 errors / 673 warnings / 24 information**. After: **0 errors / 65 warnings / 94 information**. No integrity error was suppressed. Reports were regenerated and inspected. Canonical catalog now contains 240 weapons rather than 230. Complete character profiles increased from 119 to 122 out of 125. Missing material sources and invalid crafting recipes remain zero.

Field-level repair evidence is in `phase3_canonical_repairs.json`; category snapshots are in `phase3_health_comparison.json`. A second repair preview produced **zero further repairs**, retaining only Nicole's status review.

## 4. Data Health categories

| Condition | Warnings before | Repaired | Deduplicated | Moved to information | Warnings after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Character rarity/type/status | 234 | 233 | 0 | 0 | 1 |
| Unknown weapon identities in family references | 20 | 20 | 0 | 0 | 0 |
| Ley-line mappings | 63 | 0 | 0 | 0 | 63 |
| Canonical character mirrors | 222 | 222 | 0 | 0 | 0 |
| Canonical source mirrors | 63 | 0 | 63 | 0 | 0 |
| Refinement default policy | 70 | 0 | 0 | 70 | 0 |
| Duplicate weapon display names | 1 | 0 | 0 | 0 | 1 |
| Total | 673 | 475 | 63 | 70 | 65 |

Correction to Phase 2's narrative: its 71 canonical weapon findings comprised **70 missing explicit refinement policies plus one duplicate-name finding**, not 71 refinement policies. That duplicate finding remains. The 222 character mirror findings disappeared because their underlying metadata was repaired, not because their severity was reduced.

## 5. Character metadata repairs

The development-only `data:repair-canonical` command consumes an integrity-checked v1/v2 dataset bundle through the same parser. Preview is the default; `--apply` writes validated canonical character/weapon files. It never reads local user overrides.

Repaired 116 game IDs, 116 rarities, and 114 weapon types. Existing keys, farming fields, curated nonempty metadata, and user state are preserved. Matches use the shared ID/alias/key/unique normalized identity resolver; no fuzzy matching. Changes carry upstream table/revision provenance. Both canonical and complete effective validation run before writes.

Prune, Lohen, and Sandrone now have verified/live/planner-eligible profiles: the release-filtered observation and every supported bundled ascension/normal/skill/burst cost agree. Nicole remains beta because her bundled progression does not exactly agree. Structural completeness alone is insufficient to promote her.

## 6. Weapon-family repairs

The 20 findings were identity-reference failures involving ten one-/two-star weapons, not missing new Combine chains. Added verified upstream catalog identities for Dull Blade, Waster Greatsword, Beginner's Protector, Apprentice's Notes, Hunter's Bow, Silver Sword, Old Merc's Pal, Iron Point, Pocket Grimoire, and Seasoned Hunter's Bow.

Existing canonical family usage references now resolve to those identities. Catalog rarity accepts 1–5, while progression goals and refinement tracking remain restricted to supported records. Low-rarity records explicitly use `plannerEligible=false`, `refinementTrackable=false`, and `not_trackable`. Missing low-rarity progression families are not fabricated; populated invalid references still fail validation.

## 7. Canonical mirror audit

The duplicate findings come from canonical validation plus effective-data validation being appended into one report. Findings now carry semantic condition evidence: record type, field, condition kind, and observed value. The combined report merges only equal entity/condition/value/severity signatures and retains both canonical/effective origins, codes, and messages. Different values, severities, or conditions remain separate. Standalone canonical validation still operates independently.

The 63 canonical ley-line mirror findings are now represented by their corresponding actionable effective finding with both evidence sources. Detailed JSON retains that evidence rather than hiding it behind a lower count.

## 8. Ley-line and refinement findings

All 63 ley-line conditions remain actionable: 54 fungus cases combine six materials from distinct drop families, and the others involve Electro Cicin (3), Hydro Cicin (3), Flying Serpent (2), and Eye of the Storm (1). Existing data does not establish a safe single unconditional progression drop mapping for these cases. No rewards, schedules, or guaranteed farming yields were invented. Fungus conditional drops remain an unsupported mapping feature; remaining absent mappings require authoritative evidence, including evidence of no relevant drop where appropriate.

Five-star refinement already defaults to manual review in effective data. The 70 missing explicit policy entries therefore describe an established intentional default, now informational. Invalid policies and invalid low-rarity eligibility remain errors.

Three unresolved Prized Isshin Blade records share a display name. Their identity ambiguity remains a warning rather than being conflated into one weapon or silently aliased. Nicole's progression mismatch is genuine remaining bundled repair/review work.

## 9. Weekday datasets and fields investigated

The pinned revision remains `b061b403c8afc7bca633cf4f201edc4a3baa75fe`. Enumerated all 2,234 Excel entries and the BinOutput roots; inspected related Global/Common/Scene/ActivityPreview/QuestBrief trees and 35 candidate datasets. `phase3_weekday_investigation.json` records paths, fields, sample IDs and enum evidence. `FARMING_DATA_PIPELINE.md` explains each candidate's disposition.

The audit covered DailyDungeon, Dungeon/Entry/Pass/Roster/Serial, OpenState/OfferingOpenState, QuestSchedule tables, activity/battle-pass/return/combat/tower schedules, Common combat configuration, and physical scene points. Followed the relevant physical entry IDs and inspected roster stage IDs. No fetch failed in this audit.

## 10. Authoritative weekday decision

**Not established; automatic weekdays were not implemented.** DailyDungeon stage arrays are obfuscated. Entry conditions express level/quest access; dungeon counters and settlement timers do not encode a proven weekday mask. Roster record 1 has a 10080 cycle value and stages 110–125, but does not establish a talent/weapon family weekday relationship. Quest training-day and activity day counters belong to other systems. Sunday semantics could not be proven from the same structured model.

This conclusion concerns the inspected evidence, not an assertion that no private/server-side schedule can exist. Future evidence must establish controlling field semantics and deterministic joins across several known rotations, including Sunday. Pattern matching, names, and array order remain prohibited inference sources.

## 11. Weekday joins

No weekday join or weekday capability was added. Existing verified family/domain/reward joins remain active. Regression tests inject observed obfuscated daily fields and reorder reward groups; availability must remain absent. No schedule was created in live validation.

## 12. Manual precedence

Manual family/source/resin/weekday fields, provenance and conflict actions retain Phase 2 behavior. Custom `DAYS_` schedules still drive shared readiness and weekly planning. Configuration survives missing or ambiguous upstream evidence. No user farming data was promoted into the baseline. No upstream-specific planner branch was added.

## 13. Extractor and persistence compatibility

Extractor capability increases **2 → 3** for scene-dependent extraction, independently of Git revision. Same-revision capability upgrades reprocess; subsequent current checks avoid downloads. Tests now cover progression through capabilities 1, 2, and 3.

New v2 bundles declare `scene-points` and include every scene file required by their eligible entries. Old v2 bundles remain capability 2 and v1 bundles remain capability 1. Save schema stays **15**; no incompatible persisted-field change or account-export expansion was needed. Existing provenance/conflicts/reload tests remain passing.

## 14. Scene coverage

All 16 currently relevant physical domain entries are in scene 3, so no current domain was claimed to be missing solely because of scene coverage. The loader nevertheless now derives unique physical scene IDs from eligible entries, fetches their point files at the same commit, validates integrity/shapes, and localizes via the existing point/manual-text/MediumEN join. Stage scenes and physical domain scenes stay distinct. Tests cover scene 99, deduplication, missing/malformed files, and legacy bundle behavior.

## 15. Browser performance

Five Chromium production runs before and five after; hydration excluded, 33,852 decoded fixture bytes. Complete samples are in `phase3_browser_performance.json`.

| Measurement, ms | Before median / worst | After median / worst |
| --- | --- | --- |
| Worker decode/parse | 11.8 / 16.2 | 14.5 / 18.2 |
| Reconciliation | 165.1 / 179.1 | 131.3 / 155.0 |
| Final validation | 8.7 / 9.6 | 13.1 / 14.7 |
| Persistence | 15.7 / 21.9 | 3.4 / 20.3 |
| Maximum timer gap | 208.4 / 965.6 | 181.4 / 206.9 |
| Maximum frame gap | 194.3 / 959.3 | 165.3 / 175.1 |
| UI navigation/filter interaction | 540.3 / 2214.0 | 591.4 / 620.5 |

Before-run 1 was affected by host contention; it remains in the report. UI interaction includes Playwright waits/navigation/typing and is not isolated input-event latency; its median did not improve. The benchmark does not measure full-live browser memory or Firefox performance. No total-browser peak is claimed.

Removed one redundant intermediate complete database assembly before farming reconciliation. The final candidate still undergoes full assembly, exact-requirement checks and integrity validation. Latest-state rebasing, serialized IndexedDB persistence and Zustand publication remain unchanged. The bounded measurements support this local optimization; they do not establish that adding another worker, transferring complete snapshots and duplicating the canonical module graph would provide a worthwhile overall improvement. Such a change was not shipped. Main-thread reconciliation remains measurable work.

## 16. Downloads and live validation

All 22 current files still have consumers: 15 identity/progression/localization files, six farming tables, and the one required physical scene file. The report includes each file's bytes and SHA-256. No duplicate localization fetch, permanent raw cache, partial-file hack, proxy, or clone was added. Scene requests are deduplicated within the attempt. Required integrity verification remains intact.

Live validation passed metadata, pinned downloads/checksums, decoding, parser/joins, reconciliation and full candidate validation. Payload: 3,272 revision bytes and 63,263,431 dataset bytes. It found 10,675 observations, 48 structured farming families, six activated family/domain changes, 359 progression changes, 223 review findings, and zero inferred schedules or schema diagnostics. After bundled repair, the delta is 67 added / 2,146 changed / 0 unchanged (the ten low-rarity identities now exist in the baseline).

Observed Node timings: download 3,233 ms; decode/parse 2,151 ms; base assembly/reconciliation/validation 883 ms, including final validation 46.1 ms. End heap 402,892,928 bytes, RSS 642,650,112 bytes. These are host-dependent Node measurements, not browser responsiveness or memory claims. `phase3_live_validation.json` retains the exact output.

## 17. Production bundle analysis

`data:analyze-bundle` builds static versus lazy Database navigation from the same repaired source/data, without rewriting application source. Initial JS decreases from **3,271,176 bytes / 545,281 gzip** to **3,050,488 bytes / 499,313 gzip**, deferring a **220,471-byte / 47,163 gzip** Database chunk. Worker output is approximately 72.6 KB. The split has a small aggregate gzip overhead; its benefit is deferred startup code, not smaller total application functionality.

Module evidence in `phase3_bundle_analysis.json` shows the largest rendered contributors remain canonical material data, ley-line coverage data, recipes/material sources, and shared libraries. These are planner/runtime data, not merely recent diagnostics UI. The large-chunk warning remains unchanged; thresholds were not raised. Broader data partitioning was not justified within this maintenance phase.

## 18. Tests and changed modules

Added seven deterministic tests across canonical repair/evidence merging, scene extraction/transport, and rejected weekday inference; extended existing tests for malformed scenes, informational refinement defaults, and capability 3. Total: **387 tests across 60 files**, compared with 380/59. Added five opt-in performance cases while retaining seven acceptance scenarios.

Phase 3 contributions:

- New `src/domain/staticData/repairCanonicalDatabase.ts` and tests; `tools/data/repair-canonical.ts`; repaired canonical character/weapon JSON.
- Canonical schema/validation/rules/tests; optional baseline injection in assembly/loading; structured findings/merging in static validation and validation tooling.
- Anime farming/parser/transport and tests: dynamic scene paths, capability 3, backward-compatible bundles.
- `reconcileGameData.ts`: reuse the intermediate effective view; retain complete final validation.
- `src/app/navigationRegistry.tsx`: lazy Database workspace.
- `e2e/support.ts`, existing scenarios, new `performance.spec.ts`, separate performance configuration, service capability tests, package/test/lint/type configuration.
- `tools/data/analyze-bundle.ts`; seven Phase 3 audit JSON reports; updated health reports and architecture/database/GOOD/planner/readme documentation.

Other pre-existing crafting, checklist, artifact, loot-model, planner UI and patch-authoring changes were preserved. No ownership of those unrelated diffs is claimed.

## 19. Final validation

| Check | Result |
| --- | --- |
| Typecheck | Pass |
| Lint | Pass, rules unchanged |
| Unit/integration | 387 tests / 60 files pass |
| Production build | Pass; large-main-chunk warning retained |
| Data validation | 0 errors / 65 warnings / 94 information |
| Firefox E2E | Environmentally blocked: seven launch failures before app execution |
| Chromium E2E | Seven pass |
| Performance suite | Five before + five after pass |
| Live upstream pipeline | Pass |
| Canonical repair repeat | Zero additional repairs; Nicole review preserved |
| Diff whitespace | Pass |

## 20. Remaining limits

Firefox application execution remains unverified on this host. Weekdays, boss sources and unsupported farming relationships remain manual. The remaining 65 warnings identify 63 unresolved ley-line mappings, Nicole's status/progression mismatch, and one duplicate weapon-name group. Full-live browser memory/responsiveness is not measured. Reconciliation still runs on the main thread. Large canonical data keeps the initial bundle above Vite's advisory threshold. Old bundles cannot provide new scene evidence they do not contain.

## 21. Next development target

Resolve Nicole's exact bundled progression mismatch and establish stable upstream identities for the Prized Isshin Blade variants. Investigate conditional fungus drop modeling only with explicit conditions and without turning possible drops into guaranteed rewards. Firefox verification can run independently on a compatible host. Weekday automation should wait for authoritative field semantics; manual scheduling remains a permanent supported workflow.
# Phase 4: Database closure and account-level planner audit

The complete [19-part Phase 4 report](PHASE4_DATABASE_PLANNER_AUDIT.md) separates this phase's changes from the preceding Phase 1–3 history. It includes the ten requested audit layers, Nicole's actual material-lookup mismatch, Prized Isshin Blade identities, retained ley-line findings, accounting and UI fixes, policy characterizations, validation evidence, and the maintenance-mode decision.

