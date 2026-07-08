// =====================================================================
//  CORNHOLE — THE match (delight-backlog: "Cornhole boards with an ongoing
//  NPC match"). lawnlife's two cornhole sites are background texture (both
//  arms pump forever, the bag loops untimed); THIS is the flagship on the
//  south lawn: two Chicago-flag boards ~8 m apart, two posed chibis who
//  ALTERNATE real underhand tosses, ONE bag whose arc + thunk is synced to
//  the thrower's arm, 4-bags-a-side rounds (the foot piles visibly deplete
//  onto the boards, then reset), and the occasional BAGO — bag drops in the
//  hole, thrower hops with both arms up, "bago!" toast. Site (130,272):
//  east of the badminton court (105,255 — 26 m), west of the rocks terraces
//  (~18 m), 40+ m from the Diversey range fence, ~110 m from the trail
//  ribbons — audited again at runtime below (dead-space rules).
//
//  Toast discipline (PITFALLS.md: toasts hold ~3 s, never queue in fast
//  loops): the bago toast fires only with the player within 22 m AND >=12 s
//  since the last one — bagos themselves are ~1-2 per ~33 s round. The
//  FIRST toss of the session is always a bago (runtime animation state, not
//  world layout — spawn is ~300 m away so nobody sees it in normal play; it
//  makes the celebration deterministically verifiable).
//
//  Only-my-file rules: all setup in onWorldReady; LOCAL m32 rng only (the
//  shared world rng is never touched — layout is hardcoded); posed chibis
//  use raw createChibi (makeNPC's walk-swing would fight the toss poses)
//  and register framework bumpables ("ope" on bump + distance culling).
//  A single registerUpdate runs the match from hoisted scratch — zero
//  per-frame allocation. Audio guards getAudioCtx().actx (null pre-start).
//
//  Added draw calls: decks(2, one per team color — r128 toon ignores
//  setColorAt, so color buckets) + stars(1×2) + holes(1×2) + legs(1×4) +
//  bag piles(2 colors ×1) + flight bags(2) = 9. Chibis (2) exempt by
//  design, culled >145 m via registerBumpable's piggyback.
// =====================================================================
import { onWorldReady, registerUpdate, createChibi, registerBumpable, toast, getAudioCtx } from '../framework.js';
import * as THREE from 'three';
import { scene, camera, toon, clamp, lerp, smooth, pip } from '../core.js';
import { coastQuery, LAND } from '../coast.js';
import { pathSamples } from '../paths.js';

// local deterministic rng — never the shared core rng()/rand()
function m32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const CITIZEN=0.74;                        // canonical chibi scale (matches the mayor)
const LINES=["ope — bags!","that's a bago, bud","first to 21 — cancellation scoring, we're civilized",
             "ope — you're standin' in my lane","wind off the lake, gotta loft it"];

// dead-space audit (parklife/lawnlife pattern): the whole site shifts off any
// trail sample closer than 6 m, and each anchor must be on the grass.
function clearPath(cx,cz){
  let bd2=Infinity,bx=cx,bz=cz;
  for(let i=0;i<pathSamples.length;i++){const s=pathSamples[i],dx=cx-s[0],dz=cz-s[1],d2=dx*dx+dz*dz;if(d2<bd2){bd2=d2;bx=s[0];bz=s[1];}}
  const d=Math.sqrt(bd2);
  if(d<6){
    let ux=cx-bx,uz=cz-bz;const L=Math.hypot(ux,uz)||1;ux/=L;uz/=L;
    const push=Math.min(4,(6-d)+0.6);
    console.warn(`[cornhole] NUDGE site: (${cx},${cz}) was ${d.toFixed(2)} m from a path sample`);
    return {x:cx+ux*push,z:cz+uz*push};
  }
  return {x:cx,z:cz};
}
function auditLawn(x,z,name){
  if(!pip(x,z,LAND))console.warn(`[cornhole] ${name} off the LAND polygon at (${x.toFixed(1)},${z.toFixed(1)})`);
  const q=coastQuery(x,z);
  if(q&&q.lat>-1.5)console.warn(`[cornhole] ${name} too close to the coast steps at (${x.toFixed(1)},${z.toFixed(1)})`);
}

