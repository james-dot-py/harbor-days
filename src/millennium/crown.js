// =====================================================================
// CROWN FOUNTAIN (SW) — task 045.  The park's most playful landmark:
// two glass-block face-towers facing each other N-S down a long, wet
// black-granite reflecting pool.  This builder owns the STATIC shell:
//   * the two glowing glass-block tower shells (self-lit amber lanterns —
//     bmat, the sanctioned homage escape from the toon ramp, so they read
//     lit-from-within at dusk and never pick up the green ground-bounce
//     that PITFALLS warns bites toon steel);
//   * the wet-mirror pool skim + PAINTED amber tower reflections (homage
//     register — never a computed reflection; layered at distinct y so it
//     never z-fights the granite, the issue-003 discipline);
//   * wood-beam east-rim bench, flanking elm bosques, dusk globe lamps.
// The LIVE layer (LED faces, the spout cycle, splash, soak gag, kid NPCs)
// lives in src/packs/crown-fountain.js — added to millenniumRoot AFTER the
// mergeCellStatic pass so it stays animatable.
//
// COPYRIGHT REGISTER (BRIEF/LOCATIONS owner rule): Plensa's Crown Fountain
// is a copyrighted work — chunky toon HOMAGE only.  Our faces are invented
// toon CITIZENS, absolutely no real-person likenesses; no traced geometry,
// no photo textures.
//
// DETERMINISM: LOCAL mulberry32 only (never the shared world rng — moving a
// single lakefront towel is a hard-constraint regression).  Canvas-texture
// noise consumes the local rng; layout is fixed.
//
// Geometry law: GEOGRAPHY.md MILLENNIUM_GEOGRAPHY + data CROWN_M —
// plaza 57-86 x 838-886, pool 66-73.5 x 847-881, towers h 15.2 facing
// each other down the pool's long axis.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, emitInstanced } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

const _r = mulberry32(0x43524f57);              // 'CROW' — local, never the world rng
const rr = (a, b) => a + (b - a) * _r();

const COL = {
  wood:    0x6b4a30,   // east-rim bench beam
  benchDk: 0x503722,   // bench supports
  trunk:   0x5f4530,   // elm trunk
  elm:     0x3f6f3a,   // elm canopy (bosque green-black mass)
  elmDk:   0x35602f,
  lampPost:0x2a2e30,   // globe-lamp post
};

// ------------------------- glass-block texture -------------------------
// One shared amber glass-block map for BOTH tower shells (same material →
// mergeCellStatic folds the two shells into ONE draw).  Painted as a lit
// lantern: warm vertical glow, a brighter waterline base band, a fine
// mortar grid, per-block brightness jitter — self-lit so it IS the pixels.
function glassBlockTex() {
  const W = 96, H = 320;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, H);       // cool-amber crown → bright waterline
  grd.addColorStop(0.00, '#b9752f');
  grd.addColorStop(0.35, '#d98b38');
  grd.addColorStop(0.72, '#eaa043');
  grd.addColorStop(0.90, '#ffcf7a');                    // waterline bloom
  grd.addColorStop(1.00, '#f6b95e');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const colr = g.createLinearGradient(0, 0, W, 0);      // soft internal light column
  colr.addColorStop(0, 'rgba(255,214,150,0)');
  colr.addColorStop(0.5, 'rgba(255,224,170,0.28)');
  colr.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = colr; g.fillRect(0, 0, W, H);
  const cols = 8, rows = 40, cw = W / cols, ch = H / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {   // per-block brightness jitter
    const b = (_r() - 0.5) * 0.16;
    g.fillStyle = b > 0 ? `rgba(255,236,196,${b.toFixed(3)})` : `rgba(60,34,12,${(-b).toFixed(3)})`;
    g.fillRect(i * cw + 1, j * ch + 1, cw - 2, ch - 2);
  }
  g.strokeStyle = 'rgba(74,44,20,0.5)'; g.lineWidth = 1;            // mortar grid
  for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(0, j * ch + 0.5); g.lineTo(W, j * ch + 0.5); g.stroke(); }
  for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * cw + 0.5, 0); g.lineTo(i * cw + 0.5, H); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// ------------------------- pool skim + reflections ---------------------
