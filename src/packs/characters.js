// =====================================================================
//  CHARACTERS — a fun cast of Chicago lakefront regulars. Each is a
//  makeNPC chibi (so they get idle breathing, bump reactions, speech
//  bubbles + distance culling) with CUSTOM personal lines, plus a simple
//  hand-held prop and, where it adds life, a per-frame re-posed animation.
//
//    * MALÖRT GUY   (156,90, on the rocks) — holds a little amber bottle and
//      now SERVES: press E / ✋ for a straight Malört shot (the swig routine
//      shared with the Handshake regular). A Jeppson's bottle + a case of Old
//      Style sit on the step beside him (task 031 / issue 013).
//    * BIRDER       (92,−349, sanctuary gate) — binoculars up, slowly
//      scanning the treeline for a scarlet tanager.
//    * WEDDING PARTY (88,116, AIDS Garden) — bride (white) + groom (tux)
//      facing each other, a photographer crouched ~4 m away with a camera.
//    * SAX BUSKER   (18,108, Belmont underpass, moved to z≈105) — smoky sax; every
//      35–55 s (IF audio is running) a short quiet bluesy pentatonic riff
//      (triangle+square, lowpass, sfxBus, actx-guarded); sways while playing.
//    * LIFEGUARD    (108,−341, dog beach) — red suit on a tall wooden chair,
//      megaphone in hand.
//
//  makeNPC re-zeroes arm/leg rotations every idle frame, so any held-prop
//  or crouch pose is re-applied AFTER the framework's NPC pass — this pack's
//  single registerUpdate runs last (the npcs.js softball pattern). Props are
//  parented into the chibi (hand / head) so they follow for free. All audio
//  is synthesized + guarded on actx; all jitter is Math.random, so the
//  shared world rng / determinism is never touched.
//
//  DEV: ?saxtest=1 forces the first riff ~1.5 s after load (then every ~3 s)
//  so the busker audio path can be exercised in a short screenshot.
//
//  Draw calls added: bottle(1) binoculars(1) veil(1) camera(1) sax(8: body×2,
//  U-bow, bell, neck, mouthpiece, 3 keys) sax-case(1) chair-legs(1)
//  chair-seat(1) chair-back(1) megaphone(1). Malört-guy stash (task 031):
//  case(1) 2 cans(2) bottle body/neck/cap/label(4) + the guy's live-eyes(1) —
//  all regular meshes, frustum-culled, so zero GLOBAL cost (only in his view).
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, makeNPC, getAudioCtx, addInteraction } from '../framework.js';
import { scene, toon, bmat, clamp } from '../core.js';
import { coastQuery, tierAt, beachH } from '../coast.js';
import { pourMalort, oldStyleTex } from './malort.js';   // shared Malört swig + Old Style label (task 031)

const SAX_TEST = /[?&]saxtest=1/.test(location.search);

// task 078 (favors-pilot): a tiny hook object the favor pack fills in. This file
// only PUBLISHES the Malört guy + his interaction/swig state and calls the hooks
// if present; all favor logic (offer/turn-in/duet) lives in favors-pilot.js so
// this cast file stays "minimal hooks only".
export const malortHooks = {};

// beach cove / rock terrace / park height (so figures rest ON the ground)
function groundY(x,z){
  const b = beachH(x,z); if(b!==null) return b;
  const q = coastQuery(x,z);
  if(q && q.lat>0.15){ const t = tierAt(q.lat, q.z); if(t) return t.h; }
  return 0;
}

// ---- hoisted scratch (no per-frame allocation) ----
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(),
      _s = new THREE.Vector3(1,1,1), _e = new THREE.Euler();

