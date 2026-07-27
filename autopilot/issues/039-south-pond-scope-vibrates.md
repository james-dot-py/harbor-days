# Issue 039 — the South Pond scope just vibrates when you look through it

- **Reported by:** owner playtest 2026-07-26
- **Area:** lincolnpark
- **Severity:** MEDIUM — a delight beat that actively feels broken when used.
- **Owner's words:** *"scope on the path on the pond in lincoln park doesn't seem to
  work right, just vibrates when you look in it."*
- **Routed to:** task 126.

## Context

This is the **night-heron scope** on the South Pond boardwalk, shipped by task 118
("SPOT THE NIGHT-HERON", one of the four delight lines verified at commit 4a3fc3e).
Looking through it produces a vibrating/juddering view instead of a stable framed one.

"Vibrates" is the signature of a **camera fight** — two things writing the camera
transform in the same frame, each undoing the other:

- the scope's look-through camera vs. the normal follow/chase cam still running
- a lerp toward a target that is itself recomputed from the (already moved) camera
- the world-curve vertex shader or a `camCtl` snap not being applied on the scope path
- jitter from re-deriving yaw/pitch every frame off a value the scope just wrote

**Check the Montrose scope too** (`MONTROSE_POINT.scope`, referenced in
`src/packs/favors-montrose.js`). If the two share a scope mechanism, they likely
share the bug — fix it once in the shared path and assert both.

## Fix direction (details in task 126)

Reproduce with `tools/act.mjs`: walk the boardwalk to the scope, trigger it, capture
several frames, and Read them — a vibration shows as frame-to-frame jitter in
otherwise identical shots. Fix the ownership so exactly ONE writer drives the camera
while the scope is active, restore it cleanly on exit, and leave a judged waypoint
plus a note in `PITFALLS.md` so the next scope-like beat does not re-learn it.
