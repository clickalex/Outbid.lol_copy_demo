/* ============================================================
   enhance.js — progressive enhancements for the Grinbid static
   info pages (about, how-it-works, rules, leaderboard, coins,
   faq, terms, privacy). Zero dependencies, defensive: if an
   expected element is missing it simply skips.

   Two contexts:
     • Deployed app (public/): pages are tagged data-standalone="1";
       the "play" links point at the live game (no Outbid OS cross-link).
     • Report repo (grinbid/): static copies served from the Outbid OS
       site; the mobile CTA hits the local index.html redirect page.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (page === '' || page === 'index' || page === 'index.htm') page = 'index.html';
  var LIVE_URL = 'https://grinbid-8h5e.onrender.com/';
  var standalone = !!$('script[data-standalone]');

  /* ---------- styles (idempotent) ---------- */
  if (!document.getElementById('gb-enhance-style')) {
    var style = document.createElement('style');
    style.id = 'gb-enhance-style';
    style.textContent =
      '.gb-skip{position:absolute;left:12px;top:-70px;z-index:1000;padding:10px 16px;border-radius:999px;' +
        'background:#ffd23f;color:#23123d;font-weight:800;border:3px solid #23123d;text-decoration:none}' +
      '.gb-skip:focus{top:12px}' +
      '.doc-nav{position:sticky;top:0;z-index:40;background:rgba(255,248,240,.92);backdrop-filter:blur(10px);' +
        'border-bottom:3px solid rgba(35,18,61,.12);margin:0 -18px 6px;padding:10px 18px!important;' +
        'overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none}' +
      '.doc-nav::-webkit-scrollbar{display:none}' +
      '.doc-nav a{flex:0 0 auto}' +
      '.doc-nav a[aria-current="page"]{background:#23123d!important;color:#ffd23f!important;text-decoration:none}' +
      '.gb-back-top{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:80;' +
        'width:48px;height:48px;border-radius:50%;border:3px solid #23123d;background:#ff4fa3;color:#fff;' +
        'font-size:20px;font-weight:800;line-height:1;box-shadow:4px 4px 0 rgba(35,18,61,.25);cursor:pointer;' +
        'display:grid;place-items:center;opacity:0;transform:translateY(14px) scale(.9);pointer-events:none;' +
        'transition:opacity .18s ease,transform .18s ease}' +
      '.gb-back-top.gb-show{opacity:1;transform:none;pointer-events:auto}' +
      '.gb-back-top:hover{background:#e83b8c}' +
      '.gb-back-top:focus-visible{outline:4px solid #4cc9f0;outline-offset:2px}' +
      '.gb-play-cta{display:none;position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));' +
        'z-index:75;text-align:center;padding:14px 18px;border-radius:999px;border:3px solid #23123d;' +
        'background:#ffd23f;color:#23123d!important;font-weight:800;font-size:1rem;text-decoration:none;' +
        'box-shadow:5px 5px 0 rgba(35,18,61,.28)}' +
      '.gb-play-cta:hover{text-decoration:none;transform:translateY(-2px)}' +
      'body{padding-bottom:0}' +
      '@media (max-width:760px){.gb-play-cta{display:block}body.gb-cta-on{padding-bottom:86px}body.gb-cta-on .gb-back-top{bottom:calc(78px + env(safe-area-inset-bottom))}}' +
      '@media (prefers-reduced-motion:reduce){.gb-back-top,.gb-play-cta{transition:none!important}}';
    document.head.appendChild(style);
  }

  /* ---------- skip link ---------- */
  if (!$('.gb-skip')) {
    var skip = document.createElement('a');
    skip.className = 'gb-skip';
    skip.href = '#gb-main';
    skip.textContent = 'Skip to content';
    document.body.insertBefore(skip, document.body.firstChild);
    var wrap = $('.wrap');
    if (wrap && !wrap.id) { wrap.id = 'gb-main'; wrap.tabIndex = -1; }
    skip.addEventListener('click', function () {
      var t = $('.wrap');
      if (t) { try { t.focus({ preventScroll: false }); } catch (e) {} }
    });
  }

  /* ---------- active page in the doc nav ---------- */
  $$('.doc-nav a').forEach(function (a) {
    var href = (a.getAttribute('href') || '').split('#')[0].split('?')[0].toLowerCase();
    if (href === page) {
      a.setAttribute('aria-current', 'page');
      a.classList.remove('ghost');
    }
  });

  /* ---------- back to top ---------- */
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'gb-back-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.textContent = '↑';
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    var h1 = $('h1');
    if (h1) { try { h1.tabIndex = -1; h1.focus({ preventScroll: true }); } catch (e) {} }
  });
  document.body.appendChild(btn);

  function update() {
    var y = window.scrollY || document.documentElement.scrollTop;
    btn.classList.toggle('gb-show', y > 480);
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { update(); ticking = false; });
  }, { passive: true });
  update();

  /* ---------- sticky "Play" CTA on phones (info pages only) ---------- */
  if (page !== 'index.html' && !$('.gb-play-cta') && window.matchMedia && window.matchMedia('(max-width:760px)').matches) {
    var cta = document.createElement('a');
    cta.className = 'gb-play-cta';
    cta.href = standalone ? LIVE_URL : 'index.html';
    cta.innerHTML = '🎪 Play Grinbid — free';
    document.body.appendChild(cta);
    document.body.classList.add('gb-cta-on');
  }

  /* ---------- safe rel on external links ---------- */
  $$('a[href^="http"]').forEach(function (a) {
    if (a.hostname && a.hostname !== location.hostname) {
      var rel = {};
      (a.getAttribute('rel') || '').split(/\s+/).forEach(function (v) { if (v) rel[v] = 1; });
      rel.noopener = 1; rel.noreferrer = 1;
      a.setAttribute('rel', Object.keys(rel).join(' '));
    }
  });

  /* ---------- link back to the Outbid OS research site (report repo only) ---------- */
  // The deployed app ships these pages with data-standalone="1" — there is no
  // parent Outbid OS site there. In the report repo the "../index.html"
  // relative URL resolves to the Outbid OS home page.
  if (!standalone && location.pathname.indexOf('/grinbid/') !== -1) {
    $$('.doc-nav').forEach(function (nav) {
      if (nav.querySelector('.gb-outbid-link')) return;
      var a = document.createElement('a');
      a.className = 'btn ghost small gb-outbid-link';
      a.href = '../index.html';
      a.textContent = '📊 Outbid OS';
      a.title = 'The pay-to-rank market research site';
      nav.appendChild(a);
    });
  }
})();
