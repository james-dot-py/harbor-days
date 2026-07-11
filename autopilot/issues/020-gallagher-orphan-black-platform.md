# 020 — weird black platform near Gallagher Way; possible orphan from a moved building

- severity: medium (dark mass at knee height that the mayor SINKS INTO —
  no surface, no collider, not on the minimap)
- evidence: owner screenshot
  refs/wrigleyville/owner-issue-020-black-platform-x-311.5-z-523.0.png
  (2026-07-11, coords via dbg; filed from refs/inbox by task 049). The mayor stands waist-deep in a long dark
  wedge platform against a cream facade with a dark window band; owner:
  "idk if you meant to remove the building that was there but isn't on the
  minimap."
- observed/suspected: at (-311.5, -523.0) — ~13 m east of clarkX(-523) —
  a dark plinth/awning-mass sits at ground level with no walk surface (the
  player clips through at y=0) and no minimap entry. Prime suspect:
  leftover base/awning geometry from task 033's building rehoming off the
  Clark right-of-way (or the 019 wedge south closure) — the building moved,
  its plinth stayed.
- expected: identify the orphan in the wrigleyville build tables — then
  either remove it entirely OR restore the intended building there,
  consistent with 033's relocation plan; minimap reflects reality; whatever
  stands there is solid (collider) or absent, never a ghost you sink into.
- route: task 052, item 4.
