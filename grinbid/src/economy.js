'use strict';

/**
 * economy.js — the single source of truth for every coin calculation,
 * boost mechanic, streak rule, lucky drop, referral math, task unlocks and
 * season settlement. Pure, testable functions that are also used by api.js.
 *
 * Money policy: 100% free virtual coins. Coins have ZERO cash value, can
 * never be bought, sold or redeemed, and donations never grant coins.
 */

const crypto = require('crypto');
const { CONFIG } = require('./config');

const E = CONFIG.ECONOMY;

// ---------------------------------------------------------------------------
// Coins / math
// ---------------------------------------------------------------------------

/**
 * Daily claim reward for the Nth day of a streak (streak counts today).
 * reward = clamp(BASE + (streak - 1) * STREAK_BONUS_PER_DAY, BASE, STREAK_CAP)
 */
function dailyRewardForStreak(streak) {
  const s = Math.max(1, Math.floor(streak));
  const raw = E.DAILY_CLAIM.BASE + (s - 1) * E.DAILY_CLAIM.STREAK_BONUS_PER_DAY;
  return Math.min(raw, E.DAILY_CLAIM.STREAK_CAP);
}

/** UTC day key used to decide streak continuity. */
function dayKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

/** true when `lastClaimDay` is exactly one day before today (UTC). */
function isYesterday(lastClaimDay, now = Date.now()) {
  if (!lastClaimDay || typeof lastClaimDay !== 'string') return false;
  const yesterday = dayKey(now - 24 * 60 * 60 * 1000);
  return lastClaimDay === yesterday;
}

function luckyDropReward() {
  const { MIN_REWARD, MAX_REWARD } = E.LUCKY_DROP;
  return crypto.randomInt(MIN_REWARD, MAX_REWARD + 1); // inclusive [min, max]
}

function luckyDropClaimableAt(lastAt, now = Date.now()) {
  const intervalMs = E.LUCKY_DROP.INTERVAL_HOURS * 60 * 60 * 1000;
  const last = lastAt ? Date.parse(lastAt) : 0;
  return last + intervalMs;
}

/**
 * Boost value credited to a profile. Self-boosts (backing the profile a user
 * created) get the 1.5x multiplier; all others 1.0x. The user always pays
 * exactly `amount` coins.
 */
function boostValue(amount, selfBoost) {
  const mult = selfBoost ? E.BOOST.SELF_BOOST_MULTIPLIER : E.BOOST.STANDARD_MULTIPLIER;
  return Math.round(amount * mult);
}

