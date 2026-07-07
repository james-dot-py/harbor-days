// =====================================================================
//  BADMINTON — ongoing lawn rallies the mayor can JOIN. (harbor-new.md job 1)
//
//  Three courts sit on audited-empty inland lawns (y=0). Each has a slim
//  white net (2 posts ~1.55 m + a light sagging strip, lower/lighter than
//  the volleyball net), a faint painted court outline, and TWO posed chibi
//  players (raw createChibi, CITIZEN scale — makeNPC's walk-swing would
//  fight the poses) who SHUFFLE side-to-side and SWING when the shuttle
//  reaches them. A shuttlecock (cork ball + feather cone) arcs back and
//  forth with real hang-time: a parabola whose HORIZONTAL progress slows
//  near the apex (hEase) so the birdie floats like a real one.
//
//   * C1 (105,255) — THE JOINABLE COURT (long axis N–S). Ambient NPC rally
//     until the mayor joins from the east sideline; then it becomes a TIMED
//     game: the north NPC feeds the birdie to the mayor and an E press (or
//     hand button) inside a ~0.45 s window on the descending arc returns it.
//   * C2 (55,60) / C3 (38,-290) — NPC-only rallies, continuous, with an
//     occasional deliberate miss (every 8–14 crossings) that drops the
//     birdie, pops an "ope" bubble, and restarts after 1.5 s.
//
//  Only-my-file rules: no shared edits (its import line is already in
//  packs/index.js). All setup in onWorldReady; all randomness is
//  Math.random (never the shared world rng); every pock/ope is synthesized
//  and guards getAudioCtx().actx; a SINGLE registerUpdate drives everything
//  from fully HOISTED scratch (zero per-frame allocation).
//
//  Added draw calls (chibis exempt by design — 6 posed chibis match the
//  parklife budget pattern): posts(1, instanced ×6) net(1, instanced ×3)
//  court-lines(1, instanced ×3) shuttles(6 = 3×[cork+feathers])
//  racquets(12 = 6 NPCs × [head+handle]) + mayor racquet(2, only while
//  joined) = ~23.
// =====================================================================
import { onWorldReady, registerUpdate, addInteraction, holdItem, toast,
         journalSection, state, getAudioCtx, registerBumpable, createChibi } from '../framework.js';
import * as THREE from 'three';
import { scene, camera, toon, bmat, clamp, lerp, lerpAngle } from '../core.js';
import { mparts } from '../character.js';

const CITIZEN = 0.74;                 // canonical chibi scale (matches the mayor)
const HW = 2.2;                       // net half-width (spans x: cx±HW)
const HALF_LEN = 4.5;                 // baseline distance from the net (z: cz±HALF_LEN)
const NET_TOP = 1.55;                 // badminton net height at the posts
const HIT_TALL = 1.5;                 // birdie contact height on a hit
const HIT_WINDOW = 0.45;              // seconds of the descending arc that count as a good return

// court config — all inland lawns at y=0, orchestrator-audited clear of paths/fences by >6 m
const COURTS = [
  { cx:105, cz:255,  joinable:true  },   // C1 — joinable, long axis N–S
  { cx:55,  cz:60,   joinable:false },   // C2 — NPC rally
  { cx:38,  cz:-290, joinable:false },   // C3 — NPC rally
];

// ---- "ope" bump-line pools (Math.random only — never the shared world rng) ----
const LINES = ["ope — birdie incoming","good rally, eh?","windy for badminton, ope",
               "nice and floaty","ope, my bad","best shuttle in the bag"];
const OPE   = ["ope!","ope — got away from me","aw, jeez","windy today, eh"];

// ---- hardcoded palettes (deterministic — never the shared world rng) ----
const PAL = [
  {suit:0x4f8c6b,pants:0x2f3540,skin:0xe8b48c,hair:0x2a1c12},
  {suit:0xd4694f,pants:0x33384a,skin:0x8a5a3c,hair:0x1d160f,hairStyle:'bun'},
  {suit:0x6d7fbf,pants:0x2b3340,skin:0xdca07a,hair:0x241610},
  {suit:0xe0b24a,pants:0x40354a,skin:0x6e4632,hair:0x120d08,hairStyle:'afro'},
  {suit:0x3f9bb0,pants:0x3a3550,skin:0xf0c49c,hair:0x4a3520},
  {suit:0xc85c8e,pants:0x2c3b45,skin:0xa8724a,hair:0x241a12,hairStyle:'tall'},
];

