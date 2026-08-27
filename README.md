# Outbid.lol market analysis → launch kit

Static by design: **no build step, no framework, no backend** — open any file directly or serve the folder.

Three layers, one repository:

1. **Research** — `index.html` (market audit 001), `entry-simulator.html` (001b), `ideas.html` (002), driven by the
   bot-maintained inventory in `data/`.
2. **Decision tools** — `tools.html` and the picker / calculator / fee / checklist / generator pages around it, plus
   the shared responsive shell in `assets/nav.css`.
3. **The thing you ship** — `launch/`, a real pay-to-rank board that deploys on its own domain, and
   `docs/level0-launch-pack/`, the nine documents that make taking money for it lawful. The report site links it as
   **Launch** in every nav; it does not otherwise depend on the report, and it works with or without this repo.

**`index.html` — report 001, the market audit:**

- the current public status and product model of `outbid.lol`;
- market-level analysis of every verified pay-to-rank board in the public [outoutbid.lol](https://outoutbid.lol/) directory (CC BY 4.0);
- newly discovered sites and recent activity;
- a live, searchable all-site inventory powered by the public `outoutbid.lol` API;
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
- **vertical gaps**: pay-to-rank board niches with zero entries among the 444 verified boards (food, books, freelancers, fitness, image-memes, campuses, barbers, weddings, coffee & bars, nightlife, matrimony, performing arts);
- **new mechanics**: brand-new twists none of the existing boards ships — including the **visitor-earn family** (AttentionDividend, CashbackClick, PredictWall), rank insurance, season passes, the text-box hill with pot, auction-the-site's-name and the anonymous wall;
- a three-question **pick test**, the build-and-launch plan, and a filtered/searchable card list.

By design the **idea cards** on this page are **static and human-maintained** — the daily bot never rewrites an idea or a verification verdict. The bot does refresh the page's live counters (`data-stat` spans), the automated collision-watch block (`<!--bot:idea-collision-watch-->` sentinel) and the "last scan" stamps, and a small in-page script fetches the current board count at runtime; everything else is a dated, hand-verified snapshot. Idea-checking stays manual — the point is to pick one idea, build it as pay-to-rank, and launch it for reach, not to monitor it on a schedule.

**`launch/` — the product, not a report:**

A shippable pay-to-rank board in three files: `index.html` (board, outbid form that computes the minimum valid bid,
free reference list built from the inventory, browser-only owner console), `entries.json` (the paid slots — this is
the whole CMS) and `build_data.py` (regenerates `data.js` from both). `legal.html` publishes the terms, privacy
notice, refund policy and paid-placement disclosure next to it. Static, no server, no database, no login; the paid
board **ships empty** because an empty #1 is the pitch. Deploy by dragging the folder to any static host. See
[`launch/README.md`](launch/README.md).

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
| 901–1240px | horizontally scrollable pill rail with an edge fade — 11 links never stack into rows on a laptop |
| ≤ 900px | hamburger + anchored dropdown panel (own scroll, capped at 68% of the dynamic viewport, dimming scrim) **and** the fixed bottom quick-bar |

Device details baked in: 44–46px tap targets, `env(safe-area-inset-*)` padding for notched phones, `dvh` heights so
mobile browser chrome doesn't clip the panel, `@media (hover:none)` tap states, 16px form fields under 900px (stops
iOS zoom-on-focus from shoving the sticky bar around), landscape-phone rules, and nav hidden entirely in print.
`assets/site-enhancements.js` owns behaviour: `aria-controls`/`aria-expanded`, `aria-current="page"` from the page's
`data-page`, Escape closes and restores focus, tapping a link or the scrim closes it, resizing out of panel mode
closes and unlocks scroll.

The nav now carries 11 destinations: Audit · Ideas · Tools · Search · Picker · Simulator · Checklist · Calculator ·
**Launch** · Changelog · About — with Audit / Ideas / Tools / Search / **Launch** in the phone quick-bar.

**Adding a page?** Four places, and all four are mechanical:

1. the link in `.site-links` **and** `.mobile-bottom-nav` (copy an existing `<a …data-page="…">`);
2. `<link rel="stylesheet" href="assets/nav.css">` as the *last* thing in `<head>`, after any inline `<style>`;
3. an entry in the `pages` array in `search.html`, or it is invisible to search;
4. a row in the table below and an entry in `changelog.html`.

## Repository contents

