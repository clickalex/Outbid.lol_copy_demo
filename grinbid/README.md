# 🎪 Grinbid — Bid. Back. Rank up.

> **Launched copy:** this is the complete **Grinbid** project, placed in its own
> `grinbid/` folder inside this repository. The folder root is a **fully working
> static demo**, so you can open `grinbid/index.html` and play immediately — no
> server, no install, no real money. The full zero-dependency Node app is also
> here (`server.js` + `public/` + `src/`).

**Product:** a playful, **100% free** virtual-coin fan-boost game. Users boost
fan-made pages (celebrities, estates, venues, brands, communities), climb a
weekly season leaderboard, and never spend a single real cent.

Original source: **https://github.com/Kyabtao/grinbid.git**

---

## Quick start

```bash
# Option 1 — static demo (recommended in this repo)
open grinbid/index.html            # or just open it in a browser

# Option 2 — tiny static server
node grinbid/demo-server.js        # → http://localhost:4173

# Option 3 — full zero-dependency Node app (SSE, JSON store, real API)
cd grinbid
node server.js                     # → http://localhost:3000
```

Requirements for the full app: **Node.js ≥ 18**. **There is no `npm install`
step — the repo has zero dependencies.**

The demo is 100% client-side: a mock backend runs in
`grinbid/demo-api.js`, demo data is seeded in `grinbid/demo-data.js`, and all
state lives in `localStorage`. Boosts around every ~10 s are simulated so the
leaderboard feels alive.

---

## Sample data vs. empty seed

The app seeds **12 fan-made profiles** on every fresh boot. When
`SEED_SAMPLE=true` (set in both Render blueprints) it also seeds a **populated
demo dataset**: 7 sample users, 27 boosts across the last two days, 2 claim
requests (one pending, one approved), 2 donation intents and a community page.
Sample users all use password **`demo1234`**. With `SEED_SAMPLE` unset, the app
starts clean with just the 12 fan pages (the default used by the test suite).

## Demo logins

| Account | Password | What it shows |
|---|---|---|
| `demo_fan` | `demo1234` | 8,730 coins · day-4 streak (claim → day 5!) · ready lucky drop · claimable tasks · 2 referrals |
| `pixelpanda` | `demo1234` | owns the *Midnight Mosaic* fan page → try the **×1.5 self-boost** |
| `moonwalker_z` | `demo1234` | top of the season leaderboard |
| Admin console | `grinbid-admin-dev` | stats, broadcast, notify, season settle, claim approve/reject, reseed |

The login modal has one-click buttons for all of these.

---

## What's here

| Path | What it is |
|---|---|
| `grinbid/index.html` | The **working static demo** — opens straight in a browser. All screens, buttons and economy math work. |
| `grinbid/styles.css` | The "playful pop" carnival theme (chunky borders, hard offset shadows, stickers, emoji). |
| `grinbid/app.js` | The SPA: hash routing, 9 screens, modals, confetti, live toasts, cross-tab sync. |
| `grinbid/demo-data.js` | Static demo seed: 13 fan pages, 16 tasks, 7 demo users, 33-boost history. |
| `grinbid/demo-api.js` | In-browser mock backend mirroring the real economy (streaks, drops, ×1.5 self-boosts, 2 s cooldown). |
| `grinbid/check-wiring.js` | Static check that every UI handler / API call resolves. |
| `grinbid/test-demo.js` | Headless test of the mock API (29 assertions). |
| `grinbid/demo-server.js` | Optional tiny static server for the demo (`node grinbid/demo-server.js`). |
| `grinbid/how-it-works.html` | Static info page explaining the Grinbid loop: join → discover → earn → boost → climb. |
| `grinbid/rules.html` | Static rules page: free coins, no pay-to-win, fan-created profiles, fair play. |
| `grinbid/leaderboard.html` | Static season-leaderboard page with the weekly prize structure. |
| `grinbid/coins.html` | Static coin-economy page: earn and spend rules + what coins are not. |
| `grinbid/faq.html` | Static FAQ page answering the common questions. |
| `grinbid/about.html` | Static about page: the idea, what makes Grinbid different, and how to try it. |
| `grinbid/terms.html` | Standalone terms page (also available in-app at `#/terms`). |
| `grinbid/privacy.html` | Standalone privacy page (also available in-app at `#/privacy`). |
| `grinbid/server.js` | Full App bootstrap → `createApp()` → listen on `0.0.0.0:3000`. |
| `grinbid/public/` | The real SPA/legal assets served by the Node app. |
| `grinbid/src/` | Backend source: config, store, economy, auth, rate limit, sanitize, router, API, SSE. |
| `grinbid/test/` | Unit + HTTP integration suites (`npm test`). |
| `grinbid/scripts/` | Zero-dependency syntax audit, 20-pass audit loop, data reset. |
| `grinbid/deploy/` | Render one-click + Oracle Cloud Always-Free guides. |
| `grinbid/render.yaml` | Render blueprint (free plan, Node 22, `/api/health` check). |
| `grinbid/package.json` | Zero npm dependencies; scripts: `start`, `dev`, `check`, `test`, `audit`, `audit:loop`, `reset`. |
| `grinbid/PROJECT-SPEC.md` | The full implementation-level spec of the product. |

