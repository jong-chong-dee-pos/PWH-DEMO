/* Module 5: relocation rules (round 2, agreed 2026-11-09).
 *   A rule is a sentence in 3 slots: who (Parts | item types | all Parts) → what (must stay here only / may not move here /
 *   may not move out of here / never moves) → where (racks or bins, zones = rack rows, whole floors, clicked on the map).
 *   Item types (Packaging, Part ผลิตเอง …) can be renamed, added and removed; Parts get a type by search + tick.
 *   A Part's own rules beat its type's rules; rules for all Parts always count. Rules can be paused.
 *   Switches: no swap across floors; swap only Parts of the same type.
 *   Overview map: pick a Part or a type, every rack turns green (may go) / red (may not) / yellow (some levels).
 *   Report: Parts stored where a rule says they may not be (Module 4 suggests fixing them first).
 * Engine: rules.js. Every change is logged with who and when. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var ACTS = ['keep', 'deny', 'out', 'lock'];
  var TINT = { keep: '#22c55e', deny: '#ef4444', out: '#f59e0b', lock: '#94a3b8', off: '#55657e', some: '#eab308', here: '#38bdf8' };
  var S = { root: null, data: null, parts: [], names: new Map(), L: null, ml: [], match: null, fd: null, places: null,
    form: null, floor: 0, pmode: 'row', lastRack: null, kitF: null, kitV: null,
    view: { kind: 'type', code: '', type: null, floor: 0 }, tsel: null, ttab: 'search', tq: '', tpick: new Set(), tedit: null,
    confirm: null, msg: null, test: null, misQ: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return S.root && S.root.querySelector(s); }
  function nf(n) { return Number(n || 0).toLocaleString('en-US'); }
  function fmt(ms) { var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function who() { return (PWH.user && PWH.user.email) || t('m5.who.local'); }
  function floorTxt(id) { return t('m4.floor', { n: String(id || '').replace(/^F/, '') }); }
  function seg(items, cur, act, extra) { return '<div class="seg" role="group">' + items.map(function (i) { return '<button type="button" data-m5="' + act + '" data-v="' + i[0] + '"' + (extra || '') + ' aria-pressed="' + (cur === i[0]) + '">' + esc(i[1]) + '</button>'; }).join('') + '</div>'; }
  function chip(kind, txt) { return '<span class="chip ' + kind + '">' + esc(txt) + '</span>'; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function R() { return PWH.rules; }
  function typeName(id) { return R().typeName(S.data, id); }

  function load() {
    return Promise.all([R().load(), PWH.app.activeRows('matloc'), PWH.app.activeRows('bom'), PWH.db.getMeta('layout').catch(function () { return null; })]).then(function (r) {
      S.data = r[0]; S.data.types = S.data.types || []; S.data.partType = S.data.partType || {};
      var parts = new Set();
      (r[1] || []).forEach(function (row) { if (row[2]) parts.add(row[2]); });
      S.names = new Map(); (r[2] || []).forEach(function (row) { if (row[3] && !S.names.has(row[2])) S.names.set(row[2], row[3]); });
      S.parts = Array.from(parts).sort();
      S.L = r[3]; S.ml = r[1] || []; S.match = S.L ? PWH.layout.match(S.L, S.ml) : null; S.fd = null; S.places = null; S.misCache = null;
    });
  }
  function save(act, item) {
    S.data.log.push({ act: act, kind: item.kind, name: item.name, by: who(), at: Date.now() });
    S.misCache = null; S.viewCache = null;
    return R().save(S.data);
  }
  function rowFloor(row) {
    if (!S.L) return null;
    for (var i = 0; i < S.L.floors.length; i++) if (S.L.floors[i].racks.some(function (rk) { return R().zoneOf(rk.id) === row; })) return S.L.floors[i].id;
    return null;
  }
  function pickFor(code) {
    if (!S.L) return null;
    if (!S.fd) { S.fd = { L: S.L, match: S.match, bins: new Map() }; S.ml.forEach(function (row) { if (!row[2]) return; var a = S.fd.bins.get(row[2]); if (!a) S.fd.bins.set(row[2], (a = [])); a.push({ bin: row[1], stock: row[4] }); }); }
    return PWH.freq.pickOf(S.fd, code);
  }
  // every storage place on the layout: one per rack level
  function places() {
    if (S.places) return S.places;
    var out = [];
    if (S.match) S.match.rackById.forEach(function (rk, id) { var n = Math.max(1, rk.levels || 1); for (var l = 1; l <= n; l++) out.push({ bin: id + '-' + pad2(l), rack: id, row: R().zoneOf(id), floor: rk.floor, level: l }); });
    return (S.places = out);
  }

  // ---------- the rule form ----------
  function newForm() { return { who: { kind: 'type', parts: [], types: [] }, act: 'keep', area: R().emptyArea(), reason: '' }; }
  function formOf(r) { return { id: r.id, who: JSON.parse(JSON.stringify(r.who)), act: r.act, area: R().fixArea(JSON.parse(JSON.stringify(r.area || {}))), reason: r.reason || '', off: r.off, edit: true }; }
  function areaEmpty(a) { return !a.rows.length && !a.floors.length && !a.racks.length && !a.bins.length; }
  function formOk(f) {
    if (f.who.kind === 'part' && !f.who.parts.length) return t('m5.err.parts');
    if (f.who.kind === 'type' && !f.who.types.length) return t('m5.err.types');
    if (f.who.kind === 'all' && f.act === 'lock') return t('m5.err.lockall');
    if (f.act !== 'lock' && areaEmpty(f.area)) return t('m5.err.area');
    return '';
  }
  function toRule(f) {
    var w = { kind: f.who.kind, parts: f.who.kind === 'part' ? f.who.parts.slice() : [], types: f.who.kind === 'type' ? f.who.types.slice() : [] };
    return { id: f.id || 'R' + Date.now(), who: w, act: f.act, area: f.act === 'lock' ? R().emptyArea() : JSON.parse(JSON.stringify(f.area)), reason: (f.reason || '').trim(), off: !!f.off, by: who(), at: Date.now() };
  }
  function preview(f) { return R().ruleText(toRule(f), S.data); }

  function partsBox(list, id, del) {
    return '<div class="m4sugw m5sugw"><input id="' + id + '" placeholder="' + esc(t('m5.ph.part2')) + '" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="' + id + 'sug"><span class="m4sug" id="' + id + 'sug" role="listbox" hidden></span></div>' +
      (list ? '<div class="m5chips">' + list.map(function (v, i) { return '<span class="m5chip"><span class="code">' + esc(v) + '</span><span class="sub2">' + esc(S.names.get(v) || '') + '</span><button type="button" data-m5="' + del + '" data-i="' + i + '" aria-label="' + esc(t('m4.sim.del')) + ' ' + esc(v) + '">×</button></span>'; }).join('') + '</div>' : '');
  }
  function typeButtons(sel, act) {
    if (!S.data.types.length) return '<p class="sub2">' + esc(t('m5.t.none')) + '</p>';
    return '<div class="m5grid wide">' + S.data.types.map(function (tp) { return '<button type="button" class="m5pick" data-m5="' + act + '" data-v="' + esc(tp.id) + '" aria-pressed="' + (sel.indexOf(tp.id) >= 0) + '">' + esc(tp.name) + ' <small>' + nf(typeCount(tp.id)) + '</small></button>'; }).join('') + '</div>';
  }
  function typeCount(id) { var n = 0, pt = S.data.partType; for (var k in pt) if (pt[k] === id) n++; return n; }
  function selSummary(f) {
    var a = f.area, bits = [];
    function c(label, act, v, sub) { return '<span class="m5chip"><span class="code">' + esc(label) + '</span>' + (sub ? '<span class="sub2">' + esc(sub) + '</span>' : '') + '<button type="button" data-m5="' + act + '" data-v="' + esc(v) + '" aria-label="' + esc(t('m4.sim.del')) + ' ' + esc(label) + '">×</button></span>'; }
    a.floors.forEach(function (x) { bits.push(c(t('m5.a.wholefloor', { f: floorTxt(x) }), 'unfloor', x)); });
    a.rows.forEach(function (x) { bits.push(c(x, 'unrow', x, t('m5.a.zone') + (rowFloor(x) ? ' · ' + floorTxt(rowFloor(x)) : ''))); });
    a.racks.forEach(function (x) { bits.push(c(x, 'unrack', x, t('m5.a.alllv'))); });
    a.bins.forEach(function (x) { bits.push(c(x, 'unbin', x, '')); });
    return bits.length ? '<div class="m5chips">' + bits.join('') + '</div>' : '<p class="sub2 m5none">' + esc(t('m5.a.none')) + '</p>';
  }
  function levelPanel(f) {   // narrow a clicked rack to some of its levels
    var id = S.lastRack, rk = id && S.match && S.match.rackById.get(id);
    if (!rk || S.pmode !== 'rack') return '';
    var n = Math.max(1, rk.levels || 1), whole = f.area.racks.indexOf(id) >= 0, lv = [];
    for (var l = 1; l <= n; l++) lv.push('<button type="button" class="m5pick" data-m5="lv" data-v="' + l + '" aria-pressed="' + (f.area.bins.indexOf(id + '-' + pad2(l)) >= 0) + '">' + esc(t('m5.lv', { n: l })) + '</button>');
    return '<div class="m5lv"><span><b>' + esc(id) + '</b> <span class="sub2">' + esc(t('m5.lv.sub')) + '</span></span><div class="m5grid"><button type="button" class="m5pick" data-m5="lvall" aria-pressed="' + whole + '">' + esc(t('m5.lv.all')) + '</button>' + lv.join('') + '</div></div>';
  }
  function mapTools(kind, floor) {
    var fl = S.L.floors;
    return seg(fl.map(function (x, i) { return [String(i), floorTxt(x.id)]; }), String(floor), kind === 'f' ? 'floor' : 'vfloor') + '<span class="grow"></span>' +
      '<button type="button" class="btn sm" data-m5="zoom" data-k="' + kind + '" data-v="out" aria-label="' + esc(t('m4.h.zout')) + '">−</button><button type="button" class="btn sm" data-m5="zoom" data-k="' + kind + '" data-v="in" aria-label="' + esc(t('m4.h.zin')) + '">+</button><button type="button" class="btn sm" data-m5="zoom" data-k="' + kind + '" data-v="fit">' + esc(t('m4.h.fit')) + '</button>';
  }
  function canvasHtml(label) { return '<div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="' + esc(label) + '"></canvas><div id="m2tip" class="m2tip" hidden></div></div>'; }
  function mapBox(f) {
    if (!S.L) return '<div class="msg warn"><span>' + esc(t('m5.nolayout')) + '</span></div>';
    var cur = S.L.floors[S.floor] ? S.L.floors[S.floor].id : null, whole = f.area.floors.indexOf(cur) >= 0;
    return '<div class="m5slot"><div class="m5slh"><span class="m5n">3</span><b>' + esc(t('m5.slot.where')) + '</b><span class="sub2">' + esc(t('m5.map.hint.' + S.pmode)) + '</span></div>' +
      '<div class="m2mapcard m5map" id="m5mapf" data-fsbox><div class="m4htool">' + seg([['rack', t('m5.pm.rack')], ['row', t('m5.pm.row')], ['floor', t('m5.pm.floor')]], S.pmode, 'pmode') +
      (S.pmode === 'floor' ? '<button type="button" class="btn sm" data-m5="wholefloor" aria-pressed="' + whole + '">' + esc(t(whole ? 'm5.map.unwhole' : 'm5.map.whole', { f: floorTxt(cur) })) + '</button>' : '') +
      '<button type="button" class="btn sm" data-m5="clear">' + esc(t('m5.map.clear')) + '</button>' + mapTools('f', S.floor) + '</div>' + canvasHtml(t('m5.map.aria')) +
      '<div class="m5leg"><span><i style="background:' + TINT[f.act] + '"></i>' + esc(t('m5.leg.' + f.act)) + '</span><span><i style="background:' + TINT.off + '"></i>' + esc(t('m5.leg.off')) + '</span></div></div>' +
      '<div id="m5lvw">' + levelPanel(f) + '</div><div class="m5selw"><span class="sub2">' + esc(t('m5.a.picked')) + '</span><div id="m5sel">' + selSummary(f) + '</div></div></div>';
  }
  function formCard() {
    var f = S.form;
    if (!f) return '<section class="panel m5new"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.new.title')) + '</h2><p class="sub">' + esc(t('m5.new.sub3')) + '</p></div><button type="button" class="btn primary" data-m5="new">+ ' + esc(t('m5.new.btn')) + '</button></div></section>';
    var w = f.who, body = '';
    body += '<div class="m5slot"><div class="m5slh"><span class="m5n">1</span><b>' + esc(t('m5.slot.who')) + '</b></div>' + seg([['part', t('m5.wk.part')], ['type', t('m5.wk.type')], ['all', t('m5.wk.all')]], w.kind, 'wkind') +
      (w.kind === 'part' ? partsBox(w.parts, 'm5part', 'delpart') : w.kind === 'type' ? typeButtons(w.types, 'wtype') : '<p class="sub2">' + esc(t('m5.wk.all.sub')) + '</p>') + '</div>';
    body += '<div class="m5slot"><div class="m5slh"><span class="m5n">2</span><b>' + esc(t('m5.slot.act')) + '</b></div><div class="m5acts">' + ACTS.map(function (a) {
      var dis = a === 'lock' && w.kind === 'all';
      return '<button type="button" class="m5act a-' + a + '" data-m5="act" data-v="' + a + '" aria-pressed="' + (f.act === a) + '"' + (dis ? ' disabled' : '') + '><i aria-hidden="true"></i><span><b>' + esc(t('m5.act.' + a)) + '</b><small>' + esc(t('m5.act.' + a + '.sub')) + '</small></span></button>';
    }).join('') + '</div></div>';
    if (f.act !== 'lock') body += mapBox(f);
    body += '<div class="m5slot"><label class="m5f"><span>' + esc(t('m5.reason2')) + '</span><input id="m5reason" value="' + esc(f.reason) + '" placeholder="' + esc(t('m5.ph.reason')) + '"></label></div>';
    return '<section class="panel m5form2"><div class="chd"><div class="chd-l"><h2>' + esc(t(f.edit ? 'm5.edit.title' : 'm5.new.title')) + '</h2></div></div>' + body +
      '<div class="m5sum"><span class="sub2">' + esc(t('m5.preview')) + '</span> <b id="m5prev">' + esc(preview(f)) + '</b></div>' +
      (S.msg && S.msg[0] === 'bad' ? '<div class="msg bad" role="status"><span>' + esc(S.msg[1]) + '</span></div>' : '') +
      '<div class="m4acts"><button type="button" class="btn primary" data-m5="save">' + esc(t(f.edit ? 'm5.save.edit' : 'm5.save')) + '</button><button type="button" class="btn" data-m5="cancel">' + esc(t('m5.cancel')) + '</button></div></section>';
  }

  // ---------- rule list + switches ----------
  function switchHtml(id, on, title, sub) { return '<label class="m5switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span class="m5sw" aria-hidden="true"></span><span><b>' + esc(title) + '</b><span class="sub2">' + esc(sub) + '</span></span></label>'; }
  function listCard() {
    var rules = S.data.rules.slice().sort(function (a, b) { return b.at - a.at; });
    var dead = S.L ? R().deadEnds(S.data, places()) : [];
    var rows = rules.map(function (r) {
      var c = S.confirm === r.id, wk = (r.who || {}).kind;
      return '<tr class="' + (r.off ? 'm5off' : '') + '"><td>' + chip(r.act === 'keep' ? 'ok' : r.act === 'deny' ? 'error' : r.act === 'out' ? 'warn' : 'info', t('m5.act.' + r.act)) + '</td><td><b>' + esc(R().ruleText(r, S.data)) + '</b>' +
        (r.reason ? '<div class="sub2">' + esc(t('m5.reason')) + ': ' + esc(r.reason) + '</div>' : '') +
        (r.conv ? '<div class="m5conv">' + chip('warn', t('m5.conv')) + '<span class="sub2">' + esc(t('m5.conv.was', { n: r.was || '' })) + '</span></div>' : '') +
        '<div class="sub2">' + esc(t('m5.wk.' + wk)) + ' · ' + esc(r.by) + ' · ' + fmt(r.at) + '</div></td>' +
        '<td><label class="m5mini"><input type="checkbox" data-m5r="off" data-id="' + esc(r.id) + '"' + (r.off ? '' : ' checked') + '><span class="m5sw" aria-hidden="true"></span><span class="sub2">' + esc(t(r.off ? 'm5.paused' : 'm5.active')) + '</span></label></td>' +
        '<td class="num"><div class="m4acts m5rowacts"><button type="button" class="btn sm" data-m5="edit" data-id="' + esc(r.id) + '">' + esc(t('m5.edit')) + '</button><button type="button" class="btn sm danger' + (c ? ' confirm' : '') + '" data-m5="del" data-id="' + esc(r.id) + '">' + esc(t(c ? 'm5.del.confirm' : 'm5.del')) + '</button></div></td></tr>';
    }).join('');
    return '<section class="panel" id="m5list"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.list.title')) + ' <span class="chip info">' + rules.filter(function (r) { return !r.off; }).length + '</span></h2><p class="sub">' + esc(t('m5.list.sub2')) + '</p></div></div>' +
      (S.msg && S.msg[0] === 'ok' ? '<div class="msg ok" role="status"><span>' + esc(S.msg[1]) + '</span></div>' : '') +
      ((S.data.dropped || []).length ? '<div class="msg warn" role="status"><span>' + esc(t('m5.dropped', { n: S.data.dropped.join(', ') })) + '</span></div>' : '') +
      (dead.length ? '<div class="msg bad" role="status"><span>' + esc(t('m5.dead', { n: dead.map(function (x) { return x.subj.code ? x.subj.label : x.subj.label ? t('m5.w.type', { v: x.subj.label }) : t('m5.w.all'); }).join(', ') })) + '</span></div>' : '') +
      '<div class="m5sws">' + switchHtml('m5same', S.data.sameFloor, t('m5.same.title'), t(S.data.sameFloor ? 'm5.same.on' : 'm5.same.off')) +
      switchHtml('m5stype', S.data.sameType, t('m5.stype.title'), t(S.data.sameType ? 'm5.stype.on' : 'm5.stype.off')) + '</div>' +
      (rules.length ? '<div class="tablebox"><table class="m5tbl"><thead><tr><th>' + esc(t('m5.col.act')) + '</th><th>' + esc(t('m5.col.rule')) + '</th><th>' + esc(t('m5.col.state')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="empty-note">' + esc(t('m5.none2')) + '</p>') + '</section>';
  }

  // ---------- item types ----------
  function typesCard() {
    var list = S.data.types.map(function (tp) {
      var ed = S.tedit === tp.id, c = S.confirm === 'T:' + tp.id, open = S.tsel === tp.id, nr = S.data.rules.filter(function (r) { return r.who && r.who.kind === 'type' && r.who.types.indexOf(tp.id) >= 0; }).length;
      var name = ed ? '<input id="m5tname" value="' + esc(tp.name) + '" aria-label="' + esc(t('m5.t.name')) + '"><button type="button" class="btn sm primary" data-m5="tsave" data-v="' + esc(tp.id) + '">' + esc(t('m5.t.save')) + '</button>'
        : '<b>' + esc(tp.name) + '</b><span class="sub2">' + esc(t('m5.t.count', { n: nf(typeCount(tp.id)), r: nr })) + '</span>';
      return '<div class="m5type' + (open ? ' open' : '') + '"><div class="m5tname">' + name + '</div><div class="m5tacts">' +
        (ed ? '' : '<button type="button" class="btn sm' + (open ? ' primary' : '') + '" data-m5="topen" data-v="' + esc(tp.id) + '" aria-expanded="' + open + '">' + esc(t('m5.t.assign')) + '</button><button type="button" class="btn sm" data-m5="tedit" data-v="' + esc(tp.id) + '">' + esc(t('m5.t.rename')) + '</button>') +
        '<button type="button" class="btn sm danger' + (c ? ' confirm' : '') + '" data-m5="tdel" data-v="' + esc(tp.id) + '">' + esc(c ? t('m5.t.delc', { n: typeCount(tp.id), r: nr }) : t('m5.del')) + '</button></div></div>' + (open ? assignPanel(tp) : '');
    }).join('');
    return '<section class="panel" id="m5types"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.t.title')) + '</h2><p class="sub">' + esc(t('m5.t.sub')) + '</p></div><button type="button" class="btn sm" data-m5="tadd">+ ' + esc(t('m5.t.add')) + '</button></div>' +
      '<div class="m5types">' + (list || '<p class="empty-note">' + esc(t('m5.t.none')) + '</p>') + '</div></section>';
  }
  function partRows(codes, withType) {
    return codes.map(function (c) {
      var tp = S.data.partType[c];
      return '<tr><td><input type="checkbox" data-m5c="' + esc(c) + '"' + (S.tpick.has(c) ? ' checked' : '') + ' aria-label="' + esc(c) + '"></td><td><span class="code">' + esc(c) + '</span><div class="sub2">' + esc(S.names.get(c) || '–') + '</div></td>' +
        (withType ? '<td>' + (tp ? chip('info', typeName(tp)) : '<span class="sub2">' + esc(t('m5.t.notype')) + '</span>') + '</td>' : '') + '</tr>';
    }).join('');
  }
  function freqNoType() {
    var B = PWH.m4 && PWH.m4.base && PWH.m4.base(); if (!B) return null;
    return B.parts.filter(function (p) { return !S.data.partType[p.code] && (p.nRoute || p.n) > 0; }).sort(function (a, b) { return (b.nRoute || b.n) - (a.nRoute || a.n); }).slice(0, 60);
  }
  function assignPanel(tp) {
    var html = '<div class="m5assign">' + seg([['search', t('m5.t.tab.search')], ['freq', t('m5.t.tab.freq')], ['in', t('m5.t.tab.in', { n: nf(typeCount(tp.id)) })]], S.ttab, 'ttab');
    var codes = [], extra = '';
    if (S.ttab === 'search') {
      html += '<input id="m5tq" type="search" value="' + esc(S.tq) + '" placeholder="' + esc(t('m5.ph.part2')) + '" aria-label="' + esc(t('m5.ph.part2')) + '">';
      var q = S.tq.trim().toUpperCase();
      if (q) for (var i = 0; i < S.parts.length && codes.length < 200; i++) { var c = S.parts[i]; if (c.indexOf(q) >= 0 || String(S.names.get(c) || '').toUpperCase().indexOf(q) >= 0) codes.push(c); }
      if (!q) extra = '<p class="sub2">' + esc(t('m5.t.typeq')) + '</p>'; else if (!codes.length) extra = '<p class="sub2">' + esc(t('m4.sim.nohit')) + '</p>';
    } else if (S.ttab === 'freq') {
      var fl = freqNoType();
      if (!fl) extra = '<p class="sub2">' + esc(t('m5.t.needm4')) + '</p>';
      else { codes = fl.map(function (p) { return p.code; }); extra = '<p class="sub2">' + esc(t('m5.t.freqsub')) + '</p>'; }
    } else {
      var pt = S.data.partType; for (var k in pt) if (pt[k] === tp.id) codes.push(k); codes.sort();
    }
    html += extra;
    if (codes.length) {
      var allOn = codes.every(function (c) { return S.tpick.has(c); });
      html += '<div class="m5abar"><label class="m5chk"><input type="checkbox" data-m5all="1"' + (allOn ? ' checked' : '') + '> ' + esc(t('m5.t.all', { n: codes.length })) + '</label><span class="grow"></span>' +
        (S.ttab === 'in' ? '<button type="button" class="btn sm danger" data-m5="tunset"' + (S.tpick.size ? '' : ' disabled') + '>' + esc(t('m5.t.unset', { n: S.tpick.size })) + '</button>'
          : '<button type="button" class="btn sm primary" data-m5="tset" data-v="' + esc(tp.id) + '"' + (S.tpick.size ? '' : ' disabled') + '>' + esc(t('m5.t.set', { n: S.tpick.size, t: tp.name })) + '</button>') + '</div>' +
        '<div class="tablebox m5ptb"><table class="m5tbl"><tbody>' + partRows(codes, S.ttab !== 'in') + '</tbody></table></div>';
    }
    return html + '</div>';
  }

  // ---------- overview map ----------
  function viewSubj() { var V = S.view; return V.kind === 'part' ? (V.code ? { code: V.code } : null) : (V.type ? { type: V.type } : null); }
  function viewData() {
    var subj = viewSubj(); if (!subj || !S.match) return null;
    var key = JSON.stringify(subj); if (S.viewCache && S.viewCache.key === key) return S.viewCache;
    var cur = subj.code ? pickFor(subj.code) : null, curPick = cur && cur.status === 'ok' ? cur : null, byRack = new Map();
    places().forEach(function (pl) { var w = R().destOk(S.data, subj, pl, curPick), x = byRack.get(pl.rack) || { ok: 0, no: 0 }; if (w.length) x.no++; else x.ok++; byRack.set(pl.rack, x); });
    var lv = R().rulesFor(S.data, subj), src = subj.code && curPick ? R().checkMove(S.data, subj.code, curPick, null) : [];
    var nOk = 0, nNo = 0, nSome = 0; byRack.forEach(function (x) { if (!x.no) nOk++; else if (!x.ok) nNo++; else nSome++; });
    S.viewCache = { key: key, subj: subj, cur: curPick, byRack: byRack, rules: lv.levels[0].concat(lv.levels[1]), own: lv.own, type: lv.type, src: src, n: [nOk, nSome, nNo] };
    return S.viewCache;
  }
  function viewCard() {
    if (!S.L) return '';
    var V = S.view, D = viewData();
    var pick = V.kind === 'part' ? '<div class="m4sugw m5sugw"><input id="m5vpart" value="' + esc(V.code) + '" placeholder="' + esc(t('m5.ph.part2')) + '" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="m5vpartsug"><span class="m4sug" id="m5vpartsug" role="listbox" hidden></span></div>'
      : typeButtons(V.type ? [V.type] : [], 'vtype');
    var side = '';
    if (!D) side = '<p class="sub2">' + esc(t(V.kind === 'part' ? 'm5.v.pickpart' : 'm5.v.picktype')) + '</p>';
    else {
      var s = D.subj;
      side = '<h3>' + esc(s.code ? s.code : t('m5.w.type', { v: typeName(s.type) })) + '</h3>' + (s.code ? '<p class="sub2">' + esc(S.names.get(s.code) || '') + '</p>' : '') +
        (s.code ? '<p class="sub2">' + esc(t('m5.v.type', { t: D.type ? typeName(D.type) : t('m5.t.notype') })) + (D.cur ? ' · ' + esc(t('m5.v.now', { b: D.cur.bin })) : '') + '</p>' : '') +
        '<div class="m5vn"><span class="g">' + esc(t('m5.v.ok', { n: nf(D.n[0]) })) + '</span><span class="y">' + esc(t('m5.v.some', { n: nf(D.n[1]) })) + '</span><span class="r">' + esc(t('m5.v.no', { n: nf(D.n[2]) })) + '</span></div>' +
        (D.src.length ? '<div class="msg bad"><span>' + esc(t('m5.v.cannot')) + ' ' + esc(D.src.map(function (w) { return R().ruleText(w.rule, S.data); }).join(' / ')) + '</span></div>' : '') +
        '<h4>' + esc(t('m5.v.rules')) + '</h4>' + (D.rules.length ? '<ul class="m5vr">' + D.rules.map(function (r) { return '<li>' + chip(r.act === 'keep' ? 'ok' : r.act === 'deny' ? 'error' : r.act === 'out' ? 'warn' : 'info', t('m5.act.' + r.act)) + ' ' + esc(R().ruleText(r, S.data)) + '</li>'; }).join('') + '</ul>' : '<p class="sub2">' + esc(t('m5.v.norules')) + '</p>') +
        (s.code && D.own && D.type ? '<p class="sub2">' + esc(t('m5.v.ownwins')) + '</p>' : '') + (S.data.sameFloor && s.code ? '<p class="sub2">' + esc(t('m5.v.samefloor')) + '</p>' : '');
    }
    return '<section class="panel" id="m5view"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.v.title')) + '</h2><p class="sub">' + esc(t('m5.v.sub')) + '</p></div></div>' +
      '<div class="m5vpick">' + seg([['type', t('m5.wk.type')], ['part', t('m5.wk.part')]], V.kind, 'vkind') + pick + '</div>' +
      '<div class="m5vbody"><div class="m2mapcard m5map" id="m5mapv" data-fsbox><div class="m4htool">' + mapTools('v', V.floor) + '</div>' + canvasHtml(t('m5.v.title')) +
      '<div class="m5leg"><span><i style="background:' + TINT.keep + '"></i>' + esc(t('m5.v.leg.ok')) + '</span><span><i style="background:' + TINT.some + '"></i>' + esc(t('m5.v.leg.some')) + '</span><span><i style="background:' + TINT.deny + '"></i>' + esc(t('m5.v.leg.no')) + '</span>' + (V.kind === 'part' ? '<span><i style="background:' + TINT.here + '"></i>' + esc(t('m5.v.leg.here')) + '</span>' : '') + '</div></div>' +
      '<aside class="m5vside">' + side + '</aside></div></section>';
  }

  // ---------- Parts that already break a rule ----------
  function misplacedList() {
    if (S.misCache) return S.misCache;
    var out = [], B = PWH.m4 && PWH.m4.base && PWH.m4.base(), fq = new Map();
    if (B) B.parts.forEach(function (p) { fq.set(p.code, p.nRoute || p.n || 0); });
    if (S.L) S.parts.forEach(function (c) { var pk = pickFor(c); if (!pk || pk.status !== 'ok') return; var w = R().misplaced(S.data, c, pk); if (w.length) out.push({ code: c, pick: pk, why: w, n: fq.get(c) || 0 }); });
    out.sort(function (a, b) { return b.n - a.n || (a.code < b.code ? -1 : 1); });
    return (S.misCache = out);
  }
  function misCard() {
    var L = misplacedList(), q = S.misQ.trim().toUpperCase(), shown = q ? L.filter(function (x) { return x.code.indexOf(q) >= 0 || String(S.names.get(x.code) || '').toUpperCase().indexOf(q) >= 0; }) : L;
    return '<section class="panel" id="m5mis"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.mis.title')) + ' <span class="chip ' + (L.length ? 'warn' : 'ok') + '">' + nf(L.length) + '</span></h2><p class="sub">' + esc(t('m5.mis.sub')) + '</p></div></div>' +
      (L.length ? '<input id="m5misq" type="search" value="' + esc(S.misQ) + '" placeholder="' + esc(t('m5.ph.part2')) + '" aria-label="' + esc(t('m5.ph.part2')) + '">' +
        '<div class="tablebox m5ptb"><table class="m5tbl"><thead><tr><th>Part</th><th>' + esc(t('m5.mis.now')) + '</th><th class="num">' + esc(t('m5.mis.n')) + '</th><th>' + esc(t('m5.mis.rule')) + '</th></tr></thead><tbody>' +
        shown.slice(0, 200).map(function (x) { var tp = S.data.partType[x.code]; return '<tr><td><span class="code">' + esc(x.code) + '</span><div class="sub2">' + esc(S.names.get(x.code) || '–') + (tp ? ' · ' + esc(typeName(tp)) : '') + '</div></td><td><span class="loc">' + esc(x.pick.bin) + '</span></td><td class="num">' + nf(x.n) + '</td><td class="sub2">' + esc(x.why.map(function (w) { return R().ruleText(w.rule, S.data); }).join(' / ')) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + (shown.length > 200 ? '<p class="sub2">' + esc(t('m5.mis.more', { n: nf(shown.length - 200) })) + '</p>' : '')
        : '<p class="empty-note">' + esc(t('m5.mis.none')) + '</p>') + '</section>';
  }

  // ---------- tester, fixed facts, log ----------
  function testCard() {
    var T = S.test || {}, res = '';
    if (T.res) res = T.res.length ? '<div class="m5res bad"><b>' + esc(t('m4.rule.fail')) + '</b><ul>' + T.res.map(function (w) { return '<li>' + esc(R().reasonText(w, S.data)) + '</li>'; }).join('') + '</ul></div>' : '<div class="m5res ok"><b>&#10003; ' + esc(t('m5.test.ok')) + '</b></div>';
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.test.title')) + '</h2><p class="sub">' + esc(t('m5.test.sub')) + '</p></div></div>' +
      '<form class="m5testf" id="m5test" autocomplete="off"><label><span>Part A</span><input id="m5ta" list="m5parts" value="' + esc(T.a || '') + '" required></label><span class="m4x">⇄</span><label><span>Part B</span><input id="m5tb" list="m5parts" value="' + esc(T.b || '') + '" required></label><button class="btn" type="submit">' + esc(t('m5.test.btn')) + '</button></form>' + (T.info || '') + res + '</section>';
  }
  function logCard() {
    var log = S.data.log.slice(-200).reverse(); if (!log.length) return '';
    return '<section class="panel"><details><summary class="m5sum2"><b>' + esc(t('m5.log.title')) + '</b> <span class="sub2">' + esc(t('m5.log.n', { n: S.data.log.length })) + '</span></summary><ul class="m5log">' +
      log.map(function (x) { return '<li>' + chip(x.act === 'del' || x.act === 'tdel' ? 'ok' : 'warn', t('m5.act2.' + x.act)) + ' ' + esc(x.name || x.code || '') + ' <span class="sub2">' + esc(x.by) + ' · ' + fmt(x.at) + '</span></li>'; }).join('') + '</ul></details></section>';
  }
  function fixedCard() {
    var li = ['m5.rule.swap', 'm5.rule.own', 'm5.rule.special', 'm5.rule.deny', 'm5.rule.size', 'm5.rule.sim'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('');
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.rules.title')) + '</h2></div></div><ol class="m5rules">' + li + '</ol></section>';
  }
  function render() {
    var held = window.scrollY;
    S.root.innerHTML = '<div class="ph"><div class="ph-l"><h1>' + esc(t('nav.m5')) + '</h1><p class="lede">' + esc(t('m5.intro3')) + '</p></div></div>' +
      '<datalist id="m5parts">' + S.parts.slice(0, 5000).map(function (x) { return '<option value="' + esc(x) + '">' + esc(S.names.get(x) || '') + '</option>'; }).join('') + '</datalist>' +
      formCard() + '<div class="m5cols"><div>' + listCard() + '</div><div>' + typesCard() + '</div></div>' + viewCard() +
      '<div class="m5cols"><div>' + misCard() + '</div><div>' + testCard() + fixedCard() + logCard() + '</div></div>';
    window.scrollTo(0, held);
    wire();
    if ($('#m5mapf')) mountForm();
    if ($('#m5mapv')) mountView();
  }

  // ---------- maps ----------
  function picked(id) {
    var f = S.form, r = S.match && S.match.rackById.get(id); if (!f || !r) return 0;
    var a = f.area;
    if (a.rows.indexOf(R().zoneOf(id)) >= 0 || a.floors.indexOf(r.floor) >= 0 || a.racks.indexOf(id) >= 0) return 2;
    return a.bins.some(function (b) { return b.indexOf(id + '-') === 0; }) ? 1 : 0;
  }
  function kit(name, root, floor) {
    var K = S[name] || (S[name] = PWH.mapKit('pwh-m5' + name));
    K.M.root = root; K.M.canvas = null; K.M.layout = S.L; K.M.match = S.match; K.M.names = true; K.M.mode = '2d'; K.M.noDim = true; K.M.noNums = true;
    K.M.floor = Math.min(floor, S.L.floors.length - 1); K.M.sel = null; K.M.focus = null; K.M.hl = null; K.M.overlay = null;
    return K;
  }
  function mountForm() {
    var K = kit('kitF', $('#m5mapf'), S.floor);
    K.M.rackTint = function (r) { var p = picked(r.id); return p === 2 ? TINT[S.form.act] : p === 1 ? TINT.some : TINT.off; };
    K.M.onSelect = function (id) {
      K.M.sel = null; if (!id || !S.form) return;
      var a = S.form.area, rk = S.match.rackById.get(id);
      function tog(list, v) { var i = list.indexOf(v); if (i >= 0) list.splice(i, 1); else list.push(v); }
      if (S.pmode === 'row') tog(a.rows, R().zoneOf(id));
      else if (S.pmode === 'floor') { if (rk) tog(a.floors, rk.floor); }
      else { var had = a.racks.indexOf(id) >= 0 || a.bins.some(function (b) { return b.indexOf(id + '-') === 0; }); a.bins = a.bins.filter(function (b) { return b.indexOf(id + '-') !== 0; }); if (had) { tog(a.racks, id); S.lastRack = null; } else { a.racks.push(id); S.lastRack = id; } }
      refreshSel();
    };
    K.wireMap(); K.resize(); K.fit(); K.draw();
  }
  function mountView() {
    var K = kit('kitV', $('#m5mapv'), S.view.floor);
    var D = viewData();
    K.M.rackTint = function (r) {
      if (!D) return TINT.off;
      if (D.cur && D.cur.rack === r.id) return TINT.here;
      var x = D.byRack.get(r.id); if (!x) return TINT.off;
      return !x.no ? TINT.keep : !x.ok ? TINT.deny : TINT.some;
    };
    K.M.onSelect = function () { K.M.sel = null; };
    K.wireMap(); K.resize(); K.fit(); K.draw();
  }
  function refreshSel() {   // update the picked list, sentence and map without rebuilding the page (keeps zoom)
    var el = $('#m5sel'); if (el) el.innerHTML = selSummary(S.form);
    var lw = $('#m5lvw'); if (lw) lw.innerHTML = levelPanel(S.form);
    var pv = $('#m5prev'); if (pv) pv.textContent = preview(S.form);
    var cur = S.L.floors[S.floor] ? S.L.floors[S.floor].id : null, wb = $('[data-m5=wholefloor]');
    if (wb) { var on = S.form.area.floors.indexOf(cur) >= 0; wb.setAttribute('aria-pressed', on); wb.textContent = t(on ? 'm5.map.unwhole' : 'm5.map.whole', { f: floorTxt(cur) }); }
    if (S.kitF) S.kitF.draw();
  }

  // ---------- inputs ----------
  function partHits(q) {
    q = String(q || '').trim().toUpperCase(); if (!q) return [];
    var out = [];
    for (var i = 0; i < S.parts.length && out.length < 8; i++) { var c = S.parts[i], n = String(S.names.get(c) || '').toUpperCase(); if (c.indexOf(q) >= 0 || n.indexOf(q) >= 0) out.push(c); }
    return out;
  }
  function suggest(id, onPick) {
    var inp = $('#' + id), box = $('#' + id + 'sug'); if (!inp || !box) return;
    var hits = [];
    function show() {
      hits = partHits(inp.value);
      box.innerHTML = hits.length ? hits.map(function (c, i) { return '<span class="m4sgi" role="option" data-i="' + i + '"><span class="code">' + esc(c) + '</span><span class="sub2">' + esc(S.names.get(c) || '–') + '</span></span>'; }).join('') : (inp.value.trim() ? '<span class="m4sgn">' + esc(t('m4.sim.nohit')) + '</span>' : '');
      box.hidden = !box.innerHTML; inp.setAttribute('aria-expanded', String(!box.hidden));
    }
    inp.addEventListener('input', show);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (hits.length) onPick(hits[0]); } else if (e.key === 'Escape') box.hidden = true; });
    inp.addEventListener('blur', function () { setTimeout(function () { if (document.body.contains(box)) box.hidden = true; }, 150); });
    box.addEventListener('mousedown', function (e) { var it = e.target.closest('[data-i]'); if (!it) return; e.preventDefault(); onPick(hits[+it.getAttribute('data-i')]); });
  }
  function wire() {
    var tf = $('#m5test'); if (tf) tf.addEventListener('submit', function (e) { e.preventDefault(); runTest(); });
    var rs = $('#m5reason'); if (rs) rs.addEventListener('input', function () { S.form.reason = rs.value; });
    [['m5same', 'sameFloor', 'same'], ['m5stype', 'sameType', 'stype']].forEach(function (x) {
      var sw = $('#' + x[0]); if (sw) sw.addEventListener('change', function () { S.data[x[1]] = sw.checked; S.msg = null; save(sw.checked ? 'on' : 'off', { name: t('m5.' + x[2] + '.title') }).then(render); });
    });
    S.root.querySelectorAll('[data-m5r=off]').forEach(function (cb) { cb.addEventListener('change', function () { var r = S.data.rules.filter(function (x) { return x.id === cb.getAttribute('data-id'); })[0]; if (!r) return; r.off = !cb.checked; save(r.off ? 'pause' : 'resume', { name: R().ruleText(r, S.data) }).then(render); }); });
    suggest('m5part', function (code) { if (S.form.who.parts.indexOf(code) < 0) S.form.who.parts.push(code); S.msg = null; render(); var n = $('#m5part'); if (n) n.focus(); });
    suggest('m5vpart', function (code) { S.view.code = code; S.viewCache = null; var pk = pickFor(code); if (pk && pk.status === 'ok') S.view.floor = Math.max(0, S.L.floors.map(function (f) { return f.id; }).indexOf(pk.floor)); render(); });
    var tq = $('#m5tq'); if (tq) tq.addEventListener('input', function () { var pos = tq.selectionStart; S.tq = tq.value; S.tpick = new Set(); render(); var n = $('#m5tq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
    var mq = $('#m5misq'); if (mq) mq.addEventListener('input', function () { var pos = mq.selectionStart; S.misQ = mq.value; render(); var n = $('#m5misq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
    var tn = $('#m5tname'); if (tn) { tn.focus(); tn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var b = $('[data-m5=tsave]'); if (b) b.click(); } else if (e.key === 'Escape') { S.tedit = null; render(); } }); }
    S.root.querySelectorAll('[data-m5c]').forEach(function (cb) { cb.addEventListener('change', function () { var c = cb.getAttribute('data-m5c'); if (cb.checked) S.tpick.add(c); else S.tpick.delete(c); refreshAssign(); }); });
    var all = $('[data-m5all]'); if (all) all.addEventListener('change', function () { S.root.querySelectorAll('[data-m5c]').forEach(function (cb) { var c = cb.getAttribute('data-m5c'); cb.checked = all.checked; if (all.checked) S.tpick.add(c); else S.tpick.delete(c); }); refreshAssign(); });
  }
  function refreshAssign() {
    var tp = S.data.types.filter(function (x) { return x.id === S.tsel; })[0]; if (!tp) return;
    var b1 = $('[data-m5=tset]'); if (b1) { b1.disabled = !S.tpick.size; b1.textContent = t('m5.t.set', { n: S.tpick.size, t: tp.name }); }
    var b2 = $('[data-m5=tunset]'); if (b2) { b2.disabled = !S.tpick.size; b2.textContent = t('m5.t.unset', { n: S.tpick.size }); }
  }
  function runTest() {
    var a = ($('#m5ta').value || '').trim().toUpperCase(), b = ($('#m5tb').value || '').trim().toUpperCase();
    S.test = { a: a, b: b };
    var A = { code: a, pick: pickFor(a) }, B = { code: b, pick: pickFor(b) };
    S.test.info = '<p class="sub">' + esc(t('m5.test.info2', { a: a, x: A.pick && A.pick.bin || '–', ta: R().typeOf(S.data, a) ? typeName(R().typeOf(S.data, a)) : t('m5.t.notype'), b: b, y: B.pick && B.pick.bin || '–', tb: R().typeOf(S.data, b) ? typeName(R().typeOf(S.data, b)) : t('m5.t.notype') })) + '</p>';
    S.test.res = PWH.freq.checkSwap({ rules: S.data }, A, B);
    render();
  }
  function flash(kind, text) { S.msg = [kind, text]; }
  function lookIn(id) { return S.data.rules.filter(function (x) { return x.id === id; })[0]; }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-m5]'); if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-m5'), v = el.getAttribute('data-v'), f = S.form;
    if (a !== 'save') S.msg = null;
    // --- rule form
    if (a === 'new') { S.form = newForm(); S.lastRack = null; }
    else if (a === 'cancel') { S.form = null; }
    else if (a === 'wkind') { f.who.kind = v; if (v === 'all' && f.act === 'lock') f.act = 'deny'; }
    else if (a === 'wtype') { var wi = f.who.types.indexOf(v); if (wi >= 0) f.who.types.splice(wi, 1); else f.who.types.push(v); }
    else if (a === 'delpart') { f.who.parts.splice(+el.getAttribute('data-i'), 1); }
    else if (a === 'act') { f.act = v; }
    else if (a === 'pmode') { S.pmode = v; S.lastRack = null; }
    else if (a === 'floor') { S.floor = +v; }
    else if (a === 'wholefloor') { var cur = S.L.floors[S.floor].id, fi = f.area.floors.indexOf(cur); if (fi >= 0) f.area.floors.splice(fi, 1); else f.area.floors.push(cur); refreshSel(); return; }
    else if (a === 'clear') { f.area = R().emptyArea(); S.lastRack = null; refreshSel(); return; }
    else if (a === 'unrow') { f.area.rows = f.area.rows.filter(function (x) { return x !== v; }); refreshSel(); return; }
    else if (a === 'unfloor') { f.area.floors = f.area.floors.filter(function (x) { return x !== v; }); refreshSel(); return; }
    else if (a === 'unrack') { f.area.racks = f.area.racks.filter(function (x) { return x !== v; }); if (S.lastRack === v) S.lastRack = null; refreshSel(); return; }
    else if (a === 'unbin') { f.area.bins = f.area.bins.filter(function (x) { return x !== v; }); refreshSel(); return; }
    else if (a === 'lvall') { var id0 = S.lastRack; f.area.bins = f.area.bins.filter(function (b) { return b.indexOf(id0 + '-') !== 0; }); if (f.area.racks.indexOf(id0) < 0) f.area.racks.push(id0); refreshSel(); return; }
    else if (a === 'lv') {
      var id1 = S.lastRack, bn = id1 + '-' + pad2(+v), rk1 = S.match.rackById.get(id1), n1 = Math.max(1, rk1.levels || 1);
      if (f.area.racks.indexOf(id1) >= 0) { f.area.racks = f.area.racks.filter(function (x) { return x !== id1; }); f.area.bins.push(bn); }   // whole rack -> only the level clicked
      else { var bi = f.area.bins.indexOf(bn); if (bi >= 0) f.area.bins.splice(bi, 1); else f.area.bins.push(bn); }
      var mine = f.area.bins.filter(function (b) { return b.indexOf(id1 + '-') === 0; });
      if (mine.length === n1) { f.area.bins = f.area.bins.filter(function (b) { return b.indexOf(id1 + '-') !== 0; }); f.area.racks.push(id1); }
      refreshSel(); return;
    }
    else if (a === 'zoom') { var K = S[el.getAttribute('data-k') === 'v' ? 'kitV' : 'kitF']; if (!K || !K.M.canvas) return; if (v === 'fit') { K.fit(); K.draw(); } else { var c = K.M.canvas; K.zoomAt(c.clientWidth / 2, c.clientHeight / 2, v === 'in' ? 1.25 : 0.8); } return; }
    else if (a === 'save') {
      var err = formOk(f); if (err) { flash('bad', err); render(); return; }
      var r = toRule(f), idx = S.data.rules.map(function (x) { return x.id; }).indexOf(r.id), name = R().ruleText(r, S.data);
      if (idx >= 0) S.data.rules[idx] = r; else S.data.rules.push(r);
      S.form = null; flash('ok', t(idx >= 0 ? 'm5.ok.edited' : 'm5.ok.saved', { name: name }));
      save(idx >= 0 ? 'edit' : 'add', { name: name }).then(render); return;
    }
    else if (a === 'edit') {
      var rr = lookIn(el.getAttribute('data-id'));
      if (rr) { S.form = formOf(rr); S.lastRack = null; var ar = S.form.area, fl0 = ar.floors[0] || rowFloor(ar.rows[0]) || (ar.racks[0] && S.match && S.match.rackById.get(ar.racks[0]) || {}).floor; if (fl0 && S.L) S.floor = Math.max(0, S.L.floors.map(function (x) { return x.id; }).indexOf(fl0)); }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    else if (a === 'del') {
      var id = el.getAttribute('data-id');
      if (S.confirm !== id) { S.confirm = id; render(); setTimeout(function () { if (S.confirm === id) { S.confirm = null; if (S.root && document.body.contains(S.root)) render(); } }, 4000); return; }
      S.confirm = null;
      var dr = lookIn(id), dn = R().ruleText(dr, S.data);
      S.data.rules = S.data.rules.filter(function (x) { return x.id !== id; }); flash('ok', t('m5.ok.deleted', { name: dn })); save('del', { name: dn }).then(render); return;
    }
    // --- item types
    else if (a === 'tadd') { var nid = 'T' + Date.now(); S.data.types.push({ id: nid, name: t('m5.t.newname') }); S.tedit = nid; save('tadd', { name: t('m5.t.newname') }).then(render); return; }
    else if (a === 'tedit') { S.tedit = v; }
    else if (a === 'tsave') { var nm = ($('#m5tname').value || '').trim(), tp = S.data.types.filter(function (x) { return x.id === v; })[0]; if (!nm || !tp) return; var was = tp.name; tp.name = nm; S.tedit = null; save('tren', { name: was + ' → ' + nm }).then(render); return; }
    else if (a === 'topen') { S.tsel = S.tsel === v ? null : v; S.tpick = new Set(); S.ttab = 'search'; }
    else if (a === 'ttab') { S.ttab = v; S.tpick = new Set(); }
    else if (a === 'tset') { var tp2 = S.data.types.filter(function (x) { return x.id === v; })[0], n2 = S.tpick.size; S.tpick.forEach(function (c) { S.data.partType[c] = v; }); S.tpick = new Set(); save('tset', { name: t('m5.t.logset', { n: n2, t: tp2.name }) }).then(render); return; }
    else if (a === 'tunset') { var n3 = S.tpick.size; S.tpick.forEach(function (c) { delete S.data.partType[c]; }); S.tpick = new Set(); save('tunset', { name: t('m5.t.logunset', { n: n3, t: typeName(S.tsel) }) }).then(render); return; }
    else if (a === 'tdel') {
      var key = 'T:' + v;
      if (S.confirm !== key) { S.confirm = key; render(); setTimeout(function () { if (S.confirm === key) { S.confirm = null; if (S.root && document.body.contains(S.root)) render(); } }, 5000); return; }
      S.confirm = null;
      var tn = typeName(v), pt = S.data.partType;
      for (var k in pt) if (pt[k] === v) delete pt[k];
      S.data.rules.forEach(function (r) { if (r.who && r.who.kind === 'type') r.who.types = r.who.types.filter(function (x) { return x !== v; }); });
      S.data.rules = S.data.rules.filter(function (r) { return !(r.who && r.who.kind === 'type' && !r.who.types.length); });
      S.data.types = S.data.types.filter(function (x) { return x.id !== v; }); if (S.tsel === v) S.tsel = null; if (S.view.type === v) S.view.type = null;
      save('tdel', { name: tn }).then(render); return;
    }
    // --- overview map
    else if (a === 'vkind') { S.view.kind = v; S.viewCache = null; }
    else if (a === 'vtype') { S.view.type = S.view.type === v ? null : v; S.viewCache = null; }
    else if (a === 'vfloor') { S.view.floor = +v; }
    else return;
    render();
  });
  PWH.m5 = { _s: function () { return S; }, mount: function (root) { S.root = root; S.form = null; S.kitF = null; S.kitV = null; S.fd = null; S.viewCache = null; S.misCache = null; root.innerHTML = '<h1>' + esc(t('nav.m5')) + '</h1>'; load().then(render); } };
})(window);
