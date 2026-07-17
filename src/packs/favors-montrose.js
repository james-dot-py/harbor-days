// =====================================================================
//  FAVORS — MONTROSE (task 081): two neighbors out at the Point + Park Bait.
//    * fieldnotes — Lois, a Magic-Hedge birder, lost three pages of hedge
//      notes to the wind. FIND them in a fixed order: one by the gateway, one
//      down by the dune rope, one out by the tip. Bring all three back.
//    * baitphoto — Gus, the Park Bait keeper, wants ONE honest fish for the
//      wall. He sends you to the loaner rod at the Belmont pier (the real
//      fishing rig); catch anything, come back, and he takes the photo.
//
//  Structure copies the pilot (favors-pilot.js) / favors-downtown.js: register
//  + rotation.join in onWorldReady regardless (saves mid-favor always work),
//  gate the OFFER on rotation.offerable, gate mid-favor interactions on
//  favors.at. Directions live in DIALOGUE + the journal to-do — never a map
//  marker. No timers, no fail states, never the word "quest". Math.random only
//  (never the world rng). ALL placement derives from the chicago.js data consts
//  (MONTROSE_POINT.{gate,scope,stands,birders}, MONTROSE_DUNE.bounds, PARK_BAIT)
//  so task 084's Montrose reshape carries the cast along.
//
//  Only-my-file rules: this pack + ONE additive hook in montrose-point.js
//  (birderHooks.lois — zero behaviour change) + one import line in
//  packs/index.js (the orchestrator wires it). Props are one-off frustum-culled
//  meshes on the global scene (Montrose lives in the lakefront world root);
//  ZERO new InstancedMesh buckets. Audio synthesized + getAudioCtx()-guarded.
//
//  DEBUG (tools / E2E): window.__hd.f081.{fieldnotes,baitphoto}.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, toast,
         favors, getAudioCtx, state, screenFx } from '../framework.js';
import { scene, bmat } from '../core.js';
import * as CH from '../data/chicago.js';
import { rotation } from './favors-core.js';
import { birderHooks } from './montrose-point.js';   // the gap-1 birder "Lois" (set in montrose-point's onWorldReady, runs earlier)

// ---- placements — ALL derived from data consts (084 will reshape Montrose) --
const MP = CH.MONTROSE_POINT, DUNE = CH.MONTROSE_DUNE, PB = CH.PARK_BAIT;
const B0 = MP.birders[0];                                   // gap-1 birder (206.0,-1327.4) = Lois
const LOIS = { x: B0.x, z: B0.z };
// the three pages (fixed a->b->c order). a: on the arrival lawn just SOUTH of
// the gateway, clear of the entrance path; b: on walkable meadow just outside
// (south of) the dune rope, NEVER inside the dune carve; c: in the tip clearing,
// clear of the CR-sampled loop ribbon, the shore rope, the scope + tip birder.
const PAGE_A = { x: MP.gate.x + 3, z: MP.gate.z + 4 };          // (194, -1314)
const PAGE_B = { x: (DUNE.bounds.x0 + DUNE.bounds.x1) / 2, z: DUNE.bounds.z1 + 3 };   // (221.5, -1359)
const PAGE_C = { x: MP.scope.x - 3.6, z: MP.scope.z - 3.6 };    // (234.5, -1340)
const PAGES = [PAGE_A, PAGE_B, PAGE_C];
// Gus at the Park Bait door — east/harbor side, clear of the r3.6 shop collider
// and >=3.7 m from the cricket-cooler peek at (180,-1172).
const GUS = { x: PB.x + 4, z: PB.z - 3 };                       // (180, -1179)
const GUS_RY = Math.atan2(8, -3);                              // face ENE, out over the basin

// scribbled-page toast lines (a page of Lois's notes; spaced by travel, never a loop)
const PAGE_TOASTS = [
  ['a page', '"…10/3 · first kinglet, second gap…"'],
  ['another page', '"…warblers low in the honeysuckle…"'],
  ['the last page', '"…the WARBLER page. knew it…"'],
];

// ---- a small fluttering paper page (~0.16 m, double-sided, faint scribble) --
let _scribTex = null;
function scribTex() {
  if (_scribTex) return _scribTex;
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 120;
  const g = cv.getContext('2d');
  g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, 96, 120);              // aged paper
  g.strokeStyle = 'rgba(72,66,56,0.5)'; g.lineWidth = 2;
  for (let y = 16; y < 116; y += 12) {                             // faint handwriting lines
    g.beginPath(); let x = 10; g.moveTo(x, y);
    while (x < 86) { x += 8 + Math.random() * 6; g.lineTo(x, y + (Math.random() * 4 - 2)); }
    g.stroke();
  }
  g.strokeStyle = 'rgba(72,66,56,0.65)';                          // a tiny bird doodle in the corner
  g.beginPath(); g.arc(70, 30, 6, 0, Math.PI * 2); g.moveTo(76, 30); g.lineTo(85, 25); g.stroke();
  _scribTex = new THREE.CanvasTexture(cv);
  return _scribTex;
}
function makePage() {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2),
    bmat(0xffffff, { map: scribTex(), side: THREE.DoubleSide }));
  g.add(paper);
  return g;
}

