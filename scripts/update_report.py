#!/usr/bin/env python3
"""Outbid.lol market report — daily update bot.

What it does
------------
1. Reads the public outoutbid.lol directory API (CC BY 4.0), following
   pagination until every verified board is collected.
2. Rewrites ``data/outbid-market-inventory.csv`` — the full inventory
   snapshot committed next to the report.
3. Re-checks outbid.lol itself (public routes + the About-page counters)
   and refreshes every bot-managed figure in ``index.html``.
4. Scans verified boards against structured ideas and refreshes the collision
   watch in ``ideas.html`` so newly built concepts are flagged for review.
5. Writes ``data/stats.json`` with the computed summary and prints it,
   so a CI log shows exactly what changed.

Figures owned by the bot are marked in index.html with ``data-stat="…"``
attributes (scalar values) or ``<!--bot:…-->`` comment sentinels (whole
blocks). Anything not marked — qualitative analysis, the research-page
re-check rollup, registration timing — stays untouched.

Python 3.9+, standard library only. Run locally:

    python3 scripts/update_report.py

or let the GitHub Actions workflow (.github/workflows/daily-update.yml)
run it every day.
"""

from __future__ import annotations

import csv
import html
import io
import json
import os
import re
import statistics
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
HTML_PATH = REPO / "index.html"
SIM_PATH = REPO / "entry-simulator.html"
IDEAS_PATH = REPO / "ideas.html"
CSV_PATH = REPO / "data" / "outbid-market-inventory.csv"
STATS_PATH = REPO / "data" / "stats.json"

API_URL = "https://outoutbid.lol/api/directory.json?pageSize=500&sort=new"
PRIMARY = "https://outbid.lol"
ABOUT_URL = f"{PRIMARY}/about"
ORIGINAL_HOST = "outbid.lol"
UA = "Mozilla/5.0 (compatible; OutbidMarketBot/1.0; +https://github.com/clickalex/Outbid.lol_copy_demo)"

ROUTE_CHECKS = [
    ("route-root", "/"),
    ("route-today", "/today"),
    ("route-about", "/about"),
    ("route-rules", "/rules"),
    ("route-terms", "/terms"),
    ("route-privacy", "/privacy"),
    ("route-category-product", "/category/ai-agents-infrastructure"),
    ("route-stats", "/stats"),
]
# route-category-product checks two URLs; keep them paired here.
ROUTE_EXTRA = {"route-category-product": "/product/see.io"}

CSV_FIELDS = [
    "name", "host", "url", "category", "tagline", "evidence",
    "claimed_taken", "top_bid", "bidders", "minimum_bid", "payment_rail",
    "listed_at", "registered_at", "registrar", "clicks", "referrals",
    "figures_read_at",
]


