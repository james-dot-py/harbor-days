// run.mjs — the autopilot outer loop (AUTOPILOT.md §7).
// Start:  node autopilot/run.mjs        (loop until STOP / halt / crash)
//         node autopilot/run.mjs --once  (one iteration then exit — Phase 5)
//         node autopilot/run.mjs --dry-run (print what it WOULD spawn, no spawn)
//
// Per iteration:
//  1. STOP sentinel (repo-root STOP file) → notify + clean exit.
//  2. pick lowest-NNN queue task not in done/. Empty queue + a SIGNOFF.md → planner
//     iteration; empty queue without sign-off → notify + halt.
//  3. spawn `claude -p "<iteration.md + TASK: file>" --output-format stream-json
//     --verbose --max-turns <80 | 120 for build>`, cwd = worktree. Parse the stream;
//     capture session_id from init; watch for result/error.
//  4. On rate/session-limit error: parse the reset time (or back off 15m→2h), notify
//     the sleep, then RESUME the same session (`claude -p --resume <id> ...`).
//  5. On completion read autopilot/result.json (must postdate the spawn):
//     green → move task to queue/done/, notify; failed → leave issue, notify, retry;
//     same task failed 3× → move to queue/parked/, notify loudly.
//  6. Append every event to autopilot/logs/run-<YYYYMMDD>.jsonl.
import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync, mkdirSync, statSync, appendFileSync } from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';
import { notify } from './notify.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));   // autopilot/
const ROOT = join(HERE, '..');                          // worktree root
const QUEUE = join(HERE, 'queue');
const DONE = join(QUEUE, 'done');
const PARKED = join(QUEUE, 'parked');
const ITER_FILE = join(HERE, 'iteration.md');
const RESULT = join(HERE, 'result.json');
const LOGS = join(HERE, 'logs');
const FAILCOUNTS = join(LOGS, 'failcounts.json');
const STOP = join(ROOT, 'STOP');
const NO_EXPAND = join(ROOT, 'NO-EXPAND');   // owner 2026-07-24 AAA-quality hold: block the planner from picking NEW neighborhoods until the existing 4 (Wrigleyville, Millennium/Grant, Montrose, Lincoln Park) are AAA. Delete this file to re-enable expansion.
const LOCATIONS = join(ROOT, 'LOCATIONS.md');
const REFS = join(ROOT, 'refs');

const ONCE = process.argv.includes('--once');
const DRY = process.argv.includes('--dry-run');

// ---- single-instance lock ---------------------------------------------------
// Two concurrent loops both work the queue: duplicate task sessions racing on
// the same working tree (it happened — a detached loop wrote no pidfile, the
// panel showed idle, Start spawned a second loop, and task 006 ran twice).
// run.mjs now owns the pidfile itself: refuse to start if the recorded loop
// is still alive.
{
  const PIDFILE = join(LOGS, 'run.pid');
  try {
    const other = +readFileSync(PIDFILE, 'utf8').trim();
    if (other && other !== process.pid) {
      process.kill(other, 0);   // throws if dead
      console.error('[run] another loop is already running (pid ' + other + ') — refusing to start a second. Stop it first (STOP file, or kill the pid).');
      process.exit(3);
    }
  } catch { /* no pidfile or holder dead — proceed */ }
  mkdirSync(LOGS, { recursive: true });
  writeFileSync(PIDFILE, String(process.pid));
}

const MAX_BACKOFF_MS = 2 * 60 * 60 * 1000; // 2 h cap
const START_BACKOFF_MS = 15 * 60 * 1000;   // 15 min

