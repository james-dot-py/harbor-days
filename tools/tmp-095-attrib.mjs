// tmp (095): per-MESH attribution at sanctuary-deck-f2 — like tmp-090-census
// but dumps every drawn mesh's world position + parent chain so the long tail
// can be pinned to actual content (birds vs birders vs props).
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite silent:\n' + buf)), 30000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.on('exit', c => rej(new Error('vite exited ' + c)));
});
const killVite = () => { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
console.log('vite on ' + port);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const canaries = [];
  page.on('console', m => { if (m.text().startsWith('[canary]')) canaries.push(m.text()); });
  await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=att095&x=171&z=-396.25&yaw=-0.99&pitch=0.36&dist=9`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(s => setTimeout(s, 3500));
  if (!canaries.some(c => c.includes('att095'))) { console.error('CANARY FAILED'); killVite(); process.exit(2); }
  const r = await page.evaluate(() => {
    const { scene, camera, THREE } = window.__hd;
    camera.updateMatrixWorld();
    const fr = new THREE.Frustum(), M = new THREE.Matrix4(), S = new THREE.Sphere();
    fr.setFromProjectionMatrix(M.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const rows = []; let total = 0;
    const v = new THREE.Vector3();
    scene.traverseVisible(o => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      if (o.frustumCulled && !o.isInstancedMesh) {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        S.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
        if (!fr.intersectsSphere(S)) return;
      }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      total += mats.length;
      const chain = [];
      for (let p = o; p; p = p.parent) if (p.name) chain.push(p.name);
      o.getWorldPosition(v);
      const col = mats[0] && mats[0].color ? '#' + mats[0].color.getHexString() : (mats[0] ? mats[0].type : '?');
      // root group anchor: walk to the topmost non-scene ancestor for clustering
      let root = o; while (root.parent && root.parent.type !== 'Scene') root = root.parent;
      const rp = new THREE.Vector3(); root.getWorldPosition(rp);
      rows.push({
        n: mats.length,
        chain: chain.join('/') || '(unnamed)',
        geo: o.geometry ? o.geometry.type : o.type,
        col,
        inst: o.isInstancedMesh ? o.count : 0,
        x: Math.round(v.x * 10) / 10, y: Math.round(v.y * 100) / 100, z: Math.round(v.z * 10) / 10,
        rx: Math.round(rp.x * 10) / 10, rz: Math.round(rp.z * 10) / 10,
      });
    });
    return { total, rows };
  });
  console.log('total', r.total);
  const oneoffs = r.rows.filter(m => !m.inst);
  const inst = r.rows.filter(m => m.inst);
  // cluster one-offs by root-group anchor (0.5m grid)
  const clusters = {};
  for (const m of oneoffs) {
    const k = `(${m.rx},${m.rz})`;
    (clusters[k] = clusters[k] || { n: 0, kinds: {}, samples: [] }).n += m.n;
    const kk = m.geo + ' ' + m.col + (m.chain !== '(unnamed)' ? ' [' + m.chain + ']' : '');
    clusters[k].kinds[kk] = (clusters[k].kinds[kk] || 0) + m.n;
  }
  console.log('--- ONE-OFF clusters by root anchor (' + oneoffs.reduce((a, m) => a + m.n, 0) + ' draws) ---');
  for (const [k, c] of Object.entries(clusters).sort((a, b) => b[1].n - a[1].n)) {
    console.log(String(c.n).padStart(4), k, Object.entries(c.kinds).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([kk, n]) => `${n}x ${kk}`).join('; '));
  }
  console.log('--- INSTANCED (' + inst.reduce((a, m) => a + m.n, 0) + ' draws) ---');
  const tally = {};
  for (const m of inst) { const k = m.chain + ' | ' + m.geo + ' ' + m.col; tally[k] = (tally[k] || 0) + m.n; }
  for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(String(n).padStart(4), k);
} finally { killVite(); await browser.close(); }