// ================================ audio ================================
// soft, very quiet "pock" on every strike. Distance-attenuated (louder when
// near) and camera-relative panned when StereoPanner exists — positional.
// ALWAYS guards actx (null until the player clicks start).
const _pockV = new THREE.Vector3();
function sPock(wx, wy, wz, player){
  const ac = getAudioCtx(); if(!ac.actx) return;
  const { actx, sfxBus, noiseBuf } = ac, t = actx.currentTime;
  const dx = wx-player.x, dz = wz-player.z, dist = Math.hypot(dx,dz);
  const vol = clamp(1 - dist/30, 0, 1); if(vol < 0.02) return;   // inaudible past ~30 m
  // route through a stereo panner (camera view-space x) if available
  let dest = sfxBus;
  if(actx.createStereoPanner){
    _pockV.set(wx,wy,wz).applyMatrix4(camera.matrixWorldInverse);
    const pan = clamp(_pockV.x / (Math.abs(_pockV.z)+2), -0.85, 0.85);
    dest = actx.createStereoPanner(); dest.pan.value = pan; dest.connect(sfxBus);
  }
  // short "pock" — triangle blip dropping in pitch
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(760, t); o.frequency.exponentialRampToValueAtTime(320, t+0.05);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.055*vol, t+0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t+0.09);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.11);
  // tiny high tick for the "k"
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 1.5;
  const ng = actx.createGain(); ng.gain.setValueAtTime(0.03*vol, t); ng.gain.exponentialRampToValueAtTime(0.0001, t+0.05);
  s.connect(f); f.connect(ng); ng.connect(dest); s.start(t); s.stop(t+0.06);
}

// ============================ canvas textures ==========================
function netTex(){                                   // faint grid + white top tape (lighter than volleyball)
  const cv = document.createElement('canvas'); cv.width = 160; cv.height = 44;
  const g = cv.getContext('2d'); g.clearRect(0,0,160,44);
  g.strokeStyle = 'rgba(245,245,238,0.5)'; g.lineWidth = 1;
  for(let x=0;x<=160;x+=7){ g.beginPath(); g.moveTo(x+0.5,6); g.lineTo(x+0.5,44); g.stroke(); }
  for(let y=8;y<=44;y+=7){ g.beginPath(); g.moveTo(0,y+0.5); g.lineTo(160,y+0.5); g.stroke(); }
  g.fillStyle = '#f6f2e6'; g.fillRect(0,0,160,5);
  const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; return tx;
}
function courtTex(){                                  // transparent apart from a pale outline + net line
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 200;
  const g = cv.getContext('2d'); g.clearRect(0,0,128,200);
  g.strokeStyle = 'rgba(240,238,225,0.75)'; g.lineWidth = 3;
  g.strokeRect(7,7,114,186);
  g.beginPath(); g.moveTo(7,100); g.lineTo(121,100); g.stroke();     // net line across the middle
  const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; return tx;
}

// ============================== builders ===============================
// small racquet: an oval head on a short handle, held as an extension of the
// hand (parented into parts.handR so it swings with the arm for free).
function makeRacquet(){
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.024,0.3,6), toon(0x6b4a2c));
  handle.position.y = -0.15; g.add(handle);
  const head = new THREE.Mesh(new THREE.TorusGeometry(0.1,0.012,6,16), toon(0xeceef2));
  head.position.y = -0.4; head.scale.set(0.82,1.15,1);              // slight oval
  g.add(head);
  g.rotation.x = -0.35;                                             // angle the face up a touch
  return g;
}
// shuttlecock: cork ball + flared feather cone. Local +Y is the feather /
// trailing direction; setShuttle() aligns +Y with −velocity so the cork leads.
function makeShuttle(){
  const g = new THREE.Group();
  const cork = new THREE.Mesh(new THREE.SphereGeometry(0.05,7,6), toon(0xf4f1e6));
  cork.position.y = -0.07; g.add(cork);
  const feath = new THREE.Mesh(new THREE.ConeGeometry(0.08,0.15,10,1,true),
    bmat(0xffffff,{side:THREE.DoubleSide,transparent:true,opacity:0.92}));
  feath.rotation.x = Math.PI;                                       // flip: wide end up, apex down at the cork
  feath.position.y = 0.03; g.add(feath);
  return g;
}

