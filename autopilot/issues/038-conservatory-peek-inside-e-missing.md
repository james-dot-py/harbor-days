# Issue 038 — pressing E at the conservatory does not let you peek inside

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
