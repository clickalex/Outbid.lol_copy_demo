'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { JsonStore } = require('../src/store');
const { SseHub } = require('../src/sse');
const { RateLimiter } = require('../src/rateLimit');
const { createSeedState } = require('../src/seed');

function tmpDir(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'grinbid-test-'));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
}

test('store: persists through atomic rename and reloads', async (t) => {
  const dir = tmpDir(t);
  const file = path.join(dir, 'db.json');
  const store = new JsonStore({ file, createSeed: createSeedState, debounceMs: 10 });
  await store.init();
  store.mutate((s) => { s.users.u_test = { id: 'u_test', username: 'x' }; });
  await store.close();

  // No stray temp files; live file exists and is valid JSON.
  const files = fs.readdirSync(dir);
  assert.ok(!files.some((f) => f.endsWith('.tmp')), 'no temp litter: ' + files.join(','));
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(raw.users.u_test);

  const store2 = new JsonStore({ file, createSeed: createSeedState, debounceMs: 10 });
  await store2.init();
  assert.ok(store2.data.users.u_test);
  await store2.close();
});

test('store: debounced flush coalesces writes', async (t) => {
  const dir = tmpDir(t);
  const file = path.join(dir, 'db.json');
  const store = new JsonStore({ file, createSeed: createSeedState, debounceMs: 60 });
  await store.init();
  const flushesBefore = store.flushes;
  for (let i = 0; i < 50; i += 1) store.mutate((s) => { s.meta.tick = i; });
  await new Promise((r) => setTimeout(r, 150));
  assert.ok(store.flushes <= flushesBefore + 2, `expected coalescing, got ${store.flushes - flushesBefore} more flushes`);
  await store.close();
});

test('store: corrupt db.json is backed up and reseeded', async (t) => {
  const dir = tmpDir(t);
  const file = path.join(dir, 'db.json');
  fs.writeFileSync(file, '{definitely not json');
  const store = new JsonStore({ file, createSeed: createSeedState, debounceMs: 10 });
  await store.init();
  assert.ok(Array.isArray(store.data.tasks));
  const backups = fs.readdirSync(dir).filter((f) => f.startsWith('db.json.corrupt-'));
  assert.ok(backups.length >= 1, 'corrupt backup kept');
  await store.close();
});

test('store: mutate on uninitialized store throws', () => {
  const store = new JsonStore({ createSeed: createSeedState });
  assert.throws(() => store.mutate((s) => s), /not initialized/);
});

test('rate limiter: burst then rejection with retryAfter', () => {
  const rl = new RateLimiter();
  const spec = { rate: 3, burst: 3, windowMs: 1000 };
  for (let i = 0; i < 3; i += 1) {
    assert.ok(rl.allow('ip:1', spec), `request ${i} should pass`);
  }
  const r = rl.take('ip:1', spec);
  assert.strictEqual(r.allowed, false);
  assert.ok(r.retryAfterMs > 0);

  // Different IP unaffected.
  assert.ok(rl.allow('ip:2', spec));
});

test('sse hub: subscribe, broadcast, presence and removal', async () => {
  const hub = new SseHub();
  // Simulate a response object.
  let written = '';
  const res = {
    headers: {},
    writableEnded: false,
    destroyed: false,
    writeHead(code, h) { this.code = code; Object.assign(this.headers, h); },
    write(chunk) { written += chunk; return true; },
    end() { this.writableEnded = true; }
  };
  const sub = hub.subscribe(res, 'u_1');
  assert.strictEqual(res.code, 200);
  assert.match(res.headers['Content-Type'], /text\/event-stream/);
  assert.ok(written.includes('event: hello'));
  assert.ok(written.includes('retry: 3000'));

  hub.broadcast('boost', { amount: 5 });
  assert.ok(written.includes('event: boost'));
  assert.ok(written.includes('"amount":5'));

  hub.toUser('u_1', 'user', { coins: 9 });
  assert.ok(written.includes('event: user'));

  hub.remove(sub.id);
  assert.strictEqual(hub.clientCount, 0);
  await new Promise((r) => setTimeout(r, 10));
});
