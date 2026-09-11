#!/usr/bin/env python3
"""scripts/audit.py — full-repo static + DOM audit pass.

One invocation = one audit pass over the whole repository:
syntax (Python/JS/bash/JSON/CSV/YAML/SVG), HTML structure, internal links
and anchors, duplicate ids, head requirements, bot-sentinel integrity,
stats/CSV/page data consistency, a jsdom runtime smoke test, and launch-kit
build idempotence.

Usage:
    python3 scripts/audit.py            # human-readable findings
    python3 scripts/audit.py --json     # machine-readable findings (array)

Exit code 0 = clean pass (no findings), 1 = findings, 2 = audit itself broke.
Findings format: SEVERITY | check | file | detail   (SEVERITY: ERROR|WARN|INFO)
By default only ERROR and WARN are printed; --all adds INFO.
"""

from __future__ import annotations

import ast
import csv
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
IGNORE_DIRS = {".git", "__pycache__", "node_modules"}

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}

FINDINGS: list[tuple[str, str, str, str]] = []


def finding(sev: str, check: str, file: str, detail: str) -> None:
    FINDINGS.append((sev, check, file, detail))


def html_files() -> list[Path]:
    return sorted(p for p in REPO.rglob("*.html") if not IGNORE_DIRS & set(p.parts))


# --------------------------------------------------------------------------- #
# 1. Python syntax + bash syntax
# --------------------------------------------------------------------------- #

def check_python_bash() -> None:
    for py in sorted(REPO.rglob("*.py")):
        if IGNORE_DIRS & set(py.parts):
            continue
        try:
            ast.parse(py.read_text(encoding="utf-8"), filename=str(py))
        except SyntaxError as e:
            finding("ERROR", "py-syntax", str(py.relative_to(REPO)), str(e))
    sh = REPO / "run-bot.sh"
    if sh.exists():
        r = subprocess.run(["bash", "-n", str(sh)], capture_output=True, text=True)
        if r.returncode:
            finding("ERROR", "bash-syntax", "run-bot.sh", r.stderr.strip())


# --------------------------------------------------------------------------- #
# 2. JSON validity + schemas
# --------------------------------------------------------------------------- #

IDEA_ENUMS = {
    "type": {"vertical-gap", "mechanic", "visitor-earn"},
    "effort": {"S", "M", "L"},
    "budget": {"low", "mid", "high"},
    "audience": {"creator", "founder", "local", "visitor"},
    "india": {True, False},
    "risk": {"safe", "money", "drama"},
}


