---
id: 132
area: montrose
type: fix
model: opus
turns: 40
title: Convert the Cricket Hill kite session cam to 126 camera ownership
acceptance: >
  packs/montrose-kite.js (task 074) still drives the camera the pre-126 way:
  `camera.position.copy(_cp); camera.lookAt(_ct)` in its registerUpdate with no
  takeCamera/releaseCamera — it predates the framework camera-ownership API and
  was never converted when 126 landed (the scope beats were). It works today only
  because pack updates run after main.js sets the chase cam (position/quaternion
  pack-wins is TRUE), but it is the exact class that produced issue 039, and any
  future beat that eases a number the kite cam also writes will fight it.
  (1) Convert the kite session to takeCamera('kite')/releaseCamera('kite') with
  the lockLook default, keeping the flight feel IDENTICAL (before/after shots of
  the same scripted flight); (2) verify no fov writes anywhere in the pack (the
  two-easers law applies only to eased numbers — fov must have exactly one
  writer); (3) the kite E2E from 074 still passes; (4) walkthrough
  mt-crickethill-summit/-base unchanged. Small, surgical; do not touch the kite
  physics or reel mechanics.
refs:
  - src/packs/montrose-kite.js (~lines 185-200, the raw camera writes)
  - src/framework.js takeCamera/releaseCamera (126) + lp-heron-scope.js (the
    converted-pattern model)
  - autopilot/issues/039-south-pond-scope-vibrates.md (why ownership exists)
---

Found during the 129 scout: the map's third session cam never adopted the 126
ownership API. It does not currently fight anything (the 129 reserve scope sits
100+ m away with a tiny activation radius), but it is standing tech debt of the
exact issue-039 class. Convert it while it is cheap.
