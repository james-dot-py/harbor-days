// =====================================================================
// CELLS — the "separate place" pattern (first user: Wrigleyville; the
// bird sanctuary may adopt it — see WRIGLEYVILLE.md / harbor-new.md 5c).
//
// A cell is a far-away chunk of world with its own root Group, walk
// functions, clamp and minimap. Exactly one cell is active; inactive
// cell roots are .visible=false (the NPC-cull primitive, generalized).
// The lakefront is the default cell: its world builders are wrapped by
// begin/endCellCapture in main.js so all their meshes land in one root;
// its walkable/surfaceY/clamp stay null → main.js uses its own logic.
//
// Pack content (NPCs, episodic meshes) is NOT captured — distance culling
// and fog already handle it across a 300+ unit gap.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene } from './core.js';
import { mmSetCell } from './minimap.js';

const cells = {};
let activeId = 'lakefront';
let restoreAdd = null;

// main.js wraps the lakefront builders so the whole built world becomes
// one toggleable root. Sky (before) and the mayor (after) stay global.
export function beginCellCapture() {
  const root = new THREE.Group(); root.name = 'cell-lakefront';
  const orig = scene.add.bind(scene);
  scene.add = (...objs) => { root.add(...objs); return scene; };
  restoreAdd = () => { scene.add = orig; orig(root); };
  cells.lakefront = { id: 'lakefront', root };
}
export function endCellCapture() { restoreAdd(); restoreAdd = null; }

// cell: {id, root, walkable(x,z), surfaceY(x,z), kindAt?(x,z), clamp:{xMin..},
//        spawn, minimapBase:canvas, minimapBounds:{x0,z0,w,h,cw,ch}}
// kindAt returns a surface KIND string ('ice' -> the main.js skate glide) or
// null; it lives in the cell's DATA module so tools read the same answer.
export function registerCell(c) {
  cells[c.id] = c;
  if (c.root) c.root.visible = (c.id === activeId);
}
export const activeCell = () => activeId;
export const getCell = id => cells[id];
// hot-path hooks for main.js (null → lakefront default logic)
export const cellWalk  = () => { const c = cells[activeId]; return (c && c.walkable)  || null; };
export const cellSurf  = () => { const c = cells[activeId]; return (c && c.surfaceY) || null; };
export const cellClamp = () => { const c = cells[activeId]; return (c && c.clamp)    || null; };
export const cellKind  = () => { const c = cells[activeId]; return (c && c.kindAt)   || null; };

// ---------------------------------------------------------------------
// STATIC-GEOMETRY MERGE PASS — collapse a cell's hundreds of small solid
// builder meshes into merged meshes (one per material × ~240 m z-band),
// mirroring the merge pool wrigley/village.js runs internally. ZERO visual
// change: each mesh's world transform is baked into its geometry, so the
// world-curve vertex shader (which works in VIEW space) renders identically.
// Runs ONCE at build (allocation is fine); calls no rng.
//
// EXEMPTIONS — never merged, must stay live meshes:
//   · InstancedMesh / Points / Lines / multi-material  (not candidates)
//   · anything under a node with userData.live — animated builder content
//     (water, bobbers, the dog rig, the ball-players, the W flag, trains…)
//   · anything under a group named 'chibi' — animated character rigs (their
//     merged limbs also carry a per-vertex 'color' attribute)
//   · a material flagged userData.timeAnim — shader-time / local-position
//     displacement (baking a world transform would shift its phase: water)
// Only buckets with >=2 members merge; unique textured signs stay untouched.
// ---------------------------------------------------------------------
export function mergeCellStatic(root, bandW = 240) {
  if (!root) return;
  root.updateMatrixWorld(true);
  const rootInv = root.matrixWorld.clone().invert();
  const _m = new THREE.Matrix4();          // scratch: rootInv × o.matrixWorld
  const _c = new THREE.Vector3();           // scratch: world-space bucket center
  // o (or any ancestor up to AND INCLUDING root) marks the subtree live/chibi?
  const exempt = o => {
    for (let p = o; p; p = p.parent) {
      if ((p.userData && p.userData.live) || p.name === 'chibi') return true;
      if (p === root) return false;
    }
    return false;
  };
  // PASS 1 — collect candidates into buckets (mutate NOTHING)
  const buckets = new Map();
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !o.material) return;
    const g = o.geometry;
    if (!g || !g.attributes || !g.attributes.position) return;
    if (o.material.userData && o.material.userData.timeAnim) return;
    if (exempt(o)) return;
    if (!g.boundingSphere) g.computeBoundingSphere();
    _c.copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld);   // world-space center → z-band
    const sig = Object.keys(g.attributes).sort().join(',');
    // 240 m z-bands (was 120): the fog cull (fogcull.js) now bounds every view
    // to a ~220 m depth bubble, so fine bands no longer buy culling — they just
    // leave sparse same-material props as unmerged singletons, one per band.
    // Compact cells (Wrigleyville, ~200 m deep and invisible from elsewhere)
    // pass a huge bandW: one bucket per material.
    const key = o.material.uuid + '|' + Math.floor(_c.z / bandW) + '|' + sig;
    let b = buckets.get(key); if (!b) buckets.set(key, b = []);
    b.push(o);
  });
  // PASS 2 — merge each bucket with >=2 members; leave singletons untouched
  let before = 0, after = 0;
  for (const b of buckets.values()) {
    if (b.length < 2) continue;
    const geos = [];
    for (const o of b) {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      _m.multiplyMatrices(rootInv, o.matrixWorld);
      g.applyMatrix4(_m);                    // bake world transform (position + normals)
      geos.push(g);
    }
    const merged = BufferGeometryUtils.mergeBufferGeometries(geos, false);
    if (!merged) continue;                   // attribute mismatch: leave the bucket as-is
    before += b.length; after++;
    root.add(new THREE.Mesh(merged, b[0].material));
    for (const o of b) if (o.parent) o.parent.remove(o);   // emptied parent Groups may remain — harmless
  }
  if (before) console.log('[merge] ' + root.name + ': ' + before + ' meshes -> ' + after);
}

export function setActiveCell(id) {
  if (id === activeId || !cells[id]) return cells[activeId];
  activeId = id;
  for (const k in cells) { const c = cells[k]; if (c.root) c.root.visible = (k === id); }
  const c = cells[id];
  mmSetCell(c.minimapBase || null, c.minimapBounds || null);
  return c;
}
