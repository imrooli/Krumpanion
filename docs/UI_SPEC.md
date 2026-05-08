# UI Specification

Krumpanion should feel like a fast planning dashboard, not a spreadsheet clone.

## Navigation

Top-level tabs:

1. Dashboard
2. Characters
3. Weapons
4. Artifact Goals
5. Planner
6. Settings/Data

## Dashboard

Dashboard cards:

- GOOD file imported
- Characters owned
- Weapons owned
- Materials tracked
- Active goals
- Resin needed estimate
- Today's farmable priorities

## Characters Tab

The Characters tab is the most important editing surface.

### Layout

Use a two-panel layout:

- Left/top: filters
- Main: virtualized/compact character table
- Optional right/bottom: selected character detail panel

### Filters

- Search by character key/display name
- Show only characters with active goals
- Show only characters missing materials
- Element/weapon/region filters can be added later
- Priority filter can be added later

### Character row/card

Show:

- character key/display name
- current level and ascension from GOOD
- current talents from GOOD
- target level
- target ascension
- target Normal Attack talent
- target Skill talent
- target Burst talent
- missing material badge/count
- estimated Resin badge
- "reset goal" button

### Goal inputs

Use compact selects for known breakpoints:

Character level:
- current
- 20
- 40
- 50
- 60
- 70
- 80
- 90

Ascension:
- current through 6

Talents:
- current through 10
- optionally allow 11-13 later only for effective/constellation-aware display, but base cost goals should stop at 10 unless manually extended.

### Detail panel

When selecting a character, show:

- Character build goal summary
- Missing materials grouped by category
- Shared materials with other characters
- Talent book day/domain
- Normal boss needed
- Weekly boss needed
- Local specialty needed
- Enemy drops needed

## Weapons Tab

Similar to Characters but simpler.

Fields:
- weapon key/display name
- current level
- current ascension
- refinement
- equipped character
- target level
- target ascension
- weapon ascension material group
- available days
- missing material summary

## Artifact Goals Tab

Artifact goals are independent from current artifact inventory.

### Artifact goal fields

- Character
- Domain
- Target artifact set(s)
- Slot goals:
  - Flower
  - Plume
  - Sands
  - Goblet
  - Circlet
- Desired main stats
- Desired substats
- Priority
- Weekly Resin budget
- Notes

### MVP behavior

Artifact goals contribute to the Planner as a recurring Resin budget or priority, not as deterministic material shortages.

Example:
- "Farm Denouement of Sin for Golden Troupe for Furina"
- Weekly budget: 400 Resin
- Priority: 5

## Planner Tab

The Planner tab should answer:

> What should I spend Resin on today, and what can wait?

### Views

#### Today

Shows only farmable-today sources plus always-available sources.

Columns:
- Priority
- Activity
- Source/domain/boss
- Material target
- Missing amount
- Used by
- Available today
- Resin cost per run
- Estimated runs
- Notes

#### This Week

Groups all needs by day availability.

Sections:
- Monday/Thursday/Sunday
- Tuesday/Friday/Sunday
- Wednesday/Saturday/Sunday
- Always available
- Weekly reset-limited
- Artifact farming goals
- Unknown/manual

#### All Missing Materials

Flat grouped table of all missing materials.

#### By Character

Each character goal with missing material groups.

#### By Domain/Boss/Ley Line

Groups Resin spending by activity/source.

## Visual behavior

- Goals changed from current inventory should show an accent indicator.
- Missing materials should be shown as `owned / needed / missing`.
- Materials used by multiple characters should display a shared-demand badge.
- Planner rows should be sortable by priority, farmability today, Resin estimate, and missing amount.
