'use strict';

/**
 * demo.js — the ADMIN-ONLY demo sandbox.
 *
 * Builds a fully fake, in-memory Grinbid world (fans, celeb/character pages,
 * populated weekly/monthly/season ladders, a past winner in the Hall of Fame,
 * a pending page and a pending claim request) so the admin can test every
 * feature end to end WITHOUT touching the real database.
 *
 * Hard guarantees:
 *   - Never written to disk. Held only in `getDemoState()` memory.
 *   - Never served by public endpoints — every /api/demo/* route requires an
 *     admin session, and the Demo nav link is only rendered for admins.
 *   - Point totals are seeded directly (no time-based settlement), so the
 *     sandbox always shows a full, stable leaderboard. Reset any time.
 */

const eco = require('./economy');
const { createSeedState } = require('./seed');

const DAY = 24 * 60 * 60 * 1000;

const PAGES = [
  { slug: 'salman-khan', name: 'Bhai Fan Club', realName: 'Salman Khan', category: 'celebrity', emoji: '🐯', tagline: 'Being Human. Being Bhai.', tags: ['bollywood', 'bhai', 'salman'], creator: 'salfan', desc: 'Fan-made tribute to Salman Khan — the boss of the box office.' },
  { slug: 'shah-rukh-khan', name: 'SRK Army', realName: 'Shah Rukh Khan', category: 'celebrity', emoji: '❤️', tagline: 'King Khan. Baadshah of Bollywood.', tags: ['bollywood', 'srk', 'kingkhan'], creator: 'srkfan', desc: 'Fan-made page for Shah Rukh Khan — spread the love.' },
  { slug: 'lionel-messi', name: 'Messi GOATs', realName: 'Lionel Messi', category: 'celebrity', emoji: '🐐', tagline: 'The GOAT. Left-foot magic.', tags: ['football', 'messi', 'goat'], creator: 'messifan', desc: 'Tribute to Lionel Messi — eight Ballon d’Ors and counting.' },
  { slug: 'iron-man', name: 'Stark Industries Fan', realName: 'Iron Man', category: 'character', emoji: '🤖', tagline: 'I am Iron Man.', tags: ['marvel', 'tonystark', 'avengers'], creator: 'ironfan', desc: 'Fan page for Tony Stark / Iron Man — genius, billionaire, hero.' },
  { slug: 'hulk', name: 'Hulk Smash Club', realName: 'Hulk', category: 'character', emoji: '💚', tagline: 'Hulk is strongest one there is.', tags: ['marvel', 'hulk', 'avengers'], creator: 'hulkfan', desc: 'Tribute to the big green hero. Smash the boost button.' },
  { slug: 'wankhede-stadium', name: 'Wankhede Roar', realName: 'Wankhede Stadium', category: 'venue', emoji: '🏟️', tagline: 'Where Mumbai roars.', tags: ['cricket', 'mumbai', 'stadium'], creator: 'cricketfan', desc: 'Fan page for the iconic Wankhede — the sound of cricket in Mumbai.' }
];

const FANS = [
  { username: 'salfan', displayName: 'Salman Superfan', avatar: '🐯', email: 'salfan@demo.grinbid' },
  { username: 'srkfan', displayName: 'SRK Raj', avatar: '❤️', email: 'srkfan@demo.grinbid' },
  { username: 'messifan', displayName: 'Messi 10', avatar: '🐐', email: 'messifan@demo.grinbid' },
  { username: 'ironfan', displayName: 'Stark Fan', avatar: '🤖', email: 'ironfan@demo.grinbid' },
  { username: 'hulkfan', displayName: 'Green Smash', avatar: '💚', email: 'hulkfan@demo.grinbid' },
  { username: 'cricketfan', displayName: 'Mumbai Cheer', avatar: '🏏', email: 'cricketfan@demo.grinbid' },
  { username: 'boosterboi', displayName: 'Booster Boi', avatar: '🔥', email: 'boosterboi@demo.grinbid' },
  { username: 'fanqueen', displayName: 'Fan Queen', avatar: '👑', email: 'fanqueen@demo.grinbid' }
];

// Period seed totals: [week, month, season] per (fan -> {page: amountCoinsSpent})
// Values are the COIN amounts boosted; ×1.5 applies when a fan boosts their own page.
const SPEND = {
  salfan:     { 'salman-khan': [800, 2600, 6200] },
  srkfan:     { 'shah-rukh-khan': [700, 2300, 5200] },
  messifan:   { 'lionel-messi': [600, 1900, 4300] },
  ironfan:    { 'iron-man': [450, 1500, 3300] },
  hulkfan:    { 'hulk': [350, 1200, 2600] },
  cricketfan: { 'wankhede-stadium': [300, 900, 1800] },
  boosterboi: { 'salman-khan': [300, 800, 1600], 'hulk': [200, 500, 900], 'shah-rukh-khan': [150, 400, 700] },
  fanqueen:   { 'shah-rukh-khan': [250, 700, 1400], 'lionel-messi': [200, 500, 900] }
};

