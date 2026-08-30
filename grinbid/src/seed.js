'use strict';

/**
 * Seed data for a fresh Grinbid database.
 *
 * Ships the 12 seeded fan-created profiles (with the "fan-created, not
 * affiliated" flag) plus a rich sample dataset so a brand-new deployment (and
 * the Render free demo) already has users, boosts, claims and donations to
 * explore. The sample users all share the password `demo1234`.
 */

const { CONFIG } = require('./config');
const { hashPassword } = require('./auth');

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

const BASE_PROFILES = [
  {
    slug: 'neon-arena', name: 'Neon Arena', category: 'venue', emoji: '🏟️', seed: true,
    tagline: "The city's loudest lights-out stadium.",
    tags: ['stadium', 'concerts', 'e-sports'],
    description: 'A fan-made page for the Neon Arena — legendary live shows, gigs and esports finals under one glowing roof.'
  },
  {
    slug: 'moonlight-manor', name: 'Moonlight Manor', category: 'estate', emoji: '🏰', seed: true,
    tagline: 'A century-old estate on the hill.',
    tags: ['heritage', 'estate', 'gardens'],
    description: 'Fan-made profile celebrating the Moonlight Manor: velvet lawns, secret gardens and the famous midnight tour.'
  },
  {
    slug: 'luna-starr', name: 'Luna Starr', category: 'celebrity', emoji: '🎤', seed: true,
    tagline: 'Pop prism — singer, sparkle machine.',
    tags: ['singer', 'pop', 'icon'],
    description: 'Fan-made page for Luna Starr, the pop prism whose anthems are certified bangers. Fans boost their fave, not the artist.'
  },
  {
    slug: 'velvet-whiskers', name: 'Velvet Whiskers', category: 'influencer', emoji: '🐈', seed: true,
    tagline: "The internet's fluffiest gamer cat.",
    tags: ['cat', 'streamer', 'gaming'],
    description: 'Fan-made profile for Velvet Whiskers, a cat who accidentally became a streamer and refuses to stop winning.'
  },
  {
    slug: 'the-grand-hive', name: 'The Grand Hive', category: 'community', emoji: '🐝', seed: true,
    tagline: 'Where builders, dreamers & bees hang out.',
    tags: ['makerspace', 'community', 'events'],
    description: 'Fan-made community page for The Grand Hive makerspace — workshops, demos and way too much coffee.'
  },
  {
    slug: 'skyline-towers', name: 'Skyline Towers', category: 'estate', emoji: '🌆', seed: true,
    tagline: 'Twin towers with a skybar on top.',
    tags: ['landmark', 'estate', 'views'],
    description: 'Fan-made page for Skyline Towers, the twin glass landmarks with a 180° skybar and a pink-neon rooftop.'
  },
  {
    slug: 'bubble-pop-records', name: 'Bubble Pop Records', category: 'brand', emoji: '🧃', seed: true,
    tagline: 'Home of the candy-colored label.',
    tags: ['label', 'music', 'brand'],
    description: 'Fan-made page for Bubble Pop Records, the candy-colored indie label behind a dozen summer anthems.'
  },
  {
    slug: 'crown-theatre', name: 'The Crown Theatre', category: 'venue', emoji: '🎭', seed: true,
    tagline: 'Curtain up, confetti down.',
    tags: ['theatre', 'shows', 'history'],
    description: 'Fan-made profile of The Crown Theatre, the gilded stage where every premiere ends in a curtain call and a shower of glitter.'
  },
  {
    slug: 'captain-cosmo', name: 'Captain Cosmo', category: 'celebrity', emoji: '🪐', seed: true,
    tagline: 'Astro-funk ambassador, zero gravity dancer.',
    tags: ['artist', 'funk', 'space'],
    description: 'Fan-made page for Captain Cosmo, the astro-funk ambassador who dances in zero gravity and never loses his helmet.'
  },
  {
    slug: 'pixel-playground', name: 'Pixel Playground', category: 'community', emoji: '🕹️', seed: true,
    tagline: 'A tiny arcade with a big heart.',
    tags: ['arcade', 'retro', 'community'],
    description: 'Fan-made page for Pixel Playground, a retro arcade co-op with rainbow LEDs and a high-score wall that never forgets.'
  },
  {
    slug: 'coral-cove', name: 'Coral Cove', category: 'estate', emoji: '🏖️', seed: true,
    tagline: 'A pastel cove with a lighthouse.',
    tags: ['coast', 'estate', 'landmark'],
    description: 'Fan-made profile for Coral Cove, the pastel seaside estate with a candy-striped lighthouse and legendary sunsets.'
  },
  {
    slug: 'hip-hop-hamster', name: 'Hip-Hop Hamster', category: 'influencer', emoji: '🐹', seed: true,
    tagline: 'Tiny wheels, big bars.',
    tags: ['rapper', 'hamster', 'beats'],
    description: 'Fan-made page for Hip-Hop Hamster, the smallest rapper with the biggest bars — all recorded on a grain-of-rice mic.'
  },
  {
    // Community page created by a sample user (not a seeded fan page).
    slug: 'midnight-mosaic', name: 'Midnight Mosaic', category: 'community', emoji: '🌃', seed: false,
    tagline: 'A rooftop art collective after dark.',
    tags: ['art', 'collective', 'nightlife'],
    description: 'Community page for the Midnight Mosaic collective — glow-paint murals, rooftop projections and midnight sketch clubs.'
  }
];

