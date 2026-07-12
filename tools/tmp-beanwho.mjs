// tmp (062): name every visible one-off draw in the mp-bean-f3 frustum.
// Lists non-instanced visible meshes with their group chain, geometry type,
// material kind/color/map, world position and camera distance — the shave list.
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', '5217', '--strictPort'], { cwd: root });
const port = await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { const m = d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/); if (m) { clearTimeout(to); res(+m[1]); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=82&z=790&yaw=0.72&pitch=0.06&dist=8.5`, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 2600));
const rows = await page.evaluate(() => {
  const hd = window.__hd;
  const scene = hd.scene, camera = hd.camera;
  if (!scene || !camera) return { err: 'no scene/camera on __hd', keys: Object.keys(hd) };
  const THREEm = { Frustum: null };
  // build frustum via matrices (no THREE import): plane test replicated cheaply
  // — instead use the renderer's own logic indirectly: approximate with dot
  // tests is messy; simpler: list ALL visible one-off meshes with distance,
  // and let the reader ignore behind-camera ones by bearing.
  const e = camera.matrixWorld.elements;
  const cam = { x: e[12], y: e[13], z: e[14] };
  // clip-space frustum test on the bounding-sphere center (radius as margin)
  const P = camera.projectionMatrix.elements, V = camera.matrixWorldInverse.elements;
  const mul = (M, x, y, z, w) => [
    M[0] * x + M[4] * y + M[8] * z + M[12] * w,
    M[1] * x + M[5] * y + M[9] * z + M[13] * w,
    M[2] * x + M[6] * y + M[10] * z + M[14] * w,
    M[3] * x + M[7] * y + M[11] * z + M[15] * w];
  const inFrustum = (x, y, z, r) => {
    const v = mul(V, x, y, z, 1), c = mul(P, v[0], v[1], v[2], v[3]);
    const w = c[3] + r * 2;
    return c[0] >= -w && c[0] <= w && c[1] >= -w && c[1] <= w && c[2] >= -w && c[2] <= w;
  };
  const out = [];
  scene.traverse(o => {
    if (!(o.isMesh || o.isPoints)) return;
    if (o.isInstancedMesh) return;
    if (!o.visible) return;
    for (let p = o.parent; p; p = p.parent) if (!p.visible) return;
    const chain = [];
    for (let p = o; p; p = p.parent) if (p.name) chain.unshift(p.name);
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m) return;
    const g0 = o.geometry;
    if (g0 && !g0.boundingSphere && g0.attributes && g0.attributes.position) g0.computeBoundingSphere();
    const bs = g0 && g0.boundingSphere;
    let pos = { x: o.matrixWorld.elements[12], y: o.matrixWorld.elements[13], z: o.matrixWorld.elements[14] };
    let rad = 1;
    if (bs) {
      const c = bs.center, me = o.matrixWorld.elements;
      pos = { x: me[0] * c.x + me[4] * c.y + me[8] * c.z + me[12],
              y: me[1] * c.x + me[5] * c.y + me[9] * c.z + me[13],
              z: me[2] * c.x + me[6] * c.y + me[10] * c.z + me[14] };
      rad = bs.radius * o.matrixWorld.getMaxScaleOnAxis();
    }
    if (o.frustumCulled !== false && !inFrustum(pos.x, pos.y, pos.z, rad)) return;
    const dx = pos.x - cam.x, dy = pos.y - cam.y, dz = pos.z - cam.z;
    const dist = Math.hypot(dx, dy, dz);
    out.push({
      chain: chain.join('/') || '(unnamed)',
      geo: o.geometry.type,
      mat: (m.isMeshBasicMaterial ? 'basic' : m.isMeshToonMaterial ? 'toon' : m.type) +
           (m.color ? ' #' + m.color.getHexString() : '') + (m.map ? ' +map' : '') +
           (m.vertexColors ? ' vcol' : ''),
      pos: [Math.round(pos.x), Math.round(pos.y), Math.round(pos.z)],
      dist: Math.round(dist),
      verts: o.geometry.attributes && o.geometry.attributes.position ? o.geometry.attributes.position.count : 0,
    });
  });
  out.sort((a, b) => a.chain.localeCompare(b.chain) || a.dist - b.dist);
  return { out };
});
if (rows.err) console.log('ERR', rows.err, rows.keys);
else {
  // only the interesting ones: skip chibi rigs (known cost) — print the rest
  let chibi = 0;
  for (const r of rows.out) {
    if (r.chain.includes('chibi')) { chibi++; continue; }
    console.log(`${r.chain} | ${r.geo} | ${r.mat} | pos ${r.pos} | d${r.dist} | v${r.verts}`);
  }
  console.log(`(+ ${chibi} chibi-rig meshes suppressed)`);
}
await browser.close();
process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();
