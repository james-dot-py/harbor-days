Run the full Harbor Days verification suite and report results compactly:

1. `node tools/walkprobe.mjs` — all categories must pass; if any fail, show the failing lines and diagnose before anything else.
2. `npm run build` — must produce the single-file dist/index.html; report size + gzip.
3. `node tools/shot.mjs verify-spawn "play=1" 3000` — READ the PNG; confirm the spawn view renders with no console errors and the foreground props look sane.
4. If $ARGUMENTS names a zone (rocks, harbor, cove, golf, corner, garden, tip), also screenshot that zone at a sensible camera and READ it.

Report: pass/fail per step, build size, and anything that looks off in the screenshots. Do not fix anything without saying what you found first.
