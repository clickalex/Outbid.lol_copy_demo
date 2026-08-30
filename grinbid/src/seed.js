'use strict';

/**
 * Seed data for a fresh Grinbid database.
 * Includes the 16-task checklist, seeded fan-created profiles (with the
 * "fan-created, not affiliated" disclaimer flag) and the season clock.
 */

const { CONFIG } = require('./config');

const TASKS = [
  { id: 't01', order: 1, emoji: '👋', title: 'Welcome, booster!', desc: 'Create your account and grab your 2,500 free coins.', reward: 100, unlock: null },
  { id: 't02', order: 2, emoji: '🎨', title: 'Make it yours', desc: 'Set your display name and pick an emoji avatar.', reward: 100, unlock: null },
  { id: 't03', order: 3, emoji: '📅', title: 'First daily claim', desc: 'Claim today\'s free daily coins.', reward: 150, unlock: null },
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

/**
 * Seeded profiles are FAN-MADE. The `seed: true` flag drives the
 * "Fan-created profile — not affiliated" badge and enables the
 * verification/claim modal for the real entity, estate or artist.
 */
const PROFILES = [
  {
    slug: 'neon-arena', name: 'Neon Arena', category: 'venue', emoji: '🏟️', seed: true,
    tagline: 'The city\'s loudest lights-out stadium.',
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
    tagline: 'The internet\'s fluffiest gamer cat.',
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
  }
];

function nowIso(ts) {
  return new Date(ts).toISOString();
}

function createSeedState(now = Date.now()) {
  const meta = {
    version: 1,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
    bootCount: 0,
    legalNoticeAddedAt: nowIso(now)
  };

  const season = {
    id: 1,
    startedAt: nowIso(now),
    endsAt: nowIso(now + CONFIG.ECONOMY.SEASON_LENGTH_MS),
    settled: false,
    lastSettlement: null,
    payouts: []
  };

  const users = {};
  const userByUsername = {};
  const profiles = {};
  const boosts = [];
  const transactions = [];
  const adminLog = [];
  const donationIntents = [];

  for (const p of PROFILES) {
    profiles[p.slug] = {
      id: `p_${p.slug}`,
      slug: p.slug,
      name: p.name,
      category: p.category,
      emoji: p.emoji,
      tagline: p.tagline,
      tags: p.tags,
      description: p.description,
      seed: true,
      fanCreated: true,
      verified: false,
      verifiedAt: null,
      claimedBy: null,
      createdBy: null,
      createdAt: nowIso(now),
      boostTotal: 0,
      boostCount: 0,
      fanCount: 0,
      lastBoostAt: null,
      recentBoosts: [],
      claimRequests: []
    };
  }

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
    nextIds: { user: 1, boost: 1, txn: 1, claim: 1 }
  };
}

module.exports = { createSeedState, TASKS, PROFILES };
