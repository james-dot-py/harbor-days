// gui.mjs — the Ope! autopilot control panel (zero dependencies).
//   node autopilot/gui.mjs [--port 4599] [--no-open]
// Serves a local page (127.0.0.1 only) with Start / Pause, an Ope!-styled ops
// dashboard (stat tiles, greens/sessions/governor charts drawn as inline SVG,
// a scrollable task checklist), the loop's milestone feed, a live "working on"
// activity digest, queue state, and a feedback box. Feedback lands in
// autopilot/feedback/ as timestamped .md notes; every iteration session reads
// them at task start (iteration.md step 2) and the planner reads them before
// site selection. Pause = the STOP sentinel: graceful, honored BETWEEN
// iterations — the current task always finishes (or fails honestly) first.
import http from 'http';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, unlinkSync, openSync, readSync, closeSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const STOP = join(ROOT, 'STOP');
const QUEUE = join(HERE, 'queue');
const LOGS = join(HERE, 'logs');
const FEEDBACK = join(HERE, 'feedback');
const PROCESSED = join(FEEDBACK, 'processed');
const PIDFILE = join(LOGS, 'run.pid');
const ISSUES = join(HERE, 'issues');
const GOVFILE = join(HERE, 'usage-governor.json');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
let PORT = +arg('port', 4599);
const NO_OPEN = process.argv.includes('--no-open');

const MILESTONE = /"event":"(spawn|green|failed|parked|halt|stop-sentinel|planner|limit-sleep-begin|limit-sleep-end|turns-topup|bookkeeping|loop-start|loop-end|loop-crash|session-done|dry-run)"/;

function ntfyTopic() { try { const m = readFileSync(join(HERE, '.env'), 'utf8').match(/^NTFY_TOPIC=(.+)$/m); return m ? m[1].trim() : ''; } catch { return ''; } }
function pidAlive() { try { const pid = +readFileSync(PIDFILE, 'utf8').trim(); if (!pid) return 0; process.kill(pid, 0); return pid; } catch { return 0; } }
function latestRunLog() { try { return readdirSync(LOGS).filter(f => /^run-\d+\.jsonl$/.test(f)).map(f => join(LOGS, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] || null; } catch { return null; } }
function events() {
  const f = latestRunLog(); if (!f) return [];
  try {
    return readFileSync(f, 'utf8').trim().split('\n').filter(l => MILESTONE.test(l))
      .slice(-30).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean).reverse();
  } catch { return []; }
}
function mdList(dir) { try { return readdirSync(dir).filter(f => f.endsWith('.md')).sort(); } catch { return []; } }

/* ---- deep activity feed: tail the live session stream ------------------
   run.mjs persists every raw stream line to logs/session-*.jsonl. Parse the
   tail of the newest one into a human digest — what the session is actually
   doing right now (narration + tool calls), one level deeper than the
   milestone feed. Display-only; ntfy stays milestone-only. */
