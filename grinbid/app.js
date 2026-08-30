'use strict';
/* ============================================================
   Grinbid DEMO SPA — same screens as the real app (/public/app.js)
   but wired to the in-browser mock API (demo-api.js) instead of a
   server: hash routing, 9 screens, modals, confetti, live feed.

   🧪 Demo mode: static page, demo data, zero network calls.
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
    online: 7,
    current: null,
    query: {},
    navOpen: false
  };

  const AVATARS = ['😀', '😎', '🤓', '🦊', '🐱', '🐶', '🦄', '🐸', '🐙', '👻', '🤖', '🐹', '🎤', '🎸', '🍕', '🍩', '🌈', '⚡', '⭐', '🍀'];
  const CATS = {
    celebrity: { label: 'Celebrity', color: 'pink' },
    influencer: { label: 'Influencer', color: 'sky' },
    estate: { label: 'Estate', color: 'mint' },
    venue: { label: 'Venue', color: 'orange' },
    brand: { label: 'Brand', color: 'purple' },
    community: { label: 'Community', color: 'yellow' }
  };
  const QUICK_LOGINS = [
    { username: 'demo_fan', label: '😎 demo_fan', note: '8,730 coins · streak 4 · tasks waiting' },
    { username: 'pixelpanda', label: '🐼 pixelpanda', note: 'owns a fan page → try the ×1.5 self-boost' },
    { username: 'moonwalker_z', label: '🦊 moonwalker_z', note: 'top of the season leaderboard' }
  ];

  window.GB = { api, toast, go, openAuth, openBoost, openClaim, claimDaily, claimLucky, doBoost, refresh, setAvatar, submitAuth, logout, shareCode, claimTask, donate, createProfile, adminLogin, adminAction, copyText, resetDemo, quickLogin, pickDonate, search, pickAmount, submitClaim, openLegal, closeModal, toggleNav, closeNav };
  // tiny helpers referenced by inline handlers in rendered HTML
  window.go = go;
  window.gbv = gbv;

  // ------------------------------------------------------------------ API (mock, in-browser)
  async function api(path, opts = {}) {
    return GB_API.api(path, opts);
  }

  // ------------------------------------------------------------------ UI helpers
  function toast(msg, kind = '') {
    const box = $('#toasts');
    if (!box) return;
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

  // Confetti: classic little squares + emoji bursts.
  function confetti(burst = 120) {
    const cv = $('#confetti');
    if (!cv) return;
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
      <div class="quick-logins">
        <div class="lbl">🧪 Demo quick-login <span class="muted small">(password: ${esc(GB_API.demoPassword)})</span></div>
        ${QUICK_LOGINS.map((q) => `<button class="btn small sky" onclick="GB.quickLogin('${q.username}')" title="${esc(q.note)}">${q.label}</button>`).join('')}
      </div>
      <form onsubmit="GB.submitAuth(event, '${isSignup ? 'signup' : 'login'}')">
        <label class="field"><span class="lbl">Username</span>
          <input name="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" required placeholder="cool_fan_01"></label>
        ${isSignup ? `
        <div class="two-col">
          <label class="field"><span class="lbl">Display name</span>
            <input name="displayName" maxlength="24" placeholder="Cool Fan"></label>
          <label class="field"><span class="lbl">Referral code (optional)</span>
            <input name="referralCode" maxlength="32" placeholder="GB-DEMO42-A1B2"></label>
        </div>
        <div class="field"><span class="lbl">Pick your emoji avatar</span>
          <div class="emoji-picker" id="avatarPick">
            ${AVATARS.map((a, i) => `<button type="button" class="${i === 0 ? 'sel' : ''}" data-a="${a}" onclick="GB.setAvatar('${a}', this)">${a}</button>`).join('')}
          </div></div>` : ''}
        <label class="field"><span class="lbl">Password (min 8 chars)</span>
          <input name="password" type="password" minlength="8" maxlength="128" required></label>
        <button class="btn big ${isSignup ? 'pink' : 'mint'}" type="submit" id="authSubmit" style="width:100%">${isSignup ? '🎟️ Claim my 2500 free coins' : '🚪 Log in'}</button>
      </form>
      <p class="center mt muted">
        ${isSignup ? 'Already a booster? ' : 'New to Grinbid? '}
        <a href="#" onclick="GB.openAuth('${isSignup ? 'login' : 'signup'}');return false">${isSignup ? 'Log in' : 'Sign up'}</a>
      </p>
      <div class="notice legal mt">
        Grinbid coins are <b>virtual and hold zero cash value</b>. They cannot be purchased, sold, transferred for money or redeemed. Boost by backing faves, never by paying.
      </div>`);
  }

  let pendingAvatar = '😀';
  function setAvatar(a, btn) {
    pendingAvatar = a;
    $$('#avatarPick button').forEach((b) => b.classList.remove('sel'));
    if (btn) btn.classList.add('sel');
  }

  async function quickLogin(username) {
    try {
      await api('/auth/login', { method: 'POST', body: { username, password: GB_API.demoPassword } });
      await refresh();
      closeModal();
      toast('Demo login: ' + username + ' 🎭', 'good');
      render();
    } catch (err) {
      toast(err.message, 'bad');
    }
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
    if (mode === 'signup') body.avatar = pendingAvatar;
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
      toast(authErr(err), 'bad');
    } finally {
      btn.disabled = false;
      btn.textContent = mode === 'signup' ? '🎟️ Claim my 2500 free coins' : '🚪 Log in';
    }
  }

  function authErr(err) {
    if (err.message === 'username_taken') return 'That username is taken — try another!';
    if (err.message === 'invalid_credentials') return 'Wrong username or password.';
    if (err.message === 'invalid_username') return 'Usernames are 3–20 letters, numbers or _';
    if (err.message === 'invalid_password') return 'Password must be at least 8 characters.';
    if (err.message === 'unknown_referrer') return 'That referral code does not exist (demo try: GB-DEMO42-A1B2)';
    return err.message;
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

  function resetDemo() {
    if (!confirm('Reset all demo data back to the original seed? (coins, boosts, claims — everything)')) return;
    GB_API.resetDemo();
  }

  // ------------------------------------------------------------------ Header + demo strip
  function headerHTML() {
    const m = S.me;
    return `
    <header class="topbar"><div class="wrap topbar-inner">
      <a class="logo" href="#/home"><span class="lolly">🎪</span> Grinbid <span class="demo-badge">demo</span></a>
      <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="${Boolean(S.navOpen)}" aria-controls="nav" onclick="GB.toggleNav()">${S.navOpen ? '✕' : '☰'}</button>
      <nav class="nav${S.navOpen ? ' open' : ''}" id="nav">
        <a href="#/home" data-r="home">Home</a>
        <a href="#/discover" data-r="discover">Discover</a>
        <a href="#/tasks" data-r="tasks">Tasks</a>
        <a href="#/wallet" data-r="wallet">Wallet</a>
        <a href="#/refer" data-r="refer">Refer</a>
        <a href="#/create" data-r="create">Create</a>
        ${m ? '<a href="#/mine" data-r="mine">My page</a>' : ''}
        <a href="#/donate" data-r="donate">Donate</a>
        <a href="#/admin" data-r="admin">Admin</a>
      </nav>
      ${m ? `
        <span class="streak-pill" title="Daily streak">🔥 ${m.streakCount}</span>
        <span class="wallet-pill" onclick="go('#/wallet')"><span class="coin">🪙</span> ${fmt(m.coins)}</span>
        <span class="avatar-chip" title="${esc(m.username)}" onclick="go('#/wallet')">${esc(m.avatar)}</span>
        <button class="btn ghost small" onclick="GB.logout()">Log out</button>
      ` : `
        <button class="btn pink" onclick="GB.openAuth('signup')">Sign up · +2,500</button>
        <button class="btn ghost" onclick="GB.openAuth('login')">Log in</button>
        <span class="sticker fan">🟢 ${S.online} online</span>
      `}
    </div></header>`;
  }

  function demoStripHTML() {
    return `
    <div class="demo-strip">
      <div class="wrap row spread">
        <span class="small">🧪 <b>DEMO MODE</b> — a static page: demo data, mock API &amp; simulated live feed, all running inside your browser. No server, no real money.</span>
        <span class="row">
          <button class="btn small sky" onclick="GB.openAuth('login')">🎭 Demo accounts</button>
          <button class="btn small ghost" onclick="GB.resetDemo()">♻️ Reset demo data</button>
        </span>
      </div>
    </div>`;
  }

  function refreshHeader() {
    const old = $('.topbar');
    if (!old) return;
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
        <div><b>🎪 Grinbid</b> — Bid. Back. Rank up. <span class="sticker demo-strip-badge">static demo</span></div>
        <div class="row">
          <a href="#/terms">Terms</a> <a href="#/privacy">Privacy</a>
          <a href="#" onclick="GB.openLegal('terms');return false">Legal modal</a>
        </div>
      </div>
      <p class="small" style="opacity:.85">
        Grinbid is a fan-made game of <b>100% free virtual coins</b>. Coins have <b>zero cash value</b>, cannot be bought,
        sold or redeemed, and nothing here is gambling or real-money trade. Donations are voluntary, non-reward contributions only.
        Seeded profiles are <b>fan-created</b> and are not affiliated with, endorsed by, or connected to the real entities, estates,
        artists or venues depicted.
      </p>
      <p class="small" style="opacity:.7">🧪 Demo build — demo data only, stored in your browser. © ${new Date().getFullYear()} Grinbid · Made with 🍭 and zero npm dependencies.</p>
    </div></footer>`;
  }

  function shellHTML(view) {
    return `
      ${demoStripHTML()}
      ${headerHTML()}
      <main class="wrap view" id="view">${view}</main>
      ${footerHTML()}
      <div id="toasts"></div>
      <canvas id="confetti"></canvas>`;
  }

  // ------------------------------------------------------------------ Data
  async function refresh(quiet = true) {
    try {
      const data = await api('/me');
      S.me = data.user;
      return data.user;
    } catch (err) {
      if (!quiet) toast(err.message, 'bad');
      return null;
    }
  }

  // ------------------------------------------------------------------ Screens
  const VIEWS = {};

  // ---- 1. Home
  VIEWS.home = async () => {
    const [lb, feed, profiles] = await Promise.all([
      api('/leaderboard'), api('/feed'), api('/profiles')
    ]);
    const m = S.me;
    const lbRows = lb.top.map((u, i) => `
      <div class="list-row">
        <span class="tag" style="width:44px">${['🥇', '🥈', '🥉'][i] || '#' + (i + 1)}</span>
        <span class="avatar">${esc(u.avatar)}</span>
        <span class="grow"><b>${esc(u.displayName || u.username)}</b><br><span class="muted small">@${esc(u.username)}</span></span>
        <span class="tag">${fmt(u.points)} pts</span>
      </div>`).join('') || '<p class="muted">No boosters yet — be the first!</p>';

    const feedRows = feed.boosts.slice(0, 8).map((b) => `
      <div class="list-row">
        <span class="avatar">${esc(b.avatar)}</span>
        <span class="grow"><b>${esc(b.username)}</b> boosted <a href="#/profile/${esc(b.profileSlug)}">${b.profileEmoji} ${esc(b.profileName)}</a>
          <br><span class="muted small">${fmt(b.amount)} coins → ${fmt(b.value)} pts ${b.selfBoost ? '<span class="sticker self">self ×1.5</span>' : ''} · ${timeAgo(b.at)}</span></span>
        <span class="tag">🔥</span>
      </div>`).join('') || '<p class="muted">The boost feed is quiet… start the party! 🎉</p>';

    const top = (profiles.profiles || []).slice(0, 6).map((p) => profileCard(p)).join('');

    return `
      <section class="card hero">
        <span class="sticker fan">100% free coins</span>
        <span class="sticker seed">no real money</span>
        <h1>Bid. Back. Rank up. 🎪</h1>
        <p class="tagline">Grind the daily streak, grab lucky drops and boost your faves into the season podium — all with virtual coins that cost nothing.</p>
        <div class="row mt">
          ${m ? `<button class="btn big" onclick="go('#/discover')">🎯 Boost something</button>
                 <button class="btn big" style="background:#fff" onclick="go('#/wallet')">🪙 My wallet</button>`
             : `<button class="btn big" onclick="GB.openAuth('signup')">🎟️ Join free — get ${fmt(2500)} coins</button>
                <button class="btn big" style="background:#fff" onclick="go('#/discover')">👀 Browse faves</button>`}
        </div>
        <p class="small" style="margin-top:14px">🪙 Virtual coins only — zero cash value, nothing to buy. Donations are non-reward and voluntary.</p>
      </section>

      <div class="stripe">
        <div class="stat"><div class="n">🪙 ${fmt(2500)}</div><div class="l">Signup bonus</div></div>
        <div class="stat"><div class="n">🔥 ${fmt(500)}+</div><div class="l">Daily claim</div></div>
        <div class="stat"><div class="n">🍀 ${fmt(250)}–${fmt(2500)}</div><div class="l">Lucky drop</div></div>
        <div class="stat"><div class="n">👥 10%</div><div class="l">Lifetime match</div></div>
      </div>

      <div class="two-col">
        <div>
          <h2 class="section-title">🏆 Season leaderboard <span class="muted small">(ends ${new Date(lb.season.endsAt).toLocaleDateString()})</span></h2>
          <div class="card">${lbRows}</div>
        </div>
        <div>
          <h2 class="section-title">⚡ Live boost feed</h2>
          <div class="card">${feedRows}</div>
        </div>
      </div>

      <h2 class="section-title">💖 Trending fan pages</h2>
      <div class="grid">${top}</div>
      <p class="center mt"><a class="btn ghost" href="#/discover">See all →</a></p>`;
  };

  // ---- 2. Discover
  VIEWS.discover = async () => {
    const q = S.query.q || '';
    const cat = S.query.cat || '';
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat) params.set('category', cat);
    const data = await api('/profiles' + (params.toString() ? '?' + params : ''));
    return `
      <h1 class="section-title">🔭 Discover</h1>
      <div class="card mb row">
        <input id="q" style="max-width:340px" placeholder="Search names, tags… (try: luna)" value="${esc(q)}" onkeydown="if(event.key==='Enter')GB.search()">
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

  function profileCard(p) {
    const cat = CATS[p.category] || { label: p.category };
    return `
    <a class="card profile-card" href="#/profile/${esc(p.slug)}">
      <div class="row spread">
        <span class="profile-emoji">${esc(p.emoji)}</span>
        <span>
          <span class="cat-badge">${esc(cat.label)}</span><br>
          ${p.seed ? '<span class="sticker fan">fan-made</span>' : '<span class="sticker">community</span>'}
          ${p.verified ? '<span class="sticker verified">🟢 verified</span>' : ''}
        </span>
      </div>
      <h3 style="margin:.3em 0">${esc(p.name)}</h3>
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
      <a class="btn ghost small" href="#/discover">← Back to discover</a>
      <div class="card mt">
        <div class="row spread">
          <div class="row">
            <span class="avatar big">${esc(p.emoji)}</span>
            <div>
              <h2 style="margin:0">${esc(p.name)}</h2>
              <span class="cat-badge">${esc(cat.label)}</span>
              ${p.seed ? '<span class="sticker fan">fan-made · not affiliated</span>' : '<span class="sticker">community page</span>'}
              ${p.verified ? '<span class="sticker verified">🟢 verified owner' + (p.claimedByUsername ? ' · @' + esc(p.claimedByUsername) : '') + '</span>' : ''}
              <div class="muted small mt" style="margin-top:6px">
                ${p.isMineProfile
                  ? '<span class="sticker self">you created this 🎪</span>'
                  : p.createdByUsername
                    ? `created by <b>@${esc(p.createdByUsername)}</b>`
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

      ${p.seed ? `
      <div class="card mt" id="claimBox">
        <div class="row spread">
          <div>
            <h3 style="margin:0">🏛️ Own this? Verify & claim it.</h3>
            <p class="muted small">This is a fan-made page. If you are the real ${esc(p.name)}, submit a claim — moderators verify and you get the 🟢 badge. (Try it, then approve yourself in <a href="#/admin">Admin</a>!)</p>
          </div>
          <button class="btn purple" onclick="GB.openClaim('${esc(p.slug)}')">${p.verified ? 'View claim' : 'Claim page'}</button>
        </div>
      </div>` : ''}
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
          ${m.dailyClaim.claimedToday
            ? `<p class="muted">Claimed today! Come back tomorrow 🔥</p>
               <p class="tag">Next: streak ${m.dailyClaim.streak + 1} → <b>${fmt(nextReward(m))}</b> coins</p>`
            : `<p class="tag">Streak ${m.dailyClaim.streakForClaim} → <b>${fmt(m.dailyClaim.reward)}</b> coins</p>
               <button class="btn big mint" onclick="GB.claimDaily()">🎁 Claim free coins</button>`}
          <p class="muted small mt">+500 base, +150 per streak day, capped at +2,000/day.</p>
        </div>
        <div class="card">
          <h3>🍀 Lucky drop</h3>
          <p class="muted">Free random drop every 3 hours — ${fmt(250)} to ${fmt(2500)} coins.</p>
          <div class="countdown tag" id="dropCountdown" style="font-size:1.3rem" data-at="${esc(m.nextLuckyDropAt || '')}">…</div>
          <button class="btn big orange" style="background:var(--orange)" onclick="GB.claimLucky()" id="dropBtn">💎 Open drop</button>
          <p class="muted small mt">🧪 Demo tip: “Reset demo data” in the top strip makes the drop ready again.</p>
        </div>
      </div>

      <h2 class="section-title">🧾 History</h2>
      <div class="card">${txnRows}</div>`;
  };

  function nextReward(m) {
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
          <p class="muted small mt">🧪 Demo: sign up a fresh account with this code to see the bonuses flow.</p>
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
      await api('/referral/share', { method: 'POST' });
      await refresh();
      toast('Code shared! Referral task done 🎉', 'good');
      render();
    } catch (err) { toast(err.message, 'bad'); }
  }

  // ---- 7. Create profile
  VIEWS.create = async () => {
    if (!S.me) return requireLogin();
    return `
      <h1 class="section-title">✨ Create a fan page</h1>
      <div class="notice legal">
        🏷️ You can create <b>one community profile</b>. It's a <b>fan-created</b> page — not an official endorsement.
        Boosting your own page earns the <b>×1.5 self-boost</b>.
      </div>
      <div class="card">
        <form onsubmit="GB.createProfile(event)">
          <label class="field"><span class="lbl">Name *</span><input name="name" maxlength="24" required placeholder="The Marshmallow Museum"></label>
          <label class="field"><span class="lbl">Slug (url) *</span><input name="slug" maxlength="40" required placeholder="marshmallow-museum" pattern="[a-z0-9][a-z0-9-]{1,39}"></label>
          <div class="two-col">
            <label class="field"><span class="lbl">Category</span>
              <select name="category">${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label>
            <label class="field"><span class="lbl">Emoji badge</span>
              <div class="emoji-picker" id="createEmoji">${AVATARS.map((a, i) => `<button type="button" class="${i === 0 ? 'sel' : ''}" data-a="${a}" onclick="GB.setAvatar('${a}', this)">${a}</button>`).join('')}</div></label>
          </div>
          <label class="field"><span class="lbl">Tagline</span><input name="tagline" maxlength="60" placeholder="The sweetest museum in town"></label>
          <label class="field"><span class="lbl">Description</span><textarea name="description" maxlength="400" placeholder="Tell fans what makes it special…"></textarea></label>
          <label class="field"><span class="lbl">Tags (comma separated, max 6)</span><input name="tags" placeholder="museum, candy, family"></label>
          <button class="btn big purple" type="submit">🎪 Create fan page</button>
        </form>
      </div>`;
  };

  async function createProfile(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    try {
      const data = await api('/profiles', {
        method: 'POST',
        body: {
          name: fd.get('name'), slug: fd.get('slug'), category: fd.get('category'),
          emoji: pendingAvatar, tagline: fd.get('tagline'), description: fd.get('description'),
          tags: String(fd.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean)
        }
      });
      await refresh();
      toast('Fan page created! 🎉 Boosting it now gives ×1.5', 'good');
      confetti();
      go('#/profile/' + data.profile.slug);
    } catch (err) {
      toast(err.message === 'one_profile_per_user' ? 'You already created your one profile!' : err.message, 'bad');
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
    return `
      <h1 class="section-title">🎪 My creation</h1>
      <div class="card">
        <div class="row spread">
          <div class="row">
            <span class="avatar big">${esc(p.emoji)}</span>
            <div>
              <h2 style="margin:0">${esc(p.name)}</h2>
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
      <p class="small muted center">🧪 Demo: this screen only records intent — no payment exists anywhere in this demo.</p>`;
  };

  let donateMethod = 'upi';
  function pickDonate(id, btn) {
    donateMethod = id;
    $$('#view .card .row .btn').forEach((b) => b.classList.remove('sel'));
    if (btn) btn.classList.add('sel');
  }

  async function donate() {
    try {
      const d = await api('/donations', { method: 'POST', body: { method: donateMethod, amount: Number(($('#donAmt') || {}).value || 0), note: ($('#donNote') || {}).value } });
      toast(d.message, 'good');
    } catch (err) { toast(err.message === 'unauthorized' ? 'Log in first (donations need an account).' : err.message, 'bad'); }
  }

  // ---- 9. Admin
  VIEWS.admin = async () => {
    try {
      const d = await api('/admin/overview');
      return adminPanel(d);
    } catch (err) {
      if (err.status === 401) {
        return `
          <h1 class="section-title">🔐 Admin</h1>
          <div class="card" style="max-width:420px">
            <form onsubmit="GB.adminLogin(event)">
              <label class="field"><span class="lbl">Admin password</span><input name="password" type="password" required></label>
              <button class="btn purple" type="submit">Log in</button>
            </form>
            <p class="muted small mt">🧪 Demo password: <code>${esc(GB_API.adminPassword)}</code></p>
          </div>`;
      }
      throw err;
    }
  };

  async function adminLogin(ev) {
    ev.preventDefault();
    try {
      await api('/admin/login', { method: 'POST', body: { password: new FormData(ev.target).get('password') } });
      toast('Admin logged in 🔐', 'good');
      render();
    } catch (err) { toast('Wrong password', 'bad'); }
  }

  function adminPanel(d) {
    return `
      <h1 class="section-title">🛠️ Admin dashboard</h1>
      <div class="stripe">
        <div class="stat"><div class="n">${d.users}</div><div class="l">Users</div></div>
        <div class="stat"><div class="n">${d.boosts}</div><div class="l">Boosts</div></div>
        <div class="stat"><div class="n">${fmt(d.coinsFloating)}</div><div class="l">Coins in economy</div></div>
        <div class="stat"><div class="n">${d.openClaimRequests}</div><div class="l">Open claims</div></div>
      </div>
      <div class="two-col">
        <div class="card">
          <h3>📣 Broadcast</h3>
          <label class="field"><span class="lbl">Message to everyone (live toast)</span><input id="annMsg" maxlength="280" placeholder="Maintenance in 5 min!"></label>
          <button class="btn pink" onclick="GB.adminAction('announce', {message:gbv('annMsg')})">Send broadcast</button>
        </div>
        <div class="card">
          <h3>🔔 Message a user</h3>
          <label class="field"><span class="lbl">User id</span><input id="ntfUser" placeholder="u_0001" value="u_0001"></label>
          <label class="field"><span class="lbl">Message</span><input id="ntfMsg" maxlength="280" placeholder="Your claim was approved!"></label>
          <button class="btn sky" onclick="GB.adminAction('notify', {userId:gbv('ntfUser'), message:gbv('ntfMsg')})">Send</button>
        </div>
      </div>
      <div class="card mt">
        <div class="row spread">
          <div><h3 style="margin:0">🏆 Season ${d.season.id}</h3>
            <p class="muted small">Ends ${new Date(d.season.endsAt).toLocaleString()} · prizes ${fmt(50000)} / ${fmt(25000)} / ${fmt(10000)}</p></div>
          <button class="btn orange" style="background:var(--orange)" onclick="GB.adminAction('season/settle', {})">Force settle now</button>
        </div>
      </div>
      <div class="card mt" id="claimQueue"><h3>🏛️ Claim requests</h3><p class="muted">Loading…</p></div>
      <div class="card mt">
        <h3>🧾 Funding intents (non-reward) · ${fmt(d.funding)} on record</h3>
        <p class="muted small">No coins are ever granted for donations.</p>
      </div>`;
  }

  async function adminAction(action, body) {
    try {
      const d = await api('/admin/' + action, { method: 'POST', body });
      toast('Done ✔', 'good');
      if (action === 'season/settle' && d.payout) {
        toast(`Season settled! Payouts: ${d.payout.earned.map((e) => e.username + ' +' + fmt(e.prize)).join(', ')}`, 'good');
      }
      render();
    } catch (err) { toast(err.message, 'bad'); }
  }

  async function loadClaims() {
    try {
      const d = await api('/admin/claim-requests');
      const box = $('#claimQueue');
      if (!box) return;
      if (!d.requests.length) { box.innerHTML = '<h3>🏛️ Claim requests</h3><p class="muted">None pending. 🎉</p>'; return; }
      box.innerHTML = '<h3>🏛️ Claim requests</h3>' + d.requests.map((r) => `
        <div class="list-row">
          <span class="grow"><b>${esc(r.profileName)}</b> (${esc(r.profileSlug)})<br>
            <span class="muted small">by ${esc(r.username)} · ${timeAgo(r.at)}<br>${esc(r.evidence)}</span></span>
          <button class="btn mint small" onclick="GB.adminAction('claim-request', {slug:'${esc(r.profileSlug)}', requestId:'${esc(r.id)}', approve:true})">✓ Approve</button>
          <button class="btn small" style="background:#fff" onclick="GB.adminAction('claim-request', {slug:'${esc(r.profileSlug)}', requestId:'${esc(r.id)}', approve:false})">✕ Reject</button>
        </div>`).join('');
    } catch (err) { /* not admin */ }
  }

  // ---- Claim modal
  function openClaim(slug) {
    if (!S.me) return openAuth('signup');
    modal(`
      <h2>🏛️ Verify & claim ${esc(slug)}</h2>
      <p class="muted">This is a <b>fan-created</b> page. If you represent the real ${esc(slug)}, submit evidence and a moderator will verify.</p>
      <label class="field"><span class="lbl">Evidence (why are you the real owner?)</span>
        <textarea id="claimEvidence" maxlength="500" placeholder="Website, social handle, registry link…"></textarea></label>
      <button class="btn purple" onclick="GB.submitClaim('${esc(slug)}')">Send claim request</button>
      <p class="muted small mt">Claims are reviewed manually. This does not grant coins or boost advantages.<br>🧪 Demo: submit, then approve it yourself in <a href="#/admin" onclick="GB.closeModal()">Admin</a>.</p>`);
  }

  async function submitClaim(slug) {
    try {
      await api('/profiles/' + slug + '/claim', { method: 'POST', body: { evidence: gbv('claimEvidence') } });
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
    terms: `<p><b>1.</b> Grinbid is a free fan-made game. All coins are 100% virtual, granted freely, and hold <b>zero cash value</b>.</p>
      <p><b>2.</b> Coins cannot be purchased, sold, traded, transferred for money, or redeemed. There are no microtransactions, no Stripe, no pay-to-win.</p>
      <p><b>3.</b> Boosts are virtual expressions of fan support. Nothing is wagered and nothing of real value changes hands.</p>
      <p><b>4.</b> Donations are voluntary, non-reward contributions only. Donors receive no coins, perks or ranking advantages.</p>
      <p><b>5.</b> Seeded profiles are fan-created and unaffiliated with real entities, estates, artists or venues.</p>
      <p><b>6.</b> You must be 13+ and behave kindly. Abuse, spam, botting, self-referrals and fake claims get you booted.</p>`,
    privacy: `<p><b>1.</b> The real app stores: username, display name, emoji avatar, a salted scrypt password hash, coins/streak/task data, and an IP hash for rate limiting.</p>
      <p><b>2.</b> We never sell data, show ads, or share anything with third parties.</p>
      <p><b>3.</b> 🧪 In this demo there is no server at all — your demo data lives in your browser's local storage and never leaves your machine. Reset it any time from the strip at the top.</p>
      <p><b>4.</b> Referral codes are validated against bot abuse (same-IP detection) and may be held for review.</p>`
  };

  VIEWS.terms = async () => `<div class="legal-page"><div class="card">
    <a class="btn ghost small" href="#/home">← Home</a>
    <h1>📜 Terms</h1><p class="muted">Bid. Back. Rank up — with 100% free coins.</p>
    ${LEGAL.terms}
    <div class="notice legal">🪙 Coins are virtual, free, zero cash value and non-redeemable.</div>
  </div></div>`;

  VIEWS.privacy = async () => `<div class="legal-page"><div class="card">
    <a class="btn ghost small" href="#/home">← Home</a>
    <h1>🕵️ Privacy &amp; Safety</h1><p class="muted">Minimal data, hash-only passwords, no trackers.</p>
    ${LEGAL.privacy}
    <div class="notice legal">🔒 No ad trackers, no payment data, no selling anything.</div>
  </div></div>`;

  function requireLogin() {
    return `<div class="card center" style="max-width:520px;margin:40px auto">
      <h2>🔒 Booster access only</h2>
      <p class="muted">Log in or grab your free ${fmt(2500)} coins to play.</p>
      <button class="btn pink big" onclick="GB.openAuth('signup')">🎟️ Join free</button>
      <button class="btn ghost" onclick="GB.openAuth('login')">Log in</button>
      <p class="muted small mt">🧪 Or use a demo quick-login from the modal.</p>
    </div>`;
  }

  // ------------------------------------------------------------------ Router
  // Renders are non-destructive: when the screen we already show is simply
  // refreshed (live boost feed, coin claim, task claim…), the current content
  // stays on screen and is swapped out only once the fresh data has rendered —
  // no full-page spinner flash, no scroll reset, nothing that feels like a
  // page reload. Only real navigations (hashchange) show the spinner and
  // scroll back to the top.
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
      else if (VIEWS[route]) html = await VIEWS[route]();
      else html = await VIEWS.home();
      if (seq !== renderSeq) return;                     // a newer render superseded this one
      if ($('#view')) $('#view').innerHTML = html;
      refreshHeader();
      if (route === 'wallet') startCountdowns();
      if (route === 'admin') loadClaims();
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
      if (ms <= 0) {
        el.textContent = '🍀 READY!';
        const b = $('#dropBtn'); if (b) { b.disabled = false; b.style.background = 'var(--mint)'; }
        return clearInterval(el._t);
      }
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

  // ------------------------------------------------------------------ Live events (mock SSE)
  function connectBus() {
    const bus = GB_API;

    bus.on('boost', (d) => {
      toast(`🔥 ${d.username} boosted ${d.profileName} (+${fmt(d.value)} pts)`);
      refreshHeaderSoon();
      if (['home', 'discover', 'mine'].includes(S.current) || (S.current || '').startsWith('profile/')) debounceRender();
    });
    bus.on('claim', (d) => {
      if (d.kind === 'lucky') toast(`🍀 ${d.username} hit a lucky drop (+${fmt(d.amount)} coins)!`);
      else toast(`🎁 ${d.username} claimed the daily (+${fmt(d.amount)} coins)!`);
      if (S.current === 'home') debounceRender();
    });
    bus.on('announce', (d) => {
      toast('📣 ' + (d.message || ''), 'good');
      if (S.current === 'admin') debounceRender();
    });
    bus.on('signup', (d) => {
      toast(`👋 ${d.username} joined the carnival!`);
    });
    bus.on('notify', (d) => {
      if (S.me && d.userId === S.me.id) toast('🔔 ' + d.message, 'good');
      else if (S.current === 'admin') toast(`🔔 Delivered to @${d.username}`, 'good');
    });
    bus.on('profile_new', (d) => {
      toast(`✨ New fan page: ${d.name}!`, 'good');
      if (S.current === 'discover' || S.current === 'home' || S.current === 'mine') debounceRender();
    });
    bus.on('claim_request', () => { if (S.current === 'admin') debounceRender(); });
    bus.on('claim_updated', () => {
      if (S.current === 'admin' || (S.current || '').startsWith('profile/')) debounceRender();
    });
    bus.on('season', () => {
      toast('🏆 Season settled! Prizes paid to the top 3.', 'good');
      refresh().then(() => render());
    });
    bus.on('donation', (d) => {
      toast(`💝 ${d.username} made a non-reward donation!`, 'good');
    });
    bus.on('admin_reset', () => {
      toast('♻️ Demo data reset to the original seed', 'bad');
      refresh().then(() => { S.online = 7; render(); });
    });
    bus.on('user', () => { refreshHeaderSoon(); });
    bus.on('sync', () => {
      // state changed in another tab — follow along
      refresh().then(() => {
        refreshHeader();
        if (!['create', 'donate'].includes(S.current)) debounceRender();
      });
    });

    // fake presence ticker (stands in for the SSE presence channel)
    setInterval(() => {
      S.online = Math.max(5, Math.min(14, S.online + (Math.random() < .5 ? -1 : 1)));
      if (!S.me) refreshHeader();
    }, 8000);
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

  let _hTimer = null;
  function refreshHeaderSoon() {
    if (_hTimer) return;
    _hTimer = setTimeout(() => { _hTimer = null; refresh().then(refreshHeader); }, 400);
  }

  // ------------------------------------------------------------------ Boot
  async function boot() {
    document.title = 'Grinbid Demo — Bid. Back. Rank up. (static demo)';
    document.body.innerHTML = shellHTML('<p class="center"><span class="spinner">🎡</span> Warming up the carnival…</p>');
    await refresh();
    window.addEventListener('hashchange', () => render({ nav: true }));
    // auto-close the mobile menu when any nav link is tapped (delegated —
    // survives header rebuilds, and also covers taps on the current route
    // where no hashchange/render happens)
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('#nav a')) closeNav();
    });
    connectBus();
    if (!location.hash) {
      // seed the default route without firing hashchange → single render
      try { history.replaceState(null, '', '#/home'); }
      catch { location.hash = '#/home'; }
    }
    await render({ nav: true });
  }

  boot().catch((err) => {
    document.body.innerHTML = `<div style="max-width:560px;margin:80px auto" class="card"><h2>😵 Grinbid demo couldn't start</h2><p>${esc(err.message)}</p></div>`;
  });
})();
