# 001 — neon sign plates clip off wall faces (owner playtest, 2026-07-09)

- severity: medium (visible from the main walking angle at the Cubby Bear corner)
- evidence: owner screenshot "neon sign cut off.png" — the Budweiser gag neon
  ("UDWEISE") is truncated at the wall's left edge; the CUBBY BEAR rooftop sign
  also clips at the corner from this angle.
- expected: every sign plate fits fully within its mounting face with a margin;
  legible from the sidewalk approach angles players actually walk.
- fix shape: clamp plate width to face bounds minus margin in the sign builder
  (measureText shrink-to-fit already exists — the BOUNDS check is what's
  missing); verify from multiple yaws in the walkthrough, not just the
  face-normal framing.
- route: fold into task 010 (bar likenesses) or 015 (streetscape application),
  whichever touches the Cubby Bear first.

## RESOLVED — task 010 (2026-07-09)

Fixed in village.js by the `fitSign(w,h,a0,a1,u0,u1,ca,cu,m)` helper: every
wall-mounted plate is clamped so its edges stay ≥0.3 m inside the mounting
face (the Cubby fascia plate that poked past the roof now sits on the
storefront band; every beer neon carries an explicit ≥0.5 m corner margin).
Verified in run mrdp6mgz: wv-cubby-bear f0–f2 read clean from the owner's
walking angle — no plate crosses a face edge anywhere in the bar row.
Remaining sign work owned by 016 (streetscape) applies the same helper.
