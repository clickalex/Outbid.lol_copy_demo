# 🎪 Grinbid — Bid. Back. Rank up.

**Live: https://grinbid-8h5e.onrender.com** 🚀

**Product:** a playful, **100% free** virtual-coin fan-boost game. Users boost
fan-made pages (celebrities, estates, venues, brands, communities), climb a
weekly season leaderboard, and never spend a single real cent.

Grinbid is a zero-dependency Node app (Node built-ins only, no framework, no
build step, no npm packages). The server (`server.js` + `src/`) serves the SPA
and static info pages from `public/`; a real API, Server-Sent Events live feed
and an atomic JSON store run the whole game.

---

## Quick start

```bash
node server.js          # → http://localhost:3000 (or $PORT)
```

Requirements: **Node.js ≥ 18**. There is **no `npm install` step** — the repo
has zero dependencies.

A fresh boot starts **completely empty** — no pre-made fan pages, no sample
users, no bots. Every page on the board is created by a real fan: a fan
submits a page, an admin approves it, and only then does it appear for
everyone to boost.

**Fan pages & moderation:** any fan can make a page for a real person or
character — name, category, photo (uploaded and auto-resized in the
browser), tagline, description, tags. New pages start as **pending** and go
public only after admin approval; the admin queue shows the creator's email
so you can notify them. The home page leads with the **season leaderboard**
and the fan-page ranking, so visitors see who's on top the moment they
arrive (and see a "be the first to add your fave" prompt until pages exist).

The root-level info pages (`about.html`, `faq.html`, …) are static marketing
pages for browsing without the app; they link to the live game. `index.html`
at the folder root redirects to the live deployment.

---

## What's here

| Path | What it is |
|---|---|
| `server.js` | App bootstrap → `createApp()` → listen on `0.0.0.0:$PORT`. |
| `src/` | Backend source: config, store, economy, auth, rate limit, sanitize, router, API, SSE, seed. |
| `public/` | The SPA (`app.js`, `styles.css`, `index.html`) + static info/legal pages served by the app. |
| `about.html` … `faq.html` | Root copies of the static info pages (same content as `public/`). |
| `index.html` | Redirect to the live deployment. |
| `test/` | Unit + HTTP integration suites (`npm test`). |
| `scripts/` | Zero-dependency syntax audit, 20-pass audit loop, data reset. |
| `deploy/` | Render one-click + Oracle Cloud Always-Free guides. |
| `render.yaml` | Render blueprint (free plan, Node 22, `/api/health` check). |
| `package.json` | Zero npm dependencies; scripts: `start`, `dev`, `check`, `test`, `audit`, `audit:loop`, `reset`. |
| `PROJECT-SPEC.md` | The full implementation-level spec of the product. |

---

## The app: screens

Hash-routed SPA: `#/home` · `#/discover` · `#/profile/:slug` · `#/wallet` ·
`#/tasks` · `#/refer` · `#/create` · `#/mine` · `#/donate` · `#/admin` ·
`#/terms` · `#/privacy`.

- **Home** — season leaderboard first ("who's on top"), the ranked fan-page grid with search + category filter, live boost feed, and a create-a-page CTA.
- **Discover** — same searchable grid (linked from home).
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
  payment processor, no pay-to-win, no gambling.
- **Donations are voluntary and strictly non-reward** (UPI / PayPal / Buy Me a
  Coffee / Razorpay) — they never grant coins, boosts, ranks or perks.
- **Fan-created disclaimer + claim modal** on every page. Real owners can
  verify via moderator review.
- **Abuse guards:** 2-second boost cooldown, per-IP token buckets, input
  sanitization, one profile per user, anti-bot referral validation.
- **Privacy:** salted scrypt hashes only, hashed IPs, email kept private (never
  shown on profiles/leaderboard — it's only used to message page makers about
  their approval), no ads/trackers/third-party requests.

---

## Admin access

- **Founder account:** sign up with username **`alexami`** — that user is
  automatically an admin (set by the `ADMIN_USERNAMES` env var; default
  `alexami`, comma-separate more). The **Admin** link appears in the nav when
  logged in as an admin; the page is hidden and unlisted for everyone else.
