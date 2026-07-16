import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // viteSingleFile forces base:'./' because it assumes public/ is copied into
  // outDir next to the html. We do the opposite (copyPublicDir:false; the deploy
  // workflow puts the PWA extras at the Pages ROOT), so './' would emit
  // <link rel="manifest" href="./manifest.webmanifest"> — which silently misses
  // on any deep 404.html path and contradicts the manifest's own scope:'/'.
  // overrideConfig is the plugin's own escape hatch and is applied after its
  // defaults, so the absolute public URLs survive the build verbatim.
  plugins: [viteSingleFile({ overrideConfig: { base: '/' } })],
  // dist/ must stay EXACTLY one shareable index.html. public/ still exists (vite
  // dev serves it at the root, and /manifest.webmanifest etc. resolve as public
  // URLs at build time) — it just never gets copied into dist/.
  build: { copyPublicDir: false },
});