// One wet-mirror sheen plane over the pool with the two towers' PAINTED
// amber reflections smeared down-axis toward pool centre — the "mirrors
// their amber glow" read in ONE transparent draw.  u = across (x 66-73.5),
// v = along (z 847-881); towers sit near v≈0.11 (N) and v≈0.89 (S).
function poolSkimTex() {
  const W = 128, H = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, W, H);
  for (let k = 0; k < 22; k++) {                        // faint horizontal sky-streak sheen
    const y = _r() * H, a = 0.02 + _r() * 0.05;
    g.fillStyle = `rgba(214,226,236,${a.toFixed(3)})`;
    g.fillRect(0, y, W, 1 + _r() * 2);
  }
  const smear = (vTower, dir) => {                       // amber reflection streaking to centre
    for (let s = 0; s < 70; s++) {
      const f = s / 70, y = (vTower + dir * f * 0.40) * H;
      const a = 0.82 * (1 - f) * (1 - f), w = (0.26 - 0.11 * f) * W;
      const grd = g.createLinearGradient(W / 2 - w, 0, W / 2 + w, 0);
      grd.addColorStop(0, 'rgba(255,176,86,0)');
      grd.addColorStop(0.5, `rgba(255,196,104,${a.toFixed(3)})`);
      grd.addColorStop(1, 'rgba(255,176,86,0)');
      g.fillStyle = grd; g.fillRect(W / 2 - w, y, 2 * w, H / 80);
    }
  };
  smear(0.11, 1);    // N tower reflection streaks south (toward centre)
  smear(0.89, -1);   // S tower reflection streaks north
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// soft radial amber glow (the tower's light pooling on the wet mirror)
function radialGlowTex() {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,205,130,0.95)');
  grd.addColorStop(0.45, 'rgba(255,176,84,0.5)');
  grd.addColorStop(1, 'rgba(255,160,70,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(cv); return t;
}

// 4-lobe elm canopy, merged once (Chase-promenade precedent)
function makeCanopy() {
  return BufferGeometryUtils.mergeBufferGeometries(
    [[0, 0.1, 0, 1.7], [0.9, 0.2, 0.2, 1.15], [-0.8, 0.05, -0.3, 1.1], [0.15, 0.55, -0.5, 1.0]]
      .map(([x, y, z, r]) => { const s = new THREE.SphereGeometry(r, 8, 6); s.translate(x, y, z); return s; }),
    false);
}