function clampMinBoost(amount) {
  return Math.max(E.BOOST.MIN_BOOST, Math.floor(amount));
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

function makeReferralCode(userId) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(E.REFERRALS.CODE_LENGTH);
  let code = '';
  for (let i = 0; i < E.REFERRALS.CODE_LENGTH; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `GB-${code}-${crypto.createHash('sha1').update(userId).digest('hex').slice(0, 4).toUpperCase()}`;
}

/** Lifetime match: referrer earns N% of every coin the referee EARNS. */
function referralMatchAmount(earnedCoins) {
  return Math.floor((earnedCoins * E.REFERRALS.LIFETIME_MATCH_PERCENTAGE) / 100);
}

/**
 * Anti-bot referral validation. Returns { ok, status }:
 *  - 'ok'      -> referral is active and proceeds normally
 *  - 'flagged' -> same-IP suspicion: credit is held for admin review
 *  - reason    -> hard rejection (self-referral, unknown code, cap reached)
 */
function validateReferral(state, signupUser, referrer, referrerCode, ipHash) {
  if (!referrerCode) return { ok: true, status: 'none' };
  const code = String(referrerCode).trim().toUpperCase();
  if (!/^GB-[A-Z0-9]{6,14}-[A-F0-9]{4}$/.test(code)) {
    return { ok: false, reason: 'invalid_referral_code' };
  }
  if (signupUser.referral.code === code) {
    return { ok: false, reason: 'self_referral' };
  }
  if (!referrer) {
    return { ok: false, reason: 'unknown_referrer' };
  }
  if (referrer.id === signupUser.id) {
    return { ok: false, reason: 'self_referral' };
  }
  if (signupUser.referral.referredBy) {
    return { ok: false, reason: 'already_referred' };
  }
  // Per-day cap on pending referrals (anti-spam).
  const today = dayKey();
  const todayCount = (referrer.referrals || []).filter((r) => r.at && r.at.slice(0, 10) === today).length;
  if (todayCount >= E.REFERRALS.PER_DAY_CAP) {
    return { ok: false, reason: 'referral_cap_reached' };
  }
  if (ipHash && referrer.signupIpHash && referrer.signupIpHash === ipHash) {
    return { ok: true, status: 'flagged' };
  }
  return { ok: true, status: 'ok' };
}

// ---------------------------------------------------------------------------
// Coin ledger
// ---------------------------------------------------------------------------

const MATCH_TRIGGER_KINDS = new Set(['signup', 'referral_bonus', 'daily_claim', 'lucky_drop', 'task', 'season_prize']);

function pushTxn(state, user, kind, amount, note, at = Date.now()) {
  const txn = {
    id: `txn_${state.nextIds.txn}`,
    userId: user.id,
    kind,
    amount,
    note: String(note || ''),
    at: new Date(at).toISOString()
  };
  state.nextIds.txn += 1;
  state.transactions.push(txn);
  if (state.transactions.length > E.MAX_TRANSACTIONS) {
    state.transactions.splice(0, state.transactions.length - E.MAX_TRANSACTIONS);
  }
  return txn;
}

/**
 * Credit `amount` coins to a user, record the ledger entry and pay the
 * referrer their lifetime match (10% of what the referee earns) unless the
 * earning itself is a match (no double-dipping).
 */
function awardCoins(state, user, amount, kind, note, opts = {}) {
  const at = Number.isFinite(opts.at) ? opts.at : Date.now();
  const userId = user.id;
  const amt = Math.max(0, Math.floor(amount));
  if (amt === 0) return null;

  const txn = pushTxn(state, user, kind, amt, note, at);
  user.coins += amt;
  user.totalCoinsEarned += amt;
  user.seasonPoints += amt;

  // Referral lifetime match (10% of referee's earnings -> referrer).
  if (opts.allowMatch !== false && MATCH_TRIGGER_KINDS.has(kind)) {
    const ref = user.referral;
    if (ref && ref.referredBy) {
      const referrer = state.users[ref.referredBy];
      if (referrer && ref.status === 'active') {
        const match = referralMatchAmount(amt);
        if (match > 0) {
          const mTxn = pushTxn(state, referrer, 'referral_match', match, `${match}% match from @${user.username}`, at);
          referrer.coins += match;
          referrer.totalCoinsEarned += match;
          referrer.seasonPoints += match;
          referrer.referral.lifetimeMatchEarned = (referrer.referral.lifetimeMatchEarned || 0) + match;
          if (opts.events) opts.events.push({ kind: 'referral_match', userId: referrer.id, amount: match, txn: mTxn });
        }
      }
    }
  }
  return txn;
}

/** Spend coins for a boost. Returns null when the user can't afford it. */
function chargeCoins(state, user, amount, kind, note, at = Date.now()) {
  const amt = Math.max(0, Math.floor(amount));
  if (user.coins < amt) return null;
  const txn = pushTxn(state, user, kind, -amt, note, at);
  user.coins -= amt;
  user.totalCoinsSpent += amt;
  return txn;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

function taskUnlocked(task, user, state) {
  if (!task.unlock) return true;
  if (task.unlock.task) {
    const req = state.tasks.find((t) => t.id === task.unlock.task);
    if (!req) return true;
    const prog = user.tasks[req.id];
    return Boolean(prog && prog.done);
  }
  if (typeof task.unlock.tasksDone === 'number') {
    return completedTasks(user, state) >= task.unlock.tasksDone;
  }
  return true;
}

function completedTasks(user, state) {
  return state.tasks.filter((t) => user.tasks[t.id] && user.tasks[t.id].done).length;
}

/**
 * Re-evaluate every task's progress counters and mark satisfiable tasks done.
 * Rewards stay claimable until the user taps "claim".
 */
function syncTasks(user, state, at = Date.now()) {
  const stats = user.stats;
  const nowIso = new Date(at).toISOString();
  for (const task of state.tasks) {
    if (!taskUnlocked(task, user, state)) continue;
    const prog = user.tasks[task.id] || (user.tasks[task.id] = { done: false, claimed: false, doneAt: null, claimedAt: null });
    if (prog.done) continue;
    let done = false;
    switch (task.id) {
      case 't01': done = true; break;
      case 't02': done = Boolean(user.profileUpdatedAt); break;
      case 't03': done = stats.dailyClaims >= 1; break;
      case 't04': done = stats.luckyDrops >= 1; break;
      case 't05': done = stats.boosts >= 1; break;
      case 't06': done = stats.boosts >= 5; break;
      case 't07': done = stats.distinctProfiles >= 3; break;
      case 't08': done = Boolean(user.referral.codeSharedAt); break;
      case 't09': done = stats.referralsActive >= 1; break;
      case 't10': done = completedTasks(user, state) >= 5; break;
      case 't11': done = stats.maxStreak >= 3; break;
      case 't12': done = stats.maxStreak >= 5; break;
      case 't13': done = stats.coinsSpentOnBoosts >= 5000; break;
      case 't14': done = stats.bigBoosts >= 3; break;
      case 't15': done = stats.landmarkBoosts >= 1; break;
      case 't16': done = stats.referralsActive >= 3; break;
      default: break;
    }
    if (done) {
      prog.done = true;
      prog.doneAt = nowIso;
    }
  }
}

function claimTaskReward(state, user, task) {
  if (!taskUnlocked(task, user, state)) return { ok: false, reason: 'locked' };
  const prog = user.tasks[task.id] || {};
  if (prog.claimed) return { ok: false, reason: 'already_claimed' };
  if (!prog.done) return { ok: false, reason: 'not_done' };
  prog.claimed = true;
  prog.claimedAt = new Date().toISOString();
  user.stats.claimedTasks = completedTasks(user, state);
  const txn = awardCoins(state, user, task.reward, 'task', `Task: ${task.title}`);
  return { ok: true, reward: task.reward, txn };
}

// ---------------------------------------------------------------------------
// Boosts
// ---------------------------------------------------------------------------

const BOOSTABLE_CATEGORIES = new Set(['celebrity', 'influencer', 'estate', 'venue', 'brand', 'community']);

/**
 * Execute a boost. Deducts coins, credits the profile's boosted value
 * (1.5x when self-boosting your own profile), updates counters, syncs tasks.
 */
function applyBoost(state, user, profile, amount, at = Date.now()) {
  // 1. cooldown
  const since = at - (user.lastBoostAt || 0);
  if (since < E.BOOST.COOLDOWN_MS) {
    const waitMs = E.BOOST.COOLDOWN_MS - since;
    return { ok: false, reason: 'cooldown', waitMs, code: 429 };
  }
  // 2. min amount
  if (!Number.isInteger(amount) || amount < E.BOOST.MIN_BOOST) {
    return { ok: false, reason: 'min_boost', min: E.BOOST.MIN_BOOST, code: 400 };
  }
  // 3. charge
  const txn = chargeCoins(state, user, amount, 'boost', `Boost @${profile.name}`);
  if (!txn) return { ok: false, reason: 'insufficient_coins', balance: user.coins, code: 400 };

  // 4. credit profile
  const selfBoost = profile.createdBy === user.id;
  const value = boostValue(amount, selfBoost);
  const atIso = new Date(at).toISOString();

  profile.boostTotal += value;
  profile.boostCount += 1;
  profile.lastBoostAt = atIso;

  const wasFan = profile.fanIds && profile.fanIds.includes(user.id);
  if (!wasFan) {
    if (!profile.fanIds) profile.fanIds = [];
    profile.fanIds.push(user.id);
    profile.fanCount = profile.fanIds.length;
  }

  const boost = {
    id: `boost_${state.nextIds.boost}`,
    profileId: profile.id,
    profileSlug: profile.slug,
    profileName: profile.name,
    profileEmoji: profile.emoji,
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    amount,
    value,
    selfBoost,
    at: atIso
  };
  state.nextIds.boost += 1;
  state.boosts.push(boost);
  if (state.boosts.length > E.MAX_FEED_BOOSTS) {
    state.boosts.splice(0, state.boosts.length - E.MAX_FEED_BOOSTS);
  }
  profile.recentBoosts.unshift(boost);
  if (profile.recentBoosts.length > E.MAX_BOOST_HISTORY_PER_PROFILE) {
    profile.recentBoosts.length = E.MAX_BOOST_HISTORY_PER_PROFILE;
  }

  user.lastBoostAt = at;
  user.stats.boosts += 1;
  user.stats.coinsSpentOnBoosts += amount;
  if (amount >= 100) user.stats.bigBoosts += 1;
  if (profile.category === 'estate' || profile.category === 'venue') user.stats.landmarkBoosts += 1;
  user.seasonPoints += value;
  const profiles = new Set(user.stats.distinctProfileIds || []);
  if (!profiles.has(profile.id)) {
    profiles.add(profile.id);
    user.stats.distinctProfileIds = [...profiles];
    user.stats.distinctProfiles = profiles.size;
  }
  syncTasks(user, state, at);

  return { ok: true, boost, txn, value, selfBoost, balance: user.coins };
}

// ---------------------------------------------------------------------------
// Season
// ---------------------------------------------------------------------------

function seasonPayoutRankings(state) {
  return Object.values(state.users)
    .map((u) => ({ user: u, points: u.seasonPoints || 0 }))
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points || a.user.createdAt.localeCompare(b.user.createdAt))
    .slice(0, 3);
}

/**
 * Settle the season: pay RANK_1/2/3 to the top 3 boosters (by season points),
 * record payouts, then roll the clock forward and reset points.
 */
function settleSeason(state, force = false, at = Date.now()) {
  const season = state.season;
  const endsAt = Date.parse(season.endsAt);
  if (!force && at < endsAt && !season.settled) return { ok: false, reason: 'not_over' };
  const rankings = seasonPayoutRankings(state);
  const prizes = [E.SEASON_PRIZES.RANK_1, E.SEASON_PRIZES.RANK_2, E.SEASON_PRIZES.RANK_3];
  const payout = {
    at: new Date(at).toISOString(),
    seasonId: season.id,
    earned: rankings.map((r, i) => ({
      userId: r.user.id,
      username: r.user.username,
      points: r.points,
      prize: prizes[i]
    }))
  };
  rankings.forEach((r, i) => {
    awardCoins(state, r.user, prizes[i], 'season_prize', `Season ${season.id} rank ${i + 1}`, { at });
  });
  season.payouts.push(payout);
  if (season.payouts.length > 10) season.payouts.shift();
  season.id += 1;
  season.startedAt = new Date(at).toISOString();
  season.endsAt = new Date(at + E.SEASON_LENGTH_MS).toISOString();
  season.settled = false;
  season.lastSettlement = payout.at;
  for (const u of Object.values(state.users)) {
    u.seasonPoints = 0;
  }
  return { ok: true, payout };
}

function maybeAutoSettleSeason(state, at = Date.now()) {
  const season = state.season;
  if (!season.settled && at >= Date.parse(season.endsAt)) {
    return settleSeason(state, true, at);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public snapshots (never expose password hashes / ip hashes)
// ---------------------------------------------------------------------------

function publicUser(state, user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    coins: user.coins,
    totalCoinsEarned: user.totalCoinsEarned,
    totalCoinsSpent: user.totalCoinsSpent,
    seasonPoints: user.seasonPoints,
    createdAt: user.createdAt,
    streakCount: user.streakCount,
    dailyClaimedToday: user.lastDailyClaimDay === dayKey(),
    luckyDropClaimable: Date.now() >= luckyDropClaimableAt(user.luckyDropLastAt),
    nextLuckyDropAt: user.luckyDropLastAt ? new Date(luckyDropClaimableAt(user.luckyDropLastAt)).toISOString() : null,
    tasksDone: completedTasks(user, state),
    tasksTotal: state.tasks.length,
    createdProfileSlug: user.createdProfileSlug || null
  };
}

function publicProfile(state, profile) {
  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
    category: profile.category,
    emoji: profile.emoji,
    tagline: profile.tagline,
    tags: profile.tags,
    description: profile.description,
    seed: Boolean(profile.seed),
    fanCreated: true,
    verified: Boolean(profile.verified),
    claimedByUsername: profile.claimedBy ? (state.users[profile.claimedBy] || {}).username || null : null,
    createdByUsername: profile.createdByUsername || (profile.createdBy ? (state.users[profile.createdBy] || {}).username || null : null),
    createdAt: profile.createdAt || null,
    isMineProfile: false,
    boostTotal: profile.boostTotal,
    boostCount: profile.boostCount,
    fanCount: profile.fanCount,
    lastBoostAt: profile.lastBoostAt,
    recentBoosts: (profile.recentBoosts || []).map((b) => ({
      id: b.id,
      username: b.username,
      avatar: b.avatar,
      amount: b.amount,
      value: b.value,
      selfBoost: b.selfBoost,
      at: b.at
    }))
  };
}

module.exports = {
  dailyRewardForStreak,
  dayKey,
  isYesterday,
  luckyDropReward,
  luckyDropClaimableAt,
  boostValue,
  clampMinBoost,
  makeReferralCode,
  referralMatchAmount,
  validateReferral,
  awardCoins,
  chargeCoins,
  pushTxn,
  taskUnlocked,
  completedTasks,
  syncTasks,
  claimTaskReward,
  applyBoost,
  seasonPayoutRankings,
  settleSeason,
  maybeAutoSettleSeason,
  publicUser,
  publicProfile,
  MATCH_TRIGGER_KINDS
};
