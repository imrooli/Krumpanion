# Product Roadmap

This document captures the intended product direction for Krumpanion so future Codex work stays
aligned with the owner's priorities instead of drifting toward feature sprawl.

Current product goals:

- overall easy to use and control
- live-updating upon receiving inventory data
- always accurate or explicit about uncertainty
- easy to navigate without clutter or disproportional elements
- very user-friendly
- easy for the user to update and manage without clutter

This roadmap is intentionally UX-first. It does not replace engine, planner, or static-data
documentation. It exists to guide implementation tradeoffs when multiple valid technical directions
are possible.

## Core principles

When choosing between two implementations, prefer the one that:

1. makes new inventory data feel immediate and trustworthy
2. reduces planner reading burden and focuses on decisions
3. improves consistency and visual calm across the app
4. avoids adding one-off UI clutter, duplicate control surfaces, or debug-first workflows
5. preserves deterministic correctness and makes uncertainty visible instead of hidden

## Priority themes

The current priority themes are:

1. live-update trust and change visibility
2. planner information simplification
3. visual consistency, spacing, and interface polish

These themes overlap by design. Work should not treat them as isolated tracks.

## Phase 1: Trust and Change Visibility

Primary outcome:
- when new inventory data arrives, the user can immediately see what changed, what improved, and
  what completed

### Goals

- make GOOD imports feel immediate and reliable
- surface changes caused by new inventory data
- track goal progress and completion milestones over time
- reduce user uncertainty about whether the planner is current

### What this phase should add

- import freshness metadata
  - latest GOOD import time
  - latest planner recalculation time
  - active account freshness state
- structured import diff summaries
  - materials gained or reduced
  - newly detected characters
  - newly detected weapons
  - ownership-state changes
  - goals advanced or completed
- goal milestone tracking
  - completed-on date
  - last-progress date
  - latest import associated with completion
- planner delta summaries
  - deficits resolved
  - deficits reduced
  - recommendations added
  - recommendations removed
  - newly exposed bottlenecks

### Codex guidance

- prefer adding domain/store metadata before building large UI surfaces
- avoid writing one-off view logic that recomputes import deltas ad hoc
- keep milestone and diff models account-scoped
- do not silently promote or alter progress without exposing the change to the user

### Success criteria

- after import, users can see what changed without hunting
- goal completion feels attributable and date-aware
- planner updates no longer feel silent or ambiguous

## Phase 2: Planner Simplification

Primary outcome:
- the planner answers "what should I do next?" quickly, without making the user read through
  repeated mechanic explanations

### Goals

- reduce information density in the planner
- prioritize actionable ranking over explanatory prose
- surface best-now decisions, not just raw grouped output
- keep details available without forcing them into the default reading path

### What this phase should add or change

- stronger top-level planner hierarchy
  - top priorities now
  - best nations to farm
  - today's activities
  - this week
  - crafting and no-resin actions
  - blocked or missing-data items
- more compact recommendation cards
- fewer repeated mechanic explanations in section bodies
- move supporting explanations into:
  - tooltips
  - optional disclosures
  - compact warning summaries
- planner filters focused on decisions
  - today
  - this week
  - best nations
  - no resin
  - missing data
- stronger "what changed since last import" visibility within the planner itself

### Codex guidance

- do not remove accuracy, warnings, or data-quality distinctions
- remove repetition, not useful information
- prefer concise labels over paragraph-style explanations
- preserve exact-vs-estimated semantics even in compact mode
- default to progressive disclosure when detail is valuable but not always needed

### Success criteria

- the first screenful is decision-first
- the planner is easier to scan under many active goals
- players can identify the best current activities without reading long descriptive blocks

## Phase 3: Shared Visual System and Interface Consistency

Primary outcome:
- Krumpanion feels cohesive, calm, and intentionally designed instead of feature-accumulated

### Goals

- improve spacing and hierarchy
- reduce clutter
- standardize card and section anatomy
- make high-priority information visually dominant

### What this phase should add or change

- shared UI patterns for:
  - section headers
  - recommendation cards
  - badges and chips
  - warning panels
  - disclosures
  - empty states
- consistent spacing and density scale
- reduced chip overload where plain text scans better
- better distinction between:
  - primary action information
  - supporting metadata
  - warnings
  - secondary notes
- consistency across:
  - Planner
  - Inventory
  - Crafting
  - Weapons
  - Database workbench where practical

### Codex guidance

- do not style one screen in isolation if the same pattern exists elsewhere
- prefer reusable primitives over one-off visual fixes
- reduce visual noise before adding more labels, chips, or helper blocks
- preserve strong contrast between actionable and supporting information

### Success criteria

- screens feel more balanced and less crowded
- shared interface elements behave consistently across tabs
- the app remains powerful without feeling busy

## Overlap plan

These phases are not hard walls. They should overlap in the following controlled way:

- Phase 1 builds the data and state layer that later UI work will surface more elegantly
- Phase 2 should begin using lightweight shared presentation patterns, but should not wait for a
  full visual-system rewrite
- Phase 3 should polish and standardize patterns that were proven useful in Phases 1 and 2

Avoid these anti-patterns:

- doing full visual redesign before planner hierarchy is stable
- adding import-diff UI without a reusable diff model
- compressing planner text so aggressively that accuracy context is lost

## Decision rules for Codex

When implementing roadmap-adjacent changes:

1. prefer trust over novelty
2. prefer fewer, clearer surfaces over more controls
3. prefer compact summaries with expandable detail over always-expanded explanation
4. prefer reusable layout primitives over isolated styling patches
5. prefer surfacing uncertainty explicitly over pretending the planner knows more than it does

If a proposed change adds clutter, repeated explanation, or another disconnected workflow, it
should usually be reconsidered.

## Recommended implementation order

1. import diff and freshness metadata
2. goal milestone tracking
3. planner delta summaries
4. planner compact mode and action-first hierarchy
5. best-nations and top-priority summaries
6. shared card, spacing, and disclosure patterns
7. consistency pass across tabs

## Out of scope for this roadmap

This roadmap does not by itself imply:

- planner math rewrites unless accuracy gaps require them
- replacing canonical database architecture
- adding broad automation features
- adding cluttered admin/debug surfaces to normal user flows

## Maintenance note

If priorities change, update this file first before implementing large UX or workflow refactors.
Codex should treat this document as the product-direction source of truth for usability and UX
tradeoff decisions.
