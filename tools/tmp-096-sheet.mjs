// tmp 096: contact sheet of the mobile-framing before/after + session-camera proofs.
import { contactSheet } from './contactsheet.mjs';
const S = 'tools/shots/';
const shots = [
  { path: S + '096-before-port-spawn.png', label: 'BEFORE portrait spawn (hFrac .33)' },
  { path: S + '096-after-port-spawn.png', label: 'AFTER portrait spawn (hFrac .16)' },
  { path: S + '096-before-port-harbor.png', label: 'BEFORE portrait harbor' },
  { path: S + '096-after-port-harbor.png', label: 'AFTER portrait harbor' },
  { path: S + '096-before-port-trail.png', label: 'BEFORE portrait trail' },
  { path: S + '096-after-port-trail.png', label: 'AFTER portrait trail' },
  { path: S + '096-before-desk-spawn.png', label: 'desktop spawn (bit-identical)' },
  { path: S + '096-after-desk-spawn.png', label: 'desktop spawn after' },
  { path: S + '096-after-land-spawn.png', label: 'landscape spawn (unchanged)' },
  { path: S + '096-mob-binoc-in.png', label: 'portrait binoculars raised' },
  { path: S + '096-mob-binoc-out.png', label: 'portrait binoculars exit -> fov 60' },
  { path: S + '096-lcar-port-mid.png', label: 'portrait L-car ride (dist ramp exempt)' },
];
const out = await contactSheet({ shots, out: S + '096-contact-sheet.png', cols: 4 });
console.log('SHEET ' + out);
