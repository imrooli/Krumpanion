# Krumpanion Repository Instructions for Codex

These instructions apply to the entire repository unless a more specific `AGENTS.md` exists in a subdirectory.

## Project goal

Krumpanion is a local-first Genshin Impact planning application focused on:

- Character and weapon goal planning.
- Material inventory tracking.
- Talent, weapon, ascension, EXP, and mora cost calculation.
- Crafting / conversion strategy.
- Resin-use recommendations based on material availability by day.
- GOOD file import support.
- Artifact goal planning independent from artifact inventory.

## Do not rebuild from scratch

Before making structural changes:

1. Inspect the existing repository.
2. Identify the current framework, package manager, routing approach, state approach, and test setup.
3. Preserve working UI and user-facing behavior whenever possible.
4. Propose the smallest safe change that moves the code toward the architecture.
5. Prefer incremental refactors over wholesale rewrites.

## Architecture rules

### Separate static game data from user state

Static Genshin data should live in a dedicated core data layer, not inside UI components.

Preferred shape:

```text
src/core/game-data/
  characters.*
  weapons.*
  materials.*
  recipes.*
  schedules.*
```

User state should live separately:

```text
OwnedCharacter
OwnedWeapon
InventoryState
GoalState
UserSettings
```

### Separate ownership from goals

Owning a character or weapon is not the same as actively planning it.

Use separate domain concepts:

```text
OwnedCharacter != CharacterGoal
OwnedWeapon != WeaponGoal
ArtifactGoal != ArtifactInventory
```

### Keep core calculations pure

Files under `src/core/` should not import React components, browser storage, DOM APIs, or UI-only utilities.

Core calculation functions should receive input objects and return output objects.

Good:

```ts
resolveCharacterGoalCost({ character, goal, gameData })
```

Bad:

```ts
resolveCharacterGoalCostFromReactState()
```

### Planner output is derived

Planner recommendations should be generated from:

- Game data.
- Date / day-of-week.
- User goals.
- User inventory.
- Resin preferences.
- Crafting options.

Do not store generated planner tasks as source-of-truth user data.

### Adapter boundary

External formats such as GOOD should be parsed and normalized in `services/import-export` or equivalent.

Do not let external schema field names spread throughout UI or core calculation code.

### Artifact goals

Artifact goals should initially work without artifact inventory.

Support:

- Target sets.
- Sands / goblet / circlet main stats.
- Desired substats.
- Priority.
- Notes.

Do not block material planning on artifact inventory support.

## Testing expectations

When changing calculation logic:

- Add or update unit tests.
- Include edge cases for missing inventory, partial inventory, and craftable lower-tier materials.
- Add fixtures for known character/weapon/talent costs where practical.
- Prefer deterministic tests for planner recommendations.

When changing import/export:

- Add schema validation tests.
- Add malformed-input tests.
- Ensure imported data maps into Krumpanion internal state, not directly into UI-only state.

## Preferred implementation order

1. Analyze current repo structure.
2. Create or align domain schemas.
3. Isolate static game data.
4. Implement total-cost calculators.
5. Implement inventory subtraction.
6. Implement crafting resolver.
7. Implement planner recommendation engine.
8. Connect UI through selectors/view-models.
9. Add GOOD import adapter.
10. Add save-file export/import with schema versioning.

## Response style for Codex

When reporting back:

- Summarize what changed.
- List files modified.
- List tests run and results.
- Call out skipped tests or assumptions.
- Suggest the next smallest follow-up task.
