// =====================================================================
// THE CITY MAP + THE COMPASS BREADCRUMB (task 086)
//
// One screen that says "look how much city there is now": tapping the HUD
// minimap (or M on desktop) opens a full-screen stylized map card — the
// lakefront strip at its true shape (re-rendered from the SAME data the HUD
// minimap draws, via minimap.js drawLakefrontBase at ~2x), the hard cells
// (Wrigleyville, Millennium/Grant) as connected insets blitted from their
// registered cell minimap canvases, and the Red Line as the drawn thread
// between them in the transit-map register (45°/vertical runs, white-cased
// CTA red, stop discs, the dotted State St subway express, the Sheridan
// pass-through wink the in-car map already tells).
//
// Tap any landmark → a soft compass chevron (#crumb) sits at the screen edge
// pointing toward it, with honest meters that tick down. NO teleport —
// walking IS the game. A destination in another cell points at the correct
// departure board first (tiny train glyph; BOARDS/DEST from wrigley-ride.js
// are the single source of stop truth) and hands off to the landmark after
// the ride. Tap the same landmark again to clear.
//
// Draw budget: +0 — everything here is DOM/canvas. No rng anywhere (the
// world seed is untouched); discovery states read state.zonesVisited /
// state.wrigleyVisited / state.millenniumVisited and simply dim the unknown.
// =====================================================================
import { $, game } from '../core.js';
import { onWorldReady, registerUpdate, toast, state } from '../framework.js';
import { activeCell, getCell } from '../cells.js';
import { cam } from '../input.js';
import { drawLakefrontBase } from '../minimap.js';
import * as CH from '../data/chicago.js';
import * as WV from '../data/wrigleyville.js';
import * as MP from '../data/millennium.js';
import { BOARDS, DEST } from './wrigley-ride.js';

// ------------------------------ layout ---------------------------------
// Card canvas 720x1000 (CSS scales it; ~2x supersampled on a 390px phone).
// The strip window crops the HUD map's dead west band (x0 -170 → -20) and the
// far east lake (→ 350) and keeps the full z range, preserving the HUD map's
// ~2x horizontal spread so shapes read identically at card scale.
const CV = { w: 720, h: 1000 };
const STRIP = { x: 280, y: 24, w: 416, h: 877 };
const STRIP_M = { x0: -20, z0: CH.MAP.z0, w: 370, h: CH.MAP.h, cw: STRIP.w, ch: STRIP.h };
const INS_W = { x: 24, y: 96, w: 216, h: Math.round(216 * WV.MAP_W.ch / WV.MAP_W.cw) };   // 331
const INS_M = { x: 24, y: 730, w: 216, h: Math.round(216 * MP.MAP_M.ch / MP.MAP_M.cw) };  // 265
const TRUNK_X = 262;                       // the thread's vertical run between Addison and Belmont

const sxy = (x, z) => [STRIP.x + (x - STRIP_M.x0) / STRIP_M.w * STRIP.w, STRIP.y + (z - STRIP_M.z0) / STRIP_M.h * STRIP.h];
const wxy = (x, z) => [INS_W.x + (x - WV.MAP_W.x0) / WV.MAP_W.w * INS_W.w, INS_W.y + (z - WV.MAP_W.z0) / WV.MAP_W.h * INS_W.h];
const mxy = (x, z) => [INS_M.x + (x - MP.MAP_M.x0) / MP.MAP_M.w * INS_M.w, INS_M.y + (z - MP.MAP_M.z0) / MP.MAP_M.h * INS_M.h];
const CELL_XY = { lakefront: sxy, wrigleyville: wxy, 'wrigley-bowl': wxy, millennium: mxy };

