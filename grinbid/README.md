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

## Remaining OpenQ (why these pages exist as files too)

Alongside the SPA screens, the following standalone/public pages exist for
deployment and direct linking:

- `grinbid/terms.html` — terms of use
- `grinbid/privacy.html` — privacy & safety
- `grinbid/public/index.html` — the real server app entry
- `grinbid/public/app.js` / `grinbid/public/styles.css` — the production SPA bundle

The SPA in-app routes (`#/terms`, `#/privacy`) render the same content.
