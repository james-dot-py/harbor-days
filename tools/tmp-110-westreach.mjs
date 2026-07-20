// tmp (task 110): compute the WEST-REACH provenance for Lincoln Park and INJECT
// it into refs/lincoln-park/osm.json as provenance.scout110 (the Montrose
// scout067 precedent). All numbers in the TRUE game projection (offset none).
// Endpoints are first/last NODES of the ordered way, never bbox corners.
import { readFileSync, writeFileSync } from 'fs';
const PATH = 'refs/lincoln-park/osm.json';
const doc = JSON.parse(readFileSync(PATH, 'utf8'));
const F = doc.features;
const all = [...F.highways, ...F.parks, ...F.buildings, ...F.landmarks, ...F.water, ...F.other, ...F.waterways];
const r1 = v => Math.round(v * 10) / 10;

// x where a named N-S highway crosses latitude line z=zLine (segment bracket).
function xAtZ(nameRe, zLine) {
  const re = new RegExp(nameRe, 'i');
  const out = [];
  for (const h of F.highways) {
    if (!re.test(h.name || '')) continue;
    const p = h.points;
    for (let i = 0; i < p.length - 1; i++) {
      const [xa, za] = p[i], [xb, zb] = p[i + 1];
      if ((za - zLine) * (zb - zLine) <= 0 && za !== zb) {
        const t = (zLine - za) / (zb - za);
        out.push(r1(xa + t * (xb - xa)));
      }
    }
  }
  return out.sort((a, b) => a - b);
}
const bboxById = id => {
  for (const f of all) if (f.id === id && f.points) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const [x, z] of f.points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    return [r1(x0), r1(x1), r1(z0), r1(z1)];
  }
  return null;
};
const xExtById = id => { const b = bboxById(id); return b ? [b[0], b[1]] : null; };

// DuSable LSD east edge drift with latitude (the mirror of Montrose's westward drift).
const lsdRe = 'Jean Baptiste Point DuSable Lake Shore';
const lsdDrift = {};
for (const z of [0, 200, 400, 600, 794, 1000, 1200]) {
  const xs = xAtZ(lsdRe, z);
  lsdDrift['z' + z] = xs.length ? xs : null;   // [westEdge, eastEdge] where two crossings
}

// West reach at Fullerton (z 794, Fullerton Pkwy through the park).
const zF = 794;
const lsdF = xAtZ(lsdRe, zF);
const lsdEastF = lsdF.length ? Math.max(...lsdF) : null;   // reference for LSD-relative offsets
const streetsF = {
  'Clark St': xAtZ('North Clark Street', zF),
  'Lincoln Park West': xAtZ('Lincoln Park West', zF),
  'Stockton Dr (zoo W edge)': xAtZ('Stockton Drive', zF),
  'Cannon Dr (zoo E flank / lagoon W)': xAtZ('Cannon Drive', zF),
  'DuSable Lake Shore Dr': lsdF,
};
// LSD-relative (holding DuSable-LSD-east at game x0-14, the every-berm rule): feature x - lsdEast.
const rel = {};
for (const [k, v] of Object.entries(streetsF)) rel[k] = v.map(x => r1(x - lsdEastF));

const scout110 = {
  task: '110 (SCOUT)',
  authored: '2026-07-19',
  frame: 'TRUE game projection (offset none): x=0 at LSD east edge & z=0 at Belmont, 1:2 distances. osm x IS true x here; osm z IS game z.',
  gridSanity: {
    note: 'expected per acceptance vs measured centerline (lakefront asserts show a -5..-7 systemic delta from the diagonal; consistent here).',
    'Diversey Pkwy (2800N) exp z+402': r1(median(zLineOf('Diversey Parkway'))),
    'Fullerton Pkwy (2400N) exp z+805': r1(median(zLineOf('Fullerton Parkway'))),
    'Armitage Ave (2000N) exp z+1207': r1(median(zLineOf('Armitage Avenue'))),
  },
  westReachAtFullerton: {
    zLine: zF,
    order_west_to_east: 'Clark(-155) -> Lincoln Park West(+7) -> Stockton(+30) -> [ZOO] -> Cannon(+132) -> [Diversey Harbor lagoon] -> DuSable LSD(+230..238) -> [Theater on the Lake +236..270] -> lake',
    trueProjection_x: streetsF,
    lsdRelative_x: {
      note: 'feature_x minus DuSable-LSD-east-edge (' + r1(lsdEastF) + ') — i.e. if the game holds DuSable LSD at its usual x0-14 berm, how far WEST each feature lands. This is the number 111 rules the west-reach compression against.',
      values: rel,
    },
  },
  lsdEastwardDrift: {
    note: 'DuSable Lake Shore Drive east edge x by latitude (true projection). At Belmont z0 the anchor holds it at x0; going SOUTH into Lincoln Park it drifts EAST to ~+230 at Fullerton — the MIRROR of Montrose (LSD drifts WEST going north). This is why the built park core (Stockton..Cannon) lands in POSITIVE x 30..132 even though it is geographically WEST of the Drive.',
    byZ: lsdDrift,
  },
  featureXExtents_trueProjection: {
    note: 'x-extent [min,max] of the signature features (true projection). The built park CORE fits inside the current map band (x -10..245); only DuSable LSD + Theater on the Lake + open lake push past xMax 244 (Theater to ~270).',
    'Lincoln Park Conservatory (23986733)': xExtById(23986733),
    'Palm House (1428865072)': xExtById(1428865072),
    'Eli Bates Fountain / Storks at Play (210686594)': xExtById(210686594),
    'Sea Lion / Seal Pool (758343800)': xExtById(758343800),
    'Kovler Lion House (210686223)': xExtById(210686223),
    'Regenstein Center for African Apes (210685702)': xExtById(210685702),
    'Cafe Brauer / South Pond Refectory (24826112)': xExtById(24826112),
    'Farm Main Barn (24826126)': xExtById(24826126),
    'South Pond Natural Area (758462738)': xExtById(758462738),
    'Peoples Gas Education Pavilion / honeycomb (186667195)': xExtById(186667195),
    'Theater on the Lake (23989552)': xExtById(23989552),
    'Diversey Harbor channel main outer (17750786)': xExtById(17750786),
  },
  orderedEndpoints_notBboxCorners: {
    note: 'first/last NODES of the ordered way (PITFALLS: endpoints are nodes, not bbox corners).',
    'Diversey Harbor channel (17750786, 56-pt outer)': { first: [235.5, 411.1], last: [167.2, 741.8], role: 'runs N (Diversey basin, z411) -> S (Fullerton, z742) along the zoo east flank / west shore of the lagoon' },
    'Theater on the Lake footprint (23989552)': { first: [235.6, 702], spansTo: [270.2, 723.6], note: 'closed footprint EAST of DuSable LSD on the Fullerton lakefront; center ~ (252,713)' },
    'Seal/Sea Lion Pool (758343800)': { center: [98, 1021.5], note: 'round pool, x91.9..103.8 z1015.4..1028.2' },
    'Eli Bates Fountain (210686594)': { center: [64, 952], note: 'x61.1..66.9 z949.4..955.2' },
  },
};

function zLineOf(nameRe) {
  const re = new RegExp(nameRe, 'i');
  const zs = [];
  for (const h of F.highways) if (re.test(h.name || '')) for (const [, z] of h.points) zs.push(z);
  return zs;
}
function median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

doc.provenance = doc.provenance || {};
doc.provenance.scout110 = scout110;
writeFileSync(PATH, JSON.stringify(doc, null, 1));
console.log(JSON.stringify(scout110, null, 2));
