# 🎪 GRINBID — Complete Rebuild Specification

> **Purpose of this document:** a self-contained, implementation-level spec of the
> Grinbid website. Any AI agent (or human developer) can rebuild a functionally
> identical site from this document alone — no access to the original repo required.
> Every number, formula, route, event, color and string below is normative.

**Project:** Grinbid — *"Bid. Back. Rank up."*
**One-liner:** A playful, **100% free** virtual-coin fan-boost game. Users boost
fan-made pages (celebrities, estates, venues, brands, communities), climb a weekly
season leaderboard, and never spend a single real cent.

---

## Table of contents

1. [Hard constraints](#1-hard-constraints)
2. [Architecture overview](#2-architecture-overview)
3. [Repository layout](#3-repository-layout)
4. [Configuration — every tunable](#4-configuration--every-tunable)
5. [Data model (db.json state shape)](#5-data-model)
6. [Seed data — exact content](#6-seed-data--exact-content)
7. [Game economy — all rules & formulas](#7-game-economy--all-rules--formulas)
8. [Auth & sessions](#8-auth--sessions)
9. [Rate limiting](#9-rate-limiting)
10. [Input sanitization](#10-input-sanitization)
11. [HTTP router & static serving](#11-http-router--static-serving)
12. [API reference — every endpoint](#12-api-reference--every-endpoint)
13. [SSE hub & event protocol](#13-sse-hub--event-protocol)
14. [Persistence engine (JsonStore)](#14-persistence-engine-jsonstore)
15. [Server bootstrap & lifecycle](#15-server-bootstrap--lifecycle)
16. [Frontend — SPA shell](#16-frontend--spa-shell)
17. [Frontend — design system (CSS)](#17-frontend--design-system-css)
18. [Frontend — screens & behaviors](#18-frontend--screens--behaviors)
19. [Frontend — SSE client](#19-frontend--sse-client)
20. [Legal & safety requirements](#20-legal--safety-requirements)
21. [Tests](#21-tests)
22. [Audit tooling](#22-audit-tooling)
23. [Deployment](#23-deployment)
24. [Environment variables](#24-environment-variables)
25. [Acceptance checklist](#25-acceptance-checklist)

---

## 1. Hard constraints

These are **non-negotiable** product rules. The rebuild must satisfy all of them:

1. **Zero npm dependencies.** `package.json` has empty `dependencies` AND empty
   `devDependencies`. Only Node.js built-ins are used: `http`, `crypto`, `fs`,
   `path`, `node:test`, `node:assert`, `node:child_process` (scripts only).
   **There is no `npm install` step.**
2. **Node.js ≥ 18** (requires `crypto.scrypt`, `crypto.randomInt`,
   `crypto.timingSafeEqual`, global `fetch`, `node:test`, base64url encoding).
3. **Single-file JSON database** at `data/db.json` with atomic-rename persistence.
4. **Real-time via Server-Sent Events** at `GET /api/stream` (no WebSockets).
5. **Frontend is a vanilla JS + CSS hash-routed SPA.** No frameworks, no build
   step, no bundler. Files served as-is from `/public`.
6. **Coins are 100% free virtual coins.** No purchases, no payment processing for
   coins, no pay-to-win, no gambling. Donations exist but are strictly
   **non-reward** (they never grant coins, boosts, ranks or perks).
7. **Fan-created disclaimer** on every seeded profile: pages are fan tributes,
   not endorsements; real owners can claim a page via moderator review.
8. Admin console gated by a single password (default `grinbid-admin-dev`,
   override with `ADMIN_PASSWORD` env var).

---

## 2. Architecture overview

```
┌───────────────────────────────────────────────────────────────┐
│ server.js (thin bootstrap)                                    │
│   └─ src/app.js  createApp():                                 │
│        • JsonStore      single-file JSON DB (atomic writes)   │
│        • SseHub         server-sent events hub                │
│        • Router         framework-free router + static files  │
│        • http.Server    security headers + dispatch           │
│                                                               │
│ src/api.js   all HTTP handlers, wired into the Router         │
│ src/economy.js  pure coin/boost/streak/referral/season math   │
│ src/auth.js   scrypt hashing + HMAC-signed session cookies    │
│ src/rateLimit.js  per-IP token buckets                        │
│ src/sanitize.js   input normalization/validation              │
│ src/seed.js    16 tasks + 12 fan-made profiles seed           │
│ src/config.js  every tunable, frozen object                   │
│                                                               │
│ public/   index.html + app.js (SPA) + styles.css + legal      │
│ data/db.json   runtime database (gitignored, auto-created)    │
└───────────────────────────────────────────────────────────────┘
```

Request flow: `http.Server` → sets security headers → `router.dispatch(req,res)` →
matched handler in `src/api.js` → handler validates input (sanitize), checks rate
limit, runs economy mutations via `store.mutate()` (synchronous against the live
in-memory state), broadcasts SSE events, returns a response descriptor
`{ status, body, headers }` which the router writes as JSON.

Node is single-threaded, so `mutate()` runs synchronously against the live
in-memory object — no lock needed; the write queue makes the fs side safe.

---

## 3. Repository layout

```
package.json            name "grinbid", version 1.0.0, MIT, private,
                        engines.node ">=18", ZERO deps (see §22 for scripts)
server.js               bootstrap → createApp() → listen(CONFIG.PORT, CONFIG.HOST)
src/
  config.js             frozen CONFIG object — every tunable
  store.js              JsonStore class
  seed.js               TASKS + PROFILES + createSeedState()
  economy.js            pure game math + publicUser/publicProfile views
  auth.js               password + token + cookie helpers
  rateLimit.js          RateLimiter class + specFor()
  sanitize.js           sanitizers + hashIp()
  router.js             Router, RouteError, sendJson, serveStatic, readBody
  api.js                handlers + buildRouter(state, sse)
  app.js                createApp(), listen()
public/
  index.html            SPA shell (22 lines)
  app.js                the SPA (≈1200 lines, single IIFE)
  styles.css            playful-pop theme (≈650 lines)
  terms.html            standalone legal page (also served at /terms)
  privacy.html          standalone legal page (also served at /privacy)
  manifest.webmanifest  PWA placeholder (no icons)
  robots.txt            Allow /, Disallow /api/
  favicon.ico           placeholder
test/
  economy.test.js       pure math tests
  store.test.js         persistence/SSE/rate-limit tests
  http.test.js          end-to-end HTTP integration tests
scripts/
  check-syntax.js       zero-dep + `node --check` audit
  audit-loop.js         20-consecutive-pass audit loop
  reset-data.js         wipe data/db.json
render.yaml             Render.com blueprint
deploy/                 Render + Oracle Cloud deploy docs & setup script
demo/                   optional fully-static in-browser demo (mock backend)
.github/workflows/deploy-demo.yml   publishes demo/ to GitHub Pages
.gitignore              ignores data/db.json*, data/.session-secret, node_modules…
```

`package.json` scripts (exact):

| Command | Behavior |
|---|---|
| `npm start` / `npm dev` | `node server.js` |
| `npm test` | `node --test` (discovers `test/*.test.js`) |
| `npm run check` | `node scripts/check-syntax.js` |
| `npm run audit` | `npm run check && npm test` |
| `npm run audit:loop` | `node scripts/audit-loop.js 20` |
| `npm run reset` | `node scripts/reset-data.js` |

---

## 4. Configuration — every tunable

All values live in `src/config.js` as a single frozen `CONFIG` object.
`ROOT` = repo root (parent of `src/`). Reproduce exactly:

| Key | Value |
|---|---|
| `HOST` | `process.env.HOST \|\| '0.0.0.0'` |
| `PORT` | `Number(process.env.PORT \|\| 3000)` |
| `DATA_DIR` | `process.env.DATA_DIR \|\| <ROOT>/data` |
| `DB_FILE` | `process.env.DB_FILE \|\| <ROOT>/data/db.json` |
| `PUBLIC_DIR` | `<ROOT>/public` |
| **STORE** | `DEBOUNCE_MS: 150` (env `STORE_DEBOUNCE_MS`), `TMP_SUFFIX: '.tmp'`, `MAX_BACKUPS: 3` |
| **HTTP** | `MAX_BODY_BYTES: 65536` (64 KiB), `MAX_URL_LENGTH: 2048` |
| **AUTH** | `SESSION_TTL_MS: 604800000` (7 days) · `SESSION_COOKIE: 'gb_session'` · `ADMIN_COOKIE: 'gb_admin'` · `ADMIN_SESSION_TTL_MS: 7200000` (2 h) · `ADMIN_PASSWORD: process.env.ADMIN_PASSWORD \|\| 'grinbid-admin-dev'` · `USERNAME_RE: /^[A-Za-z0-9_]{3,20}$/` · `SCRYPT_N: 16384`, `SCRYPT_R: 8`, `SCRYPT_P: 1` |
| **ECONOMY** | see §7 |
| **RATE_LIMITS** | see §9 |
| **DONATIONS** | `UPI_ID: 'grinbid@upi'` · `PAYPAL_ME: 'grinbid'` · `BUY_ME_A_COFFEE: 'grinbid'` · `RAZORPAY_LINK: 'https://razorpay.me/@grinbid'` · `MIN_AMOUNT_INR: 10` · `MAX_AMOUNT_INR: 100000` |

---

## 5. Data model

The entire database is one JSON object (`data/db.json`, pretty-printed with
2-space indent). Top-level shape produced by `createSeedState()`:

```js
{
  meta: {
    version: 1,
    createdAt: ISO, updatedAt: ISO,
    bootCount: 0,              // incremented on every app boot
    legalNoticeAddedAt: ISO
  },
  season: {
    id: 1,                     // integer, +1 each settlement
    startedAt: ISO,
    endsAt: ISO,               // startedAt + 7 days
    settled: false,
    lastSettlement: null,      // ISO of last payout
    payouts: []                // last 10 payout records (older shifted out)
  },
  tasks: [ /* the 16 task defs, see §6 */ ],
  users: {},                   // map userId -> user object
  userByUsername: {},          // map username -> same user object (index)
  profiles: {},                // map slug -> profile object
  boosts: [],                  // global boost feed (newest appended, capped 1000)
  transactions: [],            // global coin ledger (capped 2000, oldest spliced)
  adminLog: [],
  donationIntents: [],
  nextIds: { user: 1, boost: 1, txn: 1, claim: 1 }
}
```

### User object (created at signup — reproduce all fields)

```js
{
  id: `u_${String(nextIds.user).padStart(4, '0')}`,   // u_0001, u_0002, …
  username,                     // lowercase, [a-z0-9_]{3,20}
  displayName,                  // 2–24 chars
  avatar,                       // 1–2 emoji glyphs, default '🙂'
  password: { salt: <16-byte hex>, hash: <scrypt hex> },
  coins: 0,
  totalCoinsEarned: 0,
  totalCoinsSpent: 0,
  seasonPoints: 0,              // resets each season settlement
  createdAt: ISO, updatedAt: ISO,
  streakCount: 0,               // consecutive daily-claim days
  lastDailyClaimDay: null,      // UTC 'YYYY-MM-DD'
  luckyDropLastAt: null,        // ISO
  lastBoostAt: 0,               // epoch ms, for 2 s cooldown
  createdProfileSlug: null,     // slug of user's one community profile
  signupIpHash: <sha256(ip) first 16 hex chars>,
  referral: {
    code: 'GB-XXXXXX-YYYY',     // see §7
    referredBy: null,           // referrer userId
    status: 'none',             // none | active | pending_review
    codeSharedAt: null,
    lifetimeMatchEarned: 0,
    referrals: []               // [{userId, username, at, status, earned}]
  },
  stats: {
    boosts: 0, dailyClaims: 0, luckyDrops: 0,
    distinctProfiles: 0, distinctProfileIds: [],
    coinsSpentOnBoosts: 0, bigBoosts: 0,     // boosts ≥100 coins
    landmarkBoosts: 0,                        // boosts on estate/venue
    referralsActive: 0, claimedTasks: 0, maxStreak: 0
  },
  tasks: {},                    // map taskId -> {done, claimed, doneAt, claimedAt}
  notifications: []             // [{id:'n_<ts>', text, at, read:false}]
}
```

### Profile object (seeded and user-created share this shape)

```js
{
  id: `p_${slug}`,
  slug,                         // [a-z0-9-]{3,40}
  name,                         // ≤24 chars
  category,                     // celebrity|influencer|estate|venue|brand|community
  emoji,                        // profile badge emoji
  tagline,                      // ≤60 chars
  tags: [],                     // ≤6 tags, ≤20 chars each
  description,                  // ≤400 chars, newlines allowed
  seed: true|false,             // true = shipped with the app (enables claim modal)
  fanCreated: true,             // always true
  verified: false, verifiedAt: null,
  claimedBy: null,              // userId of verified owner
  createdBy: null,              // userId of creator (null for seeded)
  createdByUsername: null,      // username of creator (denormalized)
  createdAt: ISO,
  boostTotal: 0,                // summed boost VALUE (points), not coins
  boostCount: 0,
  fanCount: 0, fanIds: [],
  lastBoostAt: null,
  recentBoosts: [],             // newest first, capped 30
  claimRequests: []             // [{id:'claim_N', userId, username, at,
                                //   status:'pending', evidence, decidedAt}]
}
```

### Boost record (in `state.boosts` and `profile.recentBoosts`)

```js
{
  id: `boost_${nextIds.boost}`,
  profileId, profileSlug, profileName, profileEmoji,
  userId, username, avatar,
  amount,        // coins the user paid
  value,         // points credited (×1.5 if self-boost)
  selfBoost: bool,
  at: ISO
}
```

### Transaction record

```js
{ id: `txn_${nextIds.txn}`, userId, kind, amount /*signed*/, note, at: ISO }
```

Kinds used: `signup`, `referral_bonus`, `referral_match`, `daily_claim`,
`lucky_drop`, `task`, `season_prize`, `boost` (negative amount).

### Season payout record

```js
{ at: ISO, seasonId,
  earned: [{ userId, username, points, prize }] }  // prize = 50000/25000/10000
```

---

## 6. Seed data — exact content

### 6.1 The 16 tasks (`TASKS`)

| id | order | emoji | title | desc | reward | unlock |
|---|---|---|---|---|---|---|
| t01 | 1 | 👋 | Welcome, booster! | Create your account and grab your 2,500 free coins. | 100 | null |
| t02 | 2 | 🎨 | Make it yours | Set your display name and pick an emoji avatar. | 100 | null |
| t03 | 3 | 📅 | First daily claim | Claim today's free daily coins. | 150 | null |
| t04 | 4 | 🍀 | Lucky drop! | Open your first lucky drop. | 200 | null |
| t05 | 5 | 🚀 | First boost | Back a profile with your first boost (min 50 coins). | 250 | null |
| t06 | 6 | 🔥 | Boost x5 | Throw 5 boosts total at any profiles. | 350 | `{task:'t05'}` |
| t07 | 7 | 🌟 | Spread the love | Boost 3 different profiles. | 300 | `{task:'t05'}` |
| t08 | 8 | 📣 | Share your code | Grab your referral code and share it with a friend. | 200 | null |
| t09 | 9 | 🤝 | First referral | A friend joins with your code and completes their first action. | 1000 | `{task:'t08'}` |
| t10 | 10 | 🧾 | Task collector | Complete 5 tasks in total. | 300 | null |
| t11 | 11 | 📆 | Three in a row | Claim daily coins 3 days in a row. | 400 | `{task:'t03'}` |
| t12 | 12 | 👑 | 5-day streak | Reach a 5-day daily claim streak. | 500 | `{task:'t11'}` |
| t13 | 13 | 💰 | Big spender | Spend 5,000 coins on boosts (any profile). | 600 | `{task:'t06'}` |
| t14 | 14 | 💥 | Heavy hitter | Boost 3 times with at least 100 coins each. | 450 | `{task:'t06'}` |
| t15 | 15 | 🏛️ | Back a landmark | Boost an estate or venue profile once. | 350 | null |
| t16 | 16 | 🎉 | Mega recruiter | Bring 3 friends to Grinbid with your code. | 2000 | `{task:'t09'}` |

Task completion conditions (evaluated in `syncTasks`, see §7.6).

### 6.2 The 12 seeded fan-made profiles (`PROFILES`)

All have `seed: true` (drives the "fan-made · not affiliated" badge and the
claim/verify modal), `fanCreated: true`, zero boosts, `createdAt = seed time`.

| slug | name | category | emoji | tagline | tags | description |
|---|---|---|---|---|---|---|
| neon-arena | Neon Arena | venue | 🏟️ | The city's loudest lights-out stadium. | stadium, concerts, e-sports | A fan-made page for the Neon Arena — legendary live shows, gigs and esports finals under one glowing roof. |
| moonlight-manor | Moonlight Manor | estate | 🏰 | A century-old estate on the hill. | heritage, estate, gardens | Fan-made profile celebrating the Moonlight Manor: velvet lawns, secret gardens and the famous midnight tour. |
| luna-starr | Luna Starr | celebrity | 🎤 | Pop prism — singer, sparkle machine. | singer, pop, icon | Fan-made page for Luna Starr, the pop prism whose anthems are certified bangers. Fans boost their fave, not the artist. |
| velvet-whiskers | Velvet Whiskers | influencer | 🐈 | The internet's fluffiest gamer cat. | cat, streamer, gaming | Fan-made profile for Velvet Whiskers, a cat who accidentally became a streamer and refuses to stop winning. |
| the-grand-hive | The Grand Hive | community | 🐝 | Where builders, dreamers & bees hang out. | makerspace, community, events | Fan-made community page for The Grand Hive makerspace — workshops, demos and way too much coffee. |
| skyline-towers | Skyline Towers | estate | 🌆 | Twin towers with a skybar on top. | landmark, estate, views | Fan-made page for Skyline Towers, the twin glass landmarks with a 180° skybar and a pink-neon rooftop. |
| bubble-pop-records | Bubble Pop Records | brand | 🧃 | Home of the candy-colored label. | label, music, brand | Fan-made page for Bubble Pop Records, the candy-colored indie label behind a dozen summer anthems. |
| crown-theatre | The Crown Theatre | venue | 🎭 | Curtain up, confetti down. | theatre, shows, history | Fan-made profile of The Crown Theatre, the gilded stage where every premiere ends in a curtain call and a shower of glitter. |
| captain-cosmo | Captain Cosmo | celebrity | 🪐 | Astro-funk ambassador, zero gravity dancer. | artist, funk, space | Fan-made page for Captain Cosmo, the astro-funk ambassador who dances in zero gravity and never loses his helmet. |
| pixel-playground | Pixel Playground | community | 🕹️ | A tiny arcade with a big heart. | arcade, retro, community | Fan-made page for Pixel Playground, a retro arcade co-op with rainbow LEDs and a high-score wall that never forgets. |
| coral-cove | Coral Cove | estate | 🏖️ | A pastel cove with a lighthouse. | coast, estate, landmark | Fan-made profile for Coral Cove, the pastel seaside estate with a candy-striped lighthouse and legendary sunsets. |
| hip-hop-hamster | Hip-Hop Hamster | influencer | 🐹 | Tiny wheels, big bars. | rapper, hamster, beats | Fan-made page for Hip-Hop Hamster, the smallest rapper with the biggest bars — all recorded on a grain-of-rice mic. |

Category whitelist (used everywhere): `celebrity, influencer, estate, venue,
brand, community`.

---

## 7. Game economy — all rules & formulas

All math lives in `src/economy.js` as **pure functions**. `E = CONFIG.ECONOMY`.

### 7.1 Constants

| Mechanic | Value |
|---|---|
| Signup bonus | **2,500** coins (`SIGNUP_BONUS`) |
| Daily claim | **500** base + **150**/streak day, capped at **2,000** |
| Lucky drop | random integer **250–2,500 inclusive**, every **3 hours** |
| Referral | referrer **+1,000** · referee **+500** · **10% lifetime match** on referee earnings |
| Referral anti-spam | **20** pending referrals per referrer per UTC day |
| Season prizes | **50,000 / 25,000 / 10,000** coins (ranks 1/2/3) |
| Season length | **7 days** |
| Boost | min **50** coins · 1.0× points · **1.5× on your own page** · **2,000 ms cooldown** |
| Ledger caps | 2,000 transactions · 1,000 feed boosts · 30 recent boosts/profile |

### 7.2 Daily claim

- `dailyRewardForStreak(s)`: `s = max(1, floor(s))`; reward =
  `min(500 + (s-1)*150, 2000)`.
- `dayKey(ts)` = `new Date(ts).toISOString().slice(0,10)` (UTC day).
- A claim continues the streak iff `lastDailyClaimDay === dayKey(now - 24h)`;
  otherwise streak resets to 1.
- On claim: set `streakCount`, `maxStreak = max(maxStreak, streak)`,
  `lastDailyClaimDay = today`, `stats.dailyClaims += 1`, award coins with kind
  `daily_claim`, sync tasks (t03/t11/t12).
- Second claim same day → HTTP **409** `{error:'already_claimed', reward}`.

### 7.3 Lucky drop

- `luckyDropReward()` = `crypto.randomInt(250, 2501)` (inclusive both ends).
- Next claimable at `Date.parse(luckyDropLastAt) + 3h` (0 if never).
- Early attempt → HTTP **429** `{error:'not_ready', waitMs}`.
- On success: award with kind `lucky_drop`, `stats.luckyDrops += 1`, sync t04.

### 7.4 Boost (`applyBoost` — reproduce order of checks exactly)

1. **Cooldown:** if `now - user.lastBoostAt < 2000` → `{ok:false, reason:'cooldown',
   waitMs, code:429}` (HTTP 429 with `waitMs`).
2. **Amount:** must be an integer ≥ 50 → else `reason:'min_boost', code:400`.
3. **Charge:** `user.coins -= amount` via `chargeCoins` (kind `boost`, negative
   txn). Insufficient → `reason:'insufficient_coins', code:400`.
4. **Credit:** `selfBoost = (profile.createdBy === user.id)`;
   `value = round(amount * (selfBoost ? 1.5 : 1.0))`.
   `profile.boostTotal += value`; `profile.boostCount += 1`; `lastBoostAt = ISO`;
   add user to `profile.fanIds` (dedup) and set `fanCount`.
5. **Records:** push boost record to `state.boosts` (cap 1000, splice oldest) and
   `unshift` to `profile.recentBoosts` (cap 30).
6. **User stats:** `lastBoostAt = now`; `stats.boosts += 1`;
   `stats.coinsSpentOnBoosts += amount`; `bigBoosts += 1` if `amount ≥ 100`;
   `landmarkBoosts += 1` if category is `estate` or `venue`;
   `user.seasonPoints += value` (the *value*, not the amount!);
   track distinct profiles in `stats.distinctProfileIds`.
7. `syncTasks(user)`. Return `{ok:true, boost, txn, value, selfBoost, balance}`.

Boostable categories set: celebrity, influencer, estate, venue, brand, community.

### 7.5 Referrals

- **Code format:** `GB-XXXXXX-YYYY` where XXXXXX = 6 chars drawn from alphabet
  `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I) via `crypto.randomBytes(6)`,
  and YYYY = first 4 hex chars of `sha1(userId)`, uppercased.
- Regex validated: `/^GB-[A-Z0-9]{6,14}-[A-F0-9]{4}$/`.
- **`validateReferral(state, signupUser, referrer, code, ipHash)`** returns
  `{ok, status|reason}`:
  - no code → `{ok:true, status:'none'}`
  - malformed → `invalid_referral_code` (400)
  - code equals own code or `referrer.id === signupUser.id` → `self_referral`
  - unknown code → `unknown_referrer`
  - already referred → `already_referred`
  - referrer already has ≥ 20 referrals created today (UTC) → `referral_cap_reached`
  - `ipHash === referrer.signupIpHash` → `{ok:true, status:'flagged'}` →
    referee gets `status:'pending_review'`, **no bonuses until admin approves**
  - otherwise `{ok:true, status:'ok'}`
- On `ok`: referee `+500` (kind `referral_bonus`), referrer `+1000`, referral
  entry appended to `referrer.referral.referrals` with `earned` set to 1000,
  `user.stats.referralsActive = 1`, sync tasks both sides (t09/t16).
- **Lifetime match:** on every qualifying earning (see §7.7), referrer receives
  `floor(amount * 10 / 100)` coins (kind `referral_match`), added to their coins,
  earned total, season points and `referral.lifetimeMatchEarned`. Only when the
  referee's referral status is `active`. Match earnings themselves never match
  again (no double-dipping).
- Hard rejection during signup ⇒ the half-created account is deleted
  (`delete state.users[id]; delete state.userByUsername[username]`) and 400 returned.

### 7.6 Tasks

- `taskUnlocked(task, user, state)`: no `unlock` → true; `unlock.task` → true iff
  that task's progress is done; `unlock.tasksDone` (number) → true iff
  `completedTasks(user) >= n`.
- `syncTasks(user, state, at)` runs over all 16 tasks, skips locked/already-done,
  and marks `done` + `doneAt` when the condition holds:
  - t01 always · t02 `user.profileUpdatedAt` truthy · t03 `dailyClaims ≥ 1` ·
    t04 `luckyDrops ≥ 1` · t05 `boosts ≥ 1` · t06 `boosts ≥ 5` ·
    t07 `distinctProfiles ≥ 3` · t08 `referral.codeSharedAt` ·
    t09 `referralsActive ≥ 1` · t10 `completedTasks ≥ 5` ·
    t11 `maxStreak ≥ 3` · t12 `maxStreak ≥ 5` · t13 `coinsSpentOnBoosts ≥ 5000` ·
    t14 `bigBoosts ≥ 3` · t15 `landmarkBoosts ≥ 1` · t16 `referralsActive ≥ 3`
- Rewards are **not** auto-paid: user must POST `/api/tasks/:id/claim`.
  `claimTaskReward`: locked → `locked`; already claimed → `already_claimed`;
  not done → `not_done` (all 400); else mark claimed, set `stats.claimedTasks`,
  `awardCoins(reward, 'task', 'Task: <title>')`.

### 7.7 Coin ledger — `awardCoins` / `chargeCoins` / `pushTxn`

- `pushTxn(state, user, kind, amount, note, at)`: builds txn record, increments
  `nextIds.txn`, pushes to `state.transactions`, splices oldest beyond 2,000.
- `awardCoins(state, user, amount, kind, note, opts)`:
  - floor, ignore ≤ 0 (returns null);
  - push txn (positive), `coins += amt`, `totalCoinsEarned += amt`,
    `seasonPoints += amt`;
  - **referral match** if `opts.allowMatch !== false` and kind ∈
    `MATCH_TRIGGER_KINDS` = `{signup, referral_bonus, daily_claim, lucky_drop,
    task, season_prize}` and user has an active referrer → credit the match
    (also pushes an optional event into `opts.events`).
- `chargeCoins(state, user, amount, kind, note, at)`: returns null (no txn) if
  `user.coins < amount`; else push txn (negative), `coins -= amt`,
  `totalCoinsSpent += amt`.

### 7.8 Season

- `seasonPayoutRankings(state)`: all users with `seasonPoints > 0`, sorted by
  points desc, tie-break `createdAt` ascending (earlier user wins), top 3.
- `settleSeason(state, force, at)`:
  - unless `force`, refuse if `at < endsAt && !settled` → `{ok:false, reason:'not_over'}`;
  - pay 50,000 / 25,000 / 10,000 to ranks 1/2/3 (kind `season_prize`, note
    `Season <id> rank <n>`);
  - append payout record to `season.payouts` (keep last 10);
  - `season.id += 1`; `startedAt = now`; `endsAt = now + 7d`; `settled = false`;
    `lastSettlement = payout.at`;
  - **reset every user's `seasonPoints` to 0**.
- `maybeAutoSettleSeason(state, at)`: if not settled and `at >= endsAt` → force
  settle. Called on boot and on **every incoming request** (cheap check).

### 7.9 Public views (never leak password/IP hashes)

`publicUser(state, user)` returns:
`id, username, displayName, avatar, coins, totalCoinsEarned, totalCoinsSpent,
seasonPoints, createdAt, streakCount, dailyClaimedToday (bool),
luckyDropClaimable (bool), nextLuckyDropAt (ISO|null), tasksDone, tasksTotal,
createdProfileSlug`.

`publicProfile(state, profile)` returns:
`id, slug, name, category, emoji, tagline, tags, description, seed,
fanCreated: true (always), verified, claimedByUsername, createdByUsername,
createdAt, isMineProfile: false (overridden per requester), boostTotal,
boostCount, fanCount, lastBoostAt, recentBoosts[] (id, username, avatar, amount,
value, selfBoost, at)`.

---

## 8. Auth & sessions

`src/auth.js` — built-ins only.

### Password hashing
- `hashPassword(password, salt?)`: salt = 16 random bytes hex (generated when
  absent); `crypto.scryptSync(password, salt, 64, {N:16384, r:8, p:1,
  maxmem: 64*1024*1024})` → `{salt, hash: <hex>}`.
- `verifyPassword(password, salt, expectedHash)`: recompute, compare with
  `crypto.timingSafeEqual` on equal-length buffers.

### Session tokens (stateless, HMAC-signed)
- HMAC secret: `process.env.SESSION_SECRET` if set (trimmed, non-empty);
  else read `data/.session-secret`; else generate 32 random bytes hex, write to
  `data/.session-secret` (mode 0o600). Secret is resolved once at module load.
- Token = `base64url("kind:subjectId:" + Date.now()) + "." +
  base64url(HMAC_SHA256(secret, body))`.
- `verifyToken(token)`: split at first `.`, timing-safe compare signature, decode
  body, require ≥ 3 colon-parts, return `{kind, subjectId}` or null.
  (TTL is enforced by cookie Max-Age, not re-checked server-side.)
- kinds: `user` (subjectId = user id), `admin` (subjectId = `'root'`).

### Cookies
- `parseCookies(header)`: split on `;`, first `=`, decodeURIComponent values.
- Session cookie: name `gb_session`, `Max-Age = 604800` (7 d), `Path=/`,
  `HttpOnly`, `SameSite=Lax`, `Priority=High`, plus `Secure` when
  `NODE_ENV === 'production'`.
- Admin cookie: name `gb_admin`, `Max-Age = 7200` (2 h), same attributes.
- Logout: `clearCookie` → `<name>=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`.

### Login behavior
- Wrong username or password → 250 ms artificial delay, then 400
  `invalid_credentials` (same error for both cases — no user enumeration).

---

## 9. Rate limiting

`src/rateLimit.js` — in-memory **token bucket per key** (default key =
`route:clientIP`; IP = `req.socket.remoteAddress` or `'unknown'`).

| Bucket | rate | burst | windowMs | Applies to |
|---|---|---|---|---|
| GENERAL | 120 | 180 | 60,000 | catch-all API, profile create, task claim, referral share |
| SENSITIVE | 20 | 30 | 60,000 | signup, login, daily-claim, lucky-drop, donations, claim requests, admin login |
| BOOST | 30 | 30 | 60,000 | boosts (which also have the 2 s cooldown) |

- `take(key, spec)`: refill `tokens += (elapsed/windowMs)*rate` capped at burst;
  allow iff `tokens ≥ 1`, then deduct. Returns `{allowed, remaining,
  retryAfterMs ( = ceil((1-tokens)/rate*windowMs) ), limit: burst}`.
- Denied → throw `RouteError(429, 'rate_limited', {retryAfterMs, remaining, limit})`.
- Buckets unused for 10 minutes are pruned (interval every 60 s, unref'd).
- `specFor(route, authLevel)`: `route==='boost'` → BOOST; authLevel
  `'sensitive'` (or login/signup/donate routes) → SENSITIVE; else GENERAL.

---

## 10. Input sanitization

`src/sanitize.js`. All user strings pass through these before storage/echo.

- `CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g` (stripped; emoji preserved).
- `cleanText(value, {max=140, allowNewlines=false})`: stringify, strip control
  chars; if newlines allowed, normalize `\r\n?`→`\n`; else collapse all
  whitespace to single spaces and trim. Cap length by **code points** (`[...s]`).
- `sanitizeUsername`: cleanText max 20 → lowercase → must match
  `/^[A-Za-z0-9_]{3,20}$/` else null.
- `sanitizeDisplayName`: cleanText max 24; must be ≥ 2 chars else null.
- `sanitizeAvatar(value, fallback='🙂')`: keep only chars matching
  `/\p{Extended_Pictographic}/u`, max 2 glyphs, else fallback.
- `sanitizeSlug`: cleanText max 40 → lowercase → must match
  `/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/` OR `/^[a-z0-9]{1,40}$/` else null.
- `sanitizeId(value, max=64)`: must match `/^[A-Za-z0-9_-]{1,64}$/` else null.
- `sanitizeAmount(value, {min=0, max=1e9})`: empty string → null; must be a
  **safe integer** within bounds, else null.
- `sanitizeCategory`: whitelist of the 6 categories, else null.
- `sanitizeBoolean`: true/'true'/1/'1' → true; false/'false'/0/'0' → false; else null.
- `hashIp(ip)`: `sha256(ip).hex.slice(0,16)`.

---

## 11. HTTP router & static serving

`src/router.js` — framework-free.

### Router
- Routes stored as `{method, parts[], handler}`; pattern parts are literals or
  `:param` (decoded with `decodeURIComponent`). Match requires same method, same
  segment count, literal equality.
- `dispatch(req, res)`:
  1. Parse URL (against `http://<host>`). Path > 2048 chars → 414 `url_too_long`.
  2. No route match:
     - GET + known static path (alias or whitelist) → serve that file;
     - GET + not under `/api/` → serve `/index.html` (**SPA fallback**, hash routing);
     - else 404 JSON `{error:'not_found'}`.
  3. Build ctx: `{req, res, url, path, params, query, body:null, user:null,
     ip: req.socket.remoteAddress || 'unknown'}`.
  4. POST/PUT/PATCH → parse body via `readBody`.
  5. Handler result → `writeResponse`; `null` result = response already sent
     (SSE). Throws → error path.
- `RouteError(status, message, extra)` → JSON `{error: message, ...extra}`.
  Unknown errors → 500 `{error:'internal_error'}` (non-500 keeps `err.message`,
  adds `details: err.extra`); 500s also invoke an optional `errorHandler`.

### Static serving
- Whitelist: `/index.html, /app.js, /styles.css, /favicon.ico,
  /manifest.webmanifest, /terms.html, /privacy.html, /legal.html,
  /offline.html, /robots.txt` + `/assets/<safe-name>`.
- Aliases: `/terms → /terms.html`, `/privacy → /privacy.html`.
- Path-traversal guard: normalize, strip leading `../`, must resolve inside
  PUBLIC_DIR. MIME map: html/js/css/json/svg/png/ico/webmanifest/txt/woff2;
  unknown → `application/octet-stream`.
- Headers on static: `Cache-Control: public, max-age=300` (or `no-store`),
  `X-Content-Type-Options: nosniff`,
  `Content-Security-Policy: default-src 'self'; img-src 'self' data:;
  style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'`.

### Body parsing (`readBody`)
- Accumulate chunks; > 64 KiB → reject `RouteError(413, 'payload_too_large')`
  and destroy the request.
- Empty body → `{}`. Content-Type JSON → `JSON.parse` (invalid → 400
  `invalid_json`). `x-www-form-urlencoded` → `Object.fromEntries(new
  URLSearchParams(raw))`. Other types: try JSON, fall back to urlencoded.

### JSON responses
- Every JSON response carries `Content-Type: application/json; charset=utf-8`,
  explicit `Content-Length`, `Cache-Control: no-store`,
  `X-Content-Type-Options: nosniff`.

---

## 12. API reference — every endpoint

All under prefix `/api`. Auth via the `gb_session` cookie; admin via `gb_admin`.
Error format: `{ "error": "<code>", …extra }`.

### Health & me
- `GET /api/health` → 200 `{ok:true, coins:2500, free:true, time:ISO}`.
- `GET /api/me` → `{user: <publicUser + private extras> | null}`. Private extras
  (present when logged in): `referralCode`, `referralCodeShared`, `referrals`
  (last 25: username/at/status/earned), `lifetimeMatchEarned`, `tasks` (all 16
  with `{id,title,desc,emoji,reward,order,done,claimed,locked}`),
  `notifications` (last 20), `transactions` (own, last 60), `createdProfileSlug`,
  `dailyClaim: {claimedToday, streak, streakForClaim, reward}` where
  `streakForClaim = isYesterday(lastDay) ? streak+1 : (claimedToday ? streak : 1)`.
- `GET /api/tasks` → convenience **alias of /api/me**.

### Auth
- `POST /api/auth/signup` `{username, password, displayName?, avatar?, referralCode?}`
  — sensitive limit. Validates username (400 `invalid_username`), password
  8–128 chars (400 `invalid_password`), uniqueness (400 `username_taken`).
  Creates the user (see §5), applies referral flow (§7.5), awards 2,500 signup
  bonus (kind `signup`), syncs tasks, broadcasts SSE `signup`, sets session
  cookie. → 201 `{user}`.
- `POST /api/auth/login` `{username, password}` — sensitive limit → 200
  `{user}` + cookie, or 400 `invalid_credentials` (with 250 ms delay).
- `POST /api/auth/logout` → `{ok:true}` + cleared cookie.

### Profiles
- `GET /api/profiles?q=&category=` — search matches name+tagline+tags
  (case-insensitive substring, q cleaned max 40); category sanitized; sorted by
  `boostTotal` desc, name asc. → `{profiles:[publicProfile…], categories:[6],
  total}`.
- `GET /api/profiles/:slug` — lookup by slug **or** id; 404 `not_found`.
  Response profile gets `isMineProfile` (true when requester created it) and
  `selfBoostMultiplier` (1 or 1.5).
- `POST /api/profiles` (auth) `{name, slug, category, emoji?, tagline?,
  description?, tags?}` — general limit. Field caps: name ≤24, slug slug-regex,
  tagline ≤60, description ≤400 (newlines ok), tags ≤6 × ≤20 chars, emoji via
  avatar sanitizer (fallback ⭐). Errors: 400 `invalid_profile_fields`;
  400 `one_profile_per_user` (one community profile per user); 400 `slug_taken`.
  Defaults: tagline `` `${name} — fan-made page` ``, description
  `'Fan-created profile. Boost to show love!'`. Creates profile (§5), sets
  `user.createdProfileSlug`, broadcasts SSE `profile_new` → 201
  `{profile, ok:true}`.

### Social
- `GET /api/leaderboard` → `{season:{id, endsAt}, prizes:{RANK_1:50000,
  RANK_2:25000, RANK_3:10000}, top:[≤10 × {id, username, displayName, avatar,
  points, boostCount}]}` sorted points desc, username asc.
- `GET /api/feed` → `{boosts:[last 40 reversed × {id, username, avatar,
  profileSlug, profileName, profileEmoji, amount, value, selfBoost, at}]}`.

### Economy
- `POST /api/boost` (auth) `{slug|profileSlug, amount}` — boost limit. 404
  `not_found`; 400 `invalid_amount`; then `applyBoost` (§7.4) — 429 `cooldown`
  (+waitMs), 400 `min_boost`/`insufficient_coins`. Success broadcasts SSE
  `boost`, sends the booster a `user` SSE wallet update → `{ok:true, boost,
  value, selfBoost, balance, profileBoostTotal, profileBoostCount}`.
- `POST /api/daily-claim` (auth) — sensitive limit. See §7.2. Success sends
  `user` SSE (wallet+streak) + broadcasts `claim {kind:'daily'}` →
  `{reward, streak, nextReward, balance, user}`.
- `POST /api/lucky-drop` (auth) — sensitive limit. See §7.3 →
  `{reward, nextInMs: 10800000, balance}`.
- `POST /api/tasks/:id/claim` (auth) — general limit → `{ok:true, reward,
  balance, task:{id, claimed:true}}` or 400 `task_not_found|locked|
  already_claimed|not_done` (404 for unknown id).

### Referrals
- `POST /api/referral/share` (auth) — general limit. First call stamps
  `codeSharedAt`, syncs t08, sends `user` SSE. → `{code, shared:true}`.
- `GET /api/referrals` (auth) → `{code, codeShared, referrals[], 
  lifetimeMatchEarned, matchPercentage:10}`.

### Claim/verify (legal)
- `POST /api/profiles/:slug/claim` (auth) `{evidence?}` — sensitive limit.
  Only seeded profiles (400 `only_seeded_fan_profiles_can_be_claimed`);
  400 `already_claimed` if another user owns it; duplicate submissions return
  `{ok:true, status:'pending', note:'already_submitted'}`. Creates
  `claimRequests` entry (evidence ≤500 chars, default `'No evidence provided.'`),
  broadcasts `claim_request` → `{ok:true, status:'pending', claim}`.

### Donations (strictly non-reward)
- `GET /api/donations/methods` → `{methods:[{id:'upi',label:'UPI',
  handle:'grinbid@upi',cool:'🎟️'}, {id:'paypal',label:'PayPal',handle:'grinbid',
  cool:'🅿️'}, {id:'bmac',label:'Buy Me a Coffee',handle:'grinbid',cool:'☕'},
  {id:'razorpay',label:'Razorpay',handle:'https://razorpay.me/@grinbid',
  cool:'💳'}], minAmount:10, maxAmount:100000, zeroReward:true, notice:
  'Donations are voluntary contributions to keep Grinbid running. They NEVER
  grant coins, boosts, ranks or perks of any kind.'}`
- `POST /api/donations` (auth) `{method, amount, note?}` — sensitive limit.
  method ∈ {upi,paypal,bmac,razorpay}; note ≤200. Records an **intent only**
  (`grantsCoins:false`), broadcasts SSE `donation` → `{ok:true, intent,
  coinsAwarded:0, message:'Thanks for keeping Grinbid alive! No coins were
  awarded — donations are 100% non-reward.'}`.

### Admin (`gb_admin` cookie required, else 401 `admin_required`)
- `POST /api/admin/login` `{password}` — sensitive limit; wrong → 300 ms delay +
  400 `invalid_credentials`; right → sets 2 h admin cookie `{ok:true, admin:true}`.
- `GET /api/admin/overview` → `{users, activeToday (claimed daily today),
  profiles, boosts, coinsFloating (Σ coins), season, openClaimRequests, funding
  (Σ donation intents), sseClients}`.
- `POST /api/admin/announce` `{message ≤280}` → broadcasts SSE `announce`.
  Empty → 400 `empty_message`.
- `POST /api/admin/notify` `{userId, message ≤280}` → pushes a notification to
  the user + targeted SSE `announce`. Bad input → 400 `bad_notify`; unknown user
  → 404 `user_not_found`.
- `POST /api/admin/season/settle` → `settleSeason(force=true)`; broadcasts SSE
  `season` with the payout.
- `GET /api/admin/claim-requests` → `{requests:[pending × {profileSlug,
  profileName, id, userId, username, at, status, evidence, decidedAt}]}`.
- `POST /api/admin/claim-request` `{slug, requestId, approve}` — approve: sets
  `profile.claimedBy`, `verified:true`, `verifiedAt`, request `approved`,
  notifies claimant (`🎉 You now power <name>!`), targeted SSE; reject: request
  `rejected` + targeted SSE. Broadcasts `claim_updated`.
- `GET /api/admin/users` → `{users:[{id, username, coins, seasonPoints, boosts,
  createdAt}]}` sorted by seasonPoints desc.
- `POST /api/admin/reset` — replaces the ENTIRE live state object with a fresh
  `createSeedState()` (delete all keys, assign fresh), broadcasts
  `admin_reset` → `{ok:true, message:'Database reseeded. All users/profiles
  replaced.'}`.

### Realtime
- `GET /api/stream` — SSE (see §13). Identifies the user from the session
  cookie to allow targeted messages; unsubscribes on connection close.

---

## 13. SSE hub & event protocol

`src/sse.js` — `SseHub` class. Map of clients `{id: uuid, res, userId, send}`.

- Subscribe writes headers: `Content-Type: text/event-stream; charset=utf-8`,
  `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`,
  `X-Accel-Buffering: no`, `Access-Control-Allow-Origin: *`, then
  `retry: 3000\n\n`, broadcasts a `presence` event with the new count, and sends
  the subscriber a `hello` snapshot `{online, revision: history.length,
  serverTime}`.
- Message framing: `event: <name>\ndata: <json>\n\n`.
- Keep-alive `ping` `{t: Date.now()}` every **25 s** (timer unref'd).
- Every non-ping/non-hello event is remembered in a ring history (max 200) —
  used only for the `revision` counter.
- `broadcast(event, data)` → all clients; `toUser(userId, event, data)` → only
  clients subscribed with that userId; `remove(id)` ends the response and
  broadcasts new `presence`.

**Event catalogue** (producers):

| Event | Payload | Emitted by |
|---|---|---|
| `hello` | `{online, revision, serverTime}` | subscribe |
| `ping` | `{t}` | every 25 s |
| `presence` | `{online, clientId?}` | subscribe/unsubscribe |
| `signup` | `{username, avatar}` | signup |
| `user` | varies: `{got:{id}}`, `{wallet:{coins,seasonPoints}, streak?, task?}` | auth/economy actions for that user |
| `boost` | `{profileSlug, profileName, profileEmoji, username, avatar, amount, value, selfBoost, boostTotal, at}` | boost |
| `claim` | `{username, avatar, amount, kind:'daily'|'lucky'}` | daily claim / lucky drop |
| `profile_new` | `{slug, name, emoji, category}` | profile create |
| `claim_request` | `{profileSlug, username, status:'pending'}` | claim submitted |
| `claim_updated` | `{profileSlug, status, verified}` | admin decision |
| `season` | `{settled:true, payout}` | season settle |
| `donation` | `{username, method, amount, grantsCoins:false}` | donate |
| `announce` | `{message, at}` | admin broadcast / notify |
| `admin_reset` | `{at}` | admin reset |
| `shutdown` | `{bye:true}` | server shutdown |

On shutdown the server writes `shutdown` to every client before flushing the DB.

---

## 14. Persistence engine (JsonStore)

`src/store.js` — class `JsonStore({file?, createSeed?, debounceMs?})`.

- **init():** mkdir -p dir; read file; JSON.parse; validate it "looks like a
  Grinbid db" (`users` plain object + `tasks` array) else treat as corrupt.
  - ENOENT → seed via `createSeed()`.
  - Corrupt/unreadable → copy to `db.json.corrupt-<Date.now()>`, keep only the 3
    newest such backups, then reseed (never crash).
  - Finally `flush()` once.
- **mutate(mutator):** throw if uninitialized; run mutator synchronously on the
  live state; mark dirty; schedule debounced flush (150 ms default, timer
  reset on each mutation, unref'd). Flush errors are stored on `lastError`,
  never thrown into the request path.
- **flush():** cancels the timer; if no write in flight, start
  `_doWrite()`; concurrent callers share the same promise; slot freed on
  completion so a later flush writes the newest state. Idempotent.
- **_doWrite():** skip when clean and file exists. Serialize the whole state
  (`JSON.stringify(state, null, 2)`); write to `<file>.tmp` (mode 0o644);
  `fh.sync()` (fsync); close; `rename(tmp, file)`; best-effort directory fsync
  (open dir, sync). On success `dirty=false`, `_flushes++`. On error keep
  `dirty=true` so the next flush retries.
- **close():** flush if dirty or file missing; returns flush count.
- Exposes `state` (live object) and `flushes` counter (used by tests).

---

## 15. Server bootstrap & lifecycle

### `src/app.js` — `createApp(opts?)`
1. `mkdir -p DATA_DIR`.
2. `new JsonStore({file: opts.dbFile, createSeed: createSeedState,
   debounceMs: opts.debounceMs}).init()` → state.
3. `state.meta.bootCount += 1`; run `maybeAutoSettleSeason` (log if it settled);
   `await store.flush()`.
4. Create `SseHub` (assign `sse.state = state` in buildRouter) and
   `buildRouter(state, sse)`.
5. `http.createServer`: per response set headers
   `X-Powered-By: Grinbid (100% free virtual coins)`,
   `X-Frame-Options: SAMEORIGIN`,
   `Referrer-Policy: strict-origin-when-cross-origin`,
   `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
   Then `maybeAutoSettleSeason(state)` (cheap auto-settle check) and
   `router.dispatch(req, res)`. Catch: RouteError → JSON status body; other →
   log + 500 `internal_error` (destroy socket if headers already sent).
6. Shutdown (guarded against re-entry): on SIGINT/SIGTERM log
   `<signal> — flushing database…`, write SSE `shutdown` to all clients,
   `store.close()`, `server.close(() => process.exit(0))`, hard-exit fallback
   after 1.5 s.
7. Return `{server, store, sse, state, shutdown}`.

### `listen(app, port, host)` — promise resolving with `server.address()`.

### `server.js`
Bootstrap: `createApp()` → `listen(app, CONFIG.PORT, CONFIG.HOST)` → print:
```
\n  🎪  Grinbid — Bid. Back. Rank up.
  💰  100% free virtual coins. Zero npm dependencies.
  🖥️   http://<addr>:<port>/
  📜  /terms  ·  /privacy  ·  /api/health  ·  /api/stream (SSE)\n
```
Fatal boot errors → log + `process.exit(1)`.

---

## 16. Frontend — SPA shell

### `public/index.html` (reproduce structure)
- `<html lang="en">`; viewport `width=device-width, initial-scale=1.0,
  viewport-fit=cover`; `theme-color #fff8f0`.
- Title: `Grinbid — Bid. Back. Rank up.`
- Meta description: `Grinbid: a 100% free virtual-coin fan-boost game. No real
  money, no purchases, no pay-to-win. Bid. Back. Rank up.`
- Favicon: inline SVG data URL rendering 🎪 at 90px.
- `<noscript>` fallback card: "🎪 Grinbid needs JavaScript … Coins are 100% free
  virtual coins with zero cash value."
- `<div id="app">` containing warm-up markup:
  `<p class="center" style="padding:80px 0"><span class="spinner">🎡</span>
  Warming up the carnival…</p>`
- Loads `/app.js` (deferred by placement at end of body).

### `public/manifest.webmanifest`
```json
{ "name": "Grinbid — Bid. Back. Rank up.", "short_name": "Grinbid",
  "description": "A 100% free virtual-coin fan-boost game. No real money, ever.",
  "start_url": "/", "display": "standalone", "background_color": "#fff8f0",
  "theme_color": "#ff4fa3", "icons": [] }
```

### `public/robots.txt`
```
User-agent: *
Allow: /
Disallow: /api/
```

### SPA core (`public/app.js`) — single IIFE, `'use strict'`

**Helpers:** `$`/`$$` (querySelector[All]), `esc()` (HTML-escape &<>"'),
`fmt(n)` = `Number.toLocaleString('en-IN')`, `timeAgo(iso)` → "just now" /
"Nm ago" / "Nh ago" / "Nd ago".

**State `S`:** `{me, profiles, feed, online, current (routeKey), query, navOpen,
sseTimer, sseClosed}`. A global `window.GB = {…}` exposes every handler for
inline `onclick` attributes: `api, toast, go, openAuth, openBoost, openClaim,
claimDaily, claimLucky, doBoost, refresh, setAvatar, submitAuth, logout,
shareCode, claimTask, donate, createProfile, adminLogin, adminAction, copyText,
toggleNav, closeNav` (+ `closeModal` on window).

**`api(path, opts)`:** `fetch('/api'+path, {method, credentials:'same-origin',
JSON headers})`; parse JSON; on `!res.ok` throw `Error(data.error ||
'http_'+status)` carrying `.status` and `.data`.

**UI atoms:**
- `toast(msg, kind)` — appends to `#toasts`, auto-removes after **4.2 s**;
  kinds: default (dark), `good` (green), `bad` (red).
- `modal(html, {noClose})` — overlay `.modal-back` + `.modal` card with ✕ close
  button; click-outside closes (unless noClose).
- `confetti(burst=120)` — canvas particle burst: colors `['#ff4fa3','#ff9f1c',
  '#ffd23f','#3ddc97','#4cc9f0','#9b5de5','#ef476f']`, gravity 0.32, 18% of
  particles are ✨ emoji, runs 140 frames then clears.
- `go(hash)` — sets `location.hash`.
- `copyText(text)` — clipboard + toast.

**Constants:**
- `AVATARS` (20 emoji, also used for profile-emoji picker):
  `😀 😎 🤓 🦊 🐱 🐶 🦄 🐸 🐙 👻 🤖 🐹 🎤 🎸 🍕 🍩 🌈 ⚡ ⭐ 🍀`
- `CATS`: `celebrity→Celebrity/pink, influencer→Influencer/sky,
  estate→Estate/mint, venue→Venue/orange, brand→Brand/purple,
  community→Community/yellow`.

**Shell:** `shellHTML(view)` renders `#app` = header + `<main class="wrap view"
id="view">` + footer + `#toasts` + `<canvas id="confetti">`.

**Header (`headerHTML`):** sticky topbar; logo pill (yellow, 🎪 + "Grinbid",
links `#/home`); hamburger `☰/✕` (mobile); nav links: Home, Discover, Tasks,
Wallet, Refer, Create, **My page** (only logged in), Donate, Admin. When logged
in: streak pill `🔥 <n>`, wallet pill `🪙 <coins>` (click → `#/wallet`), avatar
chip. When logged out: pink `Sign up · +2,500` button, ghost `Log in` button,
sticker `🟢 <N> online`. Active nav link gets class `on`. `refreshHeader()`
re-renders the header in place.

**Footer:** "🎪 Grinbid — Bid. Back. Rank up." · links: Terms (`#/terms`),
Privacy (`#/privacy`), Legal modal. Disclaimer paragraph: coins are free virtual
coins with zero cash value; donations voluntary & non-reward; seeded profiles
are fan-created and unaffiliated. Copyright line: `© <year> Grinbid · Made with
🍭 and zero npm dependencies.`

**Routing:** hash-based. `render()` parses `location.hash` → route key
(e.g. `home`, `profile/<slug>`), parses query string into `S.query`. Unknown
routes → home. On `hashchange` → `render({nav:true})`.

**Non-destructive rendering (important UX contract):** a render sequence counter
guards races; the loading spinner (`🎡 Loading…`) is shown **only** on first
paint or a real route change; refreshes of the current route keep the existing
DOM until fresh data arrives (no flash), and scroll position is preserved.
`debounceRender()` (700 ms) is triggered by SSE events, and **defers
indefinitely while the user is typing** in an INPUT/TEXTAREA/SELECT inside the
view. Navigations scroll to top.

---

## 17. Frontend — design system (CSS)

Theme name: **"playful pop"** — carnival/sticker aesthetic: cream paper
background with soft color blobs, white cards with chunky dark borders, hard
offset shadows, rounded corners, rotated sticker badges, emoji avatars,
confetti on wins.

### CSS custom properties (`:root`) — exact values
```css
--ink: #23123d;          /* near-black purple, all text/borders */
--paper: #fff8f0;        /* cream page background */
--card: #ffffff;
--pink: #ff4fa3;
--orange: #ff9f1c;
--yellow: #ffd23f;
--mint: #3ddc97;
--sky: #4cc9f0;
--purple: #9b5de5;
--red: #ef476f;
--line: #23123d;
--line-w: 3px;           /* chunky border width */
--radius: 22px;
--shadow: 6px 6px 0 rgba(35, 18, 61, 0.16);   /* hard offset shadow */
--font: 'Baloo 2', 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif;
```

### Base look
- `body` background = 4 radial-gradient color blobs (pink 12%/8%, sky 88%/12%,
  yellow 80%/88%, purple 10%/90%, each ~8–10 rem, low alpha) over `--paper`.
- `.wrap` max-width **1080px**, auto margins.
- Buttons `.btn`: bold 800, yellow bg, 3px ink border, radius 16px, hard 4px
  shadow; hover translates -1px,-1px with bigger shadow; active translates
  3px,3px (pressed feel). Variants `.pink .sky .mint .purple` (white text on
  pink/purple), `.ghost` (transparent), `.big`, `.small`.
- Cards `.card`: white, 3px border, radius 22px, offset shadow, 20px padding.
  `.card.hero`: pink→purple→sky 135° gradient, white text, giant rotated 🎪
  watermark bottom-right, h1 `clamp(1.9rem, 4vw, 3rem)`.
- `.sticker`: tiny uppercase pill, 2px border, rotated -2deg with mini shadow;
  variants `.fan` (yellow), `.seed` (sky), `.verified` (mint), `.self`
  (pink/white).
- `.boost-meter`: 14px pill track with `pink→orange→yellow` gradient fill.
- `.notice`: bordered callout; `.legal` sky, `.donate` orange, `.danger` red.
- `.stat` / `.stripe`: stat card grid (`auto-fit minmax(160px,1fr)`), big
  number + uppercase label.
- `.task` rows: bordered; `.done` green-tinted border `#1c9e6a`; `.claimed`
  opacity .6; `.locked` grayscale .8 + opacity .55.
- Inputs: 3px border, radius 14px, white; focus = 3px sky outline.
- `.emoji-picker`: 8-col grid (5 cols ≤620px) of emoji buttons; `.sel` pink.
- `.amount-chips`: white bordered buttons; `.sel` mint.
- Toasts: fixed top-right (bottom-docked on phones), dark `--ink` bg; `.good`
  `#0f9158`; `.bad` `#c92c52`; `pop-in` animation.
- Modal: fixed overlay `rgba(35,18,61,.45)`, paper card radius 24px, 10px
  offset shadow, max 560px/88vh scrollable, ✕ button.
- `.list-row`: flex row, dashed 2px bottom divider until last child.
- `.grid`: `repeat(auto-fill, minmax(min(100%, 250px), 1fr))` gap 18px.
- `.two-col`: 2-col grid → 1 col ≤760px.
- Footer: dark `--ink` band, yellow links.
- `.spinner` 🎡 rotate 1s; `#confetti` fixed inset canvas z-100 pointer-events
  none; `.countdown` tabular-nums.

### Responsive breakpoints
- **≤880px:** hamburger appears (`display:none` above); nav collapses to a
  vertical dropdown under the header (dashed top border, full-width bordered
  links); account cluster wraps to its own line.
- **≤620px:** tighter padding; hero CTA full width; toasts dock to the bottom
  (`left:10px; right:10px`); referral code uses `clamp()` + `overflow-wrap`;
  footer stacks; emoji-picker 5 cols; task rows wrap.
- **≤380px:** smaller logo; streak pill hidden (still on Wallet); 38px avatar.
- Mobile-hardening: `-webkit-text-size-adjust:100%`, `overflow-x:clip` on body,
  transparent tap-highlight, 48×46px minimum hamburger touch target.

---

## 18. Frontend — screens & behaviors

Hash routes: `#/home` `#/discover` `#/profile/:slug` `#/wallet` `#/tasks`
`#/refer` `#/create` `#/mine` `#/donate` `#/admin` `#/terms` `#/privacy`.
Query strings supported (e.g. `#/discover?q=..&cat=..`).
Screens requiring auth render a `requireLogin()` card (🔒 Booster access only,
join-free/login buttons).

### Home (`#/home`)
Fetches leaderboard + feed + profiles in parallel. Sections:
1. **Hero card**: stickers `100% free coins` / `no real money`; h1
   "Bid. Back. Rank up. 🎪"; tagline ("Grind the daily streak, grab lucky drops
   and boost your faves into the season podium — all with virtual coins that
   cost nothing."); CTAs — logged in: "🎯 Boost something" + "🪙 My wallet";
   logged out: "🎟️ Join free — get 2,500 coins" + "👀 Browse faves"; small
   print about virtual coins.
2. **Stat stripe**: 🪙 2,500 Signup bonus · 🔥 500+ Daily claim · 🍀 250–2,500
   Lucky drop · 👥 10% Lifetime match.
3. **Two columns**: 🏆 Season leaderboard (top-10 rows with 🥇🥈🥉, avatar,
   name/@user, points; "(ends <date>)") and ⚡ Live boost feed (8 latest:
   "<user> boosted <emoji name>", "amount coins → value pts", self-boost
   sticker, timeAgo).
4. **💖 Trending fan pages** — top-6 profile cards + "See all →".

### Profile card component (used Home/Discover)
Emoji tile, category badge, `fan-made` (seed) or `community` sticker, optional
`🟢 verified`; name; tagline; boost-meter fill width =
`min(100, log10(1+boostTotal)*20)` %; footer "🪙 <boostTotal> boosted ·
👥 <fanCount> fans". Card is an `<a>` to `#/profile/<slug>`; hover lifts and
tilts -0.4deg.

### Discover (`#/discover`)
Search input (Enter triggers), category `<select>` (All + 6), Search button.
Sky-blue legal notice: pages are fan-created tributes, not affiliated; owners
can claim; badge flips to 🟢 when verified. Grid of profile cards; empty state
"Nothing matches. Try another search!".

### Profile detail (`#/profile/:slug`)
Back link; card with big emoji, name, category badge, `fan-made · not
affiliated` sticker (seeded), `🟢 verified owner` (if claimed), attribution
line — `you created this 🎪` sticker OR `created by @<user>` OR "community
page", plus creation date; right side: 🪙 boostTotal, "N boosts · N fans";
description; #tag stickers. Two columns: **🚀 Back this fave** (legal explainer:
spend 50+ 🪙 never real money, 1 pt/coin, ×1.5 note; big pink Boost button or
signup prompt; 2-second-cooldown note) and **⚡ Recent boosts** (8 rows).
Seeded profiles get an extra card: **🏛️ Own this? Verify & claim it.** with a
purple "Claim page" button.

### Boost modal (`openBoost(slug)`)
Chips **50 / 100 / 250 / 500 / 1000**, custom amount input (min 50, step 10),
live preview: "Spending <amt> 🪙 → page gets <amt×mult> pts (×1.5 self-boost
💖 if own page). Your balance: <coins> 🪙". Big pink "🚀 Boost now". Errors
mapped to friendly toasts (cooldown shows remaining seconds, min-boost,
insufficient-coins → "claim your daily streak and lucky drops!",
rate_limited → "Too fast! Take a breath. 😮‍💨"). Success: toast "+<value> pts",
confetti, re-render.

### Wallet (`#/wallet`) — auth
Stat stripe: Coins / Season pts / 🔥 Streak / Tasks done. Yellow legal notice
(zero cash value…). Two columns:
- **📅 Daily claim**: if claimed today → "Come back tomorrow 🔥" + next reward
  preview; else "Streak <n> → <reward> coins" + mint "🎁 Claim free coins"
  button. Caption: "+500 base, +150 per streak day, capped at +2,000/day."
- **🍀 Lucky drop**: explanation + **live countdown** (`Xh Ym Zs`, tabular
  nums; flips to "🍀 READY!" and enables the orange "💎 Open drop" button).
Below: 🧾 History — the user's transactions (last 60, newest first) with +/−
coloring and timeAgo.

### Tasks (`#/tasks`) — auth
Header "🎯 Task checklist (n/16 done)"; notice "Complete tasks to earn bonus
virtual coins. No purchase, no pay-to-win — ever."; 16 rows: emoji tile (🔒 if
locked), title, desc, reward "🪙 +<n>", state: `done ✓` verified sticker /
green **Claim** button / `…`. Claiming toasts + confetti.

### Refer (`#/refer`) — auth
Left card: big referral code, 📋 Copy + 📣 "Mark as shared" buttons; explainer
"You get 1,000 coins, they get 500, and you earn 10% of every coin they earn —
forever (lifetime match). Referrals are checked for bot abuse: self-referrals
and same-IP signups are flagged and reviewed." Right card: squad list (status
icons 🟢 active / 🟡 pending review (same-IP check) / ⚪ pending, earned coins)
+ lifetime match total.

### Create (`#/create`) — auth
Yellow legal notice: one community profile per user; fan-created, not an
official endorsement; own-page boosts get ×1.5. Form: Name* (≤24), Slug* (≤40),
Category select, Emoji badge picker (20 avatars), Tagline (≤60), Description
textarea (≤400), Tags comma-separated (max 6). Purple "🎪 Create fan page".
Errors: `one_profile_per_user` → "You already created your one profile!".
Success: toast + confetti + navigate to the new profile.

### My page (`#/mine`) — auth
If no profile: empty-state card (🏷️, "You haven't created a page yet", CTA to
Create, ×1.5 explainer). If exists: profile card with `created by you 🎪`
sticker + creation date, stats, description, tags, two buttons: "🔥 Boost my
page (×1.5)" and "👀 View page". Mint notice about ×1.5 + zero cash value.

### Donate (`#/donate`)
Orange notice: donations voluntary, 100% non-reward, no coins/boosts/ranks/
perks — keeps the leaderboard fair; coins can never be bought. Card: method
buttons (UPI pink, others ghost), amount input (min/max from API, default 100),
note (≤200), orange "💸 I'm donating — no coins please". Footer line lists all
handles. Caption: only records intent — no payment is taken by Grinbid.

### Admin (`#/admin`)
Without session: password form (purple). With session:
- Stat stripe: Users / Boosts / Coins in economy / Open claims.
- 📣 Broadcast (SSE announce) and 🔔 Message a user (id + message) cards.
- 🏆 Season card: id, end date, prizes 50,000/25,000/10,000, orange
  "Force settle now" (toast lists payouts).
- 🏛️ Claim requests queue (loaded async): each pending request shows profile,
  submitter, evidence, timeAgo, ✓ Approve / ✕ Reject buttons.
- 🧾 Funding intents card (total on record, "No coins are ever granted for
  donations").

### Legal modal & views
Footer "Legal modal" opens an in-SPA modal with short Terms (6 numbered points:
virtual coins zero cash value; cannot be purchased/sold/redeemed, no
microtransactions/Stripe/pay-to-win; boosts are virtual expressions, nothing
wagered; donations non-reward; seeded profiles fan-created & unaffiliated;
13+, be kind, no bots/spam/self-referrals/fake claims) or Privacy (5 points:
stored data list incl. salted scrypt hash + IP hash; never sell/ads/share;
HttpOnly cookie sessions 7 days; referral anti-bot review; deletion via admin).
`#/terms` and `#/privacy` render the same content as full SPA pages inside a
760px `.legal-page` card. Standalone `/terms` & `/privacy` HTML pages exist too
(§20).

---

## 19. Frontend — SSE client

`connectSSE()` opens `EventSource('/api/stream')` (stored on `S.es`).

| Event | Client behavior |
|---|---|
| `hello` / `presence` | update `S.online`, re-render header (🟢 N online sticker) |
| `ping` | ignored (keep-alive) |
| `boost` | toast `🔥 <user> boosted <name> (+<value> pts)`; debounce-render on home/discover/mine |
| `claim` | toast — lucky: `🍀 <user> hit a lucky drop (+<n> coins)!`; daily: `🎁 <user> claimed the daily (+<n> coins)!`; re-render home |
| `announce` | good toast `📣 <message>`; re-render admin |
| `profile_new` | good toast `✨ New fan page: <name>!`; re-render discover/home/mine |
| `claim_request` | re-render admin |
| `claim_updated` | re-render admin + open profile |
| `season` | toast `🏆 Season settled!`; re-render admin/home |
| `donation` | toast `💝 <user> made a non-reward donation!` |
| `admin_reset` | bad toast "Database reseeded by admin"; refresh + render |
| `user` | refresh `/api/me` and header (wallet/streak sync) |
| `shutdown` | close the EventSource |

Reconnect: on error, retry after `2500 + random*2000` ms (guard flag prevents
stacking). Debounced renders never fire while typing (see §16).

---

## 20. Legal & safety requirements

Baked into every layer — a rebuild **must** reproduce these:

1. **Coins are free virtual coins.** Disclaimers appear: signup modal, hero
   small print, wallet notice, footer, boost modal, donate screen, /api/health
   (`free:true`), donation API (`zeroReward:true`).
2. **No purchases / no pay-to-win / no payment processors for coins.**
3. **Fan-created disclaimer + claim modal** on every seeded profile; real owners
   submit evidence; admin approves → `verified:true` + 🟢 badge.
4. **Donations are voluntary and non-reward** (UPI / PayPal / Buy Me a Coffee /
   Razorpay); recorded as intents only; `coinsAwarded: 0` always.
5. **Abuse guards:** 2 s boost cooldown, per-IP token buckets (3 tiers),
   sanitization everywhere, one community profile per user, anti-bot referral
   validation (regex, self-referral rejection, per-day caps, same-IP flagging).
6. **Privacy:** salted scrypt hashes only, hashed IPs (16 hex chars), no ads,
   no trackers, no third-party requests, no emails/phones. Privacy page details
   deletion via admin.

### Standalone legal pages
- `public/terms.html` — "📜 Terms of Grinbid", sections: 1 Virtual coins only —
  zero cash value (not currency/gambling, cannot be redeemed/exchanged/refunded/
  sold); 2 No real-money purchases (no microtransactions, no pay-to-win, any
  payment page is a voluntary donation); 3 Boosts and rankings (rankings measure
  enthusiasm, never spending power); 4 Donations are non-reward; 5 Fan-created
  profiles; 6 Fair play and abuse (13+, no bots/scripted signups/self-referrals/
  mass accounts/harassment/spam/fraudulent claims; flagged referrals held for
  review; suspensions possible); 7 Changes (numbers may change; real-money
  purchases will never be introduced). Ends with a sky notice: "🪙 Coin
  reminder: virtual, free, zero cash value, no redemption."
- `public/privacy.html` — "🕵️ Privacy & Safety": 1 What we store (username,
  display name, emoji avatar, salted scrypt hash, game data, hashed IP — never
  raw IP); 2 What we don't do (no selling/sharing, no trackers/pixels/
  fingerprinting, no payments hence no payment data, no scraping, no email/
  phone); 3 Sessions (HttpOnly HMAC cookie, 7-day expiry); 4 Referral anti-bot
  review; 5 Data removal (contact admin); 6 Safety (no gambling/loot boxes/
  investment). Ends with a sky notice about minimal collection.
- Both use `styles.css`, `meta robots noindex`, link back to `/`, and are also
  served at `/terms` and `/privacy`.

---

## 21. Tests

`node --test` discovers `test/*.test.js`. All tests create ephemeral tmp dirs
(`fs.mkdtempSync(os.tmpdir()/grinbid-*)`) and never touch the real `data/`.

- **`economy.test.js`** — pure math: daily reward curve (base 500, +150/day,
  cap 2000), dayKey/isYesterday, lucky drop bounds & 3-hour window, boost value
  ×1/×1.5 + min + cooldown, referral code format & match 10%, referral
  validation statuses, awardCoins/referral match flow, task unlock/claim logic,
  season ranking + settlement + point reset.
- **`store.test.js`** — JsonStore: persists via atomic rename (no `.tmp`
  litter) and reloads; debounce coalescing; corrupt-file backup + reseed;
  `flushes` counter; rate limiter refill/burst behavior; SSE hub broadcast /
  toUser targeting.
- **`http.test.js`** — end-to-end over a real ephemeral server (port 0):
  `/api/health` advertises 2500 free coins; signup bonus & t01 done; login /
  logout / unauthorized cases; profile create (one-per-user, slug taken);
  boost flow incl. cooldown 429 + min-boost 400 + insufficient coins; daily
  claim + 409 double claim; lucky drop + 429 not ready; task claim; referral
  signup bonuses + match; leaderboard/feed shapes; claim request + admin
  approve → verified; admin login/overview/announce/settle/reset; SSE stream
  handshake (`text/event-stream`); legal pages served at /terms & /privacy;
  SPA fallback route.

Use `test/http.test.js` patterns for your rebuild: `signup()` helper extracting
`Set-Cookie` (first `;`-segment) and reusing it via `headers: {cookie}`.

---

## 22. Audit tooling

- **`scripts/check-syntax.js`** — 3 checkpoints: (1) package.json has **zero**
  deps (fail listing any); (2) `node --check` on every `.js` under the repo
  (skipping dot-dirs, `node_modules`, `test`, `scripts`); (3) `npm start`
  script exists. Prints `CHECK-PASS:` / `CHECK-FAIL:` and exits accordingly.
- **`scripts/audit-loop.js [N=20]`** — the **20-consecutive-pass loop**. Each
  pass: `npm run check` → `node --test` → boots a live ephemeral server and
  smoke-checks the 9 SPA screens + legal views + `/api/stream`. Any failure
  resets the streak to 0; the loop exits only after N flawless passes.
- **`scripts/reset-data.js`** — removes `data/db.json` and `data/db.json.tmp`;
  next boot reseeds.

---

## 23. Deployment

### Render (one-click)
`render.yaml`: web service, runtime `node`, plan `free`, region frankfurt,
`buildCommand: npm install` (no-op), `startCommand: node server.js`,
`healthCheckPath: /api/health`, autoDeploy true; env vars: `NODE_VERSION=22`,
`ADMIN_PASSWORD: generateValue: true`, `SESSION_SECRET: generateValue: true`.
Note: Render free disk is ephemeral → `data/db.json` reseeds each deploy; the
app recovers automatically (corrupt/missing → backup + reseed).

### Oracle Cloud Always Free (ARM VM)
`deploy/oracle/setup.sh` — one-shot: installs Node 22 (ARM64-aware), clones the
repo to `/opt/grinbid`, creates a systemd unit (restart + enable on boot),
keep-alive cron (so Oracle doesn't reclaim the idle instance), log rotation;
open port 3000 in the VCN security list afterwards. Always override
`ADMIN_PASSWORD` before going public.

### Optional static demo (`demo/`)
A fully client-side twin: `index.html` + `demo-data.js` (13 pages, 16 tasks,
7 users, 33-boost history) + `demo-api.js` (in-browser mock implementing the
same routes/economy, persisting to `localStorage`) + shared SPA +
`server.js` (optional static file server) + `test-demo.js` (29 assertions) +
`check-wiring.js`. Published to GitHub Pages by `.github/workflows/deploy-demo.yml`.

---

## 24. Environment variables

| Var | Default | Purpose |
|---|---|---|
| `HOST` | `0.0.0.0` | bind address |
| `PORT` | `3000` | listen port |
| `DATA_DIR` | `<ROOT>/data` | database directory |
| `DB_FILE` | `<DATA_DIR>/db.json` | database file |
| `STORE_DEBOUNCE_MS` | `150` | write debounce |
| `ADMIN_PASSWORD` | `grinbid-admin-dev` | admin console password (**change in production**) |
| `SESSION_SECRET` | (auto-generated file `data/.session-secret`) | HMAC key; set on ephemeral hosts so sessions survive redeploys |
| `NODE_ENV` | — | `production` adds `Secure` to cookies |

---

## 25. Acceptance checklist

A rebuild is faithful when ALL of these pass:

- [ ] `npm start` boots with **no install step** on Node ≥ 18 and prints the banner.
- [ ] `npm run check` passes: zero npm dependencies + syntax across all JS.
- [ ] `npm test` passes economy/store/http suites.
- [ ] `npm run audit:loop` completes 20 consecutive flawless passes.
- [ ] Signup grants exactly **2,500** coins; t01 done; confetti fires.
- [ ] Daily claim = 500 + 150×(streak−1), capped 2,000; second same-day claim → 409.
- [ ] Lucky drop ∈ [250, 2500], gated to every 3 h (429 + waitMs before).
- [ ] Boost: min 50, 2 s cooldown (429 + waitMs), ×1.5 on own page, user pays
      `amount`, profile gains `value`, season points gain `value`.
- [ ] Referral code `GB-XXXXXX-YYYY`; +1000/+500 bonuses; 10% lifetime match on
      signup/referral/daily/lucky/task/season earnings; same-IP → pending review;
      self-referral and >20/day rejected.
- [ ] Season settles on boot/request when past endsAt (or admin force): 50k/25k/
      10k to top 3, tie-break earlier createdAt, points reset, season id +1.
- [ ] 16 tasks with staged unlocks; rewards 100→2,000; manual claim required.
- [ ] One community profile per user; profile shows creator attribution + date.
- [ ] Seeded profiles show fan-made badge + claim modal; admin approve → 🟢.
- [ ] All 9 SPA screens + `#/terms` + `#/privacy` render; hamburger works ≤880px;
      toasts dock bottom ≤620px.
- [ ] SSE: live boost/claim/announce toasts, presence counter, wallet sync,
      25 s pings, auto-reconnect.
- [ ] Non-destructive renders: no spinner flash on live refresh; scroll kept;
      typing in forms never interrupted by SSE re-renders.
- [ ] `db.json` writes are atomic (tmp + fsync + rename + dir fsync); corrupt
      file backed up (≤3) and reseeded; SIGTERM flushes.
- [ ] Legal pages at `/terms` & `/privacy`; robots.txt disallows `/api/`.
- [ ] Zero real-money paths; donations always `coinsAwarded: 0`.

---

*End of specification. Coin policy reminder: 🪙 virtual, free, zero cash value,
non-redeemable — never introduce real-money purchases.*
