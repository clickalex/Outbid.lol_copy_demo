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
4. Writes ``data/stats.json`` with the computed summary and prints it,
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
import json
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
    html = http_get(ABOUT_URL)
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))
    text = text.replace("&amp;", "&").replace("&#x27;", "'").replace("&quot;", '"')
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


def replace_block(html: str, sentinel: str, body: str) -> str:
    pattern = re.compile(
        r"(<!--\s*bot:" + re.escape(sentinel) + r"\s*-->)[\s\S]*?(<!--\s*/bot:" + re.escape(sentinel) + r"\s*-->)"
    )
    html, count = pattern.subn(lambda m: m.group(1) + body + m.group(2), html)
    if count == 0:
        raise RuntimeError(f"sentinel bot:{sentinel} not found in index.html")
    return html


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
# CSV
# --------------------------------------------------------------------------- #

def write_csv(boards: list[dict]) -> None:
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CSV_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, quoting=csv.QUOTE_ALL, lineterminator="\n")
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
            f"{fmt_int(stats['original_amount'])} in the latest directory read"
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
    HTML_PATH.write_text(html, encoding="utf-8")
    print(f"[bot] patched {HTML_PATH}", flush=True)
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
        "unpatchedMarkers": sorted(set(unpatched)),
    }
    STATS_PATH.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[bot] wrote {STATS_PATH}", flush=True)
    print("[bot] summary: " + json.dumps(summary), flush=True)
    print(f"[bot] done in {(now_utc() - started).total_seconds():.1f}s", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
