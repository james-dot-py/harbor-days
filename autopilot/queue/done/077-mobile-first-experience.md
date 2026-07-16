---
id: 077
area: shell
type: feedback
model: opus
turns: 100
title: MOBILE-FIRST — teach the thumbs (onboarding) + install to home screen (PWA)
acceptance: >
  Owner (2026-07-16): "ensure it's super playable from mobile. It's not
  super obvious to people right now how to walk or change perspective on
  iphone." The QR campaign is live — every scan is a phone meeting the
  game cold. (A) TOUCH ONBOARDING: (1) first-run coach marks on touch
  devices, shown once after 'let's walk': two soft animated ghost-thumb
  overlays in the game's cozy register — left thumb circles "walk" over
  the joystick zone, right thumb swipes "look around" — each dismisses
  the moment the player DOES it (teach by doing, not by reading; no
  modal, world stays live behind); a third beat introduces the hand
  button on first interaction proximity. (2) Discoverability at rest:
  the invisible joystick zone gains a faint idle stick ghost for the
  first session (fades permanently once the player has walked 20 m).
  (3) FEEL PASS on iPhone-class touch: camera drag sensitivity + inertia
  tuned (document values), joystick dead-zone small, thumb zones sized
  for one-handed portrait AND two-handed landscape, no accidental
  camera-drag while joysticking (zone arbitration), buttons ≥44 px.
  (4) The "?" controls card gets a touch section with the same ghost
  iconography. "Seen onboarding" persists via a tiny guarded-storage
  flag (the 078 save adapter pattern, standalone until it lands — same
  try/catch contract, no dependency). (B) PWA INSTALLABILITY, no app
  store needed: web manifest (name Ope!, standalone display, portrait-
  friendly, theme colors from the palette), full icon set generated from
  the title-card art (192/512 + maskable + apple-touch-icon), iOS meta
  tags (apple-mobile-web-app-capable, status-bar style), safe-area
  insets respected by the HUD (notch phones), and a gentle once-per-
  session hint on iOS Safari after a few minutes of play: "add Ope! to
  your home screen — plays fullscreen" pointing at the share sheet
  (dismissable, never nags again that session). Single-file build: the
  manifest/icons ship as extra deploy files (Pages serves them; the
  shareable single HTML still works standalone without them — degrade
  silently). VERIFY: act.mjs touch runs at 390x844 portrait + landscape
  (onboarding appears, dismisses on-action, controls feel asserted),
  Lighthouse-style PWA installability check against the built output,
  desktop untouched (no coach marks with a keyboard), the 014 start-tap
  audio chain untouched, shots READ; walkprobe green.
refs:
  - src/input.js (touch handlers, joystick zone), index.html (touch layout, ctl card)
  - the 026 pill-tap + 014 audio-gesture close-outs (the touch contracts to not regress)
  - tools/act.mjs --mobile (the 026-era touch latch pattern)
  - deploy workflow (.github/workflows/deploy.yml — manifest/icons join the artifact)
---

The bar: someone scans the QR at a bar, and in ten seconds they're
walking the rocks without being told anything. Every coach mark that
outstays its welcome is a bug; teach-by-doing, dismiss-by-doing. The PWA
half makes the home-screen icon the app store nobody has to approve.