// per-id label placement overrides (presentation only — the data tables stay
// pure layout truth): side 'l' = label left of the dot; dx/dy = card-px nudges.
// Hand-staggered so no label crosses another at 390px (shots-audited).
const LAB = {
  'yacht-club': { side: 'l' }, kwanusila: { side: 'l' }, golf: { side: 'l' },
  'park-bait': { side: 'l' }, 'cricket-hill': { side: 'l' }, diversey: { side: 'l' },
  'aids-garden': { side: 'l' },
  gallagher: { side: 'l', dy: 16 }, sluggers: { dy: -10 }, rooftops: { side: 'l', dy: -10 },
  rink: { side: 'l', dy: -14, dx: 6 }, crown: { dy: -10 }, maggie: { side: 'l', dy: -6 },
  lurie: { dy: 6 }, lolla: { side: 'l', dy: 12 }, bean: { dy: -2 },
  ribbon: { side: 'r', dy: -6 }, pritzker: { dy: 8 },
};

// ------------------------------ state ----------------------------------
let player = null;                    // live handle (onWorldReady)
let target = null;                    // the breadcrumb POI, or null
let POIS = [];                        // landmark + station targets (built once)
let board = null;                     // the card's static painting (rebuilt per open)
let hit = [];                         // tap targets: {x,y,poi}
let rideXY = [TRUNK_X, 476];          // "you are here" while riding (trunk midpoint)
const probe = { phi: 0, dist: 0, train: false };   // __hd.crumb.state() sampler

const SIBLINGS = ['journal', 'ctl', 'tote', 'shop', 'settings'];
const isOpen = () => $('citymap').classList.contains('show');

// --------------------------- painting helpers --------------------------
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function label(g, txt, x, y, opts) {
  g.font = (opts.bold ? '700 ' : '600 ') + opts.px + 'px "Trebuchet MS",sans-serif';
  g.textAlign = opts.align || 'left';
  if (opts.halo) {                       // cartographer's halo: legible over any ground
    g.strokeStyle = opts.halo; g.lineWidth = 3; g.lineJoin = 'round';
    g.strokeText(txt, x, y);
  }
  g.fillStyle = opts.col;
  g.fillText(txt, x, y);
}
// a small cream chip behind stop names so they read on any background
function chip(g, txt, x, y) {
  g.font = '700 12.5px "Trebuchet MS",sans-serif';
  const w = g.measureText(txt).width + 12;
  g.fillStyle = 'rgba(255,252,244,.93)'; rr(g, x - 6, y - 12, w, 17, 8); g.fill();
  g.fillStyle = '#8a2018'; g.textAlign = 'left'; g.fillText(txt, x, y + 1);
}

function seen(poi) {
  if (poi.cell === 'lakefront') return poi.zone ? state.zonesVisited.has(poi.zone) : true;
  if (poi.cell === 'wrigleyville') return !!state.wrigleyVisited;
  if (poi.cell === 'millennium') return !!state.millenniumVisited;
  return true;
}

function stopAnchor(cellId) {          // a station's boarding point = its boards' centroid
  let sx = 0, sz = 0, n = 0;
  for (const b of BOARDS) if (b[0] === cellId) { sx += b[1]; sz += b[2]; n++; }
  return n ? { x: sx / n, z: sz / n } : null;
}

function drawPois(g, list, cellId, toXY, edgeR, px) {
  for (const p of list) {
    const [x, y] = toXY(p.x, p.z);
    const vis = seen(p), o = LAB[p.id] || {};
    const dark = cellId !== 'lakefront';
    g.globalAlpha = vis ? 1 : 0.68;
    g.beginPath(); g.arc(x, y, 5.5, 0, 7);
    g.fillStyle = p.c; g.fill();
    g.lineWidth = 1.6; g.strokeStyle = dark ? 'rgba(248,238,216,.9)' : 'rgba(255,255,255,.9)'; g.stroke();
    const side = o.side || (x > edgeR - 92 ? 'l' : 'r');   // explicit side wins the edge auto-flip
    label(g, p.n, x + (side === 'l' ? -9 : 9) + (o.dx || 0), y + 4 + (o.dy || 0), {
      px, align: side === 'l' ? 'right' : 'left',
      halo: dark ? 'rgba(28,26,36,.8)' : 'rgba(248,238,216,.92)',
      col: dark ? (vis ? '#f0e8d8' : 'rgba(240,232,216,.62)') : (vis ? '#4a3b2f' : 'rgba(74,59,47,.58)'),
    });
    g.globalAlpha = 1;
    hit.push({ x, y, poi: p });
  }
}

