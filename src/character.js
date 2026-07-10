import * as THREE from 'three';
import { scene, toon, curveMat, clamp } from './core.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ----------------------- the mayor (our hero) --------------------------
export const mayor=new THREE.Group();
export const mparts={};
let walkT=0;

// ---- draw-call merge helpers (chibi rigs are dozens-in-view at hot spots) ----
// One SHARED white toon material driven by per-vertex color: white × vertex
// color is identical to a per-color toon material under r128's default
// LinearEncoding, so many differently-tinted parts collapse to ONE material and
// each merged limb is a single draw call. Created once (toon() with opts is
// uncached), then reused by every chibi.
let _vcMat=null;
const vcMat=()=>_vcMat||(_vcMat=toon(0xffffff,{mat:{vertexColors:true}}));
// shared white glint material for the mayor's big-eye highlights (basic, no lighting)
let _glintMat=null;
const glintMat=()=>_glintMat||(_glintMat=curveMat(new THREE.MeshBasicMaterial({color:0xffffff})));
// shared detached no-op target for parts.eyeL/eyeR on default (eyes-in-head) rigs:
// setFace()/squint writes .scale on this instead of the head. Never added to a group.
const _eyeDummy=new THREE.Object3D();
const _zAxis=new THREE.Vector3(0,0,1);
// vcGeo(geo,hex): non-index geo + stamp a solid 'color' attribute so it can be
// merged under vcMat. Every chibi primitive has position/normal/uv, so merged
// sets stay attribute-consistent.
function vcGeo(geo,hex){
  geo=geo.toNonIndexed();
  const c=new THREE.Color(hex),n=geo.attributes.position.count,a=new Float32Array(n*3);
  for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(a,3));return geo;
}
const mergeVC=arr=>BufferGeometryUtils.mergeBufferGeometries(arr,false);                         // vcGeo inputs (already non-indexed)
const mergeGeo=arr=>BufferGeometryUtils.mergeBufferGeometries(arr.map(g=>g.index?g.toNonIndexed():g),false); // single-material (no colors)

// stampRanges(geo,ranges,pal): rewrite the 'color' attribute of a cloned template
// geometry with this chibi's palette. ranges = [[start,count,paletteKey],…]; the
// ranges together cover the whole geometry, so a color-agnostic template serves
// every palette. Build-time only (createChibi consumes no rng, no per-frame use).
const _stampC=new THREE.Color();
function stampRanges(geo,ranges,pal){
  const attr=geo.attributes.color;
  for(const [start,count,key] of ranges){
    _stampC.set(pal[key]);
    for(let i=start;i<start+count;i++)attr.setXYZ(i,_stampC.r,_stampC.g,_stampC.b);
  }
  attr.needsUpdate=true;
}

// =====================================================================
//  GLOBAL INSTANCED SHADOW MANAGER
//  Every rig used to carry its own ground-disc Mesh (1 draw call each). They
//  are all the same disc in the same material, so we collapse them into ONE
//  InstancedMesh: each chibi keeps only an empty Object3D stub (parts.shadow)
//  that packs can still hide/remove; updateChibiShadows() (called by main.js
//  each frame) re-stamps one instance matrix per VISIBLE stub. Added to the
//  RAW scene at module-eval time — this runs before main.js's beginCellCapture
//  hijacks scene.add, so the mesh lands on the scene, not inside a cell root.
// =====================================================================
const SHADOW_CAP=256;
const _shadowMesh=new THREE.InstancedMesh(
  new THREE.CircleGeometry(0.62,16),
  curveMat(new THREE.MeshBasicMaterial({color:0x1e4a33,transparent:true,opacity:0.3,depthWrite:false})),
  SHADOW_CAP);
_shadowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
_shadowMesh.frustumCulled=false;      // discs scatter map-wide; the origin bound can't cull them
_shadowMesh.count=0;                  // nothing drawn until the first update
_shadowMesh.name='chibi-shadows';
scene.add(_shadowMesh);
const _shadowStubs=[];                // one empty Object3D per rig (registered by createChibi)
// hoisted scratch — zero per-frame allocation
const _shadowRx=new THREE.Matrix4().makeRotationX(-Math.PI/2);   // disc lies flat in the ground plane
const _shadowMat=new THREE.Matrix4();

