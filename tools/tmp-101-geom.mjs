// numeric check: MAIN walk-vs-bike centerline separation (crossing hunt)
import * as CH from '../src/data/chicago.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function crSample(ctrl, step) {
  const m = ctrl.length; if (m < 2) return ctrl.map(p => [p[0], p[1]]);
  const pt = i => ctrl[Math.max(0, Math.min(m - 1, i))];
  const P = [[ctrl[0][0], ctrl[0][1]]];
  for (let s = 0; s < m - 1; s++) {
    const p0 = pt(s-1), p1 = pt(s), p2 = pt(s+1), p3 = pt(s+2);
    const n = Math.max(1, Math.round(Math.hypot(p2[0]-p1[0], p2[1]-p1[1]) / step));
    for (let k = 1; k <= n; k++) {
      const t = k/n, t2=t*t, t3=t2*t;
      const x = 0.5*((2*p1[0]) + (-p0[0]+p2[0])*t + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3);
      const z = 0.5*((2*p1[1]) + (-p0[1]+p2[1])*t + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);
      P.push([x, z]);
    }
  }
  return P;
}
function offsetLine(pts, off) {
  const O = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0,i-1)], b = pts[Math.min(pts.length-1,i+1)];
    const tx=b[0]-a[0], tz=b[1]-a[1], L=Math.hypot(tx,tz)||1;
    O.push([pts[i][0]+(-tz/L)*off, pts[i][1]+(tx/L)*off]);
  }
  return O;
}
function ptSeg(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz||1e-9;let t=((px-ax)*dx+(pz-az)*dz)/L2;t=clamp(t,0,1);const cx=ax+dx*t,cz=az+dz*t;return Math.hypot(px-cx,pz-cz);}
function minToPoly(px,pz,pts){let b=1e9;for(let i=0;i<pts.length-1;i++){const d=ptSeg(px,pz,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]);if(d<b)b=d;}return b;}
const st=CH.TRAIL_STYLE;
const walkOff=st.bike.width/2+st.gap+st.walk.width/2;
const bike=crSample(CH.TRAIL_MAIN,0.5);
const walk=offsetLine(bike,walkOff);
let minD=1e9, minI=-1, maxD=0;
for(let i=0;i<walk.length;i++){const d=minToPoly(walk[i][0],walk[i][1],bike);if(d<minD){minD=d;minI=i;}if(d>maxD)maxD=d;}
console.log('walkOff',walkOff,'samples',bike.length);
console.log('min separation walk->bike:',minD.toFixed(3),'at walk sample',minI,walk[minI]);
console.log('max separation:',maxD.toFixed(3));
let tight=[];
for(let i=0;i<walk.length;i++){const d=minToPoly(walk[i][0],walk[i][1],bike);if(d<3.4)tight.push([+walk[i][0].toFixed(1),+walk[i][1].toFixed(1),+d.toFixed(2)]);}
console.log('tight spots (<3.4m):',tight.length, JSON.stringify(tight.slice(0,12)));
const mb=crSample(CH.TRAIL_MONTROSE,0.5), mw=offsetLine(mb,walkOff);
let mm=1e9, mi=-1;
for(let i=0;i<mw.length;i++){const d=minToPoly(mw[i][0],mw[i][1],mb);if(d<mm){mm=d;mi=i;}}
console.log('MONTROSE min separation:',mm.toFixed(3),'at',mw[mi]);
let L=0;for(let i=1;i<bike.length;i++)L+=Math.hypot(bike[i][0]-bike[i-1][0],bike[i][1]-bike[i-1][1]);
console.log('MAIN bike polyline length ~',L.toFixed(1),'m');
