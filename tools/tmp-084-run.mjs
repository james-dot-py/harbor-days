// 084 helper: run walkprobe as a child, print only FAIL lines + the summary.
import { execFileSync } from 'child_process';
let out='';
try{ out=execFileSync('node',['tools/walkprobe.mjs'],{encoding:'utf8',maxBuffer:1<<26}); }
catch(e){ out=(e.stdout||'')+(e.stderr||''); }
const lines=out.split(/\r?\n/);
const fails=lines.filter(l=>l.startsWith('FAIL'));
for(const l of fails) console.log(l);
const summ=lines.find(l=>/passed,/.test(l));
console.log('----');
console.log(`FAIL lines: ${fails.length}`);
console.log(summ||'(no summary line found)');
