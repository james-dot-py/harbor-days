# 027 — Shop kiosk sign flashes in and out

- area: shops (080 catalog — owner did not name which kiosk; check ALL shop
  signs, beach kiosk first)
- severity: MEDIUM (live on playope.com; reads as broken, owner-reported)
- found: 2026-07-17, owner playtest (verbal report, no screenshot/coords)
- observed: the sign on a kiosk shop "flashes in and out" while playing.
- likely root cause: z-fighting between coplanar sign planes (text mesh vs
  backing board at the same depth), or a small mesh popping at the frustum
  cull boundary. The 032/036 sign sweeps dealt with mirrored backs and
  post-occlusion — this is a different failure (temporal flicker).
- expected: every shop sign is rock-solid stable from all player-reachable
  angles and distances.
- fix routed to: task 088 visual-truth pass (adds judged waypoints per shop
  sign, then root-causes: separate depths / polygonOffset / renderOrder).

## RESOLVED — task 088 (2026-07-17)

Root cause confirmed by code + geometry: the beach kiosk's menu board plane sat
EXACTLY coplanar with its apron backing (both at cz+0.885, 0 mm gap) — a
camera-angle-dependent z-fight that reads as "flashes in and out" while moving.
A full sweep of EVERY canvas sign in src/packs found and fixed 5 offenders
(geometry offsets only, no rng):
- kiosk 'SNACKS · TOYS · KITES' — 0 mm -> 15 mm proud (the owner's report)
- lolla 'MERCH' — backing box dims TRANSPOSED: a 2.5 m dark blade poked through
  and past the banner face ("MER▮H", 088-sign-merch-before.png) -> parallel
  backing, 30 mm gap (after shot reads a clean MERCH)
- museum cart 'COFFEE · SOUVENIRS' — 10 -> 15 mm
- Park Bait 'LIVE BAIT' cooler placard — 2 mm -> 15 mm (audit find)
- suggestion box 'WHERE NEXT?' label — ~3 mm -> ~22 mm (audit find)
CLEAN: sluggers menu board (110 mm), parkcharm entrance signs, wrigley-sluggers
cage board, crown faces, kofi QR, npcs cart, PEQUOD'S lid, free-air signs.
Report-only: three structures.js name-sign frames at 10 mm (render clean; noted
for a future pass). The docent NPC that stood 0.6 m in front of the museum
cart's sign was moved off its normal (061/080 NPC-blocks-the-read law).
Permanent judgment: new waypoints shop-kiosk / shop-sluggers / mp-museum-cart /
mp-lolla-merch frame every 080 shop sign close enough to READ (verified legible
+ stable from near/oblique/far in runs mrpuv30z + mrpv4xe6); PITFALLS carries
the new depth clause (sign 0.012-0.03 m proud of its backing).