def check_json() -> None:
    for js in sorted(REPO.rglob("*.json")):
        if IGNORE_DIRS & set(js.parts):
            continue
        try:
            json.loads(js.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            finding("ERROR", "json-parse", str(js.relative_to(REPO)), str(e))

    ideas_path = REPO / "data" / "ideas.json"
    if ideas_path.exists():
        try:
            ideas = json.loads(ideas_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return
        ids = set()
        for idea in ideas:
            iid = idea.get("id", "")
            if not re.fullmatch(r"[a-z0-9]+", iid or ""):
                finding("ERROR", "ideas-schema", "data/ideas.json", f"bad id: {iid!r}")
            if iid in ids:
                finding("ERROR", "ideas-schema", "data/ideas.json", f"duplicate id: {iid}")
            ids.add(iid)
            for field, allowed in IDEA_ENUMS.items():
                if field in idea and idea[field] not in allowed:
                    finding("ERROR", "ideas-schema", "data/ideas.json",
                            f"{iid}: {field}={idea[field]!r} not in {sorted(map(str, allowed))}")
            for field in ("name", "pitch", "mvp"):
                if not str(idea.get(field, "")).strip():
                    finding("ERROR", "ideas-schema", "data/ideas.json", f"{iid}: empty {field}")
        # parity with CSV
        csv_path = REPO / "data" / "ideas.csv"
        if csv_path.exists():
            with open(csv_path, encoding="utf-8", newline="") as fh:
                rows = list(csv.DictReader(fh))
            csv_ids = [r.get("id") for r in rows]
            json_ids = [i["id"] for i in ideas]
            if csv_ids != json_ids:
                finding("ERROR", "ideas-parity", "data/ideas.csv",
                        f"csv ids differ from ideas.json: csv={len(csv_ids)} json={len(json_ids)}")
        # parity with ideas.html cards (anchors)
        page = REPO / "ideas.html"
        if page.exists():
            text = page.read_text(encoding="utf-8")
            missing = [i["id"] for i in ideas if f'id="{i["id"]}"' not in text]
            if missing:
                finding("ERROR", "ideas-parity", "ideas.html",
                        f"ideas.json ids without an anchor in ideas.html: {missing}")


# --------------------------------------------------------------------------- #
# 3. CSV structural consistency
# --------------------------------------------------------------------------- #

def check_csv() -> None:
    for path in sorted(list(REPO.glob("data/*.csv")) + list(REPO.glob("docs/*.csv"))):
        with open(path, encoding="utf-8", newline="") as fh:
            rows = list(csv.reader(fh))
        if not rows:
            finding("ERROR", "csv-structure", str(path.relative_to(REPO)), "empty CSV")
            continue
        width = len(rows[0])
        for i, row in enumerate(rows[1:], start=2):
            if len(row) != width:
                finding("ERROR", "csv-structure", str(path.relative_to(REPO)),
                        f"line {i}: {len(row)} fields, header has {width}")


# --------------------------------------------------------------------------- #
# 4/5. HTML tag balance + duplicate ids + head requirements
# --------------------------------------------------------------------------- #

class BalanceParser(HTMLParser):
    """Flags mis-nested or unclosed non-void elements and duplicate ids."""

    AUTOCLOSE = {"li": {"li"}, "p": {"p", "div", "section", "article", "aside",
                                     "header", "footer", "nav", "main", "table",
                                     "thead", "tbody", "tr", "dl", "dt", "dd",
                                     "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6",
                                     "blockquote", "pre", "form", "hr", "figure", "details"},
                 "dt": {"dt", "dd"}, "dd": {"dt", "dd"},
                 "tr": {"tr"}, "td": {"td", "th"}, "th": {"td", "th"},
                 "thead": {"tbody", "tfoot"}, "tbody": {"tbody", "tfoot"},
                 "option": {"option"}, "optgroup": {"optgroup"}}

    def __init__(self, name: str):
        super().__init__(convert_charrefs=True)
        self.name = name
        self.stack: list[tuple[str, int]] = []
        self.ids: dict[str, int] = {}
        self.head: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))
        if tag == "html":
            for k, _v in attrs:
                if k == "lang":
                    self.head.append("lang")
        amap = dict(attrs)
        if "id" in amap:
            iid = amap["id"]
            if iid in self.ids:
                finding("ERROR", "html-dup-id", self.name,
                        f"duplicate id {iid!r} (lines {self.ids[iid]} and {self.getpos()[0]})")
            else:
                self.ids[iid] = self.getpos()[0]

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            finding("ERROR", "html-balance", self.name,
                    f"line {self.getpos()[0]}: stray </{tag}> with empty stack")
            return
        if self.stack[-1][0] == tag:
            self.stack.pop()
            return
        closable = self.AUTOCLOSE.get(tag, set())
        for idx in range(len(self.stack) - 1, -1, -1):
            if self.stack[idx][0] == tag:
                # everything above idx must be auto-closable by tag
                unclosed = [t for t, _ in self.stack[idx + 1:] if t not in closable]
                if unclosed:
                    finding("ERROR", "html-balance", self.name,
                            f"line {self.getpos()[0]}: </{tag}> closes {tag} opened at "
                            f"line {self.stack[idx][1]}, leaving unclosed {unclosed}")
                self.stack = self.stack[:idx]
                return
        finding("ERROR", "html-balance", self.name,
                f"line {self.getpos()[0]}: </{tag}> matches no open tag")


def check_html_structure() -> dict[str, BalanceParser]:
    parsers: dict[str, BalanceParser] = {}
    for page in html_files():
        text = page.read_text(encoding="utf-8")
        parser = BalanceParser(str(page.relative_to(REPO)))
        try:
            parser.feed(text)
            parser.close()
        except Exception as e:  # noqa: BLE001
            finding("ERROR", "html-parse", parser.name, f"parser crashed: {e}")
            continue
        if parser.stack:
            finding("ERROR", "html-balance", parser.name,
                    f"unclosed tags at EOF: {[(t, ln) for t, ln in parser.stack]}")
        low = text.lower()
        for req, pat in (("charset", r'<meta[^>]+charset'), ("viewport", r'<meta[^>]+name=["\']viewport'),
                         ("title", r"<title\b[^>]*>")):
            if not re.search(pat, low):
                finding("ERROR", "html-head", parser.name, f"missing {req}")
        if "lang" not in parser.head:
            finding("WARN", "html-head", parser.name, "<html> has no lang attribute")
        parsers[parser.name] = parser
    return parsers


