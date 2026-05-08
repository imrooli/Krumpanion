# Krumpanion Architecture Checklist

Use this checklist when changing Krumpanion structure or planner logic.

## Boundaries

- Static game data stays out of UI components.
- Owned account state stays separate from goal state.
- Core calculations do not import React.
- Core calculations do not call browser APIs or storage APIs.
- GOOD parsing stays at the adapter boundary.
- Planner recommendations are derived, not stored as source-of-truth.

## Storage

- Save files include `schemaVersion`.
- Import validates before mutating state.
- Migration entry points exist for save files.
- Export serializes internal state, not UI-only view state.

## Behavior

- Planner cards include human-readable reason strings.
- Unknown content warns and continues instead of crashing.
- Inventory and crafting views use selectors or view models.
- UI does not reimplement planner or cost formulas.

## Reporting

- List files changed.
- List tests run.
- List known limitations.
- Suggest the next smallest safe follow-up task.