// updateChibiShadows() — rebuild the instance buffer from the live stubs. Skips a
// stub if it (or any ancestor) is hidden, or if it is detached from the scene —
// which covers NPC distance-culling, inactive cell roots, and packs that remove
// the stub (pedestals) or set parts.shadow.visible=false (floating/reclined rigs).
// Each instance matrix = stubWorld · rotX(-90°): identical to the old per-rig disc
// (a child at y=0.02, rotation.x=-90°), so the ground shadows render unchanged.
export function updateChibiShadows(){
  let n=0;
  for(let i=0;i<_shadowStubs.length&&n<SHADOW_CAP;i++){
    const stub=_shadowStubs[i];
    let p=stub,ok=false;
    while(p){ if(p.visible===false)break; if(p===scene){ok=true;break;} p=p.parent; }
    if(!ok)continue;                          // hidden ancestor, or not attached to the scene
    stub.updateWorldMatrix(true,false);       // refresh (main.js just moved the rigs this frame)
    _shadowMat.multiplyMatrices(stub.matrixWorld,_shadowRx);
    _shadowMesh.setMatrixAt(n++,_shadowMat);
  }
  _shadowMesh.count=n;
  _shadowMesh.instanceMatrix.needsUpdate=true;
}

// =====================================================================
//  GEOMETRY TEMPLATE CACHE
//  createChibi is called ~100+ times at world build; rebuilding the same
//  vertex-colored merges per rig cost seconds. Build each part's merged
//  geometry ONCE per (hairStyle|bigEyes) key, record the palette-color ranges,
//  then per rig clone + re-stamp the color attribute. Colors are per-vertex so
//  one template serves every palette. Uses no rng (determinism unaffected).
//  Cached: leg (identical L/R), armL/armR (mirrored hand offset), head (head+
//  cheeks+baked hair — varies by hairStyle), eyes/glints (vary by bigEyes),
//  body (plain sphere, colored via its toon material — shared as-is).
// =====================================================================
const _tplCache=new Map();
// hair sub-geometries baked into the HEAD's local frame (head mesh sits at
// y=2.22). Offsets = the old hair mesh position − (0,2.22,0); the head and hair
// bob in lockstep (both +bob*1.1), so folding hair into the head is exact.
function hairSubGeos(style){
  const g=[];
  if(style==='bun'){                                                   // cap + top knot
    const base=new THREE.SphereGeometry(0.585,13,12).scale(1,0.82,1).translate(0,0.18,-0.1);
    const bun =new THREE.SphereGeometry(0.24,9,8).translate(0,0.34,-0.06).translate(0,0.18,-0.1);
    g.push(vcGeo(base,0xffffff),vcGeo(bun,0xffffff));
  }else if(style==='afro'){                                            // compact top-back afro
    const base=new THREE.SphereGeometry(0.42,12,11).scale(1.15,1,1.1).translate(0,0.32,0).translate(0,0.18,-0.16);
    g.push(vcGeo(base,0xffffff));
    for(const s of[-1,1])g.push(vcGeo(new THREE.SphereGeometry(0.15,8,7).translate(s*0.4,0.16,-0.02).translate(0,0.18,-0.16),0xffffff));
    g.push(vcGeo(new THREE.SphereGeometry(0.22,8,7).translate(0,0.10,-0.26).translate(0,0.18,-0.16),0xffffff));
  }else if(style==='afroTex'){
    // mayor only (task 022, owner portrait): short natural afro like 'afro' but
    // with an IRREGULAR textured top silhouette — hand-set tufts break the smooth
    // cap read. Same compact mass; never crosses the face plane at eye height.
    const T=(r,x,y,z)=>vcGeo(new THREE.SphereGeometry(r,9,8).translate(x,y,z),0xffffff);
    g.push(vcGeo(new THREE.SphereGeometry(0.42,12,11).scale(1.16,0.98,1.1).translate(0,0.50,-0.15),0xffffff));
    g.push(T(0.155,-0.41,0.22,-0.16),T(0.155,0.41,0.22,-0.16),T(0.21,0,0.16,-0.40));   // sides + back mass
    g.push(T(0.135,-0.20,0.82,-0.02),T(0.115,0.06,0.87,-0.16),T(0.15,0.28,0.76,-0.06), // top tufts (the silhouette)
           T(0.10,-0.33,0.73,-0.24),T(0.12,-0.02,0.80,0.14),T(0.105,0.40,0.63,-0.26),
           T(0.11,-0.42,0.57,-0.30),T(0.095,0.16,0.84,0.04));
  }else{                                                               // default / tall single dome
    const tall=style==='tall';
    const off=tall?0.28:0.18, sy=tall?1.08:0.82, sxz=tall?1.03:1;
    g.push(vcGeo(new THREE.SphereGeometry(0.585,13,12).scale(sxz,sy,sxz).translate(0,off,-0.1),0xffffff));
  }
  return g;
}
function chibiTemplate(hairStyle,bigEyes,face,detail){
  const key=hairStyle+'|'+bigEyes+'|'+face+'|'+(detail?1:0);
  let t=_tplCache.get(key);if(t)return t;
  t={};
  // detail (mayor only, task 022): extra fidelity sub-geos folded into the SAME
  // merges — brows, shirt cuffs, thumbs, shoe soles — so the draw-call count is
  // unchanged. Fixed-color pieces (cuff/sole/brow) are NOT palette ranges;
  // stampRanges leaves them untouched, exactly like the baked eyes.
  // leg cylinder + shoe sphere -> one merged mesh (identical L/R geometry)
  {
    const legGeo=vcGeo(new THREE.CylinderGeometry(0.15,0.13,0.55,7).translate(0,-0.275,0),0xffffff);
    const shoeGeo=vcGeo(new THREE.SphereGeometry(0.17,8,7).scale(1,0.6,1.35).translate(0,-0.6,0.05),0xffffff);
    const soles=detail?[vcGeo(new THREE.BoxGeometry(0.30,0.05,0.50).translate(0,-0.675,0.07),0x18120d)]:[];
    const lc=legGeo.attributes.position.count,sc=shoeGeo.attributes.position.count;
    t.leg={geo:mergeVC([legGeo,shoeGeo,...soles]),vc:{leg:[0,lc],shoe:[lc,sc]},ranges:[[0,lc,'pants'],[lc,sc,'shoe']]};
  }
  // arm cylinder + hand sphere -> merged mesh; hand offset is MIRRORED so L/R differ
  for(const s of[-1,1]){
    const hl=new THREE.Vector3(s*0.14,-0.6,0).applyAxisAngle(_zAxis,-s*0.25);   // hand offset in the arm's local frame
    const armGeo=vcGeo(new THREE.CylinderGeometry(0.12,0.11,0.6,7).translate(0,-0.3,0),0xffffff);
    const cuffs=detail?[vcGeo(new THREE.CylinderGeometry(0.125,0.125,0.07,7).translate(0,-0.585,0),0xf2efe8)]:[];
    const handGeo=vcGeo(new THREE.SphereGeometry(0.11,7,6).translate(hl.x,hl.y,hl.z),0xffffff);
    const thumbs=detail?[vcGeo(new THREE.SphereGeometry(0.048,6,5).translate(hl.x-s*0.075,hl.y+0.03,hl.z+0.07),0xffffff)]:[];
    const ac=armGeo.attributes.position.count,cc=cuffs.length?cuffs[0].attributes.position.count:0,
          hc=handGeo.attributes.position.count+(thumbs.length?thumbs[0].attributes.position.count:0);
    t['arm'+(s<0?'L':'R')]={geo:mergeVC([armGeo,...cuffs,handGeo,...thumbs]),vc:{arm:[0,ac],hand:[ac+cc,hc]},ranges:[[0,ac,'suit'],[ac+cc,hc,'skin']],hl};
  }
  // head + cheeks + BAKED HAIR -> one vertex-colored mesh (hair rides the head).
  // By DEFAULT the two eye spheres also fold in (colored 0x1d1712 via vertex
  // colors, at the eyes' group spot (0,2.28,0.5) => head-local offset (0,0.06,0.5))
  // — one fewer draw call. face:true keeps them a separate live mesh (below) for
  // rigs that scale eyes (setFace / squint). Eye vertices aren't a palette range,
  // so stampRanges leaves their 0x1d1712 untouched.
  const er=bigEyes?0.088:0.055;
  {
    const headGeo=vcGeo(new THREE.SphereGeometry(0.56,13,12),0xffffff);
    const headN=headGeo.attributes.position.count;
    const cheekGeos=[];
    for(const s of[-1,1])cheekGeos.push(vcGeo(new THREE.SphereGeometry(0.075,6,6).scale(1,1,0.4).translate(s*0.34,-0.10,0.44),0xffffff));
    const cheekN=cheekGeos[0].attributes.position.count*2;
    const hairGeos=hairSubGeos(hairStyle);
    let hairN=0;for(const g of hairGeos)hairN+=g.attributes.position.count;
    const eyeGeos=face?[]:[
      vcGeo(new THREE.SphereGeometry(er,7,7).translate(-0.19,0,0).translate(0,0.06,0.5),0x1d1712),
      vcGeo(new THREE.SphereGeometry(er,7,7).translate( 0.19,0,0).translate(0,0.06,0.5),0x1d1712)];
    // detail: thin arched brows (outer end raised — composed, no-nonsense read).
    // Fixed dark color appended AFTER the palette ranges, like the baked eyes.
    const browGeos=detail?[-1,1].map(s=>{
      const b=new THREE.SphereGeometry(0.072,8,6);b.scale(1.65,0.26,0.45);
      b.rotateZ(s*0.15);b.translate(s*0.19,0.21,0.495);
      return vcGeo(b,0x2b211a);
    }):[];
    t.head={geo:mergeVC([headGeo,...cheekGeos,...hairGeos,...eyeGeos,...browGeos]),
      ranges:[[0,headN,'skin'],[headN,cheekN,'cheek'],[headN+cheekN,hairN,'hair']]};
  }
  // eyes: BOTH pupils in one geometry (single shared toon(0x1d1712) mesh) — only
  // built for face:true rigs (the default folds them into the head above).
  if(face)
    t.eyes=mergeGeo([new THREE.SphereGeometry(er,7,7).translate(-0.19,0,0),new THREE.SphereGeometry(er,7,7).translate(0.19,0,0)]);
  if(bigEyes)   // mayor only: both white glints in one basic mesh (never animate)
    t.glints=mergeGeo([new THREE.SphereGeometry(0.028,5,5).translate(-0.16,0,0),new THREE.SphereGeometry(0.028,5,5).translate(0.16,0,0)]);
  t.body=new THREE.SphereGeometry(0.62,12,11);   // colored via its per-color toon material; shared as-is
  _tplCache.set(key,t);return t;
}

