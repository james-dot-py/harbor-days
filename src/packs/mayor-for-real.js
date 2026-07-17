// =====================================================================
//  PACK: mayor-for-real — "MAYOR FOR REAL" (task 081, the questline)
//  The punchline is canon: the mayor earned the charcoal suit (022 retired the
//  old light-blue sash + red star regalia); now they earn the SASH back by
//  being a neighbor across the whole city. Four CITY STAMPS (one per hood, each
//  = ≥2 favors done + that hood's signature activity paid), then a swear-in
//  ceremony on the AIDS-Garden forecourt hands back the mayoral regalia.
//
//  Only-my-file rules: this pack owns mayor-for-real.js + one additive hook in
//  characters.js (saxHooks). ALL setup inside onWorldReady; Math.random only for
//  the session crowd (NEVER the world rng). Persistence is the store.js FLAGS
//  (ope.stamp.<hood>) + the framework bag/worn (the regalia) — no coords, no new
//  save fields. Draw budget: the regalia is ONE merged vertex-colored mesh (1
//  draw, hats.js recipe) parented to `mayor`; the crowd is session-only makeNPCs
//  (frustum-culled), the confetti rides fx.js's existing Points ring — zero new
//  InstancedMesh buckets.
//
//  DEBUG (tools / E2E only): window.__hd.mayor4real = { stamps(), grant(hood)
//  [flag-only, for E2E], ceremonyReady(), ceremony(), crowd(), ... }. Never
//  auto-grants anything itself.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, toast, journalSection,
         bag, wallet, state, screenFx, favors } from '../framework.js';
import { toon, hexRGB } from '../core.js';
import { mayor } from '../character.js';              // 022 mayor-only: the regalia parents to the mayor
import { FX, tryLaunch } from '../fx.js';             // the shared confetti Points ring + firework launcher
import { getFlag, setFlag } from '../store.js';       // the one legal storage door — stamp persistence
import { saxHooks } from './characters.js';           // the sax busker (relocated for the ceremony)

// --------------------------- the four city hoods -----------------------
// A stamp is granted when BOTH: ≥2 favors of that hood are `done` (the roster
// ids below; 'oldstyle' — the pilot favor — counts for lakefront) AND the hood's
// signature activity has paid its first (state.paidFirsts[sig]).
const HOODS = [
  { id: 'lakefront', display: 'the lakefront', ids: ['oldstyle', 'loveletter', 'divvyangel', 'lakeglass'],
    sig: 'stones',        need: 'skip a stone at the Rocks',
    stampSub: "two favors + a skipped stone. that's a neighborhood." },
  { id: 'wrigley',   display: 'Wrigleyville', ids: ['umpwhistle', 'poppybuns'],
    sig: 'wrigley.ticket', need: 'catch some Cubs (a ticket counts)',
    stampSub: 'two favors + a Cubs ticket. Wrigley knows your face.' },
  { id: 'downtown',  display: 'downtown', ids: ['chalkbag', 'drumstick', 'recipeglide'],
    sig: 'ice.hop',        need: 'land a hop-spin on the ice',
    stampSub: 'two favors + a hop-spin. downtown remembers you.' },
  { id: 'montrose',  display: 'Montrose', ids: ['fieldnotes', 'baitphoto'],
    sig: 'kite',           need: 'fly a kite off Cricket Hill',
    stampSub: 'two favors + a kite. Montrose waves back.' },
];
// the pooled favor ids (the whole roster minus the never-pooled pilot) — the
// journal page + section trigger read these, so they don't depend on any sibling
// pack having registered/joined yet (they may still be in development in parallel).
const POOLED = ['loveletter', 'divvyangel', 'lakeglass', 'umpwhistle', 'poppybuns',
                'chalkbag', 'drumstick', 'recipeglide', 'fieldnotes', 'baitphoto'];

// favors.at tolerates unregistered ids ({st:'none'} — reads the save blob, not the
// registered defs), so a mid-development roster (parallel executors) never throws.
const favSt = id => favors.at(id).st;
const isStamped = h => getFlag('ope.stamp.' + h) === '1';
const sigDone = key => !!(state.paidFirsts && state.paidFirsts[key]);
const favorsDone = h => h.ids.filter(id => favSt(id) === 'done').length;

