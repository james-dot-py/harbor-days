# Issue 039 — the South Pond scope just vibrates when you look through it

- **STATUS: CLOSED by task 126.**
- **Actual cause: (1) — the chase cam never stopped running, but only on the
  FOV.** Reproduced first (`tools/tmp-126-repro.mjs`, frames on disk): the pack
  eased `camera.fov` toward 26 at rate 9 every frame while main.js eased it back
  toward `baseFov()` at rate 5 every frame. Two easers on one number never
  converge — it settled at a dt-dependent midpoint (43.0 headless, ~34 at
  60 fps) and shifted with every frame-time hitch. Position and quaternion were
  NOT fighting (the pack's `copy()` beats main's `set()`), which is why the
  bug survived 118's review: the view is stable in any two stills, and only a
  per-frame sample of the rendered camera shows the pump.
- **Fix:** camera OWNERSHIP in framework.js (`takeCamera`/`releaseCamera`) —
  while a look-through session holds the camera, main.js skips its entire camera
  block, transform and fov. Applied to all three look-through beats (heron
  scope, Jarvis binoculars, conservatory doors), which all shipped with the same
  fight. Two further defects the repro shots exposed and 126 also fixed: the
  scope's own tripod ate the bottom third of the eyepiece, and lp-conservatory
  was un-hiding the mayor from 276 m away so approaching from the heron side put
  your own back across the lens.
- **Guard:** `tools/tmp-126-camstab.mjs` (per-frame fov/position/angular delta +
  "did the fov actually REACH the zoom" + clean release) and the judged
  `lp-heron-scope` waypoint (three approaches, one eyepiece, `q scope=1`).
- **Montrose:** `MONTROSE_POINT.scope` is scenery — a structures.js tripod the
  birder NPCs lean on, with no look-through session. No twin there; the real
  twins were the binoculars and the glasshouse doors.

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