function latestSessionLog() {
  try {
    return readdirSync(LOGS).filter(f => /^session-.*\.jsonl$/.test(f))
      .map(f => join(LOGS, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] || null;
  } catch { return null; }
}
function tailText(file, bytes = 65536) {
  try {
    const size = statSync(file).size;
    const start = Math.max(0, size - bytes);
    const fd = openSync(file, 'r');
    const buf = Buffer.alloc(size - start);
    readSync(fd, buf, 0, buf.length, start);
    closeSync(fd);
    const s = buf.toString('utf8');
    return start > 0 ? s.slice(s.indexOf('\n') + 1) : s;   // drop partial first line
  } catch { return ''; }
}
const short = (s, n = 150) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
function activity() {
  const f = latestSessionLog();
  if (!f) return { live: false, items: [] };
  const fresh = (Date.now() - statSync(f).mtimeMs) < 180000;
  const items = [];
  for (const line of tailText(f).split('\n')) {
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    const c = ev.message && ev.message.content;
    if (ev.type !== 'assistant' || !Array.isArray(c)) continue;
    for (const b of c) {
      if (b.type === 'text' && b.text && b.text.trim()) items.push({ kind: 'say', text: short(b.text) });
      else if (b.type === 'tool_use') {
        const i = b.input || {};
        const detail = i.description || (i.file_path && i.file_path.split(/[\\/]/).pop()) || (i.command && short(i.command, 90)) || (i.pattern) || (i.prompt && short(i.prompt, 90)) || '';
        items.push({ kind: 'tool', text: b.name + (detail ? ' · ' + detail : '') });
      }
    }
  }
  return { live: fresh, items: items.slice(-14).reverse() };
}

/* ---- run-log aggregates (all history, cheap) ---------------------------
   Charts need per-day green counts and, for today, one strip per build
   session (spawn -> session-done). Run logs are append-only, so a day's file
   never changes once the loop rolls to the next date — parse each file at most
   once and cache the result keyed by mtime+size, so only the *active* file is
   ever re-read on a poll. We pre-filter lines by a cheap regex before JSON.parse
   so the bulk "stream" events (150k+ of them) are skipped entirely. */
const RUN_EVENT = /"event":"(spawn|session-done|green|governor-pause)"/;
const runCache = new Map();      // path -> { key, agg }
const titleCache = new Map();    // path -> { mtimeMs, idStr, title, base }
const issueCache = new Map();    // path -> { mtimeMs, resolved }

function parseRunFile(path) {
  let text; try { text = readFileSync(path, 'utf8'); } catch { return null; }
  const m = path.match(/run-(\d{4})(\d{2})(\d{2})\.jsonl$/);
  const date = m ? (m[1] + '-' + m[2] + '-' + m[3]) : '';
  const label = m ? (+m[2] + '/' + +m[3]) : date;
  let greens = 0, lastPause = null, pending = null;
  const sessions = [];
  for (const line of text.split('\n')) {
    if (!RUN_EVENT.test(line)) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.event === 'green') greens++;
    else if (e.event === 'governor-pause') lastPause = e;
    else if (e.event === 'spawn') {
      const id = (e.msg && e.msg.match(/^(\d+)/) || [])[1] || '?';
      const model = (e.msg && e.msg.match(/model=claude-([a-z0-9]+)/) || [])[1] || 'model';
      pending = { id, model, start: e.t };
    } else if (e.event === 'session-done' && pending) {
      const code = +((e.msg && e.msg.match(/code=(\d+)/) || [])[1] || 1);
      sessions.push({ id: pending.id, model: pending.model, start: pending.start,
        mins: Math.max(0, (Date.parse(e.t) - Date.parse(pending.start)) / 60000), ok: code === 0, running: false });
      pending = null;
    }
  }
  if (pending) sessions.push({ id: pending.id, model: pending.model, start: pending.start, mins: null, ok: null, running: true });
  return { date, label, greens, sessions, lastPause };
}
function aggForFile(path) {
  let st; try { st = statSync(path); } catch { return null; }
  const key = st.mtimeMs + ':' + st.size;
  const hit = runCache.get(path);
  if (hit && hit.key === key) return hit.agg;
  const agg = parseRunFile(path);
  runCache.set(path, { key, agg });
  return agg;
}
function runAggregates() {
  let files;
  try { files = readdirSync(LOGS).filter(f => /^run-\d+\.jsonl$/.test(f)).sort(); } catch { return { days: [], latest: null, totalGreens: 0 }; }
  const days = [];
  let latest = null;
  for (const f of files) {
    const agg = aggForFile(join(LOGS, f));
    if (!agg) continue;
    days.push({ date: agg.date, label: agg.label, greens: agg.greens });
    latest = agg;   // files sorted ascending by name (== chronological) -> last is newest
  }
  return { days, latest, totalGreens: days.reduce((s, d) => s + d.greens, 0) };
}
function napUntil(lastPause) {
  if (!lastPause || !lastPause.msg) return null;
  const m = lastPause.msg.match(/sleeping until (\S+)/);
  if (!m) return null;
  const until = Date.parse(m[1]);
  return (until && until > Date.now()) ? m[1] : null;
}
function governor() {
  try {
    const g = JSON.parse(readFileSync(GOVFILE, 'utf8'));
    return { weighted: g.windowWeighted || 0, cap: g.calibratedCap || 0, reservePct: g.reservePct || 0 };
  } catch { return null; }
}
function taskMeta(path) {
  try {
    const st = statSync(path);
    const hit = titleCache.get(path);
    if (hit && hit.mtimeMs === st.mtimeMs) return hit;
    const txt = readFileSync(path, 'utf8');
    const title = ((txt.match(/^title:\s*(.+?)\s*$/m) || [])[1] || '').trim();
    const base = path.split(/[\\/]/).pop();
    const idStr = (base.match(/^(\d+)/) || [])[1] || '';
    const meta = { mtimeMs: st.mtimeMs, idStr, title, base };
    titleCache.set(path, meta);
    return meta;
  } catch { return { idStr: '', title: '', base: '' }; }
}
function checklist(currentId) {
  const list = [];
  const collect = (dir, status) => {
    for (const f of mdList(dir)) {
      const m = taskMeta(join(dir, f));
      list.push({ id: +m.idStr || 0, idStr: m.idStr, title: m.title || m.base.replace(/\.md$/, ''), status });
    }
  };
  collect(join(QUEUE, 'done'), 'done');
  collect(QUEUE, 'queued');
  if (currentId) for (const it of list) if (it.idStr === currentId && it.status === 'queued') it.status = 'inflight';
  list.sort((a, b) => a.id - b.id);
  const parked = [];
  for (const f of mdList(join(QUEUE, 'parked'))) {
    const m = taskMeta(join(QUEUE, 'parked', f));
    parked.push({ id: +m.idStr || 0, idStr: m.idStr, title: m.title || m.base.replace(/\.md$/, '') });
  }
  parked.sort((a, b) => a.id - b.id);
  return { list, parked };
}
function openIssues() {
  let n = 0;
  for (const f of mdList(ISSUES)) {
    const p = join(ISSUES, f);
    try {
      const st = statSync(p);
      const hit = issueCache.get(p);
      let resolved;
      if (hit && hit.mtimeMs === st.mtimeMs) resolved = hit.resolved;
      else { resolved = /RESOLVED/.test(readFileSync(p, 'utf8')); issueCache.set(p, { mtimeMs: st.mtimeMs, resolved }); }
      if (!resolved) n++;
    } catch { }
  }
  return n;
}

function state() {
  const pid = pidAlive(), stop = existsSync(STOP);
  const ev = events();
  const f = latestRunLog();
  const logFresh = f && (Date.now() - statSync(f).mtimeMs) < 150000;
  const lastSpawn = ev.find(e => e.event === 'spawn');
  const lastTerminal = ev.find(e => ['green', 'failed', 'parked', 'halt', 'loop-end', 'stop-sentinel', 'loop-crash'].includes(e.event));
  const midTask = lastSpawn && (!lastTerminal || Date.parse(lastTerminal.t) < Date.parse(lastSpawn.t));
  const running = pid ? true : (logFresh && midTask);   // external terminal runs have no pidfile
  const currentId = running && midTask ? ((lastSpawn.msg.match(/^(\d+)/) || [])[1] || null) : null;

  const agg = runAggregates();
  const nap = napUntil(agg.latest && agg.latest.lastPause);
  const cl = checklist(currentId);
  const inflight = cl.list.find(i => i.status === 'inflight');
  const pending = mdList(QUEUE);

  return {
    status: running ? (stop ? 'pausing' : 'running') : (stop ? 'paused' : 'idle'),
    external: running && !pid,
    crashed: !running && !stop && ev.length > 0 && ['loop-crash', 'halt'].includes(ev[0].event),
    currentTask: running && midTask ? lastSpawn.msg : null,
    napUntil: nap,
    stopPresent: stop,
    stats: {
      greensToday: agg.latest ? agg.latest.greens : 0,
      totalGreens: agg.totalGreens,
      queueDepth: pending.length,
      parked: cl.parked.length,
      openIssues: openIssues(),
      currentId,
      currentTitle: inflight ? inflight.title : null,
    },
    greensPerDay: agg.days,
    todaySessions: agg.latest ? { date: agg.latest.date, sessions: agg.latest.sessions.slice(-60) } : { date: '', sessions: [] },
    governor: governor(),
    checklist: cl.list,
    parkedTasks: cl.parked,
    queue: { pending, done: mdList(join(QUEUE, 'done')), parked: mdList(join(QUEUE, 'parked')) },
    feedback: { pending: mdList(FEEDBACK).length, processed: mdList(PROCESSED).length },
    events: ev,
    activity: activity(),
    ntfyTopic: ntfyTopic(),
  };
}

