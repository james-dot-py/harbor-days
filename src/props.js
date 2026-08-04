import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, rng, rand, toon, bmat, curveMat, gmap, pointsMat, pip, WATER_Y } from './core.js';
import { COAST_SEGS, MTR_SEGS, tierProfile, profileTotal, beachH, LAND, LAND_GHOST084, coastQuery } from './coast.js';
import { pathSamples, pathSamples2, pathSamplesMain, mainCurve, ribbonLanes } from './paths.js';
import * as CH from './data/chicago.js';

// --------------------------- world props ------------------------------
export const colliders=[];
export const walkRects=[];
export function collide(x,z,r,h=Infinity){colliders.push({x,z,r,h})}   // h: jumpable when player.y > h

// 128 (issue 040): every RENDERED walkable plank surface, tagged where it is
// BUILT so tools/deck-coverage.mjs can raycast the real geometry instead of
// trusting a restated rectangle — the promise a walkable deck makes is "if you
// can see yourself standing on it, it holds you", and nothing asserted it until
// a Montrose finger dock shipped rooted 1 m out over open water.
// Push the DECK SLAB only — never railings, posts, fascia or parapets (an
// untagged rail is simply not a promise). {id, mesh}; mesh may be a Mesh or an
// InstancedMesh (the guard grids per instance).
export const deckMeshes=[];

export const bobbers=[];
// 109: the InstancedMeshes whose instances a passing player can brush (grass
// tufts + flower heads). Filled during buildProps; src/rustle.js decomposes them
// into a static spatial grid at world-ready (zero rng — read-only on the matrices).
export const RUSTLE_MESHES=[];
export let drifter=null;
export let dogTail=null;
export const foam={pts:null,ph:[],base:[]};
export const fireflies={n:70,base:[],ph:[]};
const treeSpots=[];
// 088: SNAPSHOT of the FINAL tree placements (post-nudge), for the prop-vs-path
// clearance audit exposed via window.__hd.propAudit(). Filled once, after the
// clearance nudge, immediately before the tree-consumption loop.
export const TREE_SPOTS=[];

// LOCAL deterministic rng (mulberry32) for per-tree cosmetic randomness ONLY.
// Never touches the shared world rng() — seed it per tree so tree placement
// (and every downstream prop that consumes rng after it) stays byte-identical.
function m32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// ---- signs / lamps / benches ----
function makeSign(text,x,z,ry){
  const cv=document.createElement('canvas');cv.width=512;cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#fdf6e6';g.beginPath();g.roundRect(6,6,500,116,26);g.fill();
  g.strokeStyle='#c9a97a';g.lineWidth=8;g.stroke();
  g.fillStyle='#4a3b2f';g.textAlign='center';g.textBaseline='middle';
  let fs=52;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;
  while(g.measureText(text).width>470&&fs>24){fs-=2;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;}
  g.fillText(text,256,68);
  const tex=new THREE.CanvasTexture(cv);
  const grp=new THREE.Group();
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,1.7,6),toon(0xa9713f));post.position.set(0,0.85,-0.25);grp.add(post);  // BEHIND the board (front at z=0) so it never clips the text
  const board=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.85),curveMat(new THREE.MeshBasicMaterial({map:tex})));board.position.y=1.9;grp.add(board);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.85),bmat(0xe8d7b4));back.rotation.y=Math.PI;back.position.y=1.9;grp.add(back);
  grp.position.set(x,0,z);grp.rotation.y=ry;scene.add(grp);collide(x,z,0.5);
}
// (lamps + benches are built as InstancedMeshes in buildProps below)
// ---- pier + basin dock (with rails, posts to the water) ----
function plankDeck(x1,x2,z1,z2,y,apron,root,id){   // id (128): tags the walk-surface slab into deckMeshes
  const w=x2-x1,d=z2-z1;
  // landward fascia/curb: a solid face from the deck underside down past the shore
  // grade at whichever edge meets land, so the pier ROOTS FLUSH instead of floating
  // on stilts with daylight under its shore edge (issue 016 / task 038). An
  // individual mesh -> frustum/fog-culled -> +0 to the draw-call gate's (far-north
  // Wrigleyville) max view; only its own harbor/corner views pay the ~1 call.
  const mkFascia=(grp,mat)=>{
    if(!root)return;
    const top=y-0.12,bot=-1.2,hh=top-bot,cy=(top+bot)/2,t=0.5;
    let fx,fz,sw,sd;
    if(root==='n'){fx=(x1+x2)/2;fz=z1+0.15;sw=w;sd=t;}        // deck juts +z; landward = north edge
    else if(root==='s'){fx=(x1+x2)/2;fz=z2-0.15;sw=w;sd=t;}
    else if(root==='w'){fx=x1+0.15;fz=(z1+z2)/2;sw=t;sd=d;}   // deck juts +x; landward = west edge
    else{fx=x2-0.15;fz=(z1+z2)/2;sw=t;sd=d;}
    const f=new THREE.Mesh(new THREE.BoxGeometry(sw,hh,sd),mat);f.position.set(fx,cy,fz);grp.add(f);
  };
  if(apron){
    // task 021 (refs/diversey-corner/ 0395/0399): a pale CONCRETE APRON pier —
    // slab on concrete piles, white bollard posts inset along the long edges +
    // the tip (north landing open), red life rings on white posts. No wood.
    const grp=new THREE.Group(),slab=toon(apron.slab),white=toon(apron.white),red=toon(apron.red);
    const deck=new THREE.Mesh(new THREE.BoxGeometry(w,0.24,d),slab);deck.position.set((x1+x2)/2,y,(z1+z2)/2);grp.add(deck);
    if(id)deckMeshes.push({id,mesh:deck});            // 128: the walk surface (bollards/rings/piles are not walkable)
    for(let px=x1+1.4;px<x2;px+=4.2){                 // concrete piles to the water
      const pile=new THREE.Mesh(new THREE.BoxGeometry(0.36,y+3.4,0.36),slab);pile.position.set(px,(y-3.4)/2+0.55,z2-0.6);grp.add(pile);
    }
    const B=apron.bollard,spots=[];
    for(let pz=z1+2.2;pz<z2-1.2;pz+=B.spacing){spots.push([x1+B.inset,pz],[x2-B.inset,pz]);}
    for(let px=x1+B.inset+1.1;px<x2-B.inset;px+=B.spacing)spots.push([px,z2-B.inset]);
    for(const[bx,bz]of spots){
      const b=new THREE.Mesh(new THREE.CylinderGeometry(B.r*0.86,B.r,B.h,8),white);
      b.position.set(bx,y+0.12+B.h/2,bz);grp.add(b);
    }
    for(const rg of apron.rings){                     // red life ring on a white post
      const post=new THREE.Mesh(new THREE.BoxGeometry(0.12,1.3,0.12),white);post.position.set(rg.x,y+0.12+0.65,rg.z);grp.add(post);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.3,0.085,7,16),red);
      ring.position.set(rg.x,y+1.02,rg.z);ring.rotation.y=rg.ry;grp.add(ring);
    }
    mkFascia(grp,slab);                                // concrete curb roots the apron to the top edge
    scene.add(grp);
    return;
  }
  const grp=new THREE.Group(),wm=toon(0xb07a46),wm2=toon(0x9c6a3a);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(w,0.24,d),wm);deck.position.set((x1+x2)/2,y,(z1+z2)/2);grp.add(deck);
  if(id)deckMeshes.push({id,mesh:deck});               // 128: the walk surface only — rails/posts/fascia below are not
  for(let px=x1+1;px<x2;px+=3.4)for(const pz of[z1+0.4,z2-0.4]){
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,y+3.4,6),wm2);post.position.set(px,(y-3.4)/2+0.55,pz);grp.add(post);
    const knob=new THREE.Mesh(new THREE.SphereGeometry(0.19,7,6),wm2);knob.position.set(px,y+1.05,pz);grp.add(knob);
    const railSeg=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.09,0.09),wm2);railSeg.position.set(px+1.7,y+0.95,pz);if(px+3.4<x2+1)grp.add(railSeg);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.85,5),wm2);stem.position.set(px,y+0.55,pz);grp.add(stem);
  }
  mkFascia(grp,wm2);                                   // wood fascia roots the deck to the spit edge
  scene.add(grp);
}
// ---- boats / buoys ----
function makeBoat(x,z,ry,hullC,sailC,scale=1){
  const grp=new THREE.Group();
  const hull=new THREE.Mesh(new THREE.SphereGeometry(1.6,12,10),toon(hullC));hull.scale.set(0.62,0.42,1);grp.add(hull);
  const rim=new THREE.Mesh(new THREE.SphereGeometry(1.62,12,10),toon(0x7a5a3a));rim.scale.set(0.6,0.16,0.98);rim.position.y=0.42;grp.add(rim);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,3.6,6),toon(0x8a6a4a));mast.position.y=2.1;grp.add(mast);
  const sailShape=new THREE.Shape();sailShape.moveTo(0,0);sailShape.lineTo(1.45,0);sailShape.quadraticCurveTo(0.55,1.3,0,2.6);sailShape.closePath();
  const sail=new THREE.Mesh(new THREE.ShapeGeometry(sailShape),curveMat(new THREE.MeshToonMaterial({color:sailC,gradientMap:gmap,side:THREE.DoubleSide})));
  sail.position.set(0.06,0.95,0);sail.rotation.y=Math.PI/2;grp.add(sail);
  grp.position.set(x,WATER_Y+0.24,z);grp.rotation.y=ry;grp.scale.setScalar(scale*2.1);
  grp.userData={by:WATER_Y+0.24,ph:rand(0,9),live:true};scene.add(grp);bobbers.push(grp);   // live: bobs/drifts in the main loop — exempt from the cell merge
  return grp;
}
function makeBuoy(x,z,c){
  const grp=new THREE.Group();
  const body=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.3,8),toon(c));body.position.y=0.5;grp.add(body);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(0.16,7,6),toon(0xfdf6e6));tip.position.y=1.25;grp.add(tip);
  grp.position.set(x,WATER_Y+0.1,z);grp.userData={by:WATER_Y+0.1,ph:rand(0,9),live:true};scene.add(grp);bobbers.push(grp);   // live bobber — exempt from the cell merge
}

