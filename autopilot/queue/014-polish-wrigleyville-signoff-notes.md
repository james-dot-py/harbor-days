---
id: 014
area: wrigleyville
type: polish
turns: 60
title: Wrigleyville polish — sign back-faces, stall-1 framing, knothole legibility
acceptance: >
  Three small fixes found during the 006 sign-off walkthrough (run-mrcsulf4),
  each verified by fresh shots READ from both/relevant sides:
  (1) Double-sided sign planes read MIRRORED from behind — street blades
  (CLARK/ADDISON at the Cubby Bear corner, WAVELAND at the bleacher corner),
  Murphy's rooftop blade (mirrored in all three wv-scoreboard framings), and
  the far ADDISON platform sign seen from the south end. Fix: back the plane
  with a solid-color face or add a second mirrored-UV plane so text reads
  correctly from BOTH sides. Verify at wv-cubby-bear-f1, wv-scoreboard-f0,
  wv-caray-statue-f0, wv-spawn-f0 — no mirrored text anywhere.
  (2) wv-stall-1's authored expectation says "stadium facade context behind"
  but none of its three framings show the stadium; retune the framings (or
  nudge the stall) so the facade reads, then walkthrough --ids wv-stall-1.
  (3) Evocation review (006): the knothole peek is the game's only ivy/field
  glimpse but reads ambiguous at wv-knothole-f1; make the through-hole view
  unmistakably FIELD (brighter green + ivy speckle on the inner wall face,
  bleacher sliver). Do NOT add exterior ivy — the real ivy is field-side only
  and invisible from the street; the knothole is the faithful mechanism.
refs:
  - refs/wrigleyville/SIGNOFF.md (verdict notes, run-mrcsulf4 shot paths)
  - refs/wrigley-field/ (marquee + grandstand photos)
  - AUTOPILOT.md §5.4 (faithfulness standard)
---

All three are non-blocking niceties logged during the 006 sign-off (which
passed); none regress walkability, determinism, or the draw budget. Keep the
fixes inside the wrigleyville cell modules; budgets.json is a ceiling — never
raise it.
