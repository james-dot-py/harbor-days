// TEMP audit (task 097 / issue-025 arch-trap class): the COLLIDER-RING trap audit.
// The engine (src/main.js 282-302) pushes the player OUT of every collider to
// radius R = c.r + 0.34. Since 097 the push is WALK-GATED (it never lands the
// player on blocked ground — the ring-wedge guard); this sim mirrors that. A
// collider whose ring reaches non-walkable ground can PIN the player against a
// walk seam (hard freeze on the lakefront, which has NO crawl; hard cells crawl
// out but the data should still be fixed). This tool:
//   1. dumps the LIVE global collider list (__hd.propAudit) from a real page load,
//   2. builds node-side walk mirrors per region (shared-data law: import, never
//      re-derive),
//   3. ring-screens every collider (64 angles, y-gated) for candidate offenders,
//   4. movement-gate SIMULATES each candidate to CONFIRM real traps,
//   5. writes tools/tmp/097-collider-report.json + prints a summary.
// Report only. Usage: node tools/tmp-097-colliders.mjs
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

// ===== node-side walk mirrors — walkprobe.mjs prelude (lines 1-76), verbatim =====
import * as CH from '../src/data/chicago.js';
import * as WV from '../src/data/wrigleyville.js';
import * as MP from '../src/data/millennium.js';
import * as WB from '../src/data/wrigley-bowl.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
function pip(px,pz,poly){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],zi=poly[i][1],xj=poly[j][0],zj=poly[j][1];if(((zi>pz)!==(zj>pz))&&(px<(xj-xi)*(pz-zi)/(zj-zi)+xi))ins=!ins}return ins}
function genCoast(z0,z1,fx){const C=[];for(let z=z0;z>=z1;z-=3)C.push([fx(z),z]);return C}

const COAST_MAIN=genCoast(CH.COAST_MAIN_PARAMS.z0,CH.COAST_MAIN_PARAMS.z1,CH.COAST_MAIN_PARAMS.fx);
const COAST_PEN =genCoast(CH.COAST_PEN_PARAMS.z0,CH.COAST_PEN_PARAMS.z1,CH.COAST_PEN_PARAMS.fx);
const COAST_GOLF=genCoast(CH.COAST_GOLF_PARAMS.z0,CH.COAST_GOLF_PARAMS.z1,CH.COAST_GOLF_PARAMS.fx);
const COAST_MOUTH=genCoast(CH.COAST_MOUTH_PARAMS.z0,CH.COAST_MOUTH_PARAMS.z1,CH.COAST_MOUTH_PARAMS.fx);
const COAST_CORNER=genCoast(CH.COAST_CORNER_PARAMS.z0,CH.COAST_CORNER_PARAMS.z1,CH.COAST_CORNER_PARAMS.fx);
const BASIN_W=[];for(let z=CH.BASIN_W_PARAMS.z0;z>=CH.BASIN_W_PARAMS.z1;z-=CH.BASIN_W_PARAMS.step)BASIN_W.push([CH.BASIN_W_PARAMS.fx(z),z]);
const COAST_BAY=CH.COAST_BAY_PTS;
const COAST_MTR_HARBOR=CH.COAST_MTR_HARBOR_PTS;
const COAST_MTR_POINT =CH.COAST_MTR_POINT_PTS;
const COAST_MTR_BEACH =genCoast(CH.COAST_MTR_BEACH_PARAMS.z0, CH.COAST_MTR_BEACH_PARAMS.z1, CH.COAST_MTR_BEACH_PARAMS.fx);
const COAST_MTR_CLOSE =CH.COAST_MTR_CLOSE_PTS;
const COAST_MTR_MOUTH =CH.MTR_HARBOR_MOUTH;
const COAST_MTR_HOOKTIP=CH.MTR_HOOK_TIP;
const COAST_MTR=[COAST_BAY,COAST_MTR_HARBOR,COAST_MTR_POINT,COAST_MTR_BEACH,COAST_MTR_CLOSE,COAST_MTR_MOUTH,COAST_MTR_HOOKTIP,COAST_GOLF];
const LAND=CH.buildLAND({COAST_CORNER,COAST_MAIN,COAST_PEN,COAST_GOLF,COAST_MOUTH,BASIN_W,
  COAST_BAY,COAST_MTR_HARBOR,COAST_MTR_POINT,COAST_MTR_BEACH,COAST_MTR_CLOSE});
