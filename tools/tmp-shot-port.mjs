// tmp: shot.mjs wrapper taking the port as a CLI arg (env-var prefixes are
// blocked by the Bash allowlist — PITFALLS/memory; serve.mjs owns the vite).
// Usage: node tools/tmp-shot-port.mjs <name> <query> <waitMs> <port>
import { shot } from './shot.mjs';
const [name, query, waitMs, port] = process.argv.slice(2);
const r = await shot({ name, query, waitMs: +waitMs || 3500, port: +port || 5173 });
console.log(JSON.stringify({ png: r.png ?? null, errors: r.errors, canary: r.canary, started: r.started }, null, 1));
process.exit(r.errors && r.errors.length ? 1 : 0);
