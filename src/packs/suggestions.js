// NEIGHBORHOOD SUGGESTION BOX (task 013; relocated to the AIDS Garden entrance
// forecourt by owner direction in task 023) — a diegetic park-district box on
// the spawn plaza. The game winks at expansion; now the wink takes requests.
// E opens a DOM card (style-matched to the controls
// card) with a textarea + Send; Send POSTs the note to a public ntfy topic the
// owner subscribes to. This is the game's FIRST runtime network call, so it is
// strictly opt-in: it fires ONLY on the Send click, is wrapped in try/catch, and
// falls back to a mailto link — the game stays fully playable offline.
//
// No rng (fixed placement/geometry) — determinism-safe. The box is a small
// collider on existing LAND: no new walkable surface. Placement is CH.SUGGESTION_BOX
// so the pack, walkprobe and gen-waypoints share one source.
import * as THREE from 'three';
import { scene, toon, bmat, curveMat } from '../core.js';
import { onWorldReady, addInteraction, toast } from '../framework.js';
import { collide } from '../props.js';
import { keys } from '../input.js';
import { SUGGESTION_BOX as BOX } from '../data/chicago.js';

const NTFY_URL = 'https://ntfy.sh/ope-suggestions-47f05eb0';
const NTFY_TITLE = 'Ope! player suggestion';
const MAILTO = 'mailto:jimbo@playope.com?subject=Ope!%20neighborhood%20suggestion';   // owner directive 2026-07-10
const MAX = 500;

// -------- the painted front label ("OPE! — welcome to the lakefront") --------
// 099 (owner 2026-07-19): the old 'WHERE NEXT? — drop a suggestion' read as
// real-world/meta sign text at the spawn. The label is now the in-world
// welcome/orientation sign in the Ope! voice, echoing the title card ("the
// rocks, the harbor — and the L up to wrigleyville"). The reader faces the
// label looking ESE, so the directions are true from here: the rocks ahead
// (east), the harbor left (north), the L behind (west — the Belmont platform
// stub over the berm). '✉ press E' stays — the box still takes suggestions
// (the mail slot above keeps its meaning). TEXT SWAP ONLY (owner 099): same
// canvas, palette roles, and layout ladder as the old label.
function labelTex() {
  const W = 384, H = 320, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#fdf6e6'; g.fillRect(0, 0, W, H);                       // cream field
  g.strokeStyle = '#c9a97a'; g.lineWidth = 12; g.strokeRect(10, 10, W - 20, H - 20);
  g.textAlign = 'center';
  const fit = (text, y, px, weight) => {                               // shrink-to-fit inside the border
    let s = px;
    g.font = `${weight} ${s}px "Trebuchet MS",sans-serif`;
    while (s > 14 && g.measureText(text).width > W - 64) { s--; g.font = `${weight} ${s}px "Trebuchet MS",sans-serif`; }
    g.fillText(text, W / 2, y);
  };
  g.fillStyle = '#2f6b46'; fit('OPE!', 88, 68, '800');
  g.fillStyle = '#4a3b2f'; fit('welcome to the lakefront', 134, 30, '600');
  g.strokeStyle = '#d8b48a'; g.lineWidth = 4; g.beginPath(); g.moveTo(96, 158); g.lineTo(W - 96, 158); g.stroke();
  g.fillStyle = '#4a3b2f';
  fit('the rocks ↑ · the harbor ←', 194, 26, '600');
  fit('the L behind ya — wrigleyville', 230, 26, '600');
  g.fillStyle = '#e0766a'; fit('✉  press  E', 286, 38, '700');         // ✉ press E
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return tex;
}

