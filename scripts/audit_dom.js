#!/usr/bin/env node
/**
 * scripts/audit_dom.js — jsdom structural + runtime smoke audit.
 *
 * Loaded by scripts/audit.py (run from the repo root). For every HTML page:
 *   - parse it in jsdom with scripts enabled and external scripts loaded;
 *   - stub window.fetch to reject (offline) so network-dependent paths are
 *     exercised without network access;
 *   - collect parser errors, uncaught exceptions and unhandled rejections;
 *   - run structural checks: table cell consistency, nav-link set equality
 *     across report pages, nav.css + nav-toggle when a shared nav is present,
 *     required non-empty containers, image alt text, target=_blank rel.
 *
 * Prints a JSON object { findings: [ {severity, check, file, detail} ] }.
 * Exit code is always 0 unless the auditor itself crashes (audit.py reports
 * that separately).
 */
'use strict';

const fs = require('fs');
const path = require('path');

function requireJsdom() {
  const candidates = ['jsdom'];
  const tmp = path.join(require('os').tmpdir(), 'node_modules');
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* try next */ }
  }
  try { return require(path.join(tmp, 'jsdom')); } catch (e) { return null; }
}

  const mod = requireJsdom();
  const JSDOM = (mod && (mod.JSDOM || (mod.default && mod.default.JSDOM))) || null;
  const VirtualConsole = (mod && (mod.VirtualConsole || (mod.default && mod.default.VirtualConsole))) || null;
const REPO = path.resolve(__dirname, '..');
const findings = [];
function add(severity, check, file, detail) {
  findings.push({ severity, check, file, detail });
}

function listPages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.endsWith('.html'))
    .map(d => path.join(dir, d.name));
}

