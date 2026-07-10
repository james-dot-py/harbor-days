// =====================================================================
//  DIVERSEY GOLF — the driving range + mini-golf, made PLAYABLE (task 028).
//  Two activities on the south-end inland golf complex (DIVERSEY, data pack):
//
//   (A) DRIVING RANGE — step into a bay on the ground hitting deck, hold E
//       (or ✋) to charge a swing, release to launch a ball NORTH down the
//       fenced field. It arcs, bounces on the turf, and either settles or
//       buries into the 12 m net; carry distance is reported in yards. Ten
//       balls to a bucket; the bucket refills when it empties, best carry is
//       remembered.
//   (B) MINI GOLF — a puttable 3-hole course (dogleg / loop / windmill). Step
//       onto a hole's tee, charge + release to strike the putt ball; it rolls
//       on the felt, reflects off the rectilinear fairway RAILS (the fairway
//       polygon) and off obstacle posts, and drops when it reaches the cup
//       slow enough. Strokes/par are tracked; holes unlock 1→2→3.
//   The windmill BLADES turn slowly (decorative).
//
//  House rules honoured:
//   · ALL setup in onWorldReady; LOCAL m32 rng only (never the shared world
//     rng — layout is 100% data-driven anyway).
//   · 100% synthesized WebAudio, guarded on getAudioCtx().actx + ramped.
//   · No per-frame allocation: build-scope scratch Matrix4/Vector3/Quaternion;
//     camForward()/toast() are called only on input edges, never per frame.
//
//  DRAW-CALL BUDGET: this pack adds EXACTLY ONE InstancedMesh — the shared
//  BALL POOL (D.play.maxBalls unit spheres, frustumCulled=false → one GLOBAL
//  draw). Index 0 is the mini-golf putt ball; 1..maxBalls-1 are the range
//  flight/landed balls (cycled). Everything else is a plain, frustum-culled
//  Mesh: the windmill BLADES are ONE mesh — four blade boxes merged with
//  BufferGeometryUtils.mergeBufferGeometries, spun as a whole (NOT instanced).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, chargeThrow, camForward,
         toast, journalSection, state, getAudioCtx } from '../framework.js';
import { scene, toon, clamp, pip } from '../core.js';
import { DIVERSEY as D } from '../data/chicago.js';

// local deterministic rng — NEVER the shared core rng()/rand()
function m32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const GROUND_Y=0.06;   // range turf / mini-golf felt roll plane (ball centre)

// ---------------------------------------------------------------------
//  synthesized audio (all guarded on getAudioCtx().actx, all ramped).
//  Every sound fires only on an input edge with the player standing right
//  at the bay/tee, so no distance attenuation is needed.
// ---------------------------------------------------------------------
function sThwack(){                                   // driver hitting the ball
  const {actx,sfxBus,noiseBuf}=getAudioCtx(); if(!actx)return; const t=actx.currentTime;
  if(noiseBuf){
    const s=actx.createBufferSource();s.buffer=noiseBuf;
    const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=2200;f.Q.value=1.0;
    const g=actx.createGain();
    g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.2,t+0.004);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.08);
    s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t);s.stop(t+0.1);
  }
  const o=actx.createOscillator(),og=actx.createGain();
  o.type='triangle';
  o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(120,t+0.07);
  og.gain.setValueAtTime(0.12,t);og.gain.exponentialRampToValueAtTime(0.0001,t+0.09);
  o.connect(og);og.connect(sfxBus);o.start(t);o.stop(t+0.11);
}
function sBounce(){                                   // soft turf-bounce tick
  const {actx,sfxBus}=getAudioCtx(); if(!actx)return; const t=actx.currentTime;
  const o=actx.createOscillator(),g=actx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(90,t+0.06);
  g.gain.setValueAtTime(0.045,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.08);
  o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+0.1);
}
function sPutt(){                                     // soft putter tap
  const {actx,sfxBus}=getAudioCtx(); if(!actx)return; const t=actx.currentTime;
  const o=actx.createOscillator(),g=actx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(320,t);o.frequency.exponentialRampToValueAtTime(160,t+0.05);
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.07,t+0.005);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.09);
  o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+0.11);
}
function sPlunk(){                                    // ball dropping into the cup
  const {actx,sfxBus}=getAudioCtx(); if(!actx)return; const t=actx.currentTime;
  [520,780].forEach((fq,i)=>{
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='sine';o.frequency.value=fq;
    g.gain.setValueAtTime(0.0001,t+i*0.07);g.gain.linearRampToValueAtTime(0.05,t+i*0.07+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,t+i*0.07+0.12);
    o.connect(g);g.connect(sfxBus);o.start(t+i*0.07);o.stop(t+i*0.07+0.14);
  });
}

