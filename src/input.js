import { $, renderer, clamp } from './core.js';
import { tryLaunch, setType, FW_TYPES, fw } from './fx.js';

// --------------------------- input -------------------------------------
// cam.lookPx — odometer of touch-drag pixels this session. Onboarding reads it
// to know the player has discovered "drag to look" (src/onboard.js); nothing
// else consumes it.
export const cam={yaw:0,pitch:0.34,dist:8.2,freeT:0,lookPx:0};
export const keys=new Set();
export const joy={x:0,z:0,len:0,id:null};
export const jump={buf:0};   // jump request buffer (seconds); main.js consumes it

// ---- touch FEEL (task 077) — tuned against an iPhone-class 390x844 viewport.
// The values are split from the mouse deliberately: a thumb travels a fraction
// of the distance a mouse does, so shared sensitivity made "drag to look" feel
// like dragging a fridge on a phone while being right on a desktop.
//   TOUCH_YAW 0.0060 rad/px — a 150 px thumb swipe (a comfortable one-handed
//     arc) turns ~52°; a full 390 px screen-width swipe turns ~134°.
//     The mouse KEEPS its original 0.0042 — desktop feel is unchanged.
//   TOUCH_PIT 0.0045 rad/px — pitch has only 1.35 rad of total travel, so it
//     stays slower than yaw or one swipe slams into the clamp.
//   GLIDE_TAU 0.16 s — e-folding time of the post-release coast; a flick keeps
//     travelling ~0.4 s and settles. Without it, every look ends in a dead
//     stop the moment the thumb lifts, which is what reads as "cheap" on a
//     phone. GLIDE_MAX caps a frantic flick; below GLIDE_MIN the coast is
//     dropped so the camera never creeps on its own.
const TOUCH_YAW=0.0060, TOUCH_PIT=0.0045;
const MOUSE_YAW=0.0042, MOUSE_PIT=0.0035;
const GLIDE_TAU=0.16, GLIDE_MIN=0.05, GLIDE_MAX=7;
const PITCH_LO=-0.6, PITCH_HI=0.75;
const JOY_R=48;        // stick radius in px — full deflection
const JOY_DEAD=5;      // px of slop at the origin: kills thumb tremor at rest
                       // without eating a deliberate nudge (~10% of the throw)

const orb={id:null,lx:0,ly:0,lt:0,touch:false};
const glide={vy:0,vp:0};

// updateCam(dt) : main.js calls this once per frame, before it places the chase
// camera. Applies the touch look-inertia; a no-op on desktop and while a finger
// is still down.
export function updateCam(dt){
  if(orb.id!==null||(glide.vy===0&&glide.vp===0))return;
  cam.yaw+=glide.vy*dt;
  cam.pitch=clamp(cam.pitch+glide.vp*dt,PITCH_LO,PITCH_HI);
  const k=Math.exp(-dt/GLIDE_TAU);
  glide.vy*=k;glide.vp*=k;
  if(Math.abs(glide.vy)<GLIDE_MIN&&Math.abs(glide.vp)<GLIDE_MIN)glide.vy=glide.vp=0;
}

