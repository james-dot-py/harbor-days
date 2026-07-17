// =====================================================================
// FOG-DISTANCE CULLING — hide any mesh whose ENTIRE bounding sphere sits
// past the linear fog's far plane in VIEW depth. Task 007 draw-call
// ratchet; a runtime companion to cells.js's build-time static merge.
//
// WHY THIS CHANGES ZERO PIXELS (only draw calls):
//   scene.fog is a THREE.Fog (LINEAR), whose blend factor reaches 1.0 at
//   viewDepth >= fog.far  (viewDepth = -mvPosition.z). Every fragment at
//   or beyond fog.far is therefore painted the pure fog color. If a
//   mesh's whole bounding sphere is beyond fog.far, ALL of its fragments
//   are pure fog color — and so is whatever sits behind them (also >=
//   far). Removing it cannot alter a single pixel; it only drops the
//   draw call. camera.far is 900 while fog.far is ~210, so long sightlines
//   otherwise render hundreds of these pure-fog silhouettes for nothing.
//
//   EXEMPTION: materials with fog:false (sky dome, skyline backdrop,
//   stars, moon, clouds, the W-flag glow) are NOT fogged — they keep
//   full color at any depth, so they must NEVER be culled here.
//
//   MARGIN: the test uses the sphere's near point along the view axis
//   (viewDepth - radius). We require it to clear fog.far by +8 m so
//   radius / curved-world-shader slop can never clip a mesh that still
//   contributes a non-fog pixel.
//
// OWNERSHIP: we touch ONLY the .visible we set ourselves (tagged with
// userData._fogHidden), so we never fight cell toggles or NPC/rig culling.
// =====================================================================
import { scene, camera } from './core.js';

// Scratch Vector3s minted ONCE from an existing vector (camera.position is
// a THREE.Vector3) — lets this module skip a `three` import and still do
// ZERO per-frame allocation (hard constraint 3). Reused in-place below.
const _camPos = camera.position.clone();
const _fwd    = camera.position.clone();
const _center = camera.position.clone();

const REBUILD_EVERY = 2.0;   // s — rescan the scene graph for candidates
const CULL_EVERY    = 0.12;  // s — re-test visibility against the live fog.far
const MARGIN        = 8;     // m — sphere-test safety past fog.far

// Low-power mode (task 085 settings): cull HARDER — pull the cutoff ~48 m INSIDE
// fog.far. Meshes at that depth are already ~80% fog color, so the tradeoff is a
// little popping in the far haze for fewer draw calls on old phones. Off = the
// pixel-neutral MARGIN above; this is the one honest "smoother, slightly less"
// knob the low-power toggle owns.
const LOWPWR_MARGIN = -48;
let _lowPower = false;
export function setLowPowerCull(on){ _lowPower = !!on; }

let registry   = [];             // [{ o, sphere }]; rebuilt on the REBUILD cadence
let rebuildAcc = REBUILD_EVERY;  // seed >= period so both fire on the first frame
let cullAcc    = CULL_EVERY;

// every material (arrays too) is fogged AND normal-blended? fog:false never
// fades → not a candidate. Non-normal blending (additive glows: lamp halos,
// spark points) isn't identity at full fog either — an additive fragment still
// ADDS fog color to the framebuffer, so hiding it would dim real pixels.
function fogged(m){
  if (Array.isArray(m)){ for (const x of m) if (!fogged(x)) return false; return true; }
  return !!m && m.fog !== false && m.blending === 1;   // 1 = THREE.NormalBlending
}

// o sits under a subtree that manages its own visibility — character rigs
// (framework.js NPC/bumpable culling) — or opts out via userData.noFogCull?
// NOTE: userData.live (cells.js) is NOT an exemption here — it means "animates
// its TRANSFORMS, don't bake it into a merge" (boats, bobbers, trains, the
// dog). Nothing manages those objects' .visible, and a bobbing boat past
// fog.far is still pure fog color, so hiding it is exactly as pixel-neutral
// as hiding a static one. We only touch mesh-level .visible we tagged, which
// composes independently with any group-level toggling.
function selfManaged(o){
  if (o.userData && o.userData.noFogCull) return true;
  for (let p = o; p; p = p.parent) if (p.name === 'chibi') return true;
  return false;
}

function rebuild(){
  const reg = [];
  scene.traverse(o => {
    if (!(o.isMesh || o.isPoints || o.isLine)) return;
    // r128 has no instance-aware bounding sphere: an InstancedMesh's geometry
    // sphere says nothing about where its instances sit (often a tiny sphere at
    // the origin), so a depth test on it could hide instances right in front of
    // the camera. They are one draw call each already — never candidates.
    if (o.isInstancedMesh) return;
    const g = o.geometry;
    if (!g || !g.attributes || !g.attributes.position) return;
    // frustumCulled:false marks a world-spanning mesh (LAND, water, kite
    // lines, instanced pack fields): its bounding sphere is huge / useless
    // for this test and the author already opted out of culling — skip it.
    if (o.frustumCulled === false) return;
    if (!fogged(o.material)) return;
    if (selfManaged(o)) return;
    if (!g.boundingSphere) g.computeBoundingSphere();
    if (!g.boundingSphere) return;
    // Include even currently-invisible objects: one we hid ourselves, or a
    // child of an inactive (invisible) cell root. Child .visible composes
    // with ancestor .visible independently, so our child-level flag is safe.
    reg.push({ o, sphere: g.boundingSphere });
  });
  registry = reg;
}

function cull(){
  // fog.far is graded (definePlace lerps it at runtime) — read it LIVE.
  const far = scene.fog ? scene.fog.far : Infinity;
  // camera world position + forward, straight off its world matrix (no alloc).
  const e = camera.matrixWorld.elements;
  _camPos.set(e[12], e[13], e[14]);
  _fwd.set(-e[8], -e[9], -e[10]).normalize();   // camera looks down its own -Z
  const cutoff = far + (_lowPower ? LOWPWR_MARGIN : MARGIN);
  for (let i = 0; i < registry.length; i++){
    const entry = registry[i], o = entry.o, s = entry.sphere;
    // A brand-new object may still carry an identity matrixWorld for up to
    // REBUILD_EVERY s (main.js refreshes world matrices at render time).
    // That merely parks it near the origin, where viewDepth is small and
    // nothing is culled — a harmless transient, never a wrong hide.
    const rad = s.radius * o.matrixWorld.getMaxScaleOnAxis();
    _center.copy(s.center).applyMatrix4(o.matrixWorld);
    const depth = _center.sub(_camPos).dot(_fwd);   // signed view depth of the sphere center
    if (depth - rad > cutoff){
      if (o.visible){ o.visible = false; o.userData._fogHidden = true; }  // hide ONLY if we own the transition
    } else if (o.userData._fogHidden){
      o.visible = true; o.userData._fogHidden = false;                    // restore ONLY what we hid
    }
  }
}

export function updateFogCull(dt){
  rebuildAcc += dt;
  if (rebuildAcc >= REBUILD_EVERY){ rebuildAcc = 0; rebuild(); }
  cullAcc += dt;
  if (cullAcc >= CULL_EVERY){ cullAcc = 0; cull(); }
}

// debug tooling: managed = candidates tracked, hidden = how many are culled now.
export function fogCullStats(){
  let hidden = 0;
  for (let i = 0; i < registry.length; i++) if (registry[i].o.userData._fogHidden) hidden++;
  return { managed: registry.length, hidden };
}