// createChibi — parameterized chibi builder shared by the mayor and the
// framework's makeNPC(). Consumes NO rng (fully deterministic geometry);
// pass explicit palette colors. Static sub-meshes are baked into merges to cut
// draw calls down to SIX by default: legL, legR (each leg+shoe, vcMat), body
// (toon suit), armL, armR (each arm+hand, vcMat) and head (head+cheeks+HAIR+EYES,
// vcMat). Hair AND the two eye pupils fold into the head merge, and the ground
// shadow is a global InstancedMesh (see the shadow manager) — only nodes that
// ANIMATE (legs/arms/body/head) or HOLD props (hands) stay live. parts.hair
// aliases parts.head; parts.eyeL/eyeR point at a shared detached dummy (writes
// no-op). ACCEPTED DELTA: the baked-in eyes now bob/rotate WITH the head during
// the walk gait (previously they floated fixed) — idle rigs are pixel-identical,
// mid-gait rigs get eyes glued to the face (an improvement).
//   face:true — KEEP a separate live eyes mesh (7 draws) for rigs that scale eyes
//   at setup or runtime (setFace / a squint); eyeL/eyeR then === that mesh.
//   parts.shadow is an empty stub tracked by updateChibiShadows().
//   palette:{ suit, pants, skin, hair, shoe?, hairStyle?, scale?, bigEyes?, cheek?, face?, detail? }
//   detail:true (mayor only) folds extra fidelity into the SAME merges (brows,
//   cuffs, thumbs, shoe soles) — identical draw-call count; NPCs (detail:false)
//   get byte-identical geometry to before.
//   returns { group, parts }  (parts: legL/legR (leg+shoe), body, armL/armR
//   (arm+hand), handL/handR (live empty nodes for held items), head (head+
//   cheeks+hair[+eyes]), hair (=head), eyeL/eyeR (dummy, or shared eyes mesh if
//   face:true), shadow (stub))
export function createChibi({suit,pants,skin,hair,shoe=0x57351f,hairStyle,scale=1,bigEyes=false,cheek=0xffa1a1,face=false,detail=false}){
  const group=new THREE.Group(),parts={};group.name='chibi';   // named so the static cell-merge pass can exempt live rigs
  const suitM=toon(suit),tpl=chibiTemplate(hairStyle,bigEyes,face,detail),pal={suit,pants,skin,hair,shoe,cheek};
  // shadow: an empty stub at y=0.02 tracked by the global instanced-shadow manager
  // (packs still remove it / toggle .visible; no per-rig ground disc is drawn).
  const shadow=new THREE.Object3D();shadow.position.y=0.02;group.add(shadow);parts.shadow=shadow;_shadowStubs.push(shadow);
  for(const s of[-1,1]){
    // leg = clone the shared leg template, stamp this rig's pants/shoe colors
    const geo=tpl.leg.geo.clone();stampRanges(geo,tpl.leg.ranges,pal);
    const leg=new THREE.Mesh(geo,vcMat());leg.position.set(s*0.2,0.72,0);
    leg.userData.vc=tpl.leg.vc;group.add(leg);parts['leg'+(s<0?'L':'R')]=leg;
  }
  const body=new THREE.Mesh(tpl.body,suitM);body.scale.set(1,1.12,0.82);body.position.y=1.18;group.add(body);parts.body=body;
  for(const s of[-1,1]){
    const at=tpl['arm'+(s<0?'L':'R')];
    const geo=at.geo.clone();stampRanges(geo,at.ranges,pal);
    const arm=new THREE.Mesh(geo,vcMat());arm.position.set(s*0.62,1.62,0);arm.rotation.z=s*0.25;
    arm.userData.vc=at.vc;group.add(arm);parts['arm'+(s<0?'L':'R')]=arm;
    // hand stays a LIVE empty node at the baked hand position: packs parent held
    // props into it (and read its world pos); it swings with the arm for free.
    const hand=new THREE.Group();hand.position.copy(at.hl);arm.add(hand);parts['hand'+(s<0?'L':'R')]=hand;
  }
  // head + cheeks + hair merged into ONE vcMat mesh; hair bobs with the head.
  const headGeo=tpl.head.geo.clone();stampRanges(headGeo,tpl.head.ranges,pal);
  const head=new THREE.Mesh(headGeo,vcMat());head.position.y=2.22;group.add(head);parts.head=head;
  parts.hair=head;   // hair is baked into the head geometry — alias so pack reads still resolve
  // eyes: DEFAULT folds both pupils into the head merge (parts.eyeL/eyeR point at
  // a shared detached dummy, so stray setFace/scale writes are harmless no-ops —
  // they must NOT alias the head, or scaling eyes would scale the whole head).
  // face:true keeps them a separate live mesh that setFace() scales per-expression
  // (accepted quirk there: 'surprised' 1.3× widens spacing ~0.057 m per eye).
  if(face){
    const eyes=new THREE.Mesh(tpl.eyes,toon(0x1d1712));eyes.position.set(0,2.28,0.5);group.add(eyes);
    parts.eyeL=parts.eyeR=eyes;
  }else parts.eyeL=parts.eyeR=_eyeDummy;
  if(bigEyes){const gl=new THREE.Mesh(tpl.glints,glintMat());gl.position.set(0,2.32,0.55);group.add(gl);}
  if(scale!==1)group.scale.setScalar(scale);
  return {group,parts};
}