const DEMO_PASSWORD = 'demo1234';

// ---------------------------------------------------------------------------
// Sample users (all log in with `demo1234`). Times are offsets from boot.
// ---------------------------------------------------------------------------
function dayKeyBefore(now, f) {
  const d = new Date(now + f);
  return d.toISOString().slice(0, 10);
}

function baseSampleUser(now, cfg) {
  const password = hashPassword(DEMO_PASSWORD);
  const at = new Date(now + cfg.createdOffset).toISOString();
  return {
    id: cfg.id,
    username: cfg.username,
    displayName: cfg.displayName,
    avatar: cfg.avatar,
    password,
    coins: cfg.coins,
    totalCoinsEarned: cfg.totalCoinsEarned,
    totalCoinsSpent: cfg.totalCoinsSpent,
    seasonPoints: cfg.pointsBase,
    createdAt: at,
    updatedAt: at,
    streakCount: cfg.streakCount,
    lastDailyClaimDay: cfg.lastDailyClaimOffset != null ? dayKeyBefore(now, cfg.lastDailyClaimOffset) : null,
    luckyDropLastAt: cfg.luckyDropOffset != null ? new Date(now + cfg.luckyDropOffset).toISOString() : null,
    lastBoostAt: null,
    createdProfileSlug: cfg.createdProfileSlug || null,
    signupIpHash: cfg.signupIpHash || '0sample0hash0000',
    profileUpdatedAt: cfg.profileUpdated ? at : null,
    referral: {
      code: cfg.referralCode || `GB-${cfg.id.slice(2).padStart(6, '0')}-A1B2`,
      referredBy: cfg.referredBy || null,
      status: cfg.referralStatus || 'none',
      codeSharedAt: cfg.referralCodeShared ? at : null,
      lifetimeMatchEarned: cfg.lifetimeMatchEarned || 0,
      referrals: cfg.referrals || []
    },
    stats: {
      boosts: cfg.boosts || 0,
      dailyClaims: cfg.dailyClaims || 0,
      luckyDrops: cfg.luckyDrops || 0,
      distinctProfiles: cfg.distinctProfiles || 0,
      distinctProfileIds: cfg.distinctProfileIds || [],
      coinsSpentOnBoosts: cfg.coinsSpentOnBoosts || 0,
      bigBoosts: cfg.bigBoosts || 0,
      landmarkBoosts: cfg.landmarkBoosts || 0,
      referralsActive: cfg.referralsActive || 0,
      claimedTasks: cfg.claimedTasks || 0,
      maxStreak: cfg.maxStreak || cfg.streakCount || 0
    },
    tasks: cfg.tasks || {},
    notifications: (cfg.notifications || []).map((n, i) => ({
      id: n.id || `n_${i + 1}`,
      text: n.text,
      at: new Date(now + n.offset).toISOString(),
      read: Boolean(n.read)
    })),
    lastDailyClaimDay: cfg.lastDailyClaimOffset != null ? dayKeyBefore(now, cfg.lastDailyClaimOffset) : null,
    luckyDropLastAt: cfg.luckyDropOffset != null ? new Date(now + cfg.luckyDropOffset).toISOString() : null
  };
}

