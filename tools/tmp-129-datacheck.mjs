// 129 sanity: chicago.js parses + reserve helpers behave.
import * as CH from '../src/data/chicago.js';
const R = CH.MONTROSE_RESERVE;
console.log('parse OK; cells', R.cells.length, 'ropes', R.rope.length);
console.log('inReserveCell exclosure(76,-791)=', CH.inReserveCell(76, -791), '(want true)');
console.log('inReserveCell corridor(100,-769)=', CH.inReserveCell(100, -769), '(want false)');
console.log('inReserveCell cellB(127,-728)=', CH.inReserveCell(127, -728), '(want true)');
console.log('inReserveCell stand lawnfill(164,-735)=', CH.inReserveCell(164, -735), '(want false)');
console.log('inReserveCell platform(56,-779)=', CH.inReserveCell(56, -779), '(want false)');
console.log('cricketHillH at base stand(112,-836)=', CH.cricketHillH(112, -836));
