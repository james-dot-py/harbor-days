// =====================================================================
//  PARKLIFE — stationary people ENJOYING the lakefront. Cozy tableaux:
//  three picnics on the inland lawns, four sunbathers stretched on the
//  Belmont Rocks terraces, a kite flyer (the showpiece) whose diamond
//  loops a lazy figure-8 on a line with a fluttering tail, and two
//  anglers casting off the rocks / peninsula pier with bobbers riding
//  the water. Everyone is a POSED chibi (seated / lying / arm-raised /
//  casting), so they use raw createChibi and are added directly — NOT
//  makeNPC, whose per-frame walk-swing would fight their static poses.
//
//  All setup runs inside onWorldReady. A SINGLE registerUpdate animates
//  only the moving bits (kite figure-8 + string + tail ribbons + the two
//  bobbers) from hoisted scratch — zero per-frame allocation. No shared
//  world rng: layout is hardcoded, any randomness is a local m32 seed.
//  Terrace heights for the sunbathers/anglers come from coastQuery/tierAt
//  (same as progression.js groundY), so they rest ON the steps, not float.
//
//  Draw-call budget (props instanced where repeated; chibis exempt by
//  design): blankets(1) towels(1) coolers(1) food(1) radio(2) sunglasses(1)
//  book(1) kite(1) tail(1) line(1) bobbers(2) rods(1) south-steps-radio(3) = ~17.
//  The DIVERSEY CORNER (section 6) adds ~17 static chibis wrapping the
//  curved terraces + corner lawn, plus instanced props only:
//  corner-books(1) blankets(1) coolers(1) food(1) towels(1) dog(5) = ~10.
// =====================================================================
import { onWorldReady, registerUpdate, createChibi } from '../framework.js';
import * as THREE from 'three';
import { scene, camera, toon, bmat, curveMat, WATER_Y } from '../core.js';
import { coastQuery, tierAt } from '../coast.js';
import { pathSamples } from '../paths.js';

// local deterministic rng — never the shared core rng()/rand()
function m32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const CITIZEN = 0.74;                       // canonical chibi scale (matches the mayor)

// terrace height (rocks) else park y=0 — same test as progression.js groundY
function groundY(x,z){
  const q = coastQuery(x,z);
  if(q && q.lat>0.15){ const t=tierAt(q.lat,q.z); if(t) return t.h; }
  return 0;
}

// ---- palettes (hardcoded → deterministic, no world rng) --------------
const PAL = [
  {suit:0xd4694f,pants:0x3c4a63,skin:0xe8b48c,hair:0x3a2a1e},
  {suit:0x4f8c6b,pants:0x2f3540,skin:0x8a5a3c,hair:0x1d160f,hairStyle:'bun'},
  {suit:0xe0b24a,pants:0x6b4a2f,skin:0xf0c9a0,hair:0x55402a},
  {suit:0x6d7fbf,pants:0x33384a,skin:0x6e4632,hair:0x24160e,hairStyle:'afro'},
  {suit:0xc85c8e,pants:0x40354a,skin:0xdca07a,hair:0x2a1c12,hairStyle:'tall'},
  {suit:0x3f9bb0,pants:0x2c3b45,skin:0xa8724a,hair:0x140f0a},
  {suit:0xe38b5a,pants:0x4a3320,skin:0xf2caa6,hair:0x6a4a2c,hairStyle:'bun'},
  {suit:0x8a6bbf,pants:0x33304a,skin:0x7a5038,hair:0x1a120c},
  {suit:0xcf5142,pants:0x2f3a4a,skin:0xecb890,hair:0x2c1d12},
  {suit:0x5aa06a,pants:0x38402c,skin:0x955f3d,hair:0x120d08,hairStyle:'afro'},
  {suit:0xd9a23c,pants:0x3a3550,skin:0xf0c49c,hair:0x4a3520,hairStyle:'tall'},
  {suit:0x4d84c4,pants:0x2b3340,skin:0x87573a,hair:0x161009},
  {suit:0xb85c94,pants:0x3d3348,skin:0xe6ad84,hair:0x241610},
];
let _pi = 0;
function nextPal(){ return PAL[_pi++ % PAL.length]; }

