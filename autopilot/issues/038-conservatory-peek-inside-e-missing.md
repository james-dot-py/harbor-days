# Issue 038 — pressing E at the conservatory does not let you peek inside

- **STATUS: CLOSED by task 125.**
- **Actual cause: (2) — it fires but has no visible payload.** Reproduced first
  with `tools/act.mjs` at (-70,710): the prompt pill read "peek inside", E ran
  `onUse`, and the toast appeared. Anchor, radius, registration and shadowing
  were all fine — causes (1), (3) and (4) were wrong. The payload was a line of
  text and the building did not change one pixel, because the doorway was a flat
  cream panel on an unbroken glass wall with nothing behind it.
- **Fix:** the vestibule's south face is now glazed around a REAL doorway hole;
  a palm-house diorama (three depths of chunky fern/palm crowns, trunks, a dark
  koi pool, warm back light) sits in it behind SHUT GLASS doors, visible on
  approach. E leans a session camera in and frames it, the interior warms, and
  warm air puffs out. No door opens, no walkable interior. Judged by the
  `lp-conservatory-doors` (passive) and `lp-conservatory-peek` (fired, `q
  peek=1`) waypoints.

- **Reported by:** owner playtest 2026-07-26
- **Area:** lincolnpark
- **Severity:** MEDIUM — a shipped interaction that does not fire reads as broken.
- **Owner's words:** *"Doesn't look like you can peak inside the conservatory when
  you press E."*
- **Routed to:** task 125.

## Context

Task 122 shipped `src/packs/lp-conservatory.js` including a **"peek-inside door
beat"** alongside the garden place cell, the Bates mist and the guarded burble. The
owner pressed E at the conservatory and got nothing he recognized as peeking inside.

Possible causes, in order of likelihood — diagnose, do not guess:

1. The interaction is **registered but out of reach** — wrong anchor coords, or a
   radius that does not cover where a player naturally stands at the doors (note the
   standing +1.1 grace radius in `framework.scanInteractions`).
2. The interaction **fires but has no visible payload** — a toast alone, with nothing
   actually shown, so it does not read as "peeking inside."
3. It is **shadowed by another interaction** claiming E at the same spot.
4. It never registered (pack ordering, or a guard that silently returns).

## Fix direction (details in task 125)

Reproduce first with `tools/act.mjs` at the conservatory doors — walk up, press E,
screenshot the result, and Read the PNG. Then make the beat unmistakable: the E
prompt visible on approach, and pressing it delivering something you can *see*
inside the glass — warm interior glow, palm silhouettes reading through the door,
a framed look at the palm house interior — not just a line of text. 122 deliberately
built no walkable interior; this stays a look-in, not a room.