// ---- usage governor (owner ask, 2026-07-09): leave headroom for mobile -----
// There is no API for "percent of Max window used", so the governor SELF-
// CALIBRATES: it accumulates weighted tokens per ~5h window (fable ×2, cache
// reads ×0.1 — mirroring billing weights); the first time a window limit
// actually fires, the accumulated figure becomes the calibrated cap. From
// then on the loop pauses BETWEEN iterations, and the gate is PREDICTIVE
// (2026-07-18): a session's usage lands in one lump at session end, so gating
// on the tally alone overshoots by a whole session (hit 135% of cap) — the
// gate now also requires headroom for the next task's expected cost (per-model
// EMA ×1.25). The cap is a live estimate, not gospel: the tally passing it
// without a real limit firing disproves it, so it auto-raises to the observed
// floor; a real limit hit still recalibrates it exactly. The reserve is the
// owner's phone slice — raise reservePct in usage-governor.json for margin.
const GOV_FILE = join(HERE, 'usage-governor.json');
const WINDOW_MS = 5 * 60 * 60 * 1000;
const MODEL_WEIGHT = m => /fable|mythos/i.test(m || '') ? 2 : 1;
function govLoad() {
  let g = {};
  try { g = JSON.parse(readFileSync(GOV_FILE, 'utf8')); } catch { }
  return { reservePct: 2, windowStart: 0, windowWeighted: 0, calibratedCap: null, avgCost: {}, ...g };
}
function govSave(g) { try { writeFileSync(GOV_FILE, JSON.stringify(g, null, 2)); } catch { } }
function govRoll(g) {
  if (!g.windowStart || Date.now() - g.windowStart > WINDOW_MS) { g.windowStart = Date.now(); g.windowWeighted = 0; }
  return g;
}
function govRecord(usage, model) {
  if (!usage) return;
  const g = govRoll(govLoad());
  const w = Math.round(MODEL_WEIGHT(model) * (
    (usage.input_tokens || 0) + (usage.output_tokens || 0) * 5 +
    (usage.cache_creation_input_tokens || 0) * 1.25 + (usage.cache_read_input_tokens || 0) * 0.1));
  g.windowWeighted += w;
  g.avgCost = g.avgCost || {};
  g.avgCost[model] = Math.round(g.avgCost[model] ? 0.6 * g.avgCost[model] + 0.4 * w : w);
  if (g.calibratedCap && g.windowWeighted > g.calibratedCap) {
    g.calibratedCap = g.windowWeighted;
    log({ event: 'governor-floor-raise', msg: 'tally passed the cap with no limit fired — cap raised to proven floor ' + g.windowWeighted });
  }
  govSave(g);
}
function govCalibrate() {   // a real window limit fired: current tally ≈ the cap
  const g = govRoll(govLoad());
  if (g.windowWeighted > 0) { g.calibratedCap = g.windowWeighted; govSave(g); log({ event: 'governor-calibrated', msg: 'window cap ≈ ' + g.windowWeighted + ' weighted tokens' }); }
}
function govShouldPause() {
  const g = govRoll(govLoad()); govSave(g);
  if (!g.calibratedCap) return null;
  const threshold = g.calibratedCap * (1 - (g.reservePct || 2) / 100);
  let expected = 0;
  try {
    const t = pickTask();
    const m = t ? taskModel(t.file, false) : MODEL_IDS.fable;
    expected = Math.round(((g.avgCost || {})[m] || 0) * 1.25);
  } catch { /* no queue peek — fall back to the plain threshold check */ }
  if (g.windowWeighted + expected < threshold) return null;
  return { until: g.windowStart + WINDOW_MS, used: g.windowWeighted, cap: g.calibratedCap, reservePct: g.reservePct || 2, expected };
}

// ---- logging --------------------------------------------------------------
function log(event) {
  try {
    mkdirSync(LOGS, { recursive: true });
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    appendFileSync(join(LOGS, 'run-' + day + '.jsonl'), JSON.stringify({ t: new Date().toISOString(), ...event }) + '\n');
  } catch { /* logging must never crash the loop */ }
  if (event.event) console.log('[run] ' + event.event + (event.msg ? ' — ' + event.msg : ''));
}

// ---- queue ----------------------------------------------------------------
function queueTasks() {
  let entries; try { entries = readdirSync(QUEUE); } catch { return []; }
  return entries
    .filter(f => /^\d+.*\.md$/i.test(f))
    .map(f => ({ file: join(QUEUE, f), name: f, n: parseInt(f, 10) }))
    .sort((a, b) => a.n - b.n);
}
function pickTask() { const t = queueTasks(); return t.length ? t[0] : null; }

