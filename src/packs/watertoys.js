// =====================================================================
//  WATERTOYS — lazy summer floaters off the Belmont Rocks. Five people
//  reclined in bright inner tubes bobbing in the open lake just EAST of
//  the terraces (water starts ~x168), plus one stand-up paddleboarder
//  cruising slowly north-south parallel to the shore.
//
//   * 5 TUBERS  — a posed seated-reclined chibi (arms draped over the
//     sides) sunk into a torus tube floating at the waterline. Each drifts
//     a gentle ~0.3 m/s inside a ~6 m personal zone and rocks/bobs on the
//     swell, tube slowly spinning. Tube colours vary: flamingo pink, lime,
//     a red/white life-ring (canvas stripes), turquoise, orange. One wears
//     sunglasses; one nurses a little drink. Kept clamped to x 171..188 so
//     nobody ever drifts back onto the limestone wall.
//   * 1 PADDLEBOARDER — a standing chibi on a flat board with a paddle,
//     ping-ponging z 40..250 at x≈190 (0.8 m/s), side-to-side paddle stroke
//     + gentle board pitch/roll.
//
//  Chibis are individual by design (posed → raw createChibi in a rig, NOT
//  makeNPC, whose walk-swing would fight the poses). All the prop draw
//  calls are kept lean: solid tubes share ONE InstancedMesh (per-instance
//  colour), the striped tube is one textured torus. A SINGLE registerUpdate
//  drives everything from fully HOISTED scratch — zero per-frame allocation.
//  Layout is hardcoded / Math.random only, so the shared world rng (and
//  world determinism) is never touched. Water y = WATER_Y (−2.3).
//
//  Draw calls added: solid tubes(1) striped tube(1) sunglasses(1) drink(1)
//  board(1) paddle-shaft(1) paddle-blade(1) = 7.
// =====================================================================
import { onWorldReady, registerUpdate, createChibi } from '../framework.js';
import * as THREE from 'three';
import { scene, toon, bmat, WATER_Y, clamp } from '../core.js';

const CITIZEN = 0.74;   // canonical chibi scale (matches the mayor / citizens)

// ---- hardcoded palettes (deterministic — never the shared world rng) ----
const PAL = [
  {suit:0xd4694f,pants:0x3c4a63,skin:0xe8b48c,hair:0x3a2a1e},
  {suit:0x4f8c6b,pants:0x2f3540,skin:0x8a5a3c,hair:0x1d160f,hairStyle:'bun'},
  {suit:0xe0b24a,pants:0x6b4a2f,skin:0xf0c9a0,hair:0x55402a},
  {suit:0x6d7fbf,pants:0x33384a,skin:0x6e4632,hair:0x24160e,hairStyle:'afro'},
  {suit:0xc85c8e,pants:0x40354a,skin:0xdca07a,hair:0x2a1c12,hairStyle:'tall'},
];

// ---- tuber roster (home xz east of the wall, tube colour, extras) ----
const TUBERS = [
  {hx:176, hz:70,  col:0xff5fa2, striped:false, glasses:true,  drink:false}, // flamingo pink
  {hx:182, hz:112, col:0x9ede3a, striped:false, glasses:false, drink:true }, // lime
  {hx:174, hz:150, col:0xffffff, striped:true,  glasses:false, drink:false}, // red/white life-ring
  {hx:185, hz:194, col:0x2ec9c9, striped:false, glasses:false, drink:false}, // turquoise
  {hx:178, hz:232, col:0xff8c3b, striped:false, glasses:true,  drink:false}, // orange
];
const ZONE = 6, DRIFT_SPD = 0.3;                 // personal-zone radius / drift speed
const X_MIN = 171, X_MAX = 188, Z_MIN = 55, Z_MAX = 245;   // keep off the wall / in-band
const TUBE_R = 0.6, TUBE_T = 0.2;                // torus ring / tube radii
const TUBE_YOFF = 0.08;                          // tube centre above the waterline
const SINK = -0.55;                              // how far the chibi sits down into the tube

// ---- paddleboarder ----
const PB = {x:190, z:45, dir:1, spd:0.8, zMin:40, zMax:250};