# --------------------------------------------------------------------------- #
# 6. Internal links + anchors
# --------------------------------------------------------------------------- #

ATTRS = ("href", "src")


def check_links(parsers: dict[str, BalanceParser]) -> None:
    ids_by_page: dict[str, set[str]] = {name: set(p.ids) for name, p in parsers.items()}
    for page in html_files():
        rel = str(page.relative_to(REPO))
        text = page.read_text(encoding="utf-8")
        for m in re.finditer(r'(?:href|src)\s*=\s*["\']([^"\'#]+)(?:#([^"\']+))?["\']', text):
            url, frag = m.group(1), m.group(2)
            if "${" in url or "`" in url:  # inside a JS template literal, not HTML
                continue
            if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", url):  # external / mailto / data
                continue
            if url == "":
                continue
            target = (page.parent / url).resolve()
            try:
                target_rel = str(target.relative_to(REPO))
            except ValueError:
                finding("ERROR", "link-target", rel, f"{url} escapes the repository")
                continue
            if not target.exists():
                finding("ERROR", "link-target", rel, f"references missing file: {url}")
                continue
            if frag is not None:
                if target.suffix.lower() != ".html":
                    continue  # anchors into non-HTML files are not resolvable
                tname = target_rel.replace(os.sep, "/")
                if frag and frag not in ids_by_page.get(tname, set()):
                    finding("ERROR", "link-anchor", rel,
                            f"#{frag} not found in {tname}")
        # fragment-only links
        for m in re.finditer(r'href\s*=\s*["\']#([^"\']+)["\']', text):
            frag = m.group(1)
            if frag not in ids_by_page.get(rel, set()):
                finding("ERROR", "link-anchor", rel, f"same-page #{frag} not found")


# --------------------------------------------------------------------------- #
# 7. Bot sentinel integrity
# --------------------------------------------------------------------------- #

def check_bot_sentinels() -> None:
    bot_src = (REPO / "scripts" / "update_report.py").read_text(encoding="utf-8")
    sentinel_names = set(re.findall(r'replace_block\(\s*\w+,\s*"([a-z-]+)"', bot_src))
    patched_pages = ["index.html", "entry-simulator.html", "ideas.html", "about.html"]

    def sentinel_forms(name: str) -> dict[str, str]:
        return {
            "html-open": f"<!--bot:{name}-->",
            "html-close": f"<!--/bot:{name}-->",
            "js-open": f"//bot:{name}",
        }

    # every sentinel the bot writes must exist, paired, in at least one page —
    # and every sentinel that DOES appear in a page must be paired there.
    for sname in sentinel_names:
        found_page = None
        for pname in patched_pages:
            path = REPO / pname
            if not path.exists():
                continue
            text = path.read_text(encoding="utf-8")
            opens = len(re.findall(r"<!--\s*bot:\s*" + re.escape(sname) + r"\s*-->", text)) \
                + len(re.findall(r"//\s*bot:\s*" + re.escape(sname) + r"\b", text))
            closes = len(re.findall(r"<!--\s*/bot:\s*" + re.escape(sname) + r"\s*-->", text))
            if opens:
                found_page = found_page or pname
                if opens != closes:
                    finding("ERROR", "bot-sentinel", pname,
                            f"sentinel bot:{sname}: {opens} opener(s) vs {closes} closer(s)")
        if not found_page:
            finding("ERROR", "bot-sentinel", "scripts/update_report.py",
                    f"replace_block sentinel bot:{sname} not present in any patched page")
    for pname in patched_pages:
        path = REPO / pname
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for sname in set(re.findall(r"<!--\s*bot:([a-z-]+)\s*-->", text)):
            o = len(re.findall(r"<!--\s*bot:\s*" + re.escape(sname) + r"\s*-->", text))
            c = len(re.findall(r"<!--\s*/bot:\s*" + re.escape(sname) + r"\s*-->", text))
            if o != c:
                finding("ERROR", "bot-sentinel", pname,
                        f"sentinel bot:{sname}: {o} opener(s) vs {c} closer(s)")
    stats = REPO / "data" / "stats.json"
    if stats.exists():
        try:
            unpatched = json.loads(stats.read_text(encoding="utf-8")).get("unpatchedMarkers")
            if unpatched:
                finding("ERROR", "bot-sentinel", "data/stats.json",
                        f"unpatchedMarkers not empty: {unpatched}")
        except json.JSONDecodeError:
            pass  # reported by json-parse