// ============================ THE REGALIA ==============================
//  hats.js recipe: primitives -> paint() a solid per-vertex color -> bake the
//  transform in -> mergeBufferGeometries the lot under ONE shared white
//  vertexColors toon material = 1 draw call. Parented to `mayor` (NOT the head,
//  NOT the body — the body breathes; the 022 suit-front precedent flat-parents
//  to `mayor`, so the sash rides walk/jump/sit/skate rigidly like the jacket).
const SASH = 0x8ecae6, EDGE = 0x3f7fb0, STARC = 0xc23b45, GOLD = 0xd9a83c;   // Chicago-flag light blue + red six-point star + gold pin
let _vc = null;
const vc = () => _vc || (_vc = toon(0xffffff, { mat: { vertexColors: true } }));
const _pc = new THREE.Color();
function paint(geo, hex) {
  geo = geo.toNonIndexed();
  _pc.set(hex);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _pc.r; a[i * 3 + 1] = _pc.g; a[i * 3 + 2] = _pc.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const merge = parts => BufferGeometryUtils.mergeBufferGeometries(parts, false);

// the mayor body sphere is r0.62 scaled (1,1.12,0.82) centred at y1.18 — front
// surface z at height y (so the sash hugs the torso instead of floating/sinking).
function bodyFrontZ(y) {
  const dyN = (y - 1.18) / 0.694, h = Math.sqrt(Math.max(0, 1 - dyN * dyN));
  return 0.5084 * h;
}
// a six-point star (Chicago flag): 12 alternating outer/inner points, extruded thin.
function star6(oR, iR) {
  const s = new THREE.Shape();
  for (let i = 0; i < 12; i++) {
    const r = (i % 2 === 0) ? oR : iR, a = Math.PI / 2 + i * Math.PI / 6;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) s.moveTo(px, py); else s.lineTo(px, py);
  }
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
}
let _regalia = null;
function buildRegalia() {
  const parts = [];
  // diagonal band: right shoulder (wearer's right = -x, high) -> left hip (+x, low).
  const TOP = { x: -0.27, y: 1.72 }, BOT = { x: 0.31, y: 1.24 };
  const phi = Math.atan2(BOT.y - TOP.y, BOT.x - TOP.x);
  // The band is a piped ribbon: a light-blue CORE with two continuous darker-blue
  // EDGE stripes. Every strip is one box tiled along the diagonal (10 segments,
  // tight overlap so the chord seams vanish); the edge stripes are offset along the
  // band's rotated CROSS-AXIS (never world-y — that was the shard bug) and ABUT the
  // core at the same z, so there is no overlap and no z-fighting. Front + back match.
  const N = 10, bandW = 0.15, edgeW = 0.032, coreW = bandW - 2 * edgeW, dep = 0.05;
  const len = Math.hypot(BOT.x - TOP.x, BOT.y - TOP.y), segLen = len / N * 1.35;
  const cx = -Math.sin(phi), cy = Math.cos(phi);          // band cross-axis (unit, in the XY plane)
  const eoff = coreW / 2 + edgeW / 2;                      // edge-stripe centre offset from the band centre
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const x = TOP.x + (BOT.x - TOP.x) * t, y = TOP.y + (BOT.y - TOP.y) * t;
    const zf = Math.min(bodyFrontZ(y) + 0.02, 0.49);
    const zb = Math.max(-(bodyFrontZ(y) + 0.02), -0.49);
    for (const z of [zf, zb]) {
      const core = new THREE.BoxGeometry(segLen, coreW, dep); core.rotateZ(phi); core.translate(x, y, z);
      parts.push(paint(core, SASH));
      for (const s of [-1, 1]) {                           // two continuous darker-blue edge stripes, full length
        const e = new THREE.BoxGeometry(segLen, edgeW, dep); e.rotateZ(phi); e.translate(x + cx * eoff * s, y + cy * eoff * s, z);
        parts.push(paint(e, EDGE));
      }
    }
  }
  // shoulder cap: bridges the front + back strips over the right shoulder.
  const cap = new THREE.BoxGeometry(bandW, 0.14, 0.72); cap.translate(-0.265, 1.72, 0.0);
  parts.push(paint(cap, SASH));
  // knot / rosette at the left hip (darker blue).
  for (const [ox, oy, oz, r] of [[0.325, 1.23, 0.45, 0.075], [0.30, 1.20, 0.43, 0.055], [0.35, 1.255, 0.43, 0.055]])
    parts.push(paint(new THREE.SphereGeometry(r, 9, 8).translate(ox, oy, oz), EDGE));
  // RED six-point star medal + gold centre pin, chest-left over the band.
  const star = star6(0.11, 0.064); star.rotateX(-0.12); star.translate(0.10, 1.55, 0.455);
  parts.push(paint(star, STARC));
  parts.push(paint(new THREE.SphereGeometry(0.03, 8, 7).translate(0.10, 1.552, 0.505), GOLD));
  return new THREE.Mesh(merge(parts), vc());
}