function sampleUsers(now) {
  const HOUR = 3600e3;
  const DAY = 24 * HOUR;
  const users = {};
  const list = [
    {
      id: 'u_0001', username: 'demo_fan', displayName: 'Demo Fan', avatar: '😎',
      coins: 8730, totalCoinsEarned: 9150, totalCoinsSpent: 420, pointsBase: 80,
      streakCount: 4, lastDailyClaimOffset: -DAY, luckyDropOffset: -5 * HOUR,
      maxStreak: 4, dailyClaims: 4, luckyDrops: 2, boosts: 3, coinsSpentOnBoosts: 420,
      bigBoosts: 3, landmarkBoosts: 1, distinctProfiles: 2, referralsActive: 1,
      profileUpdated: true, claimedTasks: 4, createdOffset: -5 * DAY,
      referralCode: 'GB-DEMO42-A1B2', lifetimeMatchEarned: 310,
      referralCodeShared: false,
      referrals: [
        { userId: 'u_0007', username: 'night_owl', at: new Date(now - 3 * DAY).toISOString(), status: 'active', earned: 1000 },
        { userId: 'u_0006', username: 'pixelpanda', at: new Date(now - 26 * HOUR).toISOString(), status: 'pending_review', earned: 0 }
      ],
      tasks: {
        t01: { done: true, claimed: true, doneAt: new Date(now - 5 * DAY).toISOString(), claimedAt: new Date(now - 5 * DAY).toISOString() },
        t02: { done: true, claimed: true, doneAt: new Date(now - 5 * DAY + 2 * HOUR).toISOString(), claimedAt: new Date(now - 5 * DAY + 2 * HOUR).toISOString() },
        t03: { done: true, claimed: true, doneAt: new Date(now - 4 * DAY).toISOString(), claimedAt: new Date(now - 4 * DAY + 2 * HOUR).toISOString() },
        t04: { done: true, claimed: true, doneAt: new Date(now - 2 * DAY).toISOString(), claimedAt: new Date(now - 2 * DAY + HOUR).toISOString() },
        t05: { done: true, claimed: false, doneAt: new Date(now - 28 * HOUR).toISOString(), claimedAt: null },
        t06: { done: true, claimed: false, doneAt: new Date(now - 28 * HOUR).toISOString(), claimedAt: null },
        t07: { done: true, claimed: false, doneAt: new Date(now - 28 * HOUR).toISOString(), claimedAt: null }
      },
      notifications: [
        { id: 'n_1', text: '🧪 Welcome to Grinbid! Everything here is backed with 100% free virtual coins.', offset: -4 * DAY, read: false }
      ]
    },
    { id: 'u_0002', username: 'moonwalker_z', displayName: 'Moonwalker Z', avatar: '🦊', coins: 15220, totalCoinsEarned: 15800, totalCoinsSpent: 580, pointsBase: 700, streakCount: 9, lastDailyClaimOffset: -2 * HOUR, maxStreak: 9, dailyClaims: 9, boosts: 6, coinsSpentOnBoosts: 580, bigBoosts: 4, landmarkBoosts: 2, distinctProfiles: 4, createdOffset: -12 * DAY },
    { id: 'u_0003', username: 'glittermax', displayName: 'GlitterMax', avatar: '🦄', coins: 9410, totalCoinsEarned: 9800, totalCoinsSpent: 390, pointsBase: 540, streakCount: 3, lastDailyClaimOffset: -6 * HOUR, maxStreak: 3, dailyClaims: 3, boosts: 5, coinsSpentOnBoosts: 390, bigBoosts: 3, distinctProfiles: 3, createdOffset: -10 * DAY },
    { id: 'u_0004', username: 'turbo_turtle', displayName: 'Turbo Turtle', avatar: '🐢', coins: 6180, totalCoinsEarned: 6450, totalCoinsSpent: 270, pointsBase: 420, streakCount: 1, lastDailyClaimOffset: -30 * HOUR, maxStreak: 1, dailyClaims: 1, boosts: 4, coinsSpentOnBoosts: 270, bigBoosts: 2, distinctProfiles: 2, createdOffset: -9 * DAY },
    { id: 'u_0005', username: 'cosmic_jelly', displayName: 'Cosmic Jelly', avatar: '🐙', coins: 7750, totalCoinsEarned: 8100, totalCoinsSpent: 350, pointsBase: 300, streakCount: 5, lastDailyClaimOffset: -9 * HOUR, maxStreak: 5, dailyClaims: 5, boosts: 3, coinsSpentOnBoosts: 350, bigBoosts: 1, distinctProfiles: 3, createdOffset: -8 * DAY },
    { id: 'u_0006', username: 'pixelpanda', displayName: 'Pixel Panda', avatar: '🐼', coins: 4990, totalCoinsEarned: 5300, totalCoinsSpent: 310, pointsBase: 240, streakCount: 2, lastDailyClaimOffset: -11 * HOUR, maxStreak: 2, dailyClaims: 2, boosts: 4, coinsSpentOnBoosts: 310, bigBoosts: 2, distinctProfiles: 2, createdProfileSlug: 'midnight-mosaic', createdOffset: -7 * DAY },
    { id: 'u_0007', username: 'night_owl', displayName: 'Night Owl', avatar: '🦉', coins: 3320, totalCoinsEarned: 3600, totalCoinsSpent: 280, pointsBase: 120, streakCount: 6, lastDailyClaimOffset: -3 * HOUR, maxStreak: 6, dailyClaims: 6, boosts: 2, coinsSpentOnBoosts: 280, bigBoosts: 1, distinctProfiles: 2, createdOffset: -6 * DAY }
  ];
  for (const cfg of list) {
    users[cfg.id] = baseSampleUser(now, cfg);
  }
  users.u_0001.signupIpHash = 'aaaabbbbccccdddd';
  return users;
}

