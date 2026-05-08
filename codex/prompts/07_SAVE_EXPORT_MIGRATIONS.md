Add or improve Krumpanion save-file export/import and migrations.

Goal:
- Export internal Krumpanion state into a versioned JSON save file.
- Import save files after validation.
- Add a migration entry point, even if only schema version 1 exists.

Save file should include:
- schemaVersion
- appVersion
- createdAt
- updatedAt
- account
- goals
- settings

Rules:
- Export internal schema, not UI-only state.
- Validate imported data before applying it.
- Add migration functions in a predictable location.
- Do not overwrite user state until validation succeeds.

Tests:
- Export creates valid schema.
- Import accepts current schema.
- Import rejects malformed schema.
- Migration entry point exists and is covered.

After implementation:
- Run tests/typecheck.
- Report files changed and tests run.
