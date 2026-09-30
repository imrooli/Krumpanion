# Phase 4: Database closure and account-level planner audit

Audit date: 2026-09-30. Baseline: Phase 3, 387 tests/60 files, Data Health 0 errors/65 warnings/94 informational findings. Evidence uses integrity-checked revision `b061b403c8afc7bca633cf4f201edc4a3baa75fe`. Existing React/Vite, Zustand, Dexie, worker, change-set, override, and schema-15 architecture remains intact.

## 1. Nicole: cause and resolution

Nicole's numerical progression was already correct. The repair tool indexed only `materials/materials.json`, omitting the canonical weekly-material registry. `weeklyBossMaterials.json` establishes `CounterfeitResin`; upstream material **113087** localizes to **Counterfeit Resin**. Runtime assembly resolved it correctly, but the repair tool could not. This caused a false progression mismatch for every combat talent at levels 7–10.

Repair now resolves against the complete assembled canonical baseline with no user overrides. It also checks normal, skill, and burst separately, including prerequisite ascensions. Nicole's ID **10000131**, five-star Pyro Catalyst identity, promotion group **131**, depot **13101**, and proud-skill groups **13131/13132/13139** agree. Codex release evidence is **2026-05-19** and passes the existing release filter. All six ascensions, all three level-2–10 talent tables, quantities, Mora, and prerequisites agree. No special progression difference was found in the supported relationships.

Only status/release/eligibility changed to verified/live/true. No cost or farming assignment was replaced. `codex/reports/phase4_database_audit.json` contains before/upstream phase and talent comparisons, material-ID mappings, release evidence, and the pre-repair preview. `src/test/fixtures/nicoleUpstream.json` preserves a small normalized fixture. Regression tests also reject a changed skill material count or burst prerequisite.

## 2. Prized Isshin Blade

| Stable key suffix | Verified game ID | Upstream appearance | Promotion / affix |
| --- | --- | --- | --- |
| `_i_n11419` | 11419 | YoutouEnchanted | 11419 / 111419 |
| `_i_n11420` | 11420 | YoutouShattered | 11420 / 111420 |
| `_i_n11421` | 11421 | YoutouEnchanted | 11421 / 111421 |

All are distinct four-star Sword records with the official shared English name. None has weapon-codex membership. Promotion rows contain counts without material IDs, so they cannot establish supported progression. Appearance names and affix IDs do not prove permanent player ownability, acquisition conditions, or refinement semantics. Those questions remain unsupported by the inspected joins.

Their existing keys and names survive; game IDs and table/revision provenance are added. Progression remains unresolved/ineligible, and refinement tracking is explicitly disabled. They are not automatically activated by relaxing codex filtering. A canonical-key GOOD import resolves the specific identity; a name-only import stays unmatched even when its instance ID happens to equal an upstream ID. No official GOOD key for these variants is asserted.

## 3. Data Health

Final report: **0 errors, 63 warnings, 95 informational findings**. Nicole removes one demonstrated false warning. The duplicate-name group moves from warning to information because all three records now have distinct verified IDs; ambiguity in name-only imports remains enforced. Missing or colliding IDs still produce an actionable warning. The 63 ley-line warnings are retained. No integrity rule or lint threshold was weakened.

## 4. Canonical repair preview

After the targeted corrections, `data:repair-canonical` reports **zero findings and zero errors**, with `applied: false`. The repeat-run regression produces no repairs. No broad apply was used and no user override was promoted into bundled data.

Reproduce the evidence report using `npx tsx tools/data/audit-phase4.ts <bundle.json>`; `--write` regenerates the selected comparison report and normalized Nicole fixture. The script validates bundle integrity first, uses an injected audit date, and never edits canonical profiles.

## 5. Remaining ley-line classification

| Category | Count | Evidence and disposition |
| --- | ---: | --- |
| Fungus/shrooms | 54 | Six material names span spore and nucleus families. The source does not encode enemy-state conditions. Unsupported multi-family/conditional relationship; retained warning. |
| Electro Cicin | 3 | No explicit progression-family join in the bundled spawn evidence. Retain unresolved. |
| Hydro Cicin | 3 | Same missing join; retain unresolved. |
| Flying Serpent | 2 | Same missing join; retain unresolved. |
| Eye of the Storm | 1 | Same missing join; retain unresolved. |