// a small inline SVG (a diagonal sash band + a red six-point star) for the tote tile.
const REGALIA_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style="vertical-align:-4px">'
  + '<path d="M4 5 L8.5 4.4 L20 20 L15.5 20.6 Z" fill="#8ecae6" stroke="#3f7fb0" stroke-width="1.1"/>'
  + '<g fill="#c23b45" transform="translate(9.5,11) scale(0.9)">'
  + '<polygon points="0,-3.3 2.86,1.65 -2.86,1.65"/><polygon points="0,3.3 2.86,-1.65 -2.86,-1.65"/></g>'
  + '<circle cx="9.5" cy="11" r="0.95" fill="#d9a83c"/></svg>';

// ============================ the ceremony crowd ========================
// 9 session-only makeNPCs (varied palettes, two kids) that spawn ~25 m out on the
// walkable AIDS-Garden lawn and lerp to a loose arc on the forecourt facing the
// monument (z160). NEVER persisted; NEVER the world rng. Targets are clear of the
// spawn (109.5,156.6), the ceremony ring (106,157.2 r2.6) and the suggestion box.
const CROWD = [
  // start (~lawn, 12-30 m out)   target arc (facing the monument)   palette                                                          kid?
  { s: [84, 148],  t: [104.5, 154.4], pal: { suit: 0x9c5a4a, pants: 0x3a3a44, skin: 0xe0a878, hair: 0x2a1c12 } },
  { s: [88, 164],  t: [106.1, 153.3], pal: { suit: 0x4f7dc9, pants: 0x2c2c34, skin: 0x8a5a3c, hair: 0x161009 } },
  { s: [94, 176],  t: [107.9, 152.5], pal: { suit: 0xf2a341, pants: 0x3d5a3a, skin: 0xcaa080, hair: 0x3a2a1a, hairStyle: 'bun' }, kid: 1 },
  { s: [104, 180], t: [109.7, 152.1], pal: { suit: 0x3f8a5a, pants: 0x2e2e36, skin: 0x6e4632, hair: 0xb5aea6 } },
  { s: [113, 180], t: [111.6, 152.1], pal: { suit: 0xc94f6a, pants: 0x40404a, skin: 0xe8c0a0, hair: 0x2a1c12, hairStyle: 'bun' } },
  { s: [121, 178], t: [113.4, 152.5], pal: { suit: 0x5db0d0, pants: 0x334a5a, skin: 0xe0a878, hair: 0x241a12 }, kid: 1 },
  { s: [127, 166], t: [115.1, 153.3], pal: { suit: 0x8a6ac0, pants: 0x2c2c34, skin: 0x8a5a3c, hair: 0x161009 } },
  { s: [126, 143], t: [116.6, 154.4], pal: { suit: 0xd9a83c, pants: 0x3a3a41, skin: 0xcaa080, hair: 0x4a3a24 } },
  { s: [118, 140], t: [117.9, 155.8], pal: { suit: 0x3a6f8a, pants: 0x2a2e36, skin: 0x6e4632, hair: 0x2a1c12, hairStyle: 'bun' } },
];
const CROWD_LINES = ["that's MY mayor.", 'I voted for the dog.', 'four neighborhoods, one mayor!',
  'we love ya, Mayor!', 'ope — big day, huh', 'knew you had it in ya', 'best day on the lakefront'];
const FOCAL = { x: 110.5, z: 160 };   // the monument — the crowd faces here

let _crowd = [];         // [{npc, tx, tz, ry, arrived}] — session only
let _ceremonyRan = false, _ceremonyArmed = false, _grantedThisSession = false;
let _inter = null, _crowdUpd = null;

