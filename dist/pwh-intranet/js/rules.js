/* Module 5 rules engine: may Part A (in bin X) and Part B (in bin Y) swap?
 *
 * Four rule kinds (agreed with the warehouse, 2026-11-09 round 3):
 *   lock   ล็อกตำแหน่ง        listed Parts may not leave the chosen bins (or every bin they are in). Other Parts in those bins are free.
 *   deny   ห้ามย้ายไปพื้นที่     who → may not END in the area. Optional source area: only Parts coming from there.
 *                             It forbids moving in; it does not keep Parts that are already there from leaving.
 *   allow  ย้ายได้เฉพาะพื้นที่    who (from any place, or from a source area) → destination must be inside the area,
 *                             and/or on the same building floor as the source. Covers "must stay in A", "may not leave A",
 *                             "3G only to 1A" and "no swap across floors".
 *   pair   จำกัดคู่สลับ         who → the Part on the other side must belong to one of the listed item types.
 * who = listed Parts | item types | all Parts (lock: Parts only; pair: Parts or types).
 * Areas (same for every kind): bins (3G-04-01), racks (3G-04, every level), rack rows (3G), floors.
 * Deciding a pair: both A → Y and B → X are checked; a locked or refused side refuses the pair; every rule that applies
 * must pass (an "allow" never cancels a "deny"); a paused rule (off) is kept but not used.
 * Size / weight / bin capacity are a separate physical check (no data yet) and are never treated as passed.
 * Stored as meta 'rules' = { v: 4, types: [{id,name}], partType: {code: typeId}, rules: [], log: [] }. */
