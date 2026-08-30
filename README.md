# Outbid.lol market analysis

Static by design: **no build step, no framework, no backend** — open any file directly or serve the folder.

Three layers, one repository:

1. **Research** — `index.html` (market audit 001), `entry-simulator.html` (001b), `ideas.html` (002), driven by the
   bot-maintained inventory in `data/`.
2. **Decision tools** — `tools.html` and the picker / calculator / fee / checklist / generator pages around it, plus
   the shared responsive shell in `assets/nav.css`.
3. **The paperwork** — `docs/level0-launch-pack/`, the nine documents that make taking money for a pay-to-rank board lawful.

**`index.html` — report 001, the market audit:**

- the current public status and product model of `outbid.lol`;
- market-level analysis of every verified pay-to-rank board in the public [outoutbid.lol](https://outoutbid.lol/) directory (CC BY 4.0);
- newly discovered sites and recent activity;
- a live, searchable all-site inventory powered by the public `outoutbid.lol` API, including a Free / Freemium / Paid bid-rate filter (with a transparent “Not disclosed” state when the source does not publish enough pricing detail);
- risks, recommendations, methodology, limitations, and source links.

**`entry-simulator.html` — report 001b, “Should you ship board #416?”:**

The audit answers *how big is this market*. The companion page answers the question a reader is left holding: *should I build one too?* It turns the same inventory into an interactive model of a new entrant's odds —

- an **entry simulator**: pick a category, a success target, a minimum bid and a build cost, and it returns the empirical hit rate, the median outcome, break-even odds and the five real boards nearest your target;
- **the odds table**: outcome bands and percentiles across every measurable board, plus how the money concentrates;
- **the category ladder**: median take, total, best board and over-$100 hit rate per category — the number that shows the crowded generic category is the worst-performing one;
- a weighted **readiness score** checklist, three evidence-backed **paths** for would-be entrants, and an explicit **assumptions** section covering survivorship bias.

Every figure on it is computed from the committed inventory snapshot and refreshed by the same daily bot, so the two pages never disagree. The page needs no network access — its dataset is embedded at build time by the bot.

**`ideas.html` — report 002, “websites nobody has built yet”:**

The audit shows *what exists*; this page lists *what doesn't*. It is a dated, one-time idea list for choosing the next pay-to-rank site to build and launch for reach —

- **from your attachment** (section 01): the flagship **BlogRank** idea (pay to rank, watch/read to earn), the four hosted-demo ideas, and all **25 ideas from `docs/pay-to-rank-new-ideas.csv`** — every one keyword-verified against the inventory: new ones kept, borderline ones kept with a mark, already-built ones marked and excluded;
- **vertical gaps**: pay-to-rank board niches with zero entries among the day's verified boards (food, books, freelancers, fitness, image-memes, campuses, barbers, weddings, coffee & bars, nightlife, matrimony, performing arts — plus six added by the 27 Aug evening re-scan: education, clinics, legal, travel, photographers, interior designers & architects);
- **new mechanics**: brand-new twists none of the existing boards ships — including the **visitor-earn family** (AttentionDividend, CashbackClick, PredictWall), rank insurance, season passes, the text-box hill with pot, auction-the-site's-name and the anonymous wall;
- a three-question **pick test**, the build-and-launch plan, and a filtered/searchable card list.

By design the **idea cards** on this page are **static and human-maintained** — the daily bot never rewrites an idea or a verification verdict. The bot does refresh the page's live counters (`data-stat` spans — **including every board-count figure in the prose**, so "0 boards across all N" claims can never go stale between runs), the automated collision-watch block (`<!--bot:idea-collision-watch-->` sentinel) and the "last scan" stamps, and a small in-page script fetches the current board count at runtime; everything else is a dated, hand-verified snapshot. Idea-checking stays manual — the point is to pick one idea, build it as pay-to-rank, and launch it for reach, not to monitor it on a schedule.

**`docs/level0-launch-pack/` — the paperwork for Level 0:**

Nine documents, written out rather than listed: terms of service, DPDP-shaped privacy notice, refund policy, ad
content policy with the 10-point screening checklist, paid-placement disclosure spec, invoicing/books/tax, entity +
bank + payment-processor + trademark setup, ops SOP with a pre-launch go/no-go gate, and the scope-lock guardrails.
The pack is what makes "no GST below ₹20 lakh, no TDS engine, no payout KYC, no crypto accounting" a *decision*
with a paper trail instead of an accident.

Open any file directly, or serve the repository locally:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

The written snapshot is dated **26 August 2026**. The inventory figures inside it are refreshed automatically every day by the update bot (see below), so the counters stay current even though the qualitative analysis keeps its original date. Live inventory data is attributed to [outoutbid.lol](https://outoutbid.lol/) under CC BY 4.0. Public traffic and revenue numbers are source-reported and not independently audited.

## Site navigation

One shared layer: **`assets/nav.css`**, linked *last* in every page's `<head>` so it wins over the older per-page
nav rules without editing 17 inline `<style>` blocks. Behaviour, and what each tier is for:

| Width | What you get |
| --- | --- |
| ≥ 1241px | full nav row, no wrapping |
| 901–1240px | horizontally scrollable pill rail with an edge fade — 12 links never stack into rows on a laptop |
| ≤ 900px | hamburger + anchored dropdown panel (own scroll, capped at 68% of the dynamic viewport, dimming scrim) **and** the fixed bottom quick-bar |

Device details baked in: 44–46px tap targets, `env(safe-area-inset-*)` padding for notched phones, `dvh` heights so
mobile browser chrome doesn't clip the panel, `@media (hover:none)` tap states, 16px form fields under 900px (stops
iOS zoom-on-focus from shoving the sticky bar around), landscape-phone rules, and nav hidden entirely in print.
`assets/site-enhancements.js` owns behaviour: `aria-controls`/`aria-expanded`, `aria-current="page"` from the page's
`data-page`, Escape closes and restores focus, tapping a link or the scrim closes it, resizing out of panel mode
closes and unlocks scroll.

The nav now carries 12 destinations: Audit · Ideas · Tools · Search · Picker · Simulator · Checklist · Calculator ·
**Launch** · Changelog · About · **Grinbid ↗** — with Audit / Ideas / Tools / Search / **Launch** / **Grinbid** in
the phone quick-bar.

**Grinbid navigation:** every site page links to the Grinbid static demo at `grinbid/index.html` with
`target="_blank"` and `rel="noopener"`, so it opens in a **new tab** and doesn't navigate away from this report.
The link is injected by `assets/site-enhancements.js` into `.site-links` and `.mobile-bottom-nav`, and it is also
baked into `index.html`'s nav markup. Once Render is live, point the same `grinbid-link` at
`https://grinbid.onrender.com` if you want the deployed app instead of the static demo.

**Adding a page?** Four places, and all four are mechanical:

1. the link in `.site-links` **and** `.mobile-bottom-nav` (copy an existing `<a …data-page="…">`);
2. `<link rel="stylesheet" href="assets/nav.css">` as the *last* thing in `<head>`, after any inline `<style>`;
3. an entry in the `pages` array in `search.html`, or it is invisible to search;
4. a row in the table below and an entry in `changelog.html`.

## Repository contents

| Path | What it is |
| --- | --- |
| `index.html` | The full report (001). Open it in a browser; no build step. |
| **`grinbid/`** | **The Grinbid project, dropped alongside the report.** A 100% free virtual-coin fan-boost game ("Bid. Back. Rank up.") with a fully working static demo at `grinbid/index.html`, a zero-dependency Node app (`server.js` + `public/` + `src/`), legal pages, info pages (`how-it-works`, `rules`, `leaderboard`, `coins`, `faq`, `about`), tests and deploy docs. See `grinbid/README.md`. |
| **`render.yaml`** | **Render Blueprint for this repo** — deploys the Grinbid app from `grinbid/` on the **free** plan (`rootDir: grinbid`, Node 22, `/api/health`). The same blueprint also lives at `grinbid/render.yaml`. |
| `entry-simulator.html` | The entry simulator (001b). Same theme, same data, no build step and no network needed. |
| `ideas.html` | The idea list (002) — websites nobody has built yet. **Idea cards are hand-written** (offline, human-edited); only the live counters and collision watch are bot-refreshed. |
| `tools.html` | The hub for every tool below. |
| `idea-picker.html`, `compare.html`, `mvp-builder.html`, `launch-copy-generator.html`, `name-generator.html`, `revenue-calculator.html`, `fees.html`, `build-plan.html`, `launch-checklist.html`, `legal-checklist.html`, `search.html`, `changelog.html`, `about.html` | The decision tools: constraint-based picking, side-by-side comparison, MVP spec, launch copy, names, revenue model, payment-fee maths, the 7-day plan, the persistent ship checklist, the India legal checklist, site search, project record, maker bio. |
| `assets/os.css` | Shared theme for the pages that link it (seven pages keep their own inline copy of the theme instead — a known duplication). |
| **`assets/nav.css`** | **Shared responsive navigation layer** — see *Site navigation*. Linked last in every page. |
| `assets/site-enhancements.js` | Nav behaviour, theme toggle, skip link, idea-card tools. Loaded by every report page. |
| `data/outbid-market-inventory.csv` | **Bot-maintained CSV** — the complete inventory snapshot (one row per verified board, newest first), regenerated on every bot run. |
| `data/stats.json` | **Bot-maintained summary** of the latest run: totals, claimed amounts, category counts, top-10 boards, route checks, and the `entrySimulator` block behind report 001b. |
| `data/ideas.json`, `data/ideas.csv`, `docs/pay-to-rank-new-ideas.csv` | The structured idea data the tools read, and the source CSV for report 002. |
| `docs/blogrank-india-legal-compliance.md` | The long-form India compliance analysis for the BlogRank concept (gaming law, GST, TDS, DPDP, payments). `01`–`09` in the pack are its Level 0 subset, made operational. |
| **`docs/level0-launch-pack/`** | **The Level 0 document set** (9 files): pack index → terms → privacy → refunds → ad content policy & screening → disclosure spec → invoicing/books/tax → entity/bank/PG/trademark → ops SOP & pre-launch gate → guardrails. Niche-agnostic, written for BlogRank. |
| `scripts/update_report.py` | The update bot (Python 3.9+, standard library only; all writes atomic). |
| `run-bot.sh` | Hands-off wrapper for manual/screen runs of the bot: `--loop` (daily, retries after failures), `--commit` (commit + push the bot files), `--log FILE` (default `bot.log`, git-ignored). |
| `scripts/audit.py` + `scripts/audit_dom.js` | One-command full-repo audit pass: syntax (Python/JS/bash/JSON/CSV/YAML/SVG), HTML structure and tag balance, duplicate ids, internal links and anchors, bot-sentinel integrity, stats↔CSV↔page consistency, and a jsdom runtime smoke test of every page. `python3 scripts/audit.py` (exit 0 = clean; `--json` for machine output). The DOM checks need `jsdom` (`npm i jsdom`) and are skipped with a warning when absent. |
| `docs/daily-update.yml` | Reference copy of the GitHub Actions workflow. The live file is already committed at `.github/workflows/daily-update.yml` and active; only a fresh fork needs it copied (see below). |

## Deploy Grinbid on Render (free)

The Grinbid app is a **zero-dependency Node app**, so it deploys on Render's free plan with no build step and no card.

**From this repo (root `render.yaml`):**

1. Push this branch to GitHub and open **<https://render.com/deploy?repo=https://github.com/clickalex/Outbid.lol_copy_demo>**
   (or New → Web Service → connect this repo). For the one-click button the blueprint must be on the
   repo's **default branch (`main`)**; for another branch, use a manual Web Service and pick that branch.
2. Render reads `render.yaml` at the repo root: web service **grinbid**, **free plan**, Node 22,
   `rootDir: grinbid`, `startCommand: node server.js`, health check `/api/health`.
3. Click **Apply** / **Create Web Service**. After ~1 minute you get `https://grinbid.onrender.com`.

The same blueprint also exists at **`grinbid/render.yaml`** if you deploy the standalone Grinbid repo.

**Settings the blueprint already handles:**

| Setting | Value |
|---|---|
| Plan | **Free** |
| Runtime | Node |
| Root directory | `grinbid` (this repo blueprint) |
| Build command | `npm install` *(no-op — zero dependencies)* |
| Start command | `node server.js` |
| Health check | `/api/health` |
| Env | `NODE_VERSION=22`, auto-generated `ADMIN_PASSWORD`, auto-generated `SESSION_SECRET`, `SEED_SAMPLE=true` |
| Auto-deploy | On, only when `grinbid/**` changes |

**Free-plan caveats (fine for a demo):** the disk is ephemeral, so `data/db.json` reseeds on redeploy; the
service spins down after ~15 min idle and wakes on the next request. The full walkthrough is in
`grinbid/deploy/RENDER.md`.

The live static demo inside the report (no server needed) is at **`grinbid/index.html`**, and the report's nav
links to it in a new tab.

## The daily update bot

[![Daily market refresh](https://github.com/clickalex/Outbid.lol_copy_demo/actions/workflows/daily-update.yml/badge.svg)](https://github.com/clickalex/Outbid.lol_copy_demo/actions/workflows/daily-update.yml)

*(The badge reflects the latest scheduled run — the workflow below is already committed and active.)*

`scripts/update_report.py` runs every day at 03:17 UTC via GitHub Actions (`workflow_dispatch` also allows manual runs) and:

1. **Reads the directory API** — `https://outoutbid.lol/api/directory.json` (CC BY 4.0), following pagination until every verified board is loaded.
2. **Rewrites `data/outbid-market-inventory.csv`** — full inventory: name, host, URL, category, tagline, evidence status, claimed taken, top bid, bidders, minimum bid, payment rail, listed/registered timestamps, registrar, clicks, referrals.
3. **Re-checks outbid.lol itself** — HTTP status of the public routes (`/`, `/today`, `/about`, `/rules`, `/terms`, `/privacy`, a category page, a product page, `/stats`) plus the About-page counters (self-reported revenue, visitors, highest bid).
4. **Refreshes `index.html`** — every figure marked with a `data-stat="…"` attribute or a `<!--bot:…-->` sentinel is recomputed: headline totals, claimed-money concentration, clone median, zero/under-$10/under-$100 buckets, category bars, the top-10 table, route statuses, the offline fallback records, and the “last refreshed” stamps. `data/stats.json` records what the run produced.
5. **Refreshes `entry-simulator.html`** — the same run recomputes the simulator's baseline figures, outcome bands, percentiles, concentration split, category ladder and both written call-outs, and re-embeds the per-category dataset the page's model runs on. Shared values (clone median, refresh stamps) are copied from the same run so the two pages can never drift apart. The page is skipped gracefully if the file is absent.
6. **Refreshes `ideas.html`** — only the live counters (`ideas-boards-total`, `ideas-watch-count`, `ideas-collision-count`, last-scan stamp) and the automated `<!--bot:idea-collision-watch-->` block. Idea cards and verification verdicts are never rewritten.
7. **Commits and pushes** only when something actually changed.

Failure behaviour is conservative: if the directory API is unreachable after retries, the run **aborts before writing anything** (previous files stay intact, non-zero exit). If the About-page parse fails, the previous counter values are kept. If a bot marker is missing from a page, the bot logs a warning and records it in `data/stats.json` (`unpatchedMarkers`) without failing the run. Every file is written atomically (temp file + rename), so an interrupted run can never leave a truncated CSV or HTML behind — the worst case is a partially updated tree, fixed by simply running the bot again.

### What the bot updates vs. what stays written

| Auto-refreshed daily | Frozen at the written snapshot |
| --- | --- |
| Board count, claimed totals, original’s share, clone median | Qualitative product analysis and scores |
| Concentration split, $0 / <$10 / <$100 buckets, category bars | outoutbid.lol research-page figures (re-check rollup 292/308, registration timing, quartiles) |
| Top-10 amounts and ranking (status labels carry over per host) | The “also spotted” activity list |
| outbid.lol route statuses, About counters (revenue, visitors, top bid) | Recommendations and risk register |
| **001b:** baseline odds, percentiles, outcome bands, category ladder, the two written call-outs and the embedded simulator dataset | **001b:** the readiness checklist weights, the three paths and the assumptions section |
| *(nothing — `ideas.html` is excluded by design)* | **002:** the entire idea list — static, human-maintained, never refreshed by the bot |
| *(nothing — untouched)* | **The whole site chrome and product:** `assets/nav.css`, `assets/site-enhancements.js`, every tool page, and all of `docs/level0-launch-pack/`. The bot patches only the three report files and `data/`. |

### Running the bot yourself

```bash
python3 scripts/update_report.py
```

A single run fetches the API, re-checks outbid.lol, and rewrites `data/outbid-market-inventory.csv`, `data/stats.json` and the bot-managed figures in `index.html`, `entry-simulator.html` and `ideas.html` (print statements show each step, and a summary JSON at the end). Details:

- **Requirements:** Python 3.9+ (standard library only) and outbound HTTPS access to `outoutbid.lol` and `outbid.lol`. On networks that block those hosts the run fails early with a connection/TLS error and writes nothing — the script does not degrade to empty data.
- **Run from anywhere:** the script resolves the repo root from its own path, so it does not matter which directory you run it from.
- **It does not commit or push.** Committing and pushing happen in the GitHub Actions workflow only. A local run just updates your working tree — commit the changed files yourself afterwards (`git add data/outbid-market-inventory.csv data/stats.json index.html entry-simulator.html ideas.html && git commit …`), or use **Actions → Daily market refresh → Run workflow** (`workflow_dispatch`) for a hands-off run on any branch.
- **Duration:** one run takes a minute or two (pagination + 8 route checks + the About page, each with retries).

#### Running it manually from `screen`/`tmux`

The bot is a one-shot script, so `screen` is just a persistent terminal around it:

```bash
screen -S outbid-bot          # start a named session
# inside the session:
cd ~/Outbid.lol_copy_demo
python3 scripts/update_report.py 2>&1 | tee -a bot.log   # keep a log
```

Then `Ctrl-A D` detaches (the run continues), `screen -r outbid-bot` reattaches, and `exit` (or `Ctrl-A K`) ends the session. If `screen` is not installed: `sudo apt install screen`, or use `tmux` (`tmux new -s outbid-bot` / `tmux attach -t outbid-bot`).

For a hands-off session, use the wrapper instead of the raw command:

```bash
./run-bot.sh                 # one run, output appended to bot.log
./run-bot.sh --loop          # run now, then every 24 h; retries every 15 min after failures (3 strikes)
./run-bot.sh --commit        # also commit + push the five bot files after each successful run
./run-bot.sh --loop --commit # both — a screen session that refreshes and ships by itself
```

`--commit` shares the push race described above, so avoid it around the 03:17 UTC job. `./run-bot.sh --help` prints the full usage; `bot.log` is git-ignored.

**Cons of manual runs vs. the scheduled workflow** — worth knowing before you rely on one:

| Manual run (screen/tmux) | Scheduled workflow |
| --- | --- |
| You must keep the session alive (a reboot kills it; `run-bot.sh --loop` still needs the screen session to survive) | Runs itself daily at 03:17 UTC |
| No commit/push — you do that by hand | Commits and pushes automatically |
| Output is lost when the session dies unless you `tee` to a file or use `screen -L` | Output lives in the Actions log |
| No overlap guard — **do not run it while the 03:17 UTC job is running** (both would write the same files and race the push); run it manually only when the last Action run has finished | Concurrency-guarded (`cancel-in-progress: false`) |

A sensible pattern: let the GitHub Action own the daily refresh, and use a local screen run only for one-off manual refreshes (e.g. before a launch decision) or when you want to inspect the output live.

### One-time activation of the daily schedule (repo admin)

**Already done in this repo:** the workflow is committed at `.github/workflows/daily-update.yml` and active — its `git add` line stages all five bot-managed files (`data/outbid-market-inventory.csv`, `data/stats.json`, `index.html`, `entry-simulator.html`, `ideas.html`), matching the reference copy in [`docs/daily-update.yml`](docs/daily-update.yml). Nothing needs to be copied anywhere.

Activation is therefore only ever needed on a **fresh fork or new clone** that lacks the file:

1. Copy [`docs/daily-update.yml`](docs/daily-update.yml) to `.github/workflows/daily-update.yml` and commit it (workflow files need elevated permissions, so commit from an account with `workflows` permission).
2. Make sure the file is on the default branch and GitHub Actions is enabled for the repo (Settings → Actions → General → Allow).
3. That’s it — from the next day, the bot runs daily at 03:17 UTC and pushes updates by itself. On any branch it can also be triggered manually via **workflow_dispatch** from the Actions tab, or run locally with the command above.

> **Note on scheduling:** GitHub only fires `schedule` events from the default branch, and a first scheduled run can lag a few minutes past the cron time. Runs are also skipped automatically if no data changed.

## CSV data dictionary

`data/outbid-market-inventory.csv` (UTF-8, all fields quoted, newest listings first):

| Column | Meaning |
| --- | --- |
| `name`, `host`, `url` | Board identity and link. |
| `category` | Directory category (e.g. *Websites & products*, *AI tools & agents*). |
| `tagline` | The board’s own description. |
| `evidence` | `Measured` (public total read), `Explicit $0`, `Checked - unreadable`, or `Verified - unmeasured`. |
| `claimed_taken` | Publicly displayed total taken, source-normalized to `$`; blank = unknown (**not** zero). |
| `top_bid`, `bidders` | Current top bid and bidder count when displayed. |
| `minimum_bid`, `payment_rail` | Entry price and payment provider when stated. |
| `listed_at`, `registered_at`, `registrar` | Directory listing time and WHOIS registration data when known. |
| `clicks`, `referrals` | Directory-tracked outbound clicks / referrals. |
| `figures_read_at` | When the directory last read the board’s counters. |

## GitHub Pages

For the **static** site + Grinbid demo, GitHub Pages is an option. You must also enable Pages once from Settings (repo admin).

**Option A — GitHub Actions (recommended):**

1. Copy [`docs/deploy-github-pages.yml`](docs/deploy-github-pages.yml) to `.github/workflows/deploy-github-pages.yml`
   and commit it from an account with `workflows` permission (the GitHub web UI can do this).
2. Open **Settings → Pages**.
3. Set **Build and deployment → Source** to **GitHub Actions**.
4. Push to `main` (or click **Actions → Deploy site to GitHub Pages → Run workflow**).
5. Resulting URL is usually `https://<owner>.github.io/<repo>/` —
   - `/` = the Outbid report/tools site
   - `/grinbid/` = the working Grinbid **static demo**

**Option B — branch-based (legacy):**

The whole site is ready for branch-based GitHub Pages hosting — every report page, the tools, `assets/` and `data/`
are in the repository root and need no build step. Pages link each other with relative URLs, so the navigation works
identically from a local file, a local server or Pages.

1. Merge the report branch into `main`.
2. Open **Settings → Pages**.
3. Set **Build and deployment → Source** to **Deploy from a branch**.
4. Select **main**, choose **/(root)**, and click **Save**.

GitHub Pages for a private repository requires a GitHub plan that supports private-repository Pages. Pages site visibility and access control depend on the account or organization plan. (This repository is currently public.)
