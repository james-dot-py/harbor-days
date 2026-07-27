---
id: 127
area: lincolnpark
type: delight
model: fable
turns: 100
title: Dress the walk to the underpass — trees + the "Ten Thousand Ripples" Buddha heads
acceptance: >
  Two owner asks from the 2026-07-26 playtest, both on the walk south from the
  Diversey corner toward the Fullerton underpass. Runs AFTER 124 has made the portal
  read, so the approach is dressed around a threshold that already works.
  (1) TREES ON THE WAY TO THE UNDERPASS. Owner: "Add trees on the way to the
  underpass too please." The stretch is bare and reads as filler. Use the existing
  tree archetypes and instancing (no new buckets, POST-filter placement after rng so
  determinism is untouched — the props.js precedent), and plant to the real thing:
  Lincoln Park is heavily wooded along this stretch, with mature canopy over the
  lawns and thinner planting close to the Drive. Keep the trail corridor and every
  path clear (prop-clearance sweep, 088) and do NOT bury the underpass portal that
  124 just made legible — check the 124 approach waypoints still pass after planting.
  (2) THE BUDDHA HEADS — "Ten Thousand Ripples". Owner photographed the real
  installation and asked for it. READ refs/lincoln-park/TEN-THOUSAND-RIPPLES.md
  FIRST — it carries the full brief. Summary: Indira Freitas Johnson's emerging
  Buddha heads, matte white, half-buried to the jaw so what reads is a ribbed dome
  of carved curls plus a calm face, scattered irregularly across an open lawn under
  trees, no plinths, no signage, no fence, roughly 1.0-1.4 m of emerged sculpture.
  The Park District puts the Lincoln Park site "Just South of Diversey @ LSD" —
  exactly the owner's "a spot along the way to the underpass." Place ~6 on the lawn
  there, loose and uneven spacing, varied yaw and slight tilt, ONE InstancedMesh with
  per-instance rotation, zero new buckets. They are props: clean collider rings, off
  the path, never a trap.
  (3) TREATMENT: a stylized toon homage in the Cloud Gate / Crown Fountain precedent
  — this is a living artist's copyrighted work, so build a recognizable interpretation,
  never a facsimile, and check APPSTORE.md §5.2 (brand/likeness risk register).
  Player-visible text stays minimal and reverent: the piece is about peace and
  nonviolence and the real installation carries no signage. A quiet toast on approach
  beats a plaque. Geographic/civic names stay real per the de-brand law (CLAUDE.md §8).
  (4) THE SILHOUETTE IS THE WIN CONDITION: at player distance the concentric bands of
  snail-shell curls must read as a ribbed/scalloped white dome. Get the banding and
  the half-buried waterline right before detailing the face — an over-detailed face
  reads worse, not better.
  (5) MEASUREMENT: judged waypoints for the dressed approach and for the heads on
  their lawn, authored expectations, walkthrough green, EVERY PNG personally Read
  and judged against the owner's photo.
  (6) walkprobe exits 0; permanent guards green (prop-clearance, no-solid-in-water,
  path-continuity, anti-trap); local seeds only; draws <= 480 at every affected
  waypoint; spawn diff within gate; npm run build one artifact, zero console errors.
  Lincoln Park is SIGNED OFF (123) — extend the waypoint set, do not re-run §5.2.
  (7) File refs/inbox/owner-2026-07-26-buddha-heads.jpg into refs/lincoln-park/ with
  source: "owner" in the manifest as part of your close-out.
refs:
  - refs/lincoln-park/TEN-THOUSAND-RIPPLES.md (THE brief — artist, form, placement,
    treatment, sources; read before building)
  - refs/inbox/owner-2026-07-26-buddha-heads.jpg (the owner's own photo — the
    judgment standard)
  - autopilot/queue/124-underpass-must-read.md (runs first; do not undo its
    approach sightlines with canopy)
  - src/props.js (tree archetypes, instancing, the POST-filter placement pattern that
    keeps determinism), src/data/chicago.js (TREES data, the Diversey-corner and
    lakefront lawn geometry), GEOGRAPHY.md Lincoln Park section
  - task 021 Diversey corner + refs/diversey-corner (the owner's GPS-verified corner
    at the north end of this walk)
  - CLAUDE.md §8 de-brand law + RENAMES.md; APPSTORE.md §5.2 likeness register
  - PITFALLS.md (prop clearance; instanced-color + Group crash at r128; setColorAt)
---

## Supervisor note — a duplicate task was auto-filed and removed (2026-07-26)

Task 125's session swept `refs/inbox/`, found the owner's buddha-heads photo with no
covering note, correctly applied the "a ref drop with no note is a build request"
rule, and authored `128-lincolnpark-buddha-heads.md` — not knowing THIS task already
covered it. 128 has been deleted; 127 is the one that ships. Two corrections it
surfaced, both settled here:

- **They are HALF-SUNKEN, not sitting on the lawn.** 128 read the photo as heads
  resting on the grass with no plinths. No plinths is right; resting is not. The
  owner's own words are authoritative: *"these buddha heads half-sunken into the
  ground."* Build them emerging — buried to roughly the jaw, lawn meeting sculpture
  with no base, no lip, no shadow gap.
- **Siting agrees.** 128 reasoned independently from the photo background (open lawn,
  Lake Shore Drive traffic, the high-rise wall behind) to the east-facing park lawn
  near the Drive, north of the zoo. That matches the Park District's record for the
  real installation — "Just South of Diversey @ LSD" — so site it there with
  confidence, NOT in the formal garden and NOT inside the zoo campus.

If you sweep `refs/inbox/` and find the buddha photo already filed to
`refs/lincoln-park/`, that is 125's doing — do not file a third task for it.

---

The owner walked from the Diversey corner toward the underpass, found the stretch
bare, and sent a photo of the one thing that is actually there in real life: six
white Buddha heads half-sunk in the grass under the trees, with Lake Shore Drive
running past behind them.

That installation is a real Chicago thing — quiet, strange, and completely
unexplained if you come across it without knowing. It is exactly the kind of detail
that makes a local say "they nailed it." Build it with the restraint it deserves: no
signage, no fanfare, just white shapes in the grass that a player notices and walks
over to look at.

And plant the walk. A bare corridor between two good places is the thing the
2026-07-19 audit called "just walking" — the trees are what turn it into a park.
