# 019 — cornhole incline boards STILL face the wrong way (regression on 029)

- severity: medium (second report of the same defect — the owner has now
  told us the exact fix)
- evidence: owner playtest, 2026-07-11: "Cornhole incline boards face the
  wrong way still. You can literally just swap them without rotating them,
  since the downward slant should face the opposite one." First reported
  2026-07-10 (task 029, went green 21:34 — evidently wrong or incomplete).
- observed: at both cornhole sites (Gallagher Way + the Belmont Rocks
  lawn), each board's downward slant faces AWAY from its thrower.
- expected: the two boards of each pair EXCHANGE POSITIONS with zero
  rotation change (owner's recipe — the slants then face each other's
  thrower). Verify with a screenshot from each throwing position: the low
  edge of the far board faces the camera. Bags still land/score (cornhole.js
  scoring untouched).
- route: task 052, item 3. Post-mortem note for the session: read 029's
  close-out to see why the first fix missed — likely rotated in place
  instead of swapping, or fixed one site only.