// ------------------------------ the board ------------------------------
function buildBoard() {
  board = document.createElement('canvas'); board.width = CV.w; board.height = CV.h;
  const g = board.getContext('2d'); hit = [];
  g.fillStyle = '#f8eed8'; g.fillRect(0, 0, CV.w, CV.h);           // the map sheet

  // ---- the lakefront strip (live re-render of the minimap data at ~2x) ----
  const off = document.createElement('canvas'); off.width = STRIP.w; off.height = STRIP.h;
  drawLakefrontBase(off.getContext('2d'), STRIP_M, { dots: false });
  g.save(); rr(g, STRIP.x, STRIP.y, STRIP.w, STRIP.h, 12); g.clip();
  g.drawImage(off, STRIP.x, STRIP.y);
  { // Lake Shore Drive band on the strip's west margin — the drive the park hangs off
    const [bx0] = sxy(-20, 0), [bx1] = sxy(8, 0);
    g.fillStyle = '#b3ac9c'; g.fillRect(bx0, STRIP.y, bx1 - bx0, STRIP.h);
    const [cx] = sxy(-6, 0);
    g.strokeStyle = 'rgba(248,238,216,.75)'; g.lineWidth = 2; g.setLineDash([9, 11]);
    g.beginPath(); g.moveTo(cx, STRIP.y); g.lineTo(cx, STRIP.y + STRIP.h); g.stroke(); g.setLineDash([]);
    g.save(); g.translate(cx + 11, STRIP.y + STRIP.h / 2); g.rotate(-Math.PI / 2);
    label(g, 'lake shore drive', 0, 0, { px: 10, align: 'center', col: 'rgba(74,59,47,.42)' });
    g.restore();
  }
  g.restore();
  g.lineWidth = 2; g.strokeStyle = 'rgba(74,59,47,.18)'; rr(g, STRIP.x, STRIP.y, STRIP.w, STRIP.h, 12); g.stroke();
  label(g, 'the lakefront', STRIP.x + 4, STRIP.y - 7, { px: 13, bold: true, col: '#8a5a3a' });

  // ---- the cell insets (their own registered minimap canvases) ----
  // titleInside: the millennium caption sits IN its inset (haloed) — the express
  // thread hugs that inset's top edge, so an above-the-box title would collide.
  const inset = (cell, R, title, visited, titleInside) => {
    g.save(); rr(g, R.x, R.y, R.w, R.h, 10); g.clip();
    if (cell && cell.minimapBase) g.drawImage(cell.minimapBase, R.x, R.y, R.w, R.h);
    else { g.fillStyle = '#3d3a45'; g.fillRect(R.x, R.y, R.w, R.h); }
    g.restore();
    g.lineWidth = 2; g.strokeStyle = 'rgba(74,59,47,.18)'; rr(g, R.x, R.y, R.w, R.h, 10); g.stroke();
    const ty = titleInside ? R.y + R.h - 11 : R.y - 7;
    label(g, title, R.x + (titleInside ? 9 : 2), ty,
      titleInside ? { px: 13, bold: true, col: '#f0e8d8', halo: 'rgba(28,26,36,.85)' }
                  : { px: 13, bold: true, col: '#8a5a3a' });
    if (!visited) label(g, 'ride the L', R.x + R.w - (titleInside ? 9 : 2), ty,
      { px: 10, align: 'right', col: titleInside ? 'rgba(240,232,216,.8)' : '#b39d85', halo: titleInside ? 'rgba(28,26,36,.85)' : undefined });
  };
  inset(getCell('wrigleyville'), INS_W, 'wrigleyville', !!state.wrigleyVisited, false);
  inset(getCell('millennium'), INS_M, 'millennium park', !!state.millenniumVisited, true);

  // ---- the Red Line thread (transit-map register) ----
  const pxStop = {};
  for (const k of ['wrigleyville', 'lakefront', 'millennium']) {
    const a = stopAnchor(k); pxStop[k] = CELL_XY[k](a.x, a.z);
  }
  const A = pxStop.wrigleyville, B = pxStop.lakefront, Mo = pxStop.millennium;
  const solid = [A, [TRUNK_X, A[1] + (TRUNK_X - A[0])], [TRUNK_X, B[1] - (B[0] - TRUNK_X)], B];
  const yh = B[1] + 8;                                        // 45° off Belmont, then the express west
  const express = [B, [B[0] - 8, yh], [Mo[0] + (Mo[1] - yh), yh], Mo];
  rideXY = [TRUNK_X, (solid[1][1] + solid[2][1]) / 2];
  const line = (pts, dash) => {
    for (const [w, c] of [[13, 'rgba(248,238,216,.95)'], [8, '#c9252c']]) {   // white-cased CTA red
      g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
      g.setLineDash(dash ? [0.1, w * 1.9] : []);
      g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
      g.stroke(); g.setLineDash([]);
    }
  };
  line(solid, false);
  line(express, true);                                        // the State St subway express (dotted)
  { // Sheridan pass-through tick — the same wink the in-car map tells
    const sy = rideXY[1];
    g.fillStyle = '#e8b5ad'; g.beginPath(); g.arc(TRUNK_X, sy, 4, 0, 7); g.fill();
    label(g, 'sheridan', TRUNK_X - 9, sy + 4, { px: 9.5, align: 'right', col: 'rgba(138,32,24,.55)' });
  }
  // stop discs + chips (tappable: a stop is a valid heading too)
  const stopDefs = [
    ['wrigleyville', 'addison', A, -66, -8],
    ['lakefront', 'belmont', B, 8, -18],
    ['millennium', 'monroe', Mo, -14, 22],
  ];
  for (const [cellId, name, p, lx, ly] of stopDefs) {
    g.beginPath(); g.arc(p[0], p[1], 8, 0, 7);
    g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3.4; g.strokeStyle = '#c9252c'; g.stroke();
    chip(g, name, p[0] + lx, p[1] + ly);
    const a = stopAnchor(cellId);
    hit.push({ x: p[0], y: p[1], poi: { id: 'stop-' + name, n: name + ' · the L', cell: cellId, x: a.x, z: a.z } });
  }

  // ---- cartographic charm in the gutter (the quiet middle-left) ----
  { // the Chicago-flag nod from the title card: two sky stripes, four stars
    const fx = 148, fy = 492;
    g.fillStyle = '#9fd3e2';
    g.fillRect(fx - 62, fy - 20, 124, 5); g.fillRect(fx - 62, fy + 15, 124, 5);
    g.fillStyle = '#e0766a'; g.font = '15px sans-serif'; g.textAlign = 'center';
    g.fillText('✶  ✶  ✶  ✶', fx, fy + 5);
    // legend, in the same breath
    g.strokeStyle = '#c9252c'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(fx - 56, fy + 52); g.lineTo(fx - 26, fy + 52); g.stroke();
    label(g, 'the red line', fx - 16, fy + 56, { px: 10.5, col: '#8a5a3a' });
    g.beginPath(); g.arc(fx - 41, fy + 76, 5.5, 0, 7); g.fillStyle = '#fff'; g.fill();
    g.beginPath(); g.arc(fx - 41, fy + 76, 3.8, 0, 7); g.fillStyle = '#e0574a'; g.fill();
    label(g, 'you are here', fx - 16, fy + 80, { px: 10.5, col: '#8a5a3a' });
  }
  { // the lake gets its name
    g.save(); g.translate(STRIP.x + STRIP.w - 44, STRIP.y + 268); g.rotate(-Math.PI / 2);
    label(g, 'lake michigan', 0, 0, { px: 13, align: 'center', col: 'rgba(255,255,255,.55)' });
    g.restore();
  }

  // ---- landmarks (lowercase names; unknown places dim until discovered) ----
  // draw from POIS (the cell-TAGGED merge), never the raw tables: the hit list
  // feeds legFor(), which routes cross-cell headings by poi.cell.
  drawPois(g, POIS.filter(q => q.cell === 'lakefront'), 'lakefront', sxy, STRIP.x + STRIP.w, 12.5);
  drawPois(g, POIS.filter(q => q.cell === 'wrigleyville'), 'wrigleyville', wxy, INS_W.x + INS_W.w, 11);
  drawPois(g, POIS.filter(q => q.cell === 'millennium'), 'millennium', mxy, INS_M.x + INS_M.w, 11);
}