// ---- the Malört guy's stash (task 031): a Jeppson's bottle + a case of Old
// Style on the terrace step beside him — the real Chicago-handshake pairing,
// and a wink toward the Handshake regular down the rocks. All fixed-coord
// (no rng) and surface-queried via groundY (the rocks are analytic — coastQuery
// /tierAt) so nothing floats or clips the revetment. ~7 regular meshes, all
// frustum-culled → zero global draw cost; only counted when the tableau's on
// screen. Built inside onWorldReady (called below), never at import time.
function oldStyleCaseTex(){                       // 24-pack case livery — echoes oldStyleTex's cream/blue/red palette
  const cv=document.createElement('canvas');cv.width=128;cv.height=96;const g=cv.getContext('2d');
  g.fillStyle='#e7dcc4';g.fillRect(0,0,128,96);                          // kraft-cream cardboard
  g.fillStyle='#1c4fa0';g.fillRect(0,0,128,14);g.fillRect(0,82,128,14);  // blue top/bottom bands
  g.fillStyle='#b8252b';g.beginPath();g.ellipse(64,46,40,26,0,0,7);g.fill();   // red disc
  g.fillStyle='#e7dcc4';g.beginPath();g.ellipse(64,46,34,20,0,0,7);g.fill();
  g.fillStyle='#1c4fa0';g.textAlign='center';g.textBaseline='middle';
  g.font='800 17px "Trebuchet MS",sans-serif';g.fillText('OLD STYLE',64,42);
  g.fillStyle='#b8252b';g.font='800 12px "Trebuchet MS",sans-serif';g.fillText('· 24 PACK ·',64,60);
  const tx=new THREE.CanvasTexture(cv);tx.anisotropy=4;return tx;
}
function buildMalortStash(gx,gz,groundY){
  // set the stash just SOUTH (+z, toward the Handshake regular down the rocks) of
  // the guy, on whatever tier the spot lands on (groundY surface-query).
  const cx=gx+0.7, cz=gz+1.4, cH=0.3, cBase=groundY(cx,cz);
  const caseBox=new THREE.Mesh(new THREE.BoxGeometry(0.52,cH,0.36), bmat(0xffffff,{map:oldStyleCaseTex()}));
  caseBox.position.set(cx, cBase+cH/2, cz); caseBox.rotation.y=-0.5; scene.add(caseBox);
  // a loose can or two on top (reads generous) — one upright, one rolled on its side
  const canGeo=new THREE.CylinderGeometry(0.055,0.055,0.16,12), canMat=bmat(0xffffff,{map:oldStyleTex()});
  const canUp=new THREE.Mesh(canGeo,canMat); canUp.position.set(cx-0.08, cBase+cH+0.08, cz+0.04); scene.add(canUp);
  const canLie=new THREE.Mesh(canGeo,canMat); canLie.rotation.x=Math.PI/2; canLie.position.set(cx+0.12, cBase+cH+0.055, cz-0.02); scene.add(canLie);
  // Jeppson's Malört bottle — tall amber, cream/yellow label band, gold cap.
  const bx=gx+0.5, bz=gz+0.9, bBase=groundY(bx,bz);
  const amber=toon(0x6f4512), gold=toon(0xd8b13a), cream=toon(0xe9d79a);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.088,0.26,12), amber); body.position.set(bx,bBase+0.13,bz); scene.add(body);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.05,0.11,10), amber);  neck.position.set(bx,bBase+0.31,bz); scene.add(neck);
  const cap =new THREE.Mesh(new THREE.CylinderGeometry(0.034,0.034,0.045,10), gold); cap.position.set(bx,bBase+0.39,bz); scene.add(cap);
  const label=new THREE.Mesh(new THREE.CylinderGeometry(0.091,0.091,0.11,12), cream); label.position.set(bx,bBase+0.12,bz); scene.add(label);
}