// Chicago-flag six-pointed star (ShapeGeometry lies in the xy-plane, like CircleGeometry)
function starGeo(R,r){
  const sh=new THREE.Shape();
  for(let i=0;i<12;i++){const a=i*Math.PI/6,rad=(i%2)?r:R,x=Math.sin(a)*rad,y=Math.cos(a)*rad;
    i?sh.lineTo(x,y):sh.moveTo(x,y);}
  sh.closePath();return new THREE.ShapeGeometry(sh);
}

onWorldReady((player)=>{
  const rnd=m32(30303);

  // ------------------------------ layout ------------------------------
  const SITE=clearPath(130,272);                       // south lawn, empty per site-check shots
  const GAP=8;                                          // board-to-board (acceptance: ~8 m)
  const TILT=0.23, W=0.72, L=1.32, DECKH=0.07;
  // board A north (low edge facing south toward B), board B south (facing north)
  const BOARDS=[
    {x:SITE.x, z:SITE.z-GAP/2, yaw:0,       deck:0x55aedd},   // Chicago-flag light blue (saturated for toon)
    {x:SITE.x, z:SITE.z+GAP/2, yaw:Math.PI, deck:0xf3eddd},   // cream
  ];
  // throwers stand beside + behind their board, facing the far board
  const THROWERS=[
    {x:SITE.x-0.95, z:SITE.z-GAP/2-2.3, pal:{suit:0xd4694f,pants:0x3c4a63,skin:0xe8b48c,hair:0x3a2a1e}},
    {x:SITE.x+0.95, z:SITE.z+GAP/2+2.3, pal:{suit:0x4f8c6b,pants:0x2f3540,skin:0x8a5a3c,hair:0x1d160f,hairStyle:'bun'}},
  ];
  THROWERS[0].ry=Math.atan2(BOARDS[1].x-THROWERS[0].x,BOARDS[1].z-THROWERS[0].z);
  THROWERS[1].ry=Math.atan2(BOARDS[0].x-THROWERS[1].x,BOARDS[0].z-THROWERS[1].z);
  auditLawn(SITE.x,SITE.z,'site');
  for(const b of BOARDS)auditLawn(b.x,b.z,'board');
  for(const th of THROWERS)auditLawn(th.x,th.z,'thrower');

  // build-time scratch
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),
        S=new THREE.Vector3(1,1,1),E=new THREE.Euler();
  const flatUp=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));

  // ------------------------------ boards ------------------------------
  // per-board basis for landing math: deck-top center + right/fwd/up units
  const starMats=[],holeMats=[],legMats=[];
  BOARDS.forEach(b=>{
    E.set(TILT,b.yaw,0,'YXZ');Q.setFromEuler(E);
    const cy=Math.sin(TILT)*(L/2)+0.05;                 // front lip kisses the grass
    const deck=new THREE.Mesh(new THREE.BoxGeometry(W,DECKH,L),toon(b.deck));
    deck.position.set(b.x,cy,b.z);deck.quaternion.copy(Q);scene.add(deck);
    b.q=Q.clone();
    b.right=new THREE.Vector3(1,0,0).applyQuaternion(Q);
    b.fwd  =new THREE.Vector3(0,0,1).applyQuaternion(Q); // down-slope, toward partner
    b.up   =new THREE.Vector3(0,1,0).applyQuaternion(Q);
    b.top  =new THREE.Vector3(b.x,cy,b.z).addScaledVector(b.up,DECKH/2);
    // hole up-slope, star decal mid-deck (both lie flat on the deck plane)
    Q.multiply(flatUp);
    V.copy(b.top).addScaledVector(b.fwd,-0.40).addScaledVector(b.up,0.008);
    M.compose(V,Q,S.set(1,1,1));holeMats.push(M.clone());
    b.hole=V.clone();
    V.copy(b.top).addScaledVector(b.fwd,0.22).addScaledVector(b.up,0.008);
    M.compose(V,Q,S.set(1,1,1));starMats.push(M.clone());
    // two rear legs (vertical, at the raised corners)
    const c=Math.cos(b.yaw),s=Math.sin(b.yaw);
    for(const lx of [-(W/2-0.08),W/2-0.08]){
      const lz=-(L/2-0.07);
      V.set(b.x+lx*c+lz*s,0.14,b.z-lx*s+lz*c);
      M.compose(V,Q.identity(),S.set(1,1,1));legMats.push(M.clone());
    }
  });
  function inst(geo,mat,mats){
    const im=new THREE.InstancedMesh(geo,mat,mats.length);
    im.frustumCulled=false;
    mats.forEach((m,i)=>im.setMatrixAt(i,m));
    im.instanceMatrix.needsUpdate=true;scene.add(im);return im;
  }
  inst(new THREE.CircleGeometry(0.13,14),toon(0x1a140c,{side:THREE.DoubleSide}),holeMats);
  inst(starGeo(0.17,0.075),toon(0xc8102e,{side:THREE.DoubleSide}),starMats);
  inst(new THREE.CylinderGeometry(0.025,0.025,0.28,6),toon(0x8a6a44),legMats);

  // ------------------------------ players ------------------------------
  const P=THROWERS.map(th=>{
    const {group,parts}=createChibi(Object.assign({scale:CITIZEN},th.pal));
    group.position.set(th.x,0,th.z);group.rotation.y=th.ry;scene.add(group);
    registerBumpable(group,parts,LINES);
    return {group,parts,
      rel:new THREE.Vector3(th.x+Math.sin(th.ry)*0.5,0.92,th.z+Math.cos(th.ry)*0.5),
      idle:rnd()*6.28};
  });

  // ------------------------------ bags ------------------------------
  // two team colors -> separate buckets (r128 toon ignores setColorAt).
  // 4 instances per color: in the foot pile, or resting where they landed.
  const BAGCOL=[0xc23b32,0x2f5fbf];                    // red (A) / navy (B)
  const bagGeo=new THREE.BoxGeometry(0.16,0.055,0.16);
  const piles=BAGCOL.map(c=>inst(bagGeo,toon(c),[new THREE.Matrix4(),new THREE.Matrix4(),new THREE.Matrix4(),new THREE.Matrix4()]));
  const pileSpot=[];                                    // [color][i] = home matrix in the pile
  THROWERS.forEach((th,ci)=>{
    const rx=Math.cos(th.ry),rz=-Math.sin(th.ry);       // thrower's right hand side
    pileSpot[ci]=[];
    for(let i=0;i<4;i++){
      const jx=(i%2)*0.2-0.1+(rnd()*0.06-0.03),jz=((i/2)|0)*0.2-0.1+(rnd()*0.06-0.03);
      E.set(0,rnd()*6.28,0);Q.setFromEuler(E);
      V.set(th.x+rx*0.62+jx,0.03,th.z+rz*0.62+jz);
      M.compose(V,Q,S.set(1,1,1));
      pileSpot[ci].push(M.clone());piles[ci].setMatrixAt(i,M);
    }
    piles[ci].instanceMatrix.needsUpdate=true;
  });
  // one flight bag per color (only one visible at a time)
  const fly=BAGCOL.map(c=>{
    const m=new THREE.Mesh(bagGeo,toon(c));m.visible=false;m.frustumCulled=false;scene.add(m);return m;
  });

  // ------------------------------ audio ------------------------------
  const _sndV=new THREE.Vector3();
  function panDest(wx,wy,wz){
    const ac=getAudioCtx();if(!ac.actx)return null;
    let dest=ac.sfxBus;
    if(ac.actx.createStereoPanner){
      _sndV.set(wx,wy,wz).applyMatrix4(camera.matrixWorldInverse);
      const p=ac.actx.createStereoPanner();
      p.pan.value=clamp(_sndV.x/(Math.abs(_sndV.z)+2),-0.85,0.85);
      p.connect(ac.sfxBus);dest=p;
    }
    return dest;
  }
  function sThunk(wx,wy,wz,hole){                      // bag hits plywood (hollower into the hole)
    const ac=getAudioCtx();if(!ac.actx)return;
    const dist=Math.hypot(wx-player.x,wz-player.z),vol=clamp(1-dist/28,0,1);
    if(vol<0.02)return;
    const {actx,noiseBuf}=ac,t=actx.currentTime,dest=panDest(wx,wy,wz);
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='triangle';
    o.frequency.setValueAtTime(hole?140:190,t);o.frequency.exponentialRampToValueAtTime(hole?55:80,t+0.07);
    g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.06*vol,t+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.13);
    o.connect(g);g.connect(dest);o.start(t);o.stop(t+0.15);
    const s=actx.createBufferSource();s.buffer=noiseBuf;
    const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=380;
    const ng=actx.createGain();ng.gain.setValueAtTime(0.05*vol,t);ng.gain.exponentialRampToValueAtTime(0.0001,t+0.07);
    s.connect(f);f.connect(ng);ng.connect(dest);s.start(t);s.stop(t+0.08);
  }
  function sBago(wx,wy,wz){                            // two quick ascending blips
    const ac=getAudioCtx();if(!ac.actx)return;
    const dist=Math.hypot(wx-player.x,wz-player.z),vol=clamp(1-dist/28,0,1);
    if(vol<0.02)return;
    const {actx}=ac,t=actx.currentTime,dest=panDest(wx,wy,wz);
    [620,830].forEach((fq,i)=>{
      const o=actx.createOscillator(),g=actx.createGain();
      o.type='triangle';o.frequency.value=fq;
      g.gain.setValueAtTime(0.0001,t+i*0.09);g.gain.linearRampToValueAtTime(0.035*vol,t+i*0.09+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,t+i*0.09+0.1);
      o.connect(g);g.connect(dest);o.start(t+i*0.09);o.stop(t+i*0.09+0.12);
    });
  }

  // ------------------------------ the match ------------------------------
  // phases: 0 aim (1.15 s) -> 1 windup (0.55) -> 2 flight (1.35) ->
  //         3 settle (1.0) / 4 celebrate (1.8) -> next thrower; after 8
  //         tosses, 5 round-reset (2.2) restores the piles.
  const DUR=[1.15,0.55,1.35,1.0,1.8,2.2];
  const mt={phase:0,ph:0,turn:0,toss:0,round:0,bago:false,pileN:[4,4]};
  const from=new THREE.Vector3(),to=new THREE.Vector3();
  const landQ=new THREE.Quaternion();
  const _M=new THREE.Matrix4(),_V=new THREE.Vector3(),_S0=new THREE.Vector3(0,0,0),_S1=new THREE.Vector3(1,1,1);
  let lastToast=-99;

  function startFlight(t){
    const ci=mt.turn,tgt=BOARDS[1-ci];
    // first toss of the session always drops (verifiable celebration); then ~22%
    mt.bago=(mt.round===0&&mt.toss===0)||rnd()<0.22;
    from.copy(P[ci].rel);
    if(mt.bago){to.copy(tgt.hole);landQ.copy(tgt.q);}
    else{
      const jx=rnd()*0.32-0.16,jz=rnd()*0.5-0.15;
      to.copy(tgt.top).addScaledVector(tgt.right,jx).addScaledVector(tgt.fwd,jz).addScaledVector(tgt.up,0.03);
      landQ.copy(tgt.q);
    }
    // this bag leaves the pile
    mt.pileN[ci]--;
    piles[ci].setMatrixAt(mt.pileN[ci],_M.compose(_V.set(0,-5,0),landQ,_S0));
    piles[ci].instanceMatrix.needsUpdate=true;
    fly[ci].visible=true;fly[ci].position.copy(from);
  }
  function endFlight(t){
    const ci=mt.turn;
    fly[ci].visible=false;
    if(mt.bago){
      sBago(to.x,to.y,to.z);sThunk(to.x,to.y,to.z,true);
      const dx=player.x-SITE.x,dz=player.z-SITE.z;
      if(dx*dx+dz*dz<484&&t-lastToast>12){toast('bago!','the south-lawn cornhole match');lastToast=t;}
      mt.phase=4;
    }else{
      // bag rests where it landed, flush with the deck
      piles[ci].setMatrixAt(mt.pileN[ci],_M.compose(to,landQ,_S1));
      piles[ci].instanceMatrix.needsUpdate=true;
      sThunk(to.x,to.y,to.z,false);
      mt.phase=3;
    }
    mt.ph=0;
  }
  function nextToss(){
    mt.turn=1-mt.turn;mt.toss++;mt.ph=0;
    if(mt.toss>=8)mt.phase=5;else mt.phase=0;
  }
  function resetRound(){
    for(let ci=0;ci<2;ci++){
      for(let i=0;i<4;i++)piles[ci].setMatrixAt(i,pileSpot[ci][i]);
      piles[ci].instanceMatrix.needsUpdate=true;
      mt.pileN[ci]=4;
    }
    mt.toss=0;mt.round++;mt.turn=mt.round%2;mt.phase=0;mt.ph=0;
  }

  registerUpdate((dt,t)=>{
    mt.ph+=dt;
    const ci=mt.turn,thr=P[ci].parts,oth=P[1-ci].parts;

    // idle sway for both (cheap; no body.scale — the rig owns that)
    P[0].group.rotation.z=Math.sin(t*0.8+P[0].idle)*0.015;
    P[1].group.rotation.z=Math.sin(t*0.8+P[1].idle)*0.015;

    if(mt.phase===0){                                   // AIM — settle, weigh the bag
      const s=smooth(clamp(mt.ph/0.4,0,1));
      thr.armR.rotation.x=lerp(thr.armR.rotation.x,-0.15+Math.sin(t*1.4)*0.06,s*0.2+0.05);
      thr.armL.rotation.x*=(1-3*dt);thr.body.rotation.x*=(1-3*dt);
      oth.armR.rotation.x*=(1-3*dt);oth.armL.rotation.x*=(1-3*dt);
      oth.body.rotation.x*=(1-3*dt);
      P[ci].group.position.y*=(1-6*dt);P[1-ci].group.position.y*=(1-6*dt);
      if(mt.ph>=DUR[0]){mt.phase=1;mt.ph=0;}
    }else if(mt.phase===1){                             // WINDUP — arm swings back
      const s=smooth(mt.ph/DUR[1]);
      thr.armR.rotation.x=lerp(-0.15,0.62,s);
      thr.body.rotation.x=lerp(0,0.1,s);
      fly[ci].visible=true;fly[ci].position.copy(P[ci].rel);fly[ci].rotation.set(0,0,0);
      if(mt.ph>=DUR[1]){mt.ph=0;mt.phase=2;startFlight(t);}
    }else if(mt.phase===2){                             // FLIGHT — the arc with hang time
      const s=clamp(mt.ph/DUR[2],0,1);
      const sw=smooth(clamp(mt.ph/0.35,0,1));           // arm swings through fast, then relaxes
      thr.armR.rotation.x=lerp(0.62,-1.3,sw)+(s>0.4?(s-0.4)*1.4:0);
      thr.body.rotation.x=lerp(0.1,-0.06,sw);
      _V.lerpVectors(from,to,s);
      _V.y+=1.9*4*s*(1-s);                              // parabola, apex ~1.9 m over the chord
      fly[ci].position.copy(_V);
      fly[ci].rotation.x=s*9;                           // lazy tumble
      if(s>=1)endFlight(t);
    }else if(mt.phase===3){                             // SETTLE — a beat before the reply
      if(mt.ph>=DUR[3])nextToss();
    }else if(mt.phase===4){                             // CELEBRATE — bago! arms up + hop
      const s=smooth(clamp(mt.ph/0.25,0,1));
      const rel=smooth(clamp((mt.ph-1.4)/0.4,0,1));
      thr.armR.rotation.x=lerp(-1.3,-2.45,s)*(1-rel);
      thr.armL.rotation.x=-2.45*s*(1-rel);
      oth.armR.rotation.x=-0.6*s*(1-rel);               // "nice one, bud"
      P[ci].group.position.y=mt.ph<1.2?Math.abs(Math.sin(mt.ph*7))*0.16:0;
      if(mt.ph>=DUR[4]){P[ci].group.position.y=0;nextToss();}
    }else{                                              // ROUND RESET — collect the bags
      if(mt.ph>=DUR[5])resetRound();
    }
  });
});
