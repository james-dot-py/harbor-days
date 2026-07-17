// tmp (081): offline replica of favors-core.js's date-seeded rotation picker.
// Usage: node tools/tmp-081-days.mjs [want,ids,csv] [startYYYYMMDD] [days]
// Prints each day's active set; if `want` ids are given, flags days where ALL
// of them are active. MUST stay byte-identical in math to favors-core.js.
const POOL = ['baitphoto', 'chalkbag', 'divvyangel', 'drumstick', 'fieldnotes',
  'lakeglass', 'loveletter', 'poppybuns', 'recipeglide', 'umpwhistle'];

function xs32(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
function picks(day) {
  const r = xs32(day * 2654435761 >>> 0 || 1);
  const ids = POOL.slice().sort();
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = ids[i]; ids[i] = ids[j]; ids[j] = t;
  }
  const k = Math.min(ids.length, r() < 0.5 ? 3 : 4);
  return ids.slice(0, k);
}

const want = (process.argv[2] || '').split(',').filter(Boolean);
const start = +(process.argv[3] || 20260717);
const days = +(process.argv[4] || 30);
// naive date walk (handles month ends via Date)
const d0 = new Date(Math.floor(start / 10000), Math.floor(start / 100) % 100 - 1, start % 100);
for (let i = 0; i < days; i++) {
  const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
  const num = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const p = picks(num);
  const hit = want.length && want.every(w => p.includes(w));
  console.log(`${num}  [${p.join(', ')}]${hit ? '   <== ALL WANTED ACTIVE' : ''}`);
}
