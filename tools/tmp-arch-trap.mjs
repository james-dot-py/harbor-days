// TEMP diagnostic (issue 025): map the seams at the Butler/Columbus junction and
// reproduce the arch collider-wedge trap by simulating main.js's movement gate.
import * as MP from '../src/data/millennium.js';

const walk = (x,z)=>MP.walkableM(x,z);

// ---- 1. seam map: walkable across the Butler west edge at several latitudes ----
console.log('=== walkable map x 186..210 (step 0.5) across Butler west edge ===');
console.log('   legend: # walkable, . blocked.  Columbus strip x190-200, lawn x202+');
const xs=[]; for(let x=186;x<=210.01;x+=0.5)xs.push(+x.toFixed(1));
process.stdout.write('z\\x  '); for(const x of xs) process.stdout.write(((x%2===0)?String(x%100).padStart(2,'0'):'  ').slice(-1));
console.log();
for(const z of [905,910,915,920,925,930,950,975,1000,1025]){
  process.stdout.write(String(z).padStart(4,' ')+' ');
  let s=''; for(const x of xs) s+= walk(x,z)?'#':'.';
  console.log(s);
}

// ---- 2. reproduce the collider wedge trap ----
// The two Columbus-arch legs (butler.js §11) are the only colliders near the seam.
const ARCH_LEGS=[{x:191.4,z:925,r:0.6},{x:198.6,z:925,r:0.6}];   // post-fix leg centres
// mirror main.js movement resolution for a non-jetski walker in a hard cell.
function stepOnce(p, ix, iz, dt){
  const spd=4.2; // walking
  p.vx = ix*spd; p.vz = iz*spd;
  const nx=p.x+p.vx*dt; if(walk(nx,p.z)) p.x=nx; else p.vx=0;
  const nz=p.z+p.vz*dt; if(walk(p.x,nz)) p.z=nz; else p.vz=0;
  for(const c of ARCH_LEGS){
    const dx=p.x-c.x, dz=p.z-c.z, R=c.r+0.34, d2=dx*dx+dz*dz;
    if(d2<R*R && d2>1e-6){const d=Math.sqrt(d2); p.x=c.x+dx/d*R; p.z=c.z+dz/d*R;}
  }
}
// try to get stuck: start on Columbus strip N of the arch, walk SE toward the lawn.
function trial(sx,sz, ix,iz, label){
  const p={x:sx,z:sz,vx:0,vz:0}; const dt=1/60;
  for(let f=0; f<240; f++) stepOnce(p, ix,iz, dt);
  // now test: is the player trapped? (current unwalkable OR all 4 cardinal micro-steps blocked)
  const eps=0.07;
  const curOk=walk(p.x,p.z);
  const dirsOpen=[[eps,0],[-eps,0],[0,eps],[0,-eps]].filter(([dx,dz])=>walk(p.x+dx,p.z+dz)).length;
  const trapped=!curOk || dirsOpen===0;
  console.log(`${label}: end (${p.x.toFixed(2)},${p.z.toFixed(2)}) walkable=${curOk} openMicroDirs=${dirsOpen} ${trapped?'*** TRAPPED ***':'ok'}`);
  return {p,trapped};
}
console.log('\n=== trap reproduction (240 frames each, arch legs 190.8/199.2) ===');
// walk EAST from the Columbus strip toward the lawn — should hit the seam wall or wedge
trial(196, 925, 1, 0, 'due E from arch center');
trial(198, 923, 1, 0.15, 'ESE toward east leg');
trial(199, 926, 0.4, -1, 'graze east leg from SE');
trial(191, 924, -0.5, 0.3, 'graze west leg');
trial(196, 918, 0.6, 1, 'SE into the arch throat');
// approach from the north down the strip drifting east (owner's "streetwall side")
trial(196, 905, 0.35, 1, 'N->S down strip drifting E (owner approach)');
