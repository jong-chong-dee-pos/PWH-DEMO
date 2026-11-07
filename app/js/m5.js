/* Module 5: relocation rules — easy to set, no typed conditions.
 * Choose a rule type, the Parts (or all), the source area, the destination area, allow / not allowed / lock,
 * give it a name, save. Zones are groups of rack rows picked from a list. A tester checks any pair A <-> B.
 * Engine: rules.js. Every change is logged with who and when. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var KINDS = ['lock', 'lockarea', 'allow', 'deny', 'floor'];
  var S = { root: null, data: null, parts: [], partSet: new Set(), names: new Map(), rows: [], floors: [], bins: [], picks: new Map(),
    form: null, zform: null, confirm: null, msg: null, test: null };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return S.root && S.root.querySelector(s); }
  function fmt(ms) { var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function who() { return (PWH.user && PWH.user.email) || t('m5.who.local'); }
  function fnum(id) { return String(id || '').replace(/^F/, ''); }
  function seg(items, cur, act, extra) { return '<div class="seg" role="group">' + items.map(function (i) { return '<button type="button" data-m5="' + act + '" data-v="' + i[0] + '"' + (extra || '') + ' aria-pressed="' + (cur === i[0]) + '">' + esc(i[1]) + '</button>'; }).join('') + '</div>'; }

  function load() {
    return Promise.all([PWH.rules.load(), PWH.app.activeRows('matloc'), PWH.app.activeRows('bom'), PWH.db.getMeta('layout').catch(function () { return null; })]).then(function (r) {
      S.data = r[0];
      var parts = new Set(), bins = new Set();
      (r[1] || []).forEach(function (row) { if (row[2]) parts.add(row[2]); bins.add(row[1]); });
      S.names = new Map(); (r[2] || []).forEach(function (row) { if (row[3] && !S.names.has(row[2])) S.names.set(row[2], row[3]); });
      S.parts = Array.from(parts).sort(); S.partSet = parts;
      var L = r[3], rows = new Set(), racks = [];
      S.floors = L ? L.floors.map(function (f) { return f.id; }) : [];
      if (L) L.floors.forEach(function (f) { f.racks.forEach(function (rk) { rows.add(PWH.rules.zoneOf(rk.id)); racks.push(rk.id); }); });
      S.rows = Array.from(rows).sort(function (a, b) { return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0); });
      S.bins = racks.concat(Array.from(bins)).sort();
      S.L = L; S.ml = r[1] || [];
    });
  }
  function save(act, item) {
    S.data.log.push({ act: act, kind: item.kind, name: item.name, by: who(), at: Date.now() });
    return PWH.rules.save(S.data);
  }

  // ---------- text ----------
  function areaText(a) {
    if (!a || a.type === 'any') return t('m5.area.any');
    var v = a.values || [];
    if (a.type === 'zone') v = v.map(function (id) { var z = S.data.zones.filter(function (x) { return x.id === id; })[0]; return z ? z.name : '?'; });
    if (a.type === 'floor') v = v.map(function (f) { return t('m4.floor', { n: fnum(f) }); });
    return t('m5.area.' + a.type, { v: v.join(', ') });
  }
  function subjText(sj) { return !sj || sj.all ? t('m5.subj.all') : t('m5.subj.parts', { v: sj.parts.join(', ') }); }
  function autoName(f) {
    var k = f.kind;
    if (k === 'lock') return t('m5.auto.lock', { v: f.subject.parts.join(', ') || '…' });
    if (k === 'lockarea') return t('m5.auto.lockarea', { from: areaText(f.from) });
    if (k === 'floor') return t('m5.auto.floor', { who: subjText(f.subject), to: areaText(f.to) });
    return t('m5.auto.move', { from: areaText(f.from), to: areaText(f.to), what: t('m5.verdict.' + k) }) + (f.subject.all ? '' : ' (' + f.subject.parts.join(', ') + ')');
  }
  // the stored rule for a form
  function toRule(f) {
    var r = { id: f.id || 'R' + Date.now(), name: (f.name || '').trim() || autoName(f), reason: (f.reason || '').trim(), by: who(), at: Date.now() };
    if (f.kind === 'lock') { r.kind = 'lock'; r.subject = { all: false, parts: f.subject.parts.slice() }; r.from = { type: 'any', values: [] }; r.to = { type: 'any', values: [] }; }
    else if (f.kind === 'lockarea') { r.kind = 'lock'; r.subject = { all: true, parts: [] }; r.from = f.from; r.to = { type: 'any', values: [] }; r.area = true; }
    else if (f.kind === 'floor') { r.kind = 'floor'; r.subject = f.subject; r.from = { type: 'any', values: [] }; r.to = { type: 'floor', values: f.to.values.slice() }; }
    else { r.kind = f.kind; r.subject = f.subject; r.from = f.from; r.to = f.to; }
    return r;
  }
  function formOf(r) {
    var kind = r.kind === 'lock' ? (r.area || (r.subject && r.subject.all) ? 'lockarea' : 'lock') : r.kind;
    return { id: r.id, kind: kind, name: r.name, reason: r.reason || '', subject: JSON.parse(JSON.stringify(r.subject || { all: true, parts: [] })), from: JSON.parse(JSON.stringify(r.from || { type: 'any', values: [] })), to: JSON.parse(JSON.stringify(r.to || { type: 'any', values: [] })), edit: true };
  }
  function newForm(kind) { return { kind: kind || 'lock', name: '', reason: '', subject: { all: kind !== 'lock' && kind !== 'floor', parts: [] }, from: { type: kind === 'lockarea' ? 'row' : 'row', values: [] }, to: { type: kind === 'floor' ? 'floor' : 'row', values: [] } }; }
  function formOk(f) {
    if ((f.kind === 'lock' || !f.subject.all) && !f.subject.parts.length) return t('m5.err.parts');
    if ((f.kind === 'lockarea' || f.kind === 'allow' || f.kind === 'deny') && f.from.type !== 'any' && !f.from.values.length) return t('m5.err.from');
    if ((f.kind === 'allow' || f.kind === 'deny' || f.kind === 'floor') && f.to.type !== 'any' && !f.to.values.length) return t('m5.err.to');
    if (f.kind === 'lockarea' && f.from.type === 'any') return t('m5.err.from');
    return '';
  }

  // ---------- pieces of the form ----------
  function chips(list, act, key) { return '<div class="m5chips">' + list.map(function (v, i) { return '<span class="m5chip"><span class="code">' + esc(v) + '</span><button type="button" data-m5="' + act + '" data-k="' + key + '" data-i="' + i + '" aria-label="' + esc(t('m4.sim.del')) + '">×</button></span>'; }).join('') + '</div>'; }
  function areaPicker(key, area, allowAny, onlyFloor) {
    var types = onlyFloor ? [['floor', t('m5.at.floor')]] : (allowAny ? [['any', t('m5.at.any')]] : []).concat([['row', t('m5.at.row')], ['zone', t('m5.at.zone')], ['bin', t('m5.at.bin')], ['floor', t('m5.at.floor')]]);
    var html = onlyFloor ? '' : seg(types, area.type, 'atype', ' data-k="' + key + '"');
    var v = area.values;
    if (area.type === 'row') html += '<div class="m5grid">' + S.rows.map(function (r) { return '<button type="button" class="m5pick" data-m5="aval" data-k="' + key + '" data-v="' + esc(r) + '" aria-pressed="' + (v.indexOf(r) >= 0) + '">' + esc(r) + '</button>'; }).join('') + '</div>';
    else if (area.type === 'zone') html += S.data.zones.length ? '<div class="m5grid wide">' + S.data.zones.map(function (z) { return '<button type="button" class="m5pick" data-m5="aval" data-k="' + key + '" data-v="' + esc(z.id) + '" aria-pressed="' + (v.indexOf(z.id) >= 0) + '" title="' + esc(z.rows.join(', ')) + '">' + esc(z.name) + ' <small>(' + z.rows.length + ')</small></button>'; }).join('') + '</div>' : '<p class="sub">' + esc(t('m5.zone.none')) + '</p>';
    else if (area.type === 'floor') html += '<div class="m5grid">' + S.floors.map(function (f) { return '<button type="button" class="m5pick" data-m5="aval" data-k="' + key + '" data-v="' + esc(f) + '" aria-pressed="' + (v.indexOf(f) >= 0) + '">' + esc(t('m4.floor', { n: fnum(f) })) + '</button>'; }).join('') + '</div>';
    else if (area.type === 'bin') html += '<div class="m5add"><input id="m5bin_' + key + '" list="m5bins" placeholder="' + esc(t('m5.ph.bin')) + '"><button type="button" class="btn sm" data-m5="addbin" data-k="' + key + '">' + esc(t('m5.add')) + '</button></div>' + chips(v, 'delval', key);
    return html;
  }
  function formCard() {
    var f = S.form;
    if (!f) return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.new.title')) + '</h2><p class="sub">' + esc(t('m5.new.sub')) + '</p></div><button class="btn primary" data-m5="new">+ ' + esc(t('m5.new.btn')) + '</button></div></section>';
    var steps = [];
    steps.push('<div class="m5step"><b>1. ' + esc(t('m5.step.kind')) + '</b>' + seg(KINDS.map(function (k) { return [k, t('m5.kind.' + k)]; }), f.kind, 'kind') + '<p class="sub">' + esc(t('m5.kind.' + f.kind + '.help')) + '</p></div>');
    var n = 2;
    if (f.kind === 'lock') steps.push('<div class="m5step"><b>' + (n++) + '. ' + esc(t('m5.step.parts')) + '</b><div class="m5add"><input id="m5part" list="m5parts" placeholder="' + esc(t('m5.ph.part')) + '"><button type="button" class="btn sm" data-m5="addpart">' + esc(t('m5.add')) + '</button></div>' + chips(f.subject.parts, 'delpart', 's') + '</div>');
    if (f.kind === 'allow' || f.kind === 'deny' || f.kind === 'floor') steps.push('<div class="m5step"><b>' + (n++) + '. ' + esc(t('m5.step.who')) + '</b>' + seg([['all', t('m5.subj.all')], ['parts', t('m5.subj.some')]], f.subject.all ? 'all' : 'parts', 'subj') +
      (f.subject.all ? '' : '<div class="m5add"><input id="m5part" list="m5parts" placeholder="' + esc(t('m5.ph.part')) + '"><button type="button" class="btn sm" data-m5="addpart">' + esc(t('m5.add')) + '</button></div>' + chips(f.subject.parts, 'delpart', 's')) + '</div>');
    if (f.kind === 'lockarea' || f.kind === 'allow' || f.kind === 'deny') steps.push('<div class="m5step"><b>' + (n++) + '. ' + esc(t('m5.step.from')) + '</b>' + areaPicker('from', f.from, f.kind !== 'lockarea') + '</div>');
    if (f.kind === 'allow' || f.kind === 'deny') steps.push('<div class="m5step"><b>' + (n++) + '. ' + esc(t('m5.step.to')) + '</b>' + areaPicker('to', f.to, false) + '</div>');
    if (f.kind === 'floor') steps.push('<div class="m5step"><b>' + (n++) + '. ' + esc(t('m5.step.floors')) + '</b>' + areaPicker('to', f.to, false, true) + '</div>');
    steps.push('<div class="m5step"><b>' + (n++) + '. ' + esc(t('m5.step.name')) + '</b><div class="m5name"><label class="m5f grow"><span>' + esc(t('m5.name')) + '</span><input id="m5name" value="' + esc(f.name) + '" placeholder="' + esc(autoName(f)) + '"></label><label class="m5f grow"><span>' + esc(t('m5.reason')) + '</span><input id="m5reason" value="' + esc(f.reason) + '" placeholder="' + esc(t('m5.ph.reason')) + '"></label></div></div>');
    return '<section class="panel m5form2"><div class="chd"><div class="chd-l"><h2>' + esc(t(f.edit ? 'm5.edit.title' : 'm5.new.title')) + '</h2></div></div>' + steps.join('') +
      '<div class="m5sum"><span class="sub2">' + esc(t('m5.preview')) + '</span> <b>' + esc(autoName(f)) + '</b></div>' +
      (S.msg && S.msg[0] === 'bad' ? '<div class="msg bad" role="status"><span>' + esc(S.msg[1]) + '</span></div>' : '') +
      '<div class="m4acts"><button class="btn primary" data-m5="save">' + esc(t(f.edit ? 'm5.save.edit' : 'm5.save')) + '</button><button class="btn" data-m5="cancel">' + esc(t('m5.cancel')) + '</button></div></section>';
  }
  function listCard() {
    var rules = S.data.rules.slice().sort(function (a, b) { return b.at - a.at; });
    var rows = rules.map(function (r) {
      var c = S.confirm === r.id, kind = r.kind === 'lock' ? (r.area || (r.subject && r.subject.all) ? 'lockarea' : 'lock') : r.kind;
      var detail = kind === 'lock' ? subjText(r.subject) : kind === 'lockarea' ? t('m5.from', { v: areaText(r.from) }) : kind === 'floor' ? subjText(r.subject) + ' → ' + areaText(r.to) : subjText(r.subject) + ' · ' + areaText(r.from) + ' → ' + areaText(r.to);
      return '<tr><td><span class="chip ' + (kind === 'allow' ? 'ok' : kind === 'deny' ? 'error' : kind === 'floor' ? 'info' : 'warn') + '">' + esc(t('m5.kind.' + kind)) + '</span></td><td><b>' + esc(r.name) + '</b><div class="sub2">' + esc(detail) + '</div>' + (r.reason ? '<div class="sub2">' + esc(t('m5.reason')) + ': ' + esc(r.reason) + '</div>' : '') + '</td><td>' + esc(r.by) + '<div class="sub2">' + fmt(r.at) + '</div></td>' +
        '<td class="num"><div class="m4acts" style="margin:0;justify-content:flex-end"><button class="btn sm" data-m5="edit" data-id="' + esc(r.id) + '">' + esc(t('m5.edit')) + '</button><button class="btn sm danger' + (c ? ' confirm' : '') + '" data-m5="del" data-id="' + esc(r.id) + '">' + esc(t(c ? 'm5.del.confirm' : 'm5.del')) + '</button></div></td></tr>';
    }).join('');
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.list.title')) + ' <span class="chip info">' + rules.length + '</span></h2><p class="sub">' + esc(t('m5.list.sub')) + '</p></div></div>' +
      (S.msg && S.msg[0] === 'ok' ? '<div class="msg ok" role="status"><span>' + esc(S.msg[1]) + '</span></div>' : '') +
      (rules.length ? '<div class="tablebox"><table class="m5tbl"><thead><tr><th>' + esc(t('m5.col.type')) + '</th><th>' + esc(t('m5.name')) + '</th><th>' + esc(t('m5.col.by')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="empty-note">' + esc(t('m5.none')) + '</p>') + '</section>';
  }
  function zonesCard() {
    var z = S.zform;
    var list = S.data.zones.map(function (x) { var c = S.confirm === x.id; return '<div class="m5zone"><b>' + esc(x.name) + '</b><span class="sub2">' + esc(x.rows.join(', ')) + '</span><span class="grow"></span><button class="btn sm" data-m5="zedit" data-id="' + esc(x.id) + '">' + esc(t('m5.edit')) + '</button><button class="btn sm danger' + (c ? ' confirm' : '') + '" data-m5="zdel" data-id="' + esc(x.id) + '">' + esc(t(c ? 'm5.del.confirm' : 'm5.del')) + '</button></div>'; }).join('');
    var form = z ? '<div class="m5step"><label class="m5f"><span>' + esc(t('m5.zone.name')) + '</span><input id="m5zname" value="' + esc(z.name) + '" placeholder="' + esc(t('m5.zone.ph')) + '"></label><b>' + esc(t('m5.zone.rows')) + '</b><div class="m5grid">' + S.rows.map(function (r) { return '<button type="button" class="m5pick" data-m5="zrow" data-v="' + esc(r) + '" aria-pressed="' + (z.rows.indexOf(r) >= 0) + '">' + esc(r) + '</button>'; }).join('') + '</div>' +
      '<div class="m4acts"><button class="btn primary" data-m5="zsave">' + esc(t('m5.zone.save')) + '</button><button class="btn" data-m5="zcancel">' + esc(t('m5.cancel')) + '</button></div></div>' : '<button class="btn" data-m5="znew">+ ' + esc(t('m5.zone.new')) + '</button>';
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.zone.title')) + '</h2><p class="sub">' + esc(t('m5.zone.sub')) + '</p></div></div>' + (list ? '<div class="m5zones">' + list + '</div>' : '') + form + '</section>';
  }
  function testCard() {
    var T = S.test || {}, res = '';
    if (T.res) res = T.res.length ? '<div class="m5res bad"><b>' + esc(t('m4.rule.fail')) + '</b><ul>' + T.res.map(function (w) { return '<li>' + esc(PWH.rules.reasonText(w)) + '</li>'; }).join('') + '</ul></div>' : '<div class="m5res ok"><b>&#10003; ' + esc(t('m5.test.ok')) + '</b></div>';
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.test.title')) + '</h2><p class="sub">' + esc(t('m5.test.sub')) + '</p></div></div>' +
      '<form class="m4add" id="m5test" autocomplete="off"><label><span>Part A</span><input id="m5ta" list="m5parts" value="' + esc(T.a || '') + '" required></label><span class="m4x">⇄</span><label><span>Part B</span><input id="m5tb" list="m5parts" value="' + esc(T.b || '') + '" required></label><button class="btn" type="submit">' + esc(t('m5.test.btn')) + '</button></form>' + (T.info || '') + res + '</section>';
  }
  function logCard() {
    var log = S.data.log.slice(-200).reverse(); if (!log.length) return '';
    return '<section class="panel"><details><summary class="m5sum2"><b>' + esc(t('m5.log.title')) + '</b> <span class="sub2">' + esc(t('m5.log.n', { n: S.data.log.length })) + '</span></summary><ul class="m5log">' +
      log.map(function (x) { return '<li><span class="chip ' + (x.act === 'del' || x.act === 'unlock' ? 'ok' : 'warn') + '">' + esc(t('m5.act.' + x.act)) + '</span> ' + esc(x.name || x.code || '') + ' <span class="sub2">' + esc(x.by) + ' · ' + fmt(x.at) + '</span></li>'; }).join('') + '</ul></details></section>';
  }
  function fixedCard() {
    var li = ['m5.rule.swap', 'm5.rule.floor2', 'm5.rule.special', 'm5.rule.deny', 'm5.rule.size', 'm5.rule.sim'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('');
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.rules.title')) + '</h2></div></div><ol class="m5rules">' + li + '</ol></section>';
  }
  function render() {
    S.root.innerHTML = '<div class="ph"><div class="ph-l"><div class="cap">' + esc(t('mod.cap', { n: 5 })) + '</div><h1>' + esc(t('nav.m5')) + '</h1><p class="lede">' + esc(t('m5.intro2')) + '</p></div></div>' +
      '<datalist id="m5parts">' + S.parts.slice(0, 5000).map(function (x) { return '<option value="' + esc(x) + '">' + esc(S.names.get(x) || '') + '</option>'; }).join('') + '</datalist>' +
      '<datalist id="m5bins">' + S.bins.slice(0, 5000).map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' +
      '<div class="m5cols"><div>' + formCard() + listCard() + '</div><div>' + zonesCard() + testCard() + fixedCard() + logCard() + '</div></div>';
    var tf = $('#m5test'); if (tf) tf.addEventListener('submit', function (e) { e.preventDefault(); runTest(); });
    ['m5name', 'm5reason'].forEach(function (id) { var el = $('#' + id); if (el) el.addEventListener('input', function () { S.form[id === 'm5name' ? 'name' : 'reason'] = el.value; }); });
    var zn = $('#m5zname'); if (zn) zn.addEventListener('input', function () { S.zform.name = zn.value; });
  }
  function pickFor(code) {
    if (!S.L) return null;
    if (!S.fd) S.fd = { L: S.L, match: PWH.layout.match(S.L, S.ml), bins: new Map() };
    var d = S.fd; if (!d.bins.size) S.ml.forEach(function (row) { if (!row[2]) return; var a = d.bins.get(row[2]); if (!a) d.bins.set(row[2], (a = [])); a.push({ bin: row[1], stock: row[4] }); });
    return PWH.freq.pickOf(d, code);
  }
  function runTest() {
    var a = ($('#m5ta').value || '').trim().toUpperCase(), b = ($('#m5tb').value || '').trim().toUpperCase();
    S.test = { a: a, b: b };
    var A = { code: a, pick: pickFor(a) }, B = { code: b, pick: pickFor(b) };
    S.test.info = '<p class="sub">' + esc(t('m5.test.info', { a: a, x: A.pick && A.pick.bin || '–', b: b, y: B.pick && B.pick.bin || '–' })) + '</p>';
    S.test.res = PWH.freq.checkSwap({ rules: S.data }, A, B);
    render();
  }
  function flash(kind, text) { S.msg = [kind, text]; }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-m5]'); if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-m5'), v = el.getAttribute('data-v'), k = el.getAttribute('data-k'), f = S.form;
    if (a !== 'save') S.msg = null;
    if (a === 'new') { S.form = newForm('lock'); }
    else if (a === 'cancel') { S.form = null; }
    else if (a === 'kind') { var nf = newForm(v); nf.name = f.name; nf.reason = f.reason; nf.id = f.id; nf.edit = f.edit; if (f.subject.parts.length) { nf.subject.parts = f.subject.parts; } S.form = nf; }
    else if (a === 'subj') { f.subject.all = v === 'all'; }
    else if (a === 'addpart') { var inp = $('#m5part'), c = (inp.value || '').trim().toUpperCase(); if (c && S.partSet.has(c) && f.subject.parts.indexOf(c) < 0) f.subject.parts.push(c); else if (c && !S.partSet.has(c)) flash('bad', t('m5.err.unknown', { code: c })); }
    else if (a === 'delpart') { f.subject.parts.splice(+el.getAttribute('data-i'), 1); }
    else if (a === 'atype') { f[k] = { type: v, values: [] }; }
    else if (a === 'aval') { var vs = f[k].values, i = vs.indexOf(v); if (i >= 0) vs.splice(i, 1); else vs.push(v); }
    else if (a === 'addbin') { var bi = $('#m5bin_' + k), bc = (bi.value || '').trim().toUpperCase(); if (bc && S.bins.indexOf(bc) >= 0 && f[k].values.indexOf(bc) < 0) f[k].values.push(bc); else if (bc && S.bins.indexOf(bc) < 0) flash('bad', t('m5.err.unknown', { code: bc })); }
    else if (a === 'delval') { f[k].values.splice(+el.getAttribute('data-i'), 1); }
    else if (a === 'save') {
      var err = formOk(f); if (err) { flash('bad', err); render(); return; }
      var r = toRule(f), idx = S.data.rules.map(function (x) { return x.id; }).indexOf(r.id);
      if (idx >= 0) S.data.rules[idx] = r; else S.data.rules.push(r);
      S.form = null; flash('ok', t(idx >= 0 ? 'm5.ok.edited' : 'm5.ok.saved', { name: r.name }));
      save(idx >= 0 ? 'edit' : 'add', r).then(render); return;
    }
    else if (a === 'edit') { var rr = S.data.rules.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (rr) S.form = formOf(rr); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (a === 'del' || a === 'zdel') {
      var id = el.getAttribute('data-id');
      if (S.confirm !== id) { S.confirm = id; render(); setTimeout(function () { if (S.confirm === id) { S.confirm = null; if (S.root && document.body.contains(S.root)) render(); } }, 4000); return; }
      S.confirm = null;
      if (a === 'del') { var dr = S.data.rules.filter(function (x) { return x.id === id; })[0]; S.data.rules = S.data.rules.filter(function (x) { return x.id !== id; }); flash('ok', t('m5.ok.deleted', { name: dr.name })); save('del', dr).then(render); return; }
      var used = S.data.rules.some(function (r) { return [r.from, r.to].some(function (ar) { return ar && ar.type === 'zone' && ar.values.indexOf(id) >= 0; }); });
      if (used) { flash('ok', t('m5.zone.used')); render(); return; }
      var dz = S.data.zones.filter(function (x) { return x.id === id; })[0]; S.data.zones = S.data.zones.filter(function (x) { return x.id !== id; }); save('zdel', { name: dz.name }).then(render); return;
    }
    else if (a === 'znew') { S.zform = { name: '', rows: [] }; }
    else if (a === 'zcancel') { S.zform = null; }
    else if (a === 'zedit') { var zz = S.data.zones.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (zz) S.zform = { id: zz.id, name: zz.name, rows: zz.rows.slice() }; }
    else if (a === 'zrow') { var zr = S.zform.rows, zi = zr.indexOf(v); if (zi >= 0) zr.splice(zi, 1); else zr.push(v); }
    else if (a === 'zsave') {
      var z = S.zform; z.name = (z.name || '').trim();
      if (!z.name || !z.rows.length) { flash('bad', t('m5.zone.err')); render(); return; }
      var zid = z.id || 'Z' + Date.now(), ex = S.data.zones.filter(function (x) { return x.id === zid; })[0];
      if (ex) { ex.name = z.name; ex.rows = z.rows.slice(); } else S.data.zones.push({ id: zid, name: z.name, rows: z.rows.slice() });
      S.zform = null; save(ex ? 'zedit' : 'zadd', { name: z.name }).then(render); return;
    }
    render();
  });
  PWH.m5 = { mount: function (root) { S.root = root; S.form = null; S.zform = null; S.fd = null; root.innerHTML = '<h1>' + esc(t('nav.m5')) + '</h1>'; load().then(render); } };
})(window);
