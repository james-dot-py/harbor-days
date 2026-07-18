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
