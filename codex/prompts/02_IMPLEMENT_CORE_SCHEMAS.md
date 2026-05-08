Implement or align Krumpanion's internal domain schemas.

Before editing:
1. Inspect existing types/interfaces/schemas.
2. Reuse existing names where reasonable.
3. Avoid broad renames unless necessary.

Goal:
- Add clear internal schemas for:
  - MaterialQuantity
  - InventoryState
  - OwnedCharacter
  - CharacterGoal
  - OwnedWeapon
  - WeaponGoal
  - ArtifactGoal
  - PlannerRecommendation
  - KrumpanionSaveFile

Rules:
- Place schemas in the existing best-fit location, or create `src/core/schemas/`.
- Do not couple these schemas to React components.
- Do not add GOOD-specific field names to core schemas.
- Add tests or type-level validation if the repo already has a pattern for that.
- Update imports only where needed.

After implementation:
- Run typecheck/tests if available.
- Report files changed and tests run.
