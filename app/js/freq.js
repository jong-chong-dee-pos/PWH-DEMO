/* Module 4 engine: pick frequency from the daily plans, simulated cart distance, 1:1 swap advice, swap simulation.
 *
 * Agreed rules (Module 4 spec, 07/11/2026)
 *   round      = same plan date + same U-line + same JOB (several rows of one JOB on one day and line = one round)
 *   Part       = counted once per round; first level of the BOM; SUB-AS not broken down; BOM quantity ignored
 *   planned    = rounds that list the Part.  routed = rounds where the Part has a pick point the cart can reach
 *   location   = the bin the pick route uses: same rule as Module 3 (bins on the layout, with stock, least stock, bin name)
 *   distance   = simulated metres along cart aisles from START to DROP (same router as Module 3); the lift adds 0 m
 *   distance   = every round whose Parts are known; Parts without a bin on the layout are left out of the route and the
 *                round is marked "route does not include every Part" (agreed 07/11/2026, replaces complete-rounds-only)
 *   swap       = Part A at bin X <-> Part B at bin Y; other Parts in X and Y and other bins of A and B stay
 * Nothing here changes stored data. */
(function (g) {
  var PWH = g.PWH;

  function natural(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  // ---------- dates ----------
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  // default range: the latest plan date and the two calendar days before it (never stretched to "3 days with plans")
  function defaultRange(d) {
    var last = d.dates[d.dates.length - 1]; if (!last) return { from: '', to: '' };
    return { from: addDays(last, -2), to: last };
  }
  function daysIn(d, from, to) {
    var out = [], has = new Set(d.dates); if (!from || !to || from > to) return out;
    for (var x = from, i = 0; x <= to && i < 3700; x = addDays(x, 1), i++) out.push({ date: x, plan: has.has(x) });
    return out;
  }

  // ---------- data ----------
  // a signature of everything the analysis depends on; when it changes, earlier results are out of date
  function sigOf(obj) { var s = JSON.stringify(obj || null), h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return s.length + ':' + h; }
  function keyNow() {
    var A = PWH.app, ids = function (ty) { return A.activeFiles(ty).map(function (f) { return f.id; }).sort().join(','); };
    return Promise.all([PWH.db.getMeta('layout').catch(function () { return null; }), PWH.db.getMeta('rules').catch(function () { return null; }), plantPicks()]).then(function (r) {
      return [ids('bom'), ids('matloc'), ids('daily'), ids('monthly'), sigOf(r[0] && r[0].floors), sigOf([(r[1] && r[1].rules) || [], (r[1] && r[1].partType) || {}]), sigOf(sortObj(r[2]))].join('|');
    });
  }
  // the Plant chosen for a Product the plan cannot place by itself (Module 4 asks once; kept for every calculation after)
  var PLANTS = 'plantPick.v1';
  function sortObj(o) { var x = {}; Object.keys(o || {}).sort().forEach(function (k) { x[k] = o[k]; }); return x; }
  function plantPicks() { return PWH.db.getMeta(PLANTS).catch(function () { return null; }).then(function (v) { return v || {}; }); }
  function savePlantPicks(o) { return PWH.db.setMeta(PLANTS, sortObj(o)); }
  function load() {
    var A = PWH.app;
    var bom = A.activeFile('bom'), ml = A.activeFile('matloc'), daily = A.activeFiles('daily'), monthly = A.activeFiles('monthly');
    return Promise.all([
      bom ? PWH.db.getRows(bom.id) : null, ml ? PWH.db.getRows(ml.id) : null,
      Promise.all(daily.map(function (f) { return PWH.db.getRows(f.id).then(function (r) { return { date: f.planDate, rows: r, file: f }; }); })),
      Promise.all(monthly.map(function (f) { return PWH.db.getRows(f.id); })),
      PWH.db.getMeta('layout').catch(function () { return null; }),
      PWH.rules.load(), keyNow(), plantPicks()
    ]).then(function (r) {
      var d = { have: { bom: !!r[0], matloc: !!r[1], daily: r[2].length > 0, monthly: r[3].length > 0, layout: !!r[4] },
        L: r[4] || null, bins: new Map(), text: new Map(), desc: new Map(), orderPlant: new Map(), days: [], rules: r[5] || { rules: [], zones: [], log: [] },
        key: r[6], loadedAt: Date.now(), plantPick: r[7] || {},
        files: { bom: bom, matloc: ml, monthly: monthly, daily: daily } };
      if (r[0]) {
        d.index = PWH.checks.buildIndex(r[0]);
        r[0].forEach(function (row) { if (row[3] && !d.text.has(row[2])) d.text.set(row[2], row[3]); });
      }
      // one entry per Part and bin: a bin listed once per Plant is still one place (its stock is read as Module 3 reads it)
      if (r[1]) r[1].forEach(function (row) {
        if (!row[2]) return;
        var code = String(row[2]).trim(), bin = String(row[1]).trim(), st = +row[4] || 0;
        var a = d.bins.get(code); if (!a) d.bins.set(code, (a = []));
        var e = a.filter(function (x) { return x.bin === bin; })[0];
        if (!e) a.push({ bin: bin, stock: st, plants: [row[3]] });
        else { e.plants.push(row[3]); if (st > 0 && (e.stock <= 0 || st < e.stock)) e.stock = st; }
      });
      r[3].forEach(function (rows) { rows.forEach(function (row) { d.orderPlant.set(String(row[2]).trim(), row[1]); if (row[4] && !d.desc.has(row[3])) d.desc.set(row[3], row[4]); }); });
      // the app keeps one file in use per plan date (the newest active one); its rows are never mixed with older uploads
      r[2].forEach(function (day) { d.days.push(day); day.rows.forEach(function (row) { if (row[2] && !d.desc.has(row[1])) d.desc.set(row[1], row[2]); }); });
      d.days.sort(function (a, b) { return natural(a.date, b.date); });
      d.dates = d.days.map(function (x) { return x.date; });
      d.match = d.L ? PWH.layout.match(d.L, r[1] || []) : null;
      // racks that hold at least one Part in Material-Location (to tell "0 picks" from "no data" on the heatmap)
      d.rackData = new Set(); if (d.match) d.match.occ.forEach(function (_, rid) { d.rackData.add(rid); });
      return d;
    });
  }

  // ---------- locations ----------
  function locOf(d, bin) {
    if (!d.L || !d.match) return { kind: 'nolayout' };
    var bi = PWH.layout.binInfo(bin); if (!bi) return { kind: 'special' };
    var rack = d.match.rackById.get(bi.rack); if (!rack) return { kind: 'norack' };
    return { kind: 'rack', rack: bi.rack, level: bi.level, floor: rack.floor };
  }
  function reach(d, rack) { var acc = PWH.route.build(d.L).rackAccess.get(rack); return !!(acc && acc.length); }
  // a pick point for a bin (used by the rule check and the swap list)
  function pointOf(d, bin) {
    var l = locOf(d, bin);
    if (l.kind !== 'rack') return { status: l.kind === 'special' ? 'special' : 'notonlayout', bin: bin };
    return { status: reach(d, l.rack) ? 'ok' : 'unreach', bin: bin, rack: l.rack, level: l.level, floor: l.floor };
  }
  // the bin a pick route uses for a Part, or why there is none.  ov: Map code -> bins (the swap scenario)
  function pickOf(d, code, ov) {
    var all = (ov && ov.get(code)) || d.bins.get(code) || [];
    if (!all.length) return { status: 'noloc', bins: [] };
    var bins = all.map(function (b) { return { bin: b.bin, stock: b.stock, loc: locOf(d, b.bin) }; });
    var rk = bins.filter(function (b) { return b.loc.kind === 'rack'; });
    if (!rk.length) return { status: bins.some(function (b) { return b.loc.kind === 'special'; }) && !bins.some(function (b) { return b.loc.kind === 'norack'; }) ? 'special' : 'notonlayout', bins: bins };
    var ws = rk.filter(function (b) { return b.stock > 0; }), pool = (ws.length ? ws : rk).slice().sort(function (a, b) { return ((a.stock || 0) - (b.stock || 0)) || natural(a.bin, b.bin); });
    // a rack with no cart aisle next to it on the layout (e.g. the back row K) cannot be walked to
    if (!reach(d, pool[0].loc.rack)) return { status: 'unreach', bin: pool[0].bin, rack: pool[0].loc.rack, bins: bins };
    return { status: 'ok', bin: pool[0].bin, rack: pool[0].loc.rack, level: pool[0].loc.level, floor: pool[0].loc.floor, bins: bins };
  }

  // ---------- rounds ----------
  function plantOf(d, job, product) {
    var pl = d.orderPlant.get(String(job));
    var plants = []; if (d.index) d.index.byPlant.forEach(function (pm, p) { if (pm.has(product)) plants.push(p); });
    if (pl && plants.indexOf(pl) >= 0) return { plant: pl, how: 'job' };
    if (plants.length === 1) return { plant: plants[0], how: 'only' };
    if (!plants.length) return { plant: null, why: 'nobom' };
    return { plant: null, why: 'plant', plants: plants };
  }
  function roundsIn(d, from, to, issues) {
    var by = new Map();
    d.days.forEach(function (day) {
      if ((from && day.date < from) || (to && day.date > to)) return;
      day.rows.forEach(function (row, i) {
        var job = String(row[0] == null ? '' : row[0]).trim(), prod = String(row[1] == null ? '' : row[1]).trim();
        if (!job || !prod) { issues.push({ why: job ? 'noproduct' : 'nojob', date: day.date, line: row[4] || '', job: job, product: prod, file: day.file.name, row: i + 2 }); return; }
        var key = day.date + '|' + (row[4] || '') + '|' + job;
        var r = by.get(key); if (!r) by.set(key, (r = { key: key, date: day.date, line: row[4] || '', job: job, products: [], qty: 0, file: day.file.name }));
        if (r.products.indexOf(prod) < 0) r.products.push(prod);
        r.qty += +row[3] || 0;
      });
    });
    return Array.from(by.values()).sort(function (a, b) { return natural(a.date, b.date) || natural(a.line, b.line) || natural(a.job, b.job); });
  }
  function partsOf(d, product, plant) {
    var pm = d.index && d.index.byPlant.get(plant), kids = pm && pm.get(product);
    return kids ? Array.from(kids.keys()).sort(natural) : [];
  }

  // ---------- route distance of one Product (cached by the bins its Parts use) ----------
  function makeRouter(d) {
    var cache = new Map();
    function fn(list, key, legs) {
      var ok = list.filter(function (it) { return it.pick.status === 'ok'; });
      var k = key + '|' + ok.map(function (it) { return it.pick.bin; }).join(',') + (legs ? '|L' : '');
      if (cache.has(k)) return cache.get(k);
      var items = ok.map(function (it) { return { key: it.code, cands: [{ bin: it.pick.bin, rack: it.pick.rack, level: it.pick.level, floor: it.pick.floor, stock: 1 }] }; });
      var res = { m: 0, stops: 0, lifts: 0, unreach: [] };
      if (items.length && d.L) {
        var r = PWH.route.plan(d.L, items, legs ? {} : { noLegs: true }), fl = {}; ok.forEach(function (it) { fl[it.code] = it.pick.floor; });
        // lift rides: every change of floor from START, through the stops, to DROP
        var cur = r.start ? r.start.floor : null, lifts = 0; r.order.forEach(function (o) { var f = fl[o.key]; if (cur && f && f !== cur) lifts++; cur = f || cur; }); if (r.drop && cur && cur !== r.drop.floor) lifts++;
        res = { m: r.total || 0, stops: r.order.length, lifts: lifts, unreach: r.unreachable || [], order: r.order, legs: r.legs };
      }
      cache.set(k, res);
      return res;
    }
    return fn;
  }

  /* analyze(d, {from, to, product, ov, router, progress}) -> Promise of everything the frequency tab shows */
  function analyze(d, opt) {
    opt = opt || {};
    var issues = [], rounds = roundsIn(d, opt.from, opt.to, issues), picks = new Map(), parts = new Map(), locs = new Map(), prods = new Map();
    var route = opt.router || makeRouter(d), ov = opt.ov || null;
    if (opt.product) rounds = rounds.filter(function (r) { return r.products.indexOf(opt.product) >= 0; });
    function pick(code) { if (!picks.has(code)) picks.set(code, pickOf(d, code, ov)); return picks.get(code); }
    var i = 0;
    function step() {
      var end = Math.min(rounds.length, i + 25);
      for (; i < end; i++) one(rounds[i]);
      if (opt.progress) opt.progress(i, rounds.length);
      return i < rounds.length ? tick().then(step) : null;
    }
    function one(r) {
      r.parts = []; r.routed = []; r.m = 0; r.sec = 0; r.missing = 0; r.unknown = 0; r.byProd = {};
      r.products.forEach(function (prod) {
        if (opt.product && prod !== opt.product) return;
        var pp = plantOf(d, r.job, prod), own = opt.plantPick && opt.plantPick[prod];
        if (!pp.plant && own && (pp.plants || []).indexOf(own) >= 0) pp = { plant: own, how: 'user', plants: pp.plants };   // chosen on the page, this calculation only
        function prodRow(status, plant) { var P0 = prods.get(prod); if (!P0) prods.set(prod, (P0 = { product: prod, plant: plant, how: pp.how || '', plants: pp.plants || [], status: status, rounds: 0, complete: 0, m: 0, mAll: 0, parts: 0, routedParts: 0, rlist: [] })); return P0; }
        if (!pp.plant) { r.unknown++; issues.push({ why: pp.why, date: r.date, line: r.line, job: r.job, product: prod, file: r.file, plants: pp.plants }); var U = prodRow(pp.why, null); U.rounds++; U.rlist.push(r); if (pp.why === 'plant') { U.needPlant = true; U.plants = pp.plants; } return; }
        var codes = partsOf(d, prod, pp.plant);
        if (!codes.length) { r.unknown++; issues.push({ why: 'noparts', date: r.date, line: r.line, job: r.job, product: prod, file: r.file }); var U2 = prodRow('noparts', pp.plant); U2.rounds++; U2.rlist.push(r); return; }
        var P = prodRow('ok', pp.plant); P.parts = codes.length;
        var list = codes.map(function (c) { return { code: c, pick: pick(c) }; });
        var rt = route(list, prod + '|' + pp.plant);
        var miss = 0;
        list.forEach(function (it) {
          var routed = it.pick.status === 'ok' && rt.unreach.indexOf(it.code) < 0;
          if (!routed) miss++;
          if (r.parts.indexOf(it.code) >= 0) return;   // a Part counts once per round
          r.parts.push(it.code); if (routed) r.routed.push(it.code);
          var x = parts.get(it.code); if (!x) parts.set(it.code, (x = { code: it.code, name: d.text.get(it.code) || '', n: 0, nRoute: 0, products: new Map(), pick: it.pick }));
          x.n++; x.products.set(prod, (x.products.get(prod) || 0) + 1);
          if (routed) { x.nRoute++; var L = locs.get(it.pick.bin); if (!L) locs.set(it.pick.bin, (L = { bin: it.pick.bin, rack: it.pick.rack, level: it.pick.level, floor: it.pick.floor, n: 0, parts: new Map() })); L.n++; L.parts.set(it.code, (L.parts.get(it.code) || 0) + 1); }
        });
        var sec = rt.stops ? timeOf(rt.m, rt.stops, rt.lifts).sec : 0;
        r.missing += miss; r.m += rt.m; r.sec += sec; r.byProd[prod] = { m: rt.m, sec: sec, complete: miss === 0 };
        P.routedParts = codes.length - miss; if (miss) P.status = 'partial';
        P.rounds++; P.mAll += rt.m; P.rlist.push(r);
        if (miss === 0) P.complete++;
        P.m += rt.m; P.missingParts = miss;
        P.missing = miss;
      });
      r.identified = r.parts.length > 0;
      r.complete = r.identified && r.missing === 0 && r.unknown === 0;
    }
    return Promise.resolve(step()).then(function () {
      var ident = rounds.filter(function (r) { return r.identified; }), comp = rounds.filter(function (r) { return r.complete; });
      var partList = Array.from(parts.values()).sort(function (a, b) { return b.n - a.n || natural(a.code, b.code); });
      var locList = Array.from(locs.values()).sort(function (a, b) { return b.n - a.n || natural(a.bin, b.bin); });
      // heatmap: one cell per rack on the layout; a rack sums the bins (levels) inside it
      var heat = new Map();
      locList.forEach(function (l) { var h = heat.get(l.rack); if (!h) heat.set(l.rack, (h = { rack: l.rack, floor: l.floor, n: 0, bins: [] })); h.n += l.n; h.bins.push(l); });
      var plan = partList.reduce(function (s, p) { return s + p.n; }, 0), routed = partList.reduce(function (s, p) { return s + p.nRoute; }, 0);
      var heatSum = 0; heat.forEach(function (h) { heatSum += h.n; });
      partList.forEach(function (p) { if (p.pick.status !== 'ok') issues.push({ why: 'loc_' + p.pick.status, part: p.code, name: p.name, n: p.n, bins: (p.pick.bins || []).map(function (b) { return b.bin; }), products: Array.from(p.products.keys()) }); });
      return {
        from: opt.from, to: opt.to, product: opt.product || '', plantPick: opt.plantPick || null, at: Date.now(), key: d.key,
        rounds: rounds, identified: ident, complete: comp, partial: ident.filter(function (r) { return !r.complete; }),
        parts: partList, locs: locList, heat: heat, heatSum: heatSum,
        products: Array.from(prods.values()).sort(function (a, b) { return b.rounds - a.rounds || natural(a.product, b.product); }),
        planFreq: plan, routeFreq: routed, consistent: heatSum === routed,
        totalM: ident.reduce(function (s, r) { return s + r.m; }, 0),
        totalSec: ident.reduce(function (s, r) { return s + r.sec; }, 0),
        partialM: ident.filter(function (r) { return !r.complete; }).reduce(function (s, r) { return s + r.m; }, 0),
        issues: issues, router: route
      };
    });
  }

  // ---------- rules (Module 5) ----------
  /* checkSwap(d, a, b): a / b = { code, pick } where pick is the bin being swapped. Both directions are checked.
   * status: 'pass' (size and weight are not checked: no data yet) or 'fail' with the reasons */
  function checkSwap(d, a, b) {
    var why = [];
    if (!a.pick || a.pick.status !== 'ok') why.push({ code: 'a_noloc' });
    if (!b.pick || b.pick.status !== 'ok') why.push({ code: 'b_noloc' });
    if (why.length) {
      // a side that cannot be placed still reports its own lock, so the person sees every reason at once
      [['a', a], ['b', b]].forEach(function (s) { var x = s[1]; if (x.pick && x.pick.status === 'ok' && PWH.rules.frozen(d.rules, x.code, x.pick)) PWH.rules.checkMove(d.rules, x.code, x.pick, null).filter(function (w) { return w.code === 'lock'; }).forEach(function (w) { w.side = s[0]; w.part = x.code; why.push(w); }); });
      return why;
    }
    if (a.pick.bin === b.pick.bin) return [{ code: 'same_bin' }];
    return PWH.rules.checkSwap(d.rules, a, b);
  }
  // the bins of the Parts after the swaps: A's bin X becomes Y and B's bin Y becomes X; nothing else changes
  function overrideOf(d, pairs) {
    var ov = new Map();
    function moved(code, from, to) {
      var cur = (ov.get(code) || d.bins.get(code) || []).map(function (b) { return { bin: b.bin, stock: b.stock }; });
      cur.forEach(function (b) { if (b.bin === from) b.bin = to; });
      ov.set(code, cur);
    }
    pairs.forEach(function (s) { moved(s.a.code, s.a.pick.bin, s.b.pick.bin); moved(s.b.code, s.b.pick.bin, s.a.pick.bin); });
    return ov;
  }

  /* simulate(d, base, pairs) -> before / after on the same rounds and the same data */
  function simulate(d, base, pairs, progress) {
    var ov = overrideOf(d, pairs);
    return analyze(d, { from: base.from, to: base.to, product: base.product, plantPick: base.plantPick, ov: ov, router: base.router, progress: progress }).then(function (after) {
      var aBy = new Map(); after.rounds.forEach(function (r) { aBy.set(r.key, r); });
      var prod = new Map(), before = 0, aft = 0, secB = 0, secA = 0, lost = [];
      base.identified.forEach(function (r) {
        var ar = aBy.get(r.key);
        Object.keys(r.byProd).forEach(function (p) {
          var b0 = r.byProd[p].m, a0 = ar && ar.byProd[p] ? ar.byProd[p].m : b0, bs = r.byProd[p].sec, as = ar && ar.byProd[p] ? ar.byProd[p].sec : bs;
          secB += bs; secA += as;
          if (ar && ar.byProd[p] && !ar.byProd[p].complete && r.byProd[p].complete) lost.push({ round: r, product: p });
          var x = prod.get(p); if (!x) prod.set(p, (x = { product: p, rounds: 0, before: 0, after: 0, secBefore: 0, secAfter: 0 }));
          x.rounds++; x.before += b0; x.after += a0; x.secBefore += bs; x.secAfter += as; before += b0; aft += a0;
        });
      });
      var all = Array.from(prod.values()), changed = all.filter(function (x) { return Math.abs(x.after - x.before) > 0.5; });
      changed.sort(function (a, b) { return (a.after - a.before) - (b.after - b.before); });
      return {
        before: before, after: aft, save: before - aft, secBefore: secB, secAfter: secA, secSave: secB - secA, pct: before > 0 ? (before - aft) / before * 100 : null,
        roundsUsed: base.identified.length, roundsOut: base.rounds.length - base.identified.length, roundsPartial: base.partial.length,
        byProd: changed, better: changed.filter(function (x) { return x.after < x.before; }), worse: changed.filter(function (x) { return x.after > x.before; }),
        lost: lost, afterBase: after, ov: ov, sameFreq: after.planFreq === base.planFreq
      };
    });
  }

  /* recommend(d, base, n, progress) -> { list, why, tried, failed }
   * A busy Part far from START / DROP with a quiet Part near them; the best estimates are checked exactly
   * by re-routing every complete round over the analysed period. Only pairs that pass the Module 5 rules are kept. */
  function recommend(d, base, n, progress) {
    n = n || 10;
    var out = { list: [], why: '', candidates: 0, failed: 0, tried: 0 };
    if (!d.L) { out.why = 'data'; return Promise.resolve(out); }
    if (!base.identified.length) { out.why = 'nocomplete'; return Promise.resolve(out); }
    var costOf = new Map();
    function cost(rack) {
      if (costOf.has(rack)) return costOf.get(rack);
      var r = PWH.route.plan(d.L, [{ key: 'x', cands: [{ bin: rack, rack: rack, level: 1, floor: '', stock: 1 }] }], { noLegs: true });
      var c = r.unreachable && r.unreachable.length ? Infinity : (r.total || 0);
      costOf.set(rack, c); return c;
    }
    var freq = new Map(); base.parts.forEach(function (p) { freq.set(p.code, p); });
    var pool = [];
    d.bins.forEach(function (_, code) {
      var f = freq.get(code), pk = f ? f.pick : pickOf(d, code);
      if (pk.status !== 'ok' || !isFinite(cost(pk.rack))) return;
      pool.push({ code: code, n: f ? f.nRoute : 0, pick: pk, c: cost(pk.rack), products: f ? f.products : new Map(), name: d.text.get(code) || '' });
    });
    // Parts stored where a Module 5 rule says they may not be: find each one a swap that puts it right
    var fixPairs = [], fixUsed = new Set();
    var bad = pool.filter(function (p) { var w = PWH.rules.misplaced(d.rules, p.code, p.pick); if (w.length) p.bad = w; return w.length > 0; });
    out.misplaced = bad.length;
    bad.sort(function (x, y) { return y.n - x.n; }).slice(0, 8).forEach(function (a) {
      if (fixPairs.length >= 5 || PWH.rules.frozen(d.rules, a.code, a.pick)) return;
      var best = null, be = -Infinity;
      pool.forEach(function (b) {
        if (b === a || b.bad || b.pick.bin === a.pick.bin || fixUsed.has(b.code) || fixUsed.has('bin:' + b.pick.bin)) return;
        var e = (a.n - b.n) * (a.c - b.c); if (e <= be) return;
        if (checkSwap(d, a, b).length) return;
        best = b; be = e;
      });
      if (best) { fixUsed.add(best.code); fixUsed.add('bin:' + best.pick.bin); fixUsed.add(a.code); fixUsed.add('bin:' + a.pick.bin); fixPairs.push({ a: a, b: best, fix: true }); }
    });
    var busy = pool.filter(function (p) { return p.n > 0; }).sort(function (a, b) { return b.n * b.c - a.n * a.c; }).slice(0, 40);
    var near = pool.slice().sort(function (a, b) { return a.c - b.c; }).slice(0, 160);
    var est = [];
    busy.forEach(function (a) {
      near.forEach(function (b) {
        if (a.code === b.code || a.pick.bin === b.pick.bin || b.n >= a.n || b.c >= a.c) return;
        out.candidates++;
        if (checkSwap(d, a, b).length) { out.failed++; return; }   // only pairs that pass the Module 5 rules are suggested
        est.push({ a: a, b: b, e: (a.n - b.n) * (a.c - b.c) });
      });
    });
    if (!out.candidates && !fixPairs.length) { out.why = 'nocand'; return Promise.resolve(out); }
    if (!est.length && !fixPairs.length) { out.why = 'rules'; return Promise.resolve(out); }
    est.sort(function (x, y) { return y.e - x.e; });
    var tried = fixPairs.slice(), usedA = new Set(), usedB = new Set();
    fixPairs.forEach(function (s) { usedA.add(s.a.code); usedB.add(s.b.code); usedB.add('bin:' + s.b.pick.bin); usedB.add('bin:' + s.a.pick.bin); });
    for (var i = 0; i < est.length && tried.length < 24 + fixPairs.length; i++) {
      var s = est[i]; if (usedA.has(s.a.code) || usedB.has(s.b.code) || usedB.has('bin:' + s.b.pick.bin) || usedB.has('bin:' + s.a.pick.bin)) continue;
      usedA.add(s.a.code); usedB.add(s.b.code); usedB.add('bin:' + s.b.pick.bin); tried.push(s);
    }
    var res = [], k = 0;
    function next() {
      if (k >= tried.length) return null;
      var s = tried[k++]; if (progress) progress(k, tried.length);
      return simulate(d, base, [{ a: s.a, b: s.b }]).then(function (sim) {
        if (s.fix || sim.save > 0.5) res.push({ a: s.a, b: s.b, sim: sim, before: sim.before, after: sim.after, save: sim.save, pct: sim.pct, rules: [], fix: s.fix ? s.a.bad : null });
        return tick().then(next);
      });
    }
    return Promise.resolve(next()).then(function () {
      out.tried = tried.length;
      res.sort(function (x, y) { return (y.fix ? 1 : 0) - (x.fix ? 1 : 0) || y.save - x.save; });   // putting a Part right comes first
      // one Part and one bin in at most one suggestion, so all suggestions can be applied together
      var seen = new Set();
      res.forEach(function (r) {
        var keys = [r.a.code, r.b.code, 'bin:' + r.a.pick.bin, 'bin:' + r.b.pick.bin];
        if (out.list.length >= n + (r.fix ? 5 : 0) || keys.some(function (x) { return seen.has(x); })) return;
        keys.forEach(function (x) { seen.add(x); }); out.list.push(r);
      });
      if (!out.list.length) out.why = 'nogain';
      return out;
    });
  }

  // ---------- results per day (one store, read by Module 4 and the dashboard) ----------
  /* A day's summary, cut from an analysis that ran without a Product filter and without Plants chosen on the page.
   * rounds    = date + U-line + JOB.   freqPlan = unique Parts per round (BOM known).  freq = of those, Parts with a bin the cart reaches.
   * m         = metres of every round whose BOM is known; Parts without a bin are left out of the route (agreed 10/11/2026).
   * routed    = rounds with a route of more than 0 m (the divisor of the average).   mComp = metres of rounds whose route is complete.
   * prods     = per Product: planned rounds (r), rounds with a route (n), with a complete route (c), metres (m).
   * parts     = per Part: picks with a bin (the heatmap count).
   * iss       = per problem: the things affected (ids) and the rounds they touch (rk).  Counted again when days are joined. */
  var DAYS = 'days.v2';
  function summarize(d, res) {
    var out = new Map(), pk = new Map(), mis = new Map();
    res.parts.forEach(function (p) { pk.set(p.code, p.pick); });
    function bad(code) {
      if (!mis.has(code)) { var p = pk.get(code); mis.set(code, !!(p && p.status === 'ok' && PWH.rules.misplaced(d.rules, code, p).length)); }
      return mis.get(code);
    }
    function day(date) {
      var x = out.get(date);
      if (!x) out.set(date, (x = { date: date, key: d.key, at: res.at, rounds: 0, ident: 0, complete: 0, routed: 0, freq: 0, freqPlan: 0, m: 0, mComp: 0, prods: {}, parts: {},
        iss: { order: { ids: {}, rk: {} }, nobom: { ids: {}, rk: {} }, noloc: { ids: {}, rk: {} }, layout: { ids: {}, rk: {} }, rule: { ids: {}, rk: {} } } }));
      return x;
    }
    function hit(x, kind, id, rk) { x.iss[kind].ids[id] = 1; if (rk) x.iss[kind].rk[rk] = 1; }
    res.rounds.forEach(function (r) {
      var x = day(r.date); x.rounds++;
      if (r.identified) { x.ident++; x.freqPlan += r.parts.length; x.freq += r.routed.length; x.m += r.m; if (r.m > 0) x.routed++; r.routed.forEach(function (c) { x.parts[c] = (x.parts[c] || 0) + 1; }); }
      if (r.complete) { x.complete++; x.mComp += r.m; }
      r.products.forEach(function (p) {
        var P = x.prods[p] || (x.prods[p] = { r: 0, n: 0, c: 0, m: 0 }), bp = r.byProd && r.byProd[p];
        P.r++; if (bp && bp.m > 0) { P.n++; P.m += bp.m; } if (bp && bp.complete) P.c++;
      });
      (r.parts || []).forEach(function (c) {
        var p = pk.get(c); if (!p) return;
        if (p.status === 'noloc') hit(x, 'noloc', c, r.key);
        else if (p.status !== 'ok') (p.status === 'unreach' ? [p.bin] : (p.bins || []).map(function (b) { return b.bin; })).forEach(function (b) { hit(x, 'layout', b, r.key); });
        else if (bad(c)) hit(x, 'rule', c, r.key);
      });
    });
    res.issues.forEach(function (i) {
      if (!i.date) return;
      var x = day(i.date), rk = i.date + '|' + i.line + '|' + i.job;
      if (i.why === 'nojob' || i.why === 'noproduct') hit(x, 'order', i.job || (i.file + ':' + i.row), i.job ? rk : i.date + '|row' + i.row);
      else if (i.why === 'plant') hit(x, 'order', i.job, rk);
      else if (i.why === 'nobom' || i.why === 'noparts') hit(x, 'nobom', i.product, rk);
    });
    // a plan day whose file has no rows still counts as "has a plan, 0 rounds"
    d.days.forEach(function (dd) { if (dd.date >= (res.from || '') && dd.date <= (res.to || '9999')) day(dd.date); });
    return out;
  }
  function readDays() { return PWH.db.getMeta(DAYS).catch(function () { return null; }).then(function (v) { return v && v.days ? v : { days: {} }; }); }
  function storeDays(d, res) {
    // only results made with the remembered Plant choices, for every Product, are kept
    if (!res || res.product || sigOf(sortObj(res.plantPick || {})) !== sigOf(sortObj(d.plantPick || {}))) return Promise.resolve();
    var sm = summarize(d, res);
    return readDays().then(function (v) { sm.forEach(function (x, date) { v.days[date] = x; }); v.at = Date.now(); return PWH.db.setMeta(DAYS, v); }).catch(function () {});
  }
  /* days(d, from, to) -> { list: [{date, plan, sum, stale}], missing: [dates with a plan and no result], stale: [dates] } */
  function days(d, from, to) {
    return readDays().then(function (v) {
      var out = { list: [], missing: [], stale: [] };
      daysIn(d, from, to).forEach(function (x) {
        var s = x.plan ? v.days[x.date] || null : null, st = !!(s && s.key !== d.key);
        out.list.push({ date: x.date, plan: x.plan, sum: s, stale: st });
        if (x.plan && !s) out.missing.push(x.date); if (st) out.stale.push(x.date);
      });
      return out;
    });
  }
  // calculate the given days (runs of consecutive dates are routed together) and keep their results
  function computeDays(d, dates, progress) {
    var list = dates.slice().sort(), runs = [];
    list.forEach(function (x) { var r = runs[runs.length - 1]; if (r && addDays(r.to, 1) === x) r.to = x; else runs.push({ from: x, to: x }); });
    var router = makeRouter(d), k = 0, done = 0;
    function next() {
      if (k >= runs.length) return null;
      var r = runs[k++];
      return analyze(d, { from: r.from, to: r.to, router: router, plantPick: d.plantPick, progress: function (i, n) { if (progress) progress(done + (n ? i / n : 1) * (daysIn(d, r.from, r.to).length), list.length); } })
        .then(function (res) { done += daysIn(d, r.from, r.to).length; return storeDays(d, res); }).then(next);
    }
    return Promise.resolve(next());
  }

  // ---------- saved swap scenarios (Module 4 saves, the dashboard reads) ----------
  var SCEN = 'scenarios.v1';
  function scenarios() { return PWH.db.getMeta(SCEN).catch(function () { return null; }).then(function (v) { return (v && v.list) || []; }); }
  function saveScenario(sc) {
    return scenarios().then(function (l) { l = l.filter(function (x) { return x.id !== sc.id; }); l.unshift(sc); return PWH.db.setMeta(SCEN, { list: l.slice(0, 30) }).then(function () { return l; }); });
  }
  function deleteScenario(id) { return scenarios().then(function (l) { l = l.filter(function (x) { return x.id !== id; }); return PWH.db.setMeta(SCEN, { list: l }).then(function () { return l; }); }); }

  // time of one pick trip, the same simulation factors as Module 3 (estimates, labelled as such)
  function timeOf(m, stops, lifts) { var S = PWH.SIM; var walk = m / S.walk, pick = stops * S.pick, lift = lifts * S.lift; return { walk: walk, pick: pick, lift: lift, sec: walk + pick + lift }; }
  PWH.freq = { timeOf: timeOf, load: load, keyNow: keyNow, analyze: analyze, simulate: simulate, recommend: recommend, checkSwap: checkSwap, pickOf: pickOf, pointOf: pointOf,
    defaultRange: defaultRange, daysIn: daysIn, addDays: addDays, plantOf: plantOf, partsOf: partsOf, makeRouter: makeRouter,
    storeDays: storeDays, plantPicks: plantPicks, savePlantPicks: savePlantPicks, days: days, computeDays: computeDays, scenarios: scenarios, saveScenario: saveScenario, deleteScenario: deleteScenario };
})(window);
