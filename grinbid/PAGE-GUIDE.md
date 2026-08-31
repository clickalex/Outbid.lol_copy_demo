# Grinbid — Folder structure & page guide

> Two apps live in this repo:
> - **Grinbid** (`grinbid/`) — the live game at <https://grinbid-8h5e.onrender.com> (zero-dependency Node app).
> - **Outbid OS** (repo root) — the pay-to-rank market research site (static).
>
> This guide covers Grinbid first, then the Outbid pages.

---

## 1. Folder structure

### `grinbid/` — the game

```
grinbid/
├── server.js                 # App bootstrap → createApp() → listen on 0.0.0.0:$PORT
├── package.json              # Zero npm deps; scripts: start, dev, check, test, audit, reset
├── render.yaml               # Render blueprint (free plan, Node 22, ADMIN_USERNAMES=alexami)
├── README.md                 # Product overview, run/deploy/admin instructions
├── PROJECT-SPEC.md           # Full implementation-level rebuild spec
├── PAGE-GUIDE.md             # ← this file
│
├── src/                      # Backend (Node built-ins only)
│   ├── config.js             # Every tunable: economy numbers, rate limits, admin, image limits
│   ├── app.js                # createApp(): wires store + SSE + router, serves /public
│   ├── server.js-less boot   # (entry is ../server.js)
│   ├── router.js             # HTTP routing, static file serving, SPA fallback, body size cap
│   ├── api.js                # All /api handlers: auth, profiles, boost, economy, admin, moderation
│   ├── economy.js            # Pure game math: boosts, streaks, drops, referrals, seasons, public views
│   ├── auth.js               # scrypt password hashing, HMAC session cookies
│   ├── sanitize.js           # Input validation/escaping: usernames, email, category('character'…), image data-URL
│   ├── rateLimit.js          # Per-IP token buckets
│   ├── seed.js               # createSeedState() — 16 tasks + EMPTY profiles (board starts fan-built)
│   ├── store.js              # Atomic single-file JSON store (debounced writes, backups)
│   └── sse.js                # Server-Sent Events hub (live boost feed, presence, notifications)
│
├── public/                   # What the server actually serves (the deployed web app)
│   ├── index.html            # SPA shell (#app, loads app.js)
│   ├── app.js                # The SPA: 12 hash-routed screens, modals, SSE client, image resize
│   ├── styles.css            # Carnival theme + profile images + moderation-queue styles
│   ├── manifest.webmanifest  # PWA manifest
│   ├── favicon.ico
│   ├── robots.txt
│   ├── enhance.js            # Static-page polish (skip link, back-to-top, active nav, mobile CTA)
│   ├── about.html            # ┐
│   ├── how-it-works.html     # │
│   ├── rules.html            # │  Static info/legal pages (also reachable in-app)
│   ├── leaderboard.html      # ├─ served directly by the Node app
│   ├── coins.html            # │
│   ├── faq.html              # │
│   ├── terms.html            # │
│   └── privacy.html          # ┘
│
├── *.html + styles.css + enhance.js   # Root COPIES of the static pages (for browsing
│                                       #   inside the Outbid report; redirect index → live app)
├── test/                     # node --test suite
│   ├── economy.test.js       # Pure economy math
│   ├── http.test.js          # Full HTTP integration (signup→approval→boost flow), 19 tests
│   └── store.test.js         # Persistence / SSE / rate-limit
├── scripts/
│   ├── check-syntax.js       # zero-dep + `node --check` audit
│   ├── audit-loop.js         # 20-consecutive-pass audit
│   └── reset-data.js         # Wipe db.json (reseeds empty on next boot)
└── deploy/
    ├── RENDER.md             # Deploy + admin/moderation guide
    ├── ORACLE-MOBILE.md       # Oracle Cloud Always-Free guide
    └── oracle/               # Oracle setup script
```

### Repo root — Outbid OS (static research site)