| Path | What it is |
| --- | --- |
| `index.html` | The full report (001). Open it in a browser; no build step. |
| `entry-simulator.html` | The entry simulator (001b). Same theme, same data, no build step and no network needed. |
| `ideas.html` | The idea list (002) — websites nobody has built yet. **Idea cards are hand-written** (offline, human-edited); only the live counters and collision watch are bot-refreshed. |
| `tools.html` | The hub for every tool below; also links the launch kit. |
| `idea-picker.html`, `compare.html`, `mvp-builder.html`, `launch-copy-generator.html`, `name-generator.html`, `revenue-calculator.html`, `fees.html`, `build-plan.html`, `launch-checklist.html`, `legal-checklist.html`, `search.html`, `changelog.html`, `about.html` | The decision tools: constraint-based picking, side-by-side comparison, MVP spec, launch copy, names, revenue model, payment-fee maths, the 7-day plan, the persistent ship checklist, the India legal checklist, site search, project record, maker bio. |
| `assets/os.css` | Shared theme for the pages that link it (seven pages keep their own inline copy of the theme instead — a known duplication). |
| **`assets/nav.css`** | **Shared responsive navigation layer** — see *Site navigation*. Linked last in every page. |
| `assets/site-enhancements.js` | Nav behaviour, theme toggle, skip link, idea-card tools. Loaded by every report page. |
| `data/outbid-market-inventory.csv` | **Bot-maintained CSV** — the complete inventory snapshot (one row per verified board, newest first), regenerated on every bot run. |
| `data/stats.json` | **Bot-maintained summary** of the latest run: totals, claimed amounts, category counts, top-10 boards, route checks, and the `entrySimulator` block behind report 001b. |
| `data/ideas.json`, `data/ideas.csv`, `docs/pay-to-rank-new-ideas.csv` | The structured idea data the tools read, and the source CSV for report 002. |
| `docs/blogrank-india-legal-compliance.md` | The long-form India compliance analysis for the BlogRank concept (gaming law, GST, TDS, DPDP, payments). `01`–`09` in the pack are its Level 0 subset, made operational. |
| **`launch/index.html`** | **The product:** a live pay-to-rank board. Board + outbid form + reference list + owner console, self-contained responsive nav, `CONFIG` block at the top of the script. |
| `launch/legal.html` | Its public terms, privacy notice, refund policy and disclosure spec — deployed with the board, linked from the footer and the order form's acceptance tick. |
| `launch/entries.json` | The paid slots. The entire CMS; ships empty. |
| `launch/entries.sample.json` | A worked example (three slots) so the ranking and outbid maths can be seen working. |
| `launch/data.js` | Generated — paid slots + reference rows. Do not hand-edit. |
| `launch/build_data.py` | Regenerates `data.js` from `entries.json` + the inventory; degrades to an empty board instead of breaking on malformed JSON. |
| `launch/README.md` | Deploy steps, pricing maths, day-1 legal posture, first-20-bidders outreach, the week-one kill metric, and how to re-point the kit at BlogRank. |
| **`docs/level0-launch-pack/`** | **The Level 0 document set** (9 files): pack index → terms → privacy → refunds → ad content policy & screening → disclosure spec → invoicing/books/tax → entity/bank/PG/trademark → ops SOP & pre-launch gate → guardrails. Niche-agnostic, written for BlogRank. |
| `scripts/update_report.py` | The update bot (Python 3.9+, standard library only). |
| `docs/daily-update.yml` | The GitHub Actions workflow for the bot. **One-time activation:** a repo admin copies it to `.github/workflows/daily-update.yml` (see below). |

## The daily update bot

