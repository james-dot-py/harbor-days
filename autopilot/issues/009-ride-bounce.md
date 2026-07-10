# 009 — mayor appears to bounce up and down during the Red Line ride

- severity: medium (the ride is the flagship milestone feature — every rider
  sees this)
- evidence: owner report, 2026-07-09 ("mayor bounces up and down during the
  ride").
- observed/suspected: src/packs/wrigley-ride.js ~L311 —
  carRoot.rotation.z = Math.sin(t*1.7)*0.004 is meant as gentle car sway,
  but carRoot's children are built at ABSOLUTE coords (CAR.x = −250), so the
  rotation pivots about the WORLD origin, not the car: geometry at |x|≈250 m
  displaces ≈ ±1.0 m vertically (sin(0.004)×250). The whole cabin heaves a
  metre while the player stays fixed at y=CAR.y — relative motion reads as
  the mayor bouncing. Confirm with one logged frame of a window-sill world-y
  before fixing.
- expected: a true gentle roll about the car's own long axis; floor, mayor,
  and cabin move together; window-light streaming and clack audio unchanged.
- route: task 027, part A.
- RESOLVED (task 027, 2026-07-10): re-pivoted the cabin onto an inner `carBody`
  group positioned at the car centre with children in car-local coords, so the
  sway rolls about the car's own long axis instead of the world origin. Measured
  the extreme wall mesh's world-Y over a full sway period: **2.011 m peak-to-peak
  heave before → 0.023 m after** (the 2.3 cm residual is the intended gentle roll
  of the upper corner 1.9 m off-axis; floor/player region ~0). A fixed cabin point
  projected to screen holds within **0 px** all ride under the ride camera.
