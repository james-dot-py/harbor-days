# Millennium Park — owner-supplied references (2026-07-11 playtest)

Owner's own material — gold tier, overrides Commons where they conflict.

| file | what it is / how to use |
|---|---|
| owner-aerial-use-this.jpg | Aerial of the park — owner: "really good aerial — USE THIS FOR SURE." Layout truth for the rink, lawn, paths. (Owner-supplied aerial, not map-tile imagery.) |
| owner-mccormick-ice-skating.jpg | The McCormick Tribune Ice Rink in use — boards, ice sheet, skaters, Michigan Ave streetwall behind. The rink read for task 049. |
| owner-skating-ribbon-northeast.webp | The OTHER rink northeast of the main one — the Maggie Daley Skating Ribbon. 049 shipped the main rink + glide and deliberately did NOT half-ship this; now owned by queue task 059 (maggie-daley-skating-ribbon, in the owner's Grant-expansion pipeline 057-062). |
| owner-wrigley-square-night.webp | Wrigley Square + Millennium Monument peristyle at dusk — semicircular colonnade with PURPLE uplighting, warm base wash, fountain jet, lawn apron, lit towers behind. Owner: "the real wrigley square with correct lighting — build this too." Target coords (85.4, 734.5). Task 050. |
| owner-issue-025-stuck-lolla-arch.png | Mayor pinched/stuck at the maroon Lollapalooza arch pillar (crowd zone by the LOLLAPALOOZA stage). Owner playtest issue 025 — RESOLVED by task 065 (arch de-pinched, connectivity sweep, anti-trap engine rule). Filed from refs/inbox by task 063; source: owner. |

Owner punch-list coords from the same playtest (routed to 048 + issue 017):
jetski-fallback holes (168.0, 866.0) + stage fall-through (144.7, 758.0) +
"quite a few places" · invisible bench at the rill (155.8, 864.7) · bridge
stair rectangles not following the serpentine (188.5, 798.0) · Great Lawn
people not real at (138.4, 824.2).

**ALL RESOLVED (task 048, verified again at the 053 sign-off):** the jetski
class-guard (isWater false in any hard cell) + 2 m grid sweep closed the
fall-throughs (issue 017); the rill got a real wood edge bench; the BP treads
now sweep a CatmullRom curve (no jacknife — confirmed in run-mrh2bc0r
mp-bp-bridge-crest); the lawn crowd is posed real-chibi rigs (bump + "ope").
This list is HISTORY, not live bugs — a fresh-eyes reviewer mistook it for
open work at the 053 evocation review.
