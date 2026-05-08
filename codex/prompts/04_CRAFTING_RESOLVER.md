Add or improve Krumpanion's crafting resolver.

Goal:
- Support lower-tier to higher-tier material conversion.
- Produce craftable recommendations without mutating inventory state.
- Start with conservative deterministic crafting before probability strategies.

Examples:
- Talent books: 3 lower-tier to 1 higher-tier.
- Weapon materials: 3 lower-tier to 1 higher-tier.
- Gemstones: 3 lower-tier to 1 higher-tier, if data exists.

Output should include:
- Material to craft.
- Quantity craftable.
- Ingredients consumed.
- Which goals it helps.
- Whether crafting is required or optional.

Rules:
- Keep this in core/crafting or core/calculations.
- Do not put crafting logic inside UI components.
- Add tests for exact tier conversion and partial leftovers.
- Do not implement character crafting bonuses unless the existing data model is ready; leave an extension point.

After implementation:
- Run relevant tests.
- Report files changed and next step.