onWorldReady(()=>{
  const R=m32(28028);                                // local rng — only a decorative blade phase
  const P=D.play;

  // ------------------------- SHARED BALL POOL ------------------------- //
  // ONE InstancedMesh. idx 0 = mini-golf putt ball; 1..maxBalls-1 = range
  // flight/landed balls (cycled). Unused instances are parked far below ground.
  const pool=new THREE.InstancedMesh(new THREE.SphereGeometry(P.ballR,8,6),toon(0xf6f6ee),P.maxBalls);
  pool.frustumCulled=false;                          // moves across the whole field — never let a stale bounds cull it
  scene.add(pool);
  const _M=new THREE.Matrix4(),_V=new THREE.Vector3(),_Q=new THREE.Quaternion(),_S=new THREE.Vector3(1,1,1);
  function setBall(i,x,y,z){ _M.compose(_V.set(x,y,z),_Q,_S); pool.setMatrixAt(i,_M); pool.instanceMatrix.needsUpdate=true; }
  for(let i=0;i<P.maxBalls;i++)setBall(i,0,-50,0);   // all parked (invisible) to start

  // =================================================================== //
  //  (A) DRIVING RANGE — hit a bucket
  // =================================================================== //
  state.rangeBucket=P.bucketN;
  state.rangeBest=state.rangeBest||0;                // best carry, yards
  const HIT=D.bays.hit, launchY=D.bays.deckRect.h+1.0;   // ball leaves from ~1 m above the deck front lip
  const hitInters=[];
  const refreshRangeLabels=()=>{ for(const it of hitInters)it.setLabel(`hit a bucket (${state.rangeBucket})`); };

  // one flight at a time (one swing, one ball). live=false when nothing is airborne.
  const flight={i:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,live:false};
  let rangeNext=1;                                   // next flight instance (cycles 1..maxBalls-1)

  function launchBall(bx,power){
    if(flight.live)return;
    const i=rangeNext; rangeNext++; if(rangeNext>=P.maxBalls)rangeNext=1;
    const f=camForward(), speed=14+26*power;         // 14..40 m/s
    flight.i=i;
    flight.x=bx; flight.y=launchY; flight.z=HIT.z;
    flight.vx=f.x*speed*0.22;                         // slight yaw steer
    flight.vz=-speed;                                 // aim NORTH (−z)
    flight.vy=speed*0.55;                             // loft
    flight.live=true;
    setBall(i,flight.x,flight.y,flight.z);
    state.rangeBucket--;
    refreshRangeLabels();
    sThwack();
  }
  function startSwing(bx){
    if(flight.live)return;                            // ignore while a ball is airborne
    chargeThrow({onRelease:power=>launchBall(bx,power)});
  }
  function settleFlight(){
    flight.live=false;
    setBall(flight.i,flight.x,GROUND_Y,flight.z);     // rest where it lies (recycled on the next reuse of this index)
    const carry=Math.max(0,(HIT.z-flight.z)*P.yardScale);   // metres north × yardScale = yards
    const yds=Math.round(carry);
    const isBest=carry>=state.rangeBest;
    toast(`${yds} yards`, isBest?'new best!':'nice swing');
    if(carry>state.rangeBest)state.rangeBest=carry;
    if(state.rangeBucket<=0){
      toast('bucket done!', `best ${Math.round(state.rangeBest)} yds`);
      state.rangeBucket=P.bucketN;
    }
    refreshRangeLabels();
  }

  for(const x of HIT.xs){
    hitInters.push(addInteraction({x, z:HIT.z, r:HIT.r,
      label:`hit a bucket (${state.rangeBucket})`, onUse:()=>startSwing(x)}));
  }

  // =================================================================== //
  //  (B) MINI GOLF — puttable 3 holes
  // =================================================================== //
  const MG=D.mini, holes=MG.holes, PUTT=MG.putt;
  state.miniStrokes=state.miniStrokes||{};           // per-hole stroke counts
  const teeInters=[];
  const holed=new Set();                             // completed hole ids

  const putt={hole:null,x:0,z:0,vx:0,vz:0,live:false};

  function startPutt(hole){
    if(putt.live)return;                             // ignore while the ball is rolling
    putt.hole=hole; putt.x=hole.tee[0]; putt.z=hole.tee[1];
    setBall(0,putt.x,GROUND_Y,putt.z);               // (re-)tee the putt ball
    chargeThrow({onRelease:power=>strikePutt(hole,power)});
  }
  function strikePutt(hole,power){
    const f=camForward(), sp=PUTT.power*power;
    putt.hole=hole; putt.x=hole.tee[0]; putt.z=hole.tee[1];
    putt.vx=f.x*sp; putt.vz=f.z*sp; putt.live=true;
    state.miniStrokes[hole.id]=(state.miniStrokes[hole.id]||0)+1;
    setBall(0,putt.x,GROUND_Y,putt.z);
    sPutt();
  }
  function finishHole(hole){
    putt.live=false;
    setBall(0,0,-50,0);                              // sink the ball
    sPlunk();
    const strokes=state.miniStrokes[hole.id]||0;
    // NB: birdie = UNDER par (the task's inline `strokes<=par?'birdie'` swallows
    // its own par branch, so this uses the sensible `strokes<par`).
    const tier=strokes<hole.par?'birdie!':strokes===hole.par?'par':'';
    toast(`hole ${hole.id} — ${strokes} stroke${strokes===1?'':'s'}`, tier);
    holed.add(hole.id);
    const idx=holes.indexOf(hole);
    teeInters[idx].enabled=false;                    // lock the finished tee
    if(idx+1<holes.length)teeInters[idx+1].enabled=true;   // unlock the next
    else{
      const total=holes.reduce((s,h)=>s+(state.miniStrokes[h.id]||0),0);
      toast('course complete!', `${total} strokes`);
    }
  }

  holes.forEach((h,idx)=>{
    const it=addInteraction({x:h.tee[0], z:h.tee[1], r:2.0,
      label:`putt — hole ${h.id} (par ${h.par})`, onUse:()=>startPutt(h)});
    it.enabled=(idx===0);                            // only the active hole's tee is live (guides 1→2→3)
    teeInters.push(it);
  });

  // ---- WINDMILL BLADES: ONE merged plain Mesh (four blade boxes in a +) ----
  // Slow, purely DECORATIVE spin — the blades do NOT gate the ball. (Gate timing
  // at putt speed felt unfair; kept charming instead — the task's own fallback.)
  const wm=holes.find(h=>h.type==='windmill');
  let blades=null;
  if(wm&&wm.obst){
    const geos=[];
    for(let k=0;k<4;k++){ const g=new THREE.BoxGeometry(0.16,1.7,0.05); g.rotateZ(k*Math.PI/2); geos.push(g); }
    blades=new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(geos,false),toon(0xfdf6e6));
    blades.position.set(wm.obst[0],2.0,wm.obst[1]);
    blades.rotation.z=R()*Math.PI*2;                 // arbitrary (deterministic) start phase
    scene.add(blades);
  }

  // =================================================================== //
  //  per-frame integration (single registerUpdate, zero allocation)
  // =================================================================== //
  registerUpdate((dt)=>{
    if(dt<0)dt=0;

    // ---- range: the one live flight ball ----
    if(flight.live){
      flight.vy-=P.gravity*dt;
      flight.x+=flight.vx*dt; flight.y+=flight.vy*dt; flight.z+=flight.vz*dt;
      flight.x=clamp(flight.x,D.range.x0,D.range.x1);          // keep inside the field width
      if(flight.y<=GROUND_Y&&flight.vy<0){                     // turf bounce
        flight.y=GROUND_Y; flight.vy=-flight.vy*0.45; flight.vx*=0.7; flight.vz*=0.7;
        sBounce();
      }
      let atNet=false;
      if(flight.z<=P.netZ){ flight.z=P.netZ; atNet=true; }      // buried into the net
      const hs=Math.hypot(flight.vx,flight.vz);
      if(atNet||(flight.y<=GROUND_Y+0.01&&hs<1.2&&Math.abs(flight.vy)<1.2)){
        settleFlight();
      }else{
        setBall(flight.i,flight.x,flight.y,flight.z);
      }
    }

    // ---- mini-golf: the putt ball rolling on the felt ----
    if(putt.live){
      const h=putt.hole;
      const oldX=putt.x, oldZ=putt.z;
      putt.x+=putt.vx*dt; putt.z+=putt.vz*dt;
      const k=Math.exp(-PUTT.friction*dt);                     // exponential rolling friction
      putt.vx*=k; putt.vz*=k;
      // RAIL reflection off the (rectilinear) fairway polygon
      if(!pip(putt.x,putt.z,h.fair)){
        const zGuilty=pip(putt.x,oldZ,h.fair);                 // new-x/old-z inside ⇒ the z-move exited
        putt.x=oldX; putt.z=oldZ;
        if(zGuilty)putt.vz=-putt.vz; else putt.vx=-putt.vx;
        putt.vx*=0.75; putt.vz*=0.75;                          // rails absorb a little
        putt.x+=putt.vx*dt; putt.z+=putt.vz*dt;
        if(!pip(putt.x,putt.z,h.fair)){ putt.x=oldX; putt.z=oldZ; }   // corner case: still out → hold
      }
      // OBSTACLE post (windmill shaft / loop base): solid circle, r 0.55
      if(h.obst){
        const dx=putt.x-h.obst[0], dz=putt.z-h.obst[1], d=Math.hypot(dx,dz);
        if(d<0.55&&d>1e-4){
          const nx=dx/d, nz=dz/d;
          putt.x=h.obst[0]+nx*0.55; putt.z=h.obst[1]+nz*0.55;  // push out along the radial
          const vn=putt.vx*nx+putt.vz*nz;
          putt.vx-=2*vn*nx; putt.vz-=2*vn*nz;                  // reflect about the radial normal
          putt.vx*=0.8; putt.vz*=0.8;
        }
      }
      const sp=Math.hypot(putt.vx,putt.vz);
      const cdx=putt.x-h.cup[0], cdz=putt.z-h.cup[1];
      if(Math.hypot(cdx,cdz)<PUTT.cupR&&sp<PUTT.cupSpeed){      // CUP capture — slow enough over the hole
        finishHole(h);
      }else if(sp<0.12){                                        // came to rest (not holed) — leave it where it lies
        putt.live=false;
        setBall(0,putt.x,GROUND_Y,putt.z);
      }else{
        setBall(0,putt.x,GROUND_Y,putt.z);
      }
    }

    // ---- windmill blades (slow decorative spin) ----
    if(blades)blades.rotation.z+=dt*0.6;
  });

  // ------------------------------ JOURNAL ----------------------------- //
  journalSection('diversey','Diversey Golf',()=>{
    let rows=`<div class="jrow"><span>Driving range best</span><b>${Math.round(state.rangeBest||0)} yds</b></div>`;
    let total=0;
    for(const h of holes){
      const st=state.miniStrokes[h.id];
      const done=holed.has(h.id);
      const val = st!=null ? `${st} / par ${h.par}${done?'':' …'}` : `— / par ${h.par}`;
      if(st!=null)total+=st;
      rows+=`<div class="jrow"><span>Mini-golf hole ${h.id}</span><b>${val}</b></div>`;
    }
    rows+=`<div class="jrow"><span>Mini-golf total</span><b>${total} strokes</b></div>`;
    return rows;
  });
});
