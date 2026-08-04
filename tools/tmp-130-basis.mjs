// tmp-130-basis.mjs — is boxBetween's makeBasis right- or left-handed, and does
// swapping it change the SHAPE or only the winding? (nichols.js pier/bench struts)
import * as THREE from 'three';
const vol = g => {
  const p = g.attributes.position, i = g.index; let v = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const n = i ? i.count : p.count;
  for (let k = 0; k < n; k += 3) {
    const i0 = i ? i.getX(k) : k, i1 = i ? i.getX(k + 1) : k + 1, i2 = i ? i.getX(k + 2) : k + 2;
    a.fromBufferAttribute(p, i0); b.fromBufferAttribute(p, i1); c.fromBufferAttribute(p, i2);
    v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return v;
};
const mk = (flip) => {
  const A = new THREE.Vector3(118.4, 0, 872), B = new THREE.Vector3(117.85, 3.13, 872), thick = 0.17;
  const dir = B.clone().sub(A), len = dir.length(); dir.normalize();
  const up = Math.abs(dir.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const ez = new THREE.Vector3().crossVectors(dir, up).normalize();
  const ex = flip ? new THREE.Vector3().crossVectors(dir, ez).normalize()
                  : new THREE.Vector3().crossVectors(ez, dir).normalize();
  const g = new THREE.BoxGeometry(thick, len, thick);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(ex, dir, ez).setPosition(A.clone().add(B).multiplyScalar(0.5)));
  return { det: ex.dot(new THREE.Vector3().crossVectors(dir, ez)), vol: vol(g), g };
};
const oldB = mk(false), newB = mk(true);
console.log('OLD  ex = ez x dir : basis det', oldB.det.toFixed(3), ' signed volume', oldB.vol.toFixed(5));
console.log('NEW  ex = dir x ez : basis det', newB.det.toFixed(3), ' signed volume', newB.vol.toFixed(5));
const key = (p, i) => [p.getX(i), p.getY(i), p.getZ(i)].map(v => v.toFixed(6)).join(',');
const S = new Set(); const np = newB.g.attributes.position, op = oldB.g.attributes.position;
for (let i = 0; i < np.count; i++) S.add(key(np, i));
let miss = 0; for (let i = 0; i < op.count; i++) if (!S.has(key(op, i))) miss++;
console.log('OLD vertices absent from NEW:', miss, '/', op.count, '(0 = same point set, winding only)');
