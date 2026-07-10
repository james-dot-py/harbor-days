---
id: 020
area: wrigleyville
type: build
model: fable
turns: 120
title: Intersection corner truth — every corner holds its real occupant
acceptance: >
  Owner directive (2026-07-09): all intersections carry the right landmarks on
  each corner; Sheffield & Addison currently has nothing except the field, and
  the field corner does not resemble reality. The four new wv-x-* waypoints
  (one framing per diagonal corner) judge GREEN from a fresh scoped
  walkthrough. HERO ITEM — the stadium SE/right-field corner at Sheffield &
  Addison: reshape per the OSM footprint (refs/wrigleyville/osm.json — the
  bowl is rounded/angled there, not a hard box edge; GOOGLE IMAGERY BANNED per
  decision b) with gate + signage presence per non-Google photos (refs-fetch
  Wikimedia). SUPPORTING CORNERS: a souvenir-store corner across Addison at
  Sheffield (Sports World-style likeness, canvas signage), the station
  entrance relationship east of Sheffield, and an audit pass on the other
  three intersections filling any bare or backdrop-grade corner with
  plausible-for-the-block fabric (SS4.4 faithfulness: real relationships,
  invented minor fills allowed). GEOGRAPHY.md first for any footprint change;
  walkability + walkprobe + clearance volumes updated with it. Coordinate: 012
  owns the grandstand skin, 016 owns mid-block fabric, 019 owns Gallagher —
  this task owns the CORNERS. Verify: /verify green; walkthrough --ids
  wv-x-clark-addison,wv-x-sheffield-addison,wv-x-sheffield-waveland,wv-x-clark-waveland
  plus affected gates; every PNG READ and judged; draws <= 480.
refs:
  - refs/wrigleyville/osm.json (real footprints incl. the rounded SE bowl)
  - tools/waypoints.expect.json wv-x-* entries (the bar being judged)
  - refs/inbox owner screenshots (bleacher corner + Gallagher context)
---

Corners are where a Chicagoan decides in one glance whether this is the real
place. Sheffield & Addison is the test case: field corner shaped right, store
across the street, station pulling people east.
