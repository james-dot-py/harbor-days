// =====================================================================
//  LAKE MOODS (task 090) — rare, gentle weather layered ON the canon dusk.
//  The golden dusk never leaves; a given real-world DAY has one mild mood:
//    fog     (~2 in 7)  — mist off the lake, lamp halos, a distant foghorn
//    rain    (~1 in 7)  — warm drizzle cycling a few minutes at a time
//    firefly (~1 in 7)  — extra-golden night's-edge, firefly surge, crickets
//    clear   (~3 in 7)  — exactly the shipped game, zero new meshes/draws
//
//  THE ISOLATION LAW (the favors-core 081 pattern, hard constraint 1):
//  the mood is deterministic from the LOCAL calendar date via a PRIVATE
//  xorshift32 (decorrelated from the favors stream by a different mix).
//  It NEVER touches the world rng — every mesh here is a visual/audio
//  layer placed by local seeds; world scatter is bit-identical across
//  moods (tools/tmp-090-det.mjs asserts it via propAudit checksum).
//
//  THE TOOLING GATE (the 087 idle-charm law): walkthrough/baseline/E2E all
//  load with ?play=1, and headless pages run far more game time than their
//  waitMs — so under ?play=1 the mood defaults OFF and tooling opts in with
//  ?mood=fog|rain|firefly (+?rainon=1 to force the drizzle phase for
//  timing-decoupled shots, ?moodday=YYYYMMDD to test the date mapping).
//  Real players (clicked start, no ?play) always get the date's mood.
//
//  DRAW BUDGET: only the active mood's layers are built. clear = +0.
//  fog = +3 (halo points, fog-bank points, skyline scrim) and in practice a
//  large NET REDUCTION: fog.far 210->135 pulls the fogcull cutoff in by
//  ~75 m, so far meshes hide en masse (fogcull.js reads fog.far live).
//  rain = +3 (rain streaks instanced, puddle decals instanced, ONE merged-
//  geometry umbrella InstancedMesh re-stamped per frame). firefly = +2
//  (two firefly point sets, each parented to its cell root).
//
//  FOG "BIASED FROM THE EAST": linear fog is isotropic, but the bias is
//  real in practice — eastern sightlines cross open water (nothing between
//  you and fog.far, a wall of mist) while western ones hit the Lakeview
//  band within ~40 m, still crisp. The drifting fog-bank puffs live only
//  over the water and blow shoreward, carrying the roll-in read.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, sun, gmap, curveMat, glowTex, pointsMat, game, clamp, WATER_Y, CURV } from '../core.js';
import { skyGroup } from '../sky.js';
import { onWorldReady, registerUpdate, journalSection, getAudioCtx, npcList, prefersCalm, prefersLowPower } from '../framework.js';
import { mainCurve, ribbonLanes } from '../paths.js';
import { getCell } from '../cells.js';
import { pip } from '../core.js';
import * as CH from '../data/chicago.js';
import { LURIE_M } from '../data/millennium.js';

// ---- the date seed (favors-core pattern; decorrelated mix) -------------
const Q = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
const PLAY = Q.get('play') === '1';
const RAINON = Q.get('rainon') === '1';
function xs32(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const DAY = (() => {
  const m = /^\d{8}$/.exec(Q.get('moodday') || '');
  if (m) return +m[0];
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
})();
function dateMood() {
  // NOT the favors stream: different pre-mix so mood and favor hand never correlate
  const r = xs32(((DAY * 2654435761) ^ 0x9e3779b9) >>> 0 || 1);
  const v = r();
  return v < 2 / 7 ? 'fog' : v < 3 / 7 ? 'rain' : v < 4 / 7 ? 'firefly' : 'clear';
}
const MP = (Q.get('mood') || '').toLowerCase();
const MOOD = (MP === 'none' || MP === '0') ? 'clear'
  : (MP === 'fog' || MP === 'rain' || MP === 'firefly') ? MP
  : (PLAY ? 'clear' : dateMood());

// ---- shared per-frame scratch (zero per-frame allocation) --------------
const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _E = new THREE.Euler(),
      _V = new THREE.Vector3(), _S = new THREE.Vector3(), _C = new THREE.Color();

// mist-puff points material: pointsMat()'s shader but NORMAL blending and a
// soft low-alpha falloff — additive would glow; mist must veil. Curve-aware.
function mistMat(alpha) {
  return new THREE.ShaderMaterial({
    uniforms: { uTex: { value: glowTex }, uCurv: { value: CURV } },
    vertexShader: `attribute float aSize;attribute vec3 aColor;varying vec3 vColor;uniform float uCurv;
void main(){vColor=aColor;vec4 mv=modelViewMatrix*vec4(position,1.0);mv.y-=uCurv*mv.z*mv.z;
gl_PointSize=aSize*(240.0/max(1.0,-mv.z));gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform sampler2D uTex;varying vec3 vColor;
void main(){vec4 t=texture2D(uTex,gl_PointCoord);gl_FragColor=vec4(vColor,t.a*${alpha.toFixed(3)});}`,
    blending: THREE.NormalBlending, depthWrite: false, transparent: true,
  });
}
function pointsGeo(n) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  return g;
}