[![Daily market refresh](https://github.com/clickalex/Outbid.lol_copy_demo/actions/workflows/daily-update.yml/badge.svg)](https://github.com/clickalex/Outbid.lol_copy_demo/actions/workflows/daily-update.yml)

*(The badge shows “no status” until the workflow is activated — see the one-time step below.)*

`scripts/update_report.py` runs every day at 03:17 UTC via GitHub Actions (`workflow_dispatch` also allows manual runs) and:

1. **Reads the directory API** — `https://outoutbid.lol/api/directory.json` (CC BY 4.0), following pagination until every verified board is loaded.
2. **Rewrites `data/outbid-market-inventory.csv`** — full inventory: name, host, URL, category, tagline, evidence status, claimed taken, top bid, bidders, minimum bid, payment rail, listed/registered timestamps, registrar, clicks, referrals.
3. **Re-checks outbid.lol itself** — HTTP status of the public routes (`/`, `/today`, `/about`, `/rules`, `/terms`, `/privacy`, a category page, a product page, `/stats`) plus the About-page counters (self-reported revenue, visitors, highest bid).
4. **Refreshes `index.html`** — every figure marked with a `data-stat="…"` attribute or a `<!--bot:…-->` sentinel is recomputed: headline totals, claimed-money concentration, clone median, zero/under-$10/under-$100 buckets, category bars, the top-10 table, route statuses, the offline fallback records, and the “last refreshed” stamps. `data/stats.json` records what the run produced.
5. **Refreshes `entry-simulator.html`** — the same run recomputes the simulator's baseline figures, outcome bands, percentiles, concentration split, category ladder and both written call-outs, and re-embeds the per-category dataset the page's model runs on. Shared values (clone median, refresh stamps) are copied from the same run so the two pages can never drift apart. The page is skipped gracefully if the file is absent.
6. **Commits and pushes** only when something actually changed.

Failure behaviour is conservative: if the API or a check fails after retries, the bot keeps the previous value instead of writing blanks or zeroes, and logs a warning.

### What the bot updates vs. what stays written

| Auto-refreshed daily | Frozen at the written snapshot |
| --- | --- |
| Board count, claimed totals, original’s share, clone median | Qualitative product analysis and scores |
| Concentration split, $0 / <$10 / <$100 buckets, category bars | outoutbid.lol research-page figures (re-check rollup 292/308, registration timing, quartiles) |
| Top-10 amounts and ranking (status labels carry over per host) | The “also spotted” activity list |
| outbid.lol route statuses, About counters (revenue, visitors, top bid) | Recommendations and risk register |
| **001b:** baseline odds, percentiles, outcome bands, category ladder, the two written call-outs and the embedded simulator dataset | **001b:** the readiness checklist weights, the three paths and the assumptions section |
| *(nothing — `ideas.html` is excluded by design)* | **002:** the entire idea list — static, human-maintained, never refreshed by the bot |
| *(nothing — untouched)* | **The whole site chrome and product:** `assets/nav.css`, `assets/site-enhancements.js`, every tool page, all of `launch/` and all of `docs/level0-launch-pack/`. The bot patches only the three report files and `data/`; the board's own data is refreshed on demand with `python3 launch/build_data.py` |

### Running the bot yourself

```bash
python3 scripts/update_report.py   # writes the CSV, stats.json and patches both HTML pages
```

Then commit as usual. On GitHub you can also open **Actions → Daily market refresh → Run workflow** to trigger a run on any branch (available once the workflow is activated).

### One-time activation of the daily schedule (repo admin)

The automation ships as [`docs/daily-update.yml`](docs/daily-update.yml). Because workflow files require elevated permissions to commit, activate it once manually:

1. Open the file on GitHub, copy its contents.
2. In the repo, **Add file → Create new file**, name it `.github/workflows/daily-update.yml`, paste, commit (to `main`).
3. That’s it — from the next day, the bot runs daily at 03:17 UTC and pushes updates by itself. Until then (and on non-default branches) it can be run manually via **workflow_dispatch** from the Actions tab, or locally with the command above.

> **Note on scheduling:** GitHub only fires `schedule` events from the default branch, and a first scheduled run can lag a few minutes past the cron time. Runs are also skipped automatically if no data changed.

> **⚠️ One-line update needed for report 001b.** The already-active `.github/workflows/daily-update.yml` cannot be edited by an app without `workflows` permission, so it still stages only the original three paths. Until a repo admin updates it, the bot will refresh `entry-simulator.html` locally but the daily job will not commit those changes. Edit the `git add` line in `.github/workflows/daily-update.yml` to read:
>
> ```yaml
>           git add data/outbid-market-inventory.csv data/stats.json index.html entry-simulator.html
> ```
>
> The reference copy in [`docs/daily-update.yml`](docs/daily-update.yml) already contains this line, so it can simply be copied across.

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

The whole site is ready for branch-based GitHub Pages hosting — every report page, the tools, `assets/` and `data/`
are in the repository root and need no build step. Pages link each other with relative URLs, so the navigation works
identically from a local file, a local server or Pages.

**Do not ship the product from here.** `launch/` will render fine at `/launch/`, but a pay-to-rank board needs its own
domain: bidders check the URL, payment processors check the WHOIS behind the link, and a board living under a
research site's path inherits all of its traffic patterns. Deploy `launch/` (with `data.js` regenerated and
`legal.html` present) as the *root* of its own static host — see `launch/README.md`.

To activate it, a repository administrator must:

1. Merge the report branch into `main`.
2. Open **Settings → Pages**.
3. Set **Build and deployment → Source** to **Deploy from a branch**.
4. Select **main**, choose **/(root)**, and click **Save**.

GitHub Pages for a private repository requires a GitHub plan that supports private-repository Pages. Pages site visibility and access control depend on the account or organization plan. (This repository is currently public.)