// ---------------------------- the box mesh (house toon) ----------------------
function buildBox() {
  const g = new THREE.Group();
  g.position.set(BOX.x, 0, BOX.z); g.rotation.y = BOX.ry;
  g.scale.setScalar(BOX.scale || 1);   // owner 2026-07-10: park-kiosk presence, readable from the spawn
  const WOOD = 0x8a6a4a, GREEN = 0x2f6b46, DARKGREEN = 0x244f34, BRASS = 0xcaa24a;
  // sunk wooden post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 1.06, 7), toon(WOOD));
  post.position.y = 0.53; g.add(post);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.14, 8), toon(0x6f5335));
  foot.position.y = 0.07; g.add(foot);
  // painted body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.7, 0.44), toon(GREEN));
  body.position.y = 1.42; g.add(body);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.48), toon(DARKGREEN));
  trim.position.y = 1.10; g.add(trim);                                   // base band
  // shallow gabled lid (4-sided pyramid), 45° so faces align with the body
  const lid = new THREE.Mesh(new THREE.ConeGeometry(0.53, 0.26, 4), toon(DARKGREEN));
  lid.position.y = 1.90; lid.rotation.y = Math.PI / 4; g.add(lid);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), bmat(BRASS));
  finial.position.y = 2.06; g.add(finial);
  // brass mail slot on the front, above the label
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.05), bmat(0x2a2118));
  slot.position.set(0, 1.66, 0.225); g.add(slot);
  const slotLip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.03), toon(BRASS));
  slotLip.position.set(0, 1.61, 0.23); g.add(slotLip);
  // painted front label (curved with the world; FrontSide so no mirrored text
  // shows from behind — the opaque body sits right behind it). z 0.234 is 14 mm
  // local (~22 mm world at scale 1.55) proud of the 0.220 body face so the two
  // don't z-fight.
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.44),
    curveMat(new THREE.MeshBasicMaterial({ map: labelTex() })));
  label.position.set(0, 1.34, 0.234); g.add(label);
  return g;
}