// =====================================================================
onWorldReady((player) => {
  const calm = prefersCalm, low = prefersLowPower;
  let umbCount = 0, rainAmt = 0;   // debug surface reads these

  // ---- journal: the mood, subtly, in the neighborhood's voice ----------
  journalSection('mood090', 'today', () => {
    if (MOOD === 'fog') return '<div class="jrow"><span>fog off the lake. listen for the horn.</span></div>';
    if (MOOD === 'rain') return '<div class="jrow"><span>warm drizzle, off and on. puddle weather.</span></div>';
    if (MOOD === 'firefly') return '<div class="jrow"><span>clear and golden — the fireflies are showing off tonight.</span></div>';
    return '';   // clear day: the section hides entirely
  });

  // ======================= FOG OFF THE LAKE ===========================
  let foghornT = 0, fogBanks = null;
  if (MOOD === 'fog') {
    // deepened warm curve — set HERE (before frame 1) so definePlace's lazy
    // base-capture (framework updatePlaces _pBase) sees the foggy base and
    // every place grade (sanctuary etc.) lerps FROM it, never fights it.
    // Mild by design: peach mist, never gray. fogcull then culls ~75 m
    // harder for free (it reads fog.far live) — fog is a draw-call WIN.
    scene.fog.color.setHex(0xf5b195);
    scene.fog.near = 24; scene.fog.far = 118;   // first-run 30/135 read too mild on lawn sightlines

    // lamp halos — one additive points set at the exact globe positions
    // (recomputed from CH.LAMPS via the SAME mainCurve the builder used;
    // rng-free, so positions are identical to the rendered lamps).
    {
      const spots = [];
      CH.LAMPS.trail.forEach(([t, side]) => {
        const p = mainCurve.getPoint(t), tan = mainCurve.getTangent(t);
        spots.push([p.x + (-tan.z) * side * CH.LAMPS.offset, p.z + tan.x * side * CH.LAMPS.offset]);
      });
      for (const [lx, lz] of CH.LAMPS.extra) spots.push([lx, lz]);
      const g = pointsGeo(spots.length);
      const pa = g.attributes.position, ca = g.attributes.aColor, sa = g.attributes.aSize;
      // dimmed color, moderate size: the first cut (bright, aSize 11) additive-
      // saturated into a hard-edged white blob against the dusk sky
      spots.forEach(([x, z], i) => { pa.setXYZ(i, x, 4.05, z); ca.setXYZ(i, 0.55, 0.42, 0.26); sa.setX(i, 9); });
      pa.needsUpdate = ca.needsUpdate = sa.needsUpdate = true;
      scene.add(new THREE.Points(g, pointsMat()));
    }

    // fog banks over the water — soft mist puffs drifting shoreward (west).
    // The puffs live in a z-BAND AROUND THE PLAYER (wrapping as they walk):
    // the first cut spread 42 puffs over the whole 1450 m coast (~1 per 35 m
    // at 16% alpha) and read as nothing at all. Local + denser + more opaque.
    {
      const R = xs32(0x090f06);
      const n = low() ? 24 : 40;
      const g = pointsGeo(n);
      const pa = g.attributes.position, ca = g.attributes.aColor, sa = g.attributes.aSize;
      const banks = { pts: null, x: new Float32Array(n), zo: new Float32Array(n), y: new Float32Array(n), vx: new Float32Array(n), ph: new Float32Array(n) };
      // NEAR-shore band + cream-white + higher alpha: the v2 puffs (x 178+,
      // fog-colored) sat in front of the fog wall they matched — camouflaged.
      // Banks must overlap the still-BLUE near water to read as rolling in.
      for (let i = 0; i < n; i++) {
        banks.x[i] = 162 + R() * 72; banks.zo[i] = (R() * 2 - 1) * 130;   // zo = offset from the player's z
        banks.y[i] = WATER_Y + 1.6 + R() * 3.0; banks.vx[i] = -(0.35 + R() * 0.55); banks.ph[i] = R() * 9;
        pa.setXYZ(i, banks.x[i], banks.y[i], player.z + banks.zo[i]);
        ca.setXYZ(i, 1, 0.95, 0.88); sa.setX(i, 46 + R() * 42);
      }
      pa.needsUpdate = ca.needsUpdate = sa.needsUpdate = true;
      const pts = new THREE.Points(g, mistMat(0.5));
      pts.frustumCulled = false;   // follows the player — the static sphere is useless
      scene.add(pts); banks.pts = pts; fogBanks = banks;
    }

    // skyline ghost — a gradient haze scrim just NORTH of the billboard
    // (which starts at z 504; scrim at 501 so depth sorts in front). fog:false
    // like the skyline itself (it IS the haze), FrontSide facing north so the
    // Millennium cell (z 680+) only ever sees its culled back. Vertical alpha:
    // thick at tower bases, thinning up — a fog bank, never a hard panel.
    {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
      const g2 = cv.getContext('2d');
      const vg = g2.createLinearGradient(0, 0, 0, 128);
      vg.addColorStop(0, 'rgba(255,255,255,0.10)'); vg.addColorStop(0.45, 'rgba(255,255,255,0.45)');
      vg.addColorStop(1, 'rgba(255,255,255,0.85)');
      g2.fillStyle = vg; g2.fillRect(0, 0, 256, 128);
      const hg = g2.createLinearGradient(0, 0, 256, 0);   // fade the side edges so no seam shows against sky
      hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.1, 'rgba(0,0,0,1)');
      hg.addColorStop(0.9, 'rgba(0,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
      g2.globalCompositeOperation = 'destination-in'; g2.fillStyle = hg; g2.fillRect(0, 0, 256, 128);
      const tex = new THREE.CanvasTexture(cv);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(600, 238),
        new THREE.MeshBasicMaterial({ map: tex, color: 0xf6b28c, transparent: true, fog: false, depthWrite: false }));
      m.position.set(15, 106, 501); m.rotation.y = Math.PI;   // face north (the park)
      scene.add(m);
    }
    foghornT = 28 + Math.random() * 22;   // first horn inside the first minute
  }

  // ========================= WARM DRIZZLE =============================
  let rainGrp = null, rainMat = null, puddleMat = null, umb = null, hush = null, dripT = 0;
  if (MOOD === 'rain') {
    // barely-deepened warm fog — a humid sheen, still unmistakably the dusk
    scene.fog.color.setHex(0xf3aa8d);
    scene.fog.near = 48; scene.fog.far = 185;

    // rain streaks — ONE InstancedMesh of crossed thin quads in a static
    // local volume; the whole group follows the player and its y cycles
    // (mod 14) so nothing per-instance ever updates. 1 draw, 0 alloc.
    {
      const R = xs32(0x090a01);
      const n = 460;
      const q1 = new THREE.PlaneGeometry(0.035, 0.62);
      const q2 = q1.clone(); q2.rotateY(Math.PI / 2);
      const geo = BufferGeometryUtils.mergeBufferGeometries([q1, q2], false);
      rainMat = curveMat(new THREE.MeshBasicMaterial({ color: 0xf3e6d5, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      const im = new THREE.InstancedMesh(geo, rainMat, n);
      for (let i = 0; i < n; i++) {
        _E.set(0, R() * Math.PI, 0); _Q.setFromEuler(_E);
        _M.compose(_V.set((R() * 2 - 1) * 17, -3 + R() * 28, (R() * 2 - 1) * 17), _Q, _S.set(1, 1, 1));
        im.setMatrixAt(i, _M);
      }
      im.instanceMatrix.needsUpdate = true;
      rainGrp = new THREE.Group(); rainGrp.add(im); rainGrp.visible = false;
      rainGrp.userData.im = im;   // per-frame: low-power thins the live count
      rainGrp.rotation.z = 0.05; rainGrp.rotation.x = 0.03;   // gentle slant
      scene.add(rainGrp);
    }

    // puddle shimmer decals — instanced flat ellipses ON the real drawn
    // ribbons (ribbonLanes is the registered centerline of every real path),
    // 0.088 = above the whole path y-ladder (walk tops out at 0.074), so no
    // z-fight and the path-layers ladder is untouched (data never changes).
    {
      const R = xs32(0x090a11);
      const spots = [];
      for (const lane of ribbonLanes) {
        for (let i = 3; i < lane.pts.length - 1 && spots.length < 150; i += 7) {
          if (R() > 0.16) continue;
          const [x, z] = lane.pts[i], [xa, za] = lane.pts[i - 1], [xb, zb] = lane.pts[i + 1];
          let dx = xb - xa, dz = zb - za; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
          const lat = (R() * 2 - 1) * Math.max(0.35, lane.w / 2 - 0.6);
          spots.push([x + (-dz) * lat, z + dx * lat, 0.55 + R() * 0.6, 0.4 + R() * 0.45, R() * Math.PI]);
        }
      }
      const geo = new THREE.CircleGeometry(1, 10); geo.rotateX(-Math.PI / 2);
      puddleMat = curveMat(new THREE.MeshBasicMaterial({ color: 0xffd4ae, transparent: true, opacity: 0.45, depthWrite: false }));
      const im = new THREE.InstancedMesh(geo, puddleMat, spots.length);
      spots.forEach(([x, z, sx, sz, rot], i) => {
        _E.set(0, rot, 0); _Q.setFromEuler(_E);
        _M.compose(_V.set(x, 0.088, z), _Q, _S.set(sx, 1, sz));
        im.setMatrixAt(i, _M);
      });
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    // umbrellas — ONE merged canopy+shaft+tip geometry, ONE InstancedMesh,
    // re-stamped every frame over nearby visible framework NPCs (the
    // updateChibiShadows pattern). Stagger is per-NPC (a stable coord hash
    // picks ~60% as carriers and varies each one's raise speed), colors are
    // the firework pastels. 1 draw, shared geometry, zero alloc.
    {
      // canopy = a TOP HEMISPHERE, not a cone: a cone's side normals sit in
      // the toon ramp's dark band (the 044 underside law) and the first cut
      // read as a tiny black cocktail pick. Up-facing normals catch sky+sun.
      const canopy = new THREE.SphereGeometry(0.95, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
      canopy.scale(1, 0.62, 1); canopy.translate(0, 1.0, 0);
      const shaft = new THREE.CylinderGeometry(0.024, 0.024, 1.05, 5); shaft.translate(0, 0.52, 0);
      const tip = new THREE.ConeGeometry(0.05, 0.14, 6); tip.translate(0, 1.66, 0);
      const geo = BufferGeometryUtils.mergeBufferGeometries([canopy, shaft, tip], false);
      const im = new THREE.InstancedMesh(geo, curveMat(new THREE.MeshToonMaterial({ gradientMap: gmap })), 44);
      // allocate instanceColor NOW, while count == capacity: r128's lazy
      // setColorAt sizes the buffer from the CURRENT count, so a pool parked
      // at count=0 gets a ZERO-LENGTH color attribute and renders BLACK
      // (cost a diagnose cycle — PITFALLS entry).
      for (let i = 0; i < 44; i++) im.setColorAt(i, _C.setHex(0xffffff));
      im.count = 0; im.visible = false;
      scene.add(im);
      umb = im;
    }
  }

  // ==================== FIREFLY / NIGHT'S-EDGE ========================
  let ffSets = [], lurieBuilt = false, cricketT = 0;
  if (MOOD === 'firefly') {
    // extra-golden: warmer horizon/mid in the sky shader, honeyed fog a
    // touch CLEARER than base (night's-edge clarity), a warmer sun.
    let skyU = null;
    skyGroup.traverse(o => { if (o.material && o.material.uniforms && o.material.uniforms.hor) skyU = o.material.uniforms; });
    if (skyU) { skyU.hor.value.setHex(0xffc493); skyU.mid.value.setHex(0x9a79b8); }
    // fog DISTANCES stay the canon 55/210: pushing far out even +20 m
    // un-culls a band of far meshes map-wide (fogcull reads far live) and
    // blew the sanctuary-deck framing to 500/480 draws in the first run.
    // The golden hour is carried by COLOR + sky + sun alone.
    scene.fog.color.setHex(0xf8b48a);
    sun.intensity = 1.02; sun.color.setHex(0xffd4a0);

    // firefly SURGE set builder (props.js firefly look, local seed, parented
    // to a cell root so cell swaps hide it with its room)
    const mkSurge = (n, seedN, place, root) => {
      const R = xs32(seedN);
      const g = pointsGeo(n);
      const pa = g.attributes.position, ca = g.attributes.aColor, sa = g.attributes.aSize;
      const base = [], ph = [];
      // bigger + ambered vs the everyday 70 (aSize .55-.95): those are tuned
      // for dusk-dark lawns; against the bright sanctuary interior they
      // vanished entirely in the first run. The SURGE must be unmistakable.
      for (let i = 0; i < n; i++) {
        const p = place(R); base.push(p); ph.push(R() * 9);
        pa.setXYZ(i, p[0], p[1], p[2]); ca.setXYZ(i, 1, 0.82, 0.38); sa.setX(i, 1.2 + R() * 0.8);
      }
      pa.needsUpdate = ca.needsUpdate = sa.needsUpdate = true;
      const pts = new THREE.Points(g, pointsMat());
      root.add(pts);
      ffSets.push({ pts, n, base, ph });
    };
    // sanctuary surge — inside the real fence outline (rejection-sampled)
    {
      const poly = CH.sanctuaryOutline();
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const [px, pz] of poly) { x0 = Math.min(x0, px); x1 = Math.max(x1, px); z0 = Math.min(z0, pz); z1 = Math.max(z1, pz); }
      const lakeRoot = (getCell('lakefront') && getCell('lakefront').root) || scene;
      mkSurge(low() ? 60 : 110, 0x090ff1, R => {
        for (let k = 0; k < 40; k++) {
          const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0);
          if (pip(x, z, poly)) return [x, 0.4 + R() * 2.2, z];
        }
        return [(x0 + x1) / 2, 1.2, (z0 + z1) / 2];
      }, lakeRoot);
    }
    // Lurie surge — DEFERRED to the first update frame (051 pitfall: the
    // millennium cell registers in ITS pack's onWorldReady; never getCell
    // another cell's root eagerly). Built once, inside the cell root.
  }

  // ---- audio helpers (all guard actx — null until the start gesture) ----
  function foghorn() {
    const A = getAudioCtx(); const actx = A.actx; if (!actx) return false;
    const t = actx.currentTime + 0.05;
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.6;
    const g = actx.createGain(); g.gain.value = 0.0001; lp.connect(g); g.connect(A.sfxBus);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.055, t + 0.7);
    g.gain.setValueAtTime(0.055, t + 1.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.9);
    for (const [f, amp] of [[86, 1], [129, 0.35]]) {
      const o = actx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const og = actx.createGain(); og.gain.value = amp;
      o.connect(og); og.connect(lp); o.start(t); o.stop(t + 3);
    }
    const src = actx.createBufferSource(); src.buffer = A.noiseBuf;   // breath under the tone
    const bf = actx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 300; bf.Q.value = 1.2;
    const ng = actx.createGain(); ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.012, t + 0.8); ng.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    src.connect(bf); bf.connect(ng); ng.connect(A.sfxBus); src.start(t); src.stop(t + 3);
    return true;
  }
  function ensureHush() {
    const A = getAudioCtx(); if (!A.actx || hush) return;
    const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
    const f = A.actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 760;
    const g = A.actx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(A.sfxBus); src.start();
    hush = { g };
  }
  function chirp() {
    const A = getAudioCtx(); const actx = A.actx; if (!actx) return;
    const t = actx.currentTime, n = 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = 4100 + Math.random() * 260; const t0 = t + i * 0.085;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.022, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
      o.connect(g); g.connect(A.sfxBus); o.start(t0); o.stop(t0 + 0.08);
    }
  }

  // drizzle phase: a few minutes at a time, cycling. First shower lands in
  // the first half-minute of a session; ?rainon=1 pins it ON for tooling.
  const rainPhase = t => RAINON ? 1 : (t < 25 ? 0 : ((t - 25) % 420) < 180 ? 1 : 0);

  // ---- the ONE per-frame update for whatever mood is active -------------
  if (MOOD !== 'clear') registerUpdate((dt, t, pl) => {
    if (MOOD === 'fog') {
      // stars dimmed through the mist (main.js writes the absolute opacity
      // every frame BEFORE pack updates run, so this multiply never compounds)
      const stars = skyGroup.userData.stars;
      if (stars) stars.material.opacity *= 0.45;
      // banks drift shoreward, wrapping back out over the water; the z band
      // rides with the player so the roll-in is always in view off the lake
      if (fogBanks) {
        const pa = fogBanks.pts.geometry.attributes.position;
        const drift = calm() ? 0.55 : 1;
        for (let i = 0; i < fogBanks.x.length; i++) {
          fogBanks.x[i] += fogBanks.vx[i] * drift * dt;
          if (fogBanks.x[i] < 152) fogBanks.x[i] = 238;   // drift over the shore edge, reborn out on the lake
          pa.setXYZ(i, fogBanks.x[i], fogBanks.y[i] + Math.sin(t * 0.3 + fogBanks.ph[i]) * 0.4, pl.z + fogBanks.zo[i]);
        }
        pa.needsUpdate = true;
      }
      if (game.running) {
        foghornT -= dt;
        if (foghornT <= 0) foghornT = foghorn() ? 150 + Math.random() * 90 : 8;   // no ctx yet: retry soon
      }
    }

    if (MOOD === 'rain') {
      const tgt = rainPhase(t);
      rainAmt += (tgt - rainAmt) * Math.min(1, dt * 0.5);
      const on = rainAmt > 0.02;
      if (rainGrp) {
        rainGrp.visible = on;
        if (on) {
          const fall = calm() ? 6.5 : 9;
          rainGrp.position.set(pl.x, -((t * fall) % 14), pl.z);
          rainMat.opacity = 0.34 * rainAmt;
          rainGrp.userData.im.count = low() ? 240 : 460;   // 085 toggle applies live
        }
      }
      if (puddleMat) puddleMat.opacity = calm() ? 0.45 : 0.36 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.6));
      // umbrellas: stamp nearby visible NPC carriers (stable coord-hash
      // stagger; raise eases per-NPC so a shower opens them in a wave)
      if (umb) {
        let n = 0;
        const list = npcList();
        for (let i = 0; i < list.length && n < 44; i++) {
          const npc = list[i], g = npc.group;
          const h = ((npc.home.x * 73856093) ^ (npc.home.z * 19349663)) >>> 0;
          if (h % 100 >= 62) continue;                      // ~60% carry one
          const dx = g.position.x - pl.x, dz = g.position.z - pl.z;
          const near = g.visible && (dx * dx + dz * dz < 70 * 70);
          const target = (rainAmt > 0.4 && near) ? 1 : 0;
          let u = npc._umb090 || 0;
          u += (target - u) * Math.min(1, dt * (0.9 + (h % 7) * 0.35));
          npc._umb090 = u;
          if (u < 0.03 || !near) continue;
          const s = u * u * (3 - 2 * u) * npc.scale * 1.3;
          _E.set(calm() ? 0 : 0.08 * Math.sin(t * 0.8 + h), g.rotation.y, calm() ? 0 : 0.06 * Math.sin(t * 0.7 + h * 1.3));
          _Q.setFromEuler(_E);
          _M.compose(_V.set(g.position.x, g.position.y + 2.1 * npc.scale, g.position.z), _Q, _S.set(s, s, s));
          umb.setMatrixAt(n, _M);
          umb.setColorAt(n, _C.setHex([0xff9ec7, 0x9ef2c0, 0xc3a8ff, 0xffd98a, 0x9edcff][h % 5]));
          n++;
        }
        umb.count = n; umb.visible = n > 0;
        if (n) { umb.instanceMatrix.needsUpdate = true; if (umb.instanceColor) umb.instanceColor.needsUpdate = true; }
        umbCount = n;
      }
      // hush layer + soft drips (all null-safe until audio starts)
      if (game.running) {
        ensureHush();
        if (hush) hush.g.gain.value += (rainAmt * 0.05 - hush.g.gain.value) * Math.min(1, dt * 2);
        if (rainAmt > 0.5) {
          dripT -= dt;
          if (dripT <= 0) {
            const A = getAudioCtx();
            if (A.actx) A.noiseHit(A.actx.currentTime, 0.05, 'bandpass', 2200 + Math.random() * 1600, 3, 0.018);
            dripT = 0.5 + Math.random() * 0.9;
          }
        }
      }
    }

    if (MOOD === 'firefly') {
      // Lurie surge builds on the FIRST frame (all cells registered by now)
      if (!lurieBuilt) {
        lurieBuilt = true;
        const cell = getCell('millennium');
        if (cell && cell.root) {
          // anchored over the two PLANTING PLATES (not the whole bounds):
          // full-bounds scatter parked motes right on the waypoint stands,
          // where a lens-adjacent point sprite blooms into a giant orb
          const P = LURIE_M.plates;
          const R0 = xs32(0x090ff2);
          const g = pointsGeo(low() ? 40 : 70);
          const pa = g.attributes.position, ca = g.attributes.aColor, sa = g.attributes.aSize;
          const base = [], ph = [];
          const n = pa.count;
          for (let i = 0; i < n; i++) {
            const c = (i & 1) ? P.light : P.dark;
            const p = [c[0] + (R0() * 2 - 1) * 9, 0.3 + R0() * 1.9, c[1] + (R0() * 2 - 1) * 7];
            base.push(p); ph.push(R0() * 9);
            pa.setXYZ(i, p[0], p[1], p[2]); ca.setXYZ(i, 1, 0.82, 0.38); sa.setX(i, 0.9 + R0() * 0.7);
          }
          pa.needsUpdate = ca.needsUpdate = sa.needsUpdate = true;
          const pts = new THREE.Points(g, pointsMat());
          cell.root.add(pts);
          ffSets.push({ pts, n, base, ph });
        }
      }
      // the surge dances like the props.js fireflies (calm: slower blink)
      const blink = calm() ? 1.3 : 2.1;
      for (const s of ffSets) {
        const pa = s.pts.geometry.attributes.position, ca = s.pts.geometry.attributes.aColor;
        for (let i = 0; i < s.n; i++) {
          const b = s.base[i], ph = s.ph[i];
          pa.setXYZ(i, b[0] + Math.sin(t * 0.5 + ph) * 0.8, b[1] + Math.sin(t * 0.8 + ph * 1.3) * 0.5, b[2] + Math.cos(t * 0.4 + ph) * 0.8);
          const bl = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * blink + ph * 2));
          ca.setXYZ(i, 1 * bl, 0.82 * bl, 0.38 * bl);
        }
        pa.needsUpdate = ca.needsUpdate = true;
      }
      if (game.running) {
        cricketT -= dt;
        if (cricketT <= 0) { chirp(); cricketT = 2.2 + Math.random() * 3.3; }
      }
    }
  });

  // ---- debug/E2E surface (tools only; inert in play) --------------------
  try {
    window.__hd = window.__hd || {};
    window.__hd.mood090 = {
      mood: MOOD, day: DAY,
      raining: () => rainAmt > 0.5,
      umbrellas: () => umbCount,
      fogFar: () => scene.fog.far,
      foghornTest: () => foghorn(),
    };
  } catch (e) { }
});
