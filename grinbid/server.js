'use strict';

/**
 * Grinbid server — Bid. Back. Rank up.
 *
 * Node.js built-ins only: http, crypto, fs, path. Zero npm dependencies.
 * Single-file JSON store (data/db.json), server-sent events at /api/stream,
 * hash-routed vanilla SPA served from /public, legal pages at /terms and
 * /privacy, admin sidecar under /api/admin/*.
 *
 * Run:  node server.js   (or npm start)   → http://localhost:3000
 */

const { CONFIG } = require('./src/config');
const { createApp, listen } = require('./src/app');

(async () => {
  const app = await createApp();
  const addr = await listen(app, CONFIG.PORT, CONFIG.HOST);
  console.log(`\n  🎪  Grinbid — Bid. Back. Rank up.`);
  console.log(`  💰  100% free virtual coins. Zero npm dependencies.`);
  console.log(`  🖥️   http://${addr.address}:${addr.port}/`);
  console.log(`  📜  /terms  ·  /privacy  ·  /api/health  ·  /api/stream (SSE)\n`);
})().catch((err) => {
  console.error('[grinbid] fatal boot error:', err);
  process.exit(1);
});