---

## The app: screens

Hash-routed SPA: `#/home` · `#/discover` · `#/profile/:slug` · `#/wallet` ·
`#/tasks` · `#/refer` · `#/create` · `#/mine` · `#/donate` · `#/admin` ·
`#/terms` · `#/privacy`.

- **Home** — hero, stat stripe, season leaderboard, live boost feed, trending pages.
- **Discover** — search + category filter, boost meters, fan-made/community/verified badges.
- **Profile** — boost (min 50, 2 s cooldown, ×1.5 on your own page), boosts history, claim/verify.
- **Wallet** — daily streak claim, 3-hour lucky drop, transaction history.
- **Tasks** — 16 tasks with staged unlocks and claimable rewards.
- **Refer** — invite code, squad list, 10% lifetime match.
- **Create** — one community page per user.
- **My page** — your created page + one-tap ×1.5 self-boost.
- **Donate** — strictly non-reward intents only.
- **Admin** — stats, broadcast, notify, season settle, claim queue, reseed.

---

## Game economy

| Mechanic | Value |
|---|---|
| Signup bonus | 2,500 coins |
| Daily claim | 500 base + 150 / streak day, capped at 2,000 |
| Lucky drop | 250–2,500 coins every 3 hours |
| Referrals | referrer +1,000 · referee +500 · **10% lifetime match** on referee earnings |
| Season prizes | 50,000 / 25,000 / 10,000 coins (top 3, weekly auto-settle) |
| Boost | min 50 coins · 1× points normally · **1.5× on your own fan page** · 2 s cooldown |
| Tasks | 16 tasks with staged unlocks, rewards +100 → +2,000 |

All values live in `src/config.js`; all math lives in `src/economy.js` as pure,
unit-tested functions.

---

## Legal & safety (baked in)

- **Coins are 100% free virtual coins** with zero cash value — no purchases, no
  Stripe, no pay-to-win, no gambling.
- **Donations are voluntary and strictly non-reward** (UPI / PayPal / Buy Me a
  Coffee / Razorpay) — they never grant coins, boosts, ranks or perks.
- **Fan-created disclaimer + claim modal** on seeded profiles. Real owners can
  verify via moderator review.
- **Abuse guards:** 2-second boost cooldown, per-IP token buckets, input
  sanitization, one profile per user, anti-bot referral validation.
- **Privacy:** salted scrypt hashes only, hashed IPs, no ads/trackers/third-party
  requests, no emails or phones.

---

## Testing / audits

```bash
cd grinbid
npm run check       # zero-dependency + syntax audit
npm test            # economy + store + HTTP integration suites
npm run audit       # check + test
npm run audit:loop  # 20 consecutive flawless passes
```

---

## Deploy on Render (free)

Grinbid is a zero-dependency Node app, so it deploys on **Render's free plan** with no build step and no card.

**Two blueprints are committed:**

- **`render.yaml` (this repo root)** — deploys the Grinbid app from `grinbid/` in the Outbid repo.
  Deploy button: `https://render.com/deploy?repo=https://github.com/clickalex/Outbid.lol_copy_demo`
- **`grinbid/render.yaml`** — the same blueprint in the standalone Grinbid repo.
  Deploy button: `https://render.com/deploy?repo=https://github.com/Kyabtao/grinbid`

Both create a web service named **grinbid**:

