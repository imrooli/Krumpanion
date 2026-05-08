#!/usr/bin/env python3
"""
Generate a concise repository snapshot for Codex.

Run from the repository root:

    python codex/scripts/repo_snapshot.py

Output:

    codex/reports/codex_repo_snapshot.md
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Iterable

ROOT = Path.cwd()
REPORT_DIR = ROOT / "codex" / "reports"
REPORT_PATH = REPORT_DIR / "codex_repo_snapshot.md"

IGNORE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".vercel",
    ".turbo",
    "coverage",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
    ".idea",
    ".vscode",
}

INTERESTING_FILES = {
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "bun.lockb",
    "tsconfig.json",
    "vite.config.ts",
    "vite.config.js",
    "next.config.js",
    "next.config.mjs",
    "nuxt.config.ts",
    "svelte.config.js",
    "astro.config.mjs",
    "tailwind.config.js",
    "tailwind.config.ts",
    "README.md",
    "AGENTS.md",
}


def should_ignore(path: Path) -> bool:
    return any(part in IGNORE_DIRS for part in path.parts)


def iter_tree(max_depth: int = 4) -> Iterable[Path]:
    for path in sorted(ROOT.rglob("*")):
        if should_ignore(path.relative_to(ROOT)):
            continue
        rel = path.relative_to(ROOT)
        if len(rel.parts) <= max_depth:
            yield rel


def read_text_safely(path: Path, max_chars: int = 12000) -> str:
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as exc:
        return f"[Could not read: {exc}]"
    if len(text) > max_chars:
        return text[:max_chars] + "\n\n[Truncated]"
    return text


def detect_package_info() -> str:
    package_path = ROOT / "package.json"
    if not package_path.exists():
        return "No package.json found.\n"

    try:
        package = json.loads(package_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return f"Could not parse package.json: {exc}\n"

    lines = []
    lines.append(f"- name: {package.get('name', '(unknown)')}")
    lines.append(f"- version: {package.get('version', '(unknown)')}")
    lines.append("- scripts:")
    scripts = package.get("scripts", {})
    if scripts:
        for key, value in scripts.items():
            lines.append(f"  - {key}: `{value}`")
    else:
        lines.append("  - none")

    deps = package.get("dependencies", {})
    dev_deps = package.get("devDependencies", {})

    interesting_deps = [
        "react",
        "vue",
        "svelte",
        "next",
        "nuxt",
        "vite",
        "typescript",
        "zustand",
        "redux",
        "@reduxjs/toolkit",
        "jotai",
        "recoil",
        "pinia",
        "zod",
        "valibot",
        "react-router-dom",
        "@tanstack/react-query",
        "vitest",
        "jest",
        "playwright",
        "cypress",
    ]

    found = []
    for dep in interesting_deps:
        if dep in deps:
            found.append(f"- {dep}: {deps[dep]}")
        elif dep in dev_deps:
            found.append(f"- {dep}: {dev_deps[dep]} (dev)")

    lines.append("- notable dependencies:")
    lines.extend(found or ["  - none detected from shortlist"])

    return "\n".join(lines) + "\n"


def summarize_files() -> str:
    files = list(iter_tree(max_depth=4))
    lines = ["```text"]
    for rel in files:
        suffix = "/" if (ROOT / rel).is_dir() else ""
        lines.append(f"{rel}{suffix}")
    lines.append("```")
    return "\n".join(lines)


def collect_interesting_file_contents() -> str:
    chunks = []
    for filename in sorted(INTERESTING_FILES):
        path = ROOT / filename
        if path.exists() and path.is_file():
            chunks.append(f"## {filename}\n\n```text\n{read_text_safely(path)}\n```")
    return "\n\n".join(chunks) if chunks else "No standard root config files found."


def find_source_entrypoints() -> str:
    candidates = [
        "src/main.tsx",
        "src/main.ts",
        "src/index.tsx",
        "src/index.ts",
        "src/App.tsx",
        "src/App.ts",
        "app/page.tsx",
        "pages/_app.tsx",
        "pages/index.tsx",
    ]
    chunks = []
    for candidate in candidates:
        path = ROOT / candidate
        if path.exists():
            chunks.append(f"## {candidate}\n\n```text\n{read_text_safely(path, max_chars=8000)}\n```")
    return "\n\n".join(chunks) if chunks else "No common frontend entrypoints found."


def main() -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    report = f"""# Krumpanion Repository Snapshot

Generated from: `{ROOT}`

## Package / toolchain summary

{detect_package_info()}

## Directory map

{summarize_files()}

## Root config files

{collect_interesting_file_contents()}

## Common source entrypoints

{find_source_entrypoints()}

## Suggested next prompt

Paste `codex/prompts/00_BOOTSTRAP_REPO_ANALYSIS.md` into Codex from the repository root.
"""

    REPORT_PATH.write_text(report, encoding="utf-8")
    print(f"Wrote {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
