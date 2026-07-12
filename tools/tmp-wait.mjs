// tmp-wait.mjs — foreground waiter for parallel subagent transcripts.
// Usage: node tools/tmp-wait.mjs <file1> [file2 ...]
// Polls every 10 s; a file is DONE when it contains '"type":"result"'.
// Prints progress; exits 0 when all done, exits 3 on internal 9.5-min budget
// (caller just re-runs it — Bash tool timeout is 10 min).
import { readFileSync, existsSync, statSync } from 'fs';

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node tools/tmp-wait.mjs <transcript files>'); process.exit(2); }
const t0 = Date.now();
const done = new Set();
const check = f => {
  try { return readFileSync(f, 'utf8').includes('"type":"result"'); } catch { return false; }
};
for (;;) {
  for (const f of files) if (!done.has(f) && check(f)) { done.add(f); console.log('DONE ' + f); }
  if (done.size === files.length) { console.log('ALL DONE'); process.exit(0); }
  if (Date.now() - t0 > 9.5 * 60 * 1000) {
    for (const f of files) if (!done.has(f)) {
      let sz = '?'; try { sz = statSync(f).size; } catch {}
      console.log('WAITING ' + f + ' (bytes ' + sz + ')');
    }
    process.exit(3);
  }
  await new Promise(r => setTimeout(r, 10000));
}
