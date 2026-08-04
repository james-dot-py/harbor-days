// tmp-130-nichols-winding.mjs — measure the ACTUAL triangle winding of every
// hand-built surface in src/millennium/nichols.js, on the LIVE rendered
// buffers (never a node-side mirror of the builder maths).
//
//   deck ribbon  : 6 tris per sample k — [0,1] top, [2,3] west fascia,
//                  [4,5] east fascia. Reported as a mean face normal in the
//                  deck-local frame (EY = deck-up, EZ = west) recovered from
//                  the triangle vertices themselves.
//   hull belly   : mean face normal vs the outward direction (centroid minus
//                  the section's deck-level axis point).
//   downward rays: Moller-Trumbore over the real position buffer, run twice —
//                  once honouring FrontSide backface culling exactly as
//                  THREE.Ray.intersectTriangle does (DdN < 0), once ignoring
//                  side. FrontSide hits << DoubleSide hits == the deck's walk
//                  face is a BACK face.
// Spawns its own vite (never the foreign 5173) and canary-checks the page.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('no port in 40s:\n' + buf)), 40000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + ')\n' + buf)));
});
const kill = () => process.platform === 'win32'
  ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();

const b = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'], protocolTimeout: 300000 });
try {
  const p = await b.newPage();
  const canary = [], errors = [];
  p.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canary.push(t); });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://localhost:${port}/?play=1&quiet=1&canary=nichwind`, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log('canary:', canary.join('|') || 'SILENT — DO NOT TRUST THIS RUN');
  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');

  const out = await p.evaluate(() => {
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const norm = u => { const l = Math.hypot(u[0], u[1], u[2]) || 1; return [u[0] / l, u[1] / l, u[2] / l]; };
    const tri = (pos, i) => [0, 1, 2].map(k => [pos.getX(i * 3 + k), pos.getY(i * 3 + k), pos.getZ(i * 3 + k)]);
    const fnorm = t => norm(cross(sub(t[1], t[0]), sub(t[2], t[0])));

    const dm = window.__hd.deckMeshes.find(d => d.id === 'mp-nichols-deck');
    if (!dm) return { err: 'no mp-nichols-deck tag' };
    const deck = dm.mesh;
    deck.updateWorldMatrix(true, false);
    const dpos = deck.geometry.attributes.position, nTri = dpos.count / 3;

    // --- deck: classify by the 6-tri repeat, express each normal in the local frame
    const groups = { top: [], westFascia: [], eastFascia: [] };
    const cls = ['top', 'top', 'westFascia', 'westFascia', 'eastFascia', 'eastFascia'];
    let upN = 0, downN = 0, flatN = 0;
    for (let i = 0; i < nTri; i++) {
      const t = tri(dpos, i), n = fnorm(t);
      if (n[1] > 0.5) upN++; else if (n[1] < -0.5) downN++; else flatN++;
      // local frame from the quad itself: EZ_hat = (west edge - east edge) of the top pair
      const k = Math.floor(i / 6);
      const top = tri(dpos, k * 6);                         // first top tri: Lw0,?,? — recover a frame
      const q = [tri(dpos, k * 6)[0], tri(dpos, k * 6)[1], tri(dpos, k * 6)[2]];
      // EX ~ along the ribbon = the longest edge of the top pair; EY ~ up-ish
      groups[cls[i % 6]].push({ n, y: n[1], k, q, _t: top });
    }
    const mean = arr => {
      const s = arr.reduce((a, g) => [a[0] + g.n[0], a[1] + g.n[1], a[2] + g.n[2]], [0, 0, 0]);
      return norm(s).map(v => +v.toFixed(3));
    };
    // outward test for the fascias: compare the fascia normal against the vector
    // from the deck centreline to the fascia (both recovered from the buffer).
    const fasOut = (name) => {
      let ok = 0, bad = 0;
      for (const g of groups[name]) {
        const kk = g.k;
        const topT = tri(dpos, kk * 6);                     // Lw0, Lw1, Le0 (post-fix) / Lw0, Le0, Lw1 (pre)
        const c = [(topT[0][0] + topT[1][0] + topT[2][0]) / 3, (topT[0][1] + topT[1][1] + topT[2][1]) / 3,
                   (topT[0][2] + topT[1][2] + topT[2][2]) / 3];
        const fT = tri(dpos, kk * 6 + (name === 'westFascia' ? 2 : 4));
        const fc = [(fT[0][0] + fT[1][0] + fT[2][0]) / 3, (fT[0][1] + fT[1][1] + fT[2][1]) / 3,
                    (fT[0][2] + fT[1][2] + fT[2][2]) / 3];
        const outward = norm([fc[0] - c[0], 0, fc[2] - c[2]]);
        (dot(g.n, outward) > 0 ? ok++ : bad++);
      }
      return { outward: ok, inward: bad };
    };

    // --- rays straight down the deck centreline, from the top-quad centroids
    const rayTri = (o, d, t, cull) => {                     // THREE.Ray.intersectTriangle, verbatim sign rules
      const e1 = sub(t[1], t[0]), e2 = sub(t[2], t[0]), N = cross(e1, e2);
      let DdN = dot(d, N), sign;
      if (DdN > 0) { if (cull) return null; sign = 1; }
      else if (DdN < 0) { sign = -1; DdN = -DdN; }
      else return null;
      const diff = sub(o, t[0]);
      const DdQxE2 = sign * dot(d, cross(diff, e2));
      if (DdQxE2 < 0) return null;
      const DdE1xQ = sign * dot(d, cross(e1, diff));
      if (DdE1xQ < 0) return null;
      if (DdQxE2 + DdE1xQ > DdN) return null;
      const QdN = -sign * dot(diff, N);
      if (QdN < 0) return null;
      return QdN / DdN;
    };
    const tris = [];
    for (let i = 0; i < nTri; i++) tris.push(tri(dpos, i));
    let front = 0, both = 0, shots = 0;
    const misses = [];
    for (let k = 0; k < nTri / 6; k++) {
      const t0 = tris[k * 6];
      const c = [(t0[0][0] + t0[1][0] + t0[2][0]) / 3, (t0[0][1] + t0[1][1] + t0[2][1]) / 3,
                 (t0[0][2] + t0[1][2] + t0[2][2]) / 3];
      const o = [c[0], c[1] + 3, c[2]], d = [0, -1, 0];
      shots++;
      let hitF = false, hitB = false;
      for (const t of tris) {
        if (rayTri(o, d, t, true) !== null) hitF = true;
        if (rayTri(o, d, t, false) !== null) hitB = true;
        if (hitF && hitB) break;
      }
      if (hitF) front++;
      if (hitB) both++; else misses.push([+c[0].toFixed(1), +c[2].toFixed(1)]);
    }

    // --- hull belly: find the cream self-lit DoubleSide mesh under the deck
    let hull = null;
    deck.parent.traverse(o => {
      if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0xe6e4dc
          && o.material.side === 2 && !hull) hull = o;
    });
    let hullRep = { found: false };
    if (hull) {
      const hp = hull.geometry.attributes.position, hn = hp.count / 3;
      // axis point per strip: the hull's own rim vertices sit at deck level; use
      // the mesh bbox centre in y as a crude interior reference, then test each
      // face normal against (centroid - interiorPoint).
      let outward = 0, inward = 0, sumY = 0;
      hull.geometry.computeBoundingBox();
      const bb = hull.geometry.boundingBox;
      for (let i = 0; i < hn; i++) {
        const t = tri(hp, i), n = fnorm(t);
        const c = [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3,
                   (t[0][2] + t[1][2] + t[2][2]) / 3];
        // interior ref: same (x,z) section but at the deck plane above the shell
        const ref = [c[0], c[1] + 1.0, c[2]];
        (dot(n, [c[0] - ref[0], c[1] - ref[1], c[2] - ref[2]]) > 0 ? outward++ : inward++);
        sumY += n[1];
      }
      hullRep = { found: true, tris: hn, downish_outward: outward, upish_inward: inward,
                  meanNy: +(sumY / hn).toFixed(3),
                  bbox: [bb.min.y, bb.max.y].map(v => +v.toFixed(2)) };
    }

    // --- closed-mesh handedness by the divergence theorem: sum (a . (b x c))/6
    // over every tri is the SIGNED volume. A bucket of closed boxes reads
    // +total volume when every box is wound outward; a mirrored (left-handed
    // makeBasis) box subtracts its own volume instead.
    const signedVol = (m) => {
      const q = m.geometry.attributes.position; let v = 0;
      for (let i = 0; i < q.count; i += 3) {
        const t = tri(q, i / 3);
        v += dot(t[0], cross(t[1], t[2])) / 6;
      }
      return +v.toFixed(2);
    };
    const silver = [];
    deck.parent.traverse(o => { if (o.isMesh && o.material && o.material.color
      && o.material.color.getHex() === 0x9aa0a6) silver.push({ tris: o.geometry.attributes.position.count / 3, vol: signedVol(o) }); });

    return {
      deckTris: nTri,
      silverBucketsSignedVolume: silver,
      deckSignedVolume: signedVol(deck),
      hullSignedVolume: hull ? signedVol(hull) : 'not found',
      normalsUp: upN, normalsDown: downN, normalsFlat: flatN,
      meanTopN: mean(groups.top), meanWestFasciaN: mean(groups.westFascia), meanEastFasciaN: mean(groups.eastFascia),
      westFascia: fasOut('westFascia'), eastFascia: fasOut('eastFascia'),
      rays: { shots, frontSideHits: front, doubleSideHits: both, missedEvenDoubleSide: misses.slice(0, 6) },
      hull: hullRep,
    };
  });
  console.log(JSON.stringify(out, null, 2));
} finally { await b.close(); kill(); }
