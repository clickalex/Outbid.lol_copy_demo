'use strict';
/* Headless smoke test for the demo mock API (demo/demo-api.js).
   Exercises every route the demo SPA uses. Run: node test-demo.js */
const assert = require('assert');
const API = require('./demo-api.js');

// keep bots quiet during the test
if (typeof document === 'undefined') { /* bots only auto-start in a browser */ }

let passed = 0, failed = 0;
async function t(name, fn) {
  try { await fn(); passed++; console.log('  ok', name); }
  catch (e) { failed++; console.error('FAIL', name, '::', e.message); }
}

(async () => {
  // ---- public routes
  await t('health', async () => {
    const d = await API.api('/health');
    assert.strictEqual(d.demo, true);
  });
  await t('profiles list + search + category', async () => {
    const d = await API.api('/profiles');
    assert.strictEqual(d.profiles.length, 13);
    assert.strictEqual(d.total, 13);
    const q = await API.api('/profiles?q=luna');
    assert.strictEqual(q.profiles.length, 1);
    assert.strictEqual(q.profiles[0].slug, 'luna-starr');
    const c = await API.api('/profiles?category=venue');
    assert.ok(c.profiles.every((p) => p.category === 'venue'));
    const sorted = d.profiles.every((p, i, a) => i === 0 || a[i - 1].boostTotal >= p.boostTotal);
    assert.ok(sorted, 'sorted by boostTotal');
  });
  await t('profile detail incl. verified coral-cove + community mosaic', async () => {
    const v = await API.api('/profiles/coral-cove');
    assert.strictEqual(v.profile.verified, true);
    assert.strictEqual(v.profile.claimedByUsername, 'moonwalker_z');
    const m = await API.api('/profiles/midnight-mosaic');
    assert.strictEqual(m.profile.seed, false);
    assert.ok(m.profile.boostTotal > 0);
  });
  await t('leaderboard + feed', async () => {
    const lb = await API.api('/leaderboard');
    assert.strictEqual(lb.top.length, 7);
    assert.ok(lb.top[0].points >= lb.top[1].points);
    const f = await API.api('/feed');
    assert.strictEqual(f.boosts.length, 33);
    assert.ok(Date.parse(f.boosts[0].at) >= Date.parse(f.boosts[1].at), 'feed newest-first');
  });
  await t('donation methods', async () => {
    const m = await API.api('/donations/methods');
    assert.strictEqual(m.methods.length, 4);
  });

  // ---- auth: demo_fan login
  await t('login demo_fan', async () => {
    const d = await API.api('/auth/login', { method: 'POST', body: { username: 'demo_fan', password: 'demo1234' } });
    const me = d.user;
    assert.strictEqual(me.username, 'demo_fan');
    assert.strictEqual(me.coins, 8730);
    assert.strictEqual(me.streakCount, 4);
    assert.strictEqual(me.dailyClaim.claimedToday, false);
    assert.strictEqual(me.dailyClaim.streakForClaim, 5);
    assert.strictEqual(me.dailyClaim.reward, 1100);
    assert.strictEqual(me.luckyDropClaimable, true);
    assert.strictEqual(me.tasksDone >= 6, true, 't01..t05 + t10 + t15 done');
    assert.strictEqual(me.referralCode, 'GB-DEMO42-A1B2');
    assert.strictEqual(me.referrals.length, 2);
    assert.strictEqual(me.lifetimeMatchEarned, 310);
    const t15 = me.tasks.find((x) => x.id === 't15');
    assert.strictEqual(t15.done, true);
    assert.strictEqual(t15.claimed, false);
    const t14 = me.tasks.find((x) => x.id === 't14');
    assert.strictEqual(t14.locked, true, 't14 locked until t06');
  });
  await t('wrong password rejected', async () => {
    await assert.rejects(() => API.api('/auth/login', { method: 'POST', body: { username: 'demo_fan', password: 'nope-nope' } }),
      (e) => e.message === 'invalid_credentials');
  });

  // ---- economy: daily claim day 5
  await t('daily claim → streak 5 (+1100) and cascades t12', async () => {
    const before = (await API.api('/me')).user;
    const d = await API.api('/daily-claim', { method: 'POST' });
    assert.strictEqual(d.streak, 5);
    assert.strictEqual(d.reward, 1100);
    assert.strictEqual(d.balance, 8730 + 1100);
    const me = (await API.api('/me')).user;
    assert.strictEqual(me.dailyClaim.claimedToday, true);
    const t12 = me.tasks.find((x) => x.id === 't12');
    assert.strictEqual(t12.done, true, '5-day streak task done');
    await assert.rejects(() => API.api('/daily-claim', { method: 'POST' }), (e) => e.message === 'already_claimed' && e.status === 409);
    assert.strictEqual(before.coins, 8730);
  });

  // ---- lucky drop ready then 3h cooldown
  await t('lucky drop ready → then not_ready with waitMs', async () => {
    const d = await API.api('/lucky-drop', { method: 'POST' });
    assert.ok(d.reward >= 250 && d.reward <= 2500);
    await assert.rejects(() => API.api('/lucky-drop', { method: 'POST' }),
      (e) => e.message === 'not_ready' && e.status === 429 && e.data.waitMs > 2.9 * 3600e3);
  });

  // ---- boosts: min, cooldown, self-boost multiplier, insufficient coins
  await t('boost min 50 enforced', async () => {
    await assert.rejects(() => API.api('/boost', { method: 'POST', body: { slug: 'luna-starr', amount: 10 } }),
      (e) => e.message === 'min_boost');
  });
  await t('boost works, feed + profile update, task t05.. progression', async () => {
    const profBefore = (await API.api('/profiles/luna-starr')).profile;
    const d = await API.api('/boost', { method: 'POST', body: { slug: 'luna-starr', amount: 100 } });
    assert.strictEqual(d.value, 100);
    assert.strictEqual(d.selfBoost, false);
    const profAfter = (await API.api('/profiles/luna-starr')).profile;
    assert.strictEqual(profAfter.boostTotal, profBefore.boostTotal + 100);
    assert.strictEqual(profAfter.boostCount, profBefore.boostCount + 1);
    const me = (await API.api('/me')).user;
    assert.strictEqual(me.tasksDone >= 8, true, 't06/t07 unlocked-and-done after 5 boosts over 3 profiles? partial');
    const f = await API.api('/feed');
    assert.strictEqual(f.boosts[0].username, 'demo_fan');
  });
  await t('boost 2s cooldown enforced', async () => {
    await assert.rejects(() => API.api('/boost', { method: 'POST', body: { slug: 'neon-arena', amount: 50 } }),
      (e) => e.message === 'cooldown' && e.status === 429 && e.data.waitMs > 0);
    await new Promise((r) => setTimeout(r, 2100));
    const d = await API.api('/boost', { method: 'POST', body: { slug: 'neon-arena', amount: 50 } });
    assert.strictEqual(d.value, 50);
  });
  await t('task claim flow (t15 +350) and already_claimed', async () => {
    const d = await API.api('/tasks/t15/claim', { method: 'POST' });
    assert.strictEqual(d.reward, 350);
    await assert.rejects(() => API.api('/tasks/t15/claim', { method: 'POST' }), (e) => e.message === 'already_claimed');
  });

  // ---- referral share task
  await t('referral share unlocks t08', async () => {
    const d = await API.api('/referral/share', { method: 'POST' });
    assert.strictEqual(d.shared, true);
    const me = (await API.api('/me')).user;
    const t08 = me.tasks.find((x) => x.id === 't08');
    assert.strictEqual(t08.done, true);
  });

  // ---- one profile per user + self boost ×1.5
  await t('create profile + slug taken + one-per-user + ×1.5 self-boost', async () => {
    const d = await API.api('/profiles', { method: 'POST', body: { name: 'Test Circus', slug: 'test-circus', category: 'venue', emoji: '🎪', tagline: 'x', description: 'y', tags: ['a', 'b'] } });
    assert.strictEqual(d.profile.slug, 'test-circus');
    await assert.rejects(() => API.api('/profiles', { method: 'POST', body: { name: 'Dup', slug: 'test-circus', category: 'venue' } }), (e) => e.message === 'one_profile_per_user' || e.message === 'slug_taken');
    await new Promise((r) => setTimeout(r, 2100));
    const b = await API.api('/boost', { method: 'POST', body: { slug: 'test-circus', amount: 100 } });
    assert.strictEqual(b.selfBoost, true);
    assert.strictEqual(b.value, 150);
    await assert.rejects(() => API.api('/profiles', { method: 'POST', body: { name: 'Second', slug: 'second-page', category: 'brand' } }), (e) => e.message === 'one_profile_per_user');
  });

  // ---- claim request on seeded page
  await t('claim request submitted → pending', async () => {
    const d = await API.api('/profiles/neon-arena/claim', { method: 'POST', body: { evidence: 'demo evidence' } });
    assert.strictEqual(d.status, 'pending');
    const again = await API.api('/profiles/neon-arena/claim', { method: 'POST', body: { evidence: 'x' } });
    assert.strictEqual(again.note, 'already_submitted');
    await assert.rejects(() => API.api('/profiles/midnight-mosaic/claim', { method: 'POST', body: {} }),
      (e) => e.message === 'only_seeded_fan_profiles_can_be_claimed');
  });

  // ---- donation requires login & grants no coins
  await t('donation intent (no coins)', async () => {
    const before = (await API.api('/me')).user.coins;
    const d = await API.api('/donations', { method: 'POST', body: { method: 'upi', amount: 100, note: 'hi' } });
    assert.strictEqual(d.coinsAwarded, 0);
    const after = (await API.api('/me')).user.coins;
    assert.strictEqual(after, before);
  });

  // ---- signup with referral code (happy path)
  await t('signup with demo_fan referral code → bonuses + match', async () => {
    const d = await API.api('/auth/signup', { method: 'POST', body: { username: 'newbie_x', password: 'password1', displayName: 'Newbie', avatar: '🐱', referralCode: 'GB-DEMO42-A1B2' } });
    assert.strictEqual(d.user.coins, 2500 + 500);
    assert.strictEqual(d.user.referrals.length, 0);
    // referrer got +1000 and a new squad entry
    const r = await API.api('/auth/login', { method: 'POST', body: { username: 'demo_fan', password: 'demo1234' } });
    assert.ok(r.user.coins >= 8730 + 1100 + 350 + 1000);
    assert.strictEqual(r.user.referrals.length, 3);
    const newbieEntry = r.user.referrals.find((x) => x.username === 'newbie_x');
    assert.strictEqual(newbieEntry.status, 'active');
  });
  await t('unknown referral code rejected', async () => {
    await assert.rejects(() => API.api('/auth/signup', { method: 'POST', body: { username: 'orphan_1', password: 'password1', referralCode: 'GB-ZZZZZZ-FFFF' } }),
      (e) => e.message === 'unknown_referrer');
  });
  await t('username taken', async () => {
    await assert.rejects(() => API.api('/auth/signup', { method: 'POST', body: { username: 'demo_fan', password: 'password1' } }),
      (e) => e.message === 'username_taken');
  });

  // ---- admin
  await t('admin gate + login', async () => {
    await assert.rejects(() => API.api('/admin/overview'), (e) => e.message === 'admin_required' && e.status === 401);
    await assert.rejects(() => API.api('/admin/login', { method: 'POST', body: { password: 'wrong' } }), (e) => e.message === 'invalid_credentials');
    const d = await API.api('/admin/login', { method: 'POST', body: { password: 'grinbid-admin-dev' } });
    assert.strictEqual(d.admin, true);
  });
  await t('admin overview stats', async () => {
    const d = await API.api('/admin/overview');
    assert.strictEqual(d.users, 8); // 7 seeded demo users + newbie_x
  });
  await t('admin claim queue: seeded + new requests', async () => {
    const d = await API.api('/admin/claim-requests');
    assert.ok(d.requests.length >= 2);
    assert.ok(d.requests.some((r) => r.profileSlug === 'neon-arena'));
  });
  await t('admin approve claim → profile verified', async () => {
    const q = await API.api('/admin/claim-requests');
    const mine = q.requests.find((r) => r.username === 'demo_fan');
    const d = await API.api('/admin/claim-request', { method: 'POST', body: { slug: mine.profileSlug, requestId: mine.id, approve: true } });
    assert.strictEqual(d.ok, true);
    const p = await API.api('/profiles/' + mine.profileSlug);
    assert.strictEqual(p.profile.verified, true);
  });
  await t('admin announce + notify', async () => {
    const a = await API.api('/admin/announce', { method: 'POST', body: { message: 'Demo broadcast!' } });
    assert.strictEqual(a.ok, true);
    const n = await API.api('/admin/notify', { method: 'POST', body: { userId: 'u_0001', message: 'Hello fan!' } });
    assert.strictEqual(n.ok, true);
  });
  await t('admin users list', async () => {
    const d = await API.api('/admin/users');
    assert.ok(d.users.length >= 8);
  });
  await t('admin season settle pays top 3 and resets points', async () => {
    const lb = await API.api('/leaderboard');
    const top3 = lb.top.slice(0, 3).map((u) => u.username);
    const d = await API.api('/admin/season/settle', { method: 'POST' });
    assert.strictEqual(d.payout.earned.length, 3);
    assert.deepStrictEqual(d.payout.earned.map((e) => e.username), top3);
    assert.deepStrictEqual(d.payout.earned.map((e) => e.prize), [50000, 25000, 10000]);
    const lb2 = await API.api('/leaderboard');
    assert.ok(lb2.top.every((u) => u.points === 0));
    assert.strictEqual(lb2.season.id, lb.season.id + 1);
  });
  await t('admin reset reseeds demo data', async () => {
    const d = await API.api('/admin/reset', { method: 'POST' });
    assert.strictEqual(d.ok, true);
    const p = await API.api('/profiles');
    assert.strictEqual(p.profiles.length, 13);
    const me = await API.api('/me');
    assert.strictEqual(me.user, null, 'session cleared on reseed');
  });

  // ---- event bus sanity
  await t('event bus emits boost events', async () => {
    let got = null;
    const off = API.on('boost', (d) => { got = d; });
    await API.api('/auth/login', { method: 'POST', body: { username: 'demo_fan', password: 'demo1234' } });
    await API.api('/boost', { method: 'POST', body: { slug: 'luna-starr', amount: 50 } });
    off();
    assert.ok(got && got.username === 'demo_fan' && got.value === 50);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