function frontmatter(file) {
  const fm = {};
  try {
    const text = readFileSync(file, 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return fm;
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (kv) fm[kv[1]] = kv[2].trim();
    }
  } catch { }
  return fm;
}

// The planner runs only when the queue is empty AND a location has reached sign-off.
// Interpretation (documented for the orchestrator): sign-off is recorded as
// refs/<poi>/SIGNOFF.md, so "the current location is signed off" == some
// refs/*/SIGNOFF.md exists. If none exists with an empty queue, something is wrong.
function anySignoff() {
  try {
    for (const e of readdirSync(REFS, { withFileTypes: true }))
      if (e.isDirectory() && existsSync(join(REFS, e.name, 'SIGNOFF.md'))) return join(REFS, e.name, 'SIGNOFF.md');
  } catch { }
  return null;
}

const PLANNER_INSTRUCTIONS = `\n\n---\nPLANNER TASK (queue empty, current location signed off — §5.3 site selection):\nThe queue is empty and the current location has a SIGNOFF.md. FIRST read any pending\nowner feedback in autopilot/feedback/ (skip processed/) — playtest notes from the\nowner outrank the default selection criteria when they name desires. Then select\nexactly ONE next famous Chicago site from LOCATIONS.md (contents below). Selection criteria in order:\n(1) recognizability, (2) connectivity — prefer extending the contiguous 1:2 world;\ndistant sites become hard cells reached via the ridable L (never a third place layer),\n(3) variety vs what is shipped, (4) feasibility inside perf + single-file constraints.\nGenerate its full SCOUT → LAYOUT → BUILD → DELIGHT → POLISH → SIGNOFF pipeline as\nautopilot/queue/NNN-slug.md task files (frontmatter: id, area, type, acceptance, refs,\noptional turns, optional model). MODEL ALLOCATION: tag scout/layout tasks and the\nsignature-landmark hero build 'model: fable'; mechanical work (application,\nverification-heavy polish, delight packs) defaults to opus — Fable tokens are\nscarce and reserved for judgment. SIZE TASKS TO FIT ~80 turns of work — the read-every-PNG doctrine\neats turns fast, so split broad tasks (many waypoints, many buildings) into narrow\nones rather than authoring one sprawling task (task 002 took 3 sessions; don't).\nYour FIRST commit IS the proposal: update LOCATIONS.md (move the pick to "In progress")\nplus the new queue tasks, push to autopilot, and write autopilot/result.json\n{status:"green", ...}. The notification names the pick.\n\n--- LOCATIONS.md ---\n`;

function buildPrompt(taskFile, planner) {
  const iter = readFileSync(ITER_FILE, 'utf8');
  if (planner) {
    const loc = existsSync(LOCATIONS) ? readFileSync(LOCATIONS, 'utf8') : '(LOCATIONS.md missing)';
    return iter + PLANNER_INSTRUCTIONS + loc;
  }
  const task = readFileSync(taskFile, 'utf8');
  return iter + '\n\nTASK: ' + task;
}

function turnBudget(taskFile, planner) {
  if (planner) return 80;
  const fm = frontmatter(taskFile);
  const explicit = parseInt(fm.turns, 10);          // per-task override in frontmatter
  if (explicit > 0) return explicit;
  return (fm.type === 'build') ? 120 : 80;
}

