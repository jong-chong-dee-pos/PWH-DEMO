/* Module 5: relocation rules.
 * Agreed: swaps are 1:1 and may cross floors; the admin locks Parts or bins (with a reason) that must not move.
 * Locks live in the local database (meta 'locks'); every lock and unlock is logged with who and when. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var S = { root: null, type: 'part', parts: [], bins: [], names: new Map(), data: { items: [], log: [] }, confirm: null, msg: null };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return S.root && S.root.querySelector(s); }
  function fmt(ms) { var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function who() { return (PWH.user && PWH.user.email) || t('m5.who.local'); }

  function load() {
    return Promise.all([PWH.db.getMeta('locks').catch(function () { return null; }), PWH.app.activeRows('matloc'), PWH.app.activeRows('bom')]).then(function (r) {
      S.data = r[0] || { items: [], log: [] };
      var parts = new Set(), bins = new Set(), racks = new Set();
      (r[1] || []).forEach(function (row) { if (row[2]) parts.add(row[2]); bins.add(row[1]); var bi = PWH.layout.binInfo(row[1]); if (bi) racks.add(bi.rack); });
      S.names = new Map(); (r[2] || []).forEach(function (row) { if (row[3] && !S.names.has(row[2])) S.names.set(row[2], row[3]); });
      S.parts = Array.from(parts).sort(); S.bins = Array.from(bins).concat(Array.from(racks)).sort();
    });
  }
  function save() { return PWH.db.setMeta('locks', S.data); }

  function rulesCard() {
    var li = ['m5.rule.swap', 'm5.rule.floor', 'm5.rule.special', 'm5.rule.lock', 'm5.rule.sim'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('');
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.rules.title')) + '</h2><p class="sub">' + esc(t('m5.rules.sub')) + '</p></div></div><ol class="m5rules">' + li + '</ol></section>';
  }
  function lockCard() {
    var items = S.data.items.slice().sort(function (a, b) { return b.at - a.at; });
    var list = S.type === 'part' ? S.parts : S.bins;
    var rows = items.map(function (l) {
      var c = S.confirm === l.id;
      return '<tr><td><span class="chip ' + (l.type === 'part' ? 'info' : 'pending') + '">' + esc(t('m5.type.' + l.type)) + '</span></td><td><span class="code">' + esc(l.code) + '</span>' + (l.type === 'part' && S.names.get(l.code) ? '<div class="sub2">' + esc(S.names.get(l.code)) + '</div>' : '') + '</td><td>' + esc(l.reason) + '</td><td>' + esc(l.by) + '<div class="sub2">' + fmt(l.at) + '</div></td>' +
        '<td class="num"><button class="btn sm' + (c ? ' confirm' : '') + '" data-m5="unlock" data-id="' + esc(l.id) + '">' + esc(t(c ? 'm5.unlock.confirm' : 'm5.unlock')) + '</button></td></tr>';
    }).join('');
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.lock.title')) + ' <span class="chip info">' + items.length + '</span></h2><p class="sub">' + esc(t('m5.lock.sub')) + '</p></div></div>' +
      '<form class="m5form" id="m5form" autocomplete="off"><div class="seg" role="group">' + ['part', 'bin'].map(function (k) { return '<button type="button" data-m5="type" data-v="' + k + '" aria-pressed="' + (S.type === k) + '">' + esc(t('m5.type.' + k)) + '</button>'; }).join('') + '</div>' +
      '<label class="m5f"><span>' + esc(t(S.type === 'part' ? 'm5.code.part' : 'm5.code.bin')) + '</span><input id="m5code" list="m5list" required placeholder="' + esc(t(S.type === 'part' ? 'm5.ph.part' : 'm5.ph.bin')) + '"></label>' +
      '<datalist id="m5list">' + list.slice(0, 4000).map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' +
      '<label class="m5f grow"><span>' + esc(t('m5.reason')) + '</span><input id="m5reason" required placeholder="' + esc(t('m5.ph.reason')) + '"></label>' +
      '<button class="btn primary" type="submit">' + esc(t('m5.lock')) + '</button></form>' +
      (S.msg ? '<div class="msg ' + S.msg[0] + '" role="status"><span>' + esc(S.msg[1]) + '</span></div>' : '') +
      (items.length ? '<div class="tablebox"><table class="m5tbl"><thead><tr><th>' + esc(t('m5.col.type')) + '</th><th>' + esc(t('m5.col.code')) + '</th><th>' + esc(t('m5.reason')) + '</th><th>' + esc(t('m5.col.by')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<p class="empty-note">' + esc(t('m5.none')) + '</p>') + '</section>';
  }
  function logCard() {
    var log = S.data.log.slice(-200).reverse();
    if (!log.length) return '';
    return '<section class="panel"><details><summary class="m5sum"><b>' + esc(t('m5.log.title')) + '</b> <span class="sub2">' + esc(t('m5.log.n', { n: S.data.log.length })) + '</span></summary><ul class="m5log">' +
      log.map(function (x) { return '<li><span class="chip ' + (x.act === 'lock' ? 'warn' : 'ok') + '">' + esc(t('m5.act.' + x.act)) + '</span> <span class="code">' + esc(x.code) + '</span> <span class="sub2">(' + esc(t('m5.type.' + x.type)) + ')</span> ' + (x.reason ? '— ' + esc(x.reason) + ' ' : '') + '<span class="sub2">' + esc(x.by) + ' · ' + fmt(x.at) + '</span></li>'; }).join('') + '</ul></details></section>';
  }
  function render() {
    S.root.innerHTML = '<div class="ph"><div class="ph-l"><div class="cap">' + esc(t('mod.cap', { n: 5 })) + '</div><h1>' + esc(t('nav.m5')) + '</h1><p class="lede">' + esc(t('m5.intro')) + '</p></div></div>' + rulesCard() + lockCard() + logCard();
    var f = $('#m5form'); if (f) f.addEventListener('submit', function (e) { e.preventDefault(); addLock(); });
  }
  function addLock() {
    var code = ($('#m5code').value || '').trim().toUpperCase(), reason = ($('#m5reason').value || '').trim();
    if (!code || !reason) return;
    var known = S.type === 'part' ? S.parts.indexOf(code) >= 0 || S.names.has(code) : S.bins.indexOf(code) >= 0;
    if (!known) { S.msg = ['bad', t('m5.err.unknown', { code: code })]; render(); return; }
    if (S.data.items.some(function (l) { return l.type === S.type && l.code === code; })) { S.msg = ['bad', t('m5.err.dup', { code: code })]; render(); return; }
    var now = Date.now(), it = { id: 'L' + now, type: S.type, code: code, reason: reason, by: who(), at: now };
    S.data.items.push(it); S.data.log.push({ act: 'lock', type: it.type, code: code, reason: reason, by: it.by, at: now });
    save().then(function () { S.msg = ['ok', t('m5.ok.locked', { code: code })]; render(); });
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-m5]'); if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-m5');
    if (a === 'type') { S.type = el.getAttribute('data-v'); S.msg = null; render(); }
    else if (a === 'unlock') {
      var id = el.getAttribute('data-id');
      if (S.confirm !== id) { S.confirm = id; render(); setTimeout(function () { if (S.confirm === id) { S.confirm = null; if (S.root && document.body.contains(S.root)) render(); } }, 4000); return; }
      S.confirm = null;
      var l = S.data.items.filter(function (x) { return x.id === id; })[0]; if (!l) return;
      S.data.items = S.data.items.filter(function (x) { return x.id !== id; });
      S.data.log.push({ act: 'unlock', type: l.type, code: l.code, reason: '', by: who(), at: Date.now() });
      save().then(function () { S.msg = ['ok', t('m5.ok.unlocked', { code: l.code })]; render(); });
    }
  });
  PWH.m5 = { mount: function (root) { S.root = root; root.innerHTML = '<h1>' + esc(t('nav.m5')) + '</h1>'; load().then(render); } };
})(window);
