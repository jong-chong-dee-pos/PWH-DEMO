/* Module 5 rules engine: may Part p move from bin X to bin Y?
 *
 * Agreed with the warehouse (2026-11-09, round 2). A rule is a sentence in 3 slots:
 *   who    Parts (listed) | item types (packaging, PU pallet …) | all Parts
 *   act    keep  = must stay here only        (destination must be inside the area)   green on the map
 *          deny  = may not move here           (destination must be outside the area) red on the map
 *          out   = may not move out of here    (source inside the area cannot move)
 *          lock  = never moves                 (no area)
 *          samefloor = swaps stay on one floor    (no area; was a page switch before v45)
 *          sametype  = swaps only with a Part of the same item type (no area; for "all Parts" a Part with no type is free)
 *   where  bins (3G-03-03) | racks (3G-03, every level) | zones = rack rows (1A, 3G) | whole floors
 * Which rules count for a Part: rules for all Parts always; then the Part's own rules, and only when it
 * has none, the rules of its item type ("a Part's own rule beats its type").
 * Within one level, several "keep" rules add up (allowed if inside any of them); across levels each must hold.
 * A paused rule (off) is kept but not used. Size / weight: no data yet, never treated as passed.
 * Stored as meta 'rules' = { v: 3, types: [{id,name}], partType: {code: typeId}, rules: [], log: [] }. */
