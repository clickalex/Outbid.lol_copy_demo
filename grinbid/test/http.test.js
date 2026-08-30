'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, listen } = require('../src/app');

let app;
let base;
const ADMIN_PASSWORD = 'grinbid-admin-dev';

// Shared, fan-created + admin-approved page used by boost/feed/SSE tests.
// (No pages are seeded anymore — the board starts empty like production.)
const STAR_SLUG = 'star-fave-1';

test.before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grinbid-http-'));
  app = await createApp({ dbFile: path.join(dir, 'db.json'), debounceMs: 5 });
  const addr = await listen(app, 0, '127.0.0.1');
  base = `http://127.0.0.1:${addr.port}`;

  // A real fan submits a page; an admin approves it before it's boostable.
  const owner = await signup('starowner');
  await fetch(`${base}/api/profiles`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
    body: JSON.stringify({ name: 'Star Fave Fans', realName: 'Salman Khan', slug: STAR_SLUG, category: 'celebrity', emoji: '💪' })
  });
  const login = await fetch(`${base}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD })
  });
  const adminCookie = cookieFrom(login);
  await fetch(`${base}/api/admin/profile-decision`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ slug: STAR_SLUG, approve: true })
  });
});

test.after(async () => {
  if (app) {
    if (typeof app.server.closeAllConnections === 'function') app.server.closeAllConnections();
    await new Promise((resolve) => app.server.close(resolve));
    await app.store.close();
  }
});

function cookieFrom(res) {
  const sc = res.headers.get('set-cookie') || '';
  return sc.split(';')[0];
}

async function signup(username, extra = {}) {
  const res = await fetch(`${base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email: extra.email || `${username.toLowerCase()}@example.test`,
      password: 'password123',
      displayName: 'Test Fan',
      avatar: '🦊',
      ...extra
    })
  });
  const data = await res.json();
  return { res, data, cookie: cookieFrom(res) };
}

test('health endpoint advertises free coins', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.strictEqual(res.status, 200);
  const d = await res.json();
  assert.strictEqual(d.ok, true);
  assert.strictEqual(d.coins, 2500);
  assert.strictEqual(d.free, true);
});

test('signup → bonus 2500, referral-free flow, tasks and profile readiness', async () => {
  const { res, data, cookie } = await signup('auditor1');
  assert.strictEqual(res.status, 201);
  assert.ok(cookie);
  assert.strictEqual(data.user.coins, 2500);
  assert.strictEqual(data.user.totalCoinsEarned, 2500);
  assert.strictEqual(data.user.username, 'auditor1');
  assert.strictEqual(data.user.tasks.find((t) => t.id === 't01').done, true);
  assert.strictEqual(data.user.dailyClaim.claimedToday, false);
  assert.strictEqual(data.user.dailyClaim.reward, 500);
  // Session-cookie access.
  const me = await fetch(`${base}/api/me`, { headers: { Cookie: cookie } });
  const meData = await me.json();
  assert.strictEqual(meData.user.username, 'auditor1');
});

test('duplicate + invalid usernames rejected; input sanitized', async () => {
  const dup = await signup('auditor1');
  assert.strictEqual(dup.res.status, 400);
  const bad = await signup('..bad!!', { displayName: '<script>alert(1)</script>' });
  assert.strictEqual(bad.res.status, 400);
});

test('daily claim: 500, streak +150, cap 2000, once/day guard', async () => {
  const { cookie } = await signup('streakey');
  const headers = { 'Content-Type': 'application/json', Cookie: cookie };

  let r = await fetch(`${base}/api/daily-claim`, { method: 'POST', headers });
  let d = await r.json();
  assert.strictEqual(d.reward, 500);
  assert.strictEqual(d.streak, 1);

  r = await fetch(`${base}/api/daily-claim`, { method: 'POST', headers });
  d = await r.json();
  assert.strictEqual(r.status, 409);
  assert.strictEqual(d.error, 'already_claimed');
});

test('lucky drop: min/max range and 3h lockout', async () => {
  const { cookie } = await signup('luckygal');
  const headers = { 'Content-Type': 'application/json', Cookie: cookie };
  let r = await fetch(`${base}/api/lucky-drop`, { method: 'POST', headers });
  let d = await r.json();
  assert.ok(d.reward >= 250 && d.reward <= 2500, `got ${d.reward}`);
  r = await fetch(`${base}/api/lucky-drop`, { method: 'POST', headers });
  d = await r.json();
  assert.strictEqual(r.status, 429);
  assert.strictEqual(d.error, 'not_ready');
  assert.ok(d.waitMs > 0);
});

