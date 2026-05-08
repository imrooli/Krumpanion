# Recommended Implementation Order

## Phase 0: Repository snapshot

Run:

```bash
python codex/scripts/repo_snapshot.py
python codex/scripts/scan_architecture_smells.py
```

Then ask Codex to read:

```text
codex/reports/codex_repo_snapshot.md
codex/reports/architecture_smells.md
codex/docs/REPO_ANALYSIS_PROTOCOL.md
codex/docs/KRUMPANION_ARCHITECTURE_DIRECTIVE.md
```

## Phase 1: Schemas

Goal:

- Identify current state shape.
- Add or align internal schemas.
- Avoid breaking UI.

Deliverables:

- OwnedCharacter.
- CharacterGoal.
- OwnedWeapon.
- WeaponGoal.
- InventoryState.
- ArtifactGoal.
- SaveFile schema.

## Phase 2: Static game data registry

Goal:

- Move static material/game data out of components.
- Create stable IDs.
- Create lookup helpers.

Deliverables:

- Material registry.
- Character registry.
- Weapon registry.
- Recipe registry.
- Availability calendar.

## Phase 3: Cost calculators

Goal:

- Pure functions for total cost.

Deliverables:

- Character goal cost resolver.
- Talent goal cost resolver.
- Weapon goal cost resolver.
- Tests.

## Phase 4: Inventory subtraction

Goal:

- Turn total costs into missing materials.

Deliverables:

- applyInventoryToCost().
- Tests for exact, partial, and overstock cases.

## Phase 5: Crafting resolver

Goal:

- Account for lower-tier materials and craftable upgrades.

Deliverables:

- Material graph.
- Crafting paths.
- Conservative crafting mode.
- Tests.

## Phase 6: Planner engine

Goal:

- Generate recommendations for today and upcoming days.

Deliverables:

- Domain availability lookup.
- Priority scoring.
- Reason strings.
- Tests.

## Phase 7: UI integration

Goal:

- Connect existing UI to selectors/view models.

Deliverables:

- Dashboard cards.
- Character goal editor.
- Planner tab.
- Crafting recommendations display.

## Phase 8: Import/export

Goal:

- Versioned Krumpanion save file.
- GOOD import adapter.

Deliverables:

- Export save.
- Import save.
- GOOD parser/normalizer.
- Migration pipeline.
