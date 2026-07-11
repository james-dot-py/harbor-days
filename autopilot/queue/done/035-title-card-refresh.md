---
id: 035
area: shell
type: feedback
model: fable
title: Title card refresh — the storefront catches up to the game
acceptance: >
  Owner (2026-07-10): "update the homepage and make it more beautiful now
  that the game is more built-out. put support development under the let's
  walk sign, new subtitle, location isn't just belmont harbor anymore."
  The card still says v0.9-era things: sub 'a north side stroll — the
  rocks, the harbor, the skyline', tiny 'v0.9 · the place itself · belmont
  harbor, chicago' (index.html ~L188-193) — written before Wrigleyville,
  the ridable Red Line, the AIDS Garden entrance, and the live site
  existed. (1) CONTENT: new subtitle that owns the grown scope (the
  harbor, the rocks, Wrigleyville, riding the L — in the game's lowercase
  cozy register, not a feature list); the location line drops 'belmont
  harbor' for the north-side framing (match the <title> 'Ope! — north
  side, chicago'); the version string must not lie — refresh it
  meaningfully or drop it; keep the 'by Jimbo' byline subordinate under
  the title (024's movie-poster rule); Ko-fi 'Support development ♥' sits
  DIRECTLY under the 'let's walk' button (it's already adjacent in the
  DOM — make the visual hierarchy read that way in the new design), own
  tab, never part of the start gesture. (2) BEAUTY (Fable's judgment —
  this is the game's first impression and the owner asked for beautiful):
  the current card is a cream pill on a flat peach gradient with two CSS
  clouds. Options to weigh, not mandates: let the LIVE WORLD show through
  behind a translucent/vignetted card (the camera swoop already runs —
  the game is now its own best poster; check perf on phone), richer card
  art in the game's own palette, a quiet Chicago motif (four-star flag
  nod, L silhouette, the Chevron) — tasteful and few, the cozy
  letter-bob charm stays, no clipart noise. (3) DO NOT BREAK: the start
  tap→initAudio synchronous gesture chain (014's fix — no await/rAF
  between tap and audio init; re-verify with act.mjs --strict-autoplay +
  the audiodbg probe); index.html stays logic-free (wiring in main.js);
  ?dbg / ?audiodbg HUDs untouched. (4) VERIFY: title-screen shots (NO
  play=1) at 390px AND 1280px, READ them; desktop + touch start flows
  both work end-to-end; kofi href unchanged
  (https://ko-fi.com/jimbobuildsope); spawn baseline.png untouched;
  single-file build passes.
refs:
  - index.html (card markup ~L186-193, title/card styles ~L14-50)
  - autopilot/queue/done/024-feedback-title-author-credit.md (byline + two-viewport test precedent)
  - autopilot/queue/done/011-kofi-support.md (Ko-fi placement rules — never in the start gesture)
  - src/main.js (runStart gesture chain — the 014 audio contract)
---

The game outgrew its front door: two neighborhoods, a ridable train, a
public URL, and the card still greets players with last week's scope. The
strongest single beautification candidate is honesty — the world itself
visible behind the card, because the game finally looks like something
worth showing off. But judge it on the phone first; a cream card on a
cheap gradient that loads instantly beats a gorgeous card over a stuttering
swoop. Whatever the design, the hierarchy is: Ope! → by Jimbo → what this
is → let's walk → support it.