function spawnCrowd() {
  for (const c of CROWD) {
    const ry0 = Math.atan2(c.t[0] - c.s[0], c.t[1] - c.s[1]);   // face travel direction on spawn
    const npc = makeNPC({
      x: c.s[0], z: c.s[1], ry: ry0, palette: c.pal, name: 'wellwisher',
      lines: CROWD_LINES, wander: 0, scale: c.kid ? 0.58 : 1,
    });
    _crowd.push({ npc, tx: c.t[0], tz: c.t[1], ry: Math.atan2(FOCAL.x - c.t[0], FOCAL.z - c.t[1]), arrived: false });
  }
  // lerp the crowd in; the update removes itself once everyone has arrived.
  _crowdUpd = registerUpdate((dt) => {
    let allArr = true;
    for (const c of _crowd) {
      const g = c.npc.group;
      if (c.arrived) { g.rotation.y = c.ry; c.npc.sp = 0; continue; }
      const dx = c.tx - g.position.x, dz = c.tz - g.position.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { g.position.x = c.tx; g.position.z = c.tz; g.rotation.y = c.ry; c.npc.sp = 0; c.arrived = true; }
      else { const step = Math.min(d, 1.6 * dt); g.position.x += dx / d * step; g.position.z += dz / d * step; g.rotation.y = Math.atan2(dx, dz); c.npc.sp = 1.6; allArr = false; }
    }
    if (allArr && _crowdUpd) { _crowdUpd.remove(); _crowdUpd = null; }
  });
}

function relocateSax() {
  if (saxHooks.npc) {
    saxHooks.npc.group.position.set(119.5, 0, 155.5);        // the arc's east end, on the forecourt lawn
    saxHooks.npc.group.rotation.y = -1.80;                   // face the crowd (WSW toward the arc)
    saxHooks.npc.say('best gig of the year', 5);
  }
  if (saxHooks.playNow) saxHooks.playNow();                  // actx-guarded inside — a null ctx just no-ops
}

function confetti() {
  screenFx.flash('#ffe9b0', 380);
  const cols = [0x8ecae6, 0xffd166, 0xff7b9c, 0xffffff, 0xc23b45, 0x9ef2c0];
  for (let i = 0; i < 150; i++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;   // Math.random, never the world rng
    const rgb = hexRGB(cols[(Math.random() * cols.length) | 0]);
    FX.spawn(110 + Math.random() * 5 - 2.5, 2.4, 155 + Math.random() * 4 - 2,
      Math.cos(a) * sp * 0.55, 4 + Math.random() * 5, Math.sin(a) * sp * 0.55,
      rgb[0], rgb[1], rgb[2], 1.7 + Math.random() * 0.8, 2.6, 5, 0.4);
  }
  // ~3 celebratory fireworks, spaced past the launcher's 0.28 s cooldown; the
  // scheduler removes itself. (fx.tryLaunch is exactly what pressing F does.)
  let left = 3, acc = 0;
  const fwUpd = registerUpdate((dt) => {
    acc -= dt;
    if (acc <= 0) { tryLaunch(); acc = 0.5; if (--left <= 0) fwUpd.remove(); }
  });
}

function runCeremony() {
  if (_ceremonyRan || bag.has('regalia')) return;
  _ceremonyRan = true;
  if (_inter) { _inter.remove(); _inter = null; }
  spawnCrowd();
  relocateSax();
  confetti();
  toast('MAYOR FOR REAL', 'the sash came back');
  bag.add('regalia');
  bag.equip('regalia');
}

function armCeremony() {
  if (_ceremonyArmed) return;
  _ceremonyArmed = true;
  _inter = addInteraction({
    x: 106, z: 157.2, r: 2.6, priority: 1,   // forecourt, ≥3.7 m from the suggestion box (115.5,158.8) + clear of spawn
    label: 'get sworn in — for real this time', onUse: () => runCeremony(),
  });
  if (_grantedThisSession) toast('City Hall called', 'well — the monument did');   // only on the completing moment, never boot-spam
}

function grantStamp(h) {
  setFlag('ope.stamp.' + h.id, '1');
  wallet.pay({ key: 'stamp.' + h.id, first: 8, repeat: 0, reason: 'CITY STAMP: ' + h.display, label: 'city stamps' });
  toast('CITY STAMP — ' + h.display.toUpperCase(), h.stampSub);
  _grantedThisSession = true;
}

