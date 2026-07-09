// KO-FI SUPPORT — the diegetic rooftop billboard (task 011).
// Real Wrigley rooftops carry big painted ad boards above the bleachers; this
// puts a weathered "SUPPORT DEVELOPMENT ♥" board with a scannable QR atop the
// WEST Waveland brownstone (ROOFTOPS_W.waveland[0]) — NOT the one carrying the
// Lakeview EAMUS CATULI banner (that's on the Sheffield row). Classic-postcard
// palette; the QR panel is drawn from the same precomputed matrix as the L-car
// card (src/qr.js), so a scan of either resolves to KOFI_URL.
//
// The board attaches to wrigleyRoot AFTER buildWrigleyville() (kofi.js is the
// last pack import), so it rides the cell's visibility toggle and adds only a
// handful of live draw calls. No rng — fixed placement, determinism-safe.
import * as THREE from 'three';
import { toon, bmat } from '../core.js';
import { onWorldReady } from '../framework.js';
import { wrigleyRoot } from '../wrigley/index.js';
import { ROOFTOPS_W } from '../data/wrigleyville.js';
import { drawQR, KOFI_URL } from '../qr.js';

const STEEL = 0x54565e, DARK = 0x2a2622;

// The painted ad face: weathered cream board, oxblood headline on the left,
// big white QR panel on the right (drawQR paints its own quiet zone). 840×460 →
// a landscape board; the QR is deliberately large so it survives the ~22 m
// street-to-rooftop viewing distance for the mechanical decode.
function boardTex() {
  const W = 840, H = 460;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#e7dcc0'; g.fillRect(0, 0, W, H);                     // weathered cream field
  // faint painted grain
  for (let i = 0; i < 150; i++) { g.fillStyle = `rgba(120,96,64,${0.02 + Math.abs(Math.sin(i * 12.9)) * 0.05})`; const s = 1 + (i % 3); g.fillRect((i * 61) % W, (i * 137) % H, s, s); }
  g.strokeStyle = '#7a2d22'; g.lineWidth = 9; g.strokeRect(12, 12, W - 24, H - 24);   // painted frame

  // QR panel on the right — mod 12 · quiet 4 → 37×12 = 444 px, framed
  const side = 37 * 12, qx = W - side - 22, qy = (H - side) / 2;
  drawQR(g, qx, qy, 12, { dark: '#141414' });
  g.strokeStyle = '#3a352c'; g.lineWidth = 3; g.strokeRect(qx - 3, qy - 3, side + 6, side + 6);

  // headline block, centred in the column left of the QR panel
  const cxL = qx / 2;
  g.textAlign = 'center'; g.fillStyle = '#7a2d22';
  g.font = '800 62px Georgia,"Times New Roman",serif'; g.fillText('SUPPORT', cxL, 150);
  // "DEVELOPMENT ♥" — shrink-to-fit the column width (PITFALLS: measureText fit)
  let fs = 54; g.font = `800 ${fs}px Georgia,"Times New Roman",serif`;
  while (g.measureText('DEVELOPMENT ♥').width > qx - 40 && fs > 18) { fs -= 2; g.font = `800 ${fs}px Georgia,"Times New Roman",serif`; }
  g.fillText('DEVELOPMENT ♥', cxL, 218);
  g.strokeStyle = '#b8865a'; g.lineWidth = 3; g.beginPath(); g.moveTo(cxL - 120, 250); g.lineTo(cxL + 120, 250); g.stroke();
  g.fillStyle = '#5a4326'; g.font = 'italic 600 26px Georgia,serif'; g.fillText('a harbor days production', cxL, 296);
  g.fillStyle = '#5a4326'; g.font = '700 22px "Trebuchet MS",Arial,sans-serif'; g.fillText(KOFI_URL.replace(/^https?:\/\//, ''), cxL, 350);

  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return tex;
}

onWorldReady(() => {
  const b = ROOFTOPS_W.waveland[0];                        // west brownstone (no EAMUS sign)
  const cx = (b.x0 + b.x1) / 2;                             // -221.5
  const frontZ = b.z1;                                     // -574 (south/park-facing edge)
  const BW = 8.4, BH = 4.6, tilt = 0.38;                   // board size + downward face-tilt
  const cy = 13.0;                                         // rises just above the rooftop bleachers (~11.7)

  // board group: tilt the whole panel to face down toward the street-level
  // viewer (reduces QR keystone; realistic for an angled ad board)
  const grp = new THREE.Group();
  grp.position.set(cx, cy, frontZ + 0.3);
  grp.rotation.x = tilt;
  // physical backing panel (dark steel) — also hides the plane's back face
  const back = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.4, BH + 0.4, 0.28), toon(STEEL));
  back.position.z = -0.16; grp.add(back);
  // the painted face (FrontSide, faces +z-local) with the QR
  const face = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), bmat(0xffffff, { map: boardTex(), fog: false }));
  face.position.z = 0.005; grp.add(face);
  wrigleyRoot.add(grp);

  // two support legs from the roof deck (y 9.6) to the board bottom — one
  // InstancedMesh (1 draw call). Board bottom ≈ cy - BH/2·cos(tilt).
  const legTop = cy - (BH / 2) * Math.cos(tilt) + 0.2, legH = legTop - 9.6;
  const legG = new THREE.BoxGeometry(0.24, legH, 0.24);
  const legs = new THREE.InstancedMesh(legG, toon(DARK), 2);
  const M = new THREE.Matrix4();
  [-BW / 2 + 1.0, BW / 2 - 1.0].forEach((ox, i) => { M.setPosition(cx + ox, 9.6 + legH / 2, frontZ - 0.4); legs.setMatrixAt(i, M); });
  legs.instanceMatrix.needsUpdate = true; wrigleyRoot.add(legs);
});