(function (g) {
  var PWH = g.PWH;
  var CUR = null;   // the rules last loaded or saved, for reason lines shown without the data at hand
  var DEFAULT_TYPES = ['Packaging', 'Part ผลิตเอง', 'Part PU พาเลท', 'Part PU ชิ้นเล็ก'];

  function zoneOf(rack) { var m = String(rack || '').match(/^([0-9]*[A-Z]+)/); return m ? m[1] : String(rack || ''); }
  function emptyArea() { return { rows: [], floors: [], racks: [], bins: [] }; }
  function fixArea(a) { a = a || {}; return { rows: a.rows || [], floors: a.floors || [], racks: a.racks || [], bins: a.bins || [] }; }

  // ---------- older formats -> v3 ----------
  function areaFromV1(a, zones) {
    var out = emptyArea(); if (!a) return out;
    var v = a.values || [];
    if (a.type === 'row') out.rows = v.slice();
    else if (a.type === 'floor') out.floors = v.slice();
    else if (a.type === 'bin') out.bins = v.slice();
    else if (a.type === 'zone') v.forEach(function (id) { var z = zones.filter(function (x) { return x.id === id; })[0]; if (z) z.rows.forEach(function (r) { if (out.rows.indexOf(r) < 0) out.rows.push(r); }); });
    return out;
  }
  function isAny(a) { return !a || a.type === 'any'; }
  function fromV1(old) {   // lock / allow / deny / floor + zones -> v2
    var zones = old.zones || [], rules = [], dropped = [];
    (old.rules || []).forEach(function (r) {
      var base = { id: r.id, reason: r.reason || '', by: r.by, at: r.at, was: r.name }, parts = (r.subject && !r.subject.all && r.subject.parts) || [];
      function add(x, exact) { var o = Object.assign({}, base, x); if (!exact) o.conv = true; rules.push(o); }
      if (r.kind === 'lock') { if (parts.length) add({ kind: 'lock', parts: parts.slice() }, isAny(r.from)); else add({ kind: 'area', dir: 'out', area: areaFromV1(r.from, zones) }, true); }
      else if (r.kind === 'deny') { if (parts.length) dropped.push(r.name); else add({ kind: 'area', dir: 'in', area: areaFromV1(r.to, zones) }, isAny(r.from)); }
      else if (r.kind === 'allow' || r.kind === 'floor') { if (parts.length) add({ kind: 'keep', parts: parts.slice(), area: areaFromV1(r.to, zones) }, isAny(r.from)); else dropped.push(r.name); }
    });
    return { v: 2, sameFloor: false, rules: rules, log: (old.log || []).slice(), dropped: dropped };
  }
  function fromV2(d) {   // lock / area(in|out|both) / keep -> v3 sentences
    var rules = [];
    (d.rules || []).forEach(function (r) {
      var base = { id: r.id, reason: r.reason || '', by: r.by, at: r.at, conv: r.conv, was: r.was };
      if (r.kind === 'lock') rules.push(Object.assign({}, base, { who: { kind: 'part', parts: r.parts || [], types: [] }, act: 'lock', area: emptyArea() }));
      else if (r.kind === 'keep') rules.push(Object.assign({}, base, { who: { kind: 'part', parts: r.parts || [], types: [] }, act: 'keep', area: fixArea(r.area) }));
      else if (r.kind === 'area') {
        if (r.dir !== 'in') rules.push(Object.assign({}, base, { who: { kind: 'all', parts: [], types: [] }, act: 'out', area: fixArea(r.area) }));
        if (r.dir !== 'out') rules.push(Object.assign({}, base, { id: r.dir === 'both' ? r.id + 'b' : r.id, who: { kind: 'all', parts: [], types: [] }, act: 'deny', area: fixArea(r.area) }));
      }
    });
    var log = (d.log || []).slice(); log.push({ act: 'convert', name: (d.dropped || []).join(', '), by: 'system', at: Date.now() });
    return { v: 3, sameFloor: !!d.sameFloor, sameType: false, types: DEFAULT_TYPES.map(function (n, i) { return { id: 'T' + (i + 1), name: n }; }), partType: {}, rules: rules, log: log, dropped: d.dropped || [] };
  }
  function load() {
    return Promise.all([PWH.db.getMeta('rules').catch(function () { return null; }), PWH.db.getMeta('locks').catch(function () { return null; })]).then(function (r) {
      var data = r[0];
      if (data && data.v === 3) {
        CUR = data;
        if (data.sameFloor || data.sameType) {   // the two page switches (v44) become rules for all Parts
          [['sameFloor', 'samefloor'], ['sameType', 'sametype']].forEach(function (x) {
            if (data[x[0]]) data.rules.push({ id: 'R' + x[1] + Date.now(), who: { kind: 'all', parts: [], types: [] }, act: x[1], area: emptyArea(), reason: '', by: 'system', at: Date.now() });
          });
          delete data.sameFloor; delete data.sameType;
          return PWH.db.setMeta('rules', data).then(function () { return data; }, function () { return data; });
        }
        return data;
      }
      if (!data || data.v !== 2) {
        data = data || { rules: [], zones: [], log: [] };
        var old = r[1];   // locks from the very first version of Module 5
        if (old && old.items && old.items.length && !data.migrated) old.items.forEach(function (l) {
          data.rules.push(l.type === 'part' ? { id: l.id, kind: 'lock', name: l.code, subject: { all: false, parts: [l.code] }, from: { type: 'any' }, reason: l.reason, by: l.by, at: l.at }
            : { id: l.id, kind: 'lock', name: l.code, subject: { all: true, parts: [] }, from: { type: 'bin', values: [l.code] }, reason: l.reason, by: l.by, at: l.at });
        });
        data = fromV1(data);
      }
      var v3 = fromV2(data); CUR = v3;
      if (v3.sameFloor) v3.rules.push({ id: 'Rsamefloor', who: { kind: 'all', parts: [], types: [] }, act: 'samefloor', area: emptyArea(), reason: '', by: 'system', at: Date.now() });
      delete v3.sameFloor; delete v3.sameType;
      return PWH.db.setMeta('rules', v3).then(function () { return v3; }, function () { return v3; });
    });
  }
  function save(data) { data.v = 3; CUR = data; return PWH.db.setMeta('rules', data); }

  // ---------- checking ----------
  // where a bin is: { bin, rack, row, floor }
  function placeOf(pick) { return pick ? { bin: pick.bin, rack: pick.rack, row: zoneOf(pick.rack), floor: pick.floor } : null; }
  function inArea(area, pl) {
    if (!area || !pl) return false;
    return (area.rows || []).indexOf(pl.row) >= 0 || (area.floors || []).indexOf(pl.floor) >= 0 || (area.racks || []).indexOf(pl.rack) >= 0 ||
      (area.bins || []).indexOf(pl.bin) >= 0 || (area.bins || []).indexOf(pl.rack) >= 0;
  }
  function typeOf(data, code) { return (data && data.partType && data.partType[code]) || null; }
  /* the rules that count for a subject { code } or { type }, grouped by level: all / own (Part) / type */
  function rulesFor(data, subj) {
    var all = [], own = [], typ = [], tp = subj.code ? typeOf(data, subj.code) : subj.type;
    ((data && data.rules) || []).forEach(function (r) {
      if (r.off) return;
      var w = r.who || {};
      if (w.kind === 'all') all.push(r);
      else if (w.kind === 'part' && subj.code && (w.parts || []).indexOf(subj.code) >= 0) own.push(r);
      else if (w.kind === 'type' && tp && (w.types || []).indexOf(tp) >= 0) typ.push(r);
    });
    return { levels: [all, own.length ? own : typ], own: own.length > 0, type: tp };
  }
  // reasons a subject may not END at place Y (destination rules only)
  function destWhy(lv, Y) {
    var why = [];
    lv.levels.forEach(function (list) {
      list.forEach(function (r) { if (r.act === 'deny' && inArea(r.area, Y)) why.push({ code: 'deny', rule: r }); });
      var keeps = list.filter(function (r) { return r.act === 'keep'; });
      if (keeps.length && !keeps.some(function (r) { return inArea(r.area, Y); })) why.push({ code: 'keep', rule: keeps[0], rules: keeps });
    });
    return why;
  }
  // reasons a subject may not LEAVE place X
  function srcWhy(lv, X) {
    var why = [];
    lv.levels.forEach(function (list) { list.forEach(function (r) { if (r.act === 'lock') why.push({ code: 'lock', rule: r }); else if (r.act === 'out' && inArea(r.area, X)) why.push({ code: 'out', rule: r }); }); });
    return why;
  }
  function sameFloorRule(lv) { var hit = null; lv.levels.forEach(function (list) { list.forEach(function (r) { if (!hit && r.act === 'samefloor') hit = r; }); }); return hit; }
  // "swap only with the same type" for one side of a pair: the reason, or null
  function sameTypeWhy(data, me, other) {
    var lv = rulesFor(data, { code: me }), tm = typeOf(data, me), to = typeOf(data, other), hit = null;
    lv.levels.forEach(function (list) { list.forEach(function (r) {
      if (hit || r.act !== 'sametype' || !tm || tm === to) return;
      if (r.who.kind === 'all' && !to) return;   // for all Parts: a Part with no type is free
      hit = { code: 'sametype', rule: r, part: me, a: tm, b: to };
    }); });
    return hit;
  }
  /* checkMove(data, partCode, fromPick, toPick) -> [] when allowed, else the reasons (toPick may be null: only "may it leave?") */
  function checkMove(data, code, fromPick, toPick) {
    var lv = rulesFor(data, { code: code }), X = placeOf(fromPick), Y = placeOf(toPick);
    var why = srcWhy(lv, X);
    if (Y) why = why.concat(destWhy(lv, Y));
    if (X && Y && X.floor !== Y.floor) { var sf = sameFloorRule(lv); if (sf) why.push({ code: 'samefloor', rule: sf }); }
    return why;
  }
  /* checkSwap: both sides of a 1:1 swap — A goes from X to Y and B from Y to X */
  function checkSwap(data, a, b) {
    var why = [];
    checkMove(data, a.code, a.pick, b.pick).forEach(function (w) { w.side = 'a'; w.part = a.code; why.push(w); });
    checkMove(data, b.code, b.pick, a.pick).forEach(function (w) { if (w.code === 'samefloor' && why.some(function (x) { return x.code === 'samefloor'; })) return; w.side = 'b'; w.part = b.code; why.push(w); });   // the floor reason once per pair
    var sa = sameTypeWhy(data, a.code, b.code), sb = sameTypeWhy(data, b.code, a.code);
    if (sa) why.push(sa); if (sb && !(sa && sa.rule === sb.rule)) why.push(sb);
    return why;
  }
  // a Part or a place that no rule lets move at all (used to skip candidates early)
  function frozen(data, code, pick) { return srcWhy(rulesFor(data, { code: code }), placeOf(pick)).length > 0; }
  // a Part stored where its own destination rules say it may not be (it already breaks a rule)
  function misplaced(data, code, pick) { return pick ? destWhy(rulesFor(data, { code: code }), placeOf(pick)) : []; }
  /* for the green / red map: may subject { code } or { type } end at this place? (from: current pick for the floor switch) */
  function destOk(data, subj, place, fromPick) {
    var lv = subj._lv || (subj._lv = rulesFor(data, subj)), why = destWhy(lv, place);
    if (fromPick && fromPick.floor !== place.floor) { var sf = sameFloorRule(lv); if (sf) why.push({ code: 'samefloor', rule: sf }); }
    return why;
  }
  // rules that leave a subject nowhere to go: a level whose "keep" areas are all inside its "deny" areas, or two levels whose "keep" areas never meet
  function deadEnds(data, places) {
    var out = [];
    function allowedSet(list) {
      var keeps = list.filter(function (r) { return r.act === 'keep'; }), denies = list.filter(function (r) { return r.act === 'deny'; });
      return places.filter(function (p) { return (!keeps.length || keeps.some(function (r) { return inArea(r.area, p); })) && !denies.some(function (r) { return inArea(r.area, p); }); });
    }
    var subjects = [];
    (data.types || []).forEach(function (tp) { subjects.push({ type: tp.id, label: tp.name }); });
    var seen = {}; (data.rules || []).forEach(function (r) { if (r.who && r.who.kind === 'part') (r.who.parts || []).forEach(function (c) { if (!seen[c]) { seen[c] = 1; subjects.push({ code: c, label: c }); } }); });
    subjects.push({ type: '\u0000none', label: '' });
    subjects.forEach(function (s) {
      var lv = rulesFor(data, s); if (!lv.levels[0].length && !lv.levels[1].length) return;
      var ok = allowedSet(lv.levels[0].concat(lv.levels[1]));
      if (!ok.length) out.push({ subj: s, rules: lv.levels[0].concat(lv.levels[1]).filter(function (r) { return r.act === 'keep' || r.act === 'deny'; }) });
    });
    return out;
  }

  // ---------- words ----------
  function typeName(data, id) { var x = ((data && data.types) || []).filter(function (tp) { return tp.id === id; })[0]; return x ? x.name : '?'; }
  function list(a, n) { n = n || 4; return a.length > n ? a.slice(0, n).join(', ') + ' ' + PWH.t('m5.a.more', { n: a.length - n }) : a.join(', '); }
  function areaText(a) {
    var t = PWH.t, bits = [];
    if (!a) return '…';
    if ((a.floors || []).length) bits.push(a.floors.map(function (f) { return t('m4.floor', { n: String(f).replace(/^F/, '') }); }).join(', '));
    if ((a.rows || []).length) bits.push(t('m5.a.rows', { v: list(a.rows, 8) }));
    if ((a.racks || []).length) bits.push(t('m5.a.racks', { v: list(a.racks, 6) }));
    if ((a.bins || []).length) bits.push(t('m5.a.bins', { v: list(a.bins, 6) }));
    return bits.join(' · ') || '…';
  }
  function whoText(data, w) {
    var t = PWH.t; w = w || {};
    if (w.kind === 'all') return t('m5.w.all');
    if (w.kind === 'type') return t('m5.w.type', { v: (w.types || []).length ? w.types.map(function (id) { return typeName(data, id); }).join(', ') : '…' });
    return t('m5.w.part', { v: (w.parts || []).length ? list(w.parts) : '…' });
  }
  // the rule as one sentence a person reads
  function ruleText(r, data) {
    var t = PWH.t; data = data || CUR;
    if (!r.act) return '';
    return t('m5.s.' + r.act, { who: whoText(data, r.who), a: areaText(r.area) });
  }
  // one line for each reason a move is refused (data gives type names)
  function reasonText(w, data) {
    var t = PWH.t; data = data || CUR;
    if (w.code === 'lock' || w.code === 'out' || w.code === 'deny' || w.code === 'keep') return t('m5.why.' + w.code, { p: w.part, rule: ruleText(w.rule, data) });
    if (w.code === 'samefloor') return t('m5.why.samefloor', { p: w.part, rule: ruleText(w.rule, data) });
    if (w.code === 'sametype') return t('m5.why.sametype', { p: w.part, a: typeName(data, w.a), b: w.b ? typeName(data, w.b) : t('m5.t.notype'), rule: ruleText(w.rule, data) });
    if (w.code === 'type') return t('m5.why.type', { a: typeName(data, w.a), b: typeName(data, w.b) });
    return t('m4.rule.' + w.code, { v: w.v || '' });
  }
  PWH.rules = { reasonText: reasonText, ruleText: ruleText, areaText: areaText, whoText: whoText, typeName: typeName, typeOf: typeOf, load: load, save: save,
    checkMove: checkMove, checkSwap: checkSwap, frozen: frozen, misplaced: misplaced, destOk: destOk, deadEnds: deadEnds, rulesFor: rulesFor,
    zoneOf: zoneOf, inArea: inArea, placeOf: placeOf, emptyArea: emptyArea, fixArea: fixArea };
})(window);
