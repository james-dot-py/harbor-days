// ledger.mjs — PostToolUse hook (AUTOPILOT.md §6.2 item 5).
// Read-modify-writes autopilot/session-state.json:
//   * Read tool           -> record the normalized file_path in `reads`.
//   * Bash/PowerShell that mentions shot.mjs / act.mjs / walkthrough.mjs
//                         -> record the invocation in `shots`.
//   * Write/Edit/NotebookEdit whose target is code (src/, tools/, autopilot/,
//     index.html, .claude/) -> stamp `lastCodeEdit` = now.
// MUST NEVER THROW: a broken ledger must not block tools. Everything is wrapped
// and the hook always exits 0.
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // autopilot/hooks
const AUTOPILOT = path.join(HERE, '..');
const ROOT = path.join(AUTOPILOT, '..');
const STATE = path.join(AUTOPILOT, 'session-state.json');

const norm = p => path.resolve(p).replace(/\\/g, '/').toLowerCase();
function isInside(parent, child) {
  const P = norm(parent), C = norm(child);
  if (C === P) return true;
  return C.startsWith(P.endsWith('/') ? P : P + '/');
}

function load() {
  try { return JSON.parse(readFileSync(STATE, 'utf8')); }
  catch { return { sessionStart: new Date().toISOString(), reads: [], shots: [], lastCodeEdit: null }; }
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw || '{}'); } catch { process.exit(0); }

  const state = load();
  if (!Array.isArray(state.reads)) state.reads = [];
  if (!Array.isArray(state.shots)) state.shots = [];

  const tool = input.tool_name || '';
  const ti = input.tool_input || {};

  if (tool === 'Read' && ti.file_path) {
    const n = norm(ti.file_path);
    if (!state.reads.includes(n)) state.reads.push(n);
  }

  if ((tool === 'Bash' || tool === 'PowerShell') && ti.command) {
    if (/\b(shot|act|walkthrough)\.mjs\b/.test(ti.command))
      state.shots.push({ cmd: ti.command, t: new Date().toISOString() });
  }

  if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
    const target = ti.file_path || ti.notebook_path;
    if (target) {
      const codeRoots = ['src', 'tools', 'autopilot', '.claude'].map(d => path.join(ROOT, d));
      const isIndex = norm(target) === norm(path.join(ROOT, 'index.html'));
      if (isIndex || codeRoots.some(r => isInside(r, target)))
        state.lastCodeEdit = new Date().toISOString();
    }
  }

  writeFileSync(STATE, JSON.stringify(state, null, 2));
  process.exit(0);
}

main().catch(() => process.exit(0)); // ledger errors must never block a tool
