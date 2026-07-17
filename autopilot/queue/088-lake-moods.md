---
id: 088
area: global
type: build
model: fable
turns: 120
title: BASICS — lake moods: rare, gentle weather over the signature dusk
acceptance: >
  The golden dusk is CANON — it never leaves. But an unchanging sky is
  the last tell that this is a diorama. LAKE MOODS: rare, mild, ambient
  variations layered ON the dusk, date-seeded like the favors (a given
  real-world day has a mood; deterministic; NEVER touches the world rng
  — visual/audio layers only): (1) LAKE FOG (the classic Chicago move
  ~2 days in 7): fog banks roll in off the water — deepened fog curve
  biased from the east, halos on the globe lamps, a distant foghorn
  every few minutes, skyline ghosted; gameplay untouched (fog-cull
  benefits documented). (2) WARM DRIZZLE (~1 day in 7, and only ever a
  few minutes at a time, cycling): soft rain streaks (one instanced
  particle set), puddle shimmer decals on paths, NPCs raise umbrellas
  (a shared prop on the rig, staggered), the synth ambience gains a
  rain hush layer; fireworks still work (comedy of drizzle fireworks
  is allowed). (3) FIREFLY/CLEAR NIGHTS-EDGE (~1 in 7): extra-golden
  variant — firefly surge in the sanctuary + Lurie, warmer sky ramp,
  crickets layer. All moods: mild by design (never gray, never storm —
  if a screenshot stops looking like Ope!, dial it back), reduced-
  motion/low-power respectful (085 flags), mood shown subtly in the
  journal ("today: fog off the lake"), draw budget respected (fog is
  free; rain = 1 instanced draw; umbrellas shared geometry), determinism
  proof (world scatter identical across moods — assert via checksum),
  both inputs, shots of all three moods READ + judged against the
  game's own palette; walkprobe green; single-file build passes.
refs:
  - src/sky.js + fog setup (core), src/fx.js (particle precedent), src/audio.js (ambience layers)
  - the favors date-seed pattern (081) — same isolation-from-world-rng rule
---

Weather is the cheapest liveness a world can buy, and fog off the lake
is the most Chicago weather there is. The bar: a player who visits
three days in a row should catch a foggy one and text someone about
it. Restraint is the whole art — the dusk is the brand; the moods are
its moods.