An absent mapping does not prove that an enemy drops nothing. The report preserves every location/spawn finding. Regression coverage verifies counts and that unresolved fungus spawns never enter established family coverage.

## 6. Conditional-drop modeling decision

The current ley-line spawn model has one optional `dropFamilyKey`. It cannot represent state-dependent alternatives. The planner excludes unresolved spawns, so the limitation reduces route coverage rather than inventing loot. Existing route guidance concerns incidental enemy materials; these materials do not acquire a direct resin guarantee.

Do not expand this model in Phase 4. If route planning later needs it, add normalized conditional reward relationships with explicit evidence and selectable enemy-state conditions, preserving unknown states and keeping reward membership separate from yield assumptions. That future design must never interpret both branches as simultaneous guaranteed rewards.

## 7. Update-pipeline closure

The existing deterministic service/adapter/persistence tests cover metadata-first startup; revision plus extractor-capability invalidation; commit-pinned bounded downloads; worker parsing; integrity/schema failure; manual precedence; conflict decisions; latest-state reconciliation; serialized persistence; edits during download and persistence; GOOD recovery; cancellation; rate-limit retry; migration; and reload. Seven production Chromium scenarios exercise real workers/IndexedDB and intercepted transport.

GOOD is saved before checking upstream. Identity recovery is independent of farming readiness and resolves the current account state. Exact costs work while unknown sources stay unscheduled. Full saves retain shared metadata and discoveries; account-only exports remain scoped. No new persistence schema is needed.

Observation: persistence timing is finalized in memory after the document write and is not guaranteed to appear in the reloaded attempt. Dataset and validation summaries remain persisted. Cancellation is reliable before activation; an IndexedDB write already in progress is a commit boundary, not a rollback facility. Restore is serialized with writes. These are observability/operation limits, not new atomicity claims.

## 8. Remaining manual farming workflow

Count one click/select/fill as one action, excluding keystrokes within a fill and navigation unless specified. For a new character whose specialty, enemy family, and gems already have known sources, automatic extraction supplies identity, costs, materials, accepted families, domain identity, recipes, and explicit resin. Remaining tasks are:

| Resource | Actions within Farming Setup |
| --- | --- |
| New talent-family schedule | Select resource, select an existing weekday preset, save: **3** |
| New normal-boss material/source | Select resource, source category, name, availability, resin cost, save: **6** |
| New weekly-boss material/source | Same sequence with weekly availability: **6** |
| New weapon-family schedule, existing enemy sources | Select resource, weekday preset, save: **3** |

Thus this specified character requires **3 tasks/15 actions**, the weapon **1 task/3 actions**, plus one navigation action from Game Data. If the character has a new specialty region, add **1 task/5 actions**; a new enemy family requires its own source/family configuration. Counts are conditional on these explicit assumptions, not a claim that every patch has identical work. Boss action counts follow the inspected editor fields; the executed local-specialty UI test uses five actions. The Chromium schedule scenario uses six actions including navigation, search, selection, two weekday checks, and save.

Already configured resources require **zero repeated configuration**. All family tiers and dependent entities inherit the schedule. A grouping defect was fixed: the resource list previously retained only one tier's consumers/fields; it now unions all affected entities and blockers. Imported IDs, progression, established sources, and recipe costs survive edits. Incomplete drafts remain supported. Bosses, weekly bosses, specialties, artifact sources, and weekdays remain manual where unknown.

## 9. Planner audit conclusions by layer

