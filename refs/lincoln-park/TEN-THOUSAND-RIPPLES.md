# "Ten Thousand Ripples" — the emerging Buddha heads (reference brief)

Owner photographed these on 2026-07-26 and asked for them:
*"there's also these buddha heads half-sunken into the ground at a spot along the
way to the underpass."* Owner photo: `refs/inbox/owner-2026-07-26-buddha-heads.jpg`
(move it to `refs/lincoln-park/owner-ten-thousand-ripples.jpg` when you build this).

**This is a real installation, not a rendering bug.** Do not "fix" sunken heads
anywhere — they are supposed to be half-buried.

## What it is

- **Ten Thousand Ripples (TTR)** — artist **Indira Freitas Johnson**, with the
  nonprofit Changing Worlds. 100 fiberglass-and-resin Buddha head sculptures,
  ~300 lb each (sand-filled), "emerging" from the ground.
- Created 2012, installed across ten Chicago community areas in two phases in 2013;
  classed by the Park District as **temporary**, though sites have persisted.
- The project is about **peace and nonviolence** — the heads appear in ordinary
  places (parks, plazas, alleys, lots) rather than galleries. Keep the tone quiet.
- **Lincoln Park site, per the Chicago Park District: "Just South of Diversey @ LSD."**
  That is exactly the owner's "a spot along the way to the underpass" — the walk
  south from the Diversey corner toward the Fullerton underpass.

## What the owner's photo shows (build to this)

- **Scattered, not arranged.** Six visible heads strewn irregularly across an open
  lawn under mature trees — no grid, no plinths, no signage, no fence. Spacing is
  loose and uneven, roughly 8–20 m apart, at varied angles.
- **Half-emerged.** Each head is buried to roughly the chin/jaw, so what reads is a
  **dome of hair plus the top of a face**, tilted slightly differently head to head.
  Nothing sits *on* the grass — the lawn meets the sculpture with no base or lip.
- **Matte white/off-white**, no gloss. In sun they read near-pure white against the
  green; in tree shade they go soft grey-white. No color detail, no gilding.
- **The hair is the silhouette** — tight rows of carved snail-shell curls in
  concentric bands. At player distance that reads as a **ribbed/scalloped dome**;
  get the banding and the piece is recognizable. The face is calm, eyes closed,
  minimal features — do not over-detail it.
- **Scale:** roughly head-height-to-waist on a person, i.e. the emerged part is about
  **1.0–1.4 m** across. They are big enough to read from the path but never loom.
- Setting in the photo: mown lawn with dappled tree shade, Lake Shore Drive traffic
  and the skyline visible behind — consistent with the Diversey/LSD lawn.

## Build guidance

- **Stylized homage, in the Cloud Gate / Crown Fountain precedent** — this is a
  living artist's copyrighted work, so build a recognizable toon interpretation, do
  not attempt a facsimile. Follow the same treatment those landmarks got and check
  the brand/likeness risk register in `APPSTORE.md` §5.2.
- **Naming:** geographic and civic names stay real per the de-brand law
  (CLAUDE.md §8), and a public artwork title is not a commercial mark — but keep
  player-visible text minimal and reverent. A quiet toast on approach beats a plaque.
- Reuse existing instancing: they are identical repeated objects with varied yaw and
  slight tilt — one InstancedMesh with per-instance rotation, **zero new buckets**.
- They are **props, not colliders to trap on** — give them clean collider rings and
  keep them off the path per the prop-clearance sweep (088).

## Sources

- <https://www.chicagoparkdistrict.com/parks-facilities/lincoln-park-ten-thousand-ripples-artwork> — the Lincoln Park site record ("Just South of Diversey @ LSD", 2045 N Lincoln Park West, fiberglass/resin, temporary).
- <https://en.wikipedia.org/wiki/Ten_Thousand_Ripples> — project overview, 100 sculptures, the ten community areas.
- <https://www.changingworlds.org/10000-ripples> — the partner nonprofit's project page.