// ---- model allocation (owner decision, 2026-07-09) --------------------------
// Fable's remaining allowance goes to judgment-heavy work; the grind runs on
// Opus at roughly half the usage burn. Task frontmatter `model:` overrides;
// otherwise: sign-offs + planner picks (rare, taste-critical) get Fable,
// everything else Opus. Values accept aliases 'fable' / 'opus' / 'kimi'
// (kimi = kimi-k3; owner 2026-07-19: kimi runs today's queue, no fable).
// 2026-07-22: owner's Fable credits are EXHAUSTED — the implicit Fable
// defaults (planner + untyped sign-offs) now route to Opus so the loop can't
// stall on an empty-credit model. A frontmatter `model: fable` still honors
// the request (and will fail loudly) — this only changes the DEFAULTS. Revert
// the two DEFAULT_MODEL uses below to MODEL_IDS.fable when credits return.
const MODEL_IDS = { fable: 'claude-fable-5', opus: 'claude-opus-5', kimi: 'kimi-k3' };   // opus alias bumped 4.8 -> 5 (owner 2026-07-24, Opus 5 launch day: same $5/$25, better, and Fable/Kimi are both out). 'opus4' kept as an escape hatch below.
const MODEL_ALIASES = { opus4: 'claude-opus-4-8', opus5: 'claude-opus-5' };
const DEFAULT_MODEL = MODEL_IDS.opus;   // was fable for planner/signoff; see note above
function taskModel(taskFile, planner) {
  if (planner) return DEFAULT_MODEL;
  const fm = frontmatter(taskFile);
  const m = (fm.model || '').trim().toLowerCase();
  if (MODEL_IDS[m]) return MODEL_IDS[m];
  if (m.startsWith('claude-')) return fm.model.trim();   // explicit full model id
  // unknown aliases ('any', typos) fall back to the default instead of
  // becoming a bogus --model arg (parked 024 three times, 2026-07-10)
  return (fm.type === 'signoff') ? DEFAULT_MODEL : MODEL_IDS.opus;
}

// ---- bookkeeping durability -------------------------------------------------
// Queue moves, issue files, and owner feedback must not sit local-only: commit
// and push them between iterations (sessions commit their own code work).
const BOOK_PATHS = ['autopilot/queue', 'autopilot/issues', 'autopilot/feedback'];
function commitBookkeeping(reason) {
  try {
    spawnSync('git', ['add', '--', ...BOOK_PATHS], { cwd: ROOT });
    const st = spawnSync('git', ['status', '--porcelain', '--', ...BOOK_PATHS], { cwd: ROOT, encoding: 'utf8' });
    if (!(st.stdout || '').trim()) return;
    spawnSync('git', ['commit', '-m', 'Autopilot bookkeeping: ' + reason + '\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>'], { cwd: ROOT });
    spawnSync('git', ['push', 'origin', 'autopilot'], { cwd: ROOT });
    log({ event: 'bookkeeping', msg: reason });
  } catch (e) { log({ event: 'bookkeeping-failed', msg: e && e.message ? e.message : String(e) }); }
}

