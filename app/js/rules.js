/* Module 5 rules engine: may Part p move from bin X to bin Y?
 *
 * Rule kinds (agreed with the warehouse)
 *   lock   Part(s) that must stay, or an area nothing may leave
 *   allow  from an area, Parts may go ONLY to the listed destination areas ("only what is listed")
 *   deny   from an area, Parts may not go to the listed areas
 *   floor  Part(s) may be stored only on the listed floors
 * Areas: anywhere / bins or racks / rows (1N, 3G …) / named zones (groups of rows) / floors.
 * A rule applies to all Parts or to listed Parts. When rules disagree, "not allowed" always wins.
 * Size / weight limits are not used yet (no data); they must never be treated as passed without data.
 * Stored in the local database as meta 'rules' = { rules: [], zones: [], log: [] }. */
(function (g) {
  var PWH = g.PWH;

  function zoneOf(rack) { var m = String(rack || '').match(/^([0-9]*[A-Z]+)/); return m ? m[1] : String(rack || ''); }

  function load() {
    return Promise.all([PWH.db.getMeta('rules').catch(function () { return null; }), PWH.db.getMeta('locks').catch(function () { return null; })]).then(function (r) {
      var data = r[0] || { rules: [], zones: [], log: [] };
      // locks made with the first version of Module 5 become lock rules once
      var old = r[1];
      if (old && old.items && old.items.length && !data.migrated) {
        old.items.forEach(function (l) {
          data.rules.push(l.type === 'part'
            ? { id: l.id, kind: 'lock', name: l.code, subject: { all: false, parts: [l.code] }, from: { type: 'any', values: [] }, to: { type: 'any', values: [] }, reason: l.reason, by: l.by, at: l.at }
            : { id: l.id, kind: 'lock', name: l.code, subject: { all: true, parts: [] }, from: { type: 'bin', values: [l.code] }, to: { type: 'any', values: [] }, reason: l.reason, by: l.by, at: l.at });
        });
        (old.log || []).forEach(function (x) { data.log.push(x); });
      }
      data.migrated = true;
      return data;
    });
  }
  function save(data) { return PWH.db.setMeta('rules', data); }

  // where a bin is: { bin, rack, row, floor }
  function placeOf(pick) { return pick ? { bin: pick.bin, rack: pick.rack, row: zoneOf(pick.rack), floor: pick.floor } : null; }
  function inArea(data, area, pl) {
    if (!area || area.type === 'any') return true;
    if (!pl) return false;
    var v = area.values || [];
    if (area.type === 'bin') return v.indexOf(pl.bin) >= 0 || v.indexOf(pl.rack) >= 0;
    if (area.type === 'row') return v.indexOf(pl.row) >= 0;
    if (area.type === 'floor') return v.indexOf(pl.floor) >= 0;
    if (area.type === 'zone') return v.some(function (id) { var z = (data.zones || []).filter(function (x) { return x.id === id; })[0]; return z && z.rows.indexOf(pl.row) >= 0; });
    return false;
  }
  function forPart(rule, code) { return !rule.subject || rule.subject.all || (rule.subject.parts || []).indexOf(code) >= 0; }

  /* checkMove(data, partCode, fromPick, toPick) -> [] when allowed, else the reasons */
  function checkMove(data, code, fromPick, toPick) {
    var why = [], X = placeOf(fromPick), Y = placeOf(toPick), rules = (data && data.rules) || [];
    rules.forEach(function (r) {
      if (!forPart(r, code)) return;
      if (r.kind === 'lock' && inArea(data, r.from, X)) why.push({ code: 'lock', rule: r });
      else if (r.kind === 'deny' && inArea(data, r.from, X) && inArea(data, r.to, Y)) why.push({ code: 'deny', rule: r });
    });
    // "allow" rules that cover this Part and this source: the destination must be in one of them
    var allows = rules.filter(function (r) { return r.kind === 'allow' && forPart(r, code) && inArea(data, r.from, X); });
    if (allows.length && !allows.some(function (r) { return inArea(data, r.to, Y); })) why.push({ code: 'notallowed', rules: allows });
    // storage floors of a Part
    var floors = rules.filter(function (r) { return r.kind === 'floor' && forPart(r, code); });
    if (floors.length && !floors.every(function (r) { return inArea(data, r.to, Y); })) why.push({ code: 'floor', rules: floors });
    return why;
  }
  /* checkSwap: both sides of a 1:1 swap — A goes from X to Y and B from Y to X */
  function checkSwap(data, a, b) {
    var why = [];
    checkMove(data, a.code, a.pick, b.pick).forEach(function (w) { w.side = 'a'; w.part = a.code; why.push(w); });
    checkMove(data, b.code, b.pick, a.pick).forEach(function (w) { w.side = 'b'; w.part = b.code; why.push(w); });
    return why;
  }
  // a Part or an area that no rule lets move at all (used to skip candidates early)
  function frozen(data, code, pick) { return ((data && data.rules) || []).some(function (r) { return r.kind === 'lock' && forPart(r, code) && inArea(data, r.from, placeOf(pick)); }); }

  // one line a person can read for each reason a move is refused
  function reasonText(w) {
    var t = PWH.t, names = function (rs) { return rs.map(function (r) { return '“' + r.name + '”'; }).join(', '); };
    if (w.code === 'lock') return t('m5.why.lock', { p: w.part, name: w.rule.name });
    if (w.code === 'deny') return t('m5.why.deny', { p: w.part, name: w.rule.name });
    if (w.code === 'notallowed') return t('m5.why.notallowed', { p: w.part, names: names(w.rules) });
    if (w.code === 'floor') return t('m5.why.floor', { p: w.part, names: names(w.rules) });
    return t('m4.rule.' + w.code, { v: w.v || '' });
  }
  PWH.rules = { reasonText: reasonText, load: load, save: save, checkMove: checkMove, checkSwap: checkSwap, frozen: frozen, zoneOf: zoneOf, inArea: inArea };
})(window);
