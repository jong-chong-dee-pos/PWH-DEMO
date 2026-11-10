/* PWH sign-in screens (first-run setup, sign in) and the admin page for users and roles. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDT(ms) { if (!ms) return '–'; var d = new Date(ms); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function errText(e) { var c = (e && e.code) || 'fail'; return t('au.err.' + c, { n: e && e.left, s: e && e.wait }); }
  var reduce = false; try { reduce = g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ---------- the plan drawing on the sign-in screen: the 4 digits walk a pick route ---------- */
  // stops are real-looking bins on two rack blocks; START bottom right, DROP the strip on the right
  // bins on a 5 x 8 rack grid (two blocks); aisles run between the rows, cross aisles at the left edge and the right side
  function bin(bx, c, r) { return [bx + c * 22 + 9.5, 66 + r * 48, r]; }
  var STOPS = [bin(154, 3, 7), bin(40, 1, 5), bin(154, 2, 3), bin(40, 3, 1)];
  var START = [338, 452], DROP = [352, 138];
  function aisle(r) { return 90 + r * 48; }
  function racks() {
    var out = '';
    [40, 154].forEach(function (bx) {
      for (var r = 0; r < 8; r++) for (var c = 0; c < 5; c++) out += '<rect class="gk" x="' + (bx + c * 22) + '" y="' + (60 + r * 48) + '" width="19" height="12" rx="2.5"/>';
    });
    return out;
  }
  function legs() {
    var d = [], P = function (pts) { return 'M' + pts.map(function (q) { return q[0] + ' ' + q[1]; }).join(' L'); };
    var s0 = STOPS[0]; d.push(P([START, [START[0], aisle(s0[2])], [s0[0], aisle(s0[2])], s0]));
    for (var i = 0; i < STOPS.length - 1; i++) {
      var a = STOPS[i], b = STOPS[i + 1], ya = aisle(a[2]), yb = aisle(b[2]);
      var V = Math.abs(a[0] - 300) + Math.abs(b[0] - 300) <= Math.abs(a[0] - 28) + Math.abs(b[0] - 28) ? 300 : 28;
      d.push(P([a, [a[0], ya], [V, ya], [V, yb], [b[0], yb], b]));
    }
    var z = STOPS[STOPS.length - 1], yz = aisle(z[2]); d.push(P([z, [z[0], yz], [300, yz], [300, DROP[1]], DROP]));
    return d.map(function (x, i) { return '<path class="gl" data-leg="' + i + '" d="' + x + '" pathLength="100"/>'; }).join('');
  }
  function plan() {
    return '<svg class="gplan" viewBox="0 0 400 520" role="img" aria-label="' + esc(t('au.art')) + '">' +
      '<rect class="gfl" x="20" y="36" width="370" height="470" rx="14"/>' + racks() +
      '<rect class="gdrop" x="352" y="70" width="18" height="290" rx="4"/><text class="gtx" x="361" y="56" text-anchor="middle">DROP</text>' +
      '<rect class="gstart" x="318" y="452" width="40" height="34" rx="6"/><text class="gtx" x="338" y="503" text-anchor="middle">START</text>' +
      legs() +
      STOPS.map(function (s, i) { return '<g class="gs" data-stop="' + i + '"><circle cx="' + s[0] + '" cy="' + s[1] + '" r="11"/><text x="' + s[0] + '" y="' + (s[1] + 4) + '" text-anchor="middle">' + (i + 1) + '</text></g>'; }).join('') +
      '</svg>';
  }
  function walk(n, done) {
    var root = $('.gate'); if (!root) return;
    root.querySelectorAll('.gs').forEach(function (s, i) { s.classList.toggle('on', i < n); });
    root.querySelectorAll('.gl').forEach(function (l, i) { l.classList.toggle('on', i < n || (done && i === 4)); });
    root.classList.toggle('done', !!done);
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
  function render() {
    var lang = PWH.getLang(), setup = G.mode === 'setup';
    var form = setup
      ? '<h1>' + esc(t('au.setup.title')) + '</h1><p class="glede">' + esc(t('au.setup.sub')) + '</p>' +
        '<div class="gfld"><label for="gemail">' + esc(t('au.email')) + '</label><input id="gemail" type="email" autocomplete="username" required></div>' +
        '<div class="gfld"><label for="gname">' + esc(t('au.name')) + '</label><input id="gname" type="text" autocomplete="name" required></div>' +
        pin('gcode', t('au.code'), 'new-password') + pin('gcode2', t('au.code2'), 'new-password') +
        '<p class="gerr" role="alert">' + esc(G.err) + '</p><button class="btn primary gbtn" type="submit"' + (G.busy ? ' disabled' : '') + '>' + esc(t('au.setup.go')) + '</button>' +
        '<p class="gfoot">' + esc(t('au.setup.foot')) + '</p>'
      : '<h1>' + esc(t('au.login.title')) + '</h1><p class="glede">' + esc(t('au.login.sub')) + '</p>' +
        (G.note ? '<p class="gnote" role="status">' + esc(G.note) + '</p>' : '') +
        '<div class="gfld"><label for="gemail">' + esc(t('au.email')) + '</label><input id="gemail" type="email" autocomplete="username" required value="' + esc(G.email) + '"></div>' +
        pin('gcode', t('au.code'), 'current-password') +
        '<p class="gerr" role="alert">' + esc(G.err) + '</p><button class="btn primary gbtn" type="submit"' + (G.busy ? ' disabled' : '') + '>' + esc(t('au.login.go')) + '</button>' +
        '<p class="gfoot">' + esc(t('au.login.foot')) + '</p>';
    $('#app').innerHTML = '<div class="gate">' +
      '<aside class="gart"><div class="gbrand"><b>PWH</b><span>' + esc(t('app.name')) + '</span></div>' + plan() + '<p class="gcap">' + esc(t('au.cap')) + '</p></aside>' +
      '<main class="gmain"><div class="lang" role="group" aria-label="Language"><button type="button" data-gl="th" aria-pressed="' + (lang === 'th') + '">TH</button><button type="button" data-gl="en" aria-pressed="' + (lang === 'en') + '">EN</button></div>' +
      '<form class="gform" id="gform" novalidate>' + form + '</form></main></div>';
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

  PWH.gate = { show: show };
  PWH.users = { mount: function (root) { U.root = root; U.edit = 'new'; U.msg = null; U.confirm = null; U.draft = null; renderUsers(); }, roNote: roNote };
})(window);
