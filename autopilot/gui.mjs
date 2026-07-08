// gui.mjs — the Harbor Days autopilot control panel (zero dependencies).
//   node autopilot/gui.mjs [--port 4599] [--no-open]
// Serves a local page (127.0.0.1 only) with Start / Pause, the loop's milestone
// feed, queue state, and a feedback box. Feedback lands in autopilot/feedback/
// as timestamped .md notes; every iteration session reads them at task start
// (iteration.md step 2) and the planner reads them before site selection.
// Pause = the STOP sentinel: graceful, honored BETWEEN iterations — the current
// task always finishes (or fails honestly) first.
import http from 'http';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, unlinkSync, openSync } from 'fs';
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

function state() {
  const pid = pidAlive(), stop = existsSync(STOP);
  const ev = events();
  const f = latestRunLog();
  const logFresh = f && (Date.now() - statSync(f).mtimeMs) < 150000;
  const lastSpawn = ev.find(e => e.event === 'spawn');
  const lastTerminal = ev.find(e => ['green', 'failed', 'parked', 'halt', 'loop-end', 'stop-sentinel', 'loop-crash'].includes(e.event));
  const midTask = lastSpawn && (!lastTerminal || Date.parse(lastTerminal.t) < Date.parse(lastSpawn.t));
  const running = pid ? true : (logFresh && midTask);   // external terminal runs have no pidfile
  return {
    status: running ? (stop ? 'pausing' : 'running') : (stop ? 'paused' : 'idle'),
    external: running && !pid,
    currentTask: running && midTask ? lastSpawn.msg : null,
    stopPresent: stop,
    queue: { pending: mdList(QUEUE), done: mdList(join(QUEUE, 'done')), parked: mdList(join(QUEUE, 'parked')) },
    feedback: { pending: mdList(FEEDBACK).length, processed: mdList(PROCESSED).length },
    events: ev,
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

const HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Harbor Days — Autopilot</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#141419;color:#e8e6e1;font:14px/1.5 "Segoe UI",system-ui,sans-serif}
  header{background:#c8102e;padding:14px 22px;display:flex;align-items:center;gap:16px}
  header h1{margin:0;font-size:17px;letter-spacing:2px;color:#fff;font-weight:700}
  header .sub{color:#ffd9de;font-size:12px}
  .wrap{display:grid;grid-template-columns:1.4fr 1fr;gap:18px;padding:18px 22px;max-width:1100px}
  @media(max-width:800px){.wrap{grid-template-columns:1fr}}
  .card{background:#1c1c24;border:1px solid #2a2a35;border-radius:10px;padding:14px 16px}
  .card h2{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#9a97a5}
  .pill{display:inline-block;padding:3px 12px;border-radius:99px;font-weight:600;font-size:13px}
  .running{background:#12331b;color:#5fd97e}.pausing{background:#33290f;color:#e8c15a}
  .paused{background:#33170f;color:#e8825a}.idle{background:#26262f;color:#9a97a5}
  button{border:0;border-radius:8px;padding:9px 20px;font:600 14px "Segoe UI",sans-serif;cursor:pointer;margin-right:8px}
  button:disabled{opacity:.35;cursor:default}
  .go{background:#0e3386;color:#fff}.pause{background:#463016;color:#e8c15a}
  .send{background:#0e3386;color:#fff;margin-top:8px}
  #events{list-style:none;margin:0;padding:0;max-height:340px;overflow-y:auto}
  #events li{padding:5px 0;border-bottom:1px solid #22222c;font-size:13px}
  #events .t{color:#6f6c7a;font-size:11px;margin-right:8px}
  .ev-green{color:#5fd97e}.ev-failed,.ev-parked,.ev-loop-crash,.ev-halt{color:#e8825a}
  .ev-spawn{color:#7db3ff}.ev-limit-sleep-begin,.ev-limit-sleep-end,.ev-turns-topup{color:#e8c15a}
  textarea{width:100%;box-sizing:border-box;background:#14141b;color:#e8e6e1;border:1px solid #2a2a35;border-radius:8px;padding:10px;font:inherit;min-height:90px;resize:vertical}
  ul.q{list-style:none;margin:0;padding:0;font-size:13px}
  ul.q li{padding:2px 0;color:#c9c6d0}
  ul.q li.done{color:#5fd97e}ul.q li.parked{color:#e8825a}
  .msg{font-size:12px;color:#9a97a5;min-height:18px;margin-top:6px}
  .task{color:#7db3ff;font-size:13px;margin-left:10px}
  footer{padding:0 22px 20px;font-size:12px;color:#6f6c7a}
  footer a{color:#7db3ff}
</style></head><body>
<header><h1>HARBOR DAYS · AUTOPILOT</h1><span class="sub">the loop builds Chicago — you watch and steer</span></header>
<div class="wrap">
  <div>
    <div class="card">
      <h2>Loop</h2>
      <p><span id="status" class="pill idle">…</span><span id="task" class="task"></span></p>
      <button id="start" class="go">▶ Start</button>
      <button id="pauseBtn" class="pause">⏸ Pause after current task</button>
      <div class="msg" id="ctlmsg"></div>
    </div>
    <div class="card" style="margin-top:18px">
      <h2>Updates <span style="text-transform:none;letter-spacing:0">(also on your ntfy phone feed)</span></h2>
      <ul id="events"></ul>
    </div>
  </div>
  <div>
    <div class="card">
      <h2>Your feedback</h2>
      <textarea id="fb" placeholder="Playtest notes, direction, taste calls — e.g. 'the dog beach feels empty, more dogs' or 'next: Montrose Harbor please'. The next task start reads this; big asks become queue tasks."></textarea>
      <button class="send" id="sendFb">Send to the loop</button>
      <div class="msg" id="fbmsg"></div>
      <div class="msg" id="fbcount"></div>
    </div>
    <div class="card" style="margin-top:18px">
      <h2>Queue</h2>
      <ul class="q" id="qpending"></ul>
      <ul class="q" id="qdone"></ul>
      <ul class="q" id="qparked"></ul>
    </div>
  </div>
</div>
<footer>notifications: <a id="ntfy" target="_blank"></a> · pause is graceful (STOP sentinel, honored between iterations) · feedback lands in autopilot/feedback/ and is committed with the next iteration</footer>
<script>
const $=id=>document.getElementById(id);
async function post(path,body){const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})});return r.json()}
async function refresh(){
  try{
    const s=await (await fetch('/state')).json();
    const st=$('status');st.textContent=s.status.toUpperCase()+(s.external?' (terminal)':'');st.className='pill '+s.status;
    $('task').textContent=s.currentTask?('→ '+s.currentTask):'';
    $('start').disabled=(s.status==='running');
    $('start').textContent=(s.status==='pausing'||s.status==='paused')?'▶ Resume':'▶ Start';
    $('pauseBtn').disabled=(s.status!=='running');
    $('events').innerHTML=s.events.map(e=>'<li><span class="t">'+e.t.slice(11,19)+'</span><span class="ev-'+e.event+'">'+e.event+'</span>'+(e.msg?' — '+e.msg:'')+'</li>').join('');
    $('qpending').innerHTML=s.queue.pending.map(f=>'<li>◻ '+f+'</li>').join('')||'<li style="color:#6f6c7a">(queue empty)</li>';
    $('qdone').innerHTML=s.queue.done.map(f=>'<li class="done">✓ '+f+'</li>').join('');
    $('qparked').innerHTML=s.queue.parked.map(f=>'<li class="parked">⚠ '+f+' (parked)</li>').join('');
    $('fbcount').textContent=s.feedback.pending+' feedback note(s) waiting · '+s.feedback.processed+' processed';
    const a=$('ntfy');a.textContent='ntfy.sh/'+s.ntfyTopic;a.href='https://ntfy.sh/'+s.ntfyTopic;
  }catch(e){}
}
$('start').onclick=async()=>{$('ctlmsg').textContent=(await post('/start')).msg;refresh()};
$('pauseBtn').onclick=async()=>{$('ctlmsg').textContent=(await post('/pause')).msg;refresh()};
$('sendFb').onclick=async()=>{const r=await post('/feedback',{text:$('fb').value});$('fbmsg').textContent=r.msg;if(r.ok)$('fb').value='';refresh()};
refresh();setInterval(refresh,2500);
</script></body></html>`;

function body(req) { return new Promise(res => { let b = ''; req.on('data', d => b += d).on('end', () => { try { res(JSON.parse(b || '{}')) } catch { res({}) } }); }); }

const server = http.createServer(async (req, res) => {
  const json = o => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.method === 'GET' && req.url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(HTML); }
  else if (req.method === 'GET' && req.url === '/state') json(state());
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
    console.log('Harbor Days autopilot panel: ' + url);
    if (!NO_OPEN) spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  });
}
mkdirSync(PROCESSED, { recursive: true });
listen();