export function buildCrown() {
  const CR = M.CROWN_M;
  const shellMat = bmat(0xffffff, { map: glassBlockTex() });   // shared → both shells merge to 1 draw

  // ---- 1. the two glass-block tower shells (self-lit amber lanterns) ----
  for (const t of CR.towers) {
    const w = t.x1 - t.x0, d = t.z1 - t.z0, cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2;
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, CR.towerH, d), shellMat);
    box.position.set(cx, CR.towerH / 2, cz);
    millenniumRoot.add(box);
    collide(cx, cz, Math.max(w, d) / 2 + 0.5);           // stand IN the pool, can't enter the tower
  }

  // ---- 2. pool skim (wet mirror + painted reflections) -----------------
  // pool granite (COL.pool) sits at y 0.01 (index.js buildGround); float the
  // skim 30 mm proud so it never z-fights (issue-003 layering discipline).
  { const p = CR.pool;
    const skim = new THREE.Mesh(new THREE.PlaneGeometry(p.x1 - p.x0, p.z1 - p.z0, 3, 12),
      bmat(0xffffff, { map: poolSkimTex(), transparent: true, depthWrite: false }));
    skim.rotation.x = -Math.PI / 2;
    skim.position.set((p.x0 + p.x1) / 2, 0.03, (p.z0 + p.z1) / 2);
    skim.renderOrder = 2;
    millenniumRoot.add(skim); }

  // ---- 2b. amber glow pooling at each tower foot — the wet mirror
  // "doubles their amber glow" (BRIEF).  Soft radial amber, one shared
  // material so the two decals merge to a single draw; floated to y 0.05
  // (above the skim, depthWrite off → blends, never z-fights).
  { const glowMat = bmat(0xffb257, { map: radialGlowTex(), transparent: true, opacity: 0.85, depthWrite: false });
    for (const t of CR.towers) {
      const cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2;
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), glowMat);
      gl.rotation.x = -Math.PI / 2; gl.position.set(cx, 0.05, cz); gl.renderOrder = 3;
      millenniumRoot.add(gl);
    } }

  // ---- 3. wood-beam east-rim bench --------------------------------------
  { const b = CR.benches, len = b.z1 - b.z0, cz = (b.z0 + b.z1) / 2;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, len), toon(COL.wood));
    beam.position.set(b.x, 0.44, cz); millenniumRoot.add(beam);
    const supports = [];
    for (let z = b.z0 + 1.5; z <= b.z1 - 1.5; z += 5.5)
      supports.push({ pos: [b.x, 0.2, z], scale: [0.8, 0.4, 0.5], color: COL.benchDk });
    emitInstanced(new THREE.BoxGeometry(1, 1, 1), supports);
    collide(b.x, cz, 0.6); }

  // ---- 4. flanking elm bosques (instanced trunk + 4-lobe canopy) --------
  // Trees hug the OUTER edges of the bosque strips (west x58-62, east x80-84)
  // so the open plaza x63-79 around the narrow pool stays clear — the pool's
  // axial + oblique money framings need a clean lane, and the mp-crown f2
  // corner shot stands at ~x74 (BRIEF camera-trap note: don't wall the pool).
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.34, 3.0, 7); trunkGeo.translate(0, 1.5, 0);
  const trunks = [], canL = [], canD = [];
  const rowZ = [846, 851, 856, 861, 866, 871, 876, 881];
  const plant = (x0, x1, zs) => {
    for (const z of zs) {
      const x = rr(x0, x1), s = rr(0.9, 1.25), dark = _r() < 0.5;
      trunks.push({ pos: [x, 0, z], yaw: rr(0, 6.283), color: COL.trunk });
      (dark ? canD : canL).push({ pos: [x, 3.9 + rr(-0.2, 0.4), z], yaw: rr(0, 6.283), scale: [s, s, s], color: dark ? COL.elmDk : COL.elm });
      collide(x, z, 0.45);
    }
  };
  plant(CR.bosques[0].x0, CR.bosques[0].x0 + 4, rowZ);    // west strip, hug x 58-62
  plant(CR.bosques[1].x1 - 4, CR.bosques[1].x1, rowZ);    // east strip, hug x 80-84
  emitInstanced(trunkGeo, trunks);
  emitInstanced(makeCanopy(), canL);
  emitInstanced(makeCanopy(), canD);

  // ---- 5. dusk globe lamps flanking the pool ends (warm lantern support)
  const lamps = [], globes = [];
  for (const [x, z] of [[65.5, 845], [74.5, 845], [65.5, 883], [74.5, 883]]) {
    lamps.push({ pos: [x, 1.6, z], scale: [0.12, 3.2, 0.12], color: COL.lampPost });
    globes.push({ pos: [x, 3.35, z], scale: [0.4, 0.4, 0.4], color: 0xffe6b0 });
    collide(x, z, 0.3);
  }
  emitInstanced(new THREE.BoxGeometry(1, 1, 1), lamps);
  emitInstanced(new THREE.SphereGeometry(1, 10, 8), globes, { basic: true });   // self-lit warm globes
}
