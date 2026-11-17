/* Ecosystem Map · « Donner un avis »
   Outil de relecture pour l'équipe projet. Invisible par défaut : il s'active avec un lien personnel
   ?avis=1&nom=Léa (mémorisé dans le navigateur ; ?avis=0 le désactive).
   On clique sur une zone, on écrit, l'avis part dans une Google Sheet (script Google Apps), avec une capture.
   Aucune clé secrète ici : le point d'arrivée n'accepte que l'ajout de lignes. */
(function () {
  'use strict';
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzSk9rTsZeTpL54bByzm_L3AQf_8iYlwQN4FPXfxlE-S7sZKaCm7AzrJxsZEgUrSfmh/exec';
  var KEY = 'ecomap-avis-2026';
  var LS = 'ecomap.fb', OUTBOX = 'ecomap.fb.outbox';

  var st = {};
  try { st = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) {}
  function save() { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {} }
  var qs = new URLSearchParams(location.search);
  if (qs.has('avis')) {
    st.on = qs.get('avis') !== '0';
    if (qs.get('nom')) st.name = qs.get('nom').slice(0, 60);
    save();
    // nettoie l'adresse (le réglage est mémorisé)
    try { qs.delete('avis'); qs.delete('nom'); var q = qs.toString(); history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) {}
  }
  if (!st.on) return;
  st.sent = st.sent || 0;

  /* ---------- styles ---------- */
  var css = [
    '#fbTab{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:2147483000;writing-mode:vertical-rl;',
    'background:var(--ink,#141A17);color:#fff;border:0;border-radius:12px 0 0 12px;padding:14px 9px;font:600 13px/1 var(--font-ui,Figtree,system-ui,sans-serif);',
    'letter-spacing:.02em;cursor:pointer;box-shadow:0 6px 20px -6px rgba(0,0,0,.35);display:flex;align-items:center;gap:8px}',
    '#fbTab:hover{background:#000}',
    '#fbTab .fb-dot{width:8px;height:8px;border-radius:50%;background:var(--accent,#16A34A);box-shadow:0 0 0 3px rgba(22,163,74,.25)}',
    '#fbTab .fb-n{writing-mode:horizontal-tb;background:rgba(255,255,255,.18);border-radius:999px;padding:3px 6px;font:600 11px/1 var(--font-data,ui-monospace,monospace)}',
    'body.fb-picking #fbTab{background:var(--accent,#16A34A)}',
    'body.fb-picking, body.fb-picking *{cursor:crosshair!important}',
    '#fbHover{position:fixed;z-index:2147482990;pointer-events:none;border:2px solid var(--accent,#16A34A);border-radius:8px;background:rgba(22,163,74,.08);transition:all .08s ease-out;display:none}',
    '#fbBanner{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483001;background:var(--ink,#141A17);color:#fff;border-radius:999px;',
    'padding:10px 10px 10px 18px;font:500 14px/1.3 var(--font-ui,Figtree,system-ui,sans-serif);display:flex;align-items:center;gap:12px;box-shadow:0 10px 30px -10px rgba(0,0,0,.5);max-width:calc(100vw - 24px)}',
    '#fbBanner button{background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:999px;padding:7px 12px;font:600 13px/1 inherit;cursor:pointer!important}',
    '.fb-pin{position:fixed;z-index:2147483002;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;background:var(--accent,#16A34A);color:#fff;',
    'border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.35);font:700 12px/22px var(--font-data,ui-monospace,monospace);text-align:center;pointer-events:none}',
    '#fbCard{position:fixed;z-index:2147483003;width:min(380px,calc(100vw - 24px));background:#fff;color:var(--ink,#141A17);border-radius:16px;',
    'box-shadow:0 24px 60px -18px rgba(0,0,0,.45),0 0 0 1px rgba(20,26,23,.08);padding:18px;font:15px/1.45 var(--font-ui,Figtree,system-ui,sans-serif)}',
    '#fbCard h3{margin:0 0 4px;font:600 18px/1.2 var(--font-display,"Google Sans Flex",system-ui,sans-serif)}',
    '#fbCard .fb-zone{font-size:13px;color:var(--muted,#5B6660);margin:0 0 12px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    '#fbCard .fb-types{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}',
    '#fbCard .fb-types button{border:1px solid rgba(20,26,23,.16);background:#fff;border-radius:999px;padding:6px 11px;font:500 13px/1 inherit;color:inherit;cursor:pointer}',
    '#fbCard .fb-types button[aria-pressed="true"]{background:var(--ink,#141A17);border-color:var(--ink,#141A17);color:#fff}',
    '#fbCard textarea,#fbCard input[type=text]{width:100%;box-sizing:border-box;border:1px solid rgba(20,26,23,.16);border-radius:10px;padding:10px 12px;font:16px/1.4 inherit;color:inherit;background:#fff}',
    '#fbCard textarea{min-height:96px;resize:vertical}',
    '#fbCard textarea:focus,#fbCard input:focus{outline:2px solid var(--accent,#16A34A);outline-offset:1px;border-color:transparent}',
    '#fbCard label.fb-l{display:block;font-size:13px;color:var(--muted,#5B6660);margin:10px 0 4px}',
    '#fbCard .fb-cap{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted,#5B6660);margin:10px 0 0}',
    '#fbCard .fb-act{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}',
    '#fbCard .fb-act button{border:0;border-radius:999px;padding:10px 16px;font:600 14px/1 inherit;cursor:pointer}',
    '#fbCard .fb-cancel{background:var(--paper-3,#F3F1EB);color:inherit}',
    '#fbCard .fb-send{background:var(--ink,#141A17);color:#fff}',
    '#fbCard .fb-send[disabled]{opacity:.45;cursor:default}',
    '#fbCard .fb-err{color:#B42318;font-size:13px;margin:8px 0 0}',
    '#fbToast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483004;background:var(--ink,#141A17);color:#fff;border-radius:999px;padding:11px 18px;',
    'font:500 14px/1.3 var(--font-ui,Figtree,system-ui,sans-serif);box-shadow:0 10px 30px -10px rgba(0,0,0,.5);max-width:calc(100vw - 24px)}',
    '@media (max-width:980px){#fbTab{top:auto;bottom:calc(var(--tabbar-h,56px) + env(safe-area-inset-bottom,0px) + 90px);transform:none;padding:12px 7px;font-size:12px}',
    '#fbCard{left:12px!important;right:12px;width:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 12px)!important;top:auto!important}',
    '#fbToast{bottom:calc(var(--tabbar-h,56px) + env(safe-area-inset-bottom,0px) + 16px)}}'
  ].join('');
  var styleEl = document.createElement('style'); styleEl.id = 'fbStyle'; styleEl.textContent = css; document.head.appendChild(styleEl);

  /* ---------- helpers ---------- */
  function h(tag, attrs, html) { var el = document.createElement(tag); if (attrs) for (var k in attrs) el.setAttribute(k, attrs[k]); if (html != null) el.innerHTML = html; return el; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isFb(el) { for (var n = el; n && n.nodeType === 1; n = n.parentNode) { if (n.id && /^fb/.test(n.id)) return true; if (n.classList && n.classList.contains('fb-pin')) return true; } return false; }
  function clip(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function toast(msg, ms) {
    var t = document.getElementById('fbToast'); if (t) t.remove();
    t = h('div', { id: 'fbToast', role: 'status' }); t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 3200);
  }

  // ce que la personne a visé, en mots
  function dataName(n) {
    var dat = n && n.__data__;
    if (!dat || typeof dat !== 'object') return null;
    var o = dat.data && typeof dat.data === 'object' ? dat.data : dat;
    var nm = null;
    ['org', 'o', 'res', 'resource', 'ini', 'ev', 'event'].forEach(function (k) { var v = o[k]; if (!nm && v && typeof v === 'object') nm = v.name || v.title_fr || v.title; });
    nm = nm || o.name || o.title || o.title_fr || o.label;
    return typeof nm === 'string' ? nm : null;
  }
  function describe(el, x, y) {
    var parts = [], d = null;
    if (x != null) {
      // le nom le plus précis sous le pointeur (le nœud le plus profond : organisation plutôt que groupe)
      var stack = document.elementsFromPoint(x, y), best = -1;
      for (var i = 0; i < stack.length; i++) {
        if (isFb(stack[i])) continue;
        for (var m = stack[i], k = 0; m && m !== document.body && k < 4; m = m.parentNode, k++) {
          var nm2 = dataName(m); if (!nm2) continue;
          var dep = (m.__data__ && m.__data__.depth) || 0; if (m.__data__ && !m.__data__.children) dep += 10;
          if (dep > best) { best = dep; d = nm2; } break;
        }
      }
    }
    for (var n = el; n && n !== document.body && !d; n = n.parentNode) {
      var dat = n.__data__;
      if (dat && typeof dat === 'object') {
        var o = dat.data && typeof dat.data === 'object' ? dat.data : dat;
        var nm = o.name || o.title || o.title_fr || o.label || o.key;
        if (nm && typeof nm === 'string') d = nm;
      }
    }
    var lab = el.closest('[aria-label],[title]');
    var rr = el.getBoundingClientRect(), big = rr.width * rr.height > innerWidth * innerHeight * 0.06;
    var own = clip(el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || el.getAttribute('placeholder') || (big ? '' : (el.innerText || el.textContent || '')), 90);
    if (big && !d && el.closest('#canvas,svg,canvas')) own = 'Zone de la carte';
    var tag = el.tagName.toLowerCase();
    var kind = { button: 'Bouton', a: 'Lien', input: 'Champ', textarea: 'Champ', img: 'Image', h1: 'Titre', h2: 'Intertitre', h3: 'Titre de carte', circle: 'Point de la carte', path: 'Forme de la carte', text: 'Étiquette de la carte', svg: 'Carte', canvas: 'Carte' }[tag];
    var b = el.closest('button,a'); if (b && b !== el) { kind = b.tagName === 'A' ? 'Lien' : 'Bouton'; own = clip(b.getAttribute('aria-label') || b.innerText || b.title || '', 90); }
    if (d) parts.push('« ' + clip(d, 80) + ' »');
    if (kind) parts.push(kind);
    if (own && own !== d) parts.push('« ' + own + ' »');
    else if (!d && lab && lab !== el) parts.push('dans « ' + clip(lab.getAttribute('aria-label') || lab.getAttribute('title'), 60) + ' »');
    // la section qui contient l'élément
    var sec = el.closest('section,article,aside,header,nav,[role=dialog],.panel,.card');
    if (sec && !isFb(sec)) {
      var hd = sec.querySelector('h1,h2,h3');
      var sname = hd ? clip(hd.innerText, 50) : (sec.getAttribute('aria-label') || sec.id || sec.tagName.toLowerCase());
      if (sname && !/^(canvas|section|div|aside|header)$/i.test(sname) && parts.join(' ').indexOf(sname) < 0) parts.push('· section « ' + clip(sname, 50) + ' »');
    }
    return parts.join(' ') || tag;
  }
  function cssPath(el) {
    var p = [];
    for (var n = el, i = 0; n && n.nodeType === 1 && n !== document.body && i < 6; n = n.parentNode, i++) {
      if (n.id) { p.unshift('#' + n.id); break; }
      var s = n.tagName.toLowerCase(), cls = (typeof n.className === 'string' ? n.className : (n.className && n.className.baseVal) || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      var par = n.parentNode;
      if (par) { var sib = Array.prototype.filter.call(par.children, function (c) { return c.tagName === n.tagName; }); if (sib.length > 1) s += ':nth-of-type(' + (sib.indexOf(n) + 1) + ')'; }
      p.unshift(s);
    }
    return p.join(' > ');
  }
  function context() {
    var c = {};
    try { if (window.__ecomapCtx) c = window.__ecomapCtx() || {}; } catch (e) {}
    var open = [c.selected && ('Organisation : ' + c.selected), c.res && ('Savoir : ' + c.res), c.ini && ('Initiative : ' + c.ini), c.junction && ('Jonction : ' + c.junction)].filter(Boolean).join(' · ');
    if (!open) { var h1 = document.querySelector('#detail h1, .detail h1, aside h1'); if (h1) open = clip(h1.innerText, 80); }
    var rest = {};
    if (c.query) rest.recherche = c.query;
    if (c.filters && Object.keys(c.filters).length) rest.filtres = c.filters;
    if (c.companion) rest.bloom = 'ouvert';
    if (c.panel) rest.panneau = c.panel;
    return { view: c.view || '', lang: c.lang || document.documentElement.lang || '', open: open, extra: Object.keys(rest).length ? JSON.stringify(rest) : '' };
  }
  function device() {
    var u = navigator.userAgent, os = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : /Linux/.test(u) ? 'Linux' : 'Autre';
    var br = /Edg\//.test(u) ? 'Edge' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'navigateur';
    return os + ' · ' + br;
  }

  /* ---------- capture d'écran (html2canvas-pro, chargé à la demande) ---------- */
  var libP = null;
  function loadLib() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (libP) return libP;
    libP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'vendor/html2canvas-pro.min.js'; s.async = true;
      s.onload = function () { res(window.html2canvas); }; s.onerror = function () { libP = null; rej(new Error('lib')); };
      document.head.appendChild(s);
    });
    return libP;
  }
  function withTimeout(p, ms) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]); }
  function screenshot(px, py, num) {
    var W = innerWidth, H = innerHeight, ratio = Math.min(1, 1400 / W);
    return withTimeout(loadLib().then(function (h2c) {
      return h2c(document.body, {
        x: 0, y: 0, width: W, height: H, windowWidth: W, windowHeight: H, scale: ratio, backgroundColor: '#ffffff', logging: false, useCORS: true,
        ignoreElements: function (n) { return isFb(n); }
      });
    }), 12000).then(function (cv) {
      var ctx = cv.getContext('2d'), k = cv.width / W, x = px * k, y = py * k, r = 13 * Math.max(k, .7);
      ctx.beginPath(); ctx.arc(x, y, r + 3 * k, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#16A34A'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(12 * Math.max(k, .7)) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(num), x, y + 1);
      var out = cv.toDataURL('image/jpeg', 0.7);
      if (out.length > 1500000) out = cv.toDataURL('image/jpeg', 0.45);
      return out;
    });
  }

  /* ---------- envoi (avec file d'attente si hors ligne) ---------- */
  function post(payload) {
    var body = JSON.stringify(payload);
    return fetch(ENDPOINT, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .catch(function () {
        // réponse illisible (CORS) : on renvoie en mode opaque, la ligne est quand même créée
        return fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: body, headers: { 'Content-Type': 'text/plain;charset=utf-8' } }).then(function () { return { ok: true, opaque: true }; });
      })
      .then(function (r) { if (!r || r.ok === false) throw new Error((r && r.error) || 'refus'); return r; });
  }
  function queue(p) { try { var q = JSON.parse(localStorage.getItem(OUTBOX) || '[]'); p.image = ''; q.push(p); localStorage.setItem(OUTBOX, JSON.stringify(q.slice(-30))); } catch (e) {} }
  function flush() {
    var q; try { q = JSON.parse(localStorage.getItem(OUTBOX) || '[]'); } catch (e) { q = []; }
    if (!q.length) return;
    localStorage.setItem(OUTBOX, '[]');
    q.forEach(function (p) { post(p).then(function () { st.sent++; save(); paintTab(); }).catch(function () { queue(p); }); });
  }

  /* ---------- interface ---------- */
  var tab = h('button', { id: 'fbTab', type: 'button', title: 'Cliquez puis désignez la zone à commenter', 'aria-label': 'Donner un avis' });
  function paintTab() { tab.innerHTML = '<span class="fb-dot" aria-hidden="true"></span>Donner un avis' + (st.sent ? '<span class="fb-n" aria-label="' + st.sent + ' avis envoyés">' + st.sent + '</span>' : ''); }
  paintTab();
  document.body.appendChild(tab);

  var hover = h('div', { id: 'fbHover', 'aria-hidden': 'true' }); document.body.appendChild(hover);
  var picking = false, banner = null, current = null, eatUntil = 0;

  function startPick() {
    if (current) return;
    picking = true; document.body.classList.add('fb-picking');
    banner = h('div', { id: 'fbBanner', role: 'status' }, '<span>Cliquez sur l’endroit à commenter</span><button type="button" id="fbBannerX">Annuler · Échap</button>');
    document.body.appendChild(banner);
    banner.querySelector('#fbBannerX').addEventListener('click', stopPick);
    loadLib().catch(function () {});
  }
  function stopPick() {
    picking = false; document.body.classList.remove('fb-picking'); hover.style.display = 'none';
    if (banner) { banner.remove(); banner = null; }
  }
  tab.addEventListener('click', function () { picking ? stopPick() : startPick(); });

  function targetAt(x, y) {
    var els = document.elementsFromPoint(x, y);
    for (var i = 0; i < els.length; i++) if (!isFb(els[i]) && els[i] !== document.documentElement) return els[i];
    return null;
  }
  function onMove(e) {
    if (!picking) return;
    var el = targetAt(e.clientX, e.clientY); if (!el) { hover.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    if (r.width * r.height > innerWidth * innerHeight * 0.85) { hover.style.display = 'none'; return; }
    hover.style.display = 'block'; hover.style.left = (r.left - 3) + 'px'; hover.style.top = (r.top - 3) + 'px'; hover.style.width = (r.width + 6) + 'px'; hover.style.height = (r.height + 6) + 'px';
  }
  function swallow(e) { if ((!picking && Date.now() > eatUntil) || isFb(e.target)) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
  function onDown(e) {
    if (!picking || isFb(e.target)) return;
    swallow(e); eatUntil = Date.now() + 700;
    var x = e.clientX, y = e.clientY;
    if (e.touches && e.touches[0]) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    var el = targetAt(x, y) || document.body;
    stopPick();
    openCard(el, x, y);
  }
  ['pointermove', 'mousemove'].forEach(function (t) { window.addEventListener(t, onMove, true); });
  window.addEventListener('pointerdown', onDown, true);
  ['mousedown', 'mouseup', 'pointerup', 'click', 'dblclick', 'touchstart', 'touchend', 'contextmenu'].forEach(function (t) { window.addEventListener(t, swallow, { capture: true, passive: false }); });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (picking) { e.stopImmediatePropagation(); stopPick(); } else if (current) { e.stopImmediatePropagation(); closeCard(); } }
  }, true);

  var TYPES = ['Problème', 'Idée', 'Question', 'Texte à revoir', 'J’aime'];
  function openCard(el, x, y) {
    var num = st.sent + 1;
    var zone = describe(el, x, y), sel = cssPath(el), ctx = context();
    var pin = h('div', { class: 'fb-pin', id: 'fbPin', 'aria-hidden': 'true' }); pin.textContent = num; pin.style.left = x + 'px'; pin.style.top = y + 'px'; document.body.appendChild(pin);
    var card = h('div', { id: 'fbCard', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Votre remarque' });
    card.innerHTML =
      '<h3>Votre remarque</h3><p class="fb-zone" title="' + esc(zone) + '">Zone : ' + esc(zone) + '</p>' +
      '<div class="fb-types" role="group" aria-label="Type">' + TYPES.map(function (t, i) { return '<button type="button" aria-pressed="' + 'false' + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
      '<textarea id="fbText" placeholder="Ce que vous voyez, ce que vous attendiez, une idée…" maxlength="4000"></textarea>' +
      (st.name ? '' : '<label class="fb-l" for="fbName">Votre prénom</label><input type="text" id="fbName" maxlength="60" autocomplete="given-name">') +
      '<label class="fb-cap"><input type="checkbox" id="fbShot" checked> Joindre une capture de l’écran</label>' +
      '<p class="fb-err" id="fbErr" hidden></p>' +
      '<div class="fb-act"><button type="button" class="fb-cancel">Annuler</button><button type="button" class="fb-send" disabled>Envoyer</button></div>';
    document.body.appendChild(card);
    // position : à côté du point, sans sortir de l'écran
    if (!matchMedia('(max-width:980px)').matches) {
      var cw = card.offsetWidth, ch = card.offsetHeight, left = x + 22, top = y - 20;
      if (left + cw > innerWidth - 12) left = x - cw - 22;
      if (left < 12) left = 12;
      if (top + ch > innerHeight - 12) top = innerHeight - ch - 12;
      if (top < 12) top = 12;
      card.style.left = left + 'px'; card.style.top = top + 'px';
    }
    var type = '', ta = card.querySelector('#fbText'), send = card.querySelector('.fb-send'), err = card.querySelector('#fbErr');
    card.querySelectorAll('.fb-types button').forEach(function (b) {
      b.addEventListener('click', function () { card.querySelectorAll('.fb-types button').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); type = b.textContent; });
    });
    function valid() { var nm = st.name || (card.querySelector('#fbName') || {}).value || ''; send.disabled = !(ta.value.trim() && nm.trim()); }
    ta.addEventListener('input', valid); var ni = card.querySelector('#fbName'); if (ni) ni.addEventListener('input', valid);
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !send.disabled) send.click(); });
    card.querySelector('.fb-cancel').addEventListener('click', closeCard);
    send.addEventListener('click', function () {
      if (send.disabled) return;
      if (ni && ni.value.trim()) { st.name = ni.value.trim(); save(); }
      send.disabled = true; send.textContent = 'Envoi…'; err.hidden = true;
      var p = {
        k: KEY, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: new Date().toISOString(),
        author: st.name, type: type || 'Remarque', text: ta.value.trim(), zone: zone, view: ctx.view, open: ctx.open, context: ctx.extra,
        lang: ctx.lang, device: device(), screen: innerWidth + '×' + innerHeight + ' @' + (devicePixelRatio || 1),
        pos: Math.round(x / innerWidth * 100) + ' %, ' + Math.round(y / innerHeight * 100) + ' %', url: location.href, selector: sel, image: ''
      };
      var wantShot = card.querySelector('#fbShot').checked;
      card.style.visibility = 'hidden'; pin.style.visibility = 'hidden';
      (wantShot ? screenshot(x, y, num).catch(function () { return ''; }) : Promise.resolve(''))
        .then(function (img) { p.image = img; card.style.visibility = ''; pin.style.visibility = ''; return post(p); })
        .then(function () { st.sent++; save(); paintTab(); closeCard(); toast('Merci ' + st.name + ', votre avis est bien arrivé.'); })
        .catch(function () {
          card.style.visibility = ''; pin.style.visibility = '';
          err.textContent = 'L’envoi n’a pas abouti. Votre texte est gardé : il repartira automatiquement à la prochaine visite.';
          err.hidden = false; queue(p); send.textContent = 'Fermer'; send.disabled = false; send.onclick = closeCard;
        });
    });
    current = { card: card, pin: pin };
    setTimeout(function () { ta.focus(); }, 30);
  }
  function closeCard() { if (!current) return; current.card.remove(); current.pin.remove(); current = null; }

  if (ENDPOINT.indexOf('http') === 0) { flush(); window.addEventListener('online', flush); }
  else console.warn('[avis] point d’arrivée non configuré');
})();
