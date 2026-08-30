'use strict';

/**
 * Seed data for a fresh Grinbid database.
 *
 * A brand-new deployment boots with only the game's task list and a fresh
 * season. There are NO pre-made fan pages, no sample users and no bots —
 * every fan page on the board is created by a real fan and goes live only
 * after an admin approves it.
 */

const { CONFIG } = require('./config');

const TASKS = [
  { id: 't01', order: 1, emoji: '👋', title: 'Welcome, booster!', desc: 'Create your account and grab your 2,500 free coins.', reward: 100, unlock: null },
  { id: 't02', order: 2, emoji: '🎨', title: 'Make it yours', desc: 'Set your display name and pick an emoji avatar.', reward: 100, unlock: null },
  { id: 't03', order: 3, emoji: '📅', title: 'First daily claim', desc: "Claim today's free daily coins.", reward: 150, unlock: null },
  { id: 't04', order: 4, emoji: '🍀', title: 'Lucky drop!', desc: 'Open your first lucky drop.', reward: 200, unlock: null },
  { id: 't05', order: 5, emoji: '🚀', title: 'First boost', desc: 'Back a profile with your first boost (min 50 coins).', reward: 250, unlock: null },
  { id: 't06', order: 6, emoji: '🔥', title: 'Boost x5', desc: 'Throw 5 boosts total at any profiles.', reward: 350, unlock: { task: 't05' } },
  { id: 't07', order: 7, emoji: '🌟', title: 'Spread the love', desc: 'Boost 3 different profiles.', reward: 300, unlock: { task: 't05' } },
  { id: 't08', order: 8, emoji: '📣', title: 'Share your code', desc: 'Grab your referral code and share it with a friend.', reward: 200, unlock: null },
  { id: 't09', order: 9, emoji: '🤝', title: 'First referral', desc: 'A friend joins with your code and completes their first action.', reward: 1000, unlock: { task: 't08' } },
  { id: 't10', order: 10, emoji: '🧾', title: 'Task collector', desc: 'Complete 5 tasks in total.', reward: 300, unlock: null },
  { id: 't11', order: 11, emoji: '📆', title: 'Three in a row', desc: 'Claim daily coins 3 days in a row.', reward: 400, unlock: { task: 't03' } },
  { id: 't12', order: 12, emoji: '👑', title: '5-day streak', desc: 'Reach a 5-day daily claim streak.', reward: 500, unlock: { task: 't11' } },
  { id: 't13', order: 13, emoji: '💰', title: 'Big spender', desc: 'Spend 5,000 coins on boosts (any profile).', reward: 600, unlock: { task: 't06' } },
  { id: 't14', order: 14, emoji: '💥', title: 'Heavy hitter', desc: 'Boost 3 times with at least 100 coins each.', reward: 450, unlock: { task: 't06' } },
  { id: 't15', order: 15, emoji: '🏛️', title: 'Back a landmark', desc: 'Boost an estate or venue profile once.', reward: 350, unlock: null },
  { id: 't16', order: 16, emoji: '🎉', title: 'Mega recruiter', desc: 'Bring 3 friends to Grinbid with your code.', reward: 2000, unlock: { task: 't09' } }
];
// ---------------------------------------------------------------------------
// Fresh database state
//
// A brand-new deployment boots with NOTHING but the game's task list and a
// fresh season. There are no pre-made fan pages, no sample users, no bots —
// every fan page on the board is created by a real fan and only goes live
// after an admin approves it (status 'pending' → 'approved').
// ---------------------------------------------------------------------------
function createSeedState(now = Date.now()) {
  const iso = new Date(now).toISOString();

  const meta = {
    version: 4,
    createdAt: iso,
    updatedAt: iso,
    bootCount: 0,
    legalNoticeAddedAt: iso
  };

  // Three rank lists run together: weekly (7d), monthly (30d), season (90d).
  // Each holds fan-booster points AND fandom (page) points, gets settled with
  // coin prizes for the top fans, and records winners in state.winners. A fresh
  // deploy starts each ladder at "now" (id 1, window ends `lengthMs` ahead).
  function makePeriod(lengthMs, label) {
    return {
      id: 1,
      label,
      startedAt: iso,
      endsAt: new Date(now + lengthMs).toISOString(),
      settled: false,
      lastSettlement: null,
      payouts: []
    };
  }
  const periods = {
    week: makePeriod(CONFIG.ECONOMY.PERIODS.week.lengthMs, 'Weekly'),
    month: makePeriod(CONFIG.ECONOMY.PERIODS.month.lengthMs, 'Monthly'),
    season: makePeriod(CONFIG.ECONOMY.PERIODS.season.lengthMs, 'Season')
  };

  return {
    meta,
    periods,
    season: periods.season, // back-compat alias
    winners: [],           // permanent ledger: every weekly/monthly/season winner
    fanPoints: { week: {}, month: {}, season: {} },   // period -> userId -> pts
    fandomPoints: { week: {}, month: {}, season: {} }, // period -> slug  -> love
    tasks: TASKS,
    users: {},
    userByUsername: {},
    profiles: {},          // every page is fan-created + admin-approved
    boosts: [],
    transactions: [],
    adminLog: [],
    donationIntents: [],
    nextIds: { user: 1, boost: 1, txn: 1, claim: 1 }
  };
}

module.exports = { createSeedState, TASKS };