// ------------------------- the live overlay ----------------------------
function paint(t) {
  const cv = $('cmc'), g = cv.getContext('2d');
  g.drawImage(board, 0, 0);
  if (target) {                                    // the set heading: a gold pulse ring
    const f = CELL_XY[target.cell];
    if (f) {
      const [tx, ty] = f(target.x, target.z);
      g.beginPath(); g.arc(tx, ty, 10.5 + Math.sin(t * 3) * 1.6, 0, 7);
      g.lineWidth = 3; g.strokeStyle = '#e8b64c'; g.stroke();
    }
  }
  // you are here
  const c = activeCell();
  let px, py;
  if (c === 'redline-car') {
    [px, py] = rideXY;
    g.font = '14px sans-serif'; g.textAlign = 'center'; g.fillText('🚈', px, py - 12);
  } else { const f = CELL_XY[c] || sxy; [px, py] = f(player.x, player.z); }
  const k = (t % 1.6) / 1.6;                       // soft expanding discovery ring
  g.beginPath(); g.arc(px, py, 8 + k * 14, 0, 7);
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(224,87,74,' + (0.55 * (1 - k)) + ')'; g.stroke();
  g.beginPath(); g.arc(px, py, 6.5, 0, 7); g.fillStyle = '#fff'; g.fill();
  g.beginPath(); g.arc(px, py, 4.6, 0, 7); g.fillStyle = '#e0574a'; g.fill();
}

