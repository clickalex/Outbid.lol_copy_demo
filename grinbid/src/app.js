'use strict';

/**
 * app.js — assembles the Grinbid application (store, SSE hub, router, HTTP
 * server). server.js is a thin bootstrap around it; tests use createApp()
 * with an ephemeral port.
 */

const http = require('http');
const fs = require('fs');

const { CONFIG } = require('./config');
const { JsonStore } = require('./store');
const { SseHub } = require('./sse');
const { buildRouter } = require('./api');
const { createSeedState } = require('./seed');
const { ensurePeriods, maybeAutoSettle } = require('./economy');
const { RouteError } = require('./router');

async function createApp(opts = {}) {
  fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });

  const store = await new JsonStore({
    file: opts.dbFile,
    createSeed: () => createSeedState(),
    debounceMs: opts.debounceMs
  }).init();
  const state = store.data;
  state.meta.bootCount = (state.meta.bootCount || 0) + 1;

  ensurePeriods(state, Date.now());
  const settled = maybeAutoSettle(state, Date.now());
  if (settled) {
    for (const s of settled) {
      if (s && s.ok) console.log(`[grinbid] Auto-settled ${s.payout.label} #${s.payout.periodId} on boot.`);
    }
  }
  await store.flush();

  const sse = new SseHub();
  const router = buildRouter(state, sse);

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Powered-By', 'Grinbid (100% free virtual coins)');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    try {
      ensurePeriods(state, Date.now());
      maybeAutoSettle(state, Date.now());
      await router.dispatch(req, res);
    } catch (err) {
      if (err instanceof RouteError) {
        res.writeHead(err.status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message, ...err.extra }));
      } else {
        console.error('[grinbid] unhandled error', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'internal_error' }));
        } else {
          res.destroy();
        }
      }
    }
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[grinbid] ${signal} — flushing database…`);
    try {
      for (const c of sse.clients.values()) {
        try { c.res.write('event: shutdown\ndata: {"bye":true}\n\n'); } catch {}
      }
      await store.close();
    } catch (err) {
      console.error('[grinbid] flush failed during shutdown:', err.message);
    }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return { server, store, sse, state, shutdown };
}

function listen(app, port, host) {
  return new Promise((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(port, host, () => resolve(app.server.address()));
  });
}

module.exports = { createApp, listen };