// ---- auto-deploy (owner decision, 2026-07-10) -------------------------------
// Every green syncs main to autopilot (fast-forward push) — pushing main IS the
// playope.com deploy (Pages workflow). Tasks are small enough to ship as they
// land (owner's call). Drop a HOLD-DEPLOY file in autopilot/ to pause releases
// without pausing the loop.
const HOLD_DEPLOY = join(HERE, 'HOLD-DEPLOY');
async function syncMainDeploy(taskId) {
  if (existsSync(HOLD_DEPLOY)) { log({ event: 'deploy-hold', msg: taskId + ' not deployed (HOLD-DEPLOY present)' }); return; }
  const r = spawnSync('git', ['push', 'origin', 'autopilot:main'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status === 0) log({ event: 'deploy', msg: taskId + ' -> main -> playope.com' });
  else {
    log({ event: 'deploy-failed', msg: ((r.stderr || '') + (r.stdout || '')).trim().slice(-300) });
    await notify('Ope! deploy failed after ' + taskId, 'git push origin autopilot:main was rejected (diverged main?). Deploy by hand.', { priority: 'high' });
  }
}

// ---- failcounts -----------------------------------------------------------
function loadFailcounts() { try { return JSON.parse(readFileSync(FAILCOUNTS, 'utf8')); } catch { return {}; } }
function saveFailcounts(fc) { try { mkdirSync(LOGS, { recursive: true }); writeFileSync(FAILCOUNTS, JSON.stringify(fc, null, 2)); } catch { } }

// ---- limit / reset parsing ------------------------------------------------
const LIMIT_RE = /rate limit|usage limit|session limit|too many requests|limit reached|limit exceeded|resets? at|please try again later/i;
// monthly spend limits do NOT reset on a sleep — they need the owner. Detect
// them separately: halt the loop without striking the task. (Learned 2026-07-08:
// a spend-limit cutoff cascaded into 1-turn sessions that parked two good tasks.)
const SPEND_RE = /spend limit|monthly limit|credit balance|out of credits|insufficient credits|settings\/usage/i;
// Auth failures (OAuth expired/revoked) also need the owner — halt without a
// strike. Learned 2026-07-10: an expired login instant-failed every spawn,
// cascade-parked 6 good tasks, then the un-parkable planner retried 721×,
// one ntfy per failure — the owner woke to a notification storm.
const AUTH_RE = /failed to authenticate|oauth.*(expired|revoked|could not be refreshed)|not logged in|invalid api key|please run \/login/i;
function looksLikeLimit(text) { return !!text && LIMIT_RE.test(text); }
function classifyLimit(attempt) {
  const texts = [attempt.limitText, attempt.resultText].filter(Boolean);
  if (texts.some(t => SPEND_RE.test(t))) return 'spend';
  if (attempt.limitText) return 'limit';
  if (texts.some(t => LIMIT_RE.test(t))) { attempt.limitText = attempt.resultText; return 'limit'; }
  return null;
}
function parseResetMs(text) {
  if (!text) return null;
  // explicit ISO timestamp
  const iso = text.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)/);
  if (iso) { const t = Date.parse(iso[1]); if (!isNaN(t) && t > Date.now()) return t - Date.now(); }
  // "resets at 3:30pm" / "reset at 15:30"
  const clock = text.match(/reset[s]?\s+at\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (clock) {
    let h = +clock[1]; const min = +clock[2]; const ap = (clock[3] || '').toLowerCase();
    if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
    const now = new Date(); const target = new Date(now); target.setHours(h, min, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1); // next occurrence
    return target - now;
  }
  return null;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- claude spawn ---------------------------------------------------------
function claudeArgs({ prompt, maxTurns, resume, model }) {
  const a = ['-p', '--output-format', 'stream-json', '--verbose', '--max-turns', String(maxTurns)];
  if (model) a.push('--model', model);
  if (resume) a.push('--resume', resume);
  a.push(prompt);
  return a;
}

function runClaude({ prompt, maxTurns, resume, model }) {
  return new Promise((resolve) => {
    const args = claudeArgs({ prompt, maxTurns, resume, model });
    const child = spawn('claude', args, { cwd: ROOT });
    // persist the RAW stream — without this, diagnosing a dead session means
    // spelunking ~/.claude transcripts (learned in the first Phase 5 dry run)
    mkdirSync(LOGS, { recursive: true });
    const streamLog = join(LOGS, 'session-' + new Date().toISOString().replace(/[:.]/g, '-') + '.jsonl');
    log({ event: 'stream-log', msg: streamLog });
    let sessionId = resume || null, buf = '', limitText = null, resultText = null, sawResult = false, maxTurnsHit = false;
    child.stdout.on('data', d => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, idx); buf = buf.slice(idx + 1); handle(line); }
    });
    child.stderr.on('data', d => { const s = d.toString(); try { appendFileSync(streamLog, JSON.stringify({ stderr: s }) + '\n'); } catch { } if (looksLikeLimit(s)) limitText = s; });
    function handle(line) {
      if (!line.trim()) return;
      try { appendFileSync(streamLog, line + '\n'); } catch { }
      let ev; try { ev = JSON.parse(line); } catch { if (looksLikeLimit(line)) limitText = line; return; }
      if (ev.session_id && !sessionId) sessionId = ev.session_id;
      if (ev.type === 'system' && ev.subtype === 'init' && ev.session_id) sessionId = ev.session_id;
      log({ event: 'stream', type: ev.type, subtype: ev.subtype });
      // limit detection ONLY on error-ish events — an assistant message that merely
      // MENTIONS "rate limit" (e.g. building retry logic) must not trigger a sleep
      const blob = JSON.stringify(ev);
      if (ev.type === 'result') { sawResult = true; try { govRecord(ev.usage, model); } catch { } resultText = ev.result || blob; if (ev.subtype === 'error_max_turns') maxTurnsHit = true; if (ev.is_error || /error/i.test(ev.subtype || '')) { if (looksLikeLimit(blob)) limitText = blob; } }
      else if (ev.type === 'error' || ev.is_error) { if (looksLikeLimit(blob)) limitText = blob; }
    }
    child.on('exit', code => resolve({ sessionId, code, limitText, resultText, sawResult, maxTurnsHit }));
    child.on('error', err => resolve({ sessionId, code: -1, limitText: looksLikeLimit(err.message) ? err.message : null, resultText: null, sawResult: false, maxTurnsHit: false, spawnError: err.message }));
  });
}

