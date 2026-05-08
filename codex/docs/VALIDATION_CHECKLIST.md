# Validation Checklist

Before Codex marks an architecture task complete, verify:

## Structure

- [ ] Static game data is not hard-coded in UI components.
- [ ] Owned state is separate from goal state.
- [ ] Core calculations do not import React.
- [ ] Core calculations do not use browser APIs.
- [ ] Planner output is generated from state.
- [ ] External import schemas are normalized at the adapter boundary.

## Calculation correctness

- [ ] Total material costs are tested.
- [ ] Partial inventory subtraction is tested.
- [ ] Overstock inventory is tested.
- [ ] Crafting from lower-tier materials is tested.
- [ ] Day availability logic is tested.
- [ ] Planner priority logic is deterministic enough to test.

## Storage

- [ ] Save files include schemaVersion.
- [ ] Import validates data before applying it.
- [ ] Export uses internal schema, not UI state shape.
- [ ] Migration entry point exists.

## UI

- [ ] UI reads derived data through selectors/view models.
- [ ] UI does not duplicate formulas.
- [ ] Planner cards include human-readable reasons.
- [ ] Errors are recoverable and clearly displayed.

## Reporting

- [ ] Files changed are listed.
- [ ] Tests run are listed.
- [ ] Known limitations are listed.
- [ ] Suggested next step is listed.