export function buildProps(){
  // LOCAL xorshift for all Montrose beach/dune content — seeded per data const
  // so it NEVER touches the shared world rng() (the determinism gate). Zero
  // shared-rng draws: Montrose only grows buckets AFTER their frozen fill loops.
  const mkrng=seed=>{let s=(seed>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};};
  // ---- Montrose Point sanctuary (071): shared LOCAL geometry helpers (pure
  // math, zero rng) + a one-time prefilter of the ribbon samples to the Point's
  // own ribbons (z < -844). Reused by every 071 growth block below so the
  // pathSamples2 scan runs once, not per candidate. ----
  const mpSeg2=(px,pz,ax,az,bx,bz)=>{const dx=bx-ax,dz=bz-az,L=dx*dx+dz*dz;let t=L?((px-ax)*dx+(pz-az)*dz)/L:0;t=t<0?0:t>1?1:t;const cx=ax+t*dx,cz=az+t*dz;return (px-cx)**2+(pz-cz)**2;};
  const mpPoly2=(px,pz,pts)=>{let m=Infinity;for(let i=0;i<pts.length-1;i++){const d=mpSeg2(px,pz,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]);if(d<m)m=d;}return m;};
  const mpN=[];for(let i=0;i<pathSamples2.length;i++)if(pathSamples2[i][1]<-844)mpN.push(pathSamples2[i]);
  // ---- South Pond BANKS (117): the shared LOCAL bank test + sampling box for
  // the tuft and flower grows below (pure math, ZERO rng). The scatter annulus
  // is: distance to the LP_SOUTHPOND_WATER edge in [banks.edgeMin, dMax], on
  // Lincoln Park land, clear of the boardwalk deck, the pavilion and the
  // interpretive plates. NOTE the land test is lpLandHit/lpBlockedHit, NOT
  // pip(x,z,LAND) — LAND is the pre-112 world polygon and does not contain the
  // park (112 renders/walks LP through its own panels). Every polygon and hit
  // function is the chicago.js single truth (never forked). ----
  const spB=CH.LP_SOUTHPOND.banks,spPond=CH.LP_SOUTHPOND_WATER;
  const spEdge2=spB.edgeMin*spB.edgeMin,spDeck2=(CH.LP_BOARDWALK_HALF+0.6)**2;
  const spBox=(()=>{let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
    for(const p of spPond){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<z0)z0=p[1];if(p[1]>z1)z1=p[1]}
    const R=spB.ringR;return{x0:x0-R,x1:x1+R,z0:z0-R,z1:z1+R}})();
  const spBank=(x,z,dMax2)=>{
    const d2=mpPoly2(x,z,spPond);
    if(d2<spEdge2||d2>dMax2)return false;                                  // the bank annulus
    if(!CH.lpLandHit(x,z)||CH.lpBlockedHit(x,z))return false;              // LP land minus the pond + the zoo carves
    if(mpPoly2(x,z,CH.LP_BOARDWALK)<spDeck2)return false;                  // >=0.6 m off the deck edge
    if((x-CH.LP_HONEYCOMB.x)**2+(z-CH.LP_HONEYCOMB.z)**2<16)return false;  // off the pavilion
    for(const p of CH.LP_SOUTHPOND.plates)if((x-p.x)**2+(z-p.z)**2<1)return false;
    return true;
  };
  // ---- 129 THE RESERVE EXPANSION: the shared LOCAL geometry every dressing
  // grow below consumes (pure math, ZERO rng — declared here because the sapling
  // grow lives up in the tree block). The PERIMETER is ONE closed outline built
  // by concatenating the three rope runs and letting the three GATE gaps close
  // as straight bridges (run0.end->run1.start = south gate, run1.end->run2.start
  // = west gate, run2.end->run0.start = east gate), so "inside the reserve" is a
  // single point-in-polygon test that follows any data reshape automatically and
  // can never fork from the rope the player sees. ----
  const RSV=CH.MONTROSE_RESERVE;
  const rsvPoly=[].concat(...RSV.rope);
  const rsvBox=(()=>{let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
    for(const p of rsvPoly){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<z0)z0=p[1];if(p[1]>z1)z1=p[1]}
    return{x0,x1,z0,z1}})();
  const rsvIn=(x,z)=>{                                   // even-odd ray cast on the closed outline
    let c=false;
    for(let i=0,j=rsvPoly.length-1;i<rsvPoly.length;j=i++){
      const xi=rsvPoly[i][0],zi=rsvPoly[i][1],xj=rsvPoly[j][0],zj=rsvPoly[j][1];
      if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;
    }
    return c;
  };
  // every DRAWN ribbon sample in reach of the reserve, gathered ONCE: the new
  // corridor + spur (pathSamples2, drawn in buildPaths before us) and the real
  // Montrose trail lanes (pathSamplesMain). Sampling the DRAWN centerlines, not
  // a local curve mirror, is why a ribbon reshape can never strand a tuft on the
  // pavement (the 088 prop-clearance law).
  const rsvN=[];
  for(const arr of[pathSamples2,pathSamplesMain])for(const p of arr)
    if(p[0]>rsvBox.x0-9&&p[0]<rsvBox.x1+9&&p[1]>rsvBox.z0-9&&p[1]<rsvBox.z1+9)rsvN.push(p);
  const rsvNear=(x,z,d2)=>{for(let i=0;i<rsvN.length;i++){const p=rsvN[i];if((p[0]-x)**2+(p[1]-z)**2<d2)return true}return false};
  // NE-SW SWALE BANDS: a line of constant (x+z) runs SW->NE, so phasing the
  // accept test on (x+z)/period gives the drifting density stripes the refs'
  // dune-and-swale ground has (dense marram ridge, thin blowout, repeat).
  const rsvBand=(x,z)=>{const b=((x+z)/RSV.grass.bands.period)%1;return (b<0?b+1:b)<RSV.grass.bands.duty};
  const rsvCellF=(x,z,fr)=>{for(const c of RSV.cells)if(x>=c.x0-fr&&x<=c.x1+fr&&z>=c.z0-fr&&z<=c.z1+fr)return true;return false};
  // THE shared accept test for grass + straw. The nest CELLS are deliberately
  // ALLOWED (and their cellFringe halo skips the band gate, so the roped cells
  // read as the densest habitat in the unit — which is why they are roped).
  const rsvDress=(x,z)=>{
    const G=RSV.grass;
    if(!rsvIn(x,z))return false;
    if(!(rsvCellF(x,z,G.cellFringe)||rsvBand(x,z)))return false;
    if(rsvNear(x,z,G.clearD*G.clearD))return false;
    const D=RSV.platform.deckRect;
    if(x>D.x0-1.3&&x<D.x1+1.3&&z>D.z0-1.3&&z<D.z1+3.2)return false;          // off the platform footprint + its stair run
    if((x-RSV.exclosure.x)**2+(z-RSV.exclosure.z)**2<1.8)return false;        // the exclosure floor stays bare so the clutch reads
    return true;
  };
  // CLUMP CENTERS — filled by the grass grow, reused by the straw grow. Marram
  // does not carpet a dune, it grows in CLUMPS with bare blowout sand between
  // them (the refs' language, and the first round's flat uniform scatter read as
  // "cones on a lawn" instead). Sharing the centers is what mixes the straw INTO
  // the green clumps rather than laying a second independent field over them.
  let rsvClumps=null;
  // ---- trees ----
  {
    const T=CH.TREES;
    const inGarden=(x,z)=>x>T.garden.x0&&x<T.garden.x1&&z>T.garden.z0&&z<T.garden.z1;
    const nearPath=(x,z)=>{for(let i=0;i<pathSamples.length;i+=3){const p=pathSamples[i];if((p[0]-x)**2+(p[1]-z)**2<T.nearPathD2)return true}return false};
    let guard=0;
    while(treeSpots.length<T.count&&guard++<T.guard){
      const x=rand(T.region.xr[0],T.region.xr[1]),z=rand(T.region.zr[0],T.region.zr[1]);
      if(!pip(x,z,LAND))continue;
      if(inGarden(x,z)||nearPath(x,z))continue;
      if(x>T.dogBeach.xMin&&z<T.dogBeach.zMax&&z>T.dogBeach.zMin)continue;   // dog beach area
      let ok=true;for(const t of treeSpots)if((t[0]-x)**2+(t[1]-z)**2<T.minGapD2){ok=false;break}
      if(ok)treeSpots.push([x,z,rand(T.scale[0],T.scale[1]),rng()<T.pinkProb]);
    }
    for(const f of T.fixed)treeSpots.push(f);
    for(let i=0;i<T.north.count;i++)treeSpots.push([rand(T.north.xr[0],T.north.xr[1]),rand(T.north.zr[0],T.north.zr[1]),rand(T.north.scale[0],T.north.scale[1]),rng()<T.north.pinkProb]);

    // POST-filter (after all rng consumption — zero determinism impact): no
    // trees inside the tennis block or the Diversey range/mini-golf field,
    // none over the task-023 garden ribbons (peanut loop + entrance path live
    // in pathSamples2, invisible to the frozen nearPath scan by design), and
    // none on the sanctuary birdwatch DECK, its stair run, the west approach
    // or the east camera lane (issue 008). The deck clear-rect DERIVES from
    // SANCTUARY.deck so it follows any deck rework — the deck reads as sited
    // in a clearing (how real viewing platforms are placed).
    {
      const inRect=(t,r)=>t[0]>r.x0-1&&t[0]<r.x1+1&&t[1]>r.z0-1&&t[1]<r.z1+1;
      const near2=t=>{for(const p of pathSamples2){if((p[0]-t[0])**2+(p[1]-t[1])**2<T.nearPathD2)return true}return false};
      const D=CH.SANCTUARY.deck,stX=Math.min(...D.stairs.map(s=>s.x0));
      const deckClear={x0:stX-5,x1:D.x1+8,z0:D.z0-3.5,z1:D.z1+4};   // x≈160.9–183, z≈−402–−390
      for(let i=treeSpots.length-1;i>=0;i--)
        if(inRect(treeSpots[i],CH.TENNIS.block)||inRect(treeSpots[i],CH.DIVERSEY.range)||inRect(treeSpots[i],deckClear)||near2(treeSpots[i]))treeSpots.splice(i,1);
    }

    // ---- Montrose Point tree clusters (071): grown into the SHARED tree buckets
    // in place — appended to treeSpots AFTER the post-filter and BEFORE n is
    // taken, so +0 InstancedMesh buckets and +0 draws (they flow through the
    // archetype/collider loop below untouched). LOCAL tr rng only; rejection keeps
    // clusters off the ribbons, the hedge line and the dune so sightlines stay open.
    {
      const MP=CH.MONTROSE_POINT,TF=MP.treeFill,tr=mkrng(TF.seed);
      for(let k=0;k<MP.trees.length;k++){
        const ax=MP.trees[k][0],az=MP.trees[k][1],sp=TF.spread[k];
        for(let t=0;t<TF.per[k];t++){
          for(let tries=0;tries<20;tries++){
            const x=ax+(tr()*2-1)*sp,z=az+(tr()*2-1)*sp;
            if(!pip(x,z,LAND)||CH.inMontroseDune(x,z))continue;
            let bad=false;for(const p of mpN)if((p[0]-x)**2+(p[1]-z)**2<6.25){bad=true;break}   // >=2.5 m off every ribbon
            if(bad||mpPoly2(x,z,MP.hedge.pts)<4)continue;                                        // >=2.0 m off the hedge line
            treeSpots.push([x,z,TF.scale[0]+tr()*(TF.scale[1]-TF.scale[0]),false]);break;
          }
        }
      }
    }

    // ---- Lincoln Park strip fill (127): the walk to the Fullerton underpass —
    // grown into the SHARED tree buckets exactly like the Montrose block above
    // (LOCAL seed, appended after the post-filter, before n → +0 buckets,
    // shared rng untouched). Rejections per the LP_TREEFILL data comment.
    {
      const TF=CH.LP_TREEFILL,tr=mkrng(TF.seed),T2=CH.LP_THEATER,own=[];
      // 1.4 m land inset on all four sides — no trunk at the water's edge
      const land=(x,z)=>CH.lpLandHit(x,z)&&CH.lpLandHit(x+1.4,z)&&CH.lpLandHit(x-1.4,z)&&CH.lpLandHit(x,z+1.4)&&CH.lpLandHit(x,z-1.4);
      const nearTrail=(x,z)=>{for(const p of CH.LP_TRAIL_LAKE){if((p[0]-x)**2+(p[1]-z)**2<42.25)return true}return false};   // >=6.5 m off the bike centerline (covers the walk lane too)
      for(const[ax,az,per,sp]of TF.anchors){
        for(let t=0;t<per;t++){
          for(let tries=0;tries<24;tries++){
            const x=ax+(tr()*2-1)*sp,z=az+(tr()*2-1)*sp;
            if(x<16||!land(x,z))continue;                   // x>=16 keeps trunks off the berm toe
            if(z>622&&z<676)continue;                       // 124 portal-approach corridor — load-bearing sightlines
            if(z>565&&z<600)continue;                       // Theater sightline band
            if(x>T2.x0-3&&x<T2.x1+3&&z>T2.z0-3&&z<T2.z1+3)continue;
            if(nearTrail(x,z))continue;
            let bad=false;
            for(const h of CH.LP_RIPPLES.heads)if((h[0]-x)**2+(h[1]-z)**2<12.25){bad=true;break}   // >=3.5 m off every head
            if(!bad)for(const e of CH.LP_TREES)if((e[0]-x)**2+(e[1]-z)**2<16){bad=true;break}      // >=4 m off the hand-placed elms
            if(!bad)for(const o of own)if((o[0]-x)**2+(o[1]-z)**2<12.25){bad=true;break}
            if(bad)continue;
            own.push([x,z]);treeSpots.push([x,z,TF.scale[0]+tr()*(TF.scale[1]-TF.scale[0]),false]);break;
          }
        }
      }
    }

    // ---- 129 THE RESERVE EXPANSION cottonwood SCRUB: low volunteer saplings in
    // the swales — grown into the SHARED tree buckets exactly like the Montrose
    // Point and LP blocks above (LOCAL saplings.seed, appended after the
    // post-filter and before n is taken → +0 InstancedMesh buckets, +0 draws;
    // the shared rng is untouched). Rejections, in the order they bite:
    //   · inside the perimeter and on LAND (never on the berm or the trail side)
    //   · NOT inside a nest cell — a tree in the exclosure panne is wrong twice
    //     (habitat AND it would hide the signature object)
    //   · >=6 m off every corridor/spur/trail sample
    //   · >=7 m off the mt-lawn-fill SIGHTLINE (164,-735)->(112,-879): that axis
    //     IS the owner's 041 framing, and Cricket Hill + its kites have to stay
    //     the mid-distance read through it (GEOGRAPHY §Sightline law)
    //   · >=6 m off the platform and the exclosure.
    {
      const SP=RSV.saplings,sr=mkrng(SP.seed);
      const sight=(x,z)=>{                                    // point-to-segment, squared
        const ax=164,az=-735,bx=112,bz=-879,dx=bx-ax,dz=bz-az,L=dx*dx+dz*dz;
        let u=((x-ax)*dx+(z-az)*dz)/L;u=u<0?0:u>1?1:u;
        return (x-(ax+u*dx))**2+(z-(az+u*dz))**2;
      };
      const D=RSV.platform.deckRect,E=RSV.exclosure;
      const pcx=(D.x0+D.x1)/2,pcz=(D.z0+D.z1)/2;
      for(const[ax,az]of SP.anchors){
        const per=SP.per[0]+Math.floor(sr()*(SP.per[1]-SP.per[0]+1));
        for(let t=0;t<per;t++){
          for(let tries=0;tries<22;tries++){
            const x=ax+(sr()*2-1)*5.5,z=az+(sr()*2-1)*5.5;
            if(!pip(x,z,LAND)||!rsvIn(x,z)||CH.inReserveCell(x,z))continue;
            if(rsvNear(x,z,36))continue;                       // >=6 m off every ribbon
            if(sight(x,z)<49)continue;                         // >=7 m off the 041 sightline
            if((x-pcx)**2+(z-pcz)**2<36||(x-E.x)**2+(z-E.z)**2<36)continue;
            treeSpots.push([x,z,SP.scale[0]+sr()*(SP.scale[1]-SP.scale[0]),false]);break;
          }
        }
      }
    }

    // 088 CLEARANCE NUDGE — "trees in the middle of pathways" (owner). Pure
    // geometry, ZERO rng: runs AFTER all rng consumption so world scatter stays
    // byte-identical (per-tree color/scale are index-coupled — we MOVE x,z only,
    // never add/remove/reorder). For each rng-placed spot, up to 4 refinement
    // passes push it clear of the nearest REAL ribbon (ribbonLanes) by w/2+0.75 m
    // (nudge target 0.6+0.15, comfortably past the audit's w/2+0.5). The SPIT's
    // hand-placed CH.TREES.fixed trees are the MAIN SESSION's to reposition in
    // data — skipped here so the audit still surfaces them.
    {
      const fixedSet=new Set(T.fixed);
      const seg=(px,pz,ax,az,bx,bz)=>{const dx=bx-ax,dz=bz-az,L=dx*dx+dz*dz;let u=L?((px-ax)*dx+(pz-az)*dz)/L:0;u=u<0?0:u>1?1:u;const cx=ax+u*dx,cz=az+u*dz;return{d:Math.hypot(px-cx,pz-cz),cx,cz,dx,dz};};
      // nearest ribbon by smallest clearance MARGIN (d − required); required uses
      // the deliberately-larger 0.6 so nudged trees pass the 0.5 audit with room.
      const nearest=(px,pz)=>{let b=null;for(const lane of ribbonLanes){const req=lane.w/2+0.6,pts=lane.pts;for(let i=0;i<pts.length-1;i++){const r=seg(px,pz,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]);if(!b||r.d-req<b.d-b.req){b=r;b.req=req;b.w=lane.w;}}}return b;};
      for(const spot of treeSpots){
        if(fixedSet.has(spot))continue;                 // hand-placed data tree — main session moves it
        for(let it=0;it<4;it++){
          const b=nearest(spot[0],spot[1]);
          if(!b||b.d>=b.req)break;                       // already clear of every ribbon
          const target=b.req+0.15;
          let nx=spot[0]-b.cx,nz=spot[1]-b.cz,L=Math.hypot(nx,nz),moved=false;
          if(L<0.02){                                    // sitting on the centerline — use the segment perpendicular
            const sl=Math.hypot(b.dx,b.dz)||1,px=-b.dz/sl,pz=b.dx/sl;
            for(const s of[1,-1]){const x=b.cx+px*s*target,z=b.cz+pz*s*target;if(pip(x,z,LAND)){spot[0]=x;spot[1]=z;moved=true;break;}}
          }else{                                         // push straight away from the nearest ribbon point
            nx/=L;nz/=L;
            const x1=b.cx+nx*target,z1=b.cz+nz*target;
            if(pip(x1,z1,LAND)){spot[0]=x1;spot[1]=z1;moved=true;}
            else{const x2=b.cx-nx*target,z2=b.cz-nz*target;if(pip(x2,z2,LAND)){spot[0]=x2;spot[1]=z2;moved=true;}}
          }
          if(!moved)break;                               // both sides leave land — leave it (audit flags for a hand fix)
        }
      }
    }
    // 088: snapshot the FINAL (nudged) tree placements for the clearance audit.
    TREE_SPOTS.length=0;for(const t of treeSpots)TREE_SPOTS.push(t.slice());

    const n=treeSpots.length,M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),Eu=new THREE.Euler();

    // ---- 5 tree archetypes, each ONE merged BufferGeometry (tapered trunk +
    // visible branches + leaf masses + edge leaf-cards) with baked VERTEX COLORS
    // (bark browns vs two-tone leaf greens), drawn as ONE InstancedMesh via a
    // shared toon material. 5 canopy meshes + 1 shadow mesh = 6 draw calls.
    // Assignment is per-tree via the LOCAL m32 rng only — the shared world rng is
    // never touched in this block, so tree PLACEMENT stays byte-identical. ----
    const bark=new THREE.Color(0x875636),barkD=new THREE.Color(0x6f4529);
    const lfLo=new THREE.Color(0x4e9d54),lfHi=new THREE.Color(0xa8e08a);         // leaf gradient: dark base → light top
    const pkLo=new THREE.Color(0xef9ec6),pkHi=new THREE.Color(0xffd6ea),wht=new THREE.Color(0xfff3f8);
    const _c=new THREE.Color(),Yv=new THREE.Vector3(0,1,0),_dv=new THREE.Vector3(),_qm=new THREE.Matrix4();
    // paint(g,c0)=flat c0; paint(g,c0,c1,y0,y1)=per-vertex bottom→top gradient
    function paint(g,c0,c1,y0,y1){
      const p=g.attributes.position,m=p.count,a=new Float32Array(m*3);
      for(let i=0;i<m;i++){
        if(c1){let t=(p.getY(i)-y0)/(y1-y0);t=t<0?0:t>1?1:t;_c.copy(c0).lerp(c1,t);}else _c.copy(c0);
        a[i*3]=_c.r;a[i*3+1]=_c.g;a[i*3+2]=_c.b;
      }
      g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;
    }
    const trunkP=(bR,tR,h,seg)=>{const g=new THREE.CylinderGeometry(tR,bR,h,seg);g.translate(0,h/2,0);return paint(g,bark);};
    const branchP=(a,b,r0,r1,seg)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz);
      const g=new THREE.CylinderGeometry(r1,r0,len,seg);g.translate(0,len/2,0);
      g.applyMatrix4(_qm.makeRotationFromQuaternion(Q.setFromUnitVectors(Yv,_dv.set(dx,dy,dz).normalize())));
      g.translate(a[0],a[1],a[2]);return paint(g,barkD);
    };
    const massP=(cx,cy,cz,rx,ry,rz,ws,hs,c0,c1,y0,y1)=>{const g=new THREE.SphereGeometry(1,ws,hs);g.scale(rx,ry,rz);g.translate(cx,cy,cz);return paint(g,c0,c1,y0,y1);};
    const cardsP=(P,cx,cy,cz,rx,ry,rz,cnt,sz,c0,c1,y0,y1,rnd)=>{
      for(let k=0;k<cnt;k++){
        const th=rnd()*6.2832,u=rnd()*2-1,sp=Math.sqrt(1-u*u);
        const g=new THREE.TetrahedronGeometry(sz*(0.7+rnd()*0.7),0);
        g.applyMatrix4(_qm.makeRotationY(rnd()*6.2832));g.applyMatrix4(_qm.makeRotationX(rnd()*6.2832));
        g.translate(cx+sp*Math.cos(th)*rx,cy+u*ry,cz+sp*Math.sin(th)*rz);
        P.push(paint(g,c0,c1,y0,y1));
      }
    };
    const merge=P=>BufferGeometryUtils.mergeBufferGeometries(P.map(g=>g.index?g.toNonIndexed():g));
    // A classic round — round crown, branch forks visible in the gaps
    const archA=()=>{const rnd=m32(0xA0F1),y0=2.9,y1=5.9,P=[];P.push(trunkP(0.42,0.24,2.7,7));
      P.push(branchP([0,1.7,0],[0.55,3.7,0.25],0.15,0.06,5),branchP([0,1.8,0],[-0.6,3.8,-0.15],0.14,0.06,5),branchP([0,1.9,0],[0.1,4.1,-0.5],0.13,0.05,5));
      P.push(massP(0,4.3,0,1.55,1.5,1.55,8,7,lfLo,lfHi,y0,y1));
      for(const[mx,my,mz]of[[1.15,3.95,0.1],[-0.5,4.0,1.05],[-1.05,4.15,-0.4],[0.35,4.2,-1.05],[0.7,4.75,0.6]])P.push(massP(mx,my,mz,0.95,0.9,0.95,7,6,lfLo,lfHi,y0,y1));
      cardsP(P,0,4.3,0,1.8,1.6,1.8,30,0.34,lfLo,lfHi,y0,y1,rnd);return merge(P);};
    // B tall oval — poplar, narrow vertical column of leaf masses
    const archB=()=>{const rnd=m32(0xB0F2),y0=2.8,y1=7.0,P=[];P.push(trunkP(0.3,0.17,3.0,6));
      P.push(branchP([0,2.4,0],[0.35,4.6,0.1],0.1,0.05,5),branchP([0,2.6,0],[-0.32,5.0,-0.08],0.1,0.05,5));
      for(const[mx,my,mz,rr,ry]of[[0,3.4,0,0.95,1.0],[0.1,4.3,0.05,0.9,1.05],[-0.08,5.1,-0.05,0.82,1.0],[0.05,5.9,0,0.66,0.9],[0,6.55,0,0.42,0.6]])P.push(massP(mx,my,mz,rr,ry,rr,7,7,lfLo,lfHi,y0,y1));
      cardsP(P,0,4.9,0,0.95,2.0,0.95,34,0.3,lfLo,lfHi,y0,y1,rnd);return merge(P);};
    // C layered tiers — 3 stacked flattened canopy discs + a straight leader
    const archC=()=>{const rnd=m32(0xC0F3),y0=3.0,y1=6.0,P=[];P.push(trunkP(0.4,0.22,2.6,7));
      P.push(branchP([0,2.6,0],[0,5.4,0],0.12,0.05,6),branchP([0,3.2,0],[1.5,3.5,0],0.1,0.05,5),branchP([0,4.3,0],[-1.2,4.5,0.2],0.09,0.05,5));
      P.push(massP(0,3.5,0,1.85,0.55,1.85,9,6,lfLo,lfHi,y0,y1),massP(0.1,4.55,0,1.5,0.5,1.5,9,6,lfLo,lfHi,y0,y1),massP(0,5.45,0,1.05,0.5,1.05,8,6,lfLo,lfHi,y0,y1));
      cardsP(P,0,3.5,0,1.95,0.4,1.95,12,0.3,lfLo,lfHi,y0,y1,rnd);cardsP(P,0.1,4.55,0,1.6,0.35,1.6,10,0.28,lfLo,lfHi,y0,y1,rnd);cardsP(P,0,5.45,0,1.15,0.35,1.15,8,0.26,lfLo,lfHi,y0,y1,rnd);return merge(P);};
    // D wide spreading — mature elm, low broad crown, prominent horizontal branches
    const archD=()=>{const rnd=m32(0xD0F4),y0=2.7,y1=4.8,P=[];P.push(trunkP(0.52,0.32,2.2,8));
      const arms=[[2.2,3.5,0.3],[-2.0,3.4,0.5],[0.4,3.6,2.1],[0.2,3.5,-2.0]];
      for(const a of arms)P.push(branchP([0,2.0,0],a,0.18,0.07,6));
      P.push(massP(0,3.7,0,1.5,1.1,1.5,8,7,lfLo,lfHi,y0,y1));
      for(const[ax,ay,az]of arms)P.push(massP(ax*0.92,ay+0.25,az*0.92,1.15,0.9,1.15,7,6,lfLo,lfHi,y0,y1));
      cardsP(P,0,3.7,0,2.7,0.95,2.7,34,0.34,lfLo,lfHi,y0,y1,rnd);return merge(P);};
    // E cherry — full pink blossom cluster with a couple of white masses baked in
    const archE=()=>{const rnd=m32(0xE0F5),y0=2.9,y1=5.6,P=[];P.push(trunkP(0.34,0.2,2.4,7));
      P.push(branchP([0,1.6,0],[0.5,3.4,0.2],0.13,0.05,5),branchP([0,1.7,0],[-0.55,3.5,-0.15],0.12,0.05,5));
      P.push(massP(0,4.0,0,1.5,1.35,1.5,8,7,pkLo,pkHi,y0,y1));
      for(const[mx,my,mz,w]of[[1.1,3.8,0.1,0],[-0.55,3.85,0.95,1],[-1.0,3.95,-0.45,0],[0.4,4.0,-1.0,1],[0.65,4.5,0.55,0]])
        P.push(w?massP(mx,my,mz,0.9,0.85,0.9,7,6,wht,wht,y0,y1):massP(mx,my,mz,0.9,0.85,0.9,7,6,pkLo,pkHi,y0,y1));
      cardsP(P,0,4.0,0,1.75,1.5,1.75,30,0.32,pkLo,pkHi,y0,y1,rnd);return merge(P);};

    const geos=[archA(),archB(),archC(),archD(),archE()];
    const leafMat=curveMat(new THREE.MeshToonMaterial({vertexColors:true,gradientMap:gmap}));   // shared across all 5
    const meshes=geos.map(g=>new THREE.InstancedMesh(g,leafMat,n));                              // over-allocated to n each
    const counts=[0,0,0,0,0];
    const shad=new THREE.InstancedMesh(new THREE.CircleGeometry(1.5,14),new THREE.MeshBasicMaterial({color:0x2f6b45,transparent:true,opacity:0.22,depthWrite:false}),n);
    curveMat(shad.material);
    const flat=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
    for(let i=0;i<n;i++){
      const[x,z,s,pink]=treeSpots[i];
      const r=m32((i*2654435761)>>>0);   // LOCAL per-tree rng — placement rng untouched
      // pink→E; greens: A 35% / B 20% / C 20% / D 25% via the local rng.
      // (skip 3 — m32's 1st output is weakly spread for i*const seeds; the 4th
      // hits the target weights: measured ~33/21/20/26.)
      let ai;if(pink)ai=4;else{r();r();r();const w=r();ai=w<0.35?0:w<0.55?1:w<0.75?2:3;}
      Eu.set(0,r()*Math.PI*2,0);Q.setFromEuler(Eu);                                              // per-tree yaw so clones don't line up
      M.compose(V.set(x,0,z),Q,S.set(s,s,s));
      const slot=counts[ai]++;meshes[ai].setMatrixAt(slot,M);
      const t=0.92+r()*0.16;_c.setRGB(t,t,t);meshes[ai].setColorAt(slot,_c);                     // subtle grayscale tint ×vertexColor
      M.compose(V.set(x,0.03,z),flat,S.set(s,s,s));shad.setMatrixAt(i,M);
      collide(x,z,0.55*s);
    }
    for(let k=0;k<5;k++){meshes[k].count=counts[k];meshes[k].instanceMatrix.needsUpdate=true;if(meshes[k].instanceColor)meshes[k].instanceColor.needsUpdate=true;}
    shad.instanceMatrix.needsUpdate=true;
    scene.add(meshes[0],meshes[1],meshes[2],meshes[3],meshes[4],shad);
  }

  // ---- TEN THOUSAND RIPPLES (127) — six matte-white Buddha heads half-sunk in
  // the Drive-side lawn just south of Diversey (Indira Freitas Johnson, 2012/13).
  // A STYLIZED toon homage in the Cloud Gate / Crown Fountain precedent, never a
  // facsimile. ONE merged BufferGeometry authored in a LOCAL frame (y=0 is the
  // lawn line, +Z is the face direction) drawn as ONE InstancedMesh -> +1 draw,
  // +0 further buckets. ZERO rng of ANY kind: every placement, yaw and lean is
  // authored in CH.LP_RIPPLES.heads, and the only per-bump variation is a fixed
  // function of (row, index). The geometry runs ~0.42 m BELOW y=0 so a leaning
  // head never opens a gap at the grass, and there is NO shadow disc — these
  // EMERGE from the lawn; a dark ring would read as a hole. ----
  {
    const R=CH.LP_RIPPLES,P=[],D=Math.PI/180;
    const merge=A=>BufferGeometryUtils.mergeBufferGeometries(A.map(g=>g.index?g.toNonIndexed():g));
    // SKULL — the ellipsoid dome. Top ~0.94, bottom ~-0.42 (buried to the jaw).
    P.push(new THREE.SphereGeometry(0.60,12,9).scale(1.0,1.14,0.96).translate(0,0.26,0));
    // CURL BANDS — the signature, and the ONLY thing that makes the piece
    // recognizable at walking distance. The read we need is CONCENTRIC BANDS:
    // horizontal white ridges with a shaded groove between them, not an allover
    // studded ball. Three numbers do that work, and they fight each other:
    //   * FEW, CHUNKY rows (5) — one rib per ~0.25 m of dome, so a rib survives
    //     the 8-20 m framings instead of dissolving into texture.
    //   * WITHIN a row the bumps OVERLAP (centre spacing 1.55x the bump radius
    //     vs a 2x diameter) so the whole ring FUSES into one scalloped ridge.
    //   * BETWEEN rows a real GROOVE: 22 deg of latitude (~0.26 m of arc) against
    //     a 0.17 m ridge leaves ~0.09 m of bare skull for the shadow line.
    // The rings ride a copy of the skull ellipsoid pushed 0.02 m proud (uniform,
    // so the crown rows stay proud too — a radius-only offset sinks at the pole).
    // Azimuth is NEVER staggered between rows: each ring is its own clean band.
    // The face gap narrows with latitude and closes at the hairline (lat 52), so
    // the bands wrap down the sides and past the ears.
    const unit=new THREE.SphereGeometry(1,6,5),CA=0.62,CB=0.704;
    const ROWS=[[-14,80,0.085],[8,62,0.085],[30,34,0.085],[52,0,0.085],[72,0,0.055]];   // [lat deg, face-gap half-angle deg, bump radius]
    for(let ri=0;ri<ROWS.length;ri++){
      const lat=ROWS[ri][0]*D,gap=ROWS[ri][1]*D,br=ROWS[ri][2];
      const y=0.26+CB*Math.sin(lat),rr=CA*Math.cos(lat);
      const cnt=Math.max(6,Math.round(2*Math.PI*rr/(1.55*br)));
      for(let i=0;i<cnt;i++){
        let az=i/cnt*Math.PI*2;if(az>Math.PI)az-=Math.PI*2;      // az=0 faces +Z
        if(Math.abs(az)<gap)continue;
        const k=br*(1+0.12*Math.sin(ri*12.9898+i*4.1421));       // deterministic +-12% bump size
        P.push(unit.clone().scale(k,k,k).translate(rr*Math.sin(az),y,rr*Math.cos(az)*0.96));
      }
    }
    // USHNISHA — the topknot, a distinct tier sitting inside the lat-72 ring.
    P.push(new THREE.SphereGeometry(0.145,8,6).scale(1,0.82,1).translate(0,1.0,0));
    // FACE — minimal and calm: brows bowing up, closed lids bowing down, a soft
    // nose bar and lips. Deliberately under-detailed (the brief: do not
    // over-detail the face; the hair is the piece).
    // (127 round 2: features sized up ~20% and pushed ~0.015 prouder — at the
    // f3 framing's ~5 m the original relief washed out white-on-white; the
    // deeper lid tilt opens a shadow line under the arc so closed eyes read.)
    for(const sx of[1,-1]){
      const brow=new THREE.TorusGeometry(0.115,0.024,5,10,1.5);
      brow.rotateZ(Math.PI/2-0.75);brow.rotateX(-0.45);brow.translate(sx*0.150,0.515,0.515);P.push(brow);
      const eye=new THREE.TorusGeometry(0.088,0.021,5,10,1.35);
      eye.rotateZ(-Math.PI/2-0.675);eye.rotateX(-0.62);eye.translate(sx*0.150,0.415,0.55);P.push(eye);
      const ear=new THREE.BoxGeometry(0.07,0.20,0.13);          // long lobes, half-buried — sited in the groove between the two lowest bands so the ridges don't swallow them
      ear.rotateZ(-sx*0.08);ear.translate(sx*0.615,0.225,0.02);P.push(ear);
    }
    const nose=new THREE.BoxGeometry(0.09,0.18,0.08);nose.rotateX(-0.12);nose.translate(0,0.33,0.57);P.push(nose);
    const lips=new THREE.BoxGeometry(0.16,0.042,0.05);lips.rotateX(-0.1);lips.translate(0,0.175,0.585);P.push(lips);

    const geo=merge(P);
    const heads=new THREE.InstancedMesh(geo,toon(R.color),R.heads.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),S=new THREE.Vector3(),Eu=new THREE.Euler();
    for(let i=0;i<R.heads.length;i++){
      const[x,z,ry,tx,tz,s]=R.heads[i];
      Eu.set(tx,ry,tz,'YXZ');Q.setFromEuler(Eu);                // yaw first, the small leans head-local
      M.compose(V.set(x,0,z),Q,S.set(s,s,s));heads.setMatrixAt(i,M);
      collide(x,z,R.collide*s);
    }
    heads.instanceMatrix.needsUpdate=true;
    scene.add(heads);
  }

  // ---- hedges ----
  {
    const H=CH.HEDGES,hm=toon(H.color);
    const spots=[];
    const inGap=z=>H.west.gaps&&H.west.gaps.some(g=>z>=g[0]&&z<=g[1]);   // LSD underpass openings
    for(let z=H.west.z0;z<=H.west.z1;z+=H.west.step){if(inGap(z))continue;spots.push([H.west.x,z]);}
    for(let x=H.north.x0;x<=H.north.x1;x+=H.north.step)spots.push([x,H.north.z]);
    if(H.cap)for(let x=H.cap.x0;x<=H.cap.x1;x+=H.cap.step)spots.push([x,H.cap.z]);
    // ---- Montrose Point (071): THE MAGIC HEDGE — grown into THIS same bucket in
    // place (mspots appended after the frozen Jarvis spots → +0 InstancedMesh
    // buckets, +0 draws). LOCAL hr rng only. Overlapping blobs follow the
    // hedge.pts tangent (per-instance yaw), skip the birder windows (gaps) + the
    // hero-path edge; a sparse ragged low front row on the S (+z, path) side reads
    // as the refs' rough hedge foot. Full-height wall blobs collide (r 0.85, ring
    // inside the path margin); the ragged row stays soft (no collider).
    const MP=CH.MONTROSE_POINT,HF=MP.hedgeFill,GP=MP.hedge,hr=mkrng(HF.seed),mspots=[];
    const gapHit=(x,z)=>{for(const g of GP.gaps)if((g[0]-x)**2+(g[1]-z)**2<HF.gapR*HF.gapR)return true;return false;};
    const pathHit=(x,z)=>mpPoly2(x,z,MP.paths.entrance)<6.0025||mpPoly2(x,z,MP.paths.loop)<6.0025;   // >=2.45 m to either ribbon
    const emitAlong=(pts,step,cb)=>{                     // walk a control polyline, emit at arclength intervals
      let d=0,segStart=0;
      for(let i=0;i<pts.length-1;i++){
        const ax=pts[i][0],az=pts[i][1],dx=pts[i+1][0]-ax,dz=pts[i+1][1]-az,L=Math.hypot(dx,dz);if(L<1e-9)continue;
        const tx=dx/L,tz=dz/L;
        while(d<=segStart+L+1e-9){const s=d-segStart;cb(ax+tx*s,az+tz*s,tx,tz);d+=step;}
        segStart+=L;
      }
    };
    emitAlong(GP.pts,HF.step,(bx,bz,tx,tz)=>{            // full-height green wall
      const j=(hr()*2-1)*HF.jitter,x=bx-tz*j,z=bz+tx*j;                       // lateral jitter along the perpendicular
      const sx=HF.sx[0]+hr()*(HF.sx[1]-HF.sx[0]),sy=HF.sy[0]+hr()*(HF.sy[1]-HF.sy[0]);
      if(gapHit(x,z)||pathHit(x,z))return;
      mspots.push({x,z,yaw:Math.atan2(tx,tz),sx,sy,sz:HF.sz,wall:true});
    });
    const RG=HF.ragged;
    emitAlong(GP.pts,RG.step,(bx,bz,tx,tz)=>{            // ragged low front row on the +z (path) side
      let px=-tz,pz=tx;if(pz<0){px=-px;pz=-pz;}                               // perpendicular pointing to the path side
      const off=RG.off[0]+hr()*(RG.off[1]-RG.off[0]),x=bx+px*off,z=bz+pz*off;
      const sy=RG.sy[0]+hr()*(RG.sy[1]-RG.sy[0]),sx=1.0+hr()*0.4;
      if(gapHit(x,z)||pathHit(x,z))return;
      mspots.push({x,z,yaw:Math.atan2(tx,tz),sx,sy,sz:1.0,wall:false});
    });
    const hedge=new THREE.InstancedMesh(new THREE.SphereGeometry(1,9,8),hm,spots.length+mspots.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    spots.forEach((p,i)=>{M.compose(V.set(p[0],H.y,p[1]),Q.identity(),S.set(H.scale[0],H.scale[1],H.scale[2]));hedge.setMatrixAt(i,M)});
    mspots.forEach((b,i)=>{E.set(0,b.yaw,0);Q.setFromEuler(E);M.compose(V.set(b.x,HF.y,b.z),Q,S.set(b.sx,b.sy,b.sz));hedge.setMatrixAt(spots.length+i,M);if(b.wall)collide(b.x,b.z,0.85);});
    hedge.instanceMatrix.needsUpdate=true;scene.add(hedge);
  }

  // ---- grass tufts (small, dense — human scale) ----
  {
    const TU=CH.TUFTS,n=TU.count,tm=toon(TU.color);
    const tuft=new THREE.InstancedMesh(new THREE.ConeGeometry(0.09,0.3,5),tm,n+CH.MONTROSE_DUNE.grass.count+CH.MONTROSE_POINT.prairie.tufts+spB.tufts+spB.reeds+CH.LP_CONSERVATORY.flora.tufts+RSV.grass.count);   // 117: + the South Pond bank grass/reeds; 122: + the conservatory straw grasses; 129: + the reserve swale grass (APPENDED — every existing index is unchanged)
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
    // no grass poking through the entrance monument's decomposed-granite pad
    // (task 023): the scaleY rand is still drawn (rng order frozen), the tuft
    // is just stamped at zero scale when it lands on the pad ellipse.
    const EP=CH.ENTRANCE.pad;
    const onPad=(x,z)=>((x-EP.x)/EP.rx)**2+((z-EP.z)/EP.rz)**2<1;
    let placed=0,guard=0;
    // 084: the accept test samples the FROZEN pre-084 land ghost (rand pattern
    // and count bit-identical), then the zero-scale stamp hides any spot the
    // compression turned into water / the mole's stone cap — the onPad idiom.
    while(placed<n&&guard++<TU.guard){const x=rand(TU.xr[0],TU.xr[1]),z=rand(TU.zr[0],TU.zr[1]);if(!pip(x,z,LAND_GHOST084))continue;
      const sy=rand(TU.scaleY[0],TU.scaleY[1]);
      const hide=onPad(x,z)||!pip(x,z,LAND)||CH.scatterCarve084(x,z);
      M.compose(V.set(x,0.14,z),Q.identity(),hide?S.set(0,0,0):S.set(1,sy,1));tuft.setMatrixAt(placed++,M)}
    // ---- Montrose DUNE marram grass: grow the tuft bucket in place with a
    // LOCAL xorshift (zero shared rng — placed already sits at the park-tuft
    // count above). Taller than park tufts so it reads as beach/dune grass; the
    // bucket is one green material (r128 toon ignores setColorAt) so grass.color
    // is expressed via height only. Spills a little onto the sand via grass.fringe.
    {
      const DG=CH.MONTROSE_DUNE.grass,db=CH.MONTROSE_DUNE.bounds,fr=DG.fringe,dr=mkrng(DG.seed);
      const inFringe=(x,z)=>x>=db.x0-fr&&x<=db.x1+fr&&z>=db.z0-fr&&z<=db.z1+fr;
      for(let k=0;k<DG.count;k++){
        let x=0,z=0;
        for(let tries=0;tries<8;tries++){
          x=db.x0-fr+dr()*(db.x1-db.x0+2*fr);z=db.z0-fr+dr()*(db.z1-db.z0+2*fr);
          if(CH.inMontroseDune(x,z)||inFringe(x,z))break;
        }
        const sy=DG.scaleY[0]+(DG.scaleY[1]-DG.scaleY[0])*dr();
        const bh=CH.montroseBeachH(x,z),y=(bh==null?0:bh)+0.14;
        M.compose(V.set(x,y,z),Q.identity(),S.set(1,sy,1));tuft.setMatrixAt(placed++,M);
      }
    }
    // ---- Montrose POINT prairie (071): taller straw-length meadow grass — grown
    // into the SAME tuft bucket in place (placed continues past the dune grass →
    // +0 InstancedMesh buckets, +0 draws). LOCAL pr rng; rejection-sampled in the
    // meadow rect, clear of the ribbons, the hedge line and every gate/panel/
    // scope/birder footprint. Plus the STRAW half of the palette: ONE merged
    // frustum-culled Mesh of thin cones (+1 draw ONLY when the Point is framed).
    {
      const MP=CH.MONTROSE_POINT,PR=MP.prairie,me=MP.meadow;
      const near=[[MP.gate.x,MP.gate.z,3],[MP.panel.x,MP.panel.z,1.2],[MP.scope.x,MP.scope.z,1]];
      for(const b of MP.birders)near.push([b.x,b.z,1]);
      const cd2=PR.clearD*PR.clearD;
      const blocked=(x,z)=>{
        if(!pip(x,z,LAND)||CH.inMontroseDune(x,z))return true;
        for(const p of mpN)if((p[0]-x)**2+(p[1]-z)**2<cd2)return true;
        if(mpPoly2(x,z,MP.hedge.pts)<2.56)return true;                 // >=1.6 m to the hedge line
        for(const q of near)if((q[0]-x)**2+(q[1]-z)**2<q[2]*q[2])return true;
        return false;
      };
      const pr=mkrng(PR.seed);
      for(let i=0;i<PR.tufts;i++){
        for(let tries=0;tries<8;tries++){
          const x=me.x0+pr()*(me.x1-me.x0),z=me.z0+pr()*(me.z1-me.z0);
          if(blocked(x,z))continue;
          const sy=PR.tuftScaleY[0]+pr()*(PR.tuftScaleY[1]-PR.tuftScaleY[0]);
          M.compose(V.set(x,0.14,z),Q.identity(),S.set(1,sy,1));tuft.setMatrixAt(placed++,M);break;
        }
      }
      // straw cones — clone one base geo, tilt/scale each, merge into ONE Mesh
      const sr=mkrng(PR.seed^0x9e3779b9),base=new THREE.ConeGeometry(0.05,1,4),parts=[];
      for(let i=0;i<PR.straw;i++){
        for(let tries=0;tries<8;tries++){
          const x=me.x0+sr()*(me.x1-me.x0),z=me.z0+sr()*(me.z1-me.z0);
          if(blocked(x,z))continue;
          const h=PR.strawH[0]+sr()*(PR.strawH[1]-PR.strawH[0]),g=base.clone();
          g.scale(1,h,1);g.rotateX((sr()*2-1)*0.12);g.rotateZ((sr()*2-1)*0.12);g.translate(x,h*0.5,z);
          parts.push(g);break;
        }
      }
      base.dispose();
      if(parts.length)scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts),toon(PR.strawColor)));
    }
    // ---- South Pond BANKS (117): prairie grass ringing the restored pond +
    // taller cattail/reed clusters hugging the waterline — grown into the SAME
    // tuft bucket in place (placed continues past the Point prairie → +0
    // InstancedMesh buckets, +0 draws). LOCAL banks.tuftSeed / .reedSeed rngs,
    // rejection-sampled through spBank (the annulus + LP land + deck/pavilion/
    // plate clearance). ZERO shared rng — this runs strictly AFTER the frozen
    // fill above, so every pre-117 tuft matrix is byte-identical.
    // The bucket is ONE toon material and r128's color_fragment only applies
    // vColor under USE_COLOR (instanceColor alone is inert), so banks.tuftColor
    // / .reedColor read as HEIGHT — the Montrose dune-grass precedent. ----
    {
      const grow=(seed,count,sy,dMax,tries)=>{
        const r=mkrng(seed),d2=dMax*dMax;
        for(let i=0;i<count;i++)for(let t=0;t<tries;t++){
          const x=spBox.x0+r()*(spBox.x1-spBox.x0),z=spBox.z0+r()*(spBox.z1-spBox.z0);
          if(!spBank(x,z,d2))continue;
          M.compose(V.set(x,0.14,z),Q.identity(),S.set(1,sy[0]+r()*(sy[1]-sy[0]),1));tuft.setMatrixAt(placed++,M);break;
        }
      };
      grow(spB.tuftSeed,spB.tufts,spB.tuftScaleY,spB.ringR,26);                    // grass across the whole 9 m bank ring (~32% accept -> all 300 land)
      grow(spB.reedSeed,spB.reeds,spB.reedScaleY,Math.min(spB.ringR,3.2),60);      // cattails in a tight 3.2 m waterline band (the brief's "reeds nearer the water")
    }
    // ---- 122 CONSERVATORY straw grasses: feathery fountain grasses through the
    // formal garden's lawn panels — grown into the SAME tuft bucket in place
    // (placed continues past the South Pond banks → +0 InstancedMesh buckets,
    // +0 draws). LOCAL flora.tuftSeed rng, rejection-sampled inside the
    // formalGarden rect: off the glasshouse/vestibule/Bates carves, out of the
    // parterre bed rects (those are the flowers' soil slabs) and >=1.4 m clear
    // of every garden-walk centreline inside the rect (LOOP / Bates RING / both
    // AXIS stubs — EAST and the STOCKTON crossing leave the rect immediately).
    // ZERO shared rng — strictly after the frozen fill, so every pre-122 tuft
    // matrix is byte-identical. HEIGHT is the read: nothing ever calls
    // setColorAt on this bucket, so it has no instanceColor and stays one flat
    // toon green — the dune/prairie precedent. ----
    {
      const LPC=CH.LP_CONSERVATORY,FG=LPC.formalGarden,FLO=LPC.flora,gr=mkrng(FLO.tuftSeed);
      const gWalks=[CH.LP_GARDEN_LOOP,CH.LP_BATES_RING,CH.LP_GARDEN_AXIS_N,CH.LP_GARDEN_AXIS_S];
      const inBed=(x,z)=>{for(const b of LPC.beds)if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1)return true;return false};
      const gClr2=1.4*1.4;
      for(let i=0;i<FLO.tufts;i++)for(let t=0;t<30;t++){
        const x=FG.x0+gr()*(FG.x1-FG.x0),z=FG.z0+gr()*(FG.z1-FG.z0);
        if(CH.conservatoryBlockedHit(x,z)||inBed(x,z))continue;
        let bad=false;for(const w of gWalks)if(mpPoly2(x,z,w)<gClr2){bad=true;break}
        if(bad)continue;
        M.compose(V.set(x,0.14,z),Q.identity(),S.set(1,FLO.tuftScaleY[0]+gr()*(FLO.tuftScaleY[1]-FLO.tuftScaleY[0]),1));tuft.setMatrixAt(placed++,M);break;
      }
    }
    // ---- 129 THE RESERVE EXPANSION swale grass: clumpy marram in NE-SW density
    // bands across the inland dune unit — grown into the SAME tuft bucket in
    // place (placed continues past the conservatory grasses → +0 InstancedMesh
    // buckets, +0 draws). LOCAL grass.seed rng, rejection-sampled through the
    // shared rsvDress test. ZERO shared rng (strictly after the frozen fill, so
    // every pre-129 tuft matrix is byte-identical).
    // The bucket is ONE flat toon green and nothing ever calls setColorAt on it,
    // so grass.color reads as HEIGHT — scaleY 1.4-2.6 makes these the tallest
    // grass in the game, which is the whole dune read (the 072 dune-grass /
    // 071 prairie precedent). ----
    {
      const G=RSV.grass,gr=mkrng(G.seed);
      rsvClumps=[];                                      // ~12 stems per clump, 2.0 m spread
      for(let c=0;c<Math.ceil(G.count/12);c++)for(let t=0;t<24;t++){
        const x=rsvBox.x0+gr()*(rsvBox.x1-rsvBox.x0),z=rsvBox.z0+gr()*(rsvBox.z1-rsvBox.z0);
        if(!rsvDress(x,z))continue;
        rsvClumps.push([x,z]);break;
      }
      for(let i=0;i<G.count&&rsvClumps.length;i++){
        const C=rsvClumps[i%rsvClumps.length];
        for(let t=0;t<8;t++){
          const a=gr()*Math.PI*2,rr=Math.sqrt(gr())*2.0,x=C[0]+Math.cos(a)*rr,z=C[1]+Math.sin(a)*rr;
          if(!rsvDress(x,z))continue;
          M.compose(V.set(x,0.14,z),Q.identity(),S.set(1,G.scaleY[0]+gr()*(G.scaleY[1]-G.scaleY[0]),1));tuft.setMatrixAt(placed++,M);break;
        }
      }
    }
    tuft.count=placed;                                   // trim any unfilled tail (no stray tuft at origin)
    tuft.instanceMatrix.needsUpdate=true;scene.add(tuft);RUSTLE_MESHES.push(tuft);   // 109: brushable

    // ---- 129 reserve STRAW: the dead-stalk half of the dune palette (the refs'
    // "mixed straw-and-green clumpy marram"), the MONTROSE_POINT.prairie recipe
    // — clone one thin cone, tilt/scale each, merge into ONE frustum-culled
    // Mesh. Its hex is the Point prairie's own strawColor, so mergeCellStatic
    // folds the two straw meshes into one bucket: +0 draws, not +1. ----
    {
      const ST=RSV.straw,sr=mkrng(ST.seed),base=new THREE.ConeGeometry(0.05,1,4),parts=[];
      const CL=rsvClumps&&rsvClumps.length?rsvClumps:null;
      for(let i=0;i<ST.count;i++)for(let t=0;t<10;t++){
        let x,z;
        if(CL){const C=CL[(i*3+1)%CL.length],a=sr()*Math.PI*2,rr=Math.sqrt(sr())*2.4;   // stride 3 so straw and grass do not walk the clumps in lockstep
          x=C[0]+Math.cos(a)*rr;z=C[1]+Math.sin(a)*rr;}
        else{x=rsvBox.x0+sr()*(rsvBox.x1-rsvBox.x0);z=rsvBox.z0+sr()*(rsvBox.z1-rsvBox.z0);}
        if(!rsvDress(x,z))continue;
        const h=ST.h[0]+sr()*(ST.h[1]-ST.h[0]),g=base.clone();
        g.scale(1,h,1);g.rotateX((sr()*2-1)*0.14);g.rotateZ((sr()*2-1)*0.14);g.translate(x,h*0.5,z);
        parts.push(g);break;
      }
      base.dispose();
      if(parts.length)scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts),toon(ST.color)));
    }

    // ---- 129 reserve BARE SAND PANNES: the blowouts between the grass clumps
    // (and the two nest-cell floors) — ONE frustum-culled merged Mesh of flat
    // ellipses. Walkable, visual only. y 0.035 sits 0.015 above the GRASS_PATCH
    // discs (0.02) and 0.015 below the bike asphalt (0.05): the 088 ground
    // y-ladder, so the sand never z-fights the lawn and the paths always cover
    // the sand. ----
    {
      const parts=RSV.pannes.map(([cx,cz,rx,rz])=>{
        const g=new THREE.CircleGeometry(1,20);g.rotateX(-Math.PI/2);g.scale(rx,1,rz);g.translate(cx,0.035,cz);
        return g.toNonIndexed();
      });
      scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts),toon(RSV.sand)));
    }
  }

  // ---- AIDS Garden: flowers + sculpture tribute ----
  {
    const GA=CH.GARDEN;
    const beds=GA.beds;
    const cols=GA.colors.map(c=>new THREE.Color(c));
    const n=GA.count;
    // Montrose Point (071): grow BOTH flower buckets in place by M = the wildflower
    // drift total (goldenrod + aster) — +0 InstancedMesh buckets, +0 draws.
    const MP=CH.MONTROSE_POINT,FL=MP.flowers,mpM=FL.drifts.length*FL.perDrift+FL.asters.length*FL.perAster;
    // 117: + the South Pond bank drifts (liatris / ironweed / goldenrod) — the
    // same index-gated grow, APPENDED after Montrose (existing indices unchanged).
    const spM=spB.drifts.length*spB.perDrift;
    // 122: + the conservatory parterre beds and Grandmother's Garden clumps —
    // the same index-gated grow, APPENDED after South Pond (existing indices
    // unchanged). Derived from the data, never a copied literal.
    const LPC=CH.LP_CONSERVATORY,lpcM=LPC.beds.length*LPC.flora.bedPer+LPC.grandmothers.clumps.length*LPC.flora.gmPer;
    // 129: + the reserve's beach-pea drifts — the same index-gated grow,
    // APPENDED after the conservatory (existing indices unchanged). Derived from
    // the data, never a copied literal.
    const rsvFL=RSV.flowers,rsvM=rsvFL.drifts.length*rsvFL.perDrift;
    const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05,0.05,0.55,5),toon(0x4f9f52,{}),n+mpM+spM+lpcM+rsvM);
    const heads=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.19,0),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),n+mpM+spM+lpcM+rsvM);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
    for(let i=0;i<n;i++){
      let x,z;
      if(i<GA.bedCount){const b=beds[i%beds.length];const a=rand(0,Math.PI*2),r=Math.sqrt(rng())*GA.bedRadius;x=b[0]+Math.cos(a)*r;z=b[1]+Math.sin(a)*r}
      else{const t=rng();const p=mainCurve.getPoint(t);x=p.x+rand(-1,1)*GA.trailJitter;z=p.z+rand(-1,1)*GA.trailJitter;if(!pip(x,z,LAND)){x=GA.fallback[0];z=GA.fallback[1]}}
      const s=rand(GA.scale[0],GA.scale[1]);
      M.compose(V.set(x,0.28*s,z),Q.identity(),S.set(1,s,1));stems.setMatrixAt(i,M);
      M.compose(V.set(x,0.62*s,z),Q.identity(),S.set(1,0.8,1));heads.setMatrixAt(i,M);
      heads.setColorAt(i,cols[rng()*cols.length|0]);
    }
    // ---- Montrose POINT wildflowers (071): goldenrod + aster drifts — grown into
    // the SAME AIDS-garden stems+heads buckets in place (idx continues past n → +0
    // InstancedMesh buckets, +0 draws). LOCAL fr rng; radial drifts kept off the
    // Point ribbons; heads.setColorAt tints each species. Zero shared rng. ----
    {
      const fr=mkrng(FL.seed),gcol=new THREE.Color(FL.goldenrod),acol=new THREE.Color(FL.aster);
      let idx=n;
      const drift=(cx,cz,r,col)=>{
        for(let tries=0;tries<6;tries++){
          const a=fr()*Math.PI*2,rr=Math.sqrt(fr())*r,x=cx+Math.cos(a)*rr,z=cz+Math.sin(a)*rr;
          if(!pip(x,z,LAND)||CH.inMontroseDune(x,z))continue;
          let bad=false;for(const p of mpN)if((p[0]-x)**2+(p[1]-z)**2<2.25){bad=true;break}   // >=1.5 m to the Point ribbons
          if(bad)continue;
          const s=0.9+fr()*0.5;
          M.compose(V.set(x,0.28*s,z),Q.identity(),S.set(1,s,1));stems.setMatrixAt(idx,M);
          M.compose(V.set(x,0.62*s,z),Q.identity(),S.set(1,0.8,1));heads.setMatrixAt(idx,M);
          heads.setColorAt(idx,col);idx++;return;
        }
      };
      for(const d of FL.drifts)for(let k=0;k<FL.perDrift;k++)drift(d[0],d[1],d[2],gcol);
      for(const d of FL.asters)for(let k=0;k<FL.perAster;k++)drift(d[0],d[1],d[2],acol);
      stems.count=heads.count=idx;
    }
    // ---- South Pond bank WILDFLOWER drifts (117): magenta liatris / purple
    // ironweed / goldenrod pools on the pond banks — grown into the SAME
    // stems+heads buckets in place (idx continues past the Montrose grow → +0
    // InstancedMesh buckets, +0 draws). LOCAL banks.flowerSeed rng, uniform
    // sqrt-radius discs around each banks.drifts entry, rejection-sampled
    // through the shared spBank annulus test. ZERO shared rng (strictly after
    // the frozen fill). setColorAt tints each drift by species — LIVE under
    // r128 after all (WebGLProgram defines USE_COLOR when instancingColor is
    // present; verified visually, task 122 — the earlier "inert" note here was
    // wrong, which is why the drifts always did read as their species). ----
    {
      const fr=mkrng(spB.flowerSeed),ring2=spB.ringR*spB.ringR;
      const cols=[new THREE.Color(spB.liatris),new THREE.Color(spB.ironweed),new THREE.Color(spB.goldenrod)];
      let idx=stems.count;                                  // continues past the Montrose grow
      spB.drifts.forEach((d,di)=>{
        const col=cols[di%cols.length];
        for(let k=0;k<spB.perDrift;k++)for(let tries=0;tries<30;tries++){
          const a=fr()*Math.PI*2,rr=Math.sqrt(fr())*d[2],x=d[0]+Math.cos(a)*rr,z=d[1]+Math.sin(a)*rr;
          if(!spBank(x,z,ring2))continue;
          const s=0.9+fr()*0.5;
          M.compose(V.set(x,0.28*s,z),Q.identity(),S.set(1,s,1));stems.setMatrixAt(idx,M);
          M.compose(V.set(x,0.62*s,z),Q.identity(),S.set(1,0.8,1));heads.setMatrixAt(idx,M);
          heads.setColorAt(idx,col);idx++;break;             // idx advances ONLY on a placed flower (no uncolored gaps)
        }
      });
      stems.count=heads.count=idx;
    }
    // ---- 122 CONSERVATORY PARTERRE beds: the hot ribbon-bed planting (reds /
    // magenta / silver-white edging) — grown into the SAME stems+heads buckets
    // in place (idx continues past the South Pond grow → +0 InstancedMesh
    // buckets, +0 draws). ONE LOCAL flora.bedSeed rng walked across the beds in
    // ARRAY ORDER; uniform inside each bed rect inset 0.15 so no flower hangs
    // over the soil-slab edge. Dense and even — the formal read, no rejection
    // sampling (the rects are already clear of the carves and the walks).
    // The beds sit on 0.12 m soil slabs (structures.js), so both composes lift
    // by SOIL_H. setColorAt tints each panel from bedColors and DOES render:
    // r128's fragment prefix (WebGLProgram.js) defines USE_COLOR when
    // instancingColor is present, not only when the material sets vertexColors
    // — so the hot red / magenta / silver-white parterre palette is the read
    // (verified in tools/shots/s122-beds.png). ZERO shared rng. ----
    const SOIL_H=0.12;   // parterre soil-slab height (structures.js) — the flowers stand ON it
    {
      const br=mkrng(LPC.flora.bedSeed),bcols=LPC.bedColors.map(c=>new THREE.Color(c));
      let idx=stems.count;                                  // continues past the South Pond grow
      for(const b of LPC.beds){
        const col=bcols[b.c%bcols.length];
        for(let k=0;k<LPC.flora.bedPer;k++){
          const x=b.x0+0.15+br()*(b.x1-b.x0-0.3),z=b.z0+0.15+br()*(b.z1-b.z0-0.3),s=0.9+br()*0.5;
          M.compose(V.set(x,SOIL_H+0.28*s,z),Q.identity(),S.set(1,s,1));stems.setMatrixAt(idx,M);
          M.compose(V.set(x,SOIL_H+0.62*s,z),Q.identity(),S.set(1,0.8,1));heads.setMatrixAt(idx,M);
          heads.setColorAt(idx,col);idx++;
        }
      }
      stems.count=heads.count=idx;
    }
    // ---- 122 GRANDMOTHER'S GARDEN clumps: the informal cottage half west across
    // the Stockton crossing — loose goldenrod/liatris/ironweed/orange drifts in
    // open lawn (NO soil slabs, y-base 0). Same index-gated grow into the
    // stems+heads buckets (+0 buckets, +0 draws), LOCAL flora.gmSeed rng,
    // sqrt-radius disc per clump, rejection-sampled on LP land minus the carves,
    // clear of the crossing's bench focal and of the crossing ribbon itself.
    // ZERO shared rng. ----
    {
      const GM=LPC.grandmothers,gfr=mkrng(LPC.flora.gmSeed),gcols=GM.colors.map(c=>new THREE.Color(c));
      let idx=stems.count;                                  // continues past the parterre beds
      GM.clumps.forEach((c,ci)=>{
        const col=gcols[ci%gcols.length];
        for(let k=0;k<LPC.flora.gmPer;k++)for(let tries=0;tries<30;tries++){
          const a=gfr()*Math.PI*2,rr=Math.sqrt(gfr())*c[2],x=c[0]+Math.cos(a)*rr,z=c[1]+Math.sin(a)*rr;
          if(!CH.lpLandHit(x,z)||CH.lpBlockedHit(x,z))continue;                       // LP land minus every carve
          if((x-GM.bench.x)**2+(z-GM.bench.z)**2<1.44)continue;                       // >=1.2 m off the bench
          if(mpPoly2(x,z,CH.LP_STOCKTON_CROSSING)<1.69)continue;                      // >=1.3 m off the crossing walk
          const s=0.9+gfr()*0.5;
          M.compose(V.set(x,0.28*s,z),Q.identity(),S.set(1,s,1));stems.setMatrixAt(idx,M);
          M.compose(V.set(x,0.62*s,z),Q.identity(),S.set(1,0.8,1));heads.setMatrixAt(idx,M);
          heads.setColorAt(idx,col);idx++;break;             // idx advances ONLY on a placed flower (no uncolored gaps)
        }
      });
      stems.count=heads.count=idx;
    }
    // ---- 129 THE RESERVE EXPANSION beach-pea drifts: violet mats sprawling
    // through the swales and along the cell edges — grown into the SAME
    // stems+heads buckets in place (idx continues past Grandmother's Garden →
    // +0 InstancedMesh buckets, +0 draws). LOCAL flowers.seed rng, the Montrose
    // Point drift() idiom (sqrt-radius disc per drift), setColorAt tinting every
    // head violet. Beach pea IS the cell habitat, so unlike the grass this grow
    // deliberately ignores the swale bands and the cell boundaries — it only
    // keeps >=1.5 m off the ribbons (nothing sprawls onto crushed limestone) and
    // stays inside the rope. ZERO shared rng. ----
    {
      const fr=mkrng(rsvFL.seed),col=new THREE.Color(rsvFL.color);
      let idx=stems.count;                                  // continues past the conservatory grows
      for(const d of rsvFL.drifts)for(let k=0;k<rsvFL.perDrift;k++)for(let tries=0;tries<24;tries++){
        const a=fr()*Math.PI*2,rr=Math.sqrt(fr())*d[2],x=d[0]+Math.cos(a)*rr,z=d[1]+Math.sin(a)*rr;
        if(!rsvIn(x,z)||rsvNear(x,z,2.25))continue;         // inside the rope, >=1.5 m off every ribbon
        const s=0.9+fr()*0.5;
        M.compose(V.set(x,0.28*s,z),Q.identity(),S.set(1,s,1));stems.setMatrixAt(idx,M);
        M.compose(V.set(x,0.62*s,z),Q.identity(),S.set(1,0.8,1));heads.setMatrixAt(idx,M);
        heads.setColorAt(idx,col);idx++;break;              // idx advances ONLY on a placed flower
      }
      stems.count=heads.count=idx;
    }
    stems.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;heads.instanceColor.needsUpdate=true;
    scene.add(stems,heads);RUSTLE_MESHES.push(heads);   // 109: garden + Montrose wildflower heads are brushable

    // Keith Haring "Self-Portrait": a bold bright-green OUTLINED figure — tube
    // limbs, an OPEN ring torso + faceless ring head (visible gaps within the
    // body), caught mid-motion (one arm up, one leg raised). Reads as a Haring
    // line-drawing made solid, not filled blobs.
    const fig=new THREE.Group(),gm=toon(0x4ecb6e);
    const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.7,2,0.5,16),toon(0xd9cbb2));plinth.position.y=0.25;fig.add(plinth);
    const TR=0.18,_yA=new THREE.Vector3(0,1,0),_d=new THREE.Vector3();
    function tube(a,b,r=TR){const len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
      const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,8),gm);
      m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
      m.quaternion.setFromUnitVectors(_yA,_d.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize());fig.add(m);return m}
    function joint(p,r){const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,9),gm);m.position.set(p[0],p[1],p[2]);fig.add(m);return m}
    // OPEN torso frame (upright oval ring) — hollow, the signature cutout
    const torso=new THREE.Mesh(new THREE.TorusGeometry(0.6,TR,8,22),gm);
    torso.scale.set(0.82,1.25,0.62);torso.position.y=2.95;fig.add(torso);
    // faceless ring head + neck
    const head=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.15,8,20),gm);
    head.scale.set(1,1,0.75);head.position.y=4.62;fig.add(head);
    tube([0,3.72,0],[0,4.2,0]);                              // neck
    // shoulders + hips as joints so tubes read continuous
    const shL=[-0.5,3.6,0],shR=[0.5,3.6,0],hipL=[-0.35,2.0,0],hipR=[0.35,2.0,0];
    joint(shL,0.19);joint(shR,0.19);joint(hipL,0.2);joint(hipR,0.2);
    // right arm UP (bent overhead), left arm swung out/down
    const elbR=[1.02,4.5,0.05],handR=[0.75,5.35,0.12];
    tube(shR,elbR);tube(elbR,handR);joint(elbR,0.17);joint(handR,0.19);
    tube(shL,[-1.25,2.95,0.2]);joint([-1.25,2.95,0.2],0.19);
    // right leg RAISED (knee up, striding forward), left leg planted back
    const knR=[0.72,1.4,0.55],footR=[0.5,0.72,1.15];
    tube(hipR,knR);tube(knR,footR);joint(knR,0.18);joint(footR,0.2);
    tube(hipL,[-0.7,0.38,-0.3]);joint([-0.7,0.38,-0.3],0.2);
    // three green motion streaks radiating from the body (Haring action lines)
    for(let k=0;k<3;k++){
      const arc=new THREE.Mesh(new THREE.TorusGeometry(1.35+k*0.4,0.07,6,20,0.9),gm);
      arc.position.y=3.1;arc.rotation.z=1.0+k*0.3;arc.rotation.y=rand(-0.4,0.4);fig.add(arc);
    }
    const HR=CH.HARING;
    fig.scale.setScalar(HR.scale);fig.position.set(HR.pos[0],HR.pos[1],HR.pos[2]);fig.rotation.y=HR.ry;scene.add(fig);collide(HR.pos[0],HR.pos[2],HR.collide);
  }

  // ---- limestone edging boulders along the AIDS-garden paths (hand-placed) ----
  // Big rough low-poly blocks edging the loop + connector, like the real garden.
  // Zero shared rng: a LOCAL m32 drives per-boulder rotation/scale; each seed is
  // probed against pathSamples and nudged clear (>~1.5 m off every ribbon), kept
  // on grass (pip). Instanced (1 draw call); collide is jumpable (h=0.8).
  {
    const seeds=[[86,110],[84,126],[78,120],[90,140],[70,113],[60,108],[100,98],[88,150],[50,106],[40,104]];
    const br=m32(0x10cb0017);
    const clear=[];
    for(const[sx,sz]of seeds){
      let x=sx,z=sz;
      // iteratively push directly away from the nearest ribbon sample until the
      // nearest is >=1.9 m (sampling ~1.7 m => true distance to the ribbon >=1.5 m).
      // Probes BOTH arrays: the frozen legacy samples AND the task-023 garden
      // ribbons (peanut loop + entrance path in pathSamples2) — pure geometry,
      // no rng, so boulders edge the REAL paths without moving the world.
      for(let k=0;k<24;k++){
        let bp=null,d2=Infinity;
        for(const arr of[pathSamples,pathSamples2])
          for(let i=0;i<arr.length;i++){const p=arr[i];const e=(p[0]-x)**2+(p[1]-z)**2;if(e<d2){d2=e;bp=p}}
        if(!bp||d2>=1.9*1.9)break;
        let ax=x-bp[0],az=z-bp[1];const L=Math.hypot(ax,az)||1;
        x=bp[0]+ax/L*1.95;z=bp[1]+az/L*1.95;
      }
      if(pip(x,z,LAND))clear.push([x,z]);
    }
    const rock=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),toon(0xb9b0a2,{}),clear.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),S=new THREE.Vector3(),V=new THREE.Vector3();
    clear.forEach(([x,z],i)=>{
      const sc=0.72+br()*0.5;                                   // ~0.72..1.22 m base radius
      E.set(br()*Math.PI,br()*Math.PI*2,br()*Math.PI);Q.setFromEuler(E);
      M.compose(V.set(x,sc*0.52,z),Q,S.set(sc*1.15,sc*0.78,sc*1.05));   // squat, boulder-ish
      rock.setMatrixAt(i,M);
      collide(x,z,sc*1.0,0.8);                                   // jumpable when airborne
    });
    rock.instanceMatrix.needsUpdate=true;scene.add(rock);
  }

  // ---- prairie planting beds (native tall grasses + purple coneflower masses) ----
  // 3 organic clusters near the garden/lawn edges. Zero shared rng: a LOCAL m32
  // jitters each blade/flower within ~5 m; every one is pip-guarded on land and
  // kept off the ribbons. Exactly 3 draw calls: grass + flower stems + heads.
  {
    // the last three centers flank the entrance monument (task 023, per the
    // owner photo: prairie planting at both wall ends + behind it). Instanced
    // counts scale with centers.length — still exactly 3 draw calls.
    // 084: three BAY centers earn the compressed shoreline its planting —
    // west of the cove trail, at the waist, and on the harbor-mouth headland.
    const centers=[[60,150],[120,165],[70,90],[100.9,160.5],[117.5,163.5],[110,164.5],[150,-600],[140,-632],[200,-664]];
    const grassCols=[0x8a9a5b,0x9fae6b,0x76863f].map(c=>new THREE.Color(c));
    const purples=[0x9a6bd0,0xb58ae0].map(c=>new THREE.Color(c));
    const pr=m32(0x7a1e0055);
    const nBlade=40,nFlower=18,R=5;
    const gN=centers.length*nBlade,fN=centers.length*nFlower;
    const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(0.07,0.95,4),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),gN);
    const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03,0.03,0.62,4),toon(0x5c7b46,{}),fN);
    const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(0.14,8,7),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),fN);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),S=new THREE.Vector3(),V=new THREE.Vector3();
    const EP=CH.ENTRANCE.pad;   // keep planting off the monument forecourt too
    const clearOf=(x,z)=>{
      if(((x-EP.x)/EP.rx)**2+((z-EP.z)/EP.rz)**2<1.1)return false;
      for(const arr of[pathSamples,pathSamples2])   // legacy + task-023 garden ribbons
        for(let i=0;i<arr.length;i++){const p=arr[i];if((p[0]-x)**2+(p[1]-z)**2<2.4*2.4)return false}
      return true};
    const spot=(cx,cz)=>{for(let k=0;k<16;k++){const a=pr()*Math.PI*2,r=Math.sqrt(pr())*R,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;if(pip(x,z,LAND)&&clearOf(x,z))return[x,z]}return[cx,cz]};
    let gi=0,fi=0;
    for(const[cx,cz]of centers){
      for(let b=0;b<nBlade;b++){
        const[x,z]=spot(cx,cz),s=0.7+pr()*0.9;                  // blade height variance
        E.set(pr()*0.18-0.09,pr()*Math.PI*2,pr()*0.18-0.09);Q.setFromEuler(E);
        M.compose(V.set(x,0.475*s,z),Q,S.set(1,s,1));grass.setMatrixAt(gi,M);
        grass.setColorAt(gi,grassCols[pr()*grassCols.length|0]);gi++;
      }
      for(let f=0;f<nFlower;f++){
        const[x,z]=spot(cx,cz),h=0.55+pr()*0.35;
        M.compose(V.set(x,h*0.5,z),Q.identity(),S.set(1,h/0.62,1));stems.setMatrixAt(fi,M);
        M.compose(V.set(x,h+0.06,z),Q.identity(),S.set(1,1.25,1));heads.setMatrixAt(fi,M);
        heads.setColorAt(fi,purples[pr()*purples.length|0]);fi++;
      }
    }
    grass.instanceMatrix.needsUpdate=stems.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;
    grass.instanceColor.needsUpdate=heads.instanceColor.needsUpdate=true;
    scene.add(grass,stems,heads);RUSTLE_MESHES.push(grass,heads);   // 109: prairie blades + coneflower heads are brushable
  }

  // ---- summer life on the rocks: towels, umbrellas, coolers, blocks ----
  {
    const BL=CH.BEACH_LIFE;
    const twlCols=BL.towelColors.map(c=>new THREE.Color(c));
    const spots=[];
    // Montrose beach LIFE — ONE local xorshift drives every Montrose spot/color
    // below (towels + umbrella/cooler picks). Zero shared rng: the rocks fills
    // stay byte-identical, the Montrose portion comes strictly AFTER.
    const MBL=CH.MONTROSE_BEACH_LIFE,mr=mkrng(MBL.seed),mspots=[];
    const segs=COAST_SEGS[0];
    for(const s of segs){
      if(s.az<BL.towel.zMin||s.az>BL.towel.zMax)continue;
      for(let t=0;t<s.len;t+=BL.towel.step){
        if(rng()<BL.towel.skipProb)continue;
        const cx=s.ax+s.tx*t,cz=s.az+s.tz*t,p=tierProfile(cz);
        const tier=(rng()*(p.w.length-1))|0;let acc=0;for(let i=0;i<tier;i++)acc+=p.w[i];
        const off=acc+p.w[tier]*rand(BL.towel.offFrac[0],BL.towel.offFrac[1]);
        spots.push({x:cx+s.nx*off,z:cz+s.nz*off,y:-tier*p.step+0.045,rot:rand(0,Math.PI*2)});
      }
    }
    // dry-sand Montrose towel spots (local rng): dryish sand, clear of the roped
    // dune / beach house, and off The Dock deck (deckRect expanded 1 m).
    {
      const rg=MBL.region,dk=CH.THE_DOCK.deckRect;
      const onDeck=(x,z)=>x>=dk.x0-1&&x<=dk.x1+1&&z>=dk.z0-1&&z<=dk.z1+1;
      // 088 (issue 030): towels kept OFF the trail ribbons — the dual Lakefront
      // Trail crosses the towel region (bike x~206-210, walk +4 east), and towels
      // landed ON the limestone walking path (088-mt-beach shot). Prefilter the
      // REAL ribbon centerlines (ribbonLanes) to the region bbox once; reject any
      // towel within w/2+1.3 m. Pure geometry on the LOCAL mr stream — the shared
      // world rng never sees this block.
      const laneNear=[];
      for(const L of ribbonLanes){const need=(L.w/2+1.3)**2;for(const p of L.pts)if(p[0]>rg.xr[0]-4&&p[0]<rg.xr[1]+4&&p[1]>rg.zr[0]-4&&p[1]<rg.zr[1]+4)laneNear.push([p[0],p[1],need]);}
      const onLane=(x,z)=>{for(const p of laneNear){const dx=x-p[0],dz=z-p[1];if(dx*dx+dz*dz<p[2])return true}return false};
      let tries=0;
      while(mspots.length<MBL.towels&&tries++<600){
        const x=rg.xr[0]+mr()*(rg.xr[1]-rg.xr[0]),z=rg.zr[0]+mr()*(rg.zr[1]-rg.zr[0]);
        const h=CH.montroseBeachH(x,z);
        if(h===null||h<=-0.5)continue;                   // wet/underwater sand — skip
        if(CH.beachCarved(x,z)||onDeck(x,z)||onLane(x,z))continue;
        mspots.push({x,z,y:h+0.05,rot:mr()*6.283});
      }
    }
    const inst=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.8,0.95),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap,side:THREE.DoubleSide})),spots.length+mspots.length);
    const M=new THREE.Matrix4(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3();
    const tilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
    spots.forEach((d,i)=>{
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,d.rot,0)).multiply(tilt);
      M.compose(V.set(d.x,d.y,d.z),q,S);inst.setMatrixAt(i,M);
      inst.setColorAt(i,twlCols[rng()*twlCols.length|0]);
    });
    // Montrose towels appended AFTER the rocks fill (local rng, same tilt idiom)
    mspots.forEach((d,i)=>{
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,d.rot,0)).multiply(tilt);
      M.compose(V.set(d.x,d.y,d.z),q,S);inst.setMatrixAt(spots.length+i,M);
      inst.setColorAt(spots.length+i,twlCols[(mr()*twlCols.length)|0]);
    });
    inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;scene.add(inst);

    // umbrellas (instanced: poles + canopies)
    {
      const umbCols=BL.umbrellaColors.map(c=>new THREE.Color(c)),nU=BL.umbrella.count;
      const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045,0.045,2.1,6),toon(0xd9cbb2),nU+MBL.umbrellas);
      const cans=new THREE.InstancedMesh(new THREE.ConeGeometry(1.15,0.55,9),toon(0xffffff,{}),nU+MBL.umbrellas);
      const Mu=new THREE.Matrix4(),Qu=new THREE.Quaternion(),Su=new THREE.Vector3(1,1,1),Vu=new THREE.Vector3(),Eu=new THREE.Euler(),Ou=new THREE.Vector3();
      let pu=0;
      for(let i=0;i<nU&&spots.length;i++){
        const d=spots[(rng()*spots.length)|0];
        const bx=d.x+rand(-BL.umbrella.jitter,BL.umbrella.jitter),bz=d.z+rand(-BL.umbrella.jitter,BL.umbrella.jitter),tilt=rand(-BL.umbrella.tilt,BL.umbrella.tilt),by=d.y+BL.umbrella.yOff;
        Eu.set(0,0,tilt);Qu.setFromEuler(Eu);
        Ou.set(0,1.05,0).applyQuaternion(Qu);Mu.compose(Vu.set(bx+Ou.x,by+Ou.y,bz+Ou.z),Qu,Su);poles.setMatrixAt(pu,Mu);
        Ou.set(0,2.05,0).applyQuaternion(Qu);Mu.compose(Vu.set(bx+Ou.x,by+Ou.y,bz+Ou.z),Qu,Su);cans.setMatrixAt(pu,Mu);
        cans.setColorAt(pu,umbCols[i%umbCols.length]);collide(bx,bz,BL.umbrella.collide);pu++;
      }
      // Montrose umbrellas at a local-rng subset of mspots (zero shared rng),
      // same pole/canopy idiom; keep incrementing pu so counts stay correct.
      for(let i=0;i<MBL.umbrellas&&mspots.length;i++){
        const d=mspots[(mr()*mspots.length)|0];
        const bx=d.x+(mr()*2-1)*BL.umbrella.jitter,bz=d.z+(mr()*2-1)*BL.umbrella.jitter,tl=(mr()*2-1)*BL.umbrella.tilt,by=d.y+BL.umbrella.yOff;
        Eu.set(0,0,tl);Qu.setFromEuler(Eu);
        Ou.set(0,1.05,0).applyQuaternion(Qu);Mu.compose(Vu.set(bx+Ou.x,by+Ou.y,bz+Ou.z),Qu,Su);poles.setMatrixAt(pu,Mu);
        Ou.set(0,2.05,0).applyQuaternion(Qu);Mu.compose(Vu.set(bx+Ou.x,by+Ou.y,bz+Ou.z),Qu,Su);cans.setMatrixAt(pu,Mu);
        cans.setColorAt(pu,umbCols[(mr()*umbCols.length)|0]);collide(bx,bz,BL.umbrella.collide);pu++;
      }
      poles.count=cans.count=pu;poles.instanceMatrix.needsUpdate=cans.instanceMatrix.needsUpdate=true;cans.instanceColor.needsUpdate=true;scene.add(poles,cans);
    }
    // coolers (instanced)
    {
      const coolCols=BL.coolerColors.map(c=>new THREE.Color(c)),nC=BL.cooler.count;
      const cool=new THREE.InstancedMesh(new THREE.BoxGeometry(0.55,0.4,0.35),toon(0xffffff,{}),nC+MBL.coolers);
      const Mc=new THREE.Matrix4(),Qc=new THREE.Quaternion(),Sc=new THREE.Vector3(1,1,1),Vc=new THREE.Vector3(),Ec=new THREE.Euler();
      let pc=0;
      for(let i=0;i<nC&&spots.length;i++){
        const d=spots[(rng()*spots.length)|0];
        const cx=d.x+rand(-BL.cooler.jitter,BL.cooler.jitter),cz=d.z+rand(-BL.cooler.jitter,BL.cooler.jitter),ry=rand(0,3);
        Ec.set(0,ry,0);Qc.setFromEuler(Ec);Mc.compose(Vc.set(cx,d.y+BL.cooler.yOff,cz),Qc,Sc);cool.setMatrixAt(pc,Mc);
        cool.setColorAt(pc,coolCols[i%2?0:1]);pc++;
      }
      // Montrose coolers at a local-rng subset of mspots (zero shared rng)
      for(let i=0;i<MBL.coolers&&mspots.length;i++){
        const d=mspots[(mr()*mspots.length)|0];
        const cx=d.x+(mr()*2-1)*BL.cooler.jitter,cz=d.z+(mr()*2-1)*BL.cooler.jitter,ry=mr()*3;
        Ec.set(0,ry,0);Qc.setFromEuler(Ec);Mc.compose(Vc.set(cx,d.y+BL.cooler.yOff,cz),Qc,Sc);cool.setMatrixAt(pc,Mc);
        cool.setColorAt(pc,coolCols[(mr()*coolCols.length)|0]);pc++;
      }
      cool.count=pc;cool.instanceMatrix.needsUpdate=true;cool.instanceColor.needsUpdate=true;scene.add(cool);
    }
    // loose limestone blocks (instanced)
    {
      const nB=BL.block.count;
      const blocks=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),toon(0xd8caa8,{}),nB);
      const Mb=new THREE.Matrix4(),Qb=new THREE.Quaternion(),Sb=new THREE.Vector3(),Vb=new THREE.Vector3(),Eb=new THREE.Euler();
      let pb=0;
      for(let i=0;i<nB;i++){
        const s=COAST_SEGS[0][(rng()*COAST_SEGS[0].length)|0];
        if(s.az<BL.block.zMin||s.az>BL.block.zMax){i--;continue}
        const p=tierProfile(s.az),tier=(rng()*(p.w.length-1))|0;let acc=0;for(let k=0;k<tier;k++)acc+=p.w[k];
        const off=acc+p.w[tier]*rand(BL.block.offFrac[0],BL.block.offFrac[1]);
        const sx=rand(0.8,1.6),sy=rand(0.5,0.8),sz=rand(0.7,1.2);
        const bx=s.ax+s.nx*off,by=-tier*p.step+BL.block.yOff,bz=s.az+s.nz*off,ry=rand(0,3),rz=rand(-0.08,0.08);
        // near the mouth junction the raw segment normal diverges from the
        // welded slab fan — a block can land past the rebuilt steps, floating
        // on the water. All rand/rng draws above are already consumed, so
        // skipping the push keeps the world rng order bit-for-bit intact.
        const q=coastQuery(bx,bz);
        if(q&&q.lat>profileTotal(q.z)-0.8)continue;
        Eb.set(0,ry,rz);Qb.setFromEuler(Eb);Mb.compose(Vb.set(bx,by,bz),Qb,Sb.set(sx,sy,sz));blocks.setMatrixAt(pb,Mb);
        collide(bx,bz,BL.block.collide);pb++;
      }
      blocks.count=pb;blocks.instanceMatrix.needsUpdate=true;scene.add(blocks);
    }
  }

  // ---- floaties in the water (swimmers off the rocks) ----
  {
    const FL=CH.FLOATIES,flCols=FL.colors.map(c=>new THREE.Color(c));
    const segs=COAST_SEGS[0];
    const rings=new THREE.InstancedMesh(new THREE.TorusGeometry(0.55,0.22,8,16),toon(0xffffff,{}),FL.count);
    const Mf=new THREE.Matrix4(),Qf=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),Sf=new THREE.Vector3(1,1,1),Vf=new THREE.Vector3();
    let pf=0;
    for(let i=0;i<FL.count;i++){
      const s=segs[(rng()*segs.length)|0];
      if(s.az<FL.zMin||s.az>FL.zMax){i--;continue}
      const tot=profileTotal(s.az),off=tot+rand(FL.offRange[0],FL.offRange[1]);
      const fx=s.ax+s.nx*off,fz=s.az+s.nz*off;
      // raw-normal placement can land on the welded slab fan near the mouth
      // junction — floaties belong in the water; skip (rand already consumed,
      // rng order intact)
      const q=coastQuery(fx,fz);
      if(q&&q.lat<profileTotal(q.z)+0.7)continue;
      Mf.compose(Vf.set(fx,WATER_Y+0.12,fz),Qf,Sf);rings.setMatrixAt(pf,Mf);
      rings.setColorAt(pf,flCols[i%flCols.length]);pf++;
    }
    rings.count=pf;rings.instanceMatrix.needsUpdate=true;rings.instanceColor.needsUpdate=true;scene.add(rings);
    // one swan floaty, obviously
    const SW=CH.SWAN;
    const swan=new THREE.Group();
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.75,10,9),toon(0xfdf6e6));body.scale.set(1,0.6,1.3);swan.add(body);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.16,1.1,7),toon(0xfdf6e6));neck.position.set(0,0.72,0.75);neck.rotation.x=0.35;swan.add(neck);
    const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,7),toon(0xfdf6e6));hd.position.set(0,1.28,0.92);swan.add(hd);
    const beak=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.28,6),toon(0xf5a04c));beak.rotation.x=Math.PI/2;beak.position.set(0,1.26,1.14);swan.add(beak);
    swan.position.set(SW.x,WATER_Y+SW.yOff,SW.z);swan.rotation.y=rand(SW.ryRange[0],SW.ryRange[1]);
    swan.userData={by:WATER_Y+SW.yOff,ph:SW.ph,live:true};scene.add(swan);bobbers.push(swan);   // live bobber — exempt from the cell merge
  }

  // ---- signs / lamps / benches ----
  // lamps: instanced posts + caps + bulbs (3 draw calls) + one glow-points set
  const lampGlowPos=[];
  const lampSpots=[];
  CH.LAMPS.trail.forEach(([t,side])=>{
    const p=mainCurve.getPoint(t),tan=mainCurve.getTangent(t);
    lampSpots.push([p.x+(-tan.z)*side*CH.LAMPS.offset,p.z+tan.x*side*CH.LAMPS.offset]);
  });
  for(const[lx,lz]of CH.LAMPS.extra)lampSpots.push([lx,lz]);
  {
    const nL=lampSpots.length,M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3();
    // real Lakefront Trail lamp: a WHITE GLOBE on a slender GREEN post — a
    // tapered green pole, a small green collar, and a warm-white glowing sphere.
    // Same instanced structure (3 draw calls), same spots/counts, same glow.
    const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08,0.13,4,7),toon(0x37584a),nL);
    const collars=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15,0.12,0.22,8),toon(0x2f5142),nL);
    const globes=new THREE.InstancedMesh(new THREE.SphereGeometry(0.36,12,11),bmat(0xfff3df),nL);
    lampSpots.forEach(([x,z],i)=>{
      M.compose(V.set(x,2,z),Q,S);posts.setMatrixAt(i,M);        // post top at y=4.0
      M.compose(V.set(x,3.9,z),Q,S);collars.setMatrixAt(i,M);    // small collar under the globe
      M.compose(V.set(x,4.05,z),Q,S);globes.setMatrixAt(i,M);    // globe centred on the glow point
      collide(x,z,0.4);lampGlowPos.push([x,4.05,z]);
    });
    posts.instanceMatrix.needsUpdate=collars.instanceMatrix.needsUpdate=globes.instanceMatrix.needsUpdate=true;
    scene.add(posts,collars,globes);
  }
  {
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(lampGlowPos.flat()),3));
    const aC=new Float32Array(lampGlowPos.length*3),aS=new Float32Array(lampGlowPos.length);
    for(let i=0;i<lampGlowPos.length;i++){aC.set([1,0.78,0.5],i*3);aS[i]=4.2}
    g.setAttribute('aColor',new THREE.BufferAttribute(aC,3));g.setAttribute('aSize',new THREE.BufferAttribute(aS,1));
    scene.add(new THREE.Points(g,pointsMat()));
  }
  // benches: instanced seats + backs + legs (3 draw calls)
  {
    // 129: the reserve's two benches (east gate + the platform approach) ride
    // the SAME seat/back/leg buckets — the list is concatenated, not copied into
    // CH.BENCHES, so the city-pack table stays the trail's and the reserve keeps
    // its furniture with its own data. The loop draws no rng, so the append is
    // determinism-free and +0 draw calls.
    const BENCHES=CH.BENCHES.concat(RSV.benches);
    const wm=toon(0xa9713f),lm=toon(0x6d4526),nB=BENCHES.length;
    const seats=new THREE.InstancedMesh(new THREE.BoxGeometry(2.4,0.16,0.7),wm,nB);
    const backs=new THREE.InstancedMesh(new THREE.BoxGeometry(2.4,0.6,0.12),wm,nB);
    const legs=new THREE.InstancedMesh(new THREE.BoxGeometry(0.14,0.62,0.6),lm,nB*2);
    const base=new THREE.Matrix4(),tmp=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),S1=new THREE.Vector3(1,1,1);
    const seatL=new THREE.Matrix4().makeTranslation(0,0.62,0);
    const backL=new THREE.Matrix4().makeTranslation(0,1.05,-0.32).multiply(new THREE.Matrix4().makeRotationX(-0.15));
    const legLm=new THREE.Matrix4().makeTranslation(-1,0.31,0),legRm=new THREE.Matrix4().makeTranslation(1,0.31,0);
    BENCHES.forEach((b,i)=>{
      E.set(0,b.ry,0);Q.setFromEuler(E);base.compose(V.set(b.x,0,b.z),Q,S1);
      tmp.multiplyMatrices(base,seatL);seats.setMatrixAt(i,tmp);
      tmp.multiplyMatrices(base,backL);backs.setMatrixAt(i,tmp);
      tmp.multiplyMatrices(base,legLm);legs.setMatrixAt(i*2,tmp);
      tmp.multiplyMatrices(base,legRm);legs.setMatrixAt(i*2+1,tmp);
      collide(b.x,b.z,1);
    });
    seats.instanceMatrix.needsUpdate=backs.instanceMatrix.needsUpdate=legs.instanceMatrix.needsUpdate=true;
    scene.add(seats,backs,legs);
  }

  // ---- pier (peninsula lake side) with rails, posts to the water ----
  // (the corner pier carries d.apron -> concrete-apron style, task 021)
  CH.DECKS.forEach((d,i)=>plankDeck(d.deck[0],d.deck[1],d.deck[2],d.deck[3],d.deck[4],d.apron,d.root,'pier-'+i));

  // ---- EVERY formula-derived plank deck's walk rect, from ONE definition (128) --
  // CH.deckRects() is the single truth (piers + Belmont/Montrose/Diversey fingers)
  // that this engine and tools/walkprobe.mjs both read: the walkability of a deck
  // must never be stated twice (PITFALLS — "walkprobe + main.js must share
  // walkability definitions: put them in the data module"). Issue 040 is exactly
  // what the fork bought: four places re-derived these rects locally, the Montrose
  // ones from stale control-point x's, and every finger rooted out over open water
  // with a non-walkable moat to the lawn. Consumes ZERO rng (determinism gate);
  // rect ORDER in walkRects is irrelevant — none of them overlap.
  for(const r of CH.deckRects())walkRects.push({x1:r.x1,x2:r.x2,z1:r.z1,z2:r.z2,h:r.h});

  // ---- finger docks along the west seawall + sailboats moored in the slips ----
  // The deck reads CONTINUOUS with the west-shore lawn (issue 016 / task 038): it
  // sits FLUSH with the shore grade — deckY DERIVED from SEAWALL_Y.top so a coast
  // reshape carries the docks with it, never a hardcoded y that floats above the
  // grass on stilts. Over the lawn the deck rests on the ground (no daylight gap,
  // no post punching through the grass); posts drop ONLY seaward of the basin west
  // seawall (BASIN_W_PARAMS.fx per row), where the deck is genuinely over water.
  // Matches the owner's harbor-mouth apron photo (docks meeting a surface at grade).
  // Decks + posts stay 2 InstancedMeshes (+0 draw calls); makeBoat call order/count
  // is IDENTICAL so the shared world rng stays bit-for-bit intact.
  {
    const FD=CH.FINGER_DOCKS,rows=FD.rows;
    const deckY=CH.SEAWALL_Y.top+0.08;                       // low boardwalk flush on the shore grade
    const postH=deckY+2.9;                                   // deck underside down to ~-2.8 (below the lake)
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
    const postXs=[];for(let px=FD.x0+1.2;px<FD.x0+FD.len;px+=3.4)postXs.push(px);
    const postSpots=[];                                      // over-water post feet (variable per row)
    const decks=new THREE.InstancedMesh(new THREE.BoxGeometry(1,0.24,1),toon(0xb07a46),rows.length);
    let bi=0;
    rows.forEach((zc,i)=>{
      const xSea=CH.BASIN_W_PARAMS.fx(zc);                   // basin west seawall x at this row = the land/water line
      M.compose(V.set(FD.x0+FD.len/2,deckY,zc),Q.identity(),S.set(FD.len,1,FD.halfW*2));decks.setMatrixAt(i,M);
      for(const px of postXs)if(px>xSea)for(const pz of[zc-FD.halfW,zc+FD.halfW])postSpots.push([px,pz]);
      makeBoat(FD.boat.xMid,zc-FD.boat.dz,Math.PI/2,FD.hulls[bi%FD.hulls.length],FD.sails[bi%FD.sails.length],FD.boat.scale);bi++;
      makeBoat(FD.boat.xMid,zc+FD.boat.dz,-Math.PI/2,FD.hulls[bi%FD.hulls.length],FD.sails[bi%FD.sails.length],FD.boat.scale);bi++;
    });
    const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14,0.14,postH,6),toon(0x9c6a3a),Math.max(1,postSpots.length));
    postSpots.forEach(([px,pz],k)=>{M.compose(V.set(px,deckY-postH/2+0.02,pz),Q.identity(),S.set(1,1,1));posts.setMatrixAt(k,M);});
    decks.instanceMatrix.needsUpdate=posts.instanceMatrix.needsUpdate=true;scene.add(decks,posts);
    deckMeshes.push({id:'belmont-fingers',mesh:decks});   // 128: one tag, 4 instances = the 4 belmont-finger-* rects
  }

  // ---- boats / buoys ----
  for(const b of CH.BOATS)makeBoat(b.x,b.z,b.ry,b.hull,b.sail,b.scale);
  drifter=makeBoat(CH.DRIFTER.x,CH.DRIFTER.z,CH.DRIFTER.ry,CH.DRIFTER.hull,CH.DRIFTER.sail,CH.DRIFTER.scale);
  for(const b of CH.BUOYS)makeBuoy(b.x,b.z,b.c);

  // ---- harbor house ----
  {
    const grp=new THREE.Group();
    const cream=toon(0xf3ead4),roofC=toon(0xd0705c);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
    const base=new THREE.Mesh(new THREE.BoxGeometry(8.5,4.4,6.2),toon(0xfbf3e2));base.position.y=2.2;grp.add(base);
    // gabled roof (ridge along z) with a ~0.5 m eave overhang on the door side
    const rs=new THREE.Shape();rs.moveTo(-4.75,0);rs.lineTo(4.75,0);rs.lineTo(0,2.8);rs.closePath();
    const rg=new THREE.ExtrudeGeometry(rs,{depth:6.8,bevelEnabled:false});rg.translate(0,0,-3.4);
    const roof=new THREE.Mesh(rg,roofC);roof.position.y=4.4;grp.add(roof);
    const eaves=new THREE.InstancedMesh(new THREE.BoxGeometry(0.16,0.28,6.9),cream,2);   // fascia under both eaves
    [-1,1].forEach((s,i)=>{M.compose(V.set(s*4.72,4.28,0),Q.identity(),S.set(1,1,1));eaves.setMatrixAt(i,M);});
    eaves.instanceMatrix.needsUpdate=true;grp.add(eaves);
    const door=new THREE.Mesh(new THREE.BoxGeometry(0.14,2.2,1.2),toon(0x6d4526));door.position.set(4.28,1.1,0);grp.add(door);
    for(const wz of[-2,2]){const win=new THREE.Mesh(new THREE.BoxGeometry(0.14,1.1,1.1),curveMat(new THREE.MeshBasicMaterial({color:0xffe9b0})));win.position.set(4.28,2.7,wz);grp.add(win)}
    // cream trim frames around the door + two windows (1 instanced mesh)
    const trim=new THREE.InstancedMesh(new THREE.BoxGeometry(0.08,1,1),cream,3);
    M.compose(V.set(4.26,1.15,0),Q.identity(),S.set(1,2.5,1.5));trim.setMatrixAt(0,M);
    [-2,2].forEach((wz,i)=>{M.compose(V.set(4.26,2.7,wz),Q.identity(),S.set(1,1.4,1.4));trim.setMatrixAt(i+1,M);});
    trim.instanceMatrix.needsUpdate=true;grp.add(trim);
    // small brick chimney poking through the north slope
    const chimney=new THREE.Mesh(new THREE.BoxGeometry(0.7,3.4,0.7),toon(0x9c5a48));chimney.position.set(-2.6,5.6,1.4);grp.add(chimney);
    // harbor-master sign board above the door
    const cv=document.createElement('canvas');cv.width=256;cv.height=76;const g=cv.getContext('2d');
    g.fillStyle='#20406a';g.fillRect(0,0,256,76);g.strokeStyle='#fdf6e6';g.lineWidth=6;g.strokeRect(5,5,246,66);
    g.fillStyle='#fdf6e6';g.textAlign='center';g.textBaseline='middle';g.font='700 27px "Trebuchet MS",sans-serif';g.fillText('HARBOR MASTER',128,42);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.0,0.6),curveMat(new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)})));
    sign.position.set(4.27,3.5,0);sign.rotation.y=Math.PI/2;grp.add(sign);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,4.4,6),toon(0xd9cbb2));pole.position.set(-3.1,6.5,2.1);grp.add(pole);
    const penShape=new THREE.Shape();penShape.moveTo(0,0);penShape.lineTo(1.7,0.3);penShape.lineTo(0,0.6);penShape.closePath();
    const pennant=new THREE.Mesh(new THREE.ShapeGeometry(penShape),curveMat(new THREE.MeshBasicMaterial({color:0xa8dcf2,side:THREE.DoubleSide})));
    pennant.position.set(-3.02,8.2,2.1);grp.add(pennant);
    const HH=CH.HARBOR_HOUSE;
    grp.position.set(HH.pos[0],HH.pos[1],HH.pos[2]);scene.add(grp);collide(HH.pos[0],HH.pos[2],HH.collide);
  }

  // ---- Kwanusila tribute ----
  {
    const grp=new THREE.Group();
    const bands=[0xb3402e,0x2e6f8f,0xe0b13e,0x274e37,0x8a4a7a];
    for(let i=0;i<5;i++){
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(0.75-i*0.05,0.8-i*0.05,1.35,10),toon(bands[i]));
      seg.position.y=0.7+i*1.35;grp.add(seg);
    }
    const wingG=new THREE.BoxGeometry(3.4,0.5,0.28);
    for(const s of[-1,1]){const w=new THREE.Mesh(wingG,toon(0xb3402e));w.position.set(s*1.9,6.6,0);w.rotation.z=s*0.35;grp.add(w)}
    const beak=new THREE.Mesh(new THREE.ConeGeometry(0.28,0.9,6),toon(0xe0b13e));beak.rotation.x=Math.PI/2;beak.position.set(0,6.4,0.85);grp.add(beak);
    const KW=CH.KWANUSILA;
    grp.scale.setScalar(KW.scale);grp.position.set(KW.pos[0],KW.pos[1],KW.pos[2]);scene.add(grp);collide(KW.pos[0],KW.pos[2],KW.collide);
  }

  // ---- dog beach props + one very good dog ----
  {
    const DP=CH.DOG_PROPS;
    // rest height from the sloped cove sand AT the prop's own spot — a stale
    // x sample here (pre-084 cove) left the ball/pail hovering mid-air (092).
    const bh=(x,z)=>{const h=beachH(x,z);return h===null?0:h};
    const ball=new THREE.Mesh(new THREE.SphereGeometry(0.42,12,10),toon(0xff7b6b));
    ball.position.set(DP.ball.x,bh(DP.ball.x,DP.ball.z)+DP.ball.yOff,DP.ball.z);scene.add(ball);collide(DP.ball.x,DP.ball.z,DP.ball.collide);
    const pail=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.2,0.42,10),toon(0x7fc8f0));
    pail.position.set(DP.pail.x,bh(DP.pail.x,DP.pail.z)+DP.pail.yOff,DP.pail.z);scene.add(pail);
    const dog=new THREE.Group(),dm=toon(0xf5efe2);
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.42,10,9),dm);body.scale.set(0.85,0.8,1.25);body.position.y=0.48;dog.add(body);
    const hd=new THREE.Mesh(new THREE.SphereGeometry(0.3,9,8),dm);hd.position.set(0,0.92,0.5);dog.add(hd);
    for(const s of[-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.26,5),toon(0xcbb89a));ear.position.set(s*0.17,1.16,0.44);ear.rotation.z=s*-0.3;dog.add(ear)}
    const snout=new THREE.Mesh(new THREE.SphereGeometry(0.12,7,6),toon(0x3a2f26));snout.position.set(0,0.86,0.78);dog.add(snout);
    dogTail=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.08,0.5,6),dm);dogTail.geometry.translate(0,0.25,0);
    dogTail.position.set(0,0.62,-0.5);dogTail.rotation.x=-0.9;dog.add(dogTail);
    for(const s of[-1,1])for(const f of[0.3,-0.28]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.4,6),dm);leg.position.set(s*0.2,0.2,f);dog.add(leg)}
    dog.userData.live=true;   // the tail (dogTail) wags in the main loop — keep the whole rig live, exempt from the cell merge
    const dz=DP.dog.z;dog.position.set(DP.dog.x,bh(DP.dog.x,dz),dz);dog.rotation.y=DP.dog.ry;scene.add(dog);collide(DP.dog.x,dz,DP.dog.collide);
  }

  for(const s of CH.SIGNS)makeSign(s.text,s.x,s.z,s.ry);
  for(const s of CH.MT_SIGNS)makeSign(s.text,s.x,s.z,s.ry);   // Montrose harbor wooden sign (no rng — makeSign is rng-free)

  // ---- waterline foam sparkle along the sheet-pile ----
  {
    // 084: foam POSITIONS come from the REAL runs (the golf ghost excluded;
    // the vignette golf + bay appended LAST so every pre-084 MAIN/PEN point
    // keeps its exact phase), while the shared-rng phase draws are a FIXED
    // BALLAST of exactly the pre-084 count — computed from COAST_SEGS, which
    // still carries the full-length golf ghost at [2]. Points past the ballast
    // (there are fewer now, but belt-and-suspenders) get LOCAL phases, so the
    // shared stream into fireflies/structures is bit-for-bit unchanged.
    const P=[];
    const runs=[COAST_SEGS[0],COAST_SEGS[1],COAST_SEGS[3],COAST_SEGS[4],MTR_SEGS[7],MTR_SEGS[0]];
    for(const segs of runs)for(const s of segs){
      for(let t=0;t<s.len;t+=1.7){
        const cx=s.ax+s.tx*t,cz=s.az+s.tz*t,tot=profileTotal(cz);
        P.push([cx+s.nx*(tot+0.45),WATER_Y+0.18,cz+s.nz*(tot+0.45)]);
      }
    }
    let nBallast=0;
    for(const segs of COAST_SEGS)for(const s of segs)for(let t=0;t<s.len;t+=1.7)nBallast++;
    const phases=[];for(let i=0;i<nBallast;i++)phases.push(rand(0,9));
    const foamR=mkrng(0x084f0a1);
    const n=P.length,pos=new Float32Array(n*3),aC=new Float32Array(n*3),aS=new Float32Array(n);
    for(let i=0;i<n;i++){pos.set(P[i],i*3);aC.set([0.9,1,1],i*3);aS[i]=1.1;foam.ph.push(i<nBallast?phases[i]:foamR()*9);foam.base.push(P[i])}
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    g.setAttribute('aColor',new THREE.BufferAttribute(aC,3));
    g.setAttribute('aSize',new THREE.BufferAttribute(aS,1));
    foam.pts=new THREE.Points(g,pointsMat());foam.pts.frustumCulled=false;scene.add(foam.pts);
  }

  // ---- fireflies ----
  {
    const pos=new Float32Array(fireflies.n*3),aC=new Float32Array(fireflies.n*3),aS=new Float32Array(fireflies.n);
    for(let i=0;i<fireflies.n;i++){
      let x,z;
      if(i<44){x=rand(60,132);z=rand(55,185)}else{const t=treeSpots[rng()*treeSpots.length|0];x=t[0]+rand(-4,4);z=t[1]+rand(-4,4)}
      const y=rand(0.5,2.4);
      fireflies.base.push([x,y,z]);fireflies.ph.push(rand(0,9));
      pos.set([x,y,z],i*3);aC.set([1,0.85,0.45],i*3);aS[i]=rand(0.55,0.95);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    g.setAttribute('aColor',new THREE.BufferAttribute(aC,3));
    g.setAttribute('aSize',new THREE.BufferAttribute(aS,1));
    fireflies.pts=new THREE.Points(g,pointsMat());scene.add(fireflies.pts);
  }

  // ---- Montrose Harbor west shore: finger docks + boat launch ramp -------------
  // All INDIVIDUAL frustum-culled meshes (the plankDeck wood vocabulary) — ZERO new
  // InstancedMesh buckets, and ZERO shared world rng: no rng()/rand(), no makeBoat
  // (which draws world rng), no jitter. Every value comes from the data consts, so
  // the game's determinism gate stays bit-for-bit. Moored boats are handled by
  // moorings.js (local seed). Placed LAST in buildProps so it runs after every
  // world-rng consumer above (it consumes none, but this is belt-and-suspenders).
  {
    const MD=CH.MT_FINGER_DOCKS;
    const deckY=CH.SEAWALL_Y.top+0.08;                 // low boardwalk flush on the shore grade (~0.12)
    const postH=deckY+2.9;                             // deck underside down to ~-2.8 (below the basin water ~-2.32)
    const deckMat=toon(0x8a6a44),woodMat=toon(0x9c6a3a);
    const deckGeo=new THREE.BoxGeometry(MD.len,0.24,MD.halfW*2);   // shared: every finger deck is identical
    const postGeo=new THREE.CylinderGeometry(0.14,0.14,postH,6);
    const knobGeo=new THREE.SphereGeometry(0.17,7,6);
    const railGeo=new THREE.BoxGeometry(3.4,0.09,0.09);
    const grp=new THREE.Group();
    for(const zc of MD.rows){
      const deck=new THREE.Mesh(deckGeo,deckMat);deck.position.set(MD.x0+MD.len/2,deckY,zc);grp.add(deck);
      deckMeshes.push({id:'montrose-finger-'+zc,mesh:deck});   // 128: the walk surface (posts/knobs/rails below are not)
      for(let px=MD.x0+1.2;px<MD.x0+MD.len;px+=3.4){
        // 128: the deck now ROOTS ON THE GRASS (x0 183.4, inland of the smoothed
        // shore), so the two emissions split. The long PILING drops below the
        // water and may only stand east of the real shore (MD.shoreX) — west of
        // it, it would punch up through the lawn. The KNOB + RAIL ride the deck
        // itself, so they run the FULL length including the on-grass root
        // stretch (before, the handrail started a third of the way out).
        const overWater=px>MD.shoreX;
        for(const pz of[zc-MD.halfW,zc+MD.halfW]){
          if(overWater){const post=new THREE.Mesh(postGeo,woodMat);post.position.set(px,deckY-postH/2+0.02,pz);grp.add(post);}   // top flush with deck underside
          const knob=new THREE.Mesh(knobGeo,woodMat);knob.position.set(px,deckY+0.34,pz);grp.add(knob);          // piling cap
          // rail to the next piling, CLIPPED at the tip — the shared 3.4 m bar is
          // scaled on its last run so no handrail juts out over open water past
          // the last plank (128: the lengthened deck put the final station 2.8 m
          // from the end and a rail stub hung off the tip).
          const rx2=Math.min(px+3.4,MD.x0+MD.len);
          if(rx2>px+0.3){const rail=new THREE.Mesh(railGeo,woodMat);rail.scale.x=(rx2-px)/3.4;rail.position.set((px+rx2)/2,deckY+0.5,pz);grp.add(rail);}
        }
      }
    }
    scene.add(grp);

    // public boat LAUNCH ramp — one wide pale slab tilting from the shore (west edge
    // at topY) down into the basin (east edge submerged at botY). No walkRect (ramp
    // into water). Single frustum-culled Box rotated about z so it reads as concrete.
    {
      const L=CH.MT_LAUNCH,w=L.x1-L.x0;
      const ramp=new THREE.Mesh(new THREE.BoxGeometry(w,0.2,L.z1-L.z0),toon(L.color));
      ramp.position.set((L.x0+L.x1)/2,(L.topY+L.botY)/2,(L.z0+L.z1)/2);
      ramp.rotation.z=Math.atan2(L.botY-L.topY,w);     // west (+topY) high, east (+botY) low → slopes into the water
      scene.add(ramp);
    }
  }

  // ---- Diversey Harbor east-bank finger docks (113): the channel's slip fingers — Montrose wood vocabulary, merged (draw diet) ----
  // ZERO rng, ZERO new InstancedMesh buckets: every value comes from CH.LP_DIVERSEY
  // + the sampled-bank lpDivBank (the single truth shared with coast.js, moorings.js
  // and tools/walkprobe.mjs). All 8 docks FOLD to three merged meshes (decks /
  // posts+knobs / dock boxes) → ~3 draws for the whole harbor; the walk rects are
  // NOT restated here — CH.deckRects() states them once for engine + walkprobe (128).
  {
    const LD=CH.LP_DIVERSEY;
    const deckGs=[],postGs=[],boxGs=[];
    for(const zc of LD.dockRows){
      const e=CH.lpDivBank(zc).e,root=e+0.6,tip=root-LD.dockLen;   // rooted 0.6 onto the promenade so the deck reads flush (issue-016 flush-root law)
      const deck=new THREE.BoxGeometry(LD.dockLen,0.24,LD.dockHalfW*2);
      deck.translate((root+tip)/2,LD.deckY,zc);deckGs.push(deck.toNonIndexed());
      const postH=LD.deckY+2.9;                        // deck underside down below the lagoon water (~-2.34)
      for(const px of[tip+0.5,tip+3.2,tip+5.9]){
        if(px>e-0.2)continue;                          // over-water stations only — no post punching through the promenade
        for(const pz of[zc-LD.dockHalfW,zc+LD.dockHalfW]){
          const post=new THREE.CylinderGeometry(0.14,0.14,postH,6);
          post.translate(px,LD.deckY-postH/2+0.02,pz);postGs.push(post.toNonIndexed());   // top flush with the deck underside
          const knob=new THREE.SphereGeometry(0.17,7,6);
          knob.translate(px,LD.deckY+0.34,pz);postGs.push(knob.toNonIndexed());           // piling cap
        }
      }
      const box=new THREE.BoxGeometry(0.85,0.55,0.5);                       // the refs' white dock box at each slip root
      box.translate(root-1.1,LD.deckY+0.395,zc+LD.dockHalfW-0.05);boxGs.push(box.toNonIndexed());
    }
    const divDecks=new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(deckGs),toon(LD.deckWood));
    scene.add(divDecks);deckMeshes.push({id:'diversey-fingers',mesh:divDecks});   // 128: one merged mesh = the 8 diversey-finger-* rects
    scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(postGs),toon(LD.postWood)));
    scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(boxGs),toon(LD.boxCream)));

    // 'DIVERSEY HARBOR' park-district board — own navy canvas, TWO back-to-back
    // FrontSide planes (mirrored-text law: never one DoubleSide canvas plane),
    // posts BEHIND the board ending at the panel's bottom edge (lollipop law).
    // One collider on open promenade, walkable all around (makeSign convention).
    {
      const cv=document.createElement('canvas');cv.width=512;cv.height=96;const g=cv.getContext('2d');
      g.fillStyle='#20406a';g.fillRect(0,0,512,96);
      g.strokeStyle='#fdf6e6';g.lineWidth=4;g.strokeRect(2,2,508,92);
      g.fillStyle='#fdf6e6';g.textAlign='center';g.textBaseline='middle';
      let fs=34;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;
      while(g.measureText(LD.sign.text).width>470&&fs>18){fs-=2;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;}
      g.fillText(LD.sign.text,256,48);
      const tex=new THREE.CanvasTexture(cv);
      const grp=new THREE.Group();
      for(const sx of[-1.2,1.2]){
        const post=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,1.7,6),toon(0xa9713f));
        post.position.set(sx,0.85,-0.25);grp.add(post);   // top y 1.7 ~ the board's bottom edge (1.54) — never bisects the text
      }
      const board=new THREE.Mesh(new THREE.PlaneGeometry(3.2,0.72),curveMat(new THREE.MeshBasicMaterial({map:tex})));board.position.y=1.9;grp.add(board);
      const back=new THREE.Mesh(new THREE.PlaneGeometry(3.2,0.72),bmat(0xe8d7b4));back.rotation.y=Math.PI;back.position.y=1.9;grp.add(back);
      grp.position.set(LD.sign.x,0,LD.sign.z);grp.rotation.y=LD.sign.ry;scene.add(grp);
      collide(LD.sign.x,LD.sign.z,0.5);
    }
  }

  // ---- Montrose DUNE natural area: sand mounds + piping-plover story + sign ---
  // All INDIVIDUAL frustum-culled meshes (fixed CH coords) → +0 draws unless the
  // dune is framed. ZERO rng of any kind — every value comes from CH data.
  // No colliders inside the roped block (065 law); only the sign post collides.
  {
    // low dune sand mounds — warm-sand top hemispheres, base flush at grade
    for(const m of CH.MONTROSE_DUNE.mounds){
      const dome=new THREE.Mesh(new THREE.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI/2),toon(0xe0cfa4));
      dome.scale.set(m.rx,m.h,m.rz);dome.position.set(m.x,0,m.z);scene.add(dome);
    }
    // chibi-chunky piping plover (realistic tiny birds vanish at this scale)
    const mkPlover=(scale,pale,adult)=>{
      const grp=new THREE.Group();
      const bodyC=pale?0xeee2c9:0xdcc7a8,headC=pale?0xf2e8d2:0xe8dcc4;
      const body=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,7),toon(bodyC));body.scale.set(1,0.85,1.4);body.position.y=0.16;grp.add(body);
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,7),toon(headC));head.position.set(0,0.26,0.14);grp.add(head);
      if(adult){
        const band=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.05,10),toon(0x33302a));band.position.set(0,0.22,0.02);grp.add(band);  // black neckband collar
        const beak=new THREE.Mesh(new THREE.ConeGeometry(0.02,0.07,6),toon(0xe8922e));beak.rotation.x=Math.PI/2;beak.position.set(0,0.24,0.24);grp.add(beak);  // points +z (forward)
        for(const sx of[-0.05,0.05]){
          const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.13,5),toon(0xe8922e));leg.position.set(sx,0.06,0);grp.add(leg);
          const eye=new THREE.Mesh(new THREE.SphereGeometry(0.017,6,6),toon(0x1a1712));eye.position.set(sx*0.85,0.29,0.19);grp.add(eye);
        }
      }
      grp.scale.setScalar(scale);return grp;
    };
    for(const p of CH.MONTROSE_DUNE.plovers){
      const bh=CH.montroseBeachH(p.x,p.z),pl=mkPlover(1.6,false,true);   // chibi-chunky so they read from the beach (small birds vanish)
      pl.position.set(p.x,(bh==null?0:bh)+0.02,p.z);pl.rotation.y=p.ry;scene.add(pl);
    }
    // the chick is now an ANIMATED peek-out chick built in packs/montrose-beach.js
    // honest info sign — own CanvasTexture placard on a post, faces the beach
    {
      const SG=CH.MONTROSE_DUNE.sign;
      const cv=document.createElement('canvas');cv.width=360;cv.height=260;const g=cv.getContext('2d');
      g.fillStyle='#efe4c8';g.fillRect(0,0,360,260);                       // sand/cream ground
      g.strokeStyle='#8a7a5c';g.lineWidth=8;g.strokeRect(12,12,336,236);   // thin border
      // tiny plover glyph (dark silhouette) top-centre
      g.fillStyle='#4a3b2f';
      g.beginPath();g.ellipse(180,52,25,15,0,0,Math.PI*2);g.fill();        // body
      g.beginPath();g.arc(201,40,10,0,Math.PI*2);g.fill();                 // head
      g.beginPath();g.moveTo(209,40);g.lineTo(222,42);g.lineTo(209,45);g.closePath();g.fill();  // beak
      g.strokeStyle='#4a3b2f';g.lineWidth=3;
      g.beginPath();g.moveTo(174,66);g.lineTo(174,80);g.moveTo(186,66);g.lineTo(186,80);g.stroke();  // legs
      g.textAlign='center';g.textBaseline='middle';
      const ys=[124,166,206];
      for(let i=0;i<SG.lines.length;i++){
        let fs=34;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;
        while(g.measureText(SG.lines[i]).width>300&&fs>12){fs-=2;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;}   // shrink-to-fit
        g.fillStyle=i===2?'#7a5a3a':'#4a3b2f';g.fillText(SG.lines[i],180,ys[i]);
      }
      const tex=new THREE.CanvasTexture(cv);
      const grp=new THREE.Group();
      const post=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.9,0.08),toon(0x6b5a3f));post.position.y=0.45;grp.add(post);
      const backing=new THREE.Mesh(new THREE.BoxGeometry(1.66,1.21,0.06),toon(0x8a7a5c));backing.position.set(0,1.25,-0.05);grp.add(backing);  // solid back — never mirrored text
      const placard=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.15),curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})));placard.position.y=1.25;grp.add(placard);
      grp.position.set(SG.x,0,SG.z);grp.rotation.y=SG.ry;scene.add(grp);collide(SG.x,SG.z,0.35);   // thin post — walk around
    }
  }

  // ---- 129 THE RESERVE EXPANSION signage — the 072 dune-sign register --------
  // Two big interpretive GATE signs, the cell-A nesting sign (a straight copy of
  // the dune sign's class, its own lines), and six small laminated PLACARDS
  // zip-tied to rope posts. Word-sign laws (028/032/050): each DISTINCT text
  // gets its own measureText-FITTED canvas, a FrontSide plane only, and a solid
  // rear (the backing box) so no mirrored-text artifact can ever show. The two
  // gate signs carry IDENTICAL lines, so they SHARE one canvas/material and all
  // six placards share another — three unique textured materials for eleven
  // objects, and mergeCellStatic folds each shared pair/set into one draw.
  // Zero rng. ----
  {
    const SG=RSV.signs;
    // (i) the shared gate-sign canvas: cream board, dark border, a low dune
    // profile with marram tufts, the two fitted lines and a park-district band.
    const gateTex=(()=>{
      const cv=document.createElement('canvas');cv.width=512;cv.height=344;const g=cv.getContext('2d');
      g.fillStyle='#efe4c8';g.fillRect(0,0,512,344);
      g.strokeStyle='#4a5c46';g.lineWidth=9;g.strokeRect(13,13,486,318);
      g.fillStyle='#d9c087';                                              // dune profile
      g.beginPath();g.moveTo(40,120);g.quadraticCurveTo(150,62,250,104);g.quadraticCurveTo(350,146,472,100);
      g.lineTo(472,142);g.lineTo(40,142);g.closePath();g.fill();
      g.strokeStyle='#7f9455';g.lineWidth=5;                              // marram tufts on the ridge
      for(let i=0;i<11;i++){const bx=60+i*36,by=126-Math.sin(i*0.9)*16;
        for(const dx of[-7,0,7]){g.beginPath();g.moveTo(bx,by+16);g.lineTo(bx+dx,by-14);g.stroke();}}
      g.textAlign='center';g.textBaseline='middle';
      const put=(txt,y,size,col,max)=>{let fs=size;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;
        while(g.measureText(txt).width>max&&fs>10){fs-=2;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;}
        g.fillStyle=col;g.fillText(txt,256,y);};
      put(SG.gateE.lines[0],202,44,'#2d4a2a',430);
      put(SG.gateE.lines[1],254,40,'#4a5c46',430);
      put('CHICAGO PARK DISTRICT',306,24,'#7a5a3a',400);
      const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
    })();
    const gateM=curveMat(new THREE.MeshBasicMaterial({map:gateTex,side:THREE.FrontSide}));
    // ONE dark-wood hex for posts AND backings: reusing a pool colour stops a
    // NEW bucket being allocated (145), but it cannot make a physically-new
    // object free — a bucket whose other members sit 120 m away at the Point
    // still costs +1 draw in every reserve view. Fewer distinct hexes = fewer
    // view-local draws, so the whole kit runs on six (see the buildMontroseReserve
    // header in structures.js for the measured ledger).
    const postM=toon(0x7d6b52),backM=postM;
    for(const S of[SG.gateE,SG.gateW]){
      const grp=new THREE.Group();
      for(const sx of[-0.62,0.62]){                                       // TWO posts, ending at the panel's BOTTOM edge (lollipop law — a post through the text bisects it)
        const post=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.15,0.1),postM);
        post.position.set(sx,0.575,-0.04);grp.add(post);
      }
      const back=new THREE.Mesh(new THREE.BoxGeometry(1.58,1.08,0.07),backM);back.position.set(0,1.66,-0.05);grp.add(back);
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.0),gateM);panel.position.y=1.66;grp.add(panel);
      grp.position.set(S.x,0,S.z);grp.rotation.y=S.ry;scene.add(grp);
      collide(S.x,S.z,0.5);
    }
    // (ii) CELL A — the 072 dune sign's exact class (plover glyph + three fitted
    // lines on a single post), on the cell's south rope facing the corridor.
    {
      const S=SG.cellA;
      const cv=document.createElement('canvas');cv.width=360;cv.height=260;const g=cv.getContext('2d');
      g.fillStyle='#efe4c8';g.fillRect(0,0,360,260);
      g.strokeStyle='#8a7a5c';g.lineWidth=8;g.strokeRect(12,12,336,236);
      g.fillStyle='#4a3b2f';
      g.beginPath();g.ellipse(180,52,25,15,0,0,Math.PI*2);g.fill();        // body
      g.beginPath();g.arc(201,40,10,0,Math.PI*2);g.fill();                 // head
      g.beginPath();g.moveTo(209,40);g.lineTo(222,42);g.lineTo(209,45);g.closePath();g.fill();  // beak
      g.strokeStyle='#4a3b2f';g.lineWidth=3;
      g.beginPath();g.moveTo(174,66);g.lineTo(174,80);g.moveTo(186,66);g.lineTo(186,80);g.stroke();
      g.textAlign='center';g.textBaseline='middle';
      const ys=[124,166,206];
      for(let i=0;i<S.lines.length;i++){
        let fs=34;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;
        while(g.measureText(S.lines[i]).width>300&&fs>12){fs-=2;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;}
        g.fillStyle=i===2?'#7a5a3a':'#4a3b2f';g.fillText(S.lines[i],180,ys[i]);
      }
      const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
      const grp=new THREE.Group();
      const post=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.9,0.08),postM);post.position.y=0.45;grp.add(post);
      const back=new THREE.Mesh(new THREE.BoxGeometry(1.66,1.21,0.06),backM);back.position.set(0,1.25,-0.05);grp.add(back);
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.15),curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})));
      panel.position.y=1.25;grp.add(panel);
      // RY FIX, not a data edit (the ry-faces-away trap): the data's Math.PI
      // aims the face at -z = NORTH, into the cell it is warning you away from.
      // The reader stands on the CORRIDOR, ~8 m SOUTH of this rope, so the panel
      // has to look +z. Corrected here in the builder — the const stays the
      // owner's/planner's (executor A's file), and the correction is visible.
      grp.position.set(S.x,0,S.z);grp.rotation.y=S.ry+Math.PI;scene.add(grp);
      collide(S.x,S.z,0.35);
    }
    // (iii) PLACARDS — 'FRAGILE DUNE HABITAT / Please stay on paths', blue on
    // white, snapped onto the NEAREST REAL ROPE POST (the data coords are hints;
    // one of them — (33.2,-771) at the west gate — sits ON the corridor, and a
    // post planted in the middle of a path is exactly what prop-clearance
    // exists to stop). Each card then faces the nearest DRAWN ribbon sample:
    // a placard is read by someone standing on the path. No collider — you walk
    // straight past a laminated card.
    {
      const cv=document.createElement('canvas');cv.width=256;cv.height=192;const g=cv.getContext('2d');
      g.fillStyle='#f6f6f2';g.fillRect(0,0,256,192);
      g.strokeStyle='#2f5aa8';g.lineWidth=7;g.strokeRect(9,9,238,174);
      g.textAlign='center';g.textBaseline='middle';
      const put=(txt,y,size,w,col)=>{let fs=size;g.font=`${w} ${fs}px "Trebuchet MS",sans-serif`;
        while(g.measureText(txt).width>210&&fs>8){fs-=2;g.font=`${w} ${fs}px "Trebuchet MS",sans-serif`;}
        g.fillStyle=col;g.fillText(txt,128,y);};
      put('FRAGILE',52,34,'800','#2f5aa8');
      put('DUNE HABITAT',88,30,'800','#2f5aa8');
      put('Please stay',131,24,'400','#41506b');
      put('on paths',157,24,'400','#41506b');
      const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
      const cardM=curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})),cardBackM=toon(0xb59a6f);
      // every rope post, stepped with fenceRun's own spacing math (spacing 2.6,
      // n = max(1, round(len/2.6))) so a card lands ON a post, never between two
      const posts=[];
      const runs=RSV.rope.slice();
      for(const c of RSV.cells)for(const ln of rectLines2(c))runs.push(ln);
      for(const run of runs)for(let i=0;i<run.length-1;i++){
        const ax=run[i][0],az=run[i][1],dx=run[i+1][0]-ax,dz=run[i+1][1]-az,len=Math.hypot(dx,dz);
        if(len<1e-4)continue;
        const n=Math.max(1,Math.round(len/2.6));
        for(let k=0;k<=n;k++)posts.push([ax+dx*k/n,az+dz*k/n]);
      }
      for(const[px,pz]of RSV.placards){
        let best=posts[0],bd=Infinity;
        for(const q of posts){const d=(q[0]-px)**2+(q[1]-pz)**2;if(d<bd){bd=d;best=q;}}
        let ax=best[0],az=best[1],fd=Infinity,fx=ax,fz=az+1;
        for(const s of rsvN){const d=(s[0]-ax)**2+(s[1]-az)**2;if(d>0.6&&d<fd){fd=d;fx=s[0];fz=s[1];}}
        const grp=new THREE.Group();
        const back=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.26,0.025),cardBackM);back.position.z=-0.02;grp.add(back);
        const card=new THREE.Mesh(new THREE.PlaneGeometry(0.32,0.24),cardM);grp.add(card);
        grp.position.set(ax,0.38,az);
        grp.rotation.y=Math.atan2(fx-ax,fz-az);
        grp.rotateX(0.14);grp.rotateZ(((ax*7.13+az*3.71)%1+1)%1*0.14-0.07);   // rng-free lean/roll — zip ties are never square
        scene.add(grp);
      }
    }
  }
}

// rectLines twin for props.js (structures.js keeps its own — one closed loop of
// four segments around a nest cell). Pure geometry, no rng, no shared state.
function rectLines2(b){return [
  [[b.x0,b.z0],[b.x1,b.z0]],[[b.x1,b.z0],[b.x1,b.z1]],
  [[b.x1,b.z1],[b.x0,b.z1]],[[b.x0,b.z1],[b.x0,b.z0]],
];}