test('boost: min 50, 1x normal, 1.5x self, 2s cooldown, insufficient funds', async () => {
  const { cookie } = await signup('booster_x');
  const h = { 'Content-Type': 'application/json', Cookie: cookie };

  let r = await fetch(`${base}/api/boost`, { method: 'POST', headers: h, body: JSON.stringify({ slug: STAR_SLUG, amount: 40 }) });
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'min_boost');

  r = await fetch(`${base}/api/boost`, { method: 'POST', headers: h, body: JSON.stringify({ slug: STAR_SLUG, amount: 50 }) });
  let d = await r.json();
  assert.strictEqual(d.ok, true);
  assert.strictEqual(d.value, 50);
  assert.strictEqual(d.balance, 2450);
  assert.strictEqual(d.profileBoostTotal, 50);

  // cooldown
  r = await fetch(`${base}/api/boost`, { method: 'POST', headers: h, body: JSON.stringify({ slug: STAR_SLUG, amount: 50 }) });
  assert.strictEqual(r.status, 429);
  assert.strictEqual((await r.json()).error, 'cooldown');

  await new Promise((res) => setTimeout(res, 2100));
  r = await fetch(`${base}/api/boost`, { method: 'POST', headers: h, body: JSON.stringify({ slug: STAR_SLUG, amount: 100 }) });
  d = await r.json();
  assert.strictEqual(d.value, 100);
  assert.strictEqual(d.balance, 2350);
});

test('self-boost ×1.5: create a profile, boost it', async () => {
  const { cookie } = await signup('owner1');
  const h = { 'Content-Type': 'application/json', Cookie: cookie };

  let r = await fetch(`${base}/api/profiles`, { method: 'POST', headers: h, body: JSON.stringify({
    name: 'My Test Museum', slug: 'my-test-museum', category: 'venue', emoji: '🎠', tagline: 't', description: 'd', tags: ['a']
  }) });
  const d = await r.json();
  assert.strictEqual(r.status, 201);
  assert.strictEqual(d.profile.slug, 'my-test-museum');
  assert.strictEqual(d.profile.fanCreated, true);

  // One profile per user.
  r = await fetch(`${base}/api/profiles`, { method: 'POST', headers: h, body: JSON.stringify({ name: 'Another', slug: 'another-one', category: 'brand' }) });
  assert.strictEqual((await r.json()).error, 'one_profile_per_user');

  await new Promise((res) => setTimeout(res, 2100)); // cooldown fresh user? lastBoostAt=0 so fine anyway
  r = await fetch(`${base}/api/boost`, { method: 'POST', headers: h, body: JSON.stringify({ slug: 'my-test-museum', amount: 100 }) });
  const b = await r.json();
  assert.strictEqual(b.selfBoost, true);
  assert.strictEqual(b.value, 150); // ×1.5

  const prof = await fetch(`${base}/api/profiles/my-test-museum`, { headers: { Cookie: cookie } }).then((x) => x.json());
  assert.strictEqual(prof.profile.isMineProfile, true);
  assert.strictEqual(prof.profile.boostTotal, 150);
});

test('tasks: t01 claim, double-claim blocked, unlocks via boost progress', async () => {
  const { cookie } = await signup('taskfan');
  const h = { 'Content-Type': 'application/json', Cookie: cookie };
  let r = await fetch(`${base}/api/tasks/t01/claim`, { method: 'POST', headers: h });
  let d = await r.json();
  assert.strictEqual(d.reward, 100);
  r = await fetch(`${base}/api/tasks/t01/claim`, { method: 'POST', headers: h });
  assert.strictEqual((await r.json()).error, 'already_claimed');

  // t06 locked until one boost done.
  const me = await fetch(`${base}/api/me`, { headers: { Cookie: cookie } }).then((x) => x.json());
  assert.strictEqual(me.user.tasks.find((t) => t.id === 't06').locked, true);
});