// Run one task's claude session, transparently sleeping through limit errors and
// resuming the SAME session (never restart blind). A session that exhausts its
// turn budget mid-task gets ONE resume with a top-up — turn exhaustion with
// full context is resumable work, not a failure (learned on task 002: the
// read-every-PNG doctrine eats turns fast).
// kimi resume fragility (2026-07-19, task 098): kimi-k3's endpoint REJECTS some
// resumed contexts — API 400 "the message at position N with role 'assistant'
// must not be empty" — so the turns-topup / limit-sleep resume paths die code=1
// within minutes. Detect that signature and continue as a FRESH session with an
// interruption note (the tree keeps any uncommitted work) instead of eating a
// strike. Resume remains the default: full-context continuation is better work.
const RESUME_REJECT_RE = /must not be empty|API Error: 4\d\d|api_error_status":\s*4/i;
async function resumeOrFresh(attempt, prompt, maxTurns, model) {
  const resumed = await runClaude({ prompt: 'continue the task', maxTurns, resume: attempt.sessionId, model });
  if (classifyLimit(resumed) === 'spend') { resumed.spendLimit = true; return resumed; }
  if (RESUME_REJECT_RE.test(resumed.resultText || '')) {
    log({ event: 'resume-rejected', msg: 'endpoint refused the resumed context; continuing as a FRESH session (tree may hold uncommitted work)' });
    await notify('Harbor Days autopilot: resume refused', 'Resume of ' + attempt.sessionId + ' hit an API 4xx; continuing the task as a fresh session.', { priority: 'default' });
    return runClaude({ prompt: prompt + '\n\nNOTE: a previous session was interrupted mid-task and may have left UNCOMMITTED changes in the tree — review the current file state before editing; keep whatever already holds.', maxTurns, model });
  }
  return resumed;
}
async function runWithLimitResilience({ prompt, maxTurns, model }) {
  let attempt = await runClaude({ prompt, maxTurns, model });
  if (classifyLimit(attempt) === 'spend') { attempt.spendLimit = true; return attempt; }
  if (attempt.maxTurnsHit && attempt.sessionId) {
    log({ event: 'turns-topup', msg: 'resuming ' + attempt.sessionId + ' with +' + maxTurns + ' turns' });
    await notify('Harbor Days autopilot: turn top-up', 'Session ' + attempt.sessionId + ' ran out of turns mid-task; resuming once with +' + maxTurns + '.', { priority: 'default' });
    attempt = await resumeOrFresh(attempt, prompt, maxTurns, model);
    if (attempt.spendLimit) return attempt;
  }
  let backoff = START_BACKOFF_MS;
  while (classifyLimit(attempt) === 'limit') {
    const parsed = parseResetMs(attempt.limitText);
    const waitMs = parsed != null ? parsed : backoff;
    const until = new Date(Date.now() + waitMs).toISOString();
    govCalibrate();
    log({ event: 'limit-sleep-begin', msg: 'until ' + until, waitMs });
    await notify('Harbor Days autopilot sleeping', 'Hit a limit; sleeping until ' + until + ' then resuming session ' + (attempt.sessionId || '?'), { priority: 'default' });
    await sleep(waitMs);
    if (parsed == null) backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    log({ event: 'limit-sleep-end', msg: 'resuming ' + (attempt.sessionId || '?') });
    await notify('Harbor Days autopilot resuming', 'Resuming session ' + (attempt.sessionId || '?'), { priority: 'default' });
    if (!attempt.sessionId) { log({ event: 'resume-failed', msg: 'no session_id captured; cannot resume' }); break; }
    attempt = await resumeOrFresh(attempt, prompt, maxTurns, model);
    if (attempt.spendLimit) return attempt;
  }
  return attempt;
}