const P_START=COAST_PEN[0];
const COAST_TIP=CH.peninsulaTipLine(P_START);

function buildSegs(pts){const segs=[];for(let i=0;i<pts.length-1;i++){const ax=pts[i][0],az=pts[i][1],bx=pts[i+1][0],bz=pts[i+1][1];const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);const tx=dx/len,tz=dz/len;segs.push({ax,az,tx,tz,nx:-tz,nz:tx,len})}return segs}
const COAST_SEGS=[buildSegs(COAST_MAIN),buildSegs(COAST_PEN),buildSegs(COAST_GOLF),buildSegs(COAST_MOUTH),buildSegs(COAST_CORNER)];
const TIP_SEGS=buildSegs(COAST_TIP);
const MTR_SEGS=COAST_MTR.map(buildSegs);
const QUERY_SEGS=[...COAST_SEGS.filter((_,i)=>i!==2),TIP_SEGS,...MTR_SEGS.filter((_,i)=>i!==3)];
function tierProfile(zc){const R=CH.TIER_ROCKS;if(zc>R.zMin&&zc<R.zMax){if(zc>R.cornerZ0){const f=clamp((zc-R.cornerZ0)/(R.cornerZ1-R.cornerZ0),0,1);const w=R.w.slice();w[w.length-1]=R.w[w.length-1]+(R.cornerPromW-R.w[w.length-1])*f;return{w,step:R.step}}return{w:R.w,step:R.step}}return{w:CH.TIER_DEFAULT.w,step:CH.TIER_DEFAULT.step}}
function profileTotal(zc){const p=tierProfile(zc);let s=0;for(const w of p.w)s+=w;return s}
function inPierChannel(x,z){const P=CH.PIER_CHANNEL;if(!P)return false;if(x<P.x0||x>P.x1||z>P.zMax)return false;const topZ=P.topZ0+(P.topZ1-P.topZ0)*(x-P.x0)/(P.x1-P.x0);return z>=topZ}
function coastQuery(x,z){let best=null,bd2=1e9;for(const C of QUERY_SEGS)for(const s of C){const px=x-s.ax,pz=z-s.az;let t=px*s.tx+pz*s.tz;t=clamp(t,0,s.len);const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;const ddx=x-cx,ddz=z-cz,d2=ddx*ddx+ddz*ddz;if(d2<bd2){bd2=d2;best={lat:ddx*s.nx+ddz*s.nz,d2,z:cz}}}if(!best)return null;best.ae=Math.sqrt(Math.max(0,best.d2-best.lat*best.lat));if(inPierChannel(x,z))best.lat=1e3;return best}
function tierAt(lat,zc){const p=tierProfile(zc);let acc=0;for(let i=0;i<p.w.length;i++){acc+=p.w[i];if(lat<=acc)return{h:-i*p.step,i,edge:acc}}return null}
function beachH(x,z){const b=CH.DOG_BEACH.bounds,s=CH.DOG_BEACH.slope;if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1){const t=clamp((z-s.ref)/s.span,0,1);return s.depth*smooth(t)}return CH.montroseBeachH(x,z)}

const walkRects=[];
for(const zc of CH.FINGER_DOCKS.rows)walkRects.push({x1:CH.FINGER_DOCKS.x0,x2:CH.FINGER_DOCKS.x0+CH.FINGER_DOCKS.len,z1:zc-CH.FINGER_DOCKS.halfW,z2:zc+CH.FINGER_DOCKS.halfW});
for(const d of CH.DECKS)walkRects.push(d.walk);
{ const D=CH.SANCTUARY.deck;
  walkRects.push({x1:D.x0,x2:D.x1,z1:D.z0,z2:D.z1,h:D.h});
  for(const st of D.stairs)walkRects.push({x1:st.x0,x2:st.x1,z1:st.z0,z2:st.z1,h:st.h}); }
{ const B=CH.DIVERSEY.bays.deckRect;
  walkRects.push({x1:B.x0,x2:B.x1,z1:B.z0,z2:B.z1,h:B.h}); }
{ const D=CH.THE_DOCK.deckRect;
  walkRects.push({x1:D.x0,x2:D.x1,z1:D.z0,z2:D.z1,h:CH.THE_DOCK.deckY}); }
function onRect(x,z){for(const r of walkRects)if(x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2)return r;return null}

