'use strict';
/* ============================================================
   Grinbid DEMO — static demo data (no server, no build step).

   Mirrors the real seed content in src/seed.js plus a cast of demo
   bot users, a boost history and pre-filed claim requests so every
   screen of the app has something juicy to show.

   Exposed as window.GB_DEMO_DATA in the browser and via
   module.exports under Node (for the demo smoke test).
   ============================================================ */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.GB_DEMO_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const HOUR = 3600e3;
  const DAY = 24 * HOUR;
  const DEMO_PASSWORD = 'demo1234';      // every demo account shares this
  const ADMIN_PASSWORD = 'grinbid-admin-dev'; // same as the real dev default

  // ---------------------------------------------------------------- tasks
  // (identical checklist to src/seed.js)
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

  // ---------------------------------------------------------------- profiles
  // 12 seeded fan-made pages (same content as src/seed.js) + 1 demo
  // community page created by a demo bot (seed:false → "community").
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
    },
    {
      // Demo-only: community page created by the bot "pixelpanda".
      slug: 'midnight-mosaic', name: 'Midnight Mosaic', category: 'community', emoji: '🌃', seed: false,
      tagline: 'A rooftop art collective after dark.',
      tags: ['art', 'collective', 'nightlife'],
      description: 'Community page for the Midnight Mosaic collective — glow-paint murals, rooftop projections and midnight sketch clubs.',
      createdByUsername: 'pixelpanda',
      createdAt: '2026-07-19T10:00:00.000Z'
    }
  ];

  // ---------------------------------------------------------------- users
  // The star of the demo: log in as demo_fan / demo1234.
  // (times are expressed as offsets from "now" when the seed is built)
  const DEMO_USERS = [
    {
      id: 'u_0001', username: 'demo_fan', displayName: 'Demo Fan', avatar: '😎', password: DEMO_PASSWORD,
      coins: 8730, totalCoinsEarned: 9150, totalCoinsSpent: 420,
      pointsBase: 80, // seasonPoints = pointsBase + value earned from seeded boosts
      streakCount: 4, lastDailyClaimOffset: -DAY,      // claimed yesterday → today continues the streak (claim → day 5!)
      luckyDropOffset: -5 * HOUR,                       // last drop 5h ago → next drop READY now
      maxStreak: 4, dailyClaims: 4, luckyDrops: 2,
      boosts: 3, coinsSpentOnBoosts: 420, bigBoosts: 3, landmarkBoosts: 1, distinctProfiles: 2,
      referralsActive: 1,
      profileUpdated: true,
      tasksClaimed: ['t01', 't02', 't03', 't04'],
      referralCode: 'GB-DEMO42-A1B2',
      referralCodeShared: false,
      lifetimeMatchEarned: 310,
      referrals: [
        { username: 'night_owl', offset: -3 * DAY, status: 'active', earned: 1000 },
        { username: 'pixelpanda', offset: -26 * HOUR, status: 'pending_review', earned: 0 }
      ],
      notifications: [
        { id: 'n_1', text: '🧪 Welcome to the Grinbid demo! Everything here runs on demo data inside your browser.', offset: -4 * DAY, read: false }
      ],
      transactions: [
        { kind: 'signup', amount: 2500, note: 'Welcome to Grinbid! 🎉', offset: -5 * DAY },
        { kind: 'task', amount: 100, note: 'Task: Welcome, booster!', offset: -5 * DAY + HOUR },
        { kind: 'task', amount: 100, note: 'Task: Make it yours', offset: -5 * DAY + 2 * HOUR },
        { kind: 'daily_claim', amount: 500, note: 'Daily claim — 1 day streak', offset: -4 * DAY },
        { kind: 'task', amount: 150, note: 'Task: First daily claim', offset: -4 * DAY + 2 * HOUR },
        { kind: 'referral_bonus', amount: 1000, note: 'Referral bonus for @night_owl', offset: -3 * DAY },
        { kind: 'lucky_drop', amount: 1250, note: 'Lucky drop! 🍀', offset: -3 * DAY + 5 * HOUR },
        { kind: 'daily_claim', amount: 650, note: 'Daily claim — 2 day streak', offset: -3 * DAY + 22 * HOUR },
        { kind: 'daily_claim', amount: 800, note: 'Daily claim — 3 day streak', offset: -2 * DAY },
        { kind: 'task', amount: 200, note: 'Task: Lucky drop!', offset: -2 * DAY + HOUR },
        { kind: 'boost', amount: -120, note: 'Boost @Neon Arena', offset: -2 * DAY + 3 * HOUR },
        { kind: 'boost', amount: -150, note: 'Boost @Luna Starr', offset: -30 * HOUR },
        { kind: 'boost', amount: -150, note: 'Boost @Neon Arena', offset: -28 * HOUR },
        { kind: 'referral_match', amount: 310, note: '10% lifetime match from @night_owl', offset: -20 * HOUR },
        { kind: 'lucky_drop', amount: 640, note: 'Lucky drop! 🍀', offset: -5 * HOUR }
      ],
      createdProfileSlug: null
    },
    // ---- demo bots (password works for all of them too)
    {
      id: 'u_0002', username: 'moonwalker_z', displayName: 'Moonwalker Z', avatar: '🦊', password: DEMO_PASSWORD,
      coins: 15220, pointsBase: 700, streak: 9, lastDailyClaimOffset: -2 * HOUR
    },
    {
      id: 'u_0003', username: 'glittermax', displayName: 'GlitterMax', avatar: '🦄', password: DEMO_PASSWORD,
      coins: 9410, pointsBase: 540, streak: 3, lastDailyClaimOffset: -6 * HOUR
    },
    {
      id: 'u_0004', username: 'turbo_turtle', displayName: 'Turbo Turtle', avatar: '🐢', password: DEMO_PASSWORD,
      coins: 6180, pointsBase: 420, streak: 1, lastDailyClaimOffset: -30 * HOUR
    },
    {
      id: 'u_0005', username: 'cosmic_jelly', displayName: 'Cosmic Jelly', avatar: '🐙', password: DEMO_PASSWORD,
      coins: 7750, pointsBase: 300, streak: 5, lastDailyClaimOffset: -9 * HOUR
    },
    {
      id: 'u_0006', username: 'pixelpanda', displayName: 'Pixel Panda', avatar: '🐼', password: DEMO_PASSWORD,
      coins: 4990, pointsBase: 240, streak: 2, lastDailyClaimOffset: -11 * HOUR,
      createdProfileSlug: 'midnight-mosaic'
    },
    {
      id: 'u_0007', username: 'night_owl', displayName: 'Night Owl', avatar: '🦉', password: DEMO_PASSWORD,
      coins: 3320, pointsBase: 120, streak: 6, lastDailyClaimOffset: -3 * HOUR
    }
  ];

  // ---------------------------------------------------------------- boost history
  // Deterministic (seeded PRNG) ~30 boosts spread over the last 48 hours so
  // the feed, profile meters and recent-boost lists all have content.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeBoosts(now) {
    const rng = mulberry32(20260829); // fixed seed → same demo history every reset
    const bots = DEMO_USERS.filter((u) => u.id !== 'u_0001');
    const slugs = PROFILES.map((p) => p.slug);
    const amounts = [50, 75, 100, 120, 150, 150, 200, 250, 300, 400, 500];
    const out = [];
    // demo_fan's own 3 historical boosts (kept out of the random draw)
    const fan = DEMO_USERS[0];
    [
      { slug: 'neon-arena', amount: 120, offset: -2 * DAY + 3 * HOUR },
      { slug: 'luna-starr', amount: 150, offset: -30 * HOUR },
      { slug: 'neon-arena', amount: 150, offset: -28 * HOUR }
    ].forEach((b, i) => {
      out.push({
        id: 'boost_' + (i + 1), profileSlug: b.slug, amount: b.amount, value: b.amount,
        userId: fan.id, username: fan.username, avatar: fan.avatar,
        selfBoost: false, at: new Date(now + b.offset).toISOString()
      });
    });
    let n = out.length;
    for (let i = 0; i < 30; i++) {
      const bot = bots[Math.floor(rng() * bots.length)];
      const slug = slugs[Math.floor(rng() * slugs.length)];
      const amount = amounts[Math.floor(rng() * amounts.length)];
      const selfBoost = slug === 'midnight-mosaic' && bot.username === 'pixelpanda';
      const value = Math.round(amount * (selfBoost ? 1.5 : 1));
      const at = new Date(now - Math.floor(rng() * 46 * HOUR) - 5 * 60e3).toISOString();
      n += 1;
      out.push({
        id: 'boost_' + n, profileSlug: slug, amount, value,
        userId: bot.id, username: bot.username, avatar: bot.avatar,
        selfBoost, at
      });
    }
    out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    out.forEach((b, i) => { b.id = 'boost_' + (i + 1); });
    return out;
  }

  // ---------------------------------------------------------------- claim queue
  // One pending claim (visible in the admin console) + one already-approved
  // claim (Coral Cove shows the 🟢 verified owner badge).
  const CLAIM_SEEDS = [
    {
      profileSlug: 'neon-arena', status: 'pending',
      userId: 'u_0003', username: 'glittermax', offset: -5 * HOUR,
      evidence: 'I manage the venue — our official site and socials can confirm. Happy to verify!',
      decidedOffset: null
    },
    {
      profileSlug: 'coral-cove', status: 'approved',
      userId: 'u_0002', username: 'moonwalker_z', offset: -6 * DAY,
      evidence: 'Lighthouse trust committee — registry number CC-1889.',
      decidedOffset: -6 * DAY + 26 * HOUR
    }
  ];

  // ---------------------------------------------------------------- donations
  const DONATION_SEEDS = [
    { userId: 'u_0003', username: 'glittermax', method: 'upi', amount: 500, note: 'For the confetti budget!', offset: -30 * HOUR },
    { userId: 'u_0004', username: 'turbo_turtle', method: 'bmac', amount: 200, note: '', offset: -12 * HOUR }
  ];

  return {
    TASKS, PROFILES, DEMO_USERS, CLAIM_SEEDS, DONATION_SEEDS,
    makeBoosts, DEMO_PASSWORD, ADMIN_PASSWORD, HOUR, DAY
  };
});