// ---------------------------------------------------------------------------
// Sample boosts — deterministic, spread over the last two days.
// ---------------------------------------------------------------------------
function sampleBoosts(now, users) {
  const HOUR = 3600e3;
  const DAY = 24 * HOUR;
  const boosts = [];
  const fan = users.u_0001;
  const entries = [
    { profileSlug: 'neon-arena', amount: 120, userId: fan.id, username: fan.username, avatar: fan.avatar, offset: -2 * DAY + 3 * HOUR },
    { profileSlug: 'luna-starr', amount: 150, userId: fan.id, username: fan.username, avatar: fan.avatar, offset: -30 * HOUR },
    { profileSlug: 'neon-arena', amount: 150, userId: fan.id, username: fan.username, avatar: fan.avatar, offset: -28 * HOUR },
    { profileSlug: 'neon-arena', amount: 200, userId: users.u_0002.id, username: users.u_0002.username, avatar: users.u_0002.avatar, offset: -26 * HOUR },
    { profileSlug: 'moonlight-manor', amount: 300, userId: users.u_0002.id, username: users.u_0002.username, avatar: users.u_0002.avatar, offset: -24 * HOUR },
    { profileSlug: 'luna-starr', amount: 250, userId: users.u_0003.id, username: users.u_0003.username, avatar: users.u_0003.avatar, offset: -22 * HOUR },
    { profileSlug: 'velvet-whiskers', amount: 100, userId: users.u_0003.id, username: users.u_0003.username, avatar: users.u_0003.avatar, offset: -21 * HOUR },
    { profileSlug: 'skyline-towers', amount: 150, userId: users.u_0004.id, username: users.u_0004.username, avatar: users.u_0004.avatar, offset: -20 * HOUR },
    { profileSlug: 'the-grand-hive', amount: 75, userId: users.u_0003.id, username: users.u_0003.username, avatar: users.u_0003.avatar, offset: -19 * HOUR },
    { profileSlug: 'midnight-mosaic', amount: 100, userId: users.u_0006.id, username: users.u_0006.username, avatar: users.u_0006.avatar, offset: -18 * HOUR, selfBoost: true },
    { profileSlug: 'bubble-pop-records', amount: 120, userId: users.u_0002.id, username: users.u_0002.username, avatar: users.u_0002.avatar, offset: -17 * HOUR },
    { profileSlug: 'crown-theatre', amount: 200, userId: users.u_0005.id, username: users.u_0005.username, avatar: users.u_0005.avatar, offset: -16 * HOUR },
    { profileSlug: 'pixel-playground', amount: 80, userId: users.u_0003.id, username: users.u_0003.username, avatar: users.u_0003.avatar, offset: -15 * HOUR },
    { profileSlug: 'captain-cosmo', amount: 150, userId: users.u_0002.id, username: users.u_0002.username, avatar: users.u_0002.avatar, offset: -14 * HOUR },
    { profileSlug: 'coral-cove', amount: 250, userId: users.u_0002.id, username: users.u_0002.username, avatar: users.u_0002.avatar, offset: -13 * HOUR },
    { profileSlug: 'hip-hop-hamster', amount: 100, userId: users.u_0004.id, username: users.u_0004.username, avatar: users.u_0004.avatar, offset: -12 * HOUR },
    { profileSlug: 'neon-arena', amount: 300, userId: users.u_0003.id, username: users.u_0003.username, avatar: users.u_0003.avatar, offset: -11 * HOUR },
    { profileSlug: 'midnight-mosaic', amount: 150, userId: users.u_0005.id, username: users.u_0005.username, avatar: users.u_0005.avatar, offset: -10 * HOUR },
    { profileSlug: 'luna-starr', amount: 400, userId: users.u_0002.id, username: users.u_0002.username, avatar: users.u_0002.avatar, offset: -9 * HOUR },
    { profileSlug: 'the-grand-hive', amount: 100, userId: users.u_0005.id, username: users.u_0005.username, avatar: users.u_0005.avatar, offset: -8 * HOUR },
    { profileSlug: 'skyline-towers', amount: 200, userId: users.u_0006.id, username: users.u_0006.username, avatar: users.u_0006.avatar, offset: -7 * HOUR },
    { profileSlug: 'velvet-whiskers', amount: 150, userId: users.u_0007.id, username: users.u_0007.username, avatar: users.u_0007.avatar, offset: -6 * HOUR },
    { profileSlug: 'moonlight-manor', amount: 300, userId: users.u_0006.id, username: users.u_0006.username, avatar: users.u_0006.avatar, offset: -5 * HOUR },
    { profileSlug: 'coral-cove', amount: 200, userId: users.u_0006.id, username: users.u_0006.username, avatar: users.u_0006.avatar, offset: -4 * HOUR },
    { profileSlug: 'bubble-pop-records', amount: 100, userId: users.u_0007.id, username: users.u_0007.username, avatar: users.u_0007.avatar, offset: -3 * HOUR },
    { profileSlug: 'crown-theatre', amount: 350, userId: users.u_0002.id, username: users.u_0002.username, avatar: users.u_0002.avatar, offset: -2 * HOUR },
    { profileSlug: 'pixel-playground', amount: 50, userId: users.u_0007.id, username: users.u_0007.username, avatar: users.u_0007.avatar, offset: -90 * 60e3 }
  ];
  entries.forEach((e, i) => {
    const selfBoost = Boolean(e.selfBoost);
    const value = Math.round(e.amount * (selfBoost ? 1.5 : 1));
    boosts.push({
      id: `boost_${i + 1}`,
      profileSlug: e.profileSlug,
      userId: e.userId,
      username: e.username,
      avatar: e.avatar,
      amount: e.amount,
      value,
      selfBoost,
      at: new Date(now + e.offset).toISOString()
    });
  });
  boosts.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  boosts.forEach((b, i) => { b.id = `boost_${i + 1}`; });
  return boosts;
}