function walkable(x,z){
  if(onRect(x,z))return true;
  if(CH.beachCarved(x,z))return false;
  const bh=beachH(x,z);if(bh!==null)return CH.beachWalkable(x,z);
  if(pip(x,z,LAND))return true;
  const q=coastQuery(x,z);
  if(q&&q.ae<0.9&&q.lat>-0.6){const t=tierAt(q.lat,q.z);if(t&&q.lat<profileTotal(q.z)-0.3)return true;}
  return false;
}
function surfaceY(x,z){
  const r=onRect(x,z);if(r)return r.h;
  const hh=CH.cricketHillH(x,z);if(hh!==null)return hh;
  const bh=beachH(x,z);if(bh!==null)return bh;
  const q=coastQuery(x,z);
  if(q&&q.ae<1.2&&q.lat>0.15){const t=tierAt(q.lat,q.z);if(t)return t.h}
  return 0;
}
// ===== end walkprobe prelude =====

// isWater mirror (src/main.js line 140), lakefront branch only (cellWalk() is null
// on the lakefront, so the !cellWalk() guard is always true here):
function isWater(x,z){return x>20 && !pip(x,z,LAND) && !onRect(x,z) && beachH(x,z)===null;}

// ---- region routing (coordinate-disjoint clamps; route by collider position) ----
const inRect=(x,z,r)=>x>=r.xMin&&x<=r.xMax&&z>=r.zMin&&z<=r.zMax;
const L_CAR_CLAMP={xMin:-250-1.8,xMax:-250+1.8,zMin:-650-6.3,zMax:-650+6.3};   // L-car pocket clamp
const carWalkable=(x,z)=>Math.abs(x-(-250))<1.7 && Math.abs(z-(-650))<6.4;
const carSurfaceY=()=>0.25;
const noWater=()=>false;
const REG={
  lakefront:   {name:'lakefront',    walkable,          surfaceY,          isWater,  lakefront:true },
  wrigleyville:{name:'wrigleyville', walkable:WV.walkableW, surfaceY:WV.surfaceYW, isWater:noWater, lakefront:false},
  bowl:        {name:'bowl',         walkable:WB.walkableB, surfaceY:WB.surfaceYB, isWater:noWater, lakefront:false},
  millennium:  {name:'millennium',   walkable:MP.walkableM, surfaceY:MP.surfaceYM, isWater:noWater, lakefront:false},
  car:         {name:'car',          walkable:carWalkable,  surfaceY:carSurfaceY,  isWater:noWater, lakefront:false},
};
function regionFor(x,z){
  if(inRect(x,z,WV.CLAMP_W))      return REG.wrigleyville;
  if(inRect(x,z,WB.CLAMP_B))      return REG.bowl;
  if(inRect(x,z,MP.CLAMP_FULL_M)) return REG.millennium;
  if(inRect(x,z,L_CAR_CLAMP))     return REG.car;
  return REG.lakefront;
}
const canMove=(x,z,reg)=>reg.walkable(x,z) || (reg.lakefront && reg.isWater(x,z));

const ESC8=[[1,0],[0.7071,0.7071],[0,1],[-0.7071,0.7071],[-1,0],[-0.7071,-0.7071],[0,-1],[0.7071,-0.7071]];
function rot(vx,vz,deg){const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [vx*c-vz*s, vx*s+vz*c];}

// ---- STEP 4: movement-gate sim (mirror main.js: axis-split slide + push-out of
//      ALL colliders within reach, y-gated). NO crawl (we want the raw trap even
//      in hard cells). ----
function simTrap(startX,startZ, inX,inZ, reg, colliders){
  const il=Math.hypot(inX,inZ)||1, ix=inX/il, iz=inZ/il;
  const p={x:startX,z:startZ}; const dt=1/60, spd=4.2;
  for(let f=0;f<240;f++){
    const vx=ix*spd, vz=iz*spd;
    const nx=p.x+vx*dt; if(canMove(nx,p.z,reg)) p.x=nx;
    const nz=p.z+vz*dt; if(canMove(p.x,nz,reg)) p.z=nz;
    const py=reg.surfaceY(p.x,p.z);
    for(const c of colliders){
      const ddx=p.x-c.x, ddz=p.z-c.z, dc=Math.hypot(ddx,ddz);
      if(dc>6+c.r) continue;                     // only colliders within 6 m of the sim
      if(c.h!==-1 && py>c.h) continue;           // y-gate (h:-1 = Infinity, never skipped)
      const R=c.r+0.34, d2=ddx*ddx+ddz*ddz;
      // 097 ring-wedge guard (mirror of main.js): the push is STEP-CLAMPED
      // (min(penetration, 0.3)) and applies only when the pushed-to point is
      // walkable/water — never onto blocked ground.
      if(d2<R*R && d2>1e-6){const d=Math.sqrt(d2), k=Math.min(R-d,0.3),
        qx=p.x+ddx/d*k, qz=p.z+ddz/d*k;
        if(canMove(qx,qz,reg)){p.x=qx; p.z=qz;}}
    }
  }
  const cur=canMove(p.x,p.z,reg);
  let openMicro=0;
  for(const [dx,dz] of ESC8) if(canMove(p.x+dx*0.07,p.z+dz*0.07,reg)) openMicro++;
  const trapped = !cur && openMicro===0;
  return {trapped, end:[+p.x.toFixed(2),+p.z.toFixed(2)], inputDir:[+ix.toFixed(3),+iz.toFixed(3)]};
}

