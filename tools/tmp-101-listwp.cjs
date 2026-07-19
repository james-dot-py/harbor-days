const w = require('./waypoints.json');
for (const p of w.waypoints) if (p.area === 'lakefront') console.log(p.id, '|', p.x + ',' + p.z, '|', (p.expectation || '').slice(0, 75));