# --------------------------------------------------------------------------- #
# small helpers
# --------------------------------------------------------------------------- #

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def write_atomic(path: Path, text: str) -> None:
    """Write a file via a same-directory temp file + atomic rename.

    An interrupted run (Ctrl-C in a manual/screen session, a killed CI job)
    can then never leave a truncated CSV, HTML or JSON behind — the previous
    file stays intact until the new one is fully written.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(f".{path.name}.tmp")
    temp.write_text(text, encoding="utf-8")
    os.replace(temp, path)


def http_get(url: str, timeout: int = 30, accept: str = "text/html") -> str:
    """GET with retry/backoff; raises on final failure."""
    last_error = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": UA, "Accept": accept},
            )
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read().decode("utf-8", "replace")
        except Exception as error:  # noqa: BLE001 - retry anything networky
            last_error = error
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"GET {url} failed after retries: {last_error}")


def http_status(url: str, timeout: int = 20) -> str:
    """Return 'LIVE' for 2xx/3xx, else the numeric code, or 'ERR'."""
    try:
        request = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            code = getattr(response, "status", None) or response.getcode()
        return "LIVE" if code and code < 400 else str(code)
    except urllib.error.HTTPError as error:
        return str(error.code)
    except Exception:  # noqa: BLE001 - connection errors etc.
        return "ERR"


def money(value) -> float | None:
    """'$126,157' -> 126157.0; None when unreadable."""
    if value is None:
        return None
    match = re.search(r"-?\d[\d,\s]*(?:\.\d+)?", str(value))
    if not match:
        return None
    try:
        return float(match.group(0).replace(",", "").replace(" ", ""))
    except ValueError:
        return None


def evidence(board: dict) -> str:
    collected = board.get("figures", {}).get("collected")
    read_at = board.get("figures", {}).get("readAt")
    if collected is not None and money(collected) == 0:
        return "Explicit $0"
    if collected is not None:
        return "Measured"
    if read_at:
        return "Checked - unreadable"
    return "Verified - unmeasured"


def esc(text) -> str:
    return (
        str(text if text is not None else "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def fmt_int(number: float) -> str:
    return f"{int(round(number)):,}"


def fmt_k(number: float) -> str:
    return f"${number / 1000:.1f}k"


def fmt_pct1(fraction: float) -> str:
    return f"{fraction * 100:.1f}%"


def fmt_pct0(fraction: float) -> str:
    return f"{round(fraction * 100):.0f}%"


def fmt_money2(number: float) -> str:
    return f"${number:,.2f}"


def fmt_compact(number: float) -> str:
    if number >= 1_000_000:
        return f"{number / 1_000_000:.2f}m"
    return fmt_int(number)


# --------------------------------------------------------------------------- #
# data fetch + stats
# --------------------------------------------------------------------------- #

def fetch_boards() -> tuple[list[dict], dict]:
    payload = json.loads(http_get(API_URL, accept="application/json"))
    boards = payload.get("boards") or []
    meta = payload.get("meta") or {}
    next_url = meta.get("next")
    pages = 1
    while next_url and pages < 20:
        page = json.loads(http_get(next_url, accept="application/json"))
        boards.extend(page.get("boards") or [])
        next_url = (page.get("meta") or {}).get("next")
        pages += 1
    if not boards:
        raise RuntimeError("directory API returned no boards")
    return boards, meta


def compute_stats(boards: list[dict], meta: dict) -> dict:
    clones = [b for b in boards if b.get("host") != ORIGINAL_HOST]
    original = next((b for b in boards if b.get("host") == ORIGINAL_HOST), None)

    measured = [b for b in boards if b.get("figures", {}).get("collected") is not None]
    clone_measured = [b for b in clones if b.get("figures", {}).get("collected") is not None]
    clone_amounts = [money(b["figures"]["collected"]) for b in clone_measured]
    clone_amounts = [a for a in clone_amounts if a is not None]

    claimed_total = sum(a for a in (money(b["figures"]["collected"]) for b in measured) if a is not None)
    original_amount = money(original.get("figures", {}).get("collected")) if original else None
    clone_total = claimed_total - (original_amount or 0)

    ranked = sorted(
        [b for b in measured if (money(b["figures"]["collected"]) or -1) > 0],
        key=lambda b: (-money(b["figures"]["collected"]), b.get("listedAt") or ""),
    )
    top10_clones = [b for b in ranked if b.get("host") != ORIGINAL_HOST][:10]
    top10_clones_total = sum(money(b["figures"]["collected"]) for b in top10_clones)

    zeros = sum(1 for a in clone_amounts if a == 0)
    under10 = sum(1 for a in clone_amounts if a < 10)
    under100 = sum(1 for a in clone_amounts if a < 100)
    denom = len(clone_measured) or 1

    categories: dict[str, int] = {}
    for board in boards:
        name = (board.get("category") or {}).get("name") or "Uncategorized"
        categories[name] = categories.get(name, 0) + 1

    newest = sorted(boards, key=lambda b: b.get("listedAt") or "", reverse=True)[:8]

    return {
        "total": (meta.get("total") or len(boards)),
        "loaded": len(boards),
        "measured": len(measured),
        "clone_measured": len(clone_measured),
        "claimed_total": claimed_total,
        "clone_total": clone_total,
        "original_amount": original_amount,
        "original_share": (original_amount / claimed_total) if original_amount and claimed_total else 0,
        "top10_clones_total": top10_clones_total,
        "top10_share_of_total": (top10_clones_total / claimed_total) if claimed_total else 0,
        "top10_share_of_clones": (top10_clones_total / clone_total) if clone_total else 0,
        "tail_share": max(0.0, 1 - (original_amount or 0) / claimed_total - top10_clones_total / claimed_total) if claimed_total else 0,
        "zeros": zeros,
        "zeros_pct": zeros / denom,
        "under10": under10,
        "under10_pct": under10 / denom,
        "under100": under100,
        "under100_pct": under100 / denom,
        "clone_median": statistics.median(clone_amounts) if clone_amounts else 0,
        "categories": dict(sorted(categories.items(), key=lambda kv: (-kv[1], kv[0]))),
        "ranked": ranked,
        "newest": newest,
        "meta_generated_at": meta.get("generatedAt"),
    }


# --------------------------------------------------------------------------- #
# direct checks on the original site
# --------------------------------------------------------------------------- #

def check_routes() -> dict:
    results = {}
    for key, path in ROUTE_CHECKS:
        first = http_status(PRIMARY + path)
        if key in ROUTE_EXTRA:
            second = http_status(PRIMARY + ROUTE_EXTRA[key])
            results[key] = "LIVE" if first == "LIVE" and second == "LIVE" else f"{first}/{second}"
        else:
            results[key] = first
    return results


def check_about_page() -> dict:
    """Parse the self-reported counters out of the About page text."""
    page = http_get(ABOUT_URL)
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", page))
    text = html.unescape(text)
    found = {}
    revenue = re.search(r"\$([\d,]+)\s*(?:\|\s*)?revenue", text, re.I)
    if revenue:
        found["revenue"] = float(revenue.group(1).replace(",", ""))
    visitors = re.search(r"([\d,]+)\s*visitors since launch", text)
    if visitors:
        found["visitors"] = int(visitors.group(1).replace(",", ""))
    bid = re.search(r"\$([\d,]+)\s*highest bid \(so far\)\s*·\s*([\w.-]+)", text)
    if bid:
        found["top_bid"] = float(bid.group(1).replace(",", ""))
        found["top_bid_host"] = bid.group(2)
    return found


# --------------------------------------------------------------------------- #
# HTML surgery
# --------------------------------------------------------------------------- #

def patch_scalars(html: str, values: dict) -> tuple[str, list]:
    """Replace the inner text of every element carrying data-stat="key"."""
    unpatched = []
    for key, value in values.items():
        pattern = re.compile(
            r'(<[^>]*\bdata-stat="' + re.escape(key) + r'"[^>]*>)([^<]*)(<)',
        )
        html, count = pattern.subn(lambda m: m.group(1) + value + m.group(3), html)
        if count == 0:
            unpatched.append(key)
    return html, unpatched


def replace_block(html: str, sentinel: str, body: str, *, where: str = "index.html") -> str:
    """Swap the content between paired sentinels.

    Accepts HTML comments (``<!--bot:x-->``) and, for markers that live inside
    the page's <script>, JS line comments (``//bot:x``).
    """
    name = re.escape(sentinel)
    patterns = (
        re.compile(r"(<!--\s*bot:" + name + r"\s*-->)[\s\S]*?(<!--\s*/bot:" + name + r"\s*-->)"),
        re.compile(r"(//\s*bot:" + name + r"\b)[\s\S]*?(//\s*/bot:" + name + r"\b)"),
    )
    for pattern in patterns:
        html, count = pattern.subn(lambda m: m.group(1) + body + m.group(2), html)
        if count:
            return html
    raise RuntimeError(f"sentinel bot:{sentinel} not found in {where}")


def render_category_bars(categories: dict) -> str:
    peak = max(categories.values()) if categories else 1
    rows = []
    for name, count in categories.items():
        width = count / peak * 100
        rows.append(
            f'\n                <div class="bar-row"><label>{esc(name)}</label>'
            f'<div class="track"><div class="fill" style="--w:{width:.1f}%"></div></div>'
            f"<output>{count}</output></div>"
        )
    return "".join(rows) + "\n              "


STATUS_PILL_RE = re.compile(
    r'<span class="domain">([^<]+)</span>[\s\S]*?<span class="pill ([\w-]+)">([^<]+)</span>'
)


def extract_status_map(html: str) -> dict:
    match = re.search(r"<!--\s*bot:top-table\s*-->[\s\S]*?<!--\s*/bot:top-table\s*-->", html)
    if not match:
        return {}
    return {
        host.strip().lower(): (cls, label.strip())
        for host, cls, label in STATUS_PILL_RE.findall(match.group(0))
    }


def render_top_table(ranked: list[dict], status_map: dict, routes: dict) -> str:
    rows = []
    for index, board in enumerate(ranked[:10], 1):
        host = board.get("host") or ""
        collected = board["figures"]["collected"]
        if host == ORIGINAL_HOST:
            if routes.get("route-root") == "LIVE":
                cls, label = "up", "Live (checked now)"
            else:
                cls, label = "warn", f"Route check {routes.get('route-root', 'ERR')}"
        else:
            cls, label = status_map.get(host.lower(), ("neutral", "Pending"))
        category = (board.get("category") or {}).get("name") or "Uncategorized"
        rows.append(
            f'\n                <tr><td class="num">{index:02d}</td>'
            f"<td><strong>{esc(board.get('name') or host)}</strong>"
            f'<span class="domain">{esc(host)}</span></td>'
            f"<td>{esc(category)}</td>"
            f'<td class="num">{esc(collected)}</td>'
            f'<td><span class="pill {cls}">{esc(label)}</span></td></tr>'
        )
    return "".join(rows) + "\n              "


# --------------------------------------------------------------------------- #
# entry-simulator.html (report 001b)
# --------------------------------------------------------------------------- #

SIM_BANDS = [
    ("Exactly $0", lambda v: v == 0, "var(--red)"),
    ("$0.01 – $4.99", lambda v: 0 < v < 5, "var(--red)"),
    ("$5 – $24.99", lambda v: 5 <= v < 25, None),
    ("$25 – $99.99", lambda v: 25 <= v < 100, None),
    ("$100 – $499", lambda v: 100 <= v < 500, "var(--green)"),
    ("$500 – $999", lambda v: 500 <= v < 1000, "var(--green)"),
    ("$1,000 and up", lambda v: v >= 1000, "var(--green)"),
]

SIM_PERCENTILE_NOTES = {
    25: "Bottom-quartile boundary — a quarter of boards took this or less.",
    50: "The median board: the exact middle of the market.",
    75: "Top-quartile boundary. Still under most launch costs.",
    90: "Top decile — the first genuinely non-trivial outcome.",
    99: "The top one percent of everyone who tried.",
}


def percentile(sorted_values: list[float], p: float) -> float:
    """Linear-interpolated percentile, matching the report's published figures."""
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    k = (len(sorted_values) - 1) * p / 100
    lo, hi = int(k // 1), min(int(k // 1) + 1, len(sorted_values) - 1)
    if lo == hi:
        return sorted_values[lo]
    return sorted_values[lo] + (sorted_values[hi] - sorted_values[lo]) * (k - lo)


def compute_sim(boards: list[dict]) -> dict:
    """Everything entry-simulator.html needs, derived from the same board list."""
    clones = [b for b in boards if b.get("host") != ORIGINAL_HOST]

    per_category: dict[str, list[dict]] = {}
    listed_counts: dict[str, int] = {}
    for board in clones:
        name = (board.get("category") or {}).get("name") or "Uncategorized"
        listed_counts[name] = listed_counts.get(name, 0) + 1
        amount = money(board.get("figures", {}).get("collected"))
        if amount is not None:
            per_category.setdefault(name, []).append(
                {"h": board.get("host") or board.get("name") or "", "v": round(amount, 2)}
            )

    for entries in per_category.values():
        entries.sort(key=lambda e: e["v"])

    # categories ordered by sample size (drives the simulator's default pick)
    ordered = sorted(per_category.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    amounts = sorted(e["v"] for entries in per_category.values() for e in entries)
    count = len(amounts)
    total = sum(amounts)

    rows = []
    for name, entries in ordered:
        values = [e["v"] for e in entries]
        over = sum(1 for v in values if v >= 100)
        rows.append({
            "name": name,
            "listed": listed_counts.get(name, len(values)),
            "measured": len(values),
            "median": statistics.median(values),
            "total": sum(values),
            "best": max(values),
            "hit": over / len(values) if values else 0.0,
        })
    by_median = sorted(rows, key=lambda r: (-r["median"], r["name"]))

    def tier(board: dict) -> str:
        minimum = money(board.get("minBid"))
        if minimum is None:
            return "unstated"
        if minimum < 5:
            return "under5"
        if minimum == 5:
            return "at5"
        if minimum <= 25:
            return "mid"
        return "over25"

    tiers: dict[str, list[float]] = {}
    for board in clones:
        amount = money(board.get("figures", {}).get("collected"))
        if amount is not None:
            tiers.setdefault(tier(board), []).append(amount)

    published_minimums = [money(b.get("minBid")) for b in boards]
    published_minimums = [m for m in published_minimums if m is not None]
    cheap = sum(1 for m in published_minimums if m <= 2)

    bidders = []
    for board in clones:
        raw = board.get("figures", {}).get("bidders")
        try:
            if raw is not None and str(raw).strip() != "":
                bidders.append(int(float(raw)))
        except (TypeError, ValueError):
            pass

    no_clicks = sum(1 for b in clones if not (b.get("clicks") or 0))
    unmeasured = sum(1 for b in boards if b.get("figures", {}).get("collected") is None)
    unreadable = sum(
        1 for b in boards
        if b.get("figures", {}).get("collected") is None and b.get("figures", {}).get("readAt")
    )

    top10 = sum(amounts[-10:])
    top29 = sum(amounts[-29:])
    half = count // 2

    weak = [r for r in rows if r["best"] < 100]
    strong = by_median[:2]

    return {
        "ordered": ordered,
        "listed_counts": listed_counts,
        "rows": rows,
        "by_median": by_median,
        "amounts": amounts,
        "count": count,
        "total": total,
        "mean": (total / count) if count else 0.0,
        "median": statistics.median(amounts) if amounts else 0.0,
        "clones_listed": len(clones),
        "over100_pct": sum(1 for a in amounts if a >= 100) / count if count else 0.0,
        "over1000_pct": sum(1 for a in amounts if a >= 1000) / count if count else 0.0,
        "zero_pct": sum(1 for a in amounts if a == 0) / count if count else 0.0,
        "under25_pct": sum(1 for a in amounts if a < 25) / count if count else 0.0,
        "no_click_pct": (no_clicks / len(clones)) if clones else 0.0,
        "bottom_half_share": (sum(amounts[:half]) / total) if total else 0.0,
        "top10_share": (top10 / total) if total else 0.0,
        "top10_total": top10,
        "next19_share": ((top29 - top10) / total) if total else 0.0,
        "next19_total": top29 - top10,
        "tail_count": max(0, count - 29),
        "tail_share": ((total - top29) / total) if total else 0.0,
        "tail_total": total - top29,
        "percentiles": {p: percentile(amounts, p) for p in (25, 50, 75, 90, 95, 99)},
        "low_bid_median": statistics.median(tiers["under5"]) if tiers.get("under5") else 0.0,
        "high_bid_median": statistics.median(tiers["over25"]) if tiers.get("over25") else 0.0,
        "minimums_published": len(published_minimums),
        "minimums_cheap": cheap,
        "bidders_median": statistics.median(bidders) if bidders else 0,
        "unmeasured": unmeasured,
        "unreadable": unreadable,
        "weak_categories": weak,
        "strong_categories": strong,
    }


def sim_scalars(sim: dict) -> dict:
    """data-stat values owned by entry-simulator.html."""
    best = sim["by_median"][0] if sim["by_median"] else None
    second = sim["by_median"][1] if len(sim["by_median"]) > 1 else None
    mean_multiple = (sim["mean"] / sim["median"]) if sim["median"] else 0
    values = {
        "sim-measured-count": fmt_int(sim["count"]),
        "sim-mean": fmt_money2(sim["mean"]),
        "sim-mean-multiple": f"{mean_multiple:.0f}×",
        "sim-over100-pct": fmt_pct1(sim["over100_pct"]),
        "sim-over1000-pct": fmt_pct1(sim["over1000_pct"]),
        "sim-zero-pct": fmt_pct1(sim["zero_pct"]),
        "sim-noclick-pct": fmt_pct1(sim["no_click_pct"]),
        "sim-bottomhalf-share": fmt_pct1(sim["bottom_half_share"]),
        "sim-top10-share": fmt_pct1(sim["top10_share"]),
        "sim-p75": fmt_money2(sim["percentiles"][75]),
        "sim-p95": fmt_money2(sim["percentiles"][95]),
        "sim-under25-note": (
            f"{fmt_pct1(sim['under25_pct'])} of measured boards never reached $25 "
            "— roughly the price of the domain they were launched on."
        ),
        "sim-cheap-minbid-note": (
            f"{sim['minimums_cheap']} of the {sim['minimums_published']} boards that "
            "publish a minimum ask for $2 or less"
        ),
        "sim-lowbid-median": fmt_money2(sim["low_bid_median"]),
        "sim-highbid-median": fmt_money2(sim["high_bid_median"]),
        "sim-bidders-median": fmt_int(sim["bidders_median"]),
        "sim-unmeasured-count": fmt_int(sim["unmeasured"]),
        "sim-unreadable-count": fmt_int(sim["unreadable"]),
    }
    if best:
        values.update({
            "sim-best-cat-name": best["name"],
            "sim-best-cat-line": (
                f"{best['listed']} listed · {best['measured']} measurable · "
                f"${fmt_int(best['total'])} combined"
            ),
            "sim-best-cat-median": fmt_money2(best["median"]),
            "sim-best-cat-hit": fmt_pct1(best["hit"]),
        })
    if second:
        values.update({
            "sim-second-cat-name": second["name"],
            "sim-second-cat-median": fmt_money2(second["median"]),
        })
    return values


def render_category_ladder(sim: dict) -> str:
    rows = []
    for row in sim["by_median"]:
        share = row["hit"]
        pill = "up" if share >= 0.3 else ("warn" if share >= 0.15 else "neutral")
        rows.append(
            f'\n                <tr><td><strong>{esc(row["name"])}</strong>'
            f'<span class="domain">{row["listed"]} listed · {row["measured"]} measurable</span></td>'
            f'<td class="num">{fmt_money2(row["median"])}</td>'
            f'<td class="num">${fmt_int(row["total"])}</td>'
            f'<td class="num">${fmt_int(row["best"])}</td>'
            f'<td><span class="pill {pill}">{fmt_pct1(share)} cleared $100</span></td></tr>'
        )
    return "".join(rows) + "\n              "


def render_outcome_bands(sim: dict) -> str:
    counts = [sum(1 for a in sim["amounts"] if test(a)) for _, test, _ in SIM_BANDS]
    peak = max(counts) if counts else 1
    rows = []
    for (label, _, colour), count in zip(SIM_BANDS, counts):
        width = (count / peak * 100) if peak else 0
        style = f"--w:{width:.1f}%" + (f";background:{colour}" if colour else "")
        rows.append(
            f'\n                <div class="bar-row"><label>{esc(label)}</label>'
            f'<div class="track"><div class="fill" style="{style}"></div></div>'
            f"<output>{count}</output></div>"
        )
    return "".join(rows) + "\n              "


def render_percentiles(sim: dict) -> str:
    rows = []
    for p in (25, 50, 75, 90, 99):
        rows.append(
            f'\n                <div class="fact"><b>p{p}</b><div>'
            f'<strong>{fmt_money2(sim["percentiles"][p])}</strong>'
            f'<span>{esc(SIM_PERCENTILE_NOTES[p])}</span></div></div>'
        )
    return "".join(rows) + "\n              "


def render_clone_concentration(sim: dict) -> str:
    return (
        f'\n            <div class="original"><b>{fmt_pct1(sim["top10_share"])}</b>'
        f'<span>Top 10 boards · ${fmt_int(sim["top10_total"])}</span></div>'
        f'\n            <div class="top-clones"><b>{fmt_pct1(sim["next19_share"])}</b>'
        f'<span>Next 19 boards · ${fmt_int(sim["next19_total"])}</span></div>'
        f'\n            <div class="tail"><b>{fmt_pct1(sim["tail_share"])}</b>'
        f'<span>Remaining {sim["tail_count"]} boards · ${fmt_int(sim["tail_total"])}</span></div>'
        "\n          "
    )


def render_ladder_callout(sim: dict) -> str:
    best = sim["by_median"][0]
    second = sim["by_median"][1] if len(sim["by_median"]) > 1 else best
    multiple = (best["median"] / sim["median"]) if sim["median"] else 0
    weak = sim["weak_categories"]

    parts = [
        f'\n              <p><strong>{esc(best["name"])}</strong> post the highest median in the '
        f'market at {fmt_money2(best["median"])} — {multiple:.1f}× the market median — and '
        f'{fmt_pct1(best["hit"])} of their measurable boards clear $100. The pick-and-shovel play '
        "beat the gold rush, as it usually does.</p>",
        f'\n              <p><strong>{esc(second["name"])}</strong> come second at '
        f'{fmt_money2(second["median"])}, with a {fmt_pct1(second["hit"])} hit rate over $100. A '
        "local audience and a local payment rail beat a global audience with neither.</p>",
    ]
    if weak:
        names = " and ".join(f"<strong>{esc(w['name'])}</strong>" for w in weak[:2])
        listed = sum(w["listed"] for w in weak[:2])
        combined = sum(w["total"] for w in weak[:2])
        parts.append(
            f'\n              <p>{names} {"are" if len(weak[:2]) > 1 else "is"} the trap: '
            f'{listed} listings between them, ${fmt_int(combined)} combined, and not one board over '
            "$100. High enthusiasm, no willingness to pay.</p>"
        )
    return "".join(parts) + "\n            "


def render_crowding_callout(sim: dict) -> str:
    biggest = max(sim["rows"], key=lambda r: r["listed"]) if sim["rows"] else None
    if not biggest:
        return "\n            "
    share = biggest["listed"] / sim["clones_listed"] if sim["clones_listed"] else 0
    strong = sim["strong_categories"]
    strong_measured = sum(r["measured"] for r in strong)
    strong_total = sum(r["total"] for r in strong)
    return (
        f'\n              <p>{biggest["listed"]} of {sim["clones_listed"]} clones — '
        f'{fmt_pct1(share)} — chose <strong>{esc(biggest["name"])}</strong>, the exact shape of the '
        f'original. They compete with each other for the same buyers, and their median board takes '
        f'{fmt_money2(biggest["median"])}.</p>'
        f'\n              <p>Meanwhile the {strong_measured} measurable boards in the two '
        f'best-performing categories took ${fmt_int(strong_total)} between them — against '
        f'${fmt_int(sim["tail_total"])} for the entire {sim["tail_count"]}-board tail. Scarcity of '
        "competitors, not size of audience, is what pays here.</p>"
        "\n            "
    )


def render_sim_dataset(sim: dict) -> str:
    payload = {
        "counts": {name: sim["listed_counts"].get(name, len(entries)) for name, entries in sim["ordered"]},
        "byCategory": {name: entries for name, entries in sim["ordered"]},
    }
    return "\n      " + json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n      "


def render_fallback_boards(newest: list[dict]) -> str:
    keep = ("name", "url", "host", "tagline", "category", "minBid", "payRail", "listedAt", "clicks")
    lines = []
    for board in newest:
        slim = {key: board[key] for key in keep if key in board}
        if "figures" in board:
            slim["figures"] = {
                "collected": board["figures"].get("collected"),
                "readAt": board["figures"].get("readAt"),
            }
        lines.append("        " + json.dumps(slim, ensure_ascii=False) + ",")
    return "\n" + "\n".join(lines) + "\n      "


# --------------------------------------------------------------------------- #
# ideas.html — automated collision watch
# --------------------------------------------------------------------------- #

# Deliberately conservative phrases. A match means "review this idea", not that
# two products are certainly identical. Keeping the vocabulary here makes the
# bot deterministic and its decisions auditable in Git.
IDEA_WATCH = [
    ("BlogRank", ("proof of attention", "watch to earn", "read to earn", "attention quiz")),
    ("MatrimonyWall", ("matrimony", "matchmaking", "shaadi", "bride", "groom")),
    ("TalentStage", ("singer", "dancer", "performing arts", "talent leaderboard")),
    ("RankMyDish / FoodRank Delhi", ("rank a dish", "dish leaderboard", "restaurant leaderboard", "street food")),
    ("ShelfRank", ("book leaderboard", "authors bid", "rank books", "indie authors")),
    ("GigWall", ("freelancer leaderboard", "rank portfolios", "freelancers bid")),
    ("FitLadder", ("gym leaderboard", "trainers bid", "fitness coach leaderboard")),
    ("MemeStand", ("meme leaderboard", "rank memes", "meme creators")),
    ("CampusClash", ("campus leaderboard", "universities ranked", "student bids", "college leaderboard")),
    ("ChairRank", ("barber leaderboard", "salon leaderboard", "stylists bid")),
    ("VowWall", ("wedding vendor", "wedding leaderboard", "venues bid")),
    ("PourRank", ("coffee shop leaderboard", "brewery leaderboard", "top pour")),
    ("NightBoard", ("nightlife leaderboard", "clubs bid", "djs bid")),
    ("The Last Word", ("last word wins", "final message wins", "message countdown")),
    ("NameBid", ("auction its name", "website naming auction", "highest bidder names")),
    ("GhostWall", ("anonymous leaderboard", "pay to reveal", "paid unmask")),
    ("DebatePot", ("debate pot", "paid vote", "winners split the pot")),
    ("TimeCapsule Rank", ("time capsule leaderboard", "future message", "message unlock")),
    ("ShipOrSkip", ("ship or skip", "paid votes", "pay to vote")),
    ("AttentionDividend", ("visitor rewards", "pay visitors", "attention dividend")),
    ("CashbackClick", ("click cashback", "cashback per click", "paid clicks for visitors")),
    ("ShieldBid", ("rank insurance", "bid shield", "outbid protection")),
    ("SeasonPass", ("season pass leaderboard", "monthly rank reset", "ranking seasons")),
    ("PredictWall", ("predict the winner", "leaderboard prediction", "predict number one")),
    ("EduRank", ("course leaderboard", "tutor leaderboard", "coaching leaderboard", "rank tutors")),
    ("ClinicRank", ("clinic leaderboard", "dentist leaderboard", "doctor leaderboard", "rank clinics")),
    ("AdvocateRank", ("lawyer leaderboard", "advocate leaderboard", "law firm leaderboard", "rank lawyers")),
    ("WanderRank", ("hotel leaderboard", "travel leaderboard", "tour leaderboard", "rank hotels")),
    ("LensRank", ("photographer leaderboard", "photography leaderboard", "rank photographers")),
    ("StudioRank", ("interior design leaderboard", "architect leaderboard", "design studio leaderboard")),
]


def scan_idea_collisions(boards: list[dict]) -> list[dict]:
    """Return conservative idea/board phrase matches, newest evidence first."""
    results = []
    for idea, phrases in IDEA_WATCH:
        matches = []
        for board in boards:
            haystack = " ".join(str(x or "") for x in (
                board.get("name"), board.get("host"), board.get("tagline"),
                (board.get("category") or {}).get("name"),
            )).lower()
            signals = [phrase for phrase in phrases if phrase in haystack]
            if signals:
                matches.append({"board": board, "signals": signals})
        if matches:
            matches.sort(key=lambda item: item["board"].get("listedAt") or "", reverse=True)
            results.append({"idea": idea, "matches": matches})
    return results


def render_idea_watch(collisions: list[dict], board_total: int) -> str:
    if not collisions:
        return (
            '\n          <article class="idea featured"><div class="idea-top">'
            '<span class="idea-id">AUTOMATED SCAN · CLEAR</span></div>'
            '<h3>No high-confidence collisions detected</h3>'
            f'<p class="pitch">The bot checked {fmt_int(board_total)} verified boards against '
            f'{len(IDEA_WATCH)} structured ideas. Broad concepts can still overlap; this scan only '
            'flags explicit phrase evidence.</p><div class="badges">'
            '<span class="badge status-new">No review flags ✓</span></div></article>\n        '
        )
    cards = []
    for collision in collisions:
        evidence_rows = []
        for item in collision["matches"][:3]:
            board = item["board"]
            host = board.get("host") or board.get("name") or "Unknown board"
            evidence_rows.append(
                f'<a href="{esc(board.get("url") or "#")}" target="_blank" rel="noopener">'
                f'{esc(host)}</a> ({esc(", ".join(item["signals"]))})'
            )
        cards.append(
            '\n          <article class="idea mini"><div class="idea-top">'
            '<span class="idea-id">BOT COLLISION WATCH</span></div>'
            f'<h3>{esc(collision["idea"])}</h3>'
            '<p class="pitch">A new or existing board now uses one of this idea’s defining phrases.</p>'
            f'<p class="evidence">Evidence: {"; ".join(evidence_rows)}. Human review is required '
            'before marking the idea as built.</p><div class="badges">'
            '<span class="badge status-mix">Review possible match ⚠</span></div></article>'
        )
    return "\n        <div class=\"cards\">" + "".join(cards) + "\n        </div>\n        "


# --------------------------------------------------------------------------- #
# CSV
# --------------------------------------------------------------------------- #

def write_csv(boards: list[dict]) -> None:
    buffer = io.StringIO()
    writer = csv.writer(buffer, quoting=csv.QUOTE_ALL, lineterminator="\n")
    writer.writerow(CSV_FIELDS)
    for board in boards:
        figures = board.get("figures") or {}
        category = board.get("category") or {}
        writer.writerow([
            board.get("name"), board.get("host"), board.get("url"),
            category.get("name"), board.get("tagline"), evidence(board),
            figures.get("collected"), figures.get("topBid"), figures.get("bidders"),
            board.get("minBid"), board.get("payRail"),
            board.get("listedAt"), board.get("registeredAt"), board.get("registrar"),
            board.get("clicks"), board.get("referrals"), figures.get("readAt"),
        ])
    write_atomic(CSV_PATH, buffer.getvalue())


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

def main() -> int:
    started = now_utc()
    print(f"[bot] run started {started.isoformat(timespec='seconds')}", flush=True)

    print("[bot] fetching directory API …", flush=True)
    boards, meta = fetch_boards()
    stats = compute_stats(boards, meta)
    print(
        f"[bot] boards={stats['total']} measured={stats['measured']} "
        f"claimed=${stats['claimed_total']:,.0f} (API generated {stats['meta_generated_at']})",
        flush=True,
    )

    print("[bot] checking outbid.lol routes …", flush=True)
    routes = check_routes()
    print("[bot] routes: " + json.dumps(routes), flush=True)

    about = {}
    try:
        print("[bot] parsing About-page counters …", flush=True)
        about = check_about_page()
        print("[bot] about: " + json.dumps(about), flush=True)
    except Exception as error:  # noqa: BLE001 - keep old values on failure
        print(f"[bot] about-page parse failed ({error}); keeping previous values", flush=True)

    write_csv(boards)
    print(f"[bot] wrote {CSV_PATH} ({len(boards)} rows)", flush=True)

    stamp_day = started.strftime("%d %b %Y")
    stamp_full = started.strftime("%d %b %Y · %H:%M UTC")
    clock = started.strftime("%H:%M UTC")

    scalars = {
        "boards-total": fmt_int(stats["total"]),
        "next-clone-index": f"#{int(stats['total']) + 1}",
        "claimed-total-short": fmt_k(stats["claimed_total"]),
        "measured-count-note": f"{fmt_int(stats['measured'])} boards measured at source",
        "original-share": fmt_pct1(stats["original_share"]),
        "original-share-round": fmt_pct0(stats["original_share"]),
        "original-share-note": (
            f"${fmt_int(stats['original_amount'])} in the latest directory read"
            if stats["original_amount"] is not None else "not present in latest read"
        ),
        "top10-clones-share": fmt_pct1(stats["top10_share_of_clones"]),
        "top-clones-share": fmt_pct0(stats["top10_share_of_total"]),
        "tail-share": fmt_pct0(stats["tail_share"]),
        "zeros-count": str(stats["zeros"]),
        "zeros-pct-note": f"{fmt_pct1(stats['zeros_pct'])} of measurable clones.",
        "under10-count": str(stats["under10"]),
        "under10-pct-note": f"{fmt_pct1(stats['under10_pct'])} of measurable clones.",
        "under100-count": str(stats["under100"]),
        "under100-pct-note": f"{fmt_pct1(stats['under100_pct'])} of measurable clones.",
        "clone-median": fmt_money2(stats["clone_median"]),
        "clone-median-note": (
            f"{fmt_int(stats['clone_measured'])} measurable clones, original excluded"
        ),
        "routes-checked-date": stamp_day,
        "table-refreshed": stamp_full,
        "side-updated": f"Snapshot: {clock}",
        "bot-updated": f"Inventory auto-refreshed {stamp_day} {clock} by the daily bot.",
    }
    for key, value in routes.items():
        scalars[key] = value
    if "revenue" in about:
        scalars["about-revenue"] = f"${about['revenue']:,.0f}"
    if "visitors" in about:
        scalars["about-visitors"] = fmt_compact(about["visitors"])
    if "top_bid" in about:
        scalars["top-bid"] = f"${about['top_bid']:,.0f}"
        host = about.get("top_bid_host", "")
        scalars["top-bid-note"] = f"{host} · highest bid so far (About page)"

    html = HTML_PATH.read_text(encoding="utf-8")
    status_map = extract_status_map(html)
    html, unpatched = patch_scalars(html, scalars)
    html = replace_block(html, "category-bars", render_category_bars(stats["categories"]))
    html = replace_block(html, "top-table", render_top_table(stats["ranked"], status_map, routes))
    fallback_pattern = re.compile(r"(//\s*bot:fallback-boards)[\s\S]*?(//\s*/bot:fallback-boards)")
    html, fallback_count = fallback_pattern.subn(
        lambda m: m.group(1) + render_fallback_boards(stats["newest"]) + m.group(2), html
    )
    if fallback_count == 0:
        unpatched.append("fallback-boards")
    write_atomic(HTML_PATH, html)
    print(f"[bot] patched {HTML_PATH}", flush=True)

    # ---- companion page: entry-simulator.html (report 001b) ----------------
    sim = compute_sim(boards)
    if SIM_PATH.exists():
        sim_html = SIM_PATH.read_text(encoding="utf-8")
        sim_values = dict(sim_scalars(sim))
        # shared stamps/figures so both pages always agree
        for shared in ("clone-median", "table-refreshed", "side-updated", "bot-updated"):
            if shared in scalars:
                sim_values[shared] = scalars[shared]
        sim_html, sim_unpatched = patch_scalars(sim_html, sim_values)
        for sentinel, body in (
            ("category-ladder", render_category_ladder(sim)),
            ("outcome-bands", render_outcome_bands(sim)),
            ("percentiles", render_percentiles(sim)),
            ("clone-concentration", render_clone_concentration(sim)),
            ("ladder-callout", render_ladder_callout(sim)),
            ("crowding-callout", render_crowding_callout(sim)),
            ("sim-dataset", render_sim_dataset(sim)),
        ):
            sim_html = replace_block(sim_html, sentinel, body, where=SIM_PATH.name)
        write_atomic(SIM_PATH, sim_html)
        print(f"[bot] patched {SIM_PATH}", flush=True)
        unpatched.extend(f"sim:{key}" for key in sim_unpatched)
    else:
        print(f"[bot] note - {SIM_PATH.name} not present; skipped", flush=True)

    # ---- ideas.html: flag structured ideas when matching boards appear ------
    if IDEAS_PATH.exists():
        ideas_html = IDEAS_PATH.read_text(encoding="utf-8")
        collisions = scan_idea_collisions(boards)
        idea_values = {
            "ideas-boards-total": fmt_int(stats["total"]),
            "ideas-watch-count": str(len(IDEA_WATCH)),
            "ideas-collision-count": str(len(collisions)),
            "ideas-bot-updated": stamp_full,
        }
        ideas_html, ideas_unpatched = patch_scalars(ideas_html, idea_values)
        ideas_html = replace_block(
            ideas_html, "idea-collision-watch",
            render_idea_watch(collisions, int(stats["total"])), where=IDEAS_PATH.name,
        )
        write_atomic(IDEAS_PATH, ideas_html)
        print(
            f"[bot] patched {IDEAS_PATH} ({len(collisions)} idea review flags)",
            flush=True,
        )
        unpatched.extend(f"ideas:{key}" for key in ideas_unpatched)
    else:
        print(f"[bot] note - {IDEAS_PATH.name} not present; skipped", flush=True)

    if unpatched:
        print(f"[bot] WARNING - markers not found: {', '.join(sorted(set(unpatched)))}", flush=True)

    STATS_PATH.parent.mkdir(parents=True, exist_ok=True)
    summary = {
        "runAt": started.isoformat(timespec="seconds"),
        "source": "outoutbid.lol directory API (CC BY 4.0)",
        "apiGeneratedAt": stats["meta_generated_at"],
        "boardsTotal": stats["total"],
        "boardsMeasured": stats["measured"],
        "cloneMeasured": stats["clone_measured"],
        "claimedTotalUsd": round(stats["claimed_total"], 2),
        "cloneTotalUsd": round(stats["clone_total"], 2),
        "originalCollectedUsd": stats["original_amount"],
        "originalShare": round(stats["original_share"], 4),
        "cloneMedianUsd": round(stats["clone_median"], 2),
        "top10CloneShareOfCloneMoney": round(stats["top10_share_of_clones"], 4),
        "categories": stats["categories"],
        "top10Boards": [
            {
                "host": b.get("host"),
                "name": b.get("name"),
                "claimed": b["figures"]["collected"],
            }
            for b in stats["ranked"][:10]
        ],
        "primarySite": {
            "routes": routes,
            "aboutRevenue": about.get("revenue"),
            "aboutVisitors": about.get("visitors"),
            "highestBid": about.get("top_bid"),
            "highestBidHost": about.get("top_bid_host"),
        },
        "entrySimulator": {
            "measuredClones": sim["count"],
            "meanUsd": round(sim["mean"], 2),
            "medianUsd": round(sim["median"], 2),
            "percentiles": {f"p{p}": round(v, 2) for p, v in sim["percentiles"].items()},
            "shareOver100": round(sim["over100_pct"], 4),
            "shareOver1000": round(sim["over1000_pct"], 4),
            "shareExactlyZero": round(sim["zero_pct"], 4),
            "bottomHalfShareOfMoney": round(sim["bottom_half_share"], 4),
            "top10ShareOfCloneMoney": round(sim["top10_share"], 4),
            "bestCategoryByMedian": (
                {
                    "name": sim["by_median"][0]["name"],
                    "medianUsd": round(sim["by_median"][0]["median"], 2),
                    "hitRateOver100": round(sim["by_median"][0]["hit"], 4),
                }
                if sim["by_median"] else None
            ),
            "categoryMedians": {
                row["name"]: round(row["median"], 2) for row in sim["by_median"]
            },
        },
        "unpatchedMarkers": sorted(set(unpatched)),
    }
    write_atomic(STATS_PATH, json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
    print(f"[bot] wrote {STATS_PATH}", flush=True)
    print("[bot] summary: " + json.dumps(summary), flush=True)
    print(f"[bot] done in {(now_utc() - started).total_seconds():.1f}s", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
