Analyze Krumpanion against the target architecture.

Use:

- codex/reports/codex_repo_snapshot.md, if present.
- codex/reports/architecture_smells.md, if present.
- codex/reports/codex_analysis_report.md, if present.
- codex/docs/KRUMPANION_ARCHITECTURE_DIRECTIVE.md

Focus on identifying whether these boundaries currently exist:

1. Static game data vs user state.
2. Owned entities vs goals.
3. Core pure calculations vs UI.
4. Services/adapters vs feature components.
5. Planner generated output vs stored tasks.
6. Artifact goals independent from artifact inventory.

Update `codex/reports/codex_analysis_report.md` with a concise audit section.

Do not make code changes unless they are limited to report files.
