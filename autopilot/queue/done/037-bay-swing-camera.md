---
id: 037
area: lakefront
type: feedback
model: opus
title: Topgolf bay swing camera — see the ball fly (issue 015)
acceptance: >
  Owner (2026-07-10): "You can't see where you're hitting when you're inside
  the top golf cage." Root cause is structural: the swing launches along
  camForward() (src/packs/diversey.js ~L123) but the bay is an enclosed
  shell and the chase camera gets stuck behind/inside it — the blocked
  camera ruins BOTH the view and the aim. Fix with a swing-session camera
  mode: (1) while a bucket session is active in a bay, take camera control
  — over-the-shoulder framing from inside the bay opening, locked facing
  NORTH downrange with modest aim freedom (± ~0.3 rad yaw so aiming still
  feels manual), pitch framing both the mat and the range; use the existing
  camera-mode precedents, don't invent new plumbing (binocular mode in
  packs/nature.js drives the camera for the scope; wrigley-ride.js
  ~L233-235 does a fixed line-up; main.js owns cam/camCtl); (2) on launch,
  hold or gently follow so the FULL arc and the landing bounce are visible,
  then show the distance toast and return to framing the mat for the next
  ball; (3) camera control releases cleanly when the bucket empties or the
  player walks out of the bay — no stuck camera, no snap-pop (lerp back);
  (4) the bay shell must never occlude during the session — verify with
  act.mjs captures from INSIDE a ground-tier bay: enter, charge, launch,
  ball visible start to landing, READ the PNGs; test desktop (E + mouse)
  and touch (hand button) both; (5) no per-frame allocations; determinism
  untouched; draw budget unchanged; walkprobe green; single-file build
  passes.
refs:
  - src/packs/diversey.js (bay swing ~L116-156; camForward aim L123)
  - src/packs/nature.js (binocular camera-mode precedent)
  - src/wrigley/wrigley-ride camera line-up precedent (src/packs/wrigley-ride.js ~L233)
  - src/main.js (cam / camCtl ownership)
  - autopilot/issues/015-bay-swing-camera-blocked.md
---

The bay is a stage: mat in the foreground, city lights and flying ball as
the show. Right now the audience is seated behind the curtain. The camera
mode is the whole fix — resist any temptation to cut holes in the bay shell
geometry to make the chase camera work; the shell is right, the camera is
wrong.
