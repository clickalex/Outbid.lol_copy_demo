'use strict';
/* ============================================================
   Grinbid DEMO — the "backend" that isn't there.

   A tiny in-browser mock of the real Node API (src/api.js) with the
   same routes, the same response shapes and the same economy math
   (src/economy.js): streaks, lucky drops, ×1.5 self-boosts, the
   2-second cooldown, task unlocks, referral matching, season
   payouts, admin actions…

   Data lives in localStorage (with an in-memory fallback), events
   travel over an in-page bus + BroadcastChannel instead of SSE, and
   a cast of demo bots keeps the live feed buzzing.

   No frameworks, no build step, no network. 100% demo data.
   ============================================================ */
(function (root, factory) {
  const instance = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = instance;
  else root.GB_API = instance;
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {

  const DATA = (typeof GB_DEMO_DATA !== 'undefined')
    ? GB_DEMO_DATA
    : require('./demo-data.js');

  // ------------------------------------------------------------------ tunables
  // (values mirror src/config.js)
  const E = Object.freeze({
    SIGNUP_BONUS: 2500,
    DAILY: Object.freeze({ BASE: 500, PER_DAY: 150, CAP: 2000 }),
    DROP: Object.freeze({ HOURS: 3, MIN: 250, MAX: 2500 }),
    REFERRAL: Object.freeze({ REFERRER: 1000, REFEREE: 500, MATCH_PCT: 10, PER_DAY_CAP: 20 }),
    PRIZES: Object.freeze([50000, 25000, 10000]),
    BOOST: Object.freeze({ MIN: 50, COOLDOWN_MS: 2000, SELF_MULT: 1.5 }),
    SEASON_MS: 7 * 24 * 3600e3,
    USERNAME_RE: /^[A-Za-z0-9_]{3,20}$/,
    SLUG_RE: /^[a-z0-9][a-z0-9-]{1,39}$/,
    MAX_TXN: 2000, MAX_FEED: 1000, MAX_PROFILE_HISTORY: 30
  });

  const DB_KEY = 'grinbid_demo_db_v1';
  const SESSION_KEY = 'grinbid_demo_session_v1';
  const LEADER_KEY = 'grinbid_demo_leader_v1';

  const HAS_LOCAL_STORAGE = (function () {
    try {
      const k = '__gb_probe__';
      root.localStorage.setItem(k, '1');
      root.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  // ------------------------------------------------------------------ helpers
  const nowIso = (ts) => new Date(ts == null ? Date.now() : ts).toISOString();
  const clean = (v, max) => String(v == null ? '' : v)
    .replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 120);

  function HttpError(status, message, data) {
    const e = new Error(message);
    e.status = status;
    e.data = data || {};
    return e;
  }

  // Demo-only "hash" — the real app uses scrypt + per-user salt (src/auth.js).
  function demoHash(str) {
    let h1 = 0x811c9dc5, h2 = 0x1000193;
    const s = 'gb-demo-salt::' + String(str);
    for (let i = 0; i < s.length; i++) {
      h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
      h2 = (Math.imul(h2 + s.charCodeAt(i), 2654435761) ^ h2) >>> 0;
    }
    return h1.toString(36) + '-' + h2.toString(36);
  }

  function randomCodeSeed() {
    const c = (typeof root.crypto !== 'undefined' && root.crypto.getRandomValues)
      ? (() => { const a = new Uint32Array(2); root.crypto.getRandomValues(a); return a[0] * 4294967296 + a[1]; })()
      : (Math.random() * 4294967296);
    return c;
  }

  // Same shape as the real generator: GB-XXXXXX-XXXX (hex-ish tail).
  function makeReferralCode(userId) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let seed = 0;
    for (const ch of String(userId)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rng = mulberry32(seed ^ Math.floor(randomCodeSeed() % 2147483647));
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(rng() * alphabet.length)];
    const tail = Math.floor(rng() * 65536).toString(16).toUpperCase().padStart(4, '0');
    return `GB-${code}-${tail}`;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  // ------------------------------------------------------------------ state
  function blankStats() {
    return {
      boosts: 0, dailyClaims: 0, luckyDrops: 0, distinctProfiles: 0, distinctProfileIds: [],
      coinsSpentOnBoosts: 0, bigBoosts: 0, landmarkBoosts: 0, referralsActive: 0,
      claimedTasks: 0, maxStreak: 0
    };
  }

  function makeUser(opts) {
    const now = opts.now || Date.now();
    const user = {
      id: opts.id,
      username: opts.username,
      displayName: opts.displayName || opts.username,
      avatar: opts.avatar || '😀',
      passwordHash: demoHash(opts.password || DATA.DEMO_PASSWORD),
      coins: opts.coins || 0,
      totalCoinsEarned: opts.coins || 0,
      totalCoinsSpent: 0,
      seasonPoints: opts.seasonPoints || 0,
      createdAt: nowIso(now - (opts.createdOffset || 6 * DATA.DAY)),
      streakCount: opts.streak || 0,
      lastDailyClaimDay: null,
      luckyDropLastAt: null,
      lastBoostAt: 0,
      createdProfileSlug: opts.createdProfileSlug || null,
      signupIpHash: 'demo-ip',
      profileUpdatedAt: opts.profileUpdated ? nowIso(now - 5 * DATA.DAY) : null,
      referral: {
        code: opts.referralCode || makeReferralCode(opts.username),
        referredBy: null, status: 'none', codeSharedAt: null,
        lifetimeMatchEarned: opts.lifetimeMatchEarned || 0,
        referrals: []
      },
      stats: blankStats(),
      tasks: {},
      notifications: []
    };
    return user;
  }

  function createDemoState() {
    const now = Date.now();
    const state = {
      meta: { version: 1, demo: true, createdAt: nowIso(now), updatedAt: nowIso(now), resets: 0 },
      season: {
        id: 3, startedAt: nowIso(now - 2 * DATA.DAY), endsAt: nowIso(now + 5 * DATA.DAY),
        settled: false, lastSettlement: nowIso(now - 2 * DATA.DAY), payouts: []
      },
      tasks: DATA.TASKS.map((t) => ({ ...t })),
      users: {}, userByUsername: {}, profiles: {},
      boosts: [], transactions: [], donationIntents: [], adminLog: [],
      nextIds: { user: 100, boost: 1, txn: 1, claim: 1 }
    };

    // ---- profiles --------------------------------------------------------
    for (const p of DATA.PROFILES) {
      state.profiles[p.slug] = {
        id: 'p_' + p.slug, slug: p.slug, name: p.name, category: p.category, emoji: p.emoji,
        tagline: p.tagline, tags: p.tags.slice(), description: p.description,
        seed: Boolean(p.seed), fanCreated: true,
        verified: false, verifiedAt: null, claimedBy: null,
        createdBy: p.createdByUsername ? ('u_0006') : null,
        createdByUsername: p.createdByUsername || null,
        createdAt: nowIso(now - 8 * DATA.DAY),
        boostTotal: 0, boostCount: 0, fanCount: 0, fanIds: [],
        lastBoostAt: null, recentBoosts: [], claimRequests: []
      };
    }

    // ---- users -----------------------------------------------------------
    const boosts = DATA.makeBoosts(now);
    for (const d of DATA.DEMO_USERS) {
      const u = makeUser({ ...d, now });
      u.streakCount = d.streakCount || d.streak || 0;
      if (d.lastDailyClaimOffset != null) {
        u.lastDailyClaimDay = new Date(now + d.lastDailyClaimOffset).toISOString().slice(0, 10);
      }
      if (d.luckyDropOffset != null) u.luckyDropLastAt = nowIso(now + d.luckyDropOffset);
      u.referral.lifetimeMatchEarned = d.lifetimeMatchEarned || 0;
      u.referral.codeSharedAt = d.referralCodeShared ? nowIso(now) : null;
      u.stats.maxStreak = d.maxStreak || d.streak || 0;
      u.stats.dailyClaims = d.dailyClaims || (d.streak || 0);
      u.stats.luckyDrops = d.luckyDrops || 0;
      u.stats.boosts = d.boosts || 0;
      u.stats.coinsSpentOnBoosts = d.coinsSpentOnBoosts || 0;
      u.stats.bigBoosts = d.bigBoosts || 0;
      u.stats.landmarkBoosts = d.landmarkBoosts || 0;
      u.stats.distinctProfiles = d.distinctProfiles || 0;
      u.stats.referralsActive = d.referralsActive || 0;
      // season points = a base earned earlier in the season + seeded boosts
      const fromBoosts = boosts.filter((b) => b.userId === u.id).reduce((s, b) => s + b.value, 0);
      u.seasonPoints = (d.pointsBase || 0) + fromBoosts;
      u.totalCoinsEarned = d.totalCoinsEarned != null ? d.totalCoinsEarned : (d.coins || 0);
      u.totalCoinsSpent = d.totalCoinsSpent || d.coinsSpentOnBoosts || 0;
      state.users[u.id] = u;
      state.userByUsername[u.username] = u;
    }

    // demo_fan: referrals, notifications, task progress & transactions
    const fan = state.users.u_0001;
    for (const r of DATA.DEMO_USERS[0].referrals || []) {
      fan.referral.referrals.push({
        userId: r.username === 'night_owl' ? 'u_0007' : 'u_0006',
        username: r.username, at: nowIso(now + r.offset), status: r.status, earned: r.earned
      });
    }
    for (const n of DATA.DEMO_USERS[0].notifications || []) {
      fan.notifications.push({ id: n.id, text: n.text, at: nowIso(now + n.offset), read: false });
    }
    const claimed = new Set(DATA.DEMO_USERS[0].tasksClaimed || []);
    for (const t of state.tasks) {
      if (claimed.has(t.id)) {
        fan.tasks[t.id] = { done: true, claimed: true, doneAt: nowIso(now - 4 * DATA.DAY), claimedAt: nowIso(now - 4 * DATA.DAY) };
      }
    }
    fan.stats.claimedTasks = claimed.size;
    let txnId = 1;
    for (const t of DATA.DEMO_USERS[0].transactions || []) {
      state.transactions.push({
        id: 'txn_' + txnId++, userId: fan.id, kind: t.kind, amount: t.amount, note: t.note, at: nowIso(now + t.offset)
      });
    }
    state.nextIds.txn = txnId;

    // ---- boosts + profile aggregates -------------------------------------
    state.boosts = boosts;
    for (const b of boosts) {
      const p = state.profiles[b.profileSlug];
      const profName = p.name, profEmoji = p.emoji;
      b.profileName = profName; b.profileEmoji = profEmoji;
      p.boostTotal += b.value;
      p.boostCount += 1;
      if (!p.fanIds.includes(b.userId)) p.fanIds.push(b.userId);
      p.lastBoostAt = b.at;
      p.recentBoosts.unshift({ ...b });
    }
    for (const p of Object.values(state.profiles)) {
      p.fanCount = p.fanIds.length;
      p.recentBoosts = p.recentBoosts.slice(0, E.MAX_PROFILE_HISTORY);
    }
    state.nextIds.boost = boosts.length + 1;

    // ---- claim requests (one pending, one approved) ------------------------
    for (const c of DATA.CLAIM_SEEDS) {
      const p = state.profiles[c.profileSlug];
      if (!p) continue;
      p.claimRequests.push({
        id: 'claim_' + state.nextIds.claim++, userId: c.userId, username: c.username,
        at: nowIso(now + c.offset), status: c.status, evidence: c.evidence,
        decidedAt: c.decidedOffset != null ? nowIso(now + c.decidedOffset) : null
      });
      if (c.status === 'approved') {
        p.verified = true;
        p.verifiedAt = nowIso(now + (c.decidedOffset || 0));
        p.claimedBy = c.userId;
      }
    }

    // ---- donation intents --------------------------------------------------
    for (const d of DATA.DONATION_SEEDS) {
      state.donationIntents.push({
        id: 'don_seed_' + d.username, userId: d.userId, username: d.username,
        method: d.method, amount: d.amount, note: d.note, at: nowIso(now + d.offset), grantsCoins: false
      });
    }

    // Publish the state before evaluating tasks (syncTasks reads state()).
    S = state;
    // Evaluate demo_fan's task checklist against the seeded stats:
    // t01–t05 + t10 + t15 end up done; t01–t04 were already claimed above.
    syncTasks(state.users.u_0001, now);

    return state;
  }

  // ------------------------------------------------------------------ persistence
  let S = null;
  let saveTimer = null;

  function loadState() {
    if (!HAS_LOCAL_STORAGE) return null;
    try {
      const raw = root.localStorage.getItem(DB_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.users || !parsed.profiles) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function persist() {
    if (!HAS_LOCAL_STORAGE) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        S.meta.updatedAt = nowIso();
        root.localStorage.setItem(DB_KEY, JSON.stringify(S));
      } catch (e) { /* quota — demo keeps running in memory */ }
    }, 120);
  }

  function state() {
    if (!S) {
      S = loadState() || createDemoState();
      if (!HAS_LOCAL_STORAGE || !loadState()) persist();
    }
    return S;
  }

  // ------------------------------------------------------------------ session
  function getSession() {
    if (!HAS_LOCAL_STORAGE) return sessionMemory;
    try {
      const raw = root.localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  let sessionMemory = null; // fallback when storage is unavailable

  function setSession(s) {
    sessionMemory = s;
    if (!HAS_LOCAL_STORAGE) return;
    try {
      if (s) root.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else root.localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* ignore */ }
  }

  function currentUser() {
    const s = getSession();
    if (!s || s.kind !== 'user') return null;
    return state().users[s.userId] || null;
  }

  // ------------------------------------------------------------------ economy
  // (faithful port of src/economy.js math used by the demo)
  const dayKey = (ts) => new Date(ts == null ? Date.now() : ts).toISOString().slice(0, 10);

  function isYesterday(lastClaimDay, now) {
    if (!lastClaimDay || typeof lastClaimDay !== 'string') return false;
    return lastClaimDay === dayKey((now == null ? Date.now() : now) - 86400e3);
  }

  const dailyRewardForStreak = (streak) => {
    const s = Math.max(1, Math.floor(streak));
    return Math.min(E.DAILY.BASE + (s - 1) * E.DAILY.PER_DAY, E.DAILY.CAP);
  };

  const luckyDropClaimableAt = (lastAt) =>
    (lastAt ? Date.parse(lastAt) : 0) + E.DROP.HOURS * 3600e3;

  const luckyDropReward = () => randInt(E.DROP.MIN, E.DROP.MAX);

  const boostValue = (amount, selfBoost) =>
    Math.round(amount * (selfBoost ? E.BOOST.SELF_MULT : 1));

  function pushTxn(user, kind, amount, note, at) {
    const txn = { id: 'txn_' + state().nextIds.txn++, userId: user.id, kind, amount, note, at: nowIso(at) };
    state().transactions.push(txn);
    if (state().transactions.length > E.MAX_TXN) state().transactions.splice(0, state().transactions.length - E.MAX_TXN);
    return txn;
  }

  function awardCoins(user, amount, kind, note, opts) {
    const at = (opts && opts.at) || Date.now();
    user.coins += amount;
    user.totalCoinsEarned += amount;
    // 10% lifetime match to the referrer (mirrors the real economy)
    if (kind !== 'referral_match' && kind !== 'referral_bonus' && kind !== 'season_prize') {
      const s = getSession();
      const refId = user.referral && user.referral.referredBy;
      if (refId && state().users[refId]) {
        const ref = state().users[refId];
        const match = Math.floor((amount * E.REFERRAL.MATCH_PCT) / 100);
        if (match > 0) {
          ref.coins += match;
          ref.totalCoinsEarned += match;
          ref.referral.lifetimeMatchEarned += match;
          const entry = ref.referral.referrals.find((r) => r.userId === user.id);
          if (entry) entry.earned += match;
          pushTxn(ref, 'referral_match', match, `10% lifetime match from @${user.username}`, at);
          if (s && s.kind === 'user' && s.userId === ref.id) emit('user', { wallet: { coins: ref.coins } });
        }
      }
    }
    return pushTxn(user, kind, amount, note, at);
  }

  function chargeCoins(user, amount, kind, note) {
    if (user.coins < amount) return null;
    user.coins -= amount;
    user.totalCoinsSpent += amount;
    return pushTxn(user, kind, -amount, note);
  }

  function taskUnlocked(task, user) {
    if (!task.unlock) return true;
    if (task.unlock.task) {
      const req = state().tasks.find((t) => t.id === task.unlock.task);
      if (!req) return true;
      const prog = user.tasks[req.id];
      return Boolean(prog && prog.done);
    }
    return true;
  }

  const completedTasks = (user) =>
    state().tasks.filter((t) => user.tasks[t.id] && user.tasks[t.id].done).length;

  function syncTasks(user, at) {
    const stats = user.stats;
    for (const task of state().tasks) {
      if (!taskUnlocked(task, user)) continue;
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
        case 't10': done = completedTasks(user) >= 5; break;
        case 't11': done = stats.maxStreak >= 3; break;
        case 't12': done = stats.maxStreak >= 5; break;
        case 't13': done = stats.coinsSpentOnBoosts >= 5000; break;
        case 't14': done = stats.bigBoosts >= 3; break;
        case 't15': done = stats.landmarkBoosts >= 1; break;
        case 't16': done = stats.referralsActive >= 3; break;
        default: break;
      }
      if (done) { prog.done = true; prog.doneAt = nowIso(at); }
    }
  }

  function claimTaskReward(user, task) {
    if (!taskUnlocked(task, user)) return { ok: false, reason: 'locked' };
    const prog = user.tasks[task.id] || {};
    if (prog.claimed) return { ok: false, reason: 'already_claimed' };
    if (!prog.done) return { ok: false, reason: 'not_done' };
    prog.claimed = true;
    prog.claimedAt = nowIso();
    user.stats.claimedTasks = completedTasks(user);
    awardCoins(user, task.reward, 'task', 'Task: ' + task.title);
    return { ok: true, reward: task.reward };
  }

  function applyBoost(user, profile, amount, at) {
    const since = at - (user.lastBoostAt || 0);
    if (since < E.BOOST.COOLDOWN_MS) {
      return { ok: false, reason: 'cooldown', waitMs: E.BOOST.COOLDOWN_MS - since, code: 429 };
    }
    if (!Number.isInteger(amount) || amount < E.BOOST.MIN) {
      return { ok: false, reason: 'min_boost', min: E.BOOST.MIN, code: 400 };
    }
    const txn = chargeCoins(user, amount, 'boost', 'Boost @' + profile.name);
    if (!txn) return { ok: false, reason: 'insufficient_coins', balance: user.coins, code: 400 };

    const selfBoost = profile.createdBy === user.id;
    const value = boostValue(amount, selfBoost);
    const atStr = nowIso(at);

    profile.boostTotal += value;
    profile.boostCount += 1;
    profile.lastBoostAt = atStr;
    if (!profile.fanIds.includes(user.id)) {
      profile.fanIds.push(user.id);
      profile.fanCount = profile.fanIds.length;
    }

    const boost = {
      id: 'boost_' + state().nextIds.boost++,
      profileId: profile.id, profileSlug: profile.slug, profileName: profile.name, profileEmoji: profile.emoji,
      userId: user.id, username: user.username, avatar: user.avatar,
      amount, value, selfBoost, at: atStr
    };
    state().boosts.push(boost);
    if (state().boosts.length > E.MAX_FEED) state().boosts.splice(0, state().boosts.length - E.MAX_FEED);
    profile.recentBoosts.unshift(boost);
    if (profile.recentBoosts.length > E.MAX_PROFILE_HISTORY) profile.recentBoosts.length = E.MAX_PROFILE_HISTORY;

    user.lastBoostAt = at;
    user.stats.boosts += 1;
    user.stats.coinsSpentOnBoosts += amount;
    if (amount >= 100) user.stats.bigBoosts += 1;
    if (profile.category === 'estate' || profile.category === 'venue') user.stats.landmarkBoosts += 1;
    user.seasonPoints += value;
    if (!user.stats.distinctProfileIds.includes(profile.id)) {
      user.stats.distinctProfileIds.push(profile.id);
      user.stats.distinctProfiles = user.stats.distinctProfileIds.length;
    }
    syncTasks(user, at);
    return { ok: true, boost, value, selfBoost, balance: user.coins };
  }

  function settleSeason(force) {
    const season = state().season;
    const now = Date.now();
    if (!force && now < Date.parse(season.endsAt) && !season.settled) return { ok: false, reason: 'not_over' };
    const rankings = Object.values(state().users)
      .map((u) => ({ user: u, points: u.seasonPoints || 0 }))
      .filter((r) => r.points > 0)
      .sort((a, b) => b.points - a.points || a.user.createdAt.localeCompare(b.user.createdAt))
      .slice(0, 3);
    const payout = {
      at: nowIso(now), seasonId: season.id,
      earned: rankings.map((r, i) => ({
        userId: r.user.id, username: r.user.username, points: r.points, prize: E.PRIZES[i]
      }))
    };
    rankings.forEach((r, i) => awardCoins(r.user, E.PRIZES[i], 'season_prize', `Season ${season.id} rank ${i + 1}`));
    season.payouts.push(payout);
    if (season.payouts.length > 10) season.payouts.shift();
    season.id += 1;
    season.startedAt = nowIso(now);
    season.endsAt = nowIso(now + E.SEASON_MS);
    season.settled = false;
    season.lastSettlement = payout.at;
    for (const u of Object.values(state().users)) u.seasonPoints = 0;
    return { ok: true, payout };
  }

  // ------------------------------------------------------------------ views
  function publicUser(user) {
    if (!user) return null;
    return {
      id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar,
      coins: user.coins, totalCoinsEarned: user.totalCoinsEarned, totalCoinsSpent: user.totalCoinsSpent,
      seasonPoints: user.seasonPoints, createdAt: user.createdAt, streakCount: user.streakCount,
      dailyClaimedToday: user.lastDailyClaimDay === dayKey(),
      luckyDropClaimable: Date.now() >= luckyDropClaimableAt(user.luckyDropLastAt),
      nextLuckyDropAt: user.luckyDropLastAt ? nowIso(luckyDropClaimableAt(user.luckyDropLastAt)) : null,
      tasksDone: completedTasks(user), tasksTotal: state().tasks.length,
      createdProfileSlug: user.createdProfileSlug || null
    };
  }

  function publicUserView(user, withPrivate) {
    const view = publicUser(user);
    if (!withPrivate || !view) return view;
    view.referralCode = user.referral.code;
    view.referralCodeShared = Boolean(user.referral.codeSharedAt);
    view.referrals = (user.referral.referrals || [])
      .map((r) => ({ username: r.username, at: r.at, status: r.status, earned: r.earned || 0 }))
      .slice(-25);
    view.lifetimeMatchEarned = user.referral.lifetimeMatchEarned || 0;
    view.tasks = state().tasks.map((t) => {
      const prog = user.tasks[t.id] || { done: false, claimed: false };
      return {
        id: t.id, title: t.title, desc: t.desc, emoji: t.emoji, reward: t.reward, order: t.order,
        done: prog.done, claimed: prog.claimed, locked: !taskUnlocked(t, user)
      };
    });
    view.notifications = (user.notifications || []).slice(-20);
    view.transactions = state().transactions.filter((t) => t.userId === user.id).slice(-60);
    view.createdProfileSlug = user.createdProfileSlug || null;
    const streakForClaim = isYesterday(user.lastDailyClaimDay)
      ? user.streakCount + 1
      : (user.lastDailyClaimDay === dayKey() ? user.streakCount : 1);
    view.dailyClaim = {
      claimedToday: user.lastDailyClaimDay === dayKey(),
      streak: user.streakCount,
      streakForClaim,
      reward: dailyRewardForStreak(streakForClaim)
    };
    return view;
  }

  function publicProfile(profile, user) {
    return {
      id: profile.id, slug: profile.slug, name: profile.name, category: profile.category,
      emoji: profile.emoji, tagline: profile.tagline, tags: profile.tags, description: profile.description,
      seed: Boolean(profile.seed), fanCreated: true,
      verified: Boolean(profile.verified),
      claimedByUsername: profile.claimedBy ? ((state().users[profile.claimedBy] || {}).username || null) : null,
      createdByUsername: profile.createdByUsername || (profile.createdBy ? ((state().users[profile.createdBy] || {}).username || null) : null),
      createdAt: profile.createdAt || null,
      isMineProfile: Boolean(user && profile.createdBy === user.id),
      boostTotal: profile.boostTotal, boostCount: profile.boostCount, fanCount: profile.fanCount,
      lastBoostAt: profile.lastBoostAt,
      recentBoosts: (profile.recentBoosts || []).map((b) => ({
        id: b.id, username: b.username, avatar: b.avatar, amount: b.amount, value: b.value,
        selfBoost: b.selfBoost, at: b.at
      }))
    };
  }

  // ------------------------------------------------------------------ event bus
  const listeners = {};
  function on(type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
    return () => off(type, fn);
  }
  function off(type, fn) {
    const arr = listeners[type] || [];
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  function emit(type, data) {
    (listeners[type] || []).slice().forEach((fn) => {
      try { fn(data); } catch (e) { /* listener errors never break the bus */ }
    });
  }

  // Cross-tab sync (stands in for SSE fan-out between browser tabs).
  let bc = null;
  const tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  function initChannel() {
    if (bc || typeof root.BroadcastChannel === 'undefined') return;
    try {
      bc = new root.BroadcastChannel('grinbid-demo');
      bc.onmessage = (ev) => {
        const msg = ev.data || {};
        if (msg.kind === 'event') emit(msg.type, msg.data);       // toast-worthy event
        if (msg.kind === 'sync') { S = loadState() || S; emit('sync', {}); } // state changed elsewhere
      };
    } catch (e) { bc = null; }
  }
  function broadcast(type, data) {
    emit(type, data);
    if (bc) { try { bc.postMessage({ kind: 'event', type, data }); } catch (e) { /* closed */ } }
  }
  function announceSync() {
    persist();
    if (bc) { try { bc.postMessage({ kind: 'sync' }); } catch (e) { /* closed */ } }
  }

  // ------------------------------------------------------------------ handlers
  const LATENCY = () => 60 + Math.random() * 160; // fake network feel

  function requireUser() {
    const u = currentUser();
    if (!u) throw HttpError(401, 'unauthorized');
    return u;
  }

  function requireAdmin() {
    const s = getSession();
    if (!s || s.kind !== 'admin') throw HttpError(401, 'admin_required');
    return true;
  }

  async function hSignup(b) {
    b = b || {};
    const username = clean(b.username, 20);
    const password = String(b.password || '');
    if (!E.USERNAME_RE.test(username)) throw HttpError(400, 'invalid_username');
    if (password.length < 8 || password.length > 128) throw HttpError(400, 'invalid_password');
    if (state().userByUsername[username]) throw HttpError(400, 'username_taken');
    const now = Date.now();
    const user = makeUser({
      id: 'u_' + String(state().nextIds.user++).padStart(4, '0'),
      username,
      displayName: clean(b.displayName, 24) || username,
      avatar: clean(b.avatar, 4) || '😀',
      password, now, createdOffset: 0
    });
    user.createdAt = nowIso(now);
    user.profileUpdatedAt = nowIso(now); // they just picked name + avatar
    user.passwordHash = demoHash(password);
    state().users[user.id] = user;
    state().userByUsername[username] = user;

    // referral (anti-bot checks are simulated: same-IP signups get flagged,
    // except when joining demo_fan so the happy path is easy to demo)
    const code = clean(b.referralCode, 32).toUpperCase();
    if (code) {
      if (!/^GB-[A-Z0-9]{6,14}-[A-F0-9]{4}$/.test(code)) {
        delete state().users[user.id];
        delete state().userByUsername[username];
        throw HttpError(400, 'invalid_referral_code');
      }
      const referrer = Object.values(state().users).find((u) => u.referral.code === code && u.id !== user.id);
      if (!referrer) {
        delete state().users[user.id];
        delete state().userByUsername[username];
        throw HttpError(400, 'unknown_referrer');
      }
      if (referrer.id === user.id) throw HttpError(400, 'self_referral');
      const flagged = referrer.username !== 'demo_fan'; // demo shortcut: demo_fan's invites are always clean
      user.referral.referredBy = referrer.id;
      user.referral.status = flagged ? 'pending_review' : 'active';
      referrer.referral.referrals.push({
        userId: user.id, username: user.username, at: nowIso(now),
        status: user.referral.status, earned: 0
      });
      if (!flagged) {
        awardCoins(user, E.REFERRAL.REFEREE, 'referral_bonus', 'Welcome from your friend!', { at: now });
        awardCoins(referrer, E.REFERRAL.REFERRER, 'referral_bonus', `Referral bonus for @${user.username}`, { at: now });
        referrer.referral.referrals[referrer.referral.referrals.length - 1].earned = E.REFERRAL.REFERRER;
        user.stats.referralsActive = 1;
        syncTasks(referrer, now);
      }
    }

    awardCoins(user, E.SIGNUP_BONUS, 'signup', 'Welcome to Grinbid! 🎉', { at: now });
    syncTasks(user, now);
    setSession({ kind: 'user', userId: user.id });
    announceSync();
    broadcast('signup', { username: user.username, avatar: user.avatar });
    return { user: publicUserView(user, true) };
  }

  async function hLogin(b) {
    const username = clean((b || {}).username, 20);
    const password = String((b || {}).password || '');
    const user = username ? state().userByUsername[username] : null;
    if (!user || user.passwordHash !== demoHash(password)) {
      await new Promise((r) => setTimeout(r, 250));
      throw HttpError(400, 'invalid_credentials');
    }
    setSession({ kind: 'user', userId: user.id });
    announceSync();
    emit('user', { wallet: { coins: user.coins, seasonPoints: user.seasonPoints } });
    return { user: publicUserView(user, true) };
  }

  async function hLogout() {
    setSession(null);
    announceSync();
    return { ok: true };
  }

  async function hMe() {
    const user = currentUser();
    return { user: user ? publicUserView(user, true) : null };
  }

  async function hListProfiles(query) {
    const q = clean(query.q || '', 40).toLowerCase();
    const cat = String(query.category || '');
    let list = Object.values(state().profiles);
    const cats = ['celebrity', 'influencer', 'estate', 'venue', 'brand', 'community'];
    if (cats.includes(cat)) list = list.filter((p) => p.category === cat);
    if (q) list = list.filter((p) => (p.name + ' ' + p.tagline + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q));
    list.sort((a, b) => b.boostTotal - a.boostTotal || a.name.localeCompare(b.name));
    return {
      profiles: list.map((p) => publicProfile(p)),
      categories: cats,
      total: list.length
    };
  }

  async function hGetProfile(slug) {
    const p = state().profiles[slug];
    if (!p) throw HttpError(404, 'not_found');
    return { profile: publicProfile(p, currentUser()) };
  }

  async function hCreateProfile(b) {
    const user = requireUser();
    b = b || {};
    const name = clean(b.name, 24);
    const slug = clean(b.slug, 40).toLowerCase();
    const cats = ['celebrity', 'influencer', 'estate', 'venue', 'brand', 'community'];
    const category = cats.includes(b.category) ? b.category : null;
    const emoji = clean(b.emoji, 4) || '⭐';
    if (!name || !E.SLUG_RE.test(slug) || !category) throw HttpError(400, 'invalid_profile_fields');
    if (user.createdProfileSlug) throw HttpError(400, 'one_profile_per_user');
    if (state().profiles[slug]) throw HttpError(400, 'slug_taken');
    const profile = {
      id: 'p_' + slug, slug, name, category, emoji,
      tagline: clean(b.tagline, 60) || (name + ' — fan-made page'),
      tags: (Array.isArray(b.tags) ? b.tags : []).map((t) => clean(t, 20)).filter(Boolean).slice(0, 6),
      description: clean(b.description, 400) || 'Fan-created profile. Boost to show love!',
      seed: false, fanCreated: true, verified: false, verifiedAt: null, claimedBy: null,
      createdBy: user.id, createdByUsername: user.username, createdAt: nowIso(),
      boostTotal: 0, boostCount: 0, fanCount: 0, fanIds: [], lastBoostAt: null,
      recentBoosts: [], claimRequests: []
    };
    state().profiles[slug] = profile;
    user.createdProfileSlug = slug;
    syncTasks(user);
    announceSync();
    broadcast('profile_new', { slug, name, emoji, category });
    return { profile: publicProfile(profile, user), ok: true };
  }

  async function hBoost(b) {
    const user = requireUser();
    const profile = state().profiles[(b || {}).slug];
    if (!profile) throw HttpError(404, 'not_found');
    const amount = Number((b || {}).amount);
    if (!Number.isFinite(amount) || amount < 1) throw HttpError(400, 'invalid_amount');
    const result = applyBoost(user, profile, Math.floor(amount), Date.now());
    if (!result.ok) throw HttpError(result.code, result.reason, { waitMs: result.waitMs, min: result.min, balance: result.balance });
    announceSync();
    broadcast('boost', {
      profileSlug: profile.slug, profileName: profile.name, profileEmoji: profile.emoji,
      username: user.username, avatar: user.avatar,
      amount: result.boost.amount, value: result.boost.value, selfBoost: result.selfBoost,
      boostTotal: profile.boostTotal, at: result.boost.at
    });
    emit('user', { wallet: { coins: user.coins, seasonPoints: user.seasonPoints } });
    return {
      ok: true, boost: result.boost, value: result.value, selfBoost: result.selfBoost,
      balance: result.balance, profileBoostTotal: profile.boostTotal, profileBoostCount: profile.boostCount
    };
  }

  async function hDailyClaim() {
    const user = requireUser();
    const now = Date.now();
    if (user.lastDailyClaimDay === dayKey(now)) {
      throw HttpError(409, 'already_claimed', { reward: dailyRewardForStreak(user.streakCount) });
    }
    const streak = isYesterday(user.lastDailyClaimDay, now) ? user.streakCount + 1 : 1;
    user.streakCount = streak;
    user.stats.maxStreak = Math.max(user.stats.maxStreak || 0, streak);
    user.lastDailyClaimDay = dayKey(now);
    user.stats.dailyClaims += 1;
    const reward = dailyRewardForStreak(streak);
    awardCoins(user, reward, 'daily_claim', `Daily claim — ${streak} day streak`, { at: now });
    syncTasks(user, now);
    announceSync();
    emit('user', { wallet: { coins: user.coins, seasonPoints: user.seasonPoints }, streak });
    broadcast('claim', { username: user.username, avatar: user.avatar, amount: reward, kind: 'daily' });
    return { reward, streak, nextReward: dailyRewardForStreak(streak + 1), balance: user.coins, user: publicUserView(user, true) };
  }

  async function hLuckyDrop() {
    const user = requireUser();
    const now = Date.now();
    const readyAt = luckyDropClaimableAt(user.luckyDropLastAt);
    if (now < readyAt) throw HttpError(429, 'not_ready', { waitMs: readyAt - now });
    const reward = luckyDropReward();
    user.luckyDropLastAt = nowIso(now);
    user.stats.luckyDrops += 1;
    awardCoins(user, reward, 'lucky_drop', 'Lucky drop! 🍀', { at: now });
    syncTasks(user, now);
    announceSync();
    emit('user', { wallet: { coins: user.coins, seasonPoints: user.seasonPoints } });
    broadcast('claim', { username: user.username, avatar: user.avatar, amount: reward, kind: 'lucky' });
    return { reward, nextInMs: E.DROP.HOURS * 3600e3, balance: user.coins };
  }

  async function hClaimTask(taskId) {
    const user = requireUser();
    const task = state().tasks.find((t) => t.id === taskId);
    if (!task) throw HttpError(404, 'task_not_found');
    const result = claimTaskReward(user, task);
    if (!result.ok) throw HttpError(400, result.reason);
    syncTasks(user); // unlocks can cascade (t10 etc.)
    announceSync();
    emit('user', { wallet: { coins: user.coins, seasonPoints: user.seasonPoints }, task: 'Task: ' + task.title });
    return { ok: true, reward: result.reward, balance: user.coins, task: { id: task.id, claimed: true } };
  }

  async function hShareCode() {
    const user = requireUser();
    if (!user.referral.codeSharedAt) {
      user.referral.codeSharedAt = nowIso();
      syncTasks(user);
      announceSync();
      emit('user', { task: 'Referral code shared' });
    }
    return { code: user.referral.code, shared: true };
  }

  async function hLeaderboard() {
    const top = Object.values(state().users)
      .map((u) => ({ id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar, points: u.seasonPoints, boostCount: u.stats.boosts }))
      .sort((a, b) => b.points - a.points || a.username.localeCompare(b.username))
      .slice(0, 10);
    return { season: { id: state().season.id, endsAt: state().season.endsAt }, prizes: { RANK_1: E.PRIZES[0], RANK_2: E.PRIZES[1], RANK_3: E.PRIZES[2] }, top };
  }

  async function hFeed() {
    return {
      boosts: state().boosts.slice(-40).reverse().map((b) => ({
        id: b.id, username: b.username, avatar: b.avatar, profileSlug: b.profileSlug,
        profileName: b.profileName, profileEmoji: b.profileEmoji,
        amount: b.amount, value: b.value, selfBoost: b.selfBoost, at: b.at
      }))
    };
  }

  async function hDonationMethods() {
    return {
      methods: [
        { id: 'upi', label: 'UPI', handle: 'grinbid@upi', cool: '🎟️' },
        { id: 'paypal', label: 'PayPal', handle: 'grinbid', cool: '🅿️' },
        { id: 'bmac', label: 'Buy Me a Coffee', handle: 'grinbid', cool: '☕' },
        { id: 'razorpay', label: 'Razorpay', handle: 'https://razorpay.me/@grinbid', cool: '💳' }
      ],
      minAmount: 10, maxAmount: 100000, zeroReward: true,
      notice: 'Donations are voluntary contributions to keep Grinbid running. They NEVER grant coins, boosts, ranks or perks of any kind.'
    };
  }

  async function hDonate(b) {
    const user = requireUser();
    b = b || {};
    const allowed = new Set(['upi', 'paypal', 'bmac', 'razorpay']);
    const method = clean(b.method, 12).toLowerCase();
    const amount = Math.floor(Number(b.amount));
    if (!allowed.has(method) || !Number.isFinite(amount) || amount < 1 || amount > 10000000) throw HttpError(400, 'invalid_donation');
    const intent = {
      id: 'don_' + Date.now(), userId: user.id, username: user.username,
      method, amount, note: clean(b.note, 200), at: nowIso(), grantsCoins: false
    };
    state().donationIntents.push(intent);
    announceSync();
    broadcast('donation', { username: user.username, method, amount, grantsCoins: false });
    return {
      ok: true, intent, coinsAwarded: 0,
      message: 'Thanks for keeping Grinbid alive! No coins were awarded — donations are 100% non-reward.'
    };
  }

  async function hRequestClaim(slug, b) {
    const user = requireUser();
    const p = state().profiles[slug];
    if (!p) throw HttpError(404, 'not_found');
    if (!p.seed) throw HttpError(400, 'only_seeded_fan_profiles_can_be_claimed');
    if (p.claimedBy && p.claimedBy !== user.id) throw HttpError(400, 'already_claimed');
    const existing = p.claimRequests.find((r) => r.userId === user.id);
    if (existing) return { ok: true, status: existing.status, note: 'already_submitted' };
    const req = {
      id: 'claim_' + state().nextIds.claim++,
      userId: user.id, username: user.username, at: nowIso(),
      status: 'pending', evidence: clean((b || {}).evidence, 500) || 'No evidence provided.', decidedAt: null
    };
    p.claimRequests.push(req);
    announceSync();
    broadcast('claim_request', { profileSlug: p.slug, username: user.username, status: 'pending' });
    return { ok: true, status: 'pending', claim: req };
  }

  // ---- admin -----------------------------------------------------------
  async function hAdminLogin(b) {
    if (String((b || {}).password || '') !== DATA.ADMIN_PASSWORD) {
      await new Promise((r) => setTimeout(r, 300));
      throw HttpError(400, 'invalid_credentials');
    }
    setSession({ kind: 'admin' });
    announceSync();
    return { ok: true, admin: true };
  }

  function adminOverview() {
    requireAdmin();
    const users = Object.values(state().users);
    const profiles = Object.values(state().profiles);
    return {
      users: users.length,
      activeToday: users.filter((u) => u.lastDailyClaimDay === dayKey()).length,
      profiles: profiles.length,
      boosts: state().boosts.length,
      coinsFloating: users.reduce((s, u) => s + u.coins, 0),
      season: state().season,
      openClaimRequests: profiles.reduce((n, p) => n + (p.claimRequests || []).filter((r) => r.status === 'pending').length, 0),
      funding: state().donationIntents.reduce((s, d) => s + d.amount, 0),
      sseClients: 3
    };
  }

  async function hAdminAnnounce(b) {
    requireAdmin();
    const message = clean((b || {}).message, 280);
    if (!message) throw HttpError(400, 'empty_message');
    state().adminLog.push({ at: nowIso(), action: 'announce', message });
    announceSync();
    broadcast('announce', { message, at: nowIso() });
    return { ok: true };
  }

  async function hAdminNotify(b) {
    requireAdmin();
    const targetId = clean((b || {}).userId, 64);
    const message = clean((b || {}).message, 280);
    const target = targetId ? state().users[targetId] : null;
    if (!target || !message) throw HttpError(404, 'user_not_found');
    target.notifications = target.notifications || [];
    target.notifications.push({ id: 'n_' + Date.now(), text: message, at: nowIso(), read: false });
    state().adminLog.push({ at: nowIso(), action: 'notify', userId: targetId, message });
    announceSync();
    broadcast('notify', { userId: targetId, username: target.username, message });
    return { ok: true };
  }

  async function hAdminSettle() {
    requireAdmin();
    const result = settleSeason(true);
    state().adminLog.push({ at: nowIso(), action: 'season/settle' });
    announceSync();
    broadcast('season', { settled: true, payout: result.payout });
    return result;
  }

  async function hAdminClaimRequests() {
    requireAdmin();
    const out = [];
    for (const p of Object.values(state().profiles)) {
      for (const r of p.claimRequests || []) {
        if (r.status === 'pending') out.push({ profileSlug: p.slug, profileName: p.name, ...r });
      }
    }
    return { requests: out };
  }

  async function hAdminClaimRequest(b) {
    requireAdmin();
    b = b || {};
    const p = state().profiles[clean(b.slug, 40)];
    if (!p) throw HttpError(404, 'not_found');
    const req = (p.claimRequests || []).find((r) => r.id === clean(b.requestId, 64));
    if (!req) throw HttpError(404, 'request_not_found');
    if (b.approve) {
      if (p.claimedBy && p.claimedBy !== req.userId) throw HttpError(400, 'already_claimed');
      p.claimedBy = req.userId;
      p.verified = true;
      p.verifiedAt = nowIso();
      req.status = 'approved';
      req.decidedAt = nowIso();
      const claimant = state().users[req.userId];
      if (claimant) claimant.notifications.push({ id: 'n_' + Date.now(), text: `🎉 You now power ${p.name}!`, at: nowIso(), read: false });
    } else {
      req.status = 'rejected';
      req.decidedAt = nowIso();
    }
    state().adminLog.push({ at: nowIso(), action: 'claim-request', slug: p.slug, approve: Boolean(b.approve) });
    announceSync();
    broadcast('claim_updated', { profileSlug: p.slug, status: req.status, verified: p.verified });
    return { ok: true, profile: publicProfile(p), request: req };
  }

  async function hAdminUsers() {
    requireAdmin();
    return {
      users: Object.values(state().users)
        .map((u) => ({ id: u.id, username: u.username, coins: u.coins, seasonPoints: u.seasonPoints, boosts: u.stats.boosts, createdAt: u.createdAt }))
        .sort((a, b) => b.seasonPoints - a.seasonPoints)
    };
  }

  // ------------------------------------------------------------------ router
  const routes = [
    ['GET', /^\/health$/, () => ({ ok: true, coins: E.SIGNUP_BONUS, free: true, demo: true, time: nowIso() })],
    ['POST', /^\/auth\/signup$/, (m, b) => hSignup(b)],
    ['POST', /^\/auth\/login$/, (m, b) => hLogin(b)],
    ['POST', /^\/auth\/logout$/, () => hLogout()],
    ['GET', /^\/me$/, () => hMe()],
    ['GET', /^\/profiles$/, (m, b, q) => hListProfiles(q)],
    ['POST', /^\/profiles$/, (m, b) => hCreateProfile(b)],
    ['GET', /^\/profiles\/([a-z0-9-]+)$/, (m) => hGetProfile(m[1])],
    ['POST', /^\/profiles\/([a-z0-9-]+)\/claim$/, (m, b) => hRequestClaim(m[1], b)],
    ['GET', /^\/leaderboard$/, () => hLeaderboard()],
    ['GET', /^\/feed$/, () => hFeed()],
    ['POST', /^\/boost$/, (m, b) => hBoost(b)],
    ['POST', /^\/daily-claim$/, () => hDailyClaim()],
    ['POST', /^\/lucky-drop$/, () => hLuckyDrop()],
    ['GET', /^\/tasks$/, () => hMe()],
    ['POST', /^\/tasks\/([a-z0-9]+)\/claim$/, (m) => hClaimTask(m[1])],
    ['POST', /^\/referral\/share$/, () => hShareCode()],
    ['GET', /^\/referrals$/, () => {
      const u = requireUser();
      return {
        code: u.referral.code, codeShared: Boolean(u.referral.codeSharedAt),
        referrals: u.referral.referrals, lifetimeMatchEarned: u.referral.lifetimeMatchEarned,
        matchPercentage: E.REFERRAL.MATCH_PCT
      };
    }],
    ['GET', /^\/donations\/methods$/, () => hDonationMethods()],
    ['POST', /^\/donations$/, (m, b) => hDonate(b)],
    ['POST', /^\/admin\/login$/, (m, b) => hAdminLogin(b)],
    ['GET', /^\/admin\/overview$/, () => adminOverview()],
    ['POST', /^\/admin\/announce$/, (m, b) => hAdminAnnounce(b)],
    ['POST', /^\/admin\/notify$/, (m, b) => hAdminNotify(b)],
    ['POST', /^\/admin\/season\/settle$/, () => hAdminSettle()],
    ['GET', /^\/admin\/claim-requests$/, () => hAdminClaimRequests()],
    ['POST', /^\/admin\/claim-request$/, (m, b) => hAdminClaimRequest(b)],
    ['GET', /^\/admin\/users$/, () => hAdminUsers()],
    ['POST', /^\/admin\/reset$/, () => { requireAdmin(); resetDemo(); return { ok: true, message: 'Demo database reseeded. All users/profiles replaced.' }; }]
  ];

  async function api(path, opts) {
    opts = opts || {};
    await new Promise((r) => setTimeout(r, LATENCY()));
    const cleanPath = String(path || '').replace(/^\/api/, '');
    const [p, qs] = cleanPath.split('?');
    const query = {};
    new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
    const method = (opts.method || 'GET').toUpperCase();
    for (const [m, re, fn] of routes) {
      const match = p.match(re);
      if (match && m === method) {
        return fn(match, opts.body || {}, query);
      }
    }
    throw HttpError(404, 'not_found');
  }

  // ------------------------------------------------------------------ reset
  function resetDemo() {
    S = createDemoState();
    S.meta.resets = 1;
    persist();
    broadcast('admin_reset', { at: nowIso() });
  }

  // ------------------------------------------------------------------ demo bots
  // A leader-elected tab simulates other players: random boosts + lucky drops
  // so the live feed, toasts and leaderboards keep moving.
  let botsStarted = false;

  function isLeader() {
    if (!HAS_LOCAL_STORAGE) return true;
    try {
      const raw = root.localStorage.getItem(LEADER_KEY);
      const lock = raw ? JSON.parse(raw) : null;
      if (lock && lock.id !== tabId && Date.now() - lock.t < 5000) return false;
      root.localStorage.setItem(LEADER_KEY, JSON.stringify({ id: tabId, t: Date.now() }));
      return lock ? lock.id === tabId || Date.now() - lock.t >= 5000 : true;
    } catch (e) { return true; }
  }

  function botTick() {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!isLeader()) return;
    const st = state();
    const bots = Object.values(st.users).filter((u) => u.id !== 'u_0001');
    if (!bots.length) return;
    const bot = bots[Math.floor(Math.random() * bots.length)];

    if (Math.random() < 0.14) {
      // lucky drop
      const reward = luckyDropReward();
      bot.luckyDropLastAt = nowIso();
      bot.stats.luckyDrops += 1;
      awardCoins(bot, reward, 'lucky_drop', 'Lucky drop! 🍀');
      persist();
      broadcast('claim', { username: bot.username, avatar: bot.avatar, amount: reward, kind: 'lucky' });
      return;
    }

    const profiles = Object.values(st.profiles);
    const profile = profiles[Math.floor(Math.random() * profiles.length)];
    const amount = [50, 75, 100, 120, 150, 200, 250, 300, 400][Math.floor(Math.random() * 9)];
    if (bot.coins < amount + 200) { bot.coins += 3000; } // bots never go broke in demo land
    const result = applyBoost(bot, profile, amount, Date.now());
    if (!result.ok) return;
    persist();
    broadcast('boost', {
      profileSlug: profile.slug, profileName: profile.name, profileEmoji: profile.emoji,
      username: bot.username, avatar: bot.avatar,
      amount, value: result.value, selfBoost: result.selfBoost,
      boostTotal: profile.boostTotal, at: nowIso()
    });
  }

  function startBots() {
    if (botsStarted) return;
    botsStarted = true;
    setInterval(botTick, 9000 + Math.floor(Math.random() * 5000));
  }

  // ------------------------------------------------------------------ boot
  state();                 // load or seed immediately
  initChannel();
  if (typeof document !== 'undefined') startBots();

  // Public surface
  return {
    api, on, off, emit,
    resetDemo,
    isAdmin: () => { const s = getSession(); return !!s && s.kind === 'admin'; },
    loggedUserId: () => { const s = getSession(); return s && s.kind === 'user' ? s.userId : null; },
    demoPassword: DATA.DEMO_PASSWORD,
    adminPassword: DATA.ADMIN_PASSWORD,
    _state: () => state() // for the demo smoke test only
  };
});
