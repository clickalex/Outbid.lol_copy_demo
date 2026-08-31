'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { CONFIG } = require('../src/config');
const eco = require('../src/economy');
const { createSeedState, TASKS } = require('../src/seed');

const E = CONFIG.ECONOMY;

function makeUser(overrides = {}) {
  return {
    id: 'u_0001',
    username: 'tester',
    displayName: 'Tester',
    avatar: '🦊',
    coins: 0,
    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
    seasonPoints: 0,
    streakCount: 0,
    lastDailyClaimDay: null,
    luckyDropLastAt: null,
    lastBoostAt: 0,
    createdProfileSlug: null,
    createdAt: new Date().toISOString(),
    referral: { code: 'GB-AAAAAA-0000', referredBy: null, status: 'none', codeSharedAt: null, lifetimeMatchEarned: 0, referrals: [] },
    stats: {
      boosts: 0, dailyClaims: 0, luckyDrops: 0,
      distinctProfiles: 0, distinctProfileIds: [],
      coinsSpentOnBoosts: 0, bigBoosts: 0, landmarkBoosts: 0,
      referralsActive: 0, claimedTasks: 0, maxStreak: 0
    },
    tasks: {},
    notifications: [],
    ...overrides
  };
}

test('daily reward math: base 500, +150/day, capped at 2000', () => {
  assert.strictEqual(eco.dailyRewardForStreak(1), 500);
  assert.strictEqual(eco.dailyRewardForStreak(2), 650);
  assert.strictEqual(eco.dailyRewardForStreak(3), 800);
  assert.strictEqual(eco.dailyRewardForStreak(10), 500 + 9 * 150);
  assert.strictEqual(eco.dailyRewardForStreak(11), 2000); // 500+1500=2000
  assert.strictEqual(eco.dailyRewardForStreak(20), 2000); // cap
  assert.strictEqual(eco.dailyRewardForStreak(1000), 2000);
});

test('streak continuity: only yesterday continues the streak', () => {
  // Streak resets after a missed day.
  assert.strictEqual(eco.isYesterday(eco.dayKey(Date.now() - 86400_000), Date.now()), true);
  assert.strictEqual(eco.isYesterday(eco.dayKey(Date.now()), Date.now()), false);
  assert.strictEqual(eco.isYesterday(eco.dayKey(Date.now() - 2 * 86400_000), Date.now()), false);
  assert.strictEqual(eco.isYesterday(null, Date.now()), false);
});

test('lucky drop reward is within [250, 2500] inclusive', () => {
  for (let i = 0; i < 200; i += 1) {
    const r = eco.luckyDropReward();
    assert.ok(r >= 250 && r <= 2500, `reward ${r} out of range`);
    assert.ok(Number.isInteger(r));
  }
});

test('lucky drop claimable after exactly 3 hours', () => {
  const t = Date.parse('2026-01-01T00:00:00Z');
  assert.ok(Date.now() >= eco.luckyDropClaimableAt(null));
  assert.strictEqual(eco.luckyDropClaimableAt(new Date(t).toISOString(), t), t + 3 * 3600_000);
  assert.strictEqual(eco.luckyDropClaimableAt(new Date(t).toISOString(), t + 3 * 3600_000), t + 3 * 3600_000);
  assert.ok(t + 3 * 3600_000 + 1 >= eco.luckyDropClaimableAt(new Date(t).toISOString(), t + 3 * 3600_000 + 1));
});

test('boost value: 1x standard, 1.5x self-boost, rounded', () => {
  assert.strictEqual(eco.boostValue(50, false), 50);
  assert.strictEqual(eco.boostValue(100, false), 100);
  assert.strictEqual(eco.boostValue(50, true), 75);       // 1.5x
  assert.strictEqual(eco.boostValue(100, true), 150);
  assert.strictEqual(eco.boostValue(101, true), 152);     // rounds 151.5
  assert.strictEqual(eco.boostValue(67, true), 101);      // rounds 100.5
});

test('min boost clamp: 50 floor', () => {
  assert.strictEqual(eco.clampMinBoost(10), 50);
  assert.strictEqual(eco.clampMinBoost(49), 50);
  assert.strictEqual(eco.clampMinBoost(50), 50);
  assert.strictEqual(eco.clampMinBoost(1000), 1000);
});

test('referral match: 10% of referee earnings, floored', () => {
  assert.strictEqual(eco.referralMatchAmount(500), 50);
  assert.strictEqual(eco.referralMatchAmount(2500), 250);
  assert.strictEqual(eco.referralMatchAmount(7), 0);
  assert.strictEqual(eco.referralMatchAmount(0), 0);
});