| Layer | Classification and conclusion |
| --- | --- |
| Requirement calculation | **Verified correct** for supported exact/bundled progression, separate talents/prerequisites, owned-state subtraction, and EXP/Mora through retained and added tests. Unsupported progression remains excluded. |
| Shared inventory allocation | **Verified correct** at account level: aggregate demand, then subtract owned units once. **Defect found and fixed** in UI readiness, which had charged each goal the account aggregate instead of its own demand. |
| Crafting/resource conservation | **Defect found and fixed**: Dust conversion now reserves other goals' gems and subtracts `inputQuantity × crafts`; Mora totals no longer reuse stale pre-crafting deficits. **Intentional current policy**: direct tier requirements are reserved; crafting proceeds low-tier first, independent of goal priority. |
| Source availability | **Defect found and fixed**: source selection now considers a valid alternative available today and its resin cost. Unknown sources remain visible deficits without schedules. Independent physical sources retain their own availability. |
| Resin-cost calculation | **Defect found and fixed**: crafting uses surplus account Mora after progression. Expected and guaranteed estimates remain distinct. Full budget allocation is **unsupported/not currently modeled**. |
| Weekly constraints | **Verified correct** for modeled one-claim-per-boss weekly estimates, discount slots, custom days, and explicitly configured Sunday. Per-boss already-claimed history is **unsupported/not currently modeled** in this estimator. |
| Recommendation prioritization | Activity grouping is **intentional current policy**. How user priority should affect resin allocation is **ambiguous product policy requiring a future decision**; no replacement introduced. |
| Tie-breaking | Title/resin/run ordering and source-slice insertion order are characterized. Their cross-layer differences are **ambiguous product policy requiring a future decision**. |
| Readiness gating | **Defect found and fixed**: supported bundled progression is now recognized alongside exact imports, and optional region metadata does not block readiness. Missing source/schedule/resin/family fields remain explicit. |
| Presentation/UI | **Defect found and fixed**: shared readiness uses per-goal demand; crafting Mora is reserved; bundled readiness labels use the common resolver; paused previews no longer emit independently executable crafting actions. |

These are tested boundaries, not a claim of exhaustive proof for every future data shape.

## 10. Account invariants

New tests establish demand `[8,6]` with six owned gives fourteen required/eight missing; `[8,6,4]` with ten owned gives eight missing. Priorities and goal insertion order cannot change account totals. Other cases cover absent/excess inventory, character plus weapon demand, partial completion, and distinct account inputs. UI readiness allocates the six owned units to the six-unit higher-priority goal and leaves eight missing for the other goal.

Existing instance, Traveler, account-switching and save tests remain in the full suite. Raw per-goal requirement rows are not independent inventory budgets.

## 11. Prioritization

Account requirements do not allocate by goal priority. Source slices consume coverage in character/weapon and breakdown iteration order; this affects attribution, not total demand. Crafting orders by ascending tier, descending shortage, then display name. Goal-readiness UI orders by descending goal priority, then label.

Recommendations order resin-gated, time-gated non-resin, crafting, open-world, then incidental work. Subgroups put weekly resin before domains, bosses, and ley lines. Resin rows sort by expected advisory resin (or guaranteed fallback), actionable runs, runs, then title. Their numeric priority does not determine this ordering. The material score includes shared-goal count, today/source bonuses, weekly penalty, and shortage/resin size; `goalPriorityWeight` is not consumed there. Goal priorities do sort the goal list.

A deterministic reproduction shows an alphabetically earlier domain preceding an otherwise tied domain even when the latter has numeric priority 999. Changing goal priority does not alter the material score. No deadline optimizer or constrained resin allocator exists: daily budgets estimate duration. These differences warrant a dedicated product-policy decision, not an accounting rewrite.

## 12. Weekly planning

All seven days are exercised against a custom Monday-only family. Tuesday and Sunday remain unavailable. Standard three-day rotations retain their explicit Sunday bit; custom schedules never gain Sunday automatically. Family-specific configuration remains independent at shared physical locations. Same-source availability entries can combine; distinct source identities are not merged into a fabricated schedule.

When a material has several distinct sources, the estimator selects an established source available today, otherwise the first established source. It does not optimize alternative-source routes across a whole future week; the weekly view reflects the selected source. Current-day readiness and deficit accounting remain independent.

## 13. Crafting

The competing nine-low-tier example covers three mid-tier requirements and leaves the high-tier requirement missing. With three mid-tier already owned, the nine lows can produce one high. Six lows produce only two mids. Eighteen lows cover both demands. Tests verify ingredient consumption, exact recipe Mora, order/priority independence, and untouched input inventory.

Crafting Mora is added to progression demand and owned Mora is subtracted once. Both the displayed account deficit and Wealth estimate now agree at owned Mora 0, 100, 200, and 500. Dust conversion cannot consume directly reserved gems or reuse bulk-converted gems. Passive expected values remain advisory. Craft suggestions are ingredient-feasible plans; executing them still requires the displayed Mora, which can itself be a farming deficit. Paused goals show labeled independent previews without craft actions that compete with active suggestions.

