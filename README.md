# Outbid.lol market analysis

A self-contained HTML report covering:

- the current public status and product model of `outbid.lol`;
- market-level analysis of every verified pay-to-rank board in the public [outoutbid.lol](https://outoutbid.lol/) directory (CC BY 4.0);
- newly discovered sites and recent activity;
- a live, searchable all-site inventory powered by the public `outoutbid.lol` API;
- risks, recommendations, methodology, limitations, and source links.

Open `index.html` directly, or serve the repository locally:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

The written snapshot is dated **26 August 2026**. The inventory figures inside it are refreshed automatically every day by the update bot (see below), so the counters stay current even though the qualitative analysis keeps its original date. Live inventory data is attributed to [outoutbid.lol](https://outoutbid.lol/) under CC BY 4.0. Public traffic and revenue numbers are source-reported and not independently audited.

## Repository contents

| Path | What it is |
| --- | --- |
| `index.html` | The full report. Open it in a browser; no build step. |
| `data/outbid-market-inventory.csv` | **Bot-maintained CSV** — the complete inventory snapshot (one row per verified board, newest first), regenerated on every bot run. |
| `data/stats.json` | **Bot-maintained summary** of the latest run: totals, claimed amounts, category counts, top-10 boards, route checks. |
| `scripts/update_report.py` | The update bot (Python 3.9+, standard library only). |
| `.github/workflows/daily-update.yml` | GitHub Actions workflow that runs the bot daily and commits the result. |

## The daily update bot

[![Daily market refresh](https://github.com/clickalex/Outbid.lol_copy_demo/actions/workflows/daily-update.yml/badge.svg)](https://github.com/clickalex/Outbid.lol_copy_demo/actions/workflows/daily-update.yml)

`scripts/update_report.py` runs every day at 03:17 UTC via GitHub Actions (`workflow_dispatch` also allows manual runs) and:

1. **Reads the directory API** — `https://outoutbid.lol/api/directory.json` (CC BY 4.0), following pagination until every verified board is loaded.
2. **Rewrites `data/outbid-market-inventory.csv`** — full inventory: name, host, URL, category, tagline, evidence status, claimed taken, top bid, bidders, minimum bid, payment rail, listed/registered timestamps, registrar, clicks, referrals.
3. **Re-checks outbid.lol itself** — HTTP status of the public routes (`/`, `/today`, `/about`, `/rules`, `/terms`, `/privacy`, a category page, a product page, `/stats`) plus the About-page counters (self-reported revenue, visitors, highest bid).
4. **Refreshes `index.html`** — every figure marked with a `data-stat="…"` attribute or a `<!--bot:…-->` sentinel is recomputed: headline totals, claimed-money concentration, clone median, zero/under-$10/under-$100 buckets, category bars, the top-10 table, route statuses, the offline fallback records, and the “last refreshed” stamps. `data/stats.json` records what the run produced.
5. **Commits and pushes** only when something actually changed.

Failure behaviour is conservative: if the API or a check fails after retries, the bot keeps the previous value instead of writing blanks or zeroes, and logs a warning.

### What the bot updates vs. what stays written

| Auto-refreshed daily | Frozen at the written snapshot |
| --- | --- |
| Board count, claimed totals, original’s share, clone median | Qualitative product analysis and scores |
| Concentration split, $0 / <$10 / <$100 buckets, category bars | outoutbid.lol research-page figures (re-check rollup 292/308, registration timing, quartiles) |
| Top-10 amounts and ranking (status labels carry over per host) | The “also spotted” activity list |
| outbid.lol route statuses, About counters (revenue, visitors, top bid) | Recommendations and risk register |

### Running the bot yourself

```bash
python3 scripts/update_report.py   # writes the CSV, stats.json and patches index.html
```

Then commit as usual. On GitHub you can also open **Actions → Daily market refresh → Run workflow** to trigger a run on any branch.

> **Note on scheduling:** GitHub only fires `schedule` events from the default branch. Until this workflow reaches `main`, the daily cron will not trigger — run it manually via `workflow_dispatch` from the Actions tab, or from a branch. Once the workflow file is merged into `main`, the bot runs and commits automatically every day.

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

The report is ready for branch-based GitHub Pages hosting: `index.html` is in the repository root and needs no build step.

To activate it, a repository administrator must:

1. Merge the report branch into `main`.
2. Open **Settings → Pages**.
3. Set **Build and deployment → Source** to **Deploy from a branch**.
4. Select **main**, choose **/(root)**, and click **Save**.

GitHub Pages for a private repository requires a GitHub plan that supports private-repository Pages. Pages site visibility and access control depend on the account or organization plan. (This repository is currently public.)
