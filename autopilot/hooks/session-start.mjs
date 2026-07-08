// session-start.mjs — SessionStart hook (AUTOPILOT.md §6.2 item 5).
// Rewrites autopilot/session-state.json to a fresh ledger with the session start
// timestamp. The gate (Stop) reads this to scope "created since t0" checks, and the
// ledger (PostToolUse) appends reads/shots/lastCodeEdit into it.
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url)); // autopilot/hooks
const STATE = join(HERE, '..', 'session-state.json'); // autopilot/session-state.json

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk; // drained but not required
  const state = { sessionStart: new Date().toISOString(), reads: [], shots: [], lastCodeEdit: null };
  writeFileSync(STATE, JSON.stringify(state, null, 2));
  process.exit(0);
}

main().catch(() => process.exit(0));
