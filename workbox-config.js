/**
 * Workbox config for the web PWA service worker.
 * Run after `expo export -p web` (see `npm run build:web`); writes dist/sw.js.
 * Docs: https://developer.chrome.com/docs/workbox/modules/workbox-build#generatesw
 */
module.exports = {
  globDirectory: 'dist/',
  // .wav assets are native-only (web synthesizes audio via Web Audio API), so they are not precached.
  globPatterns: ['**/*.{js,html,ico,png,json}'],
  // 404.html is a copy of index.html used only for GitHub Pages SPA fallback.
  globIgnores: ['404.html', 'metadata.json', 'sw.js', 'workbox-*.js'],
  swDest: 'dist/sw.js',
  // Serve the cached app shell for any in-scope navigation (e.g. shared seed links) while offline.
  navigateFallback: 'index.html',
  // Activate new versions immediately. The JS bundle is content-hashed and the
  // game state is persisted, so the running page keeps working and the next
  // launch picks up the new build.
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  // Bundle is ~850 KB today; leave headroom above Workbox's 2 MB default.
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
};