function demoUser(state, f) {
  const now = Date.now();
  const user = {
    id: `u_${String(state.nextIds.user).padStart(4, '0')}`,
    username: f.username, displayName: f.displayName, avatar: f.avatar, email: f.email,
    coins: 80000, totalCoinsEarned: 80000, totalCoinsSpent: 0, seasonPoints: 0,
    createdAt: new Date(now - 60 * DAY).toISOString(), updatedAt: new Date(now).toISOString(),
    streakCount: 5, lastDailyClaimDay: null, luckyDropLastAt: null, lastBoostAt: now - 3600_000,
    createdProfileSlug: null, signupIpHash: 'demo',
    referral: { code: `GB-${f.username.toUpperCase().slice(0, 4)}-0000`, referredBy: null, status: 'none', codeSharedAt: null, lifetimeMatchEarned: 0, referrals: [] },
    stats: { boosts: 0, dailyClaims: 0, luckyDrops: 0, distinctProfiles: 0, distinctProfileIds: [],
      coinsSpentOnBoosts: 0, bigBoosts: 0, landmarkBoosts: 0, referralsActive: 0, claimedTasks: 0, maxStreak: 5 },
    tasks: {}, notifications: []
  };
  user.password = 'demo-not-a-real-hash';
  state.nextIds.user += 1;
  state.users[user.id] = user;
  state.userByUsername[user.username] = user;
  return user;
}

function demoProfile(state, page, owner) {
  const now = Date.now();
  const profile = {
    id: `p_${page.slug}`, slug: page.slug, name: page.name, realName: page.realName,
    category: page.category, emoji: page.emoji, image: null, tagline: page.tagline,
    tags: page.tags, description: page.desc, seed: false, fanCreated: true,
    status: 'approved', submittedAt: new Date(now - 45 * DAY).toISOString(),
    reviewedAt: new Date(now - 44 * DAY).toISOString(), reviewNote: 'Approved (demo)',
    verified: false, verifiedAt: null, claimedBy: null,
    createdBy: owner.id, createdByUsername: owner.username, creatorEmail: owner.email,
    createdAt: new Date(now - 45 * DAY).toISOString(),
    boostTotal: 0, boostCount: 0, fanCount: 0, fanIds: [], lastBoostAt: null,
    recentBoosts: [], claimRequests: []
  };
  state.profiles[profile.slug] = profile;
  owner.createdProfileSlug = profile.slug;
  return profile;
}

/** Add points directly to a ladder WITHOUT triggering settlement. */
function seedLadder(state, periodKey, fanId, page, value, at) {
  state.fanPoints[periodKey][fanId] = (state.fanPoints[periodKey][fanId] || 0) + value;
  const key = page.slug;
  const cur = state.fandomPoints[periodKey][key] || {
    slug: key, name: page.name, emoji: page.emoji, image: null,
    realName: page.realName, category: page.category, love: 0, fans: 0
  };
  cur.love += value;
  state.fandomPoints[periodKey][key] = cur;

  // Lifetime profile + fan stats (period-independent), used by cards/feed.
  if (periodKey === 'season') {
    page.boostTotal += value;
    page.boostCount += 1;
    page.lastBoostAt = new Date(at).toISOString();
    const u = state.users[fanId];
    u.stats.boosts += 1;
    u.stats.coinsSpentOnBoosts += Math.round(value);
    u.seasonPoints = state.fanPoints.season[fanId] || 0;
    if (!page.fanIds.includes(fanId)) { page.fanIds.push(fanId); page.fanCount = page.fanIds.length; cur.fans = page.fanCount; }
    state.boosts.push({
      id: `boost_${state.nextIds.boost}`, profileId: page.id, profileSlug: page.slug,
      profileName: page.name, profileEmoji: page.emoji, userId: fanId,
      username: u.username, avatar: u.avatar, amount: Math.round(value), value,
      selfBoost: page.createdBy === fanId, at: new Date(at).toISOString()
    });
    state.nextIds.boost += 1;
    page.recentBoosts.unshift(state.boosts[state.boosts.length - 1]);
    if (page.recentBoosts.length > 30) page.recentBoosts.length = 30;
  }
}

