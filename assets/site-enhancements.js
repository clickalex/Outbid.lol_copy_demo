(() => {
  if (!document.getElementById('os-enhancement-style')) {
    const style = document.createElement('style');
    style.id = 'os-enhancement-style';
    style.textContent = `.skip-link{position:absolute;left:12px;top:-60px;z-index:1000;padding:10px 14px;border-radius:999px;background:#d9ff65;color:#080806!important;text-decoration:none;font-weight:900}.skip-link:focus{top:12px}.theme-toggle,.idea-tools button,.idea-tools a{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:6px 10px;border:1px solid rgba(255,255,255,.16);border-radius:999px;color:#fff;background:rgba(255,255,255,.06);font:700 10px/1 var(--sans,Arial);text-decoration:none;cursor:pointer}.theme-toggle{min-height:34px;padding:7px 13px}.site-links .grinbid-link,.mobile-bottom-nav .grinbid-link{color:#080806!important;border-color:var(--lime,#d9ff65)!important;background:var(--lime,#d9ff65)!important;font-weight:900!important;box-shadow:0 0 26px rgba(217,255,101,.22)!important}.site-links .grinbid-link::after{content:"↗";margin-left:5px;font-size:.9em}body.light-theme{--ink:#171714;--paper:#f6f1e7;--card:rgba(255,255,255,.86);--line:rgba(23,23,20,.16);--muted:#67645e;background:#f6f1e7!important;color:#171714!important}body.light-theme h1,body.light-theme h2,body.light-theme h3{color:#171714!important}body.light-theme .site-nav{background:rgba(246,241,231,.88)!important}body.light-theme .site-logo,body.light-theme .site-links a,body.light-theme .theme-toggle{color:#171714!important}body.light-theme .panel,body.light-theme .metric,body.light-theme .audit-card,body.light-theme .idea,body.light-theme .card{background:rgba(255,255,255,.72)!important}
.read-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:999;background:transparent;pointer-events:none}.read-progress>i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--red,#f04d35),var(--lime,#d9ff65));box-shadow:0 0 10px rgba(217,255,101,.5);transition:width .08s linear}
.back-top{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:80;width:46px;height:46px;border-radius:50%;border:2px solid var(--ink,#171714);background:var(--red,#f04d35);color:#fff!important;font-size:18px;font-weight:900;line-height:1;box-shadow:var(--shadow,0 18px 50px rgba(37,31,20,.25));cursor:pointer;display:grid;place-items:center;opacity:0;transform:translateY(14px) scale(.9);pointer-events:none;transition:opacity .18s ease,transform .18s ease}.back-top.show{opacity:1;transform:none;pointer-events:auto}.back-top:hover{background:var(--red-dark,#bb2f21)}.back-top:focus-visible{outline:3px solid var(--blue,#345bc4);outline-offset:3px}
body.has-bottom-nav .back-top{bottom:calc(76px + env(safe-area-inset-bottom))}
.search-hint kbd{display:inline-block;padding:1px 6px;border:1px solid var(--line,#c9c1b3);border-radius:6px;background:var(--card,#fffdf7);font:700 11px/1.4 var(--mono,monospace);color:var(--muted,#67645e)}
.reading-time{font-family:var(--mono,monospace);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#67645e)}
@media (max-width:900px){.read-progress{height:2px}.back-top{right:10px;width:44px;height:44px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}.read-progress>i{transition:none}}`;
    document.head.appendChild(style);
  }
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  if (!$('.skip-link')) document.body.insertAdjacentHTML('afterbegin','<a class="skip-link" href="#top">Skip to content</a>');

  // ---------- reading progress bar ----------
  let bar = $('.read-progress');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'read-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<i></i>';
    document.body.appendChild(bar);
  }
  const barFill = $('i', bar);

  // ---------- back-to-top button ----------
  let backTop = $('.back-top');
  if (!backTop) {
    backTop = document.createElement('button');
    backTop.type = 'button';
    backTop.className = 'back-top';
    backTop.setAttribute('aria-label', 'Back to top');
    backTop.innerHTML = '↑';
    backTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const firstHeading = $('main h1, .wrap h1, h1');
      if (firstHeading) { try { firstHeading.setAttribute('tabindex', '-1'); firstHeading.focus({ preventScroll: true }); } catch {} }
    });
    document.body.appendChild(backTop);
  }

  const updateScrollUI = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const y = window.scrollY || doc.scrollTop;
    const pct = max > 0 ? Math.min(1, y / max) : 0;
    barFill.style.width = (pct * 100).toFixed(2) + '%';
    const show = y > 480;
    backTop.classList.toggle('show', show);
  };
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => { updateScrollUI(); scrollTicking = false; });
  }, { passive: true });
  updateScrollUI();

  // ---------- keyboard: "/" focuses the first search box, Esc blurs ----------
  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || (document.activeElement && document.activeElement.isContentEditable);
    if (e.key === '/' && !typing) {
      const search = $('input[type="search"], input[name="q"], input[placeholder*="search" i], input[placeholder*="Search"]');
      if (search) { e.preventDefault(); search.focus(); search.select && search.select(); }
    }
  });

  // ---------- external links: safe rel attributes ----------
  $$('a[href^="http"]').forEach(a => {
    if (a.hostname && a.hostname !== location.hostname) {
      const rel = new Set((a.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener'); rel.add('noreferrer');
      a.setAttribute('rel', [...rel].join(' '));
      if (!a.hasAttribute('target') || a.target === '_blank') { /* leave authored target as-is */ }
    }
  });

  const nav = $('.site-nav');
  if (nav) {
    const page = document.body.dataset.page;
    nav.querySelectorAll(`[data-page="${page}"]`).forEach(a => a.setAttribute('aria-current','page'));
    if (!$('.theme-toggle', nav)) {
      const btn = document.createElement('button'); btn.className='theme-toggle'; btn.type='button'; btn.textContent='Theme'; btn.setAttribute('aria-label','Toggle light and dark theme'); nav.appendChild(btn);
      btn.onclick = () => { document.body.classList.toggle('light-theme'); localStorage.setItem('outbid-theme', document.body.classList.contains('light-theme') ? 'light' : 'dark'); };
    }
    const toggle = $('.nav-toggle', nav);
    const links = $('.site-links', nav);
    if (toggle && links) {
      const mq = window.matchMedia ? window.matchMedia('(max-width: 900px)') : { matches: false };
      if (!links.id) links.id = 'site-links';
      toggle.type = 'button';
      toggle.setAttribute('aria-controls', links.id);
      toggle.setAttribute('aria-expanded', 'false');
      let scrim = null;
      const isOpen = () => nav.classList.contains('is-open');
      const panelMode = () => mq.matches;
      function setOpen(open) {
        if (isOpen() === open) return;
        nav.classList.toggle('is-open', open);
        document.body.classList.toggle('nav-open', open && panelMode());
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? 'Close' : 'Menu';
        if (open && panelMode() && !scrim) {
          scrim = document.createElement('button');
          scrim.className = 'nav-scrim'; scrim.type = 'button';
          scrim.setAttribute('aria-label', 'Close menu');
          scrim.addEventListener('click', () => setOpen(false));
          document.body.appendChild(scrim);
        } else if ((!open || !panelMode()) && scrim) { scrim.remove(); scrim = null; }
      }
      toggle.addEventListener('click', () => {
        const open = !isOpen();
        setOpen(open);
        if (open) { const first = links.querySelector('a'); if (first) first.focus({ preventScroll: true }); }
        else toggle.focus({ preventScroll: true });
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus({ preventScroll: true }); }
      });
      // tapping a link in the panel should close it, so the target page isn't hidden behind the menu
      links.addEventListener('click', e => { if (e.target.closest('a') && panelMode()) setOpen(false); });
      const sync = () => { if (!panelMode() && isOpen()) setOpen(false); };
      if (mq.addEventListener) mq.addEventListener('change', sync);
      else if (mq.addListener) mq.addListener(sync);   // Safari < 14
      window.addEventListener('resize', sync);
      window.addEventListener('hashchange', () => { if (isOpen()) setOpen(false); });
    }
  }
  // the fixed bottom quick-bar overlaps the floating back-to-top on phones
  if ($('.mobile-bottom-nav')) document.body.classList.add('has-bottom-nav');

  // Add a prominent link to the live Grinbid app in every navigation; opens in a new tab.
  document.querySelectorAll('.site-links, .mobile-bottom-nav').forEach(navLinks => {
    if (navLinks.querySelector('.grinbid-link')) {
      // hardcoded links (e.g. on index.html) still point at the old demo path
      navLinks.querySelectorAll('.grinbid-link').forEach(a => {
        if (!/^https?:/.test(a.getAttribute('href'))) a.href = 'https://grinbid-8h5e.onrender.com/';
      });
      return;
    }
    const a = document.createElement('a');
    a.className = 'grinbid-link';
    a.href = 'https://grinbid-8h5e.onrender.com/';
    a.textContent = 'Grinbid';
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'Open the live Grinbid app in a new tab');
    navLinks.appendChild(a);
  });
  if (localStorage.getItem('outbid-theme') === 'light') document.body.classList.add('light-theme');
  document.querySelectorAll('.idea').forEach(card => {
    const h = $('h3', card); if (!h) return;
    if (!card.id) card.id = slug(h.textContent);
    let tools = $('.idea-tools', card);
    if (!tools) { tools = document.createElement('div'); tools.className = 'idea-tools'; card.appendChild(tools); }
    if (!$('.copy-idea', tools)) {
      const b = document.createElement('button'); b.type='button'; b.className='copy-idea'; b.textContent='Copy pitch';
      b.onclick = async () => { await navigator.clipboard?.writeText(`${h.textContent.trim()} — ${($('.pitch',card)?.textContent||'').trim()}`); b.textContent='Copied'; setTimeout(()=>b.textContent='Copy pitch',1200); };
      tools.appendChild(b);
    }
    if (!$('.share-idea', tools)) {
      const a = document.createElement('a'); a.className='share-idea'; a.textContent='Share'; a.href=`https://twitter.com/intent/tweet?text=${encodeURIComponent(h.textContent.trim())}&url=${encodeURIComponent(location.origin+location.pathname+'#'+card.id)}`; a.target='_blank'; a.rel='noopener'; tools.appendChild(a);
    }
  });

  // ---------- reading-time chip on long report pages ----------
  try {
    const main = $('main') || document.body;
    const words = (main.innerText || main.textContent || '').trim().split(/\s+/).length;
    if (words > 1400) {
      const mins = Math.max(1, Math.round(words / 220));
      const meta = $('.report-meta, .article-meta, .lede-meta') || $('h1');
      if (meta && !$('.reading-time')) {
        const chip = document.createElement('span');
        chip.className = 'reading-time';
        chip.textContent = `~${mins} min read · ${words.toLocaleString()} words`;
        chip.style.marginLeft = '12px';
        meta.insertAdjacentElement('afterend', chip);
      }
    }
  } catch {}

  // ---------- annotate the first search field with a "/" hint ----------
  const firstSearch = $('input[type="search"], input[name="q"], input[placeholder*="search" i], input[placeholder*="Search"]');
  if (firstSearch && window.matchMedia && matchMedia('(min-width: 901px)').matches) {
    const wrap = firstSearch.closest('label, .search-box, .field, .controls, form') || firstSearch.parentElement;
    if (wrap && !$('.search-hint', wrap)) {
      const hint = document.createElement('span');
      hint.className = 'search-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.innerHTML = '<kbd>/</kbd>';
      hint.style.cssText = 'margin-left:8px;display:inline-flex;align-items:center';
      try { wrap.appendChild(hint); } catch {}
    }
  }
})();
