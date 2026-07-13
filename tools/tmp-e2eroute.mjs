// tmp-e2eroute.mjs — probe walkable lanes between the marquee gate and box office
import { walkableW } from '../src/data/wrigleyville.js';
const line = (x0, z0, x1, z1, n = 30) => {
  const bad = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
    if (!walkableW(x, z)) bad.push([+x.toFixed(1), +z.toFixed(1)]);
  }
  return bad.length ? 'BLOCKED ' + JSON.stringify(bad.slice(0, 5)) : 'CLEAR';
};
console.log('west leg z-416.5 x-280->-290:', line(-280, -416.5, -290, -416.5));
console.log('north leg x-290 z-416.5->-448:', line(-290, -416.5, -290, -448));
console.log('east leg z-448 x-290->-283.9:', line(-290, -448, -283.9, -448.2));
console.log('box office spot walkable:', walkableW(-283.9, -448.2));
