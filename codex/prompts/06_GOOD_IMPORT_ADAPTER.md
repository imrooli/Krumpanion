Add or improve GOOD file import through an adapter layer.

Goal:
- Parse GOOD files.
- Validate minimum required fields.
- Normalize external GOOD shape into Krumpanion internal state.
- Keep GOOD-specific names out of UI and core calculation modules.

Preferred structure:
```text
src/services/import-export/good/
  parseGoodFile.*
  normalizeGoodCharacters.*
  normalizeGoodWeapons.*
  normalizeGoodMaterials.*
  normalizeGoodArtifacts.*
```

Rules:
- Do not directly write GOOD data into UI-specific state.
- Normalize into OwnedCharacter, OwnedWeapon, InventoryState, and optional artifact inventory only if supported.
- Artifact goals remain independent from artifact inventory.
- Add malformed-input tests.

After implementation:
- Run tests/typecheck.
- Report changed files and edge cases not yet supported.
