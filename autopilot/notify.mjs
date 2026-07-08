// notify.mjs — ntfy.sh poster (AUTOPILOT.md §1c, §7).
// CLI:  node autopilot/notify.mjs "<title>" "<message>" [--priority default|high]
// Lib:  import { notify } from './notify.mjs'; await notify(title, message, {priority})
//
// Reads NTFY_TOPIC from autopilot/.env (KEY=VALUE lines). If it is missing/empty we
// print a one-line warning and return cleanly — a run must never crash over
// notification config. Network errors are likewise swallowed with a warning.
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
// AUTOPILOT_ENV_FILE lets tests point at an alternate .env without touching the real
// one; defaults to autopilot/.env.
const ENV_FILE = process.env.AUTOPILOT_ENV_FILE || join(HERE, '.env');

function readEnv() {
  const env = {};
  let text;
  try { text = readFileSync(ENV_FILE, 'utf8'); } catch { return env; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
  }
  return env;
}

export async function notify(title, message, opts = {}) {
  const topic = (readEnv().NTFY_TOPIC || '').trim();
  if (!topic) {
    console.warn('[notify] NTFY_TOPIC not set in ' + ENV_FILE + ' — skipping notification: ' + title);
    return { skipped: true };
  }
  const priority = opts.priority || 'default';
  try {
    // JSON publish endpoint: fetch() headers must be ISO-8859-1, so a Title
    // header with an em-dash throws — the JSON body is fully UTF-8-safe.
    const res = await fetch('https://ntfy.sh/', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        title: String(title ?? '').replace(/[\r\n]+/g, ' '),
        message: String(message ?? ''),
        priority: priority === 'high' ? 4 : 3,
      }),
    });
    if (!res.ok) { console.warn('[notify] ntfy responded ' + res.status); return { ok: false, status: res.status }; }
    return { ok: true };
  } catch (e) {
    console.warn('[notify] post failed: ' + e.message);
    return { ok: false, error: e.message };
  }
}

// ---- CLI ------------------------------------------------------------------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  let priority = 'default';
  const pi = args.indexOf('--priority');
  if (pi >= 0) { priority = args[pi + 1] || 'default'; args.splice(pi, 2); }
  const [title, message] = args;
  if (!title) { console.error('usage: node autopilot/notify.mjs "<title>" "<message>" [--priority default|high]'); process.exit(0); }
  await notify(title, message || '', { priority });
  process.exit(0);
}
