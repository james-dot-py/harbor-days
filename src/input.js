import { $, renderer, clamp } from './core.js';
import { tryLaunch, setType, FW_TYPES, fw } from './fx.js';

// --------------------------- input -------------------------------------
export const cam={yaw:0,pitch:0.34,dist:8.2,freeT:0};
export const keys=new Set();
export const joy={x:0,z:0,len:0,id:null};
export const jump={buf:0};   // jump request buffer (seconds); main.js consumes it

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

  // orbit: drag anywhere on the canvas (mouse or right-side touch)
  const orb={id:null,lx:0,ly:0};
  renderer.domElement.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    orb.id=e.pointerId;orb.lx=e.clientX;orb.ly=e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove',e=>{
    if(e.pointerId!==orb.id)return;
    const dx=e.clientX-orb.lx,dy=e.clientY-orb.ly;
    orb.lx=e.clientX;orb.ly=e.clientY;
    cam.yaw-=dx*0.0042;
    cam.pitch=clamp(cam.pitch+dy*0.0035,-0.6,0.75);
    cam.freeT=1.6;
  });
  const orbEnd=e=>{if(e.pointerId===orb.id)orb.id=null};
  renderer.domElement.addEventListener('pointerup',orbEnd);
  renderer.domElement.addEventListener('pointercancel',orbEnd);
  addEventListener('wheel',e=>{cam.dist=clamp(cam.dist+e.deltaY*0.012,5,13)},{passive:true});

  // touch joystick
  if('ontouchstart'in window||navigator.maxTouchPoints>0)document.body.classList.add('touch');
  {
    const jz=$('jzone'),stick=$('stick'),nub=$('nub');
    let jOrigin=null;
    function setJoy(tx,ty){
      let dx=tx-jOrigin[0],dy=ty-jOrigin[1];
      const L=Math.hypot(dx,dy),R=48;
      if(L>R){dx*=R/L;dy*=R/L}
      nub.style.left=50+dx/R*50+'%';nub.style.top=50+dy/R*50+'%';
      joy.x=dx/R;joy.z=dy/R;joy.len=Math.min(1,L/R);
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
