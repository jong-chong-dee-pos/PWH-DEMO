/* Module 5: relocation rules — three kinds, each read as one sentence, plus one switch.
 *   Part ห้ามย้าย          pick Parts by search
 *   พื้นที่ห้ามแตะ          click rack rows on the map (or a whole floor), then out / in / both
 *   Part ต้องอยู่ในพื้นที่    pick Parts, then click the rows they must stay in
 *   switch: no swap across floors (all Parts)
 * No zones. A tester checks any pair A <-> B. Engine: rules.js. Every change is logged with who and when. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var KINDS = ['lock', 'area', 'keep'];
  var TINT = { area: '#ef4444', keep: '#22c55e', off: '#55657e' };
  var S = { root: null, data: null, parts: [], partSet: new Set(), names: new Map(), L: null, ml: [], match: null,
    form: null, floor: 0, kit: null, confirm: null, msg: null, test: null };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return S.root && S.root.querySelector(s); }
  function fmt(ms) { var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function who() { return (PWH.user && PWH.user.email) || t('m5.who.local'); }
  function floorTxt(id) { return t('m4.floor', { n: String(id || '').replace(/^F/, '') }); }
  function seg(items, cur, act, extra) { return '<div class="seg" role="group">' + items.map(function (i) { return '<button type="button" data-m5="' + act + '" data-v="' + i[0] + '"' + (extra || '') + ' aria-pressed="' + (cur === i[0]) + '">' + esc(i[1]) + '</button>'; }).join('') + '</div>'; }
  function chip(kind, txt) { return '<span class="chip ' + kind + '">' + esc(txt) + '</span>'; }

  function load() {
    return Promise.all([PWH.rules.load(), PWH.app.activeRows('matloc'), PWH.app.activeRows('bom'), PWH.db.getMeta('layout').catch(function () { return null; })]).then(function (r) {
      S.data = r[0];
      var parts = new Set();
      (r[1] || []).forEach(function (row) { if (row[2]) parts.add(row[2]); });
      S.names = new Map(); (r[2] || []).forEach(function (row) { if (row[3] && !S.names.has(row[2])) S.names.set(row[2], row[3]); });
      S.parts = Array.from(parts).sort(); S.partSet = parts;
      S.L = r[3]; S.ml = r[1] || []; S.match = S.L ? PWH.layout.match(S.L, S.ml) : null; S.fd = null;
    });
  }
  function save(act, item) {
    S.data.log.push({ act: act, kind: item.kind, name: item.name, by: who(), at: Date.now() });
    return PWH.rules.save(S.data);
  }
  function rowFloor(row) {   // the floor a rack row is on
    if (!S.L) return null;
    for (var i = 0; i < S.L.floors.length; i++) if (S.L.floors[i].racks.some(function (rk) { return PWH.rules.zoneOf(rk.id) === row; })) return S.L.floors[i].id;
    return null;
  }

  // ---------- the form ----------
  function newForm(kind) { return { kind: kind, parts: [], area: PWH.rules.emptyArea(), dir: 'out', reason: '' }; }
  function formOf(r) { return { id: r.id, kind: r.kind, parts: (r.parts || []).slice(), area: JSON.parse(JSON.stringify(r.area || PWH.rules.emptyArea())), dir: r.dir || 'out', reason: r.reason || '', edit: true }; }
  function areaEmpty(a) { return !a.rows.length && !a.floors.length && !(a.bins || []).length; }
  function formOk(f) {
    if ((f.kind === 'lock' || f.kind === 'keep') && !f.parts.length) return t('m5.err.parts');
    if ((f.kind === 'area' || f.kind === 'keep') && areaEmpty(f.area)) return t('m5.err.area');
    return '';
  }
  function toRule(f) {
    var r = { id: f.id || 'R' + Date.now(), kind: f.kind, reason: (f.reason || '').trim(), by: who(), at: Date.now() };
    if (f.kind !== 'area') r.parts = f.parts.slice();
    if (f.kind !== 'lock') r.area = JSON.parse(JSON.stringify(f.area));
    if (f.kind === 'area') r.dir = f.dir;
    return r;
  }
  function preview(f) { return PWH.rules.ruleText(toRule(f)); }

  function kindPicker(cur) {
    return '<div class="m5kinds" role="group" aria-label="' + esc(t('m5.k.pick')) + '">' + KINDS.map(function (k) {
      return '<button type="button" class="m5kind k-' + k + '" data-m5="kind" data-v="' + k + '" aria-pressed="' + (cur === k) + '"><b>' + esc(t('m5.k.' + k)) + '</b><span>' + esc(t('m5.k.' + k + '.ex')) + '</span></button>';
    }).join('') + '</div>';
  }
  function partsBox(f) {
    return '<div class="m5step"><b>' + esc(t('m5.step.parts')) + '</b><div class="m4sugw m5sugw"><input id="m5part" placeholder="' + esc(t('m5.ph.part2')) + '" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="m5sug"><span class="m4sug" id="m5sug" role="listbox" hidden></span></div>' +
      '<div class="m5chips">' + f.parts.map(function (v, i) { return '<span class="m5chip"><span class="code">' + esc(v) + '</span><span class="sub2">' + esc(S.names.get(v) || '') + '</span><button type="button" data-m5="delpart" data-i="' + i + '" aria-label="' + esc(t('m4.sim.del')) + ' ' + esc(v) + '">×</button></span>'; }).join('') + '</div></div>';
  }
  function selSummary(f) {
    var a = f.area, bits = [];
    a.floors.forEach(function (x) { bits.push('<span class="m5chip"><span>' + esc(t('m5.a.wholefloor', { f: floorTxt(x) })) + '</span><button type="button" data-m5="unfloor" data-v="' + esc(x) + '" aria-label="' + esc(t('m4.sim.del')) + '">×</button></span>'); });
    a.rows.forEach(function (x) { bits.push('<span class="m5chip"><span class="code">' + esc(x) + '</span><span class="sub2">' + esc(rowFloor(x) ? floorTxt(rowFloor(x)) : '') + '</span><button type="button" data-m5="unrow" data-v="' + esc(x) + '" aria-label="' + esc(t('m4.sim.del')) + ' ' + esc(x) + '">×</button></span>'); });
    (a.bins || []).forEach(function (x, i) { bits.push('<span class="m5chip"><span class="code">' + esc(x) + '</span><button type="button" data-m5="unbin" data-i="' + i + '" aria-label="' + esc(t('m4.sim.del')) + '">×</button></span>'); });
    return bits.length ? '<div class="m5chips">' + bits.join('') + '</div>' : '<p class="sub2 m5none">' + esc(t('m5.a.none')) + '</p>';
  }
  function mapBox(f) {
    if (!S.L) return '<p class="msg warn"><span>' + esc(t('m5.nolayout')) + '</span></p>';
    var fl = S.L.floors, cur = fl[S.floor] ? fl[S.floor].id : null, whole = f.area.floors.indexOf(cur) >= 0;
    return '<div class="m5step"><b>' + esc(t(f.kind === 'keep' ? 'm5.step.keeparea' : 'm5.step.area')) + '</b><p class="sub2">' + esc(t('m5.map.hint')) + '</p>' +
      '<div class="m2mapcard m5map" id="m5map" data-fsbox><div class="m4htool">' + seg(fl.map(function (x, i) { return [String(i), floorTxt(x.id)]; }), String(S.floor), 'floor') +
      '<button type="button" class="btn sm" data-m5="wholefloor" aria-pressed="' + whole + '">' + esc(t(whole ? 'm5.map.unwhole' : 'm5.map.whole', { f: floorTxt(cur) })) + '</button>' +
      '<button type="button" class="btn sm" data-m5="clear">' + esc(t('m5.map.clear')) + '</button><span class="grow"></span>' +
      '<button type="button" class="btn sm" data-m5="zoom" data-v="out" aria-label="' + esc(t('m4.h.zout')) + '">−</button><button type="button" class="btn sm" data-m5="zoom" data-v="in" aria-label="' + esc(t('m4.h.zin')) + '">+</button><button type="button" class="btn sm" data-m5="zoom" data-v="fit">' + esc(t('m4.h.fit')) + '</button></div>' +
      '<div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="' + esc(t('m5.map.aria')) + '"></canvas><div id="m2tip" class="m2tip" hidden></div></div>' +
      '<div class="m5leg"><span><i style="background:' + TINT[f.kind] + '"></i>' + esc(t(f.kind === 'keep' ? 'm5.leg.keep' : 'm5.leg.area')) + '</span><span><i style="background:' + TINT.off + '"></i>' + esc(t('m5.leg.off')) + '</span></div></div>' +
      '<div class="m5selw"><span class="sub2">' + esc(t('m5.a.picked')) + '</span><div id="m5sel">' + selSummary(f) + '</div></div></div>';
  }
  function formCard() {
    var f = S.form;
    if (!f) return '<section class="panel m5new"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.new.title')) + '</h2><p class="sub">' + esc(t('m5.new.sub2')) + '</p></div></div>' + kindPicker(null) + '</section>';
    var body = '';
    if (f.kind === 'lock' || f.kind === 'keep') body += partsBox(f);
    if (f.kind === 'area') body += '<div class="m5step"><b>' + esc(t('m5.step.dir')) + '</b>' + seg([['out', t('m5.dir.out')], ['in', t('m5.dir.in')], ['both', t('m5.dir.both')]], f.dir, 'dir') + '</div>';
    if (f.kind !== 'lock') body += mapBox(f);
    body += '<div class="m5step"><label class="m5f"><span>' + esc(t('m5.reason2')) + '</span><input id="m5reason" value="' + esc(f.reason) + '" placeholder="' + esc(t('m5.ph.reason')) + '"></label></div>';
    return '<section class="panel m5form2"><div class="chd"><div class="chd-l"><h2>' + esc(t(f.edit ? 'm5.edit.title' : 'm5.new.title')) + '</h2></div></div>' +
      (f.edit ? '' : kindPicker(f.kind)) + body +
      '<div class="m5sum"><span class="sub2">' + esc(t('m5.preview')) + '</span> <b id="m5prev">' + esc(preview(f)) + '</b></div>' +
      (S.msg && S.msg[0] === 'bad' ? '<div class="msg bad" role="status"><span>' + esc(S.msg[1]) + '</span></div>' : '') +
      '<div class="m4acts"><button type="button" class="btn primary" data-m5="save">' + esc(t(f.edit ? 'm5.save.edit' : 'm5.save')) + '</button><button type="button" class="btn" data-m5="cancel">' + esc(t('m5.cancel')) + '</button></div></section>';
  }
  function listCard() {
    var rules = S.data.rules.slice().sort(function (a, b) { return b.at - a.at; });
    var rows = rules.map(function (r) {
      var c = S.confirm === r.id;
      return '<tr><td>' + chip(r.kind === 'keep' ? 'ok' : r.kind === 'area' ? 'error' : 'warn', t('m5.k.' + r.kind)) + '</td><td><b>' + esc(PWH.rules.ruleText(r)) + '</b>' +
        (r.reason ? '<div class="sub2">' + esc(t('m5.reason')) + ': ' + esc(r.reason) + '</div>' : '') +
        (r.conv ? '<div class="m5conv">' + chip('warn', t('m5.conv')) + '<span class="sub2">' + esc(t('m5.conv.was', { n: r.was || '' })) + '</span></div>' : '') + '</td>' +
        '<td>' + esc(r.by) + '<div class="sub2">' + fmt(r.at) + '</div></td>' +
        '<td class="num"><div class="m4acts m5rowacts"><button type="button" class="btn sm" data-m5="edit" data-id="' + esc(r.id) + '">' + esc(t('m5.edit')) + '</button><button type="button" class="btn sm danger' + (c ? ' confirm' : '') + '" data-m5="del" data-id="' + esc(r.id) + '">' + esc(t(c ? 'm5.del.confirm' : 'm5.del')) + '</button></div></td></tr>';
    }).join('');
    var sf = !!S.data.sameFloor;
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.list.title')) + ' <span class="chip info">' + (rules.length + (sf ? 1 : 0)) + '</span></h2><p class="sub">' + esc(t('m5.list.sub')) + '</p></div></div>' +
      (S.msg && S.msg[0] === 'ok' ? '<div class="msg ok" role="status"><span>' + esc(S.msg[1]) + '</span></div>' : '') +
      ((S.data.dropped || []).length ? '<div class="msg warn" role="status"><span>' + esc(t('m5.dropped', { n: S.data.dropped.join(', ') })) + '</span></div>' : '') +
      '<label class="m5switch"><input type="checkbox" id="m5same"' + (sf ? ' checked' : '') + '><span class="m5sw" aria-hidden="true"></span><span><b>' + esc(t('m5.same.title')) + '</b><span class="sub2">' + esc(t(sf ? 'm5.same.on' : 'm5.same.off')) + '</span></span></label>' +
      (rules.length ? '<div class="tablebox"><table class="m5tbl"><thead><tr><th>' + esc(t('m5.col.type')) + '</th><th>' + esc(t('m5.col.rule')) + '</th><th>' + esc(t('m5.col.by')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="empty-note">' + esc(t('m5.none')) + '</p>') + '</section>';
  }
  function testCard() {
    var T = S.test || {}, res = '';
    if (T.res) res = T.res.length ? '<div class="m5res bad"><b>' + esc(t('m4.rule.fail')) + '</b><ul>' + T.res.map(function (w) { return '<li>' + esc(PWH.rules.reasonText(w)) + '</li>'; }).join('') + '</ul></div>' : '<div class="m5res ok"><b>&#10003; ' + esc(t('m5.test.ok')) + '</b></div>';
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.test.title')) + '</h2><p class="sub">' + esc(t('m5.test.sub')) + '</p></div></div>' +
      '<form class="m5testf" id="m5test" autocomplete="off"><label><span>Part A</span><input id="m5ta" list="m5parts" value="' + esc(T.a || '') + '" required></label><span class="m4x">⇄</span><label><span>Part B</span><input id="m5tb" list="m5parts" value="' + esc(T.b || '') + '" required></label><button class="btn" type="submit">' + esc(t('m5.test.btn')) + '</button></form>' + (T.info || '') + res + '</section>';
  }
  function logCard() {
    var log = S.data.log.slice(-200).reverse(); if (!log.length) return '';
    return '<section class="panel"><details><summary class="m5sum2"><b>' + esc(t('m5.log.title')) + '</b> <span class="sub2">' + esc(t('m5.log.n', { n: S.data.log.length })) + '</span></summary><ul class="m5log">' +
      log.map(function (x) { return '<li>' + chip(x.act === 'del' ? 'ok' : 'warn', t('m5.act.' + x.act)) + ' ' + esc(x.name || x.code || '') + ' <span class="sub2">' + esc(x.by) + ' · ' + fmt(x.at) + '</span></li>'; }).join('') + '</ul></details></section>';
  }
  function fixedCard() {
    var li = ['m5.rule.swap', 'm5.rule.special', 'm5.rule.deny', 'm5.rule.size', 'm5.rule.sim'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('');
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.rules.title')) + '</h2></div></div><ol class="m5rules">' + li + '</ol></section>';
  }
  function render() {
    var held = window.scrollY;
    S.root.innerHTML = '<div class="ph"><div class="ph-l"><h1>' + esc(t('nav.m5')) + '</h1><p class="lede">' + esc(t('m5.intro2')) + '</p></div></div>' +
      '<datalist id="m5parts">' + S.parts.slice(0, 5000).map(function (x) { return '<option value="' + esc(x) + '">' + esc(S.names.get(x) || '') + '</option>'; }).join('') + '</datalist>' +
      formCard() + '<div class="m5cols"><div>' + listCard() + '</div><div>' + testCard() + fixedCard() + logCard() + '</div></div>';
    window.scrollTo(0, held);
    wire();
    if ($('#m5map')) mountMap();
  }

  // ---------- map picker ----------
  function rowSel(id) {
    var f = S.form, r = S.match && S.match.rackById.get(id); if (!f || !r) return false;
    return f.area.rows.indexOf(PWH.rules.zoneOf(id)) >= 0 || f.area.floors.indexOf(r.floor) >= 0 || (f.area.bins || []).indexOf(id) >= 0;
  }
  function mountMap() {
    var root = $('#m5map'); if (!root) return;
    var K = S.kit || (S.kit = PWH.mapKit('pwh-m5'));
    K.M.root = root; K.M.canvas = null; K.M.layout = S.L; K.M.match = S.match; K.M.names = true; K.M.mode = '2d'; K.M.noDim = true; K.M.noNums = true;
    K.M.floor = Math.min(S.floor, S.L.floors.length - 1); K.M.sel = null; K.M.focus = null; K.M.hl = null; K.M.overlay = null;
    K.M.rackTint = function (r) { return rowSel(r.id) ? TINT[S.form.kind] : TINT.off; };
    K.M.onSelect = function (id) {
      K.M.sel = null; if (!id || !S.form) return;
      var row = PWH.rules.zoneOf(id), a = S.form.area, i = a.rows.indexOf(row);
      if (i >= 0) a.rows.splice(i, 1); else a.rows.push(row);
      refreshSel();
    };
    K.wireMap(); K.resize(); K.fit(); K.draw();
  }
  function refreshSel() {   // update the picked list, sentence and map without rebuilding the page (keeps zoom)
    var el = $('#m5sel'); if (el) el.innerHTML = selSummary(S.form);
    var pv = $('#m5prev'); if (pv) pv.textContent = preview(S.form);
    var fl = S.L.floors, cur = fl[S.floor] ? fl[S.floor].id : null, wb = $('[data-m5=wholefloor]');
    if (wb) { var on = S.form.area.floors.indexOf(cur) >= 0; wb.setAttribute('aria-pressed', on); wb.textContent = t(on ? 'm5.map.unwhole' : 'm5.map.whole', { f: floorTxt(cur) }); }
    if (S.kit) S.kit.draw();
  }

  // ---------- Part search ----------
  function partHits(q) {
    q = String(q || '').trim().toUpperCase(); if (!q) return [];
    var out = [];
    for (var i = 0; i < S.parts.length && out.length < 8; i++) { var c = S.parts[i], n = String(S.names.get(c) || '').toUpperCase(); if (c.indexOf(q) >= 0 || n.indexOf(q) >= 0) out.push(c); }
    return out;
  }
  function wire() {
    var tf = $('#m5test'); if (tf) tf.addEventListener('submit', function (e) { e.preventDefault(); runTest(); });
    var rs = $('#m5reason'); if (rs) rs.addEventListener('input', function () { S.form.reason = rs.value; });
    var sw = $('#m5same'); if (sw) sw.addEventListener('change', function () { S.data.sameFloor = sw.checked; S.msg = null; save(sw.checked ? 'same_on' : 'same_off', { name: t('m5.same.title') }).then(render); });
    var inp = $('#m5part'), box = $('#m5sug');
    if (inp && box) {
      var hits = [];
      var add = function (code) {
        if (S.form.parts.indexOf(code) < 0) S.form.parts.push(code);
        S.msg = null; render(); var n = $('#m5part'); if (n) n.focus();
      };
      var show = function () {
        hits = partHits(inp.value);
        box.innerHTML = hits.length ? hits.map(function (c, i) { return '<span class="m4sgi" role="option" data-i="' + i + '"><span class="code">' + esc(c) + '</span><span class="sub2">' + esc(S.names.get(c) || '–') + '</span></span>'; }).join('') : (inp.value.trim() ? '<span class="m4sgn">' + esc(t('m4.sim.nohit')) + '</span>' : '');
        box.hidden = !box.innerHTML; inp.setAttribute('aria-expanded', String(!box.hidden));
      };
      inp.addEventListener('input', show);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (hits.length) add(hits[0]); } else if (e.key === 'Escape') box.hidden = true; });
      inp.addEventListener('blur', function () { setTimeout(function () { if (document.body.contains(box)) box.hidden = true; }, 150); });
      box.addEventListener('mousedown', function (e) { var it = e.target.closest('[data-i]'); if (!it) return; e.preventDefault(); add(hits[+it.getAttribute('data-i')]); });
    }
  }
  function pickFor(code) {
    if (!S.L) return null;
    if (!S.fd) { S.fd = { L: S.L, match: S.match, bins: new Map() }; S.ml.forEach(function (row) { if (!row[2]) return; var a = S.fd.bins.get(row[2]); if (!a) S.fd.bins.set(row[2], (a = [])); a.push({ bin: row[1], stock: row[4] }); }); }
    return PWH.freq.pickOf(S.fd, code);
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
    var a = el.getAttribute('data-m5'), v = el.getAttribute('data-v'), f = S.form;
    if (a !== 'save') S.msg = null;
    if (a === 'kind') { var nf = newForm(v); if (f) { nf.parts = f.parts; nf.reason = f.reason; if (v !== 'lock') nf.area = f.area; } S.form = nf; }
    else if (a === 'cancel') { S.form = null; }
    else if (a === 'delpart') { f.parts.splice(+el.getAttribute('data-i'), 1); }
    else if (a === 'dir') { f.dir = v; el.parentNode.querySelectorAll('[data-m5=dir]').forEach(function (b) { b.setAttribute('aria-pressed', b === el); }); refreshSel(); return; }
    else if (a === 'floor') { S.floor = +v; render(); return; }
    else if (a === 'wholefloor') { var cur = S.L.floors[S.floor].id, fi = f.area.floors.indexOf(cur); if (fi >= 0) f.area.floors.splice(fi, 1); else f.area.floors.push(cur); refreshSel(); return; }
    else if (a === 'clear') { f.area = PWH.rules.emptyArea(); refreshSel(); return; }
    else if (a === 'unrow') { f.area.rows = f.area.rows.filter(function (x) { return x !== v; }); refreshSel(); return; }
    else if (a === 'unfloor') { f.area.floors = f.area.floors.filter(function (x) { return x !== v; }); refreshSel(); return; }
    else if (a === 'unbin') { f.area.bins.splice(+el.getAttribute('data-i'), 1); refreshSel(); return; }
    else if (a === 'zoom') { var K = S.kit; if (!K || !K.M.canvas) return; if (v === 'fit') { K.fit(); K.draw(); } else { var c = K.M.canvas; K.zoomAt(c.clientWidth / 2, c.clientHeight / 2, v === 'in' ? 1.25 : 0.8); } return; }
    else if (a === 'save') {
      var err = formOk(f); if (err) { flash('bad', err); render(); return; }
      var r = toRule(f), idx = S.data.rules.map(function (x) { return x.id; }).indexOf(r.id), name = PWH.rules.ruleText(r);
      if (idx >= 0) S.data.rules[idx] = r; else S.data.rules.push(r);
      S.form = null; flash('ok', t(idx >= 0 ? 'm5.ok.edited' : 'm5.ok.saved', { name: name }));
      save(idx >= 0 ? 'edit' : 'add', { kind: r.kind, name: name }).then(render); return;
    }
    else if (a === 'edit') {
      var rr = S.data.rules.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      if (rr) { S.form = formOf(rr); var fl0 = rr.area && (rr.area.floors[0] || rowFloor(rr.area.rows[0])); if (fl0 && S.L) S.floor = Math.max(0, S.L.floors.map(function (x) { return x.id; }).indexOf(fl0)); }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    else if (a === 'del') {
      var id = el.getAttribute('data-id');
      if (S.confirm !== id) { S.confirm = id; render(); setTimeout(function () { if (S.confirm === id) { S.confirm = null; if (S.root && document.body.contains(S.root)) render(); } }, 4000); return; }
      S.confirm = null;
      var dr = S.data.rules.filter(function (x) { return x.id === id; })[0], dn = PWH.rules.ruleText(dr);
      S.data.rules = S.data.rules.filter(function (x) { return x.id !== id; }); flash('ok', t('m5.ok.deleted', { name: dn })); save('del', { kind: dr.kind, name: dn }).then(render); return;
    }
    else return;
    render();
  });
  PWH.m5 = { mount: function (root) { S.root = root; S.form = null; S.kit = null; S.fd = null; root.innerHTML = '<h1>' + esc(t('nav.m5')) + '</h1>'; load().then(render); } };
})(window);
