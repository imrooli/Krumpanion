# Farming data pipeline

This extends the Phase 1 identity/progression updater. React/Vite, Zustand, Dexie, and the canonical database remain unchanged as architectural choices. No proxy, browser extension, repository clone, or additional runtime database is required.

## Boundaries and verified joins

The source inspected and exercised is AnimeGameData2 revision `b061b403c8afc7bca633cf4f201edc4a3baa75fe`. Extractor capability 3 requests the 21 core/farming tables and the distinct scene-point files referenced by eligible talent/weapon dungeon entries. The inspected revision needs one scene file, so it still downloads 22 files. Capability-2 bundles retain their fixed scene-3 behavior.

1. `CombineExcelConfigData.materialItems[].id → resultItemId` establishes ordered upgrade edges. Accept a single real input, three inputs per output, one output, increasing material ranks, explicit coin costs, and no real random-item/drop relationship. Empty upstream slots are ignored.
2. Combine classification is corroborated by accepted talent/weapon progression usage or released dungeon subtype. English names and chain length are never classification evidence by themselves.
3. `MaterialSourceDataExcelConfigData.id → dungeonGroup[] → DungeonExcelConfigData.id` establishes stages. Each accepted stage must be released and match the family classification.
4. Stage `passRewardPreviewID → RewardPreviewExcelConfigData.id → previewItems[].id` establishes possible reward membership. The family must also match a unique `DungeonEntryExcelConfigData.descriptionCycleRewardList` entry of the correct type.
5. Entry `sceneId/dungeonEntryId → BinOutput/Scene/Point/scene{sceneId}_point.json.points → titleTextID → ManualTextMapConfigData.textMapId → textMapContentTextMapHash → TextMap_MediumEN` supplies the physical domain name.
6. Consistent stage `statueCostID = 106` and positive `statueCostCount` supply the resin cost. Inconsistent costs remain manual.

Reward previews supply **no quantities, probabilities, expected yield, guaranteed drops, or resin-efficiency estimates**. Existing planner yield models remain independent.

## Independent relationships

Provider-neutral farming observations retain arbitrary-length ordered material IDs, recipe IDs and coin costs, stage IDs, reward-preview IDs, and optional physical domain identity. They are persisted as evidence in the override pack. Current compiler activation supports the existing three-tier talent and four-tier weapon profiles; other shapes remain review findings without requiring a save-schema change to represent them.

Physical domains and stage/reward relationships remain distinct. Effective families reference physical source keys; availability belongs to the family/source relationship. Two families at the same location can have different schedules. Domain identity is not a weekday schedule.

Missing scene evidence in older bundles, ambiguous rewards, conflicting families, missing localization, or unsupported shapes do not manufacture source metadata. The adapter only imports adjacent material tiers through a supported relationship relevant to accepted progression or existing canonical identities.

## Manual precedence and review

`farmingOrigins` tracks each resource's family, source, availability, and resin-cost provenance. Unannotated overrides and curated bundled values are protected. Manual edits in guided and advanced editors mark changed fields as manual.

- Agreement keeps manual meaning and provenance.
- Disagreement retains the configured value and creates a deduplicated conflict.
- Missing upstream observations never delete manual values.
- **Keep manual** records a review decision. **Use upstream** applies the selected field, validates the complete candidate, and persists before publishing.

Configuration, provenance, conflicts, and relationship evidence are saved. Readiness, requirements, and planner recommendations remain derived.

## Supported manual weekdays

The daily scheduling table's field names are obfuscated, and the reward arrays do not define their weekday semantics. This phase deliberately does not extract automatic weekdays. Boss sources and artifact farming also remain manual.

Farming Setup summarizes known family/domain/resin information and asks for unresolved fields. Users select weekdays directly. Familiar combinations reuse existing availability keys; other selections use a validated seven-bit `DAYS_` value in Monday–Sunday order. Empty selection means unresolved availability. No schedule is inferred from a physical domain or its reward list.

One saved family configuration applies to every tier and every consuming character/weapon. Incomplete drafts are allowed. Exact costs and GOOD ownership continue working before farming setup is finished; unresolved sources are excluded from scheduling while known sources remain usable. Custom weekdays also appear in the planner's weekly groups.

## Revision, persistence, and failure handling

Save schema 15 adds optional farming metadata, extractor capability, latest-attempt statistics, and the last successful delta. Schema 14 and older saves migrate without removing inventory, overrides, or account associations. Interrupted checks become retryable. Full backups include shared metadata; account-only exports retain their existing account scope.

The updater checks both the upstream revision and applied extractor capability. Capability 3 reprocesses the same commit previously processed by capability 1 or 2. Unchanged revision plus current capability downloads no datasets. Bundle v2 declares farming capability and verifies every required file; v1 remains a supported Tier 1/2 import.

All required files must download, decode, and pass minimum schema checks. Unsupported schemas produce dataset/field diagnostics and leave the previous effective database active. Expected entity exclusions and ambiguous farming relationships remain review findings. GOOD-triggered checks share in-flight work or queue one throttled retry; teardown and restore cancel queued work.

## Verification commands

```sh
npm run typecheck
npm run lint
npm test -- --maxWorkers=2 --minWorkers=1
npm run build
npm run data:validate
npx playwright install firefox
npm run test:e2e
npm run data:validate-upstream
git diff --check
```

