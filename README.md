# Outbid.lol market analysis

Three self-contained HTML pages, no build step.

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

- **from your attachment** (section 01): the four hosted-demo ideas from `docs/pay-to-rank-new-ideas.html` verified against the inventory — new ones kept, already-built ones marked, plus a keyword verdict for each of its five gap themes;
- **vertical gaps**: pay-to-rank board niches with zero entries among the 415 verified boards (food, books, freelancers, fitness, image-memes, campuses, barbers, weddings, coffee & bars, nightlife, matrimony, performing arts);
- **new mechanics**: brand-new twists none of the existing boards ships (text-box hill with pot, auction-the-site's-name, anonymous wall, pay-vote duels, time capsules, idea voting);
- a three-question **pick test**, the build-and-launch plan, and a filtered/searchable card list.

By design this page is **static and human-maintained**: no `data-stat` attributes, no bot sentinels, no network calls, and the daily bot never touches it. Idea-checking stays manual — the point is to pick one idea, build it as pay-to-rank, and launch it for reach, not to monitor it on a schedule.

Open any file directly, or serve the repository locally:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

The written snapshot is dated **26 August 2026**. The inventory figures inside it are refreshed automatically every day by the update bot (see below), so the counters stay current even though the qualitative analysis keeps its original date. Live inventory data is attributed to [outoutbid.lol](https://outoutbid.lol/) under CC BY 4.0. Public traffic and revenue numbers are source-reported and not independently audited.

## Repository contents

| Path | What it is |
| --- | --- |
| `index.html` | The full report (001). Open it in a browser; no build step. |
| `entry-simulator.html` | The entry simulator (001b). Same theme, same data, no build step and no network needed. |
| `ideas.html` | The idea list (002) — websites nobody has built yet. **Not bot-maintained:** static, offline, human-edited only. |
| `data/outbid-market-inventory.csv` | **Bot-maintained CSV** — the complete inventory snapshot (one row per verified board, newest first), regenerated on every bot run. |
| `data/stats.json` | **Bot-maintained summary** of the latest run: totals, claimed amounts, category counts, top-10 boards, route checks, and an `entrySimulator` block with the percentiles and per-category medians behind report 001b. |
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

The report is ready for branch-based GitHub Pages hosting: `index.html` and `entry-simulator.html` are in the repository root and need no build step. The two pages link to each other with relative URLs, so they work identically from a local file, a local server or Pages.

To activate it, a repository administrator must:

1. Merge the report branch into `main`.
2. Open **Settings → Pages**.
3. Set **Build and deployment → Source** to **Deploy from a branch**.
4. Select **main**, choose **/(root)**, and click **Save**.

GitHub Pages for a private repository requires a GitHub plan that supports private-repository Pages. Pages site visibility and access control depend on the account or organization plan. (This repository is currently public.)
