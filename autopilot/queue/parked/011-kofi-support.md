---
id: 011
area: global
type: build
turns: 120
title: Ko-fi support integration — "Support development ♥" (title card, HUD, diegetic billboards with QR)
kofi_url: (OWNER TO FILL — e.g. https://ko-fi.com/<handle>; move this file to queue/ once filled)
acceptance: >
  Three surfaces, all using the EXACT kofi_url above. (1) Title card: a small
  "Support development ♥" line that opens the Ko-fi page in a new tab; must not
  interfere with the start-gesture flow. (2) HUD: a tiny ♥ button beside the
  existing "?" help button (same styling family), opens the link; visible on
  desktop + touch. (3) Diegetic: TWO in-world placements in house canvas-texture
  style — a rooftop advertising billboard atop one Waveland brownstone that does
  NOT have the EAMUS CATULI sign (real Wrigley rooftops carry ad boards — keep
  it period-plausible in the classic-postcard look), and an ad card inside the
  L train car (the Wrigley's Spearmint ad precedent). Both show
  "SUPPORT DEVELOPMENT ♥" plus a scannable QR code.
  QR RULES: no runtime deps and no binary assets — precompute the QR module
  matrix offline with a devDependency tool script (tools/gen-qr.mjs using the
  'qrcode' package), emit the matrix as a compact constant in the pack, and
  draw the modules on the canvas texture with a proper quiet zone and
  dark-on-light contrast. MECHANICAL ORACLE: verification must decode the QR
  from the actual walkthrough screenshot (tools script using devDep 'jsqr' on
  the PNG) and assert the decoded string equals kofi_url exactly — an
  unscannable QR is a failed task. Screenshot title card + HUD + both diegetic
  placements, READ all of them. Baseline note: the HUD ♥ appears in the
  canonical spawn view — if the pixel diff exceeds the gate, regenerate
  baseline.png in the same commit with [baseline-regen].
refs:
  - src/packs/about.js (journal about pattern), index.html title card + btnHelp
  - WRIGLEYVILLE.md (Spearmint ad precedent inside the L car)
  - PITFALLS.md (canvas signage measureText shrink-to-fit)
---

Owner directive (2026-07-08): include the Ko-fi diegetically plus on-screen and
in the start menu. Taste bar: it should feel like part of the world (a real
rooftop ad board, a real transit-car ad), never a popup. One rooftop + one
L-car card + two subtle UI touchpoints is the whole footprint — do not
proliferate placements.