// floaty horizontal ease: fast off the racquet, SLOW through the apex, fast on
// the way down — makes the birdie hang like a real shuttle. Monotone (deriv min
// 1-0.55=0.45 > 0), 0→0 and 1→1 with the sag centred on the apex (s=0.5).
function hEase(s){ return s + 0.55*Math.sin(2*Math.PI*s)/(2*Math.PI); }

// ---------------------------- "ope" bubble -----------------------------
// one reusable projected speech bubble for the rare dropped-birdie moment
// (mirrors the framework bump-bubble pattern; reuses the .npcbubble CSS).
const _bub = document.createElement('div'); _bub.className = 'npcbubble';
_bub.style.display = 'none'; document.body.appendChild(_bub);
let _bubT = 0, _bx = 0, _by = 0, _bz = 0;
const _pv = new THREE.Vector3();
function opeBubble(x,y,z,text){ _bub.textContent = text; _bubT = 1.4; _bx = x; _by = y; _bz = z; }
function updateOpeBubble(dt){
  if(_bubT <= 0){ if(_bub.style.display !== 'none') _bub.style.display = 'none'; return; }
  _bubT -= dt;
  if(_bubT <= 0){ _bub.style.display = 'none'; return; }
  _pv.set(_bx,_by,_bz); const dcam = _pv.distanceTo(camera.position); _pv.project(camera);
  if(_pv.z > 1 || dcam > 42){ _bub.style.display = 'none'; return; }
  _bub.style.display = 'block';
  _bub.style.left = ((_pv.x*0.5+0.5)*innerWidth).toFixed(0)+'px';
  _bub.style.top  = ((-_pv.y*0.5+0.5)*innerHeight).toFixed(0)+'px';
}

// ---- hoisted per-frame scratch (NO allocation in the update loop) ----
const _sv = new THREE.Vector3(), _up = new THREE.Vector3(0,1,0), _sq = new THREE.Quaternion();
let _player = null, _mayorSwingT = 0;
let C1 = null;                                        // the joinable court (courts[0])

// place & orient a court's shuttle at a world point; cork leads along velocity
function setShuttle(court, x, y, z){
  const sh = court.shuttle;
  _sv.set(x-sh.px, y-sh.py, z-sh.pz);
  if(_sv.lengthSq() > 1e-6){ _sv.normalize().multiplyScalar(-1); _sq.setFromUnitVectors(_up,_sv); sh.group.quaternion.copy(_sq); }
  sh.group.position.set(x,y,z);
  sh.px = x; sh.py = y; sh.pz = z;
}

// ---------------------------- NPC animation ----------------------------
function animateSwing(npc, dt){
  let armX = -0.55;                                   // racquet-up ready pose
  if(npc.swingT > 0){
    npc.swingT -= dt;
    const w = clamp(npc.swingT/0.32, 0, 1);           // 1 = cocked back, 0 = follow-through
    armX = -1.9*w + 0.35*(1-w);
  }
  npc.parts.armR.rotation.x = armX; npc.parts.armR.rotation.z = 0.25;
  npc.parts.armL.rotation.x = -0.35; npc.parts.armL.rotation.z = -0.15;
}
function updateNpcBody(npc, t, dt, active){
  const g = npc.group;
  if(npc.target){                                     // walking to a waiting spot / back onto court
    const dx = npc.target.x-g.position.x, dz = npc.target.z-g.position.z, d = Math.hypot(dx,dz);
    if(d > 0.1){
      const step = Math.min(d, 1.7*dt); g.position.x += dx/d*step; g.position.z += dz/d*step;
      npc.walkPhase += dt*8; const sw = Math.sin(npc.walkPhase)*0.55;
      npc.parts.legL.rotation.x = sw; npc.parts.legR.rotation.x = -sw;
      g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx,dz), 1-Math.exp(-8*dt));
    } else {
      npc.target = null; npc.parts.legL.rotation.x = 0; npc.parts.legR.rotation.x = 0;
      g.rotation.y = lerpAngle(g.rotation.y, npc.faceBase, 1-Math.exp(-8*dt));
    }
  } else if(active){                                  // rally player — shuffle side to side, ready bounce
    g.position.x = npc.home.x + Math.sin(t*1.7 + npc.phase)*0.3;
    g.position.z = npc.home.z;
    g.rotation.y = npc.faceBase;
    npc.parts.legL.rotation.x = 0; npc.parts.legR.rotation.x = 0;
    npc.parts.body.rotation.x = 0.05 + Math.sin(t*3 + npc.phase)*0.02;
  }
  animateSwing(npc, dt);
}