// ---- hoisted scratch (no per-frame allocation) ----
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(),
      _s = new THREE.Vector3(1,1,1), _col = new THREE.Color();
const _flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0)); // torus -> lie flat

// red/white life-ring stripes (canvas wrapped around the ring)
function stripeTex(){
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 16;
  const g = cv.getContext('2d');
  const n = 8, w = 128/n;
  for(let i=0;i<n;i++){ g.fillStyle = i%2 ? '#f4f1e8' : '#e0342b'; g.fillRect(i*w,0,w+1,16); }
  const tx = new THREE.CanvasTexture(cv); tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 4;
  return tx;
}

// posed seated-reclined tuber: legs kicked forward over the front, arms
// draped out over the tube sides, a slight lean back.
function poseTuber(parts){
  parts.legL.rotation.x = -1.5;  parts.legR.rotation.x = -1.58;
  parts.legL.rotation.z = -0.12; parts.legR.rotation.z = 0.12;
  parts.armL.rotation.x = -0.2;  parts.armR.rotation.x = -0.2;
  parts.armL.rotation.z = 0.78;  parts.armR.rotation.z = -0.78;   // arms out over the sides
  parts.body.rotation.x = -0.12;
  parts.shadow.visible = false;                                    // floating — no ground shadow
}

onWorldReady(() => {
  // ---- solid tubes: ONE InstancedMesh (per-instance colour) ----
  const solidCount = TUBERS.filter(t=>!t.striped).length;
  const solidTubes = new THREE.InstancedMesh(
    new THREE.TorusGeometry(TUBE_R, TUBE_T, 8, 18), toon(0xffffff), solidCount);
  solidTubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  solidTubes.frustumCulled = false;
  scene.add(solidTubes);

  // ---- striped life-ring: one textured torus (tracked by position) ----
  const stripedTube = new THREE.Mesh(
    new THREE.TorusGeometry(TUBE_R, TUBE_T, 8, 18), bmat(0xffffff, {map:stripeTex()}));
  stripedTube.frustumCulled = false;
  scene.add(stripedTube);

  const tubers = [];
  let si = 0;
  TUBERS.forEach((cfg,i) => {
    const rig = new THREE.Group();
    rig.position.set(cfg.hx, WATER_Y, cfg.hz);
    rig.rotation.y = Math.random()*Math.PI*2;
    scene.add(rig);

    const {group:cg, parts} = createChibi(Object.assign({scale:CITIZEN}, PAL[i%PAL.length]));
    cg.rotation.x = -0.28;            // recline
    cg.position.y = SINK;             // sit down into the tube
    poseTuber(parts);
    rig.add(cg);

    // sunglasses (child of the head → follows for free)
    if(cfg.glasses){
      const sg = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.07,0.1), toon(0x101014));
      sg.position.set(0, 0.05, 0.52); parts.head.add(sg);
    }
    // little drink (child of a draped hand)
    if(cfg.drink){
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.055,0.16,10), toon(0xef5b7a));
      cup.position.set(0, 0.02, 0.02); parts.handL.add(cup);
    }

    const solidIdx = cfg.striped ? -1 : si++;
    if(!cfg.striped){ solidTubes.setColorAt(solidIdx, _col.setHex(cfg.col)); }

    tubers.push({
      rig, x:cfg.hx, z:cfg.hz, hx:cfg.hx, hz:cfg.hz,
      ph:Math.random()*6.283, spin:(Math.random()*2-1)*0.06,
      face:rig.rotation.y, solidIdx, striped:cfg.striped,
      hasTgt:false, tgtX:cfg.hx, tgtZ:cfg.hz, waitT:Math.random()*3,
    });
  });
  if(solidTubes.instanceColor) solidTubes.instanceColor.needsUpdate = true;

  // ================================================================= //
  //  PADDLEBOARDER
  // ================================================================= //
  const pbRig = new THREE.Group();
  pbRig.position.set(PB.x, WATER_Y, PB.z);
  scene.add(pbRig);

  const board = new THREE.Mesh(new THREE.BoxGeometry(0.62,0.12,2.5), toon(0xf2e3b0));
  board.position.y = 0.1; pbRig.add(board);

  const {group:pcg, parts:pparts} = createChibi(Object.assign({scale:CITIZEN}, {suit:0x2f9bd0,pants:0x243244,skin:0xdca878,hair:0x241a12}));
  pcg.position.y = 0.16;                    // feet on the board top
  pparts.shadow.visible = false;
  pparts.legL.rotation.x = 0.12; pparts.legR.rotation.x = -0.1;   // slight athletic stance
  pbRig.add(pcg);

  // paddle: shaft + blade, pivoting near the hands (top of the group)
  const paddle = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,1.9,6), toon(0xcdb48a));
  shaft.position.y = -0.9; paddle.add(shaft);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.02,0.42), toon(0xe8ddc2));
  blade.position.y = -1.82; paddle.add(blade);
  paddle.position.set(0.12, 1.25, 0.28);    // in front, chest height
  pbRig.add(paddle);

  // ================================================================= //
  //  PER-FRAME
  // ================================================================= //
  registerUpdate((dt, t) => {
    // ---- tubers ----
    for(let i=0;i<tubers.length;i++){
      const tu = tubers[i];
      // gentle drift inside the personal zone
      if(!tu.hasTgt){
        tu.waitT -= dt;
        if(tu.waitT<=0){
          const a = Math.random()*6.283, r = Math.random()*ZONE;
          tu.tgtX = clamp(tu.hx + Math.cos(a)*r, X_MIN, X_MAX);
          tu.tgtZ = clamp(tu.hz + Math.sin(a)*r, Z_MIN, Z_MAX);
          tu.hasTgt = true;
        }
      } else {
        const dx = tu.tgtX-tu.x, dz = tu.tgtZ-tu.z, d = Math.hypot(dx,dz);
        if(d<0.1){ tu.hasTgt = false; tu.waitT = 3+Math.random()*4; }
        else { const step = Math.min(d, DRIFT_SPD*dt); tu.x += dx/d*step; tu.z += dz/d*step; }
      }
      // bob + rock + slow spin
      const bob = Math.sin(t*0.9 + tu.ph)*0.05;
      tu.face += tu.spin*dt;
      tu.rig.position.set(tu.x, WATER_Y + bob, tu.z);
      tu.rig.rotation.set(Math.sin(t*0.8+tu.ph)*0.03, tu.face, Math.sin(t*0.7+tu.ph*1.3)*0.05);
      // tube follows (striped = its own mesh; solids = instanced)
      const ty = WATER_Y + bob + TUBE_YOFF;
      if(tu.striped){
        stripedTube.position.set(tu.x, ty, tu.z);
        stripedTube.rotation.set(Math.PI/2, 0, 0);
      } else {
        _m.compose(_v.set(tu.x, ty, tu.z), _flat, _s.set(1,1,1));
        solidTubes.setMatrixAt(tu.solidIdx, _m);
      }
    }
    solidTubes.instanceMatrix.needsUpdate = true;

    // ---- paddleboarder ----
    PB.z += PB.dir*PB.spd*dt;
    if(PB.z>PB.zMax){ PB.z = PB.zMax; PB.dir = -1; }
    else if(PB.z<PB.zMin){ PB.z = PB.zMin; PB.dir = 1; }
    const face = PB.dir>0 ? 0 : Math.PI;
    const bob = Math.sin(t*1.1)*0.04;
    pbRig.position.set(PB.x, WATER_Y + bob, PB.z);
    pbRig.rotation.set(Math.sin(t*0.9)*0.03, face, Math.sin(t*0.7)*0.03);
    // side-to-side paddle stroke + arms + slight torso lean
    const stroke = Math.sin(t*1.6);
    paddle.rotation.z = stroke*0.42;
    paddle.rotation.x = 0.22 + Math.abs(stroke)*0.18;
    pparts.armR.rotation.x = -1.15 + stroke*0.25;
    pparts.armL.rotation.x = -1.05 - stroke*0.25;
    pparts.armR.rotation.z = -0.2; pparts.armL.rotation.z = 0.2;
    pparts.body.rotation.z = stroke*0.06;
  });
});
