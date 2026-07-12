// tmp: manifest-vs-disk parity for refs/millennium-park (Windows case-collision pitfall)
import { readFileSync, readdirSync, existsSync } from 'fs';
const dir = 'refs/millennium-park';
const m = JSON.parse(readFileSync(dir + '/manifest.json', 'utf8'));
const files = readdirSync(dir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
console.log('manifest:', m.images.length, ' files on disk:', files.length);
const missing = m.images.filter(e => !existsSync(dir + '/' + e.file));
console.log('manifest entries missing on disk:', JSON.stringify(missing.map(e => e.file)));
const unlisted = files.filter(f => !m.images.some(e => e.file === f));
console.log('files not in manifest:', JSON.stringify(unlisted));
// case-insensitive collisions among manifest entries
const seen = new Map(), coll = [];
for (const e of m.images) { const k = e.file.toLowerCase(); if (seen.has(k) && seen.get(k) !== e.file) coll.push([seen.get(k), e.file]); seen.set(k, e.file); }
console.log('case collisions:', JSON.stringify(coll));