// ----------------------------- rally flights ---------------------------
// AMBIENT (NPC vs NPC): continuous crossings with an occasional deliberate miss.
function launchCross(court, from, isMiss){
  const A = court[from], to = from==='north' ? 'south' : 'north', B = court[to];
  const fx = A.group.position.x, fz = A.group.position.z;
  let tx = B.group.position.x, tz = B.group.position.z, ty = HIT_TALL;
  if(isMiss){ const dx = tx-fx, dz = tz-fz, d = Math.hypot(dx,dz)||1;   // sail long, land on the grass
    tx += dx/d*2.6; tz += dz/d*2.6; ty = 0.14; }
  court.flight = { from, to, isMiss, fx, fy:HIT_TALL, fz, tx, ty, tz,
                   t:0, dur:1.7+Math.random()*0.45, arc:1.9+Math.random()*0.3 };
  A.swingT = 0.32;
  sPock(fx, HIT_TALL, fz, _player);
}
function decideAndLaunch(court, from){                // schedule a miss every 8–14 clean crossings
  const miss = court.crossCount >= court.crossToMiss;
  launchCross(court, from, miss);
  if(!miss) court.crossCount++;
}
function resetServe(court){
  court.rally = 0; court.crossCount = 0; court.crossToMiss = 8 + (Math.random()*7|0);
  court.holder = Math.random() < 0.5 ? 'north' : 'south';
  court.serveTimer = 0.6 + Math.random()*0.6;
  const h = court[court.holder]; setShuttle(court, h.home.x, HIT_TALL, h.home.z);
}
function advanceFlight(court, dt){
  const f = court.flight; f.t += dt; const s = clamp(f.t/f.dur, 0, 1);
  const he = hEase(s);
  setShuttle(court, lerp(f.fx,f.tx,he), lerp(f.fy,f.ty,s) + f.arc*4*s*(1-s), lerp(f.fz,f.tz,he));
  const B = court[f.to];
  if(!f.isMiss && s > 0.72) B.swingT = Math.max(B.swingT, 0.2);      // receiver reaches as it nears
  if(s >= 1){
    if(f.isMiss){
      setShuttle(court, f.tx, 0.13, f.tz);
      opeBubble(B.group.position.x, 2.3, B.group.position.z, OPE[Math.random()*OPE.length|0]);
      court.flight = null; court.dropT = 1.5;
    } else {
      court.rally++;
      decideAndLaunch(court, f.to);                                  // receiver returns immediately → continuous
    }
  }
}
function ambientUpdate(court, dt, t){
  updateNpcBody(court.north, t, dt, true);
  updateNpcBody(court.south, t, dt, true);
  if(court.flight){ advanceFlight(court, dt); return; }
  if(court.dropT > 0){ court.dropT -= dt; if(court.dropT <= 0) resetServe(court); return; }
  court.serveTimer -= dt;
  if(court.serveTimer <= 0) decideAndLaunch(court, court.holder);
}

