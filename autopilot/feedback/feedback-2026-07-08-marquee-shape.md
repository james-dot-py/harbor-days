---
from: owner
date: 2026-07-08T23:45:00Z
---

The Wrigley marquee must read like the real sign — reference photo filed at
refs/wrigley-field/marquee-owner-reference.png (source: owner; READ it before
building). Specific deltas vs the current build:

1. ARCHED CROWN: the top edge is a gentle camber, not a straight rectangle,
   and "WRIGLEY FIELD" is set ALONG the arc (letters follow the curve).
2. Hierarchy: "HOME OF" small centered; "CHICAGO CUBS" large beneath it.
3. ART-DECO SIDE SCROLLS: the little stepped volutes/curls on both shoulders
   where the crown meets the body.
4. WHITE PINSTRIPE TRIM: thin white border lines framing the red face
   (double line along the bottom edge).
5. MESSAGE BOARD: black rounded-corner field with DOT-MATRIX style lettering
   (draw the glyphs as dot grids on the canvas texture, like the real
   incandescent board) — keep the live message-line functionality
   (GAME IN PROGRESS / CUBS WIN! etc.), just render it dot-matrix.

Keep the house toon style — chunky, readable at follow-cam distance — but a
Chicagoan should see THIS sign. Canvas-texture signage rules apply
(measureText shrink-to-fit; arc text can be per-glyph rotation along a path).
