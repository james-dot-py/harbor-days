---
id: 033
area: lincolnpark
severity: high
source: owner-playtest-2026-07-24
coords: { x: 29.1, z: 403.7 }
---
# Disjointed paths at the Diversey corner into Lincoln Park

**Where:** ~(29.1, 403.7) — the Diversey corner-wrap where the lakefront trail bends into Lincoln Park (z ~403–410, beside the Diversey–Lincoln Park gate).

**Observed (owner):** the paths are disjointed — segments don't meet, offset / broken seams. "Looks bad."

**Expected:** continuous path geometry through the corner — segments weld with no gaps, offsets, or z-fighting seams. This is the path-continuity gate class (precedent: issue 018 crosswalks, 029 trees-in-paths, the 102/104 path-continuity permanent gate).

**Fix direction:** trace the trail / Diversey-harbor connector polylines through z ~403–410; weld the channel path to the corner-wrap trail (pathSamples2, miter welds, no dead ends). Add the seam to the permanent path-continuity gate + a judged waypoint at the corner.

---
**RESOLVED (task 120, 2026-07-26).** LP_TRAIL_LAKE now starts on TRAIL_MAIN's exact head (30,406) as a DUAL ribbon (bike + walk, shift −walkOff) mitre-spliced via the new `startFrame` twin of the 102 end-frame join (paths.js); dash phase carries across the seam by symmetry. Judged waypoint `lp-corner-weld` at the owner's (29.1, 403.7): one continuous dual path, no chopped caps or lateral offsets (tools/shots/run-ms20cpwm/). Permanent gate: path-continuity.mjs gained walk:lp/bike:lp head-splice rows + the corner dash-gap expectation (126/126 green).
