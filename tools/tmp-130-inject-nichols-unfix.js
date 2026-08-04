// TEETH TEST for the 130 nichols winding fix: put the PRE-FIX (task 060)
// winding back at runtime by reversing every triangle of the mp-nichols-deck
// ribbon, without touching the source. Run:
//   node tools/deck-coverage.mjs --inject=tools/tmp-130-inject-nichols-unfix.js
// Expect CHECK F to fail on mp-nichols-deck, its plank sweep to collapse to a
// handful of cells — and mp-bluhm-terrace's CHECK C to go GREEN again, which is
// the whole point: the terrace only ever "reached real ground" because the
// bridge it stands on was invisible to the raycaster.
(() => {
  const e = window.__hd.deckMeshes.find(d => d.id === 'mp-nichols-deck');
  const p = e.mesh.geometry.attributes.position;
  for (let i = 0; i < p.count; i += 3) {                 // swap vertices 1 and 2 of each tri
    const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1);
    p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
    p.setXYZ(i + 2, x, y, z);
  }
  p.needsUpdate = true;
  e.mesh.geometry.computeVertexNormals();
  console.log('[inject] mp-nichols-deck rewound BACKWARDS (' + (p.count / 3) + ' tris)');
})();
