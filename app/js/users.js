/* PWH sign-in screens (first-run setup, sign in) and the admin page for users and roles. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDT(ms) { if (!ms) return '–'; var d = new Date(ms); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function errText(e) { var c = (e && e.code) || 'fail'; return t('au.err.' + c, { n: e && e.left, s: e && e.wait }); }
  var reduce = false; try { reduce = g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ---------- logo: a rack with two bins in a violet disc (rail, sign-in) ---------- */
  function logo(size, cls) {
    return '<svg class="' + (cls || 'plogo') + '" width="' + size + '" height="' + size + '" viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="20" fill="#6d4aff"/>' +
      '<rect x="11" y="10" width="2.6" height="20" rx="1.3" fill="#fff"/><rect x="26.4" y="10" width="2.6" height="20" rx="1.3" fill="#fff"/>' +
      '<rect x="11" y="17.6" width="18" height="2.4" rx="1.2" fill="#fff"/><rect x="11" y="25.4" width="18" height="2.4" rx="1.2" fill="#fff"/>' +
      '<rect x="15" y="12" width="6.4" height="5.6" rx="1.2" fill="#ffb08a"/><rect x="18.6" y="20" width="6.4" height="5.4" rx="1.2" fill="#7dd3fc"/>' +
      '</svg>';
  }

  /* ---------- the sign-in picture: an isometric part-picking scene, drawn from boxes ----------
   * a pallet rack with cartons and blue part bins, a picker pushing a cart, and the pick route on the floor:
   * each digit of the code lights the next stop, the fourth one reaches the bin marked on the shelf */
  var S0 = 30, OX = 0, OY = 0, BB = null;
  function P(x, y, z) { var p = [(x - y) * 0.866 * S0 + OX, (x + y) * 0.5 * S0 - z * S0 + OY]; if (BB) { BB[0] = Math.min(BB[0], p[0]); BB[1] = Math.min(BB[1], p[1]); BB[2] = Math.max(BB[2], p[0]); BB[3] = Math.max(BB[3], p[1]); } return p; }
  function poly(pts, fill, extra) { return '<polygon points="' + pts.map(function (q) { var p = P(q[0], q[1], q[2]); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function box(x, y, z, w, d, h, c) {   // c = [top, front(+y), side(+x)]
    return poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c[0]) +
      poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c[1]) +
      poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], c[2]);
  }
  var C = {
    post: ['#ffffff', '#e4defc', '#c9bdf8'], beam: ['#ffb08a', '#ff7a45', '#e5602d'], deck: ['#f3f0ff', '#d8cffd', '#c3b5f7'],
    carton: ['#f4cf9c', '#dfa86c', '#c98f55'], bin: ['#9ee0fd', '#38bdf8', '#0b94d1'], binIn: '#0b6f9e',
    cart: ['#4b3f8f', '#2e2566', '#221b4d'], wheel: ['#3a3170', '#17123a', '#100c2b'], pants: ['#3b3478', '#2a2360', '#1f1a4c'],
    vest: ['#ffe27a', '#ffcf33', '#e9b300'], shirt: ['#ffffff', '#ebe7fb', '#d6cff5'], skin: '#f2c6a2', cap: '#ff7a45'
  };
  function carton(x, y, z, w, d, h) {
    var lab = poly([[x + w * 0.55, y + d, z + h * 0.35], [x + w * 0.88, y + d, z + h * 0.35], [x + w * 0.88, y + d, z + h * 0.7], [x + w * 0.55, y + d, z + h * 0.7]], '#fff8ec');
    var tape = poly([[x, y + d * 0.44, z + h], [x + w, y + d * 0.44, z + h], [x + w, y + d * 0.56, z + h], [x, y + d * 0.56, z + h]], '#e7b97f');
    return box(x, y, z, w, d, h, C.carton) + tape + lab;
  }
  function bin(x, y, z, w, d, h) {   // open part bin: the inside shows on top
    var r = 0.09;
    return box(x, y, z, w, d, h, C.bin) + poly([[x + r, y + r, z + h], [x + w - r, y + r, z + h], [x + w - r, y + d - r, z + h], [x + r, y + d - r, z + h]], C.binIn) +
      poly([[x + w * 0.18, y + d, z + h * 0.3], [x + w * 0.6, y + d, z + h * 0.3], [x + w * 0.6, y + d, z + h * 0.62], [x + w * 0.18, y + d, z + h * 0.62]], '#e8f7ff');
  }
  function rack() {
    var o = '', L = [0.18, 1.55, 2.92], W = 7, D = 1.7, T = 0.16, H = 4.25, bays = [0, 3.5];
    var back = [[0, 0], [3.5 - T / 2, 0], [W - T, 0]], front = [[0, D - T], [3.5 - T / 2, D - T], [W - T, D - T]];
    back.forEach(function (p) { o += box(p[0], p[1], 0, T, T, H, C.post); });
    var stock = [   // per level, per bay: [kind, x offset, width, depth, height]
      [[['c', 0.25, 1.4, 1.3, 1.0], ['c', 1.8, 1.35, 1.3, 1.0]], [['b', 0.3, 0.95, 1.2, 0.55], ['b', 1.35, 0.95, 1.2, 0.55], ['b', 2.4, 0.8, 1.2, 0.55]]],
      [[['b', 0.3, 0.95, 1.2, 0.55, 'pick'], ['b', 1.35, 0.95, 1.2, 0.55], ['c', 2.4, 0.85, 1.2, 0.9]], [['c', 0.3, 1.3, 1.3, 1.0], ['b', 1.8, 0.95, 1.2, 0.55]]],
      [[['c', 0.3, 1.2, 1.2, 0.85], ['c', 1.6, 1.5, 1.3, 1.05]], [['b', 0.3, 0.95, 1.2, 0.55], ['c', 1.45, 1.2, 1.2, 0.85], ['b', 2.75, 0.55, 1.1, 0.5]]]
    ];
    L.forEach(function (z, li) {
      o += box(0, 0, z - 0.06, W, D, 0.06, C.deck);
      o += box(0, 0, z - 0.2, W, T, 0.18, C.beam);
      bays.forEach(function (bx, bi) {
        stock[li][bi].forEach(function (s) {
          var x = bx + s[1], y = 0.22 + (1.3 - s[3]) / 2;
          if (s[0] === 'c') o += carton(x, y, z, s[2], s[3], s[4]); else o += bin(x, y, z, s[2], s[3], s[4]);
          if (s[5] === 'pick') PICK = [x + s[2] / 2, y + s[3], z + s[4]];
        });
      });
      o += box(0, D - T, z - 0.2, W, T, 0.18, C.beam);
    });
    o += box(0, 0, H - 0.02, W, D, 0.04, ['rgba(255,255,255,0.0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)']);
    front.forEach(function (p) { o += box(p[0], p[1], 0, T, T, H, C.post); });
    return o;
  }
  var PICK = [5.8, 1.5, 2.1];
  function cart() {
    var o = '', x = 7.5, y = 2.2, w = 2.2, d = 1.1;
    [[x + 0.1, y + 0.1], [x + w - 0.3, y + 0.1], [x + 0.1, y + d - 0.3], [x + w - 0.3, y + d - 0.3]].forEach(function (p) { o += box(p[0], p[1], 0, 0.2, 0.2, 0.22, C.wheel); });
    o += box(x, y, 0.22, w, d, 0.1, C.cart);
    o += box(x + w - 0.12, y + 0.1, 0.32, 0.1, 0.1, 1.55, C.cart) + box(x + w - 0.12, y + d - 0.2, 0.32, 0.1, 0.1, 1.55, C.cart);
    o += box(x, y + 0.1, 0.32, 0.1, 0.1, 0.9, C.cart) + box(x, y + d - 0.2, 0.32, 0.1, 0.1, 0.9, C.cart);
    o += box(x, y, 1.0, w, d, 0.07, C.cart);
    o += bin(x + 0.15, y + 0.12, 1.07, 0.95, 0.9, 0.5) + carton(x + 1.15, y + 0.15, 1.07, 0.8, 0.85, 0.62);
    o += bin(x + 0.2, y + 0.15, 0.32, 0.9, 0.85, 0.45);
    o += box(x + w - 0.12, y + 0.05, 1.82, 0.1, d - 0.1, 0.1, C.cart);   // handle bar
    return o;
  }
  function picker() {
    var o = '', x = 10.15, y = 2.35;
    o += box(x, y + 0.42, 0, 0.26, 0.24, 0.95, C.pants) + box(x + 0.1, y + 0.05, 0, 0.26, 0.24, 0.95, C.pants);
    o += box(x - 0.42, y + 0.1, 1.55, 0.55, 0.16, 0.16, C.shirt) + box(x - 0.42, y + 0.5, 1.5, 0.55, 0.16, 0.16, C.shirt);   // arms on the handle
    o += box(x, y, 0.95, 0.5, 0.75, 0.85, C.vest);
    o += poly([[x, y + 0.75, 1.15], [x + 0.5, y + 0.75, 1.15], [x + 0.5, y + 0.75, 1.24], [x, y + 0.75, 1.24]], '#ffffff');   // reflective stripe
    var h = P(x + 0.25, y + 0.37, 2.15);
    o += '<circle cx="' + h[0].toFixed(1) + '" cy="' + h[1].toFixed(1) + '" r="10.5" fill="' + C.skin + '"/>';
    o += '<path d="M' + (h[0] - 10.8).toFixed(1) + ' ' + (h[1] - 1).toFixed(1) + ' a10.8 10.8 0 0 1 21.6 0 z" fill="' + C.cap + '"/><rect x="' + (h[0] - 15).toFixed(1) + '" y="' + (h[1] - 2.2).toFixed(1) + '" width="9" height="3.2" rx="1.6" fill="#e5602d"/>';
    return o;
  }
  // floor route along the aisle in front of the rack, 4 stops; the last one sits under the marked bin
  var STOPS = [[6.0, 2.6], [4.4, 2.6], [2.7, 2.6], [0.9, 2.6]];
  function route() {
    var pts = [[7.3, 2.6]].concat(STOPS), o = '';
    for (var i = 0; i < pts.length - 1; i++) {
      var a = P(pts[i][0], pts[i][1], 0), b = P(pts[i + 1][0], pts[i + 1][1], 0), leg = i;
      o += '<line class="gl" data-leg="' + leg + '" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" pathLength="100"/>';
    }
    STOPS.forEach(function (s, i) {
      var c = P(s[0], s[1], 0);
      o += '<g class="gs" data-stop="' + i + '"><ellipse cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="13" ry="7.5"/><text x="' + c[0].toFixed(1) + '" y="' + (c[1] + 3.6).toFixed(1) + '" text-anchor="middle">' + (i + 1) + '</text></g>';
    });
    return o;
  }
  function scene() {
    BB = [1e9, 1e9, -1e9, -1e9];
    var floor = poly([[-0.6, -0.5, 0], [11.2, -0.5, 0], [11.2, 3.8, 0], [-0.6, 3.7, 0]], 'rgba(28,10,96,0.20)');
    var rk = rack(), pk = P(PICK[0], PICK[1], PICK[2] + 0.05), tag = [pk[0] + 18, pk[1] - 58];
    var marker = '<g class="gpin-mark"><circle class="gpulse" cx="' + pk[0].toFixed(1) + '" cy="' + pk[1].toFixed(1) + '" r="9"/><circle cx="' + pk[0].toFixed(1) + '" cy="' + pk[1].toFixed(1) + '" r="5.5" fill="#fff" stroke="#ff7a45" stroke-width="3"/></g>' +
      '<g class="gtag"><line x1="' + pk[0].toFixed(1) + '" y1="' + (pk[1] - 6).toFixed(1) + '" x2="' + (tag[0] + 10).toFixed(1) + '" y2="' + (tag[1] + 40).toFixed(1) + '" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<rect x="' + tag[0].toFixed(1) + '" y="' + tag[1].toFixed(1) + '" width="128" height="42" rx="12" fill="#fff"/>' +
      '<text x="' + (tag[0] + 14).toFixed(1) + '" y="' + (tag[1] + 17).toFixed(1) + '" class="gtag-k">' + esc(t('au.art.next')) + '</text>' +
      '<text x="' + (tag[0] + 14).toFixed(1) + '" y="' + (tag[1] + 34).toFixed(1) + '" class="gtag-v">2K-04-03</text></g>';
    var vb = [BB[0] - 6, Math.min(BB[1], tag[1]) - 6, BB[2] - BB[0] + 12, BB[3] - Math.min(BB[1], tag[1]) + 12].map(function (v) { return v.toFixed(0); }).join(' '); BB = null;
    return '<svg class="gscene" viewBox="' + vb + '" preserveAspectRatio="xMidYMax meet" role="img" aria-label="' + esc(t('au.art')) + '">' +
      '<g class="gpl gpl-0">' + floor + route() + '</g><g class="gpl gpl-1">' + rk + '</g><g class="gpl gpl-2">' + cart() + picker() + '</g><g class="gpl gpl-3">' + marker + '</g></svg>';
  }
  function walk(n, done) {
    var root = $('.gate'); if (!root) return;
    root.querySelectorAll('.gs').forEach(function (s, i) { s.classList.toggle('on', i < n); });
    root.querySelectorAll('.gl').forEach(function (l) { l.classList.toggle('on', +l.getAttribute('data-leg') < n); });
    root.classList.toggle('done', !!done || n >= 4);
  }

  /* ---------- sign-in and first-run screens ---------- */
  var G = { mode: 'login', note: '', err: '', busy: false, email: '' };
  function pin(id, label, ac) {
    return '<div class="gfld"><label for="' + id + '">' + esc(label) + '</label><div class="gpin"><input id="' + id + '" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="' + ac + '" required>' +
      '<span class="gc" aria-hidden="true"></span><span class="gc" aria-hidden="true"></span><span class="gc" aria-hidden="true"></span><span class="gc" aria-hidden="true"></span></div></div>';
  }
  function show(mode, why) {
    G.mode = mode === 'setup' ? 'setup' : 'login'; G.err = ''; G.busy = false;
    G.note = why === 'idle' ? t('au.note.idle') : why === 'out' ? t('au.note.out') : why === 'other' ? t('au.note.other') : '';
    document.documentElement.classList.remove('pwh-m3');
    render();
  }
  function field(id, type, label, ac, val) {
    return '<div class="gfld"><label class="sr" for="' + id + '">' + esc(label) + '</label><input id="' + id + '" type="' + type + '" autocomplete="' + ac + '" placeholder="' + esc(label) + '" required' + (val ? ' value="' + esc(val) + '"' : '') + '></div>';
  }
  function render() {
    var lang = PWH.getLang(), setup = G.mode === 'setup';
    var form = setup
      ? '<h1>' + esc(t('au.setup.title')) + '</h1><p class="glede">' + esc(t('au.setup.sub')) + '</p>' +
        field('gemail', 'email', t('au.email'), 'username') + field('gname', 'text', t('au.name'), 'name') +
        pin('gcode', t('au.code'), 'new-password') + pin('gcode2', t('au.code2'), 'new-password') +
        '<p class="gerr" role="alert">' + esc(G.err) + '</p><button class="btn primary gbtn" type="submit"' + (G.busy ? ' disabled' : '') + '>' + esc(t('au.setup.go')) + '</button>' +
        '<p class="gfoot">' + esc(t('au.setup.foot')) + '</p>'
      : '<h1>' + esc(t('au.login.title')) + '</h1><p class="glede">' + esc(t('au.login.sub')) + '</p>' +
        (G.note ? '<p class="gnote" role="status">' + esc(G.note) + '</p>' : '') +
        field('gemail', 'email', t('au.email'), 'username', G.email) +
        pin('gcode', t('au.code'), 'current-password') +
        '<div class="gforgot"><button type="button" class="glink" data-g="forgot" aria-expanded="' + !!G.forgot + '">' + esc(t('au.forgot')) + '</button>' + (G.forgot ? '<p class="gtip">' + esc(t('au.forgot.tip')) + '</p>' : '') + '</div>' +
        '<p class="gerr" role="alert">' + esc(G.err) + '</p><button class="btn primary gbtn" type="submit"' + (G.busy ? ' disabled' : '') + '>' + esc(t('au.login.go')) + '</button>' +
        '<p class="gfoot">' + esc(t('au.noacc')) + ' <b>' + esc(t('au.noacc.who')) + '</b></p>';
    $('#app').innerHTML = '<div class="gate">' +
      '<aside class="gart"><div class="gcopy"><p class="ghead"><span>' + esc(t('au.hero1')) + '</span><br><span class="gul">' + esc(t('au.hero2')) + '</span></p><p class="gsub">' + esc(t('au.hero.sub')) + '</p></div>' +
      '<div class="gpic">' + scene() + '</div></aside>' +
      '<main class="gmain"><div class="lang" role="group" aria-label="Language"><button type="button" data-gl="th" aria-pressed="' + (lang === 'th') + '">TH</button><button type="button" data-gl="en" aria-pressed="' + (lang === 'en') + '">EN</button></div>' +
      '<form class="gform" id="gform" novalidate><div class="glogo">' + logo(52) + '<span><b>PWH</b><small>Part Warehouse</small></span></div>' + form + '</form></main></div>';
    wire();
    var first = $(setup ? '#gemail' : (G.email ? '#gcode' : '#gemail')); if (first) first.focus();
  }
  function digits(el) { var v = el.value.replace(/\D/g, '').slice(0, 4); if (v !== el.value) el.value = v; return v; }
  function paintPin(el) {
    var v = digits(el), cells = el.parentNode.querySelectorAll('.gc');
    cells.forEach(function (c, i) { c.classList.toggle('f', i < v.length); c.classList.toggle('cur', i === Math.min(v.length, 3)); });
    return v;
  }
  function wire() {
    document.querySelectorAll('[data-gl]').forEach(function (b) { b.addEventListener('click', function () { G.email = ($('#gemail') || {}).value || G.email; PWH.setLang(b.getAttribute('data-gl')); t = PWH.t; render(); }); });
    document.querySelectorAll('.gpin input').forEach(function (el) {
      el.addEventListener('input', function () {
        var v = paintPin(el); G.err = ''; var e0 = $('.gerr'); if (e0) e0.textContent = '';
        if (el.id === 'gcode') walk(v.length);
        if (G.mode === 'login' && v.length === 4 && ($('#gemail').value || '').trim()) submit();   // 4 digits typed: sign in straight away
      });
      paintPin(el);
    });
    var f = $('#gform'); f.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    var fg = $('[data-g=forgot]'); if (fg) fg.addEventListener('click', function () { G.forgot = !G.forgot; G.email = $('#gemail').value; render(); });
    var art = $('.gart');
    if (art && !reduce) art.addEventListener('pointermove', function (e) {   // depth: the floor stays, rack, cart and tag drift by different amounts
      var r = art.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      art.querySelectorAll('.gpl').forEach(function (gp, i) { gp.style.transform = 'translate(' + (dx * i * 5).toFixed(1) + 'px,' + (dy * i * 3).toFixed(1) + 'px)'; });
    });
  }
  function fail(msg, focus) {
    G.busy = false; G.err = msg;
    var e0 = $('.gerr'); if (e0) e0.textContent = msg;
    var b = $('.gbtn'); if (b) b.disabled = false;
    var form = $('.gform'); if (form && !reduce) { form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); }
    if (focus) { var el = $(focus); if (el) { if (el.closest('.gpin')) { el.value = ''; paintPin(el); walk(0); } el.focus(); } }
  }
  function submit() {
    if (G.busy) return;
    var email = ($('#gemail').value || '').trim(), code = ($('#gcode').value || '');
    if (!PWH.auth.okEmail(email.toLowerCase())) return fail(t('au.err.email'), '#gemail');
    if (!PWH.auth.okCode(code)) return fail(t('au.err.code'), '#gcode');
    G.busy = true; G.email = email; var b = $('.gbtn'); if (b) b.disabled = true;
    var job;
    if (G.mode === 'setup') {
      var name = ($('#gname').value || '').trim(), c2 = $('#gcode2').value || '';
      if (!name) return fail(t('au.err.name'), '#gname');
      if (c2 !== code) return fail(t('au.err.match'), '#gcode2');
      job = PWH.auth.setup({ email: email, name: name, code: code });
    } else job = PWH.auth.login(email, code);
    job.then(function () {
      walk(4, true);
      setTimeout(function () { G.email = ''; PWH.app.enter(); }, reduce ? 0 : 520);
    }).catch(function (e) { fail(errText(e), e && e.code === 'email' ? '#gemail' : '#gcode'); });
  }

  /* ---------- admin page: users and roles ---------- */
  var U = { edit: null, confirm: null, msg: null, root: null };
  function roleChip(r) { return '<span class="chip ' + (r === 'admin' ? 'urole-a' : 'urole-u') + '">' + esc(t('au.role.' + r)) + '</span>'; }
  function matrix() {
    var rows = [['au.p.view', 1, 1], ['au.p.sim', 1, 1], ['au.p.data', 1, 0], ['au.p.layout', 1, 0], ['au.p.rules', 1, 0], ['au.p.users', 1, 0]];
    var mk = function (on) { return on ? '<span class="uyes" aria-label="' + esc(t('au.p.yes')) + '">&#10003;</span>' : '<span class="uno" aria-label="' + esc(t('au.p.no')) + '">–</span>'; };
    return '<section class="panel"><h2>' + esc(t('au.p.title')) + '</h2><p class="sub">' + esc(t('au.p.sub')) + '</p><div class="tablebox"><table class="umx"><thead><tr><th>' + esc(t('au.p.what')) + '</th><th class="c">' + esc(t('au.role.admin')) + '</th><th class="c">' + esc(t('au.role.user')) + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + esc(t(r[0])) + '</td><td class="c">' + mk(r[1]) + '</td><td class="c">' + mk(r[2]) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  }
  function formHtml() {
    var e = U.edit && U.edit !== 'new' ? PWH.auth.list().filter(function (x) { return x.id === U.edit; })[0] : null, role = (U.draft && U.draft.role) || (e ? e.role : 'user');
    var me = PWH.auth.me(), self = e && e.id === me.id;
    return '<section class="panel uform"><h2>' + esc(t(e ? 'au.f.edit' : 'au.f.add')) + '</h2>' + (e ? '<p class="sub">' + esc(e.email) + '</p>' : '<p class="sub">' + esc(t('au.f.addsub')) + '</p>') +
      '<form id="uform" novalidate autocomplete="off">' +
      '<div class="gfld"><label for="uemail">' + esc(t('au.email')) + '</label><input id="uemail" type="email" value="' + esc(e ? e.email : '') + '" required></div>' +
      '<div class="gfld"><label for="uname">' + esc(t('au.name')) + '</label><input id="uname" type="text" value="' + esc(e ? e.name : '') + '" required></div>' +
      '<div class="gfld"><label for="ucode">' + esc(t(e ? 'au.f.code_new' : 'au.code')) + '</label><input id="ucode" type="text" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" class="ucode" placeholder="0000" autocomplete="off">' + (e ? '<span class="sub2">' + esc(t('au.f.code_keep')) + '</span>' : '') + '</div>' +
      '<div class="gfld"><span class="lbl">' + esc(t('au.f.role')) + '</span><div class="seg" role="group">' + ['user', 'admin'].map(function (r) { return '<button type="button" data-u="role" data-v="' + r + '" aria-pressed="' + (role === r) + '"' + (self ? ' disabled' : '') + '>' + esc(t('au.role.' + r)) + '</button>'; }).join('') + '</div>' +
      '<span class="sub2">' + esc(t(self ? 'au.f.selfrole' : 'au.f.role_' + role)) + '</span></div>' +
      (U.msg ? '<p class="umsg ' + U.msg[0] + '" role="' + (U.msg[0] === 'bad' ? 'alert' : 'status') + '">' + esc(U.msg[1]) + '</p>' : '') +
      '<div class="uacts"><button class="btn primary" type="submit">' + esc(t(e ? 'au.f.save' : 'au.f.create')) + '</button>' + (e ? '<button class="btn" type="button" data-u="cancel">' + esc(t('au.f.cancel')) + '</button>' : '') + '</div></form></section>';
  }
  function tableHtml() {
    var me = PWH.auth.me(), list = PWH.auth.list().sort(function (a, b) { return (a.role === b.role ? 0 : a.role === 'admin' ? -1 : 1) || a.name.localeCompare(b.name); });
    var rows = list.map(function (u) {
      var self = u.id === me.id, conf = U.confirm === u.id;
      var acts = '<button class="btn sm" data-u="edit" data-id="' + u.id + '">' + esc(t('au.t.edit')) + '</button>' +
        (self ? '' : '<button class="btn sm" data-u="toggle" data-id="' + u.id + '">' + esc(t(u.active ? 'au.t.off' : 'au.t.on')) + '</button><button class="btn sm danger' + (conf ? ' confirm' : '') + '" data-u="del" data-id="' + u.id + '">' + esc(t(conf ? 'au.t.delsure' : 'au.t.del')) + '</button>');
      return '<tr' + (u.active ? '' : ' class="uoff"') + (U.edit === u.id ? ' aria-current="true"' : '') + '><td><div class="uwho"><span class="uav" aria-hidden="true">' + esc((u.name || u.email).charAt(0).toUpperCase()) + '</span><div><b>' + esc(u.name) + '</b>' + (self ? ' <span class="chip info">' + esc(t('au.t.you')) + '</span>' : '') + '<div class="sub2">' + esc(u.email) + '</div></div></div></td>' +
        '<td>' + roleChip(u.role) + '</td><td><span class="chip ' + (u.active ? 'ok' : 'pending') + '">' + esc(t(u.active ? 'au.t.active' : 'au.t.inactive')) + '</span></td><td class="when">' + fmtDT(u.lastLogin) + '</td><td><div class="acts">' + acts + '</div></td></tr>';
    }).join('');
    var nA = list.filter(function (u) { return u.role === 'admin'; }).length;
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('au.t.title', { n: list.length })) + '</h2><p class="sub">' + esc(t('au.t.sub', { a: nA, u: list.length - nA })) + '</p></div>' +
      (U.edit && U.edit !== 'new' ? '<div class="chd-r"><button class="btn" data-u="new">' + esc(t('au.t.new')) + '</button></div>' : '') + '</div>' +
      '<div class="tablebox"><table class="utable"><thead><tr><th>' + esc(t('au.t.who')) + '</th><th>' + esc(t('au.t.role')) + '</th><th>' + esc(t('au.t.status')) + '</th><th>' + esc(t('au.t.last')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }
  function renderUsers() {
    var v = U.root; if (!v || !document.body.contains(v)) return;
    if (!PWH.auth.can('users.manage')) { v.innerHTML = '<div class="panel">' + esc(t('au.ro.denied')) + '</div>'; return; }
    v.innerHTML = '<div class="ph"><div class="ph-l"><div class="cap">' + esc(t('au.cap2')) + '</div><h1>' + esc(t('nav.users')) + '</h1><p class="lede">' + esc(t('au.lede')) + '</p></div></div>' +
      '<p class="ulocal">' + esc(t('au.local')) + '</p>' +
      '<div class="ugrid">' + tableHtml() + formHtml() + '</div>' + matrix();
    var f = $('#uform'); if (f) f.addEventListener('submit', function (e) { e.preventDefault(); saveForm(); });
    var c = $('#ucode'); if (c) c.addEventListener('input', function () { var x = c.value.replace(/\D/g, '').slice(0, 4); if (x !== c.value) c.value = x; });
  }
  function draft() { return { email: ($('#uemail').value || '').trim(), name: ($('#uname').value || '').trim(), code: ($('#ucode').value || '').trim(), role: (U.draft && U.draft.role) || (($('[data-u=role][aria-pressed=true]') || {}).getAttribute ? $('[data-u=role][aria-pressed=true]').getAttribute('data-v') : 'user') }; }
  function saveForm() {
    var d = draft(), editing = U.edit && U.edit !== 'new' ? U.edit : null;
    var cur = editing ? PWH.auth.list().filter(function (x) { return x.id === editing; })[0] : null;
    var job = editing ? PWH.auth.updateUser(editing, { email: d.email, name: d.name, role: d.role, active: cur ? cur.active : true, code: d.code }) : PWH.auth.addUser(d);
    job.then(function (u) {
      U.msg = ['ok', t(editing ? 'au.ok.saved' : 'au.ok.added', { name: u.name })]; U.edit = 'new'; U.draft = null; renderUsers(); PWH.app.refreshUser();
    }).catch(function (e) { U.msg = ['bad', errText(e)]; U.draft = d; renderUsers(); restore(d); });
  }
  function restore(d) { if ($('#uemail')) { $('#uemail').value = d.email; $('#uname').value = d.name; $('#ucode').value = d.code; } }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-u]'); if (!el || !U.root || !U.root.contains(el)) return;
    var a = el.getAttribute('data-u'), id = el.getAttribute('data-id');
    if (a === 'role') { var d = draft(); d.role = el.getAttribute('data-v'); U.draft = d; U.msg = null; renderUsers(); restore(d); return; }
    U.msg = null;
    if (a === 'edit') { U.edit = id; U.draft = null; U.confirm = null; renderUsers(); var n = $('#uname'); if (n) n.focus(); }
    else if (a === 'new' || a === 'cancel') { U.edit = 'new'; U.draft = null; renderUsers(); }
    else if (a === 'toggle') {
      var u = PWH.auth.list().filter(function (x) { return x.id === id; })[0]; if (!u) return;
      PWH.auth.updateUser(id, { email: u.email, name: u.name, role: u.role, active: !u.active, code: '' })
        .then(function () { U.msg = ['ok', t(u.active ? 'au.ok.off' : 'au.ok.on', { name: u.name })]; renderUsers(); })
        .catch(function (er) { U.msg = ['bad', errText(er)]; renderUsers(); });
    }
    else if (a === 'del') {
      if (U.confirm !== id) { U.confirm = id; renderUsers(); setTimeout(function () { if (U.confirm === id) { U.confirm = null; renderUsers(); } }, 4000); return; }
      U.confirm = null;
      var dn = (PWH.auth.list().filter(function (x) { return x.id === id; })[0] || {}).name;
      PWH.auth.removeUser(id).then(function () { if (U.edit === id) U.edit = 'new'; U.msg = ['ok', t('au.ok.deleted', { name: dn })]; renderUsers(); })
        .catch(function (er) { U.msg = ['bad', errText(er)]; renderUsers(); });
    }
  });

  /* a short line at the top of a module the signed-in person may only look at */
  function roNote(key) { return '<p class="ronote"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>' + esc(t(key || 'au.ro.note')) + '</p>'; }

  PWH.gate = { show: show, logo: logo };
  PWH.users = { mount: function (root) { U.root = root; U.edit = 'new'; U.msg = null; U.confirm = null; U.draft = null; renderUsers(); }, roNote: roNote };
})(window);