test('applyBoost: full flow with 1.5x self boost, cooldown and funds', () => {
  const state = createSeedState();
  const user = makeUser({ coins: 1000 });
  state.users[user.id] = user;
  // No pages are pre-seeded — build a fan page the way a real fan would.
  state.profiles['test-fave'] = {
    id: 'p_test-fave', slug: 'test-fave', name: 'Test Fave', realName: 'Test Fave',
    category: 'celebrity', emoji: '⭐', image: null, tagline: '', tags: [],
    description: '', status: 'approved', fanCreated: true, seed: false,
    createdBy: user.id, createdByUsername: user.username, boostTotal: 0,
    boostCount: 0, fanCount: 0, fanIds: [], recentBoosts: [], claimRequests: []
  };
  const profile = state.profiles['test-fave'];

  const base = Date.parse('2026-02-01T12:00:00Z');
  const r = eco.applyBoost(state, user, profile, 200, base);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value, 300);            // 200 × 1.5
  assert.strictEqual(user.coins, 800);         // paid exactly 200
  assert.strictEqual(profile.boostTotal, 300);
  assert.strictEqual(profile.boostCount, 1);
  assert.strictEqual(user.seasonPoints, 300);
  assert.strictEqual(user.stats.boosts, 1);
  assert.strictEqual(user.stats.distinctProfiles, 1);
  assert.strictEqual(r.selfBoost, true);

  // 2-second cooldown enforced.
  const r2 = eco.applyBoost(state, user, profile, 100, base + 1000);
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.reason, 'cooldown');
  assert.ok(r2.waitMs >= 999);

  // After cooldown, works again.
  const r3 = eco.applyBoost(state, user, profile, 100, base + 2100);
  assert.strictEqual(r3.ok, true);
  assert.strictEqual(r3.value, 150);
  assert.strictEqual(user.coins, 700);

  // Min boost of 50 rejected below.
  const r4 = eco.applyBoost(state, user, profile, 49, base + 5000);
  assert.strictEqual(r4.ok, false);
  assert.strictEqual(r4.reason, 'min_boost');

  // Insufficient funds rejected and nothing mutates.
  const poor = makeUser({ id: 'u_poor', username: 'poor', coins: 10 });
  state.users[poor.id] = poor;
  const before = profile.boostTotal;
  const r5 = eco.applyBoost(state, poor, profile, 500, Date.now() + 5000);
  assert.strictEqual(r5.ok, false);
  assert.strictEqual(r5.reason, 'insufficient_coins');
  assert.strictEqual(profile.boostTotal, before);
  assert.strictEqual(poor.coins, 10);
});

test('tasks: unlocks, completion and claims', () => {
  const state = createSeedState();
  assert.strictEqual(state.tasks.length, 16);
  const user = makeUser({ coins: 0 });
  state.users[user.id] = user;

  // Signup-completed task unlocks immediately.
  eco.syncTasks(user, state);
  assert.strictEqual(user.tasks.t01.done, true);

  // t05 (first boost) unlocks t06/t07/t14.
  eco.syncTasks(user, state);
  assert.strictEqual(eco.taskUnlocked(state.tasks.find((t) => t.id === 't06'), user, state), false);
  user.tasks.t05 = { done: true, claimed: false };
  eco.syncTasks(user, state);
  assert.strictEqual(eco.taskUnlocked(state.tasks.find((t) => t.id === 't06'), user, state), true);
  assert.strictEqual(eco.taskUnlocked(state.tasks.find((t) => t.id === 't07'), user, state), true);
  assert.strictEqual(eco.taskUnlocked(state.tasks.find((t) => t.id === 't11'), user, state), false);
  // t14 additionally requires t06 done (not just unlocked).
  assert.strictEqual(eco.taskUnlocked(state.tasks.find((t) => t.id === 't14'), user, state), false);
  user.tasks.t06 = { done: true, claimed: false };
  eco.syncTasks(user, state);
  assert.strictEqual(eco.taskUnlocked(state.tasks.find((t) => t.id === 't14'), user, state), true);

  // Claim requires done; double-claim blocked.
  user.tasks.t01.claimed = false;
  const claim = eco.claimTaskReward(state, user, state.tasks[0]);
  assert.strictEqual(claim.ok, true);
  assert.strictEqual(claim.reward, 100);
  assert.strictEqual(user.coins, 100);
  const again = eco.claimTaskReward(state, user, state.tasks[0]);
  assert.strictEqual(again.ok, false);
  assert.strictEqual(again.reason, 'already_claimed');
});

test('season: awards 50k/25k/10k to top 3 and resets points', () => {
  const state = createSeedState();
  const u1 = makeUser({ id: 'u_1', username: 'a' });
  const u2 = makeUser({ id: 'u_2', username: 'b' });
  const u3 = makeUser({ id: 'u_3', username: 'c' });
  state.users[u1.id] = u1; state.users[u2.id] = u2; state.users[u3.id] = u3;
  // Record season fan points via the ladder map (the shape boosts use).
  eco.ensurePeriods(state);
  state.fanPoints.season[u1.id] = 500;
  state.fanPoints.season[u2.id] = 300;
  state.fanPoints.season[u3.id] = 100;

  const r = eco.settleSeason(state, true);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(u1.coins, 50000);
  assert.strictEqual(u2.coins, 25000);
  assert.strictEqual(u3.coins, 10000);
  assert.strictEqual(state.fanPoints.season[u1.id] || 0, 0);
  assert.ok(state.season.id >= 3); // forced settle closes the current in-progress season
  assert.ok(Array.isArray(r.payout.fans));
  assert.strictEqual(r.payout.fans.length, 3);
  // Fandom + winners ledger recorded.
  assert.ok(Array.isArray(r.payout.fandom));
  assert.ok(Array.isArray(state.winners));
  assert.ok(state.winners.some((w) => w.type === 'season'));
});

