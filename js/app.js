/* SAB Mobile demo — SPA router, screens and Amplitude event wiring.
   Client-side routed with real paths (/login, /home, /transfer/..., /improved-transfer).
   Deep links + refresh work on GitHub Pages via 404.html; the base path is computed
   in index.html and exposed as window.__APP_BASE__. */
(function () {
  'use strict';

  var D = window.SABData;
  var A = window.SABAnalytics;
  var BASE = window.__APP_BASE__ || '/';

  /* ---------------- state ---------------- */

  var store = {
    get auth() { return readJSON(sessionStorage, 'sab_auth'); },
    set auth(v) { writeJSON(sessionStorage, 'sab_auth', v); },
    get pendingBen() { return readJSON(sessionStorage, 'sab_pending_ben'); },
    set pendingBen(v) { writeJSON(sessionStorage, 'sab_pending_ben', v); },
    get pendingTxn() { return readJSON(sessionStorage, 'sab_pending_txn'); },
    set pendingTxn(v) { writeJSON(sessionStorage, 'sab_pending_txn', v); },
    get receipt() { return readJSON(sessionStorage, 'sab_receipt'); },
    set receipt(v) { writeJSON(sessionStorage, 'sab_receipt', v); },
    get utm() { return readJSON(sessionStorage, 'sab_utm'); },
    set utm(v) { writeJSON(sessionStorage, 'sab_utm', v); },
    get completions() { return parseInt(sessionStorage.getItem('sab_completions') || '0', 10); },
    set completions(v) { sessionStorage.setItem('sab_completions', String(v)); },
    get favourites() {
      var saved = readJSON(localStorage, 'sab_favs');
      if (saved) return saved;
      return D.BENEFICIARIES.filter(function (b) { return b.favourite; }).map(function (b) { return b.id; });
    },
    set favourites(v) { writeJSON(localStorage, 'sab_favs', v); },
    get customBens() { return readJSON(localStorage, 'sab_custom_bens') || []; },
    set customBens(v) { writeJSON(localStorage, 'sab_custom_bens', v); }
  };

  function readJSON(storage, key) {
    try { var raw = storage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function writeJSON(storage, key, v) {
    if (v === null || v === undefined) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(v));
  }

  function allBeneficiaries() { return D.BENEFICIARIES.concat(store.customBens); }
  function findBen(id) {
    return allBeneficiaries().filter(function (b) { return b.id === id; })[0] || null;
  }
  function railInfo(key) {
    return D.TRANSFER_TYPES.filter(function (t) { return t.key === key; })[0] || D.TRANSFER_TYPES[0];
  }

  /* ---------------- utils ---------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sar(n) {
    return 'SAR ' + Number(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function round2(n) { return Math.round(n * 100) / 100; }
  function randomUserId() {
    var hex = '';
    for (var i = 0; i < 10; i++) hex += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    return 'usr_' + hex;
  }
  function el(id) { return document.getElementById(id); }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    el('phone').appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 2200);
  }

  function sheet(html, onMount) {
    var root = el('sheet-root');
    root.innerHTML =
      '<div class="sheet-backdrop"></div>' +
      '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    root.hidden = false;
    requestAnimationFrame(function () { root.classList.add('open'); });
    root.querySelector('.sheet-backdrop').addEventListener('click', closeSheet);
    if (onMount) onMount(root.querySelector('.sheet'));
  }
  function closeSheet() {
    var root = el('sheet-root');
    root.classList.remove('open');
    setTimeout(function () { root.hidden = true; root.innerHTML = ''; }, 250);
  }

  /* ---------------- icons (inline SVG) ---------------- */

  var I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    transfers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10h13m0 0-3.5-3.5M20 10l-3.5 3.5"/><path d="M17 17H4m0 0 3.5-3.5M4 17l3.5 3.5" transform="translate(0 -2)"/></svg>',
    cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18"/></svg>',
    support: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 13a8 8 0 1 1 16 0"/><rect x="2.5" y="13" width="4" height="6" rx="1.8"/><rect x="17.5" y="13" width="4" height="6" rx="1.8"/><path d="M20 19a4 4 0 0 1-4 3.5h-2"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.9l-5.3 2.7 1.1-5.8-4.3-4.1 5.9-.8z"/></svg>',
    starFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.9l-5.3 2.7 1.1-5.8-4.3-4.1 5.9-.8z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    error: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="3.5"/><path d="M32 18v18" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="44.5" r="2.8" fill="currentColor"/></svg>',
    success: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="3.5"/><path d="M20 33.5 28.5 42 44 25" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    faceid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V6a3 3 0 0 1 3-3h2M16 3h2a3 3 0 0 1 3 3v2M21 16v2a3 3 0 0 1-3 3h-2M8 21H6a3 3 0 0 1-3-3v-2"/><path d="M8.5 9.5v1.2M15.5 9.5v1.2M12 9.5v4h-1"/><path d="M8.8 16a4.5 4.5 0 0 0 6.4 0"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8"/><path d="M11 12h9m0 0-3-3m3 3-3 3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.7 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.7-3.8-9S9.4 5.6 12 3z"/></svg>'
  };

  // SAB mark: flat-topped 2:1 hexagon built from four red triangles leaving a
  // white "bowtie" in the centre (geometry from the official sab.com logo SVG).
  var SAB_LOGO =
    '<svg class="sab-logo" viewBox="0 0 108 32" xmlns="http://www.w3.org/2000/svg" aria-label="SAB">' +
    '<g fill="var(--sab-logo-red, #E20613)">' +
    '<polygon points="0,16 12,4 12,28"/>' +
    '<polygon points="48,16 36,4 36,28"/>' +
    '<polygon points="12,4 36,4 24,16"/>' +
    '<polygon points="12,28 36,28 24,16"/>' +
    '</g>' +
    '<text x="56" y="24" font-family="inherit" font-weight="800" font-size="19" fill="currentColor" letter-spacing="1.5">SAB</text>' +
    '</svg>';

  /* ---------------- router ---------------- */

  var current = null; // current route string
  // true only while an error screen that actually fired its view event is showing,
  // so Transfer Abandoned can never fire for an error screen the user never saw
  // (e.g. a typed /transfer/error URL that guard-redirects away)
  var errorScreenShown = false;

  function currentPathRoute() {
    var p = location.pathname;
    if (p.indexOf(BASE) === 0) p = '/' + p.slice(BASE.length);
    p = p.replace(/index\.html$/, '').replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

  function navigate(route, opts) {
    opts = opts || {};
    if (route === current && !opts.replace) return; // e.g. re-tapping the active tab
    if (!opts.replace) history.pushState(null, '', BASE + route.replace(/^\//, ''));
    else history.replaceState(null, '', BASE + route.replace(/^\//, ''));
    render(route);
  }

  function render(route) {
    var prev = current;

    // Leaving the broken error screen by ANY exit (quiet link, tab bar, browser
    // back) is the abandonment moment for the v8.4.0 story.
    if (prev === '/transfer/error' && route !== '/transfer/error' && errorScreenShown) {
      A.track('Transfer Abandoned', { abandonment_trigger: 'transfer_error' });
      store.pendingTxn = null;
      errorScreenShown = false;
    }

    var auth = store.auth;

    // auth guard — everything (including /improved-transfer) sits behind login so
    // no anonymous autocapture user can ever appear with "(none)" user properties
    if (route !== '/login' && !auth) { navigate('/login', { replace: true }); return; }
    if (route === '/login' && auth) { navigate('/home', { replace: true }); return; }
    if (route === '/' || !screens[route]) {
      navigate(auth ? '/home' : '/login', { replace: true });
      return;
    }

    current = route;
    closeSheet();
    var screenEl = el('screen');
    screenEl.className = 'screen';
    screens[route](screenEl);
    screenEl.scrollTop = 0;
    updateChrome(route);
  }

  function updateChrome(route) {
    var tabbar = el('tabbar');
    tabbar.hidden = (route === '/login');
    var active = {
      '/home': 'home',
      '/transfer/beneficiary': 'transfers', '/transfer/add': 'transfers',
      '/transfer/details': 'transfers', '/transfer/authorise': 'transfers',
      '/transfer/error': 'transfers', '/transfer/complete': 'transfers',
      '/improved-transfer': 'transfers',
      '/cards': 'cards', '/support': 'support', '/more': 'more'
    }[route];
    Array.prototype.forEach.call(tabbar.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('active', t.dataset.tab === active);
    });
  }

  window.addEventListener('popstate', function () { render(currentPathRoute()); });

  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-route]');
    if (!link) return;
    e.preventDefault();
    navigate(link.dataset.route);
  });

  /* ---------------- shared chrome ---------------- */

  function header(title, backRoute, right) {
    return '<header class="screen-header">' +
      (backRoute ? '<button class="icon-btn" data-route="' + backRoute + '" aria-label="Back">' + I.back + '</button>' : '<span class="icon-btn spacer"></span>') +
      '<h1>' + esc(title) + '</h1>' +
      (right || '<span class="icon-btn spacer"></span>') +
      '</header>';
  }

  function benAvatar(b) {
    return '<span class="avatar">' + esc(b.initials || b.name.slice(0, 2).toUpperCase()) + '</span>';
  }

  /* ---------------- screens ---------------- */

  var screens = {};

  /* ---- /login ---- */
  screens['/login'] = function (root) {
    root.classList.add('screen-login');
    root.innerHTML =
      '<div class="login-hero">' + SAB_LOGO +
        '<p class="login-tag">Saudi Awwal Bank</p>' +
      '</div>' +
      '<div class="login-card">' +
        '<h2>Welcome back</h2>' +
        '<p class="muted">Sign in to SAB Mobile</p>' +
        '<label class="field-label" for="login-userid">User ID</label>' +
        '<input id="login-userid" class="input" type="text" autocomplete="off" spellcheck="false" placeholder="usr_xxxxxxxxxx">' +
        '<label class="field-label">App release</label>' +
        '<div class="release-toggle" role="radiogroup" aria-label="App release">' +
          '<button type="button" class="release-opt" data-release="stable" role="radio">v8.1.7 — Stable</button>' +
          '<button type="button" class="release-opt" data-release="new" role="radio">v8.4.0 — New release</button>' +
        '</div>' +
        '<button id="login-submit" class="btn btn-primary btn-block">Sign in</button>' +
        '<p class="login-hint muted">Face ID and fingerprint sign-in available after first login</p>' +
      '</div>';

    var input = el('login-userid');
    if (!input.value) input.value = randomUserId();

    var isStable = true;
    var opts = root.querySelectorAll('.release-opt');
    function paintToggle() {
      opts[0].classList.toggle('selected', isStable);
      opts[0].setAttribute('aria-checked', String(isStable));
      opts[1].classList.toggle('selected', !isStable);
      opts[1].setAttribute('aria-checked', String(!isStable));
    }
    opts[0].addEventListener('click', function () { isStable = true; paintToggle(); });
    opts[1].addEventListener('click', function () { isStable = false; paintToggle(); });
    paintToggle();

    el('login-submit').addEventListener('click', function () {
      var userId = input.value.trim();
      if (!userId) { userId = randomUserId(); input.value = userId; }
      var wasReturning = localStorage.getItem('sab_returning') === '1';
      localStorage.setItem('sab_returning', '1');
      var identity = A.login(userId, isStable, store.utm);
      store.auth = {
        userId: userId,
        stable: isStable,
        appVersion: identity.app_version,
        tier: identity.customer_tier,
        isReturning: wasReturning
      };
      navigate('/home');
    });
  };

  /* ---- /home ---- */
  screens['/home'] = function (root) {
    var auth = store.auth;
    A.track('Home Screen Viewed', { is_returning: !!auth.isReturning });

    var favId = store.favourites[0] || 'BEN_0042';
    var fav = findBen(favId) || D.BENEFICIARIES[0];
    var rates = D.FX_RATES;

    root.innerHTML =
      '<header class="home-header">' +
        '<div>' + SAB_LOGO + '</div>' +
        '<div class="home-header-right">' +
          '<span class="tier-chip">' + esc(auth.tier) + '</span>' +
          '<button id="logout-btn" class="icon-btn" aria-label="Log out">' + I.logout + '</button>' +
        '</div>' +
      '</header>' +
      '<p class="greeting">Good morning</p>' +
      '<p class="greeting-sub muted">' + esc(auth.userId) + ' · v' + esc(auth.appVersion) + '</p>' +

      '<section class="accounts-scroll">' +
        D.ACCOUNTS.map(function (a) {
          return '<div class="account-card">' +
            '<p class="account-name">' + esc(a.name) + '</p>' +
            '<p class="account-number muted">' + esc(a.number) + '</p>' +
            '<p class="account-balance">' + (a.currency === 'SAR' ? sar(a.balance) : a.currency + ' ' + a.balance.toLocaleString('en', { minimumFractionDigits: 2 })) + '</p>' +
            '<p class="account-iban muted">' + esc(a.iban) + '</p>' +
          '</div>';
        }).join('') +
      '</section>' +

      '<section class="quick-actions">' +
        '<button id="quick-transfer" class="quick-tile">' +
          '<span class="quick-ico">' + I.bolt + '</span>' +
          '<span><strong>Quick Transfer</strong><br><small class="muted">To ' + esc(fav.name.split(' ')[0]) + ' · ' + esc(fav.bank) + '</small></span>' +
          '<span class="chev">' + I.chevron + '</span>' +
        '</button>' +
        '<button class="quick-tile" data-route="/transfer/beneficiary">' +
          '<span class="quick-ico">' + I.transfers + '</span>' +
          '<span><strong>New transfer</strong><br><small class="muted">SARIE · SWIFT · SADAD · wallets</small></span>' +
          '<span class="chev">' + I.chevron + '</span>' +
        '</button>' +
      '</section>' +

      '<section id="fx-offer" class="offer-card" role="button" tabindex="0">' +
        '<span class="offer-badge">Limited offer</span>' +
        '<h3>' + esc(D.FX_OFFER.title) + '</h3>' +
        '<p class="muted">' + D.FX_OFFER.offer_pct + '% off FX margin on international transfers</p>' +
        '<span class="offer-cta">' + esc(D.FX_OFFER.cta) + ' ' + I.chevron + '</span>' +
      '</section>' +

      '<section class="rates-card">' +
        '<div class="rates-head"><span class="rates-ico">' + I.globe + '</span><h3>Exchange rates</h3><small class="muted">SAR per unit</small></div>' +
        rates.map(function (r, i) {
          return '<button class="rate-row" data-rate="' + i + '">' +
            '<span class="rate-flag">' + r.flag + '</span>' +
            '<span class="rate-pair"><strong>' + esc(r.pair) + '</strong><small class="muted"> ' + esc(r.name) + '</small></span>' +
            '<span class="rate-val">' + r.sarPerUnit.toFixed(4) + '</span>' +
            '<span class="chev">' + I.chevron + '</span>' +
          '</button>';
        }).join('') +
      '</section>';

    el('logout-btn').addEventListener('click', function () {
      A.logout(auth.appVersion);
      store.auth = null;
      store.pendingBen = null;
      store.pendingTxn = null;
      store.receipt = null;
      sessionStorage.removeItem('sab_completions');
      navigate('/login');
    });

    // Quick Transfer deep-links into the flow with a favourite pre-selected —
    // fires the shortcut event plus Beneficiary Selected so the funnel stays intact.
    el('quick-transfer').addEventListener('click', function () {
      A.track('Quick Transfer Shortcut Tapped', { beneficiary_id: fav.id });
      A.track('Beneficiary Selected', { beneficiary_id: fav.id, transfer_type: fav.rail });
      store.pendingBen = fav;
      navigate('/transfer/details');
    });

    function openOffer() {
      A.track('FX Offer Viewed', {
        offer_type: D.FX_OFFER.offer_type,
        offer_pct: D.FX_OFFER.offer_pct,
        saving_amount_sar: D.FX_OFFER.saving_amount_sar
      });
      sheet(
        '<div class="sheet-grab"></div>' +
        '<span class="offer-badge">Limited offer</span>' +
        '<h3>' + esc(D.FX_OFFER.title) + '</h3>' +
        '<p>' + esc(D.FX_OFFER.body) + '</p>' +
        '<button class="btn btn-primary btn-block" id="offer-start">Start a transfer</button>' +
        '<button class="btn btn-ghost btn-block" id="offer-close">Maybe later</button>',
        function (s) {
          s.querySelector('#offer-start').addEventListener('click', function () { closeSheet(); navigate('/transfer/beneficiary'); });
          s.querySelector('#offer-close').addEventListener('click', closeSheet);
        }
      );
    }
    el('fx-offer').addEventListener('click', openOffer);
    el('fx-offer').addEventListener('keydown', function (e) { if (e.key === 'Enter') openOffer(); });

    Array.prototype.forEach.call(root.querySelectorAll('.rate-row'), function (btn) {
      btn.addEventListener('click', function () {
        var r = rates[parseInt(btn.dataset.rate, 10)];
        A.track('Exchange Rate Viewed', { fx_margin_pct: r.margin });
        sheet(
          '<div class="sheet-grab"></div>' +
          '<h3>' + r.flag + ' SAR ⇄ ' + esc(r.pair) + '</h3>' +
          '<div class="rate-detail">' +
            '<div class="row"><span>1 ' + esc(r.pair) + '</span><strong>' + r.sarPerUnit.toFixed(4) + ' SAR</strong></div>' +
            '<div class="row"><span>1 SAR</span><strong>' + (1 / r.sarPerUnit).toFixed(4) + ' ' + esc(r.pair) + '</strong></div>' +
            '<div class="row"><span>FX margin</span><strong>' + r.margin.toFixed(1) + '%</strong></div>' +
          '</div>' +
          '<p class="muted small">Indicative rate. The final rate is confirmed at authorisation.</p>' +
          '<button class="btn btn-primary btn-block" id="rate-transfer">Send ' + esc(r.pair) + ' abroad</button>',
          function (s) {
            s.querySelector('#rate-transfer').addEventListener('click', function () { closeSheet(); navigate('/transfer/beneficiary'); });
          }
        );
      });
    });
  };

  /* ---- /transfer/beneficiary ---- */
  screens['/transfer/beneficiary'] = function (root) {
    root.innerHTML =
      header('Transfers', '/home',
        '<button class="icon-btn" data-route="/transfer/add" aria-label="Add beneficiary">' + I.plus + '</button>') +
      '<div class="search-wrap">' +
        '<span class="search-ico">' + I.search + '</span>' +
        '<input id="ben-search" class="input input-search" type="search" placeholder="Search beneficiaries" autocomplete="off">' +
      '</div>' +
      '<h2 class="list-title">Favourites</h2>' +
      '<div id="ben-favs" class="ben-list"></div>' +
      '<h2 class="list-title">All beneficiaries</h2>' +
      '<div id="ben-all" class="ben-list"></div>' +
      '<button class="btn btn-outline btn-block" data-route="/transfer/add">' + I.plus + ' Add new beneficiary</button>';

    var favs = store.favourites;

    function benRow(b) {
      var isFav = favs.indexOf(b.id) !== -1;
      return '<div class="ben-row" data-ben="' + esc(b.id) + '">' +
        benAvatar(b) +
        '<span class="ben-meta"><strong>' + esc(b.name) + '</strong>' +
        '<small class="muted">' + esc(b.bank) + ' · ' + esc(b.iban.slice(0, 12)) + '…</small></span>' +
        '<button class="star-btn' + (isFav ? ' faved' : '') + '" data-star="' + esc(b.id) + '" aria-label="Favourite">' +
          (isFav ? I.starFill : I.star) + '</button>' +
      '</div>';
    }

    function paint(query) {
      var q = (query || '').trim().toLowerCase();
      var list = allBeneficiaries().filter(function (b) {
        return !q || b.name.toLowerCase().indexOf(q) !== -1 || b.bank.toLowerCase().indexOf(q) !== -1;
      });
      var favList = list.filter(function (b) { return favs.indexOf(b.id) !== -1; });
      var rest = list.filter(function (b) { return favs.indexOf(b.id) === -1; });
      el('ben-favs').innerHTML = favList.map(benRow).join('') || '<p class="muted empty">No favourites yet — tap the star on a beneficiary.</p>';
      el('ben-all').innerHTML = rest.map(benRow).join('') || '<p class="muted empty">No beneficiaries match your search.</p>';
      return list.length;
    }
    paint('');

    var searchInput = el('ben-search');
    var searchTimer = null;
    searchInput.addEventListener('input', function (e) {
      var q = e.target.value;
      var count = paint(q);
      clearTimeout(searchTimer);
      if (q.trim()) {
        searchTimer = setTimeout(function () {
          // the screen may have been left before the debounce elapsed
          if (!document.body.contains(searchInput)) return;
          A.track('Beneficiary Searched', { search_query: q.trim(), results_returned: count });
        }, 400);
      }
    });

    // delegation lives on the per-render list containers, never on the
    // persistent #screen element — a listener there would stack across visits
    // and double-fire Beneficiary Selected
    function onListClick(e) {
      var star = e.target.closest('[data-star]');
      if (star) {
        e.stopPropagation();
        var id = star.dataset.star;
        var idx = favs.indexOf(id);
        if (idx === -1) {
          favs.push(id);
          A.track('Beneficiary Saved as Favourite', { beneficiary_id: id });
          toast('Saved to favourites');
        } else {
          favs.splice(idx, 1);
        }
        store.favourites = favs;
        paint(el('ben-search').value);
        return;
      }
      var row = e.target.closest('[data-ben]');
      if (row) {
        var ben = findBen(row.dataset.ben);
        if (!ben) return;
        clearTimeout(searchTimer);
        A.track('Beneficiary Selected', { beneficiary_id: ben.id, transfer_type: ben.rail });
        store.pendingBen = ben;
        navigate('/transfer/details');
      }
    }
    el('ben-favs').addEventListener('click', onListClick);
    el('ben-all').addEventListener('click', onListClick);
  };

  /* ---- /transfer/add ---- */
  screens['/transfer/add'] = function (root) {
    root.innerHTML =
      header('Add beneficiary', '/transfer/beneficiary') +
      '<div class="form-card">' +
        '<label class="field-label" for="add-name">Full name</label>' +
        '<input id="add-name" class="input" type="text" placeholder="e.g. Faisal Al-Subaie" autocomplete="off">' +
        '<label class="field-label" for="add-bank">Bank</label>' +
        '<select id="add-bank" class="input">' +
          D.BANKS.map(function (b) { return '<option value="' + esc(b.name) + '">' + esc(b.name) + '</option>'; }).join('') +
        '</select>' +
        '<label class="field-label" for="add-iban">IBAN</label>' +
        '<input id="add-iban" class="input" type="text" placeholder="SA00 0000 0000 0000 0000 0000" autocomplete="off">' +
        '<p id="add-error" class="form-error" hidden></p>' +
        '<button id="add-submit" class="btn btn-primary btn-block">Add beneficiary</button>' +
      '</div>';

    el('add-submit').addEventListener('click', function () {
      var name = el('add-name').value.trim();
      var bank = el('add-bank').value;
      var iban = el('add-iban').value.trim().toUpperCase();
      var err = el('add-error');
      if (name.length < 3) { err.textContent = 'Enter the beneficiary’s full name.'; err.hidden = false; return; }
      if (!/^SA[0-9 ]{15,30}$/.test(iban)) { err.textContent = 'Enter a valid Saudi IBAN (starts with SA).'; err.hidden = false; return; }
      err.hidden = true;

      var customs = store.customBens;
      var ben = {
        id: 'BEN_' + String(1000 + customs.length),
        name: name,
        bank: bank,
        iban: iban,
        rail: bank === 'SAB' ? 'own_account' : 'local_sarie',
        initials: name.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(),
        favourite: false
      };
      customs.push(ben);
      store.customBens = customs;
      A.track('Beneficiary Added', { beneficiary_id: ben.id, transfer_type: ben.rail });
      toast('Beneficiary added');
      navigate('/transfer/beneficiary');
    });
  };

  /* ---- /transfer/details ---- */
  screens['/transfer/details'] = function (root) {
    var ben = store.pendingBen;
    if (!ben) { navigate('/transfer/beneficiary', { replace: true }); return; }
    var auth = store.auth;

    var state = {
      rail: ben.rail,
      amount: 1500,
      waived: false
    };

    root.innerHTML =
      header('Transfer details', '/transfer/beneficiary') +
      '<div class="ben-summary">' + benAvatar(ben) +
        '<span><strong>' + esc(ben.name) + '</strong><br><small class="muted">' + esc(ben.bank) + ' · ' + esc(ben.iban) + '</small></span>' +
      '</div>' +
      '<div class="form-card">' +
        '<label class="field-label">From</label>' +
        '<div class="from-row"><strong>' + esc(D.ACCOUNTS[0].name) + ' ' + esc(D.ACCOUNTS[0].number) + '</strong>' +
        '<small class="muted">Available ' + sar(D.ACCOUNTS[0].balance) + '</small></div>' +

        '<label class="field-label">Transfer type</label>' +
        '<button id="rail-field" class="input input-select"><span id="rail-label"></span>' + I.chevron + '</button>' +

        '<label class="field-label" for="amount">Amount (SAR)</label>' +
        '<input id="amount" class="input input-amount" type="number" inputmode="decimal" min="250" max="20000" step="50" value="1500">' +
        '<p class="muted small">Between SAR 250 and SAR 20,000</p>' +

        '<label class="field-label" for="note">Note (optional)</label>' +
        '<input id="note" class="input" type="text" maxlength="60" placeholder="e.g. Family support" autocomplete="off">' +

        '<label class="field-label" for="waiver">Fee waiver code</label>' +
        '<div class="waiver-row">' +
          '<input id="waiver" class="input" type="text" placeholder="Enter code" autocomplete="off" spellcheck="false">' +
          '<button id="waiver-apply" class="btn btn-outline">Apply</button>' +
        '</div>' +
        '<p id="waiver-msg" class="small" hidden></p>' +

        '<div class="fee-summary">' +
          '<div class="row"><span>Transfer amount</span><strong id="sum-amount"></strong></div>' +
          '<div class="row"><span>Transfer fee</span><strong id="sum-fee"></strong></div>' +
          '<div class="row"><span>VAT (15%)</span><strong id="sum-vat"></strong></div>' +
          '<div class="row total"><span>Total debit</span><strong id="sum-total"></strong></div>' +
        '</div>' +
        '<p id="amount-error" class="form-error" hidden></p>' +
        '<button id="details-submit" class="btn btn-primary btn-block">Continue</button>' +
      '</div>';

    function calc() {
      var amount = parseFloat(el('amount').value) || 0;
      var fee = state.waived ? 0 : railInfo(state.rail).fee;
      var vat = round2(fee * 0.15);
      return {
        amount: amount,
        fee: fee,
        vat: vat,
        total: round2(amount + fee + vat)
      };
    }

    function paint() {
      el('rail-label').textContent = railInfo(state.rail).label;
      var c = calc();
      el('sum-amount').textContent = sar(c.amount);
      el('sum-fee').textContent = state.waived ? 'Waived' : sar(c.fee);
      el('sum-vat').textContent = sar(c.vat);
      el('sum-total').textContent = sar(c.total);
    }
    paint();

    el('amount').addEventListener('input', paint);

    el('rail-field').addEventListener('click', function () {
      A.track('Transfer Type Browsed', {
        transfer_type: state.rail,
        options_shown: D.TRANSFER_TYPES.length
      });
      sheet(
        '<div class="sheet-grab"></div><h3>Transfer type</h3>' +
        D.TRANSFER_TYPES.map(function (t) {
          return '<button class="rail-opt' + (t.key === state.rail ? ' selected' : '') + '" data-rail="' + t.key + '">' +
            '<span><strong>' + esc(t.label) + '</strong><br><small class="muted">' + esc(t.desc) + '</small></span>' +
            '<span class="rail-fee">SAR ' + t.fee + '</span>' +
          '</button>';
        }).join(''),
        function (s) {
          Array.prototype.forEach.call(s.querySelectorAll('[data-rail]'), function (opt) {
            opt.addEventListener('click', function () {
              state.rail = opt.dataset.rail;
              closeSheet();
              paint();
            });
          });
        }
      );
    });

    el('waiver-apply').addEventListener('click', function () {
      var code = el('waiver').value.trim().toUpperCase();
      if (!code) return;
      var valid = D.WAIVER_CODES.indexOf(code) !== -1;
      state.waived = valid;
      A.track('Fee Waiver Code Entered', {
        waiver_code_attempted: true,
        waiver_applied: valid,
        fee_waived: valid
      });
      var msg = el('waiver-msg');
      msg.hidden = false;
      msg.textContent = valid ? 'Code applied — transfer fee waived.' : 'This code is not valid or has expired.';
      msg.className = 'small ' + (valid ? 'ok-text' : 'form-error');
      paint();
    });

    el('details-submit').addEventListener('click', function () {
      var c = calc();
      var err = el('amount-error');
      if (!(c.amount >= 250 && c.amount <= 20000)) {
        err.textContent = 'Enter an amount between SAR 250 and SAR 20,000.';
        err.hidden = false;
        return;
      }
      err.hidden = true;

      var txn = {
        beneficiary_id: ben.id,
        beneficiary_name: ben.name,
        beneficiary_bank: ben.bank,
        transfer_type: state.rail,
        transfer_amount_sar: c.amount,
        transfer_total_sar: c.amount,
        transfer_fee_sar: c.fee,
        vat_amount_sar: c.vat,
        total_debit_sar: c.total,
        fee_waived: state.waived
      };
      store.pendingTxn = txn;

      A.track('Transfer Details Entered', {
        beneficiary_id: txn.beneficiary_id,
        transfer_type: txn.transfer_type,
        transfer_amount_sar: txn.transfer_amount_sar,
        transfer_total_sar: txn.transfer_total_sar,
        transfer_fee_sar: txn.transfer_fee_sar,
        fee_waived: txn.fee_waived
      });

      // The deterministic story trigger: v8.4.0 always breaks, v8.1.7 always works.
      navigate(auth.stable ? '/transfer/authorise' : '/transfer/error');
    });
  };

  /* ---- /transfer/authorise (v8.1.7 path only) ---- */
  screens['/transfer/authorise'] = function (root) {
    var txn = store.pendingTxn;
    if (!txn) { navigate('/transfer/beneficiary', { replace: true }); return; }
    // the broken release can never reach authorisation, even via a typed URL
    if (!store.auth.stable) { navigate('/transfer/error', { replace: true }); return; }

    A.track('Transfer Authorisation Started', {
      transfer_type: txn.transfer_type,
      transfer_amount_sar: txn.transfer_amount_sar
    });

    root.innerHTML =
      header('Authorise transfer', '/transfer/details') +
      '<div class="auth-card">' +
        '<div class="txn-summary">' +
          '<div class="row"><span>To</span><strong>' + esc(txn.beneficiary_name) + '</strong></div>' +
          '<div class="row"><span>Bank</span><strong>' + esc(txn.beneficiary_bank) + '</strong></div>' +
          '<div class="row"><span>Type</span><strong>' + esc(railInfo(txn.transfer_type).label) + '</strong></div>' +
          '<div class="row"><span>Amount</span><strong>' + sar(txn.transfer_amount_sar) + '</strong></div>' +
          '<div class="row"><span>Fee + VAT</span><strong>' + (txn.fee_waived ? 'Waived' : sar(round2(txn.transfer_fee_sar + txn.vat_amount_sar))) + '</strong></div>' +
          '<div class="row total"><span>Total debit</span><strong>' + sar(txn.total_debit_sar) + '</strong></div>' +
        '</div>' +
        '<button id="auth-faceid" class="btn btn-primary btn-block">' + I.faceid + ' Authorise with Face ID</button>' +
        '<button id="auth-otp-link" class="btn btn-ghost btn-block">Use SMS OTP instead</button>' +
        '<div id="otp-block" hidden>' +
          '<p class="muted small">Enter the 6-digit code sent to +966 5• ••• ••42</p>' +
          '<div class="otp-row">' +
            [0, 1, 2, 3, 4, 5].map(function (i) { return '<input class="otp-box" data-otp="' + i + '" maxlength="1" inputmode="numeric">'; }).join('') +
          '</div>' +
          '<button id="otp-fill" class="btn btn-ghost btn-block">Autofill from Messages</button>' +
          '<button id="otp-confirm" class="btn btn-primary btn-block" disabled>Confirm code</button>' +
        '</div>' +
      '</div>';

    function authorise(btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Authorising…';
      setTimeout(function () {
        // abort if the user navigated away mid-authorisation
        if (!document.body.contains(btn)) return;
        navigate('/transfer/complete');
      }, 1300);
    }

    el('auth-faceid').addEventListener('click', function () { authorise(el('auth-faceid')); });
    el('auth-otp-link').addEventListener('click', function () {
      el('otp-block').hidden = false;
      el('auth-otp-link').hidden = true;
    });
    el('otp-fill').addEventListener('click', function () {
      Array.prototype.forEach.call(root.querySelectorAll('.otp-box'), function (box) {
        box.value = String(Math.floor(Math.random() * 10));
      });
      el('otp-confirm').disabled = false;
    });
    // listener on the per-render OTP container, not the persistent #screen
    el('otp-block').addEventListener('input', function (e) {
      if (!e.target.classList.contains('otp-box')) return;
      var filled = Array.prototype.every.call(root.querySelectorAll('.otp-box'), function (b) { return b.value; });
      el('otp-confirm').disabled = !filled;
      var next = e.target.nextElementSibling;
      if (e.target.value && next && next.classList.contains('otp-box')) next.focus();
    });
    el('otp-confirm').addEventListener('click', function () { authorise(el('otp-confirm')); });
  };

  /* ---- /transfer/complete ---- */
  screens['/transfer/complete'] = function (root) {
    var txn = store.pendingTxn;
    var receipt = store.receipt;

    if (txn) {
      // fresh completion — consume the pending transfer so a refresh can't re-fire
      var isFirst = store.completions === 0;
      store.completions = store.completions + 1;
      receipt = Object.assign({}, txn, {
        transfer_reference: 'TRF_' + Date.now(),
        is_first_transfer: isFirst
      });
      store.receipt = receipt;
      store.pendingTxn = null;

      var fee = receipt.fee_waived ? 0 : receipt.transfer_fee_sar;
      A.trackWithRevenue('Transfer Completed', {
        transfer_reference: receipt.transfer_reference,
        beneficiary_id: receipt.beneficiary_id,
        transfer_type: receipt.transfer_type,
        transfer_amount_sar: receipt.transfer_amount_sar,
        transfer_total_sar: receipt.transfer_total_sar,
        transfer_fee_sar: receipt.transfer_fee_sar,
        vat_amount_sar: receipt.vat_amount_sar,
        total_debit_sar: receipt.total_debit_sar,
        fee_waived: receipt.fee_waived,
        is_first_transfer: receipt.is_first_transfer
      }, {
        revenue: fee,
        price: fee,
        quantity: 1,
        revenueType: 'transfer_fee'
      });
    }

    if (!receipt) { navigate('/home', { replace: true }); return; }

    root.innerHTML =
      '<div class="result-screen">' +
        '<span class="result-ico ok">' + I.success + '</span>' +
        '<h1>Transfer sent</h1>' +
        '<p class="result-amount">' + sar(receipt.total_debit_sar) + '</p>' +
        '<p class="muted">to ' + esc(receipt.beneficiary_name) + ' · ' + esc(receipt.beneficiary_bank) + '</p>' +
        '<div class="txn-summary">' +
          '<div class="row"><span>Reference</span><strong>' + esc(receipt.transfer_reference) + '</strong></div>' +
          '<div class="row"><span>Type</span><strong>' + esc(railInfo(receipt.transfer_type).label) + '</strong></div>' +
          '<div class="row"><span>Fee</span><strong>' + (receipt.fee_waived ? 'Waived' : sar(receipt.transfer_fee_sar)) + '</strong></div>' +
          '<div class="row"><span>VAT</span><strong>' + sar(receipt.vat_amount_sar) + '</strong></div>' +
        '</div>' +
        '<button class="btn btn-primary btn-block" data-route="/home">Done</button>' +
        '<button class="btn btn-ghost btn-block" data-route="/transfer/beneficiary">Make another transfer</button>' +
      '</div>';
  };

  /* ---- /transfer/error (the broken v8.4.0 screen) ---- */
  screens['/transfer/error'] = function (root) {
    var txn = store.pendingTxn;
    if (!txn) { navigate('/transfer/beneficiary', { replace: true }); return; }
    // the stable release never sees the broken screen, even via a typed URL
    if (store.auth.stable) { navigate('/home', { replace: true }); return; }

    // fires on EVERY render of this screen — the key drop-off moment
    A.track('Transfer Error Screen Viewed', {
      transfer_total_sar: txn.transfer_total_sar,
      transfer_fee_sar: txn.transfer_fee_sar,
      vat_amount_sar: txn.vat_amount_sar,
      total_debit_sar: txn.total_debit_sar,
      fee_waived: txn.fee_waived
    });
    errorScreenShown = true;

    root.innerHTML =
      '<div class="result-screen">' +
        '<span class="result-ico err">' + I.error + '</span>' +
        '<h1>Transfer Failed</h1>' +
        '<p class="muted">Please try again later.</p>' +
        '<div class="txn-summary greyed">' +
          '<div class="row"><span>To</span><strong>' + esc(txn.beneficiary_name) + '</strong></div>' +
          '<div class="row"><span>Type</span><strong>' + esc(railInfo(txn.transfer_type).label) + '</strong></div>' +
          '<div class="row"><span>Amount</span><strong>' + sar(txn.transfer_amount_sar) + '</strong></div>' +
          '<div class="row total"><span>Total debit</span><strong>' + sar(txn.total_debit_sar) + '</strong></div>' +
        '</div>' +
        // Intentionally dead: no handler is ever attached to this button. Real taps
        // land as [Amplitude] Dead Click, repeated taps as [Amplitude] Rage Click.
        '<button id="contact-support-btn" class="btn btn-primary btn-block">Contact Support</button>' +
        '<a class="quiet-link" href="#" id="error-home-link">Back to Home</a>' +
      '</div>';

    // The quiet exit — the router's leave hook fires Transfer Abandoned before home renders.
    el('error-home-link').addEventListener('click', function (e) {
      e.preventDefault();
      navigate('/home');
    });
  };

  /* ---- /improved-transfer (the fixed screen — standalone, fires NO events) ---- */
  screens['/improved-transfer'] = function (root) {
    // Visual walkthrough of the treatment for the
    // `transfer-error-screen-viewed-reduction` experiment narrative. Reachable only
    // by typing the URL; wired to nothing else; deliberately tracks nothing.
    var demoTxn = {
      beneficiary_name: 'Mohammed Al-Otaibi',
      beneficiary_bank: 'Al Rajhi Bank',
      transfer_type: 'local_sarie',
      transfer_amount_sar: 1500,
      transfer_fee_sar: 25,
      vat_amount_sar: 3.75,
      total_debit_sar: 1528.75,
      fee_waived: false
    };
    var step = 'error';

    function paint() {
      if (step === 'error') {
        root.innerHTML =
          '<div class="result-screen">' +
            '<span class="result-ico err">' + I.error + '</span>' +
            '<h1>Transfer Failed</h1>' +
            '<p class="muted">Please try again later.</p>' +
            '<div class="txn-summary greyed">' +
              '<div class="row"><span>To</span><strong>' + esc(demoTxn.beneficiary_name) + '</strong></div>' +
              '<div class="row"><span>Type</span><strong>Local transfer (SARIE)</strong></div>' +
              '<div class="row"><span>Amount</span><strong>' + sar(demoTxn.transfer_amount_sar) + '</strong></div>' +
              '<div class="row total"><span>Total debit</span><strong>' + sar(demoTxn.total_debit_sar) + '</strong></div>' +
            '</div>' +
            '<button id="improved-retry" class="btn btn-primary btn-block">Retry</button>' +
            '<button id="improved-support" class="btn btn-outline btn-block">Contact Support</button>' +
            '<a class="quiet-link" href="#" data-route="/home">Back to Home</a>' +
          '</div>';
        el('improved-retry').addEventListener('click', function () {
          var btn = el('improved-retry');
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner"></span> Retrying…';
          setTimeout(function () {
            if (!document.body.contains(btn)) return; // user left this page
            step = 'authorise'; paint();
          }, 1100);
        });
        el('improved-support').addEventListener('click', function () {
          sheet(
            '<div class="sheet-grab"></div><h3>Contact Support</h3>' +
            '<button class="support-row">📞 Call us — 800 124 8000</button>' +
            '<button class="support-row">💬 Chat with us in the app</button>' +
            '<button class="support-row">✉️ Send a secure message</button>',
            function (s) {
              Array.prototype.forEach.call(s.querySelectorAll('.support-row'), function (r) {
                r.addEventListener('click', function () { closeSheet(); toast('A support agent will contact you shortly'); });
              });
            }
          );
        });
      } else if (step === 'authorise') {
        root.innerHTML =
          '<div class="result-screen">' +
            '<h1 class="auth-title">Authorise transfer</h1>' +
            '<div class="txn-summary">' +
              '<div class="row"><span>To</span><strong>' + esc(demoTxn.beneficiary_name) + '</strong></div>' +
              '<div class="row"><span>Amount</span><strong>' + sar(demoTxn.transfer_amount_sar) + '</strong></div>' +
              '<div class="row total"><span>Total debit</span><strong>' + sar(demoTxn.total_debit_sar) + '</strong></div>' +
            '</div>' +
            '<button id="improved-auth" class="btn btn-primary btn-block">' + I.faceid + ' Authorise with Face ID</button>' +
          '</div>';
        el('improved-auth').addEventListener('click', function () {
          var btn = el('improved-auth');
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner"></span> Authorising…';
          setTimeout(function () {
            if (!document.body.contains(btn)) return; // user left this page
            step = 'complete'; paint();
          }, 1200);
        });
      } else {
        root.innerHTML =
          '<div class="result-screen">' +
            '<span class="result-ico ok">' + I.success + '</span>' +
            '<h1>Transfer sent</h1>' +
            '<p class="result-amount">' + sar(demoTxn.total_debit_sar) + '</p>' +
            '<p class="muted">to ' + esc(demoTxn.beneficiary_name) + ' · ' + esc(demoTxn.beneficiary_bank) + '</p>' +
            '<button class="btn btn-primary btn-block" data-route="/home">Done</button>' +
          '</div>';
      }
    }
    paint();
  };

  /* ---- /cards ---- */
  screens['/cards'] = function (root) {
    root.innerHTML =
      header('Cards', '/home') +
      D.CARDS.map(function (c, i) {
        return '<div class="bank-card ' + (i === 0 ? 'card-premier' : 'card-mada') + '">' +
          '<div class="bank-card-top"><span>' + esc(c.type) + '</span>' + SAB_LOGO + '</div>' +
          '<p class="bank-card-num">' + esc(c.number) + '</p>' +
          '<p class="bank-card-name">' + esc(c.name) + '</p>' +
        '</div>' +
        '<div class="card-meta">' +
          (c.due > 0
            ? '<div class="row"><span>Outstanding balance</span><strong>' + sar(c.due) + '</strong></div>' +
              '<div class="row"><span>Credit limit</span><strong>' + sar(c.limit) + '</strong></div>'
            : '<div class="row"><span>Linked account</span><strong>Current •••• 4501</strong></div>') +
        '</div>';
      }).join('') +
      '<button class="btn btn-outline btn-block" id="card-freeze">Freeze card</button>';
    el('card-freeze').addEventListener('click', function () { toast('Card temporarily frozen'); });
  };

  /* ---- /support ---- */
  screens['/support'] = function (root) {
    root.innerHTML =
      header('Support', '/home') +
      '<div class="support-list">' +
        '<button class="support-row">📞 Call us — 800 124 8000 <small class="muted">24/7</small></button>' +
        '<button class="support-row">💬 Chat with us</button>' +
        '<button class="support-row">✉️ Secure messages</button>' +
        '<button class="support-row">📍 Find a branch or ATM</button>' +
      '</div>' +
      '<h2 class="list-title">Frequently asked</h2>' +
      '<div class="faq">' +
        '<details><summary>What are the SARIE transfer cut-off times?</summary><p class="muted">SARIE instant transfers are processed 24/7. Standard SARIE transfers submitted after 3:00 PM are processed the next business day.</p></details>' +
        '<details><summary>How do I raise a dispute on a card transaction?</summary><p class="muted">Go to Cards, select the transaction and choose “Dispute”. Most disputes are resolved within 10 business days.</p></details>' +
        '<details><summary>What is the daily transfer limit?</summary><p class="muted">Your default daily limit is SAR 50,000. You can adjust it under More → Limits after additional verification.</p></details>' +
      '</div>';
    Array.prototype.forEach.call(root.querySelectorAll('.support-row'), function (r) {
      r.addEventListener('click', function () { toast('A support agent will contact you shortly'); });
    });
  };

  /* ---- /more ---- */
  screens['/more'] = function (root) {
    var auth = store.auth;
    root.innerHTML =
      header('More', '/home') +
      '<div class="profile-row">' + benAvatar({ initials: auth.userId.slice(4, 6).toUpperCase(), name: auth.userId }) +
        '<span><strong>' + esc(auth.userId) + '</strong><br><small class="muted">' + esc(auth.tier) + ' banking · v' + esc(auth.appVersion) + '</small></span>' +
      '</div>' +
      '<div class="support-list">' +
        '<button class="support-row">🔔 Notifications</button>' +
        '<button class="support-row">🛡️ Security & Face ID</button>' +
        '<button class="support-row">📊 Limits</button>' +
        '<button class="support-row">🌐 اللغة العربية</button>' +
      '</div>' +
      '<button id="more-logout" class="btn btn-outline btn-block">' + I.logout + ' Log out</button>';
    Array.prototype.forEach.call(root.querySelectorAll('.support-row'), function (r) {
      r.addEventListener('click', function () { toast('Available in the full app'); });
    });
    el('more-logout').addEventListener('click', function () {
      A.logout(auth.appVersion);
      store.auth = null;
      store.pendingBen = null;
      store.pendingTxn = null;
      store.receipt = null;
      sessionStorage.removeItem('sab_completions');
      navigate('/login');
    });
  };

  /* ---------------- boot ---------------- */

  function captureUtm() {
    var params = new URLSearchParams(location.search);
    var utm = store.utm || {};
    var found = false;
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
      if (params.get(k)) { utm[k] = params.get(k); found = true; }
    });
    if (found) store.utm = utm;
  }

  captureUtm();
  A.init();
  render(currentPathRoute());
})();