(function (g) {
  var PWH = g.PWH;
  var CUR = null;   // the rules last loaded or saved, for reason lines shown without the data at hand
  var DEFAULT_TYPES = ['Packaging', 'Part ผลิตเอง', 'Part PU พาเลท', 'Part PU ชิ้นเล็ก'];
  var KINDS = ['lock', 'deny', 'allow', 'pair'];

  function zoneOf(rack) { var m = String(rack || '').match(/^([0-9]*[A-Z]+)/); return m ? m[1] : String(rack || ''); }
  function emptyArea() { return { rows: [], floors: [], racks: [], bins: [] }; }
  function fixArea(a) { a = a || {}; return { rows: a.rows || [], floors: a.floors || [], racks: a.racks || [], bins: a.bins || [] }; }
  function areaEmpty(a) { a = fixArea(a); return !a.rows.length && !a.floors.length && !a.racks.length && !a.bins.length; }
  function allWho() { return { kind: 'all', parts: [], types: [] }; }

  // ---------- older formats -> v4 ----------
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
  function fromV1(old) {   // v1 lock / allow / deny / floor + zones -> v2
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
  function fromV2(d) {   // v2 lock / area(in|out|both) / keep -> v3 sentences
    var rules = [];
    (d.rules || []).forEach(function (r) {
      var base = { id: r.id, reason: r.reason || '', by: r.by, at: r.at, conv: r.conv, was: r.was };
      if (r.kind === 'lock') rules.push(Object.assign({}, base, { who: { kind: 'part', parts: r.parts || [], types: [] }, act: 'lock', area: emptyArea() }));
      else if (r.kind === 'keep') rules.push(Object.assign({}, base, { who: { kind: 'part', parts: r.parts || [], types: [] }, act: 'keep', area: fixArea(r.area) }));
      else if (r.kind === 'area') {
        if (r.dir !== 'in') rules.push(Object.assign({}, base, { who: allWho(), act: 'out', area: fixArea(r.area) }));
        if (r.dir !== 'out') rules.push(Object.assign({}, base, { id: r.dir === 'both' ? r.id + 'b' : r.id, who: allWho(), act: 'deny', area: fixArea(r.area) }));
      }
    });
    if (d.sameFloor) rules.push({ id: 'Rsamefloor', who: allWho(), act: 'samefloor', area: emptyArea(), reason: '', by: 'system', at: Date.now() });
    return { v: 3, types: DEFAULT_TYPES.map(function (n, i) { return { id: 'T' + (i + 1), name: n }; }), partType: {}, rules: rules, log: (d.log || []).slice(), dropped: d.dropped || [] };
  }
  function fromV3(d) {   // v3 keep / deny / out / lock / samefloor / sametype (+ v44 page switches) -> v4 four kinds
    var rules = [], dropped = (d.dropped || []).slice(), types = d.types || [];
    var src = (d.rules || []).slice();
    if (d.sameFloor) src.push({ id: 'Rsf' + Date.now(), who: allWho(), act: 'samefloor', by: 'system', at: Date.now() });
    if (d.sameType) src.push({ id: 'Rst' + Date.now(), who: allWho(), act: 'sametype', by: 'system', at: Date.now() });
    src.forEach(function (r) {
      var base = { id: r.id, reason: r.reason || '', by: r.by, at: r.at, off: !!r.off, conv: r.conv, was: r.was }, who = r.who || allWho(), area = fixArea(r.area);
      if (r.act === 'lock') {
        if (who.kind === 'part') rules.push(Object.assign({}, base, { kind: 'lock', who: who, lockBins: {} }));
        else dropped.push(PWH.t ? ruleTextV3(r, d) : r.id);
      }
      else if (r.act === 'deny') rules.push(Object.assign({}, base, { kind: 'deny', who: who, src: null, dest: area }));
      else if (r.act === 'keep') rules.push(Object.assign({}, base, { kind: 'allow', who: who, src: null, dest: area, sameFloor: false }));
      else if (r.act === 'out') rules.push(Object.assign({}, base, { kind: 'allow', who: who, src: area, dest: JSON.parse(JSON.stringify(area)), sameFloor: false }));
      else if (r.act === 'samefloor') rules.push(Object.assign({}, base, { kind: 'allow', who: who, src: null, dest: emptyArea(), sameFloor: true }));
      else if (r.act === 'sametype') {
        // "swap only with the same type": one pair rule per type it covered
        var tps = who.kind === 'type' ? who.types : who.kind === 'all' ? types.map(function (x) { return x.id; }) : [];
        if (who.kind === 'part') { var tp = (d.partType || {})[who.parts[0]]; if (tp) rules.push(Object.assign({}, base, { kind: 'pair', who: who, partners: [tp] })); else dropped.push(r.id); }
        tps.forEach(function (id, i) { rules.push(Object.assign({}, base, { id: r.id + (i ? '-' + i : ''), kind: 'pair', who: { kind: 'type', parts: [], types: [id] }, partners: [id] })); });
      }
    });
    var log = (d.log || []).slice(); log.push({ act: 'convert', name: dropped.join(', '), by: 'system', at: Date.now() });
    return { v: 4, types: types.length ? types : DEFAULT_TYPES.map(function (n, i) { return { id: 'T' + (i + 1), name: n }; }), partType: d.partType || {}, rules: rules, log: log, dropped: dropped };
  }
  function ruleTextV3(r, d) { var w = r.who || {}; return (w.kind === 'type' ? w.types.map(function (id) { return typeName(d, id); }).join(', ') : (w.parts || []).join(', ')) + ' · ' + r.act; }
  function load() {
    return Promise.all([PWH.db.getMeta('rules').catch(function () { return null; }), PWH.db.getMeta('locks').catch(function () { return null; })]).then(function (r) {
      var data = r[0];
      if (data && data.v === 4) { CUR = data; return data; }
      if (!data || (data.v !== 2 && data.v !== 3)) {
        data = data || { rules: [], zones: [], log: [] };
        var old = r[1];   // locks from the very first version of Module 5
        if (old && old.items && old.items.length && !data.migrated) old.items.forEach(function (l) {
          data.rules.push(l.type === 'part' ? { id: l.id, kind: 'lock', name: l.code, subject: { all: false, parts: [l.code] }, from: { type: 'any' }, reason: l.reason, by: l.by, at: l.at }
            : { id: l.id, kind: 'lock', name: l.code, subject: { all: true, parts: [] }, from: { type: 'bin', values: [l.code] }, reason: l.reason, by: l.by, at: l.at });
        });
        data = fromV1(data);
      }
      if (data.v === 2) data = fromV2(data);
      var v4 = fromV3(data); CUR = v4;
      return PWH.db.setMeta('rules', v4).then(function () { return v4; }, function () { return v4; });
    });
  }
  function save(data) { data.v = 4; CUR = data; return PWH.db.setMeta('rules', data); }

  // ---------- checking ----------
  // where a bin is: { bin, rack, row, floor }
  function placeOf(pick) { return pick ? { bin: pick.bin, rack: pick.rack, row: zoneOf(pick.rack), floor: pick.floor } : null; }
  function inArea(area, pl) {
    if (!area || !pl) return false;
    return (area.rows || []).indexOf(pl.row) >= 0 || (area.floors || []).indexOf(pl.floor) >= 0 || (area.racks || []).indexOf(pl.rack) >= 0 ||
      (area.bins || []).indexOf(pl.bin) >= 0 || (area.bins || []).indexOf(pl.rack) >= 0;
  }
  function typeOf(data, code) { return (data && data.partType && data.partType[code]) || null; }
  function covers(r, code, tp) {
    var w = r.who || {};
    return w.kind === 'all' || (w.kind === 'part' && code && (w.parts || []).indexOf(code) >= 0) || (w.kind === 'type' && tp && (w.types || []).indexOf(tp) >= 0);
  }
  /* every rule in use that covers a subject { code } or { type } — all of them must pass (no precedence) */
  function rulesFor(data, subj) {
    var tp = subj.code ? typeOf(data, subj.code) : subj.type;
    return ((data && data.rules) || []).filter(function (r) { return !r.off && covers(r, subj.code, tp); });
  }
  function fromOk(r, X) { return !r.src || areaEmpty(r.src) || (X && inArea(r.src, X)); }
  function lockedAt(r, code, X) { var b = (r.lockBins || {})[code]; return !b || !b.length || (X && b.indexOf(X.bin) >= 0); }
  // reasons the subject may not end at Y, coming from X (X may be null: rules tied to a source are then left out)
  function destWhy(list, X, Y, ignoreSrcRules) {
    var why = [];
    list.forEach(function (r) {
      if (r.kind !== 'deny' && r.kind !== 'allow') return;
      var tied = r.src && !areaEmpty(r.src);
      if (tied && (ignoreSrcRules || !X)) return;
      if (!fromOk(r, X)) return;
      if (r.kind === 'deny' && inArea(r.dest, Y)) why.push({ code: 'deny', rule: r });
      if (r.kind === 'allow') {
        var inside = areaEmpty(r.dest) || inArea(r.dest, Y), floorOk = !r.sameFloor || !X || X.floor === Y.floor;
        if (!inside || !floorOk) why.push({ code: 'allow', rule: r, floor: inside && !floorOk });
      }
    });
    return why;
  }
  /* checkMove(data, partCode, fromPick, toPick) -> [] when allowed, else the reasons (toPick may be null: only "may it leave?") */
  function checkMove(data, code, fromPick, toPick) {
    var list = rulesFor(data, { code: code }), X = placeOf(fromPick), Y = placeOf(toPick), why = [];
    list.forEach(function (r) { if (r.kind === 'lock' && lockedAt(r, code, X)) why.push({ code: 'lock', rule: r }); });
    if (Y) why = why.concat(destWhy(list, X, Y));
    return why;
  }
  // "the Part on the other side must belong to …" for one side of a pair
  function pairWhy(data, me, other) {
    var tm = typeOf(data, me), to = typeOf(data, other), out = [];
    ((data && data.rules) || []).forEach(function (r) {
      if (r.off || r.kind !== 'pair' || !covers(r, me, tm)) return;
      if (!to || (r.partners || []).indexOf(to) < 0) out.push({ code: 'pair', rule: r, part: me, other: other, otherType: to });
    });
    return out;
  }
  /* checkSwap: both sides of a 1:1 swap — A goes from X to Y and B from Y to X */
  function checkSwap(data, a, b) {
    var why = [];
    checkMove(data, a.code, a.pick, b.pick).forEach(function (w) { w.side = 'a'; w.part = a.code; why.push(w); });
    checkMove(data, b.code, b.pick, a.pick).forEach(function (w) { w.side = 'b'; w.part = b.code; why.push(w); });
    return why.concat(pairWhy(data, a.code, b.code), pairWhy(data, b.code, a.code));
  }
  // a Part locked where it is (used to skip candidates early)
  function frozen(data, code, pick) { var X = placeOf(pick); return rulesFor(data, { code: code }).some(function (r) { return r.kind === 'lock' && lockedAt(r, code, X); }); }
  // a Part stored where a rule with no source condition says it may not be (it already breaks a rule)
  function misplaced(data, code, pick) { return pick ? destWhy(rulesFor(data, { code: code }), null, placeOf(pick), true) : []; }
  /* for the green / red map: may subject { code } or { type } end at this place? fromPick = the Part's current bin */
  function destOk(data, subj, place, fromPick) {
    var list = subj._list || (subj._list = rulesFor(data, subj));
    return destWhy(list, fromPick ? placeOf(fromPick) : null, place, !fromPick);
  }
  // subjects whose rules (without a source condition) leave nowhere to go
  function deadEnds(data, places) {
    var out = [], subjects = [], seen = {};
    (data.types || []).forEach(function (tp) { subjects.push({ type: tp.id, label: tp.name }); });
    (data.rules || []).forEach(function (r) { if (r.who && r.who.kind === 'part') (r.who.parts || []).forEach(function (c) { if (!seen[c]) { seen[c] = 1; subjects.push({ code: c, label: c }); } }); });
    subjects.push({ type: '_none', label: '' });
    subjects.forEach(function (s) {
      var list = rulesFor(data, s).filter(function (r) { return (r.kind === 'deny' || r.kind === 'allow') && (!r.src || areaEmpty(r.src)) && !(r.kind === 'allow' && areaEmpty(r.dest)); });
      if (!list.length) return;
      if (!places.some(function (p) { return !destWhy(list, null, p, true).length; })) out.push({ subj: s, rules: list });
    });
    return out;
  }

  /* conflicts(data, rule, places): would saving this rule (new or edited) contradict the rules in use?
   *   dup   the same rule already exists
   *   dead  some Part or group would be left with no destination at all (deny / allow together)
   *   pair  some Part or group would be left with no allowed swap partner (partner lists that never meet)
   * Returns [] when the rule can be saved. */
  function sameRule(a, b) {
    function key(r) {
      var w = r.who || {};
      return JSON.stringify([r.kind, w.kind, (w.parts || []).slice().sort(), (w.types || []).slice().sort(), r.kind === 'lock' ? r.lockBins || {} : null,
        r.src && !areaEmpty(r.src) ? normArea(r.src) : null, r.dest ? normArea(r.dest) : null, !!r.sameFloor, (r.partners || []).slice().sort()]);
    }
    return key(a) === key(b);
  }
  function normArea(a) { a = fixArea(a); return [a.rows.slice().sort(), a.floors.slice().sort(), a.racks.slice().sort(), a.bins.slice().sort()]; }
  function conflicts(data, rule, places) {
    var out = [], rules = ((data && data.rules) || []).filter(function (r) { return r.id !== rule.id; });
    if (rule.off) return out;
    rules.filter(function (r) { return !r.off && sameRule(r, rule); }).forEach(function (r) { out.push({ code: 'dup', rules: [r] }); });
    if (out.length) return out;
    var d2 = Object.assign({}, data, { rules: rules.concat([rule]) });
    // the subjects this rule touches: its Parts, its types (and Parts of those types named in rules), or everybody
    var w = rule.who || {}, subj = [], seen = {};
    function addPart(c) { if (!seen['p' + c]) { seen['p' + c] = 1; subj.push({ code: c, label: c }); } }
    function addType(id) { if (!seen['t' + id]) { seen['t' + id] = 1; subj.push({ type: id, label: typeName(data, id), isType: 1 }); } }
    var named = []; rules.forEach(function (r) { if (r.who && r.who.kind === 'part') named = named.concat(r.who.parts || []); });
    if (w.kind === 'part') (w.parts || []).forEach(addPart);
    else if (w.kind === 'type') { (w.types || []).forEach(addType); named.forEach(function (c) { if ((w.types || []).indexOf(typeOf(data, c)) >= 0) addPart(c); }); }
    else { (data.types || []).forEach(function (tp) { addType(tp.id); }); subj.push({ type: '_none', label: '', all: 1 }); named.forEach(addPart); }
    // sources to try: the rule's own source area (a sample of its bins), or "any source"
    var srcs = [null];
    if (rule.src && !areaEmpty(rule.src) && places) { var inSrc = places.filter(function (p) { return inArea(rule.src, p); }); var step = Math.max(1, Math.floor(inSrc.length / 30)); srcs = inSrc.filter(function (p, i) { return i % step === 0; }).slice(0, 30); if (!srcs.length) srcs = [null]; }
    if ((rule.kind === 'deny' || rule.kind === 'allow') && places && places.length) {
      subj.forEach(function (s) {
        var list = rulesFor(d2, s).filter(function (r) { return r.kind === 'deny' || r.kind === 'allow'; });
        var dead = srcs.some(function (X) {
          var cand = X && rule.sameFloor ? places.filter(function (p) { return p.floor === X.floor; }) : places;
          return !cand.some(function (p) { return !destWhy(list, X, p, !X).length; });
        });
        if (dead) out.push({ code: 'dead', subj: s, rules: list.filter(function (r) { return r !== rule; }) });
      });
    }
    if (rule.kind === 'pair') {
      subj.forEach(function (s) {
        var tp = s.code ? typeOf(data, s.code) : s.type, list = rules.concat([rule]).filter(function (r) { return !r.off && r.kind === 'pair' && covers(r, s.code, tp); });
        var ok = null; list.forEach(function (r) { var ps = r.partners || []; ok = ok === null ? ps.slice() : ok.filter(function (x) { return ps.indexOf(x) >= 0; }); });
        if (list.length > 1 && ok && !ok.length) out.push({ code: 'pair', subj: s, rules: list.filter(function (r) { return r !== rule; }) });
      });
    }
    return out;
  }
  function conflictText(c, data) {
    var t = PWH.t; data = data || CUR;
    var who = c.subj ? (c.subj.code ? c.subj.code : c.subj.all ? t('m5.w.all') : t('m5.w.type', { v: c.subj.label })) : '';
    return t('m5.cf.' + c.code, { who: who, rules: (c.rules || []).map(function (r) { return '“' + ruleText(r, data) + '”'; }).join(', ') || '–' });
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
  function lockText(r) {
    var parts = (r.who && r.who.parts) || [], lb = r.lockBins || {};
    return parts.map(function (c) { var b = lb[c]; return b && b.length ? c + ' @ ' + b.join(', ') : c + ' (' + PWH.t('m5.lk.all') + ')'; }).join('; ') || '…';
  }
  function destText(r) {
    var t = PWH.t, bits = [];
    if (!areaEmpty(r.dest)) bits.push(areaText(r.dest));
    if (r.sameFloor) bits.push(t('m5.dst.samefloor'));
    return bits.join(' ' + t('m5.and') + ' ') || '…';
  }
  // the rule as one sentence a person reads
  function ruleText(r, data) {
    var t = PWH.t; data = data || CUR;
    if (!r || !r.kind) return '';
    var w = whoText(data, r.who), src = r.src && !areaEmpty(r.src) ? t('m5.s.from', { a: areaText(r.src) }) : '';
    if (r.kind === 'lock') return t('m5.s4.lock', { v: lockText(r) });
    if (r.kind === 'deny') return t('m5.s4.deny', { who: w, from: src, a: areaText(r.dest) });
    if (r.kind === 'allow') return t('m5.s4.allow', { who: w, from: src, a: destText(r) });
    if (r.kind === 'pair') return t('m5.s4.pair', { who: w, v: (r.partners || []).map(function (id) { return typeName(data, id); }).join(', ') || '…' });
    return '';
  }
  // one line for each reason a pair is refused
  function reasonText(w, data) {
    var t = PWH.t; data = data || CUR;
    if (w.code === 'lock') return t('m5.why4.lock', { p: w.part, rule: ruleText(w.rule, data) });
    if (w.code === 'deny') return t('m5.why4.deny', { p: w.part, rule: ruleText(w.rule, data) });
    if (w.code === 'allow') return t(w.floor ? 'm5.why4.floor' : 'm5.why4.allow', { p: w.part, rule: ruleText(w.rule, data) });
    if (w.code === 'pair') return t('m5.why4.pair', { p: w.part, o: w.other, ot: w.otherType ? typeName(data, w.otherType) : t('m5.t.notype'), rule: ruleText(w.rule, data) });
    return t('m4.rule.' + w.code, { v: w.v || '' });
  }
  PWH.rules = { KINDS: KINDS, reasonText: reasonText, ruleText: ruleText, areaText: areaText, whoText: whoText, destText: destText, lockText: lockText, typeName: typeName, typeOf: typeOf,
    load: load, save: save, checkMove: checkMove, checkSwap: checkSwap, frozen: frozen, misplaced: misplaced, conflicts: conflicts, conflictText: conflictText, destOk: destOk, deadEnds: deadEnds, rulesFor: rulesFor,
    zoneOf: zoneOf, inArea: inArea, placeOf: placeOf, emptyArea: emptyArea, fixArea: fixArea, areaEmpty: areaEmpty };
})(window);
