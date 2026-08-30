'use strict';

/**
 * api.js — HTTP API handlers for Grinbid.
 * Auth: session cookies (HMAC-signed). Economy: see economy.js.
 * Every mutating endpoint: validates input, rate-limits by IP, honors the
 * 2-second boost cooldown and broadcasts SSE updates.
 */

const { CONFIG } = require('./config');
const eco = require('./economy');
const auth = require('./auth');
const san = require('./sanitize');
const { RateLimiter, specFor } = require('./rateLimit');
const { RouteError } = require('./router');

const limiter = new RateLimiter();

// Shown on the leaderboard/winners pages. Today all prizes are paid in free
// virtual coins. We record every winner permanently; once Grinbid is fully
// operating and legally set up for real-money prizes, those launch and past
// winners are the list who get paid out in cash.
const REAL_MONEY_NOTE =
  'Real-money cash prizes are NOT live yet. Until Grinbid is fully operating ' +
  'and legally set up, every prize is paid in free coins. Every weekly, ' +
  'monthly and season winner is permanently recorded — once real-money ' +
  'prizes launch, all winners (including past ones) will be paid out. Stay tuned!';

function ok(body, extra = {}) {
  return { status: 200, body, ...extra };
}

function created(body, extra = {}) {
  return { status: 201, body, ...extra };
}

function badRequest(message) {
  return { status: 400, body: { error: message } };
}

function clientIp(ctx) {
  // Behind the sandbox proxy the forwarded header is set; still bound by
  // trusting only the socket address in dev.
  return ctx.ip;
}

function checkLimit(ctx, route, authLevel) {
  const key = `${route}:${clientIp(ctx)}`;
  const r = limiter.take(key, specFor(route, authLevel));
  if (!r.allowed) {
    throw new RouteError(429, 'rate_limited', {
      retryAfterMs: r.retryAfterMs,
      remaining: r.remaining,
      limit: r.limit
    });
  }
  return r;
}

function publicUserView(state, user, opts = {}) {
  const view = eco.publicUser(state, user);
  if (opts.withPrivate) {
    view.email = user.email || null;
    view.referralCode = user.referral ? user.referral.code : null;
    view.referralCodeShared = Boolean(user.referral && user.referral.codeSharedAt);
    view.referrals = (user.referral && user.referral.referrals || [])
      .map((r) => ({ username: r.username, at: r.at, status: r.status, earned: r.earned || 0 }))
      .slice(-25);
    view.lifetimeMatchEarned = (user.referral && user.referral.lifetimeMatchEarned) || 0;
    view.tasks = state.tasks.map((t) => {
      const prog = user.tasks[t.id] || { done: false, claimed: false };
      return { id: t.id, title: t.title, desc: t.desc, emoji: t.emoji, reward: t.reward, order: t.order, done: prog.done, claimed: prog.claimed, locked: !eco.taskUnlocked(t, user, state) };
    });
    view.notifications = (user.notifications || []).slice(-20);
    view.transactions = state.transactions.filter((t) => t.userId === user.id).slice(-60);
    view.createdProfileSlug = user.createdProfileSlug || null;
    // Streak for a claim made right now: continues yesterday's streak, else resets to 1.
    const streakForClaim = eco.isYesterday(user.lastDailyClaimDay)
      ? user.streakCount + 1
      : (user.lastDailyClaimDay === eco.dayKey() ? user.streakCount : 1);
    view.dailyClaim = {
      claimedToday: user.lastDailyClaimDay === eco.dayKey(),
      streak: user.streakCount,
      streakForClaim,
      reward: eco.dailyRewardForStreak(streakForClaim)
    };
  }
  return view;
}

function findUserBySession(ctx, state) {
  const cookies = auth.parseCookies(ctx.req.headers.cookie);
  const token = cookies[CONFIG.AUTH.SESSION_COOKIE];
  const parsed = auth.verifyToken(token);
  if (!parsed || parsed.kind !== 'user') return null;
  const user = state.users[parsed.subjectId];
  if (!user) return null;
  ctx.user = user;
  ctx.sessionId = parsed.subjectId;
  return user;
}

