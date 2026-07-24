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
