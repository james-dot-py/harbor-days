// tmp-129-b-attrib.mjs — EXACT draw-call attribution for the 129 reserve kit.
// For every draw unit that passes the frustum at a framing, split its vertices
// into "inside the reserve box" vs "outside". A unit with reserve vertices is
// MINE-BEARING; it only COSTS a draw if its non-reserve remainder would NOT
// have been in frustum on its own (i.e. the bucket is here only because my
// geometry joined it). InstancedMesh buckets are +0 by construction (129 only
// grows existing buckets, never allocates one).
// node tools/tmp-129-b-attrib.mjs <port>
import puppeteer from 'puppeteer';
const port = process.argv[2] || '5223';
const VIEWS = {
  lawnfill: 'play=1&x=164&z=-735&yaw=-2.6&pitch=0.1&dist=9',
  reserve: 'play=1&x=100&z=-769&yaw=-1.57&pitch=0.08&dist=8',
  exclosure: 'play=1&x=80&z=-776&yaw=-2.88&pitch=0.08&dist=7',
  overlook: 'play=1&x=56&z=-779&yaw=2.11&pitch=0.14&dist=8',
  gateE: 'play=1&x=160&z=-758&yaw=-2.3&pitch=0.06&dist=6',
};
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 720 });
for (const [name, q] of Object.entries(VIEWS)) {
  await p.goto(`http://localhost:${port}/?${q}&canary=attrib129`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise(r => setTimeout(r, 4200));
  const res = await p.evaluate(() => {
    const THREE = window.__hd.THREE;
    const cam = window.__hd.camera;
    cam.updateMatrixWorld();
    const fr = new THREE.Frustum(), M = new THREE.Matrix4(), S = new THREE.Sphere();
    fr.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const BOX = { x0: 28, x1: 176, z0: -840, z1: -634 };            // reserve + margin
    const rows = [], v = new THREE.Vector3();
    let total = 0, mine = 0;
    window.__hd.scene.traverseVisible(o => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      const g = o.geometry;
      if (o.frustumCulled && g) {
        if (!g.boundingSphere) g.computeBoundingSphere();
        S.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
        if (!fr.intersectsSphere(S)) return;
      }
      total++;
      if (o.isInstancedMesh || !g || !g.attributes.position) return;  // instanced = grown in place, +0
      const pos = g.attributes.position;
      let inN = 0, ox0 = Infinity, ox1 = -Infinity, oy0 = Infinity, oy1 = -Infinity, oz0 = Infinity, oz1 = -Infinity, outN = 0;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (v.x >= BOX.x0 && v.x <= BOX.x1 && v.z >= BOX.z0 && v.z <= BOX.z1) { inN++; continue; }
        outN++;
        if (v.x < ox0) ox0 = v.x; if (v.x > ox1) ox1 = v.x;
        if (v.y < oy0) oy0 = v.y; if (v.y > oy1) oy1 = v.y;
        if (v.z < oz0) oz0 = v.z; if (v.z > oz1) oz1 = v.z;
      }
      if (!inN) return;
      let remainderVisible = false;
      if (outN) {
        const bb = new THREE.Box3(new THREE.Vector3(ox0, oy0, oz0), new THREE.Vector3(ox1, oy1, oz1));
        remainderVisible = fr.intersectsBox(bb);
      }
      const hex = o.material && o.material.color ? '#' + o.material.color.getHexString() : '?';
      rows.push({ hex, map: !!(o.material && o.material.map), inN, outN, remainderVisible, cost: remainderVisible ? 0 : 1 });
      if (!remainderVisible) mine++;
    });
    return { total, mine, rows };
  });
  console.log(`\n=== ${name}: ${res.total} draw units · 129-attributable ${res.mine}`);
  for (const r of res.rows) console.log(`  cost ${r.cost}  ${r.hex}${r.map ? '+map' : ''}  in=${r.inN} out=${r.outN} remainderInFrustum=${r.remainderVisible}`);
}
await b.close();
