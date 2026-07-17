// src/platform.js — the ONE place that answers "are we the native App Store app?"
//
// The Capacitor iOS build injects `window.Capacitor` into the WKWebView before
// any page script runs; on the web / installed PWA it is simply undefined. This
// module imports NOTHING and only reads that runtime global, so it adds zero to
// the single-file build's dependency surface — the web bundle is byte-for-byte
// unchanged whether or not this file exists (verified: `npm run build` output
// carries no '@capacitor' string).
//
// Used to gate the External-donation surfaces that Apple guideline 3.1.1 puts at
// risk in a native app: the two Ko-fi links (index.html does its own inline,
// pre-paint check so the links never flash) and the diegetic Ko-fi QR billboard
// on the Wrigley rooftop (src/packs/kofi.js). The web and PWA builds keep all of
// them. See APPSTORE.md for the full native-adaptation list.
export function isNative() {
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch (e) { return false; }
}

export function platform() {
  try {
    return (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'web';
  } catch (e) { return 'web'; }
}
