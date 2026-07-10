# 010 — Topgolf bay steps lead nowhere; driving range not playable

- severity: medium-high (a destination that promises play — stairs to a blank
  wall is a broken promise, right in the Diversey corner approach)
- evidence: refs/diversey-golf/owner-issue-010-topgolf-steps.png (owner,
  2026-07-09: "top golf steps lead nowhere and you should be able to play")
- observed: a 2-step stub stair abuts the two-tier bay building's south wall
  (structures.js ~L652-739, built from chicago.js DIVERSEY.bays) and
  dead-ends; there is no walkable bay deck, no entry, and no hitting
  activity anywhere on the range — the whole complex is scenery.
- expected: enterable ground-tier bays via a real stair + enclosed elevated
  walk rects (sanctuary-deck walkability precedent); a chargeThrow-style
  range session from a bay hitting north downrange; the upper tier either
  honestly reachable or visually gated — never a dead stair.
- route: task 028, part A.