// ---------------------------------------------------------------------------
// Profile assembly (from base descriptions + sample boosts/claims)
// ---------------------------------------------------------------------------
function buildProfiles(now, boosts, users) {
  const HOUR = 3600e3;
  const DAY = 24 * HOUR;
  const profiles = {};
  const approved = {
    slug: 'coral-cove',
    userId: 'u_0002',
    username: 'moonwalker_z',
    at: new Date(now - 6 * DAY).toISOString(),
    decidedAt: new Date(now - 6 * DAY + 26 * HOUR).toISOString(),
    evidence: 'Lighthouse trust committee — registry number CC-1889.'
  };
  const pending = {
    slug: 'neon-arena',
    userId: 'u_0003',
    username: 'glittermax',
    at: new Date(now - 5 * HOUR).toISOString(),
    decidedAt: null,
    evidence: 'I manage the venue — our official site and socials can confirm. Happy to verify!'
  };

  BASE_PROFILES.forEach((p) => {
    const createdBy = p.createdByUsername ? users[Object.values(users).find((u) => u.username === p.createdByUsername)?.id]?.id : null;
    profiles[p.slug] = {
      id: `p_${p.slug}`,
      slug: p.slug,
      name: p.name,
      category: p.category,
      emoji: p.emoji,
      tagline: p.tagline,
      tags: p.tags,
      description: p.description,
      seed: Boolean(p.seed),
      fanCreated: true,
      verified: p.slug === approved.slug,
      verifiedAt: p.slug === approved.slug ? approved.decidedAt : null,
      claimedBy: p.slug === approved.slug ? approved.userId : null,
      createdBy,
      createdByUsername: p.createdByUsername || null,
      createdAt: p.slug === 'midnight-mosaic'
        ? new Date(now - 7 * DAY).toISOString()
        : p.createdAt || new Date(now - 9 * DAY).toISOString(),
      boostTotal: 0,
      boostCount: 0,
      fanCount: 0,
      fanIds: [],
      lastBoostAt: null,
      recentBoosts: [],
      claimRequests: []
    };
  });

  // Apply boosts to profiles.
  for (const b of boosts) {
    const p = profiles[b.profileSlug];
    if (!p) continue;
    p.boostTotal += b.value;
    p.boostCount += 1;
    if (!p.fanIds.includes(b.userId)) p.fanIds.push(b.userId);
    p.fanCount = p.fanIds.length;
    p.lastBoostAt = b.at;
    p.recentBoosts.unshift({
      id: b.id,
      profileId: `p_${b.profileSlug}`,
      profileSlug: b.profileSlug,
      profileName: p.name,
      profileEmoji: p.emoji,
      userId: b.userId,
      username: b.username,
      avatar: b.avatar,
      amount: b.amount,
      value: b.value,
      selfBoost: b.selfBoost,
      at: b.at
    });
    if (p.recentBoosts.length > 30) p.recentBoosts.length = 30;
  }

  // Claim requests.
  profiles[pending.slug].claimRequests.push({
    id: 'claim_1',
    profileSlug: pending.slug,
    userId: pending.userId,
    username: pending.username,
    at: pending.at,
    status: 'pending',
    evidence: pending.evidence,
    decidedAt: null
  });
  profiles[approved.slug].claimRequests.push({
    id: 'claim_2',
    profileSlug: approved.slug,
    userId: approved.userId,
    username: approved.username,
    at: approved.at,
    status: 'approved',
    evidence: approved.evidence,
    decidedAt: approved.decidedAt
  });

  return profiles;
}

