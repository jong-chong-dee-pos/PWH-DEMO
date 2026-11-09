/* Module 5: relocation rules (layout v45, agreed 2026-11-09).
 * One page, top to bottom, full width:
 *   1. Rules: table (what · who · where · reason · in use) with the create / edit form above it, and ONE map on the right.
 *      The map changes role: picking the area of the rule being made, showing the area of a clicked rule,
 *      or showing where a Part / item type may go (green) or not (red) under all rules together.
 *   2. Item types: one card per type plus "not grouped yet"; the chosen card lists its Parts to tick and move.
 *   3. Parts that break a rule now (table).
 *   4. Test a swap · history.
 * A rule is a sentence in 3 slots: who (Parts | item types | all Parts) → what → where (racks or bins, zones = rack rows, floors).
 * "No swap across floors" and "swap only with the same type" are rule kinds now (no page switches).
 * Engine: rules.js. Every change is logged with who and when. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var TINT = { keep: '#22c55e', deny: '#ef4444', lock: '#f59e0b', src: '#38bdf8', off: '#55657e', some: '#eab308', here: '#a78bfa' };
  var CHIP = { lock: 'warn', deny: 'error', allow: 'ok', pair: 'info' };
  var S = { root: null, data: null, parts: [], names: new Map(), L: null, ml: [], match: null, fd: null, places: null,
    form: null, ptarget: 'dest', pmode: 'row', lastRack: null, kit: null, floor: 0, mode: 'view', selRule: null,
    view: { kind: 'type', code: '', type: null }, card: '_none', tq: '', tpick: new Set(), tedit: null, moveTo: '',
    confirm: null, msg: null, test: null, misQ: '' };
  var NONE = '_none';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return S.root && S.root.querySelector(s); }
  function nf(n) { return Number(n || 0).toLocaleString('en-US'); }
  function fmt(ms) { var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function who() { return (PWH.user && PWH.user.email) || t('m5.who.local'); }
  function floorTxt(id) { return t('m4.floor', { n: String(id || '').replace(/^F/, '') }); }
  function seg(items, cur, act, extra) { return '<div class="seg" role="group">' + items.map(function (i) { return '<button type="button" data-m5="' + act + '" data-v="' + i[0] + '"' + (extra || '') + ' aria-pressed="' + (cur === i[0]) + '">' + esc(i[1]) + '</button>'; }).join('') + '</div>'; }
  function chip(kind, txt) { return '<span class="chip ' + kind + '">' + esc(txt) + '</span>'; }
  function loc(b) { return '<span class="loc">' + esc(b) + '</span>'; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function R() { return PWH.rules; }
  function typeName(id) { return R().typeName(S.data, id); }
  function freqMap() {
    var B = PWH.m4 && PWH.m4.base && PWH.m4.base(); if (!B) return null;
    if (S.fq && S.fq.B === B) return S.fq.m;
    var m = new Map(); B.parts.forEach(function (p) { m.set(p.code, p.nRoute || p.n || 0); }); S.fq = { B: B, m: m }; return m;
  }

  function load() {
    return Promise.all([R().load(), PWH.app.activeRows('matloc'), PWH.app.activeRows('bom'), PWH.db.getMeta('layout').catch(function () { return null; })]).then(function (r) {
      S.data = r[0]; S.data.types = S.data.types || []; S.data.partType = S.data.partType || {};
      var parts = new Set();
      (r[1] || []).forEach(function (row) { if (row[2]) parts.add(row[2]); });
      S.names = new Map(); (r[2] || []).forEach(function (row) { if (row[3] && !S.names.has(row[2])) S.names.set(row[2], row[3]); });
      S.parts = Array.from(parts).sort();
      S.L = r[3]; S.ml = r[1] || []; S.match = S.L ? PWH.layout.match(S.L, S.ml) : null; S.fd = null; S.places = null; S.misCache = null; S.viewCache = null;
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
  function floorIndex(id) { return S.L ? Math.max(0, S.L.floors.map(function (f) { return f.id; }).indexOf(id)) : 0; }
  function pickFor(code) {
    if (!S.L) return null;
    if (!S.fd) { S.fd = { L: S.L, match: S.match, bins: new Map() }; S.ml.forEach(function (row) { if (!row[2]) return; var a = S.fd.bins.get(row[2]); if (!a) S.fd.bins.set(row[2], (a = [])); a.push({ bin: row[1], stock: row[4] }); }); }
    return PWH.freq.pickOf(S.fd, code);
  }
  function places() {   // every storage place on the layout: one per rack level
    if (S.places) return S.places;
    var out = [];
    if (S.match) S.match.rackById.forEach(function (rk, id) { var n = Math.max(1, rk.levels || 1); for (var l = 1; l <= n; l++) out.push({ bin: id + '-' + pad2(l), rack: id, row: R().zoneOf(id), floor: rk.floor, level: l }); });
    return (S.places = out);
  }
  function typeCount(id) { var n = 0, pt = S.data.partType; for (var k in pt) if (pt[k] === id) n++; return n; }
  function rulesOfType(id) { return S.data.rules.filter(function (r) { return r.who && r.who.kind === 'type' && r.who.types.indexOf(id) >= 0; }).length; }
  function lockFloor(r) { var c = (r.who.parts || [])[0], pk = c && pickFor(c); return pk && pk.floor; }
  function areaFloor(a) { return a.floors[0] || rowFloor(a.rows[0]) || (a.racks[0] && S.match && (S.match.rackById.get(a.racks[0]) || {}).floor) || (a.bins[0] && S.match && (S.match.rackById.get(a.bins[0].replace(/-\d+$/, '')) || {}).floor); }

  // ---------- rule form ----------
  function newForm(kind) { return { kind: kind || 'deny', who: { kind: kind === 'lock' || kind === 'pair' ? 'part' : 'type', parts: [], types: [] }, lockBins: {}, srcOn: false, src: R().emptyArea(), dest: R().emptyArea(), sameFloor: false, partners: [], reason: '' }; }
  function formOf(r) {
    var f = newForm(r.kind); f.id = r.id; f.edit = true; f.off = r.off; f.reason = r.reason || '';
    f.who = JSON.parse(JSON.stringify(r.who || f.who)); f.lockBins = JSON.parse(JSON.stringify(r.lockBins || {}));
    f.srcOn = !!(r.src && !R().areaEmpty(r.src)); f.src = R().fixArea(JSON.parse(JSON.stringify(r.src || {}))); f.dest = R().fixArea(JSON.parse(JSON.stringify(r.dest || {})));
    f.sameFloor = !!r.sameFloor; f.partners = (r.partners || []).slice();
    return f;
  }
  function formOk(f) {
    if (f.who.kind === 'part' && !f.who.parts.length) return t('m5.err.parts');
    if (f.who.kind === 'type' && !f.who.types.length) return t('m5.err.types');
    if ((f.kind === 'deny' || f.kind === 'allow') && f.srcOn && R().areaEmpty(f.src)) return t('m5.err.src');
    if (f.kind === 'deny' && R().areaEmpty(f.dest)) return t('m5.err.area');
    if (f.kind === 'allow' && R().areaEmpty(f.dest) && !f.sameFloor) return t('m5.err.allow');
    if (f.kind === 'pair' && !f.partners.length) return t('m5.err.partners');
    return '';
  }
  function toRule(f) {
    var w = { kind: f.who.kind, parts: f.who.kind === 'part' ? f.who.parts.slice() : [], types: f.who.kind === 'type' ? f.who.types.slice() : [] };
    var r = { id: f.id || 'R' + Date.now(), kind: f.kind, who: w, reason: (f.reason || '').trim(), off: !!f.off, by: who(), at: Date.now() };
    if (f.kind === 'lock') { r.lockBins = {}; w.parts.forEach(function (c) { r.lockBins[c] = (f.lockBins[c] || []).slice(); }); }
    if (f.kind === 'deny' || f.kind === 'allow') { r.src = f.srcOn ? JSON.parse(JSON.stringify(f.src)) : null; r.dest = JSON.parse(JSON.stringify(f.dest)); }
    if (f.kind === 'allow') r.sameFloor = !!f.sameFloor;
    if (f.kind === 'pair') r.partners = f.partners.slice();
    return r;
  }
  function preview(f) { return R().ruleText(toRule(f), S.data); }
  function needsMap(f) { return f && (f.kind === 'deny' || f.kind === 'allow'); }
  function curArea(f) { return S.ptarget === 'src' && f.srcOn ? f.src : f.dest; }
  function partsBox(list, id, del) {
    return '<div class="m4sugw m5sugw"><input id="' + id + '" placeholder="' + esc(t('m5.ph.part2')) + '" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="' + id + 'sug"><span class="m4sug" id="' + id + 'sug" role="listbox" hidden></span></div>' +
      (list ? '<div class="m5chips">' + list.map(function (v, i) { return '<span class="m5chip"><span class="code">' + esc(v) + '</span><span class="sub2">' + esc(S.names.get(v) || '') + '</span><button type="button" data-m5="' + del + '" data-i="' + i + '" aria-label="' + esc(t('m4.sim.del')) + ' ' + esc(v) + '">×</button></span>'; }).join('') + '</div>' : '');
  }
  function lockBox(f) {   // each Part: its storage bins, all ticked = every bin it is in
    var list = f.who.parts;
    return partsBox(null, 'm5part', 'delpart') + (list.length ? '<div class="m5locks">' + list.map(function (c, i) {
      var pk = pickFor(c), bins = (pk && pk.bins || []).map(function (b) { return b.bin; }), sel = f.lockBins[c] || [], all = !sel.length;
      return '<div class="m5lk"><div class="m5lkh"><span class="code">' + esc(c) + '</span><span class="sub2">' + esc(S.names.get(c) || '') + '</span><button type="button" class="m5x" data-m5="delpart" data-i="' + i + '" aria-label="' + esc(t('m4.sim.del')) + ' ' + esc(c) + '">×</button></div>' +
        (bins.length ? '<div class="m5grid"><button type="button" class="m5pick" data-m5="lkall" data-v="' + esc(c) + '" aria-pressed="' + all + '">' + esc(t('m5.lk.all2', { n: bins.length })) + '</button>' +
          bins.map(function (b) { return '<button type="button" class="m5pick code" data-m5="lkbin" data-v="' + esc(c) + '" data-b="' + esc(b) + '" aria-pressed="' + (!all && sel.indexOf(b) >= 0) + '">' + esc(b) + '</button>'; }).join('') + '</div>'
          : '<p class="sub2">' + esc(t('m5.lk.nobin')) + '</p>') + '</div>';
    }).join('') + '</div>' : '');
  }
  function typeButtons(sel, act) {
    if (!S.data.types.length) return '<p class="sub2">' + esc(t('m5.t.none')) + '</p>';
    return '<div class="m5grid wide">' + S.data.types.map(function (tp) { return '<button type="button" class="m5pick" data-m5="' + act + '" data-v="' + esc(tp.id) + '" aria-pressed="' + (sel.indexOf(tp.id) >= 0) + '">' + esc(tp.name) + ' <small>' + nf(typeCount(tp.id)) + '</small></button>'; }).join('') + '</div>';
  }
  function selSummary(a, side) {
    var bits = [];
    function c(label, act, v, sub) { return '<span class="m5chip"><span class="code">' + esc(label) + '</span>' + (sub ? '<span class="sub2">' + esc(sub) + '</span>' : '') + '<button type="button" data-m5="' + act + '" data-k="' + side + '" data-v="' + esc(v) + '" aria-label="' + esc(t('m4.sim.del')) + ' ' + esc(label) + '">×</button></span>'; }
    a.floors.forEach(function (x) { bits.push(c(t('m5.a.wholefloor', { f: floorTxt(x) }), 'unfloor', x)); });
    a.rows.forEach(function (x) { bits.push(c(x, 'unrow', x, t('m5.a.row') + (rowFloor(x) ? ' · ' + floorTxt(rowFloor(x)) : ''))); });
    a.racks.forEach(function (x) { bits.push(c(x, 'unrack', x, t('m5.a.alllv'))); });
    a.bins.forEach(function (x) { bits.push(c(x, 'unbin', x, '')); });
    return bits.length ? '<div class="m5chips">' + bits.join('') + '</div>' : '<p class="sub2 m5none">' + esc(t('m5.a.none2')) + '</p>';
  }
  function levelPanel(f) {
    var id = S.lastRack, rk = id && S.match && S.match.rackById.get(id), a = curArea(f);
    if (!rk || S.pmode !== 'rack') return '';
    var n = Math.max(1, rk.levels || 1), whole = a.racks.indexOf(id) >= 0, lv = [];
    for (var l = 1; l <= n; l++) lv.push('<button type="button" class="m5pick" data-m5="lv" data-v="' + l + '" aria-pressed="' + (a.bins.indexOf(id + '-' + pad2(l)) >= 0) + '">' + esc(t('m5.lv', { n: l })) + '</button>');
    return '<div class="m5lv"><span><b>' + esc(id) + '</b> <span class="sub2">' + esc(t('m5.lv.sub')) + '</span></span><div class="m5grid"><button type="button" class="m5pick" data-m5="lvall" aria-pressed="' + whole + '">' + esc(t('m5.lv.all')) + '</button>' + lv.join('') + '</div></div>';
  }
  function areaPicker(f, side) {   // one area block (source or destination); the active one receives map clicks
    var a = side === 'src' ? f.src : f.dest, on = S.ptarget === side || (side === 'dest' && !(f.srcOn && S.ptarget === 'src'));
    var cur = S.L && S.L.floors[S.floor] ? S.L.floors[S.floor].id : null, whole = cur && a.floors.indexOf(cur) >= 0;
    return '<div class="m5ap' + (on ? ' on' : '') + ' s-' + side + '" data-side="' + side + '"><div class="m5aph"><b>' + esc(t('m5.ap.' + side + '.' + f.kind)) + '</b>' +
      (on ? '<span class="m5aptag">' + esc(t('m5.ap.active')) + '</span>' : '<button type="button" class="btn sm" data-m5="ptarget" data-v="' + side + '">' + esc(t('m5.ap.pick')) + '</button>') + '</div>' +
      (on ? '<p class="sub2">' + esc(t('m5.map.hint2.' + S.pmode)) + '</p><div class="m5wtool">' + seg([['rack', t('m5.pm.rack')], ['row', t('m5.pm.row')], ['floor', t('m5.pm.floor')]], S.pmode, 'pmode') +
        (S.pmode === 'floor' ? '<button type="button" class="btn sm" data-m5="wholefloor" aria-pressed="' + whole + '">' + esc(t(whole ? 'm5.map.unwhole' : 'm5.map.whole', { f: floorTxt(cur) })) + '</button>' : '') +
        '<button type="button" class="btn sm" data-m5="clear">' + esc(t('m5.map.clear')) + '</button></div><div class="m5lvw">' + levelPanel(f) + '</div>' : '') +
      '<div class="m5sel" data-side="' + side + '">' + selSummary(a, side) + '</div></div>';
  }
  function slot(n, title, body) { return '<div class="m5slot"><div class="m5slh"><span class="m5n">' + n + '</span><b>' + esc(title) + '</b></div>' + body + '</div>'; }
  function formHtml() {
    var f = S.form, w = f.who, k = f.kind, html = '';
    html += slot(1, t('m5.slot.kind'), '<div class="m5kinds4">' + R().KINDS.map(function (x) {
      return '<button type="button" class="m5k4 k-' + x + '" data-m5="kind" data-v="' + x + '" aria-pressed="' + (k === x) + '"' + (f.edit && k !== x ? ' disabled' : '') + '><i aria-hidden="true"></i><span><b>' + esc(t('m5.k4.' + x)) + '</b><small>' + esc(t('m5.k4.' + x + '.mean')) + '</small><em>' + esc(t('m5.k4.' + x + '.ex')) + '</em></span></button>';
    }).join('') + '</div>');
    var whoKinds = k === 'lock' ? [['part', t('m5.wk.part')]] : k === 'pair' ? [['part', t('m5.wk.part')], ['type', t('m5.wk.type')]] : [['part', t('m5.wk.part')], ['type', t('m5.wk.type')], ['all', t('m5.wk.all')]];
    var whoBody = (whoKinds.length > 1 ? seg(whoKinds, w.kind, 'wkind') : '') +
      (k === 'lock' ? lockBox(f) : w.kind === 'part' ? partsBox(w.parts, 'm5part', 'delpart') : w.kind === 'type' ? typeButtons(w.types, 'wtype') : '<p class="sub2">' + esc(t('m5.wk.all.sub')) + '</p>');
    html += slot(2, t(k === 'lock' ? 'm5.slot.lockwho' : k === 'pair' ? 'm5.slot.pairwho' : 'm5.slot.who'), whoBody);
    if (k === 'deny' || k === 'allow') {
      if (!S.L) html += slot(3, t('m5.slot.where0'), '<div class="msg warn"><span>' + esc(t('m5.nolayout')) + '</span></div>');
      else {
        var srcSeg = '<div class="m5srcq"><span class="sub2">' + esc(t('m5.src.q')) + '</span>' + seg([['any', t('m5.src.any')], ['some', t('m5.src.some')]], f.srcOn ? 'some' : 'any', 'srcon') + '</div>';
        html += slot(3, t('m5.slot.src'), srcSeg + (f.srcOn ? areaPicker(f, 'src') : ''));
        html += slot(4, t(k === 'deny' ? 'm5.slot.dest.deny' : 'm5.slot.dest.allow'), areaPicker(f, 'dest') +
          (k === 'allow' ? '<label class="m5chk m5sf"><input type="checkbox" id="m5samefloor"' + (f.sameFloor ? ' checked' : '') + '> <span><b>' + esc(t('m5.dst.samefloor')) + '</b><span class="sub2">' + esc(t('m5.dst.samefloor.sub')) + '</span></span></label>' : ''));
      }
    } else if (k === 'pair') html += slot(3, t('m5.slot.partners'), typeButtons(f.partners, 'partner') + '<p class="sub2">' + esc(t('m5.partners.sub')) + '</p>');
    var n = (k === 'deny' || k === 'allow') ? 5 : 4;
    html += slot(n, t('m5.reason2'), '<input id="m5reason" class="m5in" value="' + esc(f.reason) + '" placeholder="' + esc(t('m5.ph.reason')) + '" aria-label="' + esc(t('m5.reason2')) + '">');
    return '<div class="m5fbox" id="m5form"><div class="m5fh"><h3>' + esc(t(f.edit ? 'm5.edit.title' : 'm5.new.title')) + '</h3><button type="button" class="btn sm" data-m5="cancel">' + esc(t('m5.cancel')) + '</button></div>' + html +
      '<div class="m5sum"><span class="sub2">' + esc(t('m5.preview')) + '</span> <b id="m5prev">' + esc(preview(f)) + '</b></div>' +
      (S.msg && S.msg[0] === 'bad' ? '<div class="msg bad" role="status"><span>' + esc(S.msg[1]) + '</span></div>' : '') +
      '<div class="m4acts"><button type="button" class="btn primary" data-m5="save">' + esc(t(f.edit ? 'm5.save.edit' : 'm5.save')) + '</button><button type="button" class="btn" data-m5="cancel">' + esc(t('m5.cancel')) + '</button></div></div>';
  }

  // ---------- rule table ----------
  function whoCell(r) {
    var w = r.who || {};
    if (w.kind === 'all') return '<span class="m5who">' + esc(t('m5.w.all')) + '</span>';
    if (w.kind === 'type') return w.types.map(function (id) { return '<span class="m5tchip">' + esc(typeName(id)) + '</span>'; }).join(' ');
    var p = w.parts || [];
    return '<div class="m5codes">' + p.slice(0, 3).map(function (c) { return '<span class="code">' + esc(c) + '</span>'; }).join('') + (p.length > 3 ? '<span class="sub2">' + esc(t('m5.a.more', { n: p.length - 3 })) + '</span>' : '') + '</div>';
  }
  function areaLines(a) {
    a = R().fixArea(a); var lines = [];
    function line(k, list) { if (list.length) lines.push('<div class="m5wl"><span class="sub2">' + esc(t(k)) + '</span><span>' + esc(list.slice(0, 10).join(', ') + (list.length > 10 ? ' ' + t('m5.a.more', { n: list.length - 10 }) : '')) + '</span></div>'); }
    line('m5.wh.floor', a.floors.map(function (f) { return String(f).replace(/^F/, ''); }));
    line('m5.wh.row', a.rows); line('m5.wh.rack', a.racks); line('m5.wh.bin', a.bins);
    return lines.join('');
  }
  function srcCell(r) {
    if (r.kind === 'lock') { var lb = r.lockBins || {}; return (r.who.parts || []).map(function (c) { var b = lb[c]; return '<div class="m5wl"><span class="sub2">' + esc(t('m5.wh.bin')) + '</span><span>' + esc(b && b.length ? b.join(', ') : t('m5.lk.all')) + '</span></div>'; }).join(''); }
    if (r.kind === 'pair') return '<span class="sub2">–</span>';
    return r.src && !R().areaEmpty(r.src) ? areaLines(r.src) : '<span class="sub2">' + esc(t('m5.src.any')) + '</span>';
  }
  function destCell(r) {
    if (r.kind === 'lock') return '<span class="sub2">' + esc(t('m5.dst.none')) + '</span>';
    if (r.kind === 'pair') return '<div class="m5wl"><span class="sub2">' + esc(t('m5.dst.with')) + '</span><span>' + (r.partners || []).map(function (id) { return '<span class="m5tchip">' + esc(typeName(id)) + '</span>'; }).join(' ') + '</span></div>';
    return areaLines(r.dest) + (r.sameFloor ? '<div class="m5wl"><span class="sub2">' + esc(t('m5.wh.cond')) + '</span><span>' + esc(t('m5.dst.samefloor')) + '</span></div>' : '');
  }
  function listHtml() {
    var rules = S.data.rules.slice().sort(function (a, b) { return R().KINDS.indexOf(a.kind) - R().KINDS.indexOf(b.kind) || b.at - a.at; });
    var dead = S.L ? R().deadEnds(S.data, places()) : [];
    var rows = rules.map(function (r) {
      var c = S.confirm === r.id, sel = S.selRule === r.id && !S.form;
      return '<tr class="m5rr' + (r.off ? ' m5off' : '') + (sel ? ' sel' : '') + '" data-m5="selrule" data-id="' + esc(r.id) + '" tabindex="0" aria-selected="' + sel + '">' +
        '<td>' + chip(CHIP[r.kind], t('m5.k4.' + r.kind)) + (r.conv ? '<div>' + chip('warn', t('m5.conv')) + '</div>' : '') + '</td><td>' + whoCell(r) + '</td><td>' + srcCell(r) + '</td><td>' + (r.kind === 'pair' ? '' : '<div class="m5rnar m5srcn"><div class="m5wl"><span class="sub2">' + esc(t('m5.col.src')) + '</span><span>' + esc(r.kind === 'lock' ? R().lockText(r) : r.src && !R().areaEmpty(r.src) ? R().areaText(r.src) : t('m5.src.any')) + '</span></div></div>') + destCell(r) +
        (r.reason ? '<div class="m5rnar sub2">' + esc(t('m5.reason')) + ': ' + esc(r.reason) + '</div>' : '') + '</td>' +
        '<td>' + (r.reason ? esc(r.reason) : '<span class="sub2">–</span>') + '</td>' +
        '<td><label class="m5mini" data-stop="1"><input type="checkbox" data-m5r="off" data-id="' + esc(r.id) + '"' + (r.off ? '' : ' checked') + ' aria-label="' + esc(t('m5.col.state')) + '"><span class="m5sw" aria-hidden="true"></span></label></td>' +
        '<td class="num"><div class="m5rowacts" data-stop="1"><button type="button" class="btn sm" data-m5="edit" data-id="' + esc(r.id) + '">' + esc(t('m5.edit')) + '</button><button type="button" class="btn sm danger' + (c ? ' confirm' : '') + '" data-m5="del" data-id="' + esc(r.id) + '">' + esc(t(c ? 'm5.del.confirm' : 'm5.del')) + '</button></div></td></tr>';
    }).join('');
    return (S.msg && S.msg[0] === 'ok' ? '<div class="msg ok" role="status"><span>' + esc(S.msg[1]) + '</span></div>' : '') +
      ((S.data.dropped || []).length ? '<div class="msg warn" role="status"><span>' + esc(t('m5.dropped', { n: S.data.dropped.join(', ') })) + '</span></div>' : '') +
      (dead.length ? '<div class="msg bad" role="status"><span>' + esc(t('m5.dead', { n: dead.map(function (x) { return x.subj.code ? x.subj.label : x.subj.label ? t('m5.w.type', { v: x.subj.label }) : t('m5.w.all'); }).join(', ') })) + '</span></div>' : '') +
      (rules.length ? '<div class="tablebox"><table class="m5tbl m5rtab"><colgroup><col class="c-act"><col class="c-who"><col class="c-src"><col class="c-where"><col class="c-why"><col class="c-on"><col class="c-btn"></colgroup><thead><tr><th>' + esc(t('m5.col.kind')) + '</th><th>' + esc(t('m5.col.who')) + '</th><th>' + esc(t('m5.col.src')) + '</th><th>' + esc(t('m5.col.dest')) + '</th><th>' + esc(t('m5.reason')) + '</th><th>' + esc(t('m5.col.state')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="sub2 m5hint">' + esc(t('m5.list.click')) + '</p>'
        : '<p class="empty-note">' + esc(t('m5.none2')) + '</p>');
  }

  // ---------- the one map ----------
  function mapMode() { return S.form && needsMap(S.form) ? 'pick' : S.form ? 'idle' : S.mode; }
  function viewSubj() { var V = S.view; return V.kind === 'part' ? (V.code ? { code: V.code } : null) : (V.type ? { type: V.type } : null); }
  function viewData() {
    var subj = viewSubj(); if (!subj || !S.match) return null;
    var key = JSON.stringify(subj); if (S.viewCache && S.viewCache.key === key) return S.viewCache;
    var cur = subj.code ? pickFor(subj.code) : null, curPick = cur && cur.status === 'ok' ? cur : null, byRack = new Map();
    places().forEach(function (pl) { var w = R().destOk(S.data, subj, pl, curPick), x = byRack.get(pl.rack) || { ok: 0, no: 0 }; if (w.length) x.no++; else x.ok++; byRack.set(pl.rack, x); });
    var list = R().rulesFor(S.data, subj), src = subj.code && curPick ? R().checkMove(S.data, subj.code, curPick, null) : [];
    var n = [0, 0, 0]; byRack.forEach(function (x) { n[!x.no ? 0 : !x.ok ? 2 : 1]++; });
    S.viewCache = { key: key, subj: subj, cur: curPick, byRack: byRack, rules: list, type: subj.code ? R().typeOf(S.data, subj.code) : subj.type, src: src, n: n,
      tied: !subj.code && list.some(function (r) { return r.src && !R().areaEmpty(r.src); }) };
    return S.viewCache;
  }
  function mapInfo() {
    var m = mapMode();
    if (m === 'pick') return '<p class="sub2">' + esc(t('m5.map.picking2')) + '</p>';
    if (m === 'idle') return '<p class="sub2">' + esc(t('m5.noarea2')) + '</p>';
    if (m === 'rule') {
      var r = S.data.rules.filter(function (x) { return x.id === S.selRule; })[0];
      return r ? '<p class="m5mi"><b>' + esc(R().ruleText(r, S.data)) + '</b></p>' + (r.kind === 'pair' ? '<p class="sub2">' + esc(t('m5.noarea2')) + '</p>' : '') : '';
    }
    var D = viewData();
    if (!D) return '<p class="sub2">' + esc(t('m5.v.pick2')) + '</p>';
    var s = D.subj;
    return '<div class="m5vn"><span class="g">' + esc(t('m5.v.ok', { n: nf(D.n[0]) })) + '</span><span class="y">' + esc(t('m5.v.some', { n: nf(D.n[1]) })) + '</span><span class="r">' + esc(t('m5.v.no', { n: nf(D.n[2]) })) + '</span>' +
      (s.code ? '<span class="h">' + esc(D.cur ? t('m5.v.now', { b: D.cur.bin }) : t('m5.v.nowhere')) + '</span>' : '') + '</div>' +
      (s.code ? '<p class="sub2">' + esc((S.names.get(s.code) || '') + ' · ' + t('m5.v.type', { t: D.type ? typeName(D.type) : t('m5.t.notype') })) + '</p>' : '') +
      (D.src.length ? '<div class="msg bad"><span>' + esc(t('m5.v.cannot')) + ' ' + esc(D.src.map(function (w) { return R().ruleText(w.rule, S.data); }).join(' / ')) + '</span></div>' : '') +
      (D.tied ? '<p class="sub2">' + esc(t('m5.v.tied')) + '</p>' : '') +
      '<details class="m5vrd"' + (D.rules.length <= 3 ? ' open' : '') + '><summary>' + esc(t('m5.v.rules2', { n: D.rules.length })) + '</summary>' + (D.rules.length ? '<ul class="m5vr">' + D.rules.map(function (r) { return '<li>' + chip(CHIP[r.kind], t('m5.k4.' + r.kind)) + ' ' + esc(R().ruleText(r, S.data)) + '</li>'; }).join('') + '</ul>' : '<p class="sub2">' + esc(t('m5.v.norules')) + '</p>') + '</details>';
  }
  function legendFor(m) {
    if (m === 'view') return [['keep', 'm5.v.leg.ok'], ['some', 'm5.v.leg.some'], ['deny', 'm5.v.leg.no']].concat(S.view.kind === 'part' ? [['here', 'm5.v.leg.here']] : []).concat([['off', 'm5.v.leg.free']]);
    var r = m === 'rule' ? S.data.rules.filter(function (x) { return x.id === S.selRule; })[0] : m === 'pick' ? toRule(S.form) : null;
    if (!r || r.kind === 'pair') return [];
    if (r.kind === 'lock') return [['lock', 'm5.leg4.lock'], ['off', 'm5.leg.off']];
    var out = [];
    if (r.src && !R().areaEmpty(r.src)) out.push(['src', 'm5.leg4.src']);
    out.push([r.kind === 'deny' ? 'deny' : 'keep', r.kind === 'deny' ? 'm5.leg4.deny' : 'm5.leg4.allow'], ['some', 'm5.leg.some'], ['off', 'm5.leg.off']);
    return out;
  }
  function mapCard() {
    if (!S.L) return '<aside class="m5mapc"><div class="msg warn"><span>' + esc(t('m5.nolayout')) + '</span></div></aside>';
    var m = mapMode(), V = S.view, fl = S.L.floors;
    var title = { pick: 'm5.map.t.pick', idle: 'm5.map.t.pick', rule: 'm5.map.t.rule', view: 'm5.map.t.view' }[m];
    var viewer = m === 'pick' || m === 'idle' ? '' : '<div class="m5vpick">' + seg([['type', t('m5.wk.type')], ['part', t('m5.wk.part')]], V.kind, 'vkind') +
      (V.kind === 'part' ? '<div class="m4sugw m5sugw"><input id="m5vpart" value="' + esc(V.code) + '" placeholder="' + esc(t('m5.ph.part3')) + '" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="m5vpartsug"><span class="m4sug" id="m5vpartsug" role="listbox" hidden></span></div>'
        : '<select id="m5vtype" aria-label="' + esc(t('m5.wk.type')) + '"><option value="">' + esc(t('m5.v.choose')) + '</option>' + S.data.types.map(function (tp) { return '<option value="' + esc(tp.id) + '"' + (V.type === tp.id ? ' selected' : '') + '>' + esc(tp.name) + '</option>'; }).join('') + '</select>') + '</div>';
    return '<aside class="m5mapc"><div class="m2mapcard m5map" id="m5map" data-fsbox><div class="m5mh"><div><h3>' + esc(t(title)) + '</h3></div>' + (m === 'rule' ? '<button type="button" class="btn sm" data-m5="backview">' + esc(t('m5.map.back')) + '</button>' : '') + '</div>' + viewer +
      '<div class="m4htool">' + seg(fl.map(function (x, i) { return [String(i), floorTxt(x.id)]; }), String(S.floor), 'floor') + '<span class="grow"></span>' +
      '<button type="button" class="btn sm" data-m5="zoom" data-v="out" aria-label="' + esc(t('m4.h.zout')) + '">−</button><button type="button" class="btn sm" data-m5="zoom" data-v="in" aria-label="' + esc(t('m4.h.zin')) + '">+</button><button type="button" class="btn sm" data-m5="zoom" data-v="fit">' + esc(t('m4.h.fit')) + '</button></div>' +
      '<div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="' + esc(t(title)) + '"></canvas><div id="m2tip" class="m2tip" hidden></div></div>' +
      '<div class="m5leg" id="m5leg">' + legHtml(m) + '</div>' +
      '<div class="m5minfo" id="m5minfo">' + mapInfo() + '</div></div></aside>';
  }
  function legHtml(m) { return legendFor(m).map(function (l) { return '<span><i style="background:' + TINT[l[0]] + '"></i>' + esc(t(l[1])) + '</span>'; }).join(''); }
  function rulesSection() {
    return '<section class="panel m5sec" id="m5rules"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.list.title')) + ' <span class="chip info">' + S.data.rules.filter(function (r) { return !r.off; }).length + '</span></h2><p class="sub">' + esc(t('m5.list.sub4')) + '</p></div>' +
      (S.form ? '' : '<button type="button" class="btn primary" data-m5="new">+ ' + esc(t('m5.new.btn')) + '</button>') + '</div>' +
      '<div class="m5rgrid"><div class="m5rleft">' + (S.form ? formHtml() : '') + listHtml() + '</div>' + mapCard() + '</div></section>';
  }

  // ---------- item types ----------
  function cardCodes(id) {
    var out = [];
    if (id === NONE) { S.parts.forEach(function (c) { if (!S.data.partType[c]) out.push(c); }); }
    else { var pt = S.data.partType; for (var k in pt) if (pt[k] === id) out.push(k); }
    return out;
  }
  function typesSection() {
    var cards = S.data.types.map(function (tp) {
      var on = S.card === tp.id;
      return '<button type="button" class="m5tc' + (on ? ' on' : '') + '" data-m5="card" data-v="' + esc(tp.id) + '" aria-pressed="' + on + '"><b>' + esc(tp.name) + '</b><span class="m5tcn">' + nf(typeCount(tp.id)) + '<small>' + esc(t('m5.t.parts')) + '</small></span><span class="sub2">' + esc(t('m5.t.rules', { n: rulesOfType(tp.id) })) + '</span></button>';
    }).join('');
    var nNone = S.parts.length - Object.keys(S.data.partType).filter(function (c) { return S.data.partType[c]; }).length;
    cards += '<button type="button" class="m5tc none' + (S.card === NONE ? ' on' : '') + '" data-m5="card" data-v="' + NONE + '" aria-pressed="' + (S.card === NONE) + '"><b>' + esc(t('m5.t.ungrouped')) + '</b><span class="m5tcn">' + nf(nNone) + '<small>' + esc(t('m5.t.parts')) + '</small></span><span class="sub2">' + esc(t('m5.t.ungrouped.sub')) + '</span></button>';
    cards += '<button type="button" class="m5tc add" data-m5="tadd"><b>+ ' + esc(t('m5.t.add')) + '</b></button>';
    return '<section class="panel m5sec" id="m5types"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.t.title')) + '</h2><p class="sub">' + esc(t('m5.t.sub2')) + '</p></div></div>' +
      '<div class="m5tcs">' + cards + '</div>' + cardPanel() + '</section>';
  }
  function cardPanel() {
    var id = S.card, isNone = id === NONE, tp = S.data.types.filter(function (x) { return x.id === id; })[0];
    if (!isNone && !tp) return '';
    var fq = freqMap(), all = cardCodes(id), q = S.tq.trim().toUpperCase();
    var list = q ? all.filter(function (c) { return c.indexOf(q) >= 0 || String(S.names.get(c) || '').toUpperCase().indexOf(q) >= 0; }) : all;
    list.sort(fq ? function (a, b) { return (fq.get(b) || 0) - (fq.get(a) || 0) || (a < b ? -1 : 1); } : function (a, b) { return a < b ? -1 : 1; });
    var shown = list.slice(0, 300), allOn = shown.length && shown.every(function (c) { return S.tpick.has(c); });
    var head = isNone ? '<h3>' + esc(t('m5.t.ungrouped')) + '</h3>' :
      (S.tedit === id ? '<div class="m5tname"><input id="m5tname" value="' + esc(tp.name) + '" aria-label="' + esc(t('m5.t.name')) + '"><button type="button" class="btn sm primary" data-m5="tsave" data-v="' + esc(id) + '">' + esc(t('m5.t.save')) + '</button><button type="button" class="btn sm" data-m5="tcancel">' + esc(t('m5.cancel')) + '</button></div>'
        : '<h3>' + esc(tp.name) + '</h3>') +
      (S.tedit === id ? '' : '<div class="m5tacts"><button type="button" class="btn sm" data-m5="tedit" data-v="' + esc(id) + '">' + esc(t('m5.t.rename')) + '</button><button type="button" class="btn sm danger' + (S.confirm === 'T:' + id ? ' confirm' : '') + '" data-m5="tdel" data-v="' + esc(id) + '">' + esc(S.confirm === 'T:' + id ? t('m5.t.delc', { n: typeCount(id), r: rulesOfType(id) }) : t('m5.t.del')) + '</button></div>');
    var targets = S.data.types.filter(function (x) { return x.id !== id; });
    var bar = '<div class="m5abar"><span class="m5picked">' + esc(t('m5.t.picked', { n: S.tpick.size })) + '</span>' +
      '<label class="m5mv"><span>' + esc(t(isNone ? 'm5.t.setto' : 'm5.t.moveto')) + '</span><select id="m5moveto"><option value="">' + esc(t('m5.v.choose')) + '</option>' + targets.map(function (x) { return '<option value="' + esc(x.id) + '"' + (S.moveTo === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></label>' +
      '<button type="button" class="btn sm primary" data-m5="tmove"' + (S.tpick.size && S.moveTo ? '' : ' disabled') + '>' + esc(t('m5.t.apply')) + '</button>' +
      (isNone ? '' : '<button type="button" class="btn sm danger" data-m5="tunset"' + (S.tpick.size ? '' : ' disabled') + '>' + esc(t('m5.t.unset2')) + '</button>') + '</div>';
    return '<div class="m5cardp"><div class="m5cph">' + head + '</div>' +
      '<div class="m5cpt"><input id="m5tq" type="search" value="' + esc(S.tq) + '" placeholder="' + esc(t('m5.ph.part3')) + '" aria-label="' + esc(t('m5.ph.part3')) + '"><span class="sub2">' + esc(t('m5.t.showing', { n: nf(shown.length), m: nf(list.length) })) + (fq ? ' · ' + esc(t('m5.t.byfreq')) : ' · ' + esc(t('m5.t.needm4b'))) + '</span></div>' + bar +
      (shown.length ? '<div class="tablebox m5ptb"><table class="m5tbl m5parts"><colgroup><col class="c-chk"><col class="c-code"><col><col class="c-bin"><col class="c-n"></colgroup><thead><tr><th><input type="checkbox" data-m5all="1"' + (allOn ? ' checked' : '') + ' aria-label="' + esc(t('m5.t.all', { n: shown.length })) + '"></th><th>Part</th><th>' + esc(t('m5.col.name')) + '</th><th>Bin</th><th class="num">' + esc(t('m5.mis.n')) + '</th></tr></thead><tbody>' +
        shown.map(function (c) { var pk = pickFor(c); return '<tr><td><input type="checkbox" data-m5c="' + esc(c) + '"' + (S.tpick.has(c) ? ' checked' : '') + ' aria-label="' + esc(c) + '"></td><td><span class="code">' + esc(c) + '</span></td><td>' + esc(S.names.get(c) || '–') + '</td><td>' + (pk && pk.bin ? loc(pk.bin) : '<span class="sub2">–</span>') + '</td><td class="num">' + (fq ? nf(fq.get(c) || 0) : '–') + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '<p class="empty-note">' + esc(t(q ? 'm4.sim.nohit' : isNone ? 'm5.t.allgrouped' : 'm5.t.empty')) + '</p>') + '</div>';
  }

  // ---------- Parts that break a rule now ----------
  function misplacedList() {
    if (S.misCache) return S.misCache;
    var out = [], fq = freqMap() || new Map();
    if (S.L) S.parts.forEach(function (c) { var pk = pickFor(c); if (!pk || pk.status !== 'ok') return; var w = R().misplaced(S.data, c, pk); if (w.length) out.push({ code: c, pick: pk, why: w, n: fq.get(c) || 0 }); });
    out.sort(function (a, b) { return b.n - a.n || (a.code < b.code ? -1 : 1); });
    return (S.misCache = out);
  }
  function misSection() {
    var L = misplacedList(), q = S.misQ.trim().toUpperCase(), shown = q ? L.filter(function (x) { return x.code.indexOf(q) >= 0 || String(S.names.get(x.code) || '').toUpperCase().indexOf(q) >= 0; }) : L;
    return '<section class="panel m5sec" id="m5mis"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.mis.title')) + ' <span class="chip ' + (L.length ? 'warn' : 'ok') + '">' + nf(L.length) + '</span></h2><p class="sub">' + esc(t('m5.mis.sub')) + '</p></div></div>' +
      (L.length ? '<div class="m5cpt"><input id="m5misq" type="search" value="' + esc(S.misQ) + '" placeholder="' + esc(t('m5.ph.part3')) + '" aria-label="' + esc(t('m5.ph.part3')) + '"><span class="sub2">' + esc(t('m5.t.showing', { n: nf(Math.min(200, shown.length)), m: nf(shown.length) })) + '</span></div>' +
        '<div class="tablebox m5ptb"><table class="m5tbl m5mist"><colgroup><col class="c-code"><col class="c-name"><col class="c-type"><col class="c-bin"><col class="c-n"><col class="c-act"><col></colgroup><thead><tr><th>Part</th><th>' + esc(t('m5.col.name')) + '</th><th>' + esc(t('m5.wk.type')) + '</th><th>' + esc(t('m5.mis.now')) + '</th><th class="num">' + esc(t('m5.mis.n')) + '</th><th>' + esc(t('m5.col.kind')) + '</th><th>' + esc(t('m5.mis.rule')) + '</th></tr></thead><tbody>' +
        shown.slice(0, 200).map(function (x) { var tp = S.data.partType[x.code], w = x.why[0]; return '<tr><td><span class="code">' + esc(x.code) + '</span></td><td>' + esc(S.names.get(x.code) || '–') + '</td><td>' + (tp ? '<span class="m5tchip">' + esc(typeName(tp)) + '</span>' : '<span class="sub2">' + esc(t('m5.t.notype')) + '</span>') + '</td><td>' + loc(x.pick.bin) + '</td><td class="num">' + nf(x.n) + '</td><td>' + chip(CHIP[w.rule.kind], t('m5.k4.' + w.rule.kind)) + '</td><td>' + esc(x.why.map(function (y) { return R().ruleText(y.rule, S.data); }).join(' / ')) + '</td></tr>'; }).join('') +
        '</tbody></table></div>'
        : '<p class="empty-note">' + esc(t('m5.mis.none')) + '</p>') + '</section>';
  }

  // ---------- tester, history ----------
  function testCard() {
    var T = S.test || {}, res = '';
    if (T.res) res = T.res.length ? '<div class="m5res bad"><b>' + esc(t('m4.rule.fail')) + '</b><ul>' + T.res.map(function (w) { return '<li>' + esc(R().reasonText(w, S.data)) + '</li>'; }).join('') + '</ul></div>' : '<div class="m5res ok"><b>&#10003; ' + esc(t('m5.test.ok4')) + '</b></div>';
    var li = ['m5.rule4.both', 'm5.rule4.lock', 'm5.rule4.all', 'm5.rule4.none', 'm5.rule.special', 'm5.rule4.size', 'm5.rule.sim'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('');
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.test.title')) + '</h2><p class="sub">' + esc(t('m5.test.sub')) + '</p></div></div>' +
      '<form class="m5testf" id="m5test" autocomplete="off"><label><span>Part A</span><input id="m5ta" list="m5parts" value="' + esc(T.a || '') + '" required></label><span class="m4x">⇄</span><label><span>Part B</span><input id="m5tb" list="m5parts" value="' + esc(T.b || '') + '" required></label><button class="btn" type="submit">' + esc(t('m5.test.btn')) + '</button></form>' + (T.info || '') + res +
      '<details class="m5fixed"><summary>' + esc(t('m5.rules.title')) + '</summary><ol class="m5rules">' + li + '</ol></details></section>';
  }
  function logCard() {
    var log = S.data.log.slice(-200).reverse();
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m5.log.title')) + ' <span class="chip info">' + nf(S.data.log.length) + '</span></h2></div></div>' + (log.length ? '<ul class="m5log">' +
      log.map(function (x) { return '<li>' + chip(x.act === 'del' || x.act === 'tdel' ? 'ok' : 'warn', t('m5.act2.' + x.act)) + ' <span>' + esc(x.name || x.code || '') + '</span> <span class="sub2">' + esc(x.by) + ' · ' + fmt(x.at) + '</span></li>'; }).join('') + '</ul>' : '<p class="empty-note">–</p>') + '</section>';
  }
  function render() {
    var held = window.scrollY;
    S.root.innerHTML = '<div class="ph"><div class="ph-l"><h1>' + esc(t('nav.m5')) + '</h1><p class="lede">' + esc(t('m5.intro3')) + '</p></div></div>' +
      '<datalist id="m5parts">' + S.parts.slice(0, 5000).map(function (x) { return '<option value="' + esc(x) + '">' + esc(S.names.get(x) || '') + '</option>'; }).join('') + '</datalist>' +
      rulesSection() + typesSection() + misSection() + '<div class="m5cols">' + testCard() + logCard() + '</div>';
    window.scrollTo(0, held);
    wire();
    if ($('#m5map')) mountMap();
  }

  // ---------- map drawing ----------
  function areaHit(a, id) {   // 2 = the whole rack is in the area, 1 = some of its levels, 0 = none
    var r = S.match && S.match.rackById.get(id); if (!r || !a) return 0;
    a = R().fixArea(a);
    if (a.rows.indexOf(R().zoneOf(id)) >= 0 || a.floors.indexOf(r.floor) >= 0 || a.racks.indexOf(id) >= 0 || a.bins.indexOf(id) >= 0) return 2;
    return a.bins.some(function (b) { return b.indexOf(id + '-') === 0; }) ? 1 : 0;
  }
  function lockHit(rule, id) {
    var lb = rule.lockBins || {}, hit = 0;
    (rule.who.parts || []).forEach(function (c) {
      var b = lb[c], pk = pickFor(c), bins = b && b.length ? b : (pk && pk.bins || []).map(function (x) { return x.bin; });
      bins.forEach(function (bn) { if (bn === id || bn.indexOf(id + '-') === 0) hit = 2; });
    });
    return hit;
  }
  function tintFor(rule, id) {
    if (!rule || rule.kind === 'pair') return TINT.off;
    if (rule.kind === 'lock') return lockHit(rule, id) ? TINT.lock : TINT.off;
    var d = areaHit(rule.dest, id), sx = rule.src && !R().areaEmpty(rule.src) ? areaHit(rule.src, id) : 0, col = rule.kind === 'deny' ? TINT.deny : TINT.keep;
    if (d === 2) return col; if (sx) return TINT.src; if (d === 1) return TINT.some;
    return TINT.off;
  }
  function mountMap() {
    var K = S.kit || (S.kit = PWH.mapKit('pwh-m5'));
    K.M.root = $('#m5map'); K.M.canvas = null; K.M.layout = S.L; K.M.match = S.match; K.M.names = true; K.M.mode = '2d'; K.M.noDim = true; K.M.noNums = true;
    K.M.floor = Math.min(S.floor, S.L.floors.length - 1); K.M.sel = null; K.M.focus = null; K.M.hl = null; K.M.overlay = null;
    var m = mapMode(), D = m === 'view' ? viewData() : null, rule = m === 'rule' ? S.data.rules.filter(function (x) { return x.id === S.selRule; })[0] : null;
    K.M.rackTint = function (r) {
      if (m === 'pick') return tintFor(toRule(S.form), r.id);
      if (m === 'idle' && S.form && S.form.kind === 'lock') return tintFor(toRule(S.form), r.id);
      if (m === 'rule') return tintFor(rule, r.id);
      if (m === 'view' && D) { if (D.cur && D.cur.rack === r.id) return TINT.here; var x = D.byRack.get(r.id); if (!x) return TINT.off; return !x.no ? TINT.keep : !x.ok ? TINT.deny : TINT.some; }
      return TINT.off;
    };
    K.M.onSelect = function (id) {
      K.M.sel = null; if (!id || mapMode() !== 'pick') return;
      var a = curArea(S.form), rk = S.match.rackById.get(id);
      function tog(list, v) { var i = list.indexOf(v); if (i >= 0) list.splice(i, 1); else list.push(v); }
      if (S.pmode === 'row') tog(a.rows, R().zoneOf(id));
      else if (S.pmode === 'floor') { if (rk) tog(a.floors, rk.floor); }
      else { var had = a.racks.indexOf(id) >= 0 || a.bins.some(function (b) { return b.indexOf(id + '-') === 0; }); a.bins = a.bins.filter(function (b) { return b.indexOf(id + '-') !== 0; }); if (had) { tog(a.racks, id); S.lastRack = null; } else { a.racks.push(id); S.lastRack = id; } }
      refreshSel();
    };
    K.wireMap(); K.resize(); K.fit(); K.draw();
  }
  function refreshSel() {   // picked lists, levels, sentence, legend and map, without rebuilding the page (keeps zoom)
    var f = S.form;
    S.root.querySelectorAll('.m5sel[data-side]').forEach(function (el) { var side = el.getAttribute('data-side'); el.innerHTML = selSummary(side === 'src' ? f.src : f.dest, side); });
    S.root.querySelectorAll('.m5lvw').forEach(function (el) { el.innerHTML = levelPanel(f); });
    var pv = $('#m5prev'); if (pv) pv.textContent = preview(f);
    var lg = $('#m5leg'); if (lg) lg.innerHTML = legHtml(mapMode());
    var cur = S.L.floors[S.floor] ? S.L.floors[S.floor].id : null, wb = $('[data-m5=wholefloor]');
    if (wb) { var on = curArea(f).floors.indexOf(cur) >= 0; wb.setAttribute('aria-pressed', on); wb.textContent = t(on ? 'm5.map.unwhole' : 'm5.map.whole', { f: floorTxt(cur) }); }
    if (S.kit) S.kit.draw();
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
  function keepFocus(sel, key) { var el = $(sel); if (!el) return; el.addEventListener('input', function () { var pos = el.selectionStart; S[key] = el.value; if (key === 'tq') S.tpick = new Set(); render(); var n = $(sel); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); }
  function wire() {
    var tf = $('#m5test'); if (tf) tf.addEventListener('submit', function (e) { e.preventDefault(); runTest(); });
    var rs = $('#m5reason'); if (rs) rs.addEventListener('input', function () { S.form.reason = rs.value; });
    var sf = $('#m5samefloor'); if (sf) sf.addEventListener('change', function () { S.form.sameFloor = sf.checked; refreshSel(); });
    S.root.querySelectorAll('[data-m5r=off]').forEach(function (cb) { cb.addEventListener('change', function () { var r = S.data.rules.filter(function (x) { return x.id === cb.getAttribute('data-id'); })[0]; if (!r) return; r.off = !cb.checked; save(r.off ? 'pause' : 'resume', { name: R().ruleText(r, S.data) }).then(render); }); });
    suggest('m5part', function (code) { if (S.form.who.parts.indexOf(code) < 0) S.form.who.parts.push(code); S.msg = null; render(); var n = $('#m5part'); if (n) n.focus(); });
    suggest('m5vpart', function (code) { S.view.code = code; S.mode = 'view'; S.selRule = null; S.viewCache = null; var pk = pickFor(code); if (pk && pk.status === 'ok') S.floor = floorIndex(pk.floor); render(); });
    var vt = $('#m5vtype'); if (vt) vt.addEventListener('change', function () { S.view.type = vt.value || null; S.mode = 'view'; S.selRule = null; S.viewCache = null; render(); });
    var mt = $('#m5moveto'); if (mt) mt.addEventListener('change', function () { S.moveTo = mt.value; var b = $('[data-m5=tmove]'); if (b) b.disabled = !(S.tpick.size && S.moveTo); });
    keepFocus('#m5tq', 'tq'); keepFocus('#m5misq', 'misQ');
    var tn = $('#m5tname'); if (tn) { tn.focus(); tn.select(); tn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var b = $('[data-m5=tsave]'); if (b) b.click(); } else if (e.key === 'Escape') { S.tedit = null; render(); } }); }
    S.root.querySelectorAll('[data-m5c]').forEach(function (cb) { cb.addEventListener('change', function () { var c = cb.getAttribute('data-m5c'); if (cb.checked) S.tpick.add(c); else S.tpick.delete(c); refreshAssign(); }); });
    var all = $('[data-m5all]'); if (all) all.addEventListener('change', function () { S.root.querySelectorAll('[data-m5c]').forEach(function (cb) { var c = cb.getAttribute('data-m5c'); cb.checked = all.checked; if (all.checked) S.tpick.add(c); else S.tpick.delete(c); }); refreshAssign(); });
    S.root.querySelectorAll('tr[data-m5=selrule]').forEach(function (tr) { tr.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === tr) { e.preventDefault(); tr.click(); } }); });
  }
  function refreshAssign() {
    var p = $('.m5picked'); if (p) p.textContent = t('m5.t.picked', { n: S.tpick.size });
    var b1 = $('[data-m5=tmove]'); if (b1) b1.disabled = !(S.tpick.size && S.moveTo);
    var b2 = $('[data-m5=tunset]'); if (b2) b2.disabled = !S.tpick.size;
  }
  function runTest() {
    var a = ($('#m5ta').value || '').trim().toUpperCase(), b = ($('#m5tb').value || '').trim().toUpperCase();
    S.test = { a: a, b: b };
    var A = { code: a, pick: pickFor(a) }, B = { code: b, pick: pickFor(b) }, ta = R().typeOf(S.data, a), tb = R().typeOf(S.data, b);
    S.test.info = '<p class="sub">' + esc(t('m5.test.info2', { a: a, x: A.pick && A.pick.bin || '–', ta: ta ? typeName(ta) : t('m5.t.notype'), b: b, y: B.pick && B.pick.bin || '–', tb: tb ? typeName(tb) : t('m5.t.notype') })) + '</p>';
    S.test.res = PWH.freq.checkSwap({ rules: S.data }, A, B);
    render();
  }
  function flash(kind, text) { S.msg = [kind, text]; }
  function lookIn(id) { return S.data.rules.filter(function (x) { return x.id === id; })[0]; }
  function toForm() { var el = $('#m5rules'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-m5]'); if (!el || !S.root || !S.root.contains(el)) return;
    if (el.getAttribute('data-m5') === 'selrule' && e.target.closest('[data-stop]')) return;   // the switch and buttons inside a rule row
    var a = el.getAttribute('data-m5'), v = el.getAttribute('data-v'), f = S.form;
    if (a !== 'save') S.msg = null;
    // --- rule form
    if (a === 'new') { S.form = newForm('deny'); S.ptarget = 'dest'; S.lastRack = null; }
    else if (a === 'cancel') { S.form = null; }
    else if (a === 'kind') { var keep = f; S.form = newForm(v); S.form.reason = keep.reason; if (v !== 'lock' && v !== 'pair' && keep.who.kind !== 'part') S.form.who = keep.who; if (keep.who.kind === 'part' && keep.who.parts.length) { S.form.who = { kind: 'part', parts: keep.who.parts.slice(), types: [] }; } if (v === 'pair' && keep.who.kind === 'type') S.form.who = keep.who; S.ptarget = 'dest'; S.lastRack = null; }
    else if (a === 'wkind') { f.who.kind = v; }
    else if (a === 'wtype') { var wi = f.who.types.indexOf(v); if (wi >= 0) f.who.types.splice(wi, 1); else f.who.types.push(v); }
    else if (a === 'partner') { var pi = f.partners.indexOf(v); if (pi >= 0) f.partners.splice(pi, 1); else f.partners.push(v); }
    else if (a === 'delpart') { var dc = f.who.parts.splice(+el.getAttribute('data-i'), 1)[0]; delete f.lockBins[dc]; }
    else if (a === 'lkall') { f.lockBins[v] = []; }
    else if (a === 'lkbin') { var lb = f.lockBins[v] || [], bb = el.getAttribute('data-b'), bi0 = lb.indexOf(bb); if (bi0 >= 0) lb.splice(bi0, 1); else lb.push(bb); var pk0 = pickFor(v); if (pk0 && pk0.bins && lb.length === pk0.bins.length) lb = []; f.lockBins[v] = lb; }
    else if (a === 'srcon') { f.srcOn = v === 'some'; S.ptarget = f.srcOn ? 'src' : 'dest'; S.lastRack = null; }
    else if (a === 'ptarget') { S.ptarget = v; S.lastRack = null; }
    else if (a === 'pmode') { S.pmode = v; S.lastRack = null; }
    else if (a === 'floor') { S.floor = +v; }
    else if (a === 'wholefloor') { var ca = curArea(f), cur = S.L.floors[S.floor].id, fi = ca.floors.indexOf(cur); if (fi >= 0) ca.floors.splice(fi, 1); else ca.floors.push(cur); refreshSel(); return; }
    else if (a === 'clear') { var cl = R().emptyArea(); if (S.ptarget === 'src' && f.srcOn) f.src = cl; else f.dest = cl; S.lastRack = null; refreshSel(); return; }
    else if (a === 'unrow' || a === 'unfloor' || a === 'unrack' || a === 'unbin') {
      var ar = el.getAttribute('data-k') === 'src' ? f.src : f.dest, key0 = { unrow: 'rows', unfloor: 'floors', unrack: 'racks', unbin: 'bins' }[a];
      ar[key0] = ar[key0].filter(function (x) { return x !== v; }); if (a === 'unrack' && S.lastRack === v) S.lastRack = null; refreshSel(); return;
    }
    else if (a === 'lvall') { var ca0 = curArea(f), id0 = S.lastRack; ca0.bins = ca0.bins.filter(function (b) { return b.indexOf(id0 + '-') !== 0; }); if (ca0.racks.indexOf(id0) < 0) ca0.racks.push(id0); refreshSel(); return; }
    else if (a === 'lv') {
      var ca1 = curArea(f), id1 = S.lastRack, bn = id1 + '-' + pad2(+v), n1 = Math.max(1, (S.match.rackById.get(id1) || {}).levels || 1);
      if (ca1.racks.indexOf(id1) >= 0) { ca1.racks = ca1.racks.filter(function (x) { return x !== id1; }); ca1.bins.push(bn); }   // whole rack -> only the level clicked
      else { var bi = ca1.bins.indexOf(bn); if (bi >= 0) ca1.bins.splice(bi, 1); else ca1.bins.push(bn); }
      if (ca1.bins.filter(function (b) { return b.indexOf(id1 + '-') === 0; }).length === n1) { ca1.bins = ca1.bins.filter(function (b) { return b.indexOf(id1 + '-') !== 0; }); ca1.racks.push(id1); }
      refreshSel(); return;
    }
    else if (a === 'zoom') { var K = S.kit; if (!K || !K.M.canvas) return; if (v === 'fit') { K.fit(); K.draw(); } else { var c = K.M.canvas; K.zoomAt(c.clientWidth / 2, c.clientHeight / 2, v === 'in' ? 1.25 : 0.8); } return; }
    else if (a === 'save') {
      var err = formOk(f); if (err) { flash('bad', err); render(); return; }
      var r = toRule(f), idx = S.data.rules.map(function (x) { return x.id; }).indexOf(r.id), name = R().ruleText(r, S.data);
      if (idx >= 0) S.data.rules[idx] = r; else S.data.rules.push(r);
      S.form = null; S.selRule = r.id; S.mode = 'rule'; flash('ok', t(idx >= 0 ? 'm5.ok.edited' : 'm5.ok.saved', { name: name }));
      save(idx >= 0 ? 'edit' : 'add', { name: name }).then(render); return;
    }
    else if (a === 'selrule') { var sr = lookIn(el.getAttribute('data-id')); if (!sr || S.form) return; S.selRule = sr.id; S.mode = 'rule'; var fl1 = sr.kind === 'lock' ? lockFloor(sr) : (sr.dest || sr.src) ? areaFloor(R().fixArea(R().areaEmpty(sr.dest) ? sr.src : sr.dest)) : null; if (fl1) S.floor = floorIndex(fl1); }
    else if (a === 'backview') { S.mode = 'view'; S.selRule = null; }
    else if (a === 'edit') {
      var rr = lookIn(el.getAttribute('data-id'));
      if (rr) { S.form = formOf(rr); S.ptarget = 'dest'; S.lastRack = null; var fl0 = rr.kind === 'lock' ? lockFloor(rr) : areaFloor(R().areaEmpty(S.form.dest) ? S.form.src : S.form.dest); if (fl0) S.floor = floorIndex(fl0); }
      render(); toForm(); return;
    }
    else if (a === 'del') {
      var id = el.getAttribute('data-id');
      if (S.confirm !== id) { S.confirm = id; render(); setTimeout(function () { if (S.confirm === id) { S.confirm = null; if (S.root && document.body.contains(S.root)) render(); } }, 4000); return; }
      S.confirm = null;
      var dr = lookIn(id), dn = R().ruleText(dr, S.data);
      S.data.rules = S.data.rules.filter(function (x) { return x.id !== id; }); if (S.selRule === id) { S.selRule = null; S.mode = 'view'; }
      flash('ok', t('m5.ok.deleted', { name: dn })); save('del', { name: dn }).then(render); return;
    }
    // --- item types
    else if (a === 'card') { if (S.card !== v) { S.card = v; S.tpick = new Set(); S.tq = ''; S.moveTo = ''; S.tedit = null; } }
    else if (a === 'tadd') { var nid = 'T' + Date.now(); S.data.types.push({ id: nid, name: t('m5.t.newname') }); S.card = nid; S.tedit = nid; S.tpick = new Set(); S.tq = ''; save('tadd', { name: t('m5.t.newname') }).then(render); return; }
    else if (a === 'tedit') { S.tedit = v; }
    else if (a === 'tcancel') { S.tedit = null; }
    else if (a === 'tsave') { var nm = ($('#m5tname').value || '').trim(), tp = S.data.types.filter(function (x) { return x.id === v; })[0]; if (!nm || !tp) return; var was = tp.name; tp.name = nm; S.tedit = null; save('tren', { name: was + ' → ' + nm }).then(render); return; }
    else if (a === 'tmove') { var to = S.moveTo, tp2 = S.data.types.filter(function (x) { return x.id === to; })[0], n2 = S.tpick.size; if (!tp2 || !n2) return; S.tpick.forEach(function (c) { S.data.partType[c] = to; }); S.tpick = new Set(); flash('ok', t('m5.t.done', { n: n2, t: tp2.name })); save('tset', { name: t('m5.t.logset', { n: n2, t: tp2.name }) }).then(render); return; }
    else if (a === 'tunset') { var n3 = S.tpick.size; S.tpick.forEach(function (c) { delete S.data.partType[c]; }); S.tpick = new Set(); save('tunset', { name: t('m5.t.logunset', { n: n3, t: typeName(S.card) }) }).then(render); return; }
    else if (a === 'tdel') {
      var key = 'T:' + v;
      if (S.confirm !== key) { S.confirm = key; render(); setTimeout(function () { if (S.confirm === key) { S.confirm = null; if (S.root && document.body.contains(S.root)) render(); } }, 5000); return; }
      S.confirm = null;
      var tn = typeName(v), pt = S.data.partType;
      for (var k in pt) if (pt[k] === v) delete pt[k];
      S.data.rules.forEach(function (r) { if (r.who && r.who.kind === 'type') r.who.types = r.who.types.filter(function (x) { return x !== v; }); });
      S.data.rules = S.data.rules.filter(function (r) { return !(r.who && r.who.kind === 'type' && !r.who.types.length); });
      S.data.types = S.data.types.filter(function (x) { return x.id !== v; }); S.card = NONE; if (S.view.type === v) S.view.type = null;
      save('tdel', { name: tn }).then(render); return;
    }
    // --- map viewer
    else if (a === 'vkind') { S.view.kind = v; S.mode = 'view'; S.selRule = null; S.viewCache = null; }
    else return;
    render();
  });
  PWH.m5 = { _s: function () { return S; }, mount: function (root) { S.root = root; S.form = null; S.kit = null; S.fd = null; S.viewCache = null; S.misCache = null; root.innerHTML = '<h1>' + esc(t('nav.m5')) + '</h1>'; load().then(render); } };
})(window);
