// guard.mjs — PreToolUse guardrail (AUTOPILOT.md §6.1).
// Reads the hook JSON on stdin. Checks run in order; the FIRST hit exits 2 with a
// one-line reason on stderr (which Claude Code feeds back to the session). Exit 0
// = allow. Everything here is mechanical and deterministic.
//
//   a. Google ban (owner decision b) — applies to EVERY tool.
//   b. Destructive shell + git-push refspec policy — Bash/PowerShell only.
//   c. Write/Edit/NotebookEdit path policy — worktree + harness homes only.
//   d. Network allowlist — fetch commands + WebFetch.
import path from 'path';

function deny(reason) { process.stderr.write('[guard] BLOCKED: ' + reason + '\n'); process.exit(2); }

// forward-slash lowercase absolute — used for path containment
const norm = p => path.resolve(p).replace(/\\/g, '/').toLowerCase();
function isInside(parent, child) {
  const P = norm(parent), C = norm(child);
  if (C === P) return true;
  return C.startsWith(P.endsWith('/') ? P : P + '/');
}

// ---- (a) Google ban -------------------------------------------------------
const GOOGLE = ['google.com', 'googleapis.com', 'gstatic.com', 'googleusercontent.com', 'maps.app.goo.gl', 'streetview'];

// ---- (b) destructive shell ------------------------------------------------
function isDestructive(cmd) {
  if (/\bdel\s+\/s\b/i.test(cmd)) return 'del /s';
  if (/\brmdir\s+\/s\b/i.test(cmd)) return 'rmdir /s';
  if (/Remove-Item\b[^\n]*-Recurse/i.test(cmd)) return 'Remove-Item -Recurse';
  if (/\bformat\s+[a-z]:/i.test(cmd)) return 'format <drive>';
  if (/\bgit\s+clean\s+-\S*f\S*d\S*x\b/i.test(cmd) || /\bgit\s+clean\s+-\S*d\S*f\S*x\b/i.test(cmd)) return 'git clean -fdx';
  if (/\bgit\s+reset\s+--hard\s+origin\/main\b/i.test(cmd)) return 'git reset --hard origin/main';
  // rm with a recursive flag hitting a dangerous target
  const rm = cmd.match(/\brm\s+((?:-\S+\s+)+)(.*)$/i);
  if (rm) {
    const flagChars = rm[1].replace(/-/g, '');
    const recursive = /r/i.test(flagChars);
    if (recursive) {
      const targets = rm[2].trim();
      if (/(^|\s)[/~](\s|$)/.test(' ' + targets)) return 'rm -r on / or ~';
      if (/(^|\s)\.\.?(\s|$|\/)/.test(' ' + targets)) return 'rm -r on . or ..';
      if (/harbor-days/i.test(targets)) return 'rm -r on a harbor-days path';
    }
  }
  return null;
}

// ---- (b) git push refspec policy -----------------------------------------
function checkGitPush(cmd) {
  if (!/\bgit\s+push\b/i.test(cmd)) return null;
  if (/\bgit\s+push\b[^\n]*(--force(-with-lease)?\b|--mirror\b|--all\b|(?:\s)-f(\s|$))/i.test(cmd))
    return 'git push --force/--mirror/--all is denied';
  const after = cmd.replace(/^[\s\S]*?\bgit\s+push\b/i, '').trim();
  const toks = after.length ? after.split(/\s+/) : [];
  const positional = toks.filter(t => !t.startsWith('-'));
  const refspecs = positional.slice(1); // positional[0] is the remote
  if (!refspecs.length) return 'bare/underspecified git push denied — push an explicit autopilot refspec';
  for (const r of refspecs) {
    const dest = r.includes(':') ? r.split(':').pop() : r;
    if (dest !== 'autopilot') return 'git push refspec "' + r + '" does not target autopilot';
  }
  return null;
}

// ---- (d) network allowlist ------------------------------------------------
const ALLOW_HOSTS = ['overpass-api.de', 'lz4.overpass-api.de', 'graph.mapillary.com', 'data.cityofchicago.org', 'ntfy.sh', 'registry.npmjs.org'];
const hostOk = h => ALLOW_HOSTS.includes(h) || h === 'wikimedia.org' || h.endsWith('.wikimedia.org');
function checkNetwork(toolName, input, cmd) {
  const urls = [];
  if (cmd && /\b(curl|wget|Invoke-WebRequest|iwr|Invoke-RestMethod|irm)\b/i.test(cmd))
    urls.push(...(cmd.match(/https?:\/\/[^\s"'`)>\]]+/gi) || []));
  if (toolName === 'WebFetch' && input && input.url) urls.push(String(input.url));
  for (const u of urls) {
    let host;
    try { host = new URL(u).hostname.toLowerCase(); } catch { continue; }
    if (!hostOk(host)) return 'network host not allowlisted: ' + host;
  }
  return null;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw || '{}'); } catch { process.exit(0); } // unparseable → cannot evaluate → allow
  const toolName = input.tool_name || '';
  const ti = input.tool_input || {};

  // (a) google ban — scan the whole tool_input, every tool.
  const blob = JSON.stringify(ti).toLowerCase();
  for (const g of GOOGLE) if (blob.includes(g)) deny('google-banned reference "' + g + '" (owner decision b)');

  // (b) destructive shell + git push — Bash / PowerShell only.
  if (toolName === 'Bash' || toolName === 'PowerShell') {
    const cmd = ti.command || '';
    const d = isDestructive(cmd);
    if (d) deny('destructive command (' + d + ')');
    const g = checkGitPush(cmd);
    if (g) deny(g);
  }

  // (c) Write/Edit/NotebookEdit path policy.
  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'NotebookEdit') {
    const target = ti.file_path || ti.notebook_path;
    if (target) {
      const roots = [
        process.cwd(),
        path.join(process.env.USERPROFILE || 'C:/Users/nobody', '.claude'),
        path.join(process.env.LOCALAPPDATA || 'C:/nolocal', 'Temp', 'claude'),
      ];
      if (!roots.some(r => isInside(r, target)))
        deny('write outside the worktree / .claude / Temp\\claude: ' + target);
    }
  }

  // (d) network allowlist.
  if (toolName === 'Bash' || toolName === 'PowerShell' || toolName === 'WebFetch') {
    const n = checkNetwork(toolName, ti, ti.command || '');
    if (n) deny(n);
  }

  process.exit(0);
}

main().catch(() => process.exit(0)); // never hard-fail the session on an unexpected guard error