# --------------------------------------------------------------------------- #
# 8. stats.json <-> inventory CSV <-> page consistency
# --------------------------------------------------------------------------- #

def check_data_consistency() -> None:
    stats_path = REPO / "data" / "stats.json"
    csv_path = REPO / "data" / "outbid-market-inventory.csv"
    if not (stats_path.exists() and csv_path.exists()):
        return
    try:
        stats = json.loads(stats_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return
    with open(csv_path, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    total = stats.get("boardsTotal")
    if isinstance(total, int) and total != len(rows):
        finding("ERROR", "data-consistency", "data/outbid-market-inventory.csv",
                f"stats.json boardsTotal={total} but CSV has {len(rows)} rows")
    cats: dict[str, int] = {}
    for r in rows:
        cats[r.get("category") or "?"] = cats.get(r.get("category") or "?", 0) + 1
    for cat, n in (stats.get("categories") or {}).items():
        if cats.get(cat) != n:
            finding("ERROR", "data-consistency", "data/stats.json",
                    f"category {cat!r}: stats={n} csv={cats.get(cat)}")
    hosts = {r.get("host") for r in rows}
    for board in stats.get("top10Boards", []):
        if board.get("host") not in hosts:
            finding("ERROR", "data-consistency", "data/stats.json",
                    f"top10 board {board.get('host')!r} not in inventory CSV")
    # ideas page chip count == card count in the filter container
    ideas_page = REPO / "ideas.html"
    if ideas_page.exists():
        text = ideas_page.read_text(encoding="utf-8")
        mchip = re.search(r'data-filter="all"[^>]*>All (\d+)<', text)
        start = text.find('id="ideaCards"')
        end = text.find('id="noMatch"')
        if mchip and start != -1 and end != -1:
            cards = text[start:end].count("<article ")
            if int(mchip.group(1)) != cards:
                finding("ERROR", "data-consistency", "ideas.html",
                        f'"All {mchip.group(1)}" chip but {cards} cards in #ideaCards')


# --------------------------------------------------------------------------- #
# 8b. Board counts + the "next board" index must follow data/stats.json
# --------------------------------------------------------------------------- #

# pages whose figures the bot owns (see scripts/update_report.py)
COUNT_PAGES = ("index.html", "entry-simulator.html", "ideas.html", "about.html")
# pages that quote a bot-owned figure but read it from data/stats.json at
# runtime instead of being patched — their baked-in fallback is checked too
STAT_READER_PAGES = ("revenue-calculator.html",)


def _expected_counts(stats: dict) -> dict:
    """data-stat key -> the value stats.json says it must carry today."""
    total = stats.get("boardsTotal")
    measured = stats.get("boardsMeasured")
    if not isinstance(total, int):
        return {}
    values = {
        "boards-total": f"{total:,}",
        "ideas-boards-total": f"{total:,}",
        "about-boards-total": f"{total:,}",
        "next-board-index": f"#{total + 1}",
        "next-clone-index": f"#{total + 1}",
        "sim-title": f"Should You Ship Board #{total + 1}? — Outbid Market Audit",
    }
    if isinstance(measured, int):
        values["about-measured-count"] = f"{measured:,}"
    if isinstance(stats.get("boardsMeasured"), int):
        values["measured-count-note"] = None  # free prose, checked loosely below
    claimed = stats.get("claimedTotalUsd")
    if isinstance(claimed, (int, float)):
        values["about-claimed-total"] = f"${claimed:,.0f}"
    share = stats.get("originalShare")
    if isinstance(share, (int, float)):
        values["about-original-share"] = f"{round(share * 100):.0f}%"
    median = stats.get("cloneMedianUsd")
    if isinstance(median, (int, float)):
        values["clone-median"] = f"${median:,.2f}"
        values["about-clone-median"] = f"${median:,.2f}"
    sim = stats.get("entrySimulator") or {}
    if isinstance(sim.get("measuredClones"), int):
        values["sim-measured-count"] = f"{sim['measuredClones']:,}"
    return {k: v for k, v in values.items() if v is not None}


def check_board_counts() -> None:
    """Board totals and the next-board index must equal data/stats.json."""
    stats_path = REPO / "data" / "stats.json"
    if not stats_path.exists():
        return
    try:
        stats = json.loads(stats_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return
    expected = _expected_counts(stats)
    if not expected:
        return

    span_re = re.compile(r'(<[^>]*\bdata-stat="(?P<key>[a-z0-9-]+)"[^>]*>)(?P<text>[^<]*)(<)')
    for pname in COUNT_PAGES + STAT_READER_PAGES:
        path = REPO / pname
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for m in span_re.finditer(text):
            want = expected.get(m.group("key"))
            if want is None:
                continue
            got = m.group("text").strip()
            if got != want:
                line = text[:m.start()].count("\n") + 1
                finding("ERROR", "board-count", pname,
                        f'data-stat="{m.group("key")}" is {got!r} at line {line}; '
                        f"stats.json says {want!r}")

        # the "next board" number also lives where an element cannot: the
        # simulator's <title> (a data-stat element, checked above) and the CSS
        # hero watermark (.hero::after { content: "509" }) on both report pages.
        if pname in ("index.html", "entry-simulator.html"):
            watermarks = re.findall(
                r'\.hero::after\s*\{[^}]*?content:\s*"([^"]*)"\s*;', text, re.S)
            if not watermarks:
                finding("ERROR", "board-count", pname,
                        "hero watermark rule (.hero::after content) not found — "
                        "patch_hero_number() cannot refresh it")
            for value in watermarks:
                if value != str(stats["boardsTotal"] + 1):
                    finding("ERROR", "board-count", pname,
                            f'hero watermark is "{value}"; '
                            f'stats.json says "{stats["boardsTotal"] + 1}"')


def check_hardcoded_counts() -> None:
    """Catch hand-written board counts / indexes the bot cannot refresh."""
    stats_path = REPO / "data" / "stats.json"
    if not stats_path.exists():
        return
    try:
        total = json.loads(stats_path.read_text(encoding="utf-8")).get("boardsTotal")
    except json.JSONDecodeError:
        return
    if not isinstance(total, int):
        return

    tag_re = re.compile(r"<[^>]*>|<!--[\s\S]*?-->")
    # "#509" (a board index) or "508-board"/"508 boards" (an inventory count)
    patterns = (
        (re.compile(r"(?<![\w#])#(\d{3,4})(?![\w])"), "board index"),
        (re.compile(r"(?<![\w.])(\d{3,4})-board"), "inventory count"),
        (re.compile(r"(?<![\w.])(\d{3,4}) verified boards"), "inventory count"),
    )
    for pname in COUNT_PAGES:
        path = REPO / pname
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        # walk tag by tag so we can see which element each literal sits in
        pos, last_tag, skipping = 0, "", ""
        for m in tag_re.finditer(text):
            chunk = text[pos:m.start()]
            tag = m.group(0)
            low = tag.lower()
            if skipping:
                if low.startswith(f"</{skipping}"):
                    skipping = ""
            elif low.startswith("<style") or low.startswith("<script"):
                skipping = low[1:].split()[0]
            elif not low.startswith("</"):
                # only prose between real markup is audited
                for pattern, kind in patterns:
                    for hit in pattern.finditer(chunk):
                        owned = ("data-stat=" in last_tag
                                 or "data-live-next" in last_tag
                                 or "data-live-total" in last_tag)
                        if owned:
                            continue
                        line = text[:pos + hit.start()].count("\n") + 1
                        finding("ERROR", "hardcoded-count", pname,
                                f"line {line}: bare {kind} {hit.group(0)!r} is not bot-owned "
                                f"(inventory is {total:,}) — move it into a data-stat span")
            last_tag = tag if tag.startswith("<") and not tag.startswith("</") else last_tag
            pos = m.end()


# --------------------------------------------------------------------------- #
# 9. JavaScript syntax: files + inline scripts
# --------------------------------------------------------------------------- #

def check_js_syntax() -> None:
    node = shutil.which("node")
    if not node:
        finding("WARN", "js-syntax", "*", "node not available — JS syntax check skipped")
        return
    targets: list[tuple[str, Path]] = []
    temp_files: list[Path] = []  # only these are ever deleted again
    for js in sorted(REPO.glob("assets/*.js")):
        targets.append((str(js.relative_to(REPO)), js))
    for page in html_files():
        rel = str(page.relative_to(REPO))
        text = page.read_text(encoding="utf-8")
        for i, m in enumerate(re.finditer(r"<script(?![^>]*\bsrc=)(?![^>]*\btype=[\"'](?:application/ld\+json|application/json|text/template)[\"'])[^>]*>(.*?)</script>", text, re.S),
                              start=1):
            code = m.group(1)
            if not code.strip():
                continue
            with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False,
                                             encoding="utf-8") as fh:
                fh.write(code)
                tmp = fh.name
            temp_files.append(Path(tmp))
            targets.append((f"{rel} (inline script #{i})", Path(tmp)))
    for label, path in targets:
        r = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
        if r.returncode:
            detail = (r.stderr or "").strip().splitlines()
            msg = " | ".join(detail[-3:]) if detail else "syntax error"
            finding("ERROR", "js-syntax", label, msg)
    # delete only the temp files this check created. (The old test was
    # "path startswith tempfile.gettempdir()" — a checkout that itself lives
    # under /tmp lost its real assets/*.js files to it.)
    for temp_path in temp_files:
        try:
            os.unlink(temp_path)
        except OSError as error:
            finding("WARN", "js-syntax", str(temp_path), f"temp file not removed: {error}")


# --------------------------------------------------------------------------- #
# 10. jsdom runtime smoke + DOM structural checks
# --------------------------------------------------------------------------- #

def check_dom() -> None:
    helper = REPO / "scripts" / "audit_dom.js"
    node = shutil.which("node")
    if not node or not helper.exists():
        finding("WARN", "dom-smoke", "*", "node/audit_dom.js unavailable — DOM checks skipped")
        return
    r = subprocess.run([node, str(helper)], capture_output=True, text=True, cwd=str(REPO))
    if r.returncode != 0:
        finding("ERROR", "dom-smoke", "scripts/audit_dom.js",
                f"helper crashed: {(r.stderr or '').strip()[:400]}")
        return
    try:
        report = json.loads(r.stdout)
    except json.JSONDecodeError:
        finding("ERROR", "dom-smoke", "scripts/audit_dom.js",
                f"unparseable helper output: {r.stdout[:200]}")
        return
    for item in report.get("findings", []):
        finding(item.get("severity", "ERROR"), item.get("check", "dom"),
                item.get("file", "?"), item.get("detail", ""))


# --------------------------------------------------------------------------- #
# 11. YAML + SVG
# --------------------------------------------------------------------------- #

def check_yaml_svg() -> None:
    try:
        import yaml  # type: ignore
        have_yaml = True
    except ImportError:
        have_yaml = False
    for yml in sorted(REPO.glob(".github/workflows/*.yml")) + sorted(REPO.glob("docs/*.yml")):
        if have_yaml:
            try:
                yaml.safe_load(yml.read_text(encoding="utf-8"))
            except Exception as e:  # noqa: BLE001
                finding("ERROR", "yaml-parse", str(yml.relative_to(REPO)), str(e)[:200])
    gh = REPO / ".github/workflows/daily-update.yml"
    doc = REPO / "docs/daily-update.yml"
    if gh.exists() and doc.exists():
        if gh.read_bytes() != doc.read_bytes():
            finding("WARN", "yaml-drift", "docs/daily-update.yml",
                    "docs copy differs from the active .github/workflows/daily-update.yml")
    svg = REPO / "og-image.svg"
    if svg.exists():
        try:
            ET.fromstring(svg.read_text(encoding="utf-8"))
        except ET.ParseError as e:
            finding("ERROR", "svg-parse", "og-image.svg", str(e))


# --------------------------------------------------------------------------- #

def main() -> int:
    args = set(sys.argv[1:])
    try:
        check_python_bash()
        check_json()
        check_csv()
        parsers = check_html_structure()
        check_links(parsers)
        check_bot_sentinels()
        check_data_consistency()
        check_board_counts()
        check_hardcoded_counts()
        check_js_syntax()
        check_dom()
        check_yaml_svg()
    except Exception as e:  # noqa: BLE001 — an audit crash is itself a finding
        finding("ERROR", "audit-internal", "-", f"{type(e).__name__}: {e}")
        if "--traceback" in args:
            raise

    if "--json" in args:
        print(json.dumps([{"severity": s, "check": c, "file": f, "detail": d}
                          for s, c, f, d in FINDINGS], indent=1))
        return 0
    shown = [x for x in FINDINGS if x[0] in ("ERROR", "WARN")] if "--all" not in args else FINDINGS
    for s, c, f, d in shown:
        print(f"{s:5s} | {c:16s} | {f} | {d}")
    errs = sum(1 for x in FINDINGS if x[0] == "ERROR")
    warns = sum(1 for x in FINDINGS if x[0] == "WARN")
    print(f"— audit: {errs} error(s), {warns} warning(s)")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
