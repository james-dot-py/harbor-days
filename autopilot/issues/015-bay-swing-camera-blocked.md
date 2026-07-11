# 015 — can't see where you're hitting inside the Topgolf bay

- severity: medium-high (the bay session is task 028's marquee activity and
  its payoff — watching your ball fly — is invisible)
- evidence: owner playtest report, 2026-07-10 ("You can't see where you're
  hitting when you're inside the top golf cage").
- observed: the swing aims along camForward() (src/packs/diversey.js ~L123),
  and no camera treatment exists for the enclosed bay — the chase camera
  ends up behind/inside the bay shell, so the player sees wall/roof instead
  of the range. Since camForward IS the aim, a blocked camera breaks both
  the view and the shot.
- expected: a swing-session camera mode while a bucket is active — framed
  over the shoulder inside the bay opening, locked downrange (north) with a
  little aim freedom, full arc + landing visible, control returned when the
  bucket ends or the player leaves the bay.
- route: task 037.