function startLoop(dry) {
  const pid = pidAlive();
  if (pid) {
    if (existsSync(STOP)) { try { unlinkSync(STOP); } catch { } return { ok: true, msg: 'resumed — STOP removed, loop continues after the current task' }; }
    return { ok: false, msg: 'already running (pid ' + pid + ')' };
  }
  try { unlinkSync(STOP); } catch { }
  mkdirSync(LOGS, { recursive: true });
  const out = openSync(join(LOGS, 'gui-run.out'), 'a');
  const child = spawn(process.execPath, [join(HERE, 'run.mjs'), ...(dry ? ['--dry-run'] : [])], { cwd: ROOT, detached: true, stdio: ['ignore', out, out] });
  writeFileSync(PIDFILE, String(child.pid));
  child.unref();
  return { ok: true, msg: 'loop started (pid ' + child.pid + ')' + (dry ? ' [dry-run]' : '') };
}

function pauseLoop() {
  writeFileSync(STOP, 'created by gui ' + new Date().toISOString() + '\n');
  return { ok: true, msg: pidAlive() ? 'STOP set — pauses after the current task finishes' : 'STOP set — loop will not start until resumed' };
}

function saveFeedback(text) {
  text = String(text || '').trim().slice(0, 20000);
  if (!text) return { ok: false, msg: 'empty feedback' };
  mkdirSync(PROCESSED, { recursive: true });
  const name = 'feedback-' + new Date().toISOString().replace(/[:.]/g, '-') + '.md';
  writeFileSync(join(FEEDBACK, name), '---\nfrom: owner\ndate: ' + new Date().toISOString() + '\n---\n\n' + text + '\n');
  return { ok: true, msg: 'saved ' + name + ' — the next task start picks it up' };
}

/* ---- visitors card: GoatCounter (armed but inert until GOATCOUNTER_TOKEN) ---
   Read the token from .env on every request (cheap, like ntfyTopic) so arming
   needs NO restart. One in-memory cache (TTL 5 min, last good data kept on
   failure) so the external API is only hit on the 5-min cache cycle, never on
   the 2.5s /state poll. All parsing is defensive — a fetch failure must never
   crash the panel or leak the token. */
function goatcounterToken() { try { const m = readFileSync(join(HERE, '.env'), 'utf8').match(/^GOATCOUNTER_TOKEN=(.+)$/m); return m ? m[1].trim() : ''; } catch { return ''; } }

function last14Chicago() {
  // last 14 days inclusive of today, in America/Chicago wall time (digest trick)
  const pad = n => String(n).padStart(2, '0');
  const chiNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(chiNow);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      label: (d.getMonth() + 1) + '/' + d.getDate(),
      visits: 0, plays: 0,
    });
  }
  return days;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchVisitors(token, days) {
  const headers = { Authorization: 'Bearer ' + token };
  const oldest = days[0].date, today = days[days.length - 1].date;
  const byDate = {}; for (const d of days) byDate[d.date] = d;
  let res;
  try { res = await fetch('https://playope.goatcounter.com/api/v0/stats/hits?start=' + oldest + '&end=' + today + '&limit=100', { headers }); }
  catch { return { error: 'GoatCounter fetch failed', days }; }
  if (!res.ok) return { error: 'GoatCounter API ' + res.status, days };       // never leak token/body
  let data; try { data = await res.json(); } catch { return { error: 'GoatCounter API bad response', days }; }
  const hits = Array.isArray(data.hits) ? data.hits : [];
  const isPlay = h => h && h.event && String(h.path || '').replace(/^\//, '') === 'lets-walk';
  // Primary: each hit carries a per-day stats array. Sum daily (fall back to hourly).
  if (hits.length && hits.some(h => Array.isArray(h.stats))) {
    for (const h of hits) {
      if (!Array.isArray(h.stats)) continue;
      const play = isPlay(h), visit = !h.event;
      if (!play && !visit) continue;
      for (const s of h.stats) {
        if (!s || !byDate[s.day]) continue;
        const n = typeof s.daily === 'number' ? s.daily
          : (Array.isArray(s.hourly) ? s.hourly.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) : 0);
        if (visit) byDate[s.day].visits += n;
        if (play) byDate[s.day].plays += n;
      }
    }
    return { error: null, days };
  }
  if (hits.length) {
    // Response has hits but no stats arrays (older API shape) — one call per day.
    for (const d of days) {
      let r; try { r = await fetch('https://playope.goatcounter.com/api/v0/stats/hits?start=' + d.date + '&end=' + d.date, { headers }); }
      catch { await sleep(100); continue; }
      if (!r.ok) { await sleep(100); continue; }
      let dd; try { dd = await r.json(); } catch { await sleep(100); continue; }
      const hh = Array.isArray(dd.hits) ? dd.hits : [];
      const sum = f => hh.filter(f).reduce((s, h) => s + (h.count ?? h.count_unique ?? 0), 0);
      d.visits = sum(h => h && !h.event);
      d.plays = sum(isPlay);
      await sleep(100);
    }
    return { error: null, days };
  }
  return { error: null, days };   // no hits in range → genuine zeros
}
let _visCache = null;   // { at:ms, data }
async function visitorsData() {
  const token = goatcounterToken();
  const days = last14Chicago();
  if (!token) return { configured: false, error: null, fetchedAt: null, days };
  const now = Date.now();
  if (_visCache && _visCache.data && (now - _visCache.at) < 300000) return _visCache.data;
  let out;
  try { out = await fetchVisitors(token, days); } catch { out = { error: 'GoatCounter fetch failed', days }; }
  if (out.error) {
    // keep last good data on failure — surface the error alongside stale days
    if (_visCache && _visCache.data && _visCache.data.days) {
      return { configured: true, error: out.error, fetchedAt: _visCache.data.fetchedAt, days: _visCache.data.days };
    }
    return { configured: true, error: out.error, fetchedAt: null, days };
  }
  const data = { configured: true, error: null, fetchedAt: new Date().toISOString(), days: out.days };
  _visCache = { at: now, data };
  return data;
}

const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%23fdf6e6'/%3E%3Ccircle cx='16' cy='16' r='7.4' fill='none' stroke='%23e0766a' stroke-width='4'/%3E%3Cpath d='M22 21 l3.2 3.2' stroke='%234fa3c7' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E";