export function initInput(){
  addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
    keys.add(k);
    if(k>='1'&&k<='4')setType(+k-1);
    if(k==='f')tryLaunch();
    if(k===' '&&!e.repeat)jump.buf=0.14;
  });
  addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

  // orbit: drag anywhere on the canvas (mouse or right-side touch).
  // Zone arbitration: #jzone is a real element stacked over the canvas, so a
  // touch that starts on the joystick targets IT and this handler never fires —
  // walking can never be stolen by the look camera. The single-pointer guard
  // below is the other half: a second finger landing on the canvas mid-drag
  // used to hijack orb.id, so the first finger's motion was dropped and the
  // camera jumped. First finger down wins until it lifts.
  renderer.domElement.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(orb.id!==null)return;
    orb.id=e.pointerId;orb.lx=e.clientX;orb.ly=e.clientY;orb.lt=e.timeStamp;
    orb.touch=e.pointerType!=='mouse';
    glide.vy=glide.vp=0;   // grabbing the world stops any coast dead
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove',e=>{
    if(e.pointerId!==orb.id)return;
    const dx=e.clientX-orb.lx,dy=e.clientY-orb.ly;
    orb.lx=e.clientX;orb.ly=e.clientY;
    const sy=orb.touch?TOUCH_YAW:MOUSE_YAW,sp=orb.touch?TOUCH_PIT:MOUSE_PIT;
    cam.yaw-=dx*sy;
    cam.pitch=clamp(cam.pitch+dy*sp,PITCH_LO,PITCH_HI);
    cam.freeT=1.6;
    if(orb.touch){
      cam.lookPx+=Math.abs(dx)+Math.abs(dy);
      // sample the instantaneous angular rate to hand to the coast on release
      const st=Math.max(0.008,(e.timeStamp-orb.lt)/1000);orb.lt=e.timeStamp;
      glide.vy=clamp(-dx*sy/st,-GLIDE_MAX,GLIDE_MAX);
      glide.vp=clamp(dy*sp/st,-GLIDE_MAX,GLIDE_MAX);
    }
  });
  // release: the glide survives (that IS the inertia). A stale flick from a
  // thumb that stopped before lifting would coast wrongly, so drop it when the
  // last movement sample is old.
  const orbEnd=e=>{
    if(e.pointerId!==orb.id)return;
    orb.id=null;
    if(orb.touch&&e.timeStamp-orb.lt>90)glide.vy=glide.vp=0;
  };
  renderer.domElement.addEventListener('pointerup',orbEnd);
  renderer.domElement.addEventListener('pointercancel',orbEnd);
  addEventListener('wheel',e=>{cam.dist=clamp(cam.dist+e.deltaY*0.012,5,13)},{passive:true});

  // touch joystick
  if('ontouchstart'in window||navigator.maxTouchPoints>0)document.body.classList.add('touch');
  {
    const jz=$('jzone'),stick=$('stick'),nub=$('nub');
    let jOrigin=null;
    function setJoy(tx,ty){
      const dx=tx-jOrigin[0],dy=ty-jOrigin[1];
      const L=Math.hypot(dx,dy);
      if(L<=JOY_DEAD){joy.x=joy.z=joy.len=0;nub.style.left='50%';nub.style.top='50%';return;}
      // ramp 0->1 across the live throw (dead ring -> rim), direction from the
      // unit vector, so the stick can't jump to full tilt out of the dead zone
      const c=Math.min(1,(L-JOY_DEAD)/(JOY_R-JOY_DEAD)),ux=dx/L,uy=dy/L;
      nub.style.left=50+ux*c*50+'%';nub.style.top=50+uy*c*50+'%';
      joy.x=ux*c;joy.z=uy*c;joy.len=c;
    }
    jz.addEventListener('touchstart',e=>{
      const t=e.changedTouches[0];joy.id=t.identifier;jOrigin=[t.clientX,t.clientY];
      stick.style.display='block';stick.style.left=t.clientX+'px';stick.style.top=t.clientY+'px';
      e.preventDefault();
    },{passive:false});
    jz.addEventListener('touchmove',e=>{
      for(const t of e.changedTouches)if(t.identifier===joy.id)setJoy(t.clientX,t.clientY);
      e.preventDefault();
    },{passive:false});
    const jEnd=e=>{for(const t of e.changedTouches)if(t.identifier===joy.id){joy.id=null;joy.x=joy.z=joy.len=0;stick.style.display='none'}};
    jz.addEventListener('touchend',jEnd);jz.addEventListener('touchcancel',jEnd);
    $('btnFire').addEventListener('touchstart',e=>{tryLaunch();e.preventDefault()},{passive:false});
    $('btnType').addEventListener('touchstart',e=>{setType((fw.type+1)%FW_TYPES.length);e.preventDefault()},{passive:false});
    $('btnJump').addEventListener('touchstart',e=>{jump.buf=0.14;e.preventDefault()},{passive:false});
  }
}
