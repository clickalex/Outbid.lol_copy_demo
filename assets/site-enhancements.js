(() => {
  if (!document.getElementById('os-enhancement-style')) {
    const style = document.createElement('style');
    style.id = 'os-enhancement-style';
    style.textContent = `.skip-link{position:absolute;left:12px;top:-60px;z-index:1000;padding:10px 14px;border-radius:999px;background:#d9ff65;color:#080806!important;text-decoration:none;font-weight:900}.skip-link:focus{top:12px}.theme-toggle,.idea-tools button,.idea-tools a{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:6px 10px;border:1px solid rgba(255,255,255,.16);border-radius:999px;color:#fff;background:rgba(255,255,255,.06);font:700 10px/1 var(--sans,Arial);text-decoration:none;cursor:pointer}.theme-toggle{min-height:34px;padding:7px 13px}body.light-theme{--ink:#171714;--paper:#f6f1e7;--card:rgba(255,255,255,.86);--line:rgba(23,23,20,.16);--muted:#67645e;background:#f6f1e7!important;color:#171714!important}body.light-theme h1,body.light-theme h2,body.light-theme h3{color:#171714!important}body.light-theme .site-nav{background:rgba(246,241,231,.88)!important}body.light-theme .site-logo,body.light-theme .site-links a,body.light-theme .theme-toggle{color:#171714!important}body.light-theme .panel,body.light-theme .metric,body.light-theme .audit-card,body.light-theme .idea,body.light-theme .card{background:rgba(255,255,255,.72)!important}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}`;
    document.head.appendChild(style);
  }
  const $ = (s, r=document) => r.querySelector(s);
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if (!$('.skip-link')) document.body.insertAdjacentHTML('afterbegin','<a class="skip-link" href="#top">Skip to content</a>');
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
})();
