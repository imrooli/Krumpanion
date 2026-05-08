Implement or refactor the Planner as generated output.

Goal:
- Generate planner recommendations from:
  - Goals
  - Inventory
  - Static game data
  - Material availability by day
  - Resin settings, if present

Planner recommendations should include:
- Category.
- Priority.
- Related goal IDs.
- Required materials.
- Human-readable reason.
- Blocked-by information when a domain/material is not available today.

Rules:
- Planner output is derived. Do not store generated planner recommendations as source-of-truth user state.
- Keep planner logic pure and testable.
- UI should consume planner output through selectors/view models.

Add tests for:
- Available today.
- Blocked until another day.
- Multiple goals needing same material.
- Priority ordering.

After implementation:
- Run tests/typecheck.
- Report changed files, tests run, and limitations.
