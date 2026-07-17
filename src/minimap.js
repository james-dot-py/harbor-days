import { $ } from './core.js';
import { COAST_MAIN, COAST_PEN, COAST_GOLF, COAST_BAY, COAST_CORNER, COAST_TIP, COAST_SEGS, MTR_SEGS, TIP_SEGS, profileTotal, LAND } from './coast.js';
import { mainCurve, spurCurve, TRAIL_LOOP, TRAIL_ENTRANCE } from './paths.js';
import { mayor } from './character.js';
import * as CH from './data/chicago.js';

// ------------------------------ minimap --------------------------------
export const mm={cv:$('mmc'),ctx:null,base:null,pings:[],cellBase:null,cellB:null};
// cells.js swaps the base canvas + bounds per active cell (null = lakefront)
export function mmSetCell(base,bounds){mm.cellBase=base;mm.cellB=bounds}
export function worldToMap(x,z){const M=mm.cellB||CH.MAP;return[(x-M.x0)/M.w*M.cw,(z-M.z0)/M.h*M.ch]}
export function mmInit(){
  mm.ctx=mm.cv.getContext('2d');
  const b=document.createElement('canvas');b.width=CH.MAP.cw;b.height=CH.MAP.ch;
  const g=b.getContext('2d');
  g.fillStyle='#2f9fb1';g.fillRect(0,0,CH.MAP.cw,CH.MAP.ch);
  // terrace band along the coasts
  g.strokeStyle='#e6dabd';g.lineCap='round';g.lineJoin='round';g.lineWidth=8;
  // 084: COAST_SEGS[2] is the golf GHOST (rng ballast) — the real vignette
  // golf is MTR_SEGS[7], and the new bay cove (MTR_SEGS[0]) gets a band too.
  [[COAST_MAIN,COAST_SEGS[0]],[COAST_PEN,COAST_SEGS[1]],[COAST_GOLF,MTR_SEGS[7]],[COAST_BAY,MTR_SEGS[0]],[COAST_CORNER,COAST_SEGS[4]],[COAST_TIP,TIP_SEGS]].forEach(([pts,segs])=>{
    g.beginPath();
    for(let i=0;i<pts.length;i++){
      const s=segs[Math.min(i,segs.length-1)],tot=profileTotal(pts[i][1]);
      const[mx,my]=worldToMap(pts[i][0]+s.nx*tot/2,pts[i][1]+s.nz*tot/2);
      i?g.lineTo(mx,my):g.moveTo(mx,my);
    }
    g.stroke();
  });
  // land
  g.fillStyle='#7ecb6f';g.beginPath();
  LAND.forEach((p,i)=>{const[mx,my]=worldToMap(p[0],p[1]);i?g.lineTo(mx,my):g.moveTo(mx,my)});
  g.closePath();g.fill();
  // golf course tint
  {const G=CH.MAP_GOLF,[ax,ay]=worldToMap(G.x0,G.z0),[bx2,by2]=worldToMap(G.x1,G.z1);
   g.fillStyle=G.color;g.fillRect(Math.min(ax,bx2),Math.min(ay,by2),Math.abs(bx2-ax),Math.abs(by2-ay));}
  // dog beach
  {const[bx,by]=worldToMap(CH.DOG_BEACH.mesh.cx,CH.DOG_BEACH.mesh.cz);g.fillStyle='#f0e2bd';g.beginPath();g.ellipse(bx,by,5,3,0,0,7);g.fill()}
  // trails
  g.strokeStyle='#b9b2a4';g.lineWidth=3;
  [mainCurve,spurCurve].forEach(cv2=>{
    g.beginPath();
    cv2.getPoints(120).forEach((p,i)=>{const[mx,my]=worldToMap(p.x,p.z);i?g.lineTo(mx,my):g.moveTo(mx,my)});
    g.stroke();
  });
  g.strokeStyle='#e8cfa4';g.lineWidth=2;
  [TRAIL_LOOP,TRAIL_ENTRANCE].forEach(pts=>{   // peanut plaza loop + entrance→lake path (task 023)
    g.beginPath();
    pts.forEach((p,i)=>{const[mx,my]=worldToMap(p[0],p[1]);i?g.lineTo(mx,my):g.moveTo(mx,my)});
    g.stroke();
  });
  // landmarks
  const dot=(x,z,c,r=5)=>{const[mx,my]=worldToMap(x,z);g.fillStyle=c;g.beginPath();g.arc(mx,my,r,0,7);g.fill()};
  CH.MAP_LANDMARKS.forEach(d=>dot(d.x,d.z,d.c,d.r));
  mm.base=b;
}
export function mmPing(x,z){mm.pings.push({x,z,t:0})}
export function mmDraw(dt,player){
  if(!mm.base)return;
  const g=mm.ctx;
  g.clearRect(0,0,CH.MAP.cw,CH.MAP.ch);g.drawImage(mm.cellBase||mm.base,0,0);
  for(let i=mm.pings.length-1;i>=0;i--){
    const p=mm.pings[i];p.t+=dt;
    if(p.t>1.4){mm.pings.splice(i,1);continue}
    const[mx,my]=worldToMap(p.x,p.z),a=1-p.t/1.4;
    g.strokeStyle=`rgba(255,220,150,${a})`;g.lineWidth=3;
    g.beginPath();g.arc(mx,my,4+p.t*22,0,7);g.stroke();
  }
  const[px2,py2]=worldToMap(player.x,player.z);
  const hd=mayor.rotation.y,hx=Math.sin(hd),hz=Math.cos(hd);
  g.fillStyle='#fff';g.beginPath();g.arc(px2,py2,7.5,0,7);g.fill();
  g.fillStyle='#e0574a';g.beginPath();g.arc(px2,py2,5.5,0,7);g.fill();
  g.fillStyle='#fff';g.beginPath();
  g.moveTo(px2+hx*13,py2+hz*13);
  g.lineTo(px2+hz*4.5,py2-hx*4.5);
  g.lineTo(px2-hz*4.5,py2+hx*4.5);
  g.closePath();g.fill();
}
export function initMinimapToggle(){
  $('mmt').addEventListener('click',()=>{
    const m=$('mini');m.classList.toggle('min');
    $('mmt').innerHTML=m.classList.contains('min')?'&#128506;':'&#9662;';
  });
}
