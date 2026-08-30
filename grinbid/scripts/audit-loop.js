'use strict';

/**
 * audit-loop.js — the Grinbid 20-pass audit loop.
 *
 * Each pass:
 *   1. `node --check` syntax check across backend + public JS (and the
 *      zero-dependency check).
 *   2. `node --test` full unit + HTTP integration suite (economy math, atomic
 *      JSON persistence, SSE, rate limits, sanitization, legal endpoints).
 *   3. A smoke check of the required 9 SPA screens, legal pages and the SSE
 *      endpoint against a live ephemeral server.
 *
 * Any failure resets the streak to 0. The loop halts only after
 * CONSECUTIVE = 20 flawless passes. Usage: node scripts/audit-loop.js 20
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.join(__dirname, '..');
const REQUIRED = Number(process.argv[2] || 20);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(new Error('timeout')); });
  });
}

async function smokeServer() {
  const { createApp, listen } = require('../src/app');
  const fsMod = require('node:fs');
  const os = require('node:os');
  const dir = fsMod.mkdtempSync(path.join(os.tmpdir(), 'grinbid-audit-'));
  const app = await createApp({ dbFile: path.join(dir, 'db.json'), debounceMs: 5 });
  const addr = await listen(app, 0, '127.0.0.1');
  return { app, base: `http://127.0.0.1:${addr.port}`, dir };
}

const SCREENS = [
  '/#/home', '/#/discover', '/#/profile/neon-arena', '/#/wallet',
  '/#/tasks', '/#/refer', '/#/create', '/#/donate', '/#/admin'
];

async function smokePass() {
  const failures = [];
  const { app, base, dir } = await smokeServer();

  // 9 SPA screens are hash routes — the SPA shell must serve for all of them,
  // and app.js must actually implement each view.
  const appJs = await httpGet(base + '/app.js');
  const REQUIRED_VIEWS = ['VIEWS.home', 'VIEWS.discover', 'VIEWS.profile', 'VIEWS.wallet', 'VIEWS.tasks', 'VIEWS.refer', 'VIEWS.create', 'VIEWS.donate', 'VIEWS.admin', 'VIEWS.terms', 'VIEWS.privacy'];
  for (const v of REQUIRED_VIEWS) {
    if (!appJs.body.includes(v)) failures.push(`SPA view missing from app.js: ${v}`);
  }
  for (const screen of SCREENS) {
    const res = await httpGet(base + screen.split('#')[0]);
    if (res.status !== 200 || !res.body.includes('app.js')) {
      failures.push(`SPA shell failed for ${screen} (${res.status})`);
    }
  }

  // Legal pages.
  for (const p of ['/terms', '/privacy']) {
    const res = await httpGet(base + p);
    if (res.status !== 200 || !/zero cash value|scrypt/i.test(res.body)) {
      failures.push(`Legal page ${p} failed (${res.status})`);
    }
  }

  // SSE endpoint — read until 'hello' arrives or timeout, then abort.
  const streamRes = await new Promise((resolve) => {
    let settled = false;
    const done = (out) => { if (!settled) { settled = true; resolve(out); } };
    const req = http.get(base + '/api/stream', (res) => {
      const chunks = [];
      res.on('data', (c) => {
        chunks.push(c);
        const body = Buffer.concat(chunks).toString();
        if (body.includes('event: hello')) {
          done({ status: res.statusCode, headers: res.headers, body });
          req.destroy();
        }
      });
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', () => done({ status: 0, headers: {}, body: '' }));
    req.on('close', () => done({ status: 0, headers: {}, body: '' }));
    setTimeout(() => { req.destroy(); }, 3000);
  });
  if (streamRes.status !== 200 || !/text\/event-stream/.test(streamRes.headers['content-type'] || '') || !streamRes.body.includes('event: hello')) {
    failures.push('SSE stream did not start with hello event');
  } else if (!streamRes.body.includes('retry: 3000')) {
    failures.push('SSE stream missing retry hint');
  }

  // Clean teardown so the audit process can exit.
  if (typeof app.server.closeAllConnections === 'function') app.server.closeAllConnections();
  await new Promise((r) => app.server.close(r));
  await app.store.close();
  fs.rmSync(dir, { recursive: true, force: true });
  return failures;
}

(async () => {
  let streak = 0;
  let pass = 0;
  console.log(`\n🎪 GRINBID AUDIT LOOP — target ${REQUIRED} consecutive flawless passes\n`);

  while (streak < REQUIRED) {
    pass += 1;
    const started = Date.now();
    const issues = [];

    // Checkpoint 1+2: zero deps & syntax.
    const syntax = run(process.execPath, [path.join(ROOT, 'scripts', 'check-syntax.js')]);
    if (syntax.status !== 0) issues.push('syntax/deps check failed');

    // Checkpoints 3-8: full test suite (bare `node --test` auto-discovers
    // ./test/*.test.js from the repo root on this Node version).
    const tests = run(process.execPath, ['--test']);
    if (tests.status !== 0) {
      issues.push('test suite failed');
      console.log(tests.stdout.slice(-4000));
      console.log(tests.stderr.slice(-2000));
    }

    // Checkpoint 9: 9 screens + legal + SSE smoke.
    try {
      const smoke = await smokePass();
      issues.push(...smoke);
    } catch (err) {
      issues.push('smoke pass crashed: ' + err.message);
    }

    if (issues.length === 0) {
      streak += 1;
      console.log(`  PASS #${pass}  (streak ${streak}/${REQUIRED})  ${Date.now() - started}ms  ✓`);
    } else {
      streak = 0; // RESET RULE — any bug resets the streak.
      console.log(`  FAIL #${pass}  (streak reset to 0)  ${Date.now() - started}ms`);
      for (const i of issues.slice(0, 12)) console.log(`    ✗ ${i}`);
      // Fail hard after a handful of consecutive failures to avoid infinite loop.
      if (pass >= REQUIRED * 3) {
        console.error(`STOPPING after ${pass} passes with persistent failures.`);
        process.exit(1);
      }
    }
  }

  console.log(`\n🎉 AUDIT COMPLETE — ${streak} consecutive flawless passes (${pass} total passes).`);
  process.exit(0);
})();
