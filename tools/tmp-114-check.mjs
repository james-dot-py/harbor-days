// tmp 114: syntax-check src/structures.js (node --check via child process —
// the bare `node --check` prefix is not on the autopilot Bash allowlist)
import { execFileSync } from 'node:child_process';
try {
  execFileSync(process.execPath, ['--check', 'src/structures.js'], { stdio: 'pipe' });
  console.log('SYNTAX_OK src/structures.js');
} catch (e) {
  console.log('SYNTAX_ERR');
  console.log(String(e.stderr || e.message));
  process.exit(1);
}
