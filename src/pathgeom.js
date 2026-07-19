// ======================================================================
// pathgeom.js — SHARED ribbon seam/edge geometry (task 102).
// Imported by BOTH src/paths.js (the engine's ribbon builder) and
// tools/path-continuity.mjs (the permanent path-continuity gate). The 052
// walkability law generalized: any geometry the gate asserts lives in ONE
// module, so the engine and the probe can never fork (the gate would
// otherwise measure a fiction). Pure array math on [x,z] pairs — no THREE,
// importable from Node tools directly.
// ======================================================================

export const dirOf=(a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz)||1;return [dx/L,dz/L];};

// Miter intersection of two edge lines (aPt+aDir, bPt+bDir), clamped to a
// 4x half-width miter limit from the cap midpoint; near-parallel (<~5 deg)
// falls back to the cap midpoint (a straight butt join).
export function miterPt(aPt,aDir,bPt,bDir,halfW){
  const cr=aDir[0]*bDir[1]-aDir[1]*bDir[0];
  const cx=(aPt[0]+bPt[0])/2, cz=(aPt[1]+bPt[1])/2;
  if(Math.abs(cr)<0.087) return [cx,cz];
  const dx=bPt[0]-aPt[0],dz=bPt[1]-aPt[1];
  const s=(dx*bDir[1]-dz*bDir[0])/cr;
  let mx=aPt[0]+aDir[0]*s, mz=aPt[1]+aDir[1]*s;
  const ddx=mx-cx,ddz=mz-cz,d=Math.hypot(ddx,ddz),lim=4*halfW;
  if(d>lim){ mx=cx+ddx/d*lim; mz=cz+ddz/d*lim; }
  return [mx,mz];
}

// Seam-corner projection clamp: a mitered seam shares ONE edge between the
// two ribbons, so both seam corners are shared points — sliding a corner
// ALONG the seam keeps it straight and shared. But a hard kink extends a
// miter corner so far it crosses the NEIGHBORING station's cap plane and
// folds the seam quad into a bowtie. Slide the corner along the seam until
// it clears `plane` (a point it may not pass along `dir`): fwd=true keeps
// (C-plane)·dir >= eps, fwd=false <= -eps.
export function seamClamp(C,other,plane,dir,fwd,eps=0.02){
  const proj=(C[0]-plane[0])*dir[0]+(C[1]-plane[1])*dir[1];
  const coef=(other[0]-C[0])*dir[0]+(other[1]-C[1])*dir[1];
  if(Math.abs(coef)<1e-6) return C;
  if(fwd&&proj<eps){ const t=(eps-proj)/coef; if(t>0&&t<1) return [C[0]+(other[0]-C[0])*t,C[1]+(other[1]-C[1])*t]; }
  if(!fwd&&proj>-eps){ const t=(-eps-proj)/coef; if(t>0&&t<1) return [C[0]+(other[0]-C[0])*t,C[1]+(other[1]-C[1])*t]; }
  return C;
}

// Inner-edge radius clamp: on a bend tighter than the half-width the INNER
// edge must dart/reverse (the garden peanut's waist crimp) — an offset curve
// can never be tighter than the osculating radius R of the centerline. Cap
// the inner offset at 0.98R station-by-station (left edge on left turns,
// right on right): tight bends read as a smooth narrow neck, and darts/
// reversals become impossible by construction. Edges only — centerline
// samples never move. sideSign: +1 for the LEFT edge, -1 for the RIGHT.
export function radiusClamp(cl,E,sideSign){
  const n=cl.length-1;
  for(let i=1;i<n;i++){
    const ax=cl[i][0]-cl[i-1][0],az=cl[i][1]-cl[i-1][1];
    const bx=cl[i+1][0]-cl[i][0],bz=cl[i+1][1]-cl[i][1];
    const t=ax*bz-az*bx;
    if(t*sideSign<=0) continue;                    // this edge is not the inner side here
    const ang=Math.abs(Math.atan2(t,ax*bx+az*bz));
    if(ang<1e-3) continue;
    const s1=Math.hypot(ax,az),s2=Math.hypot(bx,bz);
    const R=(s1+s2)/(4*Math.sin(ang/2));           // osculating radius estimate
    const lim=R*0.98;
    const ox=E[i][0]-cl[i][0],oz=E[i][1]-cl[i][1],off=Math.hypot(ox,oz);
    if(off>lim&&off>1e-6){ const k=lim/off; E[i][0]=cl[i][0]+ox*k; E[i][1]=cl[i][1]+oz*k; }
  }
}

// Quad orientation test (the gate's bowtie rule): the ribbon's two triangles
// (L0,L1,R0)/(R0,L1,R1) must agree. Used to pick miter-vs-disc at a hard join.
export function quadFolds(L0,L1,R0,R1){
  const cr=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const o1=Math.sign(cr(L0,L1,R0)),o2=Math.sign(cr(R0,L1,R1));
  return o1!==0&&o2!==0&&o1!==o2;
}

