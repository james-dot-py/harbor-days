// 113: which skyline-billboard boxes overlap the planned Diversey/Theater rects?
// Replays sky.js's local mulberry32(0x5c1000) like tmp-billboard-extent.mjs. Read-only.
function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const S=mulberry32(0x5c1000);
const rnd=(a,b)=>a+(b-a)*S();
const SC=2.2;
const boxes=[];
function band(n,za,zb,ha,hb,name){
  for(let i=0;i<n;i++){
    const w=rnd(8,20),h=rnd(ha,hb),d=rnd(8,14);
    const x=rnd(-120,135),z=rnd(za,zb);
    boxes.push({name:name+i,x:x*SC,z:z*SC,w:w*SC,h:h*SC,d:d*SC});
  }
}
band(16,280,304,16,48,'back');
band(20,229,244,13,40,'front');
const rects={
  theater:{x0:30,x1:54,z0:596,z1:632},
  channelS:{x0:-40,x1:0,z0:504,z1:670},   // docks/boats/culvert south half
  eastStrip:{x0:14,x1:52,z0:504,z1:677},  // trail + trees on the strip
};
for(const[k,r]of Object.entries(rects)){
  console.log('---',k);
  for(const b of boxes){
    const bx0=b.x-b.w/2,bx1=b.x+b.w/2,bz0=b.z-b.d/2,bz1=b.z+b.d/2;
    if(bx1>r.x0&&bx0<r.x1&&bz1>r.z0&&bz0<r.z1)
      console.log(` ${b.name} x ${bx0.toFixed(1)}..${bx1.toFixed(1)} z ${bz0.toFixed(1)}..${bz1.toFixed(1)} h ${b.h.toFixed(1)}`);
  }
}
