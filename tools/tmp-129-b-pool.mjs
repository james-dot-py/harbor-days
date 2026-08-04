// tmp-129-b-pool.mjs — which toon colors already live in the STATIC merge pool
// near the reserve (lakefront cell, z-band floor(z/240) = -4 and -3)?
// node tools/tmp-129-b-pool.mjs <port>
import puppeteer from 'puppeteer';
const port = process.argv[2] || '5223';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 720 });
await p.goto(`http://localhost:${port}/?play=1&quiet=1&canary=pool129`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 3500));
const rows = await p.evaluate(() => {
  const out = [];
  const chibi = o => { for (let q = o; q; q = q.parent) if (q.name === 'chibi' || (q.userData && q.userData.live)) return true; return false; };
  window.__hd.scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !o.material) return;
    if (chibi(o) || (o.name || '').startsWith('chibi')) return;
    const g = o.geometry; if (!g) return;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const c = g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld);
    const band = Math.floor(c.z / 240);
    if (band !== -4 && band !== -3) return;
    if (g.attributes.color) return;                       // vertex-colored rigs
    out.push({
      band,
      hex: o.material.color ? '0x' + o.material.color.getHexString() : 'none',
      type: o.material.type + (o.material.map ? '+map' : ''),
      x: Math.round(c.x), z: Math.round(c.z),
      r: Math.round(g.boundingSphere.radius),
      name: o.name || '',
    });
  });
  return out;
});
rows.sort((a, b2) => a.band - b2.band || a.hex.localeCompare(b2.hex) || a.z - b2.z);
for (const r of rows) console.log(`band ${r.band}  ${r.hex}  ${r.type}  (${r.x},${r.z}) r${r.r}  ${r.name}`);
console.log('--- total', rows.length);
await b.close();