## 14. Readiness

Identity known without supported progression remains `imported`. Complete exact or bundled progression allows cost calculation. Missing usable source identity, family/tier for domain requirements, availability, or required resin metadata yields `farming_setup_required` with exact fields. Known special nonfarmable rewards do not require invented schedules. `planner_ready` means supported requirements can reach established planning inputs, not that inventory is sufficient or a goal is affordable today. Optional region metadata is not a blocker.

The Database UI now uses this common derivation for bundled records with provenance as well as imported exact records. Farming Setup can surface supported bundled requirements, and shared groups retain all dependents.

## 15. Tests and Phase 4 modified modules

New `accountAudit.test.ts` and `phase4Closure.test.ts` cover accounting, conservation, source alternatives, title ties, UI readiness, canonical repair, GOOD ambiguity, shared configuration, and ley-line exclusions. The existing GameDataUpdateCenter UI suite gains a bundled-readiness regression.

Phase 4 edits only:

- Canonical character/weapon profiles; canonical duplicate-name validation; `repairCanonicalDatabase.ts`.
- `plannerReadiness.ts`; `GameDataUpdateCenter.tsx` and its test.
- `resolveCraftingPlan.ts`; `compareInventory.ts`; `classifySources.ts`; `buildFarmingEstimates.ts`; `buildPlannerRows.ts`; `plannerProgressionModel.ts`.
- New planner/account audit and static-data closure tests, normalized Nicole fixture, and `tools/data/audit-phase4.ts`.
- Phase 4 audit/validation reports, regenerated Data Health reports, and automatic-update/database/GOOD/planner/farming documentation.

Earlier Phase 1–3 files and unrelated pre-existing crafting/checklist/artifact/workbench changes remain in the worktree. This inventory does not claim their earlier diffs as Phase 4 work.

## 16. Validation

Final full run: **413 tests across 62 files pass**, adding 26 focused tests over Phase 3. Typecheck, lint, production build, Data Health, all **seven production Chromium scenarios**, live upstream validation, canonical repair preview, and `git diff --check` pass. The final validation record and Phase 4 file inventory are in `codex/reports/phase4_validation.json`. Firefox was intentionally not rerun under this phase's external-verification boundary.

Live revision remains the pinned revision: 22 files, 63,263,431 dataset bytes, 3,272 revision bytes, 10,675 observations, 48 farming relationships, zero schema diagnostics. Candidate delta: 67 added/2,146 changed/3 unchanged/223 review, 359 progression profiles, six family/domain changes, zero inferred schedules. Observed Node timings: download 5,601.7 ms, parsing 1,749.1 ms, reconciliation plus validation 834.8 ms, validation 63.2 ms. These are one host run, not a browser benchmark.

Build retains the large-chunk advisory: initial JS approximately 3,052.90 kB, lazy Database 220.15 kB, worker 72.60 kB. No threshold change or performance refactor.

## 17. Limits

Firefox remains environmentally blocked before app execution on this host. Preserve its project; external verification is `npm ci`, `npx playwright install firefox`, `npm run test:e2e`. No personal Firefox, profile, Windows configuration, or browser installation was changed.

Weekdays, bosses, artifact farming, uncertain rewards and unsupported progression remain manual. No new weekday investigation occurred. Preview rewards do not establish probabilities or guaranteed yield. Conditional enemy states, comprehensive alternative-source weekly optimization, per-boss historical claims, deadlines, and optimal resin allocation remain outside the modeled scope. No schema-15 migration was required.

## 18. Maintenance-mode recommendation

The identity/progression/GOOD/farming/provenance/conflict/persistence/schema-failure/recovery paths have bounded deterministic coverage and passing production Chromium acceptance. **Yes: move broad automatic-database development into maintenance mode.** Retain normal bug fixes and upstream schema maintenance; reopen automation only for authoritative new evidence, a real patch defect, or a concrete planner requirement. Manual data is a supported workflow, not unfinished automation.

## 19. Next product target

Prioritize an explicit goal-priority and daily/weekly resin-allocation policy. First decide how user goal priority, weekly opportunity, source availability, and shared material benefit compete. Then make the recommendation list explain why an activity comes first and what fits the user's resin budget. The audit's accounting tests provide the foundation; do not start another database expansion to answer this product question.
