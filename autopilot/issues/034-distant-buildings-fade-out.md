---
id: 034
area: lincolnpark
severity: medium
source: owner-playtest-2026-07-24
---
# Distant backdrop buildings fade / pop out as you walk south

**Where:** walking SOUTH down the Lincoln Park path (continuing past the Diversey corner toward the zoo).

**Observed (owner):** buildings that are supposed to sit in the distance just fade away as you continue — they pop out of existence instead of resolving into view.

**Expected:** the distant backdrop (the Clark/Lincoln residential wall west + the south flats) reads stable along the whole walkable south stretch; no visible fog-clip or LOD pop within the play area.

**Fix direction:** likely the fog far-plane / draw-distance / backdrop-band culling tuned too tight for the extended v0.8 south map, or the backdrop band physically ending before the walk does. Extend / soften the backdrop so it covers the south reach, WITHOUT blowing the ≤480 draw budget at the affected waypoints (measure). Add a walk-south waypoint that catches the pop-out.

---
**RESOLVED (task 120, 2026-07-26).** The skyline gate now RECEDES then HAZES (LP_SKYLINE_GATE holdZ 403 / recede 1.8 / fade 470–545 with a color-lerp toward the horizon haze) instead of dissolving into see-through glass, and LAKEVIEW_BAND.southRow marches a low-rise city edge along z 1046 (+0 draw calls, own seed) so the south horizon is never empty. Judged waypoint `lp-southbound` (three stops walking south): solid → receding → atmospheric haze-out, nothing readable through any tower (tools/shots/run-ms20cpwm/). z ≤ 403 stays byte-identical (spawn vs baseline 0.086%).
