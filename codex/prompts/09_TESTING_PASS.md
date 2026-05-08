Perform a testing and reliability pass.

Goal:
- Find untested core logic.
- Add focused tests for calculations, crafting, planner recommendations, imports, and migrations.

Do not make broad feature changes.

Prioritize tests for:
1. Character goal total costs.
2. Talent level ranges.
3. Weapon goal total costs.
4. Inventory subtraction.
5. Crafting conversions.
6. Planner availability by day.
7. GOOD import normalization.
8. Save import/export validation.

After tests:
- Run the relevant test suite.
- Fix failures only if related to the new tests or obvious bugs.
- Report tests added, tests run, and remaining coverage gaps.