function makeChibi(x,z,ry,pal,scale=CITIZEN){
  const {group,parts} = createChibi(Object.assign({scale}, pal));
  group.position.set(x,0,z); group.rotation.y = ry; scene.add(group);
  return {group,parts};
}
// sit cross-legged / knees-up on the ground: legs forward, hips dropped to grass
function poseSeated(group,parts,y){
  parts.legL.rotation.x = -1.42; parts.legR.rotation.x = -1.36;
  parts.armL.rotation.x = -0.4;  parts.armR.rotation.x = -0.5;
  parts.armL.rotation.z = 0.15;  parts.armR.rotation.z = -0.15;
  parts.body.rotation.x = -0.12;
  group.position.y = y - 0.33;                 // hips down onto the blanket
}
// lie flat, face up, head toward -z (north) — tip the whole group back 90°
function poseLying(group,parts,y){
  group.rotation.set(-Math.PI/2, 0, 0);
  parts.legL.rotation.x = 0.06; parts.legR.rotation.x = -0.06;   // relaxed splay
  parts.armL.rotation.z = 0.5;  parts.armR.rotation.z = -0.5;    // arms out a touch
  parts.shadow.visible = false;                // rotated disc would stand up — hide it
  group.position.y = y + 0.30;                 // back resting on the towel
}

