---
id: 001
area: global
type: build
title: OpenStreetMap ODbL attribution (README + in-game journal about section)
priority: blocker
acceptance: >
  README.md has a "Credits & data" section crediting "© OpenStreetMap
  contributors" with the ODbL link, and the in-game journal shows an "About"
  section (registered via src/framework.js journalSection) that credits
  OpenStreetMap under ODbL. Both ship in ONE commit, and this task lands BEFORE
  any OSM-derived layout is merged into GEOGRAPHY.md or src/data/*.js. /verify
  passes; the single-file build still emits exactly one dist/index.html; the
  gate is green.
refs:
  - AUTOPILOT.md §1(g) (geography sourcing policy — "Attribute OpenStreetMap per
    ODbL: README credits plus the in-game journal's about section")
  - AUTOPILOT.md §4.4 (osm-fetch; "ODbL attribution task ... ships before any
    OSM-derived layout lands")
  - src/framework.js journalSection(id, title, renderFn) — renderFn returns an
    HTML string; re-registering the same id replaces it; toggled with J / the
    book button
  - tools/osm-fetch.mjs — emits refs/<poi>/osm.json whose provenance already
    carries the "© OpenStreetMap contributors, ODbL" attribution string
---

# 001 — OpenStreetMap ODbL attribution

**Why this is a blocker.** The autopilot derives every neighborhood's street
topology, shoreline, park and building layout from OpenStreetMap via
`tools/osm-fetch.mjs` (reference-only `refs/<poi>/osm.json`). Even though OSM
geometry is never imported as game geometry — builders hand-model in the toon
style from the projected coordinates — the *layout* is an OSM-derived database
extract, so ODbL requires visible attribution. Per decision (g) this ships in
two places, and it must land **before** the first OSM-derived layout reaches
`GEOGRAPHY.md` / `src/data/*.js`. Do this task first.

## What to build

### 1. README credits section
Add a section to `README.md` (e.g. "## Credits & data") containing, verbatim,
attribution equivalent to:

> Map layout is derived from OpenStreetMap data.
> © OpenStreetMap contributors — https://www.openstreetmap.org/copyright —
> available under the Open Database License (ODbL).
> OSM geometry is used as reference only; all in-game geometry is hand-modeled.

Also note that photographic reference (Wikimedia Commons, Mapillary,
owner-supplied) is credited per-image in each `refs/<poi>/manifest.json`.

### 2. In-game journal "About" section
Register an **About** journal section via `journalSection` from
`src/framework.js`. Follow the established pack pattern (a pack module whose
setup runs inside `onWorldReady`, wired by one import line in
`src/packs/index.js` — see how `wrigley-gameday.js` / `ambient.js` register
their sections). The section renders an HTML string; keep it short, e.g.:

```
journalSection('about', 'About', () => `
  <p>Harbor Days — a toy Chicago lakefront.</p>
  <p>Layout derived from <b>OpenStreetMap</b> data, © OpenStreetMap
     contributors, under the ODbL. OSM is reference only; everything you see is
     hand-built.</p>`);
```

Keep the section id stable (`about`). Prose is fine to tune, but the
"© OpenStreetMap contributors" + "ODbL" credit must be present and legible.

## Constraints / doctrine
- Determinism: register the section inside `onWorldReady`; never call rng at
  module import time.
- Single-file build must still emit exactly one `dist/index.html` (no new
  assets); no new runtime dependencies.
- No localStorage; guard any audio on null actx (not expected here).
- One import line in `src/packs/index.js`; re-read that file immediately before
  editing and retry on conflict.

## Verify
1. `/verify` passes; `npm run build` emits exactly one `dist/index.html`.
2. Manual shot of the journal open (J) shows the About section with the OSM/ODbL
   credit — READ the PNG and confirm the text is legible.
3. `README.md` renders the credits section.