// JOINED (mayor vs the north NPC): the NPC feeds the birdie; a timed E press returns it.
function serveToMayor(court){
  const N = court.north, fx = N.group.position.x, fz = N.group.position.z;
  court.flight = { from:'north', to:'mayor', isMiss:false, fx, fy:HIT_TALL, fz,
                   tx:_player.x, ty:1.4, tz:_player.z,
                   t:0, dur:1.8+Math.random()*0.35, arc:2.0+Math.random()*0.25 };
  N.swingT = 0.32; sPock(fx, HIT_TALL, fz, _player);
  court.jState = 'incoming'; court.windowOpen = false;
}
function attemptHit(court){
  const f = court.flight; if(!f || f.to !== 'mayor') return;
  if(court.windowOpen){                                              // good return
    _mayorSwingT = 0.34;
    const tx = court.north.group.position.x, tz = court.north.group.position.z;
    court.flight = { from:'mayor', to:'north', isMiss:false, fx:_player.x, fy:1.4, fz:_player.z,
                     tx, ty:HIT_TALL, tz, t:0, dur:1.8+Math.random()*0.3, arc:2.0+Math.random()*0.2 };
    sPock(_player.x, 1.4, _player.z, _player);
    court.jState = 'outgoing'; court.windowOpen = false;
    court.mrally++;
    state.badmintonBest = Math.max(state.badmintonBest||0, court.mrally);
    if(court.mrally % 5 === 0) toast('nice rally!', court.mrally + ' returns in a row 🏸');
  } else {                                                           // swung too early → whiff
    mayorMiss(court);
  }
}
function mayorMiss(court){
  _mayorSwingT = 0.34;
  const f = court.flight, dx = f ? f.tx : _player.x, dz = f ? f.tz : _player.z;
  setShuttle(court, dx, 0.13, dz);
  opeBubble(_player.x, 2.4, _player.z, 'ope!');
  court.flight = null; court.jState = 'serveWait'; court.serveTimer = 1.2;
  court.windowOpen = false; court.mrally = 0;
  court.inter.label = 'nice game — leave 🏸';
}
function joinedUpdate(court, dt, t){
  updateNpcBody(court.north, t, dt, true);            // the wall
  updateNpcBody(court.south, t, dt, false);           // stepped aside, waiting
  court.inter.x = _player.x; court.inter.z = _player.z;   // keep the interaction on the mayor (E always fires)
  if(court.jState === 'serveWait'){
    court.inter.label = 'nice game — leave 🏸';
    court.serveTimer -= dt; if(court.serveTimer <= 0) serveToMayor(court);
    return;
  }
  const f = court.flight; if(!f) return;
  f.t += dt; const s = clamp(f.t/f.dur, 0, 1); const he = hEase(s);
  setShuttle(court, lerp(f.fx,f.tx,he), lerp(f.fy,f.ty,s) + f.arc*4*s*(1-s), lerp(f.fz,f.tz,he));
  if(f.to === 'mayor'){                               // inbound to the player
    court.windowOpen = (f.dur - f.t) <= HIT_WINDOW && s > 0.5;       // descending half only
    court.inter.label = court.windowOpen ? 'RETURN! 🏸' : 'get ready…';
    if(s >= 1) mayorMiss(court);                                     // reached the ground unhit
  } else {                                            // outbound to the NPC (safe to leave)
    court.inter.label = 'nice game — leave 🏸';
    if(s > 0.72) court.north.swingT = Math.max(court.north.swingT, 0.2);
    if(s >= 1){ court.north.swingT = 0.3; serveToMayor(court); }     // NPC feeds it back
  }
}

// ---------------------------- join / leave -----------------------------
function join(court){
  court.mode = 'joined'; court.jState = 'serveWait'; court.serveTimer = 1.0;
  court.mrally = 0; court.flight = null; court.dropT = 0;
  court.south.target = { x:court.cx + 5.5, z:court.cz + HALF_LEN };  // NPC steps aside (east)
  _player.x = court.cx + 1.5; _player.z = court.cz + HALF_LEN;       // snap the mayor onto the south baseline (east of the NPC's spot)
  _player.vx = 0; _player.vz = 0;
  court.inter.x = _player.x; court.inter.z = _player.z;
  holdItem(court.mayorRacquet);
  setShuttle(court, court.north.home.x, HIT_TALL, court.north.home.z);
  toast('you joined the rally!', 'press E as the birdie drops in 🏸');
}
function leave(court){
  court.mode = 'ambient'; holdItem(null);
  mparts.armR.rotation.z = 0.25;                       // restore the mayor's rest arm splay
  court.south.target = { x:court.south.home.x, z:court.south.home.z };
  court.flight = null; court.dropT = 0; court.rally = 0;
  court.crossCount = 0; court.crossToMiss = 8 + (Math.random()*7|0);
  court.holder = 'north'; court.serveTimer = 0.8;
  court.inter.x = court.interAnchor.x; court.inter.z = court.interAnchor.z;
  court.inter.label = 'join the rally 🏸';
}