// tintChibiLimb(mesh,part,hex): recolor one baked sub-range of a merged limb
// (part='leg'|'shoe'|'arm'|'hand') by rewriting its 'color' vertices — leaves
// the other baked part (e.g. skin hand / shoe) untouched. Rare call (jersey
// recycling); no per-frame use.
export function tintChibiLimb(mesh,part,hex){
  const range=mesh.userData.vc&&mesh.userData.vc[part];if(!range)return;
  const [start,count]=range,c=new THREE.Color(hex),attr=mesh.geometry.attributes.color;
  for(let i=start;i<start+count;i++)attr.setXYZ(i,c.r,c.g,c.b);
  attr.needsUpdate=true;
}

// bakeChibiRig(group,parts,{keepEyes}) — collapse a fully POSED, NEVER-re-posed
// rig into ONE vertex-colored mesh (7 draws -> 1, +1 shared shadow instance).
// Call AFTER the pack has posed the rig AND attached its solid-color props
// (sunglasses / cups / clubs, parented into head/hands). Every descendant mesh's
// transform RELATIVE TO THE GROUP is baked into a merged geometry under the
// shared vcMat — the same bake-the-transform trick as cells.js mergeCellStatic,
// but group-relative, so a floater/drifter's group can keep moving. Textured
// (.map) meshes stay live; with keepEyes:true the eyes mesh also stays live (a
// 1-draw mesh, for rigs that still setFace at runtime -> net 7->2). parts.head/
// hair become an empty at the head's old local transform (registerBumpable reads
// its world position; props parented to it before the bake get baked in); hands
// stay as empties under the group; parts.shadow stub is untouched. Uses NO rng;
// build-time only (allocation here is fine) and a no-op until called.
//   ONLY safe for rigs whose parts are never referenced again after setup —
//   audit each pack's registerUpdate/interaction closures first.
const _bakeWhite=new THREE.Color(0xffffff);
export function bakeChibiRig(group,parts,{keepEyes=false}={}){
  group.updateWorldMatrix(true,true);
  const gInv=new THREE.Matrix4().copy(group.matrixWorld).invert(),lm=new THREE.Matrix4();
  // capture the hand empties' group-local transforms while their arms are still attached
  const hands=[];
  for(const h of[parts.handL,parts.handR])
    if(h)hands.push([h,new THREE.Matrix4().multiplyMatrices(gInv,h.matrixWorld)]);
  const eyesMesh=parts.eyeL;                           // eyeL===eyeR (one merged eyes mesh)
  const geos=[],sources=[];
  group.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh)return;
    if(keepEyes&&o===eyesMesh)return;                  // keep the eyes a live 1-draw mesh
    const mat=o.material;
    if(!mat||Array.isArray(mat)||mat.map)return;       // textured / multi-material -> keep live
    const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
    g.applyMatrix4(lm.multiplyMatrices(gInv,o.matrixWorld));   // bake the transform (position + normals) into the group frame
    if(!g.attributes.color){                           // vcMat limbs already carry 'color'; solid props get theirs stamped
      const c=mat.color||_bakeWhite,n=g.attributes.position.count,a=new Float32Array(n*3);
      for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}
      g.setAttribute('color',new THREE.BufferAttribute(a,3));
    }
    geos.push(g);sources.push(o);
  });
  if(!geos.length)return;
  const merged=BufferGeometryUtils.mergeBufferGeometries(geos,false);
  if(!merged){console.warn('[bakeChibiRig] merge failed — rig left live');return;}
  const baked=new THREE.Mesh(merged,vcMat());baked.name='chibi-baked';group.add(baked);
  for(const o of sources)if(o.parent)o.parent.remove(o);
  // head -> empty at its old local transform (bubble anchor / late registerBumpable)
  const head=parts.head;
  if(head){
    const e=new THREE.Object3D();
    e.position.copy(head.position);e.quaternion.copy(head.quaternion);e.scale.copy(head.scale);
    group.add(e);parts.head=e;parts.hair=e;
  }
  // hands stay live empties under the group (their props are baked in now)
  for(const[h,m]of hands){group.add(h);m.decompose(h.position,h.quaternion,h.scale);}
  // eyes (when not kept): eyeL/eyeR now reference the removed, detached mesh — any
  // stray setFace/scale write is a harmless no-op; nothing reads them on a baked rig.
}