onWorldReady(() => {
  const rnd = m32(7311);

  // shared scratch for filling instanced matrices (build-time only)
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), V=new THREE.Vector3(),
        S=new THREE.Vector3(1,1,1), E=new THREE.Euler(), C=new THREE.Color();
  const flatX = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)); // plane -> lay flat

  // ================================================================= //
  //  1) THREE PICNICS
  // ================================================================= //
  const PICNICS = [
    {x:70, z:90,   ry:0.5,  col:0xd0563c, radio:false},  // AIDS Garden lawn
    {x:55, z:-200, ry:-0.4, col:0xe0a13a, radio:true },  // harbor-west lawn (has the radio)
    {x:75, z:-370, ry:0.9,  col:0xc25c8e, radio:false},  // sanctuary-south lawn
  ];
  const foodSpots = [];      // {x,y,z,c}
  const coolerSpots = [];    // {x,z}
  let radioSpot = null;

  // blankets — one InstancedMesh (warm, flat, slight yaw)
  const blankets = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(2.8,2.2),
    curveMat(new THREE.MeshToonMaterial({side:THREE.DoubleSide})), PICNICS.length);
  blankets.frustumCulled = false;

  PICNICS.forEach((p,i) => {
    E.set(0,p.ry,0); Q.setFromEuler(E); Q.multiply(flatX);
    M.compose(V.set(p.x,0.02,p.z), Q, S.set(1,1,1));
    blankets.setMatrixAt(i,M); blankets.setColorAt(i,C.setHex(p.col));

    // two seated chibis on opposite edges, facing the spread
    const seatOff = [[-1.0,-0.5],[0.85,0.75]];
    for(const [ox,oz] of seatOff){
      const sx=p.x+ox, sz=p.z+oz, ry=Math.atan2(p.x-sx,p.z-sz);
      const {group,parts}=makeChibi(sx,sz,ry,nextPal());
      poseSeated(group,parts,0);
    }
    // cooler + a couple of food props on the blanket
    coolerSpots.push({x:p.x+1.25, z:p.z-0.9});
    foodSpots.push({x:p.x+0.3, y:0.12, z:p.z+0.15, c:0xf2c45a});   // bun / roll
    foodSpots.push({x:p.x-0.25,y:0.11, z:p.z-0.3,  c:0xd0463f});   // apple
    if(p.radio) radioSpot = {x:p.x-1.1, z:p.z+0.95, ry:p.ry-0.3};
  });
  blankets.instanceMatrix.needsUpdate = true;
  blankets.instanceColor.needsUpdate = true;
  scene.add(blankets);

  // coolers (instanced boxes)
  const coolers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.52,0.4,0.36), toon(0x3a6ea5), coolerSpots.length);
  coolerSpots.forEach((c,i)=>{ M.compose(V.set(c.x,0.2,c.z),new THREE.Quaternion(),S.set(1,1,1)); coolers.setMatrixAt(i,M); });
  coolers.instanceMatrix.needsUpdate = true; scene.add(coolers);

  // food props (instanced small spheres, per-item colour)
  const food = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1,7,6), toon(0xffffff), foodSpots.length);
  foodSpots.forEach((f,i)=>{ M.compose(V.set(f.x,f.y,f.z),new THREE.Quaternion(),S.set(1,1,1)); food.setMatrixAt(i,M); food.setColorAt(i,C.setHex(f.c)); });
  food.instanceMatrix.needsUpdate = true; food.instanceColor.needsUpdate = true; scene.add(food);

  // portable radio prop on the harbor-west picnic (decorative, non-functional)
  if(radioSpot){
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.3,0.18), toon(0x2b2b32));
    body.position.set(radioSpot.x, 0.15, radioSpot.z); body.rotation.y = radioSpot.ry; scene.add(body);
    // two speaker cones (instanced), plus we lean on the body's own rotation
    const spk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07,0.07,0.03,12), toon(0x14141a), 2);
    [-0.15,0.15].forEach((sx,i)=>{
      E.set(Math.PI/2,radioSpot.ry,0); Q.setFromEuler(E);
      const wx = radioSpot.x + Math.cos(radioSpot.ry)*sx, wz = radioSpot.z - Math.sin(radioSpot.ry)*sx;
      M.compose(V.set(wx,0.15,wz + 0.001), Q, S.set(1,1,1)); spk.setMatrixAt(i,M);
    });
    spk.instanceMatrix.needsUpdate = true; scene.add(spk);
  }

  // ================================================================= //
  //  2) FOUR SUNBATHERS on the Belmont Rocks terraces
  // ================================================================= //
  const SUN = [
    {x:156, z:85,  tcol:0x66c1e0, glasses:true,  book:false},
    {x:158, z:130, tcol:0xef8fb5, glasses:false, book:true },
    {x:155, z:175, tcol:0xf2c14e, glasses:true,  book:false},
    {x:158, z:220, tcol:0x8fd694, glasses:false, book:false},
  ];
  const towels = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.95,2.1),
    curveMat(new THREE.MeshToonMaterial({side:THREE.DoubleSide})), SUN.length);
  towels.frustumCulled = false;
  const glassSpots = [];   // {x,y,z}

  SUN.forEach((su,i) => {
    const y = groundY(su.x, su.z);
    M.compose(V.set(su.x, y+0.03, su.z), flatX, S.set(1,1,1));
    towels.setMatrixAt(i,M); towels.setColorAt(i,C.setHex(su.tcol));

    const {group,parts} = makeChibi(su.x, su.z, 0, nextPal());
    poseLying(group,parts,y);

    if(su.glasses) glassSpots.push({x:su.x, y:y+0.30+0.4, z:su.z-1.6});  // over the (upturned) face
    if(su.book){
      // a small propped open book held above the chest
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.34,0.06),
        curveMat(new THREE.MeshToonMaterial({color:0xf4ede0,side:THREE.DoubleSide})));
      book.position.set(su.x, y+0.30+0.72, su.z-0.85);
      book.rotation.set(-0.9, 0, 0); scene.add(book);
    }
  });
  towels.instanceMatrix.needsUpdate = true; towels.instanceColor.needsUpdate = true; scene.add(towels);

  // sunglasses (instanced tiny dark boxes lying flat over the eyes)
  if(glassSpots.length){
    const glasses = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2,0.04,0.07), toon(0x101014), glassSpots.length);
    glassSpots.forEach((g,i)=>{ M.compose(V.set(g.x,g.y,g.z),new THREE.Quaternion(),S.set(1,1,1)); glasses.setMatrixAt(i,M); });
    glasses.instanceMatrix.needsUpdate = true; scene.add(glasses);
  }

  // ================================================================= //
  //  4) TWO ANGLERS (built before the kite so rods share one instanced mesh)
  // ================================================================= //
  const ANGLERS = [
    {x:162, z:105, bx:173, bz:105, ph:0.0},           // Belmont Rocks waterline (terrace tier height); bobber clear of the terrace edge (x167) in open water
    {x:206, z:-98, bx:220, bz:-98, ph:1.7, y:0.54},   // peninsula plank pier: deck top y≈0.54 (DECKS h0.42+box), bobber E of the deck edge (x216) in open water
  ];
  const rods = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018,0.03,2.6,5), toon(0x6a4a2c), ANGLERS.length);
  const bobRed = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11,8,6), toon(0xd23a34), ANGLERS.length);
  const bobWht = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085,8,6), toon(0xf4f4f4), ANGLERS.length);
  bobRed.frustumCulled = bobWht.frustumCulled = false;

  ANGLERS.forEach((a,i) => {
    const y = (a.y!==undefined) ? a.y : groundY(a.x, a.z);   // pier uses the plank-deck height, rocks uses the terrace tier
    const {group,parts} = makeChibi(a.x, a.z, Math.PI/2, nextPal());   // face east / the water
    group.position.y = y;
    parts.armR.rotation.x = -1.15; parts.armR.rotation.z = 0.1;        // rod arm up & out
    parts.armL.rotation.x = -0.75; parts.armL.rotation.z = -0.1;
    parts.body.rotation.x = 0.05;
    // rod: base near the hands, angled up & out over the water (east = +x)
    E.set(0,0,-0.85); Q.setFromEuler(E);              // tilt the y-cylinder forward
    M.compose(V.set(a.x+0.55, y+1.5, a.z), Q, S.set(1,1,1));
    rods.setMatrixAt(i,M);
    a._y = y;
  });
  rods.instanceMatrix.needsUpdate = true; scene.add(rods);
  scene.add(bobRed, bobWht);

  // ================================================================= //
  //  3) KITE FLYER (showpiece) at the south lawn
  // ================================================================= //
  const FLYER = {x:60, z:230};
  const kf = makeChibi(FLYER.x, FLYER.z, 1.35, nextPal());   // look toward the kite (E/NE, up)
  kf.parts.armR.rotation.x = -2.7;  kf.parts.armR.rotation.z = -0.15;   // right arm up on the line
  kf.parts.armL.rotation.x = -0.5;
  kf.parts.body.rotation.x = -0.18;                                     // lean back, watching aloft

  // hand anchor for the string (arm is static → compute once)
  kf.group.updateWorldMatrix(true, true);
  const HAND = new THREE.Vector3();
  kf.parts.handR.getWorldPosition(HAND);

  // the diamond kite (classic long-tailed kite shape)
  const KSCALE = 1.15;
  const kShape = new THREE.Shape();
  kShape.moveTo(0,0.95); kShape.lineTo(0.6,0.05); kShape.lineTo(0,-1.15); kShape.lineTo(-0.6,0.05); kShape.closePath();
  const kite = new THREE.Mesh(new THREE.ShapeGeometry(kShape),
    curveMat(new THREE.MeshToonMaterial({color:0xe8523f, side:THREE.DoubleSide})));
  kite.scale.setScalar(KSCALE); kite.frustumCulled = false; scene.add(kite);

  // the string — a 2-vertex Line, re-posed hand->kite each frame (curveMat so it bends with the world)
  const lineGeo = new THREE.BufferGeometry();
  const linePos = new Float32Array(6);
  linePos[0]=HAND.x; linePos[1]=HAND.y; linePos[2]=HAND.z;
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos,3));
  const kiteLine = new THREE.Line(lineGeo, curveMat(new THREE.LineBasicMaterial({color:0xf0ead8})));
  kiteLine.frustumCulled = false; scene.add(kiteLine);

  // tail ribbons — small quads streaming behind the kite along its path (delayed samples)
  const TAIL_N = 4, TAIL_GAP = 5, TRAILLEN = 40;
  const trail = new Float32Array(TRAILLEN*3);
  let trailHead = 0, trailFill = 0;
  const tail = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.34,0.15),
    bmat(0xf5c451,{side:THREE.DoubleSide}), TAIL_N);
  tail.frustumCulled = false; scene.add(tail);

  // ---- kite flight params (figure-8 in a vertical plane + gentle wind dips) ----
  const KC = {x:69, y:13.4, z:227};        // loop centre (E of + level with the flyer, aloft)
  const KA = 5.2, KB = 2.4;                // horizontal / vertical half-extents (y ~ 11..16)
  const KSPD = 0.85;                       // figure-8 angular speed

  // ================================================================= //
  //  5) SOUTH-STEPS SKYLINE HANGOUT — the south-facing rocks terraces
  //     (z~245-300) are THE spot to watch the downtown skyline. Everyone
  //     turns SOUTH (+z): two couples sitting with their legs over the step
  //     edge, a solo with a little radio, and one standing, pointing out the
  //     Hancock. Heights are snapped to each figure's step via groundY
  //     (coastQuery/tierAt), same as the sunbathers. Static poses -> raw
  //     createChibi (added after all others, so no palette shuffle above).
  // ================================================================= //
  {
    function sitter(x,z,ry){                       // legs over the step edge, facing south
      const y = groundY(x,z);
      const {group,parts} = makeChibi(x,z,ry,nextPal());
      poseSeated(group,parts,y);
    }
    function pointer(x,z,ry){                       // "there's the Hancock" — arm up at the skyline
      const y = groundY(x,z);
      const {group,parts} = makeChibi(x,z,ry,nextPal());
      group.position.y = y;
      parts.armR.rotation.x = -2.35; parts.armR.rotation.z = -0.18;   // arm up, pointing out at the skyline
      parts.armL.rotation.x = -0.12;
      parts.body.rotation.x = -0.06; parts.head.rotation.x = -0.18;    // chin up toward the Hancock
    }
    sitter(154.0,252,0.10);  sitter(155.5,252,-0.06);   // couple 1 (side by side)
    sitter(157.0,268,0.08);  sitter(158.5,268,-0.05);   // couple 2
    sitter(153.0,260,0.02);                              // solo — radio beside them
    pointer(156.0,274,-0.12);                            // the standee, pointing south
    // the solo's little radio on the step, speaker facing south
    const rx=154.4, rz=260, rgy=groundY(rx,rz);
    const radioBody = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.22,0.15), toon(0x2b2b32));
    radioBody.position.set(rx,rgy+0.11,rz); scene.add(radioBody);
    const radioFace = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.15,0.02), toon(0x50525c));
    radioFace.position.set(rx,rgy+0.11,rz+0.085); scene.add(radioFace);
    const radioAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.3,5), toon(0x9aa0a6));
    radioAnt.position.set(rx+0.16,rgy+0.34,rz); radioAnt.rotation.z=-0.3; scene.add(radioAnt);
  }

  // ================================================================= //
  //  6) DIVERSEY CORNER — step sitters wrapping the curved terraces +
  //     corner-lawn life (picnics, sunbathers, a reader) + a dog & owner.
  //     Placement rides coastQuery's signed-distance field: march each
  //     person onto a target tier and face the LOCAL seaward normal, so
  //     they wrap the bend whatever way the shore faces there (never a
  //     hardcoded south). Lawn spots stay >=8m from the sculpture pad
  //     (96,372) and >=6m from every trail sample. Heights snap via
  //     groundY (coastQuery/tierAt) so people sit correctly once the
  //     corner terraces are in. All static poses; the only added draw
  //     calls are instanced props + the dog.
  // ================================================================= //
  {
    const dc = m32(48823);                       // local jitter rng for the corner
    const qI = new THREE.Quaternion();           // identity (upright props)

    // seaward unit normal = normalized gradient of coastQuery.lat (points to
    // the water); atan2(n.x,n.z) is the yaw that faces the lake there.
    function seaN(x,z){
      const e=0.6;
      const a=coastQuery(x+e,z), b=coastQuery(x-e,z), c=coastQuery(x,z+e), d=coastQuery(x,z-e);
      let nx=(a?a.lat:0)-(b?b.lat:0), nz=(c?c.lat:0)-(d?d.lat:0);
      const L=Math.hypot(nx,nz)||1; return {x:nx/L, z:nz/L};
    }
    // march (x,z) onto the isocontour lat==target (Newton on the distance
    // field; |grad lat|~=1 so it settles in a couple of steps).
    function marchLat(x,z,target){
      for(let k=0;k<24;k++){ const q=coastQuery(x,z); if(!q)break;
        const d=target-q.lat; if(Math.abs(d)<0.05)break;
        const n=seaN(x,z); x+=n.x*d; z+=n.z*d; }
      return {x,z,n:seaN(x,z)};
    }

    const bookSpots=[];   // {x,y,z,ry,tilt} — collected across sitters, one InstancedMesh at the end

    // ---- (1) STEP SITTERS around the bend ----------------------------
    // lat 5.0 ~= one step down, 7.5 ~= two steps down (both tier tables).
    function stepSitter(seedX,seedZ,lat,tang,opt){
      opt=opt||{};
      let p=marchLat(seedX,seedZ,lat);
      const tx=-p.n.z, tz=p.n.x;                                    // shore tangent
      if(tang) p=marchLat(p.x+tx*tang, p.z+tz*tang, lat);          // side-by-side, re-snap to the same step
      const ry=Math.atan2(p.n.x,p.n.z), y=groundY(p.x,p.z);        // face seaward, sit ON the step
      const {group,parts}=makeChibi(p.x,p.z,ry,nextPal(),opt.scale||CITIZEN);
      poseSeated(group,parts,y);
      if(opt.book) bookSpots.push({x:p.x+p.n.x*0.34,y:y+0.6,z:p.z+p.n.z*0.34,ry,tilt:-0.6});
      if(opt.point){ parts.armR.rotation.x=-2.15; parts.armR.rotation.z=-0.15;   // pointing out at the boats
                     parts.armL.rotation.x=-0.2; parts.head.rotation.x=-0.12; }
      return p;
    }
    // seeds track the shore arc (east-facing z~330 -> south-facing z~394);
    // marchLat re-snaps each onto its step and seaN gives the local facing.
    stepSitter(148,330,5.0,-0.7); stepSitter(148,330,5.0,0.7);             // couple 1 (east-facing rocks)
    stepSitter(146,344,7.5,0,{book:true});                                 // solo reader (near the join)
    stepSitter(138,358,5.0,-0.7); stepSitter(138,358,5.0,0.7);            // couple 2 (bending round)
    stepSitter(120,372,7.5,0,{book:true});                                // solo reader (south-facing)
    stepSitter(104,384,5.0,0,{point:true,scale:CITIZEN*0.82});            // dangling-feet kid, pointing at boats
    stepSitter(86,394,5.0,0);                                             // lone sitter (near the pier)  -> 8 total

    // ---- (2) LAWN LIFE on the corner lawn ----------------------------
    const SCU={x:96,z:372};
    function lawnClear(x,z){
      if((x-SCU.x)**2+(z-SCU.z)**2 < 64) return false;                     // >=8m from the sculpture pad
      const q=coastQuery(x,z); if(q && q.lat > -1.5) return false;          // stay on the grass, off the steps/water
      for(const s of pathSamples){ const dx=x-s[0],dz=z-s[1]; if(dx*dx+dz*dz<36) return false; }   // >=6m off any trail
      return true;
    }
    function lawnSpot(bx,bz){
      for(let k=0;k<14;k++){ const j=k?3.2:0.5, x=bx+(dc()*2-1)*j, z=bz+(dc()*2-1)*j;
        if(lawnClear(x,z)) return {x,z}; }
      return {x:bx,z:bz};
    }

    const blkSpots=[], coolSpots=[], foodSpots2=[], towelSpots=[];

    // two picnics: a seated pair on opposite edges + a cooler + a little food
    const cornerPicnics=[ {x:74,z:346,ry:0.4,col:0xd98b3a}, {x:118,z:356,ry:-0.5,col:0x4f8c6b} ];
    for(const p of cornerPicnics){
      const s=lawnSpot(p.x,p.z); p.x=s.x; p.z=s.z;
      blkSpots.push({x:p.x,z:p.z,ry:p.ry,col:p.col});
      for(const [ox,oz] of [[-0.95,-0.5],[0.85,0.7]]){
        const sx=p.x+ox, sz=p.z+oz, ry=Math.atan2(p.x-sx,p.z-sz);
        const {group,parts}=makeChibi(sx,sz,ry,nextPal());
        poseSeated(group,parts,groundY(sx,sz));
      }
      coolSpots.push({x:p.x+1.2, z:p.z-0.85});
      foodSpots2.push({x:p.x+0.25,y:0.12,z:p.z+0.1,c:0xf2c45a});           // roll
      foodSpots2.push({x:p.x-0.2, y:0.11,z:p.z-0.25,c:0xd0463f});          // apple
    }

    // three flat sunbathers on towels + one seated reader on a towel
    const lounge=[
      {x:66, z:378, col:0x66c1e0, read:false},
      {x:122,z:344, col:0xf2c14e, read:false},
      {x:90, z:384, col:0xef8fb5, read:false},
      {x:80, z:362, col:0x8fd694, read:true },
    ];
    for(const su of lounge){
      const s=lawnSpot(su.x,su.z); su.x=s.x; su.z=s.z;
      const y=groundY(su.x,su.z);
      const ry = su.read ? (dc()*2-1)*Math.PI : 0;
      const {group,parts}=makeChibi(su.x,su.z,ry,nextPal());
      if(su.read){
        poseSeated(group,parts,y);
        bookSpots.push({x:su.x+Math.sin(ry)*0.34,y:y+0.6,z:su.z+Math.cos(ry)*0.34,ry,tilt:-0.6});
        towelSpots.push({x:su.x,z:su.z,ry,col:su.col});
      } else {
        poseLying(group,parts,y);                                          // lies head-north (like the rocks sunbathers)
        towelSpots.push({x:su.x,z:su.z,ry:0,col:su.col});
      }
    }

    // ---- instanced props (books/blankets/coolers/food/towels) --------
    function buildInst(spots, geo, mat, place){
      if(!spots.length) return;
      const inst=new THREE.InstancedMesh(geo, mat, spots.length);
      inst.frustumCulled=false;
      spots.forEach((sp,i)=>place(sp,i,inst));
      inst.instanceMatrix.needsUpdate=true;
      if(inst.instanceColor) inst.instanceColor.needsUpdate=true;
      scene.add(inst);
    }
    buildInst(blkSpots, new THREE.PlaneGeometry(2.6,2.1),
      curveMat(new THREE.MeshToonMaterial({side:THREE.DoubleSide})),
      (b,i,inst)=>{ E.set(0,b.ry,0);Q.setFromEuler(E);Q.multiply(flatX);
        M.compose(V.set(b.x,0.02,b.z),Q,S.set(1,1,1)); inst.setMatrixAt(i,M); inst.setColorAt(i,C.setHex(b.col)); });
    buildInst(towelSpots, new THREE.PlaneGeometry(0.95,2.1),
      curveMat(new THREE.MeshToonMaterial({side:THREE.DoubleSide})),
      (b,i,inst)=>{ E.set(0,b.ry,0);Q.setFromEuler(E);Q.multiply(flatX);
        M.compose(V.set(b.x,0.03,b.z),Q,S.set(1,1,1)); inst.setMatrixAt(i,M); inst.setColorAt(i,C.setHex(b.col)); });
    buildInst(coolSpots, new THREE.BoxGeometry(0.52,0.4,0.36), toon(0x3a6ea5),
      (c,i,inst)=>{ M.compose(V.set(c.x,0.2,c.z),qI,S.set(1,1,1)); inst.setMatrixAt(i,M); });
    buildInst(foodSpots2, new THREE.SphereGeometry(0.1,7,6), toon(0xffffff),
      (f,i,inst)=>{ M.compose(V.set(f.x,f.y,f.z),qI,S.set(1,1,1)); inst.setMatrixAt(i,M); inst.setColorAt(i,C.setHex(f.c)); });
    buildInst(bookSpots, new THREE.BoxGeometry(0.5,0.34,0.06),
      curveMat(new THREE.MeshToonMaterial({color:0xf4ede0,side:THREE.DoubleSide})),
      (b,i,inst)=>{ E.set(b.tilt,b.ry,0);Q.setFromEuler(E);
        M.compose(V.set(b.x,b.y,b.z),Q,S.set(1,1,1)); inst.setMatrixAt(i,M); });

    // ---- (3) DOG + OWNER on the seaward lawn edge --------------------
    {
      const os=lawnSpot(126,350), oy=groundY(os.x,os.z);
      const ory=Math.atan2(1,0.25);                                        // face the throw (seaward-ish, toward the dog)
      const {group,parts}=makeChibi(os.x,os.z,ory,nextPal());
      group.position.y=oy;
      parts.armR.rotation.x=-2.6; parts.armR.rotation.z=-0.25;             // wound up mid-throw
      parts.armL.rotation.x=-0.55; parts.body.rotation.x=-0.14;
      parts.legR.rotation.x=0.25;                                          // slight stride

      const dgx=os.x+4.6, dgz=os.z-1.0, dgy=groundY(dgx,dgz);
      const dog=new THREE.Group(), dm=toon(0xe6c98c);
      const body=new THREE.Mesh(new THREE.SphereGeometry(0.3,10,9),dm);body.scale.set(0.8,0.72,1.2);body.position.y=0.42;dog.add(body);
      const hd=new THREE.Mesh(new THREE.SphereGeometry(0.21,9,8),dm);hd.position.set(0,0.64,0.42);dog.add(hd);
      const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.06,0.4,6),dm);tail.geometry.translate(0,0.2,0);
      tail.position.set(0,0.5,-0.42);tail.rotation.x=-1.45;dog.add(tail);  // streamed out behind (running)
      // legs — front pair reaching forward, back pair driving back (mid-stride)
      const legs=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05,0.05,0.34,6),dm,4);
      [[0.13,0.34,-0.6],[-0.13,0.34,-0.6],[0.13,-0.34,0.6],[-0.13,-0.34,0.6]].forEach((L,i)=>{
        E.set(L[2],0,0);Q.setFromEuler(E); M.compose(V.set(L[0],0.2,L[1]),Q,S.set(1,1,1)); legs.setMatrixAt(i,M); });
      legs.instanceMatrix.needsUpdate=true; dog.add(legs);
      // ears
      const ears=new THREE.InstancedMesh(new THREE.ConeGeometry(0.08,0.2,6),toon(0xcbb08a),2);
      [-1,1].forEach((s,i)=>{ E.set(0.2,0,s*0.5);Q.setFromEuler(E); M.compose(V.set(s*0.13,0.78,0.4),Q,S.set(1,1,1)); ears.setMatrixAt(i,M); });
      ears.instanceMatrix.needsUpdate=true; dog.add(ears);
      dog.position.set(dgx,dgy,dgz); dog.rotation.set(0.1,ory,0);          // aimed after the throw, nose slightly down
      scene.add(dog);
    }
  }

  // ---- hoisted per-frame scratch (NO allocation in the loop) ----
  const _kv=new THREE.Vector3(), _tm=new THREE.Matrix4(), _ts=new THREE.Vector3(1,1,1);
  const _identQ=new THREE.Quaternion();

  registerUpdate((dt,t) => {
    // --- kite figure-8 + wind rhythm ---
    const th = t*KSPD;
    const gust = Math.sin(t*0.31);                     // slow wind; dips the kite on the low side
    const dip = Math.max(0,-gust)*1.6;
    _kv.set(
      KC.x + KA*Math.sin(th),
      KC.y + KB*Math.sin(2*th) - dip,
      KC.z + 2.2*Math.sin(th)*0.6
    );
    kite.position.copy(_kv);
    kite.lookAt(HAND);                                 // face the flyer, tip into the wind
    kite.rotation.z += Math.sin(t*1.7)*0.12;           // gentle flutter/roll

    // string: move the kite end (hand end is fixed)
    linePos[3]=_kv.x; linePos[4]=_kv.y; linePos[5]=_kv.z;
    lineGeo.attributes.position.needsUpdate = true;

    // push kite position into the trail ring buffer
    const h=trailHead*3; trail[h]=_kv.x; trail[h+1]=_kv.y; trail[h+2]=_kv.z;
    trailHead=(trailHead+1)%TRAILLEN; if(trailFill<TRAILLEN) trailFill++;

    // tail ribbons: delayed samples, billboarded to the camera, fluttering
    for(let i=0;i<TAIL_N;i++){
      const delay=(i+1)*TAIL_GAP;
      let idx;
      if(delay<trailFill) idx=((trailHead-1-delay)%TRAILLEN+TRAILLEN)%TRAILLEN;
      else idx=((trailHead-1)%TRAILLEN+TRAILLEN)%TRAILLEN;
      const p=idx*3;
      const fl=0.8+0.35*Math.sin(t*9+i*1.3);
      _tm.compose(_kv.set(trail[p], trail[p+1]-0.18*(i+1), trail[p+2]), camera.quaternion, _ts.set(fl,1,1));
      tail.setMatrixAt(i,_tm);
    }
    tail.instanceMatrix.needsUpdate = true;

    // --- two bobbers riding the lake ---
    for(let i=0;i<ANGLERS.length;i++){
      const a=ANGLERS[i], by=WATER_Y+0.1+Math.sin(t*1.6+a.ph)*0.06;
      _tm.compose(_kv.set(a.bx,by,a.bz), _identQ, _ts.set(1,1,1)); bobRed.setMatrixAt(i,_tm);
      _tm.compose(_kv.set(a.bx,by+0.09,a.bz), _identQ, _ts.set(1,1,1)); bobWht.setMatrixAt(i,_tm);
    }
    bobRed.instanceMatrix.needsUpdate = true;
    bobWht.instanceMatrix.needsUpdate = true;
  });
});