(async()=>{
  // ===== STEP 1: dump the live collider list =====
  const here = dirname(fileURLToPath(import.meta.url));
  const port = 5302;
  const vite = spawn(process.execPath,
    [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
    { cwd: join(here, '..') });
  await new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
    vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
    vite.stderr.on('data', d => process.stderr.write(d));
  });
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = []; let sawCanary = false;
  const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] col097')) sawCanary = true; });

  await page.goto(`http://localhost:${port}/?play=1&canary=col097`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await new Promise(r => setTimeout(r, 1200));

  const dump = await page.evaluate(() => (window.__hd && window.__hd.propAudit) ? window.__hd.propAudit().colliders : null);

  await browser.close(); vite.kill();

  if (!sawCanary) { console.log('CANARY MISSING — wrong server? Aborting.'); process.exit(2); }
  if (!dump || !Array.isArray(dump)) { console.log('propAudit().colliders unavailable — aborting.'); process.exit(2); }
  if (dump.length === 0) { console.log('0 colliders — canary/wrong-server trap. Aborting.'); process.exit(2); }
  if (errors.length) console.log('PAGE ERRORS (non-fatal):\n' + errors.join('\n'));

  const colliders = dump.map(c => ({ x:c.x, z:c.z, r:c.r, h:c.h }));
  writeFileSync(join(here, 'tmp', '097-colliders.json'), JSON.stringify(colliders));
  console.log(`STEP 1: dumped ${colliders.length} colliders -> tools/tmp/097-colliders.json`);

  // census: colliders routed to each region (confirms routing / coverage)
  const collidersPerRegion={};
  for(const c of colliders){const rn=regionFor(c.x,c.z).name; collidersPerRegion[rn]=(collidersPerRegion[rn]||0)+1;}
  console.log('  colliders per region: ' + Object.entries(collidersPerRegion).map(([k,v])=>`${k}=${v}`).join('  '));

  // ===== STEP 3: ring screen =====
  const N=64, TWO_PI=Math.PI*2;
  const candidates=[];
  for(const c of colliders){
    const reg=regionFor(c.x,c.z);
    const R=c.r+0.34;
    const cls=new Array(N);              // 'O' open, 'W' water, 'B' blocked, 'S' safe (y-gated inert)
    let open=0, water=0, blocked=0, safe=0;
    for(let a=0;a<N;a++){
      const th=a/N*TWO_PI, px=c.x+R*Math.cos(th), pz=c.z+R*Math.sin(th);
      if(reg.walkable(px,pz)){ cls[a]='O'; open++; }
      else if(reg.lakefront && reg.isWater(px,pz)){ cls[a]='W'; water++; }
      else {
        const gy=reg.surfaceY(px,pz);
        const inert = (c.h!==-1) && (gy>c.h);   // collider skipped for a grounded player here
        if(inert){ cls[a]='S'; safe++; } else { cls[a]='B'; blocked++; }
      }
    }
    if(open>=1 && blocked>=1){
      candidates.push({x:c.x,z:c.z,r:c.r,h:c.h,region:reg.name,openAngles:open,blockedAngles:blocked,waterAngles:water,safeAngles:safe,_cls:cls,_reg:reg,_R:R});
    }
  }
  console.log(`STEP 3: ${candidates.length} candidate offenders (ring has open AND blocked angles).`);

  // ===== STEP 4: confirm via sim =====
  const confirmedTraps=[];
  const unsimmable=[];
  const angStep=TWO_PI/N;
  for(const cand of candidates){
    const {_cls:cls,_reg:reg,_R:R}=cand;
    // contiguous BLOCKED arcs (circular)
    const arcs=[]; let a=0;
    // find a non-B start to anchor circular scan
    let s0=0; while(s0<N && cls[s0]==='B') s0++;
    if(s0===N){ // entire ring blocked (no open — shouldn't happen for a candidate); skip
      unsimmable.push({x:cand.x,z:cand.z,r:cand.r,region:cand.region,why:'ring entirely blocked'}); continue;
    }
    let i=0, run=null;
    for(let k=0;k<N;k++){
      const idx=(s0+k)%N;
      if(cls[idx]==='B'){ if(!run) run=[idx]; else run.push(idx); }
      else { if(run){ arcs.push(run); run=null; } }
    }
    if(run) arcs.push(run);
    let anyStart=false;
    for(const arc of arcs){
      const midIdx=arc[Math.floor(arc.length/2)];
      const thArc=midIdx/N*TWO_PI;
      // nearest OPEN ground ~1.75 m outside the ring near this arc
      let start=null;
      for(let off=0; off<=Math.floor(N/2) && !start; off++){
        for(const sgn of (off===0?[0]:[1,-1])){
          const th=thArc+sgn*off*angStep;
          const sx=cand.x+(R+1.75)*Math.cos(th), sz=cand.z+(R+1.75)*Math.sin(th);
          if(reg.walkable(sx,sz)){ start={x:sx,z:sz,th}; break; }
        }
      }
      if(!start){ continue; }
      anyStart=true;
      // input base: toward collider centre; plus two tangential-drift variants (+-35 deg)
      let bx=cand.x-start.x, bz=cand.z-start.z; const bl=Math.hypot(bx,bz)||1; bx/=bl; bz/=bl;
      const variants=[[bx,bz], rot(bx,bz,35), rot(bx,bz,-35)];
      for(const [ix,iz] of variants){
        const res=simTrap(start.x,start.z, ix,iz, reg, colliders);
        if(res.trapped){
          confirmedTraps.push({collider:{x:cand.x,z:cand.z,r:cand.r,h:cand.h}, region:cand.region, end:res.end, inputDir:res.inputDir});
        }
      }
    }
    if(!anyStart){
      unsimmable.push({x:cand.x,z:cand.z,r:cand.r,region:cand.region,why:'no OPEN start ground found near any blocked arc'});
    }
  }

  // ===== STEP 5: write report + summary =====
  const perRegion={};
  for(const cand of candidates) perRegion[cand.region]=(perRegion[cand.region]||0)+1;
  const report={
    totalColliders: colliders.length,
    collidersPerRegion,
    candidates: candidates.map(({_cls,_reg,_R,...rest})=>rest),
    confirmedTraps,
  };
  writeFileSync(join(here, 'tmp', '097-collider-report.json'), JSON.stringify(report,null,2));

  console.log('\n===== 097 COLLIDER-RING TRAP AUDIT =====');
  console.log(`total colliders: ${colliders.length}`);
  console.log(`candidate offenders: ${candidates.length}`);
  console.log('  per region: ' + (Object.keys(perRegion).length?Object.entries(perRegion).map(([k,v])=>`${k}=${v}`).join('  '):'(none)'));
  console.log(`confirmed traps: ${confirmedTraps.length}`);
  if(confirmedTraps.length){
    for(const t of confirmedTraps){
      const c=t.collider;
      console.log(`  TRAP [${t.region}] collider(x=${c.x.toFixed(2)},z=${c.z.toFixed(2)},r=${c.r},h=${c.h}) end(${t.end[0]},${t.end[1]}) in(${t.inputDir[0]},${t.inputDir[1]})`);
    }
  } else console.log('  (none)');
  if(unsimmable.length){
    console.log(`un-simmable candidates: ${unsimmable.length}`);
    for(const u of unsimmable) console.log(`  SKIP [${u.region}] (x=${u.x.toFixed(2)},z=${u.z.toFixed(2)},r=${u.r}) — ${u.why}`);
  }
  console.log('\nwrote tools/tmp/097-collider-report.json');
})().catch(e=>{ console.error(e); process.exit(1); });
