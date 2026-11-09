/* Module 5 rules engine: may Part p move from bin X to bin Y?
 *
 * Kept simple on purpose (agreed with the warehouse, 2026-11-09):
 *   sameFloor  switch for every Part: a swap must stay on one floor
 *   lock       listed Parts never move
 *   area       an area nobody touches: nothing leaves it ('out'), nothing enters it ('in'), or both
 *   keep       listed Parts must stay inside an area (their destination must be in it)
 * An area = rack rows clicked on the map (1N, 3G …) and/or whole floors; bins only from converted old rules.
 * No zones: old zones are turned into their rows. When rules disagree, "not allowed" always wins.
 * Size / weight limits are not used yet (no data); they must never be treated as passed without data.
 * Stored in the local database as meta 'rules' = { v: 2, sameFloor, rules: [], log: [] }. */
(function (g) {
  var PWH = g.PWH;

  function zoneOf(rack) { var m = String(rack || '').match(/^([0-9]*[A-Z]+)/); return m ? m[1] : String(rack || ''); }
  function emptyArea() { return { rows: [], floors: [], bins: [] }; }

  // ---------- old format (v1: lock / allow / deny / floor + zones) -> v2 ----------
  function areaFromOld(a, zones) {
    var out = emptyArea(); if (!a) return out;
    var v = a.values || [];
    if (a.type === 'row') out.rows = v.slice();
    else if (a.type === 'floor') out.floors = v.slice();
    else if (a.type === 'bin') out.bins = v.slice();
    else if (a.type === 'zone') v.forEach(function (id) { var z = zones.filter(function (x) { return x.id === id; })[0]; if (z) z.rows.forEach(function (r) { if (out.rows.indexOf(r) < 0) out.rows.push(r); }); });
    return out;
  }
  function isAny(a) { return !a || a.type === 'any'; }
  function convert(old) {
    var zones = old.zones || [], rules = [], dropped = [];
    (old.rules || []).forEach(function (r) {
      var base = { id: r.id, reason: r.reason || '', by: r.by, at: r.at, was: r.name }, parts = (r.subject && !r.subject.all && r.subject.parts) || [];
      function add(x, exact) { var o = Object.assign({}, base, x); if (!exact) o.conv = true; rules.push(o); }
      if (r.kind === 'lock') {
        if (parts.length) add({ kind: 'lock', parts: parts.slice() }, isAny(r.from));
        else add({ kind: 'area', dir: 'out', area: areaFromOld(r.from, zones) }, true);
      } else if (r.kind === 'deny') {
        if (parts.length) dropped.push(r.name);
        else add({ kind: 'area', dir: 'in', area: areaFromOld(r.to, zones) }, isAny(r.from));
      } else if (r.kind === 'allow' || r.kind === 'floor') {
        if (parts.length) add({ kind: 'keep', parts: parts.slice(), area: areaFromOld(r.to, zones) }, isAny(r.from));
        else dropped.push(r.name);
      }
    });
    var log = (old.log || []).slice();
    if ((old.rules || []).length || zones.length) log.push({ act: 'convert', name: dropped.length ? dropped.join(', ') : '', by: 'system', at: Date.now() });
    return { v: 2, sameFloor: false, rules: rules, log: log, dropped: dropped };
  }

  function load() {
    return Promise.all([PWH.db.getMeta('rules').catch(function () { return null; }), PWH.db.getMeta('locks').catch(function () { return null; })]).then(function (r) {
      var data = r[0];
      if (data && data.v === 2) return data;
      data = data || { rules: [], zones: [], log: [] };
      // locks made with the very first version of Module 5
      var old = r[1];
      if (old && old.items && old.items.length && !data.migrated) {
        old.items.forEach(function (l) {
          data.rules.push(l.type === 'part'
            ? { id: l.id, kind: 'lock', name: l.code, subject: { all: false, parts: [l.code] }, from: { type: 'any' }, reason: l.reason, by: l.by, at: l.at }
            : { id: l.id, kind: 'lock', name: l.code, subject: { all: true, parts: [] }, from: { type: 'bin', values: [l.code] }, reason: l.reason, by: l.by, at: l.at });
        });
      }
      var v2 = convert(data);
      return PWH.db.setMeta('rules', v2).then(function () { return v2; }, function () { return v2; });
    });
  }
  function save(data) { data.v = 2; return PWH.db.setMeta('rules', data); }

  // where a bin is: { bin, rack, row, floor }
  function placeOf(pick) { return pick ? { bin: pick.bin, rack: pick.rack, row: zoneOf(pick.rack), floor: pick.floor } : null; }
  function inArea(area, pl) {
    if (!area || !pl) return false;
    return (area.rows || []).indexOf(pl.row) >= 0 || (area.floors || []).indexOf(pl.floor) >= 0 || (area.bins || []).indexOf(pl.bin) >= 0 || (area.bins || []).indexOf(pl.rack) >= 0;
  }
  function has(rule, code) { return (rule.parts || []).indexOf(code) >= 0; }

  /* checkMove(data, partCode, fromPick, toPick) -> [] when allowed, else the reasons (toPick may be null: only "may it leave?") */
  function checkMove(data, code, fromPick, toPick) {
    var why = [], X = placeOf(fromPick), Y = placeOf(toPick), rules = (data && data.rules) || [];
    rules.forEach(function (r) {
      if (r.kind === 'lock' && has(r, code)) why.push({ code: 'lock', rule: r });
      else if (r.kind === 'area') {
        if (r.dir !== 'in' && inArea(r.area, X)) why.push({ code: 'areaout', rule: r });
        if (r.dir !== 'out' && Y && inArea(r.area, Y)) why.push({ code: 'areain', rule: r });
      } else if (r.kind === 'keep' && has(r, code) && Y && !inArea(r.area, Y)) why.push({ code: 'keep', rule: r });
    });
    if (data && data.sameFloor && X && Y && X.floor !== Y.floor) why.push({ code: 'crossfloor' });
    return why;
  }
  /* checkSwap: both sides of a 1:1 swap — A goes from X to Y and B from Y to X */
  function checkSwap(data, a, b) {
    var why = [];
    checkMove(data, a.code, a.pick, b.pick).forEach(function (w) { w.side = 'a'; w.part = a.code; why.push(w); });
    checkMove(data, b.code, b.pick, a.pick).forEach(function (w) { if (w.code === 'crossfloor') return; w.side = 'b'; w.part = b.code; why.push(w); });   // the floor reason once per pair
    return why;
  }
  // a Part or a place that no rule lets move at all (used to skip candidates early)
  function frozen(data, code, pick) {
    var X = placeOf(pick);
    return ((data && data.rules) || []).some(function (r) { return (r.kind === 'lock' && has(r, code)) || (r.kind === 'area' && r.dir !== 'in' && inArea(r.area, X)); });
  }

  // ---------- words ----------
  function areaText(a) {
    var t = PWH.t, bits = [];
    if (!a) return '–';
    if ((a.floors || []).length) bits.push(a.floors.map(function (f) { return t('m4.floor', { n: String(f).replace(/^F/, '') }); }).join(', '));
    if ((a.rows || []).length) bits.push(t('m5.a.rows', { v: a.rows.join(', ') }));
    if ((a.bins || []).length) bits.push(t('m5.a.bins', { v: a.bins.join(', ') }));
    return bits.join(' · ') || '…';
  }
  function partsText(list) { if (!list.length) return '…'; return list.length > 4 ? list.slice(0, 4).join(', ') + ' ' + PWH.t('m5.a.more', { n: list.length - 4 }) : list.join(', '); }
  // the rule as one sentence a person reads
  function ruleText(r) {
    var t = PWH.t;
    if (r.kind === 'lock') return t('m5.s.lock', { p: partsText(r.parts || []) });
    if (r.kind === 'area') return t('m5.s.area.' + (r.dir || 'both'), { a: areaText(r.area) });
    if (r.kind === 'keep') return t('m5.s.keep', { p: partsText(r.parts || []), a: areaText(r.area) });
    return '';
  }
  // one line for each reason a move is refused
  function reasonText(w) {
    var t = PWH.t;
    if (w.code === 'lock' || w.code === 'areaout' || w.code === 'areain' || w.code === 'keep') return t('m5.why.' + w.code, { p: w.part, rule: ruleText(w.rule) });
    if (w.code === 'crossfloor') return t('m5.why.crossfloor', { p: w.part });
    return t('m4.rule.' + w.code, { v: w.v || '' });
  }
  PWH.rules = { reasonText: reasonText, ruleText: ruleText, areaText: areaText, load: load, save: save, checkMove: checkMove, checkSwap: checkSwap, frozen: frozen, zoneOf: zoneOf, inArea: inArea, emptyArea: emptyArea, convert: convert };
})(window);
