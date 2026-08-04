// tmp-129-b-weld.mjs — measure the 129 reserve ribbon ENDPOINTS against the
// DRAWN Montrose trail lanes (never a node-side curve mirror): does each cap
// land ON the trail ribbon, or short of it?
// node tools/tmp-129-b-weld.mjs <port>
import puppeteer from 'puppeteer';
const port = process.argv[2] || '5223';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 720 });
await p.goto(`http://localhost:${port}/?play=1&quiet=1&canary=weld129`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 3500));
const out = await p.evaluate(() => {
  const lanes = window.__hd.propAudit().lanes;
  const seg = (px, pz, ax, az, bx, bz) => {
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
    let u = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
    const cx = ax + u * dx, cz = az + u * dz;
    return { d: Math.hypot(px - cx, pz - cz), cx, cz };
  };
  // classify lanes by width + a probe point so we can name them
  const near = (px, pz) => {
    const rows = [];
    lanes.forEach((lane, i) => {
      let best = null;
      for (let k = 0; k < lane.pts.length - 1; k++) {
        const r = seg(px, pz, lane.pts[k][0], lane.pts[k][1], lane.pts[k + 1][0], lane.pts[k + 1][1]);
        if (!best || r.d < best.d) best = r;
      }
      if (best && best.d < 12) rows.push({ i, w: lane.w, d: +best.d.toFixed(3), on: best.d <= lane.w / 2, at: [+best.cx.toFixed(1), +best.cz.toFixed(1)], n: lane.pts.length });
    });
    rows.sort((a, b2) => a.d - b2.d);
    return rows;
  };
  return {
    lanes: lanes.length,
    corridorEast: near(163, -764),
    spurSouth: near(150.5, -639.3),
    corridorWest: near(16, -771),
  };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