// Junction-disc radius: covers BOTH the four cap corners AND the wedge where
// the two same-y strips overlap past the caps (two strips leaving a shared
// point at mutual angle phi overlap out to halfW/sin(phi/2) along the
// bisector — the part the dot must pave over or it z-fights in the open).
// The 1.4x on the wedge absorbs CR-curve bowing past the straight-ray
// estimate (measured 2.54 m vs 1.86 predicted at the Point's entrance->loop
// kink). Capped at the 4x-halfW miter-limit spirit: a tighter hairpin's
// unbounded overlap is a data bug the gate's overlap check must surface,
// not a bigger dot to hide it under.
function discRadius(c,uDir,vDir,halfW,corners){
  let reach=0;
  for(const p of corners) reach=Math.max(reach,Math.hypot(p[0]-c[0],p[1]-c[1]));
  const cosPhi=Math.max(-1,Math.min(1,uDir[0]*vDir[0]+uDir[1]*vDir[1]));
  const phi=Math.acos(cosPhi);
  const wedge=phi>1e-3?Math.min(4*halfW,1.4*halfW/Math.sin(phi/2)):4*halfW;
  return Math.max(reach,wedge)+0.5;
}

// CONTINUATION-JOIN seam between a predecessor's end frame
// {c,pc,l,r,pl,pr,dir} and the successor's sampled stations (cl,EL,ER):
// snaps cl[0] to the predecessor's last centerline point (bit-exact), then
// replaces BOTH seam stations' edges with the two side-paired miter
// intersections — the seam shares ONE edge exactly: no gap, no overlap, no
// step, at any kink angle. If the miter would FOLD either seam quad (a hard
// kink), both natural caps stay and the junction is covered by a paved DISC
// instead: returns {disc:{x,z,r}}. Otherwise mutates join.l/r + EL[0]/ER[0]
// in place and returns {mL,mR,side} (the engine rewrites the predecessor's
// last quad through its position attribute with mL/mR).
export function joinSeam(join,cl,EL,ER,halfW){
  cl[0][0]=join.c[0]; cl[0][1]=join.c[1];
  const dB=dirOf(cl[0],cl[1]);
  // pair edges by SIDE relative to the predecessor's end direction (a >90°
  // kink swaps the following ribbon's left/right vs the predecessor's).
  const side=join.dir[0]*(EL[0][1]-join.c[1])-join.dir[1]*(EL[0][0]-join.c[0]);
  const ourL=EL[0],ourR=ER[0];
  let mL=side>=0?miterPt(join.l,join.dir,ourL,dB,halfW):miterPt(join.l,join.dir,ourR,dB,halfW);
  let mR=side>=0?miterPt(join.r,join.dir,ourR,dB,halfW):miterPt(join.r,join.dir,ourL,dB,halfW);
  // keep the seam corners from folding the quads they border
  mL=seamClamp(mL,mR,cl[1],dB,false);
  mR=seamClamp(mR,mL,cl[1],dB,false);
  mL=seamClamp(mL,mR,join.pc,join.dir,true);
  mR=seamClamp(mR,mL,join.pc,join.dir,true);
  // fold test on BOTH seam quads: the predecessor's last and our first.
  const bL0=side>=0?mL:mR, bR0=side>=0?mR:mL;
  const foldsA=quadFolds(join.pl,mL,join.pr,mR);
  const foldsB=quadFolds(bL0,EL[1],bR0,ER[1]);
  if(foldsA||foldsB){
    const r=discRadius(join.c,[-join.dir[0],-join.dir[1]],dB,halfW,[join.l,join.r,ourL,ourR]);
    return {disc:{x:join.c[0],z:join.c[1],r}};
  }
  join.l[0]=mL[0];join.l[1]=mL[1]; join.r[0]=mR[0];join.r[1]=mR[1];
  if(side>=0){ EL[0]=mL;ER[0]=mR; }
  else       { ER[0]=mL;EL[0]=mR; }
  return {mL,mR,side};
}

// WELD seam for a CLOSED outline (first==last control point — the garden
// peanut, the sanctuary loop): the ribbon's own start/end meeting is mitered
// exactly like a continuation join. Mutates EL/ER in place; returns
// {disc:{x,z,r}} when the kink is too hard (paved dot instead), else
// {mL,mR,side}. Caller gates on the outline actually being closed.
export function weldSeam(cl,EL,ER,halfW){
  const n=cl.length-1;
  const dA=dirOf(cl[n-1],cl[n]), dB=dirOf(cl[0],cl[1]);
  const side=dA[0]*(EL[0][1]-cl[n][1])-dA[1]*(EL[0][0]-cl[n][0]);
  let mL=side>=0?miterPt(EL[n],dA,EL[0],dB,halfW):miterPt(EL[n],dA,ER[0],dB,halfW);
  let mR=side>=0?miterPt(ER[n],dA,ER[0],dB,halfW):miterPt(ER[n],dA,EL[0],dB,halfW);
  mL=seamClamp(mL,mR,cl[1],dB,false);
  mR=seamClamp(mR,mL,cl[1],dB,false);
  mL=seamClamp(mL,mR,cl[n-1],dA,true);
  mR=seamClamp(mR,mL,cl[n-1],dA,true);
  // the end station always pairs L->mL / R->mR; side<0 swaps only the start
  const foldsA=quadFolds(EL[n-1],mL,ER[n-1],mR);
  const foldsB=quadFolds(side>=0?mL:mR,EL[1],side>=0?mR:mL,ER[1]);
  if(foldsA||foldsB){
    const r=discRadius(cl[n],[-dA[0],-dA[1]],dB,halfW,[EL[n],ER[n],EL[0],ER[0]]);
    return {disc:{x:cl[n][0],z:cl[n][1],r}};
  }
  if(side>=0){ EL[n]=mL;ER[n]=mR;EL[0]=mL;ER[0]=mR; }
  else       { EL[n]=mL;ER[n]=mR;ER[0]=mL;EL[0]=mR; }
  // note: cl[n] and cl[0] already coincide (the weld point) — untouched.
  return {mL,mR,side};
}
