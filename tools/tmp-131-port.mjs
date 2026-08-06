// tmp (131): probe localhost ports for live servers after the walkthrough's
// vite was orphaned (EBUSY crash skipped killVite). Prints status per port.
const ports = process.argv.slice(2).map(Number);
for (const p of ports.length ? ports : [5173, 5174, 5243, 5271]) {
  try {
    const r = await fetch(`http://localhost:${p}/`, { signal: AbortSignal.timeout(2500) });
    const text = await r.text();
    const title = (text.match(/<title>([^<]*)<\/title>/i) || [])[1] || '(no title)';
    console.log(`${p}: HTTP ${r.status} · title "${title}" · ${text.length}b`);
  } catch (e) {
    console.log(`${p}: no server (${e.cause?.code || e.name})`);
  }
}
