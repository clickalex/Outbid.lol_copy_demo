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
  // NOTE: coin earnings (daily, lucky drop, tasks, referrals, prizes) do NOT
  // add fan/leaderboard points — points come only from boosts (see applyBoost).

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

const BOOSTABLE_CATEGORIES = new Set(['celebrity', 'character', 'influencer', 'estate', 'venue', 'brand', 'community']);

/**
 * Execute a boost. Deducts coins, credits the profile's boosted value
 * (1.5x when self-boosting your own profile), updates counters, syncs tasks.
 */
function applyBoost(state, user, profile, amount, at = Date.now()) {
  ensurePeriods(state, at);
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
  // Fan points on every active ladder (weekly / monthly / season).
  addFanPoints(state, user.id, value, at);
  // Fandom "love" — the celeb/character page ranking for each ladder.
  addFandomPoints(state, profile, value, at);
  // seasonPoints mirrors the season ladder for existing wallet/profile UI.
  user.seasonPoints = (state.fanPoints.season[user.id] || 0);
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
// Rank lists — three ladders: weekly (7d), monthly (30d), season (90d).
// Each ladder tracks FAN points (boosters win coins) and FANDOM points
// (celeb/character pages win prestige). Everything lives in state so it
// survives restarts; winners are kept forever in state.winners (they become
// the real-money payout list once that phase launches).
// ---------------------------------------------------------------------------

const PERIODS = E.PERIODS;
const PERIOD_ORDER = E.PERIOD_ORDER || ['week', 'month', 'season'];
// Fixed anchor so every instance computes identical period windows/ids.
const PERIOD_EPOCH = Date.UTC(2026, 0, 1, 0, 0, 0);

function periodIndex(type, at = Date.now()) {
  const len = PERIODS[type].lengthMs;
  return Math.floor((at - PERIOD_EPOCH) / len);
}

/** Window boundaries (start, end epoch-ms) for the window containing `at`. */
function periodWindow(type, at = Date.now()) {
  const len = PERIODS[type].lengthMs;
  const idx = periodIndex(type, at);
  const start = PERIOD_EPOCH + idx * len;
  return { id: idx + 1, start, end: start + len };
}

/** Create a fresh period object for the window containing `at`. */
function makePeriod(type, at = Date.now()) {
  const cfg = PERIODS[type];
  const w = periodWindow(type, at);
  return {
    id: w.id,
    label: cfg.label,
    startedAt: new Date(w.start).toISOString(),
    endsAt: new Date(w.end).toISOString(),
    settled: false,
    lastSettlement: null,
    payouts: []
  };
}

/**
 * Ensure all three ladders + the points maps + winners ledger exist and that
 * every ladder's window matches `at`. Safe to call on every request and after
 * load — it also migrates the old single-season state shape.
 */
function ensurePeriods(state, at = Date.now()) {
  if (!state.periods) {
    state.periods = {
      week: makePeriod('week', at),
      month: makePeriod('month', at),
      season: makePeriod('season', at)
    };
  }
  for (const t of PERIOD_ORDER) {
    if (!state.periods[t]) state.periods[t] = makePeriod(t, at);
    // Backfill label (older records may lack it).
    if (!state.periods[t].label) state.periods[t].label = PERIODS[t].label;
    if (!Array.isArray(state.periods[t].payouts)) state.periods[t].payouts = [];
  }
  // Legacy state held a standalone season with absolute dates. Adopt it as
  // the season ladder's id 1, then let window rollover handle the rest.
  if (!state._periodsMigrated) {
    const legacy = state.season && state.season.endsAt && !state.season.label ? state.season : null;
    // Migrate only a legitimately in-flight legacy season (still in the
    // future). Anything stale drops to a fresh window rather than producing
    // a storm of empty past-window settlements.
    if (legacy && Date.parse(legacy.endsAt) > at) {
      state.periods.season = {
        id: legacy.id || periodIndex('season', at) + 1,
        label: PERIODS.season.label,
        startedAt: legacy.startedAt || state.periods.season.startedAt,
        endsAt: legacy.endsAt,
        settled: Boolean(legacy.settled),
        lastSettlement: legacy.lastSettlement || null,
        payouts: Array.isArray(legacy.payouts) ? legacy.payouts : []
      };
    }
    state._periodsMigrated = true;
  }
  state.season = state.periods.season; // back-compat alias

  if (!state.fanPoints) state.fanPoints = { week: {}, month: {}, season: {} };
  if (!state.fandomPoints) state.fandomPoints = { week: {}, month: {}, season: {} };
  for (const t of PERIOD_ORDER) {
    if (!state.fanPoints[t]) state.fanPoints[t] = {};
    if (!state.fandomPoints[t]) state.fandomPoints[t] = {};
  }
  if (!Array.isArray(state.winners)) state.winners = [];

  // Roll any ladder whose window has elapsed. A ladder with NO active
  // participants just snaps forward silently (no empty winner record); a
  // ladder with fans/pages in it is settled with prizes and a ledger entry.
  if (!state._settling) {
    state._settling = true;
    try {
      for (const t of PERIOD_ORDER) {
        let guard = 0;
        while (state.periods[t].id < periodIndex(t, at) + 1 && guard < 600) {
          const hasData = Object.keys(state.fanPoints[t] || {}).length > 0 ||
                          Object.keys(state.fandomPoints[t] || {}).length > 0;
          if (!hasData) {
            // Empty ladder — jump straight to the current window, no payout.
            const w = periodWindow(t, at);
            state.periods[t].id = w.id;
            state.periods[t].startedAt = new Date(w.start).toISOString();
            state.periods[t].endsAt = new Date(w.end).toISOString();
            state.fanPoints[t] = {};
            state.fandomPoints[t] = {};
          } else {
            settlePeriod(state, t, true, at);
          }
          guard += 1;
        }
      }
    } finally {
      state._settling = false;
    }
  }
  return state;
}

/** Add a booster's fan points to every active ladder (window-rollover safe). */
function addFanPoints(state, userId, value, at = Date.now()) {
  for (const t of PERIOD_ORDER) {
    const p = state.periods[t];
    const idx = periodIndex(t, at);
    if (!p || p.id !== idx + 1) continue; // stale window; will be settled
    state.fanPoints[t][userId] = (state.fanPoints[t][userId] || 0) + value;
  }
}

/** Add fandom "love" (boost value) to a page on every active ladder. */
function addFandomPoints(state, profile, value, at = Date.now()) {
  const key = profile.slug || profile.id;
  for (const t of PERIOD_ORDER) {
    const p = state.periods[t];
    const idx = periodIndex(t, at);
    if (!p || p.id !== idx + 1) continue;
    const cur = state.fandomPoints[t][key] || { slug: key, name: profile.name, emoji: profile.emoji, image: profile.image || null, realName: profile.realName || profile.name, category: profile.category, love: 0, fans: 0 };
    cur.love += value;
    cur.name = profile.name;
    cur.emoji = profile.emoji;
    cur.image = profile.image || cur.image || null;
    cur.realName = profile.realName || profile.name;
    cur.category = profile.category;
    cur.fans = profile.fanCount || (profile.fanIds ? profile.fanIds.length : cur.fans);
    state.fandomPoints[t][key] = cur;
  }
}

/** Top fans (boosters) for a ladder: [{userId, username, displayName, avatar, points}] */
function fanRankings(state, type, limit = 3) {
  const pts = { ...(((state.fanPoints && state.fanPoints[type]) || {})) };
  // Back-compat for older state/test harnesses that set user.seasonPoints
  // directly instead of the per-ladder map (only used for the season ladder).
  if (type === 'season' && Object.keys(pts).length === 0) {
    for (const u of Object.values(state.users)) {
      if (u && u.username && (u.seasonPoints || 0) > 0) pts[u.id] = u.seasonPoints;
    }
  }
  return Object.entries(pts)
    .map(([userId, points]) => {
      const u = state.users[userId];
      return u ? { userId, id: userId, username: u.username, displayName: u.displayName, avatar: u.avatar, points: Math.floor(points) } : null;
    })
    .filter((r) => r && r.points > 0)
    .sort((a, b) => b.points - a.points || a.username.localeCompare(b.username))
    .slice(0, limit);
}

/**
 * Top fandom (celeb/character pages) for a ladder. Uses live profiles when
 * available (so renamed/removed pages behave correctly) over the stored map,
 * falling back to the map for pages since deleted.
 */
function fandomRankings(state, type, limit = 5) {
  const pts = (state.fandomPoints && state.fandomPoints[type]) || {};
  const rows = [];
  const seen = new Set();
  for (const [key, cur] of Object.entries(pts)) {
    if (!cur || !cur.love) continue;
    seen.add(key);
    const live = state.profiles[key];
    if (live) {
      rows.push({
        slug: live.slug,
        name: live.name,
        emoji: live.emoji,
        image: live.image || null,
        realName: live.realName || live.name,
        category: live.category,
        verified: Boolean(live.verified),
        status: live.status || 'approved',
        love: Math.floor(cur.love),
        fans: live.fanCount || cur.fans || 0
      });
    } else {
      rows.push({
        slug: cur.slug,
        name: cur.name,
        emoji: cur.emoji,
        image: cur.image || null,
        realName: cur.realName || cur.name,
        category: cur.category,
        verified: false,
        status: 'approved',
        love: Math.floor(cur.love),
        fans: cur.fans || 0
      });
    }
  }
  return rows
    .sort((a, b) => b.love - a.love || b.fans - a.fans || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Award a prize to a winner WITHOUT feeding it back into ladder points. */
function awardPrize(state, user, amount, label, at) {
  const amt = Math.max(0, Math.floor(amount));
  if (amt <= 0 || !user) return null;
  const txn = pushTxn(state, user, 'season_prize', amt, label, at);
  user.coins += amt;
  user.totalCoinsEarned += amt;
  return txn;
}

/**
 * Settle one ladder: pay coin prizes to the top 3 FANS, record the top 5
 * FANDOM (celeb/character) results, append a permanent winners-ledger entry,
 * then roll the window forward and reset that ladder's points.
 */
function settlePeriod(state, type, force = false, at = Date.now()) {
  ensurePeriods(state, at);
  const p = state.periods[type];
  const cfg = PERIODS[type];
  const idx = periodIndex(type, at);
  if (!force && p.id === idx + 1) return { ok: false, reason: 'not_over' };
  if (force && p.id > idx) {
    // Force-settle requested but the current window hasn't ended: settle the
    // window that just finished (p.id) — idempotent guard.
  }

  const fans = fanRankings(state, type, cfg.fanPrizes.length);
  const fandom = fandomRankings(state, type, cfg.fandomTop);

  const earned = fans.map((r, i) => ({ ...r, rank: i + 1, prize: cfg.fanPrizes[i] }));
  earned.forEach((r) => {
    const u = state.users[r.userId];
    awardPrize(state, u, r.prize, `${cfg.label} ${p.id} prize — rank ${r.rank}`, at);
  });

  const payout = {
    at: new Date(at).toISOString(),
    type,
    label: cfg.label,
    periodId: p.id,
    fans: earned,
    fandom: fandom.map((f, i) => ({ ...f, rank: i + 1 }))
  };
  p.payouts.push(payout);
  if (p.payouts.length > 12) p.payouts.shift();

  // Permanent ledger — the future real-money payout list.
  state.winners.push({
    at: payout.at,
    type,
    label: cfg.label,
    periodId: p.id,
    cashStatus: 'recorded_pending_launch', // paid out in cash once real-money prizes launch
    fans: earned.map((r) => ({
      rank: r.rank, userId: r.userId, username: r.username, displayName: r.displayName,
      points: r.points, coinPrize: r.prize, cashPaid: false
    })),
    fandom: payout.fandom.map((f) => ({
      rank: f.rank, slug: f.slug, name: f.name, realName: f.realName,
      emoji: f.emoji, category: f.category, love: f.love, fans: f.fans
    }))
  });
  if (state.winners.length > 1000) state.winners.splice(0, state.winners.length - 1000);

  p.lastSettlement = payout.at;
  p.settled = false;

  // Roll forward. A forced admin settlement closes the CURRENT (still
  // in-progress) window and opens the very next one; a natural settlement
  // (window elapsed) moves to the window containing `at`.
  if (force && idx + 1 === p.id) {
    const targetId = p.id + 1;
    const nextStart = PERIOD_EPOCH + (targetId - 1) * cfg.lengthMs;
    p.id = targetId;
    p.startedAt = new Date(nextStart).toISOString();
    p.endsAt = new Date(nextStart + cfg.lengthMs).toISOString();
  } else {
    const w = periodWindow(type, at);
    p.id = w.id;
    p.startedAt = new Date(w.start).toISOString();
    p.endsAt = new Date(w.end).toISOString();
  }

  // Reset this ladder's points.
  state.fanPoints[type] = {};
  state.fandomPoints[type] = {};
  // Keep seasonPoints (mirrors season ladder) consistent for existing UI.
  if (type === 'season') {
    for (const u of Object.values(state.users)) u.seasonPoints = 0;
  }
  return { ok: true, payout };
}

/** Auto-settle any ladder whose window has elapsed. Returns all settlements. */
function maybeAutoSettle(state, at = Date.now()) {
  ensurePeriods(state, at);
  const results = [];
  for (const t of PERIOD_ORDER) {
    const p = state.periods[t];
    if (p.id < periodIndex(t, at) + 1) results.push(settlePeriod(state, t, true, at));
  }
  return results.length ? results : null;
}

// ---- Back-compat wrappers (older callers use the season-only names) -------
function seasonPayoutRankings(state) {
  return fanRankings(state, 'season', 3).map((r) => ({ user: state.users[r.userId], points: r.points }));
}
function settleSeason(state, force = false, at = Date.now()) {
  const r = settlePeriod(state, 'season', force, at);
  if (r && r.ok) return { ok: true, payout: r.payout };
  return r;
}
function maybeAutoSettleSeason(state, at = Date.now()) {
  const all = maybeAutoSettle(state, at);
  if (!all) return null;
  const season = all.find((r) => r.ok && r.payout.type === 'season');
  return season || null;
}

// ---------------------------------------------------------------------------
// Public snapshots (never expose password hashes / ip hashes)
// ---------------------------------------------------------------------------

function isAdminUser(user) {
  if (!user) return false;
  const admins = require('./config').CONFIG.AUTH.ADMIN_USERNAMES;
  return admins.includes(String(user.username || '').toLowerCase());
}

function publicUser(state, user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    isAdmin: isAdminUser(user),
    coins: user.coins,
    totalCoinsEarned: user.totalCoinsEarned,
    totalCoinsSpent: user.totalCoinsSpent,
    seasonPoints: Math.floor((state.fanPoints && state.fanPoints.season && state.fanPoints.season[user.id]) || user.seasonPoints || 0),
    fanPoints: {
      week: Math.floor((state.fanPoints && state.fanPoints.week && state.fanPoints.week[user.id]) || 0),
      month: Math.floor((state.fanPoints && state.fanPoints.month && state.fanPoints.month[user.id]) || 0),
      season: Math.floor((state.fanPoints && state.fanPoints.season && state.fanPoints.season[user.id]) || 0)
    },
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
    realName: profile.realName || profile.name,
    category: profile.category,
    emoji: profile.emoji,
    image: profile.image || null,
    tagline: profile.tagline,
    tags: profile.tags,
    description: profile.description,
    seed: Boolean(profile.seed),
    fanCreated: true,
    // 'approved' profiles are publicly listed; 'pending'/'rejected' stay
    // private to their creator and to admins (filtered in the API layer).
    status: profile.status || 'approved',
    reviewedAt: profile.reviewedAt || null,
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
  ensurePeriods,
  fanRankings,
  fandomRankings,
  settlePeriod,
  maybeAutoSettle,
  periodIndex,
  PERIOD_EPOCH,
  publicUser,
  publicProfile,
  isAdminUser,
  MATCH_TRIGGER_KINDS
};
