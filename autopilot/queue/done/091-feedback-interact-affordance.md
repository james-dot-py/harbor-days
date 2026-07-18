---
id: 091
area: global
type: feedback
model: fable
turns: 110
title: INTERACT AFFORDANCE — Malört bottle in hand, interactables read as interactable, tote discoverable
acceptance: >
  Three owner notes (2026-07-18), one theme — you can't tell what's alive:
  (1) "mallort guy should have a bottle of mallort he's holding" — give the
  Malört NPC a held bottle prop (held-prop law: attach to the NPC GROUP at
  hand height unless the hand animates — PITFALLS 047; screenshot from the
  facing side and LOOK).
  (2) "it should be more clear you can engage with people you can engage
  with. Objects you can interact with should appear interactable but not
  unnaturally so" — a GLOBAL, SUBTLE affordance for addInteraction targets
  and interactive NPCs: think a soft idle sway/glance toward a near player,
  a faint warm glint or gentle bob on interactive objects when within ~6 m
  — cozy, diegetic, NOT floating markers/outlines ("not unnaturally so").
  One mechanism in framework.js so every pack inherits it (no per-pack
  hand-rolling); gated off under ?play=1 for shot determinism unless
  ?affordance=1 (the 087 idle-gate law). Judge it by eye at 5+ different
  interactions across areas: an interactive thing and a decorative thing
  must read differently at a glance in the SAME frame.
  (3) "accessing your tote should be more obvious" — surface the tote:
  desktop hint + a visible touch HUD affordance (measure HUD rects both
  orientations — the 079 overlap law; box-sizing/media-query pitfalls
  apply). A new player must find the tote within seconds of first pickup —
  E2E: fresh save, buy/collect an item, assert the tote affordance is
  visible and opens on the documented input in both desktop and --mobile.
  Standard gates green (walkprobe+guards, build, baseline determinism,
  draw budget); walkthrough spot-checks of affected waypoints READ.
refs:
  - autopilot/feedback/processed/feedback-2026-07-18T03-30-02-973Z.md (verbatim)
  - autopilot/feedback/processed/feedback-2026-07-18T03-35-27-778Z.md (verbatim)
  - src/framework.js (addInteraction/makeNPC/holdItem), src/packs/malort.js
  - PITFALLS.md (047 held-prop law; 079 HUD rect sweep; 087 play=1 gating)
---

Affordance is the whole game loop's front door: the owner keeps finding
content by accident. One shared mechanism, tuned quiet.
