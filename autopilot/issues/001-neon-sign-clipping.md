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
