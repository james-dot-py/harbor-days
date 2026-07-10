// visitors-digest.mjs — daily "how many walked the north side" ntfy digest.
// Scheduled via Windows Task Scheduler (task: Ope-visitors-digest, 8:00 daily):
//   node autopilot/visitors-digest.mjs
// Reads GOATCOUNTER_TOKEN from autopilot/.env (KEY=VALUE, gitignored — the repo
// is PUBLIC, the token must never be committed). Until the token exists this
// script warns and exits 0 — armed but inert, same contract as notify.mjs.
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { notify } from './notify.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
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

const token = (readEnv().GOATCOUNTER_TOKEN || '').trim();
if (!token) { console.warn('[digest] GOATCOUNTER_TOKEN not set in ' + ENV_FILE + ' — skipping (add the read-only API token to arm the daily digest).'); process.exit(0); }

// Yesterday, Chicago wall time.
const chi = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
chi.setDate(chi.getDate() - 1);
const pad = n => String(n).padStart(2, '0');
const day = chi.getFullYear() + '-' + pad(chi.getMonth() + 1) + '-' + pad(chi.getDate());

const res = await fetch('https://playope.goatcounter.com/api/v0/stats/hits?start=' + day + '&end=' + day, {
  headers: { Authorization: 'Bearer ' + token },
});
if (!res.ok) {
  const t = (await res.text()).slice(0, 200);
  console.error('[digest] GoatCounter API ' + res.status + ': ' + t);
  await notify('Ope! visitor digest failed', 'GoatCounter API ' + res.status + ' — check GOATCOUNTER_TOKEN in autopilot/.env', { priority: 'default' });
  process.exit(1);
}
const data = await res.json();
const hits = Array.isArray(data.hits) ? data.hits : [];
const sum = f => hits.filter(f).reduce((s, h) => s + (h.count ?? h.count_unique ?? 0), 0);
const visits = sum(h => !h.event);
const plays = sum(h => h.event && String(h.path).replace(/^\//, '') === 'lets-walk');

const nice = chi.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
await notify(
  'Ope! ' + nice + ': ' + visits + ' visitor' + (visits === 1 ? '' : 's'),
  plays + " pressed let's walk · details: playope.goatcounter.com",
  { priority: 'default' }
);
console.log('[digest] sent ' + day + ' visits=' + visits + ' lets-walk=' + plays);
