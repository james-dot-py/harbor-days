---
id: 050
area: millennium
type: feedback
model: fable
title: Wrigley Square + Millennium Monument — the purple-lit peristyle, per the owner's night photo
acceptance: >
  Owner (2026-07-11): "here's the real wrigley square with correct lighting.
  Can you build this too? x=85.4 z=734.5" — the photo is
  refs/millennium-park/owner-wrigley-square-night.webp (LOOK at it; it is
  the ground truth for BOTH structure and lighting). (1) STRUCTURE at
  (85.4, 734.5), the park's NW corner: the Millennium Monument peristyle —
  a semicircular Doric colonnade on a raised curved base, inscription band
  across the base front (a simplified readable plate in the game's sign
  register; letters need not be legible-exact), central fountain basin with
  a single jet, flanking planter urns, period lamp posts at the approach,
  and the open lawn apron in front (the photo's foreground). (2) LIGHTING
  is the owner's explicit ask: the columns wash PURPLE from uplights with a
  WARM gold wash at the base and fountain glow — the game's perpetual dusk
  is exactly this photo's hour, so it should read almost 1:1; use
  emissive/vertex-color/glow-helper tricks in the toon register (no dynamic
  lights, budget holds). (3) The Michigan Ave streetwall + lit towers
  behind (existing from 041/046) frame it — verify the photo's framing
  reads from the lawn approach: colonnade in front, glowing towers stacked
  behind. (4) Mint an mp-wrigley-square judged waypoint from the owner
  photo's vantage with an honest expectation quoting the read (purple
  columns, warm base, fountain, towers behind). Walkability: the lawn +
  monument plinth follow the issue-017 contract (no holes); draw budget
  ceiling; determinism; walkprobe green; single-file build passes.
refs:
  - refs/millennium-park/owner-wrigley-square-night.webp (THE reference — structure + lighting)
  - refs/millennium-park/BRIEF.md + owner-aerial-use-this.jpg (siting)
  - src/core.js (toon/bmat/glow helpers), src/structures.js (colonnade-scale build precedents: Chevron, monument sign)
---

Poetic bonus the session should enjoy: the monument's inscription dedicates
the park's donors — and the square is named for the same Wrigley as the
neighborhood the Red Line just connected. The purple-on-gold lighting is
the whole personality of this build; if the purple reads as neon-clown
instead of civic-elegant, tune toward the photo, not toward more.