onWorldReady(() => {
  const rePose = [];   // {fn(dt,t)} re-applied each frame after the NPC pass

  // ================================================================= //
  //  MALÖRT GUY — on the Belmont Rocks
  // ================================================================= //
  {
    const X=156, Z=90, y=groundY(X,Z);
    // face:true keeps live eyes so the swig's setFace('surprised'/'happy') reads
    // (+1 draw for this one rig; createChibi consumes no rng — determinism intact).
    const guy = makeNPC({x:X, z:Z, ry:-1.9, palette:{suit:0x8a4a3a,pants:0x2f3540,skin:0xe0a878,hair:0x2a1c12,face:true},
      name:'malort', lines:["you ever had Malört?","it's a Chicago thing, ya know","builds character","tastes like a burnt band-aid — want some?"]});
    guy.group.position.y = y;
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.058,0.28,9), toon(0x9a7b2e));
    bottle.position.set(0, 0.06, 0.04); guy.parts.handR.add(bottle);
    buildMalortStash(X, Z, groundY);                 // his bottle + Old Style case on the step

    // He's been OFFERING since Round 5 with no way to say yes (issue 013). Now
    // you can: straight to the shot, no ceremony (that's the Handshake regular's
    // bit down the rocks). Shares the swig routine; his own short cooldown/label.
    const swig = {busy:false, cool:0};
    const guyInter = addInteraction({x:X, z:Z, r:2.4, label:'burnt band-aid?', onUse:(player)=>{
      if(malortHooks.intercept && malortHooks.intercept(player)) return;   // task 078: favor turn-in / duet takes the press
      if(swig.busy||swig.cool>0) return; swig.busy=true;
      guy.say('attaboy — down the hatch', 2);
      pourMalort({npc:guy, react:'builds character, told ya',
        toastMain:'BURNT BAND-AID', toastSub:"Jeppson's Malört",
        onDone:()=>{ swig.busy=false; swig.cool=28; guyInter.setLabel('...one more?');
          if(malortHooks.onSwigDone) malortHooks.onSwigDone(); }});   // task 078: the first shared shot earns the errand
    }});
    // task 078: publish the guy / his interaction / swig state for favors-pilot.js
    malortHooks.guy = guy; malortHooks.inter = guyInter; malortHooks.swig = swig;

    rePose.push((dt, t) => {
      guy.parts.armR.rotation.x = -1.05; guy.parts.armR.rotation.z = -0.12;
      guy.parts.armL.rotation.x = -0.25;
      if(swig.cool>0){ swig.cool-=dt; if(swig.cool<=0) guyInter.setLabel('burnt band-aid?'); }
      if(malortHooks.rePose) malortHooks.rePose(dt, t);   // task 078: favor pack's per-frame hook (duet arm + label)
    });
  }

  // ================================================================= //
  //  BIRDER — the Bill Jarvis sanctuary gate
  // ================================================================= //
  {
    const X=92, Z=-349, base=-2.1;
    const birder = makeNPC({x:X, z:Z, ry:base, palette:{suit:0x4f6b4a,pants:0x3a4030,skin:0xcaa080,hair:0x4a3a24,hairStyle:'bun'},
      name:'birder', lines:["shhh — scarlet tanager","that's a warbler, not a sparrow","the plovers are BACK","ope — don't spook 'em"]});
    // binoculars: two short barrels (one InstancedMesh), glued to the face
    const binoc = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06,0.06,0.2,8), toon(0x1a1a20), 2);
    _e.set(Math.PI/2,0,0); _q.setFromEuler(_e);
    [-0.1,0.1].forEach((dx,i)=>{ _m.compose(_v.set(dx,0,0), _q, _s.set(1,1,1)); binoc.setMatrixAt(i,_m); });
    binoc.instanceMatrix.needsUpdate = true;
    binoc.position.set(0, 0.02, 0.5); birder.parts.head.add(binoc);
    rePose.push((dt,t) => {
      birder.group.rotation.y = base + Math.sin(t*0.3)*0.5;    // slow scan
      birder.parts.armL.rotation.x = -2.3; birder.parts.armR.rotation.x = -2.3;
      birder.parts.armL.rotation.z = 0.15; birder.parts.armR.rotation.z = -0.15;
    });
  }

  // ================================================================= //
  //  WEDDING PARTY — AIDS Garden lawn
  // ================================================================= //
  {
    const CX=88, CZ=116;
    // bride (white) + groom (tux) facing each other along x
    const bride = makeNPC({x:CX+0.6, z:CZ, ry:-Math.PI/2, palette:{suit:0xffffff,pants:0xf0f0f0,skin:0xe8c0a0,hair:0x3a2a1a,hairStyle:'bun'},
      name:'bride', lines:["married on the lakefront!","pinch me","best day of my life","ope — mind the veil"]});
    const groom = makeNPC({x:CX-0.6, z:CZ, ry:Math.PI/2, palette:{suit:0x1a1a22,pants:0x1a1a22,skin:0x8a5a3c,hair:0x161009},
      name:'groom', lines:["we met on the 36 bus","can you believe it","she said yes","Portillo's after, you betcha"]});
    // veil hint behind the bride's head
    const veil = new THREE.Mesh(new THREE.ConeGeometry(0.34,0.7,10,1,true),
      bmat(0xffffff,{side:THREE.DoubleSide, transparent:true, opacity:0.55, depthWrite:false}));
    veil.position.set(0,-0.05,-0.28); bride.parts.head.add(veil);
    // photographer crouched ~4 m away, camera up
    const PX=91, PZ=113, pry=Math.atan2(CX-PX, CZ-PZ);
    const photog = makeNPC({x:PX, z:PZ, ry:pry, palette:{suit:0x3a3f4a,pants:0x2a2e36,skin:0xd0a078,hair:0x241a12},
      name:'photog', lines:["say cheese!","hold it right there","big smiles now — ope, the wind","one more, then we hit Portillo's"]});
    photog.group.position.y = -0.35;                            // crouch drop
    const camera = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.16,0.16), toon(0x14141a));
    camera.position.set(0,0.02,0.42); photog.parts.head.add(camera);
    rePose.push(() => {
      photog.parts.legL.rotation.x = -1.25; photog.parts.legR.rotation.x = -1.25;   // crouch
      photog.parts.armL.rotation.x = -1.9;  photog.parts.armR.rotation.x = -1.9;
      photog.parts.armL.rotation.z = 0.2;   photog.parts.armR.rotation.z = -0.2;
      photog.parts.body.rotation.x = 0.15;
    });
  }

  // ================================================================= //
  //  SAX BUSKER — the Belmont underpass
  // ================================================================= //
  {
    const X=18, Z=108, y=groundY(X,Z);
    const sax = makeNPC({x:X, z:Z, ry:1.2, palette:{suit:0x30343e,pants:0x22252c,skin:0x6e4632,hair:0x140f0a},
      name:'busker', lines:["requests? I only know Coltrane","the acoustics under here, man","hot enough for ya?"]});
    sax.group.position.y = y;
    // ---- a real alto-sax silhouette (brass gold), held in playing pose ----
    // Built in a local frame (X=forward/bell side, Y=up the body, Z=side) then
    // yawed 90° so the bell faces forward and the mouthpiece rides up to the
    // chin. Parented to the body group so it sways with the busker.
    const brass = toon(0xc9a227), brassLo = toon(0xb8901f), mpDark = toon(0x1a1611), pearl = toon(0xeadfbe);
    const saxGrp = new THREE.Group();
    // body tube — two stacked cylinders, slightly conical (wider toward the bow)
    const bodyLo = new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.072,0.20,10), brass);
    bodyLo.position.set(-0.075,0.13,0); saxGrp.add(bodyLo);
    const bodyHi = new THREE.Mesh(new THREE.CylinderGeometry(0.046,0.058,0.18,10), brass);
    bodyHi.position.set(-0.075,0.31,0); saxGrp.add(bodyHi);
    // U-bow — half-torus joining the body bottom to the bell base
    const uBow = new THREE.Mesh(new THREE.TorusGeometry(0.075,0.05,8,14,Math.PI), brass);
    uBow.rotation.z = Math.PI; uBow.position.set(0,0.03,0); saxGrp.add(uBow);
    // flared BELL — truncated cone (wide opening up), angled up-and-forward
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.135,0.055,0.30,12,1,true), brassLo);
    bell.position.set(0.12,0.19,0); bell.rotation.z = -0.4; saxGrp.add(bell);
    // curved neck — quarter torus arc off the body top, opening back to the mouth
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.075,0.026,6,12,Math.PI*0.5), brass);
    neck.rotation.z = Math.PI*0.5; neck.position.set(0.0,0.40,0); saxGrp.add(neck);
    // dark mouthpiece at the neck tip
    const mp = new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.04,0.10,8), mpDark);
    mp.position.set(-0.03,0.50,0); mp.rotation.z = 0.7; saxGrp.add(mp);
    // three tiny key pearls down the front of the body
    for(let i=0;i<3;i++){
      const key = new THREE.Mesh(new THREE.CylinderGeometry(0.017,0.017,0.02,6), pearl);
      key.rotation.x = Math.PI/2; key.position.set(-0.045,0.18+i*0.09,0.065); saxGrp.add(key);
    }
    saxGrp.rotation.y = -Math.PI/2;              // local +X (bell side) -> +Z forward: bell out front, mouthpiece back at the mouth (issue 006: +PI/2 aimed the bell BACKWARD)
    saxGrp.rotation.x = 0.16;                     // slight lean into the horn
    saxGrp.scale.setScalar(1.12);
    saxGrp.position.set(0.05,1.22,0.6);           // out front, mouthpiece up toward the chin
    sax.group.add(saxGrp);
    // open case at the feet
    const caseBox = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.12,0.42), toon(0x3a2a1c));
    caseBox.position.set(X+0.6, y+0.06, Z+0.5); scene.add(caseBox);

    // ---- audio: quiet smoky bluesy riff ----
    const RIFFS = [
      [69,67,64,62,60], [60,63,64,67,69,67], [64,62,60,57,60], [67,69,72,71,67,64],
    ];
    function saxNote(actx,sfxBus,mf,midi,t0,dur){
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.05,t0+0.05);
      g.gain.setValueAtTime(0.045,t0+dur*0.6); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1300; lp.Q.value=2;
      lp.connect(g); g.connect(sfxBus);
      const f = mf(midi);
      const o1 = actx.createOscillator(); o1.type='triangle'; o1.frequency.value=f;
      const o2 = actx.createOscillator(); o2.type='square'; o2.frequency.value=f; o2.detune.value=-6;
      const o2g = actx.createGain(); o2g.gain.value=0.35;         // reedy square, quieter
      o1.connect(lp); o2.connect(o2g); o2g.connect(lp);
      o1.start(t0); o2.start(t0); o1.stop(t0+dur+0.05); o2.stop(t0+dur+0.05);
    }
    function playRiff(){
      const ac = getAudioCtx(); if(!ac.actx) return;              // silent until audio starts
      const {actx, sfxBus, mf} = ac;
      const riff = RIFFS[(Math.random()*RIFFS.length)|0];
      let t0 = actx.currentTime + 0.05;
      for(let i=0;i<riff.length;i++){
        const dur = 0.3 + Math.random()*0.15;
        saxNote(actx, sfxBus, mf, riff[i], t0, dur);
        t0 += dur*(0.8 + Math.random()*0.3);                       // slight swing
      }
    }
    const S = {riffT: SAX_TEST ? 1.5 : 35+Math.random()*20, playT:0};
    rePose.push((dt,t) => {
      S.riffT -= dt;
      if(S.riffT<=0){ playRiff(); S.playT = 2.2; S.riffT = SAX_TEST ? 3 : 35+Math.random()*20; }
      if(S.playT>0) S.playT -= dt;
      const sway = S.playT>0 ? Math.sin(t*3.2)*0.12 : Math.sin(t*0.7)*0.02;
      sax.group.rotation.z = sway;
      sax.parts.armL.rotation.x = -1.2; sax.parts.armR.rotation.x = -1.35;
      sax.parts.armL.rotation.z = 0.2;  sax.parts.armR.rotation.z = -0.15;
    });
  }

  // ================================================================= //
  //  LIFEGUARD — the dog beach, up on a tall wooden chair
  // ================================================================= //
  {
    const X=108, Z=-341, CB=groundY(X,Z), SEAT=1.4;
    const guard = makeNPC({x:X, z:Z, ry:Math.PI, palette:{suit:0xd83a2f,pants:0xd83a2f,skin:0xe0a878,hair:0x241a12},
      name:'lifeguard', lines:["no lifeguard on duty after dusk!","that dog's a better swimmer than most","lake's still cold, even in July"]});
    guard.group.position.y = CB + SEAT - 0.53;                   // hips resting on the seat
    // chair: 4 legs (instanced) + seat + back
    const wood = toon(0xb07a42);
    const legs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05,0.05,SEAT,6), wood, 4);
    [[-0.35,-0.3],[0.35,-0.3],[-0.35,0.35],[0.35,0.35]].forEach(([dx,dz],i)=>{
      _m.compose(_v.set(X+dx, CB+SEAT/2, Z+dz), _q.identity(), _s.set(1,1,1)); legs.setMatrixAt(i,_m);
    });
    legs.instanceMatrix.needsUpdate = true; scene.add(legs);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.1,0.85), wood);
    seat.position.set(X, CB+SEAT, Z); scene.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.8,0.1), wood);
    back.position.set(X, CB+SEAT+0.4, Z-0.37); scene.add(back);
    // megaphone in hand
    const mega = new THREE.Mesh(new THREE.ConeGeometry(0.11,0.22,10,1,true), toon(0xe8e8ec));
    mega.position.set(0,0.04,0.14); mega.rotation.x = 1.35; guard.parts.handR.add(mega);
    rePose.push(() => {
      guard.parts.legL.rotation.x = -1.3;  guard.parts.legR.rotation.x = -1.3;   // sit
      guard.parts.armR.rotation.x = -1.5;  guard.parts.armR.rotation.z = -0.1;   // megaphone up
      guard.parts.armL.rotation.x = -0.3;
    });
  }

  // ---- one shared per-frame pass (runs AFTER the framework NPC update) ----
  registerUpdate((dt, t) => { for(let i=0;i<rePose.length;i++) rePose[i](dt, t); });
});
