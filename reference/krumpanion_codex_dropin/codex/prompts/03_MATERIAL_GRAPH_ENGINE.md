Implement the first version of Krumpanion's material graph / cost calculation engine.

Before editing:
1. Inspect existing material/cost data.
2. Identify current calculators.
3. Preserve existing UI behavior.

Goal:
- Add pure functions that can:
  - Resolve total costs for character goals.
  - Resolve talent-level costs.
  - Resolve weapon goals, if weapon data exists.
  - Apply inventory counts to total costs.
  - Return missing material quantities.

Preferred location:
- `src/core/calculations/`
- `src/core/game-data/`
- or the closest existing equivalent.

Rules:
- No React imports in calculation files.
- No localStorage, DOM, routing, or UI calls in calculation files.
- Use stable material IDs.
- Add tests for total cost, partial inventory, exact inventory, and overstock inventory.

After implementation:
- Run tests/typecheck.
- Report changed files, tests run, and limitations.