function sampleTransactions(now, users) {
  const HOUR = 3600e3;
  const DAY = 24 * HOUR;
  const fan = users.u_0001;
  return [
    { id: 'txn_1', userId: fan.id, kind: 'signup', amount: 2500, note: 'Welcome to Grinbid! 🎉', at: new Date(now - 5 * DAY).toISOString() },
    { id: 'txn_2', userId: fan.id, kind: 'task', amount: 100, note: 'Task: Welcome, booster!', at: new Date(now - 5 * DAY + HOUR).toISOString() },
    { id: 'txn_3', userId: fan.id, kind: 'task', amount: 100, note: 'Task: Make it yours', at: new Date(now - 5 * DAY + 2 * HOUR).toISOString() },
    { id: 'txn_4', userId: fan.id, kind: 'daily_claim', amount: 500, note: 'Daily claim — 1 day streak', at: new Date(now - 4 * DAY).toISOString() },
    { id: 'txn_5', userId: fan.id, kind: 'task', amount: 150, note: 'Task: First daily claim', at: new Date(now - 4 * DAY + 2 * HOUR).toISOString() },
    { id: 'txn_6', userId: fan.id, kind: 'referral_bonus', amount: 1000, note: 'Referral bonus for @night_owl', at: new Date(now - 3 * DAY).toISOString() },
    { id: 'txn_7', userId: fan.id, kind: 'lucky_drop', amount: 1250, note: 'Lucky drop! 🍀', at: new Date(now - 3 * DAY + 5 * HOUR).toISOString() },
    { id: 'txn_8', userId: fan.id, kind: 'daily_claim', amount: 650, note: 'Daily claim — 2 day streak', at: new Date(now - 3 * DAY + 22 * HOUR).toISOString() },
    { id: 'txn_9', userId: fan.id, kind: 'daily_claim', amount: 800, note: 'Daily claim — 3 day streak', at: new Date(now - 2 * DAY).toISOString() },
    { id: 'txn_10', userId: fan.id, kind: 'task', amount: 200, note: 'Task: Lucky drop!', at: new Date(now - 2 * DAY + HOUR).toISOString() },
    { id: 'txn_11', userId: fan.id, kind: 'boost', amount: -120, note: 'Boost @Neon Arena', at: new Date(now - 2 * DAY + 3 * HOUR).toISOString() },
    { id: 'txn_12', userId: fan.id, kind: 'boost', amount: -150, note: 'Boost @Luna Starr', at: new Date(now - 30 * HOUR).toISOString() },
    { id: 'txn_13', userId: fan.id, kind: 'boost', amount: -150, note: 'Boost @Neon Arena', at: new Date(now - 28 * HOUR).toISOString() },
    { id: 'txn_14', userId: fan.id, kind: 'referral_match', amount: 310, note: '10% lifetime match from @night_owl', at: new Date(now - 20 * HOUR).toISOString() },
    { id: 'txn_15', userId: fan.id, kind: 'lucky_drop', amount: 640, note: 'Lucky drop! 🍀', at: new Date(now - 5 * HOUR).toISOString() }
  ];
}