- **Admin password:** a separate `ADMIN_PASSWORD` (auto-generated on Render;
  visible/editable in the service's Environment tab) also grants access via
  `/admin`.
- Admin powers: approve/reject submitted fan pages (the creator is notified
  in-app and can be emailed from the queue, which shows their address),
  settle seasons, broadcast, message users, handle owner claims.

---

## Testing / audits

```bash
npm run check       # zero-dependency + syntax audit
npm test            # economy + store + HTTP integration suites
npm run audit       # check + test
npm run audit:loop  # 20 consecutive flawless passes
```

---

## Deploy on Render (free)

Grinbid is live on **Render's free plan** — no build step, no card required.

**Blueprint:** [`render.yaml`](render.yaml) in this folder (and a repo-root copy
for deploying from the parent repository). One-click:

`https://render.com/deploy?repo=https://github.com/clickalex/Outbid.lol_copy_demo`
(set the service root directory to `grinbid`).

| Setting | Value |
|---|---|
| Plan | **Free** |
| Runtime | Node |
| Root directory | `grinbid` (repo-root blueprint only) |
| Build command | `npm install` *(no-op — zero dependencies)* |
| Start command | `node server.js` |
| Health check | `/api/health` |
| Env vars | `NODE_VERSION=22` · auto-generated `ADMIN_PASSWORD` · auto-generated `SESSION_SECRET` |

**Free-plan notes:** the service sleeps after ~15 min idle and wakes on the next
request (first hit after sleep takes a few seconds). The JSON store lives on
the service's disk; attach persistent storage (or export data via the admin
console) if you want data to survive redeploys.

Full guide: **`deploy/RENDER.md`** · Oracle Always-Free guide:
**`deploy/ORACLE-MOBILE.md`**.

---

## How it works (short version)

1. **Join free** — sign up, grab your 2,500 free coins.
2. **Discover fan pages** — celebrity, influencer, estate, venue, brand, community.
3. **Earn more free coins** — daily streak, 3-hour lucky drop, tasks, referrals, season prizes.
4. **Back your faves** — boost a page with 50+ coins for 1× points, or ×1.5 on your own page.
5. **Climb the season** — every boost adds season points; top 3 win 50k/25k/10k.
6. **Own the page** — create a fan page for your fave, or claim a page if you're the real owner.

Full walkthrough: [how-it-works.html](how-it-works.html).

## Rules (short version)

- Virtual coins only — zero cash value, no purchase, no pay-to-win, no gambling.
- Boosts are 1 point per coin (×1.5 on your own page), 50 minimum, 2-second cooldown.
- Seeded pages are fan-made tributes; real owners verify via moderator-approved claims.
- Fair play: 13+, no bots, no self-referrals, no spam, no mass accounts.
- Donations are voluntary and strictly non-reward.

Full rules: [rules.html](rules.html).

## Season leaderboard

- Each season lasts **7 days**.
- Prizes: **50,000 / 25,000 / 10,000** coins for ranks 1 / 2 / 3.
- Tie-break: earlier account wins.
- Every user's `seasonPoints` resets to 0 at settlement.

Season details: [leaderboard.html](leaderboard.html).

## Coins (short version)

- **Earn:** signup 2,500 · daily 500 + 150/streak (cap 2,000) · lucky 250–2,500 every 3h · tasks +100→+2,000 · referral +1,000/+500 + 10% lifetime match · season 50k/25k/10k.
- **Spend:** boost fan pages (50+, 1×), boost your own page (1.5×).
- **Never:** purchasable, sellable, redeemable, refundable, wagered, or tied to real money.

Coin details: [coins.html](coins.html).

## FAQ highlights

- Is it free? **Yes — 100%.**
- Are coins real? **No — virtual, free, zero cash value.**
- Is it gambling / pay-to-win? **No.**
- How do I start? Sign up, get 2,500 coins, boost a fave.
- What is a lucky drop? 250–2,500 coins every 3 hours.
- What do you store? Username, avatar, salted password hash, game data, hashed IP.

Full FAQ: [faq.html](faq.html).

## About

Grinbid is a playful, fan-powered game that turns enthusiasm into a free
leaderboard. It ships as a zero-dependency Node app with a real API,
Server-Sent Events and an atomic JSON store. Coins are never tied to money and
donors never receive in-game rewards.

About page: [about.html](about.html).

## Static pages

Alongside the SPA screens, these static pages exist for direct linking (they
are also reachable inside the app):

| Page | Path | Also in-app |
|---|---|---|
| How it works | `how-it-works.html` | — |
| Rules | `rules.html` | Legal modal / `#/terms` |
| Leaderboard | `leaderboard.html` | `#/home` season table |
| Coins | `coins.html` | `#/wallet` + tasks |
| FAQ | `faq.html` | — |
| About | `about.html` | — |
| Terms | `terms.html` | `#/terms` |
| Privacy | `privacy.html` | `#/privacy` |

The production entry served by the Node app is `public/index.html`.

---

Original prototype source: <https://github.com/Kyabtao/grinbid.git> · MIT