// --------------------------- open / close ------------------------------
function openMap() {
  if (!game.running) return;
  for (const id of SIBLINGS) { const e = $(id); if (e) e.classList.remove('show'); }
  buildBoard(); syncSub();
  $('citymap').classList.add('show');
}
function closeMap() { $('citymap').classList.remove('show'); }
function syncSub() {
  $('cmSub').innerHTML = target
    ? 'guiding: <b>' + target.n + '</b> &mdash; tap it again to clear'
    : 'tap a landmark &mdash; a soft compass walks you there';
}

// ------------------------- the breadcrumb ------------------------------
function legFor(p) {
  const c = activeCell();
  if (!p || c === 'redline-car') return null;      // riding: the target persists, the chevron rests
  if (c === p.cell) return { x: p.x, z: p.z, train: false };
  const b = BOARDS.find(b => b[0] === c && b[4] === p.cell);
  if (!b) return null;                             // pocket cells (the bowl) have no boards
  return { x: b[1], z: b[2], train: true, stop: DEST[c] ? DEST[c].stop : 'the L' };
}
function fmt(d) { return (d < 100 ? Math.round(d) : Math.round(d / 5) * 5) + ' m'; }
function setCrumb(p, d) {
  target = p;
  const leg = legFor(p);
  if (leg && leg.train) toast(p.n, '🚈 ride the Red Line — board at ' + leg.stop);
  else toast(p.n, 'follow the chevron — ' + fmt(d));
  closeMap();
}
function clearCrumb() { target = null; $('crumb').classList.remove('on'); }