function buildDemoState(now = Date.now()) {
  const state = createSeedState(now);
  state.meta.demo = true;
  // Align the ladders to the CURRENT windows first (empty ladders snap forward
  // with no settlements/winners), so the points we seed belong to the live
  // weekly/monthly/season boards and are never auto-settled away.
  eco.ensurePeriods(state, now);

  const users = {};
  for (const f of FANS) users[f.username] = demoUser(state, f);
  const pages = {};
  for (const page of PAGES) pages[page.slug] = demoProfile(state, page, users[page.creator]);

  const periods = ['week', 'month', 'season'];
  // Seed each ladder. Boosts are dated within the LAST WEEK so the current
  // windows never look "elapsed"; totals grow per ladder to feel cumulative.
  let at = now - 6 * DAY;
  for (const [fanName, map] of Object.entries(SPEND)) {
    const fan = users[fanName];
    for (const [slug, amounts] of Object.entries(map)) {
      const page = pages[slug];
      periods.forEach((pk, i) => {
        const spend = amounts[i];
        const self = page.createdBy === fan.id;
        const value = eco.boostValue(spend, self);
        seedLadder(state, pk, fan.id, page, value, at + i * 1000);
        at += 5000;
      });
    }
  }
  // Keep the feed newest-first and bounded.
  state.boosts.reverse();
  if (state.boosts.length > 200) state.boosts = state.boosts.slice(0, 200);

  // One completed past round for the Hall of Winners (display record).
  state.winners.push({
    at: new Date(now - 8 * DAY).toISOString(), type: 'week', label: 'Weekly', periodId: 0,
    cashStatus: 'recorded_pending_launch',
    fans: [
      { rank: 1, userId: users.salfan.id, username: 'salfan', displayName: 'Salman Superfan', points: 4200, coinPrize: 5000, cashPaid: false },
      { rank: 2, userId: users.srkfan.id, username: 'srkfan', displayName: 'SRK Raj', points: 3600, coinPrize: 2500, cashPaid: false },
      { rank: 3, userId: users.messifan.id, username: 'messifan', displayName: 'Messi 10', points: 3000, coinPrize: 1000, cashPaid: false }
    ],
    fandom: [
      { rank: 1, slug: 'salman-khan', name: 'Bhai Fan Club', realName: 'Salman Khan', emoji: '🐯', category: 'celebrity', love: 5200, fans: 4 },
      { rank: 2, slug: 'shah-rukh-khan', name: 'SRK Army', realName: 'Shah Rukh Khan', emoji: '❤️', category: 'celebrity', love: 4400, fans: 3 },
      { rank: 3, slug: 'lionel-messi', name: 'Messi GOATs', realName: 'Lionel Messi', emoji: '🐐', category: 'celebrity', love: 3600, fans: 3 }
    ]
  });

  // A PENDING page for testing the approval queue.
  const po = users.boosterboi;
  state.profiles['priyanka-chopra'] = {
    id: 'p_priyanka-chopra', slug: 'priyanka-chopra', name: 'PC Global Fan', realName: 'Priyanka Chopra',
    category: 'celebrity', emoji: '🌟', image: null, tagline: 'Desi girl goes global.',
    tags: ['bollywood', 'hollywood'], description: 'Fan-made tribute to Priyanka Chopra — awaiting admin approval (demo).',
    seed: false, fanCreated: true, status: 'pending', submittedAt: new Date(now - 2 * DAY).toISOString(),
    reviewedAt: null, reviewNote: null, verified: false, verifiedAt: null, claimedBy: null,
    createdBy: po.id, createdByUsername: po.username, creatorEmail: po.email,
    createdAt: new Date(now - 2 * DAY).toISOString(),
    boostTotal: 0, boostCount: 0, fanCount: 0, fanIds: [], lastBoostAt: null, recentBoosts: [], claimRequests: []
  };

  // A pending CLAIM request for testing the claims queue.
  state.profiles['salman-khan'].claimRequests.push({
    id: 'claim_demo_1', userId: users.salfan.id, username: 'salfan',
    evidence: 'DEMO: pretending to be the official rep to test the claim queue.',
    status: 'pending', at: new Date(now - 1 * DAY).toISOString()
  });

  // A sample donation intent for the funding panel.
  state.donationIntents.push({
    id: 'don_demo_1', userId: users.fanqueen.id, username: 'fanqueen',
    method: 'upi', amount: 500, note: 'DEMO donation', at: new Date(now - 3 * DAY).toISOString(), grantsCoins: false
  });

  return state;
}

let _demo = null;
function getDemoState() { if (!_demo) _demo = buildDemoState(); return _demo; }
function resetDemoState() { _demo = buildDemoState(); return _demo; }

module.exports = { buildDemoState, getDemoState, resetDemoState };
