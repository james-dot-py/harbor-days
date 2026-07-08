import * as THREE from 'three';

/* =====================================================================
   HARBOR DAYS v0.4 — the real lakefront (see GEOGRAPHY.md)
   Belmont Harbor + AIDS Garden Chicago. Chase camera, stepped revetment
   terraces with sheet-pile edge, minimap, skyline. Three.js r128.
   1 unit = 1 meter.
   ===================================================================== */

export const CURV = 0.0009;
export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export const rng = mulberry32(20260704);
export const rand = (a,b)=>a+(b-a)*rng();
export const lerp = (a,b,t)=>a+(b-a)*t;
export function lerpAngle(a,b,t){let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return a+d*t}
export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth = t=>t*t*(3-2*t);
export function hexRGB(h){return[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255]}
export function pip(px,pz,poly){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],zi=poly[i][1],xj=poly[j][0],zj=poly[j][1];if(((zi>pz)!==(zj>pz))&&(px<(xj-xi)*(pz-zi)/(zj-zi)+xi))ins=!ins}return ins}
export const $ = id=>document.getElementById(id);
export const WATER_Y = -2.3;

// shared mutable game state (late-bound reads across modules)
export const game = {running:false, tNow:0};

// --------------------------- renderer/scene ---------------------------
export const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.setClearColor(0xffb98a);
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf6ab84,55,210);
export const camera = new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,900);

// hemisphere: dusk-lavender sky above, soft green lawn bounce below — sits every
// object in the same light. Keeps .intensity so the fireworks pulse still works.
export const amb = new THREE.HemisphereLight(0x9f92d6,0x8fc98e,0.9);scene.add(amb);
export const sun = new THREE.DirectionalLight(0xffd9ae,0.95);
sun.position.set(-60,80,40);scene.add(sun);

// ------------------------- material helpers ---------------------------
export function curveMat(m,opts={}){
  if(opts.time)m.userData.timeAnim=true;   // flag at CREATION (onBeforeCompile is too late for the build-time cell-merge check)
  m.onBeforeCompile=sh=>{
    sh.uniforms.uCurv={value:CURV};
    let head='#include <common>\nuniform float uCurv;';
    if(opts.time){sh.uniforms.uTime={value:0};m.userData.sh=sh;head+='\nuniform float uTime;';}
    sh.vertexShader=sh.vertexShader.replace('#include <common>',head);
    if(opts.wave){
      sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed.y += sin(position.x*0.5+uTime*1.5)*0.13 + sin(position.z*0.38+uTime*1.1)*0.1 + sin((position.x+position.z)*0.21+uTime*0.7)*0.06;');
    }
    sh.vertexShader=sh.vertexShader.replace('gl_Position = projectionMatrix * mvPosition;',
      'mvPosition.y -= uCurv * mvPosition.z * mvPosition.z;\n\tgl_Position = projectionMatrix * mvPosition;');
  };
  return m;
}
export const gmap=new THREE.DataTexture(new Uint8Array([95,95,95,175,175,175,255,255,255]),3,1,THREE.RGBFormat);
gmap.minFilter=gmap.magFilter=THREE.NearestFilter;gmap.needsUpdate=true;
const _tc={};
export function toon(c,opts){if(!opts&&_tc[c])return _tc[c];const m=curveMat(new THREE.MeshToonMaterial(Object.assign({color:c,gradientMap:gmap},opts&&opts.mat)),opts||{});if(!opts)_tc[c]=m;return m}
export function bmat(c,o){const m=new THREE.MeshBasicMaterial(Object.assign({color:c},o));return curveMat(m)}

export const glowTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');
  const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.35,'rgba(255,255,255,.65)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(cv)})();

const PT_VERT=`attribute float aSize;attribute vec3 aColor;varying vec3 vColor;uniform float uCurv;
void main(){vColor=aColor;vec4 mv=modelViewMatrix*vec4(position,1.0);mv.y-=uCurv*mv.z*mv.z;
gl_PointSize=aSize*(240.0/max(1.0,-mv.z));gl_Position=projectionMatrix*mv;}`;
const PT_FRAG=`uniform sampler2D uTex;varying vec3 vColor;
void main(){vec4 t=texture2D(uTex,gl_PointCoord);gl_FragColor=vec4(vColor*t.a,t.a);}`;
export function pointsMat(){return new THREE.ShaderMaterial({uniforms:{uTex:{value:glowTex},uCurv:{value:CURV}},
  vertexShader:PT_VERT,fragmentShader:PT_FRAG,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true})}
