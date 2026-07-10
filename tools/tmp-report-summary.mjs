// temp: summarize a walkthrough report
import fs from 'fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let maxD = 0, errs = 0, canaryMiss = 0, shots = 0, over = 0;
for (const w of r.waypoints) for (const f of w.framings) {
  shots++; maxD = Math.max(maxD, f.perf?.drawCalls ?? 0);
  errs += (f.errors ?? []).length; if (!f.canaryOk) canaryMiss++;
  if (f.overBudget) over++;
}
console.log(JSON.stringify({ waypoints: r.waypoints.length, shots, maxD, errs, canaryMiss, over, budget: r.budget }));
