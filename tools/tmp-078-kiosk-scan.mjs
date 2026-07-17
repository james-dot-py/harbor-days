// tmp (078): scan the live scene (port from arg, default 5301 — a server already
// serving THIS checkout) for scenery near the kiosk site: tree/prop InstancedMesh
// instance positions + any regular meshes with a position in the region, so the
// kiosk drops into a verified gap. Usage: node tools/tmp-078-kiosk-scan.mjs [port]
import puppeteer from 'puppeteer';
const port = +(process.argv[2] || 5301);
const canary = 'scan' + Math.floor(Math.random() * 1e6);
const browser = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'] });
const page = await browser.newPage();
const canaries = [];
page.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canaries.push(t); });
await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.scene, { timeout: 15000 });
console.log('canary echoed:', canaries.some(c => c.includes(canary)));

const region = await page.evaluate(() => {
  const THREE = window.__hd.THREE, scene = window.__hd.scene;
  const inX = (x) => x >= 92 && x <= 114, inZ = (z) => z >= -360 && z <= -347;
  const hits = [];
  const m = new THREE.Matrix4(), v = new THREE.Vector3();
  scene.traverse(o => {
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m); v.setFromMatrixPosition(m);
        if (inX(v.x) && inZ(v.z)) hits.push({ t: 'inst', name: o.name || (o.geometry && o.geometry.type) || '?', x: +v.x.toFixed(1), z: +v.z.toFixed(1), y: +v.y.toFixed(1) });
      }
    } else if (o.isMesh) {
      o.getWorldPosition(v);
      if (inX(v.x) && inZ(v.z)) hits.push({ t: 'mesh', name: o.name || (o.geometry && o.geometry.type) || '?', x: +v.x.toFixed(1), z: +v.z.toFixed(1), y: +v.y.toFixed(1) });
    }
  });
  return hits;
});
// filter noise: keep things that are near ground (y 0..5) and not giant planes
const notable = region.filter(h => h.y >= -0.5 && h.y <= 6 && !/Plane/.test(h.name));
notable.sort((a, b) => a.x - b.x || a.z - b.z);
console.log('scenery in x92..114 z-360..-347 (y -0.5..6):');
for (const h of notable) console.log(' ', JSON.stringify(h));
console.log('(total notable:', notable.length, 'of', region.length, 'raw)');
await browser.close();
process.exit(0);