const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ope! ops</title>
<link rel="icon" href="${FAVICON}">
<style>
  *{box-sizing:border-box}
  body{margin:0;color:#4a3b2f;min-height:100vh;
    font-family:ui-rounded,"SF Pro Rounded","Arial Rounded MT Bold","Trebuchet MS",sans-serif;
    background:radial-gradient(120% 80% at 50% -8%,#ffe9d2 0%,#ffdcb8 55%,#f6cba6 100%);background-attachment:fixed}

  /* ---- header ---- */
  header{background:#fdf6e6;border-bottom:1px solid rgba(122,62,44,.10);padding:12px 22px;
    display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;
    box-shadow:0 3px 0 rgba(122,62,44,.06);position:sticky;top:0;z-index:5}
  .brand{display:flex;align-items:center;gap:11px}
  .logo{width:34px;height:34px;border-radius:11px;background:#fff6ea;display:grid;place-items:center;font-size:19px;
    box-shadow:0 3px 0 rgba(122,62,44,.16)}
  header h1{margin:0;font-size:27px;letter-spacing:.02em;color:#4a3b2f;text-shadow:0 2px 0 #f3d9a7;font-weight:800}
  header h1 .o{color:#e0766a}header h1 .ex{color:#4fa3c7}
  header h1 .ap{font-size:15px;color:#9c8168;letter-spacing:.14em;font-weight:700;margin-left:7px;text-shadow:none}
  .controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .pill{display:inline-flex;align-items:center;gap:8px;padding:7px 15px;border-radius:999px;font-weight:800;font-size:13px;
    letter-spacing:.03em;box-shadow:0 3px 0 rgba(122,62,44,.14)}
  .pill .dot{width:10px;height:10px;border-radius:50%;flex:none}
  .pill.live{background:#dcf1ec;color:#1c7d78}
  .pill.live .dot{background:#2fa3b5;animation:pulse 1.7s infinite}
  .pill.nap{background:#fbe7cd;color:#9a6b1f}.pill.nap .dot{background:#cf8a2f}
  .pill.pausing{background:#fbe7cd;color:#9a6b1f}.pill.pausing .dot{background:#cf8a2f}
  .pill.paused{background:#f7ded6;color:#b1503f}.pill.paused .dot{background:#e0766a}
  .pill.idle{background:#efe7d8;color:#8a7561}.pill.idle .dot{background:#b39d85}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(47,163,181,.55)}70%{box-shadow:0 0 0 7px rgba(47,163,181,0)}100%{box-shadow:0 0 0 0 rgba(47,163,181,0)}}
  .btn{border:0;border-radius:999px;padding:9px 18px;font-weight:800;font-size:13px;font-family:inherit;cursor:pointer;
    letter-spacing:.03em;transition:transform .12s ease,box-shadow .12s ease}
  .btn.go{background:#5db06b;color:#fff;box-shadow:0 4px 0 #3f8a4d}
  .btn.go:hover{transform:translateY(-1px);box-shadow:0 5px 0 #3f8a4d}
  .btn.go:active{transform:translateY(3px);box-shadow:0 1px 0 #3f8a4d}
  .btn.pause{background:#ffd9b0;color:#9a6b1f;box-shadow:0 4px 0 #e0a86e}
  .btn.pause:hover{transform:translateY(-1px);box-shadow:0 5px 0 #e0a86e}
  .btn.pause:active{transform:translateY(3px);box-shadow:0 1px 0 #e0a86e}
  .btn:disabled{opacity:.4;box-shadow:none;cursor:default;transform:none}

  .page{max-width:1360px;margin:0 auto;padding:18px 22px 4px}
  .msg{font-size:11.5px;color:#8a7561;min-height:15px;margin:0 0 8px}

  /* ---- stat tiles ---- */
  .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:13px;margin-bottom:16px}
  .tile{background:#fdf6e6;border-radius:18px;padding:13px 15px;position:relative;overflow:hidden;
    box-shadow:0 4px 0 rgba(122,62,44,.12),0 8px 18px rgba(122,62,44,.08);border:1px solid rgba(122,62,44,.07)}
  .tile .num{font-size:31px;font-weight:800;color:#4a3b2f;line-height:1;letter-spacing:-.01em}
  .tile .lab{margin-top:6px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#a08a72;font-weight:800}
  .tile .ic{position:absolute;top:11px;right:13px;font-size:15px;opacity:.35}
  .tile.wide{grid-column:span 2}
  .tile.cur .num{font-size:21px}
  .tile.cur .curtitle{font-size:12px;color:#7a6a58;margin-top:5px;line-height:1.3;font-weight:600;
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .tile.alert{background:#f9e0d8;border-color:#eab5a8}.tile.alert .num{color:#c14b38}.tile.alert .lab{color:#c07a68}

  /* ---- grid + cards ---- */
  .grid{display:grid;grid-template-columns:1.25fr 1fr;gap:16px;align-items:start}
  .grid>.col{min-width:0}
  .card{background:#fdf6e6;border-radius:20px;padding:15px 17px;border:1px solid rgba(122,62,44,.07);
    box-shadow:0 4px 0 rgba(122,62,44,.12),0 12px 26px rgba(122,62,44,.09)}
  .card+.card{margin-top:16px}
  .card h2{margin:0 0 3px;font-size:14px;font-weight:800;letter-spacing:.01em;color:#4a3b2f;display:flex;align-items:center;gap:8px}
  .card .cap{margin:0 0 10px;font-size:11px;color:#a08a72}
  .capinline{font-size:11px;font-weight:600;color:#a08a72;letter-spacing:0}
  .empty{color:#b39d85;font-size:12.5px;padding:16px 4px;text-align:center}
  svg{display:block}

  /* ---- legend ---- */
  .legend{display:flex;flex-wrap:wrap;gap:12px;margin:2px 0 9px;font-size:11px;color:#7a6a58;font-weight:600}
  .legend span{display:inline-flex;align-items:center;gap:5px}
  .legend i{width:11px;height:11px;border-radius:3px;display:inline-block}

  /* ---- governor meter ---- */
  .meter{position:relative;height:16px;background:rgba(122,62,44,.11);border-radius:9px;margin:6px 0 9px}
  .meter .fill{position:absolute;left:0;top:0;bottom:0;background:#2fa3b5;border-radius:9px;min-width:6px}
  .meter .rsv{position:absolute;top:-3px;bottom:-3px;width:2px;background:#4a3b2f;border-radius:2px}
  .govnums{font-size:11.5px;color:#7a6a58;line-height:1.5}
  .govnums b{color:#4a3b2f}

  /* ---- checklist ---- */
  .parkbox{background:#f9e0d8;border:1px solid #eab5a8;border-radius:13px;padding:8px 11px;margin-bottom:11px}
  .parkbox .ph{font-size:11px;font-weight:800;color:#c14b38;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
  .clist{max-height:360px;overflow-y:auto;margin:0;padding:0 3px 0 0;list-style:none}
  .crow{display:flex;align-items:center;gap:9px;padding:5px 7px;border-radius:9px;font-size:12.5px;line-height:1.25}
  .crow .cid{font-size:10px;color:#b39d85;font-variant-numeric:tabular-nums;min-width:26px;flex:none}
  .crow .ic2{flex:none;width:14px;text-align:center}
  .crow .ct{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  .crow.done{color:#8f9a86}.crow.done .ck{color:#57a86b;font-weight:800}
  .crow.queued{color:#a2907a}.crow.queued .oo{color:#cbb79c}
  .crow.inflight{background:#ffe7cd;color:#4a3b2f;font-weight:800;box-shadow:inset 0 0 0 1.5px #ffcf9e;padding-top:7px;padding-bottom:7px}
  .crow.inflight .cdot{width:9px;height:9px;border-radius:50%;background:#2fa3b5;display:inline-block;animation:pulse2 1.4s infinite}
  .crow.parked{color:#b1503f;font-weight:600}
  @keyframes pulse2{0%{box-shadow:0 0 0 0 rgba(47,163,181,.5)}70%{box-shadow:0 0 0 6px rgba(47,163,181,0)}100%{box-shadow:0 0 0 0 rgba(47,163,181,0)}}

  /* ---- feeds ---- */
  .feed{max-height:250px;overflow-y:auto;margin:0;padding:0;list-style:none}
  .feed li{padding:6px 2px;border-bottom:1px solid rgba(122,62,44,.08);font-size:12.5px;color:#5a4b3d;
    display:flex;gap:9px;align-items:baseline}
  .feed li:last-child{border-bottom:0}
  .feed li .ago{color:#b39d85;font-size:10.5px;white-space:nowrap;min-width:50px;flex:none}
  .feed .ct2{min-width:0;overflow-wrap:anywhere}
  .feed .say{color:#5a4b3d}
  .feed .tool{font-family:ui-monospace,Consolas,monospace;font-size:11.5px;color:#2c7f8c;overflow-wrap:anywhere}
  .badge{font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.03em;flex:none;white-space:nowrap}
  .b-green,.b-deploy{background:#dcf1ec;color:#1c7d78}
  .b-failed,.b-parked,.b-loop-crash,.b-halt{background:#f7ded6;color:#b1503f}
  .b-spawn{background:#e2edf5;color:#356b86}
  .b-planner,.b-bookkeeping,.b-turns-topup,.b-limit-sleep-begin,.b-limit-sleep-end,.b-loop-start,.b-loop-end,.b-session-done,.b-stop-sentinel,.b-dry-run,.b-governor-pause{background:#efe7d8;color:#8a7561}
  .livetag{font-size:10px;font-weight:800;padding:2px 9px;border-radius:999px;letter-spacing:.05em;text-transform:uppercase}
  .livetag.on{background:#dcf1ec;color:#1c7d78}.livetag.off{background:#efe7d8;color:#a08a72}

  /* running-session strip pulse */
  .runstrip rect{animation:runpulse 1.6s ease-in-out infinite}
  @keyframes runpulse{0%,100%{opacity:.4}50%{opacity:.72}}

  /* ---- feedback ---- */
  textarea{width:100%;box-sizing:border-box;background:#fffaf0;color:#4a3b2f;border:1px solid rgba(122,62,44,.18);
    border-radius:12px;padding:10px;font:inherit;font-size:13px;min-height:74px;resize:vertical}
  textarea::placeholder{color:#c2ad93}
  .sendbtn{margin-top:9px;background:#4fa3c7;color:#fff;box-shadow:0 4px 0 #3a86a8}
  .sendbtn:hover{transform:translateY(-1px);box-shadow:0 5px 0 #3a86a8}
  .sendbtn:active{transform:translateY(3px);box-shadow:0 1px 0 #3a86a8}

  /* ---- slim scrollbars ---- */
  .clist::-webkit-scrollbar,.feed::-webkit-scrollbar{width:8px}
  .clist::-webkit-scrollbar-thumb,.feed::-webkit-scrollbar-thumb{background:rgba(122,62,44,.22);border-radius:99px}
  .clist::-webkit-scrollbar-thumb:hover,.feed::-webkit-scrollbar-thumb:hover{background:rgba(122,62,44,.34)}
  .clist::-webkit-scrollbar-track,.feed::-webkit-scrollbar-track{background:transparent}
  .clist,.feed{scrollbar-width:thin;scrollbar-color:rgba(122,62,44,.28) transparent}

  footer{max-width:1360px;margin:0 auto;padding:14px 24px 28px;font-size:11.5px;color:#a08a72}
  footer a{color:#2c7f8c;text-decoration:none;border-bottom:1px dotted #cbb79c}
  footer a:hover{color:#e0766a}

  @media(max-width:820px){
    .grid{grid-template-columns:1fr}
    .tile.wide{grid-column:span 1}
    header h1{font-size:23px}
    .page{padding:14px 14px 4px}
  }
</style></head><body>
<header>
  <div class="brand">
    <span class="logo">🪑</span>
    <h1><span class="o">O</span>pe<span class="ex">!</span><span class="ap">autopilot</span></h1>
  </div>
  <div class="controls">
    <span id="pill" class="pill idle"><span class="dot"></span>…</span>
    <button id="start" class="btn go">▶ Start</button>
    <button id="pauseBtn" class="btn pause">⏸ Pause</button>
  </div>
</header>
<div class="page">
  <div class="msg" id="ctlmsg"></div>
  <div class="tiles" id="tiles"></div>
  <div class="grid">
    <div class="col">
      <div class="card">
        <h2>🌱 Greens per day</h2>
        <p class="cap">a “green” = a task verified and shipped to main; today is outlined</p>
        <div id="greensChart"></div>
      </div>
      <div class="card">
        <h2>🚶 Visitors</h2>
        <p class="cap">visits to playope.com per day · GoatCounter</p>
        <div id="visitorsBox"></div>
      </div>
      <div class="card">
        <h2>⏱ Today’s sessions</h2>
        <p class="cap">each strip = one build session · x = time of day · width = minutes worked</p>
        <div class="legend">
          <span><i style="background:#2fa3b5"></i>fable-5</span>
          <span><i style="background:#cf8a2f"></i>opus</span>
          <span><i style="background:#c07d63"></i>failed try</span>
          <span><i style="background:#2fa3b5;opacity:.55"></i>running</span>
        </div>
        <div id="sessChart"></div>
      </div>
      <div class="card">
        <h2>🔋 Usage governor</h2>
        <p class="cap">weighted API usage vs the rolling cap · the ink marker is the reserve line</p>
        <div id="govBox"></div>
      </div>
      <div class="card">
        <h2>💬 Working on <span id="livedot" class="livetag off">idle</span></h2>
        <p class="cap">live narration &amp; tool calls from the current session</p>
        <ul class="feed" id="activityBox"></ul>
      </div>
    </div>
    <div class="col">
      <div class="card">
        <h2>✅ The checklist</h2>
        <p class="cap">done → in-flight → queued · scrolls to what’s building now</p>
        <div id="checklistBox"></div>
      </div>
      <div class="card">
        <h2>📡 Milestones <span class="capinline">(also on your ntfy phone feed)</span></h2>
        <ul class="feed" id="eventsBox"></ul>
      </div>
      <div class="card">
        <h2>✍️ Send feedback</h2>
        <p class="cap">taste calls &amp; direction — the next task start reads it</p>
        <textarea id="fb" placeholder="e.g. 'the dog beach feels empty — more dogs' or 'next: Montrose Harbor please'"></textarea>
        <button class="btn sendbtn" id="sendFb">Send to the loop</button>
        <div class="msg" id="fbmsg"></div>
        <div class="msg" id="fbcount"></div>
      </div>
    </div>
  </div>
</div>
<footer>notifications: <a id="ntfy" target="_blank" rel="noopener"></a> · visitors: <a href="https://playope.goatcounter.com" target="_blank" rel="noopener">playope.goatcounter.com</a> · pause is graceful (STOP sentinel, honored between iterations) · feedback lands in autopilot/feedback/ and is committed with the next iteration</footer>
<script>
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':'&gt;');
async function post(p,b){const r=await fetch(p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b||{})});return r.json()}
function ago(iso){if(!iso)return'';let s=(Date.now()-Date.parse(iso))/1000;if(s<0)s=0;if(s<60)return Math.round(s)+'s ago';let m=s/60;if(m<60)return Math.round(m)+'m ago';let h=m/60;if(h<24)return Math.round(h)+'h ago';return Math.round(h/24)+'d ago'}
function hm(iso){const d=new Date(iso);return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
const MODELC={fable:'#2fa3b5',opus:'#cf8a2f'};
const modelColor=m=>MODELC[m]||'#4fa3c7';
const CLAY='#c07d63';

const _last={};
function paint(id,html){const el=$(id);if(!el)return false;if(_last[id]===html)return false;_last[id]=html;el.innerHTML=html;return true}
let lastInflight=null;

function topRect(x,y,w,h,r){r=Math.min(r,w/2,h);
  return 'M'+x+' '+(y+h)+' L'+x+' '+(y+r)+' Q'+x+' '+y+' '+(x+r)+' '+y+' L'+(x+w-r)+' '+y+' Q'+(x+w)+' '+y+' '+(x+w)+' '+(y+r)+' L'+(x+w)+' '+(y+h)+' Z'}

function drawGreens(days){
  if(!days||!days.length)return '<div class="empty">no run history yet</div>';
  const W=640,H=196,pt=26,pb=24,pl=10,pr=10,plotH=H-pt-pb,base=pt+plotH;
  const max=Math.max(1,...days.map(d=>d.greens));
  const step=(W-pl-pr)/days.length,bw=Math.min(50,step*0.62);
  const p=['<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" font-family="inherit">'];
  p.push('<line x1="'+pl+'" y1="'+base+'" x2="'+(W-pr)+'" y2="'+base+'" stroke="rgba(122,62,44,.20)" stroke-width="1"/>');
  days.forEach((d,i)=>{
    const x=pl+i*step+(step-bw)/2,h=d.greens/max*plotH,y=base-h,today=i===days.length-1;
    if(h>0.6)p.push('<path d="'+topRect(x,y,bw,h,5)+'" fill="#2fa3b5"'+(today?' stroke="#4a3b2f" stroke-width="2"':'')+'><title>'+esc(d.date)+': '+d.greens+' green</title></path>');
    p.push('<text x="'+(x+bw/2)+'" y="'+(y-6)+'" text-anchor="middle" font-size="12" font-weight="700" fill="'+(d.greens?'#4a3b2f':'#c2ad93')+'">'+d.greens+'</text>');
    p.push('<text x="'+(x+bw/2)+'" y="'+(base+15)+'" text-anchor="middle" font-size="10.5" fill="#9c8168"'+(today?' font-weight="700"':'')+'>'+esc(d.label)+'</text>');
  });
  p.push('</svg>');return p.join('');
}

function fmtHour(ms){const d=new Date(ms);let h=d.getHours();const ap=h<12?'a':'p';h=h%12||12;return h+ap}
function drawSessions(sess){
  if(!sess||!sess.length)return '<div class="empty">no sessions yet today — the loop is warming up</div>';
  const now=Date.now(),rows=sess.slice(-40),hour=3600000;
  const ends=[],starts=[];
  rows.forEach(s=>{const st=Date.parse(s.start);starts.push(st);ends.push(s.running?now:st+(s.mins||0)*60000)});
  let t0=Math.min(...starts),t1=Math.max(...ends,now);
  if(t1-t0<600000)t1=t0+600000;
  const W=640,xL=38,xR=W-14,rowH=11,pitch=17,top=8,axis=24;
  const H=top+rows.length*pitch+axis;
  const X=t=>xL+(t-t0)/(t1-t0)*(xR-xL);
  const p=['<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" font-family="inherit">'];
  const span=t1-t0,stepH=Math.max(1,Math.ceil(span/hour/5));
  for(let x=Math.ceil(t0/hour)*hour;x<=t1;x+=hour*stepH){
    const px=X(x);
    p.push('<line x1="'+px+'" y1="'+top+'" x2="'+px+'" y2="'+(top+rows.length*pitch)+'" stroke="rgba(122,62,44,.10)" stroke-width="1"/>');
    p.push('<text x="'+px+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="#9c8168">'+fmtHour(x)+'</text>');
  }
  rows.forEach((s,i)=>{
    const y=top+i*pitch,st=Date.parse(s.start),x1=X(st),end=s.running?now:st+(s.mins||0)*60000,w=Math.max(4,X(end)-x1);
    const col=s.running?'#2fa3b5':(s.ok?modelColor(s.model):CLAY);
    const tip='task '+s.id+' · '+s.model+' · '+(s.running?'running now':((s.mins||0).toFixed(1)+' min · '+(s.ok?'green':'failed')));
    p.push('<g'+(s.running?' class="runstrip"':'')+'><title>'+esc(tip)+'</title>');
    p.push('<text x="6" y="'+(y+rowH-1.5)+'" font-size="10" fill="#7a6a58" font-variant-numeric="tabular-nums">'+esc(s.id)+'</text>');
    p.push('<rect x="'+x1+'" y="'+y+'" width="'+w+'" height="'+rowH+'" rx="5.5" fill="'+col+'"'+(s.running?' opacity="0.55"':'')+'/>');
    if(s.ok&&!s.running&&w>13)p.push('<text x="'+(x1+5)+'" y="'+(y+rowH-2.5)+'" font-size="8.5" fill="#fff" font-weight="700">✓</text>');
    if(!s.running&&s.mins>=6&&w>44)p.push('<text x="'+(X(end)-4)+'" y="'+(y+rowH-2.5)+'" text-anchor="end" font-size="8.5" fill="#fff">'+Math.round(s.mins)+'m</text>');
    p.push('</g>');
  });
  p.push('</svg>');return p.join('');
}

function drawVisitorsChart(days){
  if(!days||!days.length)return '<div class="empty">no visitor data yet</div>';
  const W=640,H=196,pt=26,pb=24,pl=10,pr=10,plotH=H-pt-pb,base=pt+plotH;
  const max=Math.max(1,...days.map(d=>Math.max(d.visits||0,d.plays||0)));
  const step=(W-pl-pr)/days.length,gw=Math.min(46,step*0.62),bw=gw*0.43,gap=gw-bw*2;
  const p=['<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" font-family="inherit">'];
  p.push('<line x1="'+pl+'" y1="'+base+'" x2="'+(W-pr)+'" y2="'+base+'" stroke="rgba(122,62,44,.20)" stroke-width="1"/>');
  days.forEach((d,i)=>{
    const gx=pl+i*step+(step-gw)/2,vx=gx,px=gx+bw+gap,vv=d.visits||0,pv=d.plays||0;
    const vh=vv/max*plotH,vy=base-vh,ph=pv/max*plotH,py=base-ph,today=i===days.length-1;
    if(vh>0.6)p.push('<path d="'+topRect(vx,vy,bw,vh,4)+'" fill="#4fa3c7"'+(today?' stroke="#4a3b2f" stroke-width="2"':'')+'><title>'+esc(d.date)+': '+vv+' visitor'+(vv===1?'':'s')+'</title></path>');
    if(ph>0.6)p.push('<path d="'+topRect(px,py,bw,ph,4)+'" fill="#e0766a"><title>'+esc(d.date)+": "+pv+" pressed let's walk</title></path>');
    p.push('<text x="'+(vx+bw/2)+'" y="'+(vy-6)+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+(vv?'#4a3b2f':'#c2ad93')+'">'+vv+'</text>');
    p.push('<text x="'+(gx+gw/2)+'" y="'+(base+15)+'" text-anchor="middle" font-size="10.5" fill="#9c8168"'+(today?' font-weight="700"':'')+'>'+esc(d.label)+'</text>');
  });
  p.push('</svg>');return p.join('');
}
function renderVisitors(v){
  if(!v)return '<div class="empty">loading…</div>';
  if(!v.configured)return '<div class="empty">add <b>GOATCOUNTER_TOKEN</b> to autopilot&#92;.env to light this up — create a read-only token at playope.goatcounter.com → Settings → API tokens (‘Read statistics’ permission). Same token arms the daily 8am visitor digest.</div>';
  const days=v.days||[],today=days[days.length-1]||{},yest=days[days.length-2]||{};
  const total=days.reduce((s,d)=>s+(d.visits||0),0),hasData=days.some(d=>(d.visits||0)||(d.plays||0));
  let h='';
  if(v.error)h+='<div class="empty">'+esc(v.error)+(hasData?' · showing last good data':'')+'</div>';
  h+='<div class="govnums" style="margin-bottom:8px"><b>'+(today.visits||0)+'</b> today · '+(yest.visits||0)+' yesterday · <b>'+total+'</b> visits over 14 days · <b>'+(today.plays||0)+"</b> pressed let's walk today</div>";
  h+='<div class="legend"><span><i style="background:#4fa3c7"></i>visitors</span><span><i style="background:#e0766a"></i>pressed let’s walk</span></div>';
  h+=drawVisitorsChart(days);
  return h;
}

async function refresh(){
  let s;try{s=await (await fetch('/state')).json()}catch(e){return}

  // status pill
  let cls='idle',txt='STOPPED';
  if(s.status==='running'){ if(s.napUntil){cls='nap';txt='napping until '+hm(s.napUntil)} else {cls='live';txt='LIVE'+(s.external?' · terminal':'')} }
  else if(s.status==='pausing'){cls='pausing';txt='PAUSING…'}
  else if(s.status==='paused'){cls='paused';txt='PAUSED'}
  else {cls='idle';txt=s.crashed?'STOPPED · crashed':'IDLE'}
  const pill=$('pill');pill.className='pill '+cls;pill.innerHTML='<span class="dot"></span>'+esc(txt);
  $('start').disabled=(s.status==='running');
  $('start').textContent=(s.status==='pausing'||s.status==='paused')?'▶ Resume':'▶ Start';
  $('pauseBtn').disabled=(s.status!=='running');

  // stat tiles
  const st=s.stats||{};
  const tile=(ic,num,lab,alert)=>'<div class="tile'+(alert?' alert':'')+'"><div class="ic">'+ic+'</div><div class="num">'+(num==null?'—':num)+'</div><div class="lab">'+lab+'</div></div>';
  const curNum=st.currentId?('#'+st.currentId):'idle';
  const curTitle=st.currentTitle?esc(st.currentTitle):(s.status==='running'?'working…':'nothing in flight');
  const tiles=[
    tile('🌱',st.greensToday,'greens today'),
    tile('🏆',st.totalGreens,'total greens'),
    tile('📋',st.queueDepth,'queue depth'),
    tile('⚠️',st.parked,'parked',st.parked>0),
    tile('🐛',st.openIssues,'open issues'),
    '<div class="tile wide cur"><div class="ic">▶</div><div class="num">'+esc(curNum)+'</div><div class="curtitle">'+curTitle+'</div></div>'
  ];
  paint('tiles',tiles.join(''));

  // charts
  paint('greensChart',drawGreens(s.greensPerDay));
  paint('sessChart',drawSessions((s.todaySessions&&s.todaySessions.sessions)||[]));

  // governor meter
  const g=s.governor;
  if(g&&g.cap){
    const used=Math.min(1,g.weighted/g.cap),rsv=Math.max(0,Math.min(1,1-(g.reservePct||0)/100));
    paint('govBox','<div class="meter"><div class="fill" style="width:'+Math.max(1.5,used*100).toFixed(1)+'%"></div><div class="rsv" style="left:'+(rsv*100).toFixed(1)+'%" title="reserve line"></div></div>'+
      '<div class="govnums">weighted <b>'+g.weighted.toLocaleString()+'</b> / cap '+g.cap.toLocaleString()+' &middot; <b>'+(used*100).toFixed(1)+'%</b> used &middot; '+(g.reservePct||0)+'% reserved'+(s.napUntil?' &middot; napping until '+hm(s.napUntil):'')+'</div>');
  } else paint('govBox','<div class="empty">no governor data</div>');

  // checklist
  const cl=s.checklist||[],pk=s.parkedTasks||[],inflightId=st.currentId||'';
  let h='';
  if(pk.length){
    h+='<div class="parkbox"><div class="ph">⚠ parked — needs you ('+pk.length+')</div>';
    pk.forEach(x=>{h+='<div class="crow parked"><span class="cid">'+esc(x.idStr||x.id)+'</span><span class="ic2">⚠</span><span class="ct">'+esc(x.title)+'</span></div>'});
    h+='</div>';
  }
  h+='<ul class="clist" id="clistUl">';
  if(!cl.length)h+='<li class="empty">(no tasks)</li>';
  cl.forEach(t=>{
    const icon=t.status==='done'?'<span class="ck ic2">✓</span>':t.status==='inflight'?'<span class="ic2"><span class="cdot"></span></span>':'<span class="oo ic2">○</span>';
    h+='<li class="crow '+t.status+'"'+(t.status==='inflight'?' id="inflightRow"':'')+'><span class="cid">'+esc(t.idStr||t.id)+'</span>'+icon+'<span class="ct">'+esc(t.title)+'</span></li>';
  });
  h+='</ul>';
  if(paint('checklistBox',h)){
    const row=$('inflightRow');
    if(row&&lastInflight!==inflightId){try{row.scrollIntoView({block:'center'})}catch(e){}lastInflight=inflightId}
  }

  // working-on activity
  const act=s.activity||{items:[]};
  $('livedot').textContent=act.live?'LIVE':'idle';$('livedot').className='livetag '+(act.live?'on':'off');
  paint('activityBox',(act.items||[]).map(a=>'<li><span class="'+(a.kind==='tool'?'tool':'say')+'">'+(a.kind==='tool'?'⚙ ':'💬 ')+esc(a.text)+'</span></li>').join('')||'<li class="empty">(no live session)</li>');

  // milestones
  paint('eventsBox',(s.events||[]).map(e=>'<li><span class="ago">'+ago(e.t)+'</span><span class="badge b-'+e.event+'">'+esc(e.event)+'</span><span class="ct2">'+(e.msg?esc(e.msg):'')+'</span></li>').join('')||'<li class="empty">(no events)</li>');

  // feedback + ntfy
  $('fbcount').textContent=(s.feedback?s.feedback.pending:0)+' note(s) waiting · '+(s.feedback?s.feedback.processed:0)+' processed';
  const a=$('ntfy');if(s.ntfyTopic){a.textContent='ntfy.sh/'+s.ntfyTopic;a.href='https://ntfy.sh/'+s.ntfyTopic}else{a.textContent='(not configured)';a.removeAttribute('href')}
}
$('start').onclick=async()=>{$('ctlmsg').textContent=(await post('/start')).msg;refresh()};
$('pauseBtn').onclick=async()=>{$('ctlmsg').textContent=(await post('/pause')).msg;refresh()};
$('sendFb').onclick=async()=>{const r=await post('/feedback',{text:$('fb').value});$('fbmsg').textContent=r.msg;if(r.ok)$('fb').value='';refresh()};
refresh();setInterval(refresh,2500);
async function refreshVisitors(){let v;try{v=await (await fetch('/visitors')).json()}catch(e){return}paint('visitorsBox',renderVisitors(v))}
refreshVisitors();setInterval(refreshVisitors,300000);
</script></body></html>`;

function body(req) { return new Promise(res => { let b = ''; req.on('data', d => b += d).on('end', () => { try { res(JSON.parse(b || '{}')) } catch { res({}) } }); }); }

const server = http.createServer(async (req, res) => {
  const json = o => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.method === 'GET' && req.url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(HTML); }
  else if (req.method === 'GET' && req.url === '/state') json(state());
  else if (req.method === 'GET' && req.url === '/visitors') json(await visitorsData());
  else if (req.method === 'POST' && req.url === '/start') json(startLoop((await body(req)).dry));
  else if (req.method === 'POST' && req.url === '/pause') json(pauseLoop());
  else if (req.method === 'POST' && req.url === '/feedback') json(saveFeedback((await body(req)).text));
  else { res.writeHead(404); res.end(); }
});

function listen(attempt = 0) {
  server.once('error', e => {
    if (e.code === 'EADDRINUSE' && attempt < 10) { PORT++; listen(attempt + 1); }
    else { console.error('gui failed to bind: ' + e.message); process.exit(1); }
  });
  server.listen(PORT, '127.0.0.1', () => {
    const url = 'http://localhost:' + PORT + '/';
    console.log('Ope! autopilot panel: ' + url);
    if (!NO_OPEN) spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  });
}
mkdirSync(PROCESSED, { recursive: true });
listen();
