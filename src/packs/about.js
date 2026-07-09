// About / credits pack — OpenStreetMap ODbL attribution.
// Map layout across the game is derived from OpenStreetMap extracts
// (reference-only refs/<poi>/osm.json); ODbL requires visible attribution,
// so this journal section must stay present and legible.
import { onWorldReady, journalSection } from '../framework.js';

onWorldReady(() => {
  journalSection('about', 'About', () => `
    <p>Ope! — a toy Chicago lakefront.</p>
    <p>Map layout derived from <b>OpenStreetMap</b> data,
       © OpenStreetMap contributors, under the
       <b>Open Database License (ODbL)</b> —
       openstreetmap.org/copyright.</p>
    <p>OSM is reference only; everything you see is hand-built.</p>`);
});