export function buildMayor(){
  // build the shared chibi with the mayor's EXACT palette, then reparent its
  // parts directly onto `mayor` (keeps the historical flat hierarchy + no rng).
  // the mayor (owner portrait, task 022): warm dark brown skin, short textured
  // grey afro, big beady eyes, thin composed brows, charcoal suit over a white
  // collared shirt. detail:true = mayor-only template extras folded into the
  // shared merges (zero extra draw calls; NPC output untouched).
  const {group,parts}=createChibi({suit:0x484850,pants:0x3a3a41,skin:0x6e4632,hair:0xb5aea6,shoe:0x241b13,hairStyle:'afroTex',bigEyes:true,cheek:0xa1614c,face:true,detail:true});   // face:true keeps the separate eyes mesh aligned with the (non-bobbing) glints
  while(group.children.length)mayor.add(group.children[0]);
  Object.assign(mparts,parts);
  // suit front (owner portrait — REPLACES the old sash/star/tie regalia): charcoal
  // notched lapels over a white shirt V + collar, jacket buttons, small round gold
  // pin on the wearer's-left lapel. ONE merged vertex-colored mesh under vcMat =
  // 1 draw call (the regalia was 3). Flat-parented like the old regalia so the
  // body sphere's breathing scale never distorts it. Pinstripes skipped: they
  // don't read at chibi scale without texture maps (plain charcoal is right).
  {
    const SHIRT=0xf2efe8,LAPEL=0x37373e,BTN=0x1b1916,GOLD=0xd9a83c;
    const g=[];
    const shirt=new THREE.BoxGeometry(0.17,0.34,0.05);shirt.rotateX(-0.38);shirt.translate(0,1.57,0.43);
    g.push(vcGeo(shirt,SHIRT));
    for(const s of[-1,1]){
      const lap=new THREE.BoxGeometry(0.13,0.38,0.05);            // lapel: top leans outward, bottom meets the button line
      lap.rotateZ(-s*0.30);lap.rotateY(s*0.35);lap.rotateX(-0.30);lap.translate(s*0.185,1.50,0.44);
      g.push(vcGeo(lap,LAPEL));
      const notch=new THREE.BoxGeometry(0.115,0.075,0.05);        // notch flap, near-horizontal at the lapel top
      notch.rotateZ(-s*1.15);notch.rotateY(s*0.35);notch.translate(s*0.26,1.70,0.38);
      g.push(vcGeo(notch,LAPEL));
      const col=new THREE.BoxGeometry(0.085,0.11,0.045);          // white collar point above the lapel
      col.rotateZ(-s*0.55);col.rotateX(-0.25);col.translate(s*0.095,1.74,0.37);
      g.push(vcGeo(col,SHIRT));
    }
    g.push(vcGeo(new THREE.SphereGeometry(0.032,7,6).translate(0,1.35,0.50),BTN));
    g.push(vcGeo(new THREE.SphereGeometry(0.032,7,6).translate(0,1.22,0.515),BTN));
    const pin=new THREE.CylinderGeometry(0.036,0.036,0.03,10);
    pin.rotateX(Math.PI/2);pin.rotateY(0.35);pin.translate(0.245,1.60,0.43);
    g.push(vcGeo(pin,GOLD));
    const suitFront=new THREE.Mesh(mergeVC(g),vcMat());mayor.add(suitFront);
  }
  mayor.scale.setScalar(0.74);
  mayor.position.set(38.5,0,58);
  scene.add(mayor);
}

// ---- walk / idle animation (per frame) ----
export function updateCharacter(sp,dt,t){
  walkT+=sp*dt*2.6;
  const amt=clamp(sp/4.2,0,1.25),sw=Math.sin(walkT)*amt;
  mparts.legL.rotation.x=sw*0.85;mparts.legR.rotation.x=-sw*0.85;
  mparts.armL.rotation.x=-sw*0.75;mparts.armR.rotation.x=sw*0.75;
  const bob=Math.abs(Math.sin(walkT))*0.06*amt;
  mparts.body.position.y=1.18+bob;
  mparts.head.position.y=2.22+bob*1.1;   // hair is baked into the head — it rides this bob
  mparts.body.rotation.x=0.09*amt;
  if(amt<0.05)mparts.body.scale.y=1.12+Math.sin(t*2)*0.012;
}