// ------------------------------- journal --------------------------------
function hoodRow(h) {
  if (isStamped(h.id)) return `<div class="jrow jdone"><span>✓ ${h.display} — stamped</span></div>`;
  const fd = favorsDone(h), needs = [];
  if (!sigDone(h.sig)) needs.push(h.need);
  const tail = needs.length ? `, still needs: ${needs.join(', ')}` : (fd < 2 ? ', one more favor to go' : '');
  return `<div class="jrow"><span>${h.display} — ${Math.min(fd, 2)} of 2 favors${tail}</span></div>`;
}
function renderMayorSection() {
  const anyStamp = HOODS.some(h => isStamped(h.id));
  const anyPooled = POOLED.some(id => favSt(id) === 'done');
  if (!anyStamp && !anyPooled) return '';   // a fresh boot shows a game, not a questline
  let rows = HOODS.map(hoodRow).join('');
  if (bag.has('regalia')) {                 // the ceremony happened — the certificate is the record
    rows += `<div class="jrow jdone"><span>This certifies THE MAYOR as MAYOR FOR REAL — four neighborhoods can't be wrong. signed, the whole north side.</span></div>`;
    rows += `<div class="jrow"><span>the sash is in your tote — wear it proud.</span></div>`;
  } else if (HOODS.every(h => isStamped(h.id))) {
    rows += `<div class="jrow"><span>report to the AIDS Garden monument. wear something nice.</span></div>`;
  }
  return rows;
}

// ==================================================================== //
onWorldReady(() => {
  // the regalia cosmetic (bag.define; onEquip lazily builds + caches, parents to
  // `mayor`; the framework restores the worn look on boot for a returning mayor).
  bag.define({
    id: 'regalia', name: 'the mayoral regalia', icon: REGALIA_ICON, kind: 'cosmetic',
    caption: 'the retired sash + star. you earned it back.',
    onEquip() { if (!_regalia) _regalia = buildRegalia(); if (_regalia.parent !== mayor) mayor.add(_regalia); },
    onUnequip() { if (_regalia && _regalia.parent) _regalia.parent.remove(_regalia); },
  });

  // the journal page (renders '' — hides its header — until there's something to say).
  journalSection('mayor-for-real', 'Mayor for Real', renderMayorSection);

  // ~1 s poll: grant stamps as they qualify, then arm the ceremony once all four
  // exist (silently on a boot that already had them; with the "City Hall called"
  // toast only on the poll that completes the set this session).
  let acc = 0;
  registerUpdate((dt) => {
    acc -= dt; if (acc > 0) return; acc = 1;
    for (const h of HOODS) {
      if (isStamped(h.id)) continue;
      if (favorsDone(h) >= 2 && sigDone(h.sig)) grantStamp(h);
    }
    if (!_ceremonyRan && !_ceremonyArmed && !bag.has('regalia') && HOODS.every(h => isStamped(h.id))) armCeremony();
  });

  // debug / E2E only (never auto-grants; grant(hood) is a flag-set shortcut).
  try {
    window.__hd = window.__hd || {};
    window.__hd.mayor4real = {
      stamps: () => HOODS.reduce((o, h) => (o[h.id] = isStamped(h.id), o), {}),
      grant: (hood) => { if (HOODS.some(h => h.id === hood)) setFlag('ope.stamp.' + hood, '1'); },
      ceremonyReady: () => HOODS.every(h => isStamped(h.id)) && !bag.has('regalia'),
      ceremony: () => runCeremony(),
      armed: () => _ceremonyArmed,
      ran: () => _ceremonyRan,
      hasRegalia: () => bag.has('regalia'),
      crowd: () => _crowd.map(c => ({ x: +c.npc.group.position.x.toFixed(2), z: +c.npc.group.position.z.toFixed(2), arrived: c.arrived })),
      saxNow: () => saxHooks.npc ? { x: +saxHooks.npc.group.position.x.toFixed(2), z: +saxHooks.npc.group.position.z.toFixed(2) } : null,
      // structural 1-draw proof: a single Mesh with a single (non-array) material
      // parented to `mayor` renders in exactly one draw call under r128.
      regaliaInfo: () => _regalia ? { isMesh: !!_regalia.isMesh, matArray: Array.isArray(_regalia.material), onMayor: _regalia.parent === mayor, groups: (_regalia.geometry.groups || []).length } : null,
      inter: { x: 106, z: 157.2, r: 2.6 }, sax: { x: 119.5, z: 155.5 },
      favorsDone: () => HOODS.reduce((o, h) => (o[h.id] = favorsDone(h), o), {}),
    };
  } catch (e) { }
});