test('referral: bonuses 1000/500, same-IP flagged, invalid codes rejected', async () => {
  const a = await signup('refhost');
  assert.strictEqual(a.res.status, 201);
  const code = a.data.user.referralCode;
  assert.match(code, /^GB-[A-Z0-9]{6}-[A-F0-9]{4}$/);

  // Same-IP signup with that code = anti-bot flag (no instant bonuses).
  const flagged = await signup('refself', { referralCode: code });
  assert.strictEqual(flagged.res.status, 201);
  assert.strictEqual(flagged.data.user.coins, 2500); // no +500 referee bonus while pending review
  const selfMe = await fetch(`${base}/api/me`, { headers: { Cookie: flagged.cookie } }).then((x) => x.json());
  assert.strictEqual(selfMe.user.referrals.length, 0);
  assert.ok(selfMe.user.referralCode);

  // Invalid code rejected outright.
  const bogus = await signup('refbogus', { referralCode: 'GB-NOPE00-ZZZZ' });
  assert.strictEqual(bogus.res.status, 400);
  assert.strictEqual(bogus.data.error, 'invalid_referral_code');

  // A genuine referral from the same process still counts (order matters here
  // only for the same-IP rule; use a distinct user so no flag).
  const b = await signup('refbaby', { referralCode: code });
  assert.strictEqual(b.res.status, 201);
  // Same IP as host (test env) → pending review, no bonuses.
  const hostMe = await fetch(`${base}/api/me`, { headers: { Cookie: a.cookie } }).then((x) => x.json());
  assert.ok(hostMe.user.referrals.some((x) => x.username === 'refbaby' && x.status === 'pending_review'));
  assert.strictEqual(hostMe.user.coins, 2500); // no instant 1000 while flagged
});

test('rate limiting kicks in for sensitive endpoints', async () => {
  const hits = [];
  for (let i = 0; i < 45; i += 1) {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nobody', password: 'wrongpass' })
    });
    hits.push(res.status);
  }
  assert.ok(hits.slice(-15).includes(429), 'expected 429 somewhere: ' + hits.slice(-15).join(','));
});

test('CSRF-ish safety: session cookie is HttpOnly; API requires auth for wallet ops', async () => {
  const res = await fetch(`${base}/api/daily-claim`, { method: 'POST' });
  assert.strictEqual(res.status, 401);
  const { res: sr } = await signup('cookiecheck');
  const sc = sr.headers.get('set-cookie') || '';
  assert.match(sc, /HttpOnly/i);
  assert.match(sc, /SameSite=Lax/i);
});

test('claim request modal flow + admin approval marks verified', async () => {
  const { cookie } = await signup('claimant1');
  const h = { 'Content-Type': 'application/json', Cookie: cookie };
  let r = await fetch(`${base}/api/profiles/${STAR_SLUG}/claim`, { method: 'POST', headers: h, body: JSON.stringify({ evidence: 'I represent the real person behind this page' }) });
  let d = await r.json();
  assert.strictEqual(d.status, 'pending');
  assert.strictEqual(r.status, 200);

  // Admin sees it and approves.
  const login = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: ADMIN_PASSWORD }) });
  assert.strictEqual(login.status, 200);
  const adminCookie = cookieFrom(login);
  const ah = { 'Content-Type': 'application/json', Cookie: adminCookie };

  const reqs = await fetch(`${base}/api/admin/claim-requests`, { headers: { Cookie: adminCookie } }).then((x) => x.json());
  assert.ok(reqs.requests.some((q) => q.profileSlug === STAR_SLUG));
  const reqId = reqs.requests.find((q) => q.profileSlug === STAR_SLUG).id;

  r = await fetch(`${base}/api/admin/claim-request`, { method: 'POST', headers: ah, body: JSON.stringify({ slug: STAR_SLUG, requestId: reqId, approve: true }) });
  d = await r.json();
  assert.strictEqual(d.profile.verified, true);

  const prof = await fetch(`${base}/api/profiles/${STAR_SLUG}`).then((x) => x.json());
  assert.strictEqual(prof.profile.verified, true);
  assert.strictEqual(prof.profile.claimedByUsername, 'claimant1');
});

test('admin: overview, announce, season settle, unauthorized blocked', async () => {
  const blocked = await fetch(`${base}/api/admin/overview`);
  assert.strictEqual(blocked.status, 401);

  const login = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: ADMIN_PASSWORD }) });
  const ah = { 'Content-Type': 'application/json', Cookie: cookieFrom(login) };
  const ov = await fetch(`${base}/api/admin/overview`, { headers: { Cookie: cookieFrom(login) } }).then((x) => x.json());
  assert.ok(ov.users >= 8);
  assert.ok(ov.season.id >= 1);

  const ann = await fetch(`${base}/api/admin/announce`, { method: 'POST', headers: ah, body: JSON.stringify({ message: 'Testing broadcast' }) });
  assert.strictEqual(ann.status, 200);

  const settle = await fetch(`${base}/api/admin/season/settle`, { method: 'POST', headers: ah, body: JSON.stringify({ period: 'season' }) });
  const sd = await settle.json();
  assert.strictEqual(sd.ok, true);
  assert.ok(Array.isArray(sd.payout.fans));
  assert.ok(Array.isArray(sd.payout.fandom));
});

