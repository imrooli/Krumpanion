#!/usr/bin/env python3
"""
Scan for common Krumpanion architecture smells.

Run from the repository root:

    python codex/scripts/scan_architecture_smells.py

Output:

    codex/reports/architecture_smells.md
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path.cwd()
REPORT_DIR = ROOT / "codex" / "reports"
REPORT_PATH = REPORT_DIR / "architecture_smells.md"

IGNORE_PARTS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".svelte-kit",
    "coverage",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
}

SOURCE_EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}

CHECKS = [
    {
        "id": "react-import-in-core",
        "description": "Core files should not import React.",
        "path_contains": ["src/core"],
        "pattern": re.compile(r"""from\s+['"]react['"]|import\s+React"""),
    },
    {
        "id": "browser-api-in-core",
        "description": "Core files should not use browser storage or DOM APIs.",
        "path_contains": ["src/core"],
        "pattern": re.compile(r"""\b(localStorage|sessionStorage|indexedDB|document\.|window\.)\b"""),
    },
    {
        "id": "good-schema-outside-adapter",
        "description": "GOOD-specific logic should usually live in import/export adapters.",
        "path_excludes": ["import", "export", "adapter", "good"],
        "pattern": re.compile(r"""\bGOOD\b|goodFormat|good_json|goodJson""", re.IGNORECASE),
    },
    {
        "id": "hardcoded-material-cost-array",
        "description": "Potential hard-coded material cost table outside game-data/core.",
        "path_excludes": ["core", "game-data", "data", "fixtures", "test"],
        "pattern": re.compile(r"""(mora|talent|ascension|weapon).*?\[\s*\{""", re.IGNORECASE | re.DOTALL),
    },
    {
        "id": "planner-state-source-of-truth",
        "description": "Planner tasks may be stored as source-of-truth instead of generated output.",
        "path_contains": ["src"],
        "pattern": re.compile(r"""setPlannerTasks|plannerTasks\s*[:=]|storedPlanner|savedPlanner"""),
    },
]


def ignored(path: Path) -> bool:
    return any(part in IGNORE_PARTS for part in path.parts)


def matches_path_rule(rel: str, check: dict) -> bool:
    includes = check.get("path_contains")
    excludes = check.get("path_excludes")

    normalized = rel.replace("\\", "/").lower()

    if includes and not any(item.lower() in normalized for item in includes):
        return False

    if excludes and any(item.lower() in normalized for item in excludes):
        return False

    return True


def main() -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    findings = []

    for path in ROOT.rglob("*"):
        if path.is_dir() or path.suffix not in SOURCE_EXTS:
            continue

        rel_path = path.relative_to(ROOT)
        if ignored(rel_path):
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            continue

        rel = str(rel_path)

        for check in CHECKS:
            if not matches_path_rule(rel, check):
                continue

            match = check["pattern"].search(text)
            if match:
                line_no = text[:match.start()].count("\n") + 1
                findings.append({
                    "file": rel,
                    "line": line_no,
                    "check": check["id"],
                    "description": check["description"],
                    "match": match.group(0)[:160].replace("\n", " "),
                })

    lines = ["# Architecture Smell Scan", ""]

    if not findings:
        lines.append("No configured architecture smells found.")
    else:
        lines.append(f"Found {len(findings)} potential issue(s).")
        lines.append("")
        for item in findings:
            lines.append(f"## {item['check']}")
            lines.append("")
            lines.append(f"- File: `{item['file']}:{item['line']}`")
            lines.append(f"- Description: {item['description']}")
            lines.append(f"- Match: `{item['match']}`")
            lines.append("")

    lines.append("## Note")
    lines.append("")
    lines.append("These are heuristics, not proof of bugs. Codex should inspect each finding before changing code.")

    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