test('awardCoins feeds 10% lifetime match to active referrer', () => {
  const state = createSeedState();
  const referrer = makeUser({ id: 'u_ref', username: 'ref' });
  const referee = makeUser({
    id: 'u_refee', username: 'refee',
    referral: { code: 'GB-BBBBBB-1111', referredBy: 'u_ref', status: 'active', codeSharedAt: 'x', lifetimeMatchEarned: 0, referrals: [] }
  });
  state.users[referrer.id] = referrer;
  state.users[referee.id] = referee;

  eco.awardCoins(state, referee, 2500, 'daily_claim', 'test');
  assert.strictEqual(referee.coins, 2500);
  assert.strictEqual(referrer.coins, 250);
  assert.strictEqual(referrer.referral.lifetimeMatchEarned, 250);
});

test('periods: a boost scores on weekly, monthly AND season ladders (fans + fandom)', () => {
  const state = createSeedState();
  const fan = makeUser({ id: 'u_fan', username: 'fanx', coins: 100000 });
  state.users[fan.id] = fan;
  state.profiles['srk'] = {
    id: 'p_srk', slug: 'srk', name: 'SRK Army', realName: 'Shah Rukh Khan',
    category: 'celebrity', emoji: '❤️', image: null, tagline: '', tags: [],
    description: '', status: 'approved', fanCreated: true, seed: false,
    createdBy: 'u_other', createdByUsername: 'other', boostTotal: 0,
    boostCount: 0, fanCount: 0, fanIds: [], recentBoosts: [], claimRequests: []
  };
  const at = Date.parse('2026-03-01T12:00:00Z');
  const res = eco.applyBoost(state, fan, state.profiles['srk'], 1000, at);
  assert.strictEqual(res.ok, true);
  // standard (not owner) => 1000 points to each ladder for fan
  assert.strictEqual(state.fanPoints.week[fan.id], 1000);
  assert.strictEqual(state.fanPoints.month[fan.id], 1000);
  assert.strictEqual(state.fanPoints.season[fan.id], 1000);
  // fandom love on each ladder
  assert.strictEqual(state.fandomPoints.season['srk'].love, 1000);
  assert.strictEqual(state.fandomPoints.week['srk'].realName, 'Shah Rukh Khan');
  // fandom rankings put SRK first
  const top = eco.fandomRankings(state, 'season', 5);
  assert.strictEqual(top[0].slug, 'srk');
  assert.strictEqual(top[0].love, 1000);
  // fan rankings
  const fans = eco.fanRankings(state, 'week', 3);
  assert.strictEqual(fans[0].username, 'fanx');
});

test('weekly settle: pays weekly fan prizes, crowns fandom, records ledger, resets only week', () => {
  const state = createSeedState();
  const w1 = makeUser({ id: 'u_w1', username: 'w1', coins: 100000 });
  state.users[w1.id] = w1;
  state.profiles['hulk'] = {
    id: 'p_hulk', slug: 'hulk', name: 'Hulk Smash', realName: 'Hulk',
    category: 'character', emoji: '💚', image: null, tagline: '', tags: [],
    description: '', status: 'approved', fanCreated: true, seed: false,
    createdBy: 'u_other2', boostTotal: 0, boostCount: 0, fanCount: 0,
    fanIds: [], recentBoosts: [], claimRequests: []
  };
  const at = Date.parse('2026-04-01T12:00:00Z');
  eco.applyBoost(state, w1, state.profiles['hulk'], 2000, at);
  const beforeWeekPts = state.fanPoints.week[w1.id];

  const r = eco.settlePeriod(state, 'week', true, at);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.payout.type, 'week');
  // weekly rank-1 prize = 5000
  assert.strictEqual(w1.coins, 100000 - 2000 + 5000);
  // fandom crowned = Hulk
  assert.strictEqual(r.payout.fandom[0].realName, 'Hulk');
  // ledger entry with cash payout NOT yet paid
  const entry = state.winners[state.winners.length - 1];
  assert.strictEqual(entry.type, 'week');
  assert.strictEqual(entry.fans[0].cashPaid, false);
  assert.strictEqual(entry.cashStatus, 'recorded_pending_launch');
  // week reset, season intact
  assert.strictEqual(state.fanPoints.week[w1.id] || 0, 0);
  assert.strictEqual(state.fanPoints.season[w1.id], beforeWeekPts);
  assert.strictEqual(state.fandomPoints.season['hulk'].love, 2000);
});

test('ensurePeriods: fresh state has zero winners and future-dated ladders', () => {
  const state = createSeedState();
  eco.ensurePeriods(state);
  assert.strictEqual(state.winners.length, 0);
  assert.ok(Date.parse(state.periods.week.endsAt) > Date.now());
  assert.ok(Date.parse(state.periods.month.endsAt) > Date.now());
  assert.ok(Date.parse(state.periods.season.endsAt) > Date.now());
});