```
Outbid.lol_copy_demo/
├── index.html                # Report 001: pay-to-rank market audit
├── entry-simulator.html      # Report 001b: should-you-ship simulator
├── ideas.html                # Report 002: websites nobody has built
├── tools.html                # Decision-tools hub
├── search.html               # Site search
├── idea-picker.html          # Constraint-based idea picker
├── compare.html              # Side-by-side idea comparison
├── mvp-builder.html          # MVP spec builder
├── launch-copy-generator.html
├── name-generator.html
├── revenue-calculator.html
├── fees.html                 # Payment-fee maths
├── build-plan.html           # 7-day build plan
├── launch-checklist.html
├── legal-checklist.html      # India legal/launch checklist
├── changelog.html
├── about.html
├── assets/                   # nav.css (responsive nav), os.css (theme), site-enhancements.js
├── data/                     # Bot-maintained inventory CSV/JSON (the market data)
├── docs/                     # Level-0 launch paperwork + workflows
├── scripts/                  # update_report.py bot + audit scripts
├── render.yaml               # Blueprint that deploys grinbid/ from this repo
└── grinbid/                  # the game (above)
```

---

## 2. Grinbid pages — sections in order

### A. Static info pages (`public/*.html`, root copies mirrored)

**`about.html` — About Grinbid 🎪**
1. **Hero** — tagline “Made for fun”.
2. **The idea** — what Grinbid is (free fan-boost leaderboard).
3. **What makes it different** — 4 cards: free carnival · fan-first · fair by design · zero dependencies.
4. **Where it runs** — live app link, zero-dependency stack, info pages, docs.
5. **How to play** — “Open Grinbid” button + free signup (2,500 coins).
6. Legal notice strip.

**`how-it-works.html` — How Grinbid works 🎪**
1. **Hero**.
2. **1. Join free** — signup gives 2,500 coins; email is private.
3. **2. Discover fan pages** — 7 categories; unofficial tributes; new pages admin-reviewed.
4. **3. Earn more free coins** — streak, lucky drop, tasks, referrals.
5. **4. Back your faves** — boost 50+ coins = 1 pt each (×1.5 on your own page).
6. **5. Climb the season leaderboard** — weekly top-3 prizes.
7. **6. Own your page (optional)** — create a page or claim one if you’re the real owner.

**`rules.html` — Rules of Grinbid 📜**
1. **Hero** (13+).
2. **Virtual coins only**.
3. **No real-money purchases**.
4. **Boosts and rankings**.
5. **Fan pages are user-made tributes**.
6. **Every page needs admin approval**.
7. **Content rules — keep it a fan tribute** (no impersonation, public figures only, no hate/NSFW, licensed images only, no spam, boost-don’t-attack).
8. **Fair play and abuse** (13+, no bots/referral fraud; takedown/claim path).
9. **Donations** (non-reward).
10. **Changes**.

**`leaderboard.html` — Season leaderboard 🏆**
1. **Hero**.
2. **Season prizes** — 50,000 / 25,000 / 10,000 coins for top 3.
3. **How points work** — boosts = points, ×1.5 self-boost, weekly reset.
4. **Example season table** — rank / prize / who.

**`coins.html` — The coin economy 🪙**
1. **Hero**.
2. **The numbers** — table of all reward values.
3. **How you get coins** — signup, daily, lucky drop, tasks, referrals, season.
4. **How you spend coins** — boost pages (1×, or ×1.5 on your own).
5. **What coins are NOT** — no cash value, can’t buy/sell/redeem.

**`faq.html` — Frequently asked ❓**  (Q&A cards, in order)
1. Is Grinbid free? 2. Are coins real money? 3. Gambling/pay-to-win?
4. How do I get started? 5. What is a boost? 6. Daily streak? 7. Lucky drop?
8. Referrals? 9. Season prizes? 10. Are these official celeb pages?
11. Can I donate? 12. What do you store about me?
13. **Can I make a fan page for a real celeb/character?** 14. **Why is my page not visible yet?**
15. How much does it cost?

**`terms.html` — Terms of Grinbid** — 12 numbered sections:
1. What Grinbid is · 2. Virtual coins (zero cash value) · 3. No purchases / non-reward donations ·
4. Fan pages are user content (tributes) · 5. Content rules (no impersonation/hate/NSFW/infringement) ·
6. You license us your content · 7. Moderation, takedowns & rights-holder claims ·
8. Fair play & abuse · 9. Privacy · 10. Service “as is” · 11. Account deletion · 12. Changes & contact.

