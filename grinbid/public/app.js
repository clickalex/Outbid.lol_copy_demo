'use strict';
/* ============================================================
   Grinbid SPA — vanilla JS, hash routing, Server-Sent Events.
   No frameworks. No build step. 100% free virtual coins.
   ============================================================ */
(() => {

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const timeAgo = (iso) => {
    const d = (Date.now() - Date.parse(iso)) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    return Math.floor(d / 86400) + 'd ago';
  };

  const S = {
    me: null,
    profiles: [],
    feed: [],
    online: 0,
    current: null,
    query: {},
    navOpen: false,
    adminSession: false, // true when an admin-PASSWORD session is active
    sseTimer: null,
    sseClosed: false
  };

  // Admin UI is visible to BOTH a founder-user (S.me.isAdmin) and an
  // admin-password session (S.adminSession).
  const isAdminUI = () => Boolean((S.me && S.me.isAdmin) || S.adminSession);

  const AVATARS = ['😀', '😎', '🤓', '🦊', '🐱', '🐶', '🦄', '🐸', '🐙', '👻', '🤖', '🐹', '🎤', '🎸', '🍕', '🍩', '🌈', '⚡', '⭐', '🍀'];
  const CATS = {
    celebrity: { label: 'Celebrity', color: 'pink' },
    character: { label: 'Character', color: 'orange' },
    influencer: { label: 'Influencer', color: 'sky' },
    estate: { label: 'Estate', color: 'mint' },
    venue: { label: 'Venue', color: 'yellow' },
    brand: { label: 'Brand', color: 'purple' },
    community: { label: 'Community', color: 'mint' }
  };

  window.GB = { api, toast, go, openAuth, openBoost, openClaim, submitClaim, claimDaily, claimLucky, doBoost, refresh, setAvatar, submitAuth, logout, shareCode, claimTask, donate, createProfile, handleImage, homeSearch, search, setHomePeriod, demoBoost, demoApprove, demoSettle, demoAction, setDemoPeriod, adminLogin, adminAction, profileDecision, claimDecision, copyText, toggleNav, closeNav, backTop, closeModal, awardUserCoins };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ------------------------------------------------------------------ API
  async function api(path, opts = {}) {
    const init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    const res = await fetch('/api' + path, init);
    let data = null;
    try { data = await res.json(); } catch { }
    if (!res.ok) {
      const err = new Error((data && data.error) || ('http_' + res.status));
      err.status = res.status;
      err.data = data || {};
      throw err;
    }
    return data;
  }

  // ------------------------------------------------------------------ UI helpers
  function toast(msg, kind = '') {
    const box = $('#toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }

  function modal(html, opts = {}) {
    closeModal();
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.id = 'modalBack';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${opts.noClose ? '' : '<button class="close" onclick="GB.closeModal()">✕</button>'}${html}</div>`;
    back.addEventListener('click', (e) => { if (e.target === back && !opts.noClose) closeModal(); });
    document.body.appendChild(back);
    return back;
  }

  function closeModal() {
    const m = $('#modalBack');
    if (m) m.remove();
  }
  window.closeModal = closeModal;

  // Confetti: classic little squares + emoji bursts.
  function confetti(burst = 120) {
    const cv = $('#confetti');
    const ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const colors = ['#ff4fa3', '#ff9f1c', '#ffd23f', '#3ddc97', '#4cc9f0', '#9b5de5', '#ef476f'];
    const parts = Array.from({ length: burst }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * innerWidth * .8,
      y: innerHeight * .45 + (Math.random() - .5) * 40,
      vx: (Math.random() - .5) * 11,
      vy: -Math.random() * 13 - 4,
      g: .32,
      s: 6 + Math.random() * 7,
      r: Math.random() * Math.PI,
      vr: (Math.random() - .5) * .35,
      c: colors[(Math.random() * colors.length) | 0],
      e: Math.random() < .18
    }));
    let frame = 0;
    (function tick() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        if (p.e) { ctx.font = `${p.s + 6}px serif`; ctx.fillText('✨', -p.s / 2, p.s / 2); }
        else { ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .7); }
        ctx.restore();
      }
      frame += 1;
      if (frame < 140) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
  }

  function go(hash) {
    location.hash = hash.startsWith('#') ? hash : '#' + hash;
  }

  function copyText(text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => toast('Copied! 📋', 'good'))
      .catch(() => toast('Copy failed — select manually', 'bad'));
  }

  // ------------------------------------------------------------------ Auth (modal)
  function openAuth(mode = 'signup') {
    const isSignup = mode === 'signup';
    modal(`
      <h2>${isSignup ? 'Join the carnival 🎪' : 'Welcome back! 👋'}</h2>
      <p class="muted"><b>100% free.</b> You get <b>${fmt(2500)} coins</b> just for joining. No real money, ever.</p>
      <form onsubmit="GB.submitAuth(event, '${isSignup ? 'signup' : 'login'}')">
        <label class="field"><span class="lbl">Username</span>
          <input name="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" required placeholder="cool_fan_01"></label>
        ${isSignup ? `
        <label class="field"><span class="lbl">Email <span class="muted small">(so we can tell you when your fan page goes up or down)</span></span>
          <input name="email" type="email" maxlength="120" required placeholder="you@example.com"></label>
        <div class="two-col">
          <label class="field"><span class="lbl">Display name</span>
            <input name="displayName" maxlength="24" placeholder="Cool Fan"></label>
          <label class="field"><span class="lbl">Referral code (optional)</span>
            <input name="referralCode" maxlength="32" placeholder="GB-XXXXXX-XXXX"></label>
        </div>
        <div class="field"><span class="lbl">Pick your emoji avatar</span>
          <div class="emoji-picker" id="avatarPick">
            ${AVATARS.map((a, i) => `<button type="button" class="${i === 0 ? 'sel' : ''}" data-a="${a}" onclick="GB.setAvatar('${a}', this)">${a}</button>`).join('')}
          </div></div>` : ''}
        <label class="field"><span class="lbl">Password (min 8 chars)</span>
          <input name="password" type="password" minlength="8" maxlength="128" required></label>
        <button class="btn big ${isSignup ? 'pink' : 'mint'}" type="submit" id="authSubmit" style="width:100%">${isSignup ? '🎟️ Claim my 2500 free coins' : '🚪 Log in'}</button>
        <button class="btn ghost mt" type="button" onclick="GB.closeModal()" style="width:100%">Cancel</button>
      </form>
      <p class="center mt muted">
        ${isSignup ? 'Already a booster? ' : 'New to Grinbid? '}
        <a href="#" onclick="GB.openAuth('${isSignup ? 'login' : 'signup'}');return false">${isSignup ? 'Log in' : 'Sign up'}</a>
      </p>
      <div class="notice legal mt">
        Grinbid coins are <b>virtual and hold zero cash value</b>. They cannot be purchased, sold, transferred for money or redeemed. Boost by backing faves, never by paying.
      </div>`, { noClose: false });
  }

  let pendingAvatar = '😀';
  function setAvatar(a, btn) {
    pendingAvatar = a;
    $$('#avatarPick button').forEach((b) => b.classList.remove('sel'));
    if (btn) btn.classList.add('sel');
  }

  async function submitAuth(ev, mode) {
    ev.preventDefault();
    const form = ev.target;
    const fd = new FormData(form);
    const body = {
      username: fd.get('username'),
      password: fd.get('password'),
      displayName: fd.get('displayName') || undefined,
      referralCode: fd.get('referralCode') || undefined
    };
    if (mode === 'signup') {
      body.avatar = pendingAvatar;
      body.email = fd.get('email');
    }
    const btn = $('#authSubmit');
    btn.disabled = true; btn.textContent = '…';
    try {
      const data = await api('/auth/' + mode, { method: 'POST', body });
      await refresh();
      closeModal();
      if (mode === 'signup') {
        toast('Welcome to Grinbid! +2,500 coins 🎉', 'good');
        confetti();
      } else {
        toast('Welcome back, ' + (S.me.displayName || S.me.username) + '! 👋', 'good');
      }
      render();
    } catch (err) {
      const friendly = {
        invalid_email: 'Please enter a valid email address.',
        email_in_use: 'That email is already registered — try logging in.',
        username_taken: 'That username is taken — try another!',
        invalid_credentials: 'Wrong username or password.',
        invalid_username: 'Usernames are 3–20 letters, numbers or _',
        invalid_password: 'Password must be at least 8 characters.'
      };
      toast(friendly[err.message] || err.message, 'bad');
    } finally {
      btn.disabled = false;
      btn.textContent = mode === 'signup' ? '🎟️ Claim my 2500 free coins' : '🚪 Log in';
    }
  }

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { }
    S.me = null;
    toast('Logged out. See you soon! 👋');
    // render exactly once: navigate to home and let hashchange do the render,
    // unless we are already on home (no hashchange fires then)
    if ((S.current || 'home') === 'home') render();
    else go('#/home');
  }

  // ------------------------------------------------------------------ Header
  function headerHTML() {
    const m = S.me;
    return `
    <header class="topbar"><div class="wrap topbar-inner">
      <a class="logo" href="#/home"><span class="lolly">🎪</span> Grinbid</a>
      <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="${Boolean(S.navOpen)}" aria-controls="nav" onclick="GB.toggleNav()">${S.navOpen ? '✕' : '☰'}</button>
      <nav class="nav${S.navOpen ? ' open' : ''}" id="nav">
        <a href="#/home" data-r="home">Home</a>
        <a href="#/discover" data-r="discover">Discover</a>
        <a href="#/winners" data-r="winners">🏆 Winners</a>
        <a href="#/tasks" data-r="tasks">Tasks</a>
        <a href="#/wallet" data-r="wallet">Wallet</a>
        <a href="#/refer" data-r="refer">Refer</a>
        <a href="#/create" data-r="create">Create</a>
        ${m ? '<a href="#/mine" data-r="mine">My page</a>' : ''}
        <a href="#/donate" data-r="donate">Donate</a>
        ${isAdminUI() ? '<a href="#/admin" data-r="admin">Admin</a>' : ''}
        ${isAdminUI() ? '<a href="#/demo" data-r="demo">🧪 Demo</a>' : ''}
      </nav>
      ${m ? `
        <span class="streak-pill" title="Daily streak">🔥 ${m.streakCount}</span>
        <span class="wallet-pill" onclick="go('#/wallet')"><span class="coin">🪙</span> ${fmt(m.coins)}</span>
        <span class="avatar-chip" title="${esc(m.username)}" onclick="go('#/wallet')">${esc(m.avatar)}</span>
      ` : `
        <button class="btn pink" onclick="GB.openAuth('signup')">Sign up · +2,500</button>
        <button class="btn ghost" onclick="GB.openAuth('login')">Log in</button>
        <span class="sticker fan">🟢 ${S.online} online</span>
      `}
    </div></header>`;
  }

  function refreshHeader() {
    const host = $('#app');
    if (!host) return;
    if (!$('.topbar')) return;
    const old = $('.topbar');
    const tmp = document.createElement('div');
    tmp.innerHTML = headerHTML();
    old.replaceWith(tmp.firstElementChild);
    setNav();
  }

  function setNav() {
    const r = (S.current || 'home').split('/')[0];
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r));
  }

  // Mobile hamburger menu — toggled in place (no re-render, no scroll loss).
  function toggleNav() {
    S.navOpen = !S.navOpen;
    paintNav();
  }

  function closeNav() {
    if (!S.navOpen) return;
    S.navOpen = false;
    paintNav();
  }

  function paintNav() {
    const nav = $('#nav');
    if (nav) nav.classList.toggle('open', Boolean(S.navOpen));
    const t = $('#navToggle');
    if (t) {
      t.setAttribute('aria-expanded', String(Boolean(S.navOpen)));
      t.textContent = S.navOpen ? '✕' : '☰';
    }
  }

  function footerHTML() {
    return `
    <footer class="site"><div class="wrap">
      <div class="row spread">
        <div><b>🎪 Grinbid</b> — Bid. Back. Rank up.</div>
        <div class="row">
          <a href="how-it-works.html">How it works</a> <a href="rules.html">Rules</a>
          <a href="coins.html">Coins</a> <a href="leaderboard.html">Leaderboard</a>
          <a href="faq.html">FAQ</a> <a href="about.html">About</a>
          <a href="#/terms">Terms</a> <a href="privacy.html">Privacy</a>
        </div>
      </div>
      <p class="small" style="opacity:.85">
        Grinbid is a fan-made game of <b>100% free virtual coins</b>. Coins have <b>zero cash value</b>, cannot be bought,
        sold or redeemed, and nothing here is gambling or real-money trade. Donations are voluntary, non-reward contributions only.
        Seeded profiles are <b>fan-created</b> and are not affiliated with, endorsed by, or connected to the real entities, estates,
        artists or venues depicted.
      </p>
      <p class="small" style="opacity:.7">© ${new Date().getFullYear()} Grinbid · Made with 🍭 and zero npm dependencies.</p>
    </div></footer>`;
  }

  function shellHTML(view) {
    return `<div id="app">
      <a class="gb-skip" href="#view">Skip to content</a>
      ${headerHTML()}
      <main class="wrap view" id="view">${view}</main>
      ${footerHTML()}
      <button type="button" class="gb-back-top" id="gbBackTop" aria-label="Back to top" onclick="GB.backTop()">↑</button>
      <div id="toasts"></div>
      <canvas id="confetti"></canvas>
    </div>`;
  }

  // back-to-top visibility is driven by a scroll listener registered once at boot
  function backTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const v = $('#view');
    if (v) { try { v.tabIndex = -1; v.focus({ preventScroll: true }); } catch {} }
  }

  // ------------------------------------------------------------------ Data
  async function refresh(quiet = true) {
    try {
      const data = await api('/me');
      S.me = data.user;
    } catch (err) {
      S.me = null;
      if (!quiet) toast(err.message, 'bad');
    }
    // Detect an admin-password session too (founder users are admin via /me).
    try {
      const asess = await api('/admin/session');
      S.adminSession = Boolean(asess.admin);
    } catch { S.adminSession = false; }
    return S.me;
  }

  async function loadHomeData() {
    const [lb, feed, profiles, winners] = await Promise.all([
      api('/leaderboard'), api('/feed'), api('/profiles'), api('/winners')
    ]);
    return { lb, feed, profiles, winners };
  }

  // Real-money announcement. Prizes are coins today; every winner is recorded
  // and will be paid cash once real-money prizes launch.
  const REAL_MONEY_HTML = `
      <div class="notice cash-notice">
        <b>💰 Real cash prizes are coming — stay tuned!</b> Right now every prize is paid in <b>free coins</b>.
        We are <b>permanently recording every weekly, monthly &amp; season winner</b>. Once Grinbid is fully
        operating and legally set up, real-money prizes switch on and <b>all winners — past and present — get paid out</b>.
      </div>`;

  const MEDALS = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
  const PERIOD_TABS = [['week', 'Weekly'], ['month', 'Monthly'], ['season', 'Season']];
  const homePeriod = () => S.homePeriod || 'season';

  // Fandom ranking = the celeb/character pages, ordered by love. Top 5.
  function fandomRows(L) {
    return (L.fandom || []).slice(0, 5).map((f, i) => `
      <a class="list-row fandom-row" href="#/profile/${esc(f.slug)}">
        <span class="tag rank-medal" style="width:44px">${MEDALS[i] || '#' + (i + 1)}</span>
        ${f.image ? `<img class="fandom-thumb" src="${f.image}" alt="">` : `<span class="avatar">${esc(f.emoji || '\u2B50')}</span>`}
        <span class="grow"><b>${esc(f.realName || f.name)}</b>${f.verified ? ' \uD83D\uDFE2' : ''}<br>
          <span class="muted small">${esc(f.name)} · ${(CATS[f.category] || {}).label || f.category}</span></span>
        <span class="tag">🔥 ${fmt(f.love)}</span>
      </a>`).join('') || '<p class="muted">No fandom love yet — boost your idol to crown them!</p>';
  }

  // Fan ranking = the boosters, ordered by points (they win the coin prizes).
  function fanRows(L, limit = 5) {
    return (L.fans || []).slice(0, limit).map((u, i) => `
      <div class="list-row">
        <span class="tag" style="width:44px">${MEDALS[i] || '#' + (i + 1)}</span>
        <span class="avatar">${esc(u.avatar)}</span>
        <span class="grow"><b>${esc(u.displayName || u.username)}</b><br><span class="muted small">@${esc(u.username)}</span></span>
        <span class="tag">${fmt(u.points)} pts</span>
      </div>`).join('') || '<p class="muted">No boosters yet — be the first!</p>';
  }

  function periodTabsHtml(active) {
    return `<div class="period-tabs" id="periodTabs">
      ${PERIOD_TABS.map(([k, label]) => `<button class="period-tab${k === active ? ' on' : ''}" data-p="${k}" onclick="GB.setHomePeriod('${k}')">${label}</button>`).join('')}
    </div>`;
  }

  // ------------------------------------------------------------------ Screens
  const VIEWS = {};

  // ---- 1. Home — FANDOM FIRST (the idols), then the fans
  VIEWS.home = async () => {
    const data = await loadHomeData();
    const m = S.me;
    const ladder = data.lb.ladders[homePeriod()] || data.lb.ladders.season;
    const ends = new Date(ladder.endsAt).toLocaleDateString();
    const prizeStr = (ladder.fanPrizes || []).map((x) => fmt(x)).join(' / ');

    const feedRows = data.feed.boosts.slice(0, 8).map((b) => `
      <div class="list-row">
        <span class="avatar">${esc(b.avatar)}</span>
        <span class="grow"><b>${esc(b.username)}</b> boosted <a href="#/profile/${esc(b.profileSlug)}">${b.profileEmoji} ${esc(b.profileName)}</a>
          <br><span class="muted small">${fmt(b.amount)} coins → ${fmt(b.value)} pts ${b.selfBoost ? '<span class="sticker self">self ×1.5</span>' : ''} · ${timeAgo(b.at)}</span></span>
        <span class="tag">🔥</span>
      </div>`).join('') || '<p class="muted">The boost feed is quiet… start the party! \uD83C\uDF89</p>';

    const allProfiles = data.profiles.profiles || [];
    const top = allProfiles.slice(0, 8).map(p => profileCard(p)).join('');

    return `
      <section class="card hero">
        <span class="sticker fan">100% free coins</span>
        <span class="sticker seed">fandom first</span>
        <h1>Crown your idol 🏆</h1>
        <p class="tagline">In India we don't just watch our stars — we live for them. Salman vs SRK, Hulk vs Iron Man, Ronaldo vs Messi. Boost your celeb or character with free coins and push them to <b>#1</b>. The most-loved fandom wins the crown; the fans behind them win coins.</p>
        <div class="row mt">
          ${m ? `<button class="btn big pink" onclick="document.getElementById('fanGrid')?.scrollIntoView({behavior:'smooth'})">🔥 Boost your fave</button>
                 <button class="btn big" style="background:#fff" onclick="go('#/wallet')">\uD83E\uDE99 My wallet</button>`
             : `<button class="btn big pink" onclick="GB.openAuth('signup')">\uD83C\uDF9F️ Join free — get ${fmt(2500)} coins</button>
                <button class="btn big" style="background:#fff" onclick="document.getElementById('fandomBoard')?.scrollIntoView({behavior:'smooth'})">👀 See who's on top</button>`}
        </div>
        <p class="small" style="margin-top:14px">\uD83E\uDE99 Virtual coins only — zero cash value today. Real cash prizes are coming; every winner is recorded. <a href="#/winners">See winners →</a></p>
      </section>

      ${REAL_MONEY_HTML}

      <h2 class="section-title" id="fandomBoard">🌟 Fandom leaderboard — top idols <span class="muted small">(${ladder.label} · crown resets ${ends})</span></h2>
      ${periodTabsHtml(homePeriod())}
      <div class="card season-card fandom-card">${fandomRows(ladder)}</div>

      <h2 class="section-title">\uD83C\uDF96️ Top fans <span class="muted small">(${ladder.label} · coin prizes ${prizeStr})</span></h2>
      <div class="card season-card">${fanRows(ladder)}</div>
      <p class="muted small center">Fans earn points by boosting — 1 point per coin, ×1.5 on your own page. Top 3 fans win ${prizeStr} coins each ${ladder.label.toLowerCase()}. <a href="#/winners">Hall of winners →</a></p>

      <div class="stripe">
        <div class="stat"><div class="n">\uD83D\uDDD3️ Weekly</div><div class="l">${fmt(data.lb.ladders.week.fanPrizes[0])} top fan prize</div></div>
        <div class="stat"><div class="n">\uD83D\uDCC5 Monthly</div><div class="l">${fmt(data.lb.ladders.month.fanPrizes[0])} top fan prize</div></div>
        <div class="stat"><div class="n">🏆 Season</div><div class="l">${fmt(data.lb.ladders.season.fanPrizes[0])} grand prize</div></div>
        <div class="stat"><div class="n">💰 Cash</div><div class="l">coming — winners recorded</div></div>
      </div>

      <h2 class="section-title">💖 All fan pages — ranked by love <span class="muted small">${allProfiles.length} live</span></h2>
      <div class="card mb row" id="homeSearch">
        <input id="homeQ" style="max-width:340px" placeholder="Search Salman, Hulk, Messi…" onkeydown="if(event.key==='Enter')GB.homeSearch()">
        <select id="homeCat" onchange="GB.homeSearch()">
          <option value="">All categories</option>
          ${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
        </select>
        <button class="btn sky" onclick="GB.homeSearch()">Search</button>
      </div>
      <div class="notice legal">
        🏷️ Every page is a <b>fan-made tribute</b> — not affiliated with or endorsed by the real people, characters,
        estates, venues or brands shown. New pages go live after admin approval. Real owners can <b>claim</b> a page.
      </div>
      <div class="grid" id="fanGrid">
        ${top || '<p class="muted">No fan pages yet — be the first to create one!</p>'}
      </div>
      <div id="homeMore"></div>

      <div class="two-col mt">
        <div>
          <h2 class="section-title">⚡ Live boost feed</h2>
          <div class="card">${feedRows}</div>
        </div>
        <div>
          <h2 class="section-title">🚀 Want a page for YOUR fave?</h2>
          <div class="card center">
            <p class="muted">Create a fan page, upload a photo, and once approved your idol joins the ranking. Fans of Salman, Hulk, Tony and the rest are already here — add yours!</p>
            <button class="btn big purple" onclick="${m ? "go('#/create')" : "GB.openAuth('signup')"}">✨ Create a fan page</button>
          </div>
        </div>
      </div>`;
  };

  // Switch the home fandom/fan board between weekly / monthly / season.
  function setHomePeriod(p) {
    S.homePeriod = (['week', 'month', 'season'].includes(p)) ? p : 'season';
    render();
  }

  async function homeSearch() {
    const q = $('#homeQ').value.trim();
    const cat = $('#homeCat').value;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat) params.set('category', cat);
    const data = await api('/profiles' + (params.toString() ? '?' + params : ''));
    const grid = $('#fanGrid');
    if (grid) grid.innerHTML = data.profiles.map(profileCard).join('') || '<p class="muted">Nothing matches — try another search, or create that fan page yourself!</p>';
    const more = $('#homeMore');
    if (more) more.innerHTML = '';
  }


  // ---- 2. Discover
  VIEWS.discover = async () => {
    const q = S.query && S.query.q || '';
    const cat = S.query && S.query.cat || '';
    const params = new URLSearchParams();
    if (q) params.set('q', q); if (cat) params.set('category', cat);
    const data = await api('/profiles' + (params.toString() ? '?' + params : ''));
    return `
      <h1 class="section-title">🔭 Discover</h1>
      <div class="card mb row">
        <input id="q" style="max-width:340px" placeholder="Search names, tags…" value="${esc(q)}" onkeydown="if(event.key==='Enter')GB.search()">
        <select id="cat" onchange="GB.search()">
          <option value="">All categories</option>
          ${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${cat === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
        <button class="btn sky" onclick="GB.search()">Search</button>
      </div>
      <div class="notice legal">
        🏷️ All pages below are <b>fan-created tributes</b>. They are not affiliated with, endorsed by, or connected to the real people,
        estates, venues or brands shown. Real owners can <b>claim</b> a page — the badge flips to 🟢 when verified by moderators.
      </div>
      <div class="grid" id="profileGrid">
        ${data.profiles.map(profileCard).join('') || '<p class="muted">Nothing matches. Try another search!</p>'}
      </div>`;
  };

  function profileMedia(p, big) {
    if (p.image) {
      return `<img class="profile-img${big ? ' big' : ''}" src="${p.image}" alt="${esc(p.realName || p.name)} fan art" loading="lazy">`;
    }
    return `<span class="profile-emoji${big ? ' big' : ''}">${esc(p.emoji)}</span>`;
  }

  function profileCard(p) {
    const cat = CATS[p.category] || { label: p.category };
    return `
    <a class="card profile-card" href="#/profile/${esc(p.slug)}">
      <div class="row spread">
        ${profileMedia(p, false)}
        <span class="ta-right">
          <span class="cat-badge">${esc(cat.label)}</span><br>
          ${p.status === 'pending' ? '<span class="sticker" style="background:var(--yellow)">⏳ pending approval</span>'
            : '<span class="sticker fan">fan-made</span>'}
          ${p.verified ? '<span class="sticker verified">🟢 verified</span>' : ''}
        </span>
      </div>
      <h3 style="margin:.3em 0">${esc(p.realName && p.realName !== p.name ? p.realName : p.name)}</h3>
      ${p.realName && p.realName !== p.name ? `<p class="muted small" style="margin:.1em 0">${esc(p.name)}</p>` : ''}
      <p class="muted small" style="margin:.2em 0">${esc(p.tagline || '')}</p>
      <div class="boost-meter"><div style="width:${Math.min(100, Math.log10(1 + p.boostTotal) * 20)}%"></div></div>
      <div class="row spread mt small">
        <span>🪙 <b>${fmt(p.boostTotal)}</b> boosted</span>
        <span>👥 ${fmt(p.fanCount)} fans</span>
      </div>
    </a>`;
  }

  // ---- 3. Profile detail
  VIEWS.profile = async (slug) => {
    const data = await api('/profiles/' + encodeURIComponent(slug));
    const p = data.profile;
    const cat = CATS[p.category] || { label: p.category };
    const m = S.me;
    const selfBoost = p.isMineProfile;
    const boostRows = (p.recentBoosts || []).slice(0, 8).map((b) => `
      <div class="list-row">
        <span class="avatar">${esc(b.avatar)}</span>
        <span class="grow"><b>${esc(b.username)}</b> · ${fmt(b.amount)} 🪙 → ${fmt(b.value)} pts ${b.selfBoost ? '<span class="sticker self">own page ×1.5</span>' : ''}</span>
        <span class="muted small">${timeAgo(b.at)}</span>
      </div>`).join('') || '<p class="muted">No boosts yet. First one? 🚀</p>';

    return `
      <a class="btn ghost small" href="#/home">← Back to home</a>
      <div class="card mt profile-detail-head">
        ${p.image ? `<img class="profile-img big hero-img" src="${p.image}" alt="${esc(p.realName || p.name)} fan art">` : ''}
        <div class="row spread">
          <div class="row">
            ${p.image ? '' : `<span class="avatar big">${esc(p.emoji)}</span>`}
            <div>
              <h2 style="margin:0">${esc(p.realName && p.realName !== p.name ? p.realName : p.name)}</h2>
              ${p.realName && p.realName !== p.name ? `<p class="muted small" style="margin:.1em 0">${esc(p.name)}</p>` : ''}
              <span class="cat-badge">${esc(cat.label)}</span>
              ${p.status === 'pending' ? '<span class="sticker" style="background:var(--yellow)">⏳ waiting for admin approval</span>' : ''}
              <span class="sticker fan">fan-made · not affiliated</span>
              ${p.verified ? '<span class="sticker verified">🟢 verified owner</span>' : ''}
              <div class="muted small mt" style="margin-top:6px">
                ${p.isMineProfile
                  ? '<span class="sticker self">you created this 🎪</span>'
                  : p.createdByUsername
                    ? `created by fan <b>@${esc(p.createdByUsername)}</b>`
                    : 'community page'}
                ${p.createdAt ? ` · ${new Date(p.createdAt).toLocaleDateString()}` : ''}
              </div>
            </div>
          </div>
          <div class="right">
            <div class="tag" style="font-size:1.4rem">🪙 ${fmt(p.boostTotal)}</div>
            <div class="muted small">${fmt(p.boostCount)} boosts · ${fmt(p.fanCount)} fans</div>
          </div>
        </div>
        <p class="mt">${esc(p.description || '')}</p>
        <div class="row">${(p.tags || []).map((t) => `<span class="sticker">#${esc(t)}</span>`).join('')}</div>
      </div>

      <div class="two-col">
        <div class="card">
          <h3>🚀 Back this fave</h3>
          <div class="notice legal small">
            You spend <b>${fmt(50)}+ 🪙</b> (never real money) and the page gains <b>1 point per coin</b>.
            ${selfBoost ? 'Since you own this page, every coin earns <b>×1.5 points</b>! 💖' : 'Creating & boosting your own page earns the ×1.5 self-boost.'}
          </div>
          ${m
            ? `<button class="btn big pink" onclick="GB.openBoost('${esc(p.slug)}')">🔥 Boost with coins</button>`
            : `<button class="btn big" onclick="GB.openAuth('signup')">Log in / sign up to boost</button>`}
          <p class="muted small mt">2-second cooldown between boosts. Coins are free virtual coins only.</p>
        </div>
        <div class="card">
          <h3>⚡ Recent boosts</h3>
          ${boostRows}
        </div>
      </div>

      ${p.verified ? '' : `
      <div class="card mt" id="claimBox">
        <div class="row spread">
          <div>
            <h3 style="margin:0">🏛️ Are you the real ${esc(p.realName || p.name)}?</h3>
            <p class="muted small">This is a fan-made page. If you represent the real person/team, submit a claim — an admin verifies it and the page gets the 🟢 badge.</p>
          </div>
          <button class="btn purple" onclick="GB.openClaim('${esc(p.slug)}')">Claim page</button>
        </div>
      </div>`}
    `;
  };

  let boostSlug = null;
  function openBoost(slug) {
    if (!S.me) return openAuth('signup');
    boostSlug = slug;
    const self = S.me.createdProfileSlug === slug;
    modal(`
      <h2>🔥 Boost ${esc(slug)}</h2>
      <p class="muted">Choose coins to spend — <b>100% virtual</b>, zero real money.</p>
      <div class="amount-chips" id="chips">
        ${[50, 100, 250, 500, 1000].map((a) => `<button type="button" data-a="${a}" onclick="GB.pickAmount('${a}', this)">${fmt(a)}</button>`).join('')}
      </div>
      <label class="field mt"><span class="lbl">Or custom amount</span>
        <input id="customAmt" type="number" min="50" step="10" placeholder="50+"></label>
      <div class="notice legal small" id="boostPreview"></div>
      <button class="btn big pink" style="width:100%" onclick="GB.doBoost('${esc(slug)}', this)">🚀 Boost now</button>
      <button class="btn ghost mt" type="button" onclick="GB.closeModal()" style="width:100%">Cancel</button>
      <p class="muted small center mt">Boost cooldown: 2 seconds.</p>`);
    pickAmount(50, $('#chips button'));
  }

  function pickAmount(a, btn) {
    $$('#chips button').forEach((b) => b.classList.remove('sel'));
    if (btn) btn.classList.add('sel');
    const amt = Number(a);
    const self = S.me && S.me.createdProfileSlug === boostSlug;
    const mult = self ? 1.5 : 1;
    const pv = $('#boostPreview');
    if (pv) pv.innerHTML = `Spending <b>${fmt(amt)}</b> 🪙 → page gets <b>${fmt(Math.round(amt * mult))}</b> pts${self ? ' (×1.5 self-boost 💖)' : ''}. Your balance: <b>${fmt(S.me.coins)}</b> 🪙`;
  }

  async function doBoost(slug, btn) {
    let amt = Number(($('#customAmt') || {}).value || 0);
    const sel = $('#chips button.sel');
    if (!amt && sel) amt = Number(sel.dataset.a);
    if (!amt || amt < 50) return toast('Minimum boost is 50 coins', 'bad');
    if (btn) btn.disabled = true;
    try {
      const data = await api('/boost', { method: 'POST', body: { slug, amount: amt } });
      closeModal();
      await refresh();
      toast(`Boosted! +${fmt(data.value)} pts to ${slug} 🎉`, 'good');
      confetti();
      render();
    } catch (err) {
      toast(boostErr(err), 'bad');
      if (btn) btn.disabled = false;
    }
  }

  function boostErr(err) {
    if (err.status === 429 && err.data.waitMs) return '🎢 2-second cooldown! Try again in ' + Math.ceil(err.data.waitMs / 1000) + 's';
    if (err.message === 'min_boost') return 'Minimum boost is 50 coins';
    if (err.message === 'insufficient_coins') return 'Not enough coins — claim your daily streak and lucky drops!';
    if (err.message === 'rate_limited') return 'Too fast! Take a breath. 😮‍💨';
    return err.message;
  }

  // ---- 4. Wallet
  VIEWS.wallet = async () => {
    if (!S.me) return requireLogin();
    const m = S.me;
    const txnRows = (m.transactions || []).slice().reverse().map((t) => `
      <div class="list-row">
        <span>${t.amount >= 0 ? '🪙' : '💸'}</span>
        <span class="grow">${esc(t.note)}<br><span class="muted small">${timeAgo(t.at)}</span></span>
        <span class="tag" style="color:${t.amount >= 0 ? '#0f9158' : '#c92c52'}">${t.amount >= 0 ? '+' : ''}${fmt(t.amount)}</span>
      </div>`).join('') || '<p class="muted">No transactions yet.</p>';

    return `
      <h1 class="section-title">🪙 My wallet</h1>
      <div class="stripe">
        <div class="stat"><div class="n">${fmt(m.coins)}</div><div class="l">Coins</div></div>
        <div class="stat"><div class="n">${fmt(m.seasonPoints)}</div><div class="l">Season pts</div></div>
        <div class="stat"><div class="n">🔥 ${m.streakCount}</div><div class="l">Streak</div></div>
        <div class="stat"><div class="n">${m.tasksDone}/${m.tasksTotal}</div><div class="l">Tasks</div></div>
      </div>

      <div class="notice legal">💡 Grinbid coins are <b>100% free virtual coins</b>. They hold <b>zero cash value</b>, cannot be redeemed,
        transferred for money or bought with real currency. No purchases exist in this game.</div>

      <div class="two-col">
        <div class="card">
          <h3>📅 Daily claim</h3>
          ${m.dailyClaimedToday
            ? `<p class="muted">Claimed today! Come back tomorrow 🔥</p>
               <p class="tag">Next: streak ${m.dailyClaim.streak + 1} → <b>${fmt(ecoNextReward(m))}</b> coins</p>`
            : `<p class="tag">Streak ${m.dailyClaim.streakForClaim} → <b>${fmt(m.dailyClaim.reward)}</b> coins</p>
               <button class="btn big mint" onclick="GB.claimDaily()">🎁 Claim free coins</button>`}
          <p class="muted small mt">+500 base, +150 per streak day, capped at +2,000/day.</p>
        </div>
        <div class="card">
          <h3>🍀 Lucky drop</h3>
          <p class="muted">Free random drop every 3 hours — ${fmt(250)} to ${fmt(2500)} coins.</p>
          <div class="countdown tag" id="dropCountdown" style="font-size:1.3rem" data-at="${esc(m.nextLuckyDropAt || '')}">…</div>
          <button class="btn big orange" style="background:var(--orange)" onclick="GB.claimLucky()" id="dropBtn">💎 Open drop</button>
        </div>
      </div>

      <h2 class="section-title">🧾 History</h2>
      <div class="card">${txnRows}</div>`;
  };

  function ecoNextReward(m) {
    const s = m.dailyClaim.streak + 1;
    return Math.min(500 + (s - 1) * 150, 2000);
  }

  async function claimDaily() {
    try {
      const d = await api('/daily-claim', { method: 'POST' });
      await refresh();
      toast(`+${fmt(d.reward)} coins! Streak ${d.streak} 🔥`, 'good');
      confetti(90);
      render();
    } catch (err) {
      toast(err.message === 'already_claimed' ? 'Already claimed today! 🎉' : err.message, 'bad');
    }
  }

  async function claimLucky() {
    try {
      const d = await api('/lucky-drop', { method: 'POST' });
      await refresh();
      toast(`Lucky drop! +${fmt(d.reward)} coins 🍀`, 'good');
      confetti(140);
      render();
    } catch (err) {
      if (err.status === 429 && err.data.waitMs) toast('Drop not ready yet! ' + Math.ceil(err.data.waitMs / 60000) + ' min to go', 'bad');
      else toast(err.message, 'bad');
    }
  }

  // ---- 5. Tasks
  VIEWS.tasks = async () => {
    if (!S.me) return requireLogin();
    const taskRows = S.me.tasks.map((t) => `
      <div class="task ${t.done ? 'done' : ''} ${t.claimed ? 'claimed' : ''} ${t.locked ? 'locked' : ''}">
        <span class="t-emoji">${t.locked ? '🔒' : esc(t.emoji)}</span>
        <div class="grow">
          <b>${esc(t.title)}</b> ${t.locked ? '<span class="sticker">locked</span>' : ''}
          <div class="muted small">${esc(t.desc)}</div>
        </div>
        <span class="reward">🪙 +${fmt(t.reward)}</span>
        ${t.claimed ? '<span class="sticker verified">done ✓</span>'
          : t.done ? `<button class="btn mint small" onclick="GB.claimTask('${esc(t.id)}')">Claim</button>`
          : '<span class="muted small">…</span>'}
      </div>`).join('');

    return `
      <h1 class="section-title">🎯 Task checklist <span class="muted small">(${S.me.tasksDone}/${S.me.tasksTotal} done)</span></h1>
      <div class="notice">Complete tasks to earn bonus virtual coins. No purchase, no pay-to-win — ever.</div>
      <div class="card">${taskRows}</div>`;
  };

  async function claimTask(id) {
    try {
      const d = await api('/tasks/' + id + '/claim', { method: 'POST' });
      await refresh();
      toast(`Task complete! +${fmt(d.reward)} coins 🎉`, 'good');
      confetti(80);
      render();
    } catch (err) {
      toast(err.message, 'bad');
    }
  }

  // ---- 6. Referrals
  VIEWS.refer = async () => {
    if (!S.me) return requireLogin();
    const m = S.me;
    const rows = (m.referrals || []).slice().reverse().map((r) => `
      <div class="list-row">
        <span class="avatar">🧑‍🚀</span>
        <span class="grow"><b>${esc(r.username)}</b><br>
          <span class="muted small">${timeAgo(r.at)} · ${r.status === 'active' ? '🟢 active' : r.status === 'pending_review' ? '🟡 pending review (same-IP check)' : '⚪ pending'}</span></span>
        <span class="tag">🪙 ${fmt(r.earned || 0)}</span>
      </div>`).join('') || '<p class="muted">No referrals yet. Share your code! 🚀</p>';

    return `
      <h1 class="section-title">🤝 Referral squad</h1>
      <div class="two-col">
        <div class="card center">
          <p class="muted">Your invite code</p>
          <div class="tag" style="font-size:1.7rem;letter-spacing:1px" id="refCode">${esc(m.referralCode || '—')}</div>
          <div class="row center mt">
            <button class="btn sky" onclick="GB.copyText('${esc(m.referralCode || '')}')">📋 Copy</button>
            <button class="btn mint" onclick="GB.shareCode()">📣 Mark as shared</button>
          </div>
          <div class="notice mt small">
            🎁 You get <b>${fmt(1000)}</b> coins, they get <b>${fmt(500)}</b>, and you earn <b>10%</b> of every coin they earn — forever (lifetime match).
            Referrals are checked for bot abuse: self-referrals and same-IP signups are flagged and reviewed.
          </div>
        </div>
        <div class="card">
          <h3>Your squad (${(m.referrals || []).length})</h3>
          ${rows}
          <p class="muted small mt">Lifetime match earned: 🪙 <b>${fmt(m.lifetimeMatchEarned || 0)}</b></p>
        </div>
      </div>`;
  };

  async function shareCode() {
    try {
      const d = await api('/referral/share', { method: 'POST' });
      await refresh();
      toast('Code shared! Referral task done 🎉', 'good');
      render();
    } catch (err) { toast(err.message, 'bad'); }
  }

  // ---- 7. Create profile
  VIEWS.create = async () => {
    if (!S.me) return requireLogin();
    return `
      <h1 class="section-title">✨ Make a fan page for your fave</h1>
      <div class="notice legal">
        🏷️ This is a <b>fan-made tribute page</b> — not an official page, not affiliated, not an endorsement.
        Every new page is reviewed by an admin <b>before it goes live</b>. We'll email you at
        <b>${esc(S.me.email || 'your signup email')}</b> when your page is promoted up or needs changes.
        You can create <b>one page</b>, and boosting your own page earns the <b>×1.5 self-boost</b>.
      </div>
      <div class="card">
        <form onsubmit="GB.createProfile(event)" id="createForm">
          <div class="two-col">
            <label class="field"><span class="lbl">Real person / character *</span>
              <input name="realName" maxlength="60" required placeholder="e.g. Salman Khan, Hulk, Tony Stark / Iron Man, Taylor Swift"></label>
            <label class="field"><span class="lbl">Category *</span>
              <select name="category">
                <option value="celebrity">Celebrity (actor, singer, sports star…)</option>
                <option value="character">Character (movie/comic/anime icon…)</option>
                <option value="influencer">Influencer / streamer</option>
                <option value="estate">Estate / landmark</option>
                <option value="venue">Venue / stadium</option>
                <option value="brand">Brand / label</option>
                <option value="community">Community</option>
              </select></label>
          </div>
          <label class="field"><span class="lbl">Your page name *</span>
            <input name="name" maxlength="24" required placeholder="e.g. Bhaijaan Fans, Hulk Smash Gang"></label>
          <label class="field"><span class="lbl">Slug (URL) *</span>
            <input name="slug" maxlength="40" required placeholder="salman-khan-fans"></label>
          <div class="two-col">
            <label class="field"><span class="lbl">Photo / fan art (optional, auto-resized)</span>
              <input type="file" id="pageImage" accept="image/png,image/jpeg,image/webp" onchange="GB.handleImage(event)">
              <img id="imgPreview" class="img-preview" alt="" style="display:none">
              <span class="muted small">A square photo works best. It's resized in your browser before upload.</span></label>
            <label class="field"><span class="lbl">…or pick an emoji badge</span>
              <div class="emoji-picker" id="createEmoji">${['⭐','💪','🦸','🕷️','🦇','🏏','⚽','🎤','🎬','🐉','👑','🔥'].map((a, i) => `<button type="button" class="${i === 0 ? 'sel' : ''}" data-a="${a}" onclick="GB.setAvatar('${a}', this)">${a}</button>`).join('')}</div></label>
          </div>
          <label class="field"><span class="lbl">Tagline</span><input name="tagline" maxlength="80" placeholder="One line that makes fans tap boost"></label>
          <label class="field"><span class="lbl">Why this fave deserves the top spot</span><textarea name="description" maxlength="600" placeholder="Tell other fans what makes them legendary…"></textarea></label>
          <label class="field"><span class="lbl">Tags (comma separated, max 8)</span><input name="tags" placeholder="bollywood, bhai, action"></label>
          <button class="btn big purple" type="submit" id="createSubmit">📨 Submit for approval</button>
          <p class="muted small mt">Your page stays private to you until an admin approves it — then fans can boost it up the leaderboard.</p>
        </form>
      </div>`;
  };

  let pendingImage = null;
  function handleImage(ev) {
    const file = ev.target.files && ev.target.files[0];
    const preview = $('#imgPreview');
    if (!file) { pendingImage = null; if (preview) preview.style.display = 'none'; return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 480px square-ish JPEG so the JSON store stays small.
        const MAX = 480;
        let { width, height } = img;
        if (width > height && width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        else if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        let data;
        try { data = canvas.toDataURL('image/jpeg', 0.82); } catch { data = null; }
        if (data && data.length <= 880 * 1024) {
          pendingImage = data;
          if (preview) { preview.src = data; preview.style.display = 'block'; }
          toast('Photo attached 📸', 'good');
        } else {
          pendingImage = null;
          toast('That image is too large even after resizing — try a smaller one, or use an emoji.', 'bad');
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function createProfile(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const rawName = String(fd.get('realName') || fd.get('name') || '');
    const slug = String(fd.get('slug') || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    try {
      const data = await api('/profiles', {
        method: 'POST',
        body: {
          name: fd.get('name'),
          realName: rawName,
          slug,
          category: fd.get('category'),
          emoji: pendingAvatar,
          image: pendingImage || undefined,
          tagline: fd.get('tagline'),
          description: fd.get('description'),
          tags: String(fd.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean)
        }
      });
      await refresh();
      confetti();
      if (data.moderation === 'pending') {
        toast('Submitted! 📨 An admin will review it before it goes live — check your email.', 'good');
      } else {
        toast('Fan page created! 🎉', 'good');
      }
      go('#/profile/' + data.profile.slug);
    } catch (err) {
      const friendly = {
        one_profile_per_user: 'You already created your one fan page!',
        slug_taken: 'That URL slug is taken — try another.',
        invalid_profile_fields: 'Please fill in the name, a valid URL slug and a category.'
      };
      toast(friendly[err.message] || err.message, 'bad');
    }
  }

  // ---- 7b. My creation ("My page")
  VIEWS.mine = async () => {
    if (!S.me) return requireLogin();
    const m = S.me;
    const slug = m.createdProfileSlug;
    if (!slug) {
      return `
        <h1 class="section-title">🎪 My creation</h1>
        <div class="card center" style="max-width:520px;margin:30px auto">
          <div style="font-size:3rem">🏷️</div>
          <h2 style="margin:.3em 0">You haven't created a page yet</h2>
          <p class="muted">Create your one <b>fan-created community profile</b> and boost it to earn the <b>×1.5 self-boost</b>.</p>
          <button class="btn big purple" onclick="go('#/create')">✨ Create my fan page</button>
          <p class="muted small mt">Boosting your own page earns 1.5× points. 🚀</p>
        </div>`;
    }
    let p;
    try {
      const data = await api('/profiles/' + encodeURIComponent(slug));
      p = data.profile;
    } catch {
      return `<div class="card danger"><h3>😵 Couldn't load your page</h3><p>${esc(slug)} not found.</p></div>`;
    }
    const cat = CATS[p.category] || { label: p.category };
    const pendingBanner = p.status === 'pending'
      ? `<div class="card" style="border-color:var(--orange);background:#fff4e0">
           <b>⏳ Your page is waiting for admin approval.</b>
           <p class="muted small" style="margin:.3em 0 0">It's private to you right now — once an admin approves it, fans can boost it and it joins the home-page ranking. We'll email you at <b>${esc(S.me.email || 'your signup email')}</b> when it goes live.</p>
           <p class="small" style="margin:.3em 0 0">Meanwhile you can still self-boost it (×1.5).</p>
         </div>`
      : p.status === 'rejected'
        ? `<div class="card" style="border-color:var(--red);background:#fdecee">
             <b>✕ Your page needs changes before it can go live.</b>
             <p class="muted small" style="margin:.3em 0 0">${esc(p.reviewNote || 'An admin reviewed it.')} Check your email (${esc(S.me.email || '')}) for details.</p>
           </div>`
        : '';
    return `
      <h1 class="section-title">🎪 My creation</h1>
      ${pendingBanner}
      <div class="card">
        ${p.image ? `<img class="profile-img big" src="${p.image}" alt="${esc(p.realName || p.name)}" style="margin-bottom:12px">` : ''}
        <div class="row spread">
          <div class="row">
            ${p.image ? '' : `<span class="avatar big">${esc(p.emoji)}</span>`}
            <div>
              <h2 style="margin:0">${esc(p.realName && p.realName !== p.name ? p.realName : p.name)}</h2>
              <span class="cat-badge">${esc(cat.label)}</span>
              ${p.verified ? '<span class="sticker verified">🟢 verified owner</span>' : ''}
              <div class="muted small mt" style="margin-top:6px">
                <span class="sticker self">created by you 🎪</span>
                ${p.createdAt ? ` · created ${new Date(p.createdAt).toLocaleDateString()}` : ''}
              </div>
            </div>
          </div>
          <div class="right">
            <div class="tag" style="font-size:1.4rem">🪙 ${fmt(p.boostTotal)}</div>
            <div class="muted small">${fmt(p.boostCount)} boosts · ${fmt(p.fanCount)} fans</div>
          </div>
        </div>
        <p class="mt">${esc(p.description || '')}</p>
        <div class="row">${(p.tags || []).map((t) => `<span class="sticker">#${esc(t)}</span>`).join('')}</div>
        <div class="row mt">
          <button class="btn big pink" onclick="GB.openBoost('${esc(p.slug)}')">🔥 Boost my page (×1.5)</button>
          <button class="btn big" style="background:#fff" onclick="go('#/profile/${esc(p.slug)}')">👀 View page</button>
        </div>
      </div>
      <div class="notice legal mt">
        💡 Boosting your own fan page earns <b>×1.5 points</b> per coin — the best return in the game. Coins are 100% free virtual coins with zero cash value.
      </div>`;
  };

  // ---- 8. Donate
  // ---- Hall of winners (permanent ledger; becomes the cash payout list)
  VIEWS.winners = async () => {
    const w = await api('/winners');
    const rows = (w.winners || []).map((x) => {
      const fans = (x.fans || []).map((f) =>
        `${MEDALS[f.rank - 1] || '#' + f.rank} <b>${esc(f.displayName || f.username)}</b> <span class="muted small">(${fmt(f.points)} pts → ${fmt(f.coinPrize)} 🪙)</span>`).join('<br>') || '<span class="muted small">no ranked fans</span>';
      const fandom = (x.fandom || []).slice(0, 3).map((f) =>
        `${MEDALS[f.rank - 1] || '#' + f.rank} <a href="#/profile/${esc(f.slug)}">${esc(f.emoji || '⭐')} ${esc(f.realName || f.name)}</a> <span class="muted small">(${fmt(f.love)} 🔥)</span>`).join('<br>') || '<span class="muted small">no crowned page</span>';
      return `<div class="card winner-card">
        <div class="winner-head">
          <span class="sticker fan">${x.label} #${x.periodId}</span>
          <span class="muted small">${new Date(x.at).toLocaleDateString()}</span>
        </div>
        <div class="two-col">
          <div><h4>🎖️ Fans who won coins</h4>${fans}</div>
          <div><h4>🌟 Crowned fandom</h4>${fandom}</div>
        </div>
        <p class="muted small" style="margin-bottom:0">🪙 Paid in free coins · recorded for future cash payout</p>
      </div>`;
    }).join('') || '<div class="card"><p class="muted">No completed rounds yet. The first weekly, monthly and season winners will be crowned here.</p></div>';

    return `
      <h1 class="section-title">🏆 Hall of winners</h1>
      ${REAL_MONEY_HTML}
      <div class="card mb">
        <p style="margin:0">Every <b>weekly</b>, <b>monthly</b> and <b>season</b> winner is recorded here permanently —
        both the <b>top fans</b> (who win coins) and the <b>crowned fandom</b> (the most-loved celeb/character page).
        When real-money prizes switch on after full legal setup, this is the list we pay out.</p>
      </div>
      ${rows}`;
  };

  // ---- 🧪 Demo sandbox (ADMIN ONLY) — isolated fake data, not the live board
  VIEWS.demo = async () => {
    if (!isAdminUI()) {
      return `<div class="card danger"><h3>🔒 Admin only</h3><p>The demo sandbox is only available to admins.</p></div>`;
    }
    const period = S.demoPeriod || 'season';
    const [lb, profs, winners] = await Promise.all([
      api('/demo/leaderboard'), api('/demo/profiles'), api('/demo/winners')
    ]);
    const L = lb.ladders[period] || lb.ladders.season;
    const live = (profs.profiles || []).filter((p) => p.status === 'approved');
    const pending = (profs.profiles || []).filter((p) => p.status !== 'approved');

    const demoFanOpts = ['boosterboi', 'fanqueen', 'salfan', 'srkfan', 'messifan']
      .map((u) => `<option value="${u}">${u}</option>`).join('');

    return `
      <div class="notice" style="background:linear-gradient(135deg,#eaf7ff,#efe9ff);border:2px dashed #7c5cff;border-radius:16px;">
        <b>🧪 DEMO SANDBOX</b> — this is <b>fake test data</b>, fully separate from the real site. Real fans never see it, nothing here affects the live leaderboard, and it is never saved. Test boosts, approvals, claims and settlements here.
        <div class="row mt">
          <button class="btn orange" style="background:#7c5cff" onclick="GB.demoAction('reset')">♻️ Reset demo data</button>
          <a class="btn ghost" href="#/admin">← Back to admin</a>
        </div>
      </div>

      <h2 class="section-title">🌟 Demo fandom board</h2>
      ${periodTabsHtmlFor('demo', period)}
      <div class="card season-card fandom-card">${fandomRows(L)}</div>
      <h2 class="section-title">🎖️ Demo top fans</h2>
      <div class="card season-card">${fanRows(L)}</div>

      <div class="two-col mt">
        <div class="card">
          <h3 style="margin-top:0">💥 Test a boost</h3>
          <p class="muted small">Simulate a fan boosting an idol (×1.5 if they boosted their own page).</p>
          <label class="small muted">Fan (who boosts)</label>
          <select id="demoAs">${demoFanOpts}</select>
          <label class="small muted">Idol page</label>
          <select id="demoSlug">${live.map((p) => `<option value="${esc(p.slug)}">${esc(p.emoji)} ${esc(p.realName)}</option>`).join('')}</select>
          <label class="small muted">Coins (min 50)</label>
          <input id="demoAmt" type="number" value="500" min="50">
          <button class="btn pink mt" onclick="GB.demoBoost()">🚀 Boost</button>
          <div id="demoBoostMsg"></div>
        </div>
        <div class="card">
          <h3 style="margin-top:0">📥 Moderation queue</h3>
          <p class="muted small">Pages awaiting approval &amp; claim requests.</p>
          ${pending.map((p) => `<div class="list-row">
              <span class="avatar">${esc(p.emoji)}</span>
              <span class="grow"><b>${esc(p.realName)}</b> <span class="sticker self">${esc(p.status)}</span><br><span class="muted small">by @${esc(p.createdByUsername)}</span></span>
              <button class="btn mint small" onclick="GB.demoApprove('${esc(p.slug)}')">✓ Approve</button>
            </div>`).join('') || '<p class="muted small">No pending pages.</p>'}
          <div id="demoClaimBox"></div>
        </div>
      </div>

      <h2 class="section-title mt">🏁 Settle a round (pay coins + crown + record winner)</h2>
      <div class="card">
        <p class="muted small">Settling closes the current demo round, pays the top 3 fans coins, crowns the top fandom page and adds it to the Hall of Winners below. Use week first to watch it fast.</p>
        <div class="row">
          <button class="btn orange" onclick="GB.demoSettle('week')">Settle Weekly</button>
          <button class="btn orange" onclick="GB.demoSettle('month')">Settle Monthly</button>
          <button class="btn orange" onclick="GB.demoSettle('season')">Settle Season</button>
        </div>
      </div>

      <h2 class="section-title mt">🏆 Demo Hall of Winners</h2>
      ${(winners.winners || []).map((x) => `<div class="card winner-card">
          <div class="winner-head"><span class="sticker fan">${x.label} #${x.periodId || ''}</span><span class="muted small">${new Date(x.at).toLocaleDateString()}</span></div>
          <div class="two-col">
            <div><h4>🎖️ Fans</h4>${(x.fans || []).map((f) => `${MEDALS[f.rank - 1] || '#' + f.rank} <b>${esc(f.displayName || f.username)}</b> <span class="muted small">→ ${fmt(f.coinPrize)} 🪙</span>`).join('<br>') || '<span class="muted small">none</span>'}</div>
            <div><h4>🌟 Crowned</h4>${(x.fandom || []).slice(0, 3).map((f) => `${MEDALS[f.rank - 1] || '#' + f.rank} ${esc(f.emoji || '⭐')} ${esc(f.realName || f.name)}`).join('<br>') || '<span class="muted small">none</span>'}</div>
          </div>
        </div>`).join('') || '<p class="muted">No rounds settled yet.</p>'}
    `;
  };

  async function demoRefresh() { if ((S.current || '') === 'demo') render(); }

  async function demoBoost() {
    const slug = $('#demoSlug').value;
    const as = $('#demoAs').value;
    const amount = Number($('#demoAmt').value) || 0;
    const box = $('#demoBoostMsg');
    try {
      const r = await api('/demo/boost', { method: 'POST', body: { slug, as, amount } });
      if (box) box.innerHTML = `<p class="minted small">✅ Boosted ${r.value} pts ${r.selfBoost ? '(self ×1.5)' : ''}. Balance left ${fmt(r.balance)} coins.</p>`;
      toast('Demo boost applied ✔', 'good');
      render();
    } catch (e) {
      if (box) box.innerHTML = `<p class="muted small" style="color:var(--red)">⚠️ ${esc(e.message)}</p>`;
    }
  }

  async function demoApprove(slug) {
    try {
      await api('/demo/approve', { method: 'POST', body: { slug } });
      toast('Demo page approved ✔', 'good');
      render();
    } catch (e) { toast(e.message, 'bad'); }
  }

  async function demoSettle(period) {
    try {
      const r = await api('/demo/settle', { method: 'POST', body: { period } });
      const crown = (r.payout.fandom || [])[0];
      toast(`${r.payout.label} settled! ${crown ? 'Crowned ' + (crown.realName || crown.name) + ' 👑' : ''}`, 'good');
      render();
    } catch (e) { toast(e.message, 'bad'); }
  }

  async function demoAction(action) {
    if (action === 'reset') {
      if (!confirm('Reset the demo sandbox to its original fake data?')) return;
      try { await api('/demo/reset', { method: 'POST' }); toast('Demo reset ♻️', 'good'); render(); }
      catch (e) { toast(e.message, 'bad'); }
    }
  }

  // period tabs used inside a specific view (demo) — switch S.demoPeriod.
  function periodTabsHtmlFor(mode, active) {
    return `<div class="period-tabs">
      ${PERIOD_TABS.map(([k, label]) => `<button class="period-tab${k === active ? ' on' : ''}" onclick="GB.setDemoPeriod('${k}')">${label}</button>`).join('')}
    </div>`;
  }
  function setDemoPeriod(p) {
    S.demoPeriod = (['week', 'month', 'season'].includes(p)) ? p : 'season';
    render();
  }

  VIEWS.donate = async () => {
    const methods = await api('/donations/methods');
    return `
      <h1 class="section-title">💝 Keep Grinbid alive</h1>
      <div class="notice donate">
        <b>Donations are voluntary and 100% non-reward.</b> Contributors get <b>no coins, boosts, ranks, perks or
        advantages</b> — this keeps the leaderboard fair. Coins can never be bought.
      </div>
      <div class="card">
        <div class="row">${methods.methods.map((m) => `
          <button class="btn ${m.id === 'upi' ? 'pink' : 'ghost'}" onclick="GB.pickDonate('${m.id}', this)">${m.label}</button>`).join('')}</div>
        <label class="field mt"><span class="lbl">Amount (for the pizza fund 🍕)</span>
          <input id="donAmt" type="number" min="${methods.minAmount}" max="${methods.maxAmount}" value="100"></label>
        <label class="field"><span class="lbl">Note (optional)</span><input id="donNote" maxlength="200" placeholder="Keep the confetti coming!"></label>
        <button class="btn big orange" style="background:var(--orange)" onclick="GB.donate()">💸 I'm donating — no coins please</button>
        <p class="muted small mt">
          UPI: ${esc(methods.methods[0].handle)} · PayPal: ${esc(methods.methods[1].handle)} ·
          Buy Me a Coffee: ${esc(methods.methods[2].handle)} · Razorpay: ${esc(methods.methods[3].handle)}
        </p>
      </div>
      <p class="small muted center">This screen only records intent — leaving the sandbox, no payment is ever taken by Grinbid itself.</p>`;
  };

  let donateMethod = 'upi';
  function pickDonate(id, btn) {
    donateMethod = id;
    $$('#view .card .row .btn').forEach((b) => b.classList.remove('sel'));
    btn.classList.add('sel');
  }

  async function donate() {
    try {
      const d = await api('/donations', { method: 'POST', body: { method: donateMethod, amount: Number(($('#donAmt') || {}).value || 0), note: ($('#donNote') || {}).value } });
      toast(d.message, 'good');
    } catch (err) { toast(err.message, 'bad'); }
  }

  // ---- 9. Admin
  VIEWS.admin = async () => {
    // The admin panel is hidden: it exists nowhere in the navigation, and a
    // visitor who types the URL in either is an admin (sees the dashboard) or
    // sees an ordinary 404-style page — no password prompt to hint at.
    if (!isAdminUI()) {
      return `
        <div class="card center" style="max-width:520px;margin:60px auto">
          <div style="font-size:3rem">🎪</div>
          <h2>Nothing here</h2>
          <p class="muted">This page doesn't exist for regular fans.</p>
          <button class="btn pink" onclick="go('#/home')">Back to the leaderboard</button>
        </div>`;
    }
    const d = await api('/admin/overview');
    return adminPanel(d);
  };

  async function adminLogin(ev) {
    ev.preventDefault();
    try {
      await api('/admin/login', { method: 'POST', body: { password: new FormData(ev.target).get('password') } });
      toast('Admin logged in 🔐', 'good');
      await refresh();   // picks up the admin-password session for nav/views
      render();
    } catch (err) { toast('Wrong password', 'bad'); }
  }

  function adminPanel(d) {
    return `
      <h1 class="section-title">🛠️ Admin dashboard</h1>
      <div class="stripe">
        <div class="stat"><div class="n">${d.users}</div><div class="l">Users</div></div>
        <div class="stat"><div class="n">${d.boosts}</div><div class="l">Boosts</div></div>
        <div class="stat"><div class="n" style="color:var(--pink)">${d.pendingProfiles || 0}</div><div class="l">Pages to review</div></div>
        <div class="stat"><div class="n">${d.openClaimRequests}</div><div class="l">Open claims</div></div>
      </div>
      <div class="card mt" id="profileQueue"><h3>🧐 Fan pages awaiting approval</h3><p class="muted">Loading…</p></div>
      <div class="two-col">
        <div class="card">
          <h3>📣 Broadcast</h3>
          <label class="field"><span class="lbl">Message to everyone (SSE)</span><input id="annMsg" maxlength="280" placeholder="Maintenance in 5 min!"></label>
          <button class="btn pink" onclick="GB.adminAction('announce', {message:gbv('annMsg')})">Send broadcast</button>
        </div>
        <div class="card">
          <h3>🔔 Message a user</h3>
          <label class="field"><span class="lbl">User id</span><input id="ntfUser" placeholder="u_0001"></label>
          <label class="field"><span class="lbl">Message</span><input id="ntfMsg" maxlength="280" placeholder="Your claim was approved!"></label>
          <button class="btn sky" onclick="GB.adminAction('notify', {userId:gbv('ntfUser'), message:gbv('ntfMsg')})">Send</button>
        </div>
      </div>
      <div class="card mt">
        <h3 style="margin-top:0">🏆 Rank lists — settle &amp; crown winners</h3>
        <p class="muted small">Settling closes the current round, pays the top 3 fans their coin prizes, crowns the top fandom, and records everyone in the winners ledger (the future cash-payout list).</p>
        ${[['week', '🗓️ Weekly'], ['month', '📅 Monthly'], ['season', '🏆 Season']].map(([k, label]) => {
          const p = (d.periods || {})[k] || d.season;
          const prizes = k === 'season' ? [50000, 25000, 10000] : (k === 'month' ? [20000, 10000, 5000] : [5000, 2500, 1000]);
          return `<div class="row spread" style="padding:8px 0;border-bottom:1px dashed var(--line,#eee)">
            <div><b>${label}</b> #${p.id} <span class="muted small">· ends ${new Date(p.endsAt).toLocaleDateString()} · prizes ${prizes.map(fmt).join(' / ')}</span></div>
            <button class="btn orange" style="background:var(--orange)" onclick="GB.adminAction('season/settle', {period:'${k}'})">Settle</button>
          </div>`;
        }).join('')}
        <p class="muted small" style="margin-bottom:0">Total rounds recorded: <b>${d.winnersCount || 0}</b></p>
      </div>
      <div class="card mt" id="claimQueue"><h3>🏛️ Claim requests</h3><p class="muted">Loading…</p></div>
      <div class="card mt" id="adminUsersList"><h3>👥 Registered Users</h3><p class="muted">Loading…</p></div>
      <div class="card mt">
        <h3>🧾 Funding intents (non-reward) · ${fmt(d.funding)} on record</h3>
        <p class="muted small">No coins are ever granted for donations.</p>
      </div>`;
  }

  async function adminAction(action, body) {
    try {
      const d = await api('/admin/' + action, { method: 'POST', body });
      toast('Done ✔', 'good');
      if (action === 'announce') S.announce = body.message;
      if (action === 'season/settle' && d.payout) {
        const fans = (d.payout.fans || []).map((e) => (e.displayName || e.username) + ' +' + fmt(e.prize));
        const crown = (d.payout.fandom || [])[0];
        toast(`${d.payout.label} #${d.payout.periodId} settled! ` +
          (fans.length ? `Fans: ${fans.join(', ')}.` : 'No ranked fans. ') +
          (crown ? ` Crowned ${crown.realName || crown.name} 👑` : ''), 'good');
      }
      render();
    } catch (err) { toast(err.message, 'bad'); }
  }

  async function loadClaims() {
    try {
      const d = await api('/admin/claim-requests');
      const box = $('#claimQueue');
      if (!box) return;
      const pending = d.requests || [];
      const decided = d.decided || [];
      const pendingRows = pending.map((r) => `
        <div class="list-row queue-row">
          ${r.profileImage ? `<img class="profile-img small" src="${r.profileImage}" alt="">` : `<span class="avatar">${esc(r.profileEmoji || '⭐')}</span>`}
          <span class="grow">
            <b>${esc(r.profileName)}</b> <span class="muted small">(${esc(r.profileSlug)})</span>
            <span class="status-chip pending">⏳ pending</span><br>
            <span class="muted small">claimed by <b>@${esc(r.username)}</b> · ${timeAgo(r.at)}</span><br>
            <span class="muted small evidence-snippet">“${esc((r.evidence || '').slice(0, 120))}${(r.evidence || '').length > 120 ? '…' : ''}”</span>
          </span>
          <span class="queue-actions">
            <a class="btn purple small" href="#/admin/claims/${esc(r.profileSlug)}/${esc(r.id)}">🔍 Review &amp; verify</a>
          </span>
        </div>`).join('');
      const decidedRows = decided.slice(0, 6).map((r) => `
        <div class="list-row">
          <span class="grow small">
            <b>${esc(r.profileName)}</b> · @${esc(r.username)}
            <span class="status-chip ${r.status === 'approved' ? 'ok' : 'no'}">${r.status === 'approved' ? '✓ approved' : '✕ rejected'}</span>
            <span class="muted">· ${timeAgo(r.decidedAt || r.at)}</span>
          </span>
          <a class="btn ghost small" href="#/admin/claims/${esc(r.profileSlug)}/${esc(r.id)}">View</a>
        </div>`).join('');
      box.innerHTML = `<h3>🏛️ Claim requests ${pending.length ? `<span class="count-pill">${pending.length}</span>` : ''}</h3>
        <p class="muted small">Each claim gets a full verification screen — page details, claimant history and evidence side by side.</p>
        ${pending.length ? pendingRows : '<p class="muted">None pending. 🎉</p>'}
        ${decided.length ? `<h4 class="mt" style="margin-bottom:4px">Recently decided</h4>${decidedRows}` : ''}`;
    } catch (err) { /* not admin */ }
  }

  // ---- Admin: dedicated claim VERIFICATION screen (#/admin/claims/:slug/:id)
  async function adminClaimReviewView(slug, reqId) {
    const d = await api(`/admin/claim-review/${encodeURIComponent(slug)}/${encodeURIComponent(reqId)}`);
    const r = d.request, p = d.profile, u = d.claimant;
    const pendingReq = r.status === 'pending';
    const statusChip = pendingReq
      ? '<span class="status-chip pending">⏳ awaiting verification</span>'
      : (r.status === 'approved'
        ? '<span class="status-chip ok">✓ approved</span>'
        : '<span class="status-chip no">✕ rejected</span>');

    const otherClaims = (d.otherClaims || []).map((c) => `
      <div class="list-row"><span class="grow small"><b>${esc(c.profileName)}</b>
        <span class="status-chip ${c.status === 'approved' ? 'ok' : c.status === 'rejected' ? 'no' : 'pending'}">${esc(c.status)}</span>
        <span class="muted">· ${timeAgo(c.at)}</span></span></div>`).join('');

    const competing = (d.competing || []).map((c) => `
      <div class="list-row"><span class="grow small"><b>@${esc(c.username)}</b>
        <span class="status-chip ${c.status === 'approved' ? 'ok' : c.status === 'rejected' ? 'no' : 'pending'}">${esc(c.status)}</span>
        <span class="muted">· ${timeAgo(c.at)}</span><br>
        <span class="muted">“${esc((c.evidence || '').slice(0, 140))}”</span></span></div>`).join('');

    return `
      <div class="review-head">
        <a class="btn ghost small" href="#/admin">← Admin dashboard</a>
        <h1 class="section-title" style="margin:10px 0 2px">🏛️ Verify claim — ${esc(p.realName || p.name)}</h1>
        <p class="muted" style="margin:0">Request <code>${esc(r.id)}</code> ${statusChip} · submitted ${timeAgo(r.at)}${r.decidedAt ? ` · decided ${timeAgo(r.decidedAt)}` : ''}</p>
      </div>

      <div class="review-grid mt">
        <div class="card">
          <h3 style="margin-top:0">📄 The fan page being claimed</h3>
          <div class="row" style="align-items:flex-start">
            ${p.image ? `<img class="profile-img big" src="${p.image}" alt="" style="width:110px;height:110px">` : `<span class="profile-emoji">${esc(p.emoji || '⭐')}</span>`}
            <div class="grow">
              <b style="font-size:1.15rem">${esc(p.realName || p.name)}</b> ${p.verified ? '<span class="sticker verified">verified 🟢</span>' : ''}<br>
              <span class="muted small">${esc(p.name)} · <span class="cat-badge">${esc((CATS[p.category] || { label: p.category }).label)}</span></span>
              <p class="muted small" style="margin:6px 0 0">${esc(p.tagline || '')}</p>
            </div>
          </div>
          <div class="kv mt">
            <div><span class="k">Slug</span><span class="v"><code>${esc(p.slug)}</code></span></div>
            <div><span class="k">Status</span><span class="v">${esc(p.status)}</span></div>
            <div><span class="k">Created by</span><span class="v">@${esc(p.createdByUsername || '—')}</span></div>
            <div><span class="k">Creator email</span><span class="v">${p.creatorEmail ? `<a href="mailto:${esc(p.creatorEmail)}">${esc(p.creatorEmail)}</a>` : '—'}</span></div>
            <div><span class="k">Boost total</span><span class="v">${fmt(p.boostTotal)} · ${fmt(p.fanCount)} fans</span></div>
            <div><span class="k">Currently claimed</span><span class="v">${p.claimedByUsername ? '@' + esc(p.claimedByUsername) : 'No — unclaimed'}</span></div>
          </div>
          <p class="muted small mt">${esc((p.description || '').slice(0, 300))}</p>
          <a class="btn sky small" href="#/profile/${esc(p.slug)}" target="_blank">👀 Open the live page</a>
        </div>

        <div class="card">
          <h3 style="margin-top:0">🙋 The claimant</h3>
          ${u ? `
          <div class="row">
            <span class="avatar big">${esc(u.avatar)}</span>
            <div class="grow">
              <b style="font-size:1.1rem">${esc(u.displayName)}</b> ${u.isAdmin ? '<span class="sticker verified">admin</span>' : ''}<br>
              <span class="muted small">@${esc(u.username)} · <code>${esc(u.id)}</code></span>
            </div>
          </div>
          <div class="kv mt">
            <div><span class="k">Email</span><span class="v">${u.email ? `<a href="mailto:${esc(u.email)}?subject=${encodeURIComponent('Your Grinbid claim of ' + (p.realName || p.name))}">${esc(u.email)}</a>` : '—'}</span></div>
            <div><span class="k">Joined</span><span class="v">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'} (${u.createdAt ? timeAgo(u.createdAt) : '—'})</span></div>
            <div><span class="k">Coins</span><span class="v">${fmt(u.coins)} 🪙</span></div>
            <div><span class="k">Season points</span><span class="v">${fmt(u.seasonPoints)}</span></div>
            <div><span class="k">Boosts made</span><span class="v">${fmt(u.boosts)}</span></div>
            <div><span class="k">Own fan page</span><span class="v">${u.createdProfileSlug ? `<a href="#/profile/${esc(u.createdProfileSlug)}">${esc(u.createdProfileSlug)}</a>` : '—'}</span></div>
          </div>
          ${otherClaims ? `<h4 class="mt" style="margin-bottom:4px">Their other claims</h4>${otherClaims}` : '<p class="muted small mt">No other claims filed by this user.</p>'}
          ` : '<p class="muted">⚠️ This user account no longer exists.</p>'}
        </div>
      </div>

      <div class="card mt">
        <h3 style="margin-top:0">🧾 Evidence submitted</h3>
        <blockquote class="evidence-box">${esc(r.evidence || 'No evidence provided.')}</blockquote>
        ${competing ? `<h4 style="margin-bottom:4px">⚔️ Competing claims on this page</h4>${competing}` : ''}
      </div>

      ${pendingReq ? `
      <div class="card mt decision-card">
        <h3 style="margin-top:0">✅ Verification checklist &amp; decision</h3>
        <ul class="check-list muted small">
          <li>The evidence links to an official site / social account that plausibly belongs to <b>${esc(p.realName || p.name)}</b>.</li>
          <li>The claimant's email domain or handle matches the person / team being claimed.</li>
          <li>No stronger competing claim is pending on this page.</li>
          <li>The page content itself doesn't break the rules (impersonation, private individuals, NSFW…).</li>
        </ul>
        <label class="field"><span class="lbl">Note to the claimant (optional — sent with the decision)</span>
          <input id="claimNote" maxlength="500" placeholder="e.g. Verified via the official website's contact page."></label>
        <div class="row">
          <button class="btn mint" onclick="GB.claimDecision('${esc(p.slug)}','${esc(r.id)}',true)">✓ Approve — verify page 🟢</button>
          <button class="btn" style="background:#fff;color:var(--red)" onclick="GB.claimDecision('${esc(p.slug)}','${esc(r.id)}',false)">✕ Reject claim</button>
        </div>
        <p class="muted small" style="margin-bottom:0">Approving flips the page to <b>verified 🟢</b> and hands it to @${esc(r.username)}. The claimant is notified in-app either way.</p>
      </div>` : `
      <div class="card mt">
        <h3 style="margin-top:0">Decision</h3>
        <p>${r.status === 'approved' ? '✓ Approved' : '✕ Rejected'} ${r.decidedAt ? timeAgo(r.decidedAt) : ''}${r.decisionNote ? ` — <span class="muted">“${esc(r.decisionNote)}”</span>` : ''}</p>
      </div>`}`;
  }

  async function claimDecision(slug, requestId, approve) {
    if (!approve && !confirm('Reject this claim request?')) return;
    try {
      await api('/admin/claim-request', { method: 'POST', body: { slug, requestId, approve, note: gbv('claimNote') } });
      toast(approve ? 'Claim approved — page is now verified 🟢' : 'Claim rejected.', approve ? 'good' : '');
      if (approve) confetti(60);
      go('#/admin');
    } catch (err) { toast(err.message, 'bad'); }
  }

  async function loadProfileQueue() {
    try {
      const d = await api('/admin/profile-queue');
      const box = $('#profileQueue');
      if (!box) return;
      const list = d.pending || [];
      if (!list.length) {
        box.innerHTML = '<h3>🧐 Fan pages awaiting approval</h3><p class="muted">All caught up — no pages waiting. 🎉</p>';
        return;
      }
      box.innerHTML = '<h3>🧐 Fan pages awaiting approval (' + list.length + ')</h3>' + list.map((p) => `
        <div class="list-row queue-row">
          ${p.image ? `<img class="profile-img small" src="${p.image}" alt="">` : `<span class="avatar">${esc(p.emoji)}</span>`}
          <span class="grow">
            <b>${esc(p.realName)}</b> ${p.realName !== p.name ? `· <span class="muted">${esc(p.name)}</span>` : ''}
            <span class="cat-badge">${esc((CATS[p.category] || { label: p.category }).label)}</span><br>
            <span class="muted small">${esc(p.tagline || '')}</span><br>
            <span class="muted small">by @${esc(p.createdByUsername)} · submitted ${timeAgo(p.submittedAt)}</span><br>
            <a class="small" href="mailto:${esc(p.creatorEmail || '')}?subject=${encodeURIComponent('Your Grinbid fan page: ' + p.name)}">✉️ ${esc(p.creatorEmail || 'no email')}</a>
            <p class="muted small" style="margin:4px 0 0">${esc(p.description || '').slice(0, 200)}</p>
          </span>
          <span class="queue-actions">
            <a class="btn small sky" href="#/profile/${esc(p.slug)}" target="_blank">Preview</a>
            <button class="btn mint small" onclick="GB.profileDecision('${esc(p.slug)}', true)">✓ Approve (go live)</button>
            <button class="btn small" style="background:#fff;color:var(--red)" onclick="GB.profileDecision('${esc(p.slug)}', false)">✕ Needs changes</button>
          </span>
        </div>`).join('');
    } catch (err) { /* not admin */ }
  }

  async function profileDecision(slug, approve) {
    let note = '';
    if (!approve) {
      note = prompt('What should the creator change? (sent in-app + they have email):') || '';
    }
    try {
      await api('/admin/profile-decision', { method: 'POST', body: { slug, approve, note } });
      toast(approve ? 'Page is LIVE! 🎉' : 'Sent back for changes.', approve ? 'good' : '');
      loadProfileQueue();
      const d = await api('/admin/overview');
      const el = document.querySelectorAll('.stripe .n')[2];
      render();
    } catch (err) { toast(err.message, 'bad'); }
  }

  async function loadAdminUsers() {
    try {
      const d = await api('/admin/users');
      const box = $('#adminUsersList');
      if (!box) return;
      const list = d.users || [];
      if (!list.length) {
        box.innerHTML = '<h3>👥 Registered Users</h3><p class="muted">No users found.</p>';
        return;
      }
      box.innerHTML = `<h3>👥 Registered Users (${list.length})</h3>
        <div style="max-height:360px;overflow-y:auto;margin-top:10px">
        ${list.map((u) => `
          <div class="list-row" style="align-items:center">
            <span class="grow">
              <b>@${esc(u.username)}</b> ${u.isAdmin ? '<span class="sticker verified">admin</span>' : ''}<br>
              <span class="muted small">ID: <code>${esc(u.id)}</code> · Email: ${esc(u.email || 'none')} · Coins: <b>${fmt(u.coins)}</b> 🪙 · Season pts: <b>${fmt(u.seasonPoints)}</b> · Boosts: ${u.boosts}</span>
            </span>
            <button class="btn mint small" onclick="GB.awardUserCoins('${esc(u.id)}')">🎁 Award 1k</button>
          </div>
        `).join('')}
        </div>`;
    } catch (err) { /* not admin */ }
  }

  async function awardUserCoins(userId) {
    try {
      await api('/admin/user/award', { method: 'POST', body: { userId, amount: 1000 } });
      toast('Awarded +1,000 coins successfully! 🎁', 'good');
      loadAdminUsers();
    } catch (err) { toast(err.message, 'bad'); }
  }

  // ---- Claim modal
  function openClaim(slug) {
    if (!S.me) return openAuth('signup');
    modal(`
      <h2>🏛️ Verify & claim ${esc(slug)}</h2>
      <p class="muted">This is a <b>fan-created</b> page. If you represent the real ${esc(slug)}, submit evidence and a moderator will verify.</p>
      <label class="field"><span class="lbl">Evidence (why are you the real owner?)</span>
        <textarea id="claimEvidence" maxlength="500" placeholder="Website, social handle, registry link…"></textarea></label>
      <button class="btn purple" style="width:100%" onclick="GB.submitClaim('${esc(slug)}')">Send claim request</button>
      <button class="btn ghost mt" type="button" onclick="GB.closeModal()" style="width:100%">Cancel</button>
      <p class="muted small mt">Claims are reviewed manually. This does not grant coins or boost advantages.</p>`);
  }

  async function submitClaim(slug) {
    try {
      const d = await api('/profiles/' + slug + '/claim', { method: 'POST', body: { evidence: gbv('claimEvidence') } });
      closeModal();
      toast('Claim submitted! Moderators will review. 🏛️', 'good');
      render();
    } catch (err) { toast(err.message, 'bad'); }
  }

  // ---- Legal modal (in-SPA)
  function openLegal(which) {
    const content = which === 'terms' ? LEGAL.terms : LEGAL.privacy;
    modal(`<h2>${which === 'terms' ? '📜 Terms of Grinbid' : '🕵️ Privacy & Safety'}</h2>${content}<p class="center mt"><a href="#/${which}">Open full page →</a></p>`);
  }

  const LEGAL = {
    terms: `<p><b>1.</b> Grinbid is a free fan-made game. All coins are 100% virtual, granted freely, and hold <b>zero cash value</b> — never purchased, sold, traded or redeemed. No pay-to-win, no gambling.</p>
      <p><b>2.</b> Every fan page is <b>created and submitted by a real fan</b> as an unofficial tribute to a public figure or well-known character — never official or endorsed. New pages go live only after <b>admin approval</b>.</p>
      <p><b>3.</b> Content rules: no impersonation, no pages about private individuals, no hate/harassment/NSFW, no stolen/copyrighted photos (only upload images you have rights to), no spam/ads/selling, no hate pages. The real person/team can <b>Claim page</b> to get verified or request removal.</p>
      <p><b>4.</b> You own your content but license Grinbid to host & display it; moderators may reject or remove pages that break the rules.</p>
      <p><b>5.</b> Donations are voluntary, non-reward contributions only — no coins, perks or ranking advantages.</p>
      <p><b>6.</b> You must be 13+ and play fair: no bots, spam, mass accounts, self-referrals or exploits. Full terms on the <a href="terms.html">Terms page</a>.</p>`,
    privacy: `<p><b>1.</b> We store: username, display name, emoji avatar, your <b>email</b> (used only to notify you about your fan page/account), a salted scrypt password hash, game data, the pages & photos you create, and a hashed IP for anti-abuse.</p>
      <p><b>2.</b> Your email is <b>private</b> — never shown on profiles or the leaderboard, never sold or shared.</p>
      <p><b>3.</b> Uploaded photos are resized in your browser and stored only to display on your approved page; upload only images you have rights to use.</p>
      <p><b>4.</b> No ad trackers, analytics pixels or third-party marketing; sessions use HttpOnly cookies.</p>
      <p><b>5.</b> Message the admin to delete your account/data. Full details on the <a href="privacy.html">Privacy page</a>.</p>`
  };

  // ---- Legal views (full pages inside the SPA)
  VIEWS.terms = async () => `<div class="legal-page"><div class="card">
    <a class="btn ghost small" href="#/home">← Home</a>
    <h1>📜 Terms</h1><p class="muted">Bid. Back. Rank up — with 100% free coins. Fan-made tribute pages only.</p>
    ${LEGAL.terms}
    <p class="mt"><a class="btn ghost small" href="terms.html" target="_blank">Open the full Terms page →</a></p>
    <div class="notice legal">🪙 Coins are virtual, free, zero cash value and non-redeemable. Every page is a fan tribute, not an official page.</div>
  </div></div>`;

  VIEWS.privacy = async () => `<div class="legal-page"><div class="card">
    <a class="btn ghost small" href="#/home">← Home</a>
    <h1>🕵️ Privacy &amp; Safety</h1><p class="muted">Minimal data, your email stays private, no trackers.</p>
    ${LEGAL.privacy}
    <p class="mt"><a class="btn ghost small" href="privacy.html" target="_blank">Open the full Privacy page →</a></p>
    <div class="notice legal">🔒 No ad trackers, no payment data, no selling anything. Email is only used to message you about your fan page.</div>
  </div></div>`;

  function requireLogin() {
    return `<div class="card center" style="max-width:520px;margin:40px auto">
      <h2>🔒 Booster access only</h2>
      <p class="muted">Log in or grab your free ${fmt(2500)} coins to play.</p>
      <button class="btn pink big" onclick="GB.openAuth('signup')">🎟️ Join free</button>
      <button class="btn ghost" onclick="GB.openAuth('login')">Log in</button>
    </div>`;
  }

  // ------------------------------------------------------------------ Router
  // Renders are non-destructive: when the screen we already show is simply
  // refreshed (live SSE boost feed, coin claim, task claim…), the current
  // content stays on screen and is swapped out only once the fresh data has
  // rendered — no full-page spinner flash, no scroll reset, nothing that
  // feels like a page reload. Only real navigations (hashchange) show the
  // spinner and scroll back to the top.
  let renderSeq = 0;
  async function render(opts = {}) {
    const seq = ++renderSeq;
    const hash = location.hash.replace(/^#/, '') || '/home';
    const [path, qs] = hash.split('?');
    const seg = path.split('/').filter(Boolean);
    S.query = Object.fromEntries(new URLSearchParams(qs || ''));
    const route = seg[0] || 'home';
    const routeKey = seg.join('/') || 'home';
    const navigated = opts.nav === true;                 // came from hashchange/back-forward
    const routeChanged = routeKey !== S.current;
    if (navigated) S.navOpen = false;                    // hamburger closes on navigation
    S.current = routeKey;
    const viewEl = $('#view');
    if (!viewEl) return;
    // show the loading spinner only on first paint or an actual route change;
    // a refresh of the current route keeps the existing screen in place
    if (!viewEl.firstChild || viewEl.dataset.route !== (routeKey + (qs || '')) || routeChanged) {
      viewEl.dataset.route = routeKey + (qs || '');
      if (navigated || !viewEl.firstChild) {
        viewEl.innerHTML = '<p class="center"><span class="spinner">🎡</span> Loading…</p>';
      }
    }
    refreshHeader();
    const keepScroll = !navigated && !routeChanged;
    const prevScrollY = window.scrollY;
    try {
      let html;
      if (route === 'profile' && seg[1]) html = await VIEWS.profile(seg[1]);
      else if (route === 'admin' && seg[1] === 'claims' && seg[2] && seg[3]) {
        html = isAdminUI() ? await adminClaimReviewView(seg[2], seg[3]) : await VIEWS.admin();
      }
      else if (VIEWS[route]) html = await VIEWS[route]();
      else html = await VIEWS.home();
      if (seq !== renderSeq) return;                     // a newer render superseded this one
      if ($('#view')) $('#view').innerHTML = html;
      refreshHeader();
      if (route === 'wallet') startCountdowns();
      if (S.current === 'admin') { loadClaims(); loadProfileQueue(); loadAdminUsers(); }
      if (navigated || routeChanged) window.scrollTo(0, 0);
      else if (keepScroll && window.scrollY !== prevScrollY) window.scrollTo(0, prevScrollY);
    } catch (err) {
      if (seq !== renderSeq) return;
      if ($('#view')) $('#view').innerHTML = `<div class="card danger"><h3>😵 Oops</h3><p>${esc(err.message)}</p><button class="btn" onclick="location.hash='#/home'">Go home</button></div>`;
    }
  }

  function startCountdowns() {
    const el = $('#dropCountdown');
    if (!el) return;
    if (!el.dataset.at) {
      el.textContent = '🍀 READY!';
      const b = $('#dropBtn');
      if (b) b.disabled = false;
      return;
    }
    const at = Date.parse(el.dataset.at || '');
    const tick = () => {
      if (!el.isConnected) return clearInterval(el._t);
      const ms = at - Date.now();
      if (ms <= 0) { el.textContent = '🍀 READY!'; const b = $('#dropBtn'); if (b) { b.disabled = false; b.style.background = 'var(--mint)'; } return clearInterval(el._t); }
      const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
      el.textContent = `${h}h ${m}m ${s}s`;
      const b = $('#dropBtn'); if (b) b.disabled = true;
    };
    tick();
    clearInterval(el._t);
    el._t = setInterval(tick, 1000);
  }

  function search() {
    const q = gbv('q'), cat = gbv('cat');
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (cat) p.set('category', cat);
    go('/discover' + (p.toString() ? '?' + p : ''));
  }

  function gbv(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  // ------------------------------------------------------------------ SSE
  function connectSSE() {
    clearTimeout(S.sseTimer);
    const es = new EventSource('/api/stream');
    S.es = es;
    es.onopen = () => { S.sseClosed = false; };
    es.addEventListener('hello', (e) => {
      try { S.online = JSON.parse(e.data).online; } catch { }
      refreshHeader();
    });
    es.addEventListener('ping', () => {});
    es.addEventListener('presence', (e) => {
      try { S.online = JSON.parse(e.data).online; refreshHeader(); } catch { }
    });
    es.addEventListener('boost', (e) => {
      let d = {}; try { d = JSON.parse(e.data); } catch { }
      toast(`🔥 ${d.username} boosted ${d.profileName} (+${fmt(d.value)} pts)`);
      refreshHeader();
      if (S.current === 'home' || S.current === 'discover' || S.current === 'mine') debounceRender();
    });
    es.addEventListener('claim', (e) => {
      let d = {}; try { d = JSON.parse(e.data); } catch { }
      if (d.kind === 'lucky') toast(`🍀 ${d.username} hit a lucky drop (+${fmt(d.amount)} coins)!`);
      else toast(`🎁 ${d.username} claimed the daily (+${fmt(d.amount)} coins)!`);
      if (S.current === 'home') debounceRender();
    });
    es.addEventListener('announce', (e) => {
      let d = {}; try { d = JSON.parse(e.data); } catch { }
      toast('📣 ' + (d.message || ''), 'good');
      if (S.current === 'admin') debounceRender();
    });
    es.addEventListener('profile_new', (e) => {
      let d = {}; try { d = JSON.parse(e.data); } catch { }
      toast(`✨ New fan page: ${d.name}!`, 'good');
      if (S.current === 'discover' || S.current === 'home' || S.current === 'mine') debounceRender();
    });
    es.addEventListener('claim_request', () => { if (S.current.startsWith('admin')) debounceRender(); });
    es.addEventListener('claim_updated', () => { if (S.current.startsWith('admin') || S.current.startsWith('profile/')) debounceRender(); });
    es.addEventListener('season', (e) => { toast('🏆 Season settled!', 'good'); if (S.current === 'admin' || S.current === 'home') debounceRender(); });
    es.addEventListener('donation', (e) => {
      let d = {}; try { d = JSON.parse(e.data); } catch { }
      toast('💝 ' + d.username + ' made a non-reward donation!', 'good');
    });
    es.addEventListener('admin_reset', () => { toast('Database reseeded by admin', 'bad'); refresh().then(render); });
    es.addEventListener('user', () => {
      refresh().then(() => { refreshHeader(); });
    });
    es.addEventListener('shutdown', () => { es.close(); });
    es.onerror = () => {
      if (S.sseClosed) return;
      S.sseTimer = setTimeout(connectSSE, 2500 + Math.random() * 2000);
    };
  }

  let _dTimer = null;
  function debounceRender() {
    clearTimeout(_dTimer);
    _dTimer = setTimeout(() => {
      // Never yank the screen away while the user is typing into a form on it
      // (e.g. the Discover search box or the Create form) — retry shortly.
      const ae = document.activeElement;
      const viewEl = $('#view');
      if (ae && viewEl && viewEl.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) {
        debounceRender();
        return;
      }
      render();
    }, 700);
  }

  // ------------------------------------------------------------------ Boot
  async function boot() {
    document.body.innerHTML = shellHTML('<p class="center"><span class="spinner">🎡</span> Warming up the carnival…</p>');
    await refresh();
    window.addEventListener('hashchange', () => render({ nav: true }));
    // auto-close the mobile menu when any nav link is tapped (delegated —
    // survives header rebuilds, and also covers taps on the current route
    // where no hashchange/render happens)
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('#nav a')) closeNav();
    });
    connectSSE();
    // floating back-to-top button (persists across shell rebuilds — it lives in shellHTML)
    window.addEventListener('scroll', () => {
      const b = $('#gbBackTop');
      if (b) b.classList.toggle('gb-show', (window.scrollY || 0) > 480);
    }, { passive: true });
    if (!location.hash) {
      // seed the default route without firing hashchange → single render
      try { history.replaceState(null, '', '#/home'); }
      catch { location.hash = '#/home'; }
    }
    await render({ nav: true });
  }

  boot().catch((err) => {
    document.body.innerHTML = `<div style="max-width:560px;margin:80px auto" class="card"><h2>😵 Grinbid couldn't start</h2><p>${esc(err.message)}</p></div>`;
  });
})();
