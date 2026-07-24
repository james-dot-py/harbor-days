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