// ---- one iteration --------------------------------------------------------
async function iterationOnce() {
  // 1. STOP sentinel
  if (existsSync(STOP)) {
    log({ event: 'stop-sentinel' });
    await notify('Harbor Days autopilot STOPPED', 'STOP sentinel present — exiting cleanly.', { priority: 'default' });
    return { halt: true };
  }

  // 1b. usage governor: reserve headroom for the owner's personal use
  const pause = govShouldPause();
  if (pause) {
    const untilIso = new Date(pause.until).toISOString();
    log({ event: 'governor-pause', msg: pause.used + '/' + pause.cap + ' weighted (+~' + (pause.expected || 0) + ' expected next, ' + pause.reservePct + '% reserved) — sleeping until ' + untilIso });
    await notify('Harbor Days autopilot: usage reserve reached', 'Pausing to leave ~' + pause.reservePct + '% of the window for your personal Claude use. Resuming ~' + untilIso + '.', { priority: 'default' });
    await sleep(Math.max(60000, pause.until - Date.now()));
  }

  // 2. pick task (or planner)
  let task = pickTask();
  let planner = false;
  if (!task) {
    const so = anySignoff();
    if (so && existsSync(NO_EXPAND)) {
      log({ event: 'halt', msg: 'queue drained + signoff present, but NO-EXPAND gate set — owner AAA-quality hold on new neighborhoods' });
      await notify('Harbor Days: expansion held (NO-EXPAND)', 'Queue is empty and a location is signed off, but the NO-EXPAND gate is set: the loop will NOT plan a NEW neighborhood until the existing 4 are AAA. Queue more AAA-polish tasks, or delete the repo-root NO-EXPAND file to allow the planner.', { priority: 'high' });
      return { halt: true };
    }
    if (so) { planner = true; log({ event: 'planner', msg: 'queue empty; signoff at ' + basename(dirname(so)) }); }
    else {
      log({ event: 'halt', msg: 'queue empty and no SIGNOFF.md' });
      await notify('Harbor Days autopilot HALTED', 'Queue empty and no SIGNOFF.md — something is wrong. Add tasks or a sign-off.', { priority: 'high' });
      return { halt: true };
    }
  }

  const taskFile = planner ? null : task.file;
  const taskId = planner ? 'planner' : (frontmatter(taskFile).id || task.name.replace(/\.md$/i, ''));
  const maxTurns = turnBudget(taskFile, planner);
  const model = taskModel(taskFile, planner);
  const prompt = buildPrompt(taskFile, planner);

  if (DRY) {
    const args = claudeArgs({ prompt, maxTurns, model });
    console.log('[dry-run] would spawn (cwd=' + ROOT + '):');
    console.log('  claude ' + args.slice(0, -1).join(' ') + ' "<prompt ' + prompt.length + ' chars>"');
    console.log('  task: ' + (planner ? 'PLANNER' : task.name) + '  maxTurns: ' + maxTurns + '  model: ' + model);
    log({ event: 'dry-run', msg: (planner ? 'planner' : task.name) + ' promptChars=' + prompt.length + ' maxTurns=' + maxTurns });
    return { halt: true };
  }

  // 3-4. spawn + limit resilience
  const spawnTime = Date.now();
  log({ event: 'spawn', msg: (planner ? 'planner' : task.name) + ' maxTurns=' + maxTurns + ' model=' + model });
  const res = await runWithLimitResilience({ prompt, maxTurns, model });
  log({ event: 'session-done', msg: 'code=' + res.code + ' session=' + (res.sessionId || '?') });

  // 5. read result.json — must postdate the spawn (ignore stale ones)
  let result = null;
  if (existsSync(RESULT) && statSync(RESULT).mtimeMs >= spawnTime) {
    try { result = JSON.parse(readFileSync(RESULT, 'utf8')); } catch { result = null; }
  }
  const fc = loadFailcounts();

  if (result && result.status === 'green') {
    if (!planner && taskFile) {
      mkdirSync(DONE, { recursive: true });
      try { renameSync(taskFile, join(DONE, task.name)); } catch (e) { log({ event: 'move-failed', msg: e.message }); }
    }
    delete fc[taskId]; saveFailcounts(fc);
    log({ event: 'green', msg: taskId + ' commit=' + (result.commit || '?') });
    commitBookkeeping(taskId + ' green -> done/');
    await syncMainDeploy(taskId);
    await notify('Harbor Days ' + (planner ? 'planner: scouted next site' : 'task green: ' + taskId),
      [result.summary || '', result.commit ? 'commit ' + result.commit : '', result.contactSheet ? 'sheet ' + result.contactSheet : ''].filter(Boolean).join(' · '),
      { priority: 'default' });
    return { halt: false };
  }

  // monthly spend limit: the task didn't get a fair run — halt WITHOUT a strike
  if (res.spendLimit) {
    log({ event: 'spend-limit-halt', msg: taskId });
    await notify('Harbor Days autopilot HALTED — monthly spend limit', 'Hit the Claude monthly spend limit during ' + taskId + '. No fail strike recorded. Raise the limit at claude.ai/settings/usage, then press Start on the panel.', { priority: 'high' });
    return { halt: true };
  }

  // auth failure: same shape as spend — the task never got a fair run; halt
  // loudly ONCE instead of striking/retrying into a notification storm
  if (AUTH_RE.test(res.resultText || '') || AUTH_RE.test(res.limitText || '')) {
    log({ event: 'auth-halt', msg: taskId });
    await notify('Ope! autopilot HALTED — Claude login expired',
      'Sessions cannot authenticate (hit during ' + taskId + '). No fail strike recorded. Run /login on the box, then press Start on the panel.',
      { priority: 'high' });
    return { halt: true };
  }

  // failed (or no fresh result)
  const status = result ? result.status : 'no-result';
  fc[taskId] = (fc[taskId] || 0) + 1;
  saveFailcounts(fc);
  log({ event: 'failed', msg: taskId + ' status=' + status + ' count=' + fc[taskId] });

  if (fc[taskId] >= 3 && !planner && taskFile) {
    mkdirSync(PARKED, { recursive: true });
    try { renameSync(taskFile, join(PARKED, task.name)); } catch (e) { log({ event: 'move-failed', msg: e.message }); }
    delete fc[taskId]; saveFailcounts(fc);
    log({ event: 'parked', msg: taskId });
    commitBookkeeping(taskId + ' parked after 3 failures');
    await notify('Harbor Days autopilot PARKED ' + taskId, 'Task failed 3× — moved to queue/parked/. Needs a human.', { priority: 'high' });
  } else if (planner && fc[taskId] >= 3) {
    // the planner has no queue file to park — without this cap it retries
    // forever (the 2026-07-10 721-failure storm). Halt loudly once instead.
    delete fc[taskId]; saveFailcounts(fc);
    log({ event: 'planner-halt', msg: '3 consecutive planner failures' });
    await notify('Ope! autopilot HALTED — planner failing', 'The planner failed 3× in a row (nothing to park). Investigate the newest session log, then press Start on the panel.', { priority: 'high' });
    return { halt: true };
  } else {
    commitBookkeeping(taskId + ' failed (attempt ' + fc[taskId] + '/3) — issues/feedback sync');
    await notify('Harbor Days task failed: ' + taskId, (status === 'failed' ? 'Filed an issue' : 'No fresh result.json') + ' (attempt ' + fc[taskId] + '/3).', { priority: 'default' });
  }
  return { halt: false };
}

// ---- main loop ------------------------------------------------------------
async function main() {
  log({ event: 'loop-start', msg: (ONCE ? '--once' : 'continuous') + (DRY ? ' --dry-run' : '') });
  if (ONCE || DRY) { await iterationOnce(); return; }
  while (true) {
    const r = await iterationOnce();
    if (r.halt) break;
  }
  log({ event: 'loop-end' });
}

main().catch(async (e) => {
  log({ event: 'loop-crash', msg: e && e.message ? e.message : String(e) });
  try { await notify('Harbor Days autopilot CRASHED', 'Loop crashed: ' + (e && e.message ? e.message : e), { priority: 'high' }); } catch { }
  process.exit(1);
});
