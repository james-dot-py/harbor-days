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

// cell: {id, root, walkable(x,z), surfaceY(x,z), clamp:{xMin..}, spawn,
//        minimapBase:canvas, minimapBounds:{x0,z0,w,h,cw,ch}}
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

export function setActiveCell(id) {
  if (id === activeId || !cells[id]) return cells[activeId];
  activeId = id;
  for (const k in cells) { const c = cells[k]; if (c.root) c.root.visible = (k === id); }
  const c = cells[id];
  mmSetCell(c.minimapBase || null, c.minimapBounds || null);
  return c;
}