| Setting | Value |
|---|---|
| Plan | **Free** |
| Runtime | Node |
| Root directory | `grinbid` (repo-root blueprint only) |
| Build command | `npm install` *(no-op — zero dependencies)* |
| Start command | `node server.js` |
| Health check | `/api/health` |
| Env vars | `NODE_VERSION=22` · auto-generated `ADMIN_PASSWORD` · auto-generated `SESSION_SECRET` · `SEED_SAMPLE=true` |

**Free-plan caveats (fine for a demo):** `data/db.json` lives on an ephemeral disk and reseeds on every
redeploy/restart; the service sleeps after ~15 min idle and wakes on the next request.

Full guide: **`deploy/RENDER.md`** · Oracle Always-Free guide: **`deploy/ORACLE-MOBILE.md`**.

---

## How it works (short version)

1. **Join free** — sign up, grab your 2,500 free coins.
2. **Discover fan pages** — celebrity, influencer, estate, venue, brand, community.
3. **Earn more free coins** — daily streak, 3-hour lucky drop, tasks, referrals, season prizes.
4. **Back your faves** — boost a page with 50+ coins for 1× points, or ×1.5 on your own page.
5. **Climb the season** — every boost adds season points; top 3 win 50k/25k/10k.
6. **Own the page** — create a community page, or claim a seeded page with evidence.

Full walkthrough: [`grinbid/how-it-works.html`](how-it-works.html).

## Rules (short version)

- Virtual coins only — zero cash value, no purchase, no pay-to-win, no gambling.
- Boosts are 1 point per coin (×1.5 on your own page), 50 minimum, 2-second cooldown.
- Seeded pages are fan-made tributes; real owners verify via moderator-approved claims.
- Fair play: 13+, no bots, no self-referrals, no spam, no mass accounts.
- Donations are voluntary and strictly non-reward.

Full rules: [`grinbid/rules.html`](rules.html).

## Season leaderboard

- Each season lasts **7 days**.
- Prizes: **50,000 / 25,000 / 10,000** coins for ranks 1 / 2 / 3.
- Tie-break: earlier account wins.
- Every user's `seasonPoints` resets to 0 at settlement.

Season details: [`grinbid/leaderboard.html`](leaderboard.html).

## Coins (short version)

- **Earn:** signup 2,500 · daily 500 + 150/streak (cap 2,000) · lucky 250–2,500 every 3h · tasks +100→+2,000 · referral +1,000/+500 + 10% lifetime match · season 50k/25k/10k.
- **Spend:** boost fan pages (50+, 1×), boost your own page (1.5×).
- **Never:** purchasable, sellable, redeemable, refundable, wagered, or tied to real money.

Coin details: [`grinbid/coins.html`](coins.html).

## FAQ highlights

- Is it free? **Yes — 100%.**
- Are coins real? **No — virtual, free, zero cash value.**
- Is it gambling / pay-to-win? **No.**
- How do I start? Sign up, get 2,500 coins, boost a fave.
- What is a lucky drop? 250–2,500 coins every 3 hours.
- What do you store? Username, avatar, salted password hash, game data, hashed IP.

Full FAQ: [`grinbid/faq.html`](faq.html).

## About

Grinbid is a playful, fan-powered game that turns enthusiasm into a free
leaderboard. It is static by design for the demo (mock backend + localStorage),
and it ships as a zero-dependency Node app with a real API, Server-Sent Events
and an atomic JSON store. Coins are never tied to money and donors never receive
in-game rewards.

About page: [`grinbid/about.html`](about.html).

## Standalone/public pages

Alongside the SPA screens, these static pages exist for direct linking and
deployment (they are also reachable inside the SPA):

| Page | Path | Also in-app |
|---|---|---|
| Demo / game | `index.html` | `#/home` |
| How it works | `how-it-works.html` | — |
| Rules | `rules.html` | `#/rules` content lives in Legal |
| Leaderboard | `leaderboard.html` | `#/home` season table |
| Coins | `coins.html` | `#/wallet` + tasks |
| FAQ | `faq.html` | — |
| About | `about.html` | — |
| Terms | `terms.html` | `#/terms` |
| Privacy | `privacy.html` | `#/privacy` |

The production entry served by the Node app is `public/index.html`; the demo
entry is `index.html` at the folder root.
