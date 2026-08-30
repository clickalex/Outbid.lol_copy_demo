'use strict';

/**
 * Grinbid central configuration.
 * Every tunable of the game economy, safety rails and rate limits lives here so
 * the audit can verify the exact values from the product spec.
 */

const path = require('path');

const ROOT = path.join(__dirname, '..');

const CONFIG = Object.freeze({
  ROOT,
  HOST: process.env.HOST || '0.0.0.0',
  PORT: Number(process.env.PORT || 3000),

  DATA_DIR: process.env.DATA_DIR || path.join(ROOT, 'data'),
  DB_FILE: process.env.DB_FILE || path.join(ROOT, 'data', 'db.json'),
  PUBLIC_DIR: path.join(ROOT, 'public'),

  // ---- Single-file JSON store -------------------------------------------
  STORE: Object.freeze({
    DEBOUNCE_MS: Number(process.env.STORE_DEBOUNCE_MS || 150),
    TMP_SUFFIX: '.tmp',
    MAX_BACKUPS: 3
  }),

  // ---- HTTP --------------------------------------------------------------
  HTTP: Object.freeze({
    // 2 MiB — fan pages can include an uploaded photo (auto-resized in the
    // browser to a compact JPEG/PNG data URL).
    MAX_BODY_BYTES: 2 * 1024 * 1024,
    MAX_URL_LENGTH: 2048
  }),

  // ---- Fan-page images ----------------------------------------------------
  IMAGE: Object.freeze({
    // Max accepted data-URL length (≈900 KiB of base64 ≈ 660 KiB of image).
    MAX_DATA_URL_LENGTH: 900 * 1024,
    PREFIXES: ['data:image/jpeg;base64,', 'data:image/jpg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,']
  }),

  // ---- Sessions / auth ---------------------------------------------------
  AUTH: Object.freeze({
    SESSION_TTL_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
    SESSION_COOKIE: 'gb_session',
    ADMIN_COOKIE: 'gb_admin',
    ADMIN_SESSION_TTL_MS: 2 * 60 * 60 * 1000, // 2 hours
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'grinbid-admin-dev',
    // Usernames that automatically hold admin powers (no separate admin
    // password needed). Comma-separated env overrides the built-in list —
    // the founder account ships on by default so the live app has an admin
    // the moment that username signs up.
    ADMIN_USERNAMES: (process.env.ADMIN_USERNAMES || 'alexami')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    USERNAME_RE: /^[A-Za-z0-9_]{3,20}$/,
    EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    SCRYPT_N: 16384,
    SCRYPT_R: 8,
    SCRYPT_P: 1
  }),

  // ---- Economy (single source of truth for the currency math) ------------
  ECONOMY: Object.freeze({
    SIGNUP_BONUS: 2500,
    DAILY_CLAIM: Object.freeze({
      BASE: 500,
      STREAK_BONUS_PER_DAY: 150,
      STREAK_CAP: 2000
    }),
    LUCKY_DROP: Object.freeze({
      INTERVAL_HOURS: 3,
      MIN_REWARD: 250,
      MAX_REWARD: 2500
    }),
    REFERRALS: Object.freeze({
      REFERRER_BONUS: 1000,
      REFEREE_BONUS: 500,
      LIFETIME_MATCH_PERCENTAGE: 10,
      CODE_LENGTH: 6,
      PER_DAY_CAP: 20 // anti-spam: pending referrals per referrer per day
    }),
    // Season = the grand championship (the original 7-day season is now the
    // weekly board; the season is a longer, bigger competition).
    SEASON_PRIZES: Object.freeze({
      RANK_1: 50000,
      RANK_2: 25000,
      RANK_3: 10000
    }),
    BOOST: Object.freeze({
      STANDARD_MULTIPLIER: 1.0,
      SELF_BOOST_MULTIPLIER: 1.5,
      MIN_BOOST: 50,
      COOLDOWN_MS: 2000
    }),
    TASKS_COUNT: 16,
    SEASON_LENGTH_MS: 90 * 24 * 60 * 60 * 1000, // season = 90 days
    // ---------------------------------------------------------------------
    // Rank lists (periods). There are THREE ladders that run together:
    //   weekly  — 7 days,  small prizes
    //   monthly — 30 days, medium prizes
    //   season  — 90 days, grand prizes (SEASON_PRIZES above)
    // Each period ranks BOTH fandom (the celeb/character pages by love) and
    // fans (the boosters by points). Coin prizes go to the TOP FANS; fandom
    // wins prestige/crowning + is recorded in the permanent winners ledger.
    // ---------------------------------------------------------------------
    PERIODS: Object.freeze({
      week: Object.freeze({
        lengthMs: 7 * 24 * 60 * 60 * 1000,
        label: 'Weekly',
        fanPrizes: [5000, 2500, 1000],
        fandomTop: 5
      }),
      month: Object.freeze({
        lengthMs: 30 * 24 * 60 * 60 * 1000,
        label: 'Monthly',
        fanPrizes: [20000, 10000, 5000],
        fandomTop: 5
      }),
      season: Object.freeze({
        lengthMs: 90 * 24 * 60 * 60 * 1000,
        label: 'Season',
        fanPrizes: [50000, 25000, 10000],
        fandomTop: 5
      })
    }),
    PERIOD_ORDER: Object.freeze(['week', 'month', 'season']),
    MAX_TRANSACTIONS: 2000,
    MAX_FEED_BOOSTS: 1000,
    MAX_BOOST_HISTORY_PER_PROFILE: 30
  }),

  // ---- Rate limits (per IP, token-bucket) --------------------------------
  RATE_LIMITS: Object.freeze({
    GENERAL: Object.freeze({ rate: 120, burst: 180, windowMs: 60_000 }), // catch-all API
    SENSITIVE: Object.freeze({ rate: 20, burst: 30, windowMs: 60_000 }), // signup, login, donations
    BOOST: Object.freeze({ rate: 30, burst: 30, windowMs: 60_000 }) // boosts have a 2 s cooldown anyway
  }),

  // ---- Donations (strictly non-reward; config placeholders only) ---------
  DONATIONS: Object.freeze({
    UPI_ID: 'grinbid@upi',
    PAYPAL_ME: 'grinbid',
    BUY_ME_A_COFFEE: 'grinbid',
    RAZORPAY_LINK: 'https://razorpay.me/@grinbid',
    MIN_AMOUNT_INR: 10,
    MAX_AMOUNT_INR: 100000
  })
});

module.exports = { CONFIG, ROOT };