// --------------------------------- the DOM card ------------------------------
let ov = null, ta = null, sendBtn = null, countEl = null, cardOpen = false;
function buildCard() {
  const st = document.createElement('style');
  st.textContent = `
    #suggest{position:fixed;inset:0;z-index:38;display:none;align-items:center;justify-content:center;
      background:rgba(74,59,47,.42)}
    #suggest.show{display:flex}
    .sgcard{position:relative;background:var(--cream);color:var(--ink);border-radius:22px;
      padding:24px 26px 20px;width:min(440px,88vw);
      box-shadow:0 10px 0 rgba(122,62,44,.28),0 24px 50px rgba(122,62,44,.25)}
    .sgcard h1{font-size:17px;letter-spacing:.2em;margin:0 2px 4px;text-align:center;color:var(--ink);
      text-shadow:0 2px 0 #f3d9a7}
    .sgcard .sgsub{margin:0 0 14px;text-align:center;font-size:13px;letter-spacing:.03em;color:#8a7561}
    .sgcard textarea{width:100%;box-sizing:border-box;min-height:104px;resize:none;border:2px solid #e3d3b4;
      border-radius:14px;background:#fffdf7;color:var(--ink);font-family:inherit;font-size:14px;line-height:1.5;
      padding:11px 13px;letter-spacing:.02em;outline:none}
    .sgcard textarea:focus{border-color:#c9a97a}
    .sgcard .sgcount{font-size:11px;color:#b39d85;text-align:right;margin:5px 3px 0}
    .sgrow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}
    .sgcard .sgmail{color:#c07a4a;font-size:12px;letter-spacing:.04em;text-decoration:none;
      border-bottom:1px dotted #d8b48a;padding-bottom:1px;transition:color .15s ease}
    .sgcard .sgmail:hover{color:#e0766a}
    #sgSend{cursor:pointer;border:none;border-radius:999px;padding:11px 30px;font-size:15px;font-family:inherit;
      letter-spacing:.06em;color:#fff;background:#5db06b;box-shadow:0 5px 0 #3f8a4d;
      transition:transform .14s ease,box-shadow .14s ease,background .14s ease}
    #sgSend:hover{transform:translateY(-2px);box-shadow:0 7px 0 #3f8a4d}
    #sgSend:active{transform:translateY(3px);box-shadow:0 2px 0 #3f8a4d}
    #sgSend:disabled{background:#b7c9ad;box-shadow:0 5px 0 #93a889;cursor:default;transform:none}
    #sgClose{position:absolute;top:11px;right:13px;width:30px;height:30px;border:none;border-radius:50%;
      cursor:pointer;background:#e0766a;color:#fff;font-size:16px;line-height:1;
      box-shadow:0 2px 0 rgba(122,62,44,.3);padding:0}`;
  document.head.appendChild(st);

  ov = document.createElement('div'); ov.id = 'suggest';
  ov.innerHTML = `
    <div class="sgcard">
      <button id="sgClose" aria-label="close">&times;</button>
      <h1>WHERE NEXT?</h1>
      <div class="sgsub">Where should Ope! go next?</div>
      <textarea id="sgText" maxlength="${MAX}" placeholder="A neighborhood, a park, an L stop… tell Jimbo where to build next."></textarea>
      <div class="sgcount"><span id="sgCount">0</span>/${MAX}</div>
      <div class="sgrow">
        <a class="sgmail" href="${MAILTO}">or email Jimbo</a>
        <button id="sgSend">Send</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  ta = ov.querySelector('#sgText');
  sendBtn = ov.querySelector('#sgSend');
  countEl = ov.querySelector('#sgCount');

  // Isolate the game from typing: input.js listens on window (bubble) with no
  // field check, so WASD/SPACE/E/F would drive the player while typing. A
  // stopPropagation listener on the card container (which the textarea/buttons
  // bubble through) means those key events never reach input.js — while the
  // default text-input action still happens at the textarea target. Escape closes.
  const swallow = e => { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Escape') close(); };
  ov.addEventListener('keydown', swallow);
  ov.addEventListener('keyup', swallow);
  ov.addEventListener('keypress', swallow);
  // click on the dimmed backdrop (not the card) closes
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  ov.querySelector('#sgClose').addEventListener('click', close);
  ta.addEventListener('input', () => { countEl.textContent = String(ta.value.length); });
  sendBtn.addEventListener('click', send);
}

function open() {
  if (!ov) buildCard();
  cardOpen = true;
  keys.clear();                 // drop any movement key held when E fired
  sendBtn.disabled = false; sendBtn.textContent = 'Send';
  ov.classList.add('show');
  ta.focus();
}
function close() {
  cardOpen = false;
  if (ov) ov.classList.remove('show');
}

async function send() {
  const text = ta.value.trim();
  if (!text) { ta.focus(); return; }
  sendBtn.disabled = true;
  const orig = sendBtn.textContent; sendBtn.textContent = 'Sending…';
  try {
    // string body → fetch sets Content-Type text/plain;charset=UTF-8, which ntfy
    // renders as the inline message (a form-encoded body would become a file).
    const res = await fetch(NTFY_URL, { method: 'POST', headers: { Title: NTFY_TITLE }, body: text.slice(0, MAX) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    toast('Ope! Suggestion sent — thanks ♥');
    ta.value = ''; countEl.textContent = '0';
    close();
  } catch (err) {
    console.warn('[suggestions] send failed', err);
    toast('Couldn’t reach the box', 'no worries — use “or email Jimbo” below');
    sendBtn.disabled = false; sendBtn.textContent = orig;
  }
}

onWorldReady(() => {
  scene.add(buildBox());                       // lakefront is always-visible; no cell merge here
  collide(BOX.x, BOX.z, 0.5 * (BOX.scale || 1));   // small collider, no new walkable surface
  addInteraction({ x: BOX.x, z: BOX.z, r: 1.6 + 0.5 * ((BOX.scale || 1) - 1), label: 'suggest a neighborhood', onUse: () => { if (!cardOpen) open(); } });
});