// ================================ wire up ==============================
onWorldReady(player => {
  _player = player;

  // ---- journal: longest rally the mayor has held ----
  state.badmintonBest = state.badmintonBest || 0;
  journalSection('badminton', 'Badminton', () =>
    `<div class="jrow"><span>Longest rally</span><b>${state.badmintonBest||0}</b></div>`);

  // ---- shared instanced hardware: posts / nets / court lines ----
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(1,1,1);
  const flatX = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));   // plane → lie flat

  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03,0.045,NET_TOP,7), toon(0xdedede), COURTS.length*2);
  posts.frustumCulled = false;

  // one sagging net band, reused per court (top edge at NET_TOP)
  const NET_H = 0.76, netCenterY = NET_TOP - NET_H/2;
  const netGeo = new THREE.PlaneGeometry(HW*2, NET_H, 14, 1);
  { const pos = netGeo.attributes.position;                                              // catenary-ish sag
    for(let i=0;i<pos.count;i++){ const px = pos.getX(i)/HW; pos.setY(i, pos.getY(i) - 0.14*(1-px*px)); }
    pos.needsUpdate = true; }
  const nets = new THREE.InstancedMesh(netGeo, bmat(0xffffff,{map:netTex(),alphaTest:0.4,side:THREE.DoubleSide}), COURTS.length);
  nets.frustumCulled = false;

  const lineGeo = new THREE.PlaneGeometry(HW*2 + 0.8, HALF_LEN*2 + 0.8);
  const lines = new THREE.InstancedMesh(lineGeo,
    bmat(0xffffff,{map:courtTex(),transparent:true,opacity:0.6,depthWrite:false,side:THREE.DoubleSide}), COURTS.length);
  lines.frustumCulled = false;

  const courts = [];
  COURTS.forEach((cfg, ci) => {
    const { cx, cz } = cfg;
    // posts (two per court)
    posts.setMatrixAt(ci*2,   M.compose(V.set(cx-HW, NET_TOP/2, cz), Q, S));
    posts.setMatrixAt(ci*2+1, M.compose(V.set(cx+HW, NET_TOP/2, cz), Q, S));
    // net + ground lines
    nets.setMatrixAt(ci, M.compose(V.set(cx, netCenterY, cz), Q.identity(), S));
    lines.setMatrixAt(ci, M.compose(V.set(cx, 0.02, cz), flatX, S));

    // two posed chibi players (north faces +z, south faces −z — toward the net)
    function makePlayer(x, z, faceBase, pi){
      const { group, parts } = createChibi(Object.assign({scale:CITIZEN}, PAL[pi % PAL.length]));
      group.position.set(x, 0, z); group.rotation.y = faceBase; scene.add(group);
      parts.handR.add(makeRacquet());
      registerBumpable(group, parts, LINES);
      return { group, parts, home:{x,z}, faceBase, swingT:0, walkPhase:0, phase:Math.random()*6.283, target:null };
    }
    const north = makePlayer(cx, cz - HALF_LEN, 0,        ci*2);
    const south = makePlayer(cx, cz + HALF_LEN, Math.PI,  ci*2 + 1);

    const shuttle = makeShuttle(); shuttle.position.set(cx, HIT_TALL, cz); scene.add(shuttle);

    const court = { cx, cz, joinable:cfg.joinable, north, south,
      shuttle:{ group:shuttle, px:cx, py:HIT_TALL, pz:cz },
      mode:'ambient', flight:null, dropT:0, rally:0,
      crossCount:0, crossToMiss:8 + (Math.random()*7|0),
      holder:Math.random()<0.5?'north':'south', serveTimer:0.5 + ci*0.6 + Math.random()*0.8,
      jState:'serveWait', windowOpen:false, mrally:0,
      inter:null, interAnchor:null, mayorRacquet:null };

    if(cfg.joinable){
      court.mayorRacquet = makeRacquet();
      const ax = cx + HW + 1.3, az = cz + 1.6;                       // east sideline, south half
      court.interAnchor = { x:ax, z:az };
      court.inter = addInteraction({ x:ax, z:az, r:2.8, priority:1, label:'join the rally 🏸',
        onUse:() => {
          if(court.mode !== 'joined'){ join(court); }
          else if(court.jState === 'incoming'){ attemptHit(court); }
          else { leave(court); }
        }});
      C1 = court;
    }
    courts.push(court);
  });
  posts.instanceMatrix.needsUpdate = true; nets.instanceMatrix.needsUpdate = true; lines.instanceMatrix.needsUpdate = true;
  scene.add(posts, nets, lines);

  // ------------------------------ per-frame ------------------------------
  registerUpdate((dt, t, pl) => {
    _player = pl;
    for(let i=0;i<courts.length;i++){
      const c = courts[i];
      if(c.joinable && c.mode === 'joined') joinedUpdate(c, dt, t);
      else ambientUpdate(c, dt, t);
    }
    // override the mayor's right arm while joined (runs AFTER main.js updateCharacter)
    if(C1 && C1.mode === 'joined'){
      if(_mayorSwingT > 0){
        _mayorSwingT -= dt; const w = clamp(_mayorSwingT/0.34, 0, 1);
        mparts.armR.rotation.x = -1.9*w + 0.4*(1-w); mparts.armR.rotation.z = 0.15;
      } else {
        mparts.armR.rotation.x = -0.6; mparts.armR.rotation.z = 0.22;   // hold the racquet ready
      }
    }
    updateOpeBubble(dt);
  });
});