(async function main() {
  if (!JSDOM) {
    add('WARN', 'dom-smoke', '*', 'jsdom not installed — DOM checks skipped (npm i jsdom)');
    process.stdout.write(JSON.stringify({ findings }));
    return;
  }

  const pages = [...listPages(REPO), ...listPages(path.join(REPO, 'launch'))];
  const navSets = new Map(); // page -> normalized nav href set (report pages only)
  const bottomSets = new Map(); // page -> normalized mobile-bottom-nav href set

  let activePage = '-';
  const unhandled = [];
  const onUnhandled = (reason) => {
    unhandled.push({ page: activePage, reason: String((reason && reason.message) || reason) });
  };
  process.on('unhandledRejection', onUnhandled);

  for (const page of pages) {
    const rel = path.relative(REPO, page).split(path.sep).join('/');
    activePage = rel;
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (err) => {
      const msg = String((err && err.detail && err.detail.message) || err.message || err);
      // jsdom reports unimplemented features as errors; separate them out.
      if (/not implemented/i.test(msg)) errors.push({ sev: 'WARN', msg });
      else errors.push({ sev: 'ERROR', msg });
    });
    virtualConsole.on('error', (msg) => errors.push({ sev: 'ERROR', msg: String(msg) }));
    virtualConsole.on('warn', () => { /* console.warn is fine (offline fallbacks) */ });

    let dom;
    try {
      dom = await JSDOM.fromFile(page, {
        runScripts: 'dangerously',
        resources: 'usable',
        pretendToBeVisual: true,
        virtualConsole,
        beforeParse(window) {
          // file:// URLs are opaque origins in jsdom — real browsers allow
          // localStorage on file://, so shim it to keep the smoke test honest.
          try { window.localStorage.getItem('x'); } catch (e) {
            const store = new Map();
            const shim = {
              getItem: k => (store.has(String(k)) ? store.get(String(k)) : null),
              setItem: (k, v) => store.set(String(k), String(v)),
              removeItem: k => store.delete(String(k)),
              clear: () => store.clear(),
              key: i => [...store.keys()][i] ?? null,
              get length() { return store.size; },
            };
            Object.defineProperty(window, 'localStorage', { value: shim, configurable: true });
            Object.defineProperty(window, 'sessionStorage', { value: shim, configurable: true });
          }
          window.fetch = () => Promise.reject(new Error('offline audit: fetch disabled'));
          window.matchMedia = window.matchMedia || (() => ({
            matches: false, media: '', addEventListener() {}, removeEventListener() {},
            addListener() {}, removeListener() {}, dispatchEvent() { return false; },
          }));
          window.scrollTo = window.scrollTo || (() => {});
          window.alert = window.alert || (() => {});
          window.confirm = window.confirm || (() => true);
          window.prompt = window.prompt || (() => '');
        },
      });
    } catch (e) {
      add('ERROR', 'dom-parse', rel, `jsdom failed to load: ${e.message}`);
      continue;
    }

    // give DOMContentLoaded + timers a moment
    await new Promise(r => setTimeout(r, 700));

    const doc = dom.window.document;

    // ---- structural checks ----------------------------------------------
    // tables: consistent cell counts (colspan contributes its span)
    doc.querySelectorAll('table').forEach((table, ti) => {
      let expected = null;
      table.querySelectorAll('tr').forEach((tr, ri) => {
        const cells = [...tr.children].filter(c => c.tagName === 'TD' || c.tagName === 'TH');
        const span = cells.reduce((a, c) => a + (parseInt(c.getAttribute('colspan') || '1', 10) || 1), 0);
        if (expected === null) expected = span;
        else if (span !== expected && span !== 0) {
          add('WARN', 'dom-table', rel, `table #${ti + 1} row ${ri + 1}: ${span} cells vs ${expected} elsewhere`);
        }
      });
    });

    // shared nav present -> nav.css link + toggle button + consistent links
    const nav = doc.querySelector('nav.site-nav');
    const bottomNav = doc.querySelector('nav.mobile-bottom-nav');
    if (nav) {
      const links = [...nav.querySelectorAll('.site-links a')].map(a => {
        const href = a.getAttribute('href') || '';
        const norm = path.normalize(path.join(path.dirname(rel), href)).split(path.sep).join('/');
        return norm;
      });
      navSets.set(rel, new Set(links));
      const hasNavCss = [...doc.querySelectorAll('link[rel="stylesheet"]')]
        .some(l => (l.getAttribute('href') || '').includes('nav.css'));
      if (!hasNavCss) add('ERROR', 'dom-nav', rel, 'page has .site-nav but never loads assets/nav.css');
      if (!nav.querySelector('.nav-toggle')) add('WARN', 'dom-nav', rel, 'shared nav has no .nav-toggle button');
      const page = doc.body.getAttribute('data-page');
      if (!page) add('WARN', 'dom-nav', rel, 'body[data-page] missing (active-nav highlight + enhancements)');
      else if (!nav.querySelector(`.site-links a[data-page="${page}"]`)) {
        add('ERROR', 'dom-nav', rel, `body data-page="${page}" has no matching top-nav link — active highlight can never fire`);
      }
    }
    if (bottomNav) {
      const links = [...bottomNav.querySelectorAll('a')].map(a => {
        const href = a.getAttribute('href') || '';
        const norm = path.normalize(path.join(path.dirname(rel), href)).split(path.sep).join('/');
        return norm;
      });
      bottomSets.set(rel, new Set(links));
    }

    // empty required containers
    for (const sel of ['#ideaCards', '#results', '#pages']) {
      const el = doc.querySelector(sel);
      if (el && el.children.length === 0) add('ERROR', 'dom-empty', rel, `${sel} is empty after load`);
    }

    // headings
    if (!doc.querySelector('h1')) add('WARN', 'dom-structure', rel, 'no h1 on the page');

    // images need alt
    doc.querySelectorAll('img').forEach(img => {
      if (!img.hasAttribute('alt')) add('WARN', 'dom-a11y', rel, `<img src="${img.getAttribute('src')}"> has no alt attribute`);
    });

    // target=_blank needs rel noopener/noreferrer
    doc.querySelectorAll('a[target="_blank"]').forEach(a => {
      const relAttr = a.getAttribute('rel') || '';
      if (!/noopener|noreferrer/.test(relAttr)) {
        add('WARN', 'dom-a11y', rel, `target=_blank without rel=noopener: ${a.getAttribute('href')}`);
      }
    });

    // ---- runtime errors ---------------------------------------------------
    const realErrors = errors.filter(e => e.sev === 'ERROR');
    for (const e of realErrors.slice(0, 5)) add('ERROR', 'dom-runtime', rel, e.msg.slice(0, 300));
    const notImpl = errors.filter(e => e.sev === 'WARN');
    for (const e of notImpl.slice(0, 3)) add('WARN', 'dom-runtime', rel, e.msg.slice(0, 160));

    // ---- interaction probes -----------------------------------------------
    try {
      const toggle = nav && nav.querySelector('.nav-toggle');
      if (toggle) {
        toggle.click();
        const expandedAfterOpen = toggle.getAttribute('aria-expanded');
        toggle.click();
        const expandedAfterClose = toggle.getAttribute('aria-expanded');
        if (expandedAfterOpen !== 'true' || expandedAfterClose !== 'false') {
          add('ERROR', 'dom-interact', rel, `nav toggle: aria-expanded ${expandedAfterOpen}→${expandedAfterClose}, expected true→false`);
        }
      }
      if (rel === 'ideas.html') {
        doc.querySelectorAll('.chip[data-filter]').forEach(chip => {
          chip.click();
          const visible = [...doc.querySelectorAll('#ideaCards > article')].filter(c => c.offsetParent !== undefined && c.style.display !== 'none');
          const label = chip.dataset.filter;
          if (label !== 'all' && visible.length === 0 && !doc.getElementById('noMatch')) {
            add('ERROR', 'dom-interact', rel, `filter "${label}" hides every card and there is no empty-state element`);
          }
        });
        const search = doc.getElementById('ideaSearch');
        if (search) {
          search.value = 'zzzz-no-such-idea';
          search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
          const noMatch = doc.getElementById('noMatch');
          if (!noMatch || noMatch.style.display === 'none') {
            add('WARN', 'dom-interact', rel, 'empty search state: #noMatch not shown for a zero-match query');
          }
          search.value = 'matrimony';
          search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
        }
      }
    } catch (e) {
      add('ERROR', 'dom-interact', rel, `probe crashed: ${e.message}`);
    }

    dom.window.close();
  }

  process.removeListener('unhandledRejection', onUnhandled);
  for (const u of unhandled.slice(0, 10)) {
    add('ERROR', 'dom-runtime', u.page, `unhandled promise rejection: ${u.reason.slice(0, 200)}`);
  }

  // nav link-set equality across report pages
  const reportNavs = [...navSets.entries()];
  if (reportNavs.length > 1) {
    const [basePage, baseSet] = reportNavs[0];
    for (const [p, set] of reportNavs.slice(1)) {
      const missing = [...baseSet].filter(x => !set.has(x));
      const extra = [...set].filter(x => !baseSet.has(x));
      if (missing.length || extra.length) {
        add('WARN', 'dom-nav-set', p,
            `nav differs from ${basePage}: missing [${missing.join(', ')}] extra [${extra.join(', ')}]`);
      }
    }
  }
  // mobile bottom quick-bar set equality across report pages
  const reportBottoms = [...bottomSets.entries()];
  if (reportBottoms.length > 1) {
    const [basePage, baseSet] = reportBottoms[0];
    for (const [p, set] of reportBottoms.slice(1)) {
      const missing = [...baseSet].filter(x => !set.has(x));
      const extra = [...set].filter(x => !baseSet.has(x));
      if (missing.length || extra.length) {
        add('WARN', 'dom-nav-set', p,
            `mobile-bottom-nav differs from ${basePage}: missing [${missing.join(', ')}] extra [${extra.join(', ')}]`);
      }
    }
  }

  process.stdout.write(JSON.stringify({ findings }));
})().catch(e => {
  process.stderr.write(String((e && e.stack) || e));
  process.exit(3);
});