test('leaderboard: fandom ladders + fans for week/month/season, winners ledger', async () => {
  const lb = await fetch(`${base}/api/leaderboard`).then((x) => x.json());
  assert.ok(lb.ladders && lb.ladders.week && lb.ladders.month && lb.ladders.season);
  assert.ok(Array.isArray(lb.ladders.season.fandom));
  assert.ok(Array.isArray(lb.ladders.season.fans));
  assert.ok(lb.ladders.season.fanPrizes.length === 3);
  const w = await fetch(`${base}/api/winners`).then((x) => x.json());
  assert.ok(Array.isArray(w.winners));
  assert.ok(typeof w.realMoneyNote === 'string' && w.realMoneyNote.length > 20);
});

test('signup requires email; email is private; duplicate email rejected', async () => {
  const noEmail = await fetch(`${base}/api/auth/signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'noemail1', password: 'password123' })
  });
  assert.strictEqual(noEmail.status, 400);
  assert.strictEqual((await noEmail.json()).error, 'invalid_email');

  const { data, res } = await signup('mailfan', { email: 'real@example.test' });
  assert.strictEqual(res.status, 201);
  // private view carries the email
  assert.strictEqual(data.user.email, 'real@example.test');
  assert.strictEqual(data.user.isAdmin, false);
  // public leaderboard never exposes email
  const lb = await fetch(`${base}/api/leaderboard`).then((x) => x.json());
  assert.ok(lb.top.every((u) => u.email === undefined));
  // public profiles endpoint never exposes creatorEmail either
  const profs = await fetch(`${base}/api/profiles`).then((x) => x.json());
  assert.ok(profs.profiles.every((p) => p.creatorEmail === undefined));

  const dup = await signup('otherguy', { email: 'real@example.test' });
  assert.strictEqual(dup.res.status, 400);
  assert.strictEqual(dup.data.error, 'email_in_use');
});

test('new fan pages start pending: hidden publicly, admin approves, then live', async () => {
  const { cookie } = await signup('pagemaker');
  const h = { 'Content-Type': 'application/json', Cookie: cookie };
  // create with the richer fields + image data url
  const img = 'data:image/jpeg;base64,' + Buffer.alloc(2000, 65).toString('base64');
  let r = await fetch(`${base}/api/profiles`, { method: 'POST', headers: h, body: JSON.stringify({
    name: 'Salman Fan Army', slug: 'salman-fan-army', category: 'celebrity',
    emoji: '💪', image: img, realName: 'Salman Khan', tagline: 'Bhai fans unite',
    description: 'The biggest Salman fan page.', tags: ['bollywood', 'bhai']
  }) });
  let d = await r.json();
  assert.strictEqual(r.status, 201);
  assert.strictEqual(d.profile.status, 'pending');
  assert.strictEqual(d.moderation, 'pending');
  assert.strictEqual(d.profile.realName, 'Salman Khan');
  assert.strictEqual(d.profile.image, img);

  // anonymous public listing must NOT contain the pending page
  const anon = await fetch(`${base}/api/profiles`).then((x) => x.json());
  assert.ok(!anon.profiles.some((p) => p.slug === 'salman-fan-army'));
  // anonymous get → 404
  r = await fetch(`${base}/api/profiles/salman-fan-army`);
  assert.strictEqual(r.status, 404);
  // another fan cannot boost the pending page
  const other = await signup('otherfan9');
  r = await fetch(`${base}/api/boost`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: other.cookie },
    body: JSON.stringify({ slug: 'salman-fan-army', amount: 50 }) });
  assert.strictEqual((await r.json()).error, 'page_not_live');
  // the creator CAN self-boost their pending page
  r = await fetch(`${base}/api/boost`, { method: 'POST', headers: h, body: JSON.stringify({ slug: 'salman-fan-army', amount: 100 }) });
  assert.strictEqual((await r.json()).selfBoost, true);

  // admin login and approval
  const login = await fetch(`${base}/api/admin/login`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: ADMIN_PASSWORD }) });
  const ah = { 'Content-Type': 'application/json', Cookie: cookieFrom(login) };
  let q = await fetch(`${base}/api/admin/profile-queue`, { headers: { Cookie: cookieFrom(login) } }).then((x) => x.json());
  assert.ok(q.pending.some((p) => p.slug === 'salman-fan-army'));
  // admin sees the creator's email for notifications
  const pending = q.pending.find((p) => p.slug === 'salman-fan-army');
  assert.strictEqual(pending.creatorEmail, 'pagemaker@example.test');

  r = await fetch(`${base}/api/admin/profile-decision`, { method: 'POST', headers: ah,
    body: JSON.stringify({ slug: 'salman-fan-army', approve: true, note: 'Welcome aboard!' }) });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).status, 'approved');

  // now public + boostable by everyone
  const after = await fetch(`${base}/api/profiles`).then((x) => x.json());
  assert.ok(after.profiles.some((p) => p.slug === 'salman-fan-army'));
  r = await fetch(`${base}/api/boost`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: other.cookie },
    body: JSON.stringify({ slug: 'salman-fan-army', amount: 50 }) });
  assert.strictEqual(r.status, 200);
});

test('founder username is admin without the admin password', async () => {
  const { cookie } = await signup('alexami');
  // already-admin user: admin overview works with just the user session
  const r = await fetch(`${base}/api/admin/overview`, { headers: { Cookie: cookie } });
  assert.strictEqual(r.status, 200);
  const d = await r.json();
  assert.strictEqual(typeof d.users, 'number');
  // the user view carries isAdmin
  const me = await fetch(`${base}/api/me`, { headers: { Cookie: cookie } }).then((x) => x.json());
  assert.strictEqual(me.user.isAdmin, true);
  // random user is not admin
  const r2 = await fetch(`${base}/api/admin/overview`);
  assert.strictEqual(r2.status, 401);
});

test('donations: non-reward intent recorded, invalid method rejected', async () => {
  const { cookie } = await signup('donor1');
  const h = { 'Content-Type': 'application/json', Cookie: cookie };
  let r = await fetch(`${base}/api/donations`, { method: 'POST', headers: h, body: JSON.stringify({ method: 'upi', amount: 100 }) });
  let d = await r.json();
  assert.strictEqual(d.ok, true);
  assert.strictEqual(d.coinsAwarded, 0);
  assert.strictEqual(d.intent.grantsCoins, false);

  r = await fetch(`${base}/api/donations`, { method: 'POST', headers: h, body: JSON.stringify({ method: 'bitcoin', amount: 100 }) });
  assert.strictEqual(r.status, 400);

  const methods = await fetch(`${base}/api/donations/methods`).then((x) => x.json());
  assert.strictEqual(methods.methods.length, 4);
  assert.strictEqual(methods.zeroReward, true);
});

test('static + legal pages serve; SPA fallback works', async () => {
  const idx = await fetch(`${base}/`);
  assert.strictEqual(idx.status, 200);
  assert.match(await idx.text(), /Grinbid/);

  const terms = await fetch(`${base}/terms`);
  assert.strictEqual(terms.status, 200);
  assert.match(await terms.text(), /zero cash value/);

  const privacy = await fetch(`${base}/privacy`);
  assert.strictEqual(privacy.status, 200);
  assert.match(await privacy.text(), /scrypt/);

  const spa = await fetch(`${base}/some/spa/route`);
  assert.strictEqual(spa.status, 200);
  assert.match(await spa.text(), /app\.js/);
});

test('SSE stream: headers + hello + boost event', async () => {
  const { cookie } = await signup('ssefan');
  const ctrl = new AbortController();
  const res = await fetch(`${base}/api/stream`, { headers: { Cookie: cookie }, signal: ctrl.signal });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/event-stream/);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let acc = '';
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline && !acc.includes('event: hello')) {
    const { value, done } = await reader.read();
    if (done) break;
    acc += decoder.decode(value, { stream: true });
  }
  assert.ok(acc.includes('event: hello'), 'hello event received');
  assert.ok(acc.includes('retry: 3000'), 'retry line present');

  // Trigger a boost from another user and watch the broadcast.
  const b = await signup('ssebooster');
  const h = { 'Content-Type': 'application/json', Cookie: b.cookie };
  await fetch(`${base}/api/boost`, { method: 'POST', headers: h, body: JSON.stringify({ slug: STAR_SLUG, amount: 50 }) });

  const deadline2 = Date.now() + 4000;
  while (Date.now() < deadline2 && !acc.includes('event: boost')) {
    const { value, done } = await reader.read();
    if (done) break;
    acc += decoder.decode(value, { stream: true });
  }
  assert.ok(acc.includes('event: boost'), 'boost broadcast received');
  assert.ok(acc.includes(STAR_SLUG));
  ctrl.abort();
});