function sampleDonations(now, users) {
  const HOUR = 3600e3;
  return [
    { id: 'don_1', userId: users.u_0003.id, username: users.u_0003.username, method: 'upi', amount: 500, note: 'For the confetti budget!', at: new Date(now - 30 * HOUR).toISOString() },
    { id: 'don_2', userId: users.u_0004.id, username: users.u_0004.username, method: 'bmac', amount: 200, note: '', at: new Date(now - 12 * HOUR).toISOString() }
  ];
}

function createSeedState(now = Date.now()) {
  const wantsSample = String(process.env.SEED_SAMPLE || '').toLowerCase() === 'true';

  const meta = {
    version: 2,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    bootCount: 0,
    legalNoticeAddedAt: new Date(now).toISOString(),
    sampleData: wantsSample,
    sampleDataAddedAt: wantsSample ? new Date(now).toISOString() : null
  };

  const season = {
    id: 1,
    startedAt: new Date(now).toISOString(),
    endsAt: new Date(now + CONFIG.ECONOMY.SEASON_LENGTH_MS).toISOString(),
    settled: false,
    lastSettlement: null,
    payouts: []
  };

  let profiles = {};
  // Profiles are always seeded (the 12 fan pages), plus the community page
  // only when sample data is enabled.
  for (const p of BASE_PROFILES) {
    const wantsOnlySeed = p.slug === 'midnight-mosaic' && !wantsSample;
    if (wantsOnlySeed) continue;
    profiles[p.slug] = {
      id: `p_${p.slug}`,
      slug: p.slug,
      name: p.name,
      category: p.category,
      emoji: p.emoji,
      tagline: p.tagline,
      tags: p.tags,
      description: p.description,
      seed: Boolean(p.seed),
      fanCreated: true,
      verified: false,
      verifiedAt: null,
      claimedBy: null,
      createdBy: null,
      createdByUsername: p.createdByUsername || null,
      createdAt: new Date(now).toISOString(),
      boostTotal: 0,
      boostCount: 0,
      fanCount: 0,
      fanIds: [],
      lastBoostAt: null,
      recentBoosts: [],
      claimRequests: []
    };
  }

  let users = {};
  let userByUsername = {};
  let boosts = [];
  let transactions = [];
  let donationIntents = [];

  if (wantsSample) {
    users = sampleUsers(now);
    for (const u of Object.values(users)) userByUsername[u.username] = u;
    boosts = sampleBoosts(now, users);
    profiles = buildProfiles(now, boosts, users);
    transactions = sampleTransactions(now, users);
    donationIntents = sampleDonations(now, users);
  }

  const adminLog = [];

  return {
    meta,
    season,
    tasks: TASKS,
    users,
    userByUsername,
    profiles,
    boosts,
    transactions,
    adminLog,
    donationIntents,
    nextIds: { user: Object.keys(users).length + 1, boost: boosts.length + 1, txn: transactions.length + 1, claim: 1 }
  };
}

module.exports = { createSeedState, TASKS, PROFILES: BASE_PROFILES };