const crumbCache = { name: '', sub: '' };
function updateCrumb(dt, t, p) {
  const el = $('crumb');
  const leg = game.running ? legFor(target) : null;
  if (!leg) { el.classList.remove('on'); return; }
  const dx = leg.x - p.x, dz = leg.z - p.z, d = Math.hypot(dx, dz);
  if (!leg.train && d < 12) {                      // arrived — the compass bows out
    toast(target.n, 'you made it'); clearCrumb(); return;
  }
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
  const rx = -Math.cos(cam.yaw), rz = Math.sin(cam.yaw);
  const phi = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz);
  probe.phi = phi; probe.dist = d; probe.train = leg.train;
  const W = innerWidth, H = innerHeight;
  const cx = W / 2, cy = H * 0.44, RX = W / 2 - 78, RY = cy - 104;
  el.style.left = (cx + Math.sin(phi) * RX) + 'px';
  el.style.top = (cy - Math.cos(phi) * RY) + 'px';
  $('crumbRot').style.transform = 'rotate(' + phi.toFixed(3) + 'rad)';
  el.classList.toggle('faceon', Math.abs(phi) < 0.35);
  const name = (leg.train ? '🚈 ' : '') + target.n;
  const sub = leg.train ? 'board at ' + leg.stop.toLowerCase() + ' · ' + fmt(d) : fmt(d);
  if (name !== crumbCache.name) { crumbCache.name = name; $('crumbName').textContent = name; }
  if (sub !== crumbCache.sub) { crumbCache.sub = sub; $('crumbSub').textContent = sub; }
  el.classList.add('on');
}

// ------------------------------ wiring ---------------------------------
onWorldReady((p) => {
  player = p;
  POIS = [
    ...CH.CITY_POI.map(q => ({ ...q, cell: 'lakefront' })),
    ...WV.CITY_POI_W.map(q => ({ ...q, cell: 'wrigleyville' })),
    ...MP.CITY_POI_M.map(q => ({ ...q, cell: 'millennium' })),
  ];
  $('mmc').addEventListener('click', openMap);     // the minimap is the door
  $('cmClose').addEventListener('click', closeMap);
  { // tap-outside closes — only when the gesture STARTED on the backdrop too
    // (the touch-interaction modal-close trap, PITFALLS / task 078)
    const card = $('citymap'); let downOnBackdrop = false;
    card.addEventListener('pointerdown', e => { downOnBackdrop = (e.target === card); });
    card.addEventListener('click', e => { if (e.target === card && downOnBackdrop) closeMap(); });
  }
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'm' && !e.repeat && game.running) { if (isOpen()) closeMap(); else openMap(); }
    else if (e.key === 'Escape' && isOpen()) closeMap();
  });
  $('cmc').addEventListener('click', e => {
    const r = e.target.getBoundingClientRect();
    const x = (e.clientX - r.left) * CV.w / r.width, y = (e.clientY - r.top) * CV.h / r.height;
    let best = null, bd = 52 * 52;                 // nearest landmark within a thumb's reach
    for (const h of hit) { const dx = h.x - x, dy = h.y - y, d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; best = h; } }
    if (!best) return;
    if (target && target.id === best.poi.id) { clearCrumb(); syncSub(); return; }
    const leg = legFor(best.poi) || best.poi;
    setCrumb(best.poi, Math.hypot((leg.x ?? best.poi.x) - p.x, (leg.z ?? best.poi.z) - p.z));
  });
  registerUpdate((dt, t, pl) => {
    if (isOpen()) {
      // one card at a time: any sibling opening on top folds the map away
      for (const id of SIBLINGS) { const e = $(id); if (e && e.classList.contains('show')) { closeMap(); break; } }
      if (isOpen()) paint(t);
    }
    updateCrumb(dt, t, pl);
  });
  // debug/E2E hooks (tools only)
  try {
    window.__hd = window.__hd || {};
    window.__hd.citymap = {
      open: openMap, close: closeMap, isOpen, cell: activeCell,
      pois: () => hit.map(h => h.poi.id),
      poiXY: id => { const h = hit.find(h => h.poi.id === id); return h ? [h.x, h.y] : null; },
      poiScreen: id => {
        const h = hit.find(h => h.poi.id === id); if (!h) return null;
        const r = $('cmc').getBoundingClientRect();
        return [r.left + h.x * r.width / CV.w, r.top + h.y * r.height / CV.h];
      },
    };
    window.__hd.crumb = {
      set: id => { const q = POIS.find(q => q.id === id); if (q) { target = q; } },
      clear: () => clearCrumb(),
      state: () => ({
        id: target && target.id, train: probe.train, dist: probe.dist, phi: probe.phi,
        visible: $('crumb').classList.contains('on'), faceon: $('crumb').classList.contains('faceon'),
      }),
    };
  } catch (e) { }
});
