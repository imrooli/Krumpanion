# Stack Decision for Krumpanion

## Recommended MVP stack

Use:

- TypeScript
- React
- Vite
- Zustand or React Context
- Dexie/IndexedDB for MVP persistence
- Tauri + SQLite later

## Why not Python first?

A Python GUI would be workable for a calculator, but Krumpanion's main complexity is the interactive UI:

- large character goal editing
- searchable/filterable tables
- grouped material plans
- day-based planner views
- persistent user goals
- eventual artifact inventory analysis

React handles this better than a desktop-only Python GUI.

## Why TypeScript?

Krumpanion needs strict object shapes:

- GOOD character records
- GOOD weapon records
- GOOD material map
- character goals
- weapon goals
- artifact farming goals
- material source records
- planner rows

Static typing will prevent many mistakes around keys, current levels, target levels, and grouped materials.

## Persistence strategy

MVP:
- Store imported inventory snapshot in browser memory.
- Store goals in IndexedDB/localStorage.
- Allow export/import of `krumpanion-goals.json`.

Later:
- Package with Tauri.
- Store profiles, snapshots, and goals in SQLite.
- Keep static game data as JSON or SQLite seed tables.
