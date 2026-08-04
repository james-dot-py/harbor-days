// tmp-129-b-probe.mjs — is the deck scope actually in the scene, and where?
// node tools/tmp-129-b-probe.mjs <port>
import puppeteer from 'puppeteer';
const port = process.argv[2] || '5223';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 720 });
await p.goto(`http://localhost:${port}/?play=1&quiet=1&canary=probe129`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 3500));
const out = await p.evaluate(() => {
  const hits = [];
  window.__hd.scene.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry; if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox.clone().applyMatrix4(o.matrixWorld);
    // anything whose box overlaps the platform column
    if (bb.max.x < 52 || bb.min.x > 60 || bb.max.z < -783 || bb.min.z > -772) return;
    hits.push({
      name: o.name || (o.isInstancedMesh ? 'INST' : ''),
      hex: o.material && o.material.color ? '0x' + o.material.color.getHexString() : '?',
      inst: !!o.isInstancedMesh,
      box: [bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].map(v => +v.toFixed(2)),
      verts: g.attributes.position.count,
    });
  });
  const dm = (window.__hd.deckMeshes || []).map(d => d.id);
  return { hits, deckTags: dm.filter(i => i.startsWith('reserve')) };
});
for (const h of out.hits) console.log(h.hex, h.inst ? 'INST' : '    ', 'v' + h.verts, JSON.stringify(h.box), h.name);
console.log('deck tags:', out.deckTags.join(', '));
await b.close();