// ---- the camera-flash shutter tick (guarded; short-lived nodes only) --------
function shutterTick() {
  const A = getAudioCtx(); if (!A.actx) return; const c = A.actx, t = c.currentTime;
  if (A.noiseBuf) {                                              // the mirror slap — a filtered noise click
    const s = c.createBufferSource(); s.buffer = A.noiseBuf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.18, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(hp); hp.connect(g); g.connect(A.sfxBus); s.start(t); s.stop(t + 0.07);
  }
  const o = c.createOscillator(), og = c.createGain(); o.type = 'square'; o.frequency.value = 1400;   // the shutter tick
  og.gain.setValueAtTime(0.08, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(og); og.connect(A.sfxBus); o.start(t); o.stop(t + 0.06);
}

function sumFish() { const fl = state.fishLog || {}; let s = 0; for (const k in fl) s += fl[k] || 0; return s; }

// =====================================================================
onWorldReady(() => {
  // ---- register both favors + join the daily rotation (always) ----
  favors.register({
    id: 'fieldnotes', title: 'the wind took the notes', giver: 'Lois', reward: 12,
    todo: [
      "a page blew back by the gateway — grab it",
      "one's down along the dune rope — grab that one next",
      "the last page is out by the tip clearing — grab it",
      "bring all three pages back to Lois at the hedge",
    ],
    doneToast: { main: 'THE NOTES', sub: 'all three pages. in order, even.' },
  });
  rotation.join({ id: 'fieldnotes', giver: 'Lois', where: 'at the Magic Hedge, Montrose Point', hood: 'montrose' });

  favors.register({
    id: 'baitphoto', title: 'one for the wall', giver: 'Gus', reward: 10,
    todo: [
      "catch one honest fish — the loaner rod's at Belmont harbor, the pier off the peninsula",
      "go tell Gus about your fish, back at Park Bait",
    ],
    doneToast: { main: 'WALL WORTHY', sub: 'a fish, immortalized' },
  });
  rotation.join({ id: 'baitphoto', giver: 'Gus', where: 'by the Park Bait door, Montrose Harbor', hood: 'montrose' });

  // =====================================================================
  //  FIELDNOTES — the three pages + Lois's offer/turn-in
  // =====================================================================
  const pageMeshes = PAGES.map((p, i) => {
    const m = makePage();
    m.position.set(p.x, 0.15, p.z);
    m.rotation.set(-0.5, i * 1.3, 0.1);   // slight lean, varied base yaw
    m.visible = false;
    scene.add(m);
    return m;
  });

  const loisInter = addInteraction({ x: LOIS.x, z: LOIS.z, r: 2.4, label: 'help Lois out?', onUse() {
    const f = favors.at('fieldnotes');
    if (f.st === 'none' && rotation.offerable('fieldnotes')) {
      if (birderHooks.lois) birderHooks.lois.say("twenty years of hedge notes and the wind took three pages. one blew back by the gateway, one's down along the dune rope, one's out by the tip. pages. GO.", 6);
      favors.offer('fieldnotes');                        // shows its own toast + to-do
    } else if (f.st === 'active' && f.step === 3) {
      if (birderHooks.lois) birderHooks.lois.say("the warbler page. you'd have KNOWN if you lost the warbler page.", 5);
      favors.complete('fieldnotes');                     // THE NOTES + 12 dibs
    }
  } });

  const pageInters = PAGES.map((p, i) => addInteraction({ x: p.x, z: p.z, r: 1.4, label: 'grab the page', onUse() {
    const f = favors.at('fieldnotes');
    if (f.st !== 'active' || f.step !== i) return;
    pageMeshes[i].visible = false;
    favors.advance('fieldnotes');                        // step i -> i+1
    toast(PAGE_TOASTS[i][0], PAGE_TOASTS[i][1]);
  } }));

  // =====================================================================
  //  BAITPHOTO — Gus + the fish snapshot
  // =====================================================================
  const gus = makeNPC({ x: GUS.x, z: GUS.z, ry: GUS_RY, wander: 0, name: 'Gus',
    palette: { suit: 0xcbb083, pants: 0x46403a, skin: 0xcf9e6f, hair: 0x3a2a1c, face: true },   // canvas apron, denim, weathered
    lines: ['crawlers are fresh. the coffee is not.', 'minnows by the dozen.',
            'wall\'s mostly perch. one carp — long story.', 'you fish? tell me you fish.'] });
  gus.group.position.y = 0;

  // fishBase: sum(state.fishLog) snapshotted when the favor ENTERS step 0 (at
  // offer AND on boot-resume) — fishLog persists, so a plain nonzero check
  // would false-complete. A NEW catch pushes the sum ABOVE the snapshot.
  let fishBase = null;

  const gusInter = addInteraction({ x: GUS.x, z: GUS.z, r: 2.4, label: "what's biting, Gus?", onUse() {
    const f = favors.at('baitphoto');
    if (f.st === 'none' && rotation.offerable('baitphoto')) {
      gus.say("wall's got a hole in it. loaner rod's down at Belmont harbor — the pier off the peninsula. catch me ONE honest fish, any size, then come tell me about it.", 6);
      favors.offer('baitphoto');
      fishBase = sumFish();                              // snapshot at offer
    } else if (f.st === 'active' && f.step === 1) {
      screenFx.flash('#ffffff', 240); shutterTick();     // the camera-flash beat
      gus.setFace('happy');
      gus.say('little blurry. suits it.', 4.5);
      favors.complete('baitphoto');                      // WALL WORTHY + 10 dibs
    }
  } });

  // ---- persistence-at-boot: snapshot fishBase if the save is mid-catch ----
  {
    const b = favors.at('baitphoto');
    if (b.st === 'active' && b.step === 0) fishBase = sumFish();   // resume: only a NEW catch completes it
  }
  // fieldnotes needs no boot block — page meshes/interactions are driven purely
  // by favors.at() in the gate update below, which self-resumes at the right step.

  // =====================================================================
  //  gating — enable/label each interaction from favor state (throttled).
  //  NEVER call rotation.offerable() in onWorldReady (computeToday would cache
  //  before every pack has joined the pool); defer it to the first update.
  // =====================================================================
  for (const it of [loisInter, gusInter, ...pageInters]) it.enabled = false;

  function updateGates() {
    // fieldnotes
    const f = favors.at('fieldnotes');
    const offerF = (f.st === 'none' && rotation.offerable('fieldnotes'));
    const turnInF = (f.st === 'active' && f.step === 3);
    loisInter.enabled = offerF || turnInF;
    loisInter.setLabel(turnInF ? "here are your pages, Lois" : 'help Lois out?');
    for (let i = 0; i < pageMeshes.length; i++) {
      const on = (f.st === 'active' && f.step === i);
      pageInters[i].enabled = on;
      pageMeshes[i].visible = on;
    }
    // baitphoto
    const b = favors.at('baitphoto');
    const offerB = (b.st === 'none' && rotation.offerable('baitphoto'));
    const turnInB = (b.st === 'active' && b.step === 1);
    gusInter.enabled = offerB || turnInB;
    gusInter.setLabel(turnInB ? 'show Gus the fish' : "what's biting, Gus?");
    // the fish poll: a NEW catch (sum above the snapshot) advances step 0 -> 1
    if (b.st === 'active' && b.step === 0 && fishBase != null && sumFish() > fishBase) {
      favors.advance('baitphoto');
    }
  }

  // =====================================================================
  //  per-frame — throttled gates + page flutter (visible pages only, no allocs)
  // =====================================================================
  let gate = 0;
  registerUpdate((dt, t) => {
    if (dt < 0) dt = 0;
    gate -= dt; if (gate <= 0) { gate = 0.4; updateGates(); }
    for (let i = 0; i < pageMeshes.length; i++) {
      const m = pageMeshes[i]; if (!m.visible) continue;
      m.position.y = 0.15 + Math.sin(t * 2.4 + i * 1.7) * 0.03;
      m.rotation.y = i * 1.3 + Math.sin(t * 1.6 + i) * 0.28;
      m.rotation.z = 0.1 + Math.sin(t * 3.1 + i) * 0.08;
    }
  });

  // ---- debug / E2E (merge, don't overwrite — packs race) ----
  try {
    window.__hd = window.__hd || {};
    window.__hd.f081 = Object.assign(window.__hd.f081 || {}, {
      fieldnotes: {
        at: () => favors.at('fieldnotes'),
        pagePos: () => PAGES.map(p => [p.x, p.z]),
        loisPos: { ...LOIS },
      },
      baitphoto: {
        at: () => favors.at('baitphoto'),
        gusPos: { ...GUS },
        fishBase: () => fishBase,
        fishSum: () => sumFish(),
      },
    });
  } catch (e) {}
});