The Firefox suite uses the production build, real workers and IndexedDB, and mocked GitLab responses. [Playwright's Firefox](https://playwright.dev/docs/browsers) is a patched testing build, not the user's installed browser. `test:e2e:chromium` is supplementary coverage, not a substitute for the required Firefox result. The live validation command is explicitly opt-in and never runs in the deterministic test suite.

The next automation target is an authoritative weekday mapping. Add it behind normalized observations and field provenance only after its semantics are verified; continue supporting manual weekdays independently.


## Phase 3 weekday investigation — 2026-09-29

Decision: authoritative weekday semantics were **not established**. Manual weekdays remain the supported source of truth. No weekday capability or schedule inference was added.

The audit pinned `b061b403c8afc7bca633cf4f201edc4a3baa75fe`, enumerated all 2,234 Excel entries and all BinOutput root directories, inspected related Global/Common/Scene/ActivityPreview/QuestBrief trees, and examined 35 candidate datasets. The file/field inventory, sample IDs, enumerated values, and required-dataset byte/checksum inventory are in `codex/reports/phase3_weekday_investigation.json`. This is evidence for the examined candidates, not proof that undisclosed server-side scheduling data cannot exist.

| Candidate | Evidence and rejection reason |
| --- | --- |
| `DailyDungeonConfigData` | 64 records; IDs 17/18/19 reference dungeon stages through fields such as `OCGGLOILBEP`, `PJABKILGJOB`, `HGOMAGALBND`, `DFABLBFHHGH`, `BEJMGNPMKJN`, `NDAIGKHMMMO`, `MFHBIAIFHJI`, `MBEHIMBJEOC`, `BDJEHGHEHOE`, `AJDPNGIJANP`. Stage membership is observable; weekday meaning is not. |
| `DungeonEntryExcelConfigData` | `satisfiedCond`/`condComb` establish level/quest access; `descriptionCycleRewardList` corroborates family membership. Neither supplies named weekday semantics. |
| `DungeonExcelConfigData` | `dayEnterCount`, `passCond`, settlement timers and scene IDs have other purposes. A daily count is not a weekday mask. |
| `DungeonPassExcelConfigData` | Conditions include killing monsters, completing quests/challenges and finishing within time. No authoritative weekday gate was established. |
| `DungeonRosterConfigData` | Record 1 has `openTimeStr=2021-02-22 04:00:00`, `cycleTime=10080`, `DUNGEON_ROSTER_CYCLE_TYPE_BY_ORDER`, and dungeon groups 110–125. These IDs do not establish the required talent/weapon reward rotation join; a weekly-sized interval alone is insufficient. |
| `DungeonSerialConfigData` | Records beginning 1001/1002 expose take counts/costs, not weekday semantics. |
| `OpenStateConfigData` / `OfferingOpenStateConfigData` | Player/quest/reputation/offering conditions and scene-point associations establish unlocking, not the required reward rotation weekdays. |
| QuestSchedule tables | `QuestScheduleDayType` has 14 records with obfuscated fields and `TRAINING_DAY`; the overall configuration has energy and activity-specific fields. No proven weekday-to-farming join. |
| ActivityChess and other activity/return/battle-pass schedules | Day counters, periods, schedule IDs and start/end times belong to their respective activities. No controlling relationship to the accepted talent/weapon stages was established. |
| Scene points / Common configuration | Relevant physical points provide title/localization and access fields, several obfuscated. They do not resolve the weekday semantics. Global combat dungeon subtypes describe combat categories, not schedules. |

The inspected physical farming entries are 2, 3, 10, 11, 14, 15, 19, 21, 24, 25, 29, 30, 33, 34, 38 and 39, all in scene 3. Scene-specific loading is now data-driven to avoid imposing that current fact on future domains. Dungeon stage scenes remain distinct from physical entry scenes.

Future evidence must establish the meaning of the controlling fields or enums, join them to stage/family relationships, and explain Sunday and several independently known live rotations without using array order or names. Regression fixtures deliberately inject the observed obfuscated daily fields and reorder reward groups; neither may generate availability.

## Capability and compatibility details

New v2 bundles advertise `scene-points` alongside `identity-progression` and `farming`. The downloader obtains core/farming tables first, derives unique positive scene IDs from eligible dungeon entries, and downloads only those point files, with the same commit pin and three-request concurrency bound. The decoder verifies each required file before extraction. A required missing/malformed scene file aborts a capability-3 attempt. Older v2 bundles still decode under capability 2, and v1 under capability 1; neither falsely marks capability 3 applied. Save schema remains 15.
# Phase 4 readiness and shared setup

Supported bundled progression and exact imported progression use the same readiness derivation. Missing optional region metadata is not a blocker. Farming Setup groups family tiers while retaining every affected entity and missing field; a saved schedule propagates to all dependents. Weekday configuration remains a first-class manual workflow.

Planner source selection can use an established alternative available today and its resin cost. Distinct physical sources retain distinct availability; the estimator does not perform a global alternative-route optimization for the future week. Unknown sources remain deficits without fabricated schedules. All 63 unresolved ley-line mappings are retained and classified in [Phase 4](PHASE4_DATABASE_PLANNER_AUDIT.md).

