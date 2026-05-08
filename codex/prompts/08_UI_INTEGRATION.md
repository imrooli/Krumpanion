Integrate the architecture into the existing UI with minimal disruption.

Goal:
- Connect UI tabs/pages to selectors or view models derived from core state.
- Avoid duplicating formulas in UI.
- Preserve existing layout where possible.

Focus areas:
- Dashboard: "What should I do next?"
- Characters: current state + goal editor.
- Weapons: current state + goal editor.
- Inventory: material counts by category.
- Planner: generated recommendations.
- Crafting: craftable upgrades.
- Artifacts: artifact goals independent from inventory.

Rules:
- Do not rewrite the entire UI.
- Prefer small, reviewable changes.
- Keep calculation imports flowing from core to features, not features to core.
- Add loading/error/empty states where missing.

After implementation:
- Run tests/typecheck/build.
- Report changed files and any manual QA steps.
