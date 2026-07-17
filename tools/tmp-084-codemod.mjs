// 084 codemod: shift Montrose-frame z literals by +436.
// Any numeric literal v with -1530 <= v <= -1085 becomes v+436, preserving
// decimals. Applied per-file (argv), diff reviewed by hand afterward.
import fs from 'fs';
const files=process.argv.slice(2);
for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  let count=0;
  const out=src.replace(/-1[0-9]{3}(?:\.[0-9]+)?/g,(m)=>{
    const v=parseFloat(m);
    if(v>=-1530&&v<=-1085){count++;const nv=v+436;return String(parseFloat(nv.toFixed(4)));}
    return m;
  });
  fs.writeFileSync(f,out);
  console.log(`${f}: ${count} literals shifted`);
}
