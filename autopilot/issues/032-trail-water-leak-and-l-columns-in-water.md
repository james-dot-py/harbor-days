---
id: 032
area: lincolnpark
severity: high
source: owner-playtest-2026-07-24
coords: { x: 18.4, z: 233.3 }
---
# Trail water leak past the bushes + L platform columns standing in the water

**Where:** on the Lakefront Trail at ~(18.4, 233.3), looking east / to the right past the screening bushes (near the Belmont-stop stretch).

**Observed (owner):** you can see open water past the RIGHT of the bushes on the trail — the screening is gapped so the lake shows where it shouldn't. And the **L platform columns descend into the water** — support columns / piers standing in the lake.

**Expected:** the trail's east edge reads as screened berm / hedge / revetment, no raw water gap; the Belmont platform and EVERY one of its support columns land on solid ground — no structural column inside the water polygon.

**Fix direction:** check the Belmont-stop platform stub + column placement against the COAST/LAND polygon at z~233 (coastQuery/tierAt). Either move the platform/columns onto land or extend the revetment/screening to close the gap. Add a judged waypoint here; fold the columns into the "no solid in the water polygon" permanent guard shared with issues 033/036.

---
**RESOLVED (task 120, 2026-07-26).** The map's west face is LAND now: `WEST_GRADE` panels (chicago.js/coast.js) fill everything west of the Drive with solid city ground, the Brown Line moved into the data module (`L_TRACK`/`lTrackBents`) so every bent is asserted on `isDryGround`, and the Belmont platform stands on it. Judged waypoint `lf-west-screen` at the owner's exact (18.4, 233.3) — all three framings show city, viaduct-on-land, zero water west of the berm (tools/shots/run-ms20cpwm/). Permanent guard: tools/no-solid-in-water.mjs (CHECK A) runs inside walkprobe.
