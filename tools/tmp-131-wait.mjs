// tmp (131): foreground waiter for a FILE to exist (tmp-wait.mjs waits on
// subagent transcripts; this waits on any path — e.g. a walkthrough run's
// report.json). Polls every 10 s; exits 0 when every arg exists, exits 3 on
// the internal 9.5-min budget (caller just re-runs it — Bash timeout is 10 min).
import { existsSync } from 'fs';

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node tools/tmp-131-wait.mjs <files>'); process.exit(2); }
const t0 = Date.now();
for (;;) {
  const missing = files.filter(f => !existsSync(f));
  if (!missing.length) { console.log('ALL PRESENT'); process.exit(0); }
  if (Date.now() - t0 > 9.5 * 60 * 1000) { missing.forEach(f => console.log('WAITING ' + f)); process.exit(3); }
  await new Promise(r => setTimeout(r, 10000));
}
