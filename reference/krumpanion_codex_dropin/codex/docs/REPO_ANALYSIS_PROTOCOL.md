# Repository Analysis Protocol

Codex should complete this analysis before modifying architecture.

## 1. Identify project basics

Find:

- Framework.
- Language.
- Package manager.
- Build command.
- Test command.
- Lint command.
- Routing library.
- State management library.
- Existing storage approach.
- Existing data/import/export approach.

Record findings in:

```text
codex/reports/codex_analysis_report.md
```

## 2. Map directories

Create a concise map of:

- App entry points.
- Page/routes.
- Shared UI components.
- State stores.
- Static data files.
- Calculation utilities.
- Import/export utilities.
- Tests.
- Scripts.

## 3. Identify architectural drift

Look for:

- Material costs hard-coded inside components.
- React imported inside core calculation code.
- localStorage or browser APIs used inside domain calculation code.
- GOOD import logic mixed directly into UI.
- Owned character state and goal state collapsed into one structure.
- Planner checklist stored as source-of-truth instead of derived output.
- Duplicate calculation logic.
- Large files that should be split.
- Missing tests for cost calculations.

## 4. Produce a refactor backlog

For each finding:

```text
Title:
Severity: low | medium | high
Why it matters:
Files involved:
Smallest safe fix:
Suggested tests:
```

## 5. Act only after analysis

Codex should not immediately refactor broad architecture.

Preferred sequence:

1. Analyze.
2. Report.
3. Pick one small refactor.
4. Implement.
5. Run tests.
6. Report changes.
