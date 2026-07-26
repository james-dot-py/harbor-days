---
id: 035
area: lincolnpark
severity: high
source: owner-playtest-2026-07-24
---
# No real bridge over Lake Shore Drive — player clips THROUGH the highway to reach Lincoln Park

**Observed (owner):** there is no real bridge / crossing over Lake Shore Drive to get from the lakefront into Lincoln Park — you pass THROUGH the highway (the LSD berm/road mass) and are obscured inside it. "Solids shouldn't pass through solids."

**Expected:** a proper walkable crossing — a bridge OVER Lake Shore Drive, or a clean underpass UNDER it — is the intended, readable route from the lakefront trail into the Lincoln Park interior. The LSD berm/road is a SOLID collider the player cannot walk through; the player is never rendered inside the highway mass. The crossing reads real (deck, rails, ramps/mouth) and is walkability-verified end to end.

**Fix direction:** GEOGRAPHY.md FIRST — site the crossing on the real alignment. A Fullerton underpass register already exists in data (~x6, z661, `fullertonUnderpass`) — either finish it as a walkable, screened underpass with the LSD solid above, or add a pedestrian bridge deck. Make `buildLSD`'s berm/road a collider; add an anti-clip walk rule so the player is routed to the crossing, not through the wall (anti-trap movement precedent 065). Add walkprobe expects + a judged waypoint at the crossing.

**Scope note:** if a from-scratch bridge structure genuinely exceeds a polish pass, file it as a dedicated BUILD task per the no-new-scope doctrine — but the owner has explicitly requested it, so it IS in scope to schedule/build now.

---
**RESOLVED (task 120, 2026-07-26) — the FULL fix, not the minimum.** The Fullerton crossing is a REAL sunken underpass: the path ramps down (0.28 m/m) between stone retaining walls, passes under the Drive through open voussoir portals with 3.62 m of headroom and wall lanterns, and the Drive is carried OVER on a bridge deck with parapets (structures.js buildLPUnderpass; walk surface = the analytic `lpUnderpassH`, shared engine + walkprobe). The berm is asserted SOLID along its whole length — the underpass is the only crossing — and the trench rim is a blocked lip (no colliders, anti-trap law). Two support fixes: the WATER_S plane is clipped at the trench footprint (it dug below the waterline and read as a flooded canal), and the chase camera ducks under the soffit while the player is in the cut (at default pitch the deck otherwise hid the walker — verified on desktop keys AND mobile joystick, tools/tmp-120-inputs.mjs + tmp-120-mobile-tunnel.png). Judged waypoint `lp-underpass`, 4 framings (tools/shots/run-ms20u42j/); uncut Rocks→boardwalk walk through it (tools/tmp-120-continuity.mjs). No separate bridge task needed — the crossing is built.
