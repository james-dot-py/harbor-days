// tmp-115-check.mjs — pre-build sanity of the 115 data patch (main session).
import * as CH from '../src/data/chicago.js';
let ok=0,bad=0;
const ex=(n,c)=>{ if(c){ok++;} else {bad++;console.log('FAIL',n);} };
const walk=(x,z)=>CH.lpLandHit(x,z)&&!CH.lpBlockedHit(x,z);
const HB=CH.ZOO.habitats,FY=CH.ZOO.farmyard;
// ribbons walkable end to end
for(const p of HB.walkN) ex(`walkN (${p})`,walk(p[0],p[1]));
for(const p of FY.lane) ex(`lane (${p})`,walk(p[0],p[1]));
// existing ribbons still clear
for(const p of CH.ZOO.loop) ex(`loop (${p})`,walk(p[0],p[1]));
for(const p of CH.ZOO.spur) ex(`spur (${p})`,walk(p[0],p[1]));
for(const p of CH.LP_TRAIL_PARK) ex(`trailpark (${p})`,walk(p[0],p[1]));
for(const p of CH.LP_DIVERSEY_CANNON) ex(`cannon (${p})`,walk(p[0],p[1]));
// habitat carves block
ex('macaque blocked',!walk(HB.macaque.x,HB.macaque.z));
ex('penguin blocked',!walk(-63,781));
ex('polar blocked',!walk(-82,785));
ex('flamingo blocked',!walk(-28,862));
ex('barn blocked',!walk(FY.barn.x,FY.barn.z));
ex('farmhouse blocked',!walk(FY.farmhouse.x,FY.farmhouse.z));
ex('windmill blocked',!walk(FY.windmill.x,FY.windmill.z));
// paddock: band blocked, both sides open, gate walks, interior walks
ex('paddock N band blocked',!walk(-80,972));
ex('paddock N outside open',walk(-80,970.9));
ex('paddock N inside open',walk(-80,973.1));
ex('paddock gate line',[[-70.5,984],[-72,984],[-73.5,984]].every(p=>walk(p[0],p[1])));
ex('paddock interior (cow spot)',walk(FY.cow.x,FY.cow.z));
ex('goat spot walks',walk(FY.goat.x,FY.goat.z));
// pond ruling clear of spur + farm + flamingo
const pip=(x,z,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],zi=poly[i][1],xj=poly[j][0],zj=poly[j][1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))c=!c}return c};
for(const p of CH.ZOO.spur) ex(`spur pt ${p} outside pond`,!pip(p[0],p[1],CH.LP_SOUTHPOND_WATER));
for(const p of FY.lane) ex(`lane pt ${p} outside pond`,!pip(p[0],p[1],CH.LP_SOUTHPOND_WATER));
ex('barn outside pond',!pip(FY.barn.x,FY.barn.z,CH.LP_SOUTHPOND_WATER));
ex('paddock outside pond',!pip(-80,985,CH.LP_SOUTHPOND_WATER));
ex('flamingo outside pond',!pip(-28,862,CH.LP_SOUTHPOND_WATER));
ex('honeycomb INSIDE pond (over water is correct)',pip(-30,958,CH.LP_SOUTHPOND_WATER));
// gates still open
for(const p of [[-6,830],[-10.2,830],[-14,830]]) ex(`east gate (${p})`,walk(p[0],p[1]));
for(const p of [[-96,855.5],[-94.2,855.5],[-92,855.5]]) ex(`west gate (${p})`,walk(p[0],p[1]));
for(const p of [[-49,1002],[-49,1005.5],[-49,1009]]) ex(`south gate (${p})`,walk(p[0],p[1]));
// trees clear of carves + plates outside carves
for(const [tx,tz] of [[-78,842],[-62,944]]) ex(`moved tree (${tx},${tz}) on lawn`,walk(tx,tz));
for(const k of ['macaque','penguin','polar','flamingo']){const s=HB[k].sign;ex(`${k} plate spot walks`,walk(s.x,s.z));}
ex('farm sign spot walks',walk(FY.sign.x,FY.sign.z));
console.log(`\n${ok} ok, ${bad} bad`);
process.exit(bad?1:0);