**`privacy.html` — Privacy & Safety** — 8 numbered sections:
1. What we store (incl. private email + uploaded photos) · 2. What we don’t do (no selling/trackers) ·
3. Uploaded photos · 4. Cookies & sessions · 5. Referral anti-abuse · 6. Data removal ·
7. Children (13+) · 8. Safety / reporting.

### B. In-app SPA screens (`public/app.js`, hash routes)

| Route | Screen | Sections in order |
|---|---|---|
| `#/home` | **Home** | 1. Hero “Who’s on top? 🏆” + join/browse CTA → 2. **Season leaderboard** (top boosters) → 3. Stat stripe (signup/daily/lucky/referral) → 4. **Fan pages ranked by love** + search & category filter → 5. Live boost feed → 6. “Want a page for YOUR fave?” create CTA. |
| `#/discover` | **Discover** | 1. Search bar + category dropdown → 2. Fan-tribute disclaimer → 3. Full ranked profile grid. |
| `#/profile/:slug` | **Profile detail** | 1. Back link → 2. Header (photo/emoji, real name, page name, category, fan-made/pending/verified badges, creator) → 3. Boost total / fans → 4. Description + tags → 5. **Back this fave** boost panel (×1.5 if yours) → 6. Recent boosts → 7. Claim box (if not verified). |
| `#/wallet` | **My wallet** | 1. Balance → 2. **Daily claim** (streak) → 3. **Lucky drop** (3h) → 4. **History** (transactions). |
| `#/tasks` | **Tasks** | 1. Task checklist (16 tasks, locked/unlocked/claimable rewards). |
| `#/refer` | **Referral squad** | 1. Referral code + share → 2. Your squad list (10% lifetime match). |
| `#/create` | **Create fan page** | 1. Approval/email notice → 2. Form: real person/character · category (incl. **Character**) · page name · slug · **photo upload (auto-resized)** or emoji · tagline · description · tags → 3. “Submit for approval”. |
| `#/mine` | **My page** | 1. Pending/approved/rejected banner (with email note) → 2. Your page card → 3. Boost (×1.5) / view. |
| `#/donate` | **Donate** | Non-reward donation methods (UPI/PayPal/BMC/Razorpay), zero-perks notice. |
| `#/admin` | **Admin dashboard** (hidden; `alexami` only) | 1. Stat stripe (users, boosts, **pages to review**, open claims) → 2. **🧐 Fan pages awaiting approval** queue (photo, creator email, Approve / Needs changes / Preview) → 3. Broadcast → 4. Message a user → 5. Season force-settle → 6. Claim requests (each opens the verification screen) → 7. Funding intents. |
| `#/admin/claims/:slug/:id` | **Claim verification screen** (hidden; admin only) | 1. Request header (id, status, timestamps) → 2. **The fan page being claimed** (photo, category, creator + email, boost stats, live-page link) → 3. **The claimant** (avatar, email, join date, coins, boosts, their other claims) → 4. **Evidence submitted** + competing claims → 5. **Verification checklist & decision** (optional note, Approve = verify 🟢 / Reject). |
| `#/terms` `#/privacy` | Legal | Condensed terms/privacy with link to the full static page. |

**Home page order rationale:** it leads with the **season leaderboard** and the **ranked fan pages** so a visitor instantly sees *who’s on top*, exactly as requested.

---

## 3. Outbid OS pages (root, static)

| Page | Purpose |
|---|---|
| `index.html` | Report 001 — pay-to-rank market audit (live inventory). |
| `entry-simulator.html` | Report 001b — entry odds simulator. |
| `ideas.html` | Report 002 — unbuilt website ideas. |
| `tools.html` | Hub linking all decision tools. |
| `search.html` | Cross-site search. |
| `idea-picker.html`, `compare.html`, `mvp-builder.html` | Pick / compare / spec an idea. |
| `revenue-calculator.html`, `fees.html` | Revenue model & payment-fee maths. |
| `name-generator.html`, `launch-copy-generator.html` | Naming & launch copy. |
| `build-plan.html`, `launch-checklist.html`, `legal-checklist.html` | Ship plan + India legal checklist. |
| `changelog.html`, `about.html` | Project log & author. |

Every Outbid page shares `assets/nav.css` + `assets/site-enhancements.js` (responsive nav, theme toggle, skip link, progress bar, back-to-top) and links to the live Grinbid app.