async function withUser(ctx, state, fn) {
  const user = findUserBySession(ctx, state);
  if (!user) throw new RouteError(401, 'unauthorized');
  ctx.user = user;
  return fn(user);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function signup(ctx, state, sse) {
  checkLimit(ctx, 'signup', 'sensitive');
  const b = ctx.body || {};
  const username = san.sanitizeUsername(b.username);
  const displayName = san.sanitizeDisplayName(b.displayName) || username;
  const avatar = san.sanitizeAvatar(b.avatar);
  const email = san.sanitizeEmail(b.email);
  const password = String(b.password || '');
  if (!username) return badRequest('invalid_username');
  if (!email) return badRequest('invalid_email');
  if (password.length < 8 || password.length > 128) return badRequest('invalid_password');
  if (state.userByUsername[username]) return badRequest('username_taken');
  if (Object.values(state.users).some((u) => u.email === email)) return badRequest('email_in_use');

  const ipHash = san.hashIp(clientIp(ctx));
  const now = Date.now();
  const user = {
    id: `u_${String(state.nextIds.user).padStart(4, '0')}`,
    username,
    displayName,
    avatar,
    email,
    coins: 0,
    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
    seasonPoints: 0,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    streakCount: 0,
    lastDailyClaimDay: null,
    luckyDropLastAt: null,
    lastBoostAt: 0,
    createdProfileSlug: null,
    signupIpHash: ipHash,
    referral: {
      code: eco.makeReferralCode(username),
      referredBy: null,
      status: 'none',
      codeSharedAt: null,
      lifetimeMatchEarned: 0,
      referrals: []
    },
    stats: {
      boosts: 0,
      dailyClaims: 0,
      luckyDrops: 0,
      distinctProfiles: 0,
      distinctProfileIds: [],
      coinsSpentOnBoosts: 0,
      bigBoosts: 0,
      landmarkBoosts: 0,
      referralsActive: 0,
      claimedTasks: 0,
      maxStreak: 0
    },
    tasks: {},
    notifications: []
  };
  user.password = auth.hashPassword(password);
  state.nextIds.user += 1;
  state.users[user.id] = user;
  state.userByUsername[username] = user;

  // Referral validation (anti-bot).
  const code = san.cleanText(b.referralCode, { max: 32 }).toUpperCase();
  let referrer = null;
  if (code) {
    referrer = Object.values(state.users).find((u) => u.referral && u.referral.code === code && u.id !== user.id);
    const verdict = eco.validateReferral(state, user, referrer, code, ipHash);
    if (!verdict.ok) {
      // Soft-delete the half-created account on hard rejection.
      delete state.users[user.id];
      delete state.userByUsername[username];
      return badRequest(verdict.reason);
    }
    if (verdict.status === 'ok' || verdict.status === 'flagged') {
      user.referral.referredBy = referrer.id;
      user.referral.status = verdict.status === 'flagged' ? 'pending_review' : 'active';
      const entry = { userId: user.id, username: user.username, at: new Date(now).toISOString(), status: user.referral.status, earned: 0 };
      referrer.referral.referrals.push(entry);
      if (verdict.status === 'ok') {
        // Referee bonus.
        eco.awardCoins(state, user, CONFIG.ECONOMY.REFERRALS.REFEREE_BONUS, 'referral_bonus', 'Welcome from your friend!', { at: now });
        // Referrer bonus.
        eco.awardCoins(state, referrer, CONFIG.ECONOMY.REFERRALS.REFERRER_BONUS, 'referral_bonus', `Referral bonus for @${user.username}`, { at: now });
        referrer.referral.referrals[referrer.referral.referrals.length - 1].earned = CONFIG.ECONOMY.REFERRALS.REFERRER_BONUS;
        user.stats.referralsActive = 1;
        eco.syncTasks(user, state, now); // t09/t16 evaluation
        eco.syncTasks(referrer, state, now);
      }
    }
  }

  // Signup bonus + first task.
  eco.awardCoins(state, user, CONFIG.ECONOMY.SIGNUP_BONUS, 'signup', 'Welcome to Grinbid! 🎉', { at: now });
  eco.syncTasks(user, state, now);

  sse.broadcast('signup', { username: user.username, avatar: user.avatar });
  sse.toUser(user.id, 'user', { got: { id: user.id } });

  const setCookie = auth.makeSessionCookie('user', user.id, CONFIG.AUTH.SESSION_TTL_MS);
  return {
    status: 201,
    body: { user: publicUserView(state, user, { withPrivate: true }) },
    headers: { 'Set-Cookie': setCookie }
  };
}

async function login(ctx, state, sse) {
  checkLimit(ctx, 'login', 'sensitive');
  const b = ctx.body || {};
  const username = san.sanitizeUsername(b.username);
  const password = String(b.password || '');
  const user = username ? state.userByUsername[username] : null;
  if (!user || !auth.verifyPassword(password, user.password.salt, user.password.hash)) {
    await new Promise((r) => setTimeout(r, 250)); // constant-ish work
    return badRequest('invalid_credentials');
  }
  sse.toUser(user.id, 'user', { got: { id: user.id } });
  const setCookie = auth.makeSessionCookie('user', user.id, CONFIG.AUTH.SESSION_TTL_MS);
  return ok({ user: publicUserView(state, user, { withPrivate: true }) }, { headers: { 'Set-Cookie': setCookie } });
}

async function logout(ctx) {
  return ok({ ok: true }, { headers: { 'Set-Cookie': auth.clearCookie(CONFIG.AUTH.SESSION_COOKIE) } });
}

async function me(ctx, state) {
  const user = findUserBySession(ctx, state);
  if (!user) return ok({ user: null });
  return ok({ user: publicUserView(state, user, { withPrivate: true }) });
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

async function leaderboard(ctx, state) {
  eco.ensurePeriods(state);
  // Fandom comes FIRST (the celeb/character pages), then the fan boosters.
  // Three ladders each: weekly / monthly / season.
  const ladders = {};
  for (const t of ['week', 'month', 'season']) {
    const p = state.periods[t];
    ladders[t] = {
      id: p.id,
      label: p.label,
      startsAt: p.startedAt,
      endsAt: p.endsAt,
      fanPrizes: CONFIG.ECONOMY.PERIODS[t].fanPrizes,
      fandom: eco.fandomRankings(state, t, CONFIG.ECONOMY.PERIODS[t].fandomTop),
      fans: eco.fanRankings(state, t, 10)
    };
  }
  // Back-compat: legacy clients read `season` + `top` (season fan board).
  return ok({
    season: { id: state.periods.season.id, endsAt: state.periods.season.endsAt },
    prizes: CONFIG.ECONOMY.SEASON_PRIZES,
    top: ladders.season.fans,
    ladders
  });
}

async function winners(ctx, state) {
  eco.ensurePeriods(state);
  const list = (state.winners || []).slice().reverse().slice(0, 60).map((w) => ({
    at: w.at,
    type: w.type,
    label: w.label,
    periodId: w.periodId,
    fans: w.fans,
    fandom: w.fandom
  }));
  return ok({
    realMoneyNote: REAL_MONEY_NOTE,
    realMoneyLive: false,
    winners: list
  });
}

async function feed(ctx, state) {
  const boo = state.boosts
    .filter((b) => {
      const p = state.profiles[b.profileSlug];
      return !p || p.status === 'approved';
    })
    .slice(-40)
    .reverse();
  return ok({ boosts: boo.map((b) => ({
    id: b.id,
    username: b.username,
    avatar: b.avatar,
    profileSlug: b.profileSlug,
    profileName: b.profileName,
    profileEmoji: b.profileEmoji,
    amount: b.amount,
    value: b.value,
    selfBoost: b.selfBoost,
    at: b.at
  })) });
}

async function listProfiles(ctx, state) {
  const q = san.cleanText(ctx.query.q || '', { max: 40 }).toLowerCase();
  const cat = san.sanitizeCategory(ctx.query.category);
  const me = findUserBySession(ctx, state);
  const canSeeHidden = (p) =>
    p.status === 'approved' ||
    (me && (p.createdBy === me.id || eco.isAdminUser(me)));
  let list = Object.values(state.profiles).filter(canSeeHidden);
  if (cat) list = list.filter((p) => p.category === cat);
  if (q) list = list.filter((p) => ((p.realName || p.name) + ' ' + p.name + ' ' + p.tagline + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q));
  // Most-backed first — the same ordering drives the home-page ranking.
  list.sort((a, b) => b.boostTotal - a.boostTotal || b.fanCount - a.fanCount || a.name.localeCompare(b.name));
  return ok({
    profiles: list.map((p) => ({ ...eco.publicProfile(state, p), boostTotal: p.boostTotal, boostCount: p.boostCount, fanCount: p.fanCount })),
    categories: ['celebrity', 'character', 'influencer', 'estate', 'venue', 'brand', 'community'],
    total: list.length
  });
}

async function getProfile(ctx, state) {
  const slug = san.sanitizeSlug(ctx.params.slug);
  const p = slug ? state.profiles[slug] || Object.values(state.profiles).find((x) => x.id === slug) : null;
  if (!p) throw new RouteError(404, 'not_found');
  const user = findUserBySession(ctx, state);
  const allowed = p.status === 'approved' || (user && (p.createdBy === user.id || eco.isAdminUser(user)));
  if (!allowed) throw new RouteError(404, 'not_found');
  const view = eco.publicProfile(state, p);
  view.isMineProfile = Boolean(user && p.createdBy === user.id);
  view.selfBoostMultiplier = eco.boostValue(100, view.isMineProfile) / 100;
  return ok({ profile: view });
}

async function createProfile(ctx, state, sse) {
  return withUser(ctx, state, (user) => {
    checkLimit(ctx, 'profile', 'general');
    const b = ctx.body || {};
    const name = san.sanitizeDisplayName(b.name);
    const slug = san.sanitizeSlug(b.slug);
    const category = san.sanitizeCategory(b.category);
    const emoji = san.sanitizeAvatar(b.emoji, '⭐');
    const image = san.sanitizeImageDataUrl(b.image);
    const realName = san.cleanText(b.realName || b.name, { max: 60 }) || name;
    const tagline = san.cleanText(b.tagline, { max: 80 });
    const description = san.cleanText(b.description, { max: 600, allowNewlines: true });
    const tags = Array.isArray(b.tags)
      ? b.tags.map((t) => san.cleanText(t, { max: 20 })).filter(Boolean).slice(0, 8)
      : [];
    if (!name || !slug || !category) return badRequest('invalid_profile_fields');
    if (user.createdProfileSlug) return { status: 400, body: { error: 'one_profile_per_user' } };
    if (state.profiles[slug]) return badRequest('slug_taken');

    const now = Date.now();
    const profile = {
      id: `p_${slug}`,
      slug,
      // Display name of the fan page (e.g. "Bhaijaan Fans") + the real
      // person/character the page is about (e.g. "Salman Khan").
      name,
      realName,
      category,
      emoji,
      image,
      tagline: tagline || `${realName} — fan-made page`,
      tags,
      description: description || 'Fan-created page. Boost to show love!',
      seed: false,
      fanCreated: true,
      // New pages go live only after an admin approves them. The creator can
      // see their own page meanwhile (filtered in list/get handlers).
      status: 'pending',
      submittedAt: new Date(now).toISOString(),
      reviewedAt: null,
      reviewNote: null,
      verified: false,
      verifiedAt: null,
      claimedBy: null,
      createdBy: user.id,
      createdByUsername: user.username,
      creatorEmail: user.email || null,
      createdAt: new Date(now).toISOString(),
      boostTotal: 0,
      boostCount: 0,
      fanCount: 0,
      fanIds: [],
      lastBoostAt: null,
      recentBoosts: [],
      claimRequests: []
    };
    state.profiles[slug] = profile;
    user.createdProfileSlug = slug;
    eco.syncTasks(user, state, now);
    // Notify admins via SSE — no profile goes public until reviewed.
    sse.broadcast('profile_pending', { slug, name, emoji, category });
    return created({
      profile: eco.publicProfile(state, profile),
      ok: true,
      moderation: 'pending',
      message: 'Your fan page was submitted. An admin reviews it before it goes live — fans will be able to boost it right after approval.'
    });
  });
}

// ---------------------------------------------------------------------------
// Boost
// ---------------------------------------------------------------------------

async function boost(ctx, state, sse) {
  return withUser(ctx, state, (user) => {
    checkLimit(ctx, 'boost', 'boost');
    const b = ctx.body || {};
    const slug = san.sanitizeSlug(b.slug || b.profileSlug);
    const profile = slug ? state.profiles[slug] : null;
    if (!profile) throw new RouteError(404, 'not_found');
    // Pending/rejected pages are not boostable by the public; the creator
    // self-boosting their own submission still works.
    if (profile.status !== 'approved' && profile.createdBy !== user.id) {
      return badRequest('page_not_live');
    }
    const amount = san.sanitizeAmount(b.amount, { min: 1, max: 10_000_000 });
    if (amount === null) return badRequest('invalid_amount');

    const result = eco.applyBoost(state, user, profile, amount, Date.now());
    if (!result.ok) {
      throw new RouteError(result.code, result.reason, { waitMs: result.waitMs, min: result.min, balance: result.balance });
    }

    sse.broadcast('boost', {
      profileSlug: profile.slug,
      profileName: profile.name,
      profileEmoji: profile.emoji,
      username: user.username,
      avatar: user.avatar,
      amount: result.boost.amount,
      value: result.boost.value,
      selfBoost: result.selfBoost,
      boostTotal: profile.boostTotal,
      at: result.boost.at
    });
    sse.toUser(user.id, 'user', { wallet: { coins: user.coins, seasonPoints: user.seasonPoints } });
    return ok({
      ok: true,
      boost: result.boost,
      value: result.value,
      selfBoost: result.selfBoost,
      balance: result.balance,
      profileBoostTotal: profile.boostTotal,
      profileBoostCount: profile.boostCount
    });
  });
}

// ---------------------------------------------------------------------------
// Daily claim / lucky drop
// ---------------------------------------------------------------------------

async function dailyClaim(ctx, state, sse) {
  return withUser(ctx, state, (user) => {
    checkLimit(ctx, 'daily', 'sensitive');
    const now = Date.now();
    const today = eco.dayKey(now);
    if (user.lastDailyClaimDay === today) {
      return { status: 409, body: { error: 'already_claimed', reward: eco.dailyRewardForStreak(user.streakCount) } };
    }
    const streak = (eco.isYesterday(user.lastDailyClaimDay, now) ? user.streakCount + 1 : 1);
    user.streakCount = streak;
    user.stats.maxStreak = Math.max(user.stats.maxStreak || 0, streak);
    user.lastDailyClaimDay = today;
    user.stats.dailyClaims += 1;
    const reward = eco.dailyRewardForStreak(streak);
    eco.awardCoins(state, user, reward, 'daily_claim', `Daily claim — ${streak} day streak`, { at: now });
    eco.syncTasks(user, state, now); // t03, t11, t12
    sse.toUser(user.id, 'user', { wallet: { coins: user.coins, seasonPoints: user.seasonPoints }, streak });
    sse.broadcast('claim', { username: user.username, avatar: user.avatar, amount: reward, kind: 'daily' });
    return ok({
      reward,
      streak,
      nextReward: eco.dailyRewardForStreak(streak + 1),
      balance: user.coins,
      user: publicUserView(state, user)
    });
  });
}

async function luckyDrop(ctx, state, sse) {
  return withUser(ctx, state, (user) => {
    checkLimit(ctx, 'lucky', 'sensitive');
    const now = Date.now();
    const readyAt = eco.luckyDropClaimableAt(user.luckyDropLastAt, now);
    if (now < readyAt) {
      return { status: 429, body: { error: 'not_ready', waitMs: readyAt - now } };
    }
    const reward = eco.luckyDropReward();
    user.luckyDropLastAt = new Date(now).toISOString();
    user.stats.luckyDrops += 1;
    eco.awardCoins(state, user, reward, 'lucky_drop', 'Lucky drop! 🍀', { at: now });
    eco.syncTasks(user, state, now); // t04
    sse.toUser(user.id, 'user', { wallet: { coins: user.coins, seasonPoints: user.seasonPoints } });
    sse.broadcast('claim', { username: user.username, avatar: user.avatar, amount: reward, kind: 'lucky' });
    return ok({
      reward,
      nextInMs: CONFIG.ECONOMY.LUCKY_DROP.INTERVAL_HOURS * 3600_000,
      balance: user.coins
    });
  });
}

async function claimTask(ctx, state, sse) {
  return withUser(ctx, state, (user) => {
    checkLimit(ctx, 'task', 'general');
    const taskId = san.sanitizeId(ctx.params.id, 8);
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) throw new RouteError(404, 'task_not_found');
    const result = eco.claimTaskReward(state, user, task);
    if (!result.ok) return badRequest(result.reason);
    eco.syncTasks(user, state); // some unlocks cascade
    sse.toUser(user.id, 'user', { wallet: { coins: user.coins, seasonPoints: user.seasonPoints }, task: result.txn.note });
    return ok({ ok: true, reward: result.reward, balance: user.coins, task: { id: task.id, claimed: true } });
  });
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

async function shareCode(ctx, state, sse) {
  return withUser(ctx, state, (user) => {
    checkLimit(ctx, 'referral', 'general');
    const now = Date.now();
    if (!user.referral.codeSharedAt) {
      user.referral.codeSharedAt = new Date(now).toISOString();
      eco.syncTasks(user, state, now); // t08
      sse.toUser(user.id, 'user', { task: 'Referral code shared' });
    }
    return ok({ code: user.referral.code, shared: true });
  });
}

async function referrals(ctx, state) {
  return withUser(ctx, state, (user) => {
    const list = (user.referral.referrals || []).map((r) => ({
      username: r.username,
      at: r.at,
      status: r.status,
      earned: r.earned || 0
    }));
    return ok({
      code: user.referral.code,
      codeShared: Boolean(user.referral.codeSharedAt),
      referrals: list,
      lifetimeMatchEarned: user.referral.lifetimeMatchEarned || 0,
      matchPercentage: CONFIG.ECONOMY.REFERRALS.LIFETIME_MATCH_PERCENTAGE
    });
  });
}

// ---------------------------------------------------------------------------
// Legal / claim modal
// ---------------------------------------------------------------------------

async function requestClaim(ctx, state, sse) {
  return withUser(ctx, state, (user) => {
    checkLimit(ctx, 'claim_request', 'sensitive');
    const slug = san.sanitizeSlug(ctx.params.slug);
    const p = slug ? state.profiles[slug] : null;
    if (!p) throw new RouteError(404, 'not_found');
    // Every page is fan-created; the real person (or their team) can submit
    // evidence to claim/verify any live tribute page.
    if (p.claimedBy && p.claimedBy !== user.id) return badRequest('already_claimed');
    const existing = p.claimRequests.find((r) => r.userId === user.id);
    if (existing) return ok({ ok: true, status: existing.status, note: 'already_submitted' });
    const evidence = san.cleanText(ctx.body.evidence, { max: 500, allowNewlines: true });
    const req = {
      id: `claim_${state.nextIds.claim}`,
      userId: user.id,
      username: user.username,
      at: new Date().toISOString(),
      status: 'pending',
      evidence: evidence || 'No evidence provided.',
      decidedAt: null
    };
    state.nextIds.claim += 1;
    p.claimRequests.push(req);
    sse.broadcast('claim_request', { profileSlug: p.slug, username: user.username, status: 'pending' });
    return ok({ ok: true, status: 'pending', claim: req });
  });
}

// ---------------------------------------------------------------------------
// Donations (non-reward, per legal policy)
// ---------------------------------------------------------------------------

async function donationMethods() {
  const d = CONFIG.DONATIONS;
  return ok({
    methods: [
      { id: 'upi', label: 'UPI', handle: d.UPI_ID, cool: '🎟️' },
      { id: 'paypal', label: 'PayPal', handle: d.PAYPAL_ME, cool: '🅿️' },
      { id: 'bmac', label: 'Buy Me a Coffee', handle: d.BUY_ME_A_COFFEE, cool: '☕' },
      { id: 'razorpay', label: 'Razorpay', handle: d.RAZORPAY_LINK, cool: '💳' }
    ],
    minAmount: d.MIN_AMOUNT_INR,
    maxAmount: d.MAX_AMOUNT_INR,
    zeroReward: true,
    notice: 'Donations are voluntary contributions to keep Grinbid running. They NEVER grant coins, boosts, ranks or perks of any kind.'
  });
}

async function donate(ctx, state, sse) {
  return withUser(ctx, state, (user) => {
    checkLimit(ctx, 'donate', 'sensitive');
    const b = ctx.body || {};
    const method = san.cleanText(b.method, { max: 12 }).toLowerCase();
    const amount = san.sanitizeAmount(b.amount, { min: 1, max: 10_000_000 });
    const allowed = new Set(['upi', 'paypal', 'bmac', 'razorpay']);
    if (!allowed.has(method) || amount === null) return badRequest('invalid_donation');
    const note = san.cleanText(b.note, { max: 200 });
    const intent = {
      id: `don_${state.nextIds.claim}_${Date.now()}`,
      userId: user.id,
      username: user.username,
      method,
      amount,
      note,
      at: new Date().toISOString(),
      grantsCoins: false
    };
    state.donationIntents.push(intent);
    sse.broadcast('donation', { username: user.username, method, amount, grantsCoins: false });
    return ok({
      ok: true,
      intent,
      coinsAwarded: 0,
      message: 'Thanks for keeping Grinbid alive! No coins were awarded — donations are 100% non-reward.'
    });
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

function requireAdmin(ctx, state) {
  // Two ways to hold admin powers:
  //  1. a logged-in user whose username is in CONFIG.AUTH.ADMIN_USERNAMES
  //     (the founder account — no separate password), or
  //  2. the separate admin-password session (gb_admin cookie).
  const me = findUserBySession(ctx, state);
  if (me && eco.isAdminUser(me)) return { user: me };
  const cookies = auth.parseCookies(ctx.req.headers.cookie);
  const token = cookies[CONFIG.AUTH.ADMIN_COOKIE];
  const parsed = auth.verifyToken(token);
  if (!parsed || parsed.kind !== 'admin') throw new RouteError(401, 'admin_required');
  return { user: null };
}

async function adminLogin(ctx) {
  checkLimit(ctx, 'admin_login', 'sensitive');
  const password = String((ctx.body || {}).password || '');
  if (password !== CONFIG.AUTH.ADMIN_PASSWORD) {
    await new Promise((r) => setTimeout(r, 300));
    return badRequest('invalid_credentials');
  }
  const cookie = auth.makeSessionCookie('admin', 'root', CONFIG.AUTH.ADMIN_SESSION_TTL_MS);
  return ok({ ok: true, admin: true }, { headers: { 'Set-Cookie': cookie } });
}

async function adminOverview(ctx, state, sse) {
  requireAdmin(ctx, state);
  const users = Object.values(state.users);
  const profiles = Object.values(state.profiles);
  return ok({
    users: users.length,
    activeToday: users.filter((u) => u.lastDailyClaimDay === eco.dayKey()).length,
    profiles: profiles.length,
    boosts: state.boosts.length,
    coinsFloating: users.reduce((s, u) => s + u.coins, 0),
    season: state.periods.season,
    periods: state.periods,
    winnersCount: (state.winners || []).length,
    openClaimRequests: profiles.reduce((n, p) => n + (p.claimRequests || []).filter((r) => r.status === 'pending').length, 0),
    pendingProfiles: profiles.filter((p) => p.status === 'pending').length,
    funding: state.donationIntents.reduce((s, d) => s + d.amount, 0),
    sseClients: sse.clientCount
  });
}

async function adminAnnounce(ctx, state, sse) {
  requireAdmin(ctx, state);
  const message = san.cleanText((ctx.body || {}).message, { max: 280 });
  if (!message) return badRequest('empty_message');
  sse.broadcast('announce', { message, at: new Date().toISOString() });
  return ok({ ok: true });
}

async function adminNotify(ctx, state, sse) {
  requireAdmin(ctx, state);
  const targetId = san.sanitizeId((ctx.body || {}).userId, 64) || null;
  const message = san.cleanText((ctx.body || {}).message, { max: 280 });
  if (!targetId || !message) return badRequest('bad_notify');
  const target = state.users[targetId];
  if (!target) throw new RouteError(404, 'user_not_found');
  target.notifications = target.notifications || [];
  target.notifications.push({ id: `n_${Date.now()}`, text: message, at: new Date().toISOString(), read: false });
  sse.toUser(targetId, 'announce', { message, at: new Date().toISOString() });
  return ok({ ok: true });
}

async function adminSettleSeason(ctx, state, sse) {
  requireAdmin(ctx, state);
  const wanted = ['week', 'month', 'season'].includes((ctx.body || {}).period)
    ? ctx.body.period
    : ((ctx.body || {}).period || 'season');
  const result = eco.settlePeriod(state, wanted, true);
  if (result.ok) {
    sse.broadcast('season', { settled: true, payout: result.payout });
  }
  return ok(result);
}

async function adminClaimRequest(ctx, state, sse) {
  requireAdmin(ctx, state);
  const b = ctx.body || {};
  const slug = san.sanitizeSlug(b.slug);
  const p = slug ? state.profiles[slug] : null;
  if (!p) throw new RouteError(404, 'not_found');
  const reqId = san.sanitizeId(b.requestId, 64);
  const approve = san.sanitizeBoolean(b.approve);
  if (approve === null || !reqId) return badRequest('bad_decision');
  const req = (p.claimRequests || []).find((r) => r.id === reqId);
  if (!req) throw new RouteError(404, 'request_not_found');
  if (approve) {
    if (p.claimedBy && p.claimedBy !== req.userId) return badRequest('already_claimed');
    p.claimedBy = req.userId;
    p.verified = true;
    p.verifiedAt = new Date().toISOString();
    req.status = 'approved';
    req.decidedAt = new Date().toISOString();
    const claimant = state.users[req.userId];
    if (claimant) {
      claimant.notifications.push({ id: `n_${Date.now()}`, text: `🎉 You now power ${p.name}!`, at: new Date().toISOString(), read: false });
    }
    sse.toUser(req.userId, 'announce', { message: `🎉 Your claim of ${p.name} was approved!`, at: new Date().toISOString() });
  } else {
    req.status = 'rejected';
    req.decidedAt = new Date().toISOString();
    sse.toUser(req.userId, 'announce', { message: `Your claim request for ${p.name} was reviewed and not approved.`, at: new Date().toISOString() });
  }
  sse.broadcast('claim_updated', { profileSlug: p.slug, status: req.status, verified: p.verified });
  return ok({ ok: true, profile: eco.publicProfile(state, p), request: req });
}

async function adminClaimRequests(ctx, state) {
  requireAdmin(ctx, state);
  const out = [];
  for (const p of Object.values(state.profiles)) {
    for (const r of p.claimRequests || []) {
      if (r.status === 'pending') out.push({ profileSlug: p.slug, profileName: p.name, ...r });
    }
  }
  return ok({ requests: out });
}

async function adminUsers(ctx, state) {
  requireAdmin(ctx, state);
  const users = Object.values(state.users)
    .map((u) => ({
      id: u.id, username: u.username, email: u.email || null,
      isAdmin: eco.isAdminUser(u),
      coins: u.coins, seasonPoints: u.seasonPoints, boosts: u.stats.boosts,
      createdProfileSlug: u.createdProfileSlug || null, createdAt: u.createdAt
    }))
    .sort((a, b) => b.seasonPoints - a.seasonPoints);
  return ok({ users });
}

async function adminReset(ctx, state, sse) {
  requireAdmin(ctx, state);
  const fresh = require('./seed').createSeedState();
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, fresh);
  sse.broadcast('admin_reset', { at: new Date().toISOString() });
  return ok({ ok: true, message: 'Database reseeded. All users/profiles replaced.' });
}

// ---------------------------------------------------------------------------
// Fan-page moderation queue (new pages need admin approval to go live)
// ---------------------------------------------------------------------------

async function adminProfileQueue(ctx, state) {
  requireAdmin(ctx, state);
  const pending = Object.values(state.profiles)
    .filter((p) => p.status === 'pending' || p.status === 'rejected')
    .sort((a, b) => (b.submittedAt || b.createdAt || '').localeCompare(a.submittedAt || a.createdAt || ''))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      realName: p.realName || p.name,
      category: p.category,
      emoji: p.emoji,
      image: p.image || null,
      tagline: p.tagline,
      description: p.description,
      tags: p.tags,
      status: p.status,
      createdByUsername: p.createdByUsername,
      creatorEmail: p.creatorEmail, // admin-only: used to mail the page maker
      submittedAt: p.submittedAt || p.createdAt,
      reviewedAt: p.reviewedAt || null,
      reviewNote: p.reviewNote || null
    }));
  return ok({ pending: pending.filter((p) => p.status === 'pending'), rejected: pending.filter((p) => p.status === 'rejected') });
}

async function adminProfileDecision(ctx, state, sse) {
  requireAdmin(ctx, state);
  const b = ctx.body || {};
  const slug = san.sanitizeSlug(b.slug);
  const p = slug ? state.profiles[slug] : null;
  if (!p || p.seed) throw new RouteError(404, 'not_found');
  const approve = san.sanitizeBoolean(b.approve);
  if (approve === null) return badRequest('bad_decision');
  const note = san.cleanText(b.note, { max: 280 });
  p.reviewedAt = new Date().toISOString();
  p.reviewNote = note || null;
  const creator = p.createdBy ? state.users[p.createdBy] : null;
  if (approve) {
    p.status = 'approved';
    sse.broadcast('profile_new', { slug, name: p.name, emoji: p.emoji, category: p.category });
    if (creator) {
      creator.notifications = creator.notifications || [];
      creator.notifications.push({
        id: `n_${Date.now()}`,
        text: `🎉 Your fan page “${p.name}” was approved! Fans can boost it now — email ${creator.email || ''} for details.`,
        at: new Date().toISOString(), read: false
      });
    }
    sse.toUser(p.createdBy, 'announce', {
      message: `🎉 Good news — your fan page “${p.name}” is live and on the leaderboard! Check your email (${p.creatorEmail || ''}) for a note from us.`,
      at: new Date().toISOString()
    });
  } else {
    p.status = 'rejected';
    if (creator) {
      creator.notifications = creator.notifications || [];
      creator.notifications.push({
        id: `n_${Date.now()}_r`,
        text: `Your fan page “${p.name}” needs changes before it can go live${note ? ': ' + note : '.'}`,
        at: new Date().toISOString(), read: false
      });
    }
    sse.toUser(p.createdBy, 'announce', {
      message: `We reviewed “${p.name}” and it needs a change before going live${note ? ': ' + note : '.'} — email us at ${p.creatorEmail ? '' : 'the address you signed up with'} for questions.`,
      at: new Date().toISOString()
    });
  }
  sse.broadcast('profile_reviewed', { slug, status: p.status, name: p.name });
  return ok({ ok: true, status: p.status, profile: eco.publicProfile(state, p) });
}

// ---------------------------------------------------------------------------
// SSE stream
// ---------------------------------------------------------------------------

function stream(ctx, sse) {
  const user = findUserBySession(ctx, sse.state);
  const sub = sse.subscribe(ctx.res, user ? user.id : null);
  ctx.req.on('close', () => sse.remove(sub.id));
  return null; // response already written by the hub
}

// ---------------------------------------------------------------------------
// Router wiring
// ---------------------------------------------------------------------------

function buildRouter(state, sse) {
  const { Router } = require('./router');
  const r = new Router();

  // Public + static
  r.get('/api/health', (ctx) => ok({ ok: true, coins: CONFIG.ECONOMY.SIGNUP_BONUS, free: true, time: new Date().toISOString() }));

  // Auth
  r.post('/api/auth/signup', (ctx) => signup(ctx, state, sse));
  r.post('/api/auth/login', (ctx) => login(ctx, state, sse));
  r.post('/api/auth/logout', (ctx) => logout(ctx));
  r.get('/api/me', (ctx) => me(ctx, state));

  // Profiles
  r.get('/api/profiles', (ctx) => listProfiles(ctx, state));
  r.get('/api/profiles/:slug', (ctx) => getProfile(ctx, state));
  r.post('/api/profiles', (ctx) => createProfile(ctx, state, sse));

  // Social
  r.get('/api/leaderboard', (ctx) => leaderboard(ctx, state));
  r.get('/api/winners', (ctx) => winners(ctx, state));
  r.get('/api/feed', (ctx) => feed(ctx, state));

  // Economy
  r.post('/api/boost', (ctx) => boost(ctx, state, sse));
  r.post('/api/daily-claim', (ctx) => dailyClaim(ctx, state, sse));
  r.post('/api/lucky-drop', (ctx) => luckyDrop(ctx, state, sse));
  r.get('/api/tasks', (ctx) => me(ctx, state)); // tasks ride along in /api/me; this is a convenience alias
  r.post('/api/tasks/:id/claim', (ctx) => claimTask(ctx, state, sse));

  // Referrals
  r.post('/api/referral/share', (ctx) => shareCode(ctx, state, sse));
  r.get('/api/referrals', (ctx) => referrals(ctx, state));

  // Legal modal + donations
  r.post('/api/profiles/:slug/claim', (ctx) => requestClaim(ctx, state, sse));
  r.get('/api/donations/methods', () => donationMethods());
  r.post('/api/donations', (ctx) => donate(ctx, state, sse));

  // Admin
  r.post('/api/admin/login', (ctx) => adminLogin(ctx));
  r.get('/api/admin/overview', (ctx) => adminOverview(ctx, state, sse));
  r.post('/api/admin/announce', (ctx) => adminAnnounce(ctx, state, sse));
  r.post('/api/admin/notify', (ctx) => adminNotify(ctx, state, sse));
  r.post('/api/admin/season/settle', (ctx) => adminSettleSeason(ctx, state, sse));
  r.get('/api/admin/claim-requests', (ctx) => adminClaimRequests(ctx, state));
  r.post('/api/admin/claim-request', (ctx) => adminClaimRequest(ctx, state, sse));
  r.get('/api/admin/profile-queue', (ctx) => adminProfileQueue(ctx, state));
  r.post('/api/admin/profile-decision', (ctx) => adminProfileDecision(ctx, state, sse));
  r.get('/api/admin/users', (ctx) => adminUsers(ctx, state));
  r.post('/api/admin/reset', (ctx) => adminReset(ctx, state, sse));

  // Realtime
  sse.state = state;
  r.get('/api/stream', (ctx) => stream(ctx, sse));

  return r;
}

module.exports = { buildRouter, limiter, publicUserView };
