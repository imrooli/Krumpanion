# Krumpanion Codex Drop-In Package

This package is meant to be copied into the root of the existing Krumpanion repository.

It gives Codex:
- A concise architecture directive.
- A repository analysis protocol.
- A sequence of prompts for auditing and refactoring the existing app.
- Scripts to generate local repo snapshots and detect common architecture drift.
- Templates for refactor tickets and Codex analysis reports.

## Recommended install

1. Copy the contents of this folder into the Krumpanion repository root.
2. If your repository already has `AGENTS.md`, do **not** overwrite it blindly.
   - Merge the contents of `ROOT_AGENTS_KRUMPANION.md` into your existing `AGENTS.md`.
   - Otherwise, rename `ROOT_AGENTS_KRUMPANION.md` to `AGENTS.md`.
3. Run:

```bash
python codex/scripts/repo_snapshot.py
python codex/scripts/scan_architecture_smells.py
```

4. Open `codex/reports/codex_repo_snapshot.md`.
5. Start Codex from the repo root and paste `codex/prompts/00_BOOTSTRAP_REPO_ANALYSIS.md`.
6. Then continue with the numbered prompts in order.

## Philosophy

Do not rebuild Krumpanion from scratch.

Codex should first analyze the existing repository, identify what already exists, then fold in the architecture incrementally:

- Static game data is separate from user state.
- Owned account state is separate from goals.
- Core calculations are pure functions.
- Planner output is generated, not manually maintained.
- Import/export adapters normalize external formats.
- UI edits state but does not own calculation truth.
